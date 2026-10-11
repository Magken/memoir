/**
 * Pure FlowDocument patches for interview-create bot actions.
 * Shared by future FlowEditor.invokeAction + approve→dispatch spine.
 */
import { createFlowNode } from '../flowEditor/flowElementRegistry'
import type { FlowDocument } from '../flowEditor/types'
import {
  applyComposeMetaToFlow,
  emptyComposeMeta,
  type InterviewComposeMeta,
} from './compose'
import { analyzeInterviewBrief } from './coverage'
import { estimateInterviewMinutes } from './duration'
import { ensureInterviewBriefElementsRegistered } from './elements'
import { createStarterInterviewBrief } from './starters'
import {
  INTERVIEW_KIND,
  type InterviewDiscussionConfig,
  type InterviewMetaConfig,
  type InterviewToolConfig,
  type InterviewToolType,
} from './types'
import { isInterviewPhaseKind, topicEdgesFrom } from './validate'

export const CREATE_BOT_ACTION_KEYS = [
  'interview.create.seed_starter',
  'interview.create.stamp_meta',
  'interview.create.add_discussion',
  'interview.create.add_tool',
  'interview.create.update_node',
  'interview.create.attach_topic',
  'interview.create.replace_flow',
] as const

export type CreateBotActionKey = (typeof CREATE_BOT_ACTION_KEYS)[number]

/** Chat catalogue key → editorCatalog / MCT action id (`flow.action.*` prefix required). */
export const CHAT_TO_EDITOR_ACTION_MAP: Record<CreateBotActionKey, string> = {
  'interview.create.seed_starter': 'flow.action.interview-seed-starter',
  'interview.create.stamp_meta': 'flow.action.interview-stamp-meta',
  'interview.create.add_discussion': 'flow.action.interview-add-discussion',
  'interview.create.add_tool': 'flow.action.interview-add-tool',
  'interview.create.update_node': 'flow.action.interview-update-node',
  'interview.create.attach_topic': 'flow.action.interview-attach-topic',
  'interview.create.replace_flow': 'flow.action.interview-replace-flow',
}

export const EDITOR_TO_CHAT_ACTION_MAP: Record<string, CreateBotActionKey> = Object.fromEntries(
  Object.entries(CHAT_TO_EDITOR_ACTION_MAP).map(([chat, editor]) => [editor, chat]),
) as Record<string, CreateBotActionKey>

export type CreateBotActionResult =
  | { ok: true; flow: FlowDocument }
  | { ok: false; error: string }

export type CreateBotActionParams = {
  /** Compose meta for seed_starter / stamp_meta. */
  meta?: Partial<InterviewComposeMeta>
  /** Parent phase for add_discussion / add_tool. */
  parentNodeId?: string
  /** Target node for update_node. */
  nodeId?: string
  label?: string
  config?: Record<string, unknown>
  /** attach_topic endpoints. */
  discussionNodeId?: string
  topicNodeId?: string
  /** Tool phase helpers. */
  toolRef?: string
  toolType?: InterviewToolType | string
  /** replace_flow body. */
  flow?: FlowDocument
}

export type BriefContextSnapshot = {
  title: string
  roleTitle: string
  estimatedMinutes?: number
  proposedMinutes?: number
  phases: Array<{ id: string; kind: string; label: string }>
  topics: Array<{ id: string; label: string }>
  tools: Array<{ id: string; label: string; toolRef?: string; toolType?: string }>
  coverage: {
    hasMeta: boolean
    hasOpening: boolean
    hasClosing: boolean
    discussionCount: number
    toolCount: number
    topicCount: number
    phaseCount: number
    issueCount: number
    warnCount: number
  }
}

function shortId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function isCreateBotActionKey(key: string): key is CreateBotActionKey {
  return (CREATE_BOT_ACTION_KEYS as readonly string[]).includes(key)
}

function mergeComposeMeta(partial?: Partial<InterviewComposeMeta>): InterviewComposeMeta {
  return { ...emptyComposeMeta(), ...partial }
}

function cloneFlow(flow: FlowDocument): FlowDocument {
  return structuredClone(flow)
}

