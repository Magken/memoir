import { clampPoly } from '../interaction/markStem'
import {
  ClampToEdgeWrapping,
  Data3DTexture,
  LinearFilter,
  RedFormat,
  UnsignedByteType,
} from 'three'
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'

/** World size in metres. Sits on y = 0 (box center at height / 2). Sized to fill Home like three.js `webgl_volume_cloud`. */
export const CLOUD_SIZE = { x: 2.4, y: 1.5, z: 2.1 } as const

/** Nubis envelope as a fraction of the hull half-extents — fills the view without painting the box walls. */
export const CLOUD_PROFILE_FILL = 0.9
export const CLOUD_PROFILE_Y = (CLOUD_SIZE.y / 2) * CLOUD_PROFILE_FILL
export const CLOUD_PROFILE_XZ = (Math.min(CLOUD_SIZE.x, CLOUD_SIZE.z) / 2) * CLOUD_PROFILE_FILL

/** three.js `webgl_volume_cloud` cutoff. `threshold - range` must stay > 0 or empty air composites into fog. */
export const CLOUD_BASE = 0x798aa0
export const CLOUD_THRESHOLD = 0.25
export const CLOUD_OPACITY = 0.5
export const CLOUD_RANGE = 0.1

/** Poly 5 = 100 steps — same as the three.js example GUI default. */
export function cloudMarchSteps(poly: number): number {
  return clampPoly(poly) * 20
}

function hash31(ix: number, iy: number, iz: number): [number, number, number] {
  const n1 = Math.sin(ix * 127.1 + iy * 311.7 + iz * 74.7) * 43758.5453
  const n2 = Math.sin(ix * 269.5 + iy * 183.3 + iz * 246.1) * 43758.5453
  const n3 = Math.sin(ix * 419.2 + iy * 371.9 + iz * 168.6) * 43758.5453
  return [n1 - Math.floor(n1), n2 - Math.floor(n2), n3 - Math.floor(n3)]
}

function worleyAt(fx: number, fy: number, fz: number): number {
  const ix = Math.floor(fx)
  const iy = Math.floor(fy)
  const iz = Math.floor(fz)
  let minD = 1
  for (let k = -1; k <= 1; k++) {
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const [ox, oy, oz] = hash31(ix + i, iy + j, iz + k)
        const dx = ix + i + ox - fx
        const dy = iy + j + oy - fy
        const dz = iz + k + oz - fz
        const d = dx * dx + dy * dy + dz * dz
        if (d < minD) minD = d
      }
    }
  }
  return 1 - Math.min(Math.sqrt(minD), 1)
}

/**
 * 128³ Perlin-Worley, baked once (FarazzShaikh does this on an FBO).
 * The fragment only samples this texture — same cost as three.js `webgl_volume_cloud`.
 */
export function makeCloudDensityTexture(size = 128): Data3DTexture {
  const data = new Uint8Array(size * size * size)
  const perlin = new ImprovedNoise()
  const scale = 0.05
  const freq = size / 8
  let i = 0
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const n0 = perlin.noise(x * scale / 1.5, y * scale, z * scale / 1.5)
        const n1 = perlin.noise(x * scale * 2.02, y * scale * 2.02, z * scale * 2.02)
        const perlinN = n0 * 0.65 + n1 * 0.35
        const w = worleyAt((x / size) * freq, (y / size) * freq, (z / size) * freq)
        const v = 128 + 128 * (perlinN * 0.55 + (w * 2 - 1) * 0.45)
        data[i] = Math.max(0, Math.min(255, v))
        i++
      }
    }
  }
  const texture = new Data3DTexture(data, size, size, size)
  texture.format = RedFormat
  texture.type = UnsignedByteType
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.wrapR = ClampToEdgeWrapping
  texture.unpackAlignment = 1
  texture.needsUpdate = true
  return texture
}

export const CLOUD_VERTEX = /* glsl */ `
in vec3 position;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPos;

out vec3 vOrigin;
out vec3 vDirection;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz;
  vDirection = position - vOrigin;
  gl_Position = projectionMatrix * mvPosition;
}
`

/** three.js `webgl_volume_cloud` march (3 texture samples / step). Nubis profile is ALU only. */
export const CLOUD_FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler3D;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform vec3 base;
uniform sampler3D map;
uniform vec3 uHalfSize;
uniform float uProfileY;
uniform float uProfileXZ;

uniform float threshold;
uniform float range;
uniform float opacity;
uniform float steps;
uniform float frame;
uniform float uTime;

uint wang_hash(uint seed)
{
  seed = (seed ^ 61u) ^ (seed >> 16u);
  seed *= 9u;
  seed = seed ^ (seed >> 4u);
  seed *= 0x27d4eb2du;
  seed = seed ^ (seed >> 15u);
  return seed;
}

float randomFloat(inout uint seed)
{
  return float(wang_hash(seed)) / 4294967296.;
}

vec2 hitBox( vec3 orig, vec3 dir ) {
  vec3 box_min = - uHalfSize;
  vec3 box_max = uHalfSize;
  vec3 inv_dir = 1.0 / dir;
  vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
  vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
  vec3 tmin = min( tmin_tmp, tmax_tmp );
  vec3 tmax = max( tmin_tmp, tmax_tmp );
  float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
  float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
  return vec2( t0, t1 );
}

float sample1( vec3 p ) {
  return texture( map, p ).r;
}

float dimensionalProfile( vec3 p ) {
  float height = 1.0 - abs( p.y ) / uProfileY;
  float edge = 1.0 - clamp( length( p.xz ) / uProfileXZ, 0.0, 1.0 );
  return clamp( height, 0.0, 1.0 ) * edge;
}

float shading( vec3 coord ) {
  float step = 0.01;
  return sample1( coord + vec3( - step ) ) - sample1( coord + vec3( step ) );
}

vec4 linearToSRGB( in vec4 value ) {
  return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

void main(){
  vec3 rayDir = normalize( vDirection );
  vec2 bounds = hitBox( vOrigin, rayDir );

  if ( bounds.x > bounds.y ) discard;

  bounds.x = max( bounds.x, 0.0 );

  float stepSize = ( bounds.y - bounds.x ) / max( steps, 1.0 );

  uint seed = uint( gl_FragCoord.x ) * uint( 1973 ) + uint( gl_FragCoord.y ) * uint( 9277 ) + uint( frame ) * uint( 26699 );
  vec3 size = vec3( textureSize( map, 0 ) );
  float randNum = randomFloat( seed ) * 2.0 - 1.0;
  vec3 p = vOrigin + bounds.x * rayDir;
  p += rayDir * randNum * ( 0.4 / size );

  vec4 ac = vec4( base, 0.0 );

  for ( float i = 0.0; i < steps; i += 1.0 ) {
    float profile = dimensionalProfile( p );
    vec3 texP = fract( p / ( uHalfSize * 2.0 ) + 0.5 + uTime * vec3( 0.018, -0.003, -0.012 ) );
    float perlinWorley = sample1( texP );
    float raw = clamp( perlinWorley - ( 1.0 - profile ), 0.0, 1.0 );
    float d = smoothstep( threshold - range, threshold + range, raw ) * opacity;
    if ( d > 0.0 ) {
      float col = shading( texP ) * 3.0 + ( ( p.x + p.y ) * 0.25 ) + 0.2;
      ac.rgb += ( 1.0 - ac.a ) * d * col;
      ac.a += ( 1.0 - ac.a ) * d;
      if ( ac.a >= 0.95 ) break;
    }
    p += rayDir * stepSize;
  }

  color = linearToSRGB( ac );

  if ( color.a == 0.0 ) discard;
}
`
