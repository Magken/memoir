/**
 * Named Lusion-style fluid motion — clip curtains, char/word rises, media clip+scale, Flip morph.
 * Eases from lusion.co About + DDD 2024 homepage (not opacity slides).
 */
import { Flip, gsap, easeFluidIn, easeFluidOut } from '../gsap'

export const FLUID_IN_S = 0.9
export const FLUID_OUT_S = 0.55
export const FLUID_STAGGER_S = 0.035
export const FLUID_COPY_LAG_S = 0.12

const CHAR_FILL = '.theme-fluid-chars__fill, .theme-fluid-line__fill'
const MEDIA = '.theme-fluid-media'
const MEDIA_IMG = '.theme-fluid-media__img'

export function prefersFluidReduce(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function fluidCharFills(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(CHAR_FILL)).filter(
    (el) => !el.closest('.theme-fluid-flip'),
  )
}

/** Clip curtain in — yPercent 110→0, no fade. */
export function playFluidCharsIn(root: HTMLElement | null, reduced = prefersFluidReduce()): void {
  const els = fluidCharFills(root)
  if (!els.length) return
  gsap.killTweensOf(els)
  if (reduced) {
    gsap.set(els, { yPercent: 0 })
    return
  }
  gsap.fromTo(
    els,
    { yPercent: 110 },
    {
      yPercent: 0,
      duration: FLUID_IN_S,
      stagger: FLUID_STAGGER_S,
      ease: easeFluidIn,
      overwrite: 'auto',
      onComplete: () => {
        gsap.set(els, { clearProps: 'transform' })
      },
    },
  )
}

/** Clip curtain out — yPercent 0→-110 (forward) or 110 (back). */
export function playFluidCharsOut(
  root: HTMLElement | null,
  direction: 'forward' | 'back' = 'forward',
  reduced = prefersFluidReduce(),
): void {
  const els = fluidCharFills(root)
  if (!els.length) return
  gsap.killTweensOf(els)
  if (reduced) {
    gsap.set(els, { yPercent: direction === 'forward' ? -110 : 110 })
    return
  }
  gsap.to(els, {
    yPercent: direction === 'forward' ? -110 : 110,
    duration: FLUID_OUT_S,
    stagger: FLUID_STAGGER_S * 0.6,
    ease: easeFluidOut,
    overwrite: 'auto',
  })
}

/** Image: clip-path opens from the bottom while the inner layer eases from 1.18→1. */
export function playFluidMediaIn(root: HTMLElement | null, reduced = prefersFluidReduce()): void {
  if (!root) return
  const frames = Array.from(root.querySelectorAll<HTMLElement>(MEDIA))
  const imgs = Array.from(root.querySelectorAll<HTMLElement>(MEDIA_IMG))
  gsap.killTweensOf([...frames, ...imgs])
  if (reduced) {
    gsap.set(frames, { clipPath: 'inset(0% 0% 0% 0%)' })
    gsap.set(imgs, { scale: 1 })
    return
  }
  if (frames.length) {
    gsap.fromTo(
      frames,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: FLUID_IN_S,
        ease: easeFluidIn,
        overwrite: 'auto',
      },
    )
  }
  if (imgs.length) {
    gsap.fromTo(
      imgs,
      { scale: 1.18 },
      {
        scale: 1,
        duration: FLUID_IN_S * 1.15,
        ease: easeFluidIn,
        overwrite: 'auto',
      },
    )
  }
}

export function playFluidMediaOut(root: HTMLElement | null, reduced = prefersFluidReduce()): void {
  if (!root) return
  const frames = Array.from(root.querySelectorAll<HTMLElement>(MEDIA))
  gsap.killTweensOf(frames)
  if (!frames.length) return
  if (reduced) {
    gsap.set(frames, { clipPath: 'inset(0% 0% 100% 0%)' })
    return
  }
  gsap.to(frames, {
    clipPath: 'inset(0% 0% 100% 0%)',
    duration: FLUID_OUT_S,
    ease: easeFluidOut,
    overwrite: 'auto',
  })
}

/**
 * Big type / crop → new seat. Fits `el` onto `fromEl` then plays to layout.
 * Uses Flip.fit — does **not** `absolute` the 8×8 grid.
 */
export function playFluidFit(
  el: HTMLElement | null,
  fromEl: HTMLElement | null,
  reduced = prefersFluidReduce(),
) {
  if (!el || !fromEl || reduced) return null
  return Flip.fit(el, fromEl, {
    scale: true,
    absolute: false,
    duration: FLUID_IN_S,
    ease: easeFluidIn,
    runBackwards: true,
    onComplete: () => {
      gsap.set(el, { clearProps: 'transform' })
    },
  })
}

/** Shared-element morph — Flip.from on already-captured nodes (not the LCL grid). */
export function playFluidFlip(state: ReturnType<typeof Flip.getState> | null, reduced = prefersFluidReduce()) {
  if (!state || reduced) return null
  return Flip.from(state, {
    duration: FLUID_IN_S,
    ease: easeFluidIn,
    scale: true,
    absolute: false,
    nested: false,
    prune: true,
    clearProps: 'transform',
  })
}

export function captureFluidFlip(root: HTMLElement | null) {
  if (!root || prefersFluidReduce()) return null
  const nodes = root.querySelectorAll('[data-flip-id]')
  if (!nodes.length) return null
  return Flip.getState(nodes)
}
