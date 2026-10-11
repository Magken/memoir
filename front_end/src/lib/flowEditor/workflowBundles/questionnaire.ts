import type { FlowDocument } from '../types'
import { FLOW_SCHEMA_VERSION } from '../types'

export const FLOW_WORKFLOW_QUESTIONNAIRE: FlowDocument = {
  meta: {
    schemaVersion: FLOW_SCHEMA_VERSION,
    workflowId: 'questionnaire',
    prototype: 'questionnaire',
    notes: 'Reference prototype — branching question and answer nodes.',
  },
  groups: [
    {
      id: 'group-survey',
      label: 'Color survey',
      nodeIds: ['question-1', 'answer-blue', 'answer-red'],
    },
  ],
  nodes: [
    {
      id: 'question-1',
      kind: 'flow.question',
      label: 'Favorite color?',
      groupId: 'group-survey',
      x: 0,
      y: 120,
      config: { prompt: 'What is your favorite color?' },
    },
    {
      id: 'answer-blue',
      kind: 'flow.answer',
      label: 'Blue',
      groupId: 'group-survey',
      x: 280,
      y: 40,
      config: { value: 'blue' },
    },
    {
      id: 'answer-red',
      kind: 'flow.answer',
      label: 'Red',
      groupId: 'group-survey',
      x: 280,
      y: 200,
      config: { value: 'red' },
    },
  ],
  edges: [
    {
      id: 'edge-q-blue',
      label: 'branch',
      source: 'question-1',
      sourceHandle: 'out',
      target: 'answer-blue',
      targetHandle: 'in',
    },
    {
      id: 'edge-q-red',
      label: 'branch',
      source: 'question-1',
      sourceHandle: 'out',
      target: 'answer-red',
      targetHandle: 'in',
    },
  ],
}
