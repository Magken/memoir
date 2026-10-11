import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdfOutline, type PdfOutlineEntry } from '../lib/docs/pdfOutline'

export function usePdfOutline(pdfDocument: PDFDocumentProxy | null) {
  const [entries, setEntries] = useState<PdfOutlineEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pdfDocument) {
      setEntries([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void loadPdfOutline(pdfDocument)
      .then((outline) => {
        if (!cancelled) setEntries(outline)
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
