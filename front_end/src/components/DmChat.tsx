import { Info, PanelLeft, PanelLeftClose } from 'lucide-react'
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
  DM_DIRECTORY,
  lastUserPlainText,
  messagePlainText,
  searchConversations,
  type ChatMessage,
  type ChatParticipant,
  type ChatParticipantRole,
  type ComposerSendPayload,
} from '../lib/chat'
import { pickDmCannedReply } from '../lib/dmChat'
import { downloadExportedContext } from '../lib/editorContext/importExportManager'
import type {
  DmEditorPayload,
  EditorActionRequest,
  EditorActionResult,
  EditorRuntimeHandle,
} from '../lib/editorContext/types'
import { IconButton } from './IconButton'
import { Tooltip } from './Tooltip'
import { EditorExportMenu } from './editorContextParts/EditorExportMenu'
import { EditorTitleField } from './editorContextParts/EditorTitleField'
import { EditorTitlebar } from './editorContextParts/EditorTitlebar'
import { ChatComposer, focusChatComposer } from './chatParts/ChatComposer'
import { DmChatGroupModal } from './dmChatParts/DmChatGroupModal'
import { DmChatHeader } from './dmChatParts/DmChatHeader'
import { DmChatInfoPanel } from './dmChatParts/DmChatInfoPanel'
import { DmChatList, type DmChatFilter } from './dmChatParts/DmChatList'
import { DmChatStatusBar } from './dmChatParts/DmChatStatusBar'
import { DmChatThread } from './dmChatParts/DmChatThread'
import { LiveDmChat } from './LiveDmChat'

export type DmChatVariant = 'workbench' | 'showcase' | 'embed'

export type DmChatSource = { mode: 'fixture' } | { mode: 'live'; bootstrapPeerUserId?: string }

type DmChatProps = {
  className?: string
  variant?: DmChatVariant
  initialTitle?: string
  /** Default fixture. Live mode delegates to LiveDmChat + chatApi. */
  source?: DmChatSource
}

export type DmChatHandle = EditorRuntimeHandle

const SELF_ID = 'user_self'

function parseJsonOr<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

type ReplyTarget = { messageId: string; preview: string }

export const DmChat = forwardRef<DmChatHandle, DmChatProps>(function DmChat(
  {
    className = '',
    variant = 'workbench',
    initialTitle = 'Direct messages',
    source = { mode: 'fixture' },
  },
  ref,
) {
  if (source.mode === 'live') {
    return (
      <LiveDmChat
        className={className}
        bootstrapPeerUserId={source.bootstrapPeerUserId}
      />
    )
  }

  return (
    <DmChatFixture className={className} variant={variant} initialTitle={initialTitle} ref={ref} />
  )
})

