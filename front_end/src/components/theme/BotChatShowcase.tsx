import { useCallback, useMemo, useRef, useState } from 'react'
import { BotChat, BotChatEmbed, type BotChatHandle } from '../BotChat'
import { ChatBubble, ChatMessageParts } from '../chatParts/ChatBubble'
import { ChatComposer, type ChatComposerStatus } from '../chatParts/ChatComposer'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { createBotSeed, type MessagePart, type StagedAttachment } from '../../lib/chat'
import { EditorActionSpineLab } from './EditorActionSpineLab'
import { EditorFeatureTable } from './EditorFeatureTable'

const BOT_SCENARIOS = [
  { id: 'bot_conv_fresh', label: 'Fresh' },
  { id: 'bot_conv_active', label: 'Active' },
  { id: 'bot_conv_markdown', label: 'Markdown' },
  { id: 'bot_conv_html', label: 'HTML' },
  { id: 'bot_conv_gallery', label: 'Gallery' },
  { id: 'bot_conv_tools', label: 'Tools' },
  { id: 'bot_conv_long', label: 'Long' },
  { id: 'bot_conv_fail', label: 'Failure' },
] as const

const SAMPLE_PARTS: MessagePart[] = [
  { type: 'markdown', markdown: '### Markdown sample\n\n- list\n- [link](https://example.com)\n\n`code`' },
  {
    type: 'html',
    title: 'Safe HTML',
    html: '<section><h3>Card</h3><p>Allowlisted <a href="https://example.com">link</a>.</p><script>alert(1)</script></section>',
  },
  {
    type: 'gallery',
    layout: 'grid',
    items: [
      { id: 's1', src: 'https://picsum.photos/seed/show1/400/400', alt: '1' },
      { id: 's2', src: 'https://picsum.photos/seed/show2/400/400', alt: '2' },
      { id: 's3', src: 'https://picsum.photos/seed/show3/400/400', alt: '3' },
      { id: 's4', src: 'https://picsum.photos/seed/show4/400/400', alt: '4' },
      { id: 's5', src: 'https://picsum.photos/seed/show5/400/400', alt: '5' },
    ],
  },
  {
    type: 'gallery',
    layout: 'carousel',
    items: [
      { id: 'c1', src: 'https://picsum.photos/seed/car1/640/400', alt: 'A' },
      { id: 'c2', src: 'https://picsum.photos/seed/car2/640/400', alt: 'B' },
    ],
  },
  {
    type: 'card',
    title: 'Composer tip',
    body: 'Stage files in the rail before send.',
    actions: [{ id: 'x', label: 'Focus composer', actionId: 'bot.action.focus-composer' }],
  },
  {
    type: 'tool',
    name: 'search_docs',
    state: 'success',
    request: '{"q":"composer"}',
    result: '{"hits":3}',
  },
  {
    type: 'tool',
    name: 'fetch_media',
    state: 'error',
    request: '{}',
    error: 'Fixture media unavailable',
  },
  {
    type: 'attachment',
    attachment: {
      id: 'vid',
      name: 'demo.mp4',
      kind: 'video',
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      posterUrl: 'https://picsum.photos/seed/vshow/640/360',
    },
  },
  {
    type: 'attachment',
    attachment: { id: 'pdf', name: 'spec.pdf', kind: 'pdf', sizeBytes: 120_000 },
  },
  {
    type: 'attachment',
    attachment: { id: 'bad', name: 'broken.bin', kind: 'unknown', error: 'Preview unavailable' },
  },
]

const FAKE_ATTACHMENTS: StagedAttachment[] = [
  {
    id: 'a1',
    name: 'shot.png',
    kind: 'image',
    url: 'https://picsum.photos/seed/comp1/200/200',
    sizeBytes: 40_000,
  },
  {
    id: 'a2',
    name: 'notes.pdf',
    kind: 'pdf',
    sizeBytes: 88_000,
  },
]

export function BotChatShowcase() {
  const runtimeRef = useRef<BotChatHandle>(null)
  const [scenario, setScenario] = useState<string>('bot_conv_active')
  const [composerStatus, setComposerStatus] = useState<ChatComposerStatus>('idle')
  const seed = useMemo(() => createBotSeed(), [])

  const loadScenario = useCallback(
    (id: string) => {
      setScenario(id)
      const payload = {
        ...seed,
        activeConversationId: id,
      }
      void runtimeRef.current?.loadContext(payload)
    },
    [seed],
  )

  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure">
        Fixture-only BotChat — ChatGPT-like threads with markdown, thinking, sanitized HTML, galleries,
        tool chrome, and a live M-link action spine. No backend.
      </p>

      <EditorFeatureTable kind="bot" />
      <EditorContextDemoBar targetKind="bot" runtimeRef={runtimeRef} />
      <EditorActionSpineLab kind="bot" runtimeRef={runtimeRef} />

      <div className="space-y-3">
        <p className="type-label">Workbench scenarios</p>
        <div className="flex flex-wrap gap-2">
          {BOT_SCENARIOS.map((s) => (
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
        <BotChat ref={runtimeRef} variant="showcase" initialTitle="Showcase bot" />
      </div>

      <div className="space-y-3">
        <p className="type-label">Composer laboratory</p>
        <div className="flex flex-wrap gap-2">
          {(['idle', 'sending', 'streaming', 'failed', 'disabled'] as const).map((status) => (
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
            mode="bot"
            status={composerStatus}
            draft={composerStatus === 'idle' ? '' : 'Draft retained on failure…'}
            onSend={async () => undefined}
            onStop={() => setComposerStatus('idle')}
            onRetry={() => setComposerStatus('idle')}
            hint="Enter to send · Shift+Enter for newline"
          />
        </div>
        <p className="type-caption type-muted">
          Attachment rail preview (static samples): {FAKE_ATTACHMENTS.map((a) => a.name).join(', ')}
        </p>
      </div>

      <div className="space-y-3">
        <p className="type-label">Message-part gallery</p>
        <div className="max-w-2xl space-y-4 rounded-[var(--theme-radius-control)] border border-[var(--theme-border)] p-4">
          <ChatMessageParts parts={SAMPLE_PARTS} />
          <ChatBubble
            message={{
              id: 'demo_bubble',
              conversationId: 'x',
              role: 'assistant',
              senderId: 'bot_atlas',
              parts: [{ type: 'thinking', text: 'Planning the reply…', collapsed: false }],
              createdAt: new Date().toISOString(),
            }}
            sender={{ id: 'bot_atlas', displayName: 'Atlas', initials: 'AT', role: 'bot' }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="type-label">Embed</p>
        <BotChatEmbed className="max-w-md" />
      </div>
    </div>
  )
}
