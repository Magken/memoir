import { normalizePath } from './workspace'
import type { CodeFile } from './workspace'
import type { PdfSource } from '../docs/pdfDocument'

/** Resolve a workspace file to a PDF.js source (URL path or explicit URL in buffer). */
export function pdfSourceFromWorkspaceFile(file: CodeFile): PdfSource {
  const firstLine = file.buffer.trim().split('\n')[0]?.trim() ?? ''
  if (
    /^https?:\/\//i.test(firstLine) ||
    firstLine.startsWith('/') ||
    firstLine.startsWith('blob:')
  ) {
    return firstLine
  }
  const path = normalizePath(file.path)
  return `/${path}`
}
