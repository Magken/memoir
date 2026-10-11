import type { gsap as GsapType } from 'gsap'
import type { ScrollTrigger as STType } from 'gsap/ScrollTrigger'

type Gsap = typeof GsapType
type ScrollTrigger = typeof STType

/** Codrops recipes used on Page Scenes (ThemeScroll-aware). */
export type PageScrollTypeEffect = 2 | 6

export type PageScrollTypeMode = 'scrub' | 'enter'

/**
 * Effect 2 (stretch rise) start pose — shared by enter/scrub + once.
 * Kept shallower than the Codrops demo so fast scroll does not read as extreme stretch.
 */
export const PAGE_SCROLL_TYPE_EFFECT_2_FROM = {
  opacity: 0,
  yPercent: 55,
  scaleY: 1.55,
  scaleX: 0.85,
  transformOrigin: '50% 0%',
  force3D: true,
} as const

export type ApplyPageScrollTypeOptions = {
  effect: PageScrollTypeEffect
  /** Element that contains `.theme-scroll-type__char` / `__word` nodes. */
  root: HTMLElement
  gsap: Gsap
  ScrollTrigger: ScrollTrigger
  /** ThemeScroll viewport — required for in-scene scroll. Omit for window (rare). */
  scroller?: HTMLElement | string | null
  mode?: PageScrollTypeMode
  /** Scrub lag when `mode === 'scrub'` (default `true` / match Home Scene 02 `0.5`). */
  scrub?: boolean | number
  start?: string
  end?: string
  /** Extra ScrollTrigger fields (e.g. invalidateOnRefresh). */
  trigger?: HTMLElement | string
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function stBase(options: ApplyPageScrollTypeOptions) {
  const mode = options.mode ?? 'scrub'
  const trigger = options.trigger ?? options.root
  const scroller = options.scroller ?? undefined

  if (mode === 'enter') {
    return {
      trigger,
      scroller,
      start: options.start ?? 'top 88%',
      toggleActions: 'play none none reverse' as const,
      invalidateOnRefresh: true,
    }
  }

  return {
    trigger,
    scroller,
    start: options.start ?? 'center bottom+=50%',
    end: options.end ?? 'bottom top+=40%',
    scrub: options.scrub ?? 0.5,
    invalidateOnRefresh: true,
  }
}

/**
 * Apply Codrops Effect 2 (Stretch rise) or Effect 6 (3D flip X) to pre-split
 * char/word nodes. Always transform-only + force3D. Safe with ThemeScroll when
 * `scroller` is the viewport element.
 * @returns Tweens created (caller must kill on cleanup when deferred).
 */
export function applyPageScrollType(options: ApplyPageScrollTypeOptions): gsap.core.Tween[] {
  const { effect, root, gsap } = options
  const chars = root.querySelectorAll('.theme-scroll-type__char')
  const words = root.querySelectorAll('.theme-scroll-type__word')
  const tweens: gsap.core.Tween[] = []

  if (prefersReducedMotion()) {
    gsap.set([...chars, ...words], { clearProps: 'all', opacity: 1 })
    return tweens
  }

  if (chars.length === 0) return tweens

  // Apply start pose immediately so nothing flashes while ScrollTrigger wires up.
  if (effect === 2) {
    gsap.set(chars, { ...PAGE_SCROLL_TYPE_EFFECT_2_FROM })
  } else {
    gsap.set(chars, { opacity: 0, rotationX: -90, yPercent: 50, force3D: true })
  }

  const scrollTrigger = stBase(options)

  if (effect === 2) {
    tweens.push(
      gsap.fromTo(
        chars,
        { ...PAGE_SCROLL_TYPE_EFFECT_2_FROM },
        {
          duration: options.mode === 'enter' ? 0.9 : 1,
          ease: options.mode === 'enter' ? 'back.out(1.4)' : 'back.inOut(2)',
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          stagger: 0.03,
          force3D: true,
          scrollTrigger,
        },
      ),
    )
    return tweens
  }

  // Effect 6 — 3D flip X per word
  words.forEach((word) => {
    const wordChars = word.querySelectorAll('.theme-scroll-type__char')
    if (wordChars.length === 0) return
    gsap.set(word, { perspective: 2000, transformStyle: 'preserve-3d' })
    wordChars.forEach((char) => {
      gsap.set(char, { transformOrigin: '50% 50%', force3D: true })
    })
    tweens.push(
      gsap.fromTo(
        wordChars,
        { opacity: 0, rotationX: -90, yPercent: 50, force3D: true },
        {
          duration: options.mode === 'enter' ? 0.85 : 1,
          ease: 'power1.inOut',
          opacity: 1,
          rotationX: 0,
          yPercent: 0,
          stagger: { each: 0.03, from: 0 },
          force3D: true,
          scrollTrigger: {
            ...scrollTrigger,
            trigger: options.mode === 'scrub' ? word : scrollTrigger.trigger,
            start: options.mode === 'scrub' ? (options.start ?? 'center bottom+=40%') : scrollTrigger.start,
            end: options.mode === 'scrub' ? (options.end ?? 'bottom center-=30%') : undefined,
            scrub: options.mode === 'scrub' ? (options.scrub ?? 0.9) : undefined,
            toggleActions: options.mode === 'enter' ? 'play none none reverse' : undefined,
          },
        },
      ),
    )
  })
  return tweens
}

/** Play Effect 2 or 6 once without ScrollTrigger (e.g. landing after cloud ready). */
export function playPageScrollTypeOnce(options: {
  effect: PageScrollTypeEffect
  root: HTMLElement
  gsap: Gsap
  delay?: number
}): gsap.core.Tween | gsap.core.Timeline | null {
  const { effect, root, gsap, delay = 0 } = options
  const chars = root.querySelectorAll('.theme-scroll-type__char')
  const words = root.querySelectorAll('.theme-scroll-type__word')

  if (prefersReducedMotion()) {
    gsap.set([...chars, ...words], { clearProps: 'all', opacity: 1 })
    return null
  }
  if (chars.length === 0) return null

  // Full start pose before delay — CSS opacity 0 alone is not enough for scaleY flash.
  if (effect === 2) {
    gsap.set(chars, { ...PAGE_SCROLL_TYPE_EFFECT_2_FROM })
  } else {
    gsap.set(chars, { opacity: 0, rotationX: -90, yPercent: 50, force3D: true })
  }

  if (effect === 2) {
    return gsap.fromTo(
      chars,
      { ...PAGE_SCROLL_TYPE_EFFECT_2_FROM },
      {
        duration: 0.9,
        delay,
        ease: 'back.out(1.4)',
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        scaleX: 1,
        stagger: 0.028,
        force3D: true,
      },
    )
  }

  const tl = gsap.timeline({ delay })
  words.forEach((word, index) => {
    const wordChars = word.querySelectorAll('.theme-scroll-type__char')
    if (wordChars.length === 0) return
    gsap.set(word, { perspective: 2000, transformStyle: 'preserve-3d' })
    tl.fromTo(
      wordChars,
      { opacity: 0, rotationX: -90, yPercent: 50, force3D: true },
      {
        duration: 0.75,
        ease: 'power1.out',
        opacity: 1,
        rotationX: 0,
        yPercent: 0,
        stagger: 0.025,
        force3D: true,
      },
      index * 0.08,
    )
  })
  return tl
}
