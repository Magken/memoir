/**
 * DmChat feature catalog — sidebar/titlebar chrome, thread + group interaction,
 * message actions, composer, and presence/delivery/envelope I/O.
 * Fixture runtime only (lib/chat) — no live backend path yet.
 */
import { F } from '../catalogFidelity'
import type { DmEditorFeature, DmFeatureCategory, DmFormatId } from './types'

export type { DmEditorFeature, DmFeatureCategory, DmFormatId, DmFeatureFidelity } from './types'

export const DM_FEATURE_CATEGORY_LABELS: Record<DmFeatureCategory, string> = {
  chrome: 'Workbench chrome',
  interaction: 'Thread interaction',
  message: 'Message actions',
  group: 'Group management',
  composer: 'Composer',
  io: 'Presence + delivery I/O',
}

export const DM_FORMAT_LABELS: Record<DmFormatId, string> = {
  'envelope-json': 'Editor context JSON',
  'native-json': 'Chat snapshot JSON',
}

export const DM_EDITOR_FEATURES: DmEditorFeature[] = [
  {
    id: 'dm.chrome.sidebar',
    label: 'Conversation + group sidebar list',
    category: 'chrome',
    usable: true,
    notation: 'chrome.sidebar={list|filter}',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['dm.action.new-dm', 'dm.action.select-chat', 'dm.action.filter-chats', 'dm.action.toggle-sidebar'],
  },
  {
    id: 'dm.chrome.titlebar',
    label: 'Titlebar + presence chip',
    category: 'chrome',
    usable: true,
    notation: 'chrome.titlebar',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['dm.action.rename', 'dm.action.open-info'],
  },
  {
    id: 'dm.chrome.info-panel',
    label: 'Conversation/group info side panel',
    category: 'chrome',
    usable: true,
    notation: 'chrome.info-panel=visible',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['dm.action.toggle-info', 'dm.action.open-info'],
  },
  {
    id: 'dm.interaction.thread-crud',
    label: 'Rename, pin, mute, archive, delete',
    category: 'interaction',
    usable: true,
    notation: 'thread.{new|rename|pin|mute|archive|delete}',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: [
      'dm.action.new-dm',
      'dm.action.rename',
      'dm.action.pin',
      'dm.action.mute',
      'dm.action.archive',
      'dm.action.delete',
    ],
  },
  {
    id: 'dm.interaction.filter',
    label: 'Sidebar chat filter/search',
    category: 'interaction',
    usable: true,
    notation: 'interaction.filter=query',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['dm.action.filter-chats'],
  },
  {
    id: 'dm.message.reply',
    label: 'Quoted reply threading',
    category: 'message',
    usable: true,
    notation: 'message.reply @messageId',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    actions: ['dm.action.reply'],
  },
  {
    id: 'dm.message.react',
    label: 'Emoji reactions',
    category: 'message',
    usable: true,
    notation: 'message.react @messageId=@emoji',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    actions: ['dm.action.react'],
  },
  {
    id: 'dm.message.copy-delete',
    label: 'Copy + delete-for-me',
    category: 'message',
    usable: true,
    notation: 'message.{copy|delete-for-me} @messageId',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['dm.action.copy', 'dm.action.delete-for-me'],
  },
  {
    id: 'dm.message.media',
    label: 'Open image/video/pdf attachment',
    category: 'message',
    usable: true,
    notation: 'message.media.open @attachmentId',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    actions: ['dm.action.open-media'],
  },
  {
    id: 'dm.group.membership',
    label: 'Create groups + add/remove members',
    category: 'group',
    usable: true,
    notation: 'group.{new|member.add|member.remove|leave}',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    actions: ['dm.action.new-group', 'dm.action.add-member', 'dm.action.remove-member', 'dm.action.leave'],
    notes: 'ChatConversation.participantIds — group kind conversation.',
  },
  {
    id: 'dm.group.roles',
    label: 'Group role + metadata management',
    category: 'group',
    usable: true,
    notation: 'group.{update|member.set-role}',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    actions: ['dm.action.update-group', 'dm.action.set-role'],
    notes: 'ChatParticipantRole per member — member/admin/owner.',
  },
  {
    id: 'dm.composer.attach',
    label: 'Attach files/images + caption',
    category: 'composer',
    usable: true,
    notation: 'composer.{attach|caption}',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['dm.action.attach', 'dm.action.remove-attachment', 'dm.action.set-caption'],
  },
  {
    id: 'dm.composer.keyboard',
    label: 'Draft, send, focus composer',
    category: 'composer',
    usable: true,
    notation: 'composer.{draft|send|focus}',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: ['dm.action.set-draft', 'dm.action.send', 'dm.action.focus-composer'],
  },
  {
    id: 'dm.io.presence',
    label: 'Presence, typing, delivery, read receipts',
    category: 'io',
    usable: true,
    notation: 'io.{presence|typing|delivery|read}',
    import: { 'envelope-json': F.na, 'native-json': F.na },
    export: { 'envelope-json': F.na, 'native-json': F.na },
    actions: [
      'dm.action.set-presence',
      'dm.action.set-typing',
      'dm.action.set-delivery-state',
      'dm.action.mark-read',
    ],
    notes: 'Fixture-driven presence/typing/delivery simulation — no live socket yet.',
  },
  {
    id: 'dm.io.envelope',
    label: 'Envelope / native JSON snapshot',
    category: 'io',
    usable: true,
    notation: 'envelope.payload.dm',
    import: { 'envelope-json': F.full, 'native-json': F.full },
    export: { 'envelope-json': F.full, 'native-json': F.full },
    notes: 'Serializes DmEditorPayload — conversations, participants, active id.',
  },
]

export const USABLE_DM_EDITOR_FEATURES = DM_EDITOR_FEATURES.filter((feature) => feature.usable)

export function dmFeaturesByCategory(category: DmFeatureCategory): DmEditorFeature[] {
  return USABLE_DM_EDITOR_FEATURES.filter((feature) => feature.category === category)
}

export const DM_EDITOR_FEATURE_CATEGORIES = (
  Object.keys(DM_FEATURE_CATEGORY_LABELS) as DmFeatureCategory[]
).filter((category) => dmFeaturesByCategory(category).length > 0)
