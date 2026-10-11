import type { ForceGraphSpec, ForceLink, ForceNode } from './types'

export type ParseGraphResult =
  | { ok: true; spec: ForceGraphSpec }
  | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseNode(raw: unknown, index: number): ForceNode | string {
  if (!isRecord(raw)) return `nodes[${index}] must be an object`
  const id = raw.id
  if (typeof id !== 'string' || !id.trim()) return `nodes[${index}].id must be a non-empty string`
  const node: ForceNode = { id: id.trim() }
  if (typeof raw.label === 'string') node.label = raw.label
  if (typeof raw.group === 'string' || typeof raw.group === 'number') node.group = raw.group
  return node
}

function parseLink(raw: unknown, index: number, nodeIds: Set<string>): ForceLink | string {
  if (!isRecord(raw)) return `links[${index}] must be an object`
  const source = raw.source
  const target = raw.target
  if (typeof source !== 'string' || !source.trim()) {
    return `links[${index}].source must be a node id string`
  }
  if (typeof target !== 'string' || !target.trim()) {
    return `links[${index}].target must be a node id string`
  }
  if (!nodeIds.has(source.trim())) return `links[${index}].source "${source}" is not a known node id`
  if (!nodeIds.has(target.trim())) return `links[${index}].target "${target}" is not a known node id`
  const link: ForceLink = { source: source.trim(), target: target.trim() }
  if (typeof raw.value === 'number' && Number.isFinite(raw.value)) link.value = raw.value
  return link
}

/** Parse + validate a JSON force-graph source string. */
export function parseForceGraphSource(source: string): ParseGraphResult {
  const trimmed = source.trim()
  if (!trimmed) return { ok: false, error: 'Source is empty.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed) as unknown
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid JSON'
    return { ok: false, error: message }
  }

  if (!isRecord(parsed)) return { ok: false, error: 'Root must be an object with nodes and links.' }
  if (!Array.isArray(parsed.nodes)) return { ok: false, error: 'nodes must be an array.' }
  if (!Array.isArray(parsed.links)) return { ok: false, error: 'links must be an array.' }

  const nodes: ForceNode[] = []
  const seen = new Set<string>()
  for (let i = 0; i < parsed.nodes.length; i += 1) {
    const result = parseNode(parsed.nodes[i], i)
    if (typeof result === 'string') return { ok: false, error: result }
    if (seen.has(result.id)) return { ok: false, error: `Duplicate node id "${result.id}".` }
    seen.add(result.id)
    nodes.push(result)
  }

  const links: ForceLink[] = []
  for (let i = 0; i < parsed.links.length; i += 1) {
    const result = parseLink(parsed.links[i], i, seen)
    if (typeof result === 'string') return { ok: false, error: result }
    links.push(result)
  }

  return { ok: true, spec: { nodes, links } }
}

export function countForceGraph(source: string): { nodes: number; links: number } | null {
  const result = parseForceGraphSource(source)
  if (!result.ok) return null
  return { nodes: result.spec.nodes.length, links: result.spec.links.length }
}
