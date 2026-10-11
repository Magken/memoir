export type AssetKind = 'gltf' | 'primitive' | 'volume' | 'text' | 'splat'

export type WebglAsset = {
  id: string
  label: string
  kind: AssetKind
  /** Public URL (`/3d/...`) for a glTF or an SPZ file. A splat row is added only when that file is in public/3d. */
  path?: string
  units: 'm' | 'cm' | 'mm'
  upAxis: 'y' | 'z'
}

/** Drop files in `front_end/public/3d/` and register them here. */
export const WEBGL_ASSETS: readonly WebglAsset[] = [
  {
    id: 'the-creation-of-adam',
    label: 'The Creation of Adam',
    kind: 'gltf',
    path: '/3d/the_creation_of_adam.glb',
    units: 'm',
    upAxis: 'y',
  },
  {
    id: 'statue-of-liberty',
    label: 'Statue of Liberty',
    kind: 'gltf',
    path: '/3d/statue_of_liberty.glb',
    units: 'm',
    upAxis: 'y',
  },
  {
    id: 'statue-of-an-owl',
    label: 'Statue of an Owl',
    kind: 'gltf',
    path: '/3d/statue_of_an_owl.glb',
    units: 'm',
    upAxis: 'y',
  },
  {
    id: 'darwins-monkey',
    label: "Darwin's Monkey",
    kind: 'gltf',
    path: '/3d/darwins_monkey.glb',
    units: 'm',
    upAxis: 'y',
  },
  {
    id: 'stone-lantern',
    label: 'Stone lantern',
    kind: 'gltf',
    path: '/3d/stone_lantern.glb',
    units: 'm',
    upAxis: 'y',
  },
  {
    id: 'fort-mason',
    label: 'Fort Mason',
    kind: 'splat',
    path: '/3d/fort-mason.spz',
    units: 'm',
    upAxis: 'y',
  },
  {
    id: 'volumetric-cloud',
    label: 'Volumetric cloud',
    kind: 'volume',
    units: 'm',
    upAxis: 'y',
  },
  {
    id: 'builtin-box',
    label: 'Builtin box',
    kind: 'primitive',
    units: 'm',
    upAxis: 'y',
  },
  {
    id: 'gras-letters',
    label: 'GRAS',
    kind: 'text',
    units: 'm',
    upAxis: 'y',
  },
  {
    id: 'about-us-letters',
    label: 'About Us',
    kind: 'text',
    units: 'm',
    upAxis: 'y',
  },
  {
    id: 'projects-letters',
    label: 'Projects',
    kind: 'text',
    units: 'm',
    upAxis: 'y',
  },
]

export function getWebglAsset(id: string): WebglAsset | undefined {
  return WEBGL_ASSETS.find((asset) => asset.id === id)
}
