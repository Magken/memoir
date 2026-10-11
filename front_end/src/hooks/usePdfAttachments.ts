import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdfAttachments, type PdfAttachmentEntry } from '../lib/docs/pdfAttachments'

export function usePdfAttachments(pdfDocument: PDFDocumentProxy | null) {
  const [entries, setEntries] = useState<PdfAttachmentEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pdfDocument) {
      setEntries([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void loadPdfAttachments(pdfDocument)
      .then((attachments: PdfAttachmentEntry[]) => {
        if (!cancelled) setEntries(attachments)
      })
      .catch(() => {
        if (!cancelled) setEntries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [pdfDocument])

  return { entries, loading }
}
