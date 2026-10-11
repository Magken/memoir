import { F } from '../catalogFidelity'
import type { Creator2EditorFeature, Creator2FeatureCategory, Creator2FormatId } from './types'

export type {
  Creator2EditorFeature,
  Creator2FeatureCategory,
  Creator2FormatId,
  Creator2FeatureFidelity,
} from './types'

export const CREATOR2_FEATURE_CATEGORY_LABELS: Record<Creator2FeatureCategory, string> = {
  chrome: 'Board chrome',
  navigation: 'Section navigation',
  io: 'Persist',
  chat: 'Board chat',
}

export const CREATOR2_FORMAT_LABELS: Record<Creator2FormatId, string> = {
  'native-json': 'Creator-2 brief JSON',
}

export const CREATOR2_EDITOR_FEATURES: Creator2EditorFeature[] = [
  {
    id: 'creator2.chrome.edit-stage',
    label: 'Section edit stage',
    category: 'chrome',
    usable: true,
    notation: 'chrome.editStage',
    import: { 'native-json': F.na },
    export: { 'native-json': F.na },
    actions: ['creator2.action.open-section', 'creator2.action.exit-edit', 'creator2.action.focus-section'],
  },
  {
    id: 'creator2.navigation.sections',
    label: 'Scroll / open day sections',
    category: 'navigation',
    usable: true,
    notation: 'nav.sections',
    import: { 'native-json': F.na },
    export: { 'native-json': F.na },
    actions: [
      'creator2.action.scroll-to-section',
      'creator2.action.open-section',
      'creator2.action.focus-section',
    ],
  },
  {
    id: 'creator2.io.save',
    label: 'Save brief to Drive',
    category: 'io',
    usable: true,
    notation: 'io.save',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
    actions: ['creator2.action.save', 'creator2.action.flush-before-bot-turn'],
  },
  {
    id: 'creator2.chat.clarifications',
    label: 'Board clarification questions',
    category: 'chat',
    usable: true,
    notation: 'chat.clarifications',
    import: { 'native-json': F.na },
    export: { 'native-json': F.na },
    actions: ['creator2.action.submit-clarifications'],
  },
  {
    id: 'creator2.chat.board-edit',
    label: 'Live board edit (interview-brief-edit)',
    category: 'chat',
    usable: true,
    notation: 'chat.boardEdit',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
    actions: ['creator2.action.apply-edited-body', 'creator2.action.flush-before-bot-turn'],
  },
]
