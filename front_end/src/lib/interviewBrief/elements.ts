import {
  ClipboardList,
  MessageSquareText,
  Plus,
  Tags,
  Wrench,
} from 'lucide-react'
import { registerFlowElements } from '../flowEditor/flowElementRegistry'
import type { FlowElementDefinition, FlowNode, FlowPort } from '../flowEditor/types'
import { INTERVIEW_KIND } from './types'
import { validateInterviewConnection } from './validate'

const TOOLKIT = ['interview-brief'] as const

const PHASE_PORTS: FlowPort[] = [
  { id: 'in', direction: 'in', label: 'from' },
  { id: 'out', direction: 'out', label: 'next' },
]

const DISCUSSION_PORTS: FlowPort[] = [
  ...PHASE_PORTS,
  { id: 'topic', direction: 'out', label: 'topic' },
]

const TOPIC_PORTS: FlowPort[] = [{ id: 'ref', direction: 'in', label: 'used by' }]

function interviewElement(
  partial: Omit<FlowElementDefinition, 'toolkits' | 'contentRenderer' | 'collapsible' | 'allowPortEdit'> & {
    contentRenderer?: FlowElementDefinition['contentRenderer']
    collapsible?: boolean
    allowPortEdit?: boolean
  },
): FlowElementDefinition {
  return {
    ...partial,
    contentRenderer: partial.contentRenderer ?? 'interview',
    collapsible: partial.collapsible ?? true,
    allowPortEdit: false,
    toolkits: TOOLKIT,
    validateConnection: validateInterviewConnection,
  }
}

export const INTERVIEW_BRIEF_ELEMENTS: FlowElementDefinition[] = [
  interviewElement({
    kind: INTERVIEW_KIND.meta,
    category: 'display',
    label: 'Brief',
    paletteSection: 'Structure',
    icon: ClipboardList,
    defaultSize: 'lg',
    defaultPorts: [],
    defaultConfig: {
      title: '',
      roleTitle: '',
      status: 'draft',
      estimatedMinutes: 45,
      proposedMinutes: undefined,
      personaName: '',
      personaVoice: '',
      roleDescription: '',
      rolePdfName: '',
      rolePdfNodeId: '',
      systemGoals: [],
      guardrails: [],
    },
    contributeMcp: (node) => [
      {
        kind: 'resource',
        id: `interview.meta.${node.id}`,
        label: node.label,
        description: 'Interview brief meta',
        nodeId: node.id,
      },
    ],
  }),
  interviewElement({
    kind: INTERVIEW_KIND.topic,
    category: 'flow',
    label: 'Topic',
    paletteSection: 'Topics',
    icon: Tags,
    defaultSize: 'md',
    defaultPorts: TOPIC_PORTS,
    defaultConfig: {
      label: '',
      probes: [{ id: 'p1', goal: '', templateIds: [] }],
    },
    contributeMcp: (node) => [
      {
        kind: 'resource',
        id: `interview.topic.${node.id}`,
        label: node.label,
        nodeId: node.id,
      },
    ],
  }),
  interviewElement({
    kind: INTERVIEW_KIND.discussion,
    category: 'flow',
    label: 'Discussion phase',
    paletteSection: 'Phases',
    icon: MessageSquareText,
    defaultSize: 'md',
    defaultPorts: DISCUSSION_PORTS,
    defaultConfig: {
      phaseId: '',
      isOpening: false,
      isClosing: false,
      notes: '',
    },
    quickActions: [
      {
        id: 'add-next-discussion',
        label: 'Add next discussion',
        childKind: INTERVIEW_KIND.discussion,
        icon: Plus,
      },
      {
        id: 'add-next-tool',
        label: 'Add next tool',
        childKind: INTERVIEW_KIND.tool,
        icon: Wrench,
      },
    ],
    contributeMcp: (node) => [
      {
        kind: 'action',
        id: `interview.phase.discussion.${node.id}`,
        label: node.label,
        nodeId: node.id,
      },
    ],
  }),
  interviewElement({
    kind: INTERVIEW_KIND.tool,
    category: 'action',
    label: 'Tool phase',
    paletteSection: 'Phases',
    icon: Wrench,
    defaultSize: 'md',
    defaultPorts: PHASE_PORTS,
    defaultConfig: {
      phaseId: '',
      toolRef: 'tool.coding.1',
      toolType: 'coding',
      title: '',
      required: true,
    },
    quickActions: [
      {
        id: 'add-next-discussion',
        label: 'Add next discussion',
        childKind: INTERVIEW_KIND.discussion,
        icon: Plus,
      },
      {
        id: 'add-next-tool',
        label: 'Add next tool',
        childKind: INTERVIEW_KIND.tool,
        icon: Wrench,
      },
    ],
    contributeMcp: (node) => [
      {
        kind: 'action',
        id: `interview.phase.tool.${node.id}`,
        label: node.label,
        nodeId: node.id,
      },
    ],
  }),
]

let registered = false

/** Idempotent registration into the shared flow element map. */
export function ensureInterviewBriefElementsRegistered(): void {
  if (registered) return
  registerFlowElements(INTERVIEW_BRIEF_ELEMENTS)
  registered = true
}

export function readInterviewConfig<T extends Record<string, unknown>>(node: FlowNode): T {
  return (node.config ?? {}) as T
}
