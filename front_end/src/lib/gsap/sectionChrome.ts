import gsap from 'gsap'

const ANIM_SEL = '[data-dash-anim]'

function targets(root: HTMLElement): HTMLElement[] {
  const items = root.querySelectorAll<HTMLElement>(ANIM_SEL)
  return items.length > 0 ? Array.from(items) : [root]
}

/** Enter chrome like Home menu items — opacity + y, optional stagger. */
export function revealSectionIn(
  root: HTMLElement | null,
  options?: {
    reducedMotion?: boolean
    duration?: number
    stagger?: number
    /** Start offset in px (default 14). */
    fromY?: number
    onComplete?: () => void
  },
): void {
  if (!root) {
    options?.onComplete?.()
    return
  }
  const reduced = options?.reducedMotion === true
  const duration = reduced ? 0.01 : (options?.duration ?? 0.4)
  const stagger = reduced ? 0 : (options?.stagger ?? 0.045)
  const fromY = options?.fromY ?? 14
  const els = targets(root)

  gsap.killTweensOf(els)
  if (reduced) {
    gsap.set(els, { autoAlpha: 1, y: 0, clearProps: 'transform' })
    options?.onComplete?.()
    return
  }

  gsap.fromTo(
    els,
    { autoAlpha: 0, y: fromY },
    {
      autoAlpha: 1,
      y: 0,
      duration,
      stagger,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform',
      onComplete: () => options?.onComplete?.(),
    },
  )
}

/** Exit chrome before swapping section content. */
export function revealSectionOut(
  root: HTMLElement | null,
  options: {
    reducedMotion?: boolean
    duration?: number
    stagger?: number
    onComplete?: () => void
  },
): void {
  if (!root) {
    options.onComplete?.()
    return
  }
  const reduced = options.reducedMotion === true
  const duration = reduced ? 0.01 : (options.duration ?? 0.22)
  const stagger = reduced ? 0 : (options.stagger ?? 0.03)
  const els = targets(root)

  gsap.killTweensOf(els)
  gsap.to(els, {
    autoAlpha: 0,
    y: reduced ? 0 : -10,
    duration,
    stagger,
    ease: 'power2.in',
    overwrite: 'auto',
    onComplete: () => options.onComplete?.(),
  })
}
