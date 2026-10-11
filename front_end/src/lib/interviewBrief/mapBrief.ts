import { createFlowNode } from '../flowEditor/flowElementRegistry'
import type { FlowDocument, FlowEdge, FlowNode } from '../flowEditor/types'
import { FLOW_SCHEMA_VERSION } from '../flowEditor/types'
import { estimateInterviewMinutes } from './duration'
import { ensureInterviewBriefElementsRegistered } from './elements'
import {
  INTERVIEW_BRIEF_SCHEMA_VERSION,
  INTERVIEW_KIND,
  type InterviewBriefBody,
  type InterviewBriefPhase,
  type InterviewBriefToolEntry,
  type InterviewBriefTopic,
  type InterviewDiscussionConfig,
  type InterviewMetaConfig,
  type InterviewProbeConfig,
  type InterviewToolConfig,
  type InterviewTopicConfig,
  type InterviewToolType,
} from './types'
import { isInterviewPhaseKind, spineEdgesFrom, spineEdgesTo, topicEdgesFrom } from './validate'

function phaseIdOf(node: FlowNode): string {
  const config = (node.config ?? {}) as { phaseId?: string }
  return typeof config.phaseId === 'string' && config.phaseId.trim()
    ? config.phaseId.trim()
    : node.id
}

function walkPhaseSpine(doc: FlowDocument): FlowNode[] {
  const phases = doc.nodes.filter((n) => isInterviewPhaseKind(n.kind))
  if (phases.length === 0) return []
  const phaseIds = new Set(phases.map((p) => p.id))
  const starts = phases.filter((p) => spineEdgesTo(doc, p.id).length === 0)
  const order: FlowNode[] = []
  const seen = new Set<string>()

  const walk = (node: FlowNode) => {
    if (seen.has(node.id)) return
    seen.add(node.id)
    order.push(node)
    const outs = spineEdgesFrom(doc, node.id)
    for (const edge of outs) {
      if (!phaseIds.has(edge.target)) continue
      const next = phases.find((p) => p.id === edge.target)
      if (next) walk(next)
    }
  }

  for (const start of starts.length ? starts : phases) walk(start)
  for (const phase of phases) {
    if (!seen.has(phase.id)) walk(phase)
  }
  return order
}

function toolArtifact(type: InterviewToolType | string | undefined): { docKind: string } | undefined {
  if (type === 'coding') return { docKind: 'code' }
  if (type === 'doc') return { docKind: 'doc' }
  if (type === 'form_quiz') return { docKind: 'form' }
  return undefined
}

export function flowToBriefBody(doc: FlowDocument): InterviewBriefBody {
  ensureInterviewBriefElementsRegistered()
  const metas = doc.nodes.filter((n) => n.kind === INTERVIEW_KIND.meta)
  const metaNode = metas[0]
  const metaConfig = (metaNode?.config ?? {}) as InterviewMetaConfig

  const topics: InterviewBriefTopic[] = doc.nodes
    .filter((n) => n.kind === INTERVIEW_KIND.topic)
    .map((n) => {
      const config = (n.config ?? {}) as InterviewTopicConfig
      const probes: InterviewProbeConfig[] = Array.isArray(config.probes) ? config.probes : []
      return {
        id: n.id,
        label: (typeof config.label === 'string' && config.label.trim()) || n.label,
        probes: probes.map((p, i) => ({
          id: p.id || `p${i + 1}`,
          goal: p.goal ?? '',
          templateIds: Array.isArray(p.templateIds) ? p.templateIds : [],
        })),
      }
    })

  const tools: Record<string, InterviewBriefToolEntry> = {}
  const phases: InterviewBriefPhase[] = []

  for (const node of walkPhaseSpine(doc)) {
    if (node.kind === INTERVIEW_KIND.discussion) {
      const config = (node.config ?? {}) as InterviewDiscussionConfig
      const topicEdge = topicEdgesFrom(doc, node.id)[0]
      phases.push({
        id: phaseIdOf(node),
        kind: 'discussion',
        topicId: topicEdge?.target,
        isOpening: Boolean(config.isOpening),
        isClosing: Boolean(config.isClosing),
        notes: typeof config.notes === 'string' ? config.notes : undefined,
      })
      continue
    }

    if (node.kind === INTERVIEW_KIND.tool) {
      const config = (node.config ?? {}) as InterviewToolConfig
      const toolRef =
        typeof config.toolRef === 'string' && config.toolRef.trim()
          ? config.toolRef.trim()
          : `tool.${node.id}`
      const toolType = (config.toolType ?? 'coding') as InterviewToolType
      const title =
        (typeof config.title === 'string' && config.title.trim()) || node.label || toolRef
      tools[toolRef] = {
        type: toolType,
        title,
        artifact: toolArtifact(toolType),
      }
      phases.push({
        id: phaseIdOf(node),
        kind: 'tool',
        toolRef,
        required: config.required !== false,
        title,
      })
    }
  }

  const personaName = typeof metaConfig.personaName === 'string' ? metaConfig.personaName : ''
  const personaVoice = typeof metaConfig.personaVoice === 'string' ? metaConfig.personaVoice : ''

  return {
    schemaVersion: INTERVIEW_BRIEF_SCHEMA_VERSION,
    kind: 'interview_brief',
    definition: {
      meta: {
        title:
          (typeof metaConfig.title === 'string' && metaConfig.title.trim()) ||
          metaNode?.label ||
          'Untitled brief',
        roleTitle: typeof metaConfig.roleTitle === 'string' ? metaConfig.roleTitle : '',
        status: 'draft',
        estimatedMinutes: estimateInterviewMinutes(doc),
        proposedMinutes:
          typeof metaConfig.proposedMinutes === 'number' ? metaConfig.proposedMinutes : undefined,
        roleDescription:
          typeof metaConfig.roleDescription === 'string' ? metaConfig.roleDescription : undefined,
        rolePdfNodeId:
          typeof metaConfig.rolePdfNodeId === 'string' && metaConfig.rolePdfNodeId.trim()
            ? metaConfig.rolePdfNodeId.trim()
            : undefined,
        rolePdfName:
          typeof metaConfig.rolePdfName === 'string' && metaConfig.rolePdfName.trim()
            ? metaConfig.rolePdfName.trim()
            : undefined,
      },
      persona: { name: personaName, voice: personaVoice },
      systemGoals: Array.isArray(metaConfig.systemGoals) ? metaConfig.systemGoals : [],
      guardrails: Array.isArray(metaConfig.guardrails) ? metaConfig.guardrails : [],
      probeDefaults: { maxFollowUps: 1 },
    },
    topicLibrary: topics,
    phases,
    tools,
    analysis: { bindings: [] },
  }
}

