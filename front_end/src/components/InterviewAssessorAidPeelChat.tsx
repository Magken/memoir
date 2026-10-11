/**
 * Assessor Aid peel — Soft Decision Talk Verify marker aide (board chrome).
 * Conversation history is FE-local fixture store (no chat_messages this slice).
 */
import { useEffect, useMemo, useRef } from 'react'
import { Bookmark } from 'lucide-react'
import { BotChatThread } from './botChatParts/BotChatThread'
import { ChatBubble, ChatErrorBubble } from './chatParts/ChatBubble'
import { Chip } from './Chip'
import { InfoTooltip } from './InfoTooltip'
import { InterviewBoardComposer } from './InterviewBoardComposer'
import { scrubBrokenTalkMarkdown } from '../lib/interviewRunApi/stripToFinalAsk'
import { lastUserPlainText } from '../lib/chat/errorBubble'
import { aidPeelErrorCopy } from '../lib/interviewRunApi/aidPeelAttach'
import type { AidPeelAttach, AidOpenRef } from '../lib/interviewRunApi/aidPeelAttach'
import { messageCreatedAtIso } from '../lib/chat/time'
import type { AssessorAidFixtureMessage } from '../lib/interviewRunApi/assessorAidConversationFixture'
import type { ChatConversation, ChatMessage, ChatParticipant, MessagePart } from '../lib/chat/types'

export type AssessorAidRuntimeView = {
  messages: AssessorAidFixtureMessage[]
  draft: string
  busy: boolean
  error: string | null
  personaName: string
}

type InterviewAssessorAidPeelChatProps = {
  aid: AssessorAidRuntimeView
  attach?: AidPeelAttach | null
  onSend?: (text: string) => void
  onDraftChange?: (draft: string) => void
  onCiteClick?: (messageId: string) => void
  onDismissAttach?: () => void
  onOpenRef?: (ref: AidOpenRef) => void
  className?: string
}

const AID_CONV_ID = 'interview-assessor-aid-peel'

function prefersReduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function buildParticipants(personaName: string): ChatParticipant[] {
  return [
    { id: 'aid-bot', displayName: personaName || 'Assessor Aid', role: 'bot' },
    { id: 'aid-marker', displayName: 'You', role: 'member' },
  ]
}

function buildMessages(aid: AssessorAidRuntimeView, canCite: boolean): ChatMessage[] {
  const messages: ChatMessage[] = []
  for (let i = 0; i < aid.messages.length; i += 1) {
    const msg = aid.messages[i]!
    const isCandidate = msg.role === 'candidate'
    const lastId = aid.messages[aid.messages.length - 1]?.id
    const streaming =
      Boolean(aid.busy) &&
      !isCandidate &&
      msg.id === lastId &&
      Boolean(String(msg.text || '').trim())
    const citeIds =
      !isCandidate && canCite && Array.isArray(msg.citeMessageIds)
        ? msg.citeMessageIds.map((id) => String(id).trim()).filter(Boolean)
        : []
    const parts: MessagePart[] = [
      {
        type: 'markdown',
        markdown: scrubBrokenTalkMarkdown(msg.text || ''),
      },
    ]
    if (citeIds.length) {
      parts.push({
        type: 'card',
        title: '',
        presentation: 'links',
        actions: citeIds.map((id) => ({
          id: `cite:${id}`,
          label: 'Jump to utterance',
          actionId: 'aid.jump-utterance',
          value: id,
        })),
      })
    }
    messages.push({
      id: msg.id,
      conversationId: AID_CONV_ID,
      role: isCandidate ? 'user' : 'assistant',
      senderId: isCandidate ? 'aid-marker' : 'aid-bot',
      createdAt: messageCreatedAtIso(msg.at),
      streaming: streaming || undefined,
      parts,
    })
  }
  return messages
}

/**
 * Assessor Aid chat for Talk Soft Decision Verify — right peel.
 */
