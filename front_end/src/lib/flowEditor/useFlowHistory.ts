import { useCallback, useRef, useState } from 'react'
import type { FlowDocument } from './types'

function cloneFlow(doc: FlowDocument): FlowDocument {
  return structuredClone(doc)
}

function structureKey(doc: FlowDocument): string {
  return JSON.stringify({ nodes: doc.nodes, edges: doc.edges, groups: doc.groups })
}

export function useFlowHistory(initial: FlowDocument) {
  const [flow, setFlow] = useState(() => cloneFlow(initial))
  const [historyIndex, setHistoryIndex] = useState(0)
  const historyRef = useRef([cloneFlow(initial)])
  const flowRef = useRef(flow)
  flowRef.current = flow
  const applyingHistoryRef = useRef(false)

  const pushHistory = useCallback((next: FlowDocument) => {
    const cloned = cloneFlow(next)
    flowRef.current = cloned
    setFlow(cloned)
    if (applyingHistoryRef.current) return
    setHistoryIndex((prev) => {
      const slice = historyRef.current.slice(0, prev + 1)
      slice.push(cloned)
      historyRef.current = slice
      return slice.length - 1
    })
  }, [])

  const replaceFlow = useCallback((next: FlowDocument) => {
    const cloned = cloneFlow(next)
    historyRef.current = [cloned]
    flowRef.current = cloned
    setHistoryIndex(0)
    setFlow(cloned)
  }, [])

  const commitFlow = useCallback(
    (next: FlowDocument, options?: { force?: boolean }) => {
      const prevKey = structureKey(flowRef.current)
      const nextKey = structureKey(next)
      const viewportOnly = prevKey === nextKey && JSON.stringify(flowRef.current.viewport) !== JSON.stringify(next.viewport)

      if (viewportOnly && !options?.force) {
        const merged = { ...flowRef.current, viewport: next.viewport }
        flowRef.current = merged
        setFlow(cloneFlow(merged))
        return
      }

      if (!options?.force && prevKey === nextKey) return
      pushHistory(next)
    },
    [pushHistory],
  )

  const mutateFlow = useCallback(
    (mutator: (draft: FlowDocument) => void) => {
      const next = cloneFlow(flowRef.current)
      mutator(next)
      pushHistory(next)
    },
    [pushHistory],
  )

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const nextIndex = historyIndex - 1
    const next = historyRef.current[nextIndex]
    applyingHistoryRef.current = true
    flowRef.current = next
    setHistoryIndex(nextIndex)
    setFlow(cloneFlow(next))
    applyingHistoryRef.current = false
  }, [historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= historyRef.current.length - 1) return
    const nextIndex = historyIndex + 1
    const next = historyRef.current[nextIndex]
    applyingHistoryRef.current = true
    flowRef.current = next
    setHistoryIndex(nextIndex)
    setFlow(cloneFlow(next))
    applyingHistoryRef.current = false
  }, [historyIndex])

  return {
    flow,
    commitFlow,
    mutateFlow,
    replaceFlow,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < historyRef.current.length - 1,
  }
}
