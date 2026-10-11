import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { BOT_EDITOR_ACTIONS } from './actions'
import {
  BOT_EDITOR_FEATURES,
  BOT_FEATURE_CATEGORY_LABELS,
  BOT_FORMAT_LABELS,
} from './features'
import type { BotFeatureCategory, BotFormatId } from './types'

export const BOT_CATALOG: EditorCatalog<BotFeatureCategory, BotFormatId> = {
  kind: 'bot',
  features: BOT_EDITOR_FEATURES,
  actions: BOT_EDITOR_ACTIONS,
  categoryLabels: BOT_FEATURE_CATEGORY_LABELS,
  formatLabels: BOT_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
