import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdfImages, type PdfImageEntry } from '../lib/docs/pdfImages'

export function usePdfImages(pdfDocument: PDFDocumentProxy | null) {
  const [entries, setEntries] = useState<PdfImageEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pdfDocument) {
      setEntries([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void loadPdfImages(pdfDocument)
      .then((images) => {
        if (!cancelled) setEntries(images)
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
