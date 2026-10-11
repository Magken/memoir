import { Copy, Download, MoreHorizontal, RotateCcw } from 'lucide-react'
import { CascadeMenuButton } from './CascadeMenuButton'
import { ChatComposer } from './chatParts/ChatComposer'
import { ChatErrorBubble } from './chatParts/ChatBubble'
import { lastUserPlainText, sittingChatErrorCopy } from '../lib/chat/errorBubble'
import { InterviewAssistPeelChat, type AssistAttachFile, type AssistPendingEdit } from './InterviewAssistPeelChat'
import {
  InterviewAssessorAidPeelChat,
  type AssessorAidRuntimeView,
} from './InterviewAssessorAidPeelChat'
import type { AidPeelAttach, AidOpenRef } from '../lib/interviewRunApi/aidPeelAttach'
import { ThemeScroll } from './ThemeScroll'
import type { InterviewGateView, TalkMenuAction, TalkRuntimeView } from '../lib/interviewRunApi'
import type { CascadeMenuItem } from '../lib/menus/cascadeMenu'

export type AssistRuntimeMessage = {
  id: string
  role: 'assistant' | 'candidate'
  text: string
  /** ISO send time — persisted on InterviewResponse.messages[].at */
  at?: string
  parts?: import('../lib/chat/types').MessagePart[]
  pendingStatus?: 'pending' | 'applied' | 'expired' | 'miss' | 'retrying'
  editRunId?: string
}

export type AssistRuntimeView = {
  messages: AssistRuntimeMessage[]
  draft: string
  busy: boolean
  error: string | null
  personaName: string
  /** Authored Assist bundle — Copilot write still uses `write`. */
  bundleId?: string
  write?: boolean
  pendingEditRunId?: string | null
}

export type { AssessorAidRuntimeView }

type InterviewTalkChatSpaceProps = {
  /** Same as DashboardChatSpace — peel visible while true. */
  active?: boolean
  talk?: TalkRuntimeView | null
  /** Tool-stage assist runtime (Form / Coding / Doc) after Start. */
  assist?: AssistRuntimeView | null
  /** Soft Decision Talk Verify — Assessor Aid peel. */
  assessorAid?: AssessorAidRuntimeView | null
  /** Active gate — used when chat is not live yet. */
  gate?: InterviewGateView | null
  onTalkSend?: (text: string) => void
  onTalkDraftChange?: (draft: string) => void
  onTalkMenu?: (action: TalkMenuAction) => void
  onAssistSend?: (text: string) => void
  onAssistDraftChange?: (draft: string) => void
  onAssistCardAction?: (actionId: string, value?: string) => void
  onAssistCitePath?: (path: string) => void
  onAssistQuestionnaire?: (answers: Record<string, string | string[]>, skipped?: boolean) => void
  attachFiles?: readonly AssistAttachFile[]
  onToggleAttach?: (path: string) => void
  pendingEdits?: readonly AssistPendingEdit[]
  onPendingAccept?: (path: string) => void
  onPendingReject?: (path: string) => void
  onPendingFocus?: (path: string) => void
  onPendingKeepAll?: () => void
  onPendingDiscardAll?: () => void
  onAssessorAidSend?: (text: string) => void
  onAssessorAidDraftChange?: (draft: string) => void
  onAssessorAidCite?: (messageId: string) => void
  assessorAidAttach?: AidPeelAttach | null
  onAssessorAidDismissAttach?: () => void
  onAssessorAidOpenRef?: (ref: AidOpenRef) => void
  className?: string
}

const TALK_MENU_ITEMS: CascadeMenuItem[] = [
  { id: 'copy_response_json', label: 'Copy response JSON', icon: Copy },
  { id: 'download_response_json', label: 'Download response JSON', icon: Download },
  { id: 'download_editor_tapes', label: 'Download editor tapes', icon: Download },
  { id: 'reset_talk', label: 'Reset this conversation', icon: RotateCcw },
]

/**
 * Candidate right chat peel — tool-stage assist / Assessor Aid (Creator board chrome).
 * Talk discussion lives in-page; legacy peel Talk branch kept thin.
 */
