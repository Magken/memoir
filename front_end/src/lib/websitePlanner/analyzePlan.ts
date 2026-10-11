import type { FlowDocument, FlowNode } from '../flowEditor/types'
import { isPlannerKind, plannerStatusOf, readPlannerConfig } from './elements'
import type { PlanCoverageIssue, PlanCoverageReport, PlannerStatus } from './types'

function connectedIds(doc: FlowDocument): Set<string> {
  const ids = new Set<string>()
  for (const edge of doc.edges) {
    ids.add(edge.source)
    ids.add(edge.target)
  }
  return ids
}

function topoSteps(doc: FlowDocument): FlowNode[] {
  const steps = doc.nodes.filter((n) => n.kind === 'plan.step')
  if (steps.length === 0) return []
  const stepIds = new Set(steps.map((s) => s.id))
  const incoming = new Map<string, number>()
  for (const step of steps) incoming.set(step.id, 0)
  for (const edge of doc.edges) {
    if (!stepIds.has(edge.source) || !stepIds.has(edge.target)) continue
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
  }
  const queue = steps.filter((s) => (incoming.get(s.id) ?? 0) === 0).map((s) => s.id)
  const order: string[] = []
  const bySource = new Map<string, string[]>()
  for (const edge of doc.edges) {
    if (!stepIds.has(edge.source) || !stepIds.has(edge.target)) continue
    const list = bySource.get(edge.source) ?? []
    list.push(edge.target)
    bySource.set(edge.source, list)
  }
  while (queue.length) {
    const id = queue.shift()!
    order.push(id)
    for (const target of bySource.get(id) ?? []) {
      const next = (incoming.get(target) ?? 1) - 1
      incoming.set(target, next)
      if (next === 0) queue.push(target)
    }
  }
  for (const step of steps) {
    if (!order.includes(step.id)) order.push(step.id)
  }
  return order.map((id) => steps.find((s) => s.id === id)!).filter(Boolean)
}

function hasOutgoing(doc: FlowDocument, nodeId: string): boolean {
  return doc.edges.some((e) => e.source === nodeId)
}

function hasIncoming(doc: FlowDocument, nodeId: string): boolean {
  return doc.edges.some((e) => e.target === nodeId)
}

function linkedKinds(doc: FlowDocument, nodeId: string): Set<string> {
  const kinds = new Set<string>()
  for (const edge of doc.edges) {
    if (edge.source === nodeId) {
      const target = doc.nodes.find((n) => n.id === edge.target)
      if (target) kinds.add(target.kind)
    }
    if (edge.target === nodeId) {
      const source = doc.nodes.find((n) => n.id === edge.source)
      if (source) kinds.add(source.kind)
    }
  }
  return kinds
}

export function analyzeWebsitePlan(doc: FlowDocument): PlanCoverageReport {
  const plannerNodes = doc.nodes.filter((n) => isPlannerKind(n.kind))
  const linked = connectedIds(doc)
  const issues: PlanCoverageIssue[] = []

  const pages = plannerNodes
    .filter((n) => n.kind === 'plan.page')
    .map((n) => ({ id: n.id, label: n.label, status: plannerStatusOf(n) }))

  const systems = plannerNodes
    .filter((n) => n.kind.startsWith('plan.system.'))
    .map((n) => ({
      id: n.id,
      label: n.label,
      systemId: readPlannerConfig(n).systemId,
      status: plannerStatusOf(n),
    }))

  const integrations = plannerNodes
    .filter((n) => n.kind === 'plan.external')
    .map((n) => ({ id: n.id, label: n.label, status: plannerStatusOf(n) }))

  const missing = plannerNodes
    .filter((n) => {
      const status = plannerStatusOf(n)
      return n.kind === 'plan.missing' || n.kind === 'plan.service-required' || status === 'missing' || status === 'blocked'
    })
    .map((n) => ({ id: n.id, label: n.label, status: plannerStatusOf(n) }))

  const stepNodes = topoSteps(doc)
  const steps = stepNodes.map((n) => ({
    id: n.id,
    label: n.label,
    phase: readPlannerConfig(n).phase?.trim() || 'implementation',
    status: plannerStatusOf(n),
  }))

  const disconnected = plannerNodes
    .filter((n) => n.kind !== 'plan.website' && !linked.has(n.id))
    .map((n) => ({ id: n.id, label: n.label }))

  if (disconnected.length) {
    issues.push({
      id: 'disconnected',
      severity: 'info',
      message: `${disconnected.length} planner node(s) have no edges yet.`,
      nodeIds: disconnected.map((d) => d.id),
    })
  }

  for (const page of pages) {
    const kinds = linkedKinds(doc, page.id)
    const hasRoute = [...kinds].some((k) => k === 'plan.route')
    const hasNav = [...kinds].some((k) => k === 'plan.navigation')
    if (!hasRoute && !hasNav) {
      issues.push({
        id: `page-nav-${page.id}`,
        severity: 'warn',
        message: `Page “${page.label}” has no linked route or navigation.`,
        nodeIds: [page.id],
      })
    }
  }

  for (const node of plannerNodes.filter((n) => n.kind === 'plan.modal' || n.kind === 'plan.form' || n.kind === 'plan.ui')) {
    const kinds = linkedKinds(doc, node.id)
    const hasService = [...kinds].some(
      (k) =>
        k.startsWith('plan.system.') ||
        k === 'plan.api-client' ||
        k === 'plan.service-required' ||
        k === 'plan.external' ||
        k === 'plan.step',
    )
    if (!hasService && !hasOutgoing(doc, node.id) && !hasIncoming(doc, node.id)) {
      continue
    }
    if (!hasService) {
      issues.push({
        id: `ui-service-${node.id}`,
        severity: 'warn',
        message: `“${node.label}” is not linked to a service, API client, or step.`,
        nodeIds: [node.id],
      })
    }
  }

  for (const model of plannerNodes.filter((n) => n.kind === 'plan.data-model')) {
    if (!hasIncoming(doc, model.id) && !hasOutgoing(doc, model.id)) {
      issues.push({
        id: `model-orphan-${model.id}`,
        severity: 'warn',
        message: `Data model “${model.label}” has no consumers or producers.`,
        nodeIds: [model.id],
      })
    }
  }

  for (const gap of missing) {
    issues.push({
      id: `gap-${gap.id}`,
      severity: 'warn',
      message: `Marked ${gap.status}: “${gap.label}”.`,
      nodeIds: [gap.id],
    })
  }

  const implementationOrder =
    steps.length > 0
      ? steps.map((s) => ({ id: s.id, label: s.label, phase: s.phase }))
      : [
          ...pages.map((p) => ({ id: p.id, label: p.label, phase: 'frontend' })),
          ...systems.map((s) => ({ id: s.id, label: s.label, phase: 'backend' })),
          ...integrations.map((i) => ({ id: i.id, label: i.label, phase: 'integration' })),
        ]

  return {
    pages,
    systems,
    integrations,
    missing,
    steps,
    disconnected,
    implementationOrder,
    issues,
  }
}

export function formatStatusLabel(status: PlannerStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
