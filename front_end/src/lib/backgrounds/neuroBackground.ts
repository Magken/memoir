/** WebGL neuro noise page background — ref.background-types-2 */

const VERT_SRC = `
precision mediump float;

varying vec2 vUv;
attribute vec2 a_position;

void main() {
  vUv = .5 * (a_position + 1.);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG_SRC = `
precision mediump float;

varying vec2 vUv;
uniform float u_time;
uniform float u_ratio;
uniform vec2 u_pointer_position;
uniform float u_scroll_progress;
uniform vec3 u_color_a;
uniform vec3 u_color_b;

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float neuro_shape(vec2 uv, float t, float p) {
  vec2 sine_acc = vec2(0.);
  vec2 res = vec2(0.);
  float scale = 8.;

  for (int j = 0; j < 15; j++) {
    uv = rotate(uv, 1.);
    sine_acc = rotate(sine_acc, 1.);
    vec2 layer = uv * scale + float(j) + sine_acc - t;
    sine_acc += sin(layer) + 2.4 * p;
    res += (.5 + .5 * cos(layer)) / scale;
    scale *= 1.2;
  }
  return res.x + res.y;
}

void main() {
  vec2 uv = .5 * vUv;
  uv.x *= u_ratio;

  vec2 pointer = vUv - u_pointer_position;
  pointer.x *= u_ratio;
  float p = clamp(length(pointer), 0., 1.);
  p = .5 * pow(1. - p, 2.);

  float t = .001 * u_time;
  vec3 color = vec3(0.);

  float noise = neuro_shape(uv, t, p);

  noise = 1.2 * pow(noise, 3.);
  noise += pow(noise, 10.);
  noise = max(.0, noise - .5);
  noise *= (1. - length(vUv - .5));

  vec3 tint = mix(u_color_a, u_color_b, 0.5 + 0.5 * sin(3. * u_scroll_progress));
  color = normalize(tint + 0.001) * noise;

  gl_FragColor = vec4(color, noise);
}
`

type Rgb = [number, number, number]

const pointer = { x: 0, y: 0, tX: 0, tY: 0 }

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

function cssColorToRgb(color: string): Rgb | null {
  const probe = document.createElement('canvas')
  probe.width = probe.height = 1
  const ctx = probe.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

function readThemeColors(canvas: HTMLCanvasElement): { a: Rgb; b: Rgb } {
  const themeEl = canvas.closest('.theme') ?? document.documentElement
  const styles = getComputedStyle(themeEl)
  const pageBg = styles.getPropertyValue('--theme-page-bg').trim()
  const accent = styles.getPropertyValue('--theme-accent').trim()
  const fallbackA: Rgb = [0.12, 0.12, 0.12]
  const fallbackB: Rgb = [0.45, 0.55, 0.95]
  return {
    a: cssColorToRgb(pageBg) ?? fallbackA,
    b: cssColorToRgb(accent) ?? fallbackB,
  }
}

export class NeuroBackgroundEngine {
  private readonly canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext | null = null
  private uniforms: Record<string, WebGLUniformLocation | null> | null = null
  private rafId: number | null = null
  private ro: ResizeObserver | null = null
  private destroyed = false
  private readonly dpr = Math.min(window.devicePixelRatio || 1, 2)
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private onReducedMotionChange = () => {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  init() {
    const gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true })
    if (!gl) throw new Error('WebGL not supported')
    this.gl = gl

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
      u_time: gl.getUniformLocation(prog, 'u_time'),
      u_ratio: gl.getUniformLocation(prog, 'u_ratio'),
      u_pointer_position: gl.getUniformLocation(prog, 'u_pointer_position'),
      u_scroll_progress: gl.getUniformLocation(prog, 'u_scroll_progress'),
      u_color_a: gl.getUniformLocation(prog, 'u_color_a'),
      u_color_b: gl.getUniformLocation(prog, 'u_color_b'),
    }

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(this.canvas)

    window.addEventListener('pointermove', this.onPointer)
    window.addEventListener('touchmove', this.onTouch, { passive: true })
    window.addEventListener('click', this.onPointer)
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', this.onReducedMotionChange)

    this.resize()
    this.loop()
  }

  private onPointer = (e: PointerEvent | MouseEvent) => {
    pointer.tX = e.clientX
    pointer.tY = e.clientY
  }

  private onTouch = (e: TouchEvent) => {
    const t = e.targetTouches[0]
    if (!t) return
    pointer.tX = t.clientX
    pointer.tY = t.clientY
  }

  private resize() {
    const gl = this.gl
    const uniforms = this.uniforms
    if (!gl || !uniforms?.u_ratio) return

    const w = Math.round(this.canvas.clientWidth * this.dpr)
    const h = Math.round(this.canvas.clientHeight * this.dpr)
    if (w === 0 || h === 0) return

    this.canvas.width = w
    this.canvas.height = h
    gl.viewport(0, 0, w, h)
    gl.uniform1f(uniforms.u_ratio, w / h)
  }

  private loop() {
    if (this.destroyed) return
    this.render()
    this.rafId = requestAnimationFrame(() => this.loop())
  }

  private render() {
    const gl = this.gl
    const uniforms = this.uniforms
    if (!gl || !uniforms) return

    pointer.x += (pointer.tX - pointer.x) * 0.2
    pointer.y += (pointer.tY - pointer.y) * 0.2

    const { a, b } = readThemeColors(this.canvas)
    const time = this.reducedMotion ? 0 : performance.now()
    const scrollY = window.pageYOffset
    const scrollProgress = scrollY / (2 * window.innerHeight)

    gl.uniform1f(uniforms.u_time, time)
    gl.uniform2f(
      uniforms.u_pointer_position,
      pointer.x / window.innerWidth,
      1 - pointer.y / window.innerHeight,
    )
    gl.uniform1f(uniforms.u_scroll_progress, scrollProgress)
    gl.uniform3f(uniforms.u_color_a, a[0], a[1], a[2])
    gl.uniform3f(uniforms.u_color_b, b[0], b[1], b[2])

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  destroy() {
    this.destroyed = true
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.ro?.disconnect()
    window.removeEventListener('pointermove', this.onPointer)
    window.removeEventListener('touchmove', this.onTouch)
    window.removeEventListener('click', this.onPointer)
    window.matchMedia('(prefers-reduced-motion: reduce)').removeEventListener('change', this.onReducedMotionChange)
  }
}
