import { useEffect, useState, type MutableRefObject } from 'react'
import { InterviewCreatorChat } from './InterviewCreatorChat'
import * as assessmentApi from '../lib/assessmentApi'
import { dispatchEditorAction } from '../lib/editorContext/actionRegistry'
import type { EditorRuntimeHandle } from '../lib/editorContext/types'

type DashboardChatSpaceProps = {
  className?: string
  /** Creator-2 spine runtime while builder is active. */
  creator2RuntimeRef?: MutableRefObject<EditorRuntimeHandle | null>
  /** Reactive mirror of the runtime context — drives the peel bot open call. */
  briefId?: string | null
  accountId?: string | null
  /** True while the right chat peel is visible (builder open). */
  active?: boolean
  overviewPeelTags?: readonly { kind: 'notes' | 'pdf'; label: string }[]
  /** Completeness Check Suite — hide when empty. */
  checkWarnings?: readonly {
    id: string
    short: string
    sectionId: string
    historyFocus?: string
  }[]
}

/**
 * Right dashboard peel — floating Creator-2 board chat.
 * Housing is invisible; bubbles sit on the peel chrome. Opens (or reopens) the
 * `interview_creator_board` bot thread whenever the builder exposes a brief + account.
 */
export function DashboardChatSpace({
  className = '',
  creator2RuntimeRef,
  briefId = null,
  accountId = null,
  active = true,
  overviewPeelTags = [],
  checkWarnings = [],
}: DashboardChatSpaceProps) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [historyEpoch, setHistoryEpoch] = useState(0)

  useEffect(() => {
    if (!briefId || !accountId || !active) {
      if (!briefId || !accountId) {
        setConversationId(null)
      }
      return
    }
    let cancelled = false
    void assessmentApi
      .boardBotOpen(accountId, briefId)
      .then((result) => {
        if (cancelled) return
        setConversationId(result.conversationId || null)
        setHistoryEpoch((n) => n + 1)
      })
      .catch(() => {
        if (cancelled) return
        setConversationId(null)
      })
    return () => {
      cancelled = true
    }
  }, [accountId, briefId, active])

  return (
    <div
      className={['page-scene--dashboard__chat-space', className].filter(Boolean).join(' ')}
      aria-label="Interview chat"
    >
      <div className="page-scene--dashboard__chat-space-body">
        {active ? (
        <InterviewCreatorChat
          runtimeRef={creator2RuntimeRef}
          briefId={briefId}
          accountId={accountId}
          conversationId={conversationId}
          historyEpoch={historyEpoch}
          overviewPeelTags={overviewPeelTags}
          checkWarnings={checkWarnings}
          onBodyUpdated={(body) => {
            const runtime = creator2RuntimeRef?.current
            if (!runtime) return
            void dispatchEditorAction(runtime, {
              kind: 'creator2',
              actionId: 'creator2.action.apply-edited-body',
              payload: { body },
            })
          }}
        />
        ) : null}
      </div>
    </div>
  )
}
