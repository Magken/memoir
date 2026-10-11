import { useCallback, useRef, useState } from 'react'
import { cloneSheet, type DataGridSheet } from './sheetModel'

export function useSheetHistory(initial: DataGridSheet) {
  const [sheet, setSheet] = useState(() => cloneSheet(initial))
  const [historyIndex, setHistoryIndex] = useState(0)
  const historyRef = useRef([cloneSheet(initial)])
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet

  const pushHistory = useCallback((next: DataGridSheet) => {
    const cloned = cloneSheet(next)
    sheetRef.current = cloned
    setSheet(cloned)
    setHistoryIndex((prev) => {
      const slice = historyRef.current.slice(0, prev + 1)
      slice.push(cloned)
      historyRef.current = slice
      return slice.length - 1
    })
  }, [])

  const replaceSheet = useCallback((next: DataGridSheet) => {
    const cloned = cloneSheet(next)
    historyRef.current = [cloned]
    sheetRef.current = cloned
    setHistoryIndex(0)
    setSheet(cloned)
  }, [])

  const mutateSheet = useCallback(
    (mutator: (draft: DataGridSheet) => void) => {
      const next = cloneSheet(sheetRef.current)
      mutator(next)
      pushHistory(next)
    },
    [pushHistory],
  )

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const nextIndex = historyIndex - 1
    const next = historyRef.current[nextIndex]
    sheetRef.current = next
    setHistoryIndex(nextIndex)
    setSheet(cloneSheet(next))
  }, [historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= historyRef.current.length - 1) return
    const nextIndex = historyIndex + 1
    const next = historyRef.current[nextIndex]
    sheetRef.current = next
    setHistoryIndex(nextIndex)
    setSheet(cloneSheet(next))
  }, [historyIndex])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < historyRef.current.length - 1

  return {
    sheet,
    mutateSheet,
    replaceSheet,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
