import { applyCeramicScatter } from './ceramicScatter'
import { attachBakedWire, clearWireOverlays, isWireframeOverlay } from './wireObject'
import { getWireLightColor } from './wireLights'
import { getWireBake } from '../../assets/wireBakes'
import { InstancedMesh, Mesh, type Object3D } from 'three'

export {
  WIREFRAME_INFLATE_M,
  WIREFRAME_OVERLAY_KEY,
  WIRE_LINE_RADIUS_FRAC,
  WIRE_NODE_RADIUS_FRAC,
  isWireframeOverlay,
  hostWireColor,
  extractWireMesh,
  buildWireObject,
  attachBakedWire,
  clearWireOverlays,
} from './wireObject'
export type { WireMeshData, WireObjectData } from './wireObject'

/** Always-on surface cage from a baked wire object. Never extracts live. */
export function applyWireframe(root: Object3D, assetId: string) {
  const bake = getWireBake(assetId)
  if (!bake) {
    clearWireOverlays(root)
    return
  }
  attachBakedWire(root, bake, getWireLightColor())
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!(mesh instanceof Mesh) || mesh instanceof InstancedMesh || isWireframeOverlay(mesh)) return
    applyCeramicScatter(mesh)
  })
}
