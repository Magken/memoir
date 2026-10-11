import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CvExtractV2 } from '../../lib/cvApi'

const MAX_HISTORY = 50

type HistorySnap = {
  doc: CvExtractV2
  /** TOC / `data-doc-toc` id to scroll to when restoring this snap’s neighbor edit. */
  anchorId: string | null
}

type ViewerHistoryValue = {
  canUndo: boolean
  canRedo: boolean
  /** Restore previous doc; returns anchor to scroll to (edit locus). */
  undo: () => string | null
  /** Restore next doc; returns anchor to scroll to. */
  redo: () => string | null
  /** Record current doc, then commit `next`. */
  commit: (next: CvExtractV2) => void
}

const ViewerHistoryContext = createContext<ViewerHistoryValue | null>(null)

type ViewerHistoryProviderProps = {
  value: CvExtractV2
  onChange?: (next: CvExtractV2) => void
  /** Prefer anchors inside this scroll stage when capturing focus. */
  scrollRootRef?: { current: HTMLElement | null }
  children: ReactNode
}

/** Nearest document TOC id under the focused control (or null). */
export function captureViewerFocusAnchor(root?: HTMLElement | null): string | null {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return null
  if (root && !root.contains(active)) return null

  const tocHost = active.closest<HTMLElement>('[data-doc-toc]')
  if (tocHost) {
    const id = tocHost.getAttribute('data-doc-toc') || tocHost.id
    if (id) return id
  }

  const section = active.closest<HTMLElement>(
    '.theme-vurify-viewer__section[id], .theme-vurify-viewer__masthead[id], .theme-vurify-viewer__item-slot[id]',
  )
  if (section?.id) return section.id

  return null
}

export function ViewerHistoryProvider({
  value,
  onChange,
  scrollRootRef,
  children,
}: ViewerHistoryProviderProps) {
  const pastRef = useRef<HistorySnap[]>([])
  const futureRef = useRef<HistorySnap[]>([])
  const valueRef = useRef(value)
  valueRef.current = value
  const [tick, setTick] = useState(0)
  const bump = () => setTick((n) => n + 1)

  const captureAnchor = useCallback(
    () => captureViewerFocusAnchor(scrollRootRef?.current ?? null),
    [scrollRootRef],
  )

  const commit = useCallback(
    (next: CvExtractV2) => {
      if (!onChange) return
      pastRef.current = [
        ...pastRef.current.slice(-(MAX_HISTORY - 1)),
        { doc: structuredClone(valueRef.current), anchorId: captureAnchor() },
      ]
      futureRef.current = []
      bump()
      onChange(next)
    },
    [onChange, captureAnchor],
  )

  const undo = useCallback((): string | null => {
    if (!onChange || pastRef.current.length === 0) return null
    const snap = pastRef.current[pastRef.current.length - 1]!
    pastRef.current = pastRef.current.slice(0, -1)
    futureRef.current = [
      { doc: structuredClone(valueRef.current), anchorId: snap.anchorId },
      ...futureRef.current,
    ].slice(0, MAX_HISTORY)
    bump()
    onChange(snap.doc)
    return snap.anchorId
  }, [onChange])

  const redo = useCallback((): string | null => {
    if (!onChange || futureRef.current.length === 0) return null
    const snap = futureRef.current[0]!
    futureRef.current = futureRef.current.slice(1)
    pastRef.current = [
      ...pastRef.current.slice(-(MAX_HISTORY - 1)),
      { doc: structuredClone(valueRef.current), anchorId: snap.anchorId },
    ]
    bump()
    onChange(snap.doc)
    return snap.anchorId
  }, [onChange])

  const api = useMemo<ViewerHistoryValue>(
    () => ({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
      undo,
      redo,
      commit,
    }),
    [undo, redo, commit, tick],
  )

  return <ViewerHistoryContext.Provider value={api}>{children}</ViewerHistoryContext.Provider>
}

export function useViewerHistory(): ViewerHistoryValue {
  const ctx = useContext(ViewerHistoryContext)
  if (!ctx) {
    return {
      canUndo: false,
      canRedo: false,
      undo: () => null,
      redo: () => null,
      commit: () => undefined,
    }
  }
  return ctx
}
