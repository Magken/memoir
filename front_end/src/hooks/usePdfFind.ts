import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { FindState } from '../lib/docs/pdfjsViewer'
import { clampFindIndex } from '../lib/docs/pdfFind'
import type { PdfFindBridge } from '../lib/docs/pdfFindBridge'

type UsePdfFindOptions = {
  pdfDocument: PDFDocumentProxy | null
  page: number
  findBridge: PdfFindBridge
  setPage: (page: number) => void
}

export function usePdfFind({ pdfDocument, page, findBridge, setPage }: UsePdfFindOptions) {
  const [query, setQuery] = useState('')
  const [activeMatchIndex, setActiveMatchIndex] = useState(0)
  const [matchCount, setMatchCount] = useState(0)
  const [searching, setSearching] = useState(false)
  const setPageRef = useRef(setPage)

  useEffect(() => {
    setPageRef.current = setPage
  }, [setPage])

  useEffect(() => {
    findBridge.linkService.onPageChange = (nextPage) => setPageRef.current(nextPage)
    return () => {
      findBridge.linkService.onPageChange = null
    }
  }, [findBridge])

  useEffect(() => {
    findBridge.setDocument(pdfDocument)
  }, [findBridge, pdfDocument])

  useEffect(() => {
    findBridge.syncPage(page)
  }, [findBridge, page])

  useEffect(() => {
    const ac = new AbortController()
    findBridge.eventBus.on(
      'updatefindmatchescount',
      (evt: { matchesCount: { current: number; total: number } }) => {
        setMatchCount(evt.matchesCount.total)
        setActiveMatchIndex(Math.max(0, evt.matchesCount.current - 1))
      },
      { signal: ac.signal },
    )
    findBridge.eventBus.on(
      'updatefindcontrolstate',
      (evt: { state: number }) => {
        setSearching(evt.state === FindState.PENDING)
      },
      { signal: ac.signal },
    )
    return () => ac.abort()
  }, [findBridge])

  useEffect(() => {
    setActiveMatchIndex(0)
  }, [query])

  useEffect(() => {
    const trimmed = query.trim()
    if (!pdfDocument || !trimmed) {
      findBridge.close()
      setMatchCount(0)
      setSearching(false)
      return
    }
    findBridge.search(trimmed)
  }, [findBridge, pdfDocument, query])

  const stepMatch = useCallback(
    (delta: number) => {
      if (matchCount <= 0) return
      findBridge.step(delta < 0)
    },
    [findBridge, matchCount],
  )

  return {
    query,
    setQuery,
    matchCount,
    activeMatchIndex: clampFindIndex(activeMatchIndex, matchCount),
    searching,
    stepMatch,
  }
}
