/**
 * Tool-stage assist peel — same board chrome as Interview Creator peel chat
 * (BotChatThread + board ChatBubble + board composer; Copilot write uses Stop).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { BotChatThread } from './botChatParts/BotChatThread'
import { ChatBubble, ChatErrorBubble } from './chatParts/ChatBubble'
import { InfoTooltip } from './InfoTooltip'
import { Chip } from './Chip'
import { BoardPlanningSheet, BoardProposedEditSheet } from './InterviewCreatorChat'
import { InterviewBoardComposer } from './InterviewBoardComposer'
import { bindTelemetryHost } from '../lib/interviewRunApi/sessionTelemetry'
import { latestCopilotPendingMessageId } from '../lib/interviewRunApi/copilotPendingChrome'
import { MarkdownChatChromeContext } from '../lib/markdownRenderer/markdownChatChrome'
import { scrubBrokenTalkMarkdown } from '../lib/interviewRunApi/stripToFinalAsk'
import { lastUserPlainText, sittingChatErrorCopy } from '../lib/chat/errorBubble'
import { messageCreatedAtIso } from '../lib/chat/time'
import { useAnimatedFoldMount } from '../hooks/useAnimatedFoldMount'
import type { ChatConversation, ChatMessage, ChatParticipant, MessagePart } from '../lib/chat/types'
import type { AssistRuntimeView } from './InterviewTalkChatSpace'

export type AssistAttachFile = {
  path: string
  pinned?: boolean
  selected: boolean
}

export type AssistPendingEdit = {
  path: string
  id?: string
  label?: string
  locked?: boolean
  skipped?: boolean
}

type InterviewAssistPeelChatProps = {
  assist: AssistRuntimeView
  kindLabel?: string | null
  timed?: boolean
  spoilers?: boolean
  attachFiles?: readonly AssistAttachFile[]
  onToggleAttach?: (path: string) => void
  pendingEdits?: readonly AssistPendingEdit[]
  onPendingAccept?: (path: string) => void
  onPendingReject?: (path: string) => void
  onPendingFocus?: (path: string) => void
  onPendingKeepAll?: () => void
  onPendingDiscardAll?: () => void
  onSend?: (text: string) => void
  onDraftChange?: (draft: string) => void
  onStop?: () => void
  onCardAction?: (actionId: string, value?: string) => void
  onCitePath?: (path: string) => void
  onQuestionnaire?: (answers: Record<string, string | string[]>, skipped?: boolean) => void
  className?: string
}

function fileChipLabel(path: string): string {
  return path.split('/').pop() || path
}

const ASSIST_CONV_ID = 'interview-assist-peel'
const PLAN_SHEET_MS = 420
const DEFAULT_PLAN_TIMEOUT_MS = 90_000

function prefersReduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function peelTitle(bundleId: string | undefined, write: boolean, spoilers: boolean): string {
  if (bundleId === 'copilot' || write) return 'Copilot'
  if (bundleId === 'coach' || (spoilers && !write)) return 'Coach'
  if (bundleId === 'custom') return 'Helper'
  return 'Assistant'
}

function assistHelpTip(
  timed: boolean,
  bundleId: string | undefined,
  write: boolean,
  spoilers: boolean,
): string {
  const coach =
    'Work in the main panel. Ask here if a line is unclear. I can hint at the part you name. I will not write in the editor or walk the whole challenge.'
  const base =
    bundleId === 'copilot' || write
      ? 'Work in the main panel. Ask here if a line is unclear. I can hint, or propose one edit. Use Apply when you want it in the editor.'
      : bundleId === 'coach' || (spoilers && !write)
        ? coach
        : 'Work in the main panel. Ask here if a line is unclear. I will not hint at answers or write.'
  if (timed) {
    return `${base} Use Forfeit only if you want to skip scoring this timed stage.`
  }
  return `${base} Use Next when you are ready.`
}

function assistPlaceholder(
  persona: string,
  bundleId: string | undefined,
  write: boolean,
  spoilers: boolean,
  busy: boolean,
): string {
  if (busy) return 'Thinking…'
  if (bundleId === 'copilot' || write) return `Ask ${persona} to explain or propose an edit…`
  if (bundleId === 'coach' || (spoilers && !write)) return `Ask ${persona} for a hint on one part…`
  return `Ask ${persona} if a line is unclear…`
}

function buildAssistParticipants(personaName: string): ChatParticipant[] {
  return [
    {
      id: 'assist-bot',
      displayName: personaName || 'Interviewer',
      role: 'bot',
    },
    {
      id: 'assist-candidate',
      displayName: 'You',
      role: 'member',
    },
  ]
}

function latestPendingId(assist: AssistRuntimeView): string | null {
  return latestCopilotPendingMessageId(assist.messages)
}

function lockApplyActions(parts: MessagePart[], enabled: boolean): MessagePart[] {
  if (enabled) return parts
  return parts.map((p) => {
    if (p.type !== 'card' || !p.actions?.length) return p
    return {
      ...p,
      actions: p.actions.filter((a) => a.actionId !== 'copilot.action.apply-pending'),
    }
  })
}

function scrubAssistParts(parts: MessagePart[]): MessagePart[] {
  return parts.map((p) =>
    p.type === 'markdown' ? { ...p, markdown: scrubBrokenTalkMarkdown(p.markdown) } : p,
  )
}

function buildAssistMessages(assist: AssistRuntimeView): ChatMessage[] {
  const messages: ChatMessage[] = []
  const write = Boolean(assist.write)
  const livePending = latestPendingId(assist)
  for (let i = 0; i < assist.messages.length; i += 1) {
    const msg = assist.messages[i]!
    const isCandidate = msg.role === 'candidate'
    const lastId = assist.messages[assist.messages.length - 1]?.id
    const streaming =
      Boolean(assist.busy) &&
      !isCandidate &&
      msg.id === lastId &&
      Boolean(String(msg.text || '').trim())
    let parts: MessagePart[] =
      write && msg.parts?.length
        ? scrubAssistParts(msg.parts)
        : [
            {
              type: 'markdown',
              markdown: scrubBrokenTalkMarkdown(msg.text || ''),
            },
          ]
    if (write && msg.pendingStatus && msg.pendingStatus !== 'pending') {
      parts = lockApplyActions(parts, false)
    } else if (write && msg.pendingStatus === 'pending') {
      parts = lockApplyActions(parts, msg.id === livePending && msg.editRunId === assist.pendingEditRunId)
    }
    messages.push({
      id: msg.id,
      conversationId: ASSIST_CONV_ID,
      role: isCandidate ? 'user' : 'assistant',
      senderId: isCandidate ? 'assist-candidate' : 'assist-bot',
      createdAt: messageCreatedAtIso(msg.at),
      streaming: streaming || undefined,
      parts,
    })
  }
  return messages
}

/**
 * Assist navigation chat for Form / Coding / Doc — right peel (Creator board SSOT).
 */
