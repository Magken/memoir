import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { gsap } from '../lib/gsap'
import { DEFAULT_LOADER_LABEL, formatLoadingProgress } from '../lib/loaders/loaderVariants'
import { WebGpuGalleryCarousel, type WebGpuCarouselScrollState } from '../lib/galleries/webGpuTransitionGallery/carousel'
import {
  WEBGPU_GALLERY_MAIN_COUNT,
  WEBGPU_GALLERY_SATELLITES_PER_IMAGE,
  WEBGPU_INNER_TILT_LERP,
  WEBGPU_INNER_TILT_MAX_RAD,
  WEBGPU_INNER_TILT_RAD_PER_PX,
  WEBGPU_TEXTURE_PARALLAX_U,
  WEBGPU_TEXTURE_PARALLAX_V,
  WEBGPU_TEXTURE_VELOCITY_U,
  WEBGPU_TEXTURE_VELOCITY_V,
  WEBGPU_TILT_LERP,
  WEBGPU_TILT_MAX_RAD,
  WEBGPU_TILT_RAD_PER_PX,
  webGpuMainIdx,
  webGpuSatIdx,
} from '../lib/galleries/webGpuTransitionGallery/constants'
import { createWebGpuGalleryEngine, type WebGpuGalleryEngine } from '../lib/galleries/webGpuTransitionGallery/gpuEngine'
import { WebGpuIndexFloat } from '../lib/galleries/webGpuTransitionGallery/indexFloat'
import {
  playLoaderMorphIntro,
  WEBGPU_LOADER_MORPH_DUMMY_MS,
  WEBGPU_LOADER_MORPH_READY_CAP,
  type WebGpuLoaderMorphPhase,
} from '../lib/galleries/webGpuTransitionGallery/loaderMorph'
import {
  createWebGpuTransitionRegistry,
  webGpuTransitionKey,
} from '../lib/galleries/webGpuTransitionGallery/transitions'
import {
  webGpuAnimateSlotCaptionsIn,
  webGpuAnimateSlotCaptionsOut,
  webGpuAnimateTextIn,
  webGpuAnimateTextOut,
  webGpuHideSlotCaptions,
  WEBGPU_DUR_MORPH,
} from '../lib/galleries/webGpuTransitionGallery/tween'
import type { WebGpuGalleryImage, WebGpuGalleryPage } from '../lib/galleries/webGpuTransitionGallery/types'

export type WebGpuGalleryView = {
  key: string
  page: WebGpuGalleryPage
  imageIndex: number | null
}

export type WebGpuGalleryIntro = 'none' | 'loader-morph'

