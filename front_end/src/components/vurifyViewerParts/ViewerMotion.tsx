import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/** Match `.theme-vurify-viewer__text-slot` leave timing. */
export const VIEWER_MOTION_MS = 260

type ViewerMotionGate = {
  /** After first paint — structural enter/leave may animate. */
  active: boolean
}

const ViewerMotionGateContext = createContext<ViewerMotionGate>({ active: false })

/** Enables enter animations after the initial document paint (avoids load flash). */
export function ViewerMotionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setActive(true))
    return () => window.cancelAnimationFrame(id)
  }, [])
  const value = useMemo(() => ({ active }), [active])
  return (
    <ViewerMotionGateContext.Provider value={value}>{children}</ViewerMotionGateContext.Provider>
  )
}

function useMotionGate() {
  return useContext(ViewerMotionGateContext)
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type ViewerMotionProps = {
  show: boolean
  className?: string
  leaveMs?: number
  children: ReactNode
  as?: 'div' | 'span' | 'section' | 'article' | 'p'
}

/**
 * Enter/leave presence using the viewer text-slot motion classes (`is-entering` / `is-leaving`).
 */
export function ViewerMotion({
  show,
  className = '',
  leaveMs = VIEWER_MOTION_MS,
  children,
  as: Tag = 'div',
}: ViewerMotionProps) {
  const { active } = useMotionGate()
  const reduced = prefersReducedMotion()
  const [mounted, setMounted] = useState(show)
  const [phase, setPhase] = useState<'entering' | 'shown' | 'leaving'>('shown')
  const prevShow = useRef(show)

  useLayoutEffect(() => {
    const wasShown = prevShow.current
    prevShow.current = show

    if (show) {
      setMounted(true)
      if (!wasShown && active && !reduced) {
        setPhase('entering')
        let cancelled = false
        let inner = 0
        const outer = window.requestAnimationFrame(() => {
          inner = window.requestAnimationFrame(() => {
            if (!cancelled) setPhase('shown')
          })
        })
        const fallback = window.setTimeout(() => {
          if (!cancelled) setPhase('shown')
        }, leaveMs)
        return () => {
          cancelled = true
          window.cancelAnimationFrame(outer)
          window.cancelAnimationFrame(inner)
          window.clearTimeout(fallback)
        }
      }
      setPhase('shown')
      return
    }

    if (!wasShown) {
      setMounted(false)
      return
    }

    if (reduced || !active) {
      setMounted(false)
      setPhase('shown')
      return
    }

    setPhase('leaving')
    const t = window.setTimeout(() => {
      setMounted(false)
      setPhase('shown')
    }, leaveMs)
    return () => window.clearTimeout(t)
  }, [show, active, reduced, leaveMs])

  if (!mounted) return null

  return (
    <Tag
      className={[
        'theme-vurify-viewer__motion',
        className,
        phase === 'entering' ? 'is-entering' : '',
        phase === 'leaving' ? 'is-leaving' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  )
}

export type PresencePhase = 'entering' | 'shown' | 'leaving'

type PresenceRow<T> = {
  key: string
  item: T
  phase: PresencePhase
}

function rowsEqual<T>(a: PresenceRow<T>[], b: PresenceRow<T>[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].key !== b[i].key || a[i].phase !== b[i].phase || a[i].item !== b[i].item) {
      return false
    }
  }
  return true
}

/**
 * Keyed list presence — keeps leaving rows mounted through the shared motion leave.
 * Row `item` snapshots are for leave animation only; consumers should prefer live doc data.
 */
export function usePresenceItems<T>(
  items: readonly T[],
  getKey: (item: T, index: number) => string,
  leaveMs = VIEWER_MOTION_MS,
  options?: { instant?: boolean },
): PresenceRow<T>[] {
  const { active } = useMotionGate()
  const getKeyRef = useRef(getKey)
  getKeyRef.current = getKey
  const itemsRef = useRef(items)
  itemsRef.current = items
  const reducedRef = useRef(prefersReducedMotion())
  const bootstrapped = useRef(false)
  const leaveTimers = useRef<Map<string, number>>(new Map())
  const enteringTimer = useRef<number | null>(null)
  const activeRef = useRef(active)
  activeRef.current = active
  const instant = Boolean(options?.instant)

  const [rows, setRows] = useState<PresenceRow<T>[]>(() =>
    items.map((item, index) => ({
      key: getKey(item, index),
      item,
      phase: 'shown' as const,
    })),
  )
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const itemsSignature = items.map((item, index) => getKey(item, index)).join('\0')

  useLayoutEffect(() => {
    const keyOf = getKeyRef.current
    const list = itemsRef.current
    const reduced = reducedRef.current
    const gateActive = activeRef.current
    const prev = rowsRef.current
    const nextKeys = list.map((item, index) => keyOf(item, index))
    const nextByKey = new Map(list.map((item, index) => [keyOf(item, index), item] as const))
    const allowEnter = !instant && gateActive && !reduced && bootstrapped.current

    // Streaming / instant: sync keys immediately — no leave ghosts stacking.
    if (instant || reduced || !gateActive) {
      for (const t of leaveTimers.current.values()) window.clearTimeout(t)
      leaveTimers.current.clear()
      if (enteringTimer.current != null) {
        window.cancelAnimationFrame(enteringTimer.current)
        enteringTimer.current = null
      }
      const synced: PresenceRow<T>[] = nextKeys.map((key) => ({
        key,
        item: nextByKey.get(key) as T,
        phase: 'shown' as const,
      }))
      if (!rowsEqual(prev, synced)) {
        rowsRef.current = synced
        setRows(synced)
      }
      bootstrapped.current = true
      return
    }

    const prevByKey = new Map(prev.map((row) => [row.key, row]))
    const result: PresenceRow<T>[] = []
    const seen = new Set<string>()
    let hasEntering = false
    const leavingKeys: string[] = []

    for (const key of nextKeys) {
      seen.add(key)
      const item = nextByKey.get(key) as T
      const old = prevByKey.get(key)
      if (!old || old.phase === 'leaving') {
        const phase: PresencePhase = allowEnter ? 'entering' : 'shown'
        if (phase === 'entering') hasEntering = true
        result.push({ key, item, phase })
      } else {
        const phase: PresencePhase = old.phase === 'entering' ? 'entering' : 'shown'
        if (phase === 'entering') hasEntering = true
        result.push({ key, item, phase })
      }
    }

    for (const row of prev) {
      if (seen.has(row.key)) continue
      leavingKeys.push(row.key)
      result.push({ ...row, phase: 'leaving' })
    }

    for (const leaveKey of leavingKeys) {
      if (leaveTimers.current.has(leaveKey)) continue
      const t = window.setTimeout(() => {
        leaveTimers.current.delete(leaveKey)
        setRows((cur) => cur.filter((r) => r.key !== leaveKey))
      }, leaveMs)
      leaveTimers.current.set(leaveKey, t)
    }

    if (hasEntering) {
      if (enteringTimer.current != null) window.cancelAnimationFrame(enteringTimer.current)
      let inner = 0
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => {
          enteringTimer.current = null
          setRows((cur) => {
            if (!cur.some((row) => row.phase === 'entering')) return cur
            return cur.map((row) =>
              row.phase === 'entering' ? { ...row, phase: 'shown' as const } : row,
            )
          })
        })
        enteringTimer.current = inner
      })
      enteringTimer.current = outer
    }

    if (!rowsEqual(prev, result)) {
      rowsRef.current = result
      setRows(result)
    }

    bootstrapped.current = true

    return () => {
      if (enteringTimer.current != null) {
        window.cancelAnimationFrame(enteringTimer.current)
        enteringTimer.current = null
      }
    }
  }, [itemsSignature, active, leaveMs, instant])

  useEffect(() => {
    return () => {
      for (const t of leaveTimers.current.values()) window.clearTimeout(t)
      leaveTimers.current.clear()
      if (enteringTimer.current != null) window.cancelAnimationFrame(enteringTimer.current)
    }
  }, [])

  return rows
}

