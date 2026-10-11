import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  WebGLRenderer,
} from 'three'
import {
  GALLERY_EXPAND_CLICK_MOVE_PX,
  type GalleryExpandItem,
} from './galleryExpand'

export const BAND_GALLERY_BAND_HEIGHT = 120
export const BAND_GALLERY_IMAGE_HEIGHT = 100
export const BAND_GALLERY_IMAGE_GAP = 20
export const BAND_GALLERY_CLONE_COUNT = 3
export const BAND_GALLERY_MAX_IMAGE_WIDTH = 300
export const BAND_GALLERY_INERTIA = 0.92
export const BAND_GALLERY_DEFAULT_IMAGES_PER_BAND = [8, 12, 9, 13, 14, 10, 9, 13] as const

export type BandGalleryBandConfig = {
  offsetY: number
  speed: number
  rotation: number
  rotationType?: 'fromLeft' | 'fromCenter'
  name?: string
  curveAmount: number
  curveDirection: number
}

export const BAND_GALLERY_DEFAULT_BAND_CONFIGS: readonly BandGalleryBandConfig[] = [
  { offsetY: -110, speed: 1.0, rotation: (7 * Math.PI) / 180, rotationType: 'fromLeft', name: 'Haut 1', curveAmount: 40, curveDirection: 1 },
  { offsetY: -330, speed: 1.3, rotation: (7 * Math.PI) / 180, rotationType: 'fromCenter', name: 'Haut 2', curveAmount: 35, curveDirection: 1 },
  { offsetY: -440, speed: 1.6, rotation: (7 * Math.PI) / 180, rotationType: 'fromLeft', name: 'Centre Haut', curveAmount: 40, curveDirection: 1 },
  { offsetY: -220, speed: 0.7, rotation: (7 * Math.PI) / 180, name: 'Centrale', curveAmount: 40, curveDirection: 1 },
  { offsetY: 0, speed: 0.4, rotation: (7 * Math.PI) / 180, name: 'Centre Bas', curveAmount: 40, curveDirection: 1 },
  { offsetY: 110, speed: 1.2, rotation: (7 * Math.PI) / 180, name: 'Bas 1', curveAmount: 40, curveDirection: 1 },
  { offsetY: 220, speed: 0.8, rotation: (7 * Math.PI) / 180, name: 'Bas 2', curveAmount: 40, curveDirection: 1 },
  { offsetY: 330, speed: 1.4, rotation: (7 * Math.PI) / 180, name: 'Très Bas', curveAmount: 40, curveDirection: 1 },
]

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform float uTextureWidth;
uniform float uSequenceWidth;
uniform float uBandHeight;
uniform float uScroll;
uniform float uSpeed;
uniform float uOffsetY;
uniform float uRotation;
uniform float uRotationType;
uniform float uHasRotation;
uniform float uBandIndex;
uniform float uCurveAmount;
uniform float uCurveDirection;

varying vec2 vUv;

