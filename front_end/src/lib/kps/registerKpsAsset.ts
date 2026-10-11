/**
 * Insert one glTF row into the WebGL asset manifest source.
 */

export type KpsViewerRow = {
  id: string
  label: string
  path: string
}

const MARKER = '\n]\n\nexport function getWebglAsset'

export function appendWebglAssetSource(source: string, row: KpsViewerRow): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id)) {
    throw new Error('Viewer id must be kebab-case')
  }
  if (!row.path.startsWith('/3d/kps/') || row.path.includes('..')) {
    throw new Error('Viewer path must stay under /3d/kps/')
  }
  if (source.includes(`id: '${row.id}'`)) return source
  const label = row.label.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const block = `  {
    id: '${row.id}',
    label: '${label}',
    kind: 'gltf',
    path: '${row.path}',
    units: 'm',
    upAxis: 'y',
  },
`
  if (!source.includes(MARKER)) throw new Error('Asset manifest shape changed')
  return source.replace(MARKER, `\n${block}]${MARKER.slice(2)}`)
}
