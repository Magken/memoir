import type { LexicalEditor } from 'lexical'

export type DocEditorInsertModalKind = 'image' | 'gif' | 'video' | 'youtube'

export type DocEditorInsertModalRequest = {
  kind: DocEditorInsertModalKind
  editor: LexicalEditor
  /** Prefill for URL fields */
  defaultValue?: string
}

export const DOC_EDITOR_INSERT_MODAL_IDS = new Set<DocEditorInsertModalKind>([
  'image',
  'gif',
  'video',
  'youtube',
])

export function docEditorInsertUsesModal(id: string): boolean {
  return DOC_EDITOR_INSERT_MODAL_IDS.has(id as DocEditorInsertModalKind)
}

export function normalizeDocEditorUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}
