import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { CustomEase } from 'gsap/CustomEase'
import { Flip } from 'gsap/Flip'
import { Observer } from 'gsap/Observer'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(CustomEase, useGSAP, ScrollTrigger, Observer, Flip)

/** Cubic-bezier ease from `ref.image-carousel-3` (`.87, 0, .13, 1`). */
export const easeCarouselWheel = CustomEase.create('carouselWheel', '.87, 0, .13, 1')

/** Lusion About / DDD hero entry — `cubic-bezier(.16, 1, .3, 1)`. */
export const easeFluidIn = CustomEase.create('fluidIn', '0.16, 1, 0.3, 1')

/** Lusion page-leave — `cubic-bezier(.35, 0, 0, 1)`. */
export const easeFluidOut = CustomEase.create('fluidOut', '0.35, 0, 0, 1')

export { gsap, CustomEase, Flip, useGSAP, ScrollTrigger, Observer }
export { GsapPageProvider, createDefaultGsapPageTiming } from './GsapPageProvider'
export { useGsapPage, useGsapPageOptional } from './useGsapPage'
export { revealSectionIn, revealSectionOut } from './sectionChrome'
export {
  GSAP_PAGE_TIMING_BASE,
  mergeGsapPageTiming,
  type GsapPageTiming,
  type GsapPageTimingOverrides,
} from './gsapPageTiming'
export default gsap
