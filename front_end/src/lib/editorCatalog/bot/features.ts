/**
 * BotChat feature catalog — sidebar/titlebar chrome, thread interaction,
 * message rendering parts, composer, and streaming/envelope I/O.
 * Fixture runtime only (lib/chat) — no live backend path yet.
 */
import { F } from '../catalogFidelity'
import type { BotEditorFeature, BotFeatureCategory, BotFormatId } from './types'

export type { BotEditorFeature, BotFeatureCategory, BotFormatId, BotFeatureFidelity } from './types'

export const BOT_FEATURE_CATEGORY_LABELS: Record<BotFeatureCategory, string> = {
  chrome: 'Workbench chrome',
  interaction: 'Thread interaction',
  message: 'Message rendering',
  composer: 'Composer',
  io: 'Streaming I/O',
}

export const BOT_FORMAT_LABELS: Record<BotFormatId, string> = {
  'envelope-json': 'Editor context JSON',
  'native-json': 'Chat snapshot JSON',
}

export const BOT_EDITOR_FEATURES: BotEditorFeature[] = [
  {
    id: 'bot.chrome.sidebar',
    label: 'Conversation sidebar + search',
    category: 'chrome',
    usable: true,
    notation: 'chrome.sidebar={list|search}',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['bot.action.new-chat', 'bot.action.select-chat', 'bot.action.search', 'bot.action.toggle-sidebar'],
    notes: 'Pinned/archived grouping — UI chrome, no format fidelity.',
  },
  {
    id: 'bot.chrome.titlebar',
    label: 'Titlebar + conversation menu',
    category: 'chrome',
    usable: true,
    notation: 'chrome.titlebar',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['bot.action.rename', 'bot.action.open-conversation-menu'],
  },
  {
    id: 'bot.chrome.status',
    label: 'Model + connection status chip',
    category: 'chrome',
    usable: true,
    notation: 'chrome.status={model|streaming|idle}',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    notes: 'Displays active model id and streaming/idle state — presentational only.',
  },
  {
    id: 'bot.interaction.thread-crud',
    label: 'Create, rename, pin, archive, clear, delete',
    category: 'interaction',
    usable: true,
    notation: 'thread.{new|rename|pin|archive|clear|delete}',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: [
      'bot.action.new-chat',
      'bot.action.rename',
      'bot.action.pin',
      'bot.action.archive',
      'bot.action.clear',
      'bot.action.delete',
    ],
  },
  {
    id: 'bot.interaction.search',
    label: 'Sidebar conversation search',
    category: 'interaction',
    usable: true,
    notation: 'interaction.search=title',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['bot.action.search'],
  },
  {
    id: 'bot.message.markdown',
    label: 'Markdown-rendered replies',
    category: 'message',
    usable: true,
    notation: 'message.part=markdown',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    actions: ['bot.action.append-markdown', 'bot.action.copy-message'],
  },
  {
    id: 'bot.message.thinking',
    label: 'Collapsible thinking/reasoning block',
    category: 'message',
    usable: true,
    notation: 'message.part=thinking',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    actions: ['bot.action.toggle-thinking'],
  },
  {
    id: 'bot.message.html',
    label: 'Sandboxed HTML block rendering',
    category: 'message',
    usable: true,
    notation: 'message.part=html',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    actions: ['bot.action.append-html'],
    notes: 'Sanitized via lib/chat/sanitizeHtml before render.',
  },
  {
    id: 'bot.message.gallery',
    label: 'Image/video gallery grid or carousel',
    category: 'message',
    usable: true,
    notation: 'message.part=gallery',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    actions: ['bot.action.append-gallery', 'bot.action.open-media'],
  },
  {
    id: 'bot.message.tool',
    label: 'Tool-call state + action cards',
    category: 'message',
    usable: true,
    notation: 'message.part={tool|card}',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    actions: ['bot.action.append-card', 'bot.action.append-tool-state'],
    notes: 'Card actions dispatch related MCT action ids via ChatCardAction.actionId.',
  },
  {
    id: 'bot.composer.attach',
    label: 'Attach files/images to composer',
    category: 'composer',
    usable: true,
    notation: 'composer.attach=@file',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['bot.action.attach', 'bot.action.remove-attachment'],
  },
  {
    id: 'bot.composer.keyboard',
    label: 'Enter to send, shortcuts, focus',
    category: 'composer',
    usable: true,
    notation: 'composer.keyboard={enter|focus}',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['bot.action.send', 'bot.action.focus-composer'],
  },
  {
    id: 'bot.composer.validation',
    label: 'Draft text validation before send',
    category: 'composer',
    usable: true,
    notation: 'composer.draft.validate',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['bot.action.set-draft'],
    notes: 'Empty draft + no attachments disables send.',
  },
  {
    id: 'bot.io.stream',
    label: 'Streaming assistant responses',
    category: 'io',
    usable: true,
    notation: 'io.stream={append|stop|retry|regenerate}',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['bot.action.send', 'bot.action.stop', 'bot.action.retry', 'bot.action.regenerate'],
    notes: 'Fixture stream simulation — no live model call yet.',
  },
  {
    id: 'bot.io.envelope',
    label: 'Envelope / native JSON snapshot',
    category: 'io',
    usable: true,
    notation: 'envelope.payload.bot',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    notes: 'Serializes BotEditorPayload — conversations, participants, active id.',
  },
]

export const USABLE_BOT_EDITOR_FEATURES = BOT_EDITOR_FEATURES.filter((feature) => feature.usable)

export function botFeaturesByCategory(category: BotFeatureCategory): BotEditorFeature[] {
  return USABLE_BOT_EDITOR_FEATURES.filter((feature) => feature.category === category)
}

export const BOT_EDITOR_FEATURE_CATEGORIES = (
  Object.keys(BOT_FEATURE_CATEGORY_LABELS) as BotFeatureCategory[]
).filter((category) => botFeaturesByCategory(category).length > 0)
