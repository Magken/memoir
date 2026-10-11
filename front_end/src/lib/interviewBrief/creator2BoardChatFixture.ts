/**
 * Creator-2 board bot speech format (fixture).
 *
 * Interpretation rules (prompt authors + FE):
 * 1. Speak in markdown for coaching (chat density; board peel shows full markdown — no fog).
 * 2. Optional thinking part with summary / durationMs (collapsed by default; live demo streams then collapses).
 * 3. Optional `status` parts — Thinking / Editing loader tags with dash-march underline.
 * 4. Optional `planning` parts — Cursor-style clarifications (single / multi / text). Live asks rise
 *    above the composer (Questions sheet); answered summaries stay in-thread and can reopen to edit.
 * 5. Soft message.tags optional (board peel chrome hides them).
 * 6. Soft jumps = card `presentation: 'links'` (type-link + arrow) — scroll / exit only.
 * 7. Primary CTAs = card `presentation: 'vurify-menu'` (VurifyMenuButton) — open / save.
 * 8. One Actions footer: `divider` labeled Actions + untitled link/menu cards (no per-card subtext).
 * 9. User click → FE dispatchEditorAction(creator2.action.*) only.
 * 10. Backend interview.board.* catalogue is reserved; bot must not propose those tools yet.
 */

import type {
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  ChatPlanQuestion,
  MessagePart,
} from '../chat/types'

export const CREATOR2_BOARD_BOT_ID = 'bot.creator2.board'
export const CREATOR2_BOARD_USER_ID = 'user.self'
export const CREATOR2_BOARD_CONV_ID = 'conv.creator2.board.fixture'

const DAY_MS = 24 * 60 * 60 * 1000

/** Recommendation intents spoken by the board bot → FE spine action ids. */
export const CREATOR2_BOARD_INTENT_TO_ACTION = {
  scroll_to_section: 'creator2.action.scroll-to-section',
  open_section: 'creator2.action.open-section',
  focus_section: 'creator2.action.focus-section',
  exit_edit: 'creator2.action.exit-edit',
  save: 'creator2.action.save',
  submit_clarifications: 'creator2.action.submit-clarifications',
} as const

export type Creator2BoardIntent = keyof typeof CREATOR2_BOARD_INTENT_TO_ACTION

export type Creator2BoardRecommendation = {
  kind: 'recommendation'
  intent: Creator2BoardIntent
  label: string
  sectionId?: string
  hint?: string
}

export const CREATOR2_BOARD_PARTICIPANTS: ChatParticipant[] = [
  {
    id: CREATOR2_BOARD_BOT_ID,
    displayName: 'Vurex',
    role: 'bot',
    presence: 'online',
  },
  {
    id: CREATOR2_BOARD_USER_ID,
    displayName: 'You',
    role: 'self',
    presence: 'online',
  },
]

function actionFrom(rec: Creator2BoardRecommendation) {
  return {
    id: `rec.${rec.intent}.${rec.sectionId ?? 'none'}`,
    label: rec.label,
    actionId: CREATOR2_BOARD_INTENT_TO_ACTION[rec.intent],
    value: rec.sectionId,
  }
}

function boardDivider(
  label?: string,
  tone: 'default' | 'strong' | 'accent' = 'default',
): MessagePart {
  return label ? { type: 'divider', label, tone } : { type: 'divider', tone }
}

function recLinks(
  title: string,
  recs: Creator2BoardRecommendation[],
  body?: string,
): ChatMessage['parts'][number] {
  return {
    type: 'card',
    title,
    body,
    presentation: 'links',
    actions: recs.map(actionFrom),
  }
}

function recMenus(
  title: string,
  recs: Creator2BoardRecommendation[],
  body?: string,
): ChatMessage['parts'][number] {
  return {
    type: 'card',
    title,
    body,
    presentation: 'vurify-menu',
    actions: recs.map(actionFrom),
  }
}

