/**
 * Shared LCL leave / enter chain and hover intent.
 * Out, then in. Next step at LCL_CHAIN_AT. Hovers are latest-wins.
 */
import type { gsap as GsapType } from 'gsap'
import type { LclPlayHandle } from '../animations/scrollEnter'

type Gsap = typeof GsapType

export const LCL_HOVER_INTENT_MS = 140
export const LCL_HOVER_REST_MS = 320

export type LclPreviewHandle = {
  leave: () => Promise<void>
}

export type LclPart = {
  key: string
  el: HTMLElement | null
  out: (el: HTMLElement, gsap: Gsap) => LclPlayHandle
  in: (el: HTMLElement, gsap: Gsap) => LclPlayHandle
}

export async function runLclLeave(parts: readonly LclPart[], gsap: Gsap): Promise<void> {
  const started: LclPlayHandle[] = []
  for (const part of parts) {
    if (!part.el) continue
    const handle = part.out(part.el, gsap)
    started.push(handle)
    await handle.ready
  }
  await Promise.all(started.map((handle) => handle.done))
}

export async function runLclEnter(parts: readonly LclPart[], gsap: Gsap): Promise<void> {
  const started: LclPlayHandle[] = []
  for (const part of parts) {
    if (!part.el) continue
    const handle = part.in(part.el, gsap)
    started.push(handle)
    await handle.ready
  }
  await Promise.all(started.map((handle) => handle.done))
}

/** Wait until the committed tree (new crumbs / lists) is mounted before enter. */
export function lclAfterCommit(): Promise<void> {
  return new Promise((resolve) => {
    const later =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: () => void) => setTimeout(cb, 0)
    later(() => later(() => resolve()))
  })
}

export async function lclSwap(
  opts: {
    leave: readonly LclPart[]
    commit: () => void
    enter: () => readonly LclPart[]
    between?: () => Promise<void>
  },
  gsap: Gsap,
): Promise<void> {
  await runLclLeave(opts.leave, gsap)
  opts.commit()
  await lclAfterCommit()
  if (opts.between) await opts.between()
  await runLclEnter(opts.enter(), gsap)
}

export function createLclHoverIntent<T>(opts: {
  intentMs?: number
  restMs?: number
  sticky?: boolean
  show: (target: T | null) => Promise<void>
}): {
  enter: (target: T) => void
  leaveRegion: () => void
  focus: (target: T) => void
  dispose: () => void
} {
  const intentMs = opts.intentMs ?? LCL_HOVER_INTENT_MS
  const restMs = opts.restMs ?? LCL_HOVER_REST_MS
  let intentTimer: ReturnType<typeof setTimeout> | null = null
  let restTimer: ReturnType<typeof setTimeout> | null = null
  let pending: T | null | undefined
  let shown: T | null = null
  let running = false
  let disposed = false

  async function flush(target: T | null) {
    if (running) {
      pending = target
      return
    }
    running = true
    pending = undefined
    shown = target
    try {
      await opts.show(target)
    } finally {
      running = false
      if (pending !== undefined && pending !== shown) {
        const next = pending
        pending = undefined
        void flush(next)
      }
    }
  }

  function enter(target: T) {
    if (disposed) return
    if (restTimer) {
      clearTimeout(restTimer)
      restTimer = null
    }
    if (intentTimer) clearTimeout(intentTimer)
    intentTimer = setTimeout(() => {
      intentTimer = null
      void flush(target)
    }, intentMs)
  }

  function focus(target: T) {
    if (disposed) return
    if (restTimer) {
      clearTimeout(restTimer)
      restTimer = null
    }
    if (intentTimer) {
      clearTimeout(intentTimer)
      intentTimer = null
    }
    void flush(target)
  }

  function leaveRegion() {
    if (disposed) return
    if (intentTimer) {
      clearTimeout(intentTimer)
      intentTimer = null
    }
    if (opts.sticky) return
    if (restTimer) clearTimeout(restTimer)
    restTimer = setTimeout(() => {
      restTimer = null
      void flush(null)
    }, restMs)
  }

  function dispose() {
    disposed = true
    if (intentTimer) clearTimeout(intentTimer)
    if (restTimer) clearTimeout(restTimer)
  }

  return { enter, leaveRegion, focus, dispose }
}
