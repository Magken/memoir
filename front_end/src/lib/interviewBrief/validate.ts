import type { ConnectionValidationContext, FlowDocument, FlowEdge } from '../flowEditor/types'
import { INTERVIEW_KIND } from './types'

const PHASE_KINDS = new Set<string>([INTERVIEW_KIND.discussion, INTERVIEW_KIND.tool])

export function isInterviewPhaseKind(kind: string): boolean {
  return PHASE_KINDS.has(kind)
}

export function isInterviewBriefKind(kind: string): boolean {
  return (
    kind === INTERVIEW_KIND.meta ||
    kind === INTERVIEW_KIND.topic ||
    kind === INTERVIEW_KIND.discussion ||
    kind === INTERVIEW_KIND.tool
  )
}

function isNextEdge(edge: FlowEdge): boolean {
  const sourceHandle = edge.sourceHandle ?? 'out'
  const targetHandle = edge.targetHandle ?? 'in'
  return sourceHandle === 'out' && targetHandle === 'in'
}

function isTopicEdge(edge: FlowEdge): boolean {
  return (edge.sourceHandle ?? '') === 'topic' && (edge.targetHandle ?? 'ref') === 'ref'
}

/** Directed BFS along spine `out`→`in` edges — true if `from` can reach `to`. */
export function spineCanReach(doc: FlowDocument, fromId: string, toId: string): boolean {
  if (fromId === toId) return true
  const bySource = new Map<string, string[]>()
  for (const edge of doc.edges) {
    if (!isNextEdge(edge)) continue
    const list = bySource.get(edge.source) ?? []
    list.push(edge.target)
    bySource.set(edge.source, list)
  }
  const seen = new Set<string>()
  const queue = [fromId]
  while (queue.length) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    for (const next of bySource.get(id) ?? []) {
      if (next === toId) return true
      if (!seen.has(next)) queue.push(next)
    }
  }
  return false
}

export function wouldCreateSpineCycle(
  doc: FlowDocument,
  sourceId: string,
  targetId: string,
): boolean {
  if (sourceId === targetId) return true
  return spineCanReach(doc, targetId, sourceId)
}

export function countOutgoingNext(doc: FlowDocument, nodeId: string): number {
  return doc.edges.filter((e) => e.source === nodeId && isNextEdge(e)).length
}

export function topicEdgesFrom(doc: FlowDocument, discussionNodeId: string): FlowEdge[] {
  return doc.edges.filter((e) => e.source === discussionNodeId && isTopicEdge(e))
}

export function spineEdgesFrom(doc: FlowDocument, nodeId: string): FlowEdge[] {
  return doc.edges.filter((e) => e.source === nodeId && isNextEdge(e))
}

export function spineEdgesTo(doc: FlowDocument, nodeId: string): FlowEdge[] {
  return doc.edges.filter((e) => e.target === nodeId && isNextEdge(e))
}

/**
 * Hard connection matrix for interview-brief elements.
 * Returns `true` when allowed, otherwise `false` or an error string.
 */
export function validateInterviewConnection(ctx: ConnectionValidationContext): boolean | string {
  const { sourceKind, targetKind, sourceHandle, targetHandle, doc, sourceId, targetId } = ctx
  const sh = sourceHandle ?? 'out'
  const th = targetHandle ?? 'in'

  if (sourceKind === INTERVIEW_KIND.meta || targetKind === INTERVIEW_KIND.meta) {
    return 'Brief meta is not wired on the phase spine'
  }

  if (sourceKind === INTERVIEW_KIND.discussion && sh === 'topic') {
    if (targetKind !== INTERVIEW_KIND.topic || th !== 'ref') {
      return 'Topic bind must connect to a topic’s used-by port'
    }
    if (sourceId && topicEdgesFrom(doc, sourceId).length > 0) {
      return 'Discussion phase already has a topic bind'
    }
    return true
  }

  if (isInterviewPhaseKind(sourceKind) && isInterviewPhaseKind(targetKind)) {
    if (sh === 'topic') return 'Use the topic port only toward topics'
    if (sh !== 'out' || th !== 'in') return 'Phases connect out → in only'
    if (sourceId && targetId) {
      if (sourceId === targetId) return 'Cannot connect a phase to itself'
      if (wouldCreateSpineCycle(doc, sourceId, targetId)) {
        return 'That link would create a cycle in the interview order'
      }
    }
    return true
  }

  if (sourceKind === INTERVIEW_KIND.topic) {
    return 'Topics receive binds only (phase → topic)'
  }

  return false
}