function atOffset(base: Date, daysAgo: number, hour: number, minute: number): string {
  const d = new Date(base.getTime() - daysAgo * DAY_MS)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

/**
 * Full chat-density markdown + action chrome sample.
 * Title / section / keyword · table · lists · quote · code · then link jumps + Verify menus.
 */
export const CREATOR2_BOARD_MARKDOWN_SHOWCASE = [
  '# Interview coach',
  '',
  'A **full fixture** so you can judge Vurify chat density — headings, tables, lists, links, and menu actions together.',
  '',
  '## Working plan',
  '',
  'Work top-down. Soft jumps are **linked text**; primary moves use **Verify menu** buttons.',
  '',
  '### Priority sections',
  '',
  '| Section | Role | Next move |',
  '| --- | --- | --- |',
  '| Eligibility | Gate | Scroll, then open |',
  '| Conflict Talk | Signal | Scroll when ready |',
  '| Templates | Reuse | Open only if editing |',
  '| Decision package | Rollup | Save after weights |',
  '',
  '### Checklist',
  '',
  '1. Confirm eligibility fields',
  '2. Skim conflict Talk prompts',
  '3. Save when the interview looks right',
  '',
  '- Prefer `scroll` before `open`',
  '- Keep recommendations **clickable**',
  '- Do not expect catalogue tools from me yet',
  '',
  '### Coach note',
  '',
  '> Date separators mark older history. Clocks sit in each bubble header — scroll up to compare recent vs older threads.',
  '',
  '---',
  '',
  '## Inline samples',
  '',
  'Use *italics*, **bold**, and `inline code` freely. Short paragraphs beat walls of text in this peel.',
  '',
  '```ts',
  "dispatchEditorAction(runtime, { kind: 'creator2', actionId: 'creator2.action.save' })",
  '```',
].join('\n')

/** Live + seed planning clarifications (Cursor-style Questions sheet). */
export const CREATOR2_BOARD_PLAN_QUESTIONS: ChatPlanQuestion[] = [
  {
    id: 'depth',
    prompt: 'How deep should coaching go?',
    kind: 'single',
    options: [
      { id: 'soft', label: 'Soft nudges' },
      { id: 'guided', label: 'Guided steps' },
      { id: 'strict', label: 'Strict checklist' },
      { id: 'silent', label: 'Only when asked' },
    ],
  },
  {
    id: 'focus',
    prompt: 'Which sections should I prioritize?',
    kind: 'multi',
    options: [
      { id: 'eligible', label: 'Eligibility' },
      { id: 'conflict', label: 'Conflict talk' },
      { id: 'coding', label: 'Coding' },
      { id: 'writing', label: 'Writing' },
      { id: 'templates', label: 'Templates' },
    ],
  },
  {
    id: 'pace',
    prompt: 'Preferred coaching pace?',
    kind: 'single',
    options: [
      { id: 'one', label: 'One section at a time' },
      { id: 'batch', label: 'Batch related jumps' },
      { id: 'overview', label: 'Board overview first' },
      { id: 'you_pick', label: 'You decide' },
    ],
    allowText: true,
    placeholder: 'Any pace detail…',
  },
  {
    id: 'commit',
    prompt: 'When should I push Save?',
    kind: 'single',
    options: [
      { id: 'never', label: 'Never — I click Save' },
      { id: 'remind', label: 'Remind after edits' },
      { id: 'after_block', label: 'After each block' },
    ],
  },
  {
    id: 'surface',
    prompt: 'What should recommendations look like?',
    kind: 'multi',
    options: [
      { id: 'links', label: 'Soft scroll links' },
      { id: 'menus', label: 'Verify menus' },
      { id: 'markdown', label: 'Short markdown only' },
      { id: 'both', label: 'Links + menus' },
    ],
    allowText: true,
    placeholder: 'Other preference…',
  },
  {
    id: 'note',
    prompt: 'Anything else I should know?',
    kind: 'text',
    placeholder: 'Optional note for this turn',
  },
]

/** Seed thread demonstrating the board speech language + date separators. */
export function createCreator2BoardFixtureConversation(now = new Date()): ChatConversation {
  const pastA = atOffset(now, 23, 10, 14)
  const pastB = atOffset(now, 23, 10, 16)
  const pastC = atOffset(now, 23, 10, 18)
  const todayA = atOffset(now, 0, Math.max(9, now.getHours() - 2), 12)
  const todayB = atOffset(now, 0, Math.max(9, now.getHours() - 1), 40)
  const todayC = now.toISOString()

  const messages: ChatMessage[] = [
    {
      id: 'msg.board.history.user',
      conversationId: CREATOR2_BOARD_CONV_ID,
      role: 'user',
      senderId: CREATOR2_BOARD_USER_ID,
      createdAt: pastA,
      parts: [{ type: 'text', text: 'Where should I start on this interview?' }],
    },
    {
      id: 'msg.board.history.bot',
      conversationId: CREATOR2_BOARD_CONV_ID,
      role: 'assistant',
      senderId: CREATOR2_BOARD_BOT_ID,
      createdAt: pastB,
      parts: [
        {
          type: 'markdown',
          markdown:
            'Start with **Eligibility** — it gates the rest of the flow. I can recommend a scroll when you reopen this interview.',
        },
      ],
    },
    {
      id: 'msg.board.history.user2',
      conversationId: CREATOR2_BOARD_CONV_ID,
      role: 'user',
      senderId: CREATOR2_BOARD_USER_ID,
      createdAt: pastC,
      parts: [{ type: 'text', text: 'Got it — picking this up later.' }],
    },
    {
      id: 'msg.board.showcase',
      conversationId: CREATOR2_BOARD_CONV_ID,
      role: 'assistant',
      senderId: CREATOR2_BOARD_BOT_ID,
      createdAt: todayA,
      parts: [
        {
          type: 'thinking',
          summary: 'Thought for 3s',
          durationMs: 3200,
          collapsed: true,
          text: 'Lead with Eligibility.\nUse links for soft jumps; Verify menus for open + save.\nKeep recommendations soft — never run save without a click.',
        },
        {
          type: 'planning',
          title: 'Questions',
          answered: true,
          collapsed: true,
          summary: 'Answered 6 clarifications',
          questions: CREATOR2_BOARD_PLAN_QUESTIONS,
          answers: {
            depth: 'soft',
            focus: ['eligible', 'conflict'],
            pace: 'one',
            pace__text: 'Keep jumps short.',
            commit: 'never',
            surface: ['links', 'menus'],
            note: 'Prefer soft jumps first.',
          },
        },
        {
          type: 'markdown',
          markdown: CREATOR2_BOARD_MARKDOWN_SHOWCASE,
        },
        boardDivider('Actions'),
        recLinks('', [
          {
            kind: 'recommendation',
            intent: 'scroll_to_section',
            label: 'Scroll to Eligibility',
            sectionId: 'ph.eligible',
          },
          {
            kind: 'recommendation',
            intent: 'scroll_to_section',
            label: 'Scroll to Conflict Talk',
            sectionId: 'ph.conflict',
          },
          {
            kind: 'recommendation',
            intent: 'exit_edit',
            label: 'Back to interview',
          },
        ]),
        recMenus('', [
          {
            kind: 'recommendation',
            intent: 'open_section',
            label: 'Open Eligibility',
            sectionId: 'ph.eligible',
          },
          {
            kind: 'recommendation',
            intent: 'save',
            label: 'Save interview',
          },
        ]),
      ],
    },
    {
      id: 'msg.board.followup',
      conversationId: CREATOR2_BOARD_CONV_ID,
      role: 'assistant',
      senderId: CREATOR2_BOARD_BOT_ID,
      createdAt: todayB,
      parts: [
        {
          type: 'markdown',
          markdown: [
            '## Ready when you are',
            '',
            'Same patterns again in a shorter bubble — links for jumps, menus for commit.',
          ].join('\n'),
        },
        boardDivider('Actions'),
        recLinks('', [
          {
            kind: 'recommendation',
            intent: 'scroll_to_section',
            label: 'Scroll to Eligibility',
            sectionId: 'ph.eligible',
          },
          {
            kind: 'recommendation',
            intent: 'scroll_to_section',
            label: 'Scroll to Conflict Talk',
            sectionId: 'ph.conflict',
          },
        ]),
        recMenus('', [
          {
            kind: 'recommendation',
            intent: 'save',
            label: 'Save interview',
          },
        ]),
      ],
    },
    {
      id: 'msg.board.user.ack',
      conversationId: CREATOR2_BOARD_CONV_ID,
      role: 'user',
      senderId: CREATOR2_BOARD_USER_ID,
      createdAt: todayC,
      parts: [{ type: 'text', text: 'Looks good — I’ll start with Eligibility.' }],
    },
  ]

  return {
    id: CREATOR2_BOARD_CONV_ID,
    surface: 'bot',
    kind: 'bot',
    title: 'Vurex',
    model: 'fixture',
    participantIds: [CREATOR2_BOARD_BOT_ID, CREATOR2_BOARD_USER_ID],
    messages,
    createdAt: pastA,
    updatedAt: todayC,
  }
}

/** Streamed into the muted thinking portal during a live peel reply demo. */
export const CREATOR2_BOARD_THINK_SCRIPT = [
  'Reading the interview…',
  'Eligibility still gates the flow.',
  'Prefer soft jumps before opening a section.',
  'Verify menus for open / save — I only recommend.',
].join('\n')

export function createCreator2BoardPlanningPart(): MessagePart {
  return {
    type: 'planning',
    title: 'Questions',
    questions: CREATOR2_BOARD_PLAN_QUESTIONS,
  }
}

/** Final assistant parts after thinking + editing loaders finish. */
export function createCreator2BoardLiveReplyParts(): MessagePart[] {
  return [
    {
      type: 'markdown',
      markdown: [
        '## Ready when you are',
        '',
        'I finished a short pass over the interview. Soft jumps scroll; Verify menus open or save.',
        '',
        '### Next',
        '',
        '1. Scroll to Eligibility',
        '2. Open only when you want to edit',
        '3. Save when it looks right',
      ].join('\n'),
    },
    boardDivider('Actions'),
    recLinks('', [
      {
        kind: 'recommendation',
        intent: 'scroll_to_section',
        label: 'Scroll to Eligibility',
        sectionId: 'ph.eligible',
      },
      {
        kind: 'recommendation',
        intent: 'exit_edit',
        label: 'Back to interview',
      },
    ]),
    recMenus('', [
      {
        kind: 'recommendation',
        intent: 'open_section',
        label: 'Open Eligibility',
        sectionId: 'ph.eligible',
      },
      {
        kind: 'recommendation',
        intent: 'save',
        label: 'Save interview',
      },
    ]),
  ]
}
