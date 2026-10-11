import { useRef, type ReactNode, type RefObject } from 'react'
import type { RoundedScrollAxis, RoundedScrollConfig } from '../lib/scroll/roundedScroll'
import { useNestedScrollCapture } from '../hooks/useNestedScrollCapture'
import { useRoundedScrollBar } from '../hooks/useRoundedScrollBar'
import { useScrollEdgeClouds } from '../hooks/useScrollEdgeClouds'
import { ScrollCloudEdges } from './ScrollCloudEdges'

type RoundedScrollProps = {
  children: ReactNode
  axis?: RoundedScrollAxis
  className?: string
  /** Horizontal axis only — class on `.theme-rounded-scroll__content` */
  contentClassName?: string
  /** Path/thumb tuning — default card-scale ROUNDED_SCROLL_DEFAULTS */
  config?: Partial<RoundedScrollConfig>
  /** Soft edge fade when content overflows */
  scrollClouds?: boolean
  /** Focus target for keyboard scroll + focus wheel capture */
  tabIndex?: number
  /** Optional external ref to the scroll viewport (e.g. sticky scroll-spy). */
  viewportRef?: RefObject<HTMLDivElement | null>
}

/** Curved SVG scrollbar synced to a scroll viewport — hides native scrollbar. */
export function RoundedScroll({
  children,
  axis = 'vertical',
  className = '',
  contentClassName = '',
  config,
  scrollClouds = false,
  tabIndex = 0,
  viewportRef: viewportRefProp,
}: RoundedScrollProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const localViewportRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<SVGSVGElement>(null)
  const thumbRef = useRef<SVGPathElement>(null)
  const trackRef = useRef<SVGPathElement>(null)
  const isHorizontal = axis === 'horizontal'

  const setViewportRef = (node: HTMLDivElement | null) => {
    localViewportRef.current = node
    if (viewportRefProp) viewportRefProp.current = node
  }

  useRoundedScrollBar(scrollerRef, localViewportRef, barRef, thumbRef, trackRef, {
    axis,
    config,
  })
  useNestedScrollCapture(scrollerRef, localViewportRef, axis)
  useScrollEdgeClouds(scrollerRef, localViewportRef, axis, scrollClouds)

  return (
    <div
      ref={scrollerRef}
      className={[
        'theme-rounded-scroll',
        isHorizontal ? 'theme-rounded-scroll--horizontal' : '',
        scrollClouds ? 'theme-scroll--clouds' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-rounded-scroll="true"
      data-rounded-scroll-axis={axis}
      data-scroll-rail="curved"
      data-scroll-axis={axis}
      data-scroll-clouds={scrollClouds ? 'true' : 'false'}
    >
      <svg
        ref={barRef}
        className="theme-rounded-scroll__bar"
        viewBox={isHorizontal ? '0 0 320 44' : '0 0 44 320'}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path ref={thumbRef} className="theme-rounded-scroll__thumb" fill="none" strokeLinecap="round" />
        <path ref={trackRef} className="theme-rounded-scroll__track" fill="none" strokeLinecap="round" />
      </svg>
      <div
        ref={setViewportRef}
        className="theme-rounded-scroll__viewport"
        tabIndex={tabIndex}
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
      >
        {isHorizontal ? (
          <div
            className={['theme-rounded-scroll__content', contentClassName].filter(Boolean).join(' ')}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>
      {scrollClouds ? <ScrollCloudEdges /> : null}
    </div>
  )
}
