/**
 * Shared error bot-bubble for fixture chats (Bot / DM / Talk / Copilot / Aid).
 */
import type { ChatMessage, ChatParticipant } from './types'
import { messagePlainText } from './utils'

export const CHAT_ERROR_BUBBLE_ID = 'chat-error-bubble'

export function sittingChatErrorCopy(
  raw: string | null | undefined,
  surface: 'talk' | 'assist' | 'aid' | 'bot',
): string {
  const code = String(raw ?? '').trim()
  if (code === 'missing_openai_key') {
    return 'AI is not configured on this environment (missing OpenAI key).'
  }
  if (code === 'not_authenticated') {
    if (surface === 'talk') return 'Could not send this interview turn. Retry, or sign in if this is a live interview.'
    if (surface === 'assist') return 'Could not send this Copilot turn. Retry, or sign in if this is a live interview.'
    if (surface === 'aid') return 'Could not send this Aid turn. Retry, or sign in if this is a live interview.'
    return 'Could not send. Retry, or sign in if this chat needs an account.'
  }
  if (code === 'http_503' || code === 'http_502') {
    return 'The assistant is restarting. Try again in a moment.'
  }
  if (code === 'compose_empty') return 'Could not write a reply. Try again.'
  if (code.includes(' ')) return code
  if (surface === 'talk') return 'Could not get the next interviewer reply. Try again.'
  if (surface === 'aid') return 'Could not get an Aid reply. Try again.'
  if (surface === 'assist') return 'Could not get an assist reply. Try again.'
  return 'Could not send that message. Try again.'
}

export function buildChatErrorMessage(input: {
  text: string
  conversationId: string
  senderId: string
}): ChatMessage {
  return {
    id: CHAT_ERROR_BUBBLE_ID,
    conversationId: input.conversationId,
    role: 'assistant',
    senderId: input.senderId,
    kind: 'error',
    parts: [{ type: 'text', text: input.text }],
    createdAt: new Date().toISOString(),
  }
}

export function lastUserPlainText(
  messages: ReadonlyArray<{ role?: string; parts?: ChatMessage['parts']; text?: string }>,
): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const row = messages[i]
    if (!row) continue
    if (row.role === 'user' || row.role === 'candidate' || row.role === 'member') {
      const fromParts = row.parts?.length ? messagePlainText(row.parts) : ''
      const text = (fromParts || row.text || '').trim()
      if (text) return text
    }
  }
  return ''
}

/** Retry should not append a second copy of the same last candidate turn. */
export function isRepeatOfLastCandidate(
  messages: ReadonlyArray<{ role?: string; text?: string }>,
  text: string,
): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return lastUserPlainText(messages) === trimmed
}

export const CHAT_ERROR_SENDER: ChatParticipant = {
  id: 'chat-error',
  displayName: 'Error',
  role: 'bot',
}
