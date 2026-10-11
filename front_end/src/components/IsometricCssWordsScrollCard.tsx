import { useRef } from 'react'
import { cardScrollConfig } from '../lib/cards/cardScroll'
import type { IsometricCssWordsLayout } from '../lib/isometrics/isometricScroll'
import { IsometricCssWords } from './IsometricCssWords'
import { ThemeScroll } from './ThemeScroll'

const scrollTailCopy = [
  'Scroll this card to scrub the word cascade — rows stay pinned while the inner body moves.',
  'Theme display scale and weight — not the reference Source Sans 900 stack.',
  'Plane borders optional — same toggle as the SVG spread demo.',
] as const

type IsometricCssWordsScrollCardProps = {
  lines: readonly string[] | string
  layout?: IsometricCssWordsLayout
  typeClass?: string
  showPlaneBorders?: boolean
  labelTranslate?: number
}

/** Inner-card scroll scrub for CSS isometric words (`ref.isometric2`). */
export function IsometricCssWordsScrollCard({
  lines,
  layout = 'diagonal',
  typeClass = 'type-display',
  showPlaneBorders = false,
  labelTranslate = 1,
}: IsometricCssWordsScrollCardProps) {
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
            <IsometricCssWords
              lines={lines}
              layout={layout}
              typeClass={typeClass}
              scrollFollow
              showPlaneBorders={showPlaneBorders}
              labelTranslate={labelTranslate}
              scrollViewportRef={viewportRef}
              scrollTrackRef={trackRef}
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
