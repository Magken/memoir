import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PdfImageEntry } from '../lib/docs/pdfImages'
import { PDF_IMAGE_THUMB_WIDTH, renderPdfImageThumbnail } from '../lib/docs/pdfImageRender'

export function usePdfImageThumbnails(
  pdfDocument: PDFDocumentProxy | null,
  entries: readonly PdfImageEntry[],
) {
  const cacheRef = useRef<Map<string, string>>(new Map())
  const inflightRef = useRef<Set<string>>(new Set())
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    cacheRef.current.clear()
    inflightRef.current.clear()
    setThumbUrls({})
  }, [pdfDocument, entries])

  const requestThumbnail = useCallback(
    async (entryId: string) => {
      if (!pdfDocument) return
      const entry = entries.find((item) => item.id === entryId)
      if (!entry) return
      if (cacheRef.current.has(entryId) || inflightRef.current.has(entryId)) return

      inflightRef.current.add(entryId)
      try {
        const page = await pdfDocument.getPage(entry.pageNumber)
        const url = await renderPdfImageThumbnail(page, entry.indexOnPage, PDF_IMAGE_THUMB_WIDTH)
        if (!url) return
        cacheRef.current.set(entryId, url)
        setThumbUrls((prev) => ({ ...prev, [entryId]: url }))
      } catch {
        // Ignore cancelled or failed thumbnail renders.
      } finally {
        inflightRef.current.delete(entryId)
      }
    },
    [pdfDocument, entries],
  )

  return { thumbUrls, requestThumbnail }
}
