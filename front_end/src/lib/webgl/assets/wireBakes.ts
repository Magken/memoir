import builtinBox from './wireframes/builtin-box.json'
import creationOfAdam from './wireframes/the-creation-of-adam.json'
import darwinsMonkey from './wireframes/darwins-monkey.json'
import statueOfAnOwl from './wireframes/statue-of-an-owl.json'
import statueOfLiberty from './wireframes/statue-of-liberty.json'
import stoneLantern from './wireframes/stone-lantern.json'
import type { WireObjectData } from '../runtime/materials/wireObject'
import { WEBGL_ASSETS, type WebglAsset } from './assetManifest'

const BAKES: Record<string, WireObjectData> = {
  'builtin-box': builtinBox as WireObjectData,
  'the-creation-of-adam': creationOfAdam as WireObjectData,
  'darwins-monkey': darwinsMonkey as WireObjectData,
  'statue-of-an-owl': statueOfAnOwl as WireObjectData,
  'statue-of-liberty': statueOfLiberty as WireObjectData,
  'stone-lantern': stoneLantern as WireObjectData,
}

/** Mesh assets get a cage. Volumes do not. */
export function meshAssetsNeedingWireBake(
  assets: readonly WebglAsset[] = WEBGL_ASSETS,
): WebglAsset[] {
  return assets.filter((asset) => asset.kind === 'gltf' || asset.kind === 'primitive')
}

export function bakedWireIds(): string[] {
  return Object.keys(BAKES)
}

export function getWireBake(assetId: string): WireObjectData | undefined {
  return BAKES[assetId]
}