function layoutSeed(index: number, row = 0): { x: number; y: number } {
  return { x: 80 + index * 220, y: 80 + row * 160 }
}

/** Inverse map for future Drive load — positions are seed coords, not preserved layout. */
export function briefBodyToFlow(body: InterviewBriefBody): FlowDocument {
  ensureInterviewBriefElementsRegistered()
  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []

  const meta = createFlowNode(INTERVIEW_KIND.meta, 'brief-meta', layoutSeed(0, 0))
  meta.label = body.definition.meta.title || 'Brief'
  meta.config = {
    title: body.definition.meta.title,
    roleTitle: body.definition.meta.roleTitle,
    status: 'draft',
    estimatedMinutes: body.definition.meta.estimatedMinutes,
    proposedMinutes: body.definition.meta.proposedMinutes,
    roleDescription: body.definition.meta.roleDescription ?? '',
    rolePdfName: body.definition.meta.rolePdfName ?? '',
    rolePdfNodeId: body.definition.meta.rolePdfNodeId ?? '',
    personaName: body.definition.persona?.name ?? '',
    personaVoice: body.definition.persona?.voice ?? '',
    systemGoals: body.definition.systemGoals ?? [],
    guardrails: body.definition.guardrails ?? [],
  }
  nodes.push(meta)

  const topicIndex = new Map<string, string>()
  body.topicLibrary.forEach((topic, i) => {
    const id = topic.id || `topic-${i + 1}`
    topicIndex.set(topic.id, id)
    const node = createFlowNode(INTERVIEW_KIND.topic, id, layoutSeed(i, 2))
    node.label = topic.label || 'Topic'
    node.config = {
      label: topic.label,
      probes: (topic.probes ?? []).map((p, pi) => ({
        id: p.id || `p${pi + 1}`,
        goal: p.goal ?? '',
        templateIds: p.templateIds ?? [],
      })),
    }
    nodes.push(node)
  })

  let prevPhaseId: string | null = null
  body.phases.forEach((phase, i) => {
    const nodeId = `phase-${phase.id}`
    if (phase.kind === 'discussion') {
      const node = createFlowNode(INTERVIEW_KIND.discussion, nodeId, layoutSeed(i, 1))
      node.label = phase.isOpening ? 'Opening' : phase.isClosing ? 'Closing' : 'Discussion'
      node.config = {
        phaseId: phase.id,
        topicNodeId: phase.topicId,
        isOpening: Boolean(phase.isOpening),
        isClosing: Boolean(phase.isClosing),
        notes: phase.notes ?? '',
      }
      nodes.push(node)
      if (phase.topicId && topicIndex.has(phase.topicId)) {
        edges.push({
          id: `edge-topic-${phase.id}`,
          source: nodeId,
          target: topicIndex.get(phase.topicId)!,
          sourceHandle: 'topic',
          targetHandle: 'ref',
        })
      }
    } else {
      const tool = body.tools[phase.toolRef]
      const node = createFlowNode(INTERVIEW_KIND.tool, nodeId, layoutSeed(i, 1))
      node.label = phase.title || tool?.title || 'Tool'
      node.config = {
        phaseId: phase.id,
        toolRef: phase.toolRef,
        toolType: (tool?.type as InterviewToolType) || 'coding',
        title: phase.title || tool?.title || '',
        required: phase.required !== false,
      }
      nodes.push(node)
    }

    if (prevPhaseId) {
      edges.push({
        id: `edge-next-${prevPhaseId}-${phase.id}`,
        source: prevPhaseId,
        target: nodeId,
        sourceHandle: 'out',
        targetHandle: 'in',
      })
    }
    prevPhaseId = nodeId
  })

  return {
    nodes,
    edges,
    groups: [],
    meta: {
      schemaVersion: FLOW_SCHEMA_VERSION,
      workflowId: 'interview-brief',
      prototype: 'interview-brief',
      notes: 'Mapped from interview brief body',
    },
  }
}

export function assertBriefRoundTrip(doc: FlowDocument): boolean {
  const body = flowToBriefBody(doc)
  const again = flowToBriefBody(briefBodyToFlow(body))
  return (
    again.definition.meta.title === body.definition.meta.title &&
    again.phases.length === body.phases.length &&
    again.topicLibrary.length === body.topicLibrary.length
  )
}

export function listSpinePhaseNodes(doc: FlowDocument): FlowNode[] {
  return walkPhaseSpine(doc)
}
