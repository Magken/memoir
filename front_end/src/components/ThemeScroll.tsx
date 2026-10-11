import { useRef, useState, type ReactNode, type RefObject } from 'react'
import type { RoundedScrollAxis, RoundedScrollConfig } from '../lib/scroll/roundedScroll'
import { DEFAULT_SCROLL_RAIL, type ScrollRailType } from '../lib/scroll/scrollRail'
import { useLenisElementScroll } from '../hooks/useLenisScroll'
import { useNestedScrollCapture } from '../hooks/useNestedScrollCapture'
import { useScrollEdgeClouds } from '../hooks/useScrollEdgeClouds'
import { RoundedScroll } from './RoundedScroll'
import { ScrollCloudEdges } from './ScrollCloudEdges'

type ThemeScrollProps = {
  children: ReactNode
  axis?: RoundedScrollAxis
  /** `curved` SVG rail (default) · `straight` native thin scrollbar · `mini` tiny straight bar · `nano` overlay mobile bar · `hidden` rail-less scroll */
  rail?: ScrollRailType
  /** Soft edge fade when content overflows — off by default on menus, cards pass `true` */
  scrollClouds?: boolean
  /**
   * Page-shell smooth glide (Lenis) — same feel as window Theme scroll.
   * Vertical only. Nested menus/editors leave this off.
   */
  smooth?: boolean
  /**
   * When false, do not claim wheel/touch (`data-lenis-prevent*` + nested capture).
   * Use for overflow:visible embeds that grow with content so a parent page
   * ThemeScroll owns the wheel. Default true.
   */
  ownScroll?: boolean
  className?: string
  /** Horizontal axis only — class on scroll content wrapper */
  contentClassName?: string
  /** Curved rail path/thumb tuning */
  config?: Partial<RoundedScrollConfig>
  tabIndex?: number
  /** Ref to the scroll viewport (`.theme-scroll__viewport`) */
  viewportRef?: RefObject<HTMLDivElement | null>
}

/** Scroll host — curved SVG rail, straight / mini / nano native bars, or hidden rail. */
export function ThemeScroll({
  children,
  axis = 'vertical',
  rail = DEFAULT_SCROLL_RAIL,
  scrollClouds = false,
  smooth = false,
  ownScroll = true,
  className = '',
  contentClassName = '',
  config,
  tabIndex = 0,
  viewportRef,
}: ThemeScrollProps) {
  if (rail === 'curved') {
    return (
      <RoundedScroll
        axis={axis}
        className={className}
        contentClassName={contentClassName}
        config={config}
        scrollClouds={scrollClouds}
        tabIndex={tabIndex}
        viewportRef={viewportRef}
      >
        {children}
      </RoundedScroll>
    )
  }

  return (
    <PlainThemeScroll
      axis={axis}
      rail={rail}
      scrollClouds={scrollClouds}
      smooth={smooth}
      ownScroll={ownScroll}
      className={className}
      contentClassName={contentClassName}
      tabIndex={tabIndex}
      viewportRef={viewportRef}
    >
      {children}
    </PlainThemeScroll>
  )
}

type PlainThemeScrollProps = {
  children: ReactNode
  axis: RoundedScrollAxis
  rail: Exclude<ScrollRailType, 'curved'>
  scrollClouds?: boolean
  smooth?: boolean
  ownScroll?: boolean
  className?: string
  contentClassName?: string
  tabIndex?: number
  viewportRef?: RefObject<HTMLDivElement | null>
}

function PlainThemeScroll({
  children,
  axis,
  rail,
  scrollClouds = false,
  smooth = false,
  ownScroll = true,
  className = '',
  contentClassName = '',
  tabIndex = 0,
  viewportRef,
}: PlainThemeScrollProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const localViewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null)
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null)
  const isHorizontal = axis === 'horizontal'
  const lenisEnabled = smooth && !isHorizontal
  const claimsScroll = ownScroll && !lenisEnabled

  // Instant capped wheel only when Lenis is not owning the viewport.
  useNestedScrollCapture(scrollerRef, localViewportRef, axis, claimsScroll)
  useScrollEdgeClouds(scrollerRef, localViewportRef, axis, scrollClouds)
  useLenisElementScroll(viewportEl, contentEl, lenisEnabled)

  const setViewportRef = (node: HTMLDivElement | null) => {
    localViewportRef.current = node
    setViewportEl(node)
    if (viewportRef) {
      viewportRef.current = node
    }
  }

  const setContentNode = (node: HTMLDivElement | null) => {
    contentRef.current = node
    setContentEl(node)
  }

  return (
    <div
      ref={scrollerRef}
      className={[
        'theme-scroll',
        isHorizontal ? 'theme-scroll--horizontal' : '',
        `theme-scroll--rail-${rail}`,
        scrollClouds ? 'theme-scroll--clouds' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-scroll-rail={rail}
      data-scroll-axis={axis}
      data-scroll-clouds={scrollClouds ? 'true' : 'false'}
      data-scroll-smooth={lenisEnabled ? 'true' : undefined}
      /* Landing scene wheel skips nests — including smooth Lenis (prevent attrs stay off the viewport). */
      {...(ownScroll ? { 'data-scene-nest-scroll': true } : {})}
    >
      <div
        ref={setViewportRef}
        className="theme-scroll__viewport"
        tabIndex={tabIndex}
        // Nested ThemeScroll only — page `smooth` Lenis owns this wrapper; prevent attrs
        // on the Lenis root would block its own virtual wheel and fight freeze/scroll.
        // `ownScroll={false}` (overflow:visible embeds) must not claim the wheel either.
        {...(claimsScroll
          ? {
              'data-lenis-prevent': true,
              'data-lenis-prevent-wheel': true,
              'data-lenis-prevent-touch': true,
            }
          : {})}
      >
        {isHorizontal ? (
          <div className={['theme-scroll__content', contentClassName].filter(Boolean).join(' ')}>
            {children}
          </div>
        ) : (
          // Always keep this wrapper mounted — toggling Lenis must not remount page scenes
          // (that was refreshing the Home stack on menu open/close).
          <div
            ref={setContentNode}
            className={[
              'theme-scroll__content',
              lenisEnabled ? 'theme-scroll__content--smooth' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {children}
          </div>
        )}
      </div>
      {scrollClouds ? <ScrollCloudEdges /> : null}
    </div>
  )
}

export type { ScrollRailType } from '../lib/scroll/scrollRail'