mat2 rotate2d(float angle) {
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void main() {
  vec2 pixelCoord = vUv * uResolution;
  vec2 originalPixelCoord = pixelCoord;

  float normalizedX = pixelCoord.x / uResolution.x;
  float curveFactor = 4.0 * (normalizedX - 0.5) * (normalizedX - 0.5);
  float curveOffset = (0.5 - curveFactor) * uCurveAmount * uCurveDirection;

  float bandTopBase = (uResolution.y - uBandHeight) * 0.5 + uOffsetY;
  float bandTop = bandTopBase + curveOffset;
  float bandBottom = bandTop + uBandHeight;
  float bandCenterY = bandTopBase + (uBandHeight * 0.5);

  if (uHasRotation > 0.5) {
    vec2 rotationCenter;
    if (uRotationType > 0.5) {
      rotationCenter = vec2(0.0, bandCenterY);
    } else {
      rotationCenter = vec2(uResolution.x * 0.5, bandCenterY);
    }

    pixelCoord -= rotationCenter;
    pixelCoord = rotate2d(uRotation) * pixelCoord;
    pixelCoord += rotationCenter;

    originalPixelCoord -= rotationCenter;
    originalPixelCoord = rotate2d(uRotation) * originalPixelCoord;
    originalPixelCoord += rotationCenter;

    vec2 rotatedBandTop = vec2(0.0, bandTop);
    vec2 rotatedBandBottom = vec2(0.0, bandBottom);
    rotatedBandTop -= rotationCenter;
    rotatedBandTop = rotate2d(uRotation) * rotatedBandTop;
    rotatedBandTop += rotationCenter;
    rotatedBandBottom -= rotationCenter;
    rotatedBandBottom = rotate2d(uRotation) * rotatedBandBottom;
    rotatedBandBottom += rotationCenter;

    bandTop = min(rotatedBandTop.y, rotatedBandBottom.y);
    bandBottom = max(rotatedBandTop.y, rotatedBandBottom.y);
  }

  float margin = 3.0;
  if (pixelCoord.y < bandTop - margin || pixelCoord.y > bandBottom + margin) {
    discard;
    return;
  }

  float scrollPos = uScroll * uSpeed;
  float wrappedX = mod(originalPixelCoord.x + scrollPos, uSequenceWidth);
  float cloneIndex = 1.0;
  float textureX = (wrappedX + (cloneIndex * uSequenceWidth)) / uTextureWidth;
  float texY = (pixelCoord.y - bandTop) / (bandBottom - bandTop);

  if (textureX < 0.0 || textureX > 1.0 || texY < 0.0 || texY > 1.0) {
    discard;
    return;
  }

  vec4 color = texture2D(uTexture, vec2(textureX, texY));
  if (color.a < 0.5) {
    discard;
    return;
  }

  float edge = min(pixelCoord.y - bandTop, bandBottom - pixelCoord.y);
  if (edge < margin) {
    color.a *= smoothstep(0.0, margin, edge);
  }
  if (color.a < 0.01) {
    discard;
    return;
  }

  float hueShift = uBandIndex * 0.1;
  color.r *= (1.0 + sin(hueShift) * 0.02);
  color.g *= (1.0 + sin(hueShift + 2.094) * 0.02);
  color.b *= (1.0 + sin(hueShift + 4.188) * 0.02);

  gl_FragColor = color;
}
`

type LoadedBandImage = {
  loaded: boolean
  img: HTMLImageElement | HTMLCanvasElement
  width: number
  height: number
}

type BandTextureData = {
  canvas: HTMLCanvasElement
  totalWidth: number
  sequenceWidth: number
}

export type BandGallerySourceImage = {
  src: string
  alt?: string
  title?: string
  text?: string
  num?: string | number
}

export type BandGalleryDistribution = {
  urls: string[][]
  items: GalleryExpandItem[][]
}

function toGalleryExpandItem(image: BandGallerySourceImage): GalleryExpandItem {
  return {
    src: image.src,
    alt: image.alt ?? '',
    title: image.title,
    text: image.text,
    num: image.num,
  }
}

export function distributeBandGallerySlots(
  images: readonly BandGallerySourceImage[],
  imagesPerBand: readonly number[] = BAND_GALLERY_DEFAULT_IMAGES_PER_BAND
): BandGalleryDistribution {
  if (images.length === 0) {
    return {
      urls: imagesPerBand.map(() => []),
      items: imagesPerBand.map(() => []),
    }
  }

  const urls: string[][] = imagesPerBand.map(() => [])
  const items: GalleryExpandItem[][] = imagesPerBand.map(() => [])
  let index = 0
  for (let bandIndex = 0; bandIndex < imagesPerBand.length; bandIndex += 1) {
    for (let slot = 0; slot < imagesPerBand[bandIndex]; slot += 1) {
      const source = images[index % images.length]
      urls[bandIndex].push(source.src)
      items[bandIndex].push(toGalleryExpandItem(source))
      index += 1
    }
  }
  return { urls, items }
}

export function distributeBandGalleryImages(
  images: readonly BandGallerySourceImage[],
  imagesPerBand: readonly number[] = BAND_GALLERY_DEFAULT_IMAGES_PER_BAND
): string[][] {
  return distributeBandGallerySlots(images, imagesPerBand).urls
}

type BandImageSegment = {
  startX: number
  width: number
  height: number
  centeredY: number
  item: GalleryExpandItem
}

type BandHitBand = {
  bandIndex: number
  config: BandGalleryBandConfig
  sequenceWidth: number
  segments: BandImageSegment[]
}

const BAND_GALLERY_HIT_MARGIN = 3

function modPositive(value: number, width: number): number {
  if (width <= 0) return 0
  return ((value % width) + width) % width
}

function rotateBandPoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angle: number
): { x: number; y: number } {
  const dx = x - centerX
  const dy = y - centerY
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: cos * dx - sin * dy + centerX,
    y: sin * dx + cos * dy + centerY,
  }
}

function buildBandImageSegments(
  images: LoadedBandImage[],
  slotItems: GalleryExpandItem[]
): BandImageSegment[] {
  const segments: BandImageSegment[] = []
  let currentX = 0

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index]
    segments.push({
      startX: currentX,
      width: image.width,
      height: image.height,
      centeredY: (BAND_GALLERY_BAND_HEIGHT - image.height) / 2,
      item: slotItems[index] ?? { src: '', alt: '' },
    })
    currentX += image.width + BAND_GALLERY_IMAGE_GAP
  }

  return segments
}

function resolveBandGalleryHit(
  pixelX: number,
  pixelY: number,
  resolution: { width: number; height: number },
  scrollY: number,
  bands: BandHitBand[]
): GalleryExpandItem | null {
  const margin = BAND_GALLERY_HIT_MARGIN

  for (let bandOffset = bands.length - 1; bandOffset >= 0; bandOffset -= 1) {
    const band = bands[bandOffset]
    const { config, sequenceWidth, segments } = band
    if (sequenceWidth <= 0 || segments.length === 0) continue

    let pixelCoordX = pixelX
    let pixelCoordY = pixelY
    let originalPixelCoordX = pixelX

    const normalizedX = pixelCoordX / resolution.width
    const curveFactor = 4 * (normalizedX - 0.5) * (normalizedX - 0.5)
    const curveOffset = (0.5 - curveFactor) * config.curveAmount * config.curveDirection

    const bandTopBase = (resolution.height - BAND_GALLERY_BAND_HEIGHT) * 0.5 + config.offsetY
    let bandTop = bandTopBase + curveOffset
    let bandBottom = bandTop + BAND_GALLERY_BAND_HEIGHT
    const bandCenterY = bandTopBase + BAND_GALLERY_BAND_HEIGHT * 0.5

    if (config.rotation !== 0) {
      const fromCenter = config.rotationType === 'fromCenter'
      const rotationCenterX = fromCenter ? 0 : resolution.width * 0.5
      const rotationCenterY = bandCenterY
      const angle = config.rotation

      const rotatedPixel = rotateBandPoint(
        pixelCoordX,
        pixelCoordY,
        rotationCenterX,
        rotationCenterY,
        angle
      )
      pixelCoordX = rotatedPixel.x
      pixelCoordY = rotatedPixel.y

      const rotatedOriginal = rotateBandPoint(
        originalPixelCoordX,
        pixelY,
        rotationCenterX,
        rotationCenterY,
        angle
      )
      originalPixelCoordX = rotatedOriginal.x

      const rotatedTop = rotateBandPoint(0, bandTop, rotationCenterX, rotationCenterY, angle)
      const rotatedBottom = rotateBandPoint(0, bandBottom, rotationCenterX, rotationCenterY, angle)
      bandTop = Math.min(rotatedTop.y, rotatedBottom.y)
      bandBottom = Math.max(rotatedTop.y, rotatedBottom.y)
    }

    if (pixelCoordY < bandTop - margin || pixelCoordY > bandBottom + margin) continue

    const scrollPos = scrollY * config.speed
    const wrappedX = modPositive(originalPixelCoordX + scrollPos, sequenceWidth)

    for (const segment of segments) {
      if (wrappedX < segment.startX || wrappedX >= segment.startX + segment.width) continue

      const pyInBand = pixelCoordY - bandTop
      if (
        pyInBand >= segment.centeredY - margin &&
        pyInBand <= segment.centeredY + segment.height + margin
      ) {
        return segment.item
      }
    }
  }

  return null
}

function calculateImageDimensions(height: number, ratio: number): { width: number; height: number } {
  let width = Math.round(height * ratio)
  if (width > BAND_GALLERY_MAX_IMAGE_WIDTH) {
    width = BAND_GALLERY_MAX_IMAGE_WIDTH
    height = Math.round(width / ratio)
  }
  return { width, height }
}

function createFallbackCanvas(bandIndex: number, imageIndex: number): HTMLCanvasElement {
  const ratios = [1.5, 1.333, 1.777, 1.0, 0.75]
  const ratio = ratios[Math.floor(Math.random() * ratios.length)]
  const { width, height } = calculateImageDimensions(BAND_GALLERY_IMAGE_HEIGHT, ratio)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const hues = [210, 180, 150, 120, 90, 60, 30, 0]
  ctx.fillStyle = `hsl(${hues[bandIndex] ?? 0}, 70%, 60%)`
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = 'white'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`Band ${bandIndex + 1}`, width / 2, height / 2 - 8)
  ctx.fillText(`Image ${imageIndex + 1}`, width / 2, height / 2 + 8)
  return canvas
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${url}`))
    try {
      const parsed = new URL(url, window.location.href)
      parsed.searchParams.set('auto', 'format')
      parsed.searchParams.set('fit', 'crop')
      img.src = parsed.toString()
    } catch {
      img.src = url
    }
  })
}

