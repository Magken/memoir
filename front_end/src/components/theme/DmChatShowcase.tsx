import { useCallback, useMemo, useRef, useState } from 'react'
import { DmChat, DmChatEmbed, type DmChatHandle } from '../DmChat'
import { ChatBubble } from '../chatParts/ChatBubble'
import { ChatComposer, type ChatComposerStatus } from '../chatParts/ChatComposer'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { createDmSeed } from '../../lib/chat'
import { EditorActionSpineLab } from './EditorActionSpineLab'
import { EditorFeatureTable } from './EditorFeatureTable'

const DM_SCENARIOS = [
  { id: 'dm_maya', label: '1:1 active' },
  { id: 'dm_group_design', label: 'Group' },
  { id: 'dm_media', label: 'Media' },
  { id: 'dm_archived', label: 'Archived' },
] as const

export function DmChatShowcase() {
  const runtimeRef = useRef<DmChatHandle>(null)
  const [scenario, setScenario] = useState('dm_maya')
  const [composerStatus, setComposerStatus] = useState<ChatComposerStatus>('idle')
  const seed = useMemo(() => createDmSeed(), [])

  const loadScenario = useCallback(
    (id: string) => {
      setScenario(id)
      void runtimeRef.current?.loadContext({
        ...seed,
        activeConversationId: id,
      })
    },
    [seed],
  )

  const maya = seed.participants.find((p) => p.id === 'user_maya')
  const self = seed.participants.find((p) => p.id === 'user_self')

  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure">
        Fixture-only DmChat — WhatsApp-like 1:1 and group threads with presence, delivery ticks,
        replies, reactions, media, and group management. Live M-link action spine. No backend.
      </p>

      <EditorFeatureTable kind="dm" />
      <EditorContextDemoBar targetKind="dm" runtimeRef={runtimeRef} />
      <EditorActionSpineLab kind="dm" runtimeRef={runtimeRef} />

      <div className="space-y-3">
        <p className="type-label">Workbench scenarios</p>
        <div className="flex flex-wrap gap-2">
          {DM_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={[
                'rounded-full border border-[var(--theme-border)] px-3 py-1 type-caption',
                scenario === s.id ? 'bg-[var(--theme-surface-raised)]' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => loadScenario(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <DmChat ref={runtimeRef} variant="showcase" initialTitle="Showcase DMs" />
      </div>

      <div className="space-y-3">
        <p className="type-label">Composer laboratory</p>
        <div className="flex flex-wrap gap-2">
          {(['idle', 'sending', 'failed', 'disabled'] as const).map((status) => (
            <button
              key={status}
              type="button"
              className="rounded-full border border-[var(--theme-border)] px-3 py-1 type-caption"
              onClick={() => setComposerStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="max-w-xl overflow-hidden rounded-[var(--theme-radius-control)] border border-[var(--theme-border)]">
          <ChatComposer
            mode="dm"
            status={composerStatus}
            showCaption
            draft="Caption + attach flow"
            caption="Optional media caption"
            onSend={async () => undefined}
            onRetry={() => setComposerStatus('idle')}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="type-label">Bubble gallery</p>
        <div className="max-w-xl space-y-3 rounded-[var(--theme-radius-control)] border border-[var(--theme-border)] p-4">
          <ChatBubble
            message={{
              id: 'in1',
              conversationId: 'x',
              role: 'member',
              senderId: 'user_maya',
              parts: [{ type: 'text', text: 'Incoming with reactions' }],
              createdAt: new Date().toISOString(),
              reactions: [{ emoji: '👍', participantIds: ['user_self'] }],
            }}
            sender={maya}
            align="start"
            onReply={() => undefined}
          />
          <ChatBubble
            message={{
              id: 'out1',
              conversationId: 'x',
              role: 'member',
              senderId: 'user_self',
              parts: [{ type: 'text', text: 'Outgoing delivered' }],
              createdAt: new Date().toISOString(),
              delivery: 'delivered',
              replyToId: 'in1',
            }}
            sender={self}
            align="end"
            replyPreview="Incoming with reactions"
          />
          <ChatBubble
            message={{
              id: 'fail1',
              conversationId: 'x',
              role: 'member',
              senderId: 'user_self',
              parts: [{ type: 'text', text: 'Failed send' }],
              createdAt: new Date().toISOString(),
              delivery: 'failed',
            }}
            sender={self}
            align="end"
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="type-label">Embed</p>
        <DmChatEmbed className="max-w-md" />
      </div>
    </div>
  )
}
