import { EDITOR_CATALOGS, type EditorCatalogKind } from '../../editorCatalog/manifest'
import type { McpResourceDescriptor } from '../types'

function catalogResourceUri(kind: EditorCatalogKind, suffix?: 'features' | 'actions'): string {
  if (!suffix) return `editor://catalog/${kind}`
  return `editor://catalog/${kind}/${suffix}`
}

export const MCP_CATALOG_RESOURCES: McpResourceDescriptor[] = (
  Object.keys(EDITOR_CATALOGS) as EditorCatalogKind[]
).flatMap((kind) => [
  {
    uri: catalogResourceUri(kind),
    name: `${kind} editor catalog`,
    description: `Full ${kind} catalog bundle (features + actions).`,
    mimeType: 'application/json',
  },
  {
    uri: catalogResourceUri(kind, 'features'),
    name: `${kind} editor features`,
    description: `${kind} feature rows with fidelity matrix.`,
    mimeType: 'application/json',
  },
  {
    uri: catalogResourceUri(kind, 'actions'),
    name: `${kind} editor actions`,
    description: `${kind} MCT action catalog.`,
    mimeType: 'application/json',
  },
])

export function readCatalogResource(uri: string): unknown {
  const match = uri.match(/^editor:\/\/catalog\/([^/]+)(?:\/(features|actions))?$/)
  if (!match) {
    throw new Error(`Unknown catalog resource: ${uri}`)
  }
  const kind = match[1] as EditorCatalogKind
  const suffix = match[2]
  const catalog = EDITOR_CATALOGS[kind]
  if (!catalog) {
    throw new Error(`Unknown catalog kind: ${kind}`)
  }
  if (suffix === 'features') return catalog.features
  if (suffix === 'actions') return catalog.actions
  return catalog
}

export function catalogResourceCounts() {
  let features = 0
  let actions = 0
  for (const kind of Object.keys(EDITOR_CATALOGS) as EditorCatalogKind[]) {
    const catalog = EDITOR_CATALOGS[kind]
    features += catalog.features.length
    actions += catalog.actions.length
  }
  return { features, actions }
}
