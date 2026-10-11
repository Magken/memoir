import { useEffect, useState } from 'react'
import { useLenisScrollContextOptional } from '../../hooks/lenisScrollContext'
import { scrollVphFromStart } from './gsapPageScroll'
import { useGsapPage } from './useGsapPage'

type GsapPageScrollDebugProps = {
  debug?: boolean
}

type ScrollReadout = {
  vph: number
  px: number
  viewportHeight: number
}

function readScrollPx(lenisScroll: number | undefined): number {
  if (typeof lenisScroll === 'number') return lenisScroll
  if (typeof window === 'undefined') return 0
  return window.scrollY
}

/** Fixed HUD — current scroll in vph from page top (Lenis when available). */
export function GsapPageScrollDebug({ debug = false }: GsapPageScrollDebugProps) {
  const { timing } = useGsapPage()
  const lenis = useLenisScrollContextOptional()?.lenis ?? null
  const [readout, setReadout] = useState<ScrollReadout>({ vph: 0, px: 0, viewportHeight: 0 })

  useEffect(() => {
    if (!debug) return undefined

    const update = () => {
      const viewportHeight = window.innerHeight
      const px = readScrollPx(lenis?.scroll)
      setReadout({
        vph: scrollVphFromStart(px, viewportHeight),
        px,
        viewportHeight,
      })
    }

    update()
    if (lenis) {
      lenis.on('scroll', update)
      return () => {
        lenis.off('scroll', update)
      }
    }

    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [debug, lenis])

  if (!debug) return null

  const pageLengthVph = timing.layout.pageLengthVph
  const pageProgress =
    pageLengthVph > 0 ? Math.min(100, (readout.vph / pageLengthVph) * 100) : 0

  return (
    <p
      className="gsap-page-scroll-debug type-caption type-tabular mb-0"
      aria-live="polite"
      aria-label="Scroll position debug"
    >
      scroll {readout.vph.toFixed(2)} vph since start · page {pageLengthVph} vph ·{' '}
      {pageProgress.toFixed(0)}% · {Math.round(readout.px)}px
    </p>
  )
}
