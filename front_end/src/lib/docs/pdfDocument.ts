import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

let workerConfigured = false

export function ensurePdfWorker(): void {
  if (workerConfigured) return
  GlobalWorkerOptions.workerSrc = pdfWorker
  workerConfigured = true
}

export type PdfSource = string | File | ArrayBuffer | Uint8Array

function pdfDocumentParams(source: Exclude<PdfSource, File>) {
  if (typeof source === 'string') {
    return { url: source, isOffscreenCanvasSupported: false as const }
  }
  return { data: source, isOffscreenCanvasSupported: false as const }
}

export function openPdfDocument(source: PdfSource): PDFDocumentLoadingTask {
  ensurePdfWorker()
  if (source instanceof File) {
    throw new Error('openPdfDocument requires resolved bytes — use loadPdfDocument for File sources.')
  }
  return getDocument(pdfDocumentParams(source))
}

export async function loadPdfDocument(source: PdfSource): Promise<PDFDocumentProxy> {
  ensurePdfWorker()
  if (source instanceof File) {
    const data = await source.arrayBuffer()
    return getDocument({ data, isOffscreenCanvasSupported: false }).promise
  }
  return openPdfDocument(source).promise
}

export async function loadPdfDocumentTask(
  source: PdfSource,
): Promise<{ doc: PDFDocumentProxy; task: PDFDocumentLoadingTask }> {
  ensurePdfWorker()
  if (source instanceof File) {
    const data = await source.arrayBuffer()
    const task = getDocument({ data, isOffscreenCanvasSupported: false })
    const doc = await task.promise
    return { doc, task }
  }
  const task = openPdfDocument(source)
  const doc = await task.promise
  return { doc, task }
}

export function formatPdfPageLabel(page: number, pageCount: number): string {
  if (pageCount <= 0) return '—'
  return `${page} / ${pageCount}`
}

export function pdfDownloadName(source: PdfSource, fallback = 'document.pdf'): string {
  if (typeof source === 'string') {
    const segment = source.split('/').pop()?.split('?')[0]
    return segment?.toLowerCase().endsWith('.pdf') ? segment : fallback
  }
  if (source instanceof File) {
    return source.name || fallback
  }
  return fallback
}