function appendPhaseNode(
  flow: FlowDocument,
  kind: typeof INTERVIEW_KIND.discussion | typeof INTERVIEW_KIND.tool,
  params: CreateBotActionParams,
): CreateBotActionResult {
  ensureInterviewBriefElementsRegistered()
  const draft = cloneFlow(flow)
  const parentId = typeof params.parentNodeId === 'string' ? params.parentNodeId.trim() : ''
  if (parentId) {
    const parent = draft.nodes.find((n) => n.id === parentId)
    if (!parent) return { ok: false, error: `Parent node not found: ${parentId}` }
    if (!isInterviewPhaseKind(parent.kind)) {
      return { ok: false, error: `Parent must be a phase node: ${parentId}` }
    }
  }

  const childId = shortId(kind === INTERVIEW_KIND.tool ? 'phase-tool' : 'phase-disc')
  const child = createFlowNode(kind, childId, { x: 0, y: 0 })
  if (params.label?.trim()) child.label = params.label.trim()

  if (kind === INTERVIEW_KIND.discussion) {
    const config: InterviewDiscussionConfig = {
      phaseId: childId,
      isOpening: false,
      isClosing: false,
      notes: '',
      ...(params.config as Partial<InterviewDiscussionConfig> | undefined),
    }
    child.config = { ...child.config, ...config }
  } else {
    const toolType =
      (typeof params.toolType === 'string' && params.toolType.trim()
        ? params.toolType.trim()
        : typeof params.config?.toolType === 'string'
          ? params.config.toolType
          : 'coding') as InterviewToolType
    const toolRef =
      (typeof params.toolRef === 'string' && params.toolRef.trim()
        ? params.toolRef.trim()
        : typeof params.config?.toolRef === 'string' && params.config.toolRef.trim()
          ? String(params.config.toolRef)
          : `tool.${toolType}.1`)
    const config: InterviewToolConfig = {
      phaseId: childId,
      toolRef,
      toolType,
      title: params.label?.trim() || child.label,
      required: true,
      ...(params.config as Partial<InterviewToolConfig> | undefined),
    }
    child.config = { ...child.config, ...config }
    if (params.label?.trim()) child.label = params.label.trim()
  }

  draft.nodes.push(child)

  if (parentId) {
    draft.edges.push({
      id: shortId('edge'),
      source: parentId,
      target: child.id,
      sourceHandle: 'out',
      targetHandle: 'in',
    })
  }

  return { ok: true, flow: draft }
}

function applySeedStarter(params: CreateBotActionParams): CreateBotActionResult {
  ensureInterviewBriefElementsRegistered()
  const starter = createStarterInterviewBrief()
  if (!params.meta) return { ok: true, flow: starter }
  return { ok: true, flow: applyComposeMetaToFlow(starter, mergeComposeMeta(params.meta)) }
}

function applyStampMeta(flow: FlowDocument, params: CreateBotActionParams): CreateBotActionResult {
  if (!params.meta || Object.keys(params.meta).length === 0) {
    return { ok: false, error: 'stamp_meta requires meta fields' }
  }
  const hasMeta = flow.nodes.some((n) => n.kind === INTERVIEW_KIND.meta)
  if (!hasMeta) return { ok: false, error: 'No interview.meta node to stamp' }
  return { ok: true, flow: applyComposeMetaToFlow(cloneFlow(flow), mergeComposeMeta(params.meta)) }
}

function applyUpdateNode(flow: FlowDocument, params: CreateBotActionParams): CreateBotActionResult {
  const nodeId = typeof params.nodeId === 'string' ? params.nodeId.trim() : ''
  if (!nodeId) return { ok: false, error: 'update_node requires nodeId' }
  const draft = cloneFlow(flow)
  const node = draft.nodes.find((n) => n.id === nodeId)
  if (!node) return { ok: false, error: `Node not found: ${nodeId}` }
  if (params.label?.trim()) node.label = params.label.trim()
  if (params.config && typeof params.config === 'object') {
    node.config = { ...(node.config ?? {}), ...params.config }
  }
  return { ok: true, flow: draft }
}

function applyAttachTopic(flow: FlowDocument, params: CreateBotActionParams): CreateBotActionResult {
  const discussionId =
    (typeof params.discussionNodeId === 'string' && params.discussionNodeId.trim()) ||
    (typeof params.nodeId === 'string' && params.nodeId.trim()) ||
    ''
  const topicId = typeof params.topicNodeId === 'string' ? params.topicNodeId.trim() : ''
  if (!discussionId || !topicId) {
    return { ok: false, error: 'attach_topic requires discussionNodeId and topicNodeId' }
  }
  const draft = cloneFlow(flow)
  const discussion = draft.nodes.find((n) => n.id === discussionId)
  const topic = draft.nodes.find((n) => n.id === topicId)
  if (!discussion || discussion.kind !== INTERVIEW_KIND.discussion) {
    return { ok: false, error: `Discussion node not found: ${discussionId}` }
  }
  if (!topic || topic.kind !== INTERVIEW_KIND.topic) {
    return { ok: false, error: `Topic node not found: ${topicId}` }
  }

  const existing = topicEdgesFrom(draft, discussionId)
  if (existing.some((e) => e.target === topicId)) {
    return { ok: true, flow: draft }
  }

  draft.edges = draft.edges.filter((e) => !existing.includes(e))
  draft.edges.push({
    id: shortId('edge-topic'),
    source: discussionId,
    target: topicId,
    sourceHandle: 'topic',
    targetHandle: 'ref',
  })

  const config = { ...(discussion.config ?? {}) } as InterviewDiscussionConfig
  config.topicNodeId = topicId
  discussion.config = config

  return { ok: true, flow: draft }
}

