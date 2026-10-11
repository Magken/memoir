import {
  Archive,
  ArchiveRestore,
  Eraser,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  createChatFixtureStore,
  createId,
  createStickController,
  messagePlainText,
  lastUserPlainText,
  searchConversations,
  type ChatCardAction,
  type ChatGalleryItem,
  type ChatToolState,
  type ComposerSendPayload,
  type MessagePart,
} from '../lib/chat'
import { BOT_DEFAULT_REPLY, streamText, type StreamController } from '../lib/botChat/stream'
import { downloadExportedContext } from '../lib/editorContext/importExportManager'
import type {
  BotEditorPayload,
  EditorActionRequest,
  EditorActionResult,
  EditorRuntimeHandle,
} from '../lib/editorContext/types'
import type { CascadeMenuItem } from '../lib/menus/cascadeMenu'
import { CascadeMenuButton } from './CascadeMenuButton'
import { IconButton } from './IconButton'
import { Tooltip } from './Tooltip'
import { EditorExportMenu } from './editorContextParts/EditorExportMenu'
import { EditorTitleField } from './editorContextParts/EditorTitleField'
import { EditorTitlebar } from './editorContextParts/EditorTitlebar'
import { ChatComposer, focusChatComposer } from './chatParts/ChatComposer'
import { BotChatSidebar } from './botChatParts/BotChatSidebar'
import { BotChatStatusBar } from './botChatParts/BotChatStatusBar'
import { BotChatThread } from './botChatParts/BotChatThread'

import { LiveBotChat } from './LiveBotChat'

export type BotChatVariant = 'workbench' | 'showcase' | 'embed'

export type BotChatSource = { mode: 'fixture' } | { mode: 'live' }

type BotChatProps = {
  className?: string
  variant?: BotChatVariant
  initialTitle?: string
  model?: string
  /** Default fixture. Live mode delegates to LiveBotChat + chatApi. */
  source?: BotChatSource
}

export type BotChatHandle = EditorRuntimeHandle

const SELF_ID = 'user_self'

const MARKDOWN_REPLY = [
  "Sure — here's a markdown pass:",
  '',
  '- **Bold**, *italic*, and `inline code`',
  '- A short list with a [link](https://example.com)',
  '',
  '```ts',
  'export function greet(name: string) {',
  "  return `Hello ${name}`",
  '}',
  '```',
  '',
  '| Feature | Status |',
  '| --- | --- |',
  '| Streaming | done |',
  '| Markdown | done |',
].join('\n')

const HTML_REPLY_TEXT = "Here's a sandboxed HTML card:"
const HTML_REPLY_HTML = [
  '<section class="chat-html-card">',
  '  <h3>Fixture HTML block</h3>',
  '  <p>Rendered through the sanitizer allowlist with a <a href="https://example.com">safe link</a>.</p>',
  '</section>',
].join('\n')

const GALLERY_REPLY_TEXT = "Here's a quick gallery:"
const DEFAULT_GALLERY_ITEMS: ChatGalleryItem[] = [
  { id: 'g1', src: 'https://picsum.photos/seed/botchat1/640/400', alt: 'Preview 1' },
  { id: 'g2', src: 'https://picsum.photos/seed/botchat2/640/400', alt: 'Preview 2' },
  { id: 'g3', src: 'https://picsum.photos/seed/botchat3/640/400', alt: 'Preview 3' },
]

const TOOL_REPLY_TEXT = 'Running a couple of fixture tools:'
const DEFAULT_TOOL_PARTS: MessagePart[] = [
  {
    type: 'tool',
    name: 'search_docs',
    state: 'success',
    request: '{"q":"demo"}',
    result: '{"hits":2}',
  },
  {
    type: 'tool',
    name: 'render_preview',
    state: 'running',
    request: '{"target":"canvas"}',
  },
]

function pickReplyKind(text: string): 'markdown' | 'html' | 'gallery' | 'tool' | 'default' {
  const lower = text.toLowerCase()
  if (lower.includes('gallery')) return 'gallery'
  if (lower.includes('html')) return 'html'
  if (lower.includes('tool')) return 'tool'
  if (lower.includes('markdown')) return 'markdown'
  return 'default'
}

