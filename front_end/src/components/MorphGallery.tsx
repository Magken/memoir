import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_MORPH_GALLERY_DURATION_MS,
  MorphGalleryEngine,
  type MorphGallerySourceImage,
} from '../lib/galleries/morphGallery'
import { galleryDemoImageSrc } from '../lib/galleries/galleryDemoImages'
import { useGsapPage } from '../lib/gsap'
import { Button } from './Button'

export type MorphGalleryImage = MorphGallerySourceImage

type MorphGalleryProps = {
  images: readonly MorphGalleryImage[]
  label?: string
  className?: string
  loop?: boolean
  transitionDuration?: number
  debug?: boolean
}

function wrapIndex(index: number, length: number) {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}

export function MorphGallery({
  images,
  label = 'Morph gallery',
  className = '',
  loop = true,
  transitionDuration = DEFAULT_MORPH_GALLERY_DURATION_MS,
  debug = false,
}: MorphGalleryProps) {
  const { reducedMotion } = useGsapPage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<MorphGalleryEngine | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const activeIndexRef = useRef(activeIndex)
  activeIndexRef.current = activeIndex

  const count = images.length

  const goTo = useCallback(
    (nextIndex: number) => {
      if (count === 0) return
      const clamped = loop ? wrapIndex(nextIndex, count) : Math.min(Math.max(nextIndex, 0), count - 1)
      const prev = activeIndexRef.current
      if (prev === clamped) return
      const engine = engineRef.current
      if (engine) {
        if (reducedMotion) {
          engine.snapTo(clamped)
        } else {
          engine.transition(prev, clamped, transitionDuration)
        }
      }
      setActiveIndex(clamped)
    },
    [count, loop, reducedMotion, transitionDuration],
  )

  const goPrev = useCallback(() => goTo(activeIndexRef.current - 1), [goTo])
  const goNext = useCallback(() => goTo(activeIndexRef.current + 1), [goTo])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || count === 0) return undefined

    const engine = new MorphGalleryEngine(canvas)
    engineRef.current = engine
    let cancelled = false

    engine
      .init(images.map((item) => item.src))
      .then(() => {
        if (cancelled) return
        engine.snapTo(activeIndexRef.current)
        setReady(true)
      })
      .catch((error) => {
        if (debug) console.error('[MorphGallery] init failed', error)
      })

    return () => {
      cancelled = true
      engine.destroy()
      engineRef.current = null
      setReady(false)
    }
  }, [count, debug, images])

  useEffect(() => {
    if (!ready || count === 0) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [count, goNext, goPrev, ready])

  const atStart = !loop && activeIndex <= 0
  const atEnd = !loop && activeIndex >= count - 1

  if (debug) {
    console.debug('[MorphGallery]', { activeIndex, count, ready, loop })
  }

  return (
    <div
      className={['theme-morph-gallery', className].filter(Boolean).join(' ')}
      aria-label={label}
      data-ready={ready || undefined}
    >
      <div className="theme-morph-gallery__stage">
        <canvas ref={canvasRef} className="theme-morph-gallery__canvas" aria-hidden />

        <Button
          type="button"
          variant="cardless"
          size="md"
          borderGlow="icon"
          className="theme-morph-gallery__nav theme-morph-gallery__nav--prev"
          aria-label="Previous slide"
          disabled={!ready || atStart}
          icon={ChevronLeft}
          onClick={goPrev}
        />

        <Button
          type="button"
          variant="cardless"
          size="md"
          borderGlow="icon"
          className="theme-morph-gallery__nav theme-morph-gallery__nav--next"
          aria-label="Next slide"
          disabled={!ready || atEnd}
          icon={ChevronRight}
          onClick={goNext}
        />

        <ul className="theme-morph-gallery__thumbs" aria-label="Slide thumbnails">
          {images.map((item, index) => {
            const thumbSrc = item.thumb ?? galleryDemoImageSrc(item.src, 200)
            return (
              <li key={`${item.src}-${index}`} className="theme-morph-gallery__thumb-item">
                <button
                  type="button"
                  className="theme-morph-gallery__thumb-btn"
                  aria-current={index === activeIndex ? 'true' : undefined}
                  aria-label={item.alt}
                  onClick={() => goTo(index)}
                >
                  <img src={thumbSrc} alt="" loading="lazy" decoding="async" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

type MorphTransitionCanvasProps = {
  imageA: string
  imageB: string
  className?: string
  onEngineReady?: (engine: MorphGalleryEngine) => void
}

/** Two-image WebGL morph host — used by GSAP transition previews */
export function MorphTransitionCanvas({
  imageA,
  imageB,
  className = '',
  onEngineReady,
}: MorphTransitionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onReadyRef = useRef(onEngineReady)
  onReadyRef.current = onEngineReady

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const engine = new MorphGalleryEngine(canvas)
    let cancelled = false

    engine
      .init([imageA, imageB])
      .then(() => {
        if (cancelled) return
        engine.setPair(0, 1, 1)
        engine.setProgress(0)
        onReadyRef.current?.(engine)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      engine.destroy()
    }
  }, [imageA, imageB])

  return (
    <canvas
      ref={canvasRef}
      className={['theme-morph-gallery__canvas', className].filter(Boolean).join(' ')}
      aria-hidden
    />
  )
}
