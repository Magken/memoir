import {
  Box3,
  BufferAttribute,
  Camera,
  ClampToEdgeWrapping,
  DataTexture,
  DoubleSide,
  FloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Matrix4,
  Mesh,
  NearestFilter,
  NoColorSpace,
  NormalBlending,
  RGBAFormat,
  UnsignedByteType,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
} from 'three'
import { shStride, type SplatCloud } from './decodeSplat'

const TEX_LIMIT = 4096
const _view = new Matrix4()
const _inverse = new Matrix4()
const _point = new Vector3()

const VERTEX = /* glsl */ `
attribute float splatIndex;
uniform sampler2D splatData;
uniform vec2 splatTexSize;
uniform sampler2D shData;
uniform vec2 shTexSize;
uniform vec3 localCamera;
uniform vec2 viewport;

varying vec4 vColor;
varying vec2 vCoord;

vec4 fetchSplat(int texel) {
  int width = int(splatTexSize.x);
  int x = texel - (texel / width) * width;
  int y = texel / width;
  return texelFetch(splatData, ivec2(x, y), 0);
}

#if SH_DEGREE > 0
vec4 fetchSh(int texel) {
  int width = int(shTexSize.x);
  int x = texel - (texel / width) * width;
  int y = texel / width;
  return (texelFetch(shData, ivec2(x, y), 0) * 255.0 - 128.0) / 128.0;
}

vec3 shVector(int id, int k) {
  int first = k * 3;
  vec3 v;
  for (int c = 0; c < 3; c++) {
    int j = first + c;
    vec4 texel = fetchSh(id * SH_TEXELS + j / 4);
    int lane = j - (j / 4) * 4;
    v[c] = lane == 0 ? texel.x : lane == 1 ? texel.y : lane == 2 ? texel.z : texel.w;
  }
  return v;
}

vec3 shColor(int id, vec3 center) {
  vec3 d = normalize(center - localCamera);
  float x = d.x;
  float y = d.y;
  float z = d.z;
  vec3 rgb = shVector(id, 0) * (-0.4886025 * y)
    + shVector(id, 1) * (0.4886025 * z)
    + shVector(id, 2) * (-0.4886025 * x);
#if SH_DEGREE > 1
  float xx = x * x;
  float yy = y * y;
  float zz = z * z;
  rgb += shVector(id, 3) * (1.0925484 * x * y)
    + shVector(id, 4) * (-1.0925484 * y * z)
    + shVector(id, 5) * (0.3153915 * (2.0 * zz - xx - yy))
    + shVector(id, 6) * (-1.0925484 * x * z)
    + shVector(id, 7) * (0.5462742 * (xx - yy));
#if SH_DEGREE > 2
  rgb += shVector(id, 8) * (-0.5900436 * y * (3.0 * xx - yy))
    + shVector(id, 9) * (2.8906114 * x * y * z)
    + shVector(id, 10) * (-0.4570458 * y * (4.0 * zz - xx - yy))
    + shVector(id, 11) * (0.3731763 * z * (2.0 * zz - 3.0 * xx - 3.0 * yy))
    + shVector(id, 12) * (-0.4570458 * x * (4.0 * zz - xx - yy))
    + shVector(id, 13) * (1.4453057 * z * (xx - yy))
    + shVector(id, 14) * (-0.5900436 * x * (xx - 3.0 * yy));
#endif
#endif
  return rgb;
}
#endif

vec3 quatRotate(vec3 v, vec4 q) {
  vec3 t = 2.0 * cross(q.xyz, v);
  return v + q.w * t + cross(q.xyz, t);
}

mat3 outer(vec3 v) {
  return mat3(v * v.x, v * v.y, v * v.z);
}

void main() {
  int id = int(splatIndex + 0.1);
  vec3 center = fetchSplat(id * 4).xyz;
  vec3 scale = fetchSplat(id * 4 + 1).xyz;
  vec4 quat = fetchSplat(id * 4 + 2);
  vColor = fetchSplat(id * 4 + 3);
#if SH_DEGREE > 0
  vColor.rgb = clamp(vColor.rgb + shColor(id, center), 0.0, 1.0);
#endif
  vCoord = position.xy;

  float qlen = length(quat);
  if (qlen > 0.0) quat /= qlen;

  vec4 viewCenter4 = modelViewMatrix * vec4(center, 1.0);
  vec3 viewCenter = viewCenter4.xyz;
  vec4 centerClip = projectionMatrix * viewCenter4;
  float clipLimit = centerClip.w * 1.4;
  if (viewCenter.z >= -0.01
    || centerClip.z < -centerClip.w
    || centerClip.z > centerClip.w
    || abs(centerClip.x) > clipLimit
    || abs(centerClip.y) > clipLimit) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  mat3 mv = mat3(modelViewMatrix);
  vec3 ax = mv * quatRotate(vec3(scale.x, 0.0, 0.0), quat);
  vec3 ay = mv * quatRotate(vec3(0.0, scale.y, 0.0), quat);
  vec3 az = mv * quatRotate(vec3(0.0, 0.0, scale.z), quat);
  mat3 sigma = outer(ax) + outer(ay) + outer(az);
  float c00 = sigma[0][0];
  float c01 = sigma[1][0];
  float c02 = sigma[2][0];
  float c11 = sigma[1][1];
  float c12 = sigma[2][1];
  float c22 = sigma[2][2];

  float z = min(viewCenter.z, -0.01);
  float invZ = 1.0 / z;
  float invZ2 = invZ * invZ;
  vec2 focal = max(viewport, vec2(1.0)) * 0.5 * vec2(projectionMatrix[0][0], projectionMatrix[1][1]);
  float j00 = -focal.x * invZ;
  float j11 = -focal.y * invZ;
  float j02 = focal.x * viewCenter.x * invZ2;
  float j12 = focal.y * viewCenter.y * invZ2;
  float aBase = j00 * j00 * c00 + 2.0 * j00 * j02 * c02 + j02 * j02 * c22;
  float b = j00 * j11 * c01 + j00 * j12 * c02 + j02 * j11 * c12 + j02 * j12 * c22;
  float cBase = j11 * j11 * c11 + 2.0 * j11 * j12 * c12 + j12 * j12 * c22;
  float a = aBase + 0.3;
  float c = cBase + 0.3;
  float detBase = aBase * cBase - b * b;
  float det = a * c - b * b;
  vColor.a *= sqrt(max(detBase / max(det, 0.000001), 0.0));

  float halfTrace = 0.5 * (a + c);
  float radius = sqrt(max(0.25 * (a - c) * (a - c) + b * b, 0.0000001));
  float lambda1 = max(halfTrace + radius, 0.0000001);
  float lambda2 = max(halfTrace - radius, 0.0000001);
  vec2 axis1 = vec2(1.0, 0.0);
  if (radius > 0.00001) {
    float angle = 0.5 * atan(b * 2.0, a - c);
    axis1 = vec2(cos(angle), sin(angle));
  }
  vec2 axis2 = vec2(-axis1.y, axis1.x);
  vec2 offsetPixels = axis1 * position.x * min(sqrt(lambda1), 1024.0)
    + axis2 * position.y * min(sqrt(lambda2), 1024.0);
  vec2 offsetNdc = offsetPixels * 2.0 / max(viewport, vec2(1.0));
  gl_Position = centerClip + vec4(offsetNdc * centerClip.w, 0.0, 0.0);
}
`

