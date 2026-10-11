import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdfLinks, type PdfLinkEntry } from '../lib/docs/pdfLinks'

export function usePdfLinks(pdfDocument: PDFDocumentProxy | null) {
  const [entries, setEntries] = useState<PdfLinkEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pdfDocument) {
      setEntries([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void loadPdfLinks(pdfDocument)
      .then((links) => {
        if (!cancelled) setEntries(links)
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
