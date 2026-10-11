import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { getCurrentUser } from '../lib/authApi'
import * as chatApi from '../lib/chatApi'
import { toUserMessage } from '../lib/dataApi'
import {
  createChatLiveStore,
  createStickController,
  lastUserPlainText,
  type ComposerSendPayload,
} from '../lib/chat'
import { ChatComposer } from './chatParts/ChatComposer'
import { BotChatSidebar } from './botChatParts/BotChatSidebar'
import { BotChatThread } from './botChatParts/BotChatThread'
import { BotChatStatusBar } from './botChatParts/BotChatStatusBar'
import { Button } from './Button'

type LiveBotChatProps = {
  className?: string
}

export function LiveBotChat({ className = '' }: LiveBotChatProps) {
  const storeRef = useRef(createChatLiveStore('bot'))
  const store = storeRef.current
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'streaming' | 'failed'>('idle')
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
        if (!cancelled && store.getSnapshot().conversations.length === 0) {
          await store.newBotChat('Live bot chat')
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
  }, [store])

  const onSend = useCallback(
    async (payload: ComposerSendPayload) => {
      if (!active) return
      setBusy(true)
      setStatus('streaming')
      setError(null)
      try {
        await store.sendComposer(active.id, payload)
        stickRef.current.jumpToLatest()
        setStatus('idle')
      } catch (e) {
        const msg = toUserMessage(e)
        setStatus('failed')
        setError(
          /missing_openai_key|CV extraction is not configured|not configured/i.test(msg)
            ? 'Bot Edge needs OPENAI_API_KEY secret — set it then re-serve functions.'
            : msg,
        )
      } finally {
        setBusy(false)
      }
    },
    [active, store],
  )

  return (
    <div className={`theme-bot-chat theme-bot-chat--live flex min-h-[32rem] flex-col ${className}`}>
      <div className="flex min-h-0 flex-1">
        <BotChatSidebar
          conversations={snapshot.conversations}
          activeId={snapshot.activeConversationId}
          search={search}
          onSearch={setSearch}
          onSelect={(id) => void store.selectConversation(id)}
          onNew={() => void store.newBotChat()}
          onRename={() => undefined}
          onPin={(id, pinned) => store.setPinned(id, pinned)}
          onArchive={(id, archived) => store.setArchived(id, archived)}
          onDelete={() => undefined}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <BotChatStatusBar
            model={active?.model ?? 'gpt-4o-mini'}
            messageCount={active?.messages.length ?? 0}
            status={busy ? status : 'idle'}
          />
          {active ? (
            <>
              <BotChatThread
                conversation={active}
                participants={snapshot.participants}
                viewportRef={viewportRef}
                onCardAction={(actionId, value) => {
                  if (!value) return
                  void chatApi
                    .actionDecide(value, actionId === 'approve')
                    .then(() => store.selectConversation(active.id))
                }}
                errorText={error}
                onRetryError={() => {
                  const text = lastUserPlainText(active.messages)
                  if (text) void onSend({ text, attachments: [] })
                }}
              />
              <ChatComposer
                mode="bot"
                status={busy ? status : 'idle'}
                draft={active.draft ?? ''}
                onDraftChange={(v) => store.setDraft(active.id, v)}
                onSend={onSend}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <Button size="sm" disabled={busy} onClick={() => void store.newBotChat()}>
                New bot chat
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
