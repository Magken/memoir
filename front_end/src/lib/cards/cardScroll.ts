import { ROUNDED_SCROLL_DEFAULTS, type RoundedScrollConfig } from '../scroll/roundedScroll'

/**
 * Curved vertical scroll on [Card](../components/Card.tsx) — full-height rail path (`trackFill: 1`),
 * menu-parity stroke/inset. Applied by default when `scroll` / `roundedScroll` uses `curved` vertical rail.
 *
 * CSS pair: `.theme-card--rounded-scroll .theme-rounded-scroll` in rounded-scroll.css
 * (`--theme-card-scroll-rail-track`, `--theme-scroll-rail-edge-inline-end`, bar `> .theme-rounded-scroll__bar`).
 */
export const cardScrollConfig: Partial<RoundedScrollConfig> = {
  ...ROUNDED_SCROLL_DEFAULTS,
  stroke: 2,
  inset: 0,
  trail: 9,
  thumb: 28,
  finish: 3,
  trackFill: 1,
}
