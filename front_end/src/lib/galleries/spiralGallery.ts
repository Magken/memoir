import {
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  ClampToEdgeWrapping,
  DirectionalLight,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three'
import {
  GALLERY_EXPAND_CLICK_MOVE_PX,
  type GalleryExpandItem,
} from './galleryExpand'

export const SPIRAL_GALLERY_TEXTURE_HEIGHT = 500
export const SPIRAL_GALLERY_REFERENCE_IMAGE_COUNT = 21
export const SPIRAL_GALLERY_REFERENCE_TURNS = 2.8
export const SPIRAL_GALLERY_TILT_CLAMP = 0.35
export const SPIRAL_GALLERY_ZOOM_MIN = 0.84
export const SPIRAL_GALLERY_ZOOM_MAX = 1
export const SPIRAL_GALLERY_ZOOM_STEP = 0.05
/** Default top/bottom mask band as a fraction of stage height (`vanishing={true}`). */
export const SPIRAL_GALLERY_DEFAULT_VANISH_BAND = 0.14
/** Extra helix loops added on top of the ref base turn count (longer vertical spiral). */
export const SPIRAL_GALLERY_EXTRA_TURNS = 2

export type SpiralGallerySourceImage = {
  src: string
  alt?: string
  title?: string
  text?: string
  num?: string | number
}

export type SpiralGalleryLayoutConfig = {
  imageHeight: number
  curvature: number
  gapSize: number
  spiralRadius: number
  spiralTurns: number
  spiralHeight: number
  centerX: number
  centerY: number
  centerZ: number
  meshRotationX: number
  baseRotationX: number
  baseRotationZ: number
}

export type SpiralGalleryInertiaConfig = {
  friction: number
  strength: number
  maxSpeed: number
  directionSmoothing: number
  scrollSensitivity: number
}

/** How the spiral rig tilt is driven — drag (pointer), prop (React `tilt`), or auto (scroll-linked). */
export type SpiralGalleryTiltControl = 'drag' | 'prop' | 'auto'

/** Tilt offset in radians, added on top of layout base rotation (same space as drag tilt). */
export type SpiralGalleryTilt = {
  x?: number
  z?: number
}

/** Top/bottom edge fade — `true` (default band), `false` off, or band fraction `0.04`–`0.4`. */
export type SpiralGalleryVanishing = boolean | number

export function resolveSpiralGalleryVanishBand(
  vanishing: SpiralGalleryVanishing | undefined
): number | null {
  if (vanishing === false) return null
  if (vanishing === true || vanishing === undefined) return SPIRAL_GALLERY_DEFAULT_VANISH_BAND
  return Math.max(0.04, Math.min(0.4, vanishing))
}

export const SPIRAL_GALLERY_DEFAULT_INERTIA: SpiralGalleryInertiaConfig = {
  friction: 0.94,
  strength: 0.8,
  maxSpeed: 0.05,
  directionSmoothing: 0.92,
  scrollSensitivity: 0.0008,
}

const FRAGMENT_SHADER = `
uniform sampler2D map;
uniform float offset;
varying vec2 vUv;

void main() {
  float u = vUv.x + offset;
  if (u >= 1.0) u -= 1.0;
  if (u < 0.0) u += 1.0;
  gl_FragColor = texture2D(map, vec2(u, vUv.y));
}
`

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

type VertexJitter = {
  offsetX: number
  offsetY: number
  offsetZ: number
}

function toGalleryExpandItem(image: SpiralGallerySourceImage): GalleryExpandItem {
  return {
    src: image.src,
    alt: image.alt ?? '',
    title: image.title,
    text: image.text,
    num: image.num,
  }
}

export function buildSpiralGalleryLayout(imageCount: number): SpiralGalleryLayoutConfig {
  const countDelta = imageCount - SPIRAL_GALLERY_REFERENCE_IMAGE_COUNT
  return {
    imageHeight: 7,
    curvature: -0.03,
    gapSize: 0,
    spiralRadius: 3.5,
    spiralTurns: SPIRAL_GALLERY_REFERENCE_TURNS + SPIRAL_GALLERY_EXTRA_TURNS + countDelta * 0.1,
    spiralHeight: 12 + SPIRAL_GALLERY_EXTRA_TURNS * 4 + countDelta * 0.25,
    centerX: 0,
    centerY: 2.5,
    centerZ: 0,
    meshRotationX: 0.35,
    baseRotationX: -0.18,
    baseRotationZ: 0.12,
  }
}

/** Tile source images so atlas density matches elongated helix (+extra turns). */
export function spiralGalleryAtlasRepeatCount(sourceImageCount: number): number {
  const countDelta = sourceImageCount - SPIRAL_GALLERY_REFERENCE_IMAGE_COUNT
  const refTurns = SPIRAL_GALLERY_REFERENCE_TURNS + countDelta * 0.1
  if (SPIRAL_GALLERY_EXTRA_TURNS <= 0 || refTurns <= 0) return 1
  return Math.max(1, Math.ceil((refTurns + SPIRAL_GALLERY_EXTRA_TURNS) / refTurns))
}

export function buildSpiralAtlasImages(sourceImages: readonly SpiralGallerySourceImage[]): {
  atlasImages: SpiralGallerySourceImage[]
  sourceIndexByAtlasIndex: number[]
} {
  const repeat = spiralGalleryAtlasRepeatCount(sourceImages.length)
  const atlasImages: SpiralGallerySourceImage[] = []
  const sourceIndexByAtlasIndex: number[] = []

  for (let copy = 0; copy < repeat; copy += 1) {
    for (let index = 0; index < sourceImages.length; index += 1) {
      atlasImages.push(sourceImages[index])
      sourceIndexByAtlasIndex.push(index)
    }
  }

  return { atlasImages, sourceIndexByAtlasIndex }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${url}`))
    img.src = url
  })
}

function modPositive(value: number): number {
  let offset = value
  while (offset >= 1) offset -= 1
  while (offset < 0) offset += 1
  return offset
}

function resolveImageIndexAtU(
  u: number,
  cumulative: number[],
  gapSize: number
): number | null {
  const wrapped = modPositive(u)
  const imageRatio = 1 - gapSize
  const slotCount = cumulative.length - 1

  for (let index = 0; index < slotCount; index += 1) {
    if (wrapped < cumulative[index] || wrapped >= cumulative[index + 1]) continue
    const localU = (wrapped - cumulative[index]) / (cumulative[index + 1] - cumulative[index])
    if (localU <= imageRatio) return index
  }

  return null
}

export type SpiralGalleryEngineOptions = {
  images: readonly SpiralGallerySourceImage[]
  layout?: Partial<SpiralGalleryLayoutConfig>
  inertia?: Partial<SpiralGalleryInertiaConfig>
  reducedMotion?: boolean
  debug?: boolean
}

export type SpiralGalleryEngineCallbacks = {
  onLoadProgress?: (loaded: number, total: number) => void
  onReady?: () => void
  onImageClick?: (item: GalleryExpandItem) => void
  onDragBeyondClick?: () => void
  isInteractionPaused?: () => boolean
  getTiltControl?: () => SpiralGalleryTiltControl
  getTilt?: () => SpiralGalleryTilt
}

export type SpiralGalleryEngine = {
  dispose: () => void
}

export function createSpiralGalleryEngine(
  mount: HTMLElement,
  inputRoot: HTMLElement,
  options: SpiralGalleryEngineOptions,
  callbacks: SpiralGalleryEngineCallbacks = {}
): SpiralGalleryEngine {
  const sourceImages = [...options.images]
  const { atlasImages, sourceIndexByAtlasIndex } = buildSpiralAtlasImages(sourceImages)
  const imageItems = sourceImages.map(toGalleryExpandItem)
  const layout = { ...buildSpiralGalleryLayout(sourceImages.length), ...options.layout }
  const inertia = { ...SPIRAL_GALLERY_DEFAULT_INERTIA, ...options.inertia }
  const reducedMotion = options.reducedMotion ?? false

  let disposed = false
  let animationFrame = 0
  let scrollOffset = 0
  let targetVelocity = 0
  let currentVelocity = 0
  let acceleration = 0
  let lastWheelTimestamp = 0
  let zoomLevel = 1
  let isDragging = false
  let movedBeyondClick = false
  let dragBeyondClickNotified = false
  let pointerDownX = 0
  let pointerDownY = 0
  let previousPointerX = 0
  let previousPointerY = 0
  let dragRotation = { x: 0, z: 0 }
  let touchStartY = 0
  let touchLastY = 0
  let touchVelocity = 0
  let isTouching = false
  let lastTouchTimestamp = 0
  let isTwoFingerTilt = false
  let touchTiltStartX = 0
  let touchTiltStartY = 0

  const imageRatios: number[] = []
  const cumulativeUv: number[] = [0]
  const vertexJitter: VertexJitter[] = []
  const raycaster = new Raycaster()
  const pointerNdc = new Vector2()

  const scene = new Scene()
  scene.background = null

  const camera = new PerspectiveCamera(50, 1, 0.1, 1000)

  const renderer = new WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  mount.appendChild(renderer.domElement)

  const ambient = new AmbientLight(0xffffff, 0.6)
  scene.add(ambient)
  const mainLight = new DirectionalLight(0xffffff, 0.9)
  mainLight.position.set(5, 8, 5)
  scene.add(mainLight)

  const tiltGroup = new Group()
  tiltGroup.rotation.x = layout.baseRotationX
  tiltGroup.rotation.z = layout.baseRotationZ
  scene.add(tiltGroup)

  let spiralMesh: Mesh | null = null
  let shaderMaterial: ShaderMaterial | null = null
  let masterTexture: CanvasTexture | null = null

  const applyZoom = () => {
    const cameraLift = 1
    camera.position.set(0, (layout.centerY + cameraLift) / zoomLevel, 9 / zoomLevel)
    camera.lookAt(layout.centerX, layout.centerY, layout.centerZ)
  }

  const updateUVOffset = () => {
    if (!shaderMaterial) return
    shaderMaterial.uniforms.offset.value = modPositive(scrollOffset)
  }

  const rebuildCumulativeUv = () => {
    cumulativeUv.length = 0
    cumulativeUv.push(0)
    const widths = imageRatios.map((ratio) => ratio * layout.imageHeight)
    const totalWidth = widths.reduce((sum, width) => sum + width, 0)
    for (let index = 0; index < widths.length; index += 1) {
      cumulativeUv.push(cumulativeUv[index] + widths[index] / totalWidth)
    }
  }

  const rebuildGeometry = () => {
    if (!spiralMesh || imageRatios.length === 0) return

    const totalSlots = imageRatios.length
    const widths = imageRatios.map((ratio) => ratio * layout.imageHeight)
    const totalWidth = widths.reduce((sum, width) => sum + width, 0)
    const segmentsW = 200 + totalSlots * 20
    const segmentsH = 24

    const geometry = new PlaneGeometry(totalWidth, layout.imageHeight, segmentsW, segmentsH)
    const positions = geometry.attributes.position
    const uvs = geometry.attributes.uv

    const origX: number[] = []
    const origY: number[] = []
    for (let index = 0; index < positions.count; index += 1) {
      origX.push(positions.getX(index))
      origY.push(positions.getY(index))
    }

    rebuildCumulativeUv()
    const imageRatio = 1 - layout.gapSize

    for (let index = 0; index < uvs.count; index += 1) {
      let u = uvs.getX(index)
      u = Math.max(0, Math.min(0.999999, u))

      let found = false
      for (let slot = 0; slot < totalSlots; slot += 1) {
        if (u < cumulativeUv[slot] || u >= cumulativeUv[slot + 1]) continue

        const localU = (u - cumulativeUv[slot]) / (cumulativeUv[slot + 1] - cumulativeUv[slot])
        if (localU > imageRatio) {
          uvs.setX(index, cumulativeUv[slot + 1] - 0.001)
        } else {
          let scaledU = localU / imageRatio
          const edgeMargin = 0.001
          scaledU = Math.max(edgeMargin, Math.min(1 - edgeMargin, scaledU))
          uvs.setX(index, cumulativeUv[slot] + scaledU * (cumulativeUv[slot + 1] - cumulativeUv[slot]))
        }
        found = true
        break
      }

      if (!found) {
        uvs.setX(index, cumulativeUv[totalSlots] - 0.001)
      }
    }

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index)
      const y = positions.getY(index)
      const nx = x / (totalWidth / 2)
      const curve = layout.curvature * 0.4 * (nx * nx - 1)
      positions.setXYZ(index, x, y, -curve)
    }

    for (let index = 0; index < positions.count; index += 1) {
      const x = origX[index]
      const y = origY[index]
      let t = (x + totalWidth / 2) / totalWidth
      t = Math.max(0, Math.min(1, t))

      const angle = t * Math.PI * 2 * layout.spiralTurns
      const radius = layout.spiralRadius * (1 - t * 0.12)
      let px = Math.sin(angle) * radius
      let pz = Math.cos(angle) * radius
      let py = (t - 0.5) * layout.spiralHeight + y * 0.35

      if (!vertexJitter[index]) {
        vertexJitter[index] = {
          offsetX: (Math.random() - 0.5) * 0.001,
          offsetY: (Math.random() - 0.5) * 0.001,
          offsetZ: (Math.random() - 0.5) * 0.001,
        }
      }

      px += vertexJitter[index].offsetX
      py += vertexJitter[index].offsetY
      pz += vertexJitter[index].offsetZ
      positions.setXYZ(index, px, py, pz)
    }

    geometry.computeVertexNormals()

    const oldGeometry = spiralMesh.geometry
    spiralMesh.geometry = geometry
    oldGeometry.dispose()

    if (shaderMaterial) {
      shaderMaterial.uniforms.gap.value = layout.gapSize
    }
  }

  const createMasterTexture = async (): Promise<CanvasTexture> => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      const empty = new CanvasTexture(canvas)
      empty.wrapS = RepeatWrapping
      empty.wrapT = ClampToEdgeWrapping
      return empty
    }

    let loaded = 0
    const slots: Array<{ img: CanvasImageSource; width: number; height: number } | null> =
      atlasImages.map(() => null)
    const ratioBySrc = new Map<string, number>()
    const imageBySrc = new Map<string, CanvasImageSource>()

    const loadAtlasSource = async (source: SpiralGallerySourceImage): Promise<void> => {
      if (ratioBySrc.has(source.src) && imageBySrc.has(source.src)) return
      try {
        const img = await loadImage(source.src)
        ratioBySrc.set(source.src, img.naturalWidth / img.naturalHeight)
        imageBySrc.set(source.src, img)
      } catch {
        ratioBySrc.set(source.src, 0.8)
        const fallback = document.createElement('canvas')
        fallback.width = 400
        fallback.height = SPIRAL_GALLERY_TEXTURE_HEIGHT
        const fallbackCtx = fallback.getContext('2d')
        if (fallbackCtx) {
          fallbackCtx.fillStyle = '#222'
          fallbackCtx.fillRect(0, 0, fallback.width, fallback.height)
        }
        imageBySrc.set(source.src, fallback)
      }
    }

    await Promise.all(
      sourceImages.map(async (source) => {
        await loadAtlasSource(source)
        loaded += 1
        callbacks.onLoadProgress?.(loaded, sourceImages.length)
      })
    )

    for (let index = 0; index < atlasImages.length; index += 1) {
      const source = atlasImages[index]
      const ratio = ratioBySrc.get(source.src) ?? 0.8
      const img = imageBySrc.get(source.src)
      imageRatios[index] = ratio
      if (img) {
        slots[index] = {
          img,
          width: SPIRAL_GALLERY_TEXTURE_HEIGHT * ratio,
          height: SPIRAL_GALLERY_TEXTURE_HEIGHT,
        }
      }
    }

    const totalWidth = slots.reduce((sum, slot) => sum + (slot?.width ?? 0), 0)
    canvas.width = Math.max(totalWidth, 1)
    canvas.height = SPIRAL_GALLERY_TEXTURE_HEIGHT
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let offsetX = 0
    for (const slot of slots) {
      if (!slot) continue
      ctx.drawImage(slot.img, offsetX, 0, slot.width, slot.height)
      offsetX += slot.width
    }

    const texture = new CanvasTexture(canvas)
    texture.wrapS = RepeatWrapping
    texture.wrapT = ClampToEdgeWrapping
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.generateMipmaps = false
    texture.colorSpace = 'srgb'
    return texture
  }

  const resize = () => {
    const width = Math.max(mount.clientWidth, 1)
    const height = Math.max(mount.clientHeight, 1)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }

  const notifyDragBeyondClick = () => {
    if (dragBeyondClickNotified) return
    dragBeyondClickNotified = true
    callbacks.onDragBeyondClick?.()
  }

  const isDragTiltEnabled = () => (callbacks.getTiltControl?.() ?? 'drag') === 'drag'

  const syncTiltGroup = () => {
    tiltGroup.rotation.x = layout.baseRotationX + dragRotation.x
    tiltGroup.rotation.z = layout.baseRotationZ + dragRotation.z
  }

  const clampDragTilt = () => {
    dragRotation.x = Math.max(
      -SPIRAL_GALLERY_TILT_CLAMP,
      Math.min(SPIRAL_GALLERY_TILT_CLAMP, dragRotation.x)
    )
    dragRotation.z = Math.max(
      -SPIRAL_GALLERY_TILT_CLAMP,
      Math.min(SPIRAL_GALLERY_TILT_CLAMP, dragRotation.z)
    )
  }

  const applyTiltDelta = (dx: number, dy: number, scale: number) => {
    if (!isDragTiltEnabled()) return
    dragRotation.z += dx * scale
    dragRotation.x -= dy * scale
    clampDragTilt()
    syncTiltGroup()
  }

  const lerpDragTilt = (targetX: number, targetZ: number, factor: number) => {
    dragRotation.x += (targetX - dragRotation.x) * factor
    dragRotation.z += (targetZ - dragRotation.z) * factor
    clampDragTilt()
    syncTiltGroup()
  }

  const applyTiltFromControl = () => {
    const mode = callbacks.getTiltControl?.() ?? 'drag'
    if (mode === 'drag') return

    if (mode === 'prop') {
      const tilt = callbacks.getTilt?.() ?? {}
      lerpDragTilt(tilt.x ?? 0, tilt.z ?? 0, 0.08)
      return
    }

    const scrollDrift = currentVelocity + touchVelocity * 0.4
    const targetX = Math.max(-0.2, Math.min(0.2, scrollDrift * 5))
    const targetZ = Math.max(-0.2, Math.min(0.2, targetVelocity * 8))
    lerpDragTilt(targetX, targetZ, 0.06)
  }

  const resolveImageIndexAtNdc = (ndcX: number, ndcY: number): number | null => {
    if (!spiralMesh || cumulativeUv.length < 2) return null

    pointerNdc.set(ndcX, ndcY)
    raycaster.setFromCamera(pointerNdc, camera)
    const hits = raycaster.intersectObject(spiralMesh, false)
    if (hits.length === 0 || !hits[0].uv) return null

    const scrolledU = modPositive(hits[0].uv.x + scrollOffset)
    return resolveImageIndexAtU(scrolledU, cumulativeUv, layout.gapSize)
  }

  const resolveImageIndexAtClient = (clientX: number, clientY: number): number | null => {
    const rect = renderer.domElement.getBoundingClientRect()
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1)
    return resolveImageIndexAtNdc(ndcX, ndcY)
  }

  const resolveClickItem = (clientX: number, clientY: number): GalleryExpandItem | null => {
    const atlasIndex = resolveImageIndexAtClient(clientX, clientY)
    if (atlasIndex === null) return null
    const sourceIndex = sourceIndexByAtlasIndex[atlasIndex]
    if (sourceIndex === undefined) return null
    return imageItems[sourceIndex] ?? null
  }

  const updateTouchInertia = () => {
    if (isTouching || reducedMotion) return
    touchVelocity *= 0.95
    if (Math.abs(touchVelocity) > 0.0001) {
      scrollOffset += touchVelocity * 0.5
      updateUVOffset()
    } else {
      touchVelocity = 0
    }
  }

  const updateWheelInertia = () => {
    if (reducedMotion) return

    targetVelocity *= inertia.friction
    currentVelocity = currentVelocity * 0.85 + targetVelocity * 0.15

    if (Math.abs(currentVelocity) > 0.0001) {
      scrollOffset += currentVelocity
      updateUVOffset()
    } else {
      currentVelocity = 0
      targetVelocity = 0
      acceleration = 0
    }

    updateTouchInertia()
  }

  const onWheel = (event: WheelEvent) => {
    if (callbacks.isInteractionPaused?.()) return
    event.preventDefault()

    const now = performance.now()
    let deltaTime = Math.min(32, now - lastWheelTimestamp)
    if (deltaTime < 1) deltaTime = 16
    lastWheelTimestamp = now

    const rawDelta = event.deltaY * inertia.scrollSensitivity * inertia.strength
    const maxAccel = 0.015
    let deltaAccel = rawDelta - acceleration
    deltaAccel = Math.max(-maxAccel, Math.min(maxAccel, deltaAccel))
    acceleration += deltaAccel
    acceleration = Math.max(-0.03, Math.min(0.03, acceleration))

    targetVelocity =
      targetVelocity * inertia.directionSmoothing + acceleration * (1 - inertia.directionSmoothing)
    targetVelocity = Math.max(-inertia.maxSpeed, Math.min(inertia.maxSpeed, targetVelocity))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (callbacks.isInteractionPaused?.()) return

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      zoomLevel = Math.min(SPIRAL_GALLERY_ZOOM_MAX, zoomLevel + SPIRAL_GALLERY_ZOOM_STEP)
      applyZoom()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      zoomLevel = Math.max(SPIRAL_GALLERY_ZOOM_MIN, zoomLevel - SPIRAL_GALLERY_ZOOM_STEP)
      applyZoom()
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || callbacks.isInteractionPaused?.()) return
    pointerDownX = event.clientX
    pointerDownY = event.clientY
    previousPointerX = event.clientX
    previousPointerY = event.clientY
    movedBeyondClick = false
    dragBeyondClickNotified = false
    isDragging = true
    inputRoot.setPointerCapture(event.pointerId)
    if (isDragTiltEnabled()) {
      inputRoot.classList.add('theme-spiral-gallery__root--dragging')
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!isDragging) return

    const dxTotal = event.clientX - pointerDownX
    const dyTotal = event.clientY - pointerDownY
    if (Math.hypot(dxTotal, dyTotal) > GALLERY_EXPAND_CLICK_MOVE_PX) {
      movedBeyondClick = true
      notifyDragBeyondClick()
    }

    if (callbacks.isInteractionPaused?.()) return

    const dx = event.clientX - previousPointerX
    const dy = event.clientY - previousPointerY
    applyTiltDelta(dx, dy, 0.002)
    previousPointerX = event.clientX
    previousPointerY = event.clientY
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!isDragging) return
    isDragging = false
    if (inputRoot.hasPointerCapture(event.pointerId)) {
      inputRoot.releasePointerCapture(event.pointerId)
    }
    inputRoot.classList.remove('theme-spiral-gallery__root--dragging')

    if (!movedBeyondClick && !callbacks.isInteractionPaused?.()) {
      const item = resolveClickItem(event.clientX, event.clientY)
      if (item) callbacks.onImageClick?.(item)
    }
  }

  const onTouchStart = (event: TouchEvent) => {
    if (callbacks.isInteractionPaused?.()) return

    if (event.touches.length === 1) {
      event.preventDefault()
      isTouching = true
      touchStartY = event.touches[0]?.clientY ?? 0
      touchLastY = touchStartY
      touchVelocity = 0
      lastTouchTimestamp = performance.now()
    } else if (event.touches.length === 2) {
      isTwoFingerTilt = true
      touchTiltStartX = event.touches[1]?.clientX ?? 0
      touchTiltStartY = event.touches[1]?.clientY ?? 0
    }
  }

  const onTouchMove = (event: TouchEvent) => {
    if (callbacks.isInteractionPaused?.()) return

    if (isDragTiltEnabled() && isTwoFingerTilt && event.touches.length === 2) {
      event.preventDefault()
      const dx = (event.touches[1]?.clientX ?? touchTiltStartX) - touchTiltStartX
      const dy = (event.touches[1]?.clientY ?? touchTiltStartY) - touchTiltStartY
      applyTiltDelta(dx, dy, 0.003)
      touchTiltStartX = event.touches[1]?.clientX ?? touchTiltStartX
      touchTiltStartY = event.touches[1]?.clientY ?? touchTiltStartY
      return
    }

    if (!isTouching) return
    event.preventDefault()

    const now = performance.now()
    let deltaTime = Math.min(32, now - lastTouchTimestamp)
    if (deltaTime < 1) deltaTime = 16
    lastTouchTimestamp = now

    const currentY = event.touches[0]?.clientY ?? touchLastY
    const deltaY = currentY - touchLastY
    const rawVelocity = deltaY * inertia.scrollSensitivity * inertia.strength * 0.5
    touchVelocity = touchVelocity * 0.7 + rawVelocity * 0.3
    scrollOffset += deltaY * inertia.scrollSensitivity * inertia.strength * 0.8
    updateUVOffset()
    touchLastY = currentY
  }

  const onTouchEnd = (event: TouchEvent) => {
    if (event.touches.length === 0) {
      isTouching = false
      if (Math.abs(touchVelocity) > 0.001) {
        targetVelocity = Math.max(
          -inertia.maxSpeed * 1.5,
          Math.min(inertia.maxSpeed * 1.5, touchVelocity * 1.2)
        )
      }
      touchVelocity = 0
    }
    if (event.touches.length < 2) {
      isTwoFingerTilt = false
    }
  }

  const onContextMenu = (event: Event) => {
    event.preventDefault()
  }

  const animate = () => {
    if (disposed) return
    animationFrame = requestAnimationFrame(animate)
    updateWheelInertia()
    applyTiltFromControl()
    renderer.render(scene, camera)
  }

  const init = async () => {
    masterTexture = await createMasterTexture()
    if (disposed) return

    shaderMaterial = new ShaderMaterial({
      uniforms: {
        map: { value: masterTexture },
        gap: { value: layout.gapSize },
        offset: { value: 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      side: DoubleSide,
    })

    spiralMesh = new Mesh(new BufferGeometry(), shaderMaterial)
    spiralMesh.position.set(layout.centerX, layout.centerY, layout.centerZ)
    spiralMesh.rotation.x = layout.meshRotationX
    tiltGroup.add(spiralMesh)

    rebuildGeometry()
    resize()
    applyZoom()
    callbacks.onReady?.()
    if (options.debug) {
      console.debug('[SpiralGallery] ready', {
        sourceImageCount: sourceImages.length,
        atlasImageCount: atlasImages.length,
        atlasRepeat: spiralGalleryAtlasRepeatCount(sourceImages.length),
      })
    }
    animate()
  }

  inputRoot.addEventListener('wheel', onWheel, { passive: false })
  inputRoot.addEventListener('keydown', onKeyDown)
  inputRoot.addEventListener('pointerdown', onPointerDown)
  inputRoot.addEventListener('pointermove', onPointerMove)
  inputRoot.addEventListener('pointerup', onPointerUp)
  inputRoot.addEventListener('pointercancel', onPointerUp)
  inputRoot.addEventListener('touchstart', onTouchStart, { passive: false })
  inputRoot.addEventListener('touchmove', onTouchMove, { passive: false })
  inputRoot.addEventListener('touchend', onTouchEnd)
  renderer.domElement.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('resize', resize)

  void init()

  return {
    dispose: () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
      inputRoot.removeEventListener('wheel', onWheel)
      inputRoot.removeEventListener('keydown', onKeyDown)
      inputRoot.removeEventListener('pointerdown', onPointerDown)
      inputRoot.removeEventListener('pointermove', onPointerMove)
      inputRoot.removeEventListener('pointerup', onPointerUp)
      inputRoot.removeEventListener('pointercancel', onPointerUp)
      inputRoot.removeEventListener('touchstart', onTouchStart)
      inputRoot.removeEventListener('touchmove', onTouchMove)
      inputRoot.removeEventListener('touchend', onTouchEnd)
      renderer.domElement.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('resize', resize)

      if (spiralMesh) {
        spiralMesh.geometry.dispose()
        tiltGroup.remove(spiralMesh)
      }
      spiralMesh = null
      shaderMaterial?.dispose()
      masterTexture?.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
