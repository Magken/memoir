/**
 * FileExplorer feature catalog — chrome, interaction, fixture I/O, and live backend path.
 * No MCPC spine yet. Offline Theme `docs-files` is fixture-runtime; live Theme
 * `file-management` uses `lib/fileApi` + `source="live"`.
 */
import { F } from '../catalogFidelity'
import type { FilesEditorFeature, FilesFeatureCategory, FilesFormatId } from './types'

export type {
  FilesEditorFeature,
  FilesFeatureCategory,
  FilesFormatId,
  FilesFeatureFidelity,
} from './types'

export const FILES_FEATURE_CATEGORY_LABELS: Record<FilesFeatureCategory, string> = {
  chrome: 'Workbench chrome',
  interaction: 'Interaction',
  io: 'Fixture I/O',
}

export const FILES_FORMAT_LABELS: Record<FilesFormatId, string> = {
  fixture: 'Fixture library',
}

export const FILES_EDITOR_FEATURES: FilesEditorFeature[] = [
  {
    id: 'files.chrome.sidebar',
    label: 'Files | Search side panel',
    category: 'chrome',
    usable: true,
    notation: 'chrome.sidebar={files|search}',
    import: { fixture: F.na },
    export: { fixture: F.na },
    notes: 'Quick access + folder tree or name/content search — UI chrome.',
  },
  {
    id: 'files.chrome.preview',
    label: 'Preview pane',
    category: 'chrome',
    usable: true,
    notation: 'chrome.preview=visible',
    import: { fixture: F.na },
    export: { fixture: F.na },
    notes: 'Type-aware fixture previews + Details metadata.',
  },
  {
    id: 'files.chrome.toolbar',
    label: 'Titlebar + command palette',
    category: 'chrome',
    usable: true,
    notation: 'chrome.toolbar + palette Ctrl/Cmd+K',
    import: { fixture: F.na },
    export: { fixture: F.na },
    actions: ['files.action.open-palette'],
  },
  {
    id: 'files.interaction.tree',
    label: 'Folder tree + nest DnD',
    category: 'interaction',
    usable: true,
    notation: 'interaction.tree.relocate',
    import: { fixture: F.na },
    export: { fixture: F.na },
    actions: ['files.action.move-to'],
  },
  {
    id: 'files.interaction.search',
    label: 'Name and content search',
    category: 'interaction',
    usable: true,
    notation: 'interaction.search={name|content}',
    import: { fixture: F.na },
    export: { fixture: F.na },
    actions: ['files.action.focus-search'],
  },
  {
    id: 'files.interaction.clipboard',
    label: 'Cut / paste clipboard',
    category: 'interaction',
    usable: true,
    notation: 'interaction.clipboard={cut|copy|paste}',
    import: { fixture: F.na },
    export: { fixture: F.na },
    notes: 'Clipboard copy is for Paste; Create copy duplicates in-place.',
  },
  {
    id: 'files.interaction.create-copy',
    label: 'Create copy in same folder',
    category: 'interaction',
    usable: true,
    notation: 'interaction.create-copy → "{name} copy{ext}"',
    import: { fixture: F.na },
    export: { fixture: F.na },
    actions: ['files.action.create-copy'],
  },
  {
    id: 'files.io.upload',
    label: 'Browser upload into fixture',
    category: 'io',
    usable: true,
    notation: 'runtime.upload → fixture.entries[]',
    import: { fixture: F.partial },
    export: { fixture: F.na },
    actions: ['files.action.upload'],
    notes: 'In-memory only — no backend persistence.',
  },
  {
    id: 'files.io.download',
    label: 'Download selected files',
    category: 'io',
    usable: true,
    notation: 'runtime.download @selection',
    import: { fixture: F.na },
    export: { fixture: F.partial },
    actions: ['files.action.download'],
  },
]

export const USABLE_FILES_EDITOR_FEATURES = FILES_EDITOR_FEATURES.filter(
  (feature) => feature.usable,
)

export function filesFeaturesByCategory(category: FilesFeatureCategory): FilesEditorFeature[] {
  return USABLE_FILES_EDITOR_FEATURES.filter((feature) => feature.category === category)
}

export const FILES_EDITOR_FEATURE_CATEGORIES = (
  Object.keys(FILES_FEATURE_CATEGORY_LABELS) as FilesFeatureCategory[]
).filter((category) => filesFeaturesByCategory(category).length > 0)
