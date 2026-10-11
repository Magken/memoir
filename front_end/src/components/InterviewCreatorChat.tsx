import { AlertTriangle, ChevronDown, FileText, NotebookText } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MutableRefObject } from 'react'
import { BotChatThread } from './botChatParts/BotChatThread'
import { Checkbox } from './Checkbox'
import { Chip } from './Chip'
import { InterviewBoardComposer } from './InterviewBoardComposer'
import { RadioGroup } from './RadioGroup'
import { ThemeScroll } from './ThemeScroll'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifyInput } from './VurifyInput'
import { useAnimatedFoldMount } from '../hooks/useAnimatedFoldMount'
import * as assessmentApi from '../lib/assessmentApi'
import { getCurrentUser } from '../lib/authApi'
import * as chatApi from '../lib/chatApi'
import type { ChatMessageRow } from '../lib/chatApi'
import { toUserMessage } from '../lib/dataApi'
import { extractPdfText } from '../lib/cvApi'
import { appendBoardOverviewContext } from '../lib/interviewBrief/creatorOverviewTags'
import { peelCheckWarningsFromContext, peelCheckWarningsFromDoc } from '../lib/interviewBrief/peelCheckWarnings'
import { seedHousingChromeTitles } from '../lib/interviewBrief/housingChrome'
import { dispatchEditorAction } from '../lib/editorContext/actionRegistry'
import type { EditorRuntimeHandle } from '../lib/editorContext/types'
import { createStickController } from '../lib/chat/scroll'
import {
  runBoardEditContinue,
  runBoardEditPlan,
  type InterviewEditMessagePart,
  type InterviewEditPhase,
  type InterviewEditQuestion,
  type InterviewEditResult,
  type InterviewEditStreamHandlers,
} from '../lib/interviewEditApi'
import {
  followMessageIdMap,
  messageMatchesMappedId,
  ownedBotRunPersistDecision,
  resolveQuestionnaireBubbleId,
  sealPlanningParts,
} from '../lib/interviewEditApi/questionnaireBubble'
import {
  CREATOR2_BOARD_BOT_ID,
  CREATOR2_BOARD_INTENT_TO_ACTION,
  CREATOR2_BOARD_PARTICIPANTS,
  CREATOR2_BOARD_USER_ID,
} from '../lib/interviewBrief/creator2BoardChatFixture'
import { logBoardTurnDebug } from '../lib/interviewBrief/vurexBoardTurnDiag'
import { scrubChatDashMarkers } from '../lib/interviewRunApi/stripToFinalAsk'
import type {
  ChatConversation,
  ChatMessage,
  ChatMessageRole,
  ChatPlanQuestion,
  ComposerSendPayload,
  MessagePart,
} from '../lib/chat/types'
import { findLivePlanningRef, planningIsClosed } from '../lib/chat/utils'

type InterviewCreatorChatProps = {
  className?: string
  /** Creator-2 runtime from InterviewCreator while builder is active. */
  runtimeRef?: MutableRefObject<EditorRuntimeHandle | null>
  /** Server brief — required to open/continue a board edit turn. */
  briefId?: string | null
  /** Org account owning the brief — required by the Edge ACL check. */
  accountId?: string | null
  /** `interview_creator_board` bot conversation — set once the parent opens it. */
  conversationId?: string | null
  /** Bumps when boardBotOpen succeeds so history reloads from the database. */
  historyEpoch?: number
  /** Fired once a turn persists a new Creator-2 body — parent applies it into the editor. */
  onBodyUpdated?: (body: Record<string, unknown>) => void
  /** Overview peel chips (notes / PDF) inside the composer — omit when both empty. */
  overviewPeelTags?: readonly { kind: 'notes' | 'pdf'; label: string }[]
  /** Completeness Check Suite — hide when empty. Does not lock the composer. */
  checkWarnings?: readonly {
    id: string
    short: string
    sectionId: string
    historyFocus?: string
  }[]
  /**
   * Log user question + bot reply (and light meta) to the browser console for copy/paste.
   * Defaults on in Vite DEV; set false to silence, or true to force in production builds.
   */
  debug?: boolean
}

type ActivePlan = {
  botId: string
  title: string
  questions: ChatPlanQuestion[]
  editRunId: string
  timeoutMs: number
  deadlineAt: string
  /** Collapsed thinking part from this turn — carried into the answered summary prefix. */
  thinkingPart: MessagePart
}
const PLAN_OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
/** Match `theme-chat-plan-sheet-rise` / `sink` durations. */
const PLAN_SHEET_MS = 420
/** Fallback questionnaire window when the Edge omits `timeoutMs`. */
const DEFAULT_PLAN_TIMEOUT_MS = 90_000
const HISTORY_PAGE_SIZE = 12
/** Auto-fill older pages after open when the thread still does not overflow (max). */
const HISTORY_AUTOFILL_MAX = 2
/** Max scroll/open action cards per reply (receipt-first). */
const MAX_SECTION_ACTIONS = 8
const SECTION_TITLE_ELLIPSIS = 36

const PLAN_CUSTOM_ID = '__custom'

const EDIT_PHASE_STATUS: Record<InterviewEditPhase, { label: string; tone: 'thinking' | 'editing' } | null> = {
  resolve: { label: 'Thinking', tone: 'thinking' },
  planning: { label: 'Planning', tone: 'thinking' },
  await_questionnaire: null,
  continue_planning: { label: 'Refining plan', tone: 'thinking' },
  editing: { label: 'Editing', tone: 'editing' },
  checking: { label: 'Checking', tone: 'editing' },
  finalising: { label: 'Finalising', tone: 'editing' },
  done: null,
  cancelled: null,
}

function planTextKey(questionId: string) {
  return `${questionId}__text`
}

function planLetter(index: number) {
  return PLAN_OPTION_LETTERS[index] ?? String(index + 1)
}

function letteredOptionLabel(index: number, label: string) {
  const letter = planLetter(index)
  return label ? `${letter}. ${label}` : `${letter}.`
}

function planSummary(answers: Record<string, string | string[]>) {
  const n = Object.keys(answers).filter((k) => !k.endsWith('__text')).length
  return n === 1 ? 'Answered 1 clarification' : `Answered ${n} clarifications`
}

/** Fold chosen option interpretations into the continue debug / history label. */
function continueAnswerLabel(
  title: string,
  questions: ChatPlanQuestion[],
  answers: Record<string, string | string[]>,
): string {
  const lines: string[] = [`[continue] ${title}`]
  for (const [qid, raw] of Object.entries(answers)) {
    if (qid.endsWith('__text')) continue
    const q = questions.find((x) => x.id === qid)
    const ids = Array.isArray(raw) ? raw : [raw]
    for (const id of ids) {
      const opt = q?.options?.find((o) => o.id === id)
      const meaning =
        opt?.interpretation?.trim() ||
        (opt?.label ? `chose "${opt.label}"` : null) ||
        String(id)
      lines.push(
        `- Q "${q?.prompt ?? qid}" → id=${id}${opt?.label ? ` ("${opt.label}")` : ''}: ${meaning}`,
      )
    }
    const free = answers[`${qid}__text`]
    if (typeof free === 'string' && free.trim()) {
      lines.push(`- free text: ${free.trim()}`)
    }
  }
  return lines.join('\n')
}

function mapEditQuestions(questions: InterviewEditQuestion[]): ChatPlanQuestion[] {
  return questions.map((q) => {
    const options = q.options?.map((o) => {
      if (/^other$/i.test(o.id) || /^other$/i.test(o.label.trim())) {
        return { ...o, label: o.label.trim().toLowerCase() === 'other' ? 'Something else - I will type it' : o.label }
      }
      return o
    })
    const hasOtherish = Boolean(
      options?.some((o) => /^other$/i.test(o.id) || /something else/i.test(o.label)),
    )
    return {
      id: q.id,
      prompt: q.prompt,
      kind: q.kind,
      options,
      allowText: q.allowText || hasOtherish || undefined,
      placeholder: q.placeholder,
    }
  })
}

/** Default confirm option for Apply during an open questionnaire (clear-all / yes_*). */
function confirmAnswersFromPlan(
  questions: ChatPlanQuestion[],
): Record<string, string | string[]> | null {
  for (const q of questions) {
    if (!q.options?.length) continue
    const wipe = q.options.find((o) =>
      /yes_clear|clear_all|wipe_board|confirm_clear|confirm_wipe/i.test(o.id),
    )
    if (wipe) return { [q.id]: wipe.id }
    const proceed = q.options.find(
      (o) =>
        /^(yes_|proceed|apply|confirm|do_it|go_ahead)/i.test(o.id) &&
        !/no_|keep|cancel|abort|decline/i.test(o.id),
    )
    if (proceed) return { [q.id]: proceed.id }
  }
  return null
}

