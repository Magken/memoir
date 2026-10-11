import { DEFAULT_PAGE_SETUP } from '../../docEditor/pageSetup'
import { DOC_FIXTURE_MERMAID_SOURCE } from '../../docEditor/docDiagramFixtures'
import { FLOW_WORKFLOW_MATH } from '../../flowEditor/workflowBundles/mathSolver'
import { FLOW_WORKFLOW_QUESTIONNAIRE } from '../../flowEditor/workflowBundles/questionnaire'
import { compileFlowMcpContext } from '../../flowEditor/compileFlowMcpContext'
import {
  DOC_LEXICAL_COMPLEX,
  DOC_PAGE_SETUP_COMPLEX,
  DRAW_SCENE_COMPLEX,
  DRAW_SCENE_ORG_COMPLEX,
  GRID_CSV_COMPLEX,
  GRID_SHEET_COMPLEX,
  MARKDOWN_COMPLEX,
  MARKDOWN_LATEX_COMPLEX,
  MERMAID_COMPLEX,
} from './complex'
import { SEED_FORCE_GRAPH, SEED_FORCE_GRAPH_COMPLEX } from '../../forceGraph/seedContent'
import type { BotEditorPayload, DmEditorPayload } from '../../chat/types'
import type { CalendarEditorPayload } from '../../calendar/types'
import { createCalendarSeed } from '../../calendar/seedCalendar'
import {
  createSampleTestFormPayload,
  createTakeSamplePayload,
} from '../../testForm/seedContent'

