import { useRef } from 'react'
import type { IsometricSliceTextLayout } from '../lib/isometrics/isometricScroll'
import { useIsometricSliceText } from '../hooks/useIsometricSliceText'

export type IsometricSliceTextProps = {
  /** Phrase duplicated across vertical slice columns. */
  text: string
  /** Typography scale — e.g. `type-display`, `type-display-lg`. */
  typeClass?: string
  className?: string
  /** Pointer X scrubs slice timeline progress (ref default). */
  mouseFollow?: boolean
  /** Pointer down scoops slices + blurs source (ref default). */
  pressInteraction?: boolean
  /** Slice column count multiplier — ref uses ~55% of text width. */
  sliceDensity?: number
  /** Slice stagger travel multiplier. */
  sliceTravel?: number
  /** `ref` — rotate/skew axonometric wrapper · `flat` — no wrapper transform. */
  layout?: IsometricSliceTextLayout
}

/** GSAP sliced display type — ref `isometric3` · pointer-scrubbed column stagger. */
export function IsometricSliceText({
  text,
  typeClass = 'type-display',
  className = '',
  mouseFollow = true,
  pressInteraction = true,
  sliceDensity = 1,
  sliceTravel = 1,
  layout = 'ref',
}: IsometricSliceTextProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  useIsometricSliceText(stageRef, srcRef, topRef, wrapperRef, {
    text,
    mouseFollow,
    pressInteraction,
    sliceDensity,
    sliceTravel,
    layout,
  })

  const stageClass = [
    'theme-isometric-slice-text',
    layout === 'ref' ? 'theme-isometric-slice-text--ref-layout' : 'theme-isometric-slice-text--flat-layout',
    mouseFollow ? 'theme-isometric-slice-text--scrub' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const wrapperClass = [
    'theme-isometric-slice-text__wrapper',
    typeClass,
    layout === 'ref' ? 'theme-isometric-slice-text__wrapper--ref' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={stageRef} className={stageClass} aria-label={text}>
      <div ref={wrapperRef} className={wrapperClass}>
        <div className="theme-isometric-slice-text__inner">
          <div ref={srcRef} className="theme-isometric-slice-text__src">
            {text}
          </div>
          <div ref={topRef} className="theme-isometric-slice-text__top" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
