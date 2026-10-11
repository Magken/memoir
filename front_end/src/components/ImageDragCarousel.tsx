import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type Lenis from 'lenis'
import type { DottedNavMenuItem } from '../lib/menus/dottedNavMenu'
import type { GalleryExpandItem, GalleryExpandVariant } from '../lib/galleries/galleryExpand'
import { createImageDragGlEngine } from '../lib/galleries/imageDragGl'
import { useLenisScrollContextOptional } from '../hooks/lenisScrollContext'
import { DottedNavMenu } from './DottedNavMenu'
import { GalleryExpandOverlay } from './GalleryExpandOverlay'
import { IconButton } from './IconButton'

/** @deprecated use `GalleryExpandVariant` */
export type ImageDragCarouselExpandVariant = GalleryExpandVariant

export type ImageDragCarouselImage = GalleryExpandItem

/** Layout tuning when `slideLayout="project-card"` — sets CSS vars on the gallery shell. */
export type ImageDragCarouselProjectCard = {
  /** Media frame `aspect-ratio`, e.g. `3 / 2` */
  mediaAspectRatio?: string
  /** Slide width cap — maps to `--theme-img-drag-slide-max` */
  slideMaxWidth?: string
  /** Card max-width override — default `min(20rem, 100cqw)` in vanishing mode */
  cardMaxWidth?: string
  /** Optional fixed stage min-height — default: container fits card content */
  stageHeight?: string
  /** Cover image height inside frame for parallax — default `120%` */
  mediaHeight?: string
}

type ImageDragCarouselProps = {
  images: readonly ImageDragCarouselImage[]
  label?: string
  className?: string
  vanishing?: boolean | number
  /** Click-expand layout — `image` · `detail` · `native` (intrinsic-size card at max fill) */
  expandVariant?: GalleryExpandVariant
  /** Off-center slides desaturate + fade + recess in Z (`ref.image-carousel-2`); snappier wheel/drag */
  focusThin?: boolean
  /** WebGL velocity warp + chromatic smear on slides (`ref.image-carousel-7`) */
  glEffects?: boolean
  showDotNav?: boolean
  selectedIndex?: number
  defaultSelectedIndex?: number
  onSelectedIndexChange?: (index: number) => void
  dotNavLabel?: string
  /** Soft auto-advance — `true` for default interval or ms between slides */
  autoScroll?: boolean | number
  /** Loop to first slide after the last when auto-scrolling (`true`) */
  autoScrollLoop?: boolean
  /** `image` (default) · `project-card` — cover image + title / desc / tech stack */
  slideLayout?: 'image' | 'project-card'
  /** Project-card sizing — only when `slideLayout="project-card"` */
  projectCard?: ImageDragCarouselProjectCard
  /** Wheel/trackpad slide navigation — `false` lets page Lenis handle wheel over the gallery */
  wheelNav?: boolean
  debug?: boolean
}

const MIN_PCT = -100
const MAX_PCT = 0
const DRAG_ANIM_MS = 3000
const DRAG_ANIM_MS_FOCUS = 1100
const WHEEL_THRESHOLD = 48
const WHEEL_THRESHOLD_FOCUS = 28
const WHEEL_COOLDOWN_MS = 320
const WHEEL_COOLDOWN_FOCUS_MS = 180
const VANISHING_VISIBLE_DEFAULT = 1
const CLICK_MOVE_PX = 8
const AUTO_SCROLL_INTERVAL_MS = 5000
const AUTO_SCROLL_ANIM_MS = 1800
const AUTO_SCROLL_RESUME_MS = 3000
/** Yield carousel wheel to Lenis while page scroll is still coasting. */
const LENIS_YIELD_VELOCITY = 0.12

function readWheelDelta(event: WheelEvent): number {
  return Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
}

/** Let Lenis handle wheel when the carousel cannot move further or page inertia is active. */
function shouldYieldWheelToPage(
  event: WheelEvent,
  index: number,
  count: number,
  lenis: Lenis | null,
): boolean {
  if (count <= 1) return true

  const delta = readWheelDelta(event)
  if (delta === 0) return true

  const direction = delta > 0 ? 1 : -1
  if (direction > 0 && index >= count - 1) return true
  if (direction < 0 && index <= 0) return true

  if (!lenis) return false

  const velocity = lenis.velocity
  const lenisActive =
    lenis.isScrolling === 'smooth' || Math.abs(velocity) > LENIS_YIELD_VELOCITY
  if (!lenisActive) return false

  const lenisDir = Math.sign(velocity) || Math.sign(lenis.direction)
  if (lenisDir === 0) return true

  return Math.sign(delta) === lenisDir
}

