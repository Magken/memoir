import { gsap } from '../../gsap'
import {
  WEBGPU_GALLERY_MAIN_COUNT,
  WEBGPU_GALLERY_SATELLITES_PER_IMAGE,
  webGpuMainIdx,
  webGpuSatIdx,
} from './constants'
import type { WebGpuGalleryEngine } from './gpuEngine'
import {
  WEBGPU_DUR_FADE,
  WEBGPU_DUR_MORPH,
  WEBGPU_EASE_FADE,
  WEBGPU_EASE_MORPH,
  webGpuAnimateSlotCaptionsIn,
  webGpuHideSlotCaptions,
  webGpuTweenBounds,
  webGpuTweenOpacity,
} from './tween'

export type WebGpuLoaderMorphPhase = 'loading' | 'handoff' | 'morphing' | 'interactive'

export const WEBGPU_LOADER_MORPH_DUMMY_MS = 1800
export const WEBGPU_LOADER_MORPH_READY_CAP = 90

type PlayLoaderMorphIntroOptions = {
  engine: WebGpuGalleryEngine
  host: HTMLElement
  pageEl: HTMLElement
  loaderEl: HTMLElement | null
  reducedMotion?: boolean
}

function setFullHostBounds(engine: WebGpuGalleryEngine, host: HTMLElement) {
  const rect = host.getBoundingClientRect()
  const plane = engine.planes[webGpuMainIdx(0)]
  if (!plane) return
  plane.trackedEl = null
  plane.bounds.x = rect.left
  plane.bounds.y = rect.top
  plane.bounds.w = rect.width
  plane.bounds.h = rect.height
  plane.bounds.z = 0
  plane.opacity = 1
  plane.tilt = 0
  plane.tiltX = 0
}

function hideOtherPlanes(engine: WebGpuGalleryEngine) {
  for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
    if (i !== 0) engine.planes[webGpuMainIdx(i)]!.opacity = 0
    for (let j = 0; j < WEBGPU_GALLERY_SATELLITES_PER_IMAGE; j += 1) {
      engine.planes[webGpuSatIdx(i, j)]!.opacity = 0
    }
  }
}

/** Shrink the full-stage first plane into slot 0, then reveal the rest of the rail. */
export async function playLoaderMorphIntro({
  engine,
  host,
  pageEl,
  loaderEl,
  reducedMotion = false,
}: PlayLoaderMorphIntroOptions): Promise<void> {
  hideOtherPlanes(engine)
  setFullHostBounds(engine, host)
  webGpuHideSlotCaptions(pageEl)

  const slot0 = pageEl.querySelector<HTMLElement>(
    '.theme-webgpu-transition-gallery__slot[data-index="0"]',
  )
  if (!slot0) return

  const firstPlane = engine.planes[webGpuMainIdx(0)]!
  firstPlane.trackedEl = null

  if (loaderEl) {
    if (reducedMotion) {
      gsap.set(loaderEl, { opacity: 0, pointerEvents: 'none' })
    } else {
      await gsap.to(loaderEl, {
        opacity: 0,
        duration: 0.22,
        ease: WEBGPU_EASE_FADE,
        pointerEvents: 'none',
      })
    }
  }

  const target = slot0.getBoundingClientRect()

  if (reducedMotion) {
    firstPlane.bounds.x = target.left
    firstPlane.bounds.y = target.top
    firstPlane.bounds.w = target.width
    firstPlane.bounds.h = target.height
    for (let i = 1; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      engine.planes[webGpuMainIdx(i)]!.opacity = 1
    }
    webGpuAnimateSlotCaptionsIn(pageEl, { delay: 0 })
    return
  }

  await Promise.all([
    webGpuTweenBounds(
      firstPlane,
      { x: target.left, y: target.top, w: target.width, h: target.height },
      { duration: WEBGPU_DUR_MORPH, ease: WEBGPU_EASE_MORPH },
    ),
  ])

  const fadeIns = []
  for (let i = 1; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
    fadeIns.push(
      webGpuTweenOpacity(engine.planes[webGpuMainIdx(i)]!, 1, {
        duration: WEBGPU_DUR_FADE,
        delay: (i - 1) * 0.06,
        ease: WEBGPU_EASE_FADE,
      }),
    )
  }
  webGpuAnimateSlotCaptionsIn(pageEl, { delay: 0.1 })
  await Promise.all(fadeIns)
}
