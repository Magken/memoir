import { ArrowDown } from 'lucide-react'
import { useMemo, type RefObject } from 'react'
import { daySeparatorLabel, sameDay } from '../../lib/chat/time'
import type { ChatConversation, ChatParticipant } from '../../lib/chat/types'
import { messagePlainText } from '../../lib/chat/utils'
import { getSelfParticipant } from '../../lib/dmChat'
import { Button } from '../Button'
import { ThemeScroll } from '../ThemeScroll'
import { ChatBubble, ChatErrorBubble } from '../chatParts/ChatBubble'

type DmChatThreadProps = {
  conversation: ChatConversation | null
  participants: readonly ChatParticipant[]
  onCopy?: (messageId: string) => void
  onReply?: (messageId: string, preview: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onDelete?: (messageId: string) => void
  unreadBelow?: number
  onJumpToLatest?: () => void
  viewportRef?: RefObject<HTMLDivElement | null>
  className?: string
  errorText?: string | null
  onRetryError?: () => void
}

export function DmChatThread({
  conversation,
  participants,
  onCopy,
  onReply,
  onReact,
  onDelete,
  unreadBelow = 0,
  onJumpToLatest,
  viewportRef,
  className = '',
  errorText = null,
  onRetryError,
}: DmChatThreadProps) {
  const participantsById = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])
  const messagesById = useMemo(
    () => new Map((conversation?.messages ?? []).map((m) => [m.id, m])),
    [conversation],
  )
  const selfId = useMemo(() => getSelfParticipant(participants)?.id, [participants])
  const messages = conversation?.messages ?? []

  return (
    <div className={['theme-dm-chat__thread', className].filter(Boolean).join(' ')}>
      <ThemeScroll rail="nano" className="theme-dm-chat__thread-scroll" viewportRef={viewportRef}>
        <div className="theme-dm-chat__thread-inner">
          {!conversation ? (
            <div className="theme-dm-chat__empty">
              <p className="type-body-sm type-muted">Select a chat to view messages.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="theme-dm-chat__empty">
              <p className="type-body-sm type-muted">No messages yet — say hello.</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const previous = messages[index - 1]
              const showDay =
                !previous || !sameDay(previous.createdAt ?? '', message.createdAt ?? '')
              const align = message.senderId === selfId ? 'end' : 'start'
              const replySource = message.replyToId ? messagesById.get(message.replyToId) : undefined
              const replyPreview = replySource
                ? `${participantsById.get(replySource.senderId)?.displayName ?? 'Someone'}: ${messagePlainText(
                    replySource.parts,
                  ).slice(0, 80)}`
                : null

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
                    replyPreview={replyPreview}
                    onCopy={onCopy ? () => onCopy(message.id) : undefined}
                    onReply={onReply ? () => onReply(message.id, messagePlainText(message.parts).slice(0, 80)) : undefined}
                    onReact={onReact ? (emoji) => onReact(message.id, emoji) : undefined}
                    onDelete={onDelete ? () => onDelete(message.id) : undefined}
                  />
                </div>
              )
            })
          )}
          {errorText ? (
            <ChatErrorBubble
              text={errorText}
              conversationId={conversation?.id ?? 'chat-error'}
              onRetry={onRetryError}
            />
          ) : null}
        </div>
      </ThemeScroll>
      {unreadBelow > 0 ? (
        <Button
          icon={ArrowDown}
          size="xs"
          variant="action"
          labelAnim={false}
          className="theme-chat-jump"
          onClick={onJumpToLatest}
        >
          {unreadBelow} new
        </Button>
      ) : null}
    </div>
  )
}