/** Minimal empty Lexical document for fixtures and fallbacks. */
export const EMPTY_LEXICAL_STATE = {
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: 0,
        textStyle: '',
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

export const DOC_LEXICAL_FIXTURE = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Editor context demo',
            type: 'text',
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'heading',
        version: 1,
        tag: 'h1',
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Imported via the shared editor-context envelope.',
            type: 'text',
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: 0,
        textStyle: '',
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

export const DOC_PAGE_SETUP_FIXTURE = DEFAULT_PAGE_SETUP

export const GRID_SHEET_FIXTURE = {
  columns: [
    { id: 'name', title: 'Name', width: 140 },
    { id: 'role', title: 'Role', width: 120 },
    { id: 'status', title: 'Status', width: 100 },
  ],
  rows: [
    ['Alex', 'Engineer', 'Active'],
    ['Sam', 'Designer', 'Active'],
    ['Jordan', 'PM', 'Away'],
  ],
}

export const GRID_CSV_FIXTURE = `Name,Role,Status
Alex,Engineer,Active
Sam,Designer,Active
Jordan,PM,Away`

export const DRAW_SCENE_FIXTURE = {
  type: 'excalidraw',
  version: 2,
  source: 'vurify/editor-context',
  elements: [
    {
      id: 'rect-demo',
      type: 'rectangle',
      x: 120,
      y: 80,
      width: 160,
      height: 80,
      angle: 0,
      strokeColor: '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'hachure',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: { type: 3 },
      seed: 1,
      version: 1,
      versionNonce: 1,
      isDeleted: false,
      boundElements: null,
      updated: 1,
      link: null,
      locked: false,
    },
    {
      id: 'text-demo',
      type: 'text',
      x: 140,
      y: 105,
      width: 120,
      height: 25,
      angle: 0,
      strokeColor: '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'hachure',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: 2,
      version: 1,
      versionNonce: 2,
      isDeleted: false,
      boundElements: null,
      updated: 1,
      link: null,
      locked: false,
      text: 'Draw fixture',
      fontSize: 20,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      containerId: null,
      originalText: 'Draw fixture',
      lineHeight: 1.25,
    },
  ],
  appState: {
    viewBackgroundColor: '#ffffff',
    gridSize: null,
  },
  files: {},
}

export const MARKDOWN_FIXTURE = `# Editor context demo

A short **markdown** sample for cross-format import tests.

| Name | Role |
| --- | --- |
| Alex | Engineer |
| Sam | Designer |
`

export const MERMAID_FIXTURE = `flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Draw path]
  B -->|No| D[Doc path]
  C --> E[End]
  D --> E
`

export const BOT_SEED_FIXTURE: BotEditorPayload = {
  title: 'Bot chat sample',
  model: 'atlas-demo',
  activeConversationId: 'bot_conv_sample',
  conversations: [
    {
      id: 'bot_conv_sample',
      surface: 'bot',
      kind: 'bot',
      title: 'Sample bot thread',
      model: 'atlas-demo',
      participantIds: ['user_self', 'bot_atlas'],
      messages: [
        {
          id: 'bot_msg_1',
          conversationId: 'bot_conv_sample',
          role: 'user',
          senderId: 'user_self',
          parts: [{ type: 'text', text: 'Summarize the quarterly report.' }],
          createdAt: '2026-01-01T00:00:00.000Z',
          delivery: 'sent',
        },
        {
          id: 'bot_msg_2',
          conversationId: 'bot_conv_sample',
          role: 'assistant',
          senderId: 'bot_atlas',
          parts: [{ type: 'markdown', markdown: 'Here is a **summary** of the quarterly report.' }],
          createdAt: '2026-01-01T00:00:05.000Z',
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:05.000Z',
    },
  ],
  participants: [
    { id: 'user_self', displayName: 'You', role: 'self' },
    { id: 'bot_atlas', displayName: 'Atlas', role: 'bot' },
  ],
}

export const DM_SEED_FIXTURE: DmEditorPayload = {
  title: 'DM chat sample',
  activeConversationId: 'dm_conv_sample',
  conversations: [
    {
      id: 'dm_conv_sample',
      surface: 'dm',
      kind: 'dm',
      title: 'Sam Rivera',
      participantIds: ['user_self', 'user_sam'],
      messages: [
        {
          id: 'dm_msg_1',
          conversationId: 'dm_conv_sample',
          role: 'member',
          senderId: 'user_sam',
          parts: [{ type: 'text', text: 'Are we still on for the sync?' }],
          createdAt: '2026-01-01T00:00:00.000Z',
          delivery: 'read',
        },
        {
          id: 'dm_msg_2',
          conversationId: 'dm_conv_sample',
          role: 'member',
          senderId: 'user_self',
          parts: [{ type: 'text', text: 'Yes, see you at 3pm.' }],
          createdAt: '2026-01-01T00:00:10.000Z',
          delivery: 'delivered',
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:10.000Z',
    },
  ],
  participants: [
    { id: 'user_self', displayName: 'You', role: 'self' },
    { id: 'user_sam', displayName: 'Sam Rivera', presence: 'online' },
  ],
}

export const CALENDAR_SEED_FIXTURE: CalendarEditorPayload = (() => {
  const seed = createCalendarSeed()
  return {
    title: seed.title,
    timeZone: seed.timeZone,
    calendars: seed.calendars,
    tags: seed.tags,
    events: seed.events,
    exceptions: seed.exceptions,
    tasks: seed.tasks,
    taskLists: seed.taskLists,
    view: seed.view,
    activeCalendarIds: seed.calendars.filter((c) => c.visible).map((c) => c.id),
  }
})()

export const FIXTURES: Record<string, unknown> = {
  'doc.lexical': DOC_LEXICAL_FIXTURE,
  'doc.pageSetup': DOC_PAGE_SETUP_FIXTURE,
  'grid.sheet': GRID_SHEET_FIXTURE,
  'grid.csv': GRID_CSV_FIXTURE,
  'draw.excalidraw': DRAW_SCENE_FIXTURE,
  'markdown.sample': MARKDOWN_FIXTURE,
  'mermaid.sample': MERMAID_FIXTURE,
  'cross.org-chart.mermaid': MERMAID_FIXTURE,
  'cross.org-chart.markdown': `# Org chart (markdown)

\`\`\`mermaid
${MERMAID_FIXTURE.trim()}
\`\`\`
`,
  'cross.org-chart.draw': DRAW_SCENE_FIXTURE,
  'doc.lexical.complex': DOC_LEXICAL_COMPLEX,
  'doc.pageSetup.complex': DOC_PAGE_SETUP_COMPLEX,
  'grid.sheet.complex': GRID_SHEET_COMPLEX,
  'grid.csv.complex': GRID_CSV_COMPLEX,
  'draw.excalidraw.complex': DRAW_SCENE_COMPLEX,
  'cross.org-chart.draw.complex': DRAW_SCENE_ORG_COMPLEX,
  'markdown.sample.complex': MARKDOWN_COMPLEX,
  'markdown.latex.complex': MARKDOWN_LATEX_COMPLEX,
  'mermaid.sample.complex': MERMAID_COMPLEX,
  'doc.mermaid.fixture': DOC_FIXTURE_MERMAID_SOURCE,
  'cross.org-chart.markdown.complex': `# Org chart (complex)

\`\`\`mermaid
${MERMAID_COMPLEX.trim()}
\`\`\`

${MARKDOWN_COMPLEX.split('## Checklist')[0].trim()}
`,
  'code.workspace.sample': {
    title: 'Bot starter',
    files: [
      {
        path: 'src/index.ts',
        language: 'typescript',
        content: 'export function main() {\n  console.log("Hello from bot starter")\n}\n',
      },
      {
        path: 'package.json',
        language: 'json',
        content: '{\n  "name": "bot-starter",\n  "private": true,\n  "type": "module"\n}\n',
      },
    ],
    folders: ['src'],
    openIds: [],
    activeId: null,
  },
  'flow.math-solver.sample': {
    title: 'Math solver pipeline',
    flow: FLOW_WORKFLOW_MATH,
    mcpContext: compileFlowMcpContext(FLOW_WORKFLOW_MATH),
  },
  'flow.questionnaire.sample': {
    title: 'Questionnaire flow',
    flow: FLOW_WORKFLOW_QUESTIONNAIRE,
    mcpContext: compileFlowMcpContext(FLOW_WORKFLOW_QUESTIONNAIRE),
  },
  'force.sample': SEED_FORCE_GRAPH.trim(),
  'force.sample.complex': SEED_FORCE_GRAPH_COMPLEX.trim(),
  'bot.seed.sample': BOT_SEED_FIXTURE,
  'dm.seed.sample': DM_SEED_FIXTURE,
  'calendar.seed.sample': CALENDAR_SEED_FIXTURE,
  'testform.sample': createSampleTestFormPayload(),
  'testform.take': createTakeSamplePayload(),
}

export function loadFixture<T = unknown>(fixtureId: string): T {
  if (fixtureId === 'doc.lexical.full') {
    throw new Error(
      'doc.lexical.full is built at runtime — import DOC_FULL_PAYLOAD from lib/docEditor/buildDocLexicalFullFixture',
    )
  }
  if (fixtureId === 'doc.markdown.full') {
    throw new Error(
      'doc.markdown.full is built at runtime — import DOC_MARKDOWN_FULL_PAYLOAD from lib/docEditor/buildDocMarkdownFullFixture',
    )
  }
  const fixture = FIXTURES[fixtureId]
  if (fixture === undefined) {
    throw new Error(`Unknown editor context fixture: ${fixtureId}`)
  }
  return structuredClone(fixture) as T
}
