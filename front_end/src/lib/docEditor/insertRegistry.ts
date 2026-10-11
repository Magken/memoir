import type { MenuItem } from '../../components/MenuButton'
import type { LucideIcon } from 'lucide-react'
import {
  Calendar,
  ChevronRight,
  Code,
  Columns3,
  FileImage,
  FileVideo,
  Image,
  ListChecks,
  Minus,
  PlusSquare,
  Scissors,
  Sigma,
  StickyNote,
  Table,
  Video,
} from 'lucide-react'
import type { LexicalEditor } from 'lexical'
import { docEditorInsertUsesModal } from './docEditorInsertModalTypes'
import { isDocEditorAssessmentInsertExcluded } from './insertAssessment'
import {
  insertCollapsible,
  insertCodeBlock,
  insertColumnsLayout,
  insertDate,
  insertEquation,
  insertHorizontalRule,
  insertPageBreak,
  insertPoll,
  insertStickyNote,
  insertTable,
} from './insertActions'
import { DOC_EDITOR_LAYOUT_TEMPLATES } from './layoutTemplates'

export type DocEditorInsertItem = {
  id: string
  label: string
  icon: LucideIcon
  run: (editor: LexicalEditor) => void
}

export const DOC_EDITOR_INSERT_ITEMS: DocEditorInsertItem[] = [
  { id: 'horizontal-rule', label: 'Horizontal rule', icon: Minus, run: insertHorizontalRule },
  { id: 'page-break', label: 'Page break', icon: Scissors, run: insertPageBreak },
  { id: 'image', label: 'Image', icon: Image, run: () => {} },
  { id: 'gif', label: 'GIF', icon: FileImage, run: () => {} },
  { id: 'table', label: 'Table', icon: Table, run: (editor) => insertTable(editor) },
  { id: 'poll', label: 'Poll', icon: ListChecks, run: insertPoll },
  { id: 'columns', label: 'Columns layout', icon: Columns3, run: () => {} },
  { id: 'equation', label: 'Equation', icon: Sigma, run: insertEquation },
  { id: 'sticky-note', label: 'Sticky note', icon: StickyNote, run: insertStickyNote },
  { id: 'code', label: 'Code block', icon: Code, run: insertCodeBlock },
  { id: 'collapsible', label: 'Collapsible', icon: ChevronRight, run: insertCollapsible },
  { id: 'date', label: 'Date', icon: Calendar, run: insertDate },
  { id: 'video', label: 'Video', icon: FileVideo, run: () => {} },
  { id: 'youtube', label: 'YouTube video', icon: Video, run: () => {} },
]

export { docEditorInsertUsesModal }
export { DOC_EDITOR_ASSESSMENT_INSERT_EXCLUDE, isDocEditorAssessmentInsertExcluded } from './insertAssessment'

const INSERT_MENU_EXCLUDED = new Set(['horizontal-rule', 'page-break', 'table'])

/** Portaled insert menu — excludes toolbar quick inserts */
export const DOC_EDITOR_INSERT_MENU_ITEMS = DOC_EDITOR_INSERT_ITEMS.filter(
  (item) => !INSERT_MENU_EXCLUDED.has(item.id),
)

export const DOC_EDITOR_INSERT_ICONS = {
  menu: PlusSquare,
} as const

/** Tray MenuButton rows — column templates are flattened (no nested picker). */
export function docEditorInsertMenuButtonItems(opts?: {
  chrome?: 'full' | 'section' | 'preview'
}): MenuItem[] {
  const assessment = opts?.chrome === 'section'
  const items: MenuItem[] = []

  for (const item of DOC_EDITOR_INSERT_MENU_ITEMS) {
    if (assessment && isDocEditorAssessmentInsertExcluded(item.id)) continue
    if (item.id === 'columns') {
      for (const template of DOC_EDITOR_LAYOUT_TEMPLATES) {
        items.push({ id: `columns:${template.id}`, label: template.label, icon: Columns3 })
      }
      continue
    }
    items.push({ id: item.id, label: item.label, icon: item.icon })
  }

  return items
}

export function runDocEditorInsertMenuAction(editor: LexicalEditor, id: string): void {
  if (id.startsWith('columns:')) {
    const templateId = id.slice('columns:'.length)
    const template = DOC_EDITOR_LAYOUT_TEMPLATES.find((entry) => entry.id === templateId)
    if (template) insertColumnsLayout(editor, template.templateColumns)
    return
  }

  const item = DOC_EDITOR_INSERT_MENU_ITEMS.find((entry) => entry.id === id)
  item?.run(editor)
}
