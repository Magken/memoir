/**
 * Live chat store — same subscribe/getSnapshot surface as fixtureStore,
 * backed by chatApi RPCs (+ optional Realtime refresh).
 */
import * as chatApi from '../chatApi'
import type { ChatInboxRow, ChatMessageRow } from '../chatApi'
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
import { createId, nowIso } from './utils'

export type ChatLiveSurface = 'bot' | 'dm'

function inboxToConversation(row: ChatInboxRow, surface: ChatLiveSurface): ChatConversation {
  return {
    id: row.id,
    surface,
    kind: row.kind === 'bot' ? 'bot' : row.kind === 'group' ? 'group' : 'dm',
    title: row.title || (row.kind === 'direct' ? 'Direct message' : 'Chat'),
    model: row.model,
    participantIds: [],
    messages: [],
    createdAt: row.createdAt ?? nowIso(),
    updatedAt: row.updatedAt ?? row.lastMessageAt ?? nowIso(),
    pinned: row.pinned,
    archived: row.archived,
    muted: row.muted,
    unreadCount: row.unreadCount ?? 0,
    avatarUrl: row.avatarUrl ?? undefined,
    draft: row.draft ?? undefined,
    caption: row.lastMessagePreview ?? undefined,
  }
}

function rowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as ChatMessage['role'],
    senderId: row.senderId ?? 'assistant',
    parts: (row.parts ?? []) as MessagePart[],
    createdAt: row.createdAt,
    replyToId: row.replyToId ?? undefined,
    reactions: row.reactions,
  }
}

