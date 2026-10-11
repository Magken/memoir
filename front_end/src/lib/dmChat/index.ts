/**
 * DmChat-only fixture helpers — member lookups + canned-reply simulation.
 * Shared chat model/store lives in `lib/chat`; this module stays DM-specific.
 */
import type { ChatConversation, ChatParticipant } from '../chat/types'

const DM_CANNED_REPLIES = [
  'Got it, thanks!',
  'Sounds good 👍',
  "I'm on it now.",
  'Nice, appreciate the update.',
  "Let's sync on this a bit later.",
  'Perfect, that works for me.',
]

export function pickDmCannedReply(): string {
  return DM_CANNED_REPLIES[Math.floor(Math.random() * DM_CANNED_REPLIES.length)]
}

export function getSelfParticipant(participants: readonly ChatParticipant[]): ChatParticipant | undefined {
  return participants.find((p) => p.role === 'self')
}

export function getConversationMembers(
  conversation: ChatConversation,
  participants: readonly ChatParticipant[],
): ChatParticipant[] {
  return conversation.participantIds
    .map((id) => participants.find((p) => p.id === id))
    .filter((p): p is ChatParticipant => Boolean(p))
}

export function getOtherMembers(
  conversation: ChatConversation,
  participants: readonly ChatParticipant[],
  selfId: string,
): ChatParticipant[] {
  return getConversationMembers(conversation, participants).filter((p) => p.id !== selfId)
}

export function getTypingLabel(
  typingParticipantIds: readonly string[] | undefined,
  participants: readonly ChatParticipant[],
): string | null {
  const ids = typingParticipantIds ?? []
  if (ids.length === 0) return null
  const names = ids.map((id) => participants.find((p) => p.id === id)?.displayName ?? 'Someone')
  return `${names.join(', ')} ${ids.length > 1 ? 'are' : 'is'} typing…`
}