const FRAGMENT = /* glsl */ `
varying vec4 vColor;
varying vec2 vCoord;

void main() {
  float r2 = dot(vCoord, vCoord);
  if (r2 > 4.0) discard;
  gl_FragColor = vec4(vColor.rgb, exp(-0.5 * r2) * vColor.a);
}
`

function textureSize(texelCount: number): { width: number; height: number } {
  const texels = Math.max(texelCount, 1)
  let width = TEX_LIMIT
  let height = Math.ceil(texels / width)
  if (height > TEX_LIMIT) {
    width = Math.min(16384, Math.ceil(texels / TEX_LIMIT))
    height = Math.ceil(texels / width)
  }
  if (height > 16384) throw new Error('SPZ is too large to draw')
  return { width, height }
}

function writeTexel(data: Float32Array, texel: number, x: number, y: number, z: number, w: number) {
  const offset = texel * 4
  data[offset] = x
  data[offset + 1] = y
  data[offset + 2] = z
  data[offset + 3] = w
}

function createShTexture(cloud: SplatCloud): { texture: DataTexture; texels: number } {
  const stride = shStride(cloud.shDegree)
  const texels = Math.ceil(stride / 4)
  const { width, height } = textureSize(cloud.count * texels)
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < cloud.count; i++) {
    data.set(cloud.sh.subarray(i * stride, (i + 1) * stride), i * texels * 4)
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType)
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = false
  texture.flipY = false
  texture.colorSpace = NoColorSpace
  texture.needsUpdate = true
  return { texture, texels }
}

