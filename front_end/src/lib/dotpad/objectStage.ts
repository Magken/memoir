/**
 * A small turning glTF object for the memoir side window, with its own orbit controls.
 * Every `controlSurfaces` element (the Dot Pad view) drives the same camera, so the pins
 * follow whatever the object shows. After each sampled frame the render is cropped to the
 * Dot Pad's 3:2 graphic area and handed back as 60×40 pins.
 */
import { AmbientLight, Box3, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer, type Object3D } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { applyPadNudge, type PadNudge } from './padKeys'
import { DOTPAD_DOT_COLUMNS, DOTPAD_DOT_ROWS, detailDots } from './tactileGraphic'

const DRACO_PATH = '/3d/decoders/gltf/'
const SAMPLE_EVERY = 6
/** Shading edge a pin needs: strict from afar, fine when zoomed in close. */
const FAR_EDGE = 0.2
const NEAR_EDGE = 0.06
const FAR_DETAIL = 2.6

/** Downloads and parses the glTF, scaled to a unit box at the origin. Runs during the page loader. */
export async function loadObjectScene(url: string, onFraction: (fraction: number) => void): Promise<Object3D> {
  const draco = new DRACOLoader().setDecoderPath(DRACO_PATH)
  const loader = new GLTFLoader().setDRACOLoader(draco)
  try {
    const gltf = await loader.loadAsync(url, (event) => {
      if (event.total) onFraction(Math.min(1, event.loaded / event.total))
    })
    const model = gltf.scene
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const scale = 1 / Math.max(size.x, size.y, size.z, 1e-6)
    model.scale.setScalar(scale)
    model.position.copy(center).multiplyScalar(-scale)
    onFraction(1)
    return model
  } finally {
    draco.dispose()
  }
}

export type ObjectStage = {
  /** One Dot Pad button move: turn, tilt, or zoom round the object. */
  nudge: (move: PadNudge) => void
  dispose: () => void
}

export function createObjectStage(
  host: HTMLElement,
  model: Object3D,
  onDots: (dots: Uint8Array) => void,
  controlSurfaces: readonly HTMLElement[] = [],
): ObjectStage {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  host.appendChild(renderer.domElement)
  renderer.domElement.className = 'block h-full w-full'

  const scene = new Scene()
  scene.add(new AmbientLight(0xffffff, 1.4))
  const sun = new DirectionalLight(0xffffff, 2.2)
  sun.position.set(2, 3, 4)
  scene.add(sun)
  const camera = new PerspectiveCamera(35, 1, 0.01, 100)
  camera.position.set(0, 0, 2.6)

  const controls = [renderer.domElement, ...controlSurfaces].map((surface) => {
    const orbit = new OrbitControls(camera, surface)
    orbit.target.set(0, 0, 0)
    orbit.minDistance = 0.8
    orbit.maxDistance = 8
    orbit.update()
    return orbit
  })
  const lead = controls[0]
  lead.autoRotate = true
  lead.autoRotateSpeed = 1.5
  const pause = () => {
    lead.autoRotate = false
  }
  const resume = () => {
    lead.autoRotate = true
  }
  for (const orbit of controls) {
    orbit.addEventListener('start', pause)
    orbit.addEventListener('end', resume)
  }

  const sample = document.createElement('canvas')
  sample.width = DOTPAD_DOT_COLUMNS
  sample.height = DOTPAD_DOT_ROWS
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true })

  const resize = () => {
    const width = Math.max(1, host.clientWidth)
    const height = Math.max(1, host.clientHeight)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  scene.add(model)

  let frame = 0
  let raf = 0
  const tick = () => {
    raf = requestAnimationFrame(tick)
    for (const orbit of controls) orbit.update()
    renderer.render(scene, camera)
    frame += 1
    if (!sampleCtx || frame % SAMPLE_EVERY) return
    const source = renderer.domElement
    const want = DOTPAD_DOT_COLUMNS / DOTPAD_DOT_ROWS
    const cropW = Math.min(source.width, source.height * want)
    const cropH = cropW / want
    sampleCtx.clearRect(0, 0, DOTPAD_DOT_COLUMNS, DOTPAD_DOT_ROWS)
    sampleCtx.drawImage(source, (source.width - cropW) / 2, (source.height - cropH) / 2, cropW, cropH, 0, 0, DOTPAD_DOT_COLUMNS, DOTPAD_DOT_ROWS)
    const distance = camera.position.distanceTo(lead.target)
    const zoom = Math.min(1, Math.max(0, (distance - lead.minDistance) / (FAR_DETAIL - lead.minDistance)))
    const edge = NEAR_EDGE + (FAR_EDGE - NEAR_EDGE) * zoom
    onDots(detailDots(sampleCtx.getImageData(0, 0, DOTPAD_DOT_COLUMNS, DOTPAD_DOT_ROWS).data, edge))
  }
  raf = requestAnimationFrame(tick)

  return {
    nudge(move) {
      applyPadNudge(camera, lead.target, move, lead.minDistance, lead.maxDistance)
      for (const orbit of controls) orbit.update()
    },
    dispose() {
      cancelAnimationFrame(raf)
      observer.disconnect()
      for (const orbit of controls) orbit.dispose()
      scene.remove(model)
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
