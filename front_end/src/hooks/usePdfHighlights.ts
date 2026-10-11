import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  createHighlightFromSelection,
  normalizeHighlightText,
  renderHighlightLayer,
  scrollHighlightMarkIntoView,
  upsertHighlight,
  type PdfHighlight,
} from '../lib/docs/pdfHighlights'

type UsePdfHighlightsOptions = {
  pageSheetRef: RefObject<HTMLDivElement | null>
  scrollRootRef: RefObject<HTMLElement | null>
  page: number
  textLayerGeneration: number
  documentKey: string
  setPage: (page: number) => void
}

export function usePdfHighlights({
  pageSheetRef,
  scrollRootRef,
  page,
  textLayerGeneration,
  documentKey,
  setPage,
}: UsePdfHighlightsOptions) {
  const [highlights, setHighlights] = useState<PdfHighlight[]>([])
  const [highlightMode, setHighlightMode] = useState(false)
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null)
  const pendingScrollIdRef = useRef<string | null>(null)
  const lastAddRef = useRef<{ page: number; text: string; time: number } | null>(null)

  useEffect(() => {
    setHighlights([])
    setActiveHighlightId(null)
    setHighlightMode(false)
    pendingScrollIdRef.current = null
  }, [documentKey])

  useEffect(() => {
    const pageSheet = pageSheetRef.current
    if (!pageSheet) return

    const pageHighlights = highlights.filter((entry) => entry.pageNumber === page)
    renderHighlightLayer(pageSheet, pageHighlights, activeHighlightId)

    const scrollTargetId = pendingScrollIdRef.current ?? activeHighlightId
    if (!scrollTargetId || !pageHighlights.some((entry) => entry.id === scrollTargetId)) return

    pendingScrollIdRef.current = null
    const frame = requestAnimationFrame(() => {
      scrollHighlightMarkIntoView(scrollRootRef.current, pageSheet, scrollTargetId)
    })
    return () => cancelAnimationFrame(frame)
  }, [activeHighlightId, highlights, page, pageSheetRef, scrollRootRef, textLayerGeneration])

  useEffect(() => {
    if (!highlightMode) return

    const pageSheet = pageSheetRef.current
    if (!pageSheet) return

    pageSheet.classList.add('theme-pdf-viewer__page-sheet--highlight-mode')

    const handleMouseUp = () => {
      const selection = window.getSelection()
      if (!selection) return

      const highlight = createHighlightFromSelection(selection, pageSheet, page)
      if (!highlight) return

      const normalizedText = normalizeHighlightText(highlight.text)
      const now = Date.now()
      const lastAdd = lastAddRef.current
      if (
        lastAdd &&
        lastAdd.page === page &&
        lastAdd.text === normalizedText &&
        now - lastAdd.time < 400
      ) {
        return
      }
      lastAddRef.current = { page, text: normalizedText, time: now }

      selection.removeAllRanges()
      setHighlights((current) => {
        const { highlights: next, focusId } = upsertHighlight(current, highlight)
        setActiveHighlightId(focusId)
        return next
      })
    }

    pageSheet.addEventListener('mouseup', handleMouseUp)
    return () => {
      pageSheet.classList.remove('theme-pdf-viewer__page-sheet--highlight-mode')
      pageSheet.removeEventListener('mouseup', handleMouseUp)
    }
  }, [highlightMode, page, pageSheetRef])

  const removeHighlight = useCallback((id: string) => {
    setHighlights((current) => current.filter((entry) => entry.id !== id))
    setActiveHighlightId((current) => (current === id ? null : current))
  }, [])

  const selectHighlight = useCallback(
    (highlight: PdfHighlight) => {
      setActiveHighlightId(highlight.id)
      if (highlight.pageNumber !== page) {
        pendingScrollIdRef.current = highlight.id
        setPage(highlight.pageNumber)
        return
      }

      const pageSheet = pageSheetRef.current
      if (!pageSheet) return
      requestAnimationFrame(() => {
        scrollHighlightMarkIntoView(scrollRootRef.current, pageSheet, highlight.id)
      })
    },
    [page, pageSheetRef, scrollRootRef, setPage],
  )

  return {
    highlights,
    highlightMode,
    setHighlightMode,
    activeHighlightId,
    removeHighlight,
    selectHighlight,
  }
}
