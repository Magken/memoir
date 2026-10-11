import { gsap } from '../../gsap'
import type { WebGpuGalleryPlane } from './types'

export const WEBGPU_DUR_MORPH = 0.9
export const WEBGPU_DUR_FADE = 0.5
export const WEBGPU_EASE_MORPH = 'power3.inOut'
export const WEBGPU_EASE_FADE = 'power2.out'
export const WEBGPU_EASE_FADE_OUT = 'power2.in'

export function webGpuTweenBounds(
  plane: WebGpuGalleryPlane,
  target: { x: number; y: number; w: number; h: number; z?: number },
  opts: { duration?: number; ease?: string; delay?: number } = {},
) {
  return gsap.to(plane.bounds, {
    x: target.x,
    y: target.y,
    w: target.w,
    h: target.h,
    z: target.z ?? 0,
    duration: opts.duration ?? WEBGPU_DUR_MORPH,
    ease: opts.ease ?? WEBGPU_EASE_MORPH,
    delay: opts.delay ?? 0,
  })
}

export function webGpuTweenOpacity(
  plane: WebGpuGalleryPlane,
  to: number,
  opts: { duration?: number; ease?: string; delay?: number } = {},
) {
  return gsap.to(plane, {
    opacity: to,
    duration: opts.duration ?? WEBGPU_DUR_FADE,
    ease: opts.ease ?? WEBGPU_EASE_FADE,
    delay: opts.delay ?? 0,
  })
}

export function webGpuAnimateTextIn(el: HTMLElement | null) {
  if (!el) return null
  gsap.set(el, { clearProps: 'transform,opacity' })
  return gsap.from(el, {
    yPercent: 102,
    opacity: 0,
    duration: 0.7,
    ease: 'power3.out',
  })
}

export function webGpuAnimateTextOut(el: HTMLElement | null) {
  if (!el) return null
  return gsap.to(el, {
    yPercent: -102,
    opacity: 0,
    duration: 0.45,
    ease: 'power3.out',
  })
}

const SLOT_CAPTION_SELECTOR = '.theme-webgpu-transition-gallery__slot-caption'

export function webGpuAnimateSlotCaptionsOut(pageEl: HTMLElement | null) {
  if (!pageEl) return null
  const captions = pageEl.querySelectorAll<HTMLElement>(SLOT_CAPTION_SELECTOR)
  if (!captions.length) return null
  return gsap.to(captions, {
    yPercent: -102,
    opacity: 0,
    duration: 0.4,
    stagger: 0.035,
    ease: 'power3.out',
  })
}

export function webGpuAnimateSlotCaptionsIn(
  pageEl: HTMLElement | null,
  opts: { delay?: number } = {},
) {
  if (!pageEl) return null
  const captions = pageEl.querySelectorAll<HTMLElement>(SLOT_CAPTION_SELECTOR)
  if (!captions.length) return null
  gsap.set(captions, { yPercent: 102, opacity: 0 })
  return gsap.to(captions, {
    yPercent: 0,
    opacity: 0.5,
    duration: 0.65,
    stagger: 0.05,
    ease: 'power3.out',
    delay: opts.delay ?? 0.15,
  })
}

export function webGpuHideSlotCaptions(pageEl: HTMLElement | null) {
  if (!pageEl) return
  const captions = pageEl.querySelectorAll<HTMLElement>(SLOT_CAPTION_SELECTOR)
  gsap.set(captions, { yPercent: 102, opacity: 0 })
}
