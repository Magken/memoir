/** WebGL noise-morph gallery engine — ref.image-carousel-8 */

export type MorphGallerySourceImage = {
  src: string
  alt: string
  thumb?: string
}

const VERT_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG_SRC = `
precision highp float;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform vec2 u_resolution;
uniform float u_fromAspect;
uniform float u_toAspect;
uniform float u_scale;
uniform float u_direction;

varying vec2 v_uv;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
   -0.577350269189626,
    0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1  = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(
    permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0)
  );
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x   + h.x  * x0.y;
  g.yz = a0.yz * x12.xz  + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 v) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * snoise(v);
    v *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

vec2 coverUV(vec2 uv, float imgAspect) {
  float canvasAspect = u_resolution.x / u_resolution.y;
  vec2 scale = (canvasAspect > imgAspect)
    ? vec2(1.0, imgAspect / canvasAspect)
    : vec2(canvasAspect / imgAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  float edge = 0.15;
  float adjustedProgress = u_progress * (1.0 + 2.0 * edge) - edge;
  float noise = fbm(v_uv * u_scale + vec2(0.0, u_progress * u_direction)) * 0.5 + 0.5;
  noise = smoothstep(0.0, 2.0, length(texture2D(u_to, coverUV(v_uv, u_fromAspect)).rgb) + noise);
  float mixFactor = 1.0 - smoothstep(adjustedProgress - edge, adjustedProgress + edge, noise);
  float distortIn = noise * u_progress;
  float distortOut = noise * (1.0 - u_progress);

  vec2 fromUV = coverUV(v_uv + vec2(0.0, distortIn * 0.5 * u_direction), u_fromAspect);
  vec2 toUV   = coverUV(v_uv + vec2(0.0, distortOut * -0.25 * u_direction), u_toAspect);

  vec4 fromColor = texture2D(u_from, fromUV);
  vec4 toColor   = texture2D(u_to, toUV);

  gl_FragColor = mix(fromColor, toColor, mixFactor);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Failed to create shader')
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error: ${err}`)
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string) {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  const prog = gl.createProgram()
  if (!prog) throw new Error('Failed to create program')
  gl.attachShader(prog, vert)
  gl.attachShader(prog, frag)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(prog)}`)
  }
  return prog
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function uploadTexture(gl: WebGLRenderingContext, img: HTMLImageElement) {
  const tex = gl.createTexture()
  if (!tex) throw new Error('Failed to create texture')
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return tex
}

/** easeInOutQuint — matches ref.image-carousel-8 rAF transition */
export function morphGalleryEase(t: number): number {
  return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2
}

export const DEFAULT_MORPH_GALLERY_DURATION_MS = 1500

export class MorphGalleryEngine {
  private readonly canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext | null = null
  private uniforms: Record<string, WebGLUniformLocation | null> | null = null
  private textures: WebGLTexture[] = []
  private aspects: number[] = []
  private fromIndex = 0
  private toIndex = 0
  private progress = 1
  private transitionStart: number | null = null
  private transitionDuration = DEFAULT_MORPH_GALLERY_DURATION_MS
  private direction = 1
  private rafId: number | null = null
  private ready = false
  private destroyed = false
  private ro: ResizeObserver | null = null
  private externalDrive = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  async init(imageUrls: readonly string[]) {
    const gl = this.canvas.getContext('webgl')
    if (!gl) throw new Error('WebGL not supported')
    this.gl = gl

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(this.canvas)

    const prog = createProgram(gl, VERT_SRC, FRAG_SRC)
    gl.useProgram(prog)

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const posLoc = gl.getAttribLocation(prog, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    this.uniforms = {
      from: gl.getUniformLocation(prog, 'u_from'),
      to: gl.getUniformLocation(prog, 'u_to'),
      progress: gl.getUniformLocation(prog, 'u_progress'),
      resolution: gl.getUniformLocation(prog, 'u_resolution'),
      fromAspect: gl.getUniformLocation(prog, 'u_fromAspect'),
      toAspect: gl.getUniformLocation(prog, 'u_toAspect'),
      scale: gl.getUniformLocation(prog, 'u_scale'),
      direction: gl.getUniformLocation(prog, 'u_direction'),
    }

    const images = await Promise.all(imageUrls.map(loadImage))
    this.textures = images.map((img) => uploadTexture(gl, img))
    this.aspects = images.map((img) => img.naturalWidth / img.naturalHeight)

    this.ready = true
    this.loop()
  }

  transition(fromIndex: number, toIndex: number, duration = DEFAULT_MORPH_GALLERY_DURATION_MS) {
    if (!this.ready || fromIndex === toIndex) return
    this.externalDrive = false
    this.fromIndex = fromIndex
    this.toIndex = toIndex
    this.progress = 0
    this.transitionStart = performance.now()
    this.transitionDuration = duration
    this.direction = toIndex > fromIndex ? 1 : -1
  }

  /** GSAP / manual scrub — skips internal rAF easing */
  setPair(fromIndex: number, toIndex: number, direction?: number) {
    this.fromIndex = fromIndex
    this.toIndex = toIndex
    this.direction = direction ?? (toIndex >= fromIndex ? 1 : -1)
    this.externalDrive = true
    this.transitionStart = null
  }

  setProgress(progress: number) {
    this.progress = Math.min(1, Math.max(0, progress))
    this.externalDrive = true
    this.transitionStart = null
  }

  getProgress() {
    return this.progress
  }

  snapTo(index: number) {
    this.fromIndex = index
    this.toIndex = index
    this.progress = 1
    this.transitionStart = null
    this.externalDrive = false
  }

  private resize() {
    const gl = this.gl
    if (!gl) return
    const dpr = window.devicePixelRatio || 1
    const w = Math.round(this.canvas.clientWidth * dpr)
    const h = Math.round(this.canvas.clientHeight * dpr)
    if (w === 0 || h === 0) return
    this.canvas.width = w
    this.canvas.height = h
    gl.viewport(0, 0, w, h)
  }

  private loop() {
    if (this.destroyed) return
    this.render()
    this.rafId = requestAnimationFrame(() => this.loop())
  }

  private render() {
    const gl = this.gl
    if (!gl || !this.ready || !this.uniforms) return

    if (!this.externalDrive && this.transitionStart !== null && this.progress < 1) {
      const elapsed = performance.now() - this.transitionStart
      const t = Math.min(elapsed / this.transitionDuration, 1)
      this.progress = morphGalleryEase(t)
      if (t >= 1) this.transitionStart = null
    }

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.fromIndex])
    gl.uniform1i(this.uniforms.from, 0)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.toIndex])
    gl.uniform1i(this.uniforms.to, 1)

    gl.uniform1f(this.uniforms.progress, this.progress)
    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height)
    gl.uniform1f(this.uniforms.fromAspect, this.aspects[this.fromIndex] ?? 1)
    gl.uniform1f(this.uniforms.toAspect, this.aspects[this.toIndex] ?? 1)
    gl.uniform1f(this.uniforms.scale, 3.5)
    gl.uniform1f(this.uniforms.direction, this.direction)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  destroy() {
    this.destroyed = true
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.ro?.disconnect()
    if (this.gl) {
      this.textures.forEach((t) => this.gl?.deleteTexture(t))
    }
  }
}
