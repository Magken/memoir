import { BufferGeometry, type Object3D } from 'three'
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js'
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js'
import { clampPoly, POLY_DEFAULT } from '../interaction/markStem'

export type MeshPolyOriginals = Map<
  string,
  { source: BufferGeometry; cache: Map<number, BufferGeometry> }
>

/** Keep-ratio for SimplifyModifier. 5–8 keep the original vertex count (then tessellate above 5). */
const KEEP_RATIO = [0.125, 0.25, 0.5, 0.75, 1, 1, 1, 1] as const

const simplify = new SimplifyModifier()

export function polyKeepRatio(poly: number): number {
  return KEEP_RATIO[clampPoly(poly) - 1]
}

export function polyTessellatePasses(poly: number): number {
  return Math.max(0, clampPoly(poly) - POLY_DEFAULT)
}

function vertexCount(geometry: BufferGeometry): number {
  return geometry.getAttribute('position')?.count ?? 0
}

/** Matches `webgl_modifier_simplifier`: count is vertices to remove. */
export function verticesToRemove(geometry: BufferGeometry, poly: number): number {
  const keep = polyKeepRatio(poly)
  if (keep >= 1) return 0
  const verts = vertexCount(geometry)
  return Math.max(0, Math.floor(verts * (1 - keep)))
}

function tessellateUp(geometry: BufferGeometry, passes: number): BufferGeometry {
  const verts = vertexCount(geometry)
  const iterations = verts > 80_000 ? Math.min(passes, 1) : passes
  return new TessellateModifier(0, iterations).modify(geometry.clone())
}

function geometryForPoly(source: BufferGeometry, poly: number): BufferGeometry {
  const remove = verticesToRemove(source, poly)
  const tess = polyTessellatePasses(poly)
  if (remove <= 0 && tess <= 0) return source
  let next = source
  if (remove > 0) {
    next = simplify.modify(source, remove)
    next.computeVertexNormals()
  }
  if (tess > 0) {
    next = tessellateUp(next, tess)
    next.computeVertexNormals()
  }
  return next
}

/** Change rendered polygon count on every mesh. Poly 5 is the original asset. */
export function applyMeshPoly(root: Object3D, poly: number, originals: MeshPolyOriginals): void {
  const level = clampPoly(poly)
  root.traverse((obj) => {
    const mesh = obj as Object3D & {
      isMesh?: boolean
      uuid: string
      geometry?: BufferGeometry
    }
    if (!mesh.isMesh || !mesh.geometry) return
    if (mesh.userData?.webglWireOverlay) return
    let entry = originals.get(mesh.uuid)
    if (!entry) {
      entry = { source: mesh.geometry, cache: new Map() }
      originals.set(mesh.uuid, entry)
    }
    if (polyKeepRatio(level) >= 1 && polyTessellatePasses(level) <= 0) {
      mesh.geometry = entry.source
      return
    }
    const cached = entry.cache.get(level)
    if (cached) {
      mesh.geometry = cached
      return
    }
    const next = geometryForPoly(entry.source, level)
    if (next !== entry.source) entry.cache.set(level, next)
    mesh.geometry = next
  })
}