export function InterviewAssessorAidPeelChat({
  aid,
  attach = null,
  onSend,
  onDraftChange,
  onCiteClick,
  onDismissAttach,
  onOpenRef,
  className = '',
}: InterviewAssessorAidPeelChatProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const primedScroll = useRef(false)
  const persona = aid.personaName?.trim() || 'Assessor Aid'
  const busy = Boolean(aid.busy)
  const draft = aid.draft

  const participants = useMemo(() => buildParticipants(persona), [persona])
  const messages = useMemo(() => buildMessages(aid, Boolean(onCiteClick)), [aid, onCiteClick])

  const conversation = useMemo<ChatConversation>(
    () => ({
      id: AID_CONV_ID,
      surface: 'bot',
      kind: 'bot',
      title: 'Assessor Aid',
      participantIds: participants.map((p) => p.id),
      messages,
      createdAt: messages[0]?.createdAt ?? new Date().toISOString(),
      updatedAt: messages[messages.length - 1]?.createdAt ?? new Date().toISOString(),
      draft,
    }),
    [draft, messages, participants],
  )

  const lastAssistant = aid.messages[aid.messages.length - 1]
  const showThinking =
    busy &&
    !(lastAssistant?.role === 'assistant' && String(lastAssistant.text || '').trim())

  const busyMessage = useMemo<ChatMessage>(
    () => ({
      id: 'aid-busy',
      conversationId: AID_CONV_ID,
      role: 'assistant',
      senderId: 'aid-bot',
      createdAt: new Date().toISOString(),
      streaming: true,
      parts: [{ type: 'status', label: 'Thinking', tone: 'thinking', loading: true }],
    }),
    [],
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

  return (
    <div
      className={[
        'theme-interview-assist-peel',
        'theme-interview-creator-chat',
        'theme-interview-assessor-aid-peel',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Assessor Aid"
      data-talk-flush-assistant="true"
    >
      <div className="theme-interview-assist-peel__head theme-interview-assist-peel__head--tip-only">
        <div className="theme-interview-assist-peel__head-tip">
          <InfoTooltip
            content="Ask about Soft Decision markings, grains, or where an utterance sits in the transcript. I will not invent scores."
            placement="bottom"
            size="xs"
            aria-label="Assessor Aid tips"
          />
        </div>
      </div>

      <BotChatThread
        conversation={conversation}
        participants={participants}
        viewportRef={viewportRef}
        chrome="board"
        showDaySeparators={false}
        onCardAction={(actionId, value) => {
          if (actionId === 'aid.jump-utterance' && value) onCiteClick?.(value)
        }}
        className="theme-interview-creator-chat__bot-thread theme-interview-assist-peel__bot-thread"
        boardTrailFor={(message) => {
          const idx = aid.messages.findIndex((row) => row.id === message.id)
          const fixture = idx >= 0 ? aid.messages[idx] : undefined
          let refs = fixture && Array.isArray(fixture.openRefs) ? fixture.openRefs : []
          if (!refs.length && fixture?.role === 'candidate') {
            const next = aid.messages[idx + 1]
            if (next?.role === 'assistant' && Array.isArray(next.openRefs)) refs = next.openRefs
          }
          if (!refs.length) return null
          return (
            <div
              className="theme-chip-group theme-interview-assessor-aid-peel__head-refs"
              aria-label="Referenced results home"
            >
              {refs.map((ref) => (
                <Chip
                  key={`${ref.sectionId}:${ref.stage ?? ''}`}
                  size="sm"
                  selected
                  onClick={onOpenRef ? () => onOpenRef(ref) : undefined}
                >
                  <Bookmark size={12} aria-hidden />
                  <span title={ref.label}>{ref.label}</span>
                </Chip>
              ))}
            </div>
          )
        }}
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
            {aid.error ? (
              <ChatErrorBubble
                text={aidPeelErrorCopy(aid.error)}
                chrome="board"
                sender={participants[0]}
                conversationId="interview-aid"
                onRetry={() => {
                  const text = lastUserPlainText(aid.messages)
                  if (text) onSend?.(text)
                }}
              />
            ) : null}
          </>
        }
      />

      <div className="theme-interview-creator-chat__composer-stack">
        <InterviewBoardComposer
          variant="talk"
          draft={draft}
          onDraftChange={(value) => onDraftChange?.(value)}
          onSend={(payload) => {
            const text = (payload.text ?? draft).trim()
            if (!text || busy) return
            onSend?.(text)
          }}
          placeholder={busy ? 'Thinking…' : 'Ask about this attempt…'}
          busy={busy}
          locked={false}
          leading={
            attach ? (
              <div
                className="theme-chip-group theme-interview-creator-chat__composer-attach theme-interview-assessor-aid-peel__attach"
                role="list"
                aria-label="Attached results home"
              >
                <Chip size="sm" selected onDismiss={onDismissAttach}>
                  <Bookmark aria-hidden />
                  <span>{attach.label}</span>
                </Chip>
              </div>
            ) : null
          }
        />
      </div>
    </div>
  )
}
