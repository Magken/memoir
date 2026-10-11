import * as THREE from 'three/webgpu'
import { Fn, uv, uniform, vec2 } from 'three/tsl'
import {
  WEBGPU_GALLERY_CORNER_RADIUS,
  WEBGPU_GALLERY_CAMERA_DISTANCE,
  WEBGPU_GALLERY_MAIN_COUNT,
  WEBGPU_GALLERY_SATELLITES_PER_IMAGE,
  WEBGPU_TEXTURE_MIN_BLEED,
  webGpuMainIdx,
  webGpuSatIdx,
} from './constants'
import type { WebGpuGalleryImage, WebGpuGalleryPlane } from './types'

function roundedRectOpacityNode(
  sizeUniform: any,
  radiusUniform: any,
  opacityUniform: any,
) {
  const mask = Fn(() => {
    const half = sizeUniform.mul(0.5)
    const r = radiusUniform.min(half.x).min(half.y)
    const p = uv().sub(0.5).mul(sizeUniform)
    const q = p.abs().sub(half).add(r)
    const dist = q.max(vec2(0.0)).length().add(q.x.max(q.y).min(0.0)).sub(r)
    return dist.smoothstep(-1.0, 1.0).oneMinus()
  })()
  return mask.mul(opacityUniform)
}

export class WebGpuGalleryEngine {
  canvas: HTMLCanvasElement | null = null
  renderer: THREE.WebGPURenderer | null = null
  scene: THREE.Scene | null = null
  camera: THREE.PerspectiveCamera | null = null
  geometry: THREE.PlaneGeometry | null = null
  textures: THREE.Texture[] = []
  aspects: number[] = []
  planes: WebGpuGalleryPlane[] = []
  radiusUniform = uniform(WEBGPU_GALLERY_CORNER_RADIUS)
  host: HTMLElement
  onResizeLayout: (() => void) | null = null
  private resizeObserver: ResizeObserver | null = null

  constructor(host: HTMLElement) {
    this.host = host
    this.onResize = this.onResize.bind(this)
  }

  private createPlaneMaterial(texture: THREE.Texture) {
    const material = new THREE.MeshBasicNodeMaterial({
      map: texture,
      transparent: true,
    })
    const sizeUniform = uniform(new THREE.Vector2(1, 1))
    const opacityUniform = uniform(0)
    material.opacityNode = roundedRectOpacityNode(sizeUniform, this.radiusUniform, opacityUniform)
    return { material, sizeUniform, opacityUniform }
  }

