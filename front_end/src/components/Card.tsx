import type { ReactNode } from 'react'
import {
  cornerGeometryClass,
  DEFAULT_CARD_CORNER_GEOMETRY,
  type CardCornerGeometry,
} from '../lib/cards/cardCornerGeometry'
import { borderGlowClass } from '../lib/animations/borderGlow'
import { FLUID_BORDER_DEFAULT_AUTO_SECONDS } from '../lib/animations/fluidBorder'
import type { FluidBorderPhysicsInput } from '../lib/animations/fluidBorderEngine'
import { FluidBorderHost } from './FluidBorderHost'
import { TraceAnimText } from './TraceAnimText'
import type { TypeTracePreset, TypeTraceTrigger } from '../lib/animations/typeTracePresets'
import type { RoundedScrollConfig } from '../lib/scroll/roundedScroll'
import { cardScrollConfig } from '../lib/cards/cardScroll'
import {
  DEFAULT_SCROLL_RAIL,
  resolveScrollPanel,
  type CardScrollProp,
  type ScrollRailType,
} from '../lib/scroll/scrollRail'
import {
  cardShadowClass,
  DEFAULT_VURIFY_SHADOW_VARIANT,
  type SurfaceShadowVariant,
} from '../lib/theme/shadowVariants'
import { resolveMouseTilt, type MouseTiltProp } from '../lib/animations/tiltEffects'
import { BgParallaxScene } from './BgParallaxScene'
import { ThemeScroll } from './ThemeScroll'
import { TiltScene } from './TiltScene'
import { TunnelScene } from './TunnelScene'

export type { SurfaceShadowVariant } from '../lib/theme/shadowVariants'
export {
  DEFAULT_VURIFY_SHADOW_VARIANT,
  SURFACE_SHADOW_VARIANT_OPTIONS,
} from '../lib/theme/shadowVariants'
export type { TypeTracePreset, TypeTraceTrigger } from '../lib/animations/typeTracePresets'
export { TYPE_TRACE_PRESET_OPTIONS } from '../lib/animations/typeTracePresets'
export type { CardCornerGeometry } from '../lib/cards/cardCornerGeometry'
export { CARD_CORNER_GEOMETRIES, DEFAULT_CARD_CORNER_GEOMETRY } from '../lib/cards/cardCornerGeometry'
export type { MouseTiltEffect, MouseTiltProp } from '../lib/animations/tiltEffects'
export { MOUSE_TILT_EFFECTS } from '../lib/animations/tiltEffects'
export type { CardScrollProp, ScrollRailType, ResolvedScrollPanel } from '../lib/scroll/scrollRail'
export type { RoundedScrollConfig } from '../lib/scroll/roundedScroll'
export { cardScrollConfig } from '../lib/cards/cardScroll'

export type CardVariant =
  | 'raised'
  | 'inset'
  | 'flat'
  | 'outline'
  | 'ghost'
  | 'vurify'
  | 'vurify-outlined'
  | 'vurify-inset'

/** Popover chrome — matches `.theme-tooltip` border + shadow. */
export type CardBorder = 'tooltip'

/** `rect` default panel · `circle` · `hexagon` · `pill` — same variant hover/focus as rect. */
export type CardShape = 'rect' | 'circle' | 'hexagon' | 'pill'

export type CardImage = {
  src: string
  alt: string
}

