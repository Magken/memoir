import { createFlowNode } from '../flowEditor/flowElementRegistry'
import { applyDagreLayout } from '../flowEditor/reactFlowBridge'
import type { FlowDocument, FlowEdge, FlowNode } from '../flowEditor/types'
import { FLOW_SCHEMA_VERSION } from '../flowEditor/types'
import { ensureMockupElementsRegistered } from './elements'
import type { MockupNodeConfig } from './types'

function mockupNode(
  kind: `mockup.${string}`,
  id: string,
  label: string,
  config: MockupNodeConfig,
): FlowNode {
  const node = createFlowNode(kind, id, { x: 0, y: 0 })
  node.label = label
  node.config = { ...node.config, ...config }
  return node
}

const DECK_EDGE_WIDTH = 4.5

function edge(id: string, source: string, target: string, label?: string): FlowEdge {
  return {
    id,
    source,
    target,
    sourceHandle: 'out',
    targetHandle: 'in',
    label,
    style: {
      strokeWidth: DECK_EDGE_WIDTH,
      markerEnd: 'arrowclosed',
    },
  }
}

export function createBlankMockupFlow(): FlowDocument {
  ensureMockupElementsRegistered()
  return {
    nodes: [],
    edges: [],
    groups: [],
    meta: {
      schemaVersion: FLOW_SCHEMA_VERSION,
      workflowId: 'mockup',
      prototype: 'mockup',
      notes: 'Blank mockup flow — add titles, gleam cards, steps, and hubs from the palette.',
    },
  }
}

/** Organised grading map for the deck viewer — already dagre TB on load. */
export function createVerifiedGradingMockupFlow(): FlowDocument {
  ensureMockupElementsRegistered()

  const title = mockupNode('mockup.gleam', 'grade-title', 'Verified grading', {
    kicker: 'Candidate day',
    title: 'Verified grading',
    body: 'You write the standard. Marks stay on the work. A person can still change the call.',
    gleam: true,
  })
  const talk = mockupNode('mockup.callout', 'grade-talk', 'You write the Talk', {
    iconId: 'message',
    title: 'You write the Talk',
    body: 'Custom templates set probe order, targets, and what a complete answer sounds like.',
  })
  const editors = mockupNode('mockup.pills', 'grade-editors', 'Assessment editors', {
    title: 'They work in real editors',
    iconId: 'layout',
    pills: 'Form, Coding, Writing',
    body: 'Each editor keeps its own marking on the artifact it hosts.',
  })
  const hub = mockupNode('mockup.hub', 'grade-hub', 'One package', {
    kicker: 'Orchestrator',
    title: 'One package',
    body: 'Talk and tools leave as one day. A manager does not rebuild the hire from a chat log and a separate test.',
  })
  const capture = mockupNode('mockup.step', 'grade-capture', 'Capture', {
    step: '01',
    title: 'Capture',
    body: 'Work lands in the stage kit — talk, form, code, or writing.',
  })
  const score = mockupNode('mockup.step', 'grade-score', 'Score', {
    step: '02',
    title: 'Score',
    body: 'Rubric marks attach to the same artifact. Not a recap score.',
  })
  const review = mockupNode('mockup.step', 'grade-review', 'Review', {
    step: '03',
    title: 'Review',
    body: 'A person opens the package the model already marked.',
  })
  const report = mockupNode('mockup.metric', 'grade-report', 'Report', {
    metric: '04',
    kicker: 'Out',
    title: 'Report',
    body: 'The decision pack leaves with evidence still attached.',
  })
  const bands = mockupNode('mockup.callout', 'grade-bands', 'Bands you can defend', {
    iconId: 'check',
    title: 'Bands you can defend',
    body: 'Shared descriptors, in the style of IELTS and other standardised tests.',
  })
  const override = mockupNode('mockup.callout', 'grade-override', 'A person can override', {
    iconId: 'shield',
    title: 'A person can override',
    body: 'The human marker can change the call. The work stays in the pack.',
  })
  const output = mockupNode('mockup.metric', 'grade-output', 'Output card', {
    metric: '1',
    kicker: 'Read',
    title: 'Output card',
    body: 'Who rose, and why — a reason you can check.',
  })

  const doc: FlowDocument = {
    nodes: [title, talk, editors, hub, capture, score, review, report, bands, override, output],
    edges: [
      edge('e-title-talk', 'grade-title', 'grade-talk'),
      edge('e-title-editors', 'grade-title', 'grade-editors'),
      edge('e-talk-hub', 'grade-talk', 'grade-hub', 'into'),
      edge('e-editors-hub', 'grade-editors', 'grade-hub', 'into'),
      edge('e-hub-capture', 'grade-hub', 'grade-capture', 'starts'),
      edge('e-capture-score', 'grade-capture', 'grade-score'),
      edge('e-score-review', 'grade-score', 'grade-review'),
      edge('e-review-report', 'grade-review', 'grade-report'),
      edge('e-score-bands', 'grade-score', 'grade-bands', 'uses'),
      edge('e-review-override', 'grade-review', 'grade-override', 'can'),
      edge('e-report-output', 'grade-report', 'grade-output'),
    ],
    groups: [],
    meta: {
      schemaVersion: FLOW_SCHEMA_VERSION,
      workflowId: 'mockup',
      prototype: 'mockup-verified-grading',
      notes: 'Deck viewer map — organised TB. Realign / Organise runs dagre again.',
    },
  }

  return applyDagreLayout(doc, 'TB')
}