function replyBodyFor(kind: ReturnType<typeof pickReplyKind>): { text: string; extraParts?: MessagePart[] } {
  switch (kind) {
    case 'markdown':
      return { text: MARKDOWN_REPLY }
    case 'html':
      return { text: HTML_REPLY_TEXT, extraParts: [{ type: 'html', html: HTML_REPLY_HTML, title: 'Safe HTML card' }] }
    case 'gallery':
      return { text: GALLERY_REPLY_TEXT, extraParts: [{ type: 'gallery', layout: 'grid', items: DEFAULT_GALLERY_ITEMS }] }
    case 'tool':
      return { text: TOOL_REPLY_TEXT, extraParts: DEFAULT_TOOL_PARTS }
    default:
      return { text: BOT_DEFAULT_REPLY }
  }
}

function parseJsonOr<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function buildAppendedPart(actionId: string, value: string | undefined): MessagePart | null {
  switch (actionId) {
    case 'bot.action.append-markdown':
      return { type: 'markdown', markdown: value ?? '' }
    case 'bot.action.append-html':
      return { type: 'html', html: value ?? HTML_REPLY_HTML }
    case 'bot.action.append-gallery':
      return {
        type: 'gallery',
        layout: 'grid',
        items: parseJsonOr<ChatGalleryItem[]>(value, DEFAULT_GALLERY_ITEMS),
      }
    case 'bot.action.append-card': {
      const card = parseJsonOr<{ title: string; body?: string; actions?: ChatCardAction[] }>(value, {
        title: value || 'Card',
      })
      return { type: 'card', title: card.title, body: card.body, actions: card.actions }
    }
    case 'bot.action.append-tool-state': {
      const tool = parseJsonOr<{
        name: string
        state: ChatToolState
        request?: string
        result?: string
        error?: string
      }>(value, { name: value || 'tool', state: 'success' })
      return {
        type: 'tool',
        name: tool.name,
        state: tool.state,
        request: tool.request,
        result: tool.result,
        error: tool.error,
      }
    }
    default:
      return null
  }
}

export const BotChat = forwardRef<BotChatHandle, BotChatProps>(function BotChat(
  {
    className = '',
    variant = 'workbench',
    initialTitle = 'Bot chats',
    model = 'atlas-demo',
    source = { mode: 'fixture' },
  },
  ref,
) {
  if (source.mode === 'live') {
    return <LiveBotChat className={className} />
  }

  return (
    <BotChatFixture
      className={className}
      variant={variant}
      initialTitle={initialTitle}
      model={model}
      ref={ref}
    />
  )
})

