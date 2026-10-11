import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

const THUMB_LAYOUT_WIDTH = 112
const THUMB_MAX_DPR = 2

export function usePdfThumbnails(pdfDocument: PDFDocumentProxy | null, pageCount: number) {
  const cacheRef = useRef<Map<number, string>>(new Map())
  const inflightRef = useRef<Set<number>>(new Set())
  const [thumbUrls, setThumbUrls] = useState<Record<number, string>>({})

  useEffect(() => {
    cacheRef.current.clear()
    inflightRef.current.clear()
    setThumbUrls({})
  }, [pdfDocument])

  const requestThumbnail = useCallback(
    async (pageNum: number) => {
      if (!pdfDocument || pageNum < 1 || pageNum > pageCount) return
      if (cacheRef.current.has(pageNum) || inflightRef.current.has(pageNum)) return

      inflightRef.current.add(pageNum)
      try {
        const pdfPage = await pdfDocument.getPage(pageNum)
        const base = pdfPage.getViewport({ scale: 1 })
        const scale = THUMB_LAYOUT_WIDTH / base.width
        const viewport = pdfPage.getViewport({ scale })
        const dpr = Math.min(
          typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
          THUMB_MAX_DPR,
        )

        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return

        await pdfPage.render({
          canvasContext: ctx,
          viewport,
          canvas,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        }).promise

        const url = canvas.toDataURL('image/jpeg', 0.85)
        cacheRef.current.set(pageNum, url)
        setThumbUrls((prev) => ({ ...prev, [pageNum]: url }))
      } catch {
        // Ignore cancelled or failed thumbnail renders.
      } finally {
        inflightRef.current.delete(pageNum)
      }
    },
    [pdfDocument, pageCount],
  )

  return { thumbUrls, requestThumbnail }
}
