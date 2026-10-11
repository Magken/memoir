/**
 * In-page Talk discussion — Creator board ChatBubble + Markdown path on the page itself.
 * Page ThemeScroll is the chat scroll; page-tab composer sticks to the bottom of the page.
 */
import { Copy, Download, MoreHorizontal, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { CascadeMenuButton } from './CascadeMenuButton'
import { ChatBubble, ChatErrorBubble } from './chatParts/ChatBubble'
import { InterviewBoardComposer } from './InterviewBoardComposer'
import type { TalkMenuAction, TalkRuntimeView } from '../lib/interviewRunApi'
import { lastUserPlainText, sittingChatErrorCopy } from '../lib/chat/errorBubble'
import { bindTelemetryHost } from '../lib/interviewRunApi/sessionTelemetry'
import { ensureTalkMarkdownEmphasisSpacing } from '../lib/interviewRunApi/stripToFinalAsk'
import { epochMsToIso, messageCreatedAtIso } from '../lib/chat/time'
import type { CascadeMenuItem } from '../lib/menus/cascadeMenu'
import type { ChatMessage, ChatParticipant } from '../lib/chat/types'

type InterviewTalkPageChatProps = {
  talk: TalkRuntimeView
  /** Gate intro copy seeded at top of scroll (part of chat history). */
  introLead?: string | null
  /** Interview page ThemeScroll viewport — stick chat to bottom with smooth scroll. */
  scrollViewportRef?: RefObject<HTMLElement | null>
  onSend?: (text: string) => void
  onDraftChange?: (draft: string) => void
  onMenu?: (action: TalkMenuAction) => void
  className?: string
  debug?: boolean
}

const TALK_MENU_ITEMS: CascadeMenuItem[] = [
  { id: 'copy_response_json', label: 'Copy response JSON', icon: Copy },
  { id: 'download_response_json', label: 'Download response JSON', icon: Download },
  { id: 'download_editor_tapes', label: 'Download editor tapes', icon: Download },
  { id: 'reset_talk', label: 'Reset this conversation', icon: RotateCcw },
]

const TALK_CONV_ID = 'interview-talk-page'
/** Clear sticky composer + pad when scrolling the last bubble into view. */
const SCROLL_BOTTOM_PAD_PX = 28

function prefersReduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isoFromTalkAt(at: number): string {
  return epochMsToIso(at)
}

function buildTalkParticipants(personaName: string): ChatParticipant[] {
  return [
    {
      id: 'talk-bot',
      displayName: personaName || 'Interviewer',
      role: 'bot',
    },
    {
      id: 'talk-candidate',
      displayName: 'You',
      role: 'member',
    },
  ]
}

function buildTalkMessages(input: {
  talk: TalkRuntimeView
  introLead?: string | null
}): ChatMessage[] {
  const messages: ChatMessage[] = []
  const lead = input.introLead?.trim() || ''
  const firstAssistant =
    input.talk.state.messages.find((m) => m.role === 'assistant')?.text?.trim() || ''
  const showLead =
    Boolean(lead) &&
    (!firstAssistant || (lead.length > 24 && !firstAssistant.includes(lead.slice(0, 40))))

  if (showLead) {
    messages.push({
      id: `talk-intro-${input.talk.context.topicId}`,
      conversationId: TALK_CONV_ID,
      role: 'assistant',
      senderId: 'talk-bot',
      createdAt: isoFromTalkAt(input.talk.state.startedAt),
      parts: [{ type: 'markdown', markdown: ensureTalkMarkdownEmphasisSpacing(lead) }],
    })
  }

  for (const msg of input.talk.state.messages) {
    const isCandidate = msg.role === 'candidate'
    const streaming =
      Boolean(input.talk.busy) &&
      !isCandidate &&
      msg.id === input.talk.state.messages[input.talk.state.messages.length - 1]?.id
    messages.push({
      id: msg.id,
      conversationId: TALK_CONV_ID,
      role: isCandidate ? 'user' : 'assistant',
      senderId: isCandidate ? 'talk-candidate' : 'talk-bot',
      createdAt: messageCreatedAtIso(msg.at),
      streaming: streaming || undefined,
      parts: [{ type: 'markdown', markdown: ensureTalkMarkdownEmphasisSpacing(msg.text) }],
    })
  }

  return messages
}

/**
 * Talk chat rendered on the interview page (not a nested scroll widget).
 */
export function InterviewTalkPageChat({
  talk,
  introLead = null,
  scrollViewportRef,
  onSend,
  onDraftChange,
  onMenu,
  className = '',
  debug = false,
}: InterviewTalkPageChatProps) {
  const endRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const primedScroll = useRef(false)
  const persona = talk.context.persona.name?.trim() || 'Interviewer'
  const draft = talk.state.draft
  const busy = Boolean(talk.busy)
  const locked = Boolean(talk.canPass)
  const placeholder = `Chat with ${persona}…`

  const participants = useMemo(() => buildTalkParticipants(persona), [persona])
  const participantsById = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  )
  const messages = useMemo(
    () => buildTalkMessages({ talk, introLead }),
    [talk, introLead],
  )
  const latestAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'assistant') return messages[i]!.id
    }
    return null
  }, [messages])

  const lastAssistant = talk.state.messages[talk.state.messages.length - 1]
  const showThinking =
    busy &&
    !(lastAssistant?.role === 'assistant' && String(lastAssistant.text || '').trim())

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    return bindTelemetryHost(el, 'talk')
  }, [talk.context.phaseId])

  const busyMessage = useMemo<ChatMessage>(
    () => ({
      id: 'talk-busy',
      conversationId: TALK_CONV_ID,
      role: 'assistant',
      senderId: 'talk-bot',
      createdAt: new Date().toISOString(),
      streaming: true,
      parts: [{ type: 'status', label: 'Thinking', tone: 'thinking', loading: true }],
    }),
    [],
  )

  const lastAssistantText =
    lastAssistant?.role === 'assistant' ? String(lastAssistant.text || '') : ''

  const scrollChatToEnd = (behavior: ScrollBehavior) => {
    const viewport = scrollViewportRef?.current
    const end = endRef.current
    if (viewport) {
      const top = Math.max(0, viewport.scrollHeight - viewport.clientHeight + SCROLL_BOTTOM_PAD_PX)
      viewport.scrollTo({ top, behavior })
      return
    }
    end?.scrollIntoView({ behavior, block: 'end' })
  }

  // Init + turns: smooth stick-to-bottom on the page ThemeScroll (not a teleport).
  useEffect(() => {
    if (messages.length === 0 && !busy) return
    const reduced = prefersReduceMotion()
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth'
    const delay = primedScroll.current ? (reduced ? 0 : 48) : reduced ? 40 : 320
    let raf = 0
    const id = window.setTimeout(() => {
      raf = window.requestAnimationFrame(() => {
        scrollChatToEnd(behavior)
        primedScroll.current = true
      })
    }, delay)
    return () => {
      window.clearTimeout(id)
      if (raf) window.cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scrollViewportRef is stable
  }, [messages.length, busy, lastAssistantText])

  if (debug) {
    console.debug('[InterviewTalkPageChat]', { messages: messages.length, busy, persona })
  }

  return (
    <div
      ref={hostRef}
      className={[
        'theme-interview-talk-page',
        'theme-interview-creator-chat',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Discussion"
      data-talk-flush-assistant="true"
    >
      <div className="theme-interview-talk-page__head">
        <p className="type-caption type-muted mb-0 theme-interview-talk-page__depth">
          {talk.depthLabel}
        </p>
        <CascadeMenuButton
          label="Chat menu"
          icon={MoreHorizontal}
          iconOnly
          size="xs"
          variant="ghost"
          menuSize="compact"
          scrollRail="hidden"
          triggerLabelAnim={false}
          items={TALK_MENU_ITEMS}
          onSelect={(id) => {
            if (
              id === 'copy_response_json' ||
              id === 'download_response_json' ||
              id === 'download_editor_tapes' ||
              id === 'reset_talk'
            ) {
              onMenu?.(id)
            }
          }}
        />
      </div>

      <div className="theme-interview-talk-page__thread theme-bot-chat__thread-inner">
        {messages.map((message) => {
          const align = message.role === 'user' ? 'end' : 'start'
          return (
            <div
              key={message.id}
              className={[
                'theme-interview-talk-page__row',
                align === 'end'
                  ? 'theme-interview-talk-page__row--end'
                  : 'theme-interview-talk-page__row--start',
              ].join(' ')}
            >
              <ChatBubble
                message={message}
                sender={participantsById.get(message.senderId)}
                align={align}
                chrome="board"
                fogDefaultOpen={
                  message.role === 'assistant' && message.id === latestAssistantId
                }
              />
            </div>
          )
        })}

        {showThinking ? (
          <div className="theme-interview-talk-page__typing-row theme-interview-talk-page__row theme-interview-talk-page__row--start">
            <ChatBubble
              message={busyMessage}
              sender={participants[0]}
              align="start"
              chrome="board"
              fogDefaultOpen
            />
          </div>
        ) : null}

        {talk.error ? (
          <div className="theme-interview-talk-page__row theme-interview-talk-page__row--start">
            <ChatErrorBubble
              text={sittingChatErrorCopy(talk.error, 'talk')}
              chrome="board"
              sender={participants[0]}
              conversationId={TALK_CONV_ID}
              onRetry={() => {
                const text = lastUserPlainText(
                  talk.state.messages.map((m) => ({ role: m.role, text: m.text })),
                )
                if (text) onSend?.(text)
              }}
            />
          </div>
        ) : null}

        <div ref={endRef} className="theme-interview-talk-page__end" aria-hidden />
      </div>

      <div className="theme-interview-creator-chat__composer-stack theme-interview-talk-page__composer-stack">
        <InterviewBoardComposer
          variant="talk"
          telemetrySurface="talk"
          draft={draft}
          onDraftChange={(value) => onDraftChange?.(value)}
          onSend={(payload) => {
            const text = (payload.text ?? draft).trim()
            if (!text || locked || busy) return
            onSend?.(text)
          }}
          placeholder={placeholder}
          lockedHint="Ready — use Next"
          busy={busy}
          locked={locked}
        />
      </div>
    </div>
  )
}