async function loadBandImages(
  urls: string[],
  bandIndex: number,
  onImageLoaded?: () => void
): Promise<LoadedBandImage[]> {
  const results: LoadedBandImage[] = []

  for (let i = 0; i < urls.length; i += 1) {
    try {
      const img = await loadImage(urls[i])
      const originalRatio = img.naturalWidth / img.naturalHeight
      let targetHeight = BAND_GALLERY_IMAGE_HEIGHT
      let targetWidth = Math.round(targetHeight * originalRatio)
      if (targetWidth > BAND_GALLERY_MAX_IMAGE_WIDTH) {
        targetWidth = BAND_GALLERY_MAX_IMAGE_WIDTH
        targetHeight = Math.round(targetWidth / originalRatio)
      }
      results.push({
        loaded: true,
        img,
        width: targetWidth,
        height: targetHeight,
      })
    } catch {
      const canvas = createFallbackCanvas(bandIndex, i)
      results.push({
        loaded: true,
        img: canvas,
        width: canvas.width,
        height: canvas.height,
      })
    }
    onImageLoaded?.()
  }

  return results
}

function createHorizontalTextureForBand(images: LoadedBandImage[]): BandTextureData {
  let sequenceWidth = 0
  for (const image of images) {
    if (image.loaded) sequenceWidth += image.width + BAND_GALLERY_IMAGE_GAP
  }
  sequenceWidth -= BAND_GALLERY_IMAGE_GAP
  const totalWidth = sequenceWidth * BAND_GALLERY_CLONE_COUNT

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(totalWidth, 1)
  canvas.height = BAND_GALLERY_BAND_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return { canvas, totalWidth: Math.max(totalWidth, 1), sequenceWidth: Math.max(sequenceWidth, 1) }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  let currentX = 0
  for (let clone = 0; clone < BAND_GALLERY_CLONE_COUNT; clone += 1) {
    for (const image of images) {
      if (!image.loaded) continue
      const centeredY = (BAND_GALLERY_BAND_HEIGHT - image.height) / 2
      ctx.save()
      ctx.globalAlpha = 0.9
      ctx.drawImage(image.img, currentX, centeredY, image.width, image.height)
      ctx.restore()
      currentX += image.width + BAND_GALLERY_IMAGE_GAP
    }
  }

  return { canvas, totalWidth, sequenceWidth: Math.max(sequenceWidth, 1) }
}

