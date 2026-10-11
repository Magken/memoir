import { F } from '../catalogFidelity'
import type { CopilotEditorFeature, CopilotFeatureCategory, CopilotFormatId } from './types'

export type {
  CopilotEditorFeature,
  CopilotFeatureCategory,
  CopilotFormatId,
  CopilotFeatureFidelity,
} from './types'

export const COPILOT_FEATURE_CATEGORY_LABELS: Record<CopilotFeatureCategory, string> = {
  chrome: 'Peel chrome',
  navigation: 'Go to',
  io: 'Live snapshot',
  chat: 'Copilot chat',
}

export const COPILOT_FORMAT_LABELS: Record<CopilotFormatId, string> = {
  'native-json': 'Copilot live doc',
}

export const COPILOT_EDITOR_FEATURES: CopilotEditorFeature[] = [
  {
    id: 'copilot.chrome.pending-apply',
    label: 'Workbench Check/X (code/essay) or immediate form fill',
    category: 'chrome',
    usable: true,
    notation: 'chrome.pendingApply',
    import: { 'native-json': F.na },
    export: { 'native-json': F.na },
    actions: ['copilot.action.apply-pending'],
  },
  {
    id: 'copilot.chrome.diff-fold',
    label: 'Diff fold (ChatBubble collapse)',
    category: 'chrome',
    usable: true,
    notation: 'chrome.diffFold',
    import: { 'native-json': F.na },
    export: { 'native-json': F.na },
  },
  {
    id: 'copilot.chrome.go-to',
    label: 'Reveal question / file / essay / terminal',
    category: 'navigation',
    usable: true,
    notation: 'nav.goto',
    import: { 'native-json': F.na },
    export: { 'native-json': F.na },
    actions: [
      'copilot.action.go-to-edit',
      'copilot.action.go-to-question',
      'copilot.action.go-to-file',
      'copilot.action.go-to-terminal',
      'copilot.action.go-to-essay',
    ],
  },
  {
    id: 'copilot.io.flush-live',
    label: 'Flush getContext before Copilot turn',
    category: 'io',
    usable: true,
    notation: 'io.flushLive',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
    actions: ['copilot.action.flush-live'],
  },
  {
    id: 'copilot.chat.questionnaire',
    label: 'Copilot missing-data questionnaire',
    category: 'chat',
    usable: true,
    notation: 'chat.questionnaire',
    import: { 'native-json': F.na },
    export: { 'native-json': F.na },
  },
]