export function InterviewAssistPeelChat({
  assist,
  timed = false,
  spoilers = false,
  attachFiles,
  onToggleAttach,
  pendingEdits,
  onPendingAccept,
  onPendingReject,
  onPendingFocus,
  onPendingKeepAll,
  onPendingDiscardAll,
  onSend,
  onDraftChange,
  onStop: _onStop,
  onCardAction,
  onCitePath,
  onQuestionnaire,
  className = '',
}: InterviewAssistPeelChatProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const peelRef = useRef<HTMLDivElement | null>(null)
  const primedScroll = useRef(false)
  const persona = assist.personaName?.trim() || 'Interviewer'
  const busy = Boolean(assist.busy)
  const draft = assist.draft
  const write = Boolean(assist.write)
  const bundleId = assist.bundleId
  const title = peelTitle(bundleId, write, spoilers)
  const chatChrome = useMemo(() => ({ onWorkspacePathClick: onCitePath }), [onCitePath])

  const participants = useMemo(() => buildAssistParticipants(persona), [persona])
  const messages = useMemo(() => buildAssistMessages(assist), [assist])

  const livePlanning = messages
    .flatMap((m) => m.parts.map((p, i) => ({ m, p, i })))
    .find(({ p }) => p.type === 'planning' && !p.answered)
  const [planExpandSignal, setPlanExpandSignal] = useState(0)
  const livePlanOpen = Boolean(livePlanning)
  const pendingCount = pendingEdits?.length ?? 0
  const pendingOpen = pendingCount > 0 && !livePlanOpen
  const { mounted: planMounted, shown: planShown } = useAnimatedFoldMount(livePlanOpen, PLAN_SHEET_MS)
  const { mounted: pendingMounted, shown: pendingShown } = useAnimatedFoldMount(
    pendingOpen,
    PLAN_SHEET_MS,
  )
  const lastPlanRef = useRef<{
    title: string
    questions: Extract<MessagePart, { type: 'planning' }>['questions']
    timeoutMs: number
    deadlineAt: string
  } | null>(null)
  if (livePlanning && livePlanning.p.type === 'planning') {
    const rawTimeout = livePlanning.p.timeoutMs
    const untimed = typeof rawTimeout === 'number' && rawTimeout <= 0
    lastPlanRef.current = {
      title: livePlanning.p.title?.trim() || 'Questions',
      questions: livePlanning.p.questions,
      timeoutMs: untimed ? 0 : (rawTimeout ?? DEFAULT_PLAN_TIMEOUT_MS),
      deadlineAt: untimed
        ? ''
        : (livePlanning.p.deadlineAt ??
          new Date(Date.now() + (rawTimeout ?? DEFAULT_PLAN_TIMEOUT_MS)).toISOString()),
    }
  }
  const sheetPlan = lastPlanRef.current
  const planningKey =
    livePlanning && livePlanning.p.type === 'planning'
      ? `${livePlanning.m.id}:${livePlanning.p.editRunId ?? ''}`
      : ''

  useEffect(() => {
    if (planningKey) setPlanExpandSignal(0)
  }, [planningKey])

  const conversation = useMemo<ChatConversation>(
    () => ({
      id: ASSIST_CONV_ID,
      surface: 'bot',
      kind: 'bot',
      title,
      participantIds: participants.map((p) => p.id),
      messages,
      createdAt: messages[0]?.createdAt ?? new Date().toISOString(),
      updatedAt: messages[messages.length - 1]?.createdAt ?? new Date().toISOString(),
      draft,
    }),
    [draft, messages, participants, title],
  )

  const lastAssistant = assist.messages[assist.messages.length - 1]
  // A proposal the live editor refused goes back to the Edge instead of ending the turn.
  // Without a label for it the candidate saw the reply sit there and concluded nothing was
  // being attempted — which is the whole reason the retry was invisible before.
  const retrying = assist.messages.some((m) => m.pendingStatus === 'retrying')
  const showThinking =
    retrying ||
    (busy && !(lastAssistant?.role === 'assistant' && String(lastAssistant.text || '').trim()))

  const busyMessage = useMemo<ChatMessage>(
    () => ({
      id: 'assist-busy',
      conversationId: ASSIST_CONV_ID,
      role: 'assistant',
      senderId: 'assist-bot',
      createdAt: new Date().toISOString(),
      streaming: true,
      parts: [
        {
          type: 'status',
          label: retrying ? 'Retrying edit' : 'Thinking',
          tone: 'thinking',
          loading: true,
        },
      ],
    }),
    [retrying],
  )

  const lastAssistantText =
    lastAssistant?.role === 'assistant' ? String(lastAssistant.text || '') : ''

  useEffect(() => {
    if (messages.length === 0 && !busy) return
    const reduced = prefersReduceMotion()
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth'
    const delay = primedScroll.current ? (reduced ? 0 : 48) : reduced ? 40 : 280
    let raf = 0
    const id = window.setTimeout(() => {
      raf = window.requestAnimationFrame(() => {
        const viewport = viewportRef.current
        if (viewport) {
          viewport.scrollTo({
            top: Math.max(0, viewport.scrollHeight - viewport.clientHeight + 24),
            behavior,
          })
        }
        primedScroll.current = true
      })
    }, delay)
    return () => {
      window.clearTimeout(id)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [messages.length, busy, lastAssistantText])

  useEffect(() => bindTelemetryHost(peelRef.current, 'assist'), [])

  return (
    <div
      ref={peelRef}
      className={[
        'theme-interview-assist-peel',
        'theme-interview-creator-chat',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
        aria-label={title}
        data-talk-flush-assistant="true"
        data-sitting-copy-ok=""
        data-copy-surface="chat"
        data-plan-open={livePlanOpen || planMounted || pendingMounted ? 'true' : 'false'}
      >
      <div className="theme-interview-assist-peel__head theme-interview-assist-peel__head--tip-only">
        <div className="theme-interview-assist-peel__head-tip">
          <InfoTooltip
            content={assistHelpTip(timed, bundleId, write, spoilers)}
            placement="bottom"
            size="xs"
            aria-label={`${title} tips`}
          />
        </div>
      </div>

      <MarkdownChatChromeContext.Provider value={chatChrome}>
      <BotChatThread
        conversation={conversation}
        participants={participants}
        viewportRef={viewportRef}
        chrome="board"
        showDaySeparators={false}
        onCardAction={write ? onCardAction : undefined}
        onPlanningReopen={() => setPlanExpandSignal((n) => n + 1)}
        className="theme-interview-creator-chat__bot-thread theme-interview-assist-peel__bot-thread"
        footer={
          <>
            {showThinking ? (
              <ChatBubble
                message={busyMessage}
                sender={participants[0]}
                align="start"
                chrome="board"
                fogDefaultOpen
              />
            ) : null}
            {assist.error ? (
              <ChatErrorBubble
                text={sittingChatErrorCopy(assist.error, 'assist')}
                chrome="board"
                sender={participants[0]}
                conversationId="interview-assist"
                onRetry={() => {
                  const text = lastUserPlainText(assist.messages)
                  if (text) onSend?.(text)
                }}
              />
            ) : null}
          </>
        }
      />
      </MarkdownChatChromeContext.Provider>

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
                onSubmit={(answers) => onQuestionnaire?.(answers, false)}
                onDismiss={
                  sheetPlan.timeoutMs > 0 ? () => onQuestionnaire?.({}, true) : undefined
                }
              />
            </div>
          </div>
        ) : null}
        {pendingMounted && pendingCount > 0 && pendingEdits ? (
          <div
            className={[
              'theme-interview-creator-chat__plan-fold',
              pendingShown ? 'is-open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="theme-interview-creator-chat__plan-fold-inner">
              <BoardProposedEditSheet
                files={pendingEdits}
                onFocus={(path) => onPendingFocus?.(path)}
                onKeep={(path) => onPendingAccept?.(path)}
                onDiscard={(path) => onPendingReject?.(path)}
                onKeepAll={onPendingKeepAll}
                onDiscardAll={onPendingDiscardAll}
              />
            </div>
          </div>
        ) : null}
        <InterviewBoardComposer
          variant={write ? 'creator' : 'talk'}
          telemetrySurface="assist"
          draft={draft}
          onDraftChange={(value) => onDraftChange?.(value)}
          onStop={undefined}
          onSend={(payload) => {
            const text = (payload.text ?? draft).trim()
            if (!text || busy || pendingCount > 0 || livePlanOpen || planMounted) return
            onSend?.(text)
          }}
          placeholder={assistPlaceholder(persona, bundleId, write, spoilers, busy)}
          busy={busy}
          locked={Boolean(livePlanning) || planMounted || pendingCount > 0}
          lockedHint={
            pendingCount > 0 && !livePlanOpen
              ? 'Keep or discard the edit in the editor…'
              : 'Answer the questions above…'
          }
          leading={
            attachFiles && attachFiles.length > 0 ? (
              <div
                className="theme-chip-group theme-interview-creator-chat__composer-attach"
                role="list"
                aria-label="Attached files"
              >
                {attachFiles.map((file) => {
                  const name = fileChipLabel(file.path)
                  return (
                    <Chip
                      key={file.path}
                      size="sm"
                      selected={file.selected}
                      onClick={() => {
                        if (file.pinned) return
                        onToggleAttach?.(file.path)
                      }}
                    >
                      {name}
                      {file.pinned ? ' · Open' : ''}
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