export type BandGalleryEngineOptions = {
  bandImageUrls: string[][]
  bandSlotItems?: GalleryExpandItem[][]
  bandConfigs?: readonly BandGalleryBandConfig[]
  reducedMotion?: boolean
  /** When false, horizontal scroll is drag / touch / keys only — wheel does not pan bands. */
  wheelNav?: boolean
  debug?: boolean
}

export type BandGalleryEngineCallbacks = {
  onLoadProgress?: (loaded: number, total: number) => void
  onReady?: () => void
  onImageClick?: (item: GalleryExpandItem) => void
  onDragBeyondClick?: () => void
  isInteractionPaused?: () => boolean
}

export type BandGalleryEngine = {
  dispose: () => void
  resetScroll: () => void
  /** True when band scroll is at rest near origin — for page wheel handoff. */
  isAtScrollOrigin: () => boolean
  applyWheelDelta: (deltaY: number) => void
}

export function createBandGalleryEngine(
  mount: HTMLElement,
  inputRoot: HTMLElement,
  options: BandGalleryEngineOptions,
  callbacks: BandGalleryEngineCallbacks = {}
): BandGalleryEngine {
  const bandConfigs = options.bandConfigs ?? BAND_GALLERY_DEFAULT_BAND_CONFIGS
  const reducedMotion = options.reducedMotion ?? false
  const wheelNav = options.wheelNav ?? true
  const inertia = reducedMotion ? 0 : BAND_GALLERY_INERTIA

  let scrollY = 0
  let targetScrollY = 0
  let scrollVelocity = 0
  let isDragging = false
  let lastPointerY = 0
  let pointerDownX = 0
  let pointerDownY = 0
  let movedBeyondClick = false
  let dragBeyondClickNotified = false
  let animationFrame = 0
  let disposed = false
  let bandHitBands: BandHitBand[] = []

  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 1

  const renderer = new WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(mount.clientWidth, mount.clientHeight)
  mount.appendChild(renderer.domElement)

  const materials: ShaderMaterial[] = []
  const meshes: Mesh[] = []
  const textures: Texture[] = []

  const resize = () => {
    const width = mount.clientWidth
    const height = mount.clientHeight
    renderer.setSize(width, height)
    for (const material of materials) {
      material.uniforms.uResolution.value.set(width, height)
    }
  }

  const cleanupMeshes = () => {
    for (const mesh of meshes) {
      scene.remove(mesh)
      mesh.geometry.dispose()
    }
    for (const material of materials) {
      material.dispose()
    }
    for (const texture of textures) {
      texture.dispose()
    }
    meshes.length = 0
    materials.length = 0
    textures.length = 0
  }

  const buildBands = async () => {
    cleanupMeshes()
    bandHitBands = []
    let loaded = 0
    const total = options.bandImageUrls.reduce((sum, band) => sum + band.length, 0)
    const onImageLoaded = () => {
      loaded += 1
      callbacks.onLoadProgress?.(loaded, total)
    }

    const bandResults = await Promise.all(
      bandConfigs.map(async (config, bandIndex) => {
        const urls = options.bandImageUrls[bandIndex] ?? []
        const slotItems =
          options.bandSlotItems?.[bandIndex] ?? urls.map((src) => ({ src, alt: '' }))
        const images = await loadBandImages(urls, bandIndex, onImageLoaded)
        const textureData = createHorizontalTextureForBand(images)
        const texture = new Texture(textureData.canvas)
        texture.needsUpdate = true
        textures.push(texture)
        return {
          bandIndex,
          config,
          texture,
          textureData,
          segments: buildBandImageSegments(images, slotItems),
        }
      })
    )

    if (disposed) return

    for (const { bandIndex, config, texture, textureData, segments } of bandResults) {
      bandHitBands.push({
        bandIndex,
        config,
        sequenceWidth: textureData.sequenceWidth,
        segments,
      })
      const material = new ShaderMaterial({
        uniforms: {
          uResolution: { value: new Vector2(mount.clientWidth, mount.clientHeight) },
          uTexture: { value: texture },
          uTextureWidth: { value: textureData.totalWidth },
          uSequenceWidth: { value: textureData.sequenceWidth },
          uBandHeight: { value: BAND_GALLERY_BAND_HEIGHT },
          uScroll: { value: 0 },
          uSpeed: { value: config.speed },
          uOffsetY: { value: config.offsetY },
          uRotation: { value: config.rotation },
          uRotationType: { value: config.rotationType === 'fromLeft' ? 1 : 0 },
          uHasRotation: { value: config.rotation !== 0 ? 1 : 0 },
          uBandIndex: { value: bandIndex },
          uCurveAmount: { value: config.curveAmount },
          uCurveDirection: { value: config.curveDirection },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      })
      materials.push(material)
      const mesh = new Mesh(new PlaneGeometry(2, 2), material)
      mesh.position.z = bandIndex * -0.1
      scene.add(mesh)
      meshes.push(mesh)
    }

    resize()
    callbacks.onReady?.()
    if (options.debug) {
      console.debug('[BandGallery] bands ready', { bandCount: bandResults.length, totalImages: total })
    }
  }

  const onWheel = (event: WheelEvent) => {
    if (callbacks.isInteractionPaused?.()) return
    event.preventDefault()
    applyWheelDelta(event.deltaY)
  }

  const applyWheelDelta = (deltaY: number) => {
    if (callbacks.isInteractionPaused?.()) return
    targetScrollY += deltaY
    scrollVelocity = deltaY * 0.15
  }

  const isAtScrollOrigin = () =>
    Math.abs(scrollY) < 24 &&
    Math.abs(targetScrollY) < 24 &&
    Math.abs(scrollVelocity) < 1

  const onKeyDown = (event: KeyboardEvent) => {
    if (callbacks.isInteractionPaused?.()) return
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        targetScrollY -= 50
        scrollVelocity = -8
        break
      case 'ArrowLeft':
        event.preventDefault()
        targetScrollY += 50
        scrollVelocity = 8
        break
      case ' ':
        event.preventDefault()
        scrollVelocity = -scrollVelocity * 1.5
        break
      default:
        break
    }
  }

  const notifyDragBeyondClick = () => {
    if (dragBeyondClickNotified) return
    dragBeyondClickNotified = true
    callbacks.onDragBeyondClick?.()
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    pointerDownX = event.clientX
    pointerDownY = event.clientY
    movedBeyondClick = false
    dragBeyondClickNotified = false
    isDragging = true
    lastPointerY = event.clientY
    scrollVelocity = 0
    inputRoot.setPointerCapture(event.pointerId)
    if (!callbacks.isInteractionPaused?.()) {
      inputRoot.classList.add('theme-band-gallery__root--dragging')
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!isDragging) return

    const dx = event.clientX - pointerDownX
    const dy = event.clientY - pointerDownY
    if (Math.hypot(dx, dy) > GALLERY_EXPAND_CLICK_MOVE_PX) {
      movedBeyondClick = true
      notifyDragBeyondClick()
    }

    if (callbacks.isInteractionPaused?.()) return

    const deltaY = event.clientY - lastPointerY
    targetScrollY += deltaY * 2
    lastPointerY = event.clientY
    scrollVelocity = deltaY * 0.25
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!isDragging) return
    isDragging = false
    if (inputRoot.hasPointerCapture(event.pointerId)) {
      inputRoot.releasePointerCapture(event.pointerId)
    }
    inputRoot.classList.remove('theme-band-gallery__root--dragging')

    if (
      !movedBeyondClick &&
      !callbacks.isInteractionPaused?.() &&
      bandHitBands.length > 0
    ) {
      const rect = mount.getBoundingClientRect()
      const pixelX = event.clientX - rect.left
      const pixelY = event.clientY - rect.top
      const hit = resolveBandGalleryHit(
        pixelX,
        pixelY,
        { width: mount.clientWidth, height: mount.clientHeight },
        scrollY,
        bandHitBands
      )
      if (hit) callbacks.onImageClick?.(hit)
    }
  }

  let lastTouchY = 0
  let touchDownX = 0
  let touchDownY = 0
  const onTouchStart = (event: TouchEvent) => {
    if (callbacks.isInteractionPaused?.()) return
    event.preventDefault()
    touchDownX = event.touches[0]?.clientX ?? 0
    touchDownY = event.touches[0]?.clientY ?? 0
    movedBeyondClick = false
    dragBeyondClickNotified = false
    lastTouchY = event.touches[0]?.clientY ?? 0
  }
  const onTouchMove = (event: TouchEvent) => {
    if (callbacks.isInteractionPaused?.()) return
    event.preventDefault()
    const touchX = event.touches[0]?.clientX ?? touchDownX
    const touchY = event.touches[0]?.clientY ?? lastTouchY
    if (Math.hypot(touchX - touchDownX, touchY - touchDownY) > GALLERY_EXPAND_CLICK_MOVE_PX) {
      movedBeyondClick = true
      notifyDragBeyondClick()
    }
    const deltaY = touchY - lastTouchY
    targetScrollY += deltaY * 2.5
    lastTouchY = touchY
    scrollVelocity = deltaY * 0.3
  }
  const onTouchEnd = (event: TouchEvent) => {
    if (callbacks.isInteractionPaused?.() || movedBeyondClick || bandHitBands.length === 0) return
    const touch = event.changedTouches[0]
    if (!touch) return
    const rect = mount.getBoundingClientRect()
    const hit = resolveBandGalleryHit(
      touch.clientX - rect.left,
      touch.clientY - rect.top,
      { width: mount.clientWidth, height: mount.clientHeight },
      scrollY,
      bandHitBands
    )
    if (hit) callbacks.onImageClick?.(hit)
  }

  const onDoubleClick = () => {
    targetScrollY = 0
    scrollVelocity = 0
  }

  const onContextMenu = (event: Event) => {
    event.preventDefault()
  }

  const applyInertia = () => {
    if (reducedMotion || isDragging) return
    targetScrollY += scrollVelocity
    scrollVelocity *= inertia
    if (Math.abs(scrollVelocity) < 0.5) scrollVelocity = 0
  }

  const animate = () => {
    if (disposed) return
    animationFrame = requestAnimationFrame(animate)
    applyInertia()
    const smoothing = isDragging ? 0.3 : 0.1
    scrollY += (targetScrollY - scrollY) * smoothing
    for (const material of materials) {
      material.uniforms.uScroll.value = scrollY
    }
    renderer.render(scene, camera)
  }

  if (wheelNav) {
    inputRoot.addEventListener('wheel', onWheel, { passive: false })
  }
  inputRoot.addEventListener('keydown', onKeyDown)
  inputRoot.addEventListener('pointerdown', onPointerDown)
  inputRoot.addEventListener('pointermove', onPointerMove)
  inputRoot.addEventListener('pointerup', onPointerUp)
  inputRoot.addEventListener('pointercancel', onPointerUp)
  inputRoot.addEventListener('touchstart', onTouchStart, { passive: false })
  inputRoot.addEventListener('touchmove', onTouchMove, { passive: false })
  inputRoot.addEventListener('touchend', onTouchEnd)
  inputRoot.addEventListener('dblclick', onDoubleClick)
  renderer.domElement.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('resize', resize)

  void buildBands().then(() => {
    if (!disposed) animate()
  })

  return {
    dispose: () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
      if (wheelNav) {
        inputRoot.removeEventListener('wheel', onWheel)
      }
      inputRoot.removeEventListener('keydown', onKeyDown)
      inputRoot.removeEventListener('pointerdown', onPointerDown)
      inputRoot.removeEventListener('pointermove', onPointerMove)
      inputRoot.removeEventListener('pointerup', onPointerUp)
      inputRoot.removeEventListener('pointercancel', onPointerUp)
      inputRoot.removeEventListener('touchstart', onTouchStart)
      inputRoot.removeEventListener('touchmove', onTouchMove)
      inputRoot.removeEventListener('touchend', onTouchEnd)
      inputRoot.removeEventListener('dblclick', onDoubleClick)
      renderer.domElement.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('resize', resize)
      cleanupMeshes()
      renderer.dispose()
      renderer.domElement.remove()
    },
    resetScroll: () => {
      targetScrollY = 0
      scrollVelocity = 0
      scrollY = 0
    },
    isAtScrollOrigin,
    applyWheelDelta,
  }
}