function applyReplaceFlow(params: CreateBotActionParams): CreateBotActionResult {
  const next = params.flow
  if (!next || typeof next !== 'object') {
    return { ok: false, error: 'replace_flow requires flow document' }
  }
  if (!Array.isArray(next.nodes) || !Array.isArray(next.edges)) {
    return { ok: false, error: 'replace_flow flow must include nodes and edges arrays' }
  }
  ensureInterviewBriefElementsRegistered()
  return {
    ok: true,
    flow: {
      nodes: structuredClone(next.nodes),
      edges: structuredClone(next.edges),
      groups: Array.isArray(next.groups) ? structuredClone(next.groups) : [],
      viewport: next.viewport ? structuredClone(next.viewport) : undefined,
      meta: next.meta ? structuredClone(next.meta) : undefined,
    },
  }
}

/** Apply one create-bot action to a flow. Does not mutate the input document. */
export function applyCreateBotAction(
  flow: FlowDocument,
  actionKey: string,
  params: CreateBotActionParams = {},
): CreateBotActionResult {
  const key = EDITOR_TO_CHAT_ACTION_MAP[actionKey] ?? actionKey
  if (!isCreateBotActionKey(key)) {
    return { ok: false, error: `Unknown create-bot action: ${actionKey}` }
  }

  switch (key) {
    case 'interview.create.seed_starter':
      return applySeedStarter(params)
    case 'interview.create.stamp_meta':
      return applyStampMeta(flow, params)
    case 'interview.create.add_discussion':
      return appendPhaseNode(flow, INTERVIEW_KIND.discussion, params)
    case 'interview.create.add_tool':
      return appendPhaseNode(flow, INTERVIEW_KIND.tool, params)
    case 'interview.create.update_node':
      return applyUpdateNode(flow, params)
    case 'interview.create.attach_topic':
      return applyAttachTopic(flow, params)
    case 'interview.create.replace_flow':
      return applyReplaceFlow(params)
    default: {
      const _exhaustive: never = key
      return { ok: false, error: `Unhandled action: ${_exhaustive}` }
    }
  }
}

/** Compact brief summary for bot context injection (no full graph dump). */
export function buildBriefContextSnapshot(flow: FlowDocument): BriefContextSnapshot {
  const report = analyzeInterviewBrief(flow)
  const meta = flow.nodes.find((n) => n.kind === INTERVIEW_KIND.meta)
  const metaConfig = (meta?.config ?? {}) as InterviewMetaConfig

  let hasOpening = false
  let hasClosing = false
  const phases: BriefContextSnapshot['phases'] = []
  const topics: BriefContextSnapshot['topics'] = []
  const tools: BriefContextSnapshot['tools'] = []

  for (const node of flow.nodes) {
    if (node.kind === INTERVIEW_KIND.discussion || node.kind === INTERVIEW_KIND.tool) {
      phases.push({ id: node.id, kind: node.kind, label: node.label })
    }
    if (node.kind === INTERVIEW_KIND.discussion) {
      const config = (node.config ?? {}) as InterviewDiscussionConfig
      if (config.isOpening) hasOpening = true
      if (config.isClosing) hasClosing = true
    }
    if (node.kind === INTERVIEW_KIND.topic) {
      topics.push({ id: node.id, label: node.label })
    }
    if (node.kind === INTERVIEW_KIND.tool) {
      const config = (node.config ?? {}) as InterviewToolConfig
      tools.push({
        id: node.id,
        label: node.label,
        toolRef: config.toolRef,
        toolType: config.toolType,
      })
    }
  }

  const title =
    (typeof metaConfig.title === 'string' && metaConfig.title.trim()) ||
    meta?.label ||
    'Untitled interview'

  return {
    title,
    roleTitle: typeof metaConfig.roleTitle === 'string' ? metaConfig.roleTitle : '',
    estimatedMinutes: estimateInterviewMinutes(flow),
    proposedMinutes:
      typeof metaConfig.proposedMinutes === 'number' ? metaConfig.proposedMinutes : undefined,
    phases,
    topics,
    tools,
    coverage: {
      hasMeta: report.metaCount > 0,
      hasOpening,
      hasClosing,
      discussionCount: report.discussionCount,
      toolCount: report.toolCount,
      topicCount: report.topicCount,
      phaseCount: report.phaseCount,
      issueCount: report.issues.length,
      warnCount: report.issues.filter((i) => i.severity === 'warn').length,
    },
  }
}

/** Resolve chat or editor action id to the chat catalogue key (or null). */
export function resolveCreateBotActionKey(actionId: string): CreateBotActionKey | null {
  if (isCreateBotActionKey(actionId)) return actionId
  return EDITOR_TO_CHAT_ACTION_MAP[actionId] ?? null
}
