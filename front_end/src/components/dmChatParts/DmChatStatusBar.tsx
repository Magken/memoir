import type { ChatConversation, ChatParticipant } from '../../lib/chat/types'
import { getTypingLabel } from '../../lib/dmChat'
import type { ChatComposerStatus } from '../chatParts/ChatComposer'

type DmChatStatusBarProps = {
  conversation: ChatConversation | null
  participants: readonly ChatParticipant[]
  status: ChatComposerStatus
  error?: string | null
}

export function DmChatStatusBar({ conversation, participants, status, error: _error }: DmChatStatusBarProps) {
  const typingLabel = getTypingLabel(conversation?.typingParticipantIds, participants)
  const memberCount = conversation?.participantIds.length ?? 0
  const messageCount = conversation?.messages.length ?? 0

  return (
    <div className="theme-dm-chat__status" role="status">
      <span className="type-caption type-muted">
        {conversation ? `${memberCount} member${memberCount === 1 ? '' : 's'}` : 'No chat selected'}
      </span>
      <span className="type-caption type-muted">
        {messageCount} message{messageCount === 1 ? '' : 's'}
      </span>
      <span className="theme-dm-chat__status-spacer" />
      {typingLabel ? (
        <span className="type-caption type-muted">{typingLabel}</span>
      ) : (
        <span className="type-caption type-muted">{status === 'sending' ? 'Sending…' : 'Ready'}</span>
      )}
      <span className="type-caption type-muted">fixture</span>
    </div>
  )
}
