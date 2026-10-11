import type { gsap as GsapNS } from 'gsap'

type Gsap = typeof GsapNS

/** Theme SlideshowGallery `demo3` — Zoom crossfade. */
export const SLIDESHOW_ZOOM_CROSSFADE = {
  duration: 1.1,
  ease: 'power2.inOut',
  outScale: 0.4,
  innerScale: 1.5,
  middleAt: 0.65,
  incomingDuration: 1,
  incomingEase: 'expo',
  incomingInnerY: 30,
} as const

export type SlideshowZoomCrossfadeTargets = {
  currentSlide: Element
  currentInner: Element
  upcomingSlide: Element
  upcomingInner: Element
  direction: number
  onStart?: () => void
  onComplete?: () => void
}

/**
 * Codrops demo3 timeline: outgoing scale 0.4 / inner 1.5, then incoming
 * slides in on `yPercent` with an inner counter-scale.
 */
export function runSlideshowZoomCrossfade(gsap: Gsap, targets: SlideshowZoomCrossfadeTargets) {
  const { currentSlide, currentInner, upcomingSlide, upcomingInner, direction, onStart, onComplete } =
    targets
  const sign = direction < 0 ? -1 : 1
  return gsap
    .timeline({
      defaults: {
        duration: SLIDESHOW_ZOOM_CROSSFADE.duration,
        ease: SLIDESHOW_ZOOM_CROSSFADE.ease,
      },
      onStart,
      onComplete,
    })
    .addLabel('start', 0)
    .to(currentSlide, { scale: SLIDESHOW_ZOOM_CROSSFADE.outScale }, 'start')
    .to(currentInner, { scale: SLIDESHOW_ZOOM_CROSSFADE.innerScale }, 'start')
    .addLabel('middle', `start+=${SLIDESHOW_ZOOM_CROSSFADE.middleAt}`)
    .fromTo(
      upcomingSlide,
      { yPercent: sign * 100, scale: 1 },
      {
        duration: SLIDESHOW_ZOOM_CROSSFADE.incomingDuration,
        ease: SLIDESHOW_ZOOM_CROSSFADE.incomingEase,
        yPercent: 0,
      },
      'middle',
    )
    .fromTo(
      upcomingInner,
      {
        scale: SLIDESHOW_ZOOM_CROSSFADE.innerScale,
        yPercent: -sign * SLIDESHOW_ZOOM_CROSSFADE.incomingInnerY,
      },
      {
        duration: SLIDESHOW_ZOOM_CROSSFADE.duration,
        ease: SLIDESHOW_ZOOM_CROSSFADE.incomingEase,
        scale: 1,
        yPercent: 0,
      },
      'middle',
    )
}