type CardProps = {
  variant?: CardVariant
  shape?: CardShape
  /** Cover image — pairs with `mouseBgParallax` */
  image?: CardImage
  /** `true` → hover-activated 3D tilt (follow) · `'away'` inverts · rest = normal card shadow */
  mouseTilt?: MouseTiltProp
  /** Follow/away tilt angle multiplier (`1` default, `0.25`–`2`) — not text pop depth */
  mouseTiltStrength?: number
  /** Hover tunnel — layered squares recede inward (not compatible with `mouseTilt`) */
  mouseTunnel?: boolean
  /** Hover cover parallax — oversized bg shifts opposite pointer (requires `image`) */
  mouseBgParallax?: boolean
  /** Parallax shift multiplier (`1` default, `0.25`–`2`) */
  mouseBgParallaxStrength?: number
  /**
   * Scrollable body — `true` / `'horizontal'` curved (legacy) · rail type string ·
   * `{ axis, rail }` object. Prefer over `roundedScroll`.
   */
  scroll?: CardScrollProp
  /** @deprecated use `scroll` — `true` vertical · `'horizontal'` bottom rail */
  roundedScroll?: boolean | 'horizontal'
  /** Rail when scroll is on — `curved` (default) · `straight` · `hidden`. Vurify defaults to `hidden`. */
  scrollRail?: ScrollRailType
  /** Soft edge fade at scroll boundaries — default `true` when scroll is on */
  scrollClouds?: boolean
  /** Curved rail geometry when `scroll` / `roundedScroll` — passed to ThemeScroll */
  scrollConfig?: Partial<RoundedScrollConfig>
  /** Per-corner `border-radius` + `corner-shape` presets — `rect` shape only */
  cornerGeometry?: CardCornerGeometry
  /** Palette-linked animated gradient border on hover */
  borderGlow?: boolean
  /** Springy blob border — ref.fluid-borders-1 · ref.fluid-borders-2 physics */
  fluidBorder?: boolean
  /** Idle orbit lap (seconds) when not hovered; `false` = pointer only (default 8 when `fluidBorder`) */
  fluidBorderAuto?: number | false
  /** Per-layer viscosity, mouse force, hover factor */
  fluidBorderPhysics?: FluidBorderPhysicsInput
  /** Override box-shadow — ref.shadows-1 presets (`brutal` · `soft` · `inner` · …) */
  shadowVariant?: SurfaceShadowVariant
  /** Tooltip popover chrome — `2px` strong border + brutal offset shadow only. */
  border?: CardBorder
  title?: string
  /** SVG stroke trace on title — ref.text-trace-1 (`trace-in` · `trace-out`) */
  titleTrace?: TypeTracePreset | false
  /** `enter` (default) plays once; `hover` traces on card hover */
  titleTraceTrigger?: TypeTraceTrigger
  children: ReactNode
  className?: string
  debug?: boolean
}

const variantClass: Record<CardVariant, string> = {
  raised: 'theme-card--raised',
  inset: 'theme-card--inset',
  flat: 'theme-card--flat',
  outline: 'theme-card--outline',
  ghost: 'theme-card--ghost',
  vurify: 'theme-card--vurify',
  'vurify-outlined': 'theme-card--vurify-outlined',
  'vurify-inset': 'theme-card--vurify-inset',
}

const shapeClass: Record<CardShape, string> = {
  rect: 'theme-card--shape-rect',
  circle: 'theme-card--shape-circle',
  hexagon: 'theme-card--shape-hexagon',
  pill: 'theme-card--shape-pill',
}

