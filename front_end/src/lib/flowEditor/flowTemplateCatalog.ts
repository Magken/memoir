import type { FlowDocument, FlowGroup, FlowNode, FlowEdge, FlowToolkitId } from './types'
import type { WireframeLayout } from '../wireframes/wireframeTypes'
import { FLOW_WORKFLOW_MATH } from './workflowBundles/mathSolver'
import { FLOW_WORKFLOW_QUESTIONNAIRE } from './workflowBundles/questionnaire'
import { FLOW_TEMPLATE_WIREFRAMES } from './flowTemplateWireframes'

export type FlowTemplateId = string

export type FlowTemplateDef = {
  id: FlowTemplateId
  label: string
  description: string
  section: string
  /** Short chips under the title — not the same as palette categories. */
  tags: string[]
  document: FlowDocument
  /** CSS-grid wireframe thumb (topology), not a live RF mount. */
  wireframe: WireframeLayout
  /** Toolkits that list this template. Omit → `default` only. */
  toolkits?: readonly FlowToolkitId[]
}

const BUILTIN_TEMPLATES: FlowTemplateDef[] = [
  {
    id: 'math-solver',
    label: 'Math solver',
    description: 'Grouped calculator pipeline — inputs, multiply/divide, solver terminus.',
    section: 'Grouped pipelines',
    tags: ['Grouped', 'Math'],
    document: FLOW_WORKFLOW_MATH,
    wireframe: FLOW_TEMPLATE_WIREFRAMES['math-solver'],
  },
  {
    id: 'questionnaire',
    label: 'Questionnaire',
    description: 'Branching survey block — one question with parallel answer paths.',
    section: 'Grouped pipelines',
    tags: ['Grouped', 'Branching'],
    document: FLOW_WORKFLOW_QUESTIONNAIRE,
    wireframe: FLOW_TEMPLATE_WIREFRAMES.questionnaire,
  },
]

const templateMap = new Map<string, FlowTemplateDef>(
  BUILTIN_TEMPLATES.map((template) => [template.id, template]),
)

function templateToolkits(template: FlowTemplateDef): readonly FlowToolkitId[] {
  return template.toolkits?.length ? template.toolkits : (['default'] as const)
}

/** Register extra templates (e.g. website-plan toolkit). Idempotent by id. */
export function registerFlowTemplates(templates: readonly FlowTemplateDef[]): void {
  for (const template of templates) {
    templateMap.set(template.id, template)
  }
}

export function listFlowTemplates(toolkit: FlowToolkitId = 'default'): FlowTemplateDef[] {
  return [...templateMap.values()].filter((template) =>
    templateToolkits(template).includes(toolkit),
  )
}

export function listFlowTemplateSections(toolkit: FlowToolkitId = 'default'): string[] {
  return [...new Set(listFlowTemplates(toolkit).map((t) => t.section))]
}

export function getFlowTemplate(id: FlowTemplateId): FlowTemplateDef | undefined {
  return templateMap.get(id)
}

/** @deprecated Prefer `listFlowTemplates('default')` — kept for existing imports. */
export const FLOW_TEMPLATES: FlowTemplateDef[] = BUILTIN_TEMPLATES

function remapId(prefix: string, seed: string): string {
  return `${prefix}-${seed}-${crypto.randomUUID().slice(0, 6)}`
}

/**
 * Clone a template into the target document with fresh ids.
 * With `at`, places the template’s min corner at that flow position (drop).
 * Otherwise offsets beside existing content (click-insert).
 */
export function insertFlowTemplate(
  target: FlowDocument,
  template: FlowDocument,
  options: { offset?: { x: number; y: number }; at?: { x: number; y: number } } = {},
): FlowDocument {
  const offset = options.offset ?? { x: 48, y: 48 }
  const idMap = new Map<string, string>()
  const seed = crypto.randomUUID().slice(0, 4)

  for (const node of template.nodes) {
    idMap.set(node.id, remapId('node', seed))
  }
  for (const group of template.groups ?? []) {
    idMap.set(group.id, remapId('group', seed))
  }

  let minX = Infinity
  let minY = Infinity
  for (const n of template.nodes) {
    minX = Math.min(minX, n.x ?? 0)
    minY = Math.min(minY, n.y ?? 0)
  }
  if (!Number.isFinite(minX)) minX = 0
  if (!Number.isFinite(minY)) minY = 0

  let baseX: number
  let baseY: number
  if (options.at) {
    baseX = options.at.x
    baseY = options.at.y
  } else {
    let maxX = 0
    let maxY = 0
    for (const n of target.nodes) {
      maxX = Math.max(maxX, (n.x ?? 0) + 220)
      maxY = Math.max(maxY, (n.y ?? 0) + 100)
    }
    baseX = target.nodes.length ? maxX + offset.x : offset.x
    baseY = target.nodes.length ? Math.min(maxY * 0.15, 80) + offset.y : offset.y
  }

  const nodes: FlowNode[] = template.nodes.map((n) => ({
    ...structuredClone(n),
    id: idMap.get(n.id)!,
    groupId: n.groupId ? (idMap.get(n.groupId) ?? null) : null,
    x: baseX + ((n.x ?? 0) - minX),
    y: baseY + ((n.y ?? 0) - minY),
  }))

  const edges: FlowEdge[] = template.edges.map((e) => ({
    ...structuredClone(e),
    id: remapId('edge', seed),
    source: idMap.get(e.source) ?? e.source,
    target: idMap.get(e.target) ?? e.target,
  }))

  const groups: FlowGroup[] = (template.groups ?? []).map((g) => ({
    ...structuredClone(g),
    id: idMap.get(g.id)!,
    nodeIds: g.nodeIds.map((nid) => idMap.get(nid)!).filter(Boolean),
    parentGroupId: g.parentGroupId ? (idMap.get(g.parentGroupId) ?? null) : null,
  }))

  return {
    ...target,
    nodes: [...target.nodes, ...nodes],
    edges: [...target.edges, ...edges],
    groups: [...(target.groups ?? []), ...groups],
  }
}
