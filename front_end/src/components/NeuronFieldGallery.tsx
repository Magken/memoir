import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  NEURON_FIELD_DEFAULT_PUBLIC,
  NeuronFieldFilterEngine,
} from '../lib/imageEffects/neuronFieldFilter'
import { DEFAULT_LOADER_LABEL } from '../lib/loaders/loaderVariants'
import { DottedNavMenu } from './DottedNavMenu'
import { ContentLoadOverlay } from './Loader'
import { IconButton } from './IconButton'

export type NeuronFieldGalleryImage = {
  src: string
  alt: string
}

type NeuronFieldGalleryProps = {
  images: readonly NeuronFieldGalleryImage[]
  label?: string
  className?: string
  dotSize?: number
  neuronIntensity?: number
  /** Time-based twinkle, sparks, color drift, and continuous RAF. Default false. */
  motion?: boolean
  showDotNav?: boolean
  loop?: boolean
  debug?: boolean
}

function wrapIndex(index: number, length: number) {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}

export function NeuronFieldGallery({
  images,
  label = 'Neuron field filter',
  className = '',
  dotSize = NEURON_FIELD_DEFAULT_PUBLIC.dotSize,
  neuronIntensity = NEURON_FIELD_DEFAULT_PUBLIC.neuronIntensity,
  motion = false,
  showDotNav = true,
  loop = true,
  debug = false,
}: NeuronFieldGalleryProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<NeuronFieldFilterEngine | null>(null)
  const activeIndexRef = useRef(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadLabel, setLoadLabel] = useState(DEFAULT_LOADER_LABEL)

  const count = images.length
  activeIndexRef.current = activeIndex

  const navItems = useMemo(
    () =>
      images.map((item, index) => ({
        id: `neuron-slide-${index}`,
        label: item.alt || `Slide ${index + 1}`,
      })),
    [images],
  )

  const selectedId = navItems[activeIndex]?.id ?? navItems[0]?.id ?? ''

  const goTo = useCallback(
    (nextIndex: number) => {
      if (count === 0 || loading) return
      const clamped = loop ? wrapIndex(nextIndex, count) : Math.min(Math.max(nextIndex, 0), count - 1)
      if (clamped === activeIndexRef.current) return
      const url = images[clamped]?.src
      if (!url) return
      engineRef.current?.setSlide(url)
      setActiveIndex(clamped)
    },
    [count, images, loading, loop],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || count === 0) return undefined

    setLoading(true)
    setLoadLabel(DEFAULT_LOADER_LABEL)

    const engine = new NeuronFieldFilterEngine(canvas)
    engineRef.current = engine
    let cancelled = false

    engine.setThemeRoot(hostRef.current?.closest('.theme') ?? null)
    void engine
      .preloadImages(images.map((item) => item.src))
      .then(() => {
        if (cancelled) return
        const first = images[0]?.src
        if (first) engine.setSlide(first)
        engine.setPublicParams({ dotSize, neuronIntensity, morphProgress: 0, motion })
        try {
          engine.init()
          setLoading(false)
        } catch (error) {
          if (debug) console.error('[NeuronFieldGallery] init failed', error)
        }
      })
      .catch((error) => {
        if (debug) console.error('[NeuronFieldGallery] preload failed', error)
      })

    return () => {
      cancelled = true
      engine.destroy()
      engineRef.current = null
      setLoading(true)
    }
  }, [count, debug, images])

  useEffect(() => {
    if (loading) return
    engineRef.current?.setPublicParams({ dotSize, neuronIntensity, morphProgress: 0, motion })
  }, [dotSize, loading, motion, neuronIntensity])

  useEffect(() => {
    if (loading || count === 0) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTo(activeIndexRef.current - 1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(activeIndexRef.current + 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [count, goTo, loading])

  const dotNavEnabled = showDotNav && count > 1
  const atStart = !loop && activeIndex <= 0
  const atEnd = !loop && activeIndex >= count - 1

  if (debug) {
    console.debug('[NeuronFieldGallery]', { activeIndex, count, loading, dotSize })
  }

  return (
    <div
      className={['theme-neuron-field-gallery', 'theme-dotnav-gallery', 'theme-dotnav-gallery--horizontal', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      data-ready={!loading || undefined}
    >
      <div className="theme-gallery__stage-wrap">
        <div
          ref={hostRef}
          className="theme-neuron-field-gallery__stage theme-dotnav-gallery__stage"
          role="region"
          aria-label={label}
        >
          <canvas ref={canvasRef} className="theme-neuron-field-gallery__canvas" aria-hidden />
          <ContentLoadOverlay loading={loading} label={loadLabel} />
        </div>
      </div>

      {dotNavEnabled ? (
        <div className="theme-neuron-field-gallery__controls">
          <IconButton
            type="button"
            variant="cardless"
            size="xxs"
            icon={ChevronLeft}
            aria-label="Previous slide"
            disabled={loading || atStart}
            onClick={() => goTo(activeIndex - 1)}
          />
          <DottedNavMenu
            label={label}
            orientation="horizontal"
            size="md"
            items={navItems}
            selectedId={selectedId}
            onSelect={(id) => {
              const index = navItems.findIndex((item) => item.id === id)
              if (index >= 0) goTo(index)
            }}
          />
          <IconButton
            type="button"
            variant="cardless"
            size="xxs"
            icon={ChevronRight}
            aria-label="Next slide"
            disabled={loading || atEnd}
            onClick={() => goTo(activeIndex + 1)}
          />
        </div>
      ) : null}
    </div>
  )
}
