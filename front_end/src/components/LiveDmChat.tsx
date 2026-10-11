import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { getCurrentUser } from '../lib/authApi'
import { toUserMessage } from '../lib/dataApi'
import {
  createChatLiveStore,
  createStickController,
  lastUserPlainText,
  type ComposerSendPayload,
} from '../lib/chat'
import { ChatComposer } from './chatParts/ChatComposer'
import { ChatErrorBubble } from './chatParts/ChatBubble'
import { DmChatList, type DmChatFilter } from './dmChatParts/DmChatList'
import { DmChatThread } from './dmChatParts/DmChatThread'
import { DmChatHeader } from './dmChatParts/DmChatHeader'
import { Button } from './Button'

type LiveDmChatProps = {
  className?: string
  bootstrapPeerUserId?: string
}

export function LiveDmChat({ className = '', bootstrapPeerUserId }: LiveDmChatProps) {
  const storeRef = useRef(createChatLiveStore('dm'))
  const store = storeRef.current
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DmChatFilter>('all')
  const [infoOpen, setInfoOpen] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(createStickController(viewportRef))

  const active = useMemo(
    () => snapshot.conversations.find((c) => c.id === snapshot.activeConversationId) ?? null,
    [snapshot],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setBusy(true)
      try {
        const user = await getCurrentUser()
        if (user) store.setSelfId(user.id)
        await store.refreshInbox()
        if (bootstrapPeerUserId && !cancelled) {
          await store.openDirect(bootstrapPeerUserId)
        }
      } catch (e) {
        if (!cancelled) setError(toUserMessage(e))
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
      store.dispose()
    }
  }, [store, bootstrapPeerUserId])

  const onSend = useCallback(
    async (payload: ComposerSendPayload) => {
      if (!active) return
      setBusy(true)
      try {
        await store.sendComposer(active.id, payload)
        stickRef.current.jumpToLatest()
      } catch (e) {
        setError(toUserMessage(e))
      } finally {
        setBusy(false)
      }
    },
    [active, store],
  )

  return (
    <div className={`theme-dm-chat theme-dm-chat--live flex min-h-[32rem] flex-col ${className}`}>
      <div className="flex min-h-0 flex-1">
        <DmChatList
          conversations={snapshot.conversations}
          participants={snapshot.participants}
          activeId={snapshot.activeConversationId}
          search={search}
          onSearch={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          onSelect={(id) => void store.selectConversation(id)}
          onNewDm={(id) => void store.openDirect(id)}
          onNewGroup={() => undefined}
          onRename={() => undefined}
          onPin={(id, pinned) => store.setPinned(id, pinned)}
          onMute={(id, muted) => store.setMuted(id, muted)}
          onArchive={(id, archived) => store.setArchived(id, archived)}
          onDelete={() => undefined}
          previewText={(c) => c.caption ?? ''}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          {active ? (
            <>
              <DmChatHeader
                conversation={active}
                participants={snapshot.participants}
                infoOpen={infoOpen}
                onToggleInfo={() => setInfoOpen((v) => !v)}
                onRename={() => undefined}
                onPin={(pinned) => store.setPinned(active.id, pinned)}
                onMute={(muted) => store.setMuted(active.id, muted)}
                onArchive={(archived) => store.setArchived(active.id, archived)}
                onLeave={() => undefined}
                onDelete={() => undefined}
              />
              <DmChatThread
                conversation={active}
                participants={snapshot.participants}
                viewportRef={viewportRef}
                onReply={() => undefined}
                onReact={(messageId, emoji) => void store.react(active.id, messageId, emoji)}
                onDelete={(messageId) => void store.deleteForMe(active.id, messageId)}
                errorText={error}
                onRetryError={() => {
                  const text = lastUserPlainText(active.messages)
                  if (text) void onSend({ text, attachments: [] })
                }}
              />
              <ChatComposer
                mode="dm"
                status={busy ? 'sending' : 'idle'}
                draft={active.draft ?? ''}
                onDraftChange={(v) => store.setDraft(active.id, v)}
                onSend={onSend}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-start justify-center gap-3 p-6">
              {error ? <ChatErrorBubble text={error} /> : (
                <p className="type-body-sm type-muted">No conversation selected.</p>
              )}
              {bootstrapPeerUserId ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void store.openDirect(bootstrapPeerUserId)}
                >
                  Open DM with buddy
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
