/**
 * CodeEditor feature catalog — notation ids, import/export fidelity, and IR hints.
 */
import { F } from '../catalogFidelity'
import type { CodeEditorFeature, CodeFeatureCategory, CodeFormatId } from './types'

export type { CodeEditorFeature, CodeFeatureCategory, CodeFormatId, CodeFeatureFidelity } from './types'

export const CODE_FEATURE_CATEGORY_LABELS: Record<CodeFeatureCategory, string> = {
  chrome: 'Workbench chrome',
  interaction: 'Interaction',
  io: 'Context I/O',
  alt: 'Alternate previews',
}

export const CODE_FORMAT_LABELS: Record<CodeFormatId, string> = {
  'native-json': 'Native JSON',
  zip: 'ZIP archive',
}

export const CODE_EDITOR_FEATURES: CodeEditorFeature[] = [
  {
    id: 'code.io.native-json',
    label: 'Native JSON context',
    category: 'io',
    usable: true,
    notation: 'envelope.payload.files',
    import: { 'native-json': F.full, zip: F.na },
    export: { 'native-json': F.full, zip: F.na },
  },
  {
    id: 'code.io.zip',
    label: 'ZIP archive import / export',
    category: 'io',
    usable: true,
    notation: 'payload.zip (multi-file bundle)',
    import: { 'native-json': F.na, zip: F.full },
    export: { 'native-json': F.na, zip: F.full },
    notes: 'Bundles workspace files into a single archive for download or upload.',
  },
  {
    id: 'code.io.file-download',
    label: 'Runtime file download',
    category: 'io',
    usable: true,
    notation: 'runtime.download @path',
    import: { 'native-json': F.na, zip: F.na },
    export: { 'native-json': F.na, zip: F.na },
    notes: 'Runtime-only — triggers browser download of the active buffer; not serialized in context.',
    actions: ['code.action.file-download'],
  },
  {
    id: 'code.io.upload-files',
    label: 'Upload files into workspace',
    category: 'io',
    usable: true,
    notation: 'runtime.upload → payload.files[]',
    import: { 'native-json': F.partial, zip: F.full },
    export: { 'native-json': F.partial, zip: F.full },
    actions: ['code.action.upload-files'],
  },
  {
    id: 'code.chrome.tabs',
    label: 'Editor tabs',
    category: 'chrome',
    usable: true,
    notation: 'chrome.tabs[] open buffers',
    import: { 'native-json': F.na, zip: F.na },
    export: { 'native-json': F.na, zip: F.na },
    notes: 'Tab strip for open files — UI chrome, not serialized.',
  },
  {
    id: 'code.chrome.explorer',
    label: 'File explorer tree',
    category: 'chrome',
    usable: true,
    notation: 'chrome.explorer tree of payload.files',
    import: { 'native-json': F.na, zip: F.na },
    export: { 'native-json': F.na, zip: F.na },
    notes: 'Sidebar folder tree — UI chrome, not serialized.',
  },
  {
    id: 'code.alt.csv-preview',
    label: 'CSV preview pane',
    category: 'alt',
    usable: true,
    notation: 'alt.preview=csv @path',
    import: { 'native-json': F.partial, zip: F.fallback },
    export: { 'native-json': F.partial, zip: F.fallback },
    notes: 'Read-only tabular preview for .csv buffers.',
  },
  {
    id: 'code.alt.markdown-preview',
    label: 'Markdown preview pane',
    category: 'alt',
    usable: true,
    notation: 'alt.preview=markdown @path',
    import: { 'native-json': F.partial, zip: F.fallback },
    export: { 'native-json': F.partial, zip: F.fallback },
    notes: 'Rendered markdown preview for .md buffers (default view on open; toggle to code).',
  },
  {
    id: 'code.alt.pdf-preview',
    label: 'PDF preview pane',
    category: 'alt',
    usable: true,
    notation: 'alt.preview=pdf @path',
    import: { 'native-json': F.partial, zip: F.fallback },
    export: { 'native-json': F.partial, zip: F.fallback },
    notes: 'Embedded PDF viewer for binary .pdf buffers.',
  },
  {
    id: 'code.interaction.search',
    label: 'Workspace search',
    category: 'interaction',
    usable: true,
    notation: 'interaction.search query across open files',
    import: { 'native-json': F.na, zip: F.na },
    export: { 'native-json': F.na, zip: F.na },
    actions: ['code.action.search'],
    notes: 'Find-in-files overlay — UI affordance, not serialized.',
  },
]

export const USABLE_CODE_EDITOR_FEATURES = CODE_EDITOR_FEATURES.filter((feature) => feature.usable)

export function codeFeaturesByCategory(category: CodeFeatureCategory): CodeEditorFeature[] {
  return USABLE_CODE_EDITOR_FEATURES.filter((feature) => feature.category === category)
}

export const CODE_EDITOR_FEATURE_CATEGORIES = (
  Object.keys(CODE_FEATURE_CATEGORY_LABELS) as CodeFeatureCategory[]
).filter((category) => codeFeaturesByCategory(category).length > 0)
