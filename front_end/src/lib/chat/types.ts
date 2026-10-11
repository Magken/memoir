/**
 * Shared chat message model — BotChat + DmChat fixture runtime.
 */

export type ChatSurface = 'bot' | 'dm'

export type ChatPresence = 'online' | 'away' | 'offline' | 'unavailable'

export type ChatDeliveryState = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export type ChatParticipantRole = 'member' | 'admin' | 'owner' | 'bot' | 'self'

export type ChatAttachmentKind = 'image' | 'video' | 'pdf' | 'text' | 'unknown'

export type ChatToolState = 'queued' | 'running' | 'success' | 'error'

export type ChatParticipant = {
  id: string
  displayName: string
  handle?: string
  avatarUrl?: string
  initials?: string
  presence?: ChatPresence
  role?: ChatParticipantRole
}

export type ChatAttachment = {
  id: string
  name: string
  kind: ChatAttachmentKind
  mimeType?: string
  sizeBytes?: number
  /** Object URL or fixture static URL */
  url?: string
  posterUrl?: string
  durationMs?: number
  error?: string
}

export type ChatGalleryItem = {
  id: string
  src: string
  alt?: string
  kind?: 'image' | 'video'
  posterUrl?: string
}

export type ChatCardAction = {
  id: string
  label: string
  /** MCT action id to invoke when clicked */
  actionId?: string
  value?: string
}

export type ChatCardPresentation = 'buttons' | 'links' | 'vurify-menu'

/** Cursor-style clarification option inside a planning block. */
export type ChatPlanChoice = {
  id: string
  label: string
  /** Machine meaning — continue folds this into conversation context when chosen. */
  interpretation?: string
}

export type ChatPlanQuestion = {
  id: string
  prompt: string
  /**
   * `single` — stacked radios (A/B/C…) · `multi` — stacked checkboxes ·
   * `text` — one Vurify line for this question only.
   * Choice kinds may also set `allowText` for an optional free-text under the same question.
   */
  kind: 'single' | 'multi' | 'text'
  options?: ChatPlanChoice[]
  /** Placeholder for `kind: 'text'` or for optional free-text when `allowText`. */
  placeholder?: string
  /** When true on single/multi — show a Vurify line under this question’s options. */
  allowText?: boolean
}

export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'markdown'; markdown: string }
  | {
      type: 'thinking'
      text: string
      collapsed?: boolean
      /** Collapsed row label — e.g. Cursor/ChatGPT “Thought for 3s”. */
      summary?: string
      durationMs?: number
      /** Live stream into muted portal before collapse. */
      streaming?: boolean
    }
  /** Inline process tag — Thinking / Editing with optional Elara load underline. */
  | {
      type: 'status'
      label: string
      tone?: 'thinking' | 'editing'
      loading?: boolean
    }
  /** Clarification block — answered summaries in-thread; live asks use the composer Questions sheet. */
  | {
      type: 'planning'
      title?: string
      questions: ChatPlanQuestion[]
      collapsed?: boolean
      answered?: boolean
      summary?: string
      /** Filled after the user submits. */
      answers?: Record<string, string | string[]>
      /** Live board-edit run — lets a reload/reopen rebuild the Questions sheet + time bar. */
      editRunId?: string
      timeoutMs?: number
      deadlineAt?: string
    }
  | { type: 'html'; html: string; title?: string }
  | { type: 'gallery'; items: ChatGalleryItem[]; layout?: 'grid' | 'carousel' | 'host' }
  | {
      type: 'card'
      title: string
      body?: string
      /** `links` = type-link + arrow · `vurify-menu` = VurifyMenuButton · default chips/buttons */
      presentation?: ChatCardPresentation
      actions?: ChatCardAction[]
    }
  /** Hairline rule the bot can insert between speech blocks / actions. */
  | {
      type: 'divider'
      /** Optional centered label (theme-divider-row). */
      label?: string
      tone?: 'default' | 'strong' | 'accent'
    }
  | { type: 'attachment'; attachment: ChatAttachment }
  | {
      type: 'tool'
      name: string
      state: ChatToolState
      request?: string
      result?: string
      error?: string
    }
  | { type: 'system'; text: string }

export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'member'

export type ChatMessage = {
  id: string
  conversationId: string
  role: ChatMessageRole
  senderId: string
  parts: MessagePart[]
  createdAt?: string
  delivery?: ChatDeliveryState
  replyToId?: string
  reactions?: Array<{ emoji: string; participantIds: string[] }>
  streaming?: boolean
  /** Soft labels above the bubble (e.g. Recommendation · Save). */
  tags?: string[]
  /** Bot-aligned send failure — dashed error chrome, not a normal reply. */
  kind?: 'error'
}

export type ChatConversationKind = 'bot' | 'dm' | 'group'

export type ChatConversation = {
  id: string
  surface: ChatSurface
  kind: ChatConversationKind
  title: string
  model?: string
  participantIds: string[]
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  pinned?: boolean
  archived?: boolean
  muted?: boolean
  unreadCount?: number
  avatarUrl?: string
  draft?: string
  caption?: string
  typingParticipantIds?: string[]
}

export type ChatStoreSnapshot = {
  participants: ChatParticipant[]
  conversations: ChatConversation[]
  activeConversationId: string | null
}

export type StagedAttachment = ChatAttachment & {
  /** Local File when staged from composer */
  file?: File
}

export type ComposerSendPayload = {
  text: string
  attachments: StagedAttachment[]
  caption?: string
  replyToId?: string
}

export type BotEditorPayload = {
  title?: string
  model?: string
  activeConversationId: string | null
  conversations: ChatConversation[]
  participants: ChatParticipant[]
}

export type DmEditorPayload = {
  title?: string
  activeConversationId: string | null
  conversations: ChatConversation[]
  participants: ChatParticipant[]
}
