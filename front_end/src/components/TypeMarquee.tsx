import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { TypeMarqueeCardSurface, TypeMarqueeDirection, TypeMarqueeVariant } from '../lib/animations/typeMarquee'
import {
  TYPE_MARQUEE_SPEED_DEFAULT,
  TYPE_MARQUEE_VARIANT_PRESETS,
  typeMarqueeCardClasses,
  typeMarqueeFillRepeatCount,
} from '../lib/animations/typeMarquee'
import { useTypeMarquee } from '../hooks/useTypeMarquee'

export type TypeMarqueeProps = {
  /** Phrase segments — order is preserved; duplicated once for a seamless loop. */
  items: readonly string[]
  /** Visual chrome — band, ghost, gradient, invert, etc. */
  variant?: TypeMarqueeVariant
  /** Override variant card surface — `false` disables theme-card chrome. */
  card?: TypeMarqueeCardSurface | false
  /** Typography scale / modifiers on each segment. Variant presets apply when omitted. */
  typeClass?: string
  /** Between segments — default em dash. */
  separator?: string
  /** Travel speed in px/s. */
  speed?: number
  direction?: TypeMarqueeDirection
  /** Scroll axis — vertical uses `y` loop (direction = up / down). */
  axis?: 'horizontal' | 'vertical'
  /** Edge mask — text vanishes into the band at left/right. */
  edgeFade?: boolean
  /** CSS length for fade inset — default `clamp(2rem, 7vw, 4.5rem)`. */
  edgeFadeSize?: string
  pauseOnHover?: boolean
  playInView?: boolean
  className?: string
  /** Accessible name when content is decorative motion. */
  label?: string
}

function expandedItems(items: readonly string[], repeatCount: number): string[] {
  if (repeatCount <= 1) return [...items]
  return Array.from({ length: repeatCount }, () => items).flat()
}

function MarqueeList({
  items,
  typeClass,
  separator,
  duplicate,
  listKey,
}: {
  items: readonly string[]
  typeClass: string
  separator: string
  duplicate?: boolean
  listKey: string
}) {
  return (
    <ul
      className="theme-type-marquee__list"
      aria-hidden={duplicate ? true : undefined}
      data-type-marquee-list={listKey}
    >
      {items.map((item, index) => (
        <li key={`${listKey}-${item}-${index}`} className="theme-type-marquee__item">
          <span className={typeClass}>{item}</span>
          <span className="theme-type-marquee__sep type-muted" aria-hidden>
            {separator}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Infinite typography marquee — GSAP linear loop on a duplicated track. */
export function TypeMarquee({
  items,
  variant = 'band',
  card: cardProp,
  typeClass,
  separator,
  speed: speedProp,
  direction = 'left',
  axis = 'horizontal',
  edgeFade = true,
  edgeFadeSize,
  pauseOnHover = true,
  playInView = true,
  className = '',
  label,
}: TypeMarqueeProps) {
  const preset = TYPE_MARQUEE_VARIANT_PRESETS[variant]
  const resolvedTypeClass = typeClass ?? preset.typeClass
  const resolvedSeparator = separator ?? preset.separator ?? '—'
  const speed = speedProp ?? preset.speed ?? TYPE_MARQUEE_SPEED_DEFAULT

  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLUListElement>(null)
  const [repeatCount, setRepeatCount] = useState(1)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const probe = measureRef.current
    if (!viewport || !probe) return undefined

    const measure = () => {
      const viewportWidth = viewport.clientWidth
      const viewportHeight = viewport.clientHeight
      const phraseWidth = probe.scrollWidth
      const phraseHeight = probe.scrollHeight
      if (axis === 'vertical') {
        if (viewportHeight <= 0 || phraseHeight <= 0) return
        setRepeatCount(typeMarqueeFillRepeatCount(viewportHeight, phraseHeight))
      } else {
        if (viewportWidth <= 0 || phraseWidth <= 0) return
        setRepeatCount(typeMarqueeFillRepeatCount(viewportWidth, phraseWidth))
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(probe)
    void document.fonts.ready.then(measure)

    return () => observer.disconnect()
  }, [items, resolvedSeparator, resolvedTypeClass, axis])

  useTypeMarquee(viewportRef, trackRef, {
    speed,
    direction,
    axis,
    pauseOnHover,
    playInView,
    fillRepeat: repeatCount,
  })

  if (items.length === 0) return null

  const filledItems = expandedItems(items, repeatCount)
  const phrase = items.join(` ${resolvedSeparator} `)
  const rootClass = [
    'theme-type-marquee',
    `theme-type-marquee--${variant}`,
    ...typeMarqueeCardClasses(variant, cardProp),
    edgeFade ? 'theme-type-marquee--fade' : 'theme-type-marquee--no-fade',
    axis === 'vertical' ? 'theme-type-marquee--vertical' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const rootStyle = edgeFadeSize
    ? ({ '--type-marquee-fade-size': edgeFadeSize } as CSSProperties)
    : undefined

  return (
    <div className={rootClass} style={rootStyle}>
      <ul ref={measureRef} className="theme-type-marquee__measure" aria-hidden>
        {items.map((item, index) => (
          <li key={`measure-${item}-${index}`} className="theme-type-marquee__item">
            <span className={resolvedTypeClass}>{item}</span>
            <span className="theme-type-marquee__sep type-muted" aria-hidden>
              {resolvedSeparator}
            </span>
          </li>
        ))}
      </ul>
      <div
        ref={viewportRef}
        className="theme-type-marquee__viewport"
        aria-label={label ?? phrase}
      >
        <div ref={trackRef} className="theme-type-marquee__track">
          <MarqueeList
            items={filledItems}
            typeClass={resolvedTypeClass}
            separator={resolvedSeparator}
            listKey="a"
          />
          <MarqueeList
            items={filledItems}
            typeClass={resolvedTypeClass}
            separator={resolvedSeparator}
            listKey="b"
            duplicate
          />
        </div>
      </div>
      <p className="theme-type-marquee__static type-body-sm type-muted">{phrase}</p>
    </div>
  )
}
