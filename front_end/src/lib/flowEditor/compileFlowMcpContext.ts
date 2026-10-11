import { contributeNodeMcp, getFlowElementDefinition } from './flowElementRegistry'
import type { CompiledFlowMcpContext, FlowDocument, McpContribution } from './types'

function topologicalNodeOrder(doc: FlowDocument): string[] {
  const incoming = new Map<string, number>()
  for (const node of doc.nodes) incoming.set(node.id, 0)
  for (const edge of doc.edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
  }
  const queue = doc.nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((n) => n.id)
  const order: string[] = []
  const edgesBySource = new Map<string, string[]>()
  for (const edge of doc.edges) {
    const list = edgesBySource.get(edge.source) ?? []
    list.push(edge.target)
    edgesBySource.set(edge.source, list)
  }
  while (queue.length) {
    const id = queue.shift()!
    order.push(id)
    for (const targetId of edgesBySource.get(id) ?? []) {
      const next = (incoming.get(targetId) ?? 1) - 1
      incoming.set(targetId, next)
      if (next === 0) queue.push(targetId)
    }
  }
  for (const node of doc.nodes) {
    if (!order.includes(node.id)) order.push(node.id)
  }
  return order
}

function mergeContributions(contributions: McpContribution[]) {
  const tools: McpContribution[] = []
  const resources: McpContribution[] = []
  const actions: McpContribution[] = []
  const seen = new Set<string>()

  for (const item of contributions) {
    const key = `${item.kind}:${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    if (item.kind === 'tool') tools.push(item)
    else if (item.kind === 'resource') resources.push(item)
    else actions.push(item)
  }

  return { tools, resources, actions }
}

function buildSummary(doc: FlowDocument, order: string[]): string {
  const labels = order
    .map((id) => doc.nodes.find((node) => node.id === id))
    .filter(Boolean)
    .map((node) => getFlowElementDefinition(node!.kind).label)

  const workflowId = doc.meta?.workflowId ?? doc.meta?.prototype
  if (workflowId === 'math-solver') {
    return `Math solver: ${labels.join(' → ')}`
  }
  if (workflowId === 'questionnaire') {
    return `Questionnaire: ${labels.join(' → ')}`
  }
  return `Flow: ${labels.join(' → ')}`
}

export function compileFlowMcpContext(doc: FlowDocument): CompiledFlowMcpContext {
  const order = topologicalNodeOrder(doc)
  const contributions: McpContribution[] = []

  for (const nodeId of order) {
    const node = doc.nodes.find((n) => n.id === nodeId)
    if (!node) continue
    contributions.push(...contributeNodeMcp(node, doc))
  }

  const merged = mergeContributions(contributions)
  return {
    summary: buildSummary(doc, order),
    tools: merged.tools,
    resources: merged.resources,
    actions: merged.actions,
  }
}

export function withCompiledMcpContext(doc: FlowDocument): FlowDocument & { mcpContext: CompiledFlowMcpContext } {
  return {
    ...doc,
    mcpContext: compileFlowMcpContext(doc),
  }
}