export function createSplatMesh(cloud: SplatCloud): Mesh {
  const { width, height } = textureSize(cloud.count * 4)
  const data = new Float32Array(width * height * 4)
  const { count, centers, scales, quaternions, colors } = cloud
  const sh = createShTexture(cloud)
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const i4 = i * 4
    const texel = i * 4
    writeTexel(data, texel, centers[i3], centers[i3 + 1], centers[i3 + 2], 1)
    writeTexel(data, texel + 1, scales[i3], scales[i3 + 1], scales[i3 + 2], 0)
    writeTexel(data, texel + 2, quaternions[i4], quaternions[i4 + 1], quaternions[i4 + 2], quaternions[i4 + 3])
    writeTexel(data, texel + 3, colors[i4] / 255, colors[i4 + 1] / 255, colors[i4 + 2] / 255, colors[i4 + 3] / 255)
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, FloatType)
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = false
  texture.flipY = false
  texture.colorSpace = NoColorSpace
  texture.needsUpdate = true

  const index = new Float32Array(count)
  for (let i = 0; i < count; i++) index[i] = i
  const geometry = new InstancedBufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([-2, -2, 0, 2, -2, 0, 2, 2, 0, -2, 2, 0]), 3),
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.setAttribute('splatIndex', new InstancedBufferAttribute(index, 1))
  geometry.instanceCount = count

  const box = new Box3()
  let maxScale = 0
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    _point.set(centers[i3], centers[i3 + 1], centers[i3 + 2])
    box.expandByPoint(_point)
    maxScale = Math.max(maxScale, scales[i3], scales[i3 + 1], scales[i3 + 2])
  }
  if (box.isEmpty()) box.set(new Vector3(0, 0, 0), new Vector3(0, 0, 0))
  const sphere = box.getBoundingSphere(new Sphere())
  sphere.radius += maxScale * 2
  geometry.boundingBox = box
  geometry.boundingSphere = sphere

  const material = new ShaderMaterial({
    uniforms: {
      splatData: { value: texture },
      splatTexSize: { value: new Vector2(width, height) },
      shData: { value: sh.texture },
      shTexSize: { value: new Vector2(sh.texture.image.width, sh.texture.image.height) },
      localCamera: { value: new Vector3() },
      viewport: { value: new Vector2(1280, 720) },
    },
    defines: {
      SH_DEGREE: cloud.shDegree,
      SH_TEXELS: Math.max(sh.texels, 1),
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: NormalBlending,
    side: DoubleSide,
    toneMapped: false,
    fog: false,
    lights: false,
  })
  material.precision = 'highp'

  const mesh = new Mesh(geometry, material)
  mesh.name = 'splat-cloud'
  mesh.frustumCulled = true
  mesh.raycast = () => {}
  mesh.userData.cloud = cloud
  mesh.userData.index = index
  mesh.userData.keys = new Float32Array(count)
  return mesh
}

export function sortSplatMesh(mesh: Mesh, camera: Camera): void {
  const cloud = mesh.userData.cloud as SplatCloud | undefined
  const index = mesh.userData.index as Float32Array | undefined
  const keys = mesh.userData.keys as Float32Array | undefined
  const attr = mesh.geometry.getAttribute('splatIndex') as InstancedBufferAttribute | undefined
  if (!cloud || !index || !keys || !attr || cloud.count === 0) return
  const material = mesh.material
  if (material instanceof ShaderMaterial && material.uniforms.localCamera) {
    _inverse.copy(mesh.matrixWorld).invert()
    ;(material.uniforms.localCamera.value as Vector3).setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_inverse)
  }
  _view.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld)
  const e = _view.elements
  const z0 = e[2]
  const z1 = e[6]
  const z2 = e[10]
  const z3 = e[14]
  const dirLen = Math.hypot(z0, z1, z2) || 1
  const dx = z0 / dirLen
  const dy = z1 / dirLen
  const dz = z2 / dirLen
  const prev = mesh.userData.sortDir as Vector3 | undefined
  if (prev && prev.x * dx + prev.y * dy + prev.z * dz > 0.9995) return
  if (!prev) mesh.userData.sortDir = new Vector3()
  ;(mesh.userData.sortDir as Vector3).set(dx, dy, dz)
  const centers = cloud.centers
  const count = cloud.count
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const viewZ = z0 * centers[i3] + z1 * centers[i3 + 1] + z2 * centers[i3 + 2] + z3
    const key = -Math.log(Math.max(-viewZ, 1e-4))
    keys[i] = key
    if (key < min) min = key
    if (key > max) max = key
  }
  countingSort(keys, count, min, max, index)
  attr.needsUpdate = true
}

const SORT_BINS = 65536
const _binCounts = new Uint32Array(SORT_BINS)

/** Ascending bucket sort of `keys` into `out`, O(n). Keys are -log(depth), so far splats come first and near ones get fine buckets. */
export function countingSort(keys: Float32Array, count: number, min: number, max: number, out: Float32Array): void {
  _binCounts.fill(0)
  const scale = max > min ? (SORT_BINS - 1) / (max - min) : 0
  for (let i = 0; i < count; i++) _binCounts[((keys[i] - min) * scale) | 0]++
  let sum = 0
  for (let b = 0; b < SORT_BINS; b++) {
    const c = _binCounts[b]
    _binCounts[b] = sum
    sum += c
  }
  for (let i = 0; i < count; i++) out[_binCounts[((keys[i] - min) * scale) | 0]++] = i
}

export function disposeSplatMesh(mesh: Mesh): void {
  const material = mesh.material
  if (material instanceof ShaderMaterial) {
    for (const key of ['splatData', 'shData']) {
      const texture = material.uniforms[key]?.value
      if (texture instanceof DataTexture) texture.dispose()
    }
    material.dispose()
  }
  mesh.geometry.dispose()
  mesh.userData.cloud = undefined
  mesh.userData.index = undefined
  mesh.userData.keys = undefined
  mesh.userData.sortDir = undefined
}
