import { useId, useRef, type RefObject } from 'react'
import { useGSAP } from '../lib/gsap'
import { useGsapPage } from '../lib/gsap'
import {
  applyShapeMorphSlide,
  DEFAULT_SHAPE_MORPH_LOOP_DELAY_S,
  morphShapePair,
  SHAPE_MORPH_HEIGHT,
  SHAPE_MORPH_VIEWBOX,
  SHAPE_MORPH_WIDTH,
  type ShapeMorphGallerySlide,
} from '../lib/galleries/shapeMorphGallery'

export type { ShapeMorphGallerySlide }

type ShapeMorphGalleryProps = {
  slides: readonly ShapeMorphGallerySlide[]
  label?: string
  className?: string
  loopDelay?: number
  debug?: boolean
}

type ShapeMorphSvgProps = {
  slide: ShapeMorphGallerySlide
  className?: string
  maskPathRef?: RefObject<SVGPathElement | null>
  outlinePathRef?: RefObject<SVGPathElement | null>
  imageRef?: RefObject<SVGImageElement | null>
}

function ShapeMorphSvg({
  slide,
  className = '',
  maskPathRef,
  outlinePathRef,
  imageRef,
}: ShapeMorphSvgProps) {
  const maskId = useId()

  return (
    <svg
      className={['theme-shape-morph-gallery__svg', className].filter(Boolean).join(' ')}
      viewBox={SHAPE_MORPH_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      aria-hidden
    >
      <defs>
        <mask id={maskId}>
          <rect x="-20" y="-20" width={SHAPE_MORPH_WIDTH} height={SHAPE_MORPH_HEIGHT} fill="black" />
          <path ref={maskPathRef} fill="white" d={slide.path} />
        </mask>
      </defs>

      <rect
        x="-20"
        y="-20"
        width={SHAPE_MORPH_WIDTH}
        height={SHAPE_MORPH_HEIGHT}
        className="theme-shape-morph-gallery__bg"
      />

      <image
        ref={imageRef}
        x="-20"
        y="-20"
        width={SHAPE_MORPH_WIDTH}
        height={SHAPE_MORPH_HEIGHT}
        preserveAspectRatio="xMidYMid slice"
        href={slide.src}
        mask={`url(#${maskId})`}
      />

      <path
        ref={outlinePathRef}
        d={slide.path}
        className="theme-shape-morph-gallery__outline"
        fill="none"
        stroke={slide.stroke ?? 'currentColor'}
        strokeWidth={4}
      />
    </svg>
  )
}

export function ShapeMorphGallery({
  slides,
  label = 'Shape morph gallery',
  className = '',
  loopDelay = DEFAULT_SHAPE_MORPH_LOOP_DELAY_S,
  debug = false,
}: ShapeMorphGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const maskPathRef = useRef<SVGPathElement>(null)
  const outlinePathRef = useRef<SVGPathElement>(null)
  const imageRef = useRef<SVGImageElement>(null)
  const { reducedMotion } = useGsapPage()

  useGSAP(
    () => {
      const maskPath = maskPathRef.current
      const outlinePath = outlinePathRef.current
      const imageEl = imageRef.current
      if (!maskPath || !outlinePath || !imageEl || slides.length === 0) return undefined

      slides.forEach((slide) => {
        const img = new Image()
        img.src = slide.src
      })

      applyShapeMorphSlide(maskPath, outlinePath, imageEl, slides[0])

      if (reducedMotion || slides.length < 2) return undefined

      let index = 0
      let activeTween: ReturnType<typeof import('gsap').default.timeline> | null = null

      const runLoop = () => {
        const nextIndex = (index + 1) % slides.length
        const from = slides[index]
        const to = slides[nextIndex]
        activeTween = morphShapePair({
          maskPath,
          outlinePath,
          imageEl,
          from,
          to,
          delay: loopDelay,
          onComplete: () => {
            index = nextIndex
            runLoop()
          },
        })
      }

      runLoop()

      return () => {
        activeTween?.kill()
      }
    },
    { scope: rootRef, dependencies: [slides, reducedMotion, loopDelay] },
  )

  if (debug) {
    console.debug('[ShapeMorphGallery]', { count: slides.length, reducedMotion })
  }

  const current = slides[0]

  return (
    <div
      ref={rootRef}
      className={['theme-shape-morph-gallery', className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      <div className="theme-shape-morph-gallery__stage">
        {current ? (
          <ShapeMorphSvg
            slide={current}
            maskPathRef={maskPathRef}
            outlinePathRef={outlinePathRef}
            imageRef={imageRef}
          />
        ) : null}
      </div>
    </div>
  )
}

type ShapeMorphTransitionSvgProps = {
  slideA: ShapeMorphGallerySlide
  slideB: ShapeMorphGallerySlide
  className?: string
  onReady?: (refs: {
    maskPath: SVGPathElement
    outlinePath: SVGPathElement
    imageEl: SVGImageElement
    morphToB: () => ReturnType<typeof import('gsap').default.timeline>
    resetA: () => void
  }) => void
}

/** Two-slide SVG morph host — GSAP transition previews */
export function ShapeMorphTransitionSvg({
  slideA,
  slideB,
  className = '',
  onReady,
}: ShapeMorphTransitionSvgProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const maskPathRef = useRef<SVGPathElement>(null)
  const outlinePathRef = useRef<SVGPathElement>(null)
  const imageRef = useRef<SVGImageElement>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useGSAP(
    () => {
      const maskPath = maskPathRef.current
      const outlinePath = outlinePathRef.current
      const imageEl = imageRef.current
      if (!maskPath || !outlinePath || !imageEl) return undefined

      applyShapeMorphSlide(maskPath, outlinePath, imageEl, slideA)

      onReadyRef.current?.({
        maskPath,
        outlinePath,
        imageEl,
        morphToB: () =>
          morphShapePair({
            maskPath,
            outlinePath,
            imageEl,
            from: slideA,
            to: slideB,
          }),
        resetA: () => applyShapeMorphSlide(maskPath, outlinePath, imageEl, slideA),
      })
    },
    { scope: rootRef, dependencies: [slideA, slideB] },
  )

  return (
    <div ref={rootRef} className={['theme-shape-morph-gallery__stage', className].filter(Boolean).join(' ')}>
      <ShapeMorphSvg
        slide={slideA}
        maskPathRef={maskPathRef}
        outlinePathRef={outlinePathRef}
        imageRef={imageRef}
      />
    </div>
  )
}
