import type { ChatComposerStatus } from '../chatParts/ChatComposer'

type BotChatStatusBarProps = {
  model?: string
  messageCount: number
  status: ChatComposerStatus
  error?: string | null
}

const STATUS_LABEL: Record<ChatComposerStatus, string> = {
  idle: 'Ready',
  sending: 'Thinking…',
  streaming: 'Streaming…',
  failed: 'Failed',
  disabled: 'Ready',
}

export function BotChatStatusBar({ model, messageCount, status, error: _error }: BotChatStatusBarProps) {
  return (
    <div className="theme-bot-chat__status" role="status">
      <span className="type-caption">{model ?? 'atlas-demo'}</span>
      <span className="type-caption type-muted">
        {messageCount} message{messageCount === 1 ? '' : 's'}
      </span>
      <span className="theme-bot-chat__status-spacer" />
      <span className="type-caption type-muted">{STATUS_LABEL[status]}</span>
      <span className="type-caption type-muted">fixture</span>
    </div>
  )
}