export function InterviewTalkChatSpace({
  active = true,
  talk = null,
  assist = null,
  assessorAid = null,
  gate = null,
  onTalkSend,
  onTalkDraftChange,
  onTalkMenu,
  onAssistSend,
  onAssistDraftChange,
  onAssistCardAction,
  onAssistCitePath,
  onAssistQuestionnaire,
  attachFiles,
  onToggleAttach,
  pendingEdits,
  onPendingAccept,
  onPendingReject,
  onPendingFocus,
  onPendingKeepAll,
  onPendingDiscardAll,
  onAssessorAidSend,
  onAssessorAidDraftChange,
  onAssessorAidCite,
  assessorAidAttach = null,
  onAssessorAidDismissAttach,
  onAssessorAidOpenRef,
  className = '',
}: InterviewTalkChatSpaceProps) {
  const talkLive = Boolean(active && talk)
  const aidReady = Boolean(active && assessorAid && !talk)
  const assistReady = Boolean(active && assist && !talk && !assessorAid)
  const showLegacyOpening = active && !talkLive && !assistReady && !aidReady

  return (
    <div
      className={['page-scene--dashboard__chat-space', 'theme-interview-talk-peel', className]
        .filter(Boolean)
        .join(' ')}
      aria-label="Interview chat"
      aria-hidden={active ? undefined : true}
    >
      <div className="page-scene--dashboard__chat-space-body theme-interview-talk-peel__body">
        {talkLive && talk ? (
          <>
            <div className="theme-interview-gate__talk-head theme-interview-talk-peel__head">
              <p className="type-caption type-muted mb-0 theme-interview-gate__talk-depth">
                {talk.depthLabel}
              </p>
              <CascadeMenuButton
                label="Chat menu"
                icon={MoreHorizontal}
                iconOnly
                size="xs"
                variant="ghost"
                menuSize="compact"
                scrollRail="hidden"
                triggerLabelAnim={false}
                items={TALK_MENU_ITEMS}
                onSelect={(id) => {
                  if (
                    id === 'copy_response_json' ||
                    id === 'download_response_json' ||
                    id === 'download_editor_tapes' ||
                    id === 'reset_talk'
                  ) {
                    onTalkMenu?.(id)
                  }
                }}
              />
            </div>
            <ThemeScroll
              rail="nano"
              scrollClouds={false}
              className="theme-interview-gate__talk-scroll theme-interview-talk-peel__scroll"
            >
              <ul className="theme-interview-gate__talk-list">
                {talk.state.messages.map((msg) => (
                  <li
                    key={msg.id}
                    className={[
                      'theme-interview-gate__talk-msg',
                      msg.role === 'candidate'
                        ? 'theme-interview-gate__talk-msg--candidate'
                        : 'theme-interview-gate__talk-msg--assistant',
                    ].join(' ')}
                  >
                    <p className="type-caption mb-0 theme-interview-gate__talk-role">
                      {msg.role === 'candidate' ? 'You' : talk.context.persona.name}
                    </p>
                    <p className="type-body-sm mb-0 theme-interview-gate__talk-text">{msg.text}</p>
                  </li>
                ))}
              </ul>
            </ThemeScroll>
            {talk.error ? (
              <ChatErrorBubble
                text={sittingChatErrorCopy(talk.error, 'talk')}
                chrome="board"
                onRetry={() => {
                  const text = lastUserPlainText(
                    talk.state.messages.map((m) => ({ role: m.role, text: m.text })),
                  )
                  if (text) onTalkSend?.(text)
                }}
              />
            ) : null}
            <ChatComposer
              mode="bot"
              status={talk.canPass || talk.busy ? 'disabled' : 'idle'}
              draft={talk.state.draft}
              onDraftChange={(v) => onTalkDraftChange?.(v)}
              onSend={(payload) => {
                const text = (payload.text ?? talk.state.draft).trim()
                if (!text || talk.canPass || talk.busy) return
                onTalkSend?.(text)
              }}
              placeholder={
                talk.busy ? 'Thinking…' : talk.canPass ? 'Ready — use Next' : 'Reply…'
              }
            />
          </>
        ) : null}

        {!talkLive && aidReady && assessorAid ? (
          <InterviewAssessorAidPeelChat
            aid={assessorAid}
            attach={assessorAidAttach}
            onSend={onAssessorAidSend}
            onDraftChange={onAssessorAidDraftChange}
            onCiteClick={onAssessorAidCite}
            onDismissAttach={onAssessorAidDismissAttach}
            onOpenRef={onAssessorAidOpenRef}
          />
        ) : null}

        {!talkLive && assistReady && assist ? (
          <InterviewAssistPeelChat
            assist={assist}
            kindLabel={gate?.kindLabel}
            timed={Boolean(gate?.timed)}
            spoilers={Boolean(gate?.assistChrome?.caps.spoilers)}
            onSend={onAssistSend}
            onDraftChange={onAssistDraftChange}
            onCardAction={onAssistCardAction}
            onCitePath={onAssistCitePath}
            onQuestionnaire={onAssistQuestionnaire}
            attachFiles={attachFiles}
            onToggleAttach={onToggleAttach}
            pendingEdits={pendingEdits}
            onPendingAccept={onPendingAccept}
            onPendingReject={onPendingReject}
            onPendingFocus={onPendingFocus}
            onPendingKeepAll={onPendingKeepAll}
            onPendingDiscardAll={onPendingDiscardAll}
          />
        ) : null}

        {showLegacyOpening ? (
          <div
            className="theme-interview-assist-peel theme-interview-creator-chat theme-interview-assist-peel--opening"
            aria-busy="true"
            aria-label="Opening stage assist"
          />
        ) : null}
      </div>
    </div>
  )
}
