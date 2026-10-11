import type { Item } from '@glideapps/glide-data-grid'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { RefObject } from 'react'
import type { PdfFindBridge } from '../docs/pdfFindBridge'
import type { DataGridSheet } from '../dataGridEditor/sheetModel'
import type { CodeEditorAltView, CodeEditorAlternateFileKind } from './alternateView'

export type CodeEditorSearchAdapterKind = 'monaco' | 'pdf' | 'markdown' | 'grid'

export type CodeEditorPdfSearchHost = {
  kind: 'pdf'
  pdfDocument: PDFDocumentProxy | null
  page: number
  setPage: (page: number) => void
  findBridge: PdfFindBridge
  disabled: boolean
}

export type CodeEditorGridSearchHost = {
  kind: 'grid'
  sheet: DataGridSheet
  editable: boolean
  onMutateSheet: (mutator: (draft: DataGridSheet) => void) => void
  scrollToCell: (col: number, row: number) => void
  selectCell: (col: number, row: number) => void
  onSearchResultsChange: (results: readonly Item[]) => void
}

export type CodeEditorMarkdownSearchHost = {
  kind: 'markdown'
  source: string
  previewRootRef: RefObject<HTMLElement | null>
}

export type CodeEditorMonacoSearchHost = {
  kind: 'monaco'
}

export type CodeEditorSearchHost =
  | CodeEditorMonacoSearchHost
  | CodeEditorPdfSearchHost
  | CodeEditorGridSearchHost
  | CodeEditorMarkdownSearchHost

export function resolveSearchAdapter(
  fileKind: CodeEditorAlternateFileKind,
  altView: CodeEditorAltView,
): CodeEditorSearchAdapterKind {
  if (altView === 'code') return 'monaco'
  if (fileKind === 'csv' && altView === 'table') return 'grid'
  if (fileKind === 'pdf' && altView === 'preview') return 'pdf'
  if (fileKind === 'markdown' && altView === 'preview') return 'markdown'
  return 'monaco'
}

export function searchAdapterAllowsReplace(kind: CodeEditorSearchAdapterKind): boolean {
  return kind === 'monaco' || kind === 'grid'
}

export function searchAdapterScopeLabel(kind: CodeEditorSearchAdapterKind): string {
  switch (kind) {
    case 'pdf':
      return 'PDF'
    case 'markdown':
      return 'Preview'
    case 'grid':
      return 'Sheet'
    default:
      return 'Editor'
  }
}
