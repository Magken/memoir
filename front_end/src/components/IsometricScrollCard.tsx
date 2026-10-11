import { useRef } from 'react'
import { cardScrollConfig } from '../lib/cards/cardScroll'
import type { IsometricVariant } from '../lib/isometrics/isometricEffects'
import { IsometricScene } from './IsometricScene'
import { ThemeScroll } from './ThemeScroll'

const scrollTailCopy = [
  'Scroll this card to scrub the spread — the type stays pinned while the inner body moves.',
  'Display scale, weight, and rhythm from theme typography — not the reference Montserrat stack.',
  'Mouse follow and scroll follow are mutually exclusive; use the mode toggle above.',
] as const

type IsometricScrollCardProps = {
  lines: readonly string[]
  typeClass?: string
  variant?: IsometricVariant
  showCoordinateCards?: boolean
  showPlaneBorders?: boolean
  pivotTranslate?: number
  labelTranslate?: number
}

/** Inner-card scroll scrub — sticky scene + full-track ScrollTrigger on card viewport. */
export function IsometricScrollCard({
  lines,
  typeClass = 'type-display',
  variant = 'spread',
  showCoordinateCards = false,
  showPlaneBorders = false,
  pivotTranslate,
  labelTranslate,
}: IsometricScrollCardProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  return (
    <div className="theme-card theme-card--flat theme-isometric-scroll-card overflow-hidden p-0">
      <ThemeScroll
        className="theme-isometric-scroll-card__scroll"
        scrollClouds
        rail="straight"
        config={cardScrollConfig}
        viewportRef={viewportRef}
      >
        <div ref={trackRef} className="theme-isometric-scroll-card__track">
          <div className="theme-isometric-scroll-card__pin">
            <IsometricScene
              lines={lines}
              variant={variant}
              scrollFollow
              mouseFollow={false}
              typeClass={typeClass}
              scrollViewportRef={viewportRef}
              scrollTrackRef={trackRef}
              showCoordinateCards={showCoordinateCards}
              showPlaneBorders={showPlaneBorders}
              pivotTranslate={pivotTranslate}
              labelTranslate={labelTranslate}
            />
          </div>
          <div className="theme-isometric-scroll-card__tail">
            {scrollTailCopy.map((paragraph) => (
              <p key={paragraph} className="type-body-sm type-muted prose-measure">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </ThemeScroll>
    </div>
  )
}