/** Edge cards: scroll | open | save | apply — group into the fixture's link/menu chrome. */
function ellipsizeLabel(raw: string, max = SECTION_TITLE_ELLIPSIS): string {
  const t = raw.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(1, max - 1)).trimEnd()}…`
}

function scrubActionLabel(raw: string): string {
  let t = raw
    .replace(/\u2014/g, ' - ')
    .replace(/\u2013/g, ' - ')
    .replace(/[ \t]+-[ \t]+/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
  // Edge Apply copy often reads "Apply - retry this edit" — keep the verb, drop the essay.
  if (/^apply(\s+this\s+change)?(\s+-\s+.+)?$/i.test(t)) t = 'Apply'
  if (/^save(\s+(brief|interview))?$/i.test(t)) t = 'Save brief'
  return ellipsizeLabel(t)
}

function isGenericSectionActionTitle(title: string): boolean {
  return /^(scroll\s+to\s+(section|action)|open(\s+section)?|view\s+section|go\s+to\s+section)(\s*[.…]*)?$/i.test(
    title.trim(),
  )
}

function humanizeSectionId(id: string): string {
  return id
    .replace(/^ph\./i, '')
    .replace(/[_.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sectionTitleByIdFromBody(
  body: Record<string, unknown> | null | undefined,
): Map<string, string> {
  const map = seedHousingChromeTitles()
  const phases = Array.isArray(body?.phases) ? (body.phases as Array<Record<string, unknown>>) : []
  const toolsRaw = body?.tools
  const tools =
    toolsRaw && typeof toolsRaw === 'object' && !Array.isArray(toolsRaw)
      ? (toolsRaw as Record<string, Record<string, unknown>>)
      : {}
  const topicsRaw = body?.topics
  const topics =
    topicsRaw && typeof topicsRaw === 'object' && !Array.isArray(topicsRaw)
      ? (topicsRaw as Record<string, Record<string, unknown>>)
      : {}

  for (const p of phases) {
    const id = String(p.id ?? '').trim()
    if (!id) continue
    let title = String(p.title ?? '').trim()
    const toolRef = String(p.toolRef ?? '').trim()
    const topicRef = String(p.topicRef ?? '').trim()
    if (!title && toolRef && tools[toolRef]) {
      title = String(tools[toolRef]?.title ?? '').trim()
    }
    if (!title && topicRef && topics[topicRef]) {
      const topic = topics[topicRef]!
      title = String(topic.label ?? topic.title ?? '').trim()
    }
    if (title) map.set(id, title)
  }
  return map
}

function receiptPreferIds(
  body: Record<string, unknown> | null | undefined,
  meta?: Record<string, unknown> | null,
): string[] {
  const out: string[] = []
  const push = (id: unknown) => {
    const s = String(id ?? '').trim()
    if (s && !out.includes(s)) out.push(s)
  }
  const detail =
    meta?.phaseTraceDetail && typeof meta.phaseTraceDetail === 'object'
      ? (meta.phaseTraceDetail as Record<string, unknown>)
      : null
  const fromMeta = meta?.targetSectionIds ?? detail?.targetSectionIds ?? meta?.changedSectionIds
  if (Array.isArray(fromMeta)) for (const id of fromMeta) push(id)
  const receipt = meta?.receipt
  if (receipt && typeof receipt === 'object') {
    const r = receipt as Record<string, unknown>
    for (const key of ['sections', 'changedSectionIds', 'targets', 'targetSectionIds'] as const) {
      const arr = r[key]
      if (!Array.isArray(arr)) continue
      for (const row of arr) {
        if (typeof row === 'string') push(row)
        else if (row && typeof row === 'object') {
          push((row as Record<string, unknown>).sectionId)
          push((row as Record<string, unknown>).targetSectionId)
          push((row as Record<string, unknown>).id)
        }
      }
    }
  }
  void body
  return out
}

function cardTargetSectionId(part: {
  targetSectionId?: string
  sectionId?: string
  targetId?: string
}): string | undefined {
  const raw =
    part.targetSectionId?.trim() ||
    part.sectionId?.trim() ||
    part.targetId?.trim() ||
    ''
  return raw || undefined
}

function mapEditReplyParts(
  parts: InterviewEditMessagePart[],
  opts?: {
    body?: Record<string, unknown> | null
    meta?: Record<string, unknown> | null
  },
): MessagePart[] {
  const titles = sectionTitleByIdFromBody(opts?.body)
  const prefer = receiptPreferIds(opts?.body, opts?.meta)
  const out: MessagePart[] = []
  const linkActions: Extract<MessagePart, { type: 'card' }>['actions'] = []
  const menuActions: Extract<MessagePart, { type: 'card' }>['actions'] = []
  let n = 0
  const sectionSeen = new Set<string>()

  const resolveSectionLabel = (intent: string, targetId: string | undefined, title: string) => {
    const fromBody = targetId ? titles.get(targetId) : ''
    const trimmed = title.trim()
    const raw =
      trimmed && !isGenericSectionActionTitle(trimmed)
        ? trimmed
        : fromBody || (targetId ? humanizeSectionId(targetId) : '')
    if (raw) return scrubActionLabel(raw)
    if (intent === 'open' || intent === 'scroll') return 'Open section'
    if (intent === 'save') return 'Save brief'
    if (intent === 'apply') return 'Apply'
    return ''
  }

  for (const part of parts) {
    if (part.type === 'markdown') {
      out.push({ type: 'markdown', markdown: scrubDisplayMarkdown(part.text) })
      continue
    }
    if (part.type !== 'card') continue
    n += 1
    const targetId = cardTargetSectionId(part as { targetSectionId?: string })
    if ((part.intent === 'scroll' || part.intent === 'open') && !targetId) {
      continue
    }
    if (part.intent === 'scroll' || part.intent === 'open') {
      if (targetId && sectionSeen.has(targetId)) continue
      if (prefer.length && targetId && !prefer.includes(targetId)) {
        // Keep if Edge sent few actions; drop extras beyond receipt when spammy.
        const sectionActionCount = sectionSeen.size
        if (sectionActionCount >= MAX_SECTION_ACTIONS) continue
        if (prefer.length >= 2 && sectionActionCount >= prefer.length) continue
      }
      if (targetId) sectionSeen.add(targetId)
      if (sectionSeen.size > MAX_SECTION_ACTIONS) continue
    }
    const label = resolveSectionLabel(part.intent, targetId, part.title)
    if (!label.trim()) continue
    // Edge scroll cards should open the section (timeline scroll alone is easy to miss).
    const actionId =
      part.intent === 'scroll' || part.intent === 'open'
        ? CREATOR2_BOARD_INTENT_TO_ACTION.open_section
        : part.actionId ??
          (part.intent === 'apply'
            ? 'creator2.chat.apply_pending'
            : CREATOR2_BOARD_INTENT_TO_ACTION.save)
    const action = {
      id: `edit.${part.intent}.${targetId ?? 'none'}.${n}`,
      label,
      actionId,
      value: targetId,
    }
    if (part.intent === 'scroll' || part.intent === 'open') linkActions?.push(action)
    else menuActions?.push(action)
  }

  // Prefer receipt order for section links when we have prefer ids.
  if (prefer.length && linkActions?.length) {
    linkActions.sort((a, b) => {
      const ia = prefer.indexOf(String(a.value ?? ''))
      const ib = prefer.indexOf(String(b.value ?? ''))
      const ra = ia < 0 ? 999 : ia
      const rb = ib < 0 ? 999 : ib
      return ra - rb
    })
  }

  // Order: primary CTAs (Apply / Save) first, then section opens — one clear hierarchy.
  if ((linkActions?.length ?? 0) > 0 || (menuActions?.length ?? 0) > 0) {
    out.push({ type: 'divider', label: 'Actions' })
    if (menuActions?.length) {
      out.push({
        type: 'card',
        title: '',
        presentation: 'vurify-menu',
        actions: menuActions,
      })
    }
    if (linkActions?.length) {
      out.push({
        type: 'card',
        title: 'Open',
        presentation: 'links',
        actions: linkActions,
      })
    }
  }
  return scrubBoardActionFooter(out)
}

/** Soft FE display polish — do not rewrite Edge compose structure. */
function scrubDisplayMarkdown(markdown: string): string {
  return scrubChatDashMarkers(markdown)
}

function scrubMarkdownParts(parts: MessagePart[]): MessagePart[] {
  return parts.map((p) =>
    p.type === 'markdown' ? { ...p, markdown: scrubDisplayMarkdown(p.markdown) } : p,
  )
}

/**
 * Re-label persisted / generic section action cards from the live board body
 * so history and mid-stream turns show real titles and open on click.
 */
function enrichBoardActionParts(
  parts: MessagePart[],
  body: Record<string, unknown> | null | undefined,
): MessagePart[] {
  const titles = sectionTitleByIdFromBody(body)
  if (!titles.size && !parts.some((p) => p.type === 'card')) return parts

  return parts.map((part) => {
    if (part.type !== 'card' || !part.actions?.length) return part
    const actions = part.actions.map((action) => {
      const targetId = String(action.value ?? '').trim()
      const isSectionNav =
        action.actionId === CREATOR2_BOARD_INTENT_TO_ACTION.scroll_to_section ||
        action.actionId === CREATOR2_BOARD_INTENT_TO_ACTION.open_section ||
        action.actionId === CREATOR2_BOARD_INTENT_TO_ACTION.focus_section
      let label = scrubActionLabel(action.label)
      if (isSectionNav || (targetId && isGenericSectionActionTitle(action.label))) {
        const fromBody = targetId ? titles.get(targetId) : ''
        if (fromBody) label = scrubActionLabel(fromBody)
        else if (isGenericSectionActionTitle(label) && targetId) {
          label = scrubActionLabel(humanizeSectionId(targetId))
        }
      }
      const actionId =
        isSectionNav || (targetId && isGenericSectionActionTitle(action.label))
          ? CREATOR2_BOARD_INTENT_TO_ACTION.open_section
          : action.actionId
      return { ...action, label, actionId }
    })
    return { ...part, actions }
  })
}

/**
 * Drop orphan "Actions" dividers and empty action cards.
 * Empty footers read as a double hairline under See less / speech.
 */
function scrubBoardActionFooter(parts: MessagePart[]): MessagePart[] {
  const next: MessagePart[] = []
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]!
    if (part.type === 'card') {
      const actions = part.actions?.filter((a) => a.label.trim() && a.actionId) ?? []
      if (actions.length === 0) continue
      next.push({ ...part, actions })
      continue
    }
    if (part.type === 'divider' && /^actions$/i.test(part.label?.trim() ?? '')) {
      let hasActions = false
      for (let j = i + 1; j < parts.length; j += 1) {
        const look = parts[j]!
        if (look.type === 'divider') break
        if (look.type === 'card') {
          const actions = look.actions?.filter((a) => a.label.trim() && a.actionId) ?? []
          if (actions.length > 0) {
            hasActions = true
            break
          }
          continue
        }
        if (look.type === 'markdown' || look.type === 'text' || look.type === 'thinking') break
      }
      if (!hasActions) continue
    }
    next.push(part)
  }
  return next
}

const RETRY_TURN_ACTION_ID = 'creator2.chat.retry_turn'

type PendingRetry =
  | { kind: 'fresh_send'; userMessage: string }
  | { kind: 'plan'; botId: string; userMessage: string }
  | {
      kind: 'continue'
      botId: string
      editRunId: string
      answers?: Record<string, string | string[]>
      skipped: boolean
      sealedPrefix: MessagePart[]
      debugLabel: string
    }

function isAbortLike(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; code?: string; message?: string }
  return (
    e.name === 'AbortError' ||
    e.code === 'ABORT_ERR' ||
    /\baborted\b/i.test(String(e.message ?? ''))
  )
}

/** Error speech + Retry CTA — keeps the last user text in-thread for one-click resend. */
function turnFailureParts(headline: string, detail: string): MessagePart[] {
  const body = detail.trim()
  return [
    {
      type: 'markdown',
      markdown: body ? `**${headline}** ${body}` : `**${headline}**`,
    },
    { type: 'divider', label: 'Actions' },
    {
      type: 'card',
      title: '',
      presentation: 'vurify-menu',
      actions: [
        {
          id: 'retry.turn',
          label: 'Retry',
          actionId: RETRY_TURN_ACTION_ID,
        },
      ],
    },
  ]
}

/** After reload, rebuild a plan retry from the last error bubble + prior user text. */
function recoverPlanRetryFromThread(messages: ChatMessage[]): PendingRetry | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]!
    if (msg.role !== 'assistant') continue
    const hasRetry = msg.parts.some(
      (p) =>
        p.type === 'card' &&
        (p.actions?.some((a) => a.actionId === RETRY_TURN_ACTION_ID) ?? false),
    )
    if (!hasRetry) continue
    for (let j = i - 1; j >= 0; j -= 1) {
      const prev = messages[j]!
      if (prev.role !== 'user') continue
      const text = prev.parts
        .filter((p): p is Extract<MessagePart, { type: 'text' }> => p.type === 'text')
        .map((p) => p.text)
        .join('\n')
        .trim()
      if (!text) continue
      return { kind: 'plan', botId: msg.id, userMessage: text }
    }
    return null
  }
  return null
}

function rowToMessage(row: ChatMessageRow): ChatMessage {
  const role: ChatMessageRole =
    row.role === 'assistant' || row.role === 'system' || row.role === 'member'
      ? (row.role as ChatMessageRole)
      : 'user'
  return {
    id: row.id,
    conversationId: row.conversationId,
    role,
    senderId: row.senderId ?? (role === 'assistant' ? CREATOR2_BOARD_BOT_ID : CREATOR2_BOARD_USER_ID),
    parts: scrubMarkdownParts(row.parts),
    createdAt: row.createdAt,
    reactions: row.reactions,
  }
}

/** Clear live loader/stream flags so bubble animations stop when generation is cancelled. */
function freezeStoppedParts(parts: MessagePart[]): MessagePart[] {
  const next: MessagePart[] = []
  for (const part of parts) {
    if (part.type === 'status' && part.loading) {
      continue
    }
    if (part.type === 'thinking' && part.streaming) {
      const text = part.text.trim()
      if (!text) continue
      next.push({
        type: 'thinking',
        text,
        collapsed: true,
        summary: 'Stopped',
      })
      continue
    }
    next.push(part)
  }
  return next
}

/** Drop live-only flags before writing assistant parts to the database. */
function partsForPersist(parts: MessagePart[]): MessagePart[] {
  const next: MessagePart[] = []
  for (const part of parts) {
    if (part.type === 'status') {
      if (part.loading) continue
      next.push({ type: 'status', label: part.label, tone: part.tone })
      continue
    }
    if (part.type === 'thinking') {
      const text = part.text.trim()
      if (!text && !part.summary) continue
      next.push({
        type: 'thinking',
        text,
        collapsed: true,
        summary: part.summary,
        durationMs: part.durationMs,
      })
      continue
    }
    next.push(part)
  }
  const scrubbed = scrubBoardActionFooter(scrubMarkdownParts(next))
  return scrubbed.length > 0 ? scrubbed : [{ type: 'markdown', markdown: '_Empty reply._' }]
}

/** Numbered spine from Creator-2 body — fills thin walkthrough replies when Edge omits the list. */
function spineMarkdownFromBody(body: Record<string, unknown> | null | undefined): string {
  const phases = Array.isArray(body?.phases) ? (body.phases as Array<Record<string, unknown>>) : []
  if (!phases.length) return ''
  const role =
    String(
      ((body?.definition as Record<string, unknown> | undefined)?.meta as Record<string, unknown> | undefined)
        ?.roleTitle ?? '',
    ).trim() || 'Sections'
  const lines = phases.map((p) => {
    const title = String(p.title ?? 'Untitled section')
    const kind = p.kind === 'discussion' ? 'discussion' : 'tool'
    const mins = p.estimatedMinutes != null ? `~${p.estimatedMinutes}m` : null
    const flags = [p.isOpening ? 'opening' : null, p.isClosing ? 'closing' : null, mins].filter(Boolean)
    const suffix = flags.length ? ` (${[kind, ...flags].join(', ')})` : ` (${kind})`
    return `**${title}**${suffix}`
  })
  return `\n\n### ${role}\n\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}`
}

