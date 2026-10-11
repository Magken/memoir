import type {
  BotEditorPayload,
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  ChatStoreSnapshot,
  ComposerSendPayload,
  DmEditorPayload,
  MessagePart,
} from './types'
import { createBotSeed } from './seedBot'
import { createDmSeed } from './seedDm'
import { createId, messagePlainText, nowIso } from './utils'

export type ChatFixtureSurface = 'bot' | 'dm'

function clonePayload(surface: ChatFixtureSurface): ChatStoreSnapshot {
  const seed = surface === 'bot' ? createBotSeed() : createDmSeed()
  return {
    participants: structuredClone(seed.participants),
    conversations: structuredClone(seed.conversations),
    activeConversationId: seed.activeConversationId,
  }
}

function sortConversations(list: ChatConversation[]): ChatConversation[] {
  return [...list].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
    if (Boolean(a.archived) !== Boolean(b.archived)) return a.archived ? 1 : -1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

export function createChatFixtureStore(surface: ChatFixtureSurface) {
  let state = clonePayload(surface)
  /** Cached for useSyncExternalStore — must be referentially stable between emits. */
  let snapshot: ChatStoreSnapshot = {
    ...state,
    conversations: sortConversations(state.conversations),
  }
  const listeners = new Set<() => void>()

  const rebuildSnapshot = () => {
    snapshot = {
      ...state,
      conversations: sortConversations(state.conversations),
    }
  }

  const emit = () => {
    rebuildSnapshot()
    for (const l of listeners) l()
  }

  const getConversation = (id: string | null | undefined) =>
    state.conversations.find((c) => c.id === id) ?? null

  const patchConversation = (id: string, patch: Partial<ChatConversation>) => {
    state = {
      ...state,
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c,
      ),
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot(): ChatStoreSnapshot {
      return snapshot
    },
    reset() {
      state = clonePayload(surface)
      emit()
    },
    loadSnapshot(next: ChatStoreSnapshot) {
      state = {
        participants: structuredClone(next.participants),
        conversations: structuredClone(next.conversations),
        activeConversationId: next.activeConversationId,
      }
      emit()
    },
    toBotPayload(title?: string, model?: string): BotEditorPayload {
      return {
        title,
        model: model ?? 'atlas-demo',
        activeConversationId: state.activeConversationId,
        conversations: structuredClone(state.conversations),
        participants: structuredClone(state.participants),
      }
    },
    toDmPayload(title?: string): DmEditorPayload {
      return {
        title,
        activeConversationId: state.activeConversationId,
        conversations: structuredClone(state.conversations),
        participants: structuredClone(state.participants),
      }
    },
    getActive(): ChatConversation | null {
      return getConversation(state.activeConversationId)
    },
    getParticipant(id: string): ChatParticipant | undefined {
      return state.participants.find((p) => p.id === id)
    },
    listParticipants(): ChatParticipant[] {
      return [...state.participants]
    },
    selectConversation(id: string) {
      if (!getConversation(id)) return false
      state = { ...state, activeConversationId: id }
      const active = getConversation(id)
      if (active && (active.unreadCount ?? 0) > 0) {
        patchConversation(id, { unreadCount: 0, typingParticipantIds: [] })
      }
      emit()
      return true
    },
    createConversation(input: {
      title: string
      kind: ChatConversation['kind']
      participantIds: string[]
      model?: string
      avatarUrl?: string
    }) {
      const id = createId(surface === 'bot' ? 'bot_conv' : 'dm_conv')
      const conversation: ChatConversation = {
        id,
        surface,
        kind: input.kind,
        title: input.title,
        model: input.model,
        participantIds: input.participantIds,
        messages: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
        avatarUrl: input.avatarUrl,
      }
      state = {
        ...state,
        conversations: [conversation, ...state.conversations],
        activeConversationId: id,
      }
      emit()
      return conversation
    },
    renameConversation(id: string, title: string) {
      const next = title.trim()
      if (!next || !getConversation(id)) return false
      patchConversation(id, { title: next })
      emit()
      return true
    },
    setPinned(id: string, pinned: boolean) {
      if (!getConversation(id)) return false
      patchConversation(id, { pinned })
      emit()
      return true
    },
    setArchived(id: string, archived: boolean) {
      if (!getConversation(id)) return false
      patchConversation(id, { archived, pinned: archived ? false : getConversation(id)?.pinned })
      emit()
      return true
    },
    setMuted(id: string, muted: boolean) {
      if (!getConversation(id)) return false
      patchConversation(id, { muted })
      emit()
      return true
    },
    clearConversation(id: string) {
      if (!getConversation(id)) return false
      patchConversation(id, { messages: [] })
      emit()
      return true
    },
    deleteConversation(id: string) {
      if (!getConversation(id)) return false
      const remaining = state.conversations.filter((c) => c.id !== id)
      state = {
        ...state,
        conversations: remaining,
        activeConversationId:
          state.activeConversationId === id ? (remaining[0]?.id ?? null) : state.activeConversationId,
      }
      emit()
      return true
    },
    setDraft(id: string, draft: string) {
      if (!getConversation(id)) return false
      patchConversation(id, { draft })
      emit()
      return true
    },
    setCaption(id: string, caption: string) {
      if (!getConversation(id)) return false
      patchConversation(id, { caption })
      emit()
      return true
    },
    appendMessage(conversationId: string, message: Omit<ChatMessage, 'conversationId'> | ChatMessage) {
      const conv = getConversation(conversationId)
      if (!conv) return null
      const full: ChatMessage = {
        ...message,
        id: message.id || createId('msg'),
        conversationId,
        createdAt: message.createdAt || nowIso(),
      }
      patchConversation(conversationId, {
        messages: [...conv.messages, full],
        draft: '',
        caption: '',
      })
      emit()
      return full
    },
    updateMessage(conversationId: string, messageId: string, patch: Partial<ChatMessage>) {
      const conv = getConversation(conversationId)
      if (!conv) return false
      patchConversation(conversationId, {
        messages: conv.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      })
      emit()
      return true
    },
    appendParts(conversationId: string, messageId: string, parts: MessagePart[]) {
      const conv = getConversation(conversationId)
      if (!conv) return false
      patchConversation(conversationId, {
        messages: conv.messages.map((m) =>
          m.id === messageId ? { ...m, parts: [...m.parts, ...parts] } : m,
        ),
      })
      emit()
      return true
    },
    deleteMessage(conversationId: string, messageId: string) {
      const conv = getConversation(conversationId)
      if (!conv) return false
      patchConversation(conversationId, {
        messages: conv.messages.filter((m) => m.id !== messageId),
      })
      emit()
      return true
    },
    sendUserMessage(conversationId: string, payload: ComposerSendPayload, senderId = 'user_self') {
      const parts: MessagePart[] = []
      if (payload.text.trim()) parts.push({ type: 'text', text: payload.text.trim() })
      if (payload.caption?.trim() && payload.attachments.length) {
        parts.push({ type: 'text', text: payload.caption.trim() })
      }
      for (const attachment of payload.attachments) {
        parts.push({ type: 'attachment', attachment })
      }
      if (parts.length === 0) return null
      return this.appendMessage(conversationId, {
        id: createId('msg'),
        role: surface === 'bot' ? 'user' : 'member',
        senderId,
        parts,
        createdAt: nowIso(),
        delivery: 'sent',
        replyToId: payload.replyToId,
      })
    },
    setTyping(conversationId: string, participantIds: string[]) {
      if (!getConversation(conversationId)) return false
      patchConversation(conversationId, { typingParticipantIds: participantIds })
      emit()
      return true
    },
    setPresence(participantId: string, presence: ChatParticipant['presence']) {
      state = {
        ...state,
        participants: state.participants.map((p) =>
          p.id === participantId ? { ...p, presence } : p,
        ),
      }
      emit()
      return true
    },
    addMembers(conversationId: string, participantIds: string[]) {
      const conv = getConversation(conversationId)
      if (!conv) return false
      const merged = Array.from(new Set([...conv.participantIds, ...participantIds]))
      patchConversation(conversationId, { participantIds: merged })
      emit()
      return true
    },
    removeMembers(conversationId: string, participantIds: string[]) {
      const conv = getConversation(conversationId)
      if (!conv) return false
      patchConversation(conversationId, {
        participantIds: conv.participantIds.filter((id) => !participantIds.includes(id)),
      })
      emit()
      return true
    },
    updateGroup(
      conversationId: string,
      patch: Partial<Pick<ChatConversation, 'title' | 'avatarUrl'>>,
    ) {
      if (!getConversation(conversationId)) return false
      patchConversation(conversationId, patch)
      emit()
      return true
    },
    setDelivery(conversationId: string, messageId: string, delivery: ChatMessage['delivery']) {
      return this.updateMessage(conversationId, messageId, { delivery })
    },
    react(conversationId: string, messageId: string, emoji: string, participantId: string) {
      const conv = getConversation(conversationId)
      if (!conv) return false
      const message = conv.messages.find((m) => m.id === messageId)
      if (!message) return false
      const reactions = [...(message.reactions ?? [])]
      const existing = reactions.find((r) => r.emoji === emoji)
      if (existing) {
        if (existing.participantIds.includes(participantId)) {
          existing.participantIds = existing.participantIds.filter((id) => id !== participantId)
        } else {
          existing.participantIds = [...existing.participantIds, participantId]
        }
      } else {
        reactions.push({ emoji, participantIds: [participantId] })
      }
      return this.updateMessage(conversationId, messageId, {
        reactions: reactions.filter((r) => r.participantIds.length > 0),
      })
    },
    previewText(conversation: ChatConversation): string {
      const last = conversation.messages[conversation.messages.length - 1]
      if (!last) return conversation.draft?.trim() ? `Draft: ${conversation.draft}` : 'No messages yet'
      return messagePlainText(last.parts).slice(0, 120)
    },
  }
}

export type ChatFixtureStore = ReturnType<typeof createChatFixtureStore>
