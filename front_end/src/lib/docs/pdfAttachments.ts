import type { PDFDocumentProxy } from 'pdfjs-dist'

export type PdfAttachmentEntry = {
  filename: string
  contentType?: string
  data?: Uint8Array
}

export async function loadPdfAttachments(doc: PDFDocumentProxy): Promise<PdfAttachmentEntry[]> {
  const attachments = await doc.getAttachments()
  if (!attachments) return []
  return Object.entries(attachments).map(([filename, entry]) => {
    const record = entry as { filename?: string; contentType?: string; data?: Uint8Array }
    return {
      filename: record.filename ?? filename,
      contentType: record.contentType,
      data: record.data,
    }
  })
}
