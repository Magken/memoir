import type { PDFDocumentProxy } from 'pdfjs-dist'
import { formatFileSize } from '../forms/fileUpload'
import { pdfDownloadName, type PdfSource } from './pdfDocument'

export type PdfDocumentInfo = {
  displayTitle: string
  fileName: string
  fileSizeBytes: number | null
  pageCount: number
  mimeType: string | null
  lastModified: Date | null
  pdfVersion: string | null
  author: string | null
  subject: string | null
  creator: string | null
  producer: string | null
  keywords: string | null
  creationDate: string | null
  modDate: string | null
}

export type PdfSourceStats = {
  fileName: string
  fileSizeBytes: number | null
  mimeType: string | null
  lastModified: Date | null
}

function readInfoString(info: Record<string, unknown>, key: string): string | null {
  const value = info[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function formatPdfDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const match = raw.match(
    /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([+\-Z])?(\d{2})?'?(\d{2})?'?/,
  )
  if (!match) return raw
  const [, year, month = '01', day = '01', hour = '00', minute = '00'] = match
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)),
  )
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function resolvePdfSourceStats(source: PdfSource): PdfSourceStats {
  if (source instanceof File) {
    return {
      fileName: source.name || pdfDownloadName(source),
      fileSizeBytes: source.size,
      mimeType: source.type || 'application/pdf',
      lastModified: source.lastModified ? new Date(source.lastModified) : null,
    }
  }
  return {
    fileName: pdfDownloadName(source),
    fileSizeBytes:
      typeof source === 'string'
        ? null
        : source instanceof ArrayBuffer
          ? source.byteLength
          : source.byteLength,
    mimeType: 'application/pdf',
    lastModified: null,
  }
}

export function pdfDisplayTitle(source: PdfSource, pdfTitle: string | null): string {
  if (pdfTitle) return pdfTitle
  const name = pdfDownloadName(source)
  return name.replace(/\.pdf$/i, '') || name
}

export const PDF_DOC_TITLE_MAX_CHARS = 48

export function truncateDisplayTitle(title: string, maxChars = PDF_DOC_TITLE_MAX_CHARS): string {
  if (title.length <= maxChars) return title
  return `${title.slice(0, maxChars).trimEnd()}...`
}

export async function collectPdfDocumentInfo(
  source: PdfSource,
  doc: PDFDocumentProxy,
): Promise<PdfDocumentInfo> {
  const sourceStats = resolvePdfSourceStats(source)
  let fileSizeBytes = sourceStats.fileSizeBytes

  if (fileSizeBytes === null) {
    try {
      const data = await doc.getData()
      fileSizeBytes = data.byteLength
    } catch {
      fileSizeBytes = null
    }
  }

  let info: Record<string, unknown> = {}
  try {
    const metadata = await doc.getMetadata()
    info = (metadata.info ?? {}) as Record<string, unknown>
  } catch {
    info = {}
  }

  const pdfTitle = readInfoString(info, 'Title')

  return {
    displayTitle: pdfDisplayTitle(source, pdfTitle),
    fileName: sourceStats.fileName,
    fileSizeBytes,
    pageCount: doc.numPages,
    mimeType: sourceStats.mimeType,
    lastModified: sourceStats.lastModified,
    pdfVersion: readInfoString(info, 'PDFFormatVersion'),
    author: readInfoString(info, 'Author'),
    subject: readInfoString(info, 'Subject'),
    creator: readInfoString(info, 'Creator'),
    producer: readInfoString(info, 'Producer'),
    keywords: readInfoString(info, 'Keywords'),
    creationDate: formatPdfDate(info.CreationDate),
    modDate: formatPdfDate(info.ModDate),
  }
}

export function formatPdfDocumentInfoRows(info: PdfDocumentInfo): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: 'File', value: info.fileName },
    { label: 'Size', value: info.fileSizeBytes !== null ? formatFileSize(info.fileSizeBytes) : '—' },
    { label: 'Pages', value: String(info.pageCount) },
  ]

  if (info.mimeType) rows.push({ label: 'MIME', value: info.mimeType })
  if (info.pdfVersion) rows.push({ label: 'PDF', value: info.pdfVersion })
  if (info.author) rows.push({ label: 'Author', value: info.author })
  if (info.subject) rows.push({ label: 'Subject', value: info.subject })
  if (info.creator) rows.push({ label: 'Creator', value: info.creator })
  if (info.producer) rows.push({ label: 'Producer', value: info.producer })
  if (info.keywords) rows.push({ label: 'Keywords', value: info.keywords })
  if (info.creationDate) rows.push({ label: 'Created', value: info.creationDate })
  if (info.modDate) rows.push({ label: 'Modified', value: info.modDate })
  if (info.lastModified) {
    rows.push({
      label: 'Uploaded',
      value: info.lastModified.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    })
  }

  return rows
}