export function presenceClassName(phase: PresencePhase): string {
  if (phase === 'entering') return 'is-entering'
  if (phase === 'leaving') return 'is-leaving'
  return ''
}

/** One-shot enter class for newly mounted chips/rows (history restore + edge add). */
export function useMountEnterClass(): string {
  const { active } = useMotionGate()
  const reduced = prefersReducedMotion()
  const [phase, setPhase] = useState<'entering' | 'shown'>(() =>
    active && !reduced ? 'entering' : 'shown',
  )

  useLayoutEffect(() => {
    // Gate off / reduced → never leave opacity:0 on the row.
    if (!active || reduced) {
      setPhase('shown')
      return
    }
    /**
     * Strict Mode double-invokes layout effects and cancels the first rAF chain.
     * A `started` latch made the replay a no-op and left `is-entering` stuck
     * (blank list/skill rows). Always reschedule; ignore stale callbacks.
     */
    let cancelled = false
    let inner = 0
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        if (!cancelled) setPhase('shown')
      })
    })
    const fallback = window.setTimeout(() => {
      if (!cancelled) setPhase('shown')
    }, VIEWER_MOTION_MS)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(outer)
      window.cancelAnimationFrame(inner)
      window.clearTimeout(fallback)
    }
  }, [active, reduced])

  return phase === 'entering' ? 'is-entering' : ''
}

/** Local leave, then call `onRemove` — same timing as text-slot / history presence. */
export function useLeaveThen(onRemove: () => void, leaveMs = VIEWER_MOTION_MS) {
  const [leaving, setLeaving] = useState(false)
  const onRemoveRef = useRef(onRemove)
  onRemoveRef.current = onRemove
  const run = () => {
    if (leaving) return
    if (prefersReducedMotion()) {
      onRemoveRef.current()
      return
    }
    setLeaving(true)
    window.setTimeout(() => onRemoveRef.current(), leaveMs)
  }
  return {
    leaving,
    run,
    leaveClass: leaving ? 'is-leaving' : '',
  }
}