function clampPercentage(value: number): number {
  return Math.max(Math.min(value, MAX_PCT), MIN_PCT)
}

function dragMaxDelta(): number {
  return Math.max(window.innerWidth / 2, 1)
}

function indexToPercentage(index: number, count: number): number {
  if (count <= 1) return 0
  return -(index / (count - 1)) * 100
}

function percentageToIndex(percentage: number, count: number): number {
  if (count <= 1) return 0
  const t = -percentage / 100
  return Math.round(t * (count - 1))
}

type PercentageBounds = { min: number; max: number }

/** Per-slide translate % so each project-card centers in the viewport (`left: 50%` track). */
function measureProjectCardSnapPercentages(
  track: HTMLElement,
  viewport: HTMLElement,
): number[] {
  const prevTransform = track.style.transform
  track.style.transform = trackTransform(0, true)

  const trackWidth = track.offsetWidth
  if (trackWidth <= 0) {
    track.style.transform = prevTransform
    return []
  }

  const viewportCenter = viewport.clientWidth / 2
  const trackBaseLeft = track.offsetLeft
  const slides = track.querySelectorAll<HTMLElement>('.theme-img-drag-carousel__slide')
  const pcts = Array.from(slides).map((slide) => {
    const slideCenter = trackBaseLeft + slide.offsetLeft + slide.offsetWidth / 2
    const translatePx = viewportCenter - slideCenter
    return (translatePx / trackWidth) * 100
  })

  track.style.transform = prevTransform
  return pcts
}

function percentageBoundsFromSnapList(pcts: readonly number[]): PercentageBounds {
  if (pcts.length === 0) return { min: MIN_PCT, max: MAX_PCT }
  return { min: Math.min(...pcts), max: Math.max(...pcts) }
}

function nearestIndexForProjectCardPercentage(
  percentage: number,
  pcts: readonly number[],
): number {
  if (pcts.length === 0) return 0
  let nearest = 0
  let best = Math.abs(percentage - pcts[0])
  for (let i = 1; i < pcts.length; i += 1) {
    const distance = Math.abs(percentage - pcts[i])
    if (distance < best) {
      best = distance
      nearest = i
    }
  }
  return nearest
}

function clampPercentageForTrack(
  value: number,
  bounds: PercentageBounds,
  projectCard: boolean,
): number {
  if (!projectCard) return clampPercentage(value)
  return Math.max(Math.min(value, bounds.max), bounds.min)
}

function resolveIndexPercentage(
  index: number,
  count: number,
  projectCard: boolean,
  snapPcts: readonly number[],
): number {
  if (projectCard && snapPcts[index] !== undefined) {
    return snapPcts[index]
  }
  return indexToPercentage(index, count)
}

function slideId(index: number): string {
  return `slide-${index}`
}

function indexFromSlideId(id: string): number {
  const match = /^slide-(\d+)$/.exec(id)
  return match ? Number.parseInt(match[1], 10) : 0
}

function resolveVanishingCount(vanishing: boolean | number | undefined): number | null {
  if (vanishing === undefined || vanishing === false) return null
  if (vanishing === true) return VANISHING_VISIBLE_DEFAULT
  return Math.max(1, Math.floor(vanishing))
}

function resolveAutoScrollInterval(autoScroll: boolean | number | undefined): number | null {
  if (autoScroll === undefined || autoScroll === false) return null
  if (autoScroll === true) return AUTO_SCROLL_INTERVAL_MS
  return Math.max(2000, Math.floor(autoScroll))
}

