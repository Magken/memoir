export const SCROLL_RAILS = ['curved', 'straight', 'mini', 'nano', 'hidden'] as const

export type ScrollRailType = (typeof SCROLL_RAILS)[number]

export const DEFAULT_SCROLL_RAIL: ScrollRailType = 'curved'

export type ScrollAxis = 'vertical' | 'horizontal'

export type ScrollPanelConfig = {
  axis?: ScrollAxis
  rail?: ScrollRailType
  /** Soft edge fade when content overflows — default follows host (cards on, menus off) */
  clouds?: boolean
}

export type ResolvedScrollPanel = {
  axis: ScrollAxis
  rail: ScrollRailType
  clouds: boolean
}

export type CardScrollProp =
  | false
  | boolean
  | ScrollAxis
  | ScrollRailType
  | ScrollPanelConfig

export function isScrollRailType(value: unknown): value is ScrollRailType {
  return typeof value === 'string' && (SCROLL_RAILS as readonly string[]).includes(value)
}

export function resolveScrollPanel(
  scroll: CardScrollProp | undefined,
  /** Legacy `roundedScroll` — merged when `scroll` is unset */
  legacyRoundedScroll?: boolean | 'horizontal',
  scrollRail: ScrollRailType = DEFAULT_SCROLL_RAIL,
  scrollClouds = true,
): ResolvedScrollPanel | null {
  if (scroll !== undefined && scroll !== false) {
    if (typeof scroll === 'object') {
      return {
        axis: scroll.axis ?? 'vertical',
        rail: scroll.rail ?? scrollRail,
        clouds: scroll.clouds ?? scrollClouds,
      }
    }
    if (scroll === true) return { axis: 'vertical', rail: scrollRail, clouds: scrollClouds }
    if (scroll === 'horizontal' || scroll === 'vertical') {
      return { axis: scroll, rail: scrollRail, clouds: scrollClouds }
    }
    if (isScrollRailType(scroll)) {
      return { axis: 'vertical', rail: scroll, clouds: scrollClouds }
    }
  }

  if (legacyRoundedScroll === 'horizontal') {
    return { axis: 'horizontal', rail: scrollRail, clouds: scrollClouds }
  }
  if (legacyRoundedScroll) {
    return { axis: 'vertical', rail: scrollRail, clouds: scrollClouds }
  }

  return null
}
