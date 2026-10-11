/**
 * Live interview_create bot beside FlowEditor — approve → decide → dispatchEditorAction.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import * as assessmentApi from '../lib/assessmentApi'
import { getCurrentUser } from '../lib/authApi'
import * as chatApi from '../lib/chatApi'
import { toUserMessage } from '../lib/dataApi'
import { dispatchEditorAction } from '../lib/editorContext/actionRegistry'
import type { EditorRuntimeHandle } from '../lib/editorContext/types'
import type { FlowDocument, FlowEditorPayload } from '../lib/flowEditor/types'
import { buildBriefContextSnapshot } from '../lib/interviewBrief'
import {
  createChatLiveStore,
  createStickController,
  lastUserPlainText,
  type ComposerSendPayload,
} from '../lib/chat'
import { BotChatStatusBar } from './botChatParts/BotChatStatusBar'
import { BotChatThread } from './botChatParts/BotChatThread'
import { ChatComposer } from './chatParts/ChatComposer'
import { Button } from './Button'

type InterviewCreateBotPanelProps = {
  className?: string
  conversationId: string
  /** Server brief — refresh briefSnapshot on each send. */
  briefId?: string
  /** Optional role PDF / compose description text for bot context. */
  roleBriefText?: string
  /** Prefer a getter — FlowEditor ref may attach after first paint. */
  getFlowRuntime: () => EditorRuntimeHandle | null
  /** Soft conflict message when canvas drifted before approve. */
  onConflict?: (message: string) => void
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function nodeIdsFromPayload(payload: unknown): Set<string> {
  const flow = asRecord(asRecord(payload).flow)
  const nodes = Array.isArray(flow.nodes) ? flow.nodes : []
  return new Set(
    nodes
      .map((n) => (n && typeof n === 'object' ? String((n as { id?: string }).id ?? '') : ''))
      .filter(Boolean),
  )
}

export function InterviewCreateBotPanel({
  className = '',
  conversationId,
  briefId,
  roleBriefText = '',
  getFlowRuntime,
  onConflict,
}: InterviewCreateBotPanelProps) {
  const storeRef = useRef(createChatLiveStore('bot'))
  const store = storeRef.current
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'streaming' | 'failed'>('idle')
  const viewportRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(createStickController(viewportRef))
  const getFlowRuntimeRef = useRef(getFlowRuntime)
  getFlowRuntimeRef.current = getFlowRuntime
  const briefIdRef = useRef(briefId)
  briefIdRef.current = briefId
  const roleBriefTextRef = useRef(roleBriefText)
  roleBriefTextRef.current = roleBriefText

  const active = useMemo(
    () => snapshot.conversations.find((c) => c.id === snapshot.activeConversationId) ?? null,
    [snapshot],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setBusy(true)
      setError(null)
      try {
        const user = await getCurrentUser()
        if (user) store.setSelfId(user.id)
        await store.refreshInbox()
        if (cancelled) return
        const ok = await store.selectConversation(conversationId)
        if (!ok) {
          // Conversation may be brand-new and missing from inbox page — force-select after refresh.
          await store.refreshInbox()
          const again = await store.selectConversation(conversationId)
          if (!again && !cancelled) {
            setError('Could not open the creator bot conversation. Refresh and try again.')
          }
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
  }, [conversationId, store])

  const onSend = useCallback(
    async (payload: ComposerSendPayload) => {
      if (!active) return
      setBusy(true)
      setStatus('streaming')
      setError(null)
      try {
        const id = briefIdRef.current
        const runtime = getFlowRuntimeRef.current()
        const ctx = runtime?.getContext?.() as FlowEditorPayload | undefined
        const flow = ctx?.flow as FlowDocument | undefined
        if (id && flow) {
          const snap = {
            ...buildBriefContextSnapshot(flow),
            roleBriefText: roleBriefTextRef.current.trim() || undefined,
          }
          await assessmentApi.createBotGet(id, snap as unknown as Record<string, unknown>).catch(() => undefined)
        }
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

  const onCardAction = useCallback(
    async (actionId: string, value?: string) => {
      if (!value) return
      setBusy(true)
      setError(null)
      try {
        const runtime = getFlowRuntimeRef.current()
        const before = runtime?.getContext?.() as FlowEditorPayload | undefined
        const beforeIds = before ? nodeIdsFromPayload(before) : null

        const decided = await chatApi.actionDecide(value, actionId === 'approve')
        if (active) await store.selectConversation(active.id)

        if (actionId !== 'approve' || !decided.editorPatch || !runtime) return

        const patch = decided.editorPatch
        const payload = asRecord(patch.payload)
        const targetNodeId =
          typeof payload.nodeId === 'string'
            ? payload.nodeId
            : typeof payload.discussionNodeId === 'string'
              ? payload.discussionNodeId
              : typeof payload.parentNodeId === 'string'
                ? payload.parentNodeId
                : null

        const after = runtime.getContext() as FlowEditorPayload
        const afterIds = nodeIdsFromPayload(after)
        if (beforeIds && beforeIds.size !== afterIds.size) {
          const msg = 'Canvas changed while this action was pending. Ask the bot to propose again.'
          onConflict?.(msg)
          setError(msg)
          return
        }
        if (targetNodeId && afterIds.size > 0 && !afterIds.has(targetNodeId)) {
          const msg = `Node ${targetNodeId} is no longer on the canvas. Ask the bot to propose again.`
          onConflict?.(msg)
          setError(msg)
          return
        }

        const result = await dispatchEditorAction(runtime, {
          kind: 'flow',
          actionId: patch.editorActionId,
          payload: patch.payload,
        })
        if (!result.ok) {
          setError(result.error ?? 'Could not apply editor action')
        }
      } catch (e) {
        setError(toUserMessage(e))
      } finally {
        setBusy(false)
      }
    },
    [active, onConflict, store],
  )

  return (
    <div
      className={[
        'theme-interview-creator__bot',
        'theme-bot-chat',
        'theme-bot-chat--live',
        'flex',
        'min-h-[20rem]',
        'flex-col',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-interview-creator__bot-head">
        <p className="type-caption type-accent mb-0">Creator bot</p>
        <p className="type-body-sm type-muted mb-0">
          Approvals apply to the live FlowEditor through the editor action spine.
        </p>
      </div>
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
            onCardAction={(id, val) => {
              void onCardAction(id, val)
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
        <div className="flex flex-1 items-center justify-center p-4">
          <Button size="sm" disabled={busy}>
            {busy ? 'Opening bot…' : 'Waiting for conversation'}
          </Button>
        </div>
      )}
    </div>
  )
}