function projectCardLayoutStyle(
  layout: ImageDragCarouselProjectCard | undefined,
): CSSProperties | undefined {
  if (!layout) return undefined
  const style: Record<string, string> = {}
  if (layout.mediaAspectRatio) {
    style['--theme-img-drag-project-media-aspect'] = layout.mediaAspectRatio
  }
  if (layout.slideMaxWidth) {
    style['--theme-img-drag-slide-max'] = layout.slideMaxWidth
  }
  if (layout.cardMaxWidth) {
    style['--theme-img-drag-project-card-max-width'] = layout.cardMaxWidth
  }
  if (layout.stageHeight) {
    style['--theme-img-drag-project-stage-height'] = layout.stageHeight
  }
  if (layout.mediaHeight) {
    style['--theme-img-drag-project-media-height'] = layout.mediaHeight
  }
  return Object.keys(style).length > 0 ? (style as CSSProperties) : undefined
}

function trackTransform(pct: number, projectCard = false): string {
  return projectCard ? `translate(${pct}%, 0)` : `translate(${pct}%, -50%)`
}

function clampParallax(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Cover pan inside project-card media frame — relative to each slide's snap (50% at rest). */
function imageParallaxPosition(
  trackPct: number,
  projectCard: boolean,
  slideSnapPct = trackPct,
): string {
  if (!projectCard) return `${100 + trackPct}% center`
  const delta = trackPct - slideSnapPct
  const x = 50 - delta * 2.75
  const y = 50 - delta * 0.42
  return `${clampParallax(x, 32, 68)}% ${clampParallax(y, 42, 58)}%`
}

function applyImageParallax(
  track: HTMLElement,
  trackPct: number,
  projectCard: boolean,
  snapPcts: readonly number[],
): void {
  if (!projectCard) {
    const pos = imageParallaxPosition(trackPct, false)
    for (const image of track.getElementsByClassName('theme-img-drag-carousel__image')) {
      ;(image as HTMLImageElement).style.objectPosition = pos
    }
    return
  }

  const slides = track.querySelectorAll<HTMLElement>('.theme-img-drag-carousel__slide')
  slides.forEach((slide, index) => {
    const image = slide.querySelector<HTMLImageElement>('.theme-img-drag-carousel__image')
    if (!image) return
    const snapPct = snapPcts[index] ?? trackPct
    image.style.objectPosition = imageParallaxPosition(trackPct, true, snapPct)
  })
}

function applyTrackPercentage(
  track: HTMLElement,
  pct: number,
  focusThin: boolean,
  viewport: HTMLElement | null,
  debug: boolean,
  projectCard = false,
  snapPcts: readonly number[] = [],
): void {
  track.style.transform = trackTransform(pct, projectCard)
  applyImageParallax(track, pct, projectCard, snapPcts)
  if (debug && viewport) {
    viewport.dataset.percentage = String(pct)
  }
  if (focusThin && viewport) {
    syncSlideFocus(viewport, track, debug)
  }
}

function syncSlideFocus(viewport: HTMLElement, track: HTMLElement, log = false): void {
  const { left, width } = viewport.getBoundingClientRect()
  const centerX = left + width / 2
  const slides = track.querySelectorAll<HTMLElement>('.theme-img-drag-carousel__slide')

  let peak = 0
  const readings: { frame: HTMLElement; focus: number }[] = []

  for (const slide of slides) {
    const frame = slide.querySelector<HTMLElement>('.theme-img-drag-carousel__slide-frame')
    if (!frame) continue

    const rect = slide.getBoundingClientRect()
    const slideCenter = rect.left + rect.width / 2
    const distance = Math.abs(slideCenter - centerX)
    const radius = Math.max(rect.width * 1.35, 1)
    const focus = Math.max(0, 1 - distance / radius)
    readings.push({ frame, focus })
    peak = Math.max(peak, focus)
  }

  const scale = peak > 0.001 ? 1 / peak : 1

  for (const { frame, focus } of readings) {
    const normalized = Math.min(1, focus * scale)
    frame.style.setProperty('--theme-img-drag-focus', normalized.toFixed(3))
    if (log) {
      frame.dataset.imgDragFocus = normalized.toFixed(3)
    }
  }

  if (log) {
    console.debug('[ImageDragCarousel] focusThin', {
      peak,
      values: readings.map(({ focus }) => Number((focus * scale).toFixed(3))),
    })
  }
}

function runFocusDuringAnimation(
  viewport: HTMLElement,
  track: HTMLElement,
  durationMs: number,
  log = false,
): void {
  if (durationMs <= 0) {
    syncSlideFocus(viewport, track, log)
    return
  }

  const start = performance.now()
  const tick = (now: number) => {
    syncSlideFocus(viewport, track, log)
    if (now - start < durationMs) {
      requestAnimationFrame(tick)
    } else {
      syncSlideFocus(viewport, track, log)
    }
  }
  requestAnimationFrame(tick)
}

export function ImageDragCarousel({
  images,
  label = 'Image carousel',
  className = '',
  vanishing = 1,
  expandVariant = 'detail',
  focusThin = false,
  glEffects = true,
  showDotNav,
  selectedIndex: selectedIndexProp,
  defaultSelectedIndex = 0,
  onSelectedIndexChange,
  dotNavLabel,
  autoScroll,
  autoScrollLoop = true,
  slideLayout = 'image',
  projectCard,
  wheelNav = true,
  debug = false,
}: ImageDragCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const galleryShellRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const mouseDownAtRef = useRef(0)
  const prevPercentageRef = useRef(0)
  const percentageRef = useRef(0)
  const draggingRef = useRef(false)
  const wheelAccumRef = useRef(0)
  const lastWheelStepRef = useRef(0)
  const projectCardSnapPctsRef = useRef<number[]>([])
  const projectCardBoundsRef = useRef<PercentageBounds>({ min: MIN_PCT, max: MAX_PCT })
  const pointerOriginRef = useRef({ x: 0, y: 0 })
  const movedBeyondClickRef = useRef(false)
  const tapSlideIndexRef = useRef<number | null>(null)
  const selectedIndexRef = useRef(0)
  const expandedIndexRef = useRef<number | null>(null)
  const autoScrollPauseUntilRef = useRef(0)
  const autoScrollHoverRef = useRef(false)
  const glEngineRef = useRef<ReturnType<typeof createImageDragGlEngine> | null>(null)

  const vanishingCount = useMemo(() => resolveVanishingCount(vanishing), [vanishing])
  const vanishingOn = vanishingCount !== null
  const projectCardLayout = slideLayout === 'project-card'
  const autoScrollIntervalMs = useMemo(
    () => resolveAutoScrollInterval(autoScroll),
    [autoScroll]
  )
  const autoScrollOn = autoScrollIntervalMs !== null
  const lenisScroll = useLenisScrollContextOptional()
  const lenis = lenisScroll?.lenis ?? null

  const [internalIndex, setInternalIndex] = useState(() =>
    Math.min(Math.max(defaultSelectedIndex, 0), Math.max(images.length - 1, 0)),
  )
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const selectedIndex = selectedIndexProp ?? internalIndex

  selectedIndexRef.current = selectedIndex
  expandedIndexRef.current = expandedIndex

  const dotNavEnabled = showDotNav ?? images.length > 1
  const navItems = useMemo<readonly DottedNavMenuItem[]>(
    () =>
      images.map((image, index) => ({
        id: slideId(index),
        label: image.title ?? (image.alt || `Slide ${index + 1}`),
      })),
    [images],
  )
  const selectedId = slideId(selectedIndex)
  const canGoPrev = selectedIndex > 0
  const canGoNext = selectedIndex < images.length - 1
  const expandedImage = expandedIndex !== null ? images[expandedIndex] : null

  const closeExpanded = useCallback(() => {
    setExpandedIndex(null)
  }, [])

  const pauseAutoScroll = useCallback((durationMs = AUTO_SCROLL_RESUME_MS) => {
    autoScrollPauseUntilRef.current = performance.now() + durationMs
  }, [])

  const refreshProjectCardSnap = useCallback(() => {
    if (!projectCardLayout) return
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return
    const pcts = measureProjectCardSnapPercentages(track, viewport)
    projectCardSnapPctsRef.current = pcts
    projectCardBoundsRef.current = percentageBoundsFromSnapList(pcts)
  }, [projectCardLayout])

  const toggleExpanded = useCallback((index: number) => {
    setExpandedIndex((current) => (current === index ? null : index))
  }, [])

  const handleSlideActivate = useCallback(
    (index: number) => {
      if (movedBeyondClickRef.current) return
      toggleExpanded(index)
    },
    [toggleExpanded],
  )

  const commitIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, images.length - 1))
      if (selectedIndexProp === undefined) {
        setInternalIndex(clamped)
      }
      onSelectedIndexChange?.(clamped)
      return clamped
    },
    [images.length, onSelectedIndexChange, selectedIndexProp],
  )

  const animateToPercentage = useCallback(
    (nextPercentage: number, durationOverride?: number) => {
      const clamped = clampPercentageForTrack(
        nextPercentage,
        projectCardBoundsRef.current,
        projectCardLayout,
      )
      percentageRef.current = clamped

      const viewport = viewportRef.current
      const track = trackRef.current
      if (!track) return clamped

      if (debug && viewport) {
        viewport.dataset.percentage = String(clamped)
        viewport.dataset.focusThin = focusThin ? 'true' : 'false'
      }

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const duration =
        durationOverride ??
        (reducedMotion ? 0 : focusThin ? DRAG_ANIM_MS_FOCUS : DRAG_ANIM_MS)

      track.animate(
        { transform: trackTransform(clamped, projectCardLayout) },
        { duration, fill: 'forwards' },
      )

      const snapPcts = projectCardSnapPctsRef.current
      if (projectCardLayout) {
        const slides = track.querySelectorAll<HTMLElement>('.theme-img-drag-carousel__slide')
        slides.forEach((slide, index) => {
          const image = slide.querySelector<HTMLImageElement>('.theme-img-drag-carousel__image')
          if (!image) return
          const snapPct = snapPcts[index] ?? clamped
          image.animate(
            { objectPosition: imageParallaxPosition(clamped, true, snapPct) },
            { duration, fill: 'forwards' },
          )
        })
      } else {
        for (const image of track.getElementsByClassName('theme-img-drag-carousel__image')) {
          image.animate(
            { objectPosition: imageParallaxPosition(clamped, false) },
            { duration, fill: 'forwards' },
          )
        }
      }

      if (focusThin && viewport) {
        runFocusDuringAnimation(viewport, track, duration, debug)
      }

      return clamped
    },
    [debug, focusThin, projectCardLayout],
  )

  const snapToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, images.length - 1))
      if (projectCardLayout) {
        refreshProjectCardSnap()
      }
      const pct = resolveIndexPercentage(
        clamped,
        images.length,
        projectCardLayout,
        projectCardSnapPctsRef.current,
      )
      prevPercentageRef.current = pct
      percentageRef.current = pct
      commitIndex(clamped)

      const viewport = viewportRef.current
      const track = trackRef.current
      if (!track) return clamped

      for (const animation of track.getAnimations()) {
        animation.cancel()
      }
      for (const image of track.getElementsByClassName('theme-img-drag-carousel__image')) {
        for (const animation of image.getAnimations()) {
          animation.cancel()
        }
      }

      applyTrackPercentage(
        track,
        pct,
        focusThin,
        viewport,
        debug,
        projectCardLayout,
        projectCardSnapPctsRef.current,
      )
      return clamped
    },
    [commitIndex, debug, focusThin, images.length, projectCardLayout, refreshProjectCardSnap],
  )

  const goToIndex = useCallback(
    (
      index: number,
      options?: { animDuration?: number; fromAutoScroll?: boolean },
    ) => {
      if (!options?.fromAutoScroll) {
        pauseAutoScroll()
      }
      closeExpanded()
      const clamped = Math.max(0, Math.min(index, images.length - 1))
      if (projectCardLayout) {
        refreshProjectCardSnap()
      }
      const pct = resolveIndexPercentage(
        clamped,
        images.length,
        projectCardLayout,
        projectCardSnapPctsRef.current,
      )
      prevPercentageRef.current = pct
      commitIndex(clamped)
      animateToPercentage(pct, options?.animDuration)
      return clamped
    },
    [
      animateToPercentage,
      closeExpanded,
      commitIndex,
      images.length,
      pauseAutoScroll,
      projectCardLayout,
      refreshProjectCardSnap,
    ],
  )

  const finishDrag = useCallback(() => {
    draggingRef.current = false
    const viewport = viewportRef.current
    const track = trackRef.current
    viewport?.classList.remove('is-dragging')
    mouseDownAtRef.current = 0
    prevPercentageRef.current = percentageRef.current

    if (projectCardLayout && track && viewport) {
      refreshProjectCardSnap()
      const snapPcts = projectCardSnapPctsRef.current
      const nearest = nearestIndexForProjectCardPercentage(percentageRef.current, snapPcts)
      const pct = snapPcts[nearest] ?? percentageRef.current
      percentageRef.current = pct
      prevPercentageRef.current = pct
      commitIndex(nearest)
      applyTrackPercentage(track, pct, focusThin, viewport, debug, true, snapPcts)
    } else {
      commitIndex(percentageToIndex(percentageRef.current, images.length))
    }

    if (focusThin && viewport && track) {
      requestAnimationFrame(() => syncSlideFocus(viewport, track, debug))
    }
  }, [commitIndex, debug, focusThin, images.length, projectCardLayout, refreshProjectCardSnap])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      const viewport = viewportRef.current
      if (!viewport) return

      movedBeyondClickRef.current = false
      pointerOriginRef.current = { x: event.clientX, y: event.clientY }
      const slide = (event.target as Element).closest('[data-slide-index]')
      tapSlideIndexRef.current = slide
        ? Number.parseInt(slide.getAttribute('data-slide-index') ?? '', 10)
        : null
      if (slide && Number.isNaN(tapSlideIndexRef.current)) {
        tapSlideIndexRef.current = null
      }

      draggingRef.current = true
      viewport.classList.add('is-dragging')
      mouseDownAtRef.current = event.clientX
      pauseAutoScroll(Number.POSITIVE_INFINITY)
      viewport.setPointerCapture(event.pointerId)
    },
    [pauseAutoScroll],
  )

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const viewport = viewportRef.current
      if (!viewport) return

      if (
        draggingRef.current &&
        !movedBeyondClickRef.current &&
        tapSlideIndexRef.current !== null
      ) {
        handleSlideActivate(tapSlideIndexRef.current)
      }

      if (draggingRef.current) {
        finishDrag()
        pauseAutoScroll()
      }

      tapSlideIndexRef.current = null

      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId)
      }
    },
    [finishDrag, handleSlideActivate, pauseAutoScroll],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || mouseDownAtRef.current === 0) return

      const dx = event.clientX - pointerOriginRef.current.x
      const dy = event.clientY - pointerOriginRef.current.y
      const distance = Math.hypot(dx, dy)
      if (distance <= CLICK_MOVE_PX) return

      if (!movedBeyondClickRef.current) {
        movedBeyondClickRef.current = true
        closeExpanded()
        pauseAutoScroll()
      }

      const mouseDelta = mouseDownAtRef.current - event.clientX
      const deltaPct = (mouseDelta / dragMaxDelta()) * -100
      const next = prevPercentageRef.current + deltaPct
      animateToPercentage(next)
    },
    [animateToPercentage, closeExpanded, pauseAutoScroll],
  )

  const handleLostPointerCapture = useCallback(() => {
    if (!draggingRef.current) return
    finishDrag()
  }, [finishDrag])

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (images.length <= 1) return

      if (shouldYieldWheelToPage(event, selectedIndexRef.current, images.length, lenis)) {
        wheelAccumRef.current = 0
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const now = performance.now()
      const delta = readWheelDelta(event)
      wheelAccumRef.current += delta

      const wheelThreshold = focusThin ? WHEEL_THRESHOLD_FOCUS : WHEEL_THRESHOLD
      const wheelCooldown = focusThin ? WHEEL_COOLDOWN_FOCUS_MS : WHEEL_COOLDOWN_MS

      if (Math.abs(wheelAccumRef.current) < wheelThreshold) return
      if (now - lastWheelStepRef.current < wheelCooldown) {
        wheelAccumRef.current = 0
        return
      }

      const direction = wheelAccumRef.current > 0 ? 1 : -1
      wheelAccumRef.current = 0
      lastWheelStepRef.current = now
      goToIndex(selectedIndexRef.current + direction)
    },
    [focusThin, goToIndex, images.length, lenis],
  )

  useEffect(() => {
    if (!wheelNav) return undefined

    const shell = galleryShellRef.current
    if (!shell) return undefined

    shell.addEventListener('wheel', handleWheel, { passive: false })
    return () => shell.removeEventListener('wheel', handleWheel)
  }, [handleWheel, wheelNav])

  const handleDotSelect = useCallback(
    (id: string) => {
      goToIndex(indexFromSlideId(id))
    },
    [goToIndex],
  )

  useLayoutEffect(() => {
    const idx = Math.min(Math.max(defaultSelectedIndex, 0), Math.max(images.length - 1, 0))
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track) return

    if (projectCardLayout && viewport) {
      refreshProjectCardSnap()
    }
    const pct = resolveIndexPercentage(
      idx,
      images.length,
      projectCardLayout,
      projectCardSnapPctsRef.current,
    )
    prevPercentageRef.current = pct
    percentageRef.current = pct
    track.style.transform = trackTransform(pct, projectCardLayout)
    applyImageParallax(track, pct, projectCardLayout, projectCardSnapPctsRef.current)
    if (focusThin && viewport) {
      requestAnimationFrame(() => syncSlideFocus(viewport, track, debug))
    }
  }, [
    debug,
    defaultSelectedIndex,
    focusThin,
    images.length,
    projectCardLayout,
    refreshProjectCardSnap,
  ])

  useLayoutEffect(() => {
    if (!projectCardLayout) return undefined
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return undefined

    const onResize = () => {
      refreshProjectCardSnap()
      const pct = resolveIndexPercentage(
        selectedIndexRef.current,
        images.length,
        true,
        projectCardSnapPctsRef.current,
      )
      prevPercentageRef.current = pct
      percentageRef.current = pct
      applyTrackPercentage(
        track,
        pct,
        focusThin,
        viewport,
        debug,
        true,
        projectCardSnapPctsRef.current,
      )
      syncSlideFocus(viewport, track, debug)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [debug, focusThin, images.length, projectCardLayout, refreshProjectCardSnap])

  useLayoutEffect(() => {
    if (!focusThin) return undefined
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return undefined

    syncSlideFocus(viewport, track, debug)
    const onResize = () => syncSlideFocus(viewport, track, debug)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [debug, focusThin, images.length])

  useEffect(() => {
    glEngineRef.current?.dispose()
    glEngineRef.current = null

    if (!glEffects) return undefined

    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track || images.length === 0) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const engine = createImageDragGlEngine(viewport, track, { reducedMotion })
    glEngineRef.current = engine

    return () => {
      engine.dispose()
      if (glEngineRef.current === engine) {
        glEngineRef.current = null
      }
    }
  }, [glEffects, images.length])

  useEffect(() => {
    glEngineRef.current?.setPaused(expandedIndex !== null)
  }, [expandedIndex])

  useEffect(() => {
    if (selectedIndexProp === undefined) return
    goToIndex(selectedIndexProp)
  }, [goToIndex, selectedIndexProp])

  useEffect(() => {
    if (expandedIndex === null) return undefined
    pauseAutoScroll(Number.POSITIVE_INFINITY)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeExpanded()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeExpanded, expandedIndex, pauseAutoScroll])

  useEffect(() => {
    if (expandedIndex !== null) return
    pauseAutoScroll()
  }, [expandedIndex, pauseAutoScroll])

  useEffect(() => {
    if (!autoScrollOn || images.length <= 1) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const tick = () => {
      if (document.hidden) return
      if (performance.now() < autoScrollPauseUntilRef.current) return
      if (draggingRef.current) return
      if (expandedIndexRef.current !== null) return
      if (autoScrollHoverRef.current) return

      const current = selectedIndexRef.current
      if (current >= images.length - 1) {
        if (!autoScrollLoop) return
        snapToIndex(0)
        return
      }

      goToIndex(current + 1, { animDuration: AUTO_SCROLL_ANIM_MS, fromAutoScroll: true })
    }

    const id = window.setInterval(tick, autoScrollIntervalMs)
    return () => window.clearInterval(id)
  }, [autoScrollIntervalMs, autoScrollLoop, autoScrollOn, goToIndex, images.length, snapToIndex])

  const viewportStyle = useMemo((): CSSProperties | undefined => {
    const vars: Record<string, string | number> = {}
    if (vanishingCount) {
      vars['--theme-img-drag-visible-count'] = vanishingCount
    }
    const projectCardVars = projectCardLayoutStyle(projectCardLayout ? projectCard : undefined)
    if (projectCardVars) {
      Object.assign(vars, projectCardVars)
    }
    return Object.keys(vars).length > 0 ? (vars as CSSProperties) : undefined
  }, [projectCard, projectCardLayout, vanishingCount])

  const viewport = (
    <div
      ref={viewportRef}
      className={[
        'theme-img-drag-carousel',
        vanishingOn ? 'theme-img-drag-carousel--vanishing' : '',
        focusThin ? 'theme-img-drag-carousel--focus-thin' : '',
        projectCardLayout ? 'theme-img-drag-carousel--project-card' : '',
        glEffects ? 'theme-img-drag-carousel--gl' : '',
        autoScrollOn ? 'theme-img-drag-carousel--auto-scroll' : '',
        expandedIndex !== null ? 'theme-img-drag-carousel--expanded-open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={viewportStyle}
      role="region"
      aria-label={label}
      aria-roledescription="carousel"
      {...(vanishingCount !== null
        ? { 'data-visible-count': String(vanishingCount) }
        : {})}
      data-lenis-prevent-touch
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerMove={handlePointerMove}
      onLostPointerCapture={handleLostPointerCapture}
    >
      <div ref={trackRef} className="theme-img-drag-carousel__track">
        {images.map((image, index) => (
          <button
            key={`${image.src}-${index}`}
            type="button"
            className="theme-img-drag-carousel__slide"
            data-slide-index={index}
            aria-label={image.title ?? image.alt}
            aria-expanded={expandedIndex === index}
          >
            <span className="theme-img-drag-carousel__slide-frame">
              {projectCardLayout ? (
                <article className="theme-img-drag-carousel__project-card">
                  <div className="theme-img-drag-carousel__project-card__media-frame">
                    <img
                      className="theme-img-drag-carousel__image theme-img-drag-carousel__project-card__media"
                      src={image.src}
                      alt=""
                      draggable={false}
                      loading="lazy"
                      aria-hidden
                    />
                  </div>
                  <div className="theme-img-drag-carousel__project-card__body">
                    {image.title ? (
                      <h3 className="type-title theme-img-drag-carousel__project-card__title mb-1">
                        {image.title}
                      </h3>
                    ) : null}
                    {image.text ? (
                      <p className="type-caption type-muted theme-img-drag-carousel__project-card__desc mb-2">
                        {image.text}
                      </p>
                    ) : null}
                    {image.techStack && image.techStack.length > 0 ? (
                      <div
                        className="theme-img-drag-carousel__project-card__tech"
                        data-lenis-prevent-touch
                      >
                        {image.techStack.map((tag) => (
                          <span
                            key={tag}
                            className="theme-img-drag-carousel__project-card__tag type-caption type-faint"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ) : (
                <img
                  className="theme-img-drag-carousel__image"
                  src={image.src}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  aria-hidden
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )

  const expandOverlay =
    expandedImage !== null ? (
      <GalleryExpandOverlay
        key={expandedIndex}
        item={expandedImage}
        variant={expandVariant}
        onClose={closeExpanded}
      />
    ) : null

  const galleryShellClass = [
    'theme-dotnav-gallery',
    'theme-dotnav-gallery--horizontal',
    'theme-img-drag-gallery',
    vanishingOn ? 'theme-img-drag-gallery--vanishing' : '',
    projectCardLayout ? 'theme-img-drag-gallery--project-card' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={galleryShellRef}
      className={galleryShellClass}
      style={viewportStyle}
      data-lenis-prevent-touch
    >
      <div className="theme-gallery__stage-wrap">
        <div
          className="theme-dotnav-gallery__stage"
          onPointerEnter={() => {
            autoScrollHoverRef.current = true
          }}
          onPointerLeave={() => {
            autoScrollHoverRef.current = false
            pauseAutoScroll()
          }}
        >
          {viewport}
        </div>
        {expandOverlay}
      </div>
      {dotNavEnabled ? (
        <div className="theme-img-drag-gallery__controls">
          <IconButton
            type="button"
            variant="cardless"
            size="xxs"
            icon={ChevronLeft}
            aria-label="Previous slide"
            disabled={!canGoPrev}
            onClick={() => goToIndex(selectedIndex - 1)}
          />
          <DottedNavMenu
            label={dotNavLabel ?? label}
            orientation="horizontal"
            size="md"
            items={navItems}
            selectedId={selectedId}
            onSelect={handleDotSelect}
          />
          <IconButton
            type="button"
            variant="cardless"
            size="xxs"
            icon={ChevronRight}
            aria-label="Next slide"
            disabled={!canGoNext}
            onClick={() => goToIndex(selectedIndex + 1)}
          />
        </div>
      ) : null}
    </div>
  )
}
