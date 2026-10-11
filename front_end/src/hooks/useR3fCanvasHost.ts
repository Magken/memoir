import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { events as createPointerEvents } from '@react-three/fiber'
import type { EventManager, RootStore } from '@react-three/fiber'

type R3fCanvasHost = {
  /** Stable DOM host — pass as Canvas `eventSource` so R3F never connects to a null target. */
  hostRef: RefObject<HTMLDivElement | null>
  /** Mount Canvas only after the host is in the document. */
  canvasReady: boolean
  /**
   * Pass as Canvas `events` — null-guards `connect` for the async configure race
   * (host/Canvas unmount while `await configure` is in flight → `connect(null)`).
   * Upstream: pmndrs/r3f#3754.
   */
  events: (store: RootStore) => EventManager<HTMLElement>
}

/**
 * Default R3F pointer events with a null-safe `connect`.
 * Fiber 9.6.x still calls `target.addEventListener` without checking target.
 */
export function createGuardedPointerEvents(store: RootStore): EventManager<HTMLElement> {
  const manager = createPointerEvents(store)
  const connect = manager.connect
  manager.connect = (target) => {
    if (!target) return
    connect?.(target)
  }
  return manager
}

/**
 * Workaround for @react-three/fiber 9.6.x — `events.connect(null)` throws during
 * remount/HMR when the internal canvas div ref is briefly unset (pmndrs/r3f#3754).
 * Keep a parent host mounted, gate Canvas until that host exists, and use guarded events.
 */
export function useR3fCanvasHost(): R3fCanvasHost {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)

  useLayoutEffect(() => {
    setCanvasReady(Boolean(hostRef.current))
    return () => setCanvasReady(false)
  }, [])

  return { hostRef, canvasReady, events: createGuardedPointerEvents }
}
