import {
  LinearFilter,
  Mesh,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from 'three'

export const IMAGE_DRAG_GL_SCALE_MIN = 0.65
export const IMAGE_DRAG_GL_SCALE_MAX = 1
export const IMAGE_DRAG_GL_VELO_FACTOR = 0.0025
export const IMAGE_DRAG_GL_SCALE_LERP = 0.14

const BACKGROUND_COVER_UV = `
vec2 backgroundCoverUv(vec2 screenSize, vec2 imageSize, vec2 uv) {
  float screenRatio = screenSize.x / screenSize.y;
  float imageRatio = imageSize.x / imageSize.y;

  vec2 newSize = screenRatio < imageRatio
      ? vec2(imageSize.x * screenSize.y / imageSize.y, screenSize.y)
      : vec2(screenSize.x, imageSize.y * screenSize.x / imageSize.x);

  vec2 newOffset = (screenRatio < imageRatio
      ? vec2((newSize.x - screenSize.x) / 2.0, 0.0)
      : vec2(0.0, (newSize.y - screenSize.y) / 2.0)) / newSize;

  return uv * screenSize / newSize + newOffset;
}
`

const VERTEX_SHADER = `
precision mediump float;

uniform float uVelo;

varying vec2 vUv;

#define M_PI 3.1415926535897932384626433832795

void main() {
  vec3 pos = position;
  pos.x = pos.x + ((sin(uv.y * M_PI) * uVelo) * 0.125);

  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const FRAGMENT_SHADER = `
precision mediump float;

${BACKGROUND_COVER_UV}

uniform sampler2D uTexture;

uniform vec2 uMeshSize;
uniform vec2 uImageSize;

uniform float uVelo;
uniform float uScale;

varying vec2 vUv;

void main() {
  vec2 texCenter = vec2(0.5);
  vec2 texUv = backgroundCoverUv(uMeshSize, uImageSize, vUv);
  vec2 texScale = (texUv - texCenter) * uScale + texCenter;
  vec4 color = texture2D(uTexture, texScale);

  texScale.x += 0.15 * uVelo;
  if (vUv.x < 1.0) color.g = texture2D(uTexture, texScale).g;

  texScale.x += 0.10 * uVelo;
  if (vUv.x < 1.0) color.b = texture2D(uTexture, texScale).b;

  gl_FragColor = color;
}
`

const sharedGeometry = new PlaneGeometry(1, 1, 32, 32)
const textureLoader = new TextureLoader()
textureLoader.crossOrigin = 'anonymous'

type SlideSlot = {
  root: Object3D
  mesh: Mesh
  material: ShaderMaterial
  img: HTMLImageElement
  texture: Texture | null
}

export type ImageDragGlEngineOptions = {
  reducedMotion?: boolean
}

export type ImageDragGlEngine = {
  resize: () => void
  rebuild: () => void
  setPaused: (paused: boolean) => void
  dispose: () => void
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function focusScaleForRect(rect: DOMRect, viewportRect: DOMRect): number {
  const viewportCenter = viewportRect.left + viewportRect.width / 2
  const slideCenter = rect.left + rect.width / 2
  const distance = Math.abs(slideCenter - viewportCenter)
  const radius = Math.max(rect.width * 1.15, 1)
  const focus = clamp01(1 - distance / radius)
  return IMAGE_DRAG_GL_SCALE_MIN + (IMAGE_DRAG_GL_SCALE_MAX - IMAGE_DRAG_GL_SCALE_MIN) * focus
}

export function createImageDragGlEngine(
  viewport: HTMLElement,
  track: HTMLElement,
  options: ImageDragGlEngineOptions = {}
): ImageDragGlEngine {
  const reducedMotion = options.reducedMotion ?? false
  let disposed = false
  let paused = false
  let animationFrame = 0
  let lastTrackLeft = 0
  let hasLastTrackLeft = false
  const slots: SlideSlot[] = []

  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 1

  const renderer = new WebGLRenderer({ alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const canvasHost = document.createElement('div')
  canvasHost.className = 'theme-img-drag-carousel__gl-host'
  canvasHost.setAttribute('aria-hidden', 'true')
  viewport.prepend(canvasHost)
  canvasHost.appendChild(renderer.domElement)

  const disposeSlot = (slot: SlideSlot) => {
    scene.remove(slot.root)
    slot.material.dispose()
    slot.texture?.dispose()
  }

  const loadTexture = (slot: SlideSlot) => {
    const src = slot.img.currentSrc || slot.img.src
    if (!src) return

    textureLoader.load(
      src,
      (texture) => {
        if (disposed || !slots.includes(slot)) return
        texture.minFilter = LinearFilter
        slot.texture?.dispose()
        slot.texture = texture
        slot.material.uniforms.uTexture.value = texture
        slot.material.uniforms.uImageSize.value.set(
          slot.img.naturalWidth || 1,
          slot.img.naturalHeight || 1
        )
      },
      undefined,
      () => {
        /* keep prior / empty */
      }
    )
  }

  const rebuild = () => {
    for (const slot of slots) {
      disposeSlot(slot)
    }
    slots.length = 0
    hasLastTrackLeft = false

    const slideNodes = track.querySelectorAll<HTMLElement>('.theme-img-drag-carousel__slide')
    for (const slide of slideNodes) {
      const img = slide.querySelector<HTMLImageElement>('.theme-img-drag-carousel__image')
      if (!img) continue

      const material = new ShaderMaterial({
        transparent: true,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uTexture: { value: null },
          uMeshSize: { value: new Vector2(1, 1) },
          uImageSize: { value: new Vector2(1, 1) },
          uVelo: { value: 0 },
          uScale: { value: IMAGE_DRAG_GL_SCALE_MIN },
        },
      })

      const mesh = new Mesh(sharedGeometry, material)
      const root = new Object3D()
      root.add(mesh)
      scene.add(root)

      const slot: SlideSlot = { root, mesh, material, img, texture: null }
      slots.push(slot)

      if (img.complete && img.naturalWidth > 0) {
        loadTexture(slot)
      } else {
        img.addEventListener('load', () => loadTexture(slot), { once: true })
      }
    }
  }

  const resize = () => {
    const width = Math.max(viewport.clientWidth, 1)
    const height = Math.max(viewport.clientHeight, 1)
    camera.left = -width / 2
    camera.right = width / 2
    camera.top = height / 2
    camera.bottom = -height / 2
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }

  const syncSlots = (velocity: number) => {
    const viewportRect = viewport.getBoundingClientRect()
    const width = viewportRect.width
    const height = viewportRect.height

    for (const slot of slots) {
      const rect = slot.img.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) continue

      const cx = rect.left + rect.width / 2 - viewportRect.left - width / 2
      const cy = -(rect.top + rect.height / 2 - viewportRect.top - height / 2)

      slot.root.position.set(cx, cy, 0)
      slot.mesh.scale.set(rect.width, rect.height, 1)
      slot.material.uniforms.uMeshSize.value.set(rect.width, rect.height)

      const targetScale = focusScaleForRect(rect, viewportRect)
      const currentScale = slot.material.uniforms.uScale.value as number
      slot.material.uniforms.uScale.value =
        currentScale + (targetScale - currentScale) * IMAGE_DRAG_GL_SCALE_LERP

      slot.material.uniforms.uVelo.value = reducedMotion ? 0 : velocity
    }
  }

  const tick = () => {
    if (disposed) return
    animationFrame = requestAnimationFrame(tick)

    if (paused || slots.length === 0) {
      renderer.render(scene, camera)
      return
    }

    const trackRect = track.getBoundingClientRect()
    let velocity = 0
    if (hasLastTrackLeft) {
      velocity = (trackRect.left - lastTrackLeft) * IMAGE_DRAG_GL_VELO_FACTOR
    }
    lastTrackLeft = trackRect.left
    hasLastTrackLeft = true

    syncSlots(velocity)
    renderer.render(scene, camera)
  }

  resize()
  rebuild()
  tick()

  const resizeObserver = new ResizeObserver(() => {
    resize()
    hasLastTrackLeft = false
  })
  resizeObserver.observe(viewport)

  return {
    resize,
    rebuild,
    setPaused(pausedState: boolean) {
      paused = pausedState
      if (paused) {
        for (const slot of slots) {
          slot.material.uniforms.uVelo.value = 0
        }
      }
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      for (const slot of slots) {
        disposeSlot(slot)
      }
      slots.length = 0
      renderer.dispose()
      canvasHost.remove()
    },
  }
}
