/** Seconds — shared page-level GSAP + scroll timing. */
export type GsapPageDurations = {
  instant: number
  fast: number
  base: number
  slow: number
  page: number
  scrollTo: number
}

export type GsapPageEases = {
  /** Primary ease — carousel wheel cubic-bezier or GSAP ease string. */
  default: string
  snap: string
  inOut: string
}

export type GsapPageScrollTiming = {
  /** Default ScrollTrigger window (page / scene). */
  start: string
  end: string
  /** Scrub on nested scroll hosts (card viewport). */
  scrubHost: number | boolean
  /** Scrub on page-level triggers. */
  scrubPage: number | boolean
  /** Wheel / touch gallery cooldown (ms). */
  wheelCooldownMs: number
}

export type GsapPageStagger = {
  tight: number
  base: number
}

export type GsapPageLayout = {
  /** Scroll document height in viewport-height units (3 = three screens). */
  pageLengthVph: number
}

export type GsapPageTiming = {
  duration: GsapPageDurations
  ease: GsapPageEases
  scroll: GsapPageScrollTiming
  stagger: GsapPageStagger
  layout: GsapPageLayout
}

export type GsapPageTimingOverrides = {
  duration?: Partial<GsapPageDurations>
  ease?: Partial<GsapPageEases>
  scroll?: Partial<GsapPageScrollTiming>
  stagger?: Partial<GsapPageStagger>
  layout?: Partial<GsapPageLayout>
}

/** Numeric defaults — eases filled in `createDefaultGsapPageTiming`. */
export const GSAP_PAGE_TIMING_BASE = {
  duration: {
    instant: 0.2,
    fast: 0.45,
    base: 0.85,
    slow: 1.15,
    page: 1.25,
    scrollTo: 1.2,
  },
  scroll: {
    start: 'top 85%',
    end: 'bottom 15%',
    scrubHost: 0.35,
    scrubPage: 1.2,
    wheelCooldownMs: 1000,
  },
  stagger: {
    tight: 0.06,
    base: 0.12,
  },
  layout: {
    pageLengthVph: 1,
  },
} as const satisfies {
  duration: GsapPageDurations
  scroll: GsapPageScrollTiming
  stagger: GsapPageStagger
  layout: GsapPageLayout
}

export function mergeGsapPageTiming(
  base: GsapPageTiming,
  overrides?: GsapPageTimingOverrides,
): GsapPageTiming {
  if (!overrides) return base
  return {
    duration: { ...base.duration, ...overrides.duration },
    ease: { ...base.ease, ...overrides.ease },
    scroll: { ...base.scroll, ...overrides.scroll },
    stagger: { ...base.stagger, ...overrides.stagger },
    layout: { ...base.layout, ...overrides.layout },
  }
}
