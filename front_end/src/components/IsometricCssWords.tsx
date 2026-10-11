import type { CSSProperties, ReactNode, RefObject } from 'react'
import { useMemo, useRef } from 'react'
import {
  isometricCssWordsStackMetrics,
} from '../lib/isometrics/isometricCssWordsStack'
import type { IsometricCssWordsLayout } from '../lib/isometrics/isometricScroll'
import { useIsometricCssWordsScrub } from '../hooks/useIsometricCssWordsScrub'

export type IsometricCssWordsProps = {
  /** One word (or short phrase) per row — array or newline-separated string. */
  lines: readonly string[] | string
  /** `diagonal` — ref step-left isometric · `vertical` — lightweight down-stack. */
  layout?: IsometricCssWordsLayout
  /** Typography scale class on the word stack (e.g. `type-display`). */
  typeClass?: string
  className?: string
  mouseFollow?: boolean
  scrollFollow?: boolean
  /** Cascade distance multiplier — `1` ref hover distance. */
  labelTranslate?: number
  showPlaneBorders?: boolean
  scrollViewportRef?: RefObject<HTMLElement | null>
  scrollTrackRef?: RefObject<HTMLElement | null>
  /** Shown when motion is reduced — defaults to last line. */
  reducedMotionFallback?: ReactNode
}

export { isometricCssWordPairs, normalizeIsometricCssWordsLines } from '../lib/isometrics/isometricCssWordsStack'

/** CSS isometric word stack — ref `isometric2` · hover, mouse, or scroll scrub. */
export function IsometricCssWords({
  lines,
  layout = 'diagonal',
  typeClass = 'type-display',
  className = '',
  mouseFollow = false,
  scrollFollow = false,
  labelTranslate = 1,
  showPlaneBorders = false,
  scrollViewportRef,
  scrollTrackRef,
  reducedMotionFallback,
}: IsometricCssWordsProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const stack = useMemo(
    () => isometricCssWordsStackMetrics(lines, layout),
    [lines, layout],
  )
  const { pairs, lines: phraseLines, style: stackStyle } = stack
  const scrubActive = mouseFollow || scrollFollow
  const isVertical = layout === 'vertical'

  useIsometricCssWordsScrub(sceneRef, {
    mouseFollow,
    scrollFollow,
    labelTranslate,
    axis: isVertical ? 'y' : 'x',
    scrollViewportRef,
    scrollTrackRef,
  })

  if (pairs.length === 0) return null

  const sceneClass = [
    'theme-isometric-css-words-scene',
    isVertical ? 'theme-isometric-css-words-scene--vertical' : '',
    showPlaneBorders ? 'theme-isometric-css-words-scene--borders' : '',
    scrubActive ? 'theme-isometric-css-words-scene--scrub' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const wordsClass = [
    'theme-isometric-css-words',
    isVertical ? 'theme-isometric-css-words--vertical' : '',
    typeClass,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={sceneRef} className={sceneClass} style={stackStyle}>
      <ul
        className={wordsClass}
        style={stackStyle}
        aria-label={
          scrubActive
            ? isVertical
              ? 'Vertical word stack — move pointer vertically or scroll to scrub'
              : 'Isometric word stack — move pointer or scroll to scrub'
            : 'Isometric word stack — hover to advance'
        }
      >
        {pairs.map(([prev, next], index) => (
          <li
            key={`${index}-${prev}-${next}`}
            className="theme-isometric-css-words__line"
            style={{ '--iso-words-line-index': index + 1 } as CSSProperties}
          >
            <p>{prev === '\u00A0' ? '\u00A0' : prev}</p>
            <p>{next === '\u00A0' ? '\u00A0' : next}</p>
          </li>
        ))}
      </ul>
      <div className="theme-isometric-css-words__static" aria-hidden>
        {reducedMotionFallback ?? (
          <p className={[typeClass, 'mb-0'].join(' ')}>{phraseLines[phraseLines.length - 1]}</p>
        )}
      </div>
    </div>
  )
}
