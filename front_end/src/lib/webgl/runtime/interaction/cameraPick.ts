import { DoubleSide, Mesh, Raycaster, Vector2, type Camera, type Intersection, type Object3D } from 'three'

export type RaycastHit = {
  point: [number, number, number]
  normal: [number, number, number] | null
  faceIndex: number | null
  objectName: string
  /** Live mesh. Cage spring uses this so a hit on another asset does not pause idle waves. */
  object?: Object3D
}

export type ClientRectLike = {
  left: number
  top: number
  width: number
  height: number
}

export type MeshPickObject = {
  isMesh?: boolean
  visible?: boolean
  name?: string
  type?: string
  matrixWorld?: { elements: ArrayLike<number> }
  userData?: { webglWireOverlay?: boolean }
}

export type MeshPickHit = {
  point: { x: number; y: number; z: number }
  face?: { normal: { x: number; y: number; z: number } } | null
  faceIndex?: number | null
  object: MeshPickObject
}

/** Pointer NDC from the WebGL canvas rect — not from a parent host, not from a face angle. */
export function ndcFromClient(clientX: number, clientY: number, rect: ClientRectLike): { x: number; y: number } {
  if (!(rect.width > 0) || !(rect.height > 0)) return { x: 0, y: 0 }
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  }
}

export function worldNormalFromFace(
  local: { x: number; y: number; z: number },
  matrixWorld: { elements: ArrayLike<number> },
): [number, number, number] {
  const e = matrixWorld.elements
  const nx = e[0] * local.x + e[4] * local.y + e[8] * local.z
  const ny = e[1] * local.x + e[5] * local.y + e[9] * local.z
  const nz = e[2] * local.x + e[6] * local.y + e[10] * local.z
  const len = Math.hypot(nx, ny, nz)
  if (!(len > 0)) return [0, 1, 0]
  return [nx / len, ny / len, nz / len]
}

/** True mesh surface — skip Line2 (isMesh), sprites, points, Html helpers. */
export function isSurfaceMesh(object: MeshPickObject | null | undefined): boolean {
  if (!object || object.visible === false) return false
  if (object.userData?.webglWireOverlay) return false
  const type = object.type ?? ''
  if (/Line|Sprite|Points|HTML/i.test(type)) return false
  return Boolean(object.isMesh)
}

/** Closest *mesh* in an already distance-sorted hit list. Skips lines/points/sprites. */
export function firstMeshHit<T extends MeshPickHit>(hits: readonly T[]): T | null {
  for (const hit of hits) {
    if (isSurfaceMesh(hit.object)) return hit
  }
  return null
}

export function findPickRoot(scene: Object3D): Object3D | null {
  let found: Object3D | null = null
  scene.traverse((obj) => {
    if (found) return
    if (obj.userData?.webglPickRoot) found = obj
  })
  return found
}

export function hitFromIntersection(hit: MeshPickHit): RaycastHit {
  const matrix = hit.object.matrixWorld ?? { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }
  const normal = hit.face?.normal ? worldNormalFromFace(hit.face.normal, matrix) : null
  return {
    point: [hit.point.x, hit.point.y, hit.point.z],
    normal,
    faceIndex: typeof hit.faceIndex === 'number' ? hit.faceIndex : null,
    objectName: hit.object.name || hit.object.type || 'Mesh',
    object: hit.object as Object3D,
  }
}

export function pickFromIntersections(hits: readonly MeshPickHit[]): RaycastHit | null {
  const hit = firstMeshHit(hits)
  return hit ? hitFromIntersection(hit) : null
}

const ndc = new Vector2()

/** Camera eye through the cursor, world-space hit on `root` only. */
export function pickRootFromCamera(
  camera: Camera,
  root: Object3D | null,
  ndcXY: { x: number; y: number },
  raycaster: Raycaster = new Raycaster(),
): RaycastHit | null {
  if (!root) return null
  camera.updateMatrixWorld()
  root.updateMatrixWorld(true)
  ndc.set(ndcXY.x, ndcXY.y)
  raycaster.setFromCamera(ndc, camera)
  const hits = raycaster.intersectObject(root, true) as Intersection[]
  return pickFromIntersections(hits)
}

/** Picking sees backfaces without changing how the mesh is drawn. */
export function installDoubleSideMeshPick(root: Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    mesh.raycast = function doubleSidePick(this: Mesh, raycaster, intersects) {
      const materials = Array.isArray(this.material) ? this.material : [this.material]
      const sides = materials.map((mat) => mat?.side)
      for (const mat of materials) {
        if (mat) mat.side = DoubleSide
      }
      Mesh.prototype.raycast.call(this, raycaster, intersects)
      materials.forEach((mat, index) => {
        if (mat) mat.side = sides[index]
      })
    }
  })
}
