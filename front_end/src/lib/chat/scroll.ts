import type { RefObject } from 'react'

export type StickToBottomState = {
  stuck: boolean
  unreadBelow: number
}

/** Whether the scroll viewport is near the bottom (within threshold px). */
export function isNearBottom(el: HTMLElement, threshold = 72): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}

export function scrollToBottom(el: HTMLElement, behavior: ScrollBehavior = 'smooth') {
  el.scrollTo({ top: el.scrollHeight, behavior })
}

export function createStickController(viewportRef: RefObject<HTMLElement | null>) {
  let stuck = true
  let unreadBelow = 0
  let restoring = false

  return {
    getState(): StickToBottomState {
      return { stuck, unreadBelow }
    },
    /** While prepending older history, suppress auto stick-to-bottom. */
    setRestoring(next: boolean) {
      restoring = next
    },
    onScroll() {
      const el = viewportRef.current
      if (!el) return { stuck, unreadBelow }
      stuck = isNearBottom(el)
      if (stuck) unreadBelow = 0
      return { stuck, unreadBelow }
    },
    onIncoming(count = 1, behavior: ScrollBehavior = 'auto') {
      const el = viewportRef.current
      if (!el) return { stuck, unreadBelow }
      if (restoring) return { stuck, unreadBelow }
      if (stuck || isNearBottom(el)) {
        scrollToBottom(el, behavior)
        stuck = true
        unreadBelow = 0
      } else {
        unreadBelow += count
      }
      return { stuck, unreadBelow }
    },
    jumpToLatest(behavior: ScrollBehavior = 'smooth') {
      const el = viewportRef.current
      if (!el) return
      scrollToBottom(el, behavior)
      stuck = true
      unreadBelow = 0
    },
  }
}
