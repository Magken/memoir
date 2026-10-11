import {
  BufferAttribute,
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  LinearFilter,
  Mesh,
  RGBAFormat,
  SRGBColorSpace,
  ShaderMaterial,
  UniformsUtils,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three'
import { SubsurfaceScatteringShader } from 'three/addons/shaders/SubsurfaceScatteringShader.js'

export const CERAMIC_MATERIAL_NAME = 'ceramic-scatter'
export const CERAMIC_THICKNESS_SIZE = 128
/** Viewer scatter slider default. The mesh applies triple this so the host still reads. */
export const CERAMIC_SCATTER_DEFAULT = 1.5
export const CERAMIC_SCATTER_MESH_MULT = 3
/** Applied thicknessScale at the default slider (2 × 3). */
export const CERAMIC_THICKNESS_SCALE = CERAMIC_SCATTER_DEFAULT * CERAMIC_SCATTER_MESH_MULT
export const CERAMIC_THICKNESS_AMBIENT = 0.4
export const CERAMIC_SCATTER_MAX = 16
export const CERAMIC_MESH_DEFAULT = '#000000'

let scatterScale = CERAMIC_SCATTER_DEFAULT
let meshColor = CERAMIC_MESH_DEFAULT

export function ceramicMeshScale(slider: number): number {
  if (!Number.isFinite(slider)) return 0
  return Math.min(CERAMIC_SCATTER_MAX * CERAMIC_SCATTER_MESH_MULT, Math.max(0, slider * CERAMIC_SCATTER_MESH_MULT))
}

export function setCeramicScatterScale(value: number) {
  if (!Number.isFinite(value)) return
  scatterScale = Math.min(CERAMIC_SCATTER_MAX, Math.max(0, value))
}

export function getCeramicScatterScale(): number {
  return scatterScale
}

export function setCeramicMeshColor(hex: string) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return
  meshColor = hex.toLowerCase()
}

export function getCeramicMeshColor(): string {
  return meshColor
}

function scatterAmbient(applied: number): number {
  if (!(CERAMIC_THICKNESS_SCALE > 0)) return 0
  return Math.min(0.55, applied * (CERAMIC_THICKNESS_AMBIENT / CERAMIC_THICKNESS_SCALE))
}

export function syncCeramicScatter(root: Object3D) {
  const applied = ceramicMeshScale(scatterScale)
  const ambient = scatterAmbient(applied)
  const diffuse = new Color(meshColor)
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!(mesh instanceof Mesh)) return
    const mat = mesh.material
    const list = Array.isArray(mat) ? mat : mat ? [mat] : []
    for (const item of list) {
      if (item?.name !== CERAMIC_MATERIAL_NAME) continue
      const uniforms = (item as ShaderMaterial).uniforms
      if (!uniforms?.thicknessScale) continue
      uniforms.thicknessScale.value = applied
      uniforms.thicknessAmbient.value = ambient
      uniforms.diffuse?.value?.copy?.(diffuse)
    }
  })
}

let whiteMap: DataTexture | null = null

function ceramicWhiteMap(): DataTexture {
  if (whiteMap) return whiteMap
  const tex = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat)
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  whiteMap = tex
  return tex
}

export function ensureMeshUv(geometry: BufferGeometry) {
  if (geometry.getAttribute('uv')) return
  const pos = geometry.getAttribute('position')
  if (!pos) return
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  const dx = Math.max(1e-6, (box?.max.x ?? 1) - (box?.min.x ?? 0))
  const dy = Math.max(1e-6, (box?.max.y ?? 1) - (box?.min.y ?? 0))
  const minX = box?.min.x ?? 0
  const minY = box?.min.y ?? 0
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - minX) / dx
    uv[i * 2 + 1] = (pos.getY(i) - minY) / dy
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2))
}

/** Smooth thickness — every texel, no vertex stamps (those read as square patches). */
export function bakeThicknessMap(_geometry?: BufferGeometry): DataTexture {
  const size = CERAMIC_THICKNESS_SIZE
  const data = new Uint8Array(size * size * 4)
  const denom = Math.max(1, size - 1)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / denom
      const v = y / denom
      const vein = 0.5 + 0.5 * Math.sin(u * 2.1 + v * 1.6)
      const g = Math.round((0.62 + 0.16 * vein) * 255)
      const o = (y * size + x) * 4
      data[o] = g
      data[o + 1] = g
      data[o + 2] = g
      data[o + 3] = 255
    }
  }
  const tex = new DataTexture(data, size, size, RGBAFormat)
  tex.wrapS = ClampToEdgeWrapping
  tex.wrapT = ClampToEdgeWrapping
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.needsUpdate = true
  return tex
}

function stripMaps(mat: Material) {
  const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap'] as const
  const record = mat as unknown as Record<string, { dispose?: () => void } | undefined>
  for (const key of maps) {
    const tex = record[key]
    if (tex && typeof tex.dispose === 'function') record[key] = undefined
  }
}

/**
 * Host SSS from webgl_materials_subsurface_scattering.
 * Diffuse / thickness / shininess match the bunny sample. The mesh only receives light.
 */
export function createCeramicMaterial(geometry?: BufferGeometry): ShaderMaterial {
  const shader = SubsurfaceScatteringShader
  const uniforms = UniformsUtils.clone(shader.uniforms)
  uniforms.map.value = ceramicWhiteMap()
  uniforms.diffuse.value = new Color(meshColor)
  uniforms.specular.value = new Color(1, 1, 1)
  uniforms.shininess.value = 500
  uniforms.thicknessMap.value = bakeThicknessMap(geometry)
  uniforms.thicknessColor.value = new Color(0.5, 0.3, 0)
  uniforms.thicknessDistortion.value = 0.1
  uniforms.thicknessAmbient.value = scatterAmbient(ceramicMeshScale(scatterScale))
  uniforms.thicknessAttenuation.value = 0.8
  uniforms.thicknessPower.value = 2
  uniforms.thicknessScale.value = ceramicMeshScale(scatterScale)
  const mat = new ShaderMaterial({
    uniforms,
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
    lights: true,
    fog: true,
  })
  mat.name = CERAMIC_MATERIAL_NAME
  return mat
}

export function isCeramicMaterial(mat: Material | Material[] | undefined): boolean {
  const list = Array.isArray(mat) ? mat : mat ? [mat] : []
  return list.some((item) => item?.name === CERAMIC_MATERIAL_NAME)
}

/** Replace host shading with ceramic scatter. Overlay cages are skipped. */
export function applyCeramicScatter(mesh: Mesh) {
  if (mesh.userData?.webglWireOverlay) return
  if (isCeramicMaterial(mesh.material)) return
  ensureMeshUv(mesh.geometry)
  const prev = mesh.material
  const list = Array.isArray(prev) ? prev : prev ? [prev] : []
  for (const mat of list) {
    stripMaps(mat)
    mat.dispose()
  }
  mesh.material = createCeramicMaterial(mesh.geometry)
}