const DmChatFixture = forwardRef<DmChatHandle, Omit<DmChatProps, 'source'>>(function DmChatFixture(
  { className = '', variant = 'workbench', initialTitle = 'Direct messages' },
  ref,
) {
  const storeRef = useRef(createChatFixtureStore('dm'))
  const store = storeRef.current
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)

  const [workbenchTitle, setWorkbenchTitle] = useState(initialTitle)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [infoOpen, setInfoOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [listFilter, setListFilter] = useState<DmChatFilter>('all')
  const [composerStatus, setComposerStatus] = useState<'idle' | 'sending' | 'streaming' | 'failed' | 'disabled'>(
    'idle',
  )
  const [composerError, setComposerError] = useState<string | null>(null)
  const [unreadBelow, setUnreadBelow] = useState(0)
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null)
  const [groupModalOpen, setGroupModalOpen] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(createStickController(viewportRef))
  const messageCountRef = useRef(0)
  const timersRef = useRef<number[]>([])

  const activeConversation = useMemo(
    () => snapshot.conversations.find((c) => c.id === snapshot.activeConversationId) ?? null,
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

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id))
      timersRef.current = []
    }
  }, [])

  const leaveGroup = useCallback(
    (conversationId: string) => {
      store.removeMembers(conversationId, [SELF_ID])
      return store.deleteConversation(conversationId)
    },
    [store],
  )

  const setParticipantRole = useCallback(
    (participantId: string, role: ChatParticipantRole) => {
      const snap = store.getSnapshot()
      if (!snap.participants.some((p) => p.id === participantId)) return false
      store.loadSnapshot({
        ...snap,
        participants: snap.participants.map((p) => (p.id === participantId ? { ...p, role } : p)),
      })
      return true
    },
    [store],
  )

  const markConversationRead = useCallback(
    (conversationId: string) => {
      const snap = store.getSnapshot()
      const conv = snap.conversations.find((c) => c.id === conversationId)
      if (!conv) return false
      store.loadSnapshot({
        ...snap,
        conversations: snap.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0, typingParticipantIds: [] } : c,
        ),
      })
      return true
    },
    [store],
  )

  const scheduleSimulatedReply = useCallback(
    (conversationId: string, messageId: string) => {
      const conv = store.getSnapshot().conversations.find((c) => c.id === conversationId)
      if (!conv) return
      const otherIds = conv.participantIds.filter((id) => id !== SELF_ID)
      if (otherIds.length === 0) return
      const responderId = otherIds[Math.floor(Math.random() * otherIds.length)]
      const responder = store.getParticipant(responderId)
      if (!responder || responder.presence === 'unavailable') return

      const t1 = window.setTimeout(() => {
        store.setDelivery(conversationId, messageId, 'delivered')
      }, 500)
      const t2 = window.setTimeout(() => {
        store.setDelivery(conversationId, messageId, 'read')
        store.setTyping(conversationId, [responderId])
      }, 1300)
      const t3 = window.setTimeout(() => {
        store.setTyping(conversationId, [])
        store.appendMessage(conversationId, {
          id: createId('msg'),
          role: 'member',
          senderId: responderId,
          parts: [{ type: 'text', text: pickDmCannedReply() }],
        })
      }, 2600)
      timersRef.current.push(t1, t2, t3)
    },
    [store],
  )

  const retryMessage = useCallback(
    (conversationId: string, messageId: string): boolean => {
      const conv = store.getSnapshot().conversations.find((c) => c.id === conversationId)
      const message = conv?.messages.find((m) => m.id === messageId)
      if (!conv || !message) return false
      store.setDelivery(conversationId, messageId, 'sent')
      scheduleSimulatedReply(conversationId, messageId)
      return true
    },
    [scheduleSimulatedReply, store],
  )

  const ensureActiveConversation = useCallback((): string => {
    const snap = store.getSnapshot()
    if (snap.activeConversationId) return snap.activeConversationId
    const first = snap.conversations[0]
    if (first) {
      store.selectConversation(first.id)
      return first.id
    }
    const conv = store.createConversation({ title: 'New chat', kind: 'dm', participantIds: [SELF_ID] })
    return conv.id
  }, [store])

  const startDirectMessage = useCallback(
    (participantId: string): string => {
      const snap = store.getSnapshot()
      const existing = snap.conversations.find(
        (c) =>
          c.kind === 'dm' &&
          c.participantIds.length === 2 &&
          c.participantIds.includes(participantId) &&
          c.participantIds.includes(SELF_ID),
      )
      if (existing) {
        if (existing.archived) store.setArchived(existing.id, false)
        store.selectConversation(existing.id)
        return existing.id
      }
      const contact = DM_DIRECTORY.find((p) => p.id === participantId)
      const conv = store.createConversation({
        title: contact?.displayName ?? 'New chat',
        kind: 'dm',
        participantIds: [SELF_ID, participantId],
      })
      return conv.id
    },
    [store],
  )

  const handleCreateGroup = useCallback(
    (title: string, participantIds: string[]) => {
      store.createConversation({
        title,
        kind: 'group',
        participantIds: Array.from(new Set([SELF_ID, ...participantIds])),
      })
      setGroupModalOpen(false)
    },
    [store],
  )

  const handleSend = useCallback(
    (payload: ComposerSendPayload, conversationIdOverride?: string) => {
      const conversationId = conversationIdOverride ?? ensureActiveConversation()
      setComposerStatus('sending')
      setComposerError(null)
      const message = store.sendUserMessage(conversationId, {
        ...payload,
        replyToId: payload.replyToId ?? replyTo?.messageId,
      })
      setReplyTo(null)
      setComposerStatus('idle')
      if (message) scheduleSimulatedReply(conversationId, message.id)
    },
    [ensureActiveConversation, replyTo, scheduleSimulatedReply, store],
  )

  const getContext = useCallback((): DmEditorPayload => store.toDmPayload(workbenchTitle), [store, workbenchTitle])

  const loadContext = useCallback(
    (payload: unknown) => {
      const next = payload as DmEditorPayload
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
        case 'dm.action.new-dm': {
          const participantId = value ?? targetId
          if (!participantId) return { ok: false, actionId, error: 'Missing participant id' }
          const id = startDirectMessage(participantId)
          return { ok: true, actionId, data: { conversationId: id } }
        }
        case 'dm.action.select-chat': {
          const id = targetId ?? value
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          return { ok: store.selectConversation(id), actionId }
        }
        case 'dm.action.rename': {
          const id = targetId ?? activeId
          if (!id || !value) return { ok: false, actionId, error: 'Missing conversation id or title' }
          return { ok: store.renameConversation(id, value), actionId }
        }
        case 'dm.action.pin': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          const conv = snap.conversations.find((c) => c.id === id)
          const next = value ? value === 'true' : !conv?.pinned
          return { ok: store.setPinned(id, next), actionId }
        }
        case 'dm.action.mute': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          const conv = snap.conversations.find((c) => c.id === id)
          const next = value ? value === 'true' : !conv?.muted
          return { ok: store.setMuted(id, next), actionId }
        }
        case 'dm.action.archive': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          const conv = snap.conversations.find((c) => c.id === id)
          const next = value ? value === 'true' : !conv?.archived
          return { ok: store.setArchived(id, next), actionId }
        }
        case 'dm.action.delete': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          return { ok: store.deleteConversation(id), actionId }
        }
        case 'dm.action.new-group': {
          const parsed = parseJsonOr<{ title?: string; participantIds?: string[] }>(value, {})
          const title = parsed.title?.trim()
          const memberIds = parsed.participantIds ?? []
          if (!title || memberIds.length === 0) {
            return { ok: false, actionId, error: 'Missing group title or members' }
          }
          const conv = store.createConversation({
            title,
            kind: 'group',
            participantIds: Array.from(new Set([SELF_ID, ...memberIds])),
          })
          return { ok: true, actionId, data: { conversationId: conv.id } }
        }
        case 'dm.action.update-group': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          const parsed = parseJsonOr<{ title?: string; avatarUrl?: string }>(value, {})
          return { ok: store.updateGroup(id, parsed), actionId }
        }
        case 'dm.action.add-member': {
          const id = targetId ?? activeId
          const participantId = value
          if (!id || !participantId) {
            return { ok: false, actionId, error: 'Missing conversation id or participant id' }
          }
          return { ok: store.addMembers(id, [participantId]), actionId }
        }
        case 'dm.action.remove-member': {
          const id = targetId ?? activeId
          const participantId = value
          if (!id || !participantId) {
            return { ok: false, actionId, error: 'Missing conversation id or participant id' }
          }
          return { ok: store.removeMembers(id, [participantId]), actionId }
        }
        case 'dm.action.set-role': {
          const [participantId, role] = (value ?? '').split('=')
          if (!participantId || !role) {
            return { ok: false, actionId, error: 'Expected value as participantId=role' }
          }
          return { ok: setParticipantRole(participantId, role as ChatParticipantRole), actionId }
        }
        case 'dm.action.leave': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          return { ok: leaveGroup(id), actionId }
        }
        case 'dm.action.open-info':
        case 'dm.action.attach':
        case 'dm.action.remove-attachment':
        case 'dm.action.open-media': {
          // UI-only chrome — driven directly by header/composer/bubble interaction.
          return { ok: true, actionId }
        }
        case 'dm.action.set-draft': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          return { ok: store.setDraft(id, value ?? ''), actionId }
        }
        case 'dm.action.set-caption': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          return { ok: store.setCaption(id, value ?? ''), actionId }
        }
        case 'dm.action.send': {
          const text = value ?? ''
          if (!text.trim()) return { ok: false, actionId, error: 'Missing message text' }
          const conversationId = targetId ?? activeId ?? ensureActiveConversation()
          handleSend({ text, attachments: [] }, conversationId)
          return { ok: true, actionId }
        }
        case 'dm.action.retry': {
          if (!targetId || !activeId) return { ok: false, actionId, error: 'Missing message id' }
          return { ok: retryMessage(activeId, targetId), actionId }
        }
        case 'dm.action.reply': {
          if (!targetId || !activeId) return { ok: false, actionId, error: 'Missing message id' }
          const conv = snap.conversations.find((c) => c.id === activeId)
          const message = conv?.messages.find((m) => m.id === targetId)
          if (!message) return { ok: false, actionId, error: 'Message not found' }
          setReplyTo({ messageId: targetId, preview: messagePlainText(message.parts).slice(0, 80) })
          return { ok: true, actionId }
        }
        case 'dm.action.react': {
          if (!targetId || !activeId || !value) {
            return { ok: false, actionId, error: 'Missing message id or emoji' }
          }
          return { ok: store.react(activeId, targetId, value, SELF_ID), actionId }
        }
        case 'dm.action.copy': {
          if (!activeId) return { ok: false, actionId, error: 'No active conversation' }
          const conv = snap.conversations.find((c) => c.id === activeId)
          const message = conv?.messages.find((m) => m.id === targetId)
          if (!message) return { ok: false, actionId, error: 'Message not found' }
          void navigator.clipboard?.writeText(messagePlainText(message.parts))
          return { ok: true, actionId }
        }
        case 'dm.action.delete-for-me': {
          if (!targetId || !activeId) return { ok: false, actionId, error: 'Missing message id' }
          return { ok: store.deleteMessage(activeId, targetId), actionId }
        }
        case 'dm.action.set-presence': {
          const participantId = targetId
          const presence = value as ChatParticipant['presence']
          if (!participantId || !presence) {
            return { ok: false, actionId, error: 'Missing participant id or presence' }
          }
          return { ok: store.setPresence(participantId, presence), actionId }
        }
        case 'dm.action.set-typing': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          const ids = value ? value.split(',').filter(Boolean) : []
          return { ok: store.setTyping(id, ids), actionId }
        }
        case 'dm.action.set-delivery-state': {
          const id = activeId
          if (!id || !targetId || !value) {
            return { ok: false, actionId, error: 'Missing message id or delivery state' }
          }
          return { ok: store.setDelivery(id, targetId, value as ChatMessage['delivery']), actionId }
        }
        case 'dm.action.mark-read': {
          const id = targetId ?? activeId
          if (!id) return { ok: false, actionId, error: 'Missing conversation id' }
          return { ok: markConversationRead(id), actionId }
        }
        case 'dm.action.toggle-sidebar': {
          setSidebarOpen((v) => !v)
          return { ok: true, actionId }
        }
        case 'dm.action.toggle-info': {
          setInfoOpen((v) => !v)
          return { ok: true, actionId }
        }
        case 'dm.action.focus-composer': {
          focusChatComposer(rootRef.current)
          return { ok: true, actionId }
        }
        case 'dm.action.filter-chats': {
          setSearchQuery(value ?? '')
          return { ok: true, actionId }
        }
        default:
          return { ok: false, actionId, error: `Unhandled action: ${actionId}` }
      }
    },
    [
      ensureActiveConversation,
      handleSend,
      leaveGroup,
      markConversationRead,
      retryMessage,
      setParticipantRole,
      startDirectMessage,
      store,
    ],
  )

  const runtimeHandle = useMemo<EditorRuntimeHandle>(
    () => ({ getContext, loadContext, invokeAction }),
    [getContext, loadContext, invokeAction],
  )

  useImperativeHandle(ref, () => runtimeHandle, [runtimeHandle])

  const handleExport = useCallback(
    (formatId: string) => {
      downloadExportedContext('dm', runtimeHandle, formatId as 'envelope-json', workbenchTitle)
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

  const handleCopyMessage = useCallback(
    (messageId: string) => {
      const message = activeConversation?.messages.find((m) => m.id === messageId)
      if (message) void navigator.clipboard?.writeText(messagePlainText(message.parts))
    },
    [activeConversation],
  )

  const handleReplyMessage = useCallback((messageId: string, preview: string) => {
    setReplyTo({ messageId, preview })
    focusChatComposer(rootRef.current)
  }, [])

  const handleReactMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (activeConversation) store.react(activeConversation.id, messageId, emoji, SELF_ID)
    },
    [activeConversation, store],
  )

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (activeConversation) store.deleteMessage(activeConversation.id, messageId)
    },
    [activeConversation, store],
  )

  const handleDraftChange = useCallback(
    (value: string) => {
      if (activeConversation) store.setDraft(activeConversation.id, value)
    },
    [activeConversation, store],
  )

  const handleJumpToLatest = useCallback(() => {
    stickRef.current.jumpToLatest()
    setUnreadBelow(0)
  }, [])

  const handleRenameActive = useCallback(
    (title: string) => {
      if (activeConversation) store.renameConversation(activeConversation.id, title)
    },
    [activeConversation, store],
  )

  const handlePinActive = useCallback(
    (pinned: boolean) => {
      if (activeConversation) store.setPinned(activeConversation.id, pinned)
    },
    [activeConversation, store],
  )

  const handleMuteActive = useCallback(
    (muted: boolean) => {
      if (activeConversation) store.setMuted(activeConversation.id, muted)
    },
    [activeConversation, store],
  )

  const handleArchiveActive = useCallback(
    (archived: boolean) => {
      if (activeConversation) store.setArchived(activeConversation.id, archived)
    },
    [activeConversation, store],
  )

  const handleLeaveActive = useCallback(() => {
    if (activeConversation) leaveGroup(activeConversation.id)
  }, [activeConversation, leaveGroup])

  const handleDeleteActive = useCallback(() => {
    if (activeConversation) store.deleteConversation(activeConversation.id)
  }, [activeConversation, store])

  const handleAddMemberActive = useCallback(
    (participantId: string) => {
      if (activeConversation) store.addMembers(activeConversation.id, [participantId])
    },
    [activeConversation, store],
  )

  const handleRemoveMemberActive = useCallback(
    (participantId: string) => {
      if (activeConversation) store.removeMembers(activeConversation.id, [participantId])
    },
    [activeConversation, store],
  )

  const handleSetRoleActive = useCallback(
    (participantId: string, role: ChatParticipantRole) => {
      setParticipantRole(participantId, role)
    },
    [setParticipantRole],
  )

  const isEmbed = variant === 'embed'
  const shellClass = [
    'theme-dm-chat',
    variant === 'showcase' ? 'theme-dm-chat--showcase' : '',
    isEmbed ? 'theme-dm-chat--embed' : '',
    !isEmbed && !sidebarOpen ? 'theme-dm-chat--sidebar-closed' : '',
    !isEmbed && infoOpen ? 'theme-dm-chat--info-open' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (isEmbed) {
    return (
      <div ref={rootRef} className={shellClass} aria-label="Direct messages">
        <div className="theme-dm-chat__body">
          <div className="theme-dm-chat__main">
            <DmChatHeader
              conversation={activeConversation}
              participants={snapshot.participants}
              infoOpen={false}
              onToggleInfo={() => {}}
              onRename={handleRenameActive}
              onPin={handlePinActive}
              onMute={handleMuteActive}
              onArchive={handleArchiveActive}
              onLeave={handleLeaveActive}
              onDelete={handleDeleteActive}
            />
            <DmChatThread
              conversation={activeConversation}
              participants={snapshot.participants}
              onCopy={handleCopyMessage}
              onReply={handleReplyMessage}
              onReact={handleReactMessage}
              onDelete={handleDeleteMessage}
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
              mode="dm"
              status={composerStatus}
              error={composerError}
              draft={activeConversation?.draft ?? ''}
              onDraftChange={handleDraftChange}
              onSend={handleSend}
              replyToLabel={replyTo?.preview ?? null}
              onClearReply={() => setReplyTo(null)}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className={shellClass} aria-label="Direct messages">
      <EditorTitlebar
        className="theme-dm-chat__titlebar"
        fileMenu={
          <div className="theme-dm-chat__titlebar-leading">
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
          <Tooltip content={infoOpen ? 'Hide info' : 'Chat info'}>
            <IconButton
              icon={Info}
              aria-label="Toggle chat info"
              size="xs"
              variant="ghost"
              active={infoOpen}
              disabled={!activeConversation}
              onClick={() => setInfoOpen((v) => !v)}
            />
          </Tooltip>
        }
        exportMenu={<EditorExportMenu kind="dm" onExport={handleExport} />}
      />

      <div className="theme-dm-chat__body">
        <DmChatList
          conversations={filteredConversations}
          participants={snapshot.participants}
          activeId={snapshot.activeConversationId}
          search={searchQuery}
          onSearch={setSearchQuery}
          filter={listFilter}
          onFilterChange={setListFilter}
          onSelect={(id) => store.selectConversation(id)}
          onNewDm={startDirectMessage}
          onNewGroup={() => setGroupModalOpen(true)}
          onRename={(id, title) => store.renameConversation(id, title)}
          onPin={(id, pinned) => store.setPinned(id, pinned)}
          onMute={(id, muted) => store.setMuted(id, muted)}
          onArchive={(id, archived) => store.setArchived(id, archived)}
          onDelete={(id) => store.deleteConversation(id)}
          previewText={store.previewText}
        />

        <div className="theme-dm-chat__main">
          <DmChatHeader
            conversation={activeConversation}
            participants={snapshot.participants}
            infoOpen={infoOpen}
            onToggleInfo={() => setInfoOpen((v) => !v)}
            onRename={handleRenameActive}
            onPin={handlePinActive}
            onMute={handleMuteActive}
            onArchive={handleArchiveActive}
            onLeave={handleLeaveActive}
            onDelete={handleDeleteActive}
          />
          <DmChatThread
            conversation={activeConversation}
            participants={snapshot.participants}
            onCopy={handleCopyMessage}
            onReply={handleReplyMessage}
            onReact={handleReactMessage}
            onDelete={handleDeleteMessage}
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
            mode="dm"
            status={composerStatus}
            error={composerError}
            draft={activeConversation?.draft ?? ''}
            onDraftChange={handleDraftChange}
            onSend={handleSend}
            replyToLabel={replyTo?.preview ?? null}
            onClearReply={() => setReplyTo(null)}
          />
        </div>

        {infoOpen ? (
          <DmChatInfoPanel
            conversation={activeConversation}
            participants={snapshot.participants}
            onClose={() => setInfoOpen(false)}
            onRenameGroup={handleRenameActive}
            onMuteToggle={handleMuteActive}
            onAddMember={handleAddMemberActive}
            onRemoveMember={handleRemoveMemberActive}
            onSetRole={handleSetRoleActive}
            onLeave={handleLeaveActive}
            onDelete={handleDeleteActive}
          />
        ) : null}
      </div>

      <DmChatStatusBar
        conversation={activeConversation}
        participants={snapshot.participants}
        status={composerStatus}
      />

      <DmChatGroupModal
        open={groupModalOpen}
        contacts={DM_DIRECTORY.filter((p) => p.role !== 'self')}
        onClose={() => setGroupModalOpen(false)}
        onCreate={handleCreateGroup}
      />
    </div>
  )
})

export function DmChatEmbed({ className = '', initialTitle }: { className?: string; initialTitle?: string }) {
  return <DmChat variant="embed" className={className} initialTitle={initialTitle} />
}
