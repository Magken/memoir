/**
 * MarkdownRenderer feature catalog — notation ids, import/export fidelity, and IR hints.
 */
import { F } from '../catalogFidelity'
import type { MarkdownEditorFeature, MarkdownFeatureCategory, MarkdownFormatId } from './types'

export type { MarkdownEditorFeature, MarkdownFeatureCategory, MarkdownFormatId, MarkdownFeatureFidelity } from './types'

export const MARKDOWN_FEATURE_CATEGORY_LABELS: Record<MarkdownFeatureCategory, string> = {
  chrome: 'Preview chrome',
  interaction: 'Interaction',
  io: 'Context I/O',
}

export const MARKDOWN_FORMAT_LABELS: Record<MarkdownFormatId, string> = {
  'native-json': 'Native JSON',
  md: 'Markdown',
  tex: 'LaTeX',
}

export const MARKDOWN_EDITOR_FEATURES: MarkdownEditorFeature[] = [
  {
    id: 'markdown.chrome.source',
    label: 'Source editor pane',
    category: 'chrome',
    usable: true,
    notation: 'chrome.source=visible',
    import: { 'native-json': F.na, md: F.na, tex: F.na },
    export: { 'native-json': F.na, md: F.na, tex: F.na },
    actions: ['markdown.action.toggle-preview'],
    notes: 'Monaco or textarea source buffer — UI chrome, not serialized.',
  },
  {
    id: 'markdown.chrome.preview',
    label: 'Rendered preview pane',
    category: 'chrome',
    usable: true,
    notation: 'chrome.preview=visible',
    import: { 'native-json': F.na, md: F.na, tex: F.na },
    export: { 'native-json': F.na, md: F.na, tex: F.na },
    actions: ['markdown.action.toggle-preview'],
    notes: 'Split-pane rendered markdown — UI chrome, not serialized.',
  },
  {
    id: 'markdown.io.md',
    label: 'Markdown import / export',
    category: 'io',
    usable: true,
    notation: 'payload.markdown',
    import: { 'native-json': F.na, md: F.full, tex: F.na },
    export: { 'native-json': F.na, md: F.full, tex: F.na },
  },
  {
    id: 'markdown.io.tex',
    label: 'LaTeX import / export',
    category: 'io',
    usable: true,
    notation: 'payload.tex',
    import: { 'native-json': F.na, md: F.na, tex: F.full },
    export: { 'native-json': F.na, md: F.na, tex: F.full },
    actions: ['markdown.action.toggle-latex-mode'],
    notes: 'LaTeX mode toggles source language and export target.',
  },
  {
    id: 'markdown.io.native-json',
    label: 'Native JSON context',
    category: 'io',
    usable: true,
    notation: 'envelope.payload.markdown',
    import: { 'native-json': F.full, md: F.na, tex: F.na },
    export: { 'native-json': F.full, md: F.na, tex: F.na },
  },
]

export const USABLE_MARKDOWN_EDITOR_FEATURES = MARKDOWN_EDITOR_FEATURES.filter((feature) => feature.usable)

export function markdownFeaturesByCategory(category: MarkdownFeatureCategory): MarkdownEditorFeature[] {
  return USABLE_MARKDOWN_EDITOR_FEATURES.filter((feature) => feature.category === category)
}

export const MARKDOWN_EDITOR_FEATURE_CATEGORIES = (
  Object.keys(MARKDOWN_FEATURE_CATEGORY_LABELS) as MarkdownFeatureCategory[]
).filter((category) => markdownFeaturesByCategory(category).length > 0)