type UseWebGpuTransitionGalleryOptions = {
  hostRef: RefObject<HTMLElement | null>
  images: readonly WebGpuGalleryImage[]
  /** Opt-in full-stage image loader that morphs into the first gallery slot. */
  intro?: WebGpuGalleryIntro
  /** Dummy 0→90 progress duration while the engine boots (loader-morph only). */
  dummyDurationMs?: number
  debug?: boolean
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function innerTiltPlanes(engine: WebGpuGalleryEngine, image: number) {
  const planes = [engine.planes[webGpuMainIdx(image)]!]
  for (let j = 0; j < WEBGPU_GALLERY_SATELLITES_PER_IMAGE; j += 1) {
    planes.push(engine.planes[webGpuSatIdx(image, j)]!)
  }
  return planes
}

export function useWebGpuTransitionGallery({
  hostRef,
  images,
  intro = 'none',
  dummyDurationMs = WEBGPU_LOADER_MORPH_DUMMY_MS,
  debug = false,
}: UseWebGpuTransitionGalleryOptions) {
  const engineRef = useRef<WebGpuGalleryEngine | null>(null)
  const carouselRef = useRef<WebGpuGalleryCarousel | null>(null)
  const indexFloatRef = useRef<WebGpuIndexFloat | null>(null)
  const innerScrollRef = useRef<HTMLDivElement | null>(null)
  const loaderElRef = useRef<HTMLElement | null>(null)
  const viewKeyRef = useRef(0)
  const mutatingRef = useRef(false)
  const currentRef = useRef<WebGpuGalleryView>({ key: 'view-0', page: 'main', imageIndex: null })
  const leavingRef = useRef<WebGpuGalleryView | null>(null)
  const pageElRefs = useRef<Map<string, HTMLElement>>(new Map())
  const slotRefs = useRef<(HTMLElement | null)[]>(Array(WEBGPU_GALLERY_MAIN_COUNT).fill(null))
  const innerScrollVelocityRef = useRef(0)
  const lastInnerScrollTopRef = useRef(0)
  const transitionsRef = useRef(createWebGpuTransitionRegistry())
  const introPlayedRef = useRef(false)
  const loaderMorphStartedRef = useRef(false)
  const progressTweenRef = useRef<{ kill: () => void } | null>(null)
  const progressProxyRef = useRef({ value: 0 })
  const carouselScrollRef = useRef<WebGpuCarouselScrollState>({ scrollX: 0, targetScrollX: 0 })
  const loaderMorph = intro === 'loader-morph'

  const prepareMainCarousel = useCallback((pageEl: HTMLElement, host: HTMLElement) => {
    carouselRef.current?.stop()
    const carousel = new WebGpuGalleryCarousel(pageEl, host)
    carousel.restoreScroll(carouselScrollRef.current)
    carousel.prepare()
    carouselRef.current = carousel
    return carousel
  }, [])

  const [engineReady, setEngineReady] = useState(false)
  const [unsupported, setUnsupported] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadLabel, setLoadLabel] = useState(DEFAULT_LOADER_LABEL)
  const [slotAspects, setSlotAspects] = useState<readonly number[]>([])
  const [mutating, setMutating] = useState(false)
  const [views, setViews] = useState<WebGpuGalleryView[]>([
    { key: 'view-0', page: 'main', imageIndex: null },
  ])
  const [activeNav, setActiveNav] = useState<'main' | 'index'>('main')
  const [loaderPhase, setLoaderPhase] = useState<WebGpuLoaderMorphPhase>(
    loaderMorph ? 'loading' : 'interactive',
  )
  const [loaderProgress, setLoaderProgress] = useState(0)

  const registerLoaderEl = useCallback((node: HTMLElement | null) => {
    loaderElRef.current = node
  }, [])

  const setProgressValue = useCallback((value: number) => {
    const next = Math.max(0, Math.min(100, Math.round(value)))
    progressProxyRef.current.value = next
    setLoaderProgress(next)
  }, [])

  const registerPageEl = useCallback((key: string, node: HTMLElement | null) => {
    if (node) pageElRefs.current.set(key, node)
    else pageElRefs.current.delete(key)
  }, [])

  const syncPlaneToEl = useCallback((engine: WebGpuGalleryEngine, planeIndex: number, el: HTMLElement | null) => {
    const plane = engine.planes[planeIndex]
    if (!plane) return
    plane.trackedEl = el
    if (el) {
      const rect = el.getBoundingClientRect()
      plane.bounds.x = rect.left
      plane.bounds.y = rect.top
      plane.bounds.w = rect.width
      plane.bounds.h = rect.height
    }
  }, [])

  const snapLayout = useCallback((view: WebGpuGalleryView) => {
    const engine = engineRef.current
    if (!engine) return
    if (view.page === 'main') engine.applyMainLayout()
    else if (view.page === 'index') engine.applyIndexLayout()
    else if (view.page === 'inner' && view.imageIndex !== null) {
      engine.applyInnerLayout(view.imageIndex)
    }
  }, [])

  const leavePage = useCallback((view: WebGpuGalleryView) => {
    const engine = engineRef.current
    if (!engine) return
    if (view.page === 'main' && carouselRef.current) {
      carouselScrollRef.current = carouselRef.current.exportScroll()
      carouselRef.current.stop()
      carouselRef.current = null
      for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
        const plane = engine.planes[webGpuMainIdx(i)]!
        plane.tilt = 0
        plane.parallaxU = 0
        plane.parallaxV = 0
      }
    }
    if (view.page === 'index' && indexFloatRef.current) {
      indexFloatRef.current.stop()
      indexFloatRef.current = null
    }
    if (view.page === 'inner' && view.imageIndex !== null) {
      for (const plane of innerTiltPlanes(engine, view.imageIndex)) plane.tiltX = 0
    }
    for (const plane of engine.planes) plane.trackedEl = null
  }, [])

  const enterPage = useCallback(
    (view: WebGpuGalleryView) => {
      const engine = engineRef.current
      const host = hostRef.current
      if (!engine || !host) return
      const pageEl = pageElRefs.current.get(view.key)
      if (!pageEl) return

      if (view.page === 'main') {
        prepareMainCarousel(pageEl, host)
        carouselRef.current?.start()
        for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
          const slot = pageEl.querySelector<HTMLElement>(
            `.theme-webgpu-transition-gallery__slot[data-index="${i}"]`,
          )
          syncPlaneToEl(engine, webGpuMainIdx(i), slot)
        }
        return
      }

      if (view.page === 'inner' && view.imageIndex !== null) {
        const stack = pageEl.querySelector<HTMLElement>('.theme-webgpu-transition-gallery__stack')
        const slots = stack?.querySelectorAll<HTMLElement>('.theme-webgpu-transition-gallery__slot') ?? []
        syncPlaneToEl(engine, webGpuMainIdx(view.imageIndex), slots[0] ?? null)
        for (let j = 0; j < WEBGPU_GALLERY_SATELLITES_PER_IMAGE; j += 1) {
          syncPlaneToEl(engine, webGpuSatIdx(view.imageIndex, j), slots[j + 1] ?? null)
        }
        return
      }

      if (view.page === 'index') {
        indexFloatRef.current = new WebGpuIndexFloat(engine, host)
        indexFloatRef.current.prepare()
        indexFloatRef.current.start()
      }
    },
    [hostRef, prepareMainCarousel, syncPlaneToEl],
  )

  const navigate = useCallback(
    async (page: WebGpuGalleryPage, imageIndex: number | null = null) => {
      if (mutatingRef.current) return
      const fromView = currentRef.current
      if (fromView.page === page && fromView.imageIndex === imageIndex) return

      const host = hostRef.current
      const engine = engineRef.current
      if (!host || !engine) return

      mutatingRef.current = true
      setMutating(true)

      viewKeyRef.current += 1
      const toView: WebGpuGalleryView = {
        key: `view-${viewKeyRef.current}`,
        page,
        imageIndex,
      }

      leavingRef.current = fromView
      currentRef.current = toView
      setViews([fromView, toView])

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      const fromEl = pageElRefs.current.get(fromView.key) ?? null
      const toEl = pageElRefs.current.get(toView.key) ?? null

      setActiveNav(page === 'index' ? 'index' : page === 'main' ? 'main' : activeNav)

      const titleOut = webGpuAnimateTextOut(fromEl?.querySelector<HTMLElement>('.theme-webgpu-transition-gallery__page-title') ?? null)
      const factOut = webGpuAnimateTextOut(fromEl?.querySelector<HTMLElement>('.theme-webgpu-transition-gallery__inner-fact') ?? null)
      const slotCaptionsOut =
        fromView.page === 'main' ? webGpuAnimateSlotCaptionsOut(fromEl) : null

      if (fromView.page === 'main' && carouselRef.current) {
        carouselScrollRef.current = carouselRef.current.exportScroll()
      }

      leavePage(fromView)

      if (toView.page === 'main' && toEl) {
        webGpuHideSlotCaptions(toEl)
        prepareMainCarousel(toEl, host)
      }
      if (toView.page === 'index') {
        indexFloatRef.current = new WebGpuIndexFloat(engine, host)
        indexFloatRef.current.prepare()
      }

      const titleIn = webGpuAnimateTextIn(toEl?.querySelector<HTMLElement>('.theme-webgpu-transition-gallery__page-title') ?? null)
      const factIn = webGpuAnimateTextIn(toEl?.querySelector<HTMLElement>('.theme-webgpu-transition-gallery__inner-fact') ?? null)
      const slotCaptionsIn =
        toView.page === 'main'
          ? webGpuAnimateSlotCaptionsIn(toEl, { delay: WEBGPU_DUR_MORPH * 0.55 })
          : null

      const transitionKey = webGpuTransitionKey(fromView.page, toView.page)
      const transition = transitionsRef.current[transitionKey]
      const ctx = {
        gpu: engine,
        fromImage: fromView.imageIndex,
        toImage: toView.imageIndex,
        indexFloat: indexFloatRef.current,
      }

      const txOut = transition?.out(fromEl, toEl, ctx) ?? Promise.resolve()
      const txIn = transition?.in(fromEl, toEl, ctx) ?? Promise.resolve()
      await Promise.all([titleOut, titleIn, factOut, factIn, slotCaptionsOut, slotCaptionsIn, txOut, txIn])

      leavingRef.current = null
      currentRef.current = toView
      setViews([toView])
      snapLayout(toView)
      enterPage(toView)

      mutatingRef.current = false
      setMutating(false)

      if (debug) {
        console.debug('[WebGpuTransitionGallery] navigate', { fromView, toView })
      }
    },
    [activeNav, debug, enterPage, hostRef, leavePage, prepareMainCarousel, snapLayout],
  )

  useLayoutEffect(() => {
    if (!engineReady || introPlayedRef.current || loaderMorph) return undefined
    const engine = engineRef.current
    const view = currentRef.current
    const pageEl = pageElRefs.current.get(view.key)
    if (!engine || !pageEl) return undefined

    introPlayedRef.current = true
    enterPage(view)

    const title = pageEl.querySelector<HTMLElement>('.theme-webgpu-transition-gallery__page-title')
    webGpuAnimateTextIn(title)

    gsap.to(engine.planes.filter((plane) => plane.introVisible), {
      opacity: 1,
      duration: 1.1,
      stagger: 0.1,
      ease: 'power2.out',
    })

    return undefined
  }, [engineReady, views, enterPage, loaderMorph])

  useLayoutEffect(() => {
    if (!engineReady || currentRef.current.page !== 'main') return undefined
    if (loaderMorph && loaderPhase !== 'interactive') return undefined
    carouselRef.current?.measure()
    return undefined
  }, [engineReady, slotAspects, loaderMorph, loaderPhase])

  useEffect(() => {
    if (!loaderMorph || !engineReady || unsupported || loaderMorphStartedRef.current) return undefined
    const host = hostRef.current
    const engine = engineRef.current
    const view = currentRef.current
    const pageEl = pageElRefs.current.get(view.key)
    if (!host || !engine || !pageEl) return undefined

    loaderMorphStartedRef.current = true
    introPlayedRef.current = true
    let cancelled = false

    async function runMorph() {
      setLoaderPhase('handoff')
      progressTweenRef.current?.kill()
      await new Promise<void>((resolve) => {
        progressTweenRef.current = gsap.to(progressProxyRef.current, {
          value: 100,
          duration: prefersReducedMotion() ? 0.05 : 0.28,
          ease: 'power1.out',
          onUpdate: () => setProgressValue(progressProxyRef.current.value),
          onComplete: () => resolve(),
        })
      })
      if (cancelled) return

      setLoaderPhase('morphing')
      setLoading(false)
      prepareMainCarousel(pageEl!, host!)
      for (const plane of engine!.planes) {
        plane.introVisible = false
        plane.opacity = 0
        plane.trackedEl = null
      }

      const title = pageEl!.querySelector<HTMLElement>('.theme-webgpu-transition-gallery__page-title')
      webGpuAnimateTextIn(title)

      await playLoaderMorphIntro({
        engine: engine!,
        host: host!,
        pageEl: pageEl!,
        loaderEl: loaderElRef.current,
        reducedMotion: prefersReducedMotion(),
      })
      if (cancelled) return

      enterPage(view)
      setLoaderPhase('interactive')
      if (debug) console.debug('[WebGpuTransitionGallery] loader-morph complete')
    }

    void runMorph()
    return () => {
      cancelled = true
    }
  }, [
    debug,
    engineReady,
    enterPage,
    hostRef,
    loaderMorph,
    prepareMainCarousel,
    setProgressValue,
    unsupported,
  ])

  useEffect(() => {
    const host = hostRef.current
    if (!host || images.length < WEBGPU_GALLERY_MAIN_COUNT) return undefined

    let cancelled = false
    let frame = 0

    if (loaderMorph) {
      setLoaderPhase('loading')
      setProgressValue(0)
      progressTweenRef.current?.kill()
      progressTweenRef.current = gsap.to(progressProxyRef.current, {
        value: WEBGPU_LOADER_MORPH_READY_CAP,
        duration: Math.max(0.4, dummyDurationMs / 1000),
        ease: 'power1.out',
        onUpdate: () => setProgressValue(progressProxyRef.current.value),
      })
    }

    async function boot() {
      if (typeof navigator !== 'undefined' && !navigator.gpu) {
        setUnsupported(true)
        setLoading(false)
        if (loaderMorph) {
          progressTweenRef.current?.kill()
          setProgressValue(100)
          setLoaderPhase('interactive')
        }
        return
      }

      try {
        setLoading(true)
        setLoadLabel(DEFAULT_LOADER_LABEL)
        const engine = await createWebGpuGalleryEngine(host!, images, (loaded, total) => {
          setLoadLabel(formatLoadingProgress(loaded, total))
          if (loaderMorph && total > 0) {
            const mapped =
              (loaded / total) * WEBGPU_LOADER_MORPH_READY_CAP
            if (mapped > progressProxyRef.current.value) {
              progressTweenRef.current?.kill()
              setProgressValue(mapped)
            }
          }
        })
        if (cancelled) {
          engine.destroy()
          return
        }
        engineRef.current = engine
        setSlotAspects([...engine.aspects])
        engine.onResizeLayout = () => {
          if (currentRef.current.page === 'main' && carouselRef.current) {
            carouselRef.current.measure()
            return
          }
          if (currentRef.current.page === 'index' && indexFloatRef.current) {
            indexFloatRef.current.measure()
            return
          }
          snapLayout(currentRef.current)
        }

        snapLayout(currentRef.current)
        for (const plane of engine.planes) {
          plane.introVisible = plane.opacity > 0.001
          plane.opacity = 0
        }

        setEngineReady(true)
        if (!loaderMorph) setLoading(false)
      } catch (error) {
        console.error('[WebGpuTransitionGallery] init failed', error)
        setUnsupported(true)
        setLoading(false)
        if (loaderMorph) {
          progressTweenRef.current?.kill()
          setProgressValue(100)
          setLoaderPhase('interactive')
        }
      }
    }

    void boot()

    const tick = () => {
      const engine = engineRef.current
      if (engine) {
        if (carouselRef.current) {
          carouselRef.current.tick()
          const cellW = Math.max(carouselRef.current.getCellWidth(), 1)
          for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
            const plane = engine.planes[webGpuMainIdx(i)]!
            const relX = carouselRef.current.getSlotRelX(i)
            const slideNorm = relX / cellW
            const velocity = carouselRef.current.velocity
            plane.parallaxU =
              slideNorm * WEBGPU_TEXTURE_PARALLAX_U + velocity * WEBGPU_TEXTURE_VELOCITY_U
            plane.parallaxV =
              -slideNorm * WEBGPU_TEXTURE_PARALLAX_V - velocity * WEBGPU_TEXTURE_VELOCITY_V
          }
          let target = carouselRef.current.velocity * WEBGPU_TILT_RAD_PER_PX
          target = Math.max(-WEBGPU_TILT_MAX_RAD, Math.min(WEBGPU_TILT_MAX_RAD, target))
          for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
            const plane = engine.planes[webGpuMainIdx(i)]!
            plane.tilt += (target - plane.tilt) * WEBGPU_TILT_LERP
          }
        }
        if (indexFloatRef.current) indexFloatRef.current.tick()

        const current = currentRef.current
        if (current.page === 'inner' && current.imageIndex !== null && !mutatingRef.current) {
          const scrollEl = innerScrollRef.current
          if (scrollEl) {
            const velocity = scrollEl.scrollTop - lastInnerScrollTopRef.current
            lastInnerScrollTopRef.current = scrollEl.scrollTop
            innerScrollVelocityRef.current = velocity
            const scrollRect = scrollEl.getBoundingClientRect()
            for (const plane of innerTiltPlanes(engine, current.imageIndex)) {
              const slot = plane.trackedEl
              if (!slot) continue
              const slotRect = slot.getBoundingClientRect()
              const slotCenter = slotRect.top + slotRect.height / 2
              const hostCenter = scrollRect.top + scrollRect.height / 2
              const rel = (slotCenter - hostCenter) / Math.max(scrollRect.height, 1)
              plane.parallaxV = rel * WEBGPU_TEXTURE_PARALLAX_V * 2.5
              plane.parallaxU = rel * WEBGPU_TEXTURE_PARALLAX_U * 0.35
            }
          }
          let target = innerScrollVelocityRef.current * WEBGPU_INNER_TILT_RAD_PER_PX
          target = Math.max(-WEBGPU_INNER_TILT_MAX_RAD, Math.min(WEBGPU_INNER_TILT_MAX_RAD, target))
          for (const plane of innerTiltPlanes(engine, current.imageIndex)) {
            plane.tiltX += (target - plane.tiltX) * WEBGPU_INNER_TILT_LERP
          }
          innerScrollVelocityRef.current *= 0.85
        }

        engine.update()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      progressTweenRef.current?.kill()
      progressTweenRef.current = null
      carouselRef.current?.stop()
      indexFloatRef.current?.stop()
      engineRef.current?.destroy()
      engineRef.current = null
      loaderMorphStartedRef.current = false
      introPlayedRef.current = false
    }
  }, [debug, dummyDurationMs, hostRef, images, loaderMorph, setProgressValue, snapLayout])

  const interactive = !loaderMorph || loaderPhase === 'interactive'

  const goMain = useCallback(() => {
    if (!interactive) return
    void navigate('main', null)
  }, [interactive, navigate])
  const goIndex = useCallback(() => {
    if (!interactive) return
    void navigate('index', null)
  }, [interactive, navigate])
  const goInner = useCallback(
    (index: number) => {
      if (!interactive) return
      void navigate('inner', index)
    },
    [interactive, navigate],
  )

  return {
    engineReady,
    unsupported,
    loading: loaderMorph ? loaderPhase === 'loading' || loaderPhase === 'handoff' : loading,
    loadLabel,
    slotAspects,
    mutating: mutating || (loaderMorph && !interactive),
    views,
    activeNav,
    innerScrollRef,
    registerPageEl,
    registerLoaderEl,
    slotRefs,
    goMain,
    goIndex,
    goInner,
    intro: loaderMorph ? ('loader-morph' as const) : ('none' as const),
    loaderPhase,
    loaderProgress,
    interactive,
  }
}
