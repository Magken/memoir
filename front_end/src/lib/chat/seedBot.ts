import type { BotEditorPayload, ChatConversation, ChatMessage, ChatParticipant } from './types'
import { createId, nowIso } from './utils'

const SELF: ChatParticipant = {
  id: 'user_self',
  displayName: 'You',
  handle: '@you',
  initials: 'YO',
  role: 'self',
  presence: 'online',
}

const BOT: ChatParticipant = {
  id: 'bot_atlas',
  displayName: 'Atlas',
  handle: '@atlas',
  initials: 'AT',
  role: 'bot',
  presence: 'online',
}

function msg(
  conversationId: string,
  role: ChatMessage['role'],
  senderId: string,
  parts: ChatMessage['parts'],
  minutesAgo: number,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: createId('msg'),
    conversationId,
    role,
    senderId,
    parts,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    ...extra,
  }
}

const MARKDOWN_STRESS = `## Markdown stress

Paragraph with **bold**, *italic*, \`inline code\`, and a [safe link](https://example.com).

- List item one
- [ ] Task open
- [x] Task done

> Quoted guidance

\`\`\`ts
export function greet(name: string) {
  return \`Hello \${name}\`
}
\`\`\`

| Col | Value |
| --- | ----- |
| A | 1 |
| B | 2 |

$$E = mc^2$$

\`\`\`mermaid
flowchart LR
  A[User] --> B[Bot]
\`\`\`
`

const HTML_SAFE = `
<section class="chat-html-card">
  <h3>Safe HTML card</h3>
  <p>Allowlisted markup with a <a href="https://example.com">link</a>.</p>
  <table><thead><tr><th>Item</th><th>Qty</th></tr></thead>
  <tbody><tr><td>Widgets</td><td>3</td></tr></tbody></table>
  <details><summary>More</summary><p>Nested details content.</p></details>
  <img src="https://picsum.photos/seed/chathtml/480/240" alt="Demo" />
</section>
<script>alert('should be stripped')</script>
`

