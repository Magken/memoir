import type { ChatConversation, ChatMessage, ChatParticipant } from './types'
import { messagePlainText } from './utils'

export function searchConversations(
  conversations: readonly ChatConversation[],
  participants: readonly ChatParticipant[],
  query: string,
): ChatConversation[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...conversations]
  const byId = new Map(participants.map((p) => [p.id, p]))
  return conversations.filter((c) => {
    if (c.title.toLowerCase().includes(q)) return true
    if (c.messages.some((m) => messagePlainText(m.parts).toLowerCase().includes(q))) return true
    return c.participantIds.some((id) => {
      const p = byId.get(id)
      return Boolean(
        p?.displayName.toLowerCase().includes(q) || p?.handle?.toLowerCase().includes(q),
      )
    })
  })
}

export function searchMessages(messages: readonly ChatMessage[], query: string): ChatMessage[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...messages]
  return messages.filter((m) => messagePlainText(m.parts).toLowerCase().includes(q))
}
