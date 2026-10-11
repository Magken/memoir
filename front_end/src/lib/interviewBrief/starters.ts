import { createFlowNode } from '../flowEditor/flowElementRegistry'
import { applyDagreLayout } from '../flowEditor/reactFlowBridge'
import type { FlowDocument } from '../flowEditor/types'
import { FLOW_SCHEMA_VERSION } from '../flowEditor/types'
import { ensureInterviewBriefElementsRegistered } from './elements'
import { INTERVIEW_KIND } from './types'

export function createBlankInterviewBrief(): FlowDocument {
  ensureInterviewBriefElementsRegistered()
  return {
    nodes: [],
    edges: [],
    groups: [],
    meta: {
      schemaVersion: FLOW_SCHEMA_VERSION,
      workflowId: 'interview-brief',
      prototype: 'interview-brief',
      notes: 'Blank interview brief — add Brief meta, topics, and phases from the palette.',
    },
  }
}

/** Starter: meta + Warmup/Close topics + Opening → Tool → Closing linear spine. */
export function createStarterInterviewBrief(): FlowDocument {
  ensureInterviewBriefElementsRegistered()

  const meta = createFlowNode(INTERVIEW_KIND.meta, 'brief-meta', { x: 0, y: 0 })
  meta.label = 'Senior role screen'
  meta.config = {
    title: 'Senior role screen',
    roleTitle: 'Senior engineer',
    status: 'draft',
    estimatedMinutes: 45,
    proposedMinutes: undefined,
    personaName: '',
    personaVoice: '',
    systemGoals: [],
    guardrails: [],
  }

  const warmup = createFlowNode(INTERVIEW_KIND.topic, 'topic-warmup', { x: 0, y: 0 })
  warmup.label = 'Warmup'
  warmup.config = {
    label: 'Warmup',
    probes: [{ id: 'p1', goal: 'Learn about recent work', templateIds: [] }],
  }

  const close = createFlowNode(INTERVIEW_KIND.topic, 'topic-close', { x: 0, y: 0 })
  close.label = 'Close'
  close.config = {
    label: 'Close',
    probes: [{ id: 'p1', goal: 'Candidate questions and wrap-up', templateIds: [] }],
  }

  const opening = createFlowNode(INTERVIEW_KIND.discussion, 'phase-open', { x: 0, y: 0 })
  opening.label = 'Opening'
  opening.config = {
    phaseId: 'ph.open',
    topicNodeId: 'topic-warmup',
    isOpening: true,
    isClosing: false,
    notes: '',
  }

  const tool = createFlowNode(INTERVIEW_KIND.tool, 'phase-code', { x: 0, y: 0 })
  tool.label = 'Coding exercise'
  tool.config = {
    phaseId: 'ph.code',
    toolRef: 'tool.coding.1',
    toolType: 'coding',
    title: 'Coding exercise',
    required: true,
  }

  const closing = createFlowNode(INTERVIEW_KIND.discussion, 'phase-close', { x: 0, y: 0 })
  closing.label = 'Closing'
  closing.config = {
    phaseId: 'ph.close',
    topicNodeId: 'topic-close',
    isOpening: false,
    isClosing: true,
    notes: '',
  }

  const doc: FlowDocument = {
    nodes: [meta, warmup, close, opening, tool, closing],
    edges: [
      {
        id: 'edge-open-tool',
        source: 'phase-open',
        target: 'phase-code',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
      {
        id: 'edge-tool-close',
        source: 'phase-code',
        target: 'phase-close',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
      {
        id: 'edge-open-warmup',
        source: 'phase-open',
        target: 'topic-warmup',
        sourceHandle: 'topic',
        targetHandle: 'ref',
      },
      {
        id: 'edge-close-topic',
        source: 'phase-close',
        target: 'topic-close',
        sourceHandle: 'topic',
        targetHandle: 'ref',
      },
    ],
    groups: [],
    meta: {
      schemaVersion: FLOW_SCHEMA_VERSION,
      workflowId: 'interview-brief',
      prototype: 'interview-brief',
      notes: 'Starter interview brief — opening discussion, coding tool, closing discussion.',
    },
  }

  return applyDagreLayout(doc, 'LR')
}