function ensureSpineInMarkdown(
  markdown: string,
  body: Record<string, unknown> | null | undefined,
): string {
  // ComposeReply owns section lists. Only backfill if the model returned a walkthrough
  // intro with zero numbered lines (never for converse / advise / casual QA).
  const text = markdown.trim()
  if (!text) return text
  if (/\n\s*\d+\.\s/.test(text) || /^\d+\.\s/m.test(text)) return text
  if (
    !/walk\s*me through|laid out right now|how the interview is laid out/i.test(text)
  ) {
    return text
  }
  const spine = spineMarkdownFromBody(body)
  return spine ? `${text}${spine}` : text
}

function mapReplyPartsWithBody(
  parts: InterviewEditMessagePart[],
  replyText: string,
  body: Record<string, unknown> | null | undefined,
  meta?: Record<string, unknown> | null,
): MessagePart[] {
  const mapped = mapEditReplyParts(parts, { body, meta })
  const scrubbedReply = scrubDisplayMarkdown(replyText)
  const hasMd = mapped.some((p) => p.type === 'markdown' && p.markdown.trim())
  const base: MessagePart[] = hasMd
    ? mapped
    : scrubbedReply
      ? [
          { type: 'markdown', markdown: scrubbedReply },
          ...mapped.filter((p) => p.type !== 'markdown'),
        ]
      : mapped
  return base.map((p) =>
    p.type === 'markdown'
      ? { ...p, markdown: ensureSpineInMarkdown(scrubDisplayMarkdown(p.markdown), body) }
      : p,
  )
}

function PlanLetteredTextRow({
  letter,
  label,
  value,
  selected,
  onChange,
  onActivate,
}: {
  letter: string
  label: string
  value: string
  selected?: boolean
  onChange: (value: string) => void
  onActivate?: () => void
}) {
  return (
    <div
      className="theme-interview-creator-chat__plan-text-row"
      data-selected={selected ? 'true' : 'false'}
    >
      <span className="theme-interview-creator-chat__plan-text-letter type-label" aria-hidden>
        {letter}.
      </span>
      <VurifyInput
        variant="line"
        size="sm"
        label={label}
        value={value}
        onChange={(e) => {
          onActivate?.()
          onChange(e.target.value)
        }}
        onFocus={() => onActivate?.()}
        className="theme-interview-creator-chat__plan-text"
      />
    </div>
  )
}

