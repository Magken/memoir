import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { lenisScrollTo } from '../../hooks/useLenisScroll'
import { useLenisScrollContext } from '../../hooks/lenisScrollContext'
import gsap, { easeCarouselWheel, ScrollTrigger } from './index'
import { GsapPageContext, type GsapPageContextValue } from './gsapPageContext'
import {
  GSAP_PAGE_TIMING_BASE,
  mergeGsapPageTiming,
  type GsapPageTiming,
  type GsapPageTimingOverrides,
} from './gsapPageTiming'
import { useGsapPageOptional } from './useGsapPage'

export function createDefaultGsapPageTiming(): GsapPageTiming {
  return {
    ...GSAP_PAGE_TIMING_BASE,
    ease: {
      default: easeCarouselWheel as unknown as string,
      snap: 'power2.out',
      inOut: 'power4.inOut',
    },
  }
}

type GsapPageProviderProps = {
  children: ReactNode
  timing?: GsapPageTimingOverrides
}

function readReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function GsapPageProvider({ children, timing: timingOverrides }: GsapPageProviderProps) {
  const parent = useGsapPageOptional()
  const { lenis, lenisRef } = useLenisScrollContext()
  const [reducedMotion, setReducedMotion] = useState(readReducedMotion)

  const timing = useMemo(
    () =>
      mergeGsapPageTiming(
        parent?.timing ?? createDefaultGsapPageTiming(),
        timingOverrides,
      ),
    [parent?.timing, timingOverrides],
  )

  const refreshScroll = useCallback(() => {
    ScrollTrigger.refresh()
  }, [])

  const scrollTo = useCallback(
    (
      target: number | string | HTMLElement = 0,
      scrollOptions?: Parameters<typeof lenisScrollTo>[2],
    ) => {
      lenisScrollTo(lenisRef, target, scrollOptions, timing.duration.scrollTo)
    },
    [lenisRef, timing.duration.scrollTo],
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const previous = {
      duration: gsap.defaults().duration,
      ease: gsap.defaults().ease,
    }

    gsap.defaults({
      duration: reducedMotion ? 0.01 : timing.duration.base,
      ease: timing.ease.default,
    })

    ScrollTrigger.defaults({
      start: timing.scroll.start,
      end: timing.scroll.end,
    })

    return () => {
      gsap.defaults(previous)
    }
  }, [timing, reducedMotion])

  useEffect(() => {
    const el = document.documentElement
    el.style.setProperty('--gsap-page-length-vph', String(timing.layout.pageLengthVph))
    el.dataset.gsapPageLengthVph = String(timing.layout.pageLengthVph)
    ScrollTrigger.refresh()
    return () => {
      el.style.removeProperty('--gsap-page-length-vph')
      delete el.dataset.gsapPageLengthVph
    }
  }, [timing.layout.pageLengthVph])

  useEffect(() => {
    if (!lenis) return undefined
    const onScroll = () => ScrollTrigger.update()
    lenis.on('scroll', onScroll)
    ScrollTrigger.refresh()
    return () => {
      lenis.off('scroll', onScroll)
    }
  }, [lenis])

  const value = useMemo<GsapPageContextValue>(
    () => ({
      timing,
      reducedMotion,
      refreshScroll,
      scrollTo,
    }),
    [timing, reducedMotion, refreshScroll, scrollTo],
  )

  return <GsapPageContext.Provider value={value}>{children}</GsapPageContext.Provider>
}