const BotChatFixture = forwardRef<BotChatHandle, Omit<BotChatProps, 'source'>>(function BotChatFixture(
  { className = '', variant = 'workbench', initialTitle = 'Bot chats', model = 'atlas-demo' },
  ref,
) {
  const storeRef = useRef(createChatFixtureStore('bot'))
  const store = storeRef.current
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)

  const [workbenchTitle, setWorkbenchTitle] = useState(initialTitle)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [composerStatus, setComposerStatus] = useState<'idle' | 'sending' | 'streaming' | 'failed' | 'disabled'>(
    'idle',
  )
  const [composerError, setComposerError] = useState<string | null>(null)
  const [unreadBelow, setUnreadBelow] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(createStickController(viewportRef))
  const streamControllerRef = useRef<StreamController | null>(null)
  const messageCountRef = useRef(0)

  const activeConversation = useMemo(
    () => snapshot.conversations.find((c) => c.id === snapshot.activeConversationId) ?? null,
    [snapshot],
  )

  const botParticipantId = useMemo(
    () => snapshot.participants.find((p) => p.role === 'bot')?.id ?? 'bot_atlas',
    [snapshot],
  )

  const filteredConversations = useMemo(
    () => searchConversations(snapshot.conversations, snapshot.participants, searchQuery),
    [snapshot, searchQuery],
  )

  useEffect(() => {
    messageCountRef.current = activeConversation?.messages.length ?? 0
    stickRef.current.jumpToLatest()
    setUnreadBelow(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset stick state on conversation switch only
  }, [activeConversation?.id])

  useEffect(() => {
    const count = activeConversation?.messages.length ?? 0
    if (count > messageCountRef.current) {
      const state = stickRef.current.onIncoming(count - messageCountRef.current)
      setUnreadBelow(state.unreadBelow)
    }
    messageCountRef.current = count
  }, [activeConversation?.messages.length])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const handleScroll = () => {
      const state = stickRef.current.onScroll()
      setUnreadBelow(state.unreadBelow)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const runAssistantReply = useCallback(
    (conversationId: string, userText: string, targetMessageId?: string) => {
      const kind = pickReplyKind(userText)
      const { text: fullText, extraParts } = replyBodyFor(kind)
      const messageId = targetMessageId ?? createId('msg')

      if (targetMessageId) {
        store.updateMessage(conversationId, targetMessageId, {
          parts: [{ type: 'markdown', markdown: '' }],
          streaming: true,
        })
      } else {
        store.appendMessage(conversationId, {
          id: messageId,
          role: 'assistant',
          senderId: botParticipantId,
          parts: [{ type: 'markdown', markdown: '' }],
          streaming: true,
        })
      }

      setComposerStatus('streaming')
      setComposerError(null)
      const controller = streamText(fullText, (partial) => {
        store.updateMessage(conversationId, messageId, { parts: [{ type: 'markdown', markdown: partial }] })
      })
      streamControllerRef.current = controller
      void controller.done.then((finalText) => {
        streamControllerRef.current = null
        store.updateMessage(conversationId, messageId, {
          parts: [{ type: 'markdown', markdown: finalText }],
          streaming: false,
        })
        if (extraParts?.length) store.appendParts(conversationId, messageId, extraParts)
        setComposerStatus('idle')
      })
    },
    [botParticipantId, store],
  )

  const regenerateMessage = useCallback(
    (conversationId: string, messageId: string): boolean => {
      const conv = store.getSnapshot().conversations.find((c) => c.id === conversationId)
      if (!conv) return false
      const index = conv.messages.findIndex((m) => m.id === messageId)
      if (index === -1) return false
      let userText = ''
      for (let i = index - 1; i >= 0; i -= 1) {
        if (conv.messages[i].role === 'user') {
          userText = messagePlainText(conv.messages[i].parts)
          break
        }
      }
      runAssistantReply(conversationId, userText || messagePlainText(conv.messages[index].parts), messageId)
      return true
    },
    [runAssistantReply, store],
  )

  const retryMessage = useCallback(
    (conversationId: string, messageId: string): boolean => {
      const conv = store.getSnapshot().conversations.find((c) => c.id === conversationId)
      const message = conv?.messages.find((m) => m.id === messageId)
      if (!conv || !message) return false
      if (message.role === 'user') {
        store.updateMessage(conversationId, messageId, { delivery: 'sent' })
        runAssistantReply(conversationId, messagePlainText(message.parts))
        return true
      }
      return regenerateMessage(conversationId, messageId)
    },
    [regenerateMessage, runAssistantReply, store],
  )

  const ensureActiveConversation = useCallback((): string => {
    const snap = store.getSnapshot()
    if (snap.activeConversationId) return snap.activeConversationId
    const conv = store.createConversation({
      title: 'New chat',
      kind: 'bot',
      participantIds: [SELF_ID, botParticipantId],
      model,
    })
    return conv.id
  }, [botParticipantId, model, store])

  const handleSend = useCallback(
    (payload: ComposerSendPayload, conversationIdOverride?: string) => {
      const conversationId = conversationIdOverride ?? ensureActiveConversation()
      setComposerStatus('sending')
      store.sendUserMessage(conversationId, payload)
      runAssistantReply(conversationId, payload.text)
    },
    [ensureActiveConversation, runAssistantReply, store],
  )

  const handleStop = useCallback(() => {
    streamControllerRef.current?.stop()
    streamControllerRef.current = null
    setComposerStatus('idle')
  }, [])

  const handleNewChat = useCallback(() => {
    store.createConversation({
      title: 'New chat',
      kind: 'bot',
      participantIds: [SELF_ID, botParticipantId],
      model,
    })
  }, [botParticipantId, model, store])

  const getContext = useCallback(
    (): BotEditorPayload => store.toBotPayload(workbenchTitle, model),
    [model, store, workbenchTitle],
  )

  const loadContext = useCallback(
    (payload: unknown) => {
      const next = payload as BotEditorPayload
      if (next.title) setWorkbenchTitle(next.title)
      store.loadSnapshot({
        participants: next.participants,
        conversations: next.conversations,
        activeConversationId: next.activeConversationId,
      })
    },
    [store],
  )

  const invokeAction = useCallback(
    (request: EditorActionRequest): EditorActionResult => {
      const { actionId, value, targetId } = request
      const snap = store.getSnapshot()
      const activeId = targetId ?? snap.activeConversationId

      switch (actionId) {
        case 'bot.action.new-chat': {
          const conv = store.createConversation({
            title: 'New chat',
            kind: 'bot',
            participantIds: [SELF_ID, botParticipantId],
            model,
          })
          return { ok: true, actionId, data: { conversationId: conv.id } }
        }
        case 'bot.action.select-chat': {
          const id = targetId ?? value
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          return { ok: store.selectConversation(id), actionId }
        }
        case 'bot.action.rename': {
          const id = targetId ?? activeId
          if (!id || !value) return { ok: false, actionId, error: 'Missing conversation id or title' }
          return { ok: store.renameConversation(id, value), actionId }
        }
        case 'bot.action.pin': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          const conv = snap.conversations.find((c) => c.id === id)
          const next = value ? value === 'true' : !conv?.pinned
          return { ok: store.setPinned(id, next), actionId }
        }
        case 'bot.action.archive': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          const conv = snap.conversations.find((c) => c.id === id)
          const next = value ? value === 'true' : !conv?.archived
          return { ok: store.setArchived(id, next), actionId }
        }
        case 'bot.action.clear': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          return { ok: store.clearConversation(id), actionId }
        }
        case 'bot.action.delete': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          return { ok: store.deleteConversation(id), actionId }
        }
        case 'bot.action.search': {
          setSearchQuery(value ?? '')
          return { ok: true, actionId }
        }
        case 'bot.action.set-draft': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          return { ok: store.setDraft(id, value ?? ''), actionId }
        }
        case 'bot.action.attach':
        case 'bot.action.remove-attachment':
        case 'bot.action.toggle-thinking':
        case 'bot.action.open-media':
        case 'bot.action.open-conversation-menu': {
          // UI-only chrome — driven directly by composer/bubble interaction.
          return { ok: true, actionId }
        }
        case 'bot.action.send': {
          const text = value ?? ''
          if (!text.trim()) return { ok: false, actionId, error: 'Missing message text' }
          const conversationId = targetId ?? activeId ?? ensureActiveConversation()
          handleSend({ text, attachments: [] }, conversationId)
          return { ok: true, actionId }
        }
        case 'bot.action.stop': {
          handleStop()
          return { ok: true, actionId }
        }
        case 'bot.action.retry': {
          if (!targetId || !activeId) return { ok: false, actionId, error: 'Missing message id' }
          return { ok: retryMessage(activeId, targetId), actionId }
        }
        case 'bot.action.copy-message': {
          const conv = snap.conversations.find((c) => c.id === activeId)
          const message = conv?.messages.find((m) => m.id === targetId)
          if (!message) return { ok: false, actionId, error: 'Message not found' }
          void navigator.clipboard?.writeText(messagePlainText(message.parts))
          return { ok: true, actionId }
        }
        case 'bot.action.regenerate': {
          if (!targetId || !activeId) return { ok: false, actionId, error: 'Missing message id' }
          return { ok: regenerateMessage(activeId, targetId), actionId }
        }
        case 'bot.action.append-markdown':
        case 'bot.action.append-html':
        case 'bot.action.append-gallery':
        case 'bot.action.append-card':
        case 'bot.action.append-tool-state': {
          if (!activeId) return { ok: false, actionId, error: 'No active conversation' }
          const part = buildAppendedPart(actionId, value)
          if (!part) return { ok: false, actionId, error: 'Unsupported append payload' }
          if (targetId) {
            store.appendParts(activeId, targetId, [part])
            return { ok: true, actionId, data: { messageId: targetId } }
          }
          const messageId = createId('msg')
          store.appendMessage(activeId, {
            id: messageId,
            role: 'assistant',
            senderId: botParticipantId,
            parts: [part],
          })
          return { ok: true, actionId, data: { messageId } }
        }
        case 'bot.action.toggle-sidebar': {
          setSidebarOpen((v) => !v)
          return { ok: true, actionId }
        }
        case 'bot.action.focus-composer': {
          focusChatComposer(rootRef.current)
          return { ok: true, actionId }
        }
        default:
          return { ok: false, actionId, error: `Unhandled action: ${actionId}` }
      }
    },
    [botParticipantId, ensureActiveConversation, handleSend, handleStop, model, regenerateMessage, retryMessage, store],
  )

  const runtimeHandle = useMemo<EditorRuntimeHandle>(
    () => ({ getContext, loadContext, invokeAction }),
    [getContext, loadContext, invokeAction],
  )

  useImperativeHandle(ref, () => runtimeHandle, [runtimeHandle])

  const handleExport = useCallback(
    (formatId: string) => {
      downloadExportedContext('bot', runtimeHandle, formatId as 'envelope-json', workbenchTitle)
    },
    [runtimeHandle, workbenchTitle],
  )

  const titleValue = activeConversation?.title ?? workbenchTitle
  const handleTitleChange = useCallback(
    (value: string) => {
      if (activeConversation) {
        store.renameConversation(activeConversation.id, value)
      } else {
        setWorkbenchTitle(value)
      }
    },
    [activeConversation, store],
  )

  const conversationMenuItems: CascadeMenuItem[] = useMemo(
    () => [
      {
        id: 'pin',
        label: activeConversation?.pinned ? 'Unpin' : 'Pin',
        icon: activeConversation?.pinned ? PinOff : Pin,
        disabled: !activeConversation,
      },
      {
        id: 'archive',
        label: activeConversation?.archived ? 'Unarchive' : 'Archive',
        icon: activeConversation?.archived ? ArchiveRestore : Archive,
        disabled: !activeConversation,
      },
      { id: 'clear', label: 'Clear messages', icon: Eraser, disabled: !activeConversation },
      { id: 'sep-1', label: '—', disabled: true },
      { id: 'delete', label: 'Delete chat', icon: Trash2, disabled: !activeConversation },
    ],
    [activeConversation],
  )

  const onConversationMenuSelect = useCallback(
    (id: string) => {
      if (!activeConversation) return
      if (id === 'pin') store.setPinned(activeConversation.id, !activeConversation.pinned)
      else if (id === 'archive') store.setArchived(activeConversation.id, !activeConversation.archived)
      else if (id === 'clear') store.clearConversation(activeConversation.id)
      else if (id === 'delete') store.deleteConversation(activeConversation.id)
    },
    [activeConversation, store],
  )

  const handleCopyMessage = useCallback(
    (messageId: string) => {
      const message = activeConversation?.messages.find((m) => m.id === messageId)
      if (message) void navigator.clipboard?.writeText(messagePlainText(message.parts))
    },
    [activeConversation],
  )

  const handleRegenerateMessage = useCallback(
    (messageId: string) => {
      if (activeConversation) regenerateMessage(activeConversation.id, messageId)
    },
    [activeConversation, regenerateMessage],
  )

  const handleSuggest = useCallback(
    (prompt: string) => {
      handleSend({ text: prompt, attachments: [] })
    },
    [handleSend],
  )

  const handleJumpToLatest = useCallback(() => {
    stickRef.current.jumpToLatest()
    setUnreadBelow(0)
  }, [])

  const handleCardAction = useCallback(
    (actionId: string, value?: string) => {
      invokeAction({ kind: 'bot', actionId, value, targetId: activeConversation?.id ?? undefined })
    },
    [activeConversation, invokeAction],
  )

  const handleDraftChange = useCallback(
    (value: string) => {
      if (activeConversation) store.setDraft(activeConversation.id, value)
    },
    [activeConversation, store],
  )

  const isEmbed = variant === 'embed'
  const shellClass = [
    'theme-bot-chat',
    variant === 'showcase' ? 'theme-bot-chat--showcase' : '',
    isEmbed ? 'theme-bot-chat--embed' : '',
    !isEmbed && !sidebarOpen ? 'theme-bot-chat--sidebar-closed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (isEmbed) {
    return (
      <div ref={rootRef} className={shellClass} aria-label="Bot chat">
        <div className="theme-bot-chat__body">
          <div className="theme-bot-chat__main">
            <BotChatThread
              conversation={activeConversation}
              participants={snapshot.participants}
              onCopy={handleCopyMessage}
              onRegenerate={handleRegenerateMessage}
              onCardAction={handleCardAction}
              onSuggest={handleSuggest}
              unreadBelow={unreadBelow}
              onJumpToLatest={handleJumpToLatest}
              viewportRef={viewportRef}
              errorText={composerError}
              onRetryError={() => {
                const text = lastUserPlainText(activeConversation?.messages ?? [])
                if (text) handleSend({ text, attachments: [] })
              }}
            />
            <ChatComposer
              mode="bot"
              status={composerStatus}
              error={composerError}
              draft={activeConversation?.draft ?? ''}
              onDraftChange={handleDraftChange}
              onSend={handleSend}
              onStop={handleStop}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className={shellClass} aria-label="Bot chat">
      <EditorTitlebar
        className="theme-bot-chat__titlebar"
        fileMenu={
          <div className="theme-bot-chat__titlebar-leading">
            <Tooltip content={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
              <IconButton
                icon={sidebarOpen ? PanelLeftClose : PanelLeft}
                aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                aria-pressed={sidebarOpen}
                size="xs"
                variant="ghost"
                active={sidebarOpen}
                onClick={() => setSidebarOpen((v) => !v)}
              />
            </Tooltip>
            <Tooltip content="New chat">
              <IconButton icon={Plus} aria-label="New chat" size="xs" variant="ghost" onClick={handleNewChat} />
            </Tooltip>
          </div>
        }
        titleBlock={
          <EditorTitleField
            value={titleValue}
            onChange={handleTitleChange}
            placeholder="Untitled chat"
            aria-label="Chat title"
          />
        }
        saveTray={
          <CascadeMenuButton
            label="Chat menu"
            icon={MoreHorizontal}
            iconOnly
            size="xs"
            variant="ghost"
            menuSize="compact"
            scrollRail="hidden"
            triggerLabelAnim={false}
            items={conversationMenuItems}
            onSelect={onConversationMenuSelect}
          />
        }
        exportMenu={<EditorExportMenu kind="bot" onExport={handleExport} />}
      />

      <div className="theme-bot-chat__body">
        <BotChatSidebar
          conversations={filteredConversations}
          activeId={snapshot.activeConversationId}
          search={searchQuery}
          onSearch={setSearchQuery}
          onSelect={(id) => store.selectConversation(id)}
          onNew={handleNewChat}
          onRename={(id, title) => store.renameConversation(id, title)}
          onPin={(id, pinned) => store.setPinned(id, pinned)}
          onArchive={(id, archived) => store.setArchived(id, archived)}
          onDelete={(id) => store.deleteConversation(id)}
        />

        <div className="theme-bot-chat__main">
          <BotChatThread
            conversation={activeConversation}
            participants={snapshot.participants}
            onCopy={handleCopyMessage}
            onRegenerate={handleRegenerateMessage}
            onCardAction={handleCardAction}
            onSuggest={handleSuggest}
            unreadBelow={unreadBelow}
            onJumpToLatest={handleJumpToLatest}
            viewportRef={viewportRef}
            errorText={composerError}
            onRetryError={() => {
              const text = lastUserPlainText(activeConversation?.messages ?? [])
              if (text) handleSend({ text, attachments: [] })
            }}
          />
          <ChatComposer
            mode="bot"
            status={composerStatus}
            error={composerError}
            draft={activeConversation?.draft ?? ''}
            onDraftChange={handleDraftChange}
            onSend={handleSend}
            onStop={handleStop}
          />
        </div>
      </div>

      <BotChatStatusBar
        model={model}
        messageCount={activeConversation?.messages.length ?? 0}
        status={composerStatus}
      />
    </div>
  )
})

export function BotChatEmbed({ className = '', model }: { className?: string; model?: string }) {
  return <BotChat variant="embed" className={className} model={model} />
}
