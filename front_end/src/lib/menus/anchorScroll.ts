export function resolveAnchorElement(id: string, root: HTMLElement | null): HTMLElement | null {
  const escaped = CSS.escape(id)
  if (root) {
    return (
      (root.querySelector(`[data-doc-toc="${escaped}"]`) as HTMLElement | null) ??
      (root.querySelector(`#${escaped}`) as HTMLElement | null) ??
      (root.querySelector(`[data-doc-section="${escaped}"]`) as HTMLElement | null)
    )
  }
  return (
    document.querySelector(`[data-doc-toc="${escaped}"]`) ??
    document.getElementById(id)
  )
}

export function getElementScrollOffset(element: HTMLElement, root: HTMLElement | null): number {
  if (root) {
    const rootRect = root.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    return elementRect.top - rootRect.top + root.scrollTop
  }
  return element.getBoundingClientRect().top + window.scrollY
}

export function scrollToAnchorTarget(id: string, root: HTMLElement | null, offset = 0): void {
  const element = resolveAnchorElement(id, root)
  if (!element) return

  if (root) {
    const top =
      element.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - offset
    // Snap true top when targeting content already near the start (intro / first section)
    const nextTop = top <= 8 ? 0 : Math.max(0, top)
    root.scrollTo({ top: nextTop, behavior: 'smooth' })
    return
  }

  if (offset === 0 && element.getBoundingClientRect().top + window.scrollY <= 8) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Prefer an explicit TOC rail (`data-toc-scroll` / `.theme-namenu--sticky`) so we never
 * scroll the article stage / page when keeping the active TOC row visible.
 * When ThemeScroll wraps the rail, the scrollport is `.theme-scroll__viewport`.
 */
export function getTocRailScrollParent(element: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = element.parentElement
  while (node) {
    if (node.classList.contains('theme-namenu--sticky')) {
      return node
    }
    if (node.hasAttribute('data-toc-scroll')) {
      const viewport = node.querySelector('.theme-scroll__viewport')
      return (viewport as HTMLElement | null) ?? node
    }
    node = node.parentElement
  }
  return null
}

/** One eased animation per scrollport — cancels prior frames so spy follow isn’t jerky. */
const tocRailScrollFrames = new WeakMap<HTMLElement, number>()

export function animateTocRailScrollTop(
  parent: HTMLElement,
  top: number,
  behavior: ScrollBehavior = 'smooth',
): void {
  const maxScroll = Math.max(0, parent.scrollHeight - parent.clientHeight)
  const target = Math.max(0, Math.min(top, maxScroll))
  const prior = tocRailScrollFrames.get(parent)
  if (prior != null) cancelAnimationFrame(prior)

  const reduceMotion =
    behavior === 'auto' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) {
    parent.scrollTop = target
    tocRailScrollFrames.delete(parent)
    return
  }

  const start = parent.scrollTop
  const delta = target - start
  if (Math.abs(delta) < 0.5) {
    tocRailScrollFrames.delete(parent)
    return
  }

  const duration = Math.min(420, 200 + Math.abs(delta) * 0.4)
  const t0 = performance.now()
  const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / duration)
    parent.scrollTop = start + delta * easeOutCubic(p)
    if (p < 1) {
      tocRailScrollFrames.set(parent, requestAnimationFrame(tick))
    } else {
      tocRailScrollFrames.delete(parent)
    }
  }
  tocRailScrollFrames.set(parent, requestAnimationFrame(tick))
}

/**
 * Keep `element` visible inside its TOC rail scrollport only —
 * does not move outer page / stage roots (unlike Element.scrollIntoView).
 * Middle rows ease toward the vertical center; first/last snap to rail extremes.
 */
export function scrollElementIntoNearestScrollParent(
  element: HTMLElement,
  options?: {
    padding?: number
    behavior?: ScrollBehavior
    edge?: 'auto' | 'start' | 'end'
  },
): void {
  const parent = getTocRailScrollParent(element)
  if (!parent) return

  const behavior = options?.behavior ?? 'smooth'
  const maxScroll = Math.max(0, parent.scrollHeight - parent.clientHeight)
  if (maxScroll <= 0) return

  if (options?.edge === 'start') {
    animateTocRailScrollTop(parent, 0, behavior)
    return
  }
  if (options?.edge === 'end') {
    animateTocRailScrollTop(parent, maxScroll, behavior)
    return
  }

  const padding = options?.padding ?? 16
  const parentRect = parent.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const elementTop = elementRect.top - parentRect.top + parent.scrollTop

  const above = elementRect.top < parentRect.top + padding
  const below = elementRect.bottom > parentRect.bottom - padding
  if (!above && !below) return

  // Ease toward center when leaving the padded band — less stutter than micro edge nudges
  const centered = elementTop - parent.clientHeight / 2 + elementRect.height / 2
  animateTocRailScrollTop(parent, centered, behavior)
}