export function Card({
  variant = 'vurify',
  shape = 'rect',
  image,
  mouseTilt,
  mouseTiltStrength,
  mouseTunnel = false,
  mouseBgParallax = false,
  mouseBgParallaxStrength,
  scroll,
  roundedScroll = false,
  scrollRail,
  scrollClouds = true,
  scrollConfig,
  cornerGeometry = DEFAULT_CARD_CORNER_GEOMETRY,
  borderGlow = false,
  fluidBorder = false,
  fluidBorderAuto = FLUID_BORDER_DEFAULT_AUTO_SECONDS,
  fluidBorderPhysics,
  shadowVariant,
  border,
  title,
  titleTrace = false,
  titleTraceTrigger = 'enter',
  children,
  className = '',
  debug = false,
}: CardProps) {
  const tilt = resolveMouseTilt(mouseTilt)
  const bgParallax = mouseBgParallax && Boolean(image)
  const isVurifyShell = variant === 'vurify' || variant === 'vurify-outlined'
  const resolvedShadowVariant =
    shadowVariant ??
    (variant === 'vurify'
      ? DEFAULT_VURIFY_SHADOW_VARIANT
      : variant === 'vurify-outlined'
        ? 'none'
        : undefined)
  const resolvedScrollRail =
    scrollRail ?? (isVurifyShell || variant === 'vurify-inset' ? 'hidden' : DEFAULT_SCROLL_RAIL)
  const scrollPanel = resolveScrollPanel(scroll, roundedScroll, resolvedScrollRail, scrollClouds)
  const resolvedScrollConfig =
    scrollConfig ??
    (scrollPanel?.rail === 'curved' && scrollPanel.axis === 'vertical' ? cardScrollConfig : undefined)

  if (debug) {
    console.debug('[Card]', {
      variant,
      shape,
      cornerGeometry,
      mouseTilt: tilt,
      bgParallax,
      scroll: scrollPanel,
      title,
    })
  }

  const content = (
    <div className="theme-card__content">
      {title ? (
        titleTrace ? (
          <TraceAnimText
            as="h3"
            trace={titleTrace}
            trigger={titleTraceTrigger}
            parentHover={titleTraceTrigger === 'hover'}
            className="type-title theme-card__title"
          >
            {title}
          </TraceAnimText>
        ) : (
          <h3 className="type-title theme-card__title">{title}</h3>
        )
      ) : null}
      <div className="type-body-sm theme-card__body">{children}</div>
    </div>
  )

  /** Vurify = two cards: transparent thick-border outer + thin-border inner (4px pad). */
  const body = isVurifyShell ? (
    <div className="theme-card__inner">{content}</div>
  ) : (
    content
  )

  const scrolledBody = scrollPanel ? (
    <ThemeScroll
      axis={scrollPanel.axis}
      rail={scrollPanel.rail}
      scrollClouds={scrollPanel.clouds}
      config={resolvedScrollConfig}
    >
      {body}
    </ThemeScroll>
  ) : (
    body
  )

  const card = (
    <article
      tabIndex={scrollPanel ? undefined : 0}
      data-scroll-rail={scrollPanel?.rail}
      className={[
        'theme-card',
        variantClass[variant],
        shapeClass[shape],
        image ? 'theme-card--has-bg' : '',
        scrollPanel ? 'theme-card--scroll' : '',
        scrollPanel?.clouds ? 'theme-card--scroll-clouds' : '',
        scrollPanel?.rail === 'curved' ? 'theme-card--rounded-scroll' : '',
        scrollPanel?.axis === 'horizontal' ? 'theme-card--scroll--horizontal' : '',
        scrollPanel?.axis === 'horizontal' && scrollPanel.rail === 'curved'
          ? 'theme-card--rounded-scroll--horizontal'
          : '',
        shape === 'rect' ? cornerGeometryClass(cornerGeometry) : '',
        borderGlowClass(borderGlow),
        cardShadowClass(resolvedShadowVariant),
        border === 'tooltip' ? 'theme-card--border-tooltip' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {image ? (
        <img
          className={[
            'theme-card__bg',
            bgParallax ? 'theme-bg-parallax__media' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          src={image.src}
          alt={image.alt}
          loading="lazy"
        />
      ) : null}
      {scrolledBody}
    </article>
  )

  const withFluidBorder = fluidBorder ? (
    <FluidBorderHost autoPeriod={fluidBorderAuto} physics={fluidBorderPhysics} block>
      {card}
    </FluidBorderHost>
  ) : (
    card
  )

  if (bgParallax) {
    return (
      <BgParallaxScene strength={mouseBgParallaxStrength} className="theme-bg-parallax-scene--card">
        {withFluidBorder}
      </BgParallaxScene>
    )
  }

  if (tilt.enabled) {
    return (
      <TiltScene effect={tilt.effect} strength={mouseTiltStrength} kind="card">
        {withFluidBorder}
      </TiltScene>
    )
  }

  if (mouseTunnel) {
    return <TunnelScene>{withFluidBorder}</TunnelScene>
  }

  return withFluidBorder
}