export function createBotSeed(): BotEditorPayload {
  const freshId = 'bot_conv_fresh'
  const activeId = 'bot_conv_active'
  const mdId = 'bot_conv_markdown'
  const htmlId = 'bot_conv_html'
  const galleryId = 'bot_conv_gallery'
  const toolsId = 'bot_conv_tools'
  const longId = 'bot_conv_long'
  const failId = 'bot_conv_fail'

  const conversations: ChatConversation[] = [
    {
      id: freshId,
      surface: 'bot',
      kind: 'bot',
      title: 'New chat',
      model: 'atlas-demo',
      participantIds: [SELF.id, BOT.id],
      messages: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: activeId,
      surface: 'bot',
      kind: 'bot',
      title: 'Active answer',
      model: 'atlas-demo',
      participantIds: [SELF.id, BOT.id],
      pinned: true,
      messages: [
        msg(activeId, 'user', SELF.id, [{ type: 'text', text: 'Summarize the upload flow and show a gallery.' }], 12),
        msg(
          activeId,
          'assistant',
          BOT.id,
          [
            {
              type: 'thinking',
              text: 'Checking attachment patterns, then drafting a concise answer with a gallery.',
              collapsed: false,
            },
            {
              type: 'markdown',
              markdown:
                'Here is a calm summary of the composer upload flow:\n\n1. Stage files in the preview rail\n2. Validate limits\n3. Send text + attachments together\n\nA small gallery follows.',
            },
            {
              type: 'gallery',
              layout: 'carousel',
              items: [
                { id: 'g1', src: 'https://picsum.photos/seed/bot1/640/400', alt: 'Preview 1' },
                { id: 'g2', src: 'https://picsum.photos/seed/bot2/640/400', alt: 'Preview 2' },
                { id: 'g3', src: 'https://picsum.photos/seed/bot3/640/400', alt: 'Preview 3' },
              ],
            },
          ],
          11,
        ),
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: mdId,
      surface: 'bot',
      kind: 'bot',
      title: 'Markdown stress',
      model: 'atlas-demo',
      participantIds: [SELF.id, BOT.id],
      messages: [
        msg(mdId, 'user', SELF.id, [{ type: 'text', text: 'Show every markdown case.' }], 40),
        msg(mdId, 'assistant', BOT.id, [{ type: 'markdown', markdown: MARKDOWN_STRESS }], 39),
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: htmlId,
      surface: 'bot',
      kind: 'bot',
      title: 'Safe HTML',
      model: 'atlas-demo',
      participantIds: [SELF.id, BOT.id],
      messages: [
        msg(htmlId, 'user', SELF.id, [{ type: 'text', text: 'Render an HTML card.' }], 50),
        msg(htmlId, 'assistant', BOT.id, [{ type: 'html', html: HTML_SAFE, title: 'HTML island' }], 49),
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: galleryId,
      surface: 'bot',
      kind: 'bot',
      title: 'Element gallery',
      model: 'atlas-demo',
      participantIds: [SELF.id, BOT.id],
      messages: [
        msg(galleryId, 'user', SELF.id, [{ type: 'text', text: 'Show galleries and cards.' }], 55),
        msg(
          galleryId,
          'assistant',
          BOT.id,
          [
            {
              type: 'gallery',
              layout: 'host',
              items: [
                { id: 'h1', src: 'https://picsum.photos/seed/host1/800/500', alt: 'Host 1' },
                { id: 'h2', src: 'https://picsum.photos/seed/host2/800/500', alt: 'Host 2' },
                { id: 'h3', src: 'https://picsum.photos/seed/host3/800/500', alt: 'Host 3' },
                { id: 'h4', src: 'https://picsum.photos/seed/host4/800/500', alt: 'Host 4' },
              ],
            },
            {
              type: 'card',
              title: 'Composer tip',
              body: 'Use the mini thumbnail strip for image batches before send.',
              actions: [
                { id: 'a1', label: 'Focus composer', actionId: 'bot.action.focus-composer' },
                { id: 'a2', label: 'New chat', actionId: 'bot.action.new-chat' },
              ],
            },
          ],
          54,
        ),
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: toolsId,
      surface: 'bot',
      kind: 'bot',
      title: 'Tool lifecycle',
      model: 'atlas-demo',
      participantIds: [SELF.id, BOT.id],
      messages: [
        msg(toolsId, 'user', SELF.id, [{ type: 'text', text: 'Call a few tools.' }], 60),
        msg(
          toolsId,
          'assistant',
          BOT.id,
          [
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
              state: 'running',
              request: '{"id":"media_12"}',
            },
            {
              type: 'tool',
              name: 'render_gallery',
              state: 'error',
              request: '{"layout":"host"}',
              error: 'Fixture media unavailable',
            },
            { type: 'markdown', markdown: 'Tool states are visible above for Theme inspection.' },
          ],
          59,
        ),
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: longId,
      surface: 'bot',
      kind: 'bot',
      title: 'Long history',
      model: 'atlas-demo',
      participantIds: [SELF.id, BOT.id],
      messages: Array.from({ length: 24 }, (_, i) =>
        msg(
          longId,
          i % 2 === 0 ? 'user' : 'assistant',
          i % 2 === 0 ? SELF.id : BOT.id,
          [
            {
              type: i % 2 === 0 ? 'text' : 'markdown',
              ...(i % 2 === 0
                ? { text: `User message ${i + 1}` }
                : { markdown: `Assistant reply **${i + 1}** with a short note.` }),
            } as ChatMessage['parts'][number],
          ],
          200 - i * 8,
        ),
      ),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: failId,
      surface: 'bot',
      kind: 'bot',
      title: 'Failure cases',
      model: 'atlas-demo',
      participantIds: [SELF.id, BOT.id],
      messages: [
        msg(
          failId,
          'user',
          SELF.id,
          [{ type: 'text', text: 'This send failed in the fixture.' }],
          5,
          { delivery: 'failed' },
        ),
        msg(failId, 'assistant', BOT.id, [
          { type: 'html', html: '<a href="javascript:alert(1)">bad link</a><p>Sanitized host</p>' },
          {
            type: 'attachment',
            attachment: {
              id: 'bad_att',
              name: 'broken.bin',
              kind: 'unknown',
              error: 'Preview unavailable',
            },
          },
        ], 4),
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ]

  return {
    title: 'Bot chats',
    model: 'atlas-demo',
    activeConversationId: activeId,
    conversations,
    participants: [SELF, BOT],
  }
}

export const BOT_SUGGESTED_PROMPTS = [
  'Explain the composer attachment rail',
  'Show a markdown table and code block',
  'Render a safe HTML card with a gallery',
  'Walk through tool call states',
]