  async init(
    images: readonly WebGpuGalleryImage[],
    onProgress?: (loaded: number, total: number) => void,
  ) {
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'theme-webgpu-transition-gallery__canvas'
    this.canvas.setAttribute('aria-hidden', 'true')
    this.host.prepend(this.canvas)

    this.renderer = new THREE.WebGPURenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    })
    this.resizeRenderer()
    await this.renderer.init()

    this.scene = new THREE.Scene()
    this.geometry = new THREE.PlaneGeometry(1, 1)
    this.setupCamera()

    await this.loadTextures(images.slice(0, WEBGPU_GALLERY_MAIN_COUNT), onProgress)
    this.createPlanes()
    await this.warmup()

    this.resizeObserver = new ResizeObserver(this.onResize)
    this.resizeObserver.observe(this.host)
  }

  private resizeRenderer() {
    if (!this.renderer || !this.canvas) return
    const w = Math.max(1, this.host.clientWidth)
    const h = Math.max(1, this.host.clientHeight)
    this.renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2))
    this.renderer.setSize(w, h, false)
  }

  async warmup() {
    if (!this.renderer || !this.scene || !this.camera) return
    await this.renderer.compileAsync(this.scene, this.camera)
    this.renderer.render(this.scene, this.camera)
  }

  setupCamera() {
    const w = Math.max(1, this.host.clientWidth)
    const h = Math.max(1, this.host.clientHeight)
    const fov =
      2 * Math.atan(h / 2 / WEBGPU_GALLERY_CAMERA_DISTANCE) * (180 / Math.PI)
    this.camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, WEBGPU_GALLERY_CAMERA_DISTANCE * 2)
    this.camera.position.z = WEBGPU_GALLERY_CAMERA_DISTANCE
  }

  async loadTextures(
    images: readonly WebGpuGalleryImage[],
    onProgress?: (loaded: number, total: number) => void,
  ) {
    const loader = new THREE.TextureLoader()
    const slice = images.slice(0, WEBGPU_GALLERY_MAIN_COUNT)
    let loaded = 0
    const total = slice.length
    onProgress?.(0, total)

    await Promise.all(
      slice.map(
        (item, i) =>
          new Promise<void>((resolve, reject) => {
            loader.load(
              item.src,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace
                this.textures[i] = tex
                const img = tex.image as HTMLImageElement
                this.aspects[i] = img.naturalWidth / Math.max(1, img.naturalHeight)
                loaded += 1
                onProgress?.(loaded, total)
                resolve()
              },
              undefined,
              reject,
            )
          }),
      ),
    )
  }

  createPlanes() {
    for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      const { material, sizeUniform, opacityUniform } = this.createPlaneMaterial(this.textures[i]!)
      const mesh = new THREE.Mesh(this.geometry!, material)
      this.scene!.add(mesh)
      this.planes.push({
        mesh,
        material,
        sizeUniform,
        opacityUniform,
        bounds: { x: 0, y: 0, w: 0, h: 0, z: 0 },
        opacity: 0,
        tilt: 0,
        tiltX: 0,
        trackedEl: null,
        kind: 'main',
        image: i,
      })
    }

    for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      for (let j = 0; j < WEBGPU_GALLERY_SATELLITES_PER_IMAGE; j += 1) {
        const { material, sizeUniform, opacityUniform } = this.createPlaneMaterial(this.textures[i]!)
        const mesh = new THREE.Mesh(this.geometry!, material)
        this.scene!.add(mesh)
        this.planes.push({
          mesh,
          material,
          sizeUniform,
          opacityUniform,
          bounds: { x: 0, y: 0, w: 0, h: 0, z: 0 },
          opacity: 0,
          tilt: 0,
          tiltX: 0,
          trackedEl: null,
          kind: 'satellite',
          image: i,
          j,
        })
      }
    }
  }

  private hostMetrics() {
    const rect = this.host.getBoundingClientRect()
    return { rect, w: Math.max(1, rect.width), h: Math.max(1, rect.height) }
  }

  private applyTextureCoverParallax(plane: WebGpuGalleryPlane) {
    const texture = (plane.material as THREE.MeshBasicNodeMaterial).map
    if (!texture?.image) return

    const bounds = plane.bounds
    if (bounds.w <= 0 || bounds.h <= 0) {
      texture.offset.set(0, 0)
      texture.repeat.set(1, 1)
      return
    }

    const aspect = this.aspects[plane.image] ?? bounds.w / Math.max(1, bounds.h)
    const slotAspect = bounds.w / bounds.h
    const parallaxU = plane.parallaxU ?? 0
    const parallaxV = plane.parallaxV ?? 0
    const minRepeat = 1 - WEBGPU_TEXTURE_MIN_BLEED * 2

    let repeatX = 1
    let repeatY = 1

    if (aspect > slotAspect) {
      repeatX = Math.min(slotAspect / aspect, minRepeat)
    } else if (aspect < slotAspect) {
      repeatY = Math.min(aspect / slotAspect, minRepeat)
    } else {
      repeatX = minRepeat
    }

    const bleedX = (1 - repeatX) / 2
    const bleedY = (1 - repeatY) / 2
    const uCenter = 0.5 - parallaxU
    const vCenter = 0.5 - parallaxV

    texture.repeat.set(repeatX, repeatY)
    texture.offset.set(
      bleedX + uCenter * (1 - repeatX),
      bleedY + vCenter * (1 - repeatY),
    )
  }

  syncMesh(plane: WebGpuGalleryPlane) {
    const { mesh, bounds, opacity } = plane
    const { rect, w, h } = this.hostMetrics()
    this.applyTextureCoverParallax(plane)
    const pw = Math.max(bounds.w, 0.001)
    const ph = Math.max(bounds.h, 0.001)
    mesh.scale.set(pw, ph, 1)
    mesh.position.x = bounds.x + bounds.w / 2 - rect.left - w / 2
    mesh.position.y = -(bounds.y + bounds.h / 2 - rect.top - h / 2)
    mesh.rotation.x = plane.tiltX ?? 0
    mesh.rotation.y = plane.tilt ?? 0
    mesh.renderOrder = -(bounds.z ?? 0)
    plane.sizeUniform.value.set(pw, ph)
    plane.opacityUniform.value = opacity
    mesh.visible = opacity > 0.001 && bounds.w > 0
  }

  applyMainLayout() {
    for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      this.planes[webGpuMainIdx(i)]!.opacity = 1
      for (let j = 0; j < WEBGPU_GALLERY_SATELLITES_PER_IMAGE; j += 1) {
        this.planes[webGpuSatIdx(i, j)]!.opacity = 0
      }
    }
  }

  applyInnerLayout(image: number) {
    for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      this.planes[webGpuMainIdx(i)]!.opacity = i === image ? 1 : 0
      for (let j = 0; j < WEBGPU_GALLERY_SATELLITES_PER_IMAGE; j += 1) {
        this.planes[webGpuSatIdx(i, j)]!.opacity = i === image ? 1 : 0
      }
    }
  }

  applyIndexLayout() {
    for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      this.planes[webGpuMainIdx(i)]!.opacity = 1
      for (let j = 0; j < WEBGPU_GALLERY_SATELLITES_PER_IMAGE; j += 1) {
        this.planes[webGpuSatIdx(i, j)]!.opacity = 0
      }
    }
  }

  onResize() {
    this.resizeRenderer()
    if (!this.camera) return
    const { w, h } = this.hostMetrics()
    this.camera.fov =
      2 * Math.atan(h / 2 / WEBGPU_GALLERY_CAMERA_DISTANCE) * (180 / Math.PI)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.onResizeLayout?.()
  }

  update() {
    for (const plane of this.planes) {
      if (plane.trackedEl) {
        const rect = plane.trackedEl.getBoundingClientRect()
        plane.bounds.x = rect.left
        plane.bounds.y = rect.top
        plane.bounds.w = rect.width
        plane.bounds.h = rect.height
      }
      this.syncMesh(plane)
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera)
    }
  }

  destroy() {
    this.resizeObserver?.disconnect()
    this.renderer?.dispose()
    this.canvas?.remove()
    this.canvas = null
    this.renderer = null
    this.scene = null
    this.camera = null
    this.geometry = null
    this.planes = []
    this.textures = []
  }
}

export async function createWebGpuGalleryEngine(
  host: HTMLElement,
  images: readonly WebGpuGalleryImage[],
  onProgress?: (loaded: number, total: number) => void,
): Promise<WebGpuGalleryEngine> {
  const engine = new WebGpuGalleryEngine(host)
  await engine.init(images, onProgress)
  return engine
}