export function BoardPlanningSheet({
  title,
  questions,
  timeoutMs,
  deadlineAt,
  onSubmit,
  onDismiss,
  expandSignal = 0,
}: {
  title: string
  questions: ChatPlanQuestion[]
  /** `timeoutMs <= 0` = untimed (no bar). Positive values drive `--plan-timeout-ms`. */
  timeoutMs: number
  deadlineAt: string
  onSubmit: (answers: Record<string, string | string[]>) => void
  onDismiss?: () => void
  /** Increment to force-expand when the in-bubble questionnaire tag is clicked. */
  expandSignal?: number
}) {
  const formId = useId().replace(/:/g, '')
  const [minimized, setMinimized] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitHint, setSubmitHint] = useState<string | null>(null)
  const timebarRef = useRef<HTMLDivElement>(null)
  /** `timeoutMs <= 0` = untimed Copilot ask — no bar, no auto-expire. */
  const untimed = !(timeoutMs > 0)
  const spent = !untimed && Number.isFinite(Date.parse(deadlineAt)) && Date.parse(deadlineAt) <= Date.now()

  const questionIdsKey = questions.map((q) => q.id).join('\u0001')

  useEffect(() => {
    setAnswers({})
    setMinimized(false)
    setSubmitHint(null)
  }, [questionIdsKey])

  useEffect(() => {
    if (expandSignal > 0) setMinimized(false)
  }, [expandSignal])

  const requiredAnswered = questions.every((q) => {
    const v = answers[q.id]
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'string') {
      if (v === PLAN_CUSTOM_ID) {
        const text = answers[planTextKey(q.id)]
        return typeof text === 'string' && text.trim().length > 0
      }
      return v.trim().length > 0
    }
    return false
  })

  useEffect(() => {
    const el = timebarRef.current
    if (!el || untimed) return
    const remaining = Math.max(0, Date.parse(deadlineAt) - Date.now())
    const duration = Number.isFinite(Date.parse(deadlineAt)) ? remaining : timeoutMs
    el.style.setProperty('--plan-timeout-ms', `${duration}ms`)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart once per questionnaire, not per render
  }, [deadlineAt, timeoutMs, untimed])

  const setSingle = (qid: string, value: string) => {
    setSubmitHint(null)
    setAnswers((prev) => {
      const next = { ...prev, [qid]: value }
      if (value !== PLAN_CUSTOM_ID) delete next[planTextKey(qid)]
      return next
    })
  }

  const setMulti = (qid: string, optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[qid]) ? [...(prev[qid] as string[])] : []
      const next = checked
        ? [...cur.filter((id) => id !== optionId), optionId]
        : cur.filter((id) => id !== optionId)
      return { ...prev, [qid]: next }
    })
  }

  const setCustomText = (qid: string, value: string, asSingleChoice: boolean) => {
    setAnswers((prev) => {
      const next = { ...prev, [planTextKey(qid)]: value }
      if (asSingleChoice) next[qid] = PLAN_CUSTOM_ID
      return next
    })
  }

  const setPlainText = (qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }))
  }

  return (
    <div
      className="theme-interview-creator-chat__plan-sheet"
      data-minimized={minimized ? 'true' : 'false'}
      data-spent={spent ? 'true' : 'false'}
      data-untimed={untimed ? 'true' : 'false'}
      role="region"
      aria-label={title}
    >
      <div className="theme-interview-creator-chat__plan-sheet-head">
        <div className="theme-interview-creator-chat__plan-sheet-title-row">
          <p className="type-label theme-interview-creator-chat__plan-sheet-title mb-0">
            {spent ? 'Already answered' : title}
          </p>
          <span className="type-caption type-muted theme-interview-creator-chat__plan-sheet-count">
            {questions.length}
          </span>
        </div>
        <button
          type="button"
          className="theme-interview-creator-chat__plan-sheet-toggle"
          aria-expanded={!minimized}
          aria-label={minimized ? 'Expand questions' : 'Minimize questions'}
          onClick={() => setMinimized((v) => !v)}
        >
          <ChevronDown size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>

      {untimed ? null : (
        <div
          ref={timebarRef}
          className="theme-interview-creator-chat__plan-sheet-timebar"
          data-spent={spent ? 'true' : 'false'}
          role="presentation"
          aria-hidden
        >
          <div className="theme-interview-creator-chat__plan-sheet-timebar-fill" />
        </div>
      )}

      <div
        className={[
          'theme-interview-creator-chat__plan-minimize-fold',
          minimized ? '' : 'is-open',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="theme-interview-creator-chat__plan-minimize-fold-inner">
          <ThemeScroll
            rail="nano"
            scrollClouds
            className="theme-interview-creator-chat__plan-sheet-scroll"
            tabIndex={-1}
          >
            <div className="theme-interview-creator-chat__plan-sheet-body">
              {questions.map((q, qi) => {
                const optionCount = q.options?.length ?? 0
                const textLetter = planLetter(q.kind === 'text' ? 0 : optionCount)
                const textKey = planTextKey(q.id)
                const customSelected =
                  q.kind === 'single' && answers[q.id] === PLAN_CUSTOM_ID
                const customText =
                  typeof answers[textKey] === 'string'
                    ? (answers[textKey] as string)
                    : q.kind === 'text' && typeof answers[q.id] === 'string'
                      ? (answers[q.id] as string)
                      : ''
                const showLetteredText =
                  q.kind === 'text' ||
                  Boolean(q.allowText) ||
                  Boolean(
                    q.options?.some(
                      (o) => /^other$/i.test(o.id) || /something else/i.test(o.label),
                    ),
                  )

                return (
                  <div key={q.id} className="theme-interview-creator-chat__plan-q">
                    <div className="theme-interview-creator-chat__plan-q-head">
                      <p className="theme-interview-creator-chat__plan-q-prompt mb-0">
                        <span className="type-muted theme-interview-creator-chat__plan-q-index">
                          {qi + 1}.
                        </span>{' '}
                        {q.prompt}
                      </p>
                      <div
                        className="theme-interview-flow-form__guide-rule theme-interview-creator-chat__plan-q-rule"
                        role="presentation"
                      />
                    </div>

                    {q.kind === 'single' && q.options ? (
                      <RadioGroup
                        variant="classic"
                        size="sm"
                        name={`${formId}-${q.id}`}
                        aria-label={q.prompt}
                        options={q.options.map((o, oi) => ({
                          value: o.id,
                          label: letteredOptionLabel(oi, o.label),
                        }))}
                        value={
                          typeof answers[q.id] === 'string' && answers[q.id] !== PLAN_CUSTOM_ID
                            ? (answers[q.id] as string)
                            : ''
                        }
                        onChange={(value) => setSingle(q.id, value)}
                        className="theme-interview-creator-chat__plan-choices"
                      />
                    ) : null}

                    {q.kind === 'multi' && q.options ? (
                      <div
                        className="theme-interview-creator-chat__plan-choices theme-interview-creator-chat__plan-choices--multi"
                        role="group"
                        aria-label={q.prompt}
                      >
                        {q.options.map((o, oi) => {
                          const selected = Array.isArray(answers[q.id])
                            ? (answers[q.id] as string[]).includes(o.id)
                            : false
                          return (
                            <Checkbox
                              key={o.id}
                              size="sm"
                              label={letteredOptionLabel(oi, o.label)}
                              checked={selected}
                              onChange={(checked) => setMulti(q.id, o.id, checked)}
                            />
                          )
                        })}
                      </div>
                    ) : null}

                    {showLetteredText ? (
                      <PlanLetteredTextRow
                        letter={textLetter}
                        label={q.placeholder ?? 'Your answer'}
                        value={customText}
                        selected={q.kind === 'single' ? customSelected : undefined}
                        onActivate={
                          q.kind === 'single' ? () => setSingle(q.id, PLAN_CUSTOM_ID) : undefined
                        }
                        onChange={(value) => {
                          if (q.kind === 'text') setPlainText(q.id, value)
                          else setCustomText(q.id, value, q.kind === 'single')
                        }}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </ThemeScroll>
          <div className="theme-interview-creator-chat__plan-sheet-foot">
            {onDismiss ? (
              <>
                <VurifyMenuButton
                  type="button"
                  variant="label"
                  size="sm"
                  lineTone="muted"
                  onClick={onDismiss}
                >
                  Skip
                </VurifyMenuButton>
                <span
                  className="theme-interview-creator-chat__plan-sheet-foot-rule"
                  aria-hidden
                />
              </>
            ) : null}
            <VurifyMenuButton
              type="button"
              variant="label"
              size="sm"
              lineTone="accent"
              disabled={spent || !requiredAnswered}
              onClick={() => {
                if (spent) return
                if (!requiredAnswered) {
                  setSubmitHint('Pick an option before continuing.')
                  return
                }
                setSubmitHint(null)
                onSubmit({ ...answers })
              }}
            >
              Continue
            </VurifyMenuButton>
          </div>
          {submitHint ? (
            <p className="type-caption type-muted theme-interview-creator-chat__plan-sheet-hint">
              {submitHint}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={[
          'theme-interview-creator-chat__plan-peek-fold',
          minimized ? 'is-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="theme-interview-creator-chat__plan-peek-fold-inner">
          <button
            type="button"
            className="theme-interview-creator-chat__plan-sheet-peek type-caption"
            onClick={() => setMinimized(false)}
            tabIndex={minimized ? 0 : -1}
          >
            {questions.length} questions pending — expand to answer
          </button>
        </div>
      </div>
    </div>
  )
}

function proposedEditLabel(path: string): string {
  if (path === 'essay') return 'Essay'
  return path.split('/').pop() || path
}

/**
 * Copilot pending write — same sheet dialect as Questions (title / count / fold /
 * Keep-Discard foot) with no deadline time bar. Locks the composer until Keep or Discard.
 * Multi-step: chronological rows, Keep all / Discard all when more than one edit.
 */
export type BoardProposedEditRow = {
  path: string
  id?: string
  label?: string
  locked?: boolean
  skipped?: boolean
  /** Why a skipped row cannot be kept — the Edge's own words when it has them. */
  reason?: string
}

export function BoardProposedEditSheet({
  files,
  onFocus,
  onKeep,
  onDiscard,
  onKeepAll,
  onDiscardAll,
}: {
  files: readonly BoardProposedEditRow[]
  onFocus?: (id: string) => void
  onKeep?: (id: string) => void
  onDiscard?: (id: string) => void
  onKeepAll?: () => void
  onDiscardAll?: () => void
}) {
  const rowId = (file: BoardProposedEditRow) => file.id || file.path
  const [minimized, setMinimized] = useState(false)
  const [focusedPath, setFocusedPath] = useState(files[0] ? rowId(files[0]) : '')
  const filesKey = files.map((f) => rowId(f)).join('\u0001')

  useEffect(() => {
    setMinimized(false)
    setFocusedPath(filesKey.split('\u0001')[0] ?? '')
  }, [filesKey])

  const focusedRow =
    files.find((f) => rowId(f) === focusedPath) ?? files[0]
  const focused = focusedRow ? rowId(focusedRow) : ''
  const focusedLocked = Boolean(focusedRow?.locked || focusedRow?.skipped)
  const count = files.length
  const showAll = count > 1

  return (
    <div
      className="theme-interview-creator-chat__plan-sheet"
      data-minimized={minimized ? 'true' : 'false'}
      role="region"
      aria-label="Proposed edit"
    >
      <div className="theme-interview-creator-chat__plan-sheet-head">
        <div className="theme-interview-creator-chat__plan-sheet-title-row">
          <p className="type-label theme-interview-creator-chat__plan-sheet-title mb-0">
            Proposed edit
          </p>
          <span className="type-caption type-muted theme-interview-creator-chat__plan-sheet-count">
            {count}
          </span>
        </div>
        <button
          type="button"
          className="theme-interview-creator-chat__plan-sheet-toggle"
          aria-expanded={!minimized}
          aria-label={minimized ? 'Expand proposed edit' : 'Minimize proposed edit'}
          onClick={() => setMinimized((v) => !v)}
        >
          <ChevronDown size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div
        className={[
          'theme-interview-creator-chat__plan-minimize-fold',
          minimized ? '' : 'is-open',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="theme-interview-creator-chat__plan-minimize-fold-inner">
          <ThemeScroll
            rail="nano"
            scrollClouds
            className="theme-interview-creator-chat__plan-sheet-scroll"
            tabIndex={-1}
          >
            <div className="theme-interview-creator-chat__plan-sheet-body">
              {files.map((file, qi) => {
                const id = rowId(file)
                const active = id === focused
                return (
                  <div key={id} className="theme-interview-creator-chat__plan-q">
                    <div className="theme-interview-creator-chat__plan-q-head">
                      <button
                        type="button"
                        className="theme-interview-creator-chat__plan-q-prompt mb-0"
                        data-active={active ? 'true' : 'false'}
                        onClick={() => {
                          setFocusedPath(id)
                          onFocus?.(id)
                        }}
                      >
                        <span className="type-muted theme-interview-creator-chat__plan-q-index">
                          {qi + 1}.
                        </span>{' '}
                        {file.label || proposedEditLabel(file.path)}
                        {file.locked ? (
                          <span className="type-caption type-muted"> waiting</span>
                        ) : null}
                        {file.skipped ? (
                          <span className="type-caption type-muted"> skipped</span>
                        ) : null}
                      </button>
                      <div
                        className="theme-interview-flow-form__guide-rule theme-interview-creator-chat__plan-q-rule"
                        role="presentation"
                      />
                    </div>
                    {active ? (
                      <p className="type-caption type-muted mb-0">
                        {file.locked
                          ? 'Keep the earlier edit first. This step depends on it.'
                          : file.skipped
                            ? file.reason || 'Skipped because an earlier edit was discarded.'
                            : 'Review in the editor, then Keep or Discard. Chat stays locked until you choose.'}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </ThemeScroll>
          <div className="theme-interview-creator-chat__plan-sheet-foot">
            {showAll ? (
              <>
                <VurifyMenuButton
                  type="button"
                  variant="label"
                  size="sm"
                  lineTone="muted"
                  onClick={() => onDiscardAll?.()}
                >
                  Discard all
                </VurifyMenuButton>
                <VurifyMenuButton
                  type="button"
                  variant="label"
                  size="sm"
                  lineTone="accent"
                  onClick={() => onKeepAll?.()}
                >
                  Keep all
                </VurifyMenuButton>
                <span
                  className="theme-interview-creator-chat__plan-sheet-foot-rule"
                  aria-hidden
                />
              </>
            ) : null}
            <VurifyMenuButton
              type="button"
              variant="label"
              size="sm"
              lineTone="muted"
              disabled={!focused || focusedLocked}
              onClick={() => {
                if (!focused || focusedLocked) return
                onDiscard?.(focused)
              }}
            >
              Discard
            </VurifyMenuButton>
            <span
              className="theme-interview-creator-chat__plan-sheet-foot-rule"
              aria-hidden
            />
            <VurifyMenuButton
              type="button"
              variant="label"
              size="sm"
              lineTone="accent"
              disabled={!focused || focusedLocked}
              onClick={() => {
                if (!focused || focusedLocked) return
                onKeep?.(focused)
              }}
            >
              Keep
            </VurifyMenuButton>
          </div>
        </div>
      </div>

      <div
        className={[
          'theme-interview-creator-chat__plan-peek-fold',
          minimized ? 'is-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="theme-interview-creator-chat__plan-peek-fold-inner">
          <button
            type="button"
            className="theme-interview-creator-chat__plan-sheet-peek type-caption"
            onClick={() => setMinimized(false)}
            tabIndex={minimized ? 0 : -1}
          >
            {count} {count === 1 ? 'edit' : 'edits'} pending — expand to review
          </button>
        </div>
      </div>
    </div>
  )
}

function markdownFromParts(parts: MessagePart[]): string {
  return parts
    .filter((p): p is Extract<MessagePart, { type: 'markdown' }> => p.type === 'markdown')
    .map((p) => p.markdown.trim())
    .filter(Boolean)
    .join('\n\n')
}


type CheckSuiteWarningRow = {
  id: string
  short: string
  sectionId: string
  historyFocus?: string
}

function BoardCheckSuiteSheet({
  warnings,
  joinTop,
  onSelect,
}: {
  warnings: readonly CheckSuiteWarningRow[]
  joinTop?: boolean
  onSelect: (warning: CheckSuiteWarningRow) => void
}) {
  const [minimized, setMinimized] = useState(false)
  const [focusedKey, setFocusedKey] = useState('')
  const count = warnings.length
  const warningsKey = warnings.map((w) => `${w.id}:${w.sectionId}`).join('\u0001')

  useEffect(() => {
    setFocusedKey((cur) => {
      if (!cur) return cur
      const prefix = cur.replace(/:\d+$/, '')
      return warningsKey.split('\u0001').includes(prefix) ? cur : ''
    })
  }, [warningsKey])

  return (
    <div
      className="theme-interview-creator-chat__plan-sheet"
      data-check-suite="true"
      data-minimized={minimized ? 'true' : 'false'}
      data-join-top={joinTop ? 'true' : undefined}
      role="region"
      aria-label="Check Suite"
    >
      <div className="theme-interview-creator-chat__plan-sheet-head">
        <div className="theme-interview-creator-chat__plan-sheet-title-row">
          <AlertTriangle
            className="theme-interview-creator-chat__check-icon"
            size={15}
            strokeWidth={2.25}
            aria-hidden
          />
          <p className="type-label theme-interview-creator-chat__plan-sheet-title mb-0">
            Check Suite
          </p>
          <span className="type-caption theme-interview-creator-chat__plan-sheet-count">
            {count}
          </span>
        </div>
        <button
          type="button"
          className="theme-interview-creator-chat__plan-sheet-toggle"
          aria-expanded={!minimized}
          aria-label={minimized ? 'Expand Check Suite' : 'Minimize Check Suite'}
          onClick={() => setMinimized((v) => !v)}
        >
          <ChevronDown size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div
        className={[
          'theme-interview-creator-chat__plan-minimize-fold',
          minimized ? '' : 'is-open',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="theme-interview-creator-chat__plan-minimize-fold-inner">
          <ThemeScroll
            rail="nano"
            scrollClouds
            className="theme-interview-creator-chat__plan-sheet-scroll"
            tabIndex={-1}
          >
            <div className="theme-interview-creator-chat__plan-sheet-body">
              {warnings.map((row, qi) => {
                const key = `${row.id}:${row.sectionId}:${qi}`
                const active = key === focusedKey
                return (
                  <div key={key} className="theme-interview-creator-chat__plan-q">
                    <div className="theme-interview-creator-chat__plan-q-head">
                      <button
                        type="button"
                        className="theme-interview-creator-chat__plan-q-prompt mb-0"
                        data-active={active ? 'true' : 'false'}
                        onClick={() => {
                          setFocusedKey(key)
                          onSelect(row)
                        }}
                      >
                        <span className="theme-interview-creator-chat__plan-q-index">
                          {qi + 1}.
                        </span>{' '}
                        {row.short}
                      </button>
                      <div
                        className="theme-interview-creator-chat__check-rule"
                        role="presentation"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </ThemeScroll>
        </div>
      </div>

      <div
        className={[
          'theme-interview-creator-chat__plan-peek-fold',
          minimized ? 'is-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="theme-interview-creator-chat__plan-peek-fold-inner">
          <button
            type="button"
            className="theme-interview-creator-chat__plan-sheet-peek type-caption"
            onClick={() => setMinimized(false)}
            tabIndex={minimized ? 0 : -1}
          >
            {count} {count === 1 ? 'warning' : 'warnings'} pending — expand to review
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Live Creator-2 board peel chat — streams `interview-brief-edit` (NDJSON) into
 * thinking / status / planning / markdown+card parts. Clarifications rise above the
 * composer (Cursor-style Questions sheet, with a deadline time bar + auto-skip).
 * Card clicks dispatch FE creator2.action.*. User + assistant turns persist via
 * chatApi (sendMessage + botRunBegin/Finalize) and reload from messagesList.
 */
export function InterviewCreatorChat({
  className = '',
  runtimeRef,
  briefId = null,
  accountId = null,
  conversationId = null,
  historyEpoch = 0,
  onBodyUpdated,
  overviewPeelTags = [],
  checkWarnings = [],
  debug = import.meta.env.DEV,
}: InterviewCreatorChatProps) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null)
  const conversationRef = useRef<ChatConversation | null>(null)
  conversationRef.current = conversation
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null)
  const activePlanRef = useRef<ActivePlan | null>(null)
  activePlanRef.current = activePlan
  const lastPlanRef = useRef<ActivePlan | null>(null)
  if (activePlan) lastPlanRef.current = activePlan
  const { mounted: planMounted, shown: planShown } = useAnimatedFoldMount(
    Boolean(activePlan),
    PLAN_SHEET_MS,
  )
  const [appliedCheckWarnings, setAppliedCheckWarnings] = useState<
    CheckSuiteWarningRow[] | null
  >(null)
  const checkWarningsKey = checkWarnings.map((w) => `${w.id}:${w.sectionId}`).join('\u0001')
  const appliedCheckKey = (appliedCheckWarnings ?? [])
    .map((w) => `${w.id}:${w.sectionId}`)
    .join('\u0001')
  useEffect(() => {
    if (!appliedCheckWarnings) return
    if (checkWarningsKey === appliedCheckKey) setAppliedCheckWarnings(null)
  }, [appliedCheckKey, appliedCheckWarnings, checkWarningsKey])
  const shownCheckWarnings = appliedCheckWarnings ?? checkWarnings
  const checkOpen = shownCheckWarnings.length > 0
  const { mounted: checkMounted, shown: checkShown } = useAnimatedFoldMount(
    checkOpen,
    PLAN_SHEET_MS,
  )
  const sheetPlan = activePlan ?? lastPlanRef.current
  const replyGenRef = useRef(0)
  const stopControllerRef = useRef<AbortController | null>(null)
  const runIdRef = useRef<string | null>(null)
  const questionnaireTimerRef = useRef<number | null>(null)
  /** local temp message id → server id after botRunFinalize (questionnaire persist). */
  const messageIdMapRef = useRef<Record<string, string>>({})
  /** bot-run ids Stop already failed — do not finalize them from a stale turn `.then`. */
  const cancelledBotRunIdsRef = useRef<Set<string>>(new Set())
  const continueLockRef = useRef(false)
  /** editRunId for in-flight continue (activePlan is cleared before stream). */
  const continueEditRunIdRef = useRef<string | null>(null)
  /** Blocks double Enter before `busy` flips true (botRunBegin race). */
  const sendLockRef = useRef(false)
  /** Last failed turn — Retry resends without retyping. Cleared on success / Stop. */
  const pendingRetryRef = useRef<PendingRetry | null>(null)
  const handleRetryRef = useRef<() => void>(() => undefined)
  const handlePlanningSkipRef = useRef<() => void>(() => {})
  const handleSendRef = useRef<(payload: ComposerSendPayload) => void | Promise<void>>(
    async () => {},
  )
  const selfIdRef = useRef<string | null>(null)
  const oldestSeqRef = useRef<number | null>(null)
  const [hasMoreBefore, setHasMoreBefore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadingMoreRef = useRef(false)
  const hasMoreBeforeRef = useRef(false)
  hasMoreBeforeRef.current = hasMoreBefore
  const viewportRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(createStickController(viewportRef))
  const messageCountRef = useRef(0)
  const restoringHistoryRef = useRef(false)
  /** False until the latest page is pinned to the bottom — blocks cascade older-load. */
  const historyReadyRef = useRef(false)
  /** Remaining auto-fill pages when open leaves the thread shorter than the viewport. */
  const historyAutofillLeftRef = useRef(0)
  const [historyPinToken, setHistoryPinToken] = useState(0)
  /** Live Creator-2 body for action title enrichment (history + mid-stream). */
  const boardBodyRef = useRef<Record<string, unknown> | null>(null)
  const [boardBodyEpoch, setBoardBodyEpoch] = useState(0)
  const [awayFromBottom, setAwayFromBottom] = useState(false)
  const [planExpandSignal, setPlanExpandSignal] = useState(0)
  const onBodyUpdatedRef = useRef(onBodyUpdated)
  onBodyUpdatedRef.current = onBodyUpdated
  /** Latest assistant parts by local message id — sync for persist before React re-renders. */
  const botPartsRef = useRef<Record<string, MessagePart[]>>({})

  useEffect(() => {
    void getCurrentUser().then((user) => {
      if (user) selfIdRef.current = user.id
    })
  }, [])

  useEffect(() => {
    return () => {
      replyGenRef.current += 1
      stopControllerRef.current?.abort()
    }
  }, [])

  const clearQuestionnaireTimer = useCallback(() => {
    if (questionnaireTimerRef.current != null) {
      window.clearTimeout(questionnaireTimerRef.current)
      questionnaireTimerRef.current = null
    }
  }, [])

  useEffect(() => clearQuestionnaireTimer, [clearQuestionnaireTimer])

  const armQuestionnaireTimer = useCallback(
    (deadlineAt: string) => {
      clearQuestionnaireTimer()
      const remaining = Math.max(0, Date.parse(deadlineAt) - Date.now())
      questionnaireTimerRef.current = window.setTimeout(() => {
        questionnaireTimerRef.current = null
        handlePlanningSkipRef.current()
      }, remaining)
    },
    [clearQuestionnaireTimer],
  )

  /* ── History load + lazy-load older pages ── */

  useEffect(() => {
    if (!conversationId) {
      setConversation(null)
      oldestSeqRef.current = null
      setHasMoreBefore(false)
      historyReadyRef.current = false
      messageIdMapRef.current = {}
      botPartsRef.current = {}
      runIdRef.current = null
      cancelledBotRunIdsRef.current = new Set()
      continueLockRef.current = false
      continueEditRunIdRef.current = null
      sendLockRef.current = false
      pendingRetryRef.current = null
      replyGenRef.current += 1
      return
    }
    // New conversation / history reload — drop stale local→server maps.
    messageIdMapRef.current = {}
    botPartsRef.current = {}
    cancelledBotRunIdsRef.current = new Set()
    continueLockRef.current = false
    continueEditRunIdRef.current = null
    sendLockRef.current = false
    pendingRetryRef.current = null
    historyReadyRef.current = false
    restoringHistoryRef.current = false
    stickRef.current.setRestoring(false)
    oldestSeqRef.current = null
    setHasMoreBefore(false)
    setLoadingMore(false)
    let cancelled = false
    void chatApi
      .messagesList(conversationId, { limit: HISTORY_PAGE_SIZE })
      .then(({ rows, meta }) => {
        if (cancelled) return
        oldestSeqRef.current = rows[0]?.seq ?? null
        setHasMoreBefore(Boolean((meta as { hasMoreBefore?: boolean }).hasMoreBefore))
        const now = new Date().toISOString()
        setConversation({
          id: conversationId,
          surface: 'bot',
          kind: 'bot',
          title: 'Vurex',
          participantIds: [CREATOR2_BOARD_BOT_ID, CREATOR2_BOARD_USER_ID],
          messages: rows.map(rowToMessage),
          createdAt: rows[0]?.createdAt ?? now,
          updatedAt: rows[rows.length - 1]?.createdAt ?? now,
        })
        messageCountRef.current = rows.length
        try {
          const ctx = runtimeRef?.current?.getContext?.() as { body?: unknown } | null | undefined
          const body = ctx?.body
          if (body && typeof body === 'object') {
            boardBodyRef.current = body as Record<string, unknown>
            setBoardBodyEpoch((n) => n + 1)
          }
        } catch {
          /* ignore */
        }
        setHistoryPinToken((n) => n + 1)
      })
      .catch(() => {
        if (cancelled) return
        const now = new Date().toISOString()
        setConversation({
          id: conversationId,
          surface: 'bot',
          kind: 'bot',
          title: 'Vurex',
          participantIds: [CREATOR2_BOARD_BOT_ID, CREATOR2_BOARD_USER_ID],
          messages: [],
          createdAt: now,
          updatedAt: now,
        })
        messageCountRef.current = 0
        historyReadyRef.current = true
        setHistoryPinToken((n) => n + 1)
      })
    return () => {
      cancelled = true
    }
  }, [conversationId, historyEpoch])

  useEffect(() => {
    if (!activePlan && !planMounted) {
      lastPlanRef.current = null
    }
  }, [activePlan, planMounted])

  const loadOlder = useCallback(
    (opts?: { mode?: 'scroll' | 'fill' }) => {
      const mode = opts?.mode ?? 'scroll'
      if (!historyReadyRef.current) return
      if (!conversationId || loadingMoreRef.current || !hasMoreBeforeRef.current) return
      if (oldestSeqRef.current == null) return
      const viewport = viewportRef.current
      if (!viewport) return

      loadingMoreRef.current = true
      setLoadingMore(true)
      restoringHistoryRef.current = true
      stickRef.current.setRestoring(true)
      const anchorFromBottom = viewport.scrollHeight - viewport.scrollTop
      void chatApi
        .messagesList(conversationId, {
          beforeSeq: oldestSeqRef.current,
          limit: HISTORY_PAGE_SIZE,
        })
        .then(({ rows, meta }) => {
          if (rows.length === 0) {
            setHasMoreBefore(false)
            restoringHistoryRef.current = false
            stickRef.current.setRestoring(false)
            return
          }
          oldestSeqRef.current = rows[0]?.seq ?? oldestSeqRef.current
          const more = Boolean((meta as { hasMoreBefore?: boolean }).hasMoreBefore)
          setHasMoreBefore(more)
          setConversation((prev) =>
            prev ? { ...prev, messages: [...rows.map(rowToMessage), ...prev.messages] } : prev,
          )
          requestAnimationFrame(() => {
            const el = viewportRef.current
            if (el) {
              if (mode === 'fill') {
                // Keep the latest turn in view while backfilling a short thread.
                stickRef.current.jumpToLatest('auto')
              } else {
                el.scrollTop = el.scrollHeight - anchorFromBottom
              }
            }
            messageCountRef.current =
              conversationRef.current?.messages.length ?? messageCountRef.current
            restoringHistoryRef.current = false
            stickRef.current.setRestoring(false)

            // Short thread: pull a couple more pages until it overflows or budget ends.
            if (mode === 'fill' && more && historyAutofillLeftRef.current > 0) {
              const vp = viewportRef.current
              if (vp && vp.scrollHeight <= vp.clientHeight + 8) {
                historyAutofillLeftRef.current -= 1
                window.setTimeout(() => loadOlderRef.current({ mode: 'fill' }), 0)
              } else {
                historyAutofillLeftRef.current = 0
              }
            }
          })
        })
        .catch(() => {
          setHasMoreBefore(false)
          restoringHistoryRef.current = false
          stickRef.current.setRestoring(false)
        })
        .finally(() => {
          loadingMoreRef.current = false
          setLoadingMore(false)
        })
    },
    [conversationId],
  )

  const loadOlderRef = useRef(loadOlder)
  loadOlderRef.current = loadOlder

  useEffect(() => {
    const el = topSentinelRef.current
    const root = viewportRef.current
    if (!el || !root || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!historyReadyRef.current) return
        if (!entries[0]?.isIntersecting) return
        // User scrolled to the top (or short thread left the sentinel visible after unlock).
        loadOlderRef.current({ mode: 'scroll' })
      },
      { root, threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [conversation?.id, historyPinToken])

  /** Open like a normal chat: pin to the latest turn, then unlock upward history. */
  useEffect(() => {
    if (!historyPinToken || !conversation?.id) return
    historyReadyRef.current = false
    historyAutofillLeftRef.current = HISTORY_AUTOFILL_MAX
    const pin = () => {
      stickRef.current.jumpToLatest('auto')
      setAwayFromBottom(false)
    }
    pin()
    let cancelled = false
    let ro: ResizeObserver | null = null
    let settleTimer = 0
    let raf1 = 0
    const unlock = () => {
      if (cancelled) return
      pin()
      historyReadyRef.current = true
      if (ro) {
        ro.disconnect()
        ro = null
      }
      if (settleTimer) {
        window.clearTimeout(settleTimer)
        settleTimer = 0
      }
      // If the latest page does not fill the peel, quietly backfill a bit.
      const vp = viewportRef.current
      if (
        vp &&
        hasMoreBeforeRef.current &&
        historyAutofillLeftRef.current > 0 &&
        vp.scrollHeight <= vp.clientHeight + 8
      ) {
        historyAutofillLeftRef.current -= 1
        loadOlderRef.current({ mode: 'fill' })
      }
    }
    const raf0 = requestAnimationFrame(() => {
      if (cancelled) return
      pin()
      raf1 = requestAnimationFrame(() => {
        if (cancelled) return
        pin()
        const inner = viewportRef.current?.querySelector('.theme-bot-chat__thread-inner')
        if (inner && typeof ResizeObserver !== 'undefined') {
          let ticks = 0
          ro = new ResizeObserver(() => {
            if (cancelled) return
            pin()
            ticks += 1
            if (ticks >= 4) unlock()
          })
          ro.observe(inner)
        }
        settleTimer = window.setTimeout(unlock, 280)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf0)
      if (raf1) cancelAnimationFrame(raf1)
      if (ro) ro.disconnect()
      if (settleTimer) window.clearTimeout(settleTimer)
      // If this pin pass is superseded, do not leave history permanently locked.
      if (!historyReadyRef.current) historyReadyRef.current = true
    }
  }, [conversation?.id, historyPinToken])

  useEffect(() => {
    const count = conversation?.messages.length ?? 0
    if (restoringHistoryRef.current || !historyReadyRef.current) {
      messageCountRef.current = count
      return
    }
    if (count > messageCountRef.current) {
      const delta = count - messageCountRef.current
      // Prepend grows count from the top — only stick when appending (small delta from stream/send).
      if (delta <= 3) {
        const state = stickRef.current.onIncoming(delta, 'auto')
        setAwayFromBottom(!state.stuck)
      } else {
        messageCountRef.current = count
        return
      }
    } else if (count === messageCountRef.current && busy) {
      const state = stickRef.current.onIncoming(0, 'auto')
      setAwayFromBottom(!state.stuck)
    }
    messageCountRef.current = count
  }, [conversation?.messages.length, conversation?.updatedAt, busy, activePlan])

  const patchBotParts = useCallback((messageId: string, parts: MessagePart[]) => {
    const liveId = followMessageIdMap(messageId, messageIdMapRef.current)
    botPartsRef.current[liveId] = parts
    botPartsRef.current[messageId] = parts
    const updatedAt = new Date().toISOString()
    setConversation((prev) =>
      prev
        ? {
            ...prev,
            updatedAt,
            messages: prev.messages.map((msg) =>
              messageMatchesMappedId(msg.id, messageId, messageIdMapRef.current)
                ? { ...msg, parts, createdAt: msg.createdAt }
                : msg,
            ),
          }
        : prev,
    )
    if (historyReadyRef.current && !restoringHistoryRef.current) {
      const state = stickRef.current.onIncoming(0, 'auto')
      setAwayFromBottom(!state.stuck)
    }
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onScroll = () => {
      const state = stickRef.current.onScroll()
      setAwayFromBottom(!state.stuck)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const handleJumpToLatest = useCallback(() => {
    stickRef.current.jumpToLatest('smooth')
    setAwayFromBottom(false)
  }, [])

  const participants = useMemo(() => CREATOR2_BOARD_PARTICIPANTS, [])

  const displayConversation = useMemo(() => {
    if (!conversation) return null
    const body =
      boardBodyRef.current ??
      (() => {
        try {
          const ctx = runtimeRef?.current?.getContext?.() as { body?: unknown } | null | undefined
          const b = ctx?.body
          return b && typeof b === 'object' ? (b as Record<string, unknown>) : null
        } catch {
          return null
        }
      })()
    return {
      ...conversation,
      messages: conversation.messages.map((msg) => ({
        ...msg,
        parts: enrichBoardActionParts(scrubMarkdownParts(msg.parts), body),
      })),
    }
  }, [boardBodyEpoch, conversation, runtimeRef])

  /** Write the current local assistant bubble to chat_messages via bot run finalize. */
  const persistBotMessage = useCallback(
    async (botId: string, ownedRunId?: string | null) => {
      const decision = ownedBotRunPersistDecision({
        ownedRunId: ownedRunId ?? runIdRef.current,
        currentRunId: runIdRef.current,
        cancelledRunIds: cancelledBotRunIdsRef.current,
      })
      const runId = (ownedRunId ?? runIdRef.current)?.trim() || null
      if (!conversationId || !runId || !decision.finalize) {
        if (decision.clearCurrent) runIdRef.current = null
        return
      }
      const liveId = followMessageIdMap(botId, messageIdMapRef.current)
      const local = conversationRef.current?.messages.find(
        (m) => m.id === liveId || m.id === botId,
      )
      const parts = partsForPersist(
        botPartsRef.current[liveId] ?? botPartsRef.current[botId] ?? local?.parts ?? [],
      )
      try {
        const finalized = await chatApi.botRunFinalize(runId, parts)
        if (runIdRef.current === runId) runIdRef.current = null
        const row = finalized.message
        if (!row?.id) return
        // If continue already sealed the bubble while finalize was in flight, keep the seal
        // (otherwise unanswered planning from the ask persist overwrites the live reply).
        const liveParts =
          botPartsRef.current[row.id] ??
          botPartsRef.current[liveId] ??
          botPartsRef.current[botId] ??
          null
        const liveSealed = Boolean(
          liveParts?.some((p) => p.type === 'planning' && p.answered),
        )
        const nextParts = liveSealed
          ? partsForPersist(liveParts!)
          : row.parts?.length
            ? row.parts
            : parts
        // Keep the visible row id (local temp). Remap is for API / continue only —
        // flipping id remounts ChatBubble after type-in.
        messageIdMapRef.current[botId] = row.id
        messageIdMapRef.current[liveId] = row.id
        botPartsRef.current[row.id] = nextParts
        if (botId !== row.id) botPartsRef.current[botId] = nextParts
        if (liveId !== row.id && liveId !== botId) botPartsRef.current[liveId] = nextParts
        setConversation((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            updatedAt: row.createdAt ?? prev.updatedAt,
            messages: prev.messages.map((msg) =>
              messageMatchesMappedId(msg.id, botId, messageIdMapRef.current) ||
              msg.id === liveId ||
              msg.id === row.id
                ? {
                    ...msg,
                    parts: nextParts,
                    createdAt: msg.createdAt,
                    streaming: false,
                  }
                : msg,
            ),
          }
        })
      } catch {
        if (runIdRef.current === runId) runIdRef.current = null
        cancelledBotRunIdsRef.current.add(runId)
        void chatApi.botRunFail(runId, 'persist_failed').catch(() => undefined)
      }
    },
    [conversationId],
  )

  const dispatchClarifications = useCallback(
    (messageId: string, answers: Record<string, string | string[]>) => {
      const runtime = runtimeRef?.current
      if (!runtime) return
      void dispatchEditorAction(runtime, {
        kind: 'creator2',
        actionId: 'creator2.action.submit-clarifications',
        targetId: messageId,
        payload: { answers },
      })
    },
    [runtimeRef],
  )

  /**
   * Edge Intake loads the brief from Drive/DB — flush dirty Creator-2 edits first
   * so plan/continue never runs on a stale saved body.
   */
  const ensureBoardSynced = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const runtime = runtimeRef?.current
    if (!runtime?.invokeAction) return { ok: true }
    const result = await dispatchEditorAction(runtime, {
      kind: 'creator2',
      actionId: 'creator2.action.flush-before-bot-turn',
    })
    if (!result.ok) {
      return { ok: false, error: result.error ?? 'Could not sync board before turn' }
    }
    return { ok: true }
  }, [runtimeRef])

  const withBoardPdfExtract = useCallback(
    async (userMessage: string): Promise<string> => {
      const ctx = runtimeRef?.current?.getContext() as { rolePdfFile?: File | null } | undefined
      const file = ctx?.rolePdfFile
      if (!(file instanceof File)) return userMessage
      try {
        const extracted = await extractPdfText(file)
        return appendBoardOverviewContext(userMessage, { rolePdfText: extracted.text })
      } catch {
        return userMessage
      }
    },
    [runtimeRef],
  )

  /** Drives a single plan/continue turn — streams events into `[...prefixParts, ...liveTail]`. */
  const runTurn = useCallback(
    (
      botId: string,
      prefixParts: MessagePart[],
      invoke: (
        handlers: InterviewEditStreamHandlers,
        signal: AbortSignal,
      ) => Promise<InterviewEditResult>,
      debugLabel: string,
      retry?: PendingRetry | null,
    ): Promise<InterviewEditResult | null> => {
      const gen = ++replyGenRef.current
      const turnRunId = runIdRef.current
      const controller = new AbortController()
      stopControllerRef.current = controller
      setBusy(true)
      if (retry) pendingRetryRef.current = retry
      else pendingRetryRef.current = null

      let thinkText = ''
      const thinkStart = Date.now()
      let statusLabel = 'Thinking'
      let statusTone: 'thinking' | 'editing' = 'thinking'
      let replyText = ''
      let errorShown = false
      let questionnaireShown = false

      const liveBoardBody = (): Record<string, unknown> | null => {
        try {
          const ctx = runtimeRef?.current?.getContext?.()
          const body = (ctx as { body?: unknown } | null | undefined)?.body
          const next = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
          if (next) boardBodyRef.current = next
          return next ?? boardBodyRef.current
        } catch {
          return boardBodyRef.current
        }
      }

      const liveBubbleId = () => followMessageIdMap(botId, messageIdMapRef.current)
      const thoughtLabel = () =>
        `Thought for ${Math.max(1, Math.round((Date.now() - thinkStart) / 1000))}s`
      const patchTail = (tail: MessagePart[]) => {
        if (replyGenRef.current !== gen) return
        patchBotParts(liveBubbleId(), [...prefixParts, ...tail])
      }
      const liveTail = (): MessagePart[] => [
        { type: 'status', label: statusLabel, tone: statusTone, loading: true },
        { type: 'thinking', text: thinkText, streaming: true, collapsed: false },
      ]
      const showFailure = (headline: string, err: unknown) => {
        if (isAbortLike(err)) {
          pendingRetryRef.current = null
          patchTail([
            {
              type: 'thinking',
              text: thinkText,
              collapsed: true,
              summary: 'Stopped',
              durationMs: Date.now() - thinkStart,
            },
          ])
          return
        }
        if (retry?.kind === 'plan' || retry?.kind === 'continue') {
          pendingRetryRef.current = { ...retry, botId: liveBubbleId() }
        } else if (retry) {
          pendingRetryRef.current = retry
        }
        patchTail([
          {
            type: 'thinking',
            text: thinkText,
            collapsed: true,
            summary: 'Stopped',
            durationMs: Date.now() - thinkStart,
          },
          ...turnFailureParts(headline, toUserMessage(err)),
        ])
      }

      patchTail(liveTail())

      const finish = (opts?: { keepQuestionnaire?: boolean }) => {
        if (replyGenRef.current !== gen) return
        setBusy(false)
        stopControllerRef.current = null
        // Questionnaire sheet must stay open until Continue/Skip/timeout — do not clear it
        // when the plan stream settles (that was collapsing the fold until click-reopen).
        if (!opts?.keepQuestionnaire) {
          setActivePlan(null)
          lastPlanRef.current = null
        }
      }

      const handlers: InterviewEditStreamHandlers = {
        onPhase: (phase) => {
          const next = EDIT_PHASE_STATUS[phase]
          if (next) {
            statusLabel = next.label
            statusTone = next.tone
            if (!questionnaireShown) patchTail(liveTail())
          }
        },
        onTag: (label) => {
          statusLabel = label
          if (!questionnaireShown) patchTail(liveTail())
        },
        onThinkingDelta: (text) => {
          // Edge emits chunkString slices — append, do not replace (else only the last ~48 chars survive).
          thinkText += text
          if (!questionnaireShown) patchTail(liveTail())
        },
        onThinkingDone: (text) => {
          if (typeof text === 'string' && text.trim()) thinkText = text
          if (!questionnaireShown) patchTail(liveTail())
        },
        onPlanDelta: (text) => {
          thinkText = thinkText ? `${thinkText}\n${text}` : text
          if (!questionnaireShown) patchTail(liveTail())
        },
        onQuestionnaire: (q) => {
          questionnaireShown = true
          const thinkingPart: MessagePart = {
            type: 'thinking',
            text: thinkText,
            collapsed: true,
            summary: thoughtLabel(),
            durationMs: Date.now() - thinkStart,
          }
          const questions = mapEditQuestions(q.questions)
          const timeoutMs = q.timeoutMs || DEFAULT_PLAN_TIMEOUT_MS
          const bubbleId = liveBubbleId()
          patchTail([
            thinkingPart,
            {
              type: 'planning',
              title: q.title || 'Questions',
              questions,
              answered: false,
              summary: 'Answer questionnaire',
              editRunId: q.editRunId,
              timeoutMs,
              deadlineAt: q.deadlineAt,
            },
          ])
          // Unlock Stop/busy chrome but keep the sheet — stream `.then` must not wipe activePlan.
          finish({ keepQuestionnaire: true })
          setActivePlan({
            botId: bubbleId,
            title: q.title || 'Questions',
            questions,
            editRunId: q.editRunId,
            timeoutMs,
            deadlineAt: q.deadlineAt,
            thinkingPart,
          })
          setPlanExpandSignal((n) => n + 1)
          armQuestionnaireTimer(q.deadlineAt)
          stickRef.current.jumpToLatest()
          setAwayFromBottom(false)
          // Persist once in the turn `.then` (not here) — dual finalize races 400s.
        },
        onReplyDelta: (text) => {
          replyText += text
          if (questionnaireShown) {
            // Keep planning sheet; append guidance / Apply card copy after it.
            const bubbleId = liveBubbleId()
            const existing = botPartsRef.current[bubbleId] ?? []
            const kept = existing.filter(
              (p) => p.type === 'thinking' || p.type === 'planning' || p.type === 'status',
            )
            patchBotParts(bubbleId, [
              ...kept,
              { type: 'markdown', markdown: scrubDisplayMarkdown(replyText) },
            ])
            return
          }
          patchTail([
            {
              type: 'thinking',
              text: thinkText,
              collapsed: true,
              summary: thoughtLabel(),
              durationMs: Date.now() - thinkStart,
            },
            { type: 'markdown', markdown: scrubDisplayMarkdown(replyText) },
          ])
        },
        onReplyParts: (parts) => {
          const liveBody = liveBoardBody()
          if (questionnaireShown) {
            const bubbleId = liveBubbleId()
            const existing = botPartsRef.current[bubbleId] ?? []
            const kept = existing.filter(
              (p) => p.type === 'thinking' || p.type === 'planning' || p.type === 'status',
            )
            const mapped = mapReplyPartsWithBody(parts, replyText, liveBody)
            patchBotParts(bubbleId, [...kept, ...mapped])
            return
          }
          const mapped = mapReplyPartsWithBody(parts, replyText, liveBody)
          patchTail([
            {
              type: 'thinking',
              text: thinkText,
              collapsed: true,
              summary: thoughtLabel(),
              durationMs: Date.now() - thinkStart,
            },
            ...mapped,
          ])
        },
        onError: (err) => {
          errorShown = true
          showFailure('Something went wrong.', err)
        },
        onDone: (result) => {
          const body = result.body ?? null
          if (body) {
            boardBodyRef.current = body
            setBoardBodyEpoch((n) => n + 1)
          }
          const meta =
            result.meta && typeof result.meta === 'object'
              ? (result.meta as Record<string, unknown>)
              : null
          if (questionnaireShown) {
            if (result.replyParts?.length) {
              const bubbleId = liveBubbleId()
              const existing = botPartsRef.current[bubbleId] ?? []
              const kept = existing.filter(
                (p) => p.type === 'thinking' || p.type === 'planning' || p.type === 'status',
              )
              const mapped = mapReplyPartsWithBody(
                result.replyParts,
                replyText,
                body ?? boardBodyRef.current,
                meta,
              )
              patchBotParts(bubbleId, [...kept, ...mapped])
            }
            return
          }
          if (result.replyParts?.length) {
            const mapped = mapReplyPartsWithBody(
              result.replyParts,
              replyText,
              body ?? boardBodyRef.current,
              meta,
            )
            patchTail([
              {
                type: 'thinking',
                text: thinkText,
                collapsed: true,
                summary: thoughtLabel(),
                durationMs: Date.now() - thinkStart,
              },
              ...mapped,
            ])
          } else if (replyText.trim()) {
            patchTail([
              {
                type: 'thinking',
                text: thinkText,
                collapsed: true,
                summary: thoughtLabel(),
                durationMs: Date.now() - thinkStart,
              },
              {
                type: 'markdown',
                markdown: ensureSpineInMarkdown(scrubDisplayMarkdown(replyText), body),
              },
            ])
          }
        },
      }

      return invoke(handlers, controller.signal)
        .then(async (result) => {
          const stillCurrent = replyGenRef.current === gen
          if (stillCurrent) {
            finish({ keepQuestionnaire: questionnaireShown })
            if (!questionnaireShown) pendingRetryRef.current = null
            if (result.body) {
              onBodyUpdatedRef.current?.(result.body)
              const ctx = runtimeRef?.current?.getContext?.()
              setAppliedCheckWarnings(
                ctx
                  ? peelCheckWarningsFromContext(ctx)
                  : peelCheckWarningsFromDoc(result.body),
              )
            }
            if (debug) {
              const liveParts = botPartsRef.current[liveBubbleId()] ?? []
              logBoardTurnDebug({
                userMessage: debugLabel,
                replyMarkdown: replyText.trim() || markdownFromParts(liveParts),
                thinkText,
                result,
              })
            }
          }
          // Finalize THIS turn's bot-run even if continue already started (owned id).
          // Do not use runIdRef alone — that may already be the continue run.
          if (turnRunId) {
            await persistBotMessage(liveBubbleId(), turnRunId)
          }
          if (stillCurrent) {
            stickRef.current.jumpToLatest()
            setAwayFromBottom(false)
          }
          return result
        })
        .catch(async (e) => {
          if (replyGenRef.current === gen) {
            setBusy(false)
            stopControllerRef.current = null
            setActivePlan(null)
            lastPlanRef.current = null
            if (!errorShown) {
              showFailure('Something went wrong.', e)
            }
            if (debug) {
              logBoardTurnDebug({
                userMessage: debugLabel,
                replyMarkdown: `**Error.** ${toUserMessage(e)}`,
                thinkText,
                result: null,
                error: e,
              })
            }
            if (turnRunId) {
              await persistBotMessage(liveBubbleId(), turnRunId)
            }
          }
          return null
        })
    },
    [armQuestionnaireTimer, debug, patchBotParts, persistBotMessage, runtimeRef],
  )

  const submitContinue = useCallback(
    (answers: Record<string, string | string[]>, skipped: boolean) => {
      const plan = activePlanRef.current
      if (!plan || !accountId || !briefId || !conversationId) {
        setActivePlan(null)
        return
      }
      // One continue per questionnaire — blocks timeout-skip + manual answer double run.
      if (continueLockRef.current) return
      continueLockRef.current = true
      continueEditRunIdRef.current = plan.editRunId
      clearQuestionnaireTimer()
      setActivePlan(null)
      lastPlanRef.current = null
      const liveBotId = resolveQuestionnaireBubbleId({
        preferredId: plan.botId,
        editRunId: plan.editRunId,
        idMap: messageIdMapRef.current,
        messages: conversationRef.current?.messages ?? [],
      })
      dispatchClarifications(liveBotId, answers)
      const answeredPlanning: MessagePart = {
        type: 'planning',
        title: plan.title,
        questions: plan.questions,
        answered: true,
        collapsed: true,
        summary: skipped ? 'Used defaults / skipped' : planSummary(answers),
        answers: skipped && Object.keys(answers).length === 0 ? { _skipped: 'true' } : answers,
        editRunId: plan.editRunId,
      }
      const seal = {
        answers: answeredPlanning.answers ?? {},
        summary: answeredPlanning.summary ?? 'Answered',
      }
      const existing =
        botPartsRef.current[liveBotId] ??
        conversationRef.current?.messages.find((m) => m.id === liveBotId)?.parts ??
        [plan.thinkingPart, answeredPlanning]
      const sealedPrefix = sealPlanningParts(
        existing.some((p) => p.type === 'planning')
          ? existing
          : [plan.thinkingPart, answeredPlanning],
        plan.editRunId,
        seal,
      )
      // Seal on the LIVE bubble immediately — never leave answered:false reopenable.
      patchBotParts(liveBotId, sealedPrefix)
      void (async () => {
        try {
          const synced = await ensureBoardSynced()
          if (!synced.ok) {
            continueLockRef.current = false
            continueEditRunIdRef.current = null
            pendingRetryRef.current = {
              kind: 'continue',
              botId: liveBotId,
              editRunId: plan.editRunId,
              answers: skipped ? undefined : answers,
              skipped,
              sealedPrefix,
              debugLabel: skipped
                ? `[continue] ${plan.title} (skipped questionnaire)`
                : continueAnswerLabel(plan.title, plan.questions, answers),
            }
            patchBotParts(liveBotId, [
              ...sealedPrefix,
              ...turnFailureParts(
                'Could not sync the interview before continuing.',
                synced.error ?? '',
              ),
            ])
            return
          }
          const begin = await chatApi.botRunBegin(conversationId)
          const runId = String(
            (begin as { runId?: string; run_id?: string } | null)?.runId ??
              (begin as { run_id?: string } | null)?.run_id ??
              '',
          )
          if (!runId) throw new Error('bot_run_begin_empty')
          runIdRef.current = runId
        } catch (e) {
          continueLockRef.current = false
          continueEditRunIdRef.current = null
          pendingRetryRef.current = {
            kind: 'continue',
            botId: liveBotId,
            editRunId: plan.editRunId,
            answers: skipped ? undefined : answers,
            skipped,
            sealedPrefix,
            debugLabel: skipped
              ? `[continue] ${plan.title} (skipped questionnaire)`
              : continueAnswerLabel(plan.title, plan.questions, answers),
          }
          patchBotParts(liveBotId, [
            ...sealedPrefix,
            ...turnFailureParts('Could not continue.', toUserMessage(e)),
          ])
          return
        }
        const continueDebug = skipped
          ? `[continue] ${plan.title} (skipped questionnaire)`
          : continueAnswerLabel(plan.title, plan.questions, answers)
        void runTurn(
          liveBotId,
          sealedPrefix,
          (handlers, signal) =>
            runBoardEditContinue({
              accountId,
              briefId,
              conversationId,
              editRunId: plan.editRunId,
              answers: skipped ? undefined : answers,
              skipped,
              signal,
              handlers,
            }),
          continueDebug,
          {
            kind: 'continue',
            botId: liveBotId,
            editRunId: plan.editRunId,
            answers: skipped ? undefined : answers,
            skipped,
            sealedPrefix,
            debugLabel: continueDebug,
          },
        ).finally(() => {
          continueLockRef.current = false
          continueEditRunIdRef.current = null
        })
      })()
    },
    [
      accountId,
      briefId,
      clearQuestionnaireTimer,
      conversationId,
      dispatchClarifications,
      ensureBoardSynced,
      patchBotParts,
      runTurn,
    ],
  )

  const handlePlanningContinue = useCallback(
    (answers: Record<string, string | string[]>) => {
      const normalized: Record<string, string | string[]> = { ...answers }
      for (const [key, value] of Object.entries(answers)) {
        if (key.endsWith('__text')) continue
        if (value === PLAN_CUSTOM_ID) {
          const text = answers[planTextKey(key)]
          if (typeof text === 'string' && text.trim()) {
            normalized[key] = text.trim()
            delete normalized[planTextKey(key)]
          }
        }
      }
      submitContinue(normalized, false)
    },
    [submitContinue],
  )

  const handlePlanningSkip = useCallback(() => {
    submitContinue({}, true)
  }, [submitContinue])
  handlePlanningSkipRef.current = handlePlanningSkip

  const handleCardAction = useCallback(
    async (actionId: string, value?: string) => {
      if (actionId === RETRY_TURN_ACTION_ID) {
        handleRetryRef.current()
        return
      }
      if (actionId === 'creator2.chat.apply_pending') {
        if (continueLockRef.current) return
        const plan = activePlanRef.current
        if (plan) {
          // Apply during questionnaire = confirm the offered edit (clear-all / yes_*),
          // not a silent no-op. Composer is locked while the sheet is open.
          const answers = confirmAnswersFromPlan(plan.questions)
          if (answers) {
            submitContinue(answers, false)
            return
          }
          setPlanExpandSignal((n) => n + 1)
          return
        }
        if (busy || sendLockRef.current) return
        void handleSendRef.current({ text: 'yes', attachments: [] })
        return
      }
      const runtime = runtimeRef?.current
      if (!runtime) return
      const targetId = typeof value === 'string' ? value.trim() : ''
      const isSectionNav =
        actionId === CREATOR2_BOARD_INTENT_TO_ACTION.scroll_to_section ||
        actionId === CREATOR2_BOARD_INTENT_TO_ACTION.open_section ||
        actionId === CREATOR2_BOARD_INTENT_TO_ACTION.focus_section
      // Prefer open so the section actually enters edit (scroll-only is easy to miss).
      const resolvedActionId = isSectionNav
        ? CREATOR2_BOARD_INTENT_TO_ACTION.open_section
        : actionId
      const result = await dispatchEditorAction(runtime, {
        kind: 'creator2',
        actionId: resolvedActionId,
        targetId: targetId || undefined,
      })
      if (
        !result.ok &&
        isSectionNav &&
        targetId &&
        resolvedActionId === CREATOR2_BOARD_INTENT_TO_ACTION.open_section
      ) {
        await dispatchEditorAction(runtime, {
          kind: 'creator2',
          actionId: CREATOR2_BOARD_INTENT_TO_ACTION.focus_section,
          targetId,
        })
      }
    },
    [busy, runtimeRef, submitContinue],
  )

  const handleCheckWarningSelect = useCallback(
    async (warning: CheckSuiteWarningRow) => {
      const runtime = runtimeRef?.current
      if (!runtime) return
      await dispatchEditorAction(runtime, {
        kind: 'creator2',
        actionId: CREATOR2_BOARD_INTENT_TO_ACTION.scroll_to_section,
        targetId: warning.sectionId,
        payload: warning.historyFocus ? { historyFocus: warning.historyFocus } : undefined,
      })
    },
    [runtimeRef],
  )

  const handlePlanningReopen = useCallback(
    (messageId: string, partIndex: number) => {
      if (continueLockRef.current || busy) return
      if (activePlan?.botId === messageId) {
        setPlanExpandSignal((n) => n + 1)
        return
      }
      const msg = conversation?.messages.find((m) => m.id === messageId)
      const part = msg?.parts[partIndex]
      if (!msg || !part || part.type !== 'planning') return
      if (planningIsClosed(part)) return
      const live = findLivePlanningRef(conversation?.messages ?? [])
      if (!live || live.messageId !== messageId || live.partIndex !== partIndex) return
      if (!part.editRunId?.trim()) return
      const thinkingPart =
        msg.parts.find(
          (p): p is Extract<MessagePart, { type: 'thinking' }> => p.type === 'thinking',
        ) ?? { type: 'thinking', text: '', collapsed: true, summary: 'Thought' }
      setActivePlan({
        botId: messageId,
        title: part.title?.trim() || 'Questions',
        questions: part.questions,
        editRunId: part.editRunId ?? '',
        timeoutMs: part.timeoutMs ?? DEFAULT_PLAN_TIMEOUT_MS,
        deadlineAt: part.deadlineAt ?? new Date(Date.now() + DEFAULT_PLAN_TIMEOUT_MS).toISOString(),
        thinkingPart,
      })
      setPlanExpandSignal((n) => n + 1)
    },
    [activePlan, busy, conversation],
  )

  const handleStop = useCallback(() => {
    replyGenRef.current += 1
    stopControllerRef.current?.abort()
    stopControllerRef.current = null
    clearQuestionnaireTimer()
    const plan = activePlanRef.current
    const editRunId = plan?.editRunId ?? continueEditRunIdRef.current
    const openRunId = runIdRef.current
    runIdRef.current = null
    continueEditRunIdRef.current = null
    continueLockRef.current = false
    sendLockRef.current = false
    pendingRetryRef.current = null
    if (openRunId) {
      cancelledBotRunIdsRef.current.add(openRunId)
      void chatApi.botRunFail(openRunId, 'cancelled').catch(() => undefined)
    }
    // Seal open questionnaire so Stop does not leave answered:false reopenable.
    if (plan) {
      const liveBotId = resolveQuestionnaireBubbleId({
        preferredId: plan.botId,
        editRunId: plan.editRunId,
        idMap: messageIdMapRef.current,
        messages: conversationRef.current?.messages ?? [],
      })
      const existing =
        botPartsRef.current[liveBotId] ??
        conversationRef.current?.messages.find((m) => m.id === liveBotId)?.parts ??
        []
      if (existing.some((p) => p.type === 'planning')) {
        patchBotParts(
          liveBotId,
          sealPlanningParts(existing, plan.editRunId, {
            answers: { _stopped: 'true' },
            summary: 'Stopped',
          }),
        )
      }
    }
    setActivePlan(null)
    lastPlanRef.current = null
    setBusy(false)
    if (briefId) {
      void assessmentApi.boardEditCancel(briefId, editRunId ?? undefined).catch(() => undefined)
    }
    setConversation((prev) => {
      if (!prev) return prev
      let changed = false
      const messages = prev.messages.map((msg) => {
        if (msg.role !== 'assistant') return msg
        const refParts = botPartsRef.current[msg.id] ?? msg.parts
        const hasLive =
          Boolean(msg.streaming) ||
          refParts.some(
            (p) =>
              (p.type === 'status' && p.loading) || (p.type === 'thinking' && p.streaming),
          )
        const hasUnansweredPlan = refParts.some(
          (p) => p.type === 'planning' && !p.answered,
        )
        if (!hasLive && !hasUnansweredPlan) return msg
        changed = true
        const frozen = freezeStoppedParts(
          hasUnansweredPlan
            ? sealPlanningParts(refParts, editRunId ?? '', {
                answers: { _stopped: 'true' },
                summary: 'Stopped',
              })
            : refParts,
        )
        botPartsRef.current[msg.id] = frozen
        return {
          ...msg,
          streaming: false,
          parts: frozen,
        }
      })
      if (!changed) return prev
      return { ...prev, messages, updatedAt: new Date().toISOString() }
    })
  }, [briefId, clearQuestionnaireTimer, patchBotParts])

  const handleSend = useCallback(
    async (payload: ComposerSendPayload) => {
      const text = payload.text.trim()
      if (
        !text ||
        busy ||
        sendLockRef.current ||
        activePlan ||
        !conversationId ||
        !briefId ||
        !accountId
      ) {
        return
      }
      sendLockRef.current = true
      setBusy(true)

      const synced = await ensureBoardSynced()
      if (!synced.ok) {
        sendLockRef.current = false
        setBusy(false)
        pendingRetryRef.current = { kind: 'fresh_send', userMessage: text }
        const nowErr = new Date().toISOString()
        const errBotId = `msg.bot.sync.${Date.now()}`
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    id: errBotId,
                    conversationId,
                    role: 'assistant',
                    senderId: CREATOR2_BOARD_BOT_ID,
                    createdAt: nowErr,
                    parts: turnFailureParts(
                      'Could not sync the interview before this turn.',
                      synced.error ?? '',
                    ),
                  },
                ],
                updatedAt: nowErr,
              }
            : prev,
        )
        return
      }

      const now = new Date().toISOString()
      const localUserId = `msg.user.${Date.now()}`
      const userMsg: ChatMessage = {
        id: localUserId,
        conversationId,
        role: 'user',
        senderId: selfIdRef.current ?? CREATOR2_BOARD_USER_ID,
        createdAt: now,
        parts: [{ type: 'text', text }],
      }
      const botId = `msg.bot.${Date.now()}`
      const botMsg: ChatMessage = {
        id: botId,
        conversationId,
        role: 'assistant',
        senderId: CREATOR2_BOARD_BOT_ID,
        createdAt: now,
        parts: [
          { type: 'status', label: 'Thinking', tone: 'thinking', loading: true },
          { type: 'thinking', text: '', streaming: true, collapsed: false },
        ],
      }

      setDraft('')
      setConversation((prev) =>
        prev
          ? { ...prev, messages: [...prev.messages, userMsg, botMsg], updatedAt: now }
          : prev,
      )
      stickRef.current.jumpToLatest()
      setAwayFromBottom(false)

      try {
        const sent = await chatApi.sendMessage({
          conversationId,
          parts: [{ type: 'text', text }],
        })
        if (sent?.id) {
          setConversation((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === localUserId
                  ? {
                      ...m,
                      id: sent.id,
                      createdAt: sent.createdAt ?? m.createdAt,
                      parts: sent.parts?.length ? sent.parts : m.parts,
                    }
                  : m,
              ),
            }
          })
        }
        const begin = await chatApi.botRunBegin(conversationId, sent?.id)
        const runId = String(
          (begin as { runId?: string; run_id?: string } | null)?.runId ??
            (begin as { run_id?: string } | null)?.run_id ??
            '',
        )
        if (!runId) throw new Error('bot_run_begin_empty')
        runIdRef.current = runId
      } catch (e) {
        sendLockRef.current = false
        setBusy(false)
        pendingRetryRef.current = { kind: 'plan', botId, userMessage: text }
        patchBotParts(botId, turnFailureParts('Could not start this turn.', toUserMessage(e)))
        return
      }

      void runTurn(
        botId,
        [],
        (handlers, signal) =>
          withBoardPdfExtract(text).then((userMessage) =>
            runBoardEditPlan({
              accountId,
              briefId,
              conversationId,
              userMessage,
              signal,
              handlers,
            }),
          ),
        text,
        { kind: 'plan', botId, userMessage: text },
      ).finally(() => {
        sendLockRef.current = false
      })
    },
    [
      accountId,
      activePlan,
      briefId,
      busy,
      conversationId,
      ensureBoardSynced,
      patchBotParts,
      runTurn,
      withBoardPdfExtract,
    ],
  )
  handleSendRef.current = handleSend

  const handleRetry = useCallback(() => {
    const pending =
      pendingRetryRef.current ??
      recoverPlanRetryFromThread(conversationRef.current?.messages ?? [])
    if (!pending || busy || sendLockRef.current || continueLockRef.current || activePlan) return
    if (!conversationId || !briefId || !accountId) return

    if (pending.kind === 'fresh_send') {
      pendingRetryRef.current = null
      void handleSend({ text: pending.userMessage, attachments: [] })
      return
    }

    pendingRetryRef.current = pending
    void (async () => {
      sendLockRef.current = true
      setBusy(true)
      const botId = followMessageIdMap(pending.botId, messageIdMapRef.current)
      try {
        const synced = await ensureBoardSynced()
        if (!synced.ok) {
          sendLockRef.current = false
          setBusy(false)
          const prefix = pending.kind === 'continue' ? pending.sealedPrefix : []
          patchBotParts(botId, [
            ...prefix,
            ...turnFailureParts(
              pending.kind === 'continue'
                ? 'Could not sync the interview before continuing.'
                : 'Could not sync the interview before this turn.',
              synced.error ?? '',
            ),
          ])
          return
        }
        const begin = await chatApi.botRunBegin(conversationId)
        const runId = String(
          (begin as { runId?: string; run_id?: string } | null)?.runId ??
            (begin as { run_id?: string } | null)?.run_id ??
            '',
        )
        if (!runId) throw new Error('bot_run_begin_empty')
        runIdRef.current = runId
      } catch (e) {
        sendLockRef.current = false
        setBusy(false)
        const prefix = pending.kind === 'continue' ? pending.sealedPrefix : []
        patchBotParts(botId, [
          ...prefix,
          ...turnFailureParts(
            pending.kind === 'continue' ? 'Could not continue.' : 'Could not start this turn.',
            toUserMessage(e),
          ),
        ])
        return
      }

      if (pending.kind === 'plan') {
        void runTurn(
          botId,
          [],
          (handlers, signal) =>
            withBoardPdfExtract(pending.userMessage).then((userMessage) =>
              runBoardEditPlan({
                accountId,
                briefId,
                conversationId,
                userMessage,
                signal,
                handlers,
              }),
            ),
          pending.userMessage,
          pending,
        ).finally(() => {
          sendLockRef.current = false
        })
        return
      }

      continueLockRef.current = true
      continueEditRunIdRef.current = pending.editRunId
      void runTurn(
        botId,
        pending.sealedPrefix,
        (handlers, signal) =>
          runBoardEditContinue({
            accountId,
            briefId,
            conversationId,
            editRunId: pending.editRunId,
            answers: pending.skipped ? undefined : pending.answers,
            skipped: pending.skipped,
            signal,
            handlers,
          }),
        pending.debugLabel,
        pending,
      ).finally(() => {
        continueLockRef.current = false
        continueEditRunIdRef.current = null
        sendLockRef.current = false
      })
    })()
  }, [
    accountId,
    activePlan,
    briefId,
    busy,
    conversationId,
    ensureBoardSynced,
    handleSend,
    patchBotParts,
    runTurn,
    withBoardPdfExtract,
  ])
  handleRetryRef.current = handleRetry

  const historyHeader = loadingMore ? (
      <div
        className="theme-interview-creator-chat__history-loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="type-display-sm type-accent theme-interview-creator__list-loading-label">
          Loading
        </span>
      </div>
    ) : null

  return (
    <div
      className={['theme-interview-creator-chat', className].filter(Boolean).join(' ')}
      aria-label="Vurex chat"
      data-plan-open={activePlan || planMounted || checkMounted ? 'true' : 'false'}
    >
      <BotChatThread
        conversation={displayConversation}
        participants={participants}
        onCardAction={handleCardAction}
        onPlanningReopen={handlePlanningReopen}
        viewportRef={viewportRef}
        topSentinelRef={topSentinelRef}
        header={historyHeader}
        chrome="board"
        showJumpToLatest={awayFromBottom}
        onJumpToLatest={handleJumpToLatest}
        className="theme-interview-creator-chat__bot-thread"
      />
      <div className="theme-interview-creator-chat__composer-stack">
        {planMounted && sheetPlan ? (
          <div
            className={[
              'theme-interview-creator-chat__plan-fold',
              planShown ? 'is-open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="theme-interview-creator-chat__plan-fold-inner">
              <BoardPlanningSheet
                title={sheetPlan.title}
                questions={sheetPlan.questions}
                timeoutMs={sheetPlan.timeoutMs}
                deadlineAt={sheetPlan.deadlineAt}
                expandSignal={planExpandSignal}
                onSubmit={handlePlanningContinue}
                onDismiss={handlePlanningSkip}
              />
            </div>
          </div>
        ) : null}
        {checkMounted && shownCheckWarnings.length > 0 ? (
          <div
            className={[
              'theme-interview-creator-chat__plan-fold',
              checkShown ? 'is-open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="theme-interview-creator-chat__plan-fold-inner">
              <BoardCheckSuiteSheet
                warnings={shownCheckWarnings}
                joinTop={Boolean(planMounted && sheetPlan)}
                onSelect={handleCheckWarningSelect}
              />
            </div>
          </div>
        ) : null}
        <InterviewBoardComposer
          draft={draft}
          onDraftChange={setDraft}
          onSend={handleSend}
          onStop={handleStop}
          busy={busy}
          locked={Boolean(activePlan) || planMounted}
          leading={
            overviewPeelTags.length > 0 ? (
              <div
                className="theme-chip-group theme-interview-creator-chat__composer-attach"
                role="list"
                aria-label="Interview brief"
              >
                {overviewPeelTags.map((tag) => {
                  const Icon = tag.kind === 'pdf' ? FileText : NotebookText
                  return (
                    <Chip key={`${tag.kind}:${tag.label}`} size="sm">
                      <Icon aria-hidden />
                      <span>{tag.label}</span>
                    </Chip>
                  )
                })}
              </div>
            ) : null
          }
        />
      </div>
    </div>
  )
}