export function createChatLiveStore(surface: ChatLiveSurface) {
  let state: ChatStoreSnapshot = {
    participants: [],
    conversations: [],
    activeConversationId: null,
  }
  let snapshot = state
  const listeners = new Set<() => void>()
  let selfId = 'self'
  let channels: Array<{ unsubscribe: () => void }> = []

  const emit = () => {
    snapshot = {
      ...state,
      conversations: [...state.conversations].sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }),
    }
    for (const l of listeners) l()
  }

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
    getSelfId() {
      return selfId
    },
    setSelfId(id: string) {
      selfId = id
    },
    async refreshInbox() {
      await chatApi.heartbeat().catch(() => null)
      const rows = await chatApi.conversationsList({
        includeArchived: true,
      })
      const filtered = rows.filter((r) =>
        surface === 'bot' ? r.kind === 'bot' : r.kind !== 'bot',
      )
      const prevActive = state.activeConversationId
      const mapped = filtered.map((r) => {
        const existing = state.conversations.find((c) => c.id === r.id)
        return {
          ...inboxToConversation(r, surface),
          messages: existing?.messages ?? [],
          participantIds: existing?.participantIds ?? [],
        }
      })
      state = {
        ...state,
        conversations: mapped,
        activeConversationId:
          prevActive && mapped.some((c) => c.id === prevActive)
            ? prevActive
            : (mapped[0]?.id ?? null),
      }
      emit()
      if (state.activeConversationId) {
        await this.selectConversation(state.activeConversationId)
      }
    },
    async selectConversation(id: string) {
      const { rows } = await chatApi.messagesList(id, { limit: 50 })
      const members = await chatApi.membersList(id).catch(() => [])
      const participants: ChatParticipant[] = members.map((m) => ({
        id: m.userId,
        displayName: m.displayName || m.username || m.userId.slice(0, 8),
        handle: m.username ?? undefined,
        avatarUrl: m.avatarUrl ?? undefined,
        role: m.role as ChatParticipant['role'],
      }))
      const messages = rows.map(rowToMessage)
      const maxSeq = rows.reduce((n, r) => Math.max(n, r.seq ?? 0), 0)
      if (maxSeq > 0) {
        await chatApi.markRead(id, maxSeq).catch(() => null)
      }
      const existing = state.conversations.find((c) => c.id === id)
      const stub = existing
        ? null
        : inboxToConversation(
            {
              id,
              kind: 'bot',
              title: 'Interview creator',
              model: undefined,
              pinned: false,
              archived: false,
              muted: false,
              unreadCount: 0,
            } as ChatInboxRow,
            surface,
          )
      state = {
        ...state,
        participants: mergeParticipants(state.participants, participants),
        activeConversationId: id,
        conversations: stub
          ? [
              {
                ...stub,
                messages,
                participantIds: participants.map((p) => p.id),
                unreadCount: 0,
              },
              ...state.conversations,
            ]
          : state.conversations.map((c) =>
              c.id === id
                ? {
                    ...c,
                    messages,
                    participantIds: participants.map((p) => p.id),
                    unreadCount: 0,
                  }
                : c,
            ),
      }
      emit()
      return true
    },
    async sendComposer(conversationId: string, payload: ComposerSendPayload) {
      const parts: MessagePart[] = []
      if (payload.text.trim()) parts.push({ type: 'text', text: payload.text.trim() })
      if (payload.caption?.trim() && payload.attachments.length) {
        parts.push({ type: 'text', text: payload.caption.trim() })
      }
      for (const attachment of payload.attachments) {
        parts.push({ type: 'attachment', attachment })
      }
      if (!parts.length) return null
      const nonce = createId('nonce')
      const fileNodeIds = payload.attachments
        .map((a) => a.id)
        .filter((id) => id.includes('-') && id.length > 20)
      const msg = await chatApi.sendMessage({
        conversationId,
        parts,
        clientNonce: nonce,
        replyToId: payload.replyToId,
        fileNodeIds: fileNodeIds.length ? fileNodeIds : undefined,
      })
      const mapped = rowToMessage(msg)
      patchConversation(conversationId, {
        messages: [...(state.conversations.find((c) => c.id === conversationId)?.messages ?? []), mapped],
        caption: payload.text.slice(0, 160),
        draft: undefined,
      })
      emit()

      if (surface === 'bot') {
        void this.runBot(conversationId, mapped.id)
      }
      return mapped
    },
    async runBot(conversationId: string, sourceMessageId?: string) {
      let assistantId: string | null = null
      await chatApi.runBotStream(
        { conversationId, sourceMessageId },
        (ev) => {
          if (ev.event === 'start') {
            assistantId = createId('asst')
            const draft: ChatMessage = {
              id: assistantId,
              conversationId,
              role: 'assistant',
              senderId: 'bot',
              parts: [{ type: 'markdown', markdown: '' }],
              createdAt: nowIso(),
              streaming: true,
            }
            const conv = state.conversations.find((c) => c.id === conversationId)
            patchConversation(conversationId, {
              messages: [...(conv?.messages ?? []), draft],
            })
            emit()
          }
          if (ev.event === 'delta' && assistantId && 'text' in ev.data) {
            const conv = state.conversations.find((c) => c.id === conversationId)
            const messages = (conv?.messages ?? []).map((m) => {
              if (m.id !== assistantId) return m
              const md = m.parts.find((p) => p.type === 'markdown')
              const next =
                md && md.type === 'markdown'
                  ? md.markdown + String((ev.data as { text: string }).text)
                  : String((ev.data as { text: string }).text)
              return {
                ...m,
                parts: [{ type: 'markdown' as const, markdown: next }],
              }
            })
            patchConversation(conversationId, { messages })
            emit()
          }
          if (ev.event === 'done') {
            void this.selectConversation(conversationId)
          }
          if (ev.event === 'error') {
            console.warn('chat-bot-run', ev.data)
          }
        },
      )
    },
    async newBotChat(title = 'New chat') {
      const row = await chatApi.botCreate(title)
      const conv = inboxToConversation(row, 'bot')
      state = {
        ...state,
        conversations: [conv, ...state.conversations],
        activeConversationId: conv.id,
      }
      emit()
      return conv.id
    },
    async openDirect(otherUserId: string) {
      const row = await chatApi.directOpen(otherUserId)
      await this.refreshInbox()
      await this.selectConversation(row.id)
      return row.id
    },
    setPinned(id: string, pinned: boolean) {
      void chatApi.setMemberSettings(id, { pinned }).then(() => this.refreshInbox())
    },
    setMuted(id: string, muted: boolean) {
      void chatApi.setMemberSettings(id, { muted }).then(() => this.refreshInbox())
    },
    setArchived(id: string, archived: boolean) {
      void chatApi.setMemberSettings(id, { archived }).then(() => this.refreshInbox())
    },
    setDraft(id: string, draft: string) {
      patchConversation(id, { draft })
      emit()
      void chatApi.setMemberSettings(id, { draft })
    },
    async react(conversationId: string, messageId: string, emoji: string) {
      const msg = await chatApi.react(messageId, emoji, true)
      const mapped = rowToMessage(msg)
      const conv = state.conversations.find((c) => c.id === conversationId)
      patchConversation(conversationId, {
        messages: (conv?.messages ?? []).map((m) => (m.id === messageId ? mapped : m)),
      })
      emit()
    },
    async deleteForMe(conversationId: string, messageId: string) {
      await chatApi.deleteMessage(messageId, 'me')
      const conv = state.conversations.find((c) => c.id === conversationId)
      patchConversation(conversationId, {
        messages: (conv?.messages ?? []).filter((m) => m.id !== messageId),
      })
      emit()
    },
    toBotPayload(title?: string, model?: string): BotEditorPayload {
      return {
        title,
        model,
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
    getActive() {
      return state.conversations.find((c) => c.id === state.activeConversationId) ?? null
    },
    dispose() {
      for (const ch of channels) ch.unsubscribe()
      channels = []
    },
  }
}

function mergeParticipants(
  prev: ChatParticipant[],
  next: ChatParticipant[],
): ChatParticipant[] {
  const map = new Map(prev.map((p) => [p.id, p]))
  for (const p of next) map.set(p.id, { ...map.get(p.id), ...p })
  return [...map.values()]
}

export type ChatLiveStore = ReturnType<typeof createChatLiveStore>
