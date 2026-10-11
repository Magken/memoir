import { ArrowDown } from 'lucide-react'
import { useMemo, type ReactNode, type RefObject } from 'react'
import { BOT_SUGGESTED_PROMPTS } from '../../lib/chat/seedBot'
import { daySeparatorLabel, sameDay } from '../../lib/chat/time'
import type { ChatConversation, ChatParticipant } from '../../lib/chat/types'
import { findLivePlanningRef } from '../../lib/chat/utils'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { ThemeScroll } from '../ThemeScroll'
import { ChatBubble, ChatErrorBubble } from '../chatParts/ChatBubble'

type BotChatThreadProps = {
  conversation: ChatConversation | null
  participants: readonly ChatParticipant[]
  onCopy?: (messageId: string) => void
  onRegenerate?: (messageId: string) => void
  onCardAction?: (actionId: string, value?: string) => void | Promise<void>
  onSuggest?: (prompt: string) => void
  onPlanningReopen?: (messageId: string, partIndex: number) => void
  unreadBelow?: number
  /** Show jump control when scrolled away from bottom (board peel). */
  showJumpToLatest?: boolean
  onJumpToLatest?: () => void
  viewportRef?: RefObject<HTMLDivElement | null>
  className?: string
  /** Creator-2 peel — quieter bubbles, no day pills by default. */
  chrome?: 'default' | 'board'
  /** Appended inside the scroll viewport (e.g. typing indicator). */
  footer?: ReactNode
  /** Prepended inside the scroll viewport, above the day/messages (e.g. history loading row). */
  header?: ReactNode
  /** Observed by the caller's IntersectionObserver to trigger older-history lazy load. */
  topSentinelRef?: RefObject<HTMLDivElement | null>
  /** Day chips between messages — default true; stage assist turns them off. */
  showDaySeparators?: boolean
  /** Board slot below the name/time divider (Aid home Chip). */
  boardTrailFor?: (message: ChatConversation['messages'][number]) => ReactNode
  errorText?: string | null
  onRetryError?: () => void
}

export function BotChatThread({
  conversation,
  participants,
  onCopy,
  onRegenerate,
  onCardAction,
  onSuggest,
  onPlanningReopen,
  unreadBelow = 0,
  showJumpToLatest = false,
  onJumpToLatest,
  viewportRef,
  className = '',
  chrome = 'default',
  footer,
  header,
  topSentinelRef,
  showDaySeparators = true,
  boardTrailFor,
  errorText = null,
  onRetryError,
}: BotChatThreadProps) {
  const participantsById = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  )
  const latestAssistantId = useMemo(() => {
    const messages = conversation?.messages
    if (!messages?.length) return null
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'assistant') return messages[i]!.id
    }
    return null
  }, [conversation?.messages])
  const livePlanning = useMemo(
    () => findLivePlanningRef(conversation?.messages ?? []),
    [conversation?.messages],
  )
  const messages = conversation?.messages ?? []
  const board = chrome === 'board'
  const showJump = showJumpToLatest || unreadBelow > 0

  return (
    <div className={['theme-bot-chat__thread', className].filter(Boolean).join(' ')}>
      <ThemeScroll
        rail="nano"
        scrollClouds={board}
        className="theme-bot-chat__thread-scroll"
        viewportRef={viewportRef}
      >
        <div className="theme-bot-chat__thread-inner">
          {header}
          <div ref={topSentinelRef} className="theme-bot-chat__thread-top-sentinel" aria-hidden />
          {messages.length === 0 ? (
            board ? (
              <div className="theme-bot-chat__empty theme-bot-chat__empty--board" aria-hidden />
            ) : (
              <div className="theme-bot-chat__empty">
                <p className="type-body-sm type-muted">Ask Atlas anything to get started.</p>
                <div className="theme-bot-chat__prompts">
                  {BOT_SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="theme-bot-chat__prompt type-caption"
                      onClick={() => onSuggest?.(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            messages.map((message, index) => {
              const previous = messages[index - 1]
              const showDay =
                showDaySeparators &&
                (!previous || !sameDay(previous.createdAt ?? '', message.createdAt ?? ''))
              const align = message.role === 'user' ? 'end' : 'start'
              return (
                <div key={message.id}>
                  {showDay ? (
                    <div className="theme-chat-day">
                      <span className="theme-chat-day__label type-caption">
                        {daySeparatorLabel(message.createdAt ?? '')}
                      </span>
                    </div>
                  ) : null}
                  <ChatBubble
                    message={message}
                    sender={participantsById.get(message.senderId)}
                    align={align}
                    chrome={chrome}
                    fogDefaultOpen={
                      message.role === 'assistant' && message.id === latestAssistantId
                    }
                    onCopy={board ? undefined : () => onCopy?.(message.id)}
                    onRegenerate={
                      board || message.role !== 'assistant'
                        ? undefined
                        : () => onRegenerate?.(message.id)
                    }
                    onCardAction={onCardAction}
                    onPlanningReopen={
                      onPlanningReopen
                        ? (partIndex) => onPlanningReopen(message.id, partIndex)
                        : undefined
                    }
                    livePlanningPartIndex={
                      livePlanning?.messageId === message.id ? livePlanning.partIndex : null
                    }
                    boardTrail={boardTrailFor?.(message)}
                  />
                </div>
              )
            })
          )}
          {footer}
          {errorText ? (
            <ChatErrorBubble
              text={errorText}
              chrome={chrome}
              conversationId={conversation?.id ?? 'chat-error'}
              onRetry={onRetryError}
            />
          ) : null}
        </div>
      </ThemeScroll>
      {showJump ? (
        board ? (
          <IconButton
            icon={ArrowDown}
            size="sm"
            variant="ghost"
            aria-label="Scroll to latest"
            className="theme-chat-jump theme-chat-jump--board"
            onClick={onJumpToLatest}
          />
        ) : (
          <Button
            icon={ArrowDown}
            size="xs"
            variant="action"
            labelAnim={false}
            className="theme-chat-jump"
            onClick={onJumpToLatest}
          >
            {unreadBelow > 0 ? `${unreadBelow} new` : 'Latest'}
          </Button>
        )
      ) : null}
    </div>
  )
}

export type { BotChatThreadProps }
