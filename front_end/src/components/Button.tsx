import type { LucideIcon } from 'lucide-react'
import { PARENT_HOVER_ATTR } from 'lucide-motion'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import {
  buttonExpandableSizeClass,
  buttonIconOnlySizeClass,
  buttonSizeClass,
  buttonStackSizeClass,
  buttonVariantClass,
  type ButtonSize,
  type ButtonVariant,
} from '../lib/ui/buttonStyles'
import {
  borderGlowClassFromResolved,
  ICON_SVG_GLOW_CLASS,
  resolveBorderGlow,
  type BorderGlowMode,
} from '../lib/animations/borderGlow'
import type { TypeAnimPreset, TypeAnimTrigger } from '../lib/animations/typeAnimPresets'
import { resolveMouseTilt, type MouseTiltProp } from '../lib/animations/tiltEffects'
import { FLUID_BORDER_DEFAULT_AUTO_SECONDS } from '../lib/animations/fluidBorder'
import type { FluidBorderPhysicsInput } from '../lib/animations/fluidBorderEngine'
import { buttonShadowClass, type SurfaceShadowVariant } from '../lib/theme/shadowVariants'
import { FluidBorderHost } from './FluidBorderHost'
import { TypeAnimText } from './TypeAnimText'
import { TiltScene } from './TiltScene'

export type { SurfaceShadowVariant } from '../lib/theme/shadowVariants'
export { SURFACE_SHADOW_VARIANT_OPTIONS } from '../lib/theme/shadowVariants'
export { MOUSE_TILT_EFFECTS } from '../lib/animations/tiltEffects'

export type { TypeAnimPreset, TypeAnimTrigger } from '../lib/animations/typeAnimPresets'
export { TYPE_GLOW_CLASS, type BorderGlowMode } from '../lib/animations/borderGlow'
export type { ButtonSize, ButtonVariant } from '../lib/ui/buttonStyles'

export type ButtonMediaType = 'image' | 'video'

/** Profile photo, logo, loop clip, or other thumb — use with `variant="media"` or any variant instead of `icon`. */
export type ButtonImage = {
  /** `image` (default) · `video` — looped muted clip in the media frame */
  type?: ButtonMediaType
  src: string
  alt: string
  /** Video poster — optional first frame before load */
  poster?: string
}

export type ButtonImageShape = 'round' | 'square'
export type ButtonImageEffect = 'hover' | 'click'
export type ButtonImagePosition = 'left' | 'right'

type ButtonProps = {
  children?: ReactNode
  icon?: LucideIcon
  /** Replaces `icon` when set — [AnimatedIcon](AnimatedIcon.tsx) via `lucide-motion`. */
  iconNode?: ReactNode
  iconPosition?: 'left' | 'right'
  image?: ButtonImage
  imagePosition?: ButtonImagePosition
  /** Thumb motion — `hover` on button hover, `click` on press. Default `hover`. */
  imageEffect?: ButtonImageEffect
  /** `round` avatars · `square` logos. Default `round`. */
  imageShape?: ButtonImageShape
  size?: ButtonSize
  variant?: ButtonVariant
  /** `tray-color` — swatch dash under icon (hex background). */
  indicatorColor?: string
  /** `action` · `inset` · `ghost` · `cardless` · `accent` · `stack` + string label — any [TypeAnimPreset](../lib/animations/typeAnimPresets.ts); default `flip`. Pass `false` for plain text. */
  labelAnim?: TypeAnimPreset | false
  /** Animated string when `children` holds extra nodes (e.g. chevron) — uses `labelAnim` */
  animatedLabel?: string
  /** Animated string label — default `hover` */
  labelAnimTrigger?: TypeAnimTrigger
  /** `true` → 3D tilt (follow) · `'away'` inverts (off when `disabled`) */
  mouseTilt?: MouseTiltProp
  /** Follow/away tilt angle multiplier (`1` default, `0.25`–`2`) — not text pop depth */
  mouseTiltStrength?: number
  /** Pinned expanded chip (selection) — also expands on hover / focus when `expandable` */
  expanded?: boolean
  /** Icon/media chip morphs to reveal label on hover, focus, or `expanded` */
  expandable?: boolean
  /** With `expandable`, use plain text for the expand label (no TypeAnimText). */
  plainExpandLabel?: boolean
  /** Palette-linked glow — `true` ring or ink; `'ink'` masked fill; `'icon'` SVG drop-shadow (cardless / icon-only) */
  borderGlow?: BorderGlowMode
  /** Springy blob border — ref.fluid-borders-1 · ref.fluid-borders-2 physics */
  fluidBorder?: boolean
  /** Idle orbit lap (seconds) when not hovered; `false` = pointer only (default 8 when `fluidBorder`) */
  fluidBorderAuto?: number | false
  /** Per-layer viscosity, mouse force, hover factor */
  fluidBorderPhysics?: FluidBorderPhysicsInput
  /** Override box-shadow — ref.shadows-1 presets */
  shadowVariant?: SurfaceShadowVariant
  disabled?: boolean
  active?: boolean
  className?: string
  debug?: boolean
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'type'
  | 'onClick'
  | 'onMouseDown'
  | 'onMouseUp'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onPointerDown'
  | 'onPointerUp'
  | 'onKeyDown'
  | 'onKeyUp'
  | 'onFocus'
  | 'onBlur'
  | 'id'
  | 'role'
  | 'tabIndex'
  | 'title'
  | 'aria-label'
  | 'aria-pressed'
  | 'aria-checked'
  | 'aria-expanded'
  | 'aria-controls'
  | 'aria-selected'
  | 'name'
  | 'value'
>

const mediaFrameSizeClass: Record<ButtonSize, string> = {
  xxs: 'size-4',
  xs: 'size-5',
  sm: 'size-6',
  md: 'size-7',
  lg: 'size-8',
  xl: 'size-9',
  xxl: 'size-10',
}

function ButtonMedia({
  image,
  shape,
  size,
}: {
  image: ButtonImage
  shape: ButtonImageShape
  size: ButtonSize
}) {
  const frameClass = [
    'theme-btn__media-frame',
    shape === 'square' ? 'theme-btn__media-frame--square' : 'theme-btn__media-frame--round',
    mediaFrameSizeClass[size],
  ].join(' ')

  return (
    <span className="theme-btn__media shrink-0">
      <span className={frameClass}>
        {image.type === 'video' ? (
          <video
            src={image.src}
            poster={image.poster}
            className="theme-btn__media-video"
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            aria-hidden
          />
        ) : (
          <img src={image.src} alt="" className="theme-btn__media-img" decoding="async" />
        )}
      </span>
    </span>
  )
}

export function Button({
  children,
  icon: Icon,
  iconNode,
  iconPosition = 'left',
  image,
  imagePosition = 'left',
  imageEffect = 'hover',
  imageShape = 'round',
  size = 'md',
  variant = 'default',
  indicatorColor,
  labelAnim = 'flip',
  labelAnimTrigger = 'hover',
  animatedLabel,
  mouseTilt,
  mouseTiltStrength,
  disabled = false,
  expanded = false,
  expandable = false,
  plainExpandLabel = false,
  active = false,
  borderGlow = false,
  fluidBorder = false,
  fluidBorderAuto = FLUID_BORDER_DEFAULT_AUTO_SECONDS,
  fluidBorderPhysics,
  shadowVariant,
  className = '',
  debug = false,
  type = 'button',
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onPointerUp,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  id,
  role,
  tabIndex,
  title,
  name,
  value,
  'aria-label': ariaLabel,
  'aria-pressed': ariaPressed,
  'aria-checked': ariaChecked,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
  'aria-selected': ariaSelected,
}: ButtonProps) {
  const tilt = resolveMouseTilt(mouseTilt)
  const showImage = Boolean(image)
  const showIconNode = Boolean(iconNode && !showImage)
  const showIcon = Boolean((Icon || showIconNode) && !showImage)
  const expandLabel = expandable
    ? (animatedLabel ?? (typeof children === 'string' ? children : undefined))
    : undefined
  const hasExpandLabel = Boolean(expandLabel)
  const mediaOnly = Boolean(showImage && !hasExpandLabel && !showIcon && !children)
  const iconOnly = Boolean((showIcon || showIconNode) && !hasExpandLabel && !children)
  const borderGlowResolved = resolveBorderGlow(borderGlow, {
    cardlessOrIconOnly: variant === 'cardless' || iconOnly,
  })
  const activeLabelAnim: TypeAnimPreset | null = labelAnim === false ? null : labelAnim
  const isStack = variant === 'stack'
  const animLabelVariants =
    variant === 'action' ||
    variant === 'inset' ||
    variant === 'ghost' ||
    variant === 'tray' ||
    variant === 'cardless' ||
    variant === 'accent' ||
    variant === 'stack'
  const animLabelSource =
    animatedLabel ?? (typeof children === 'string' ? children : undefined)
  const animLabel =
    activeLabelAnim && !expandable && animLabelVariants && animLabelSource
      ? animLabelSource
      : undefined
  const trailingChildren = animLabel && children && typeof children !== 'string' ? children : null
  const stackTrailingChildren = isStack && children && typeof children !== 'string' ? children : null
  const collapsedOnly = expandable && !expanded
  const label =
    ariaLabel ??
    (mediaOnly ? image?.alt : undefined) ??
    (iconOnly || (expandable && collapsedOnly && hasExpandLabel) ? expandLabel : undefined) ??
    animLabel

  if (debug) {
    console.debug('[Button]', {
      size,
      variant,
      iconOnly,
      mediaOnly,
      expandable,
      expanded,
      active,
      labelAnim,
      imageEffect,
      imageShape,
      imageType: image?.type ?? 'image',
      mouseTilt: tilt,
    })
  }

  const mediaLeft = showImage && (mediaOnly || imagePosition === 'left')
  const mediaRight = showImage && !mediaOnly && imagePosition === 'right'

  const wrapInkGlowIcon = (node: ReactNode) => {
    if (!borderGlowResolved.enabled) return node
    if (borderGlowResolved.icon) {
      return <span className="theme-btn__icon-svg-glow-host shrink-0">{node}</span>
    }
    if (borderGlowResolved.ink) {
      return <span className="theme-btn__icon-glow shrink-0">{node}</span>
    }
    return node
  }

  const wrapColorTrayIcon = (node: ReactNode) => {
    if (variant !== 'tray-color' || !indicatorColor) return node
    return (
      <span className="theme-btn__color-tray">
        <span className="theme-btn__color-tray-icon">{node}</span>
        <span
          className="theme-btn__color-indicator"
          style={{ backgroundColor: indicatorColor }}
          aria-hidden
        />
      </span>
    )
  }

  const wrapToolbarIcon = (node: ReactNode) => wrapColorTrayIcon(wrapInkGlowIcon(node))

  const lucideIcon = (position: 'left' | 'right') => {
    if (!showIcon || !Icon) return null
    if (position === 'left' && !(iconOnly || expandable || isStack || iconPosition === 'left')) {
      return null
    }
    if (position === 'right' && (iconOnly || isStack || iconPosition !== 'right')) {
      return null
    }
    return wrapToolbarIcon(
      <Icon
        aria-hidden
        className={[
          'theme-btn__icon shrink-0',
          borderGlowResolved.icon ? ICON_SVG_GLOW_CLASS : '',
        ]
          .filter(Boolean)
          .join(' ')}
        strokeWidth={2}
      />,
    )
  }

  const expandLabelSlot =
    expandable && expandLabel ? (
      <span className="theme-btn__expand-label-wrap" aria-hidden={expanded ? undefined : true}>
        <span className="theme-btn__expand-label-inner">
          {animLabelVariants && !plainExpandLabel && activeLabelAnim ? (
            <TypeAnimText
              anim={activeLabelAnim}
              trigger={labelAnimTrigger}
              inButton
              className="theme-btn__expand-label theme-btn__label shrink-0"
            >
              {expandLabel}
            </TypeAnimText>
          ) : (
            <span className="theme-btn__expand-label theme-btn__label truncate">{expandLabel}</span>
          )}
        </span>
      </span>
    ) : null

  const button = (
    <button
      type={type}
      id={id}
      role={role}
      tabIndex={tabIndex}
      title={title}
      name={name}
      value={value}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={label}
      aria-selected={ariaSelected}
      aria-pressed={
        role === 'radio' ? ariaPressed : ariaPressed ?? (active ? true : undefined)
      }
      aria-checked={ariaChecked}
      aria-expanded={ariaExpanded ?? (expandable ? expanded : undefined)}
      aria-controls={ariaControls}
      data-image-effect={showImage ? imageEffect : undefined}
      {...{ [PARENT_HOVER_ATTR]: '' }}
      data-size={size}
      className={[
        'theme-btn',
        isStack
          ? buttonStackSizeClass[size]
          : expandable
            ? buttonExpandableSizeClass[size]
            : mediaOnly || iconOnly
              ? buttonIconOnlySizeClass[size]
              : buttonSizeClass[size],
        buttonVariantClass[variant],
        showImage ? 'theme-btn--has-media' : '',
        mediaOnly ? 'theme-btn--media-only' : '',
        expandable ? 'theme-btn--expandable' : '',
        expanded ? 'is-expanded' : '',
        (variant === 'ghost' || variant === 'tray' || variant === 'tray-color') && active
          ? 'is-ghost-tinted'
          : '',
        active && variant !== 'ghost' && variant !== 'tray' && variant !== 'tray-color'
          ? 'is-active'
          : '',
        borderGlowClassFromResolved(borderGlowResolved),
        buttonShadowClass(shadowVariant),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {mediaLeft ? <ButtonMedia image={image!} shape={imageShape} size={size} /> : null}
      {showIconNode && (iconOnly || expandable || isStack || iconPosition === 'left')
        ? wrapToolbarIcon(iconNode)
        : null}
      {lucideIcon('left')}
      {animLabel && activeLabelAnim ? (
        <>
          <TypeAnimText
            anim={activeLabelAnim}
            trigger={labelAnimTrigger}
            inButton
            className={['theme-btn__label', isStack ? 'theme-btn__label--stack' : 'shrink-0']
              .filter(Boolean)
              .join(' ')}
          >
            {animLabel}
          </TypeAnimText>
          {isStack ? stackTrailingChildren : trailingChildren}
        </>
      ) : expandLabelSlot ? (
        expandLabelSlot
      ) : children ? (
        typeof children === 'string' ? (
          <span className={['theme-btn__label', isStack ? '' : 'truncate'].filter(Boolean).join(' ')}>
            {children}
          </span>
        ) : (
          <span className="theme-btn__label">{children}</span>
        )
      ) : null}
      {showIconNode && !iconOnly && !isStack && iconPosition === 'right'
        ? wrapToolbarIcon(iconNode)
        : null}
      {lucideIcon('right')}
      {mediaRight ? <ButtonMedia image={image!} shape={imageShape} size={size} /> : null}
    </button>
  )

  if (!tilt.enabled || disabled) {
    if (fluidBorder) {
      return (
        <FluidBorderHost autoPeriod={fluidBorderAuto} physics={fluidBorderPhysics}>
          {button}
        </FluidBorderHost>
      )
    }
    return button
  }

  const tilted = (
    <TiltScene effect={tilt.effect} strength={mouseTiltStrength} kind="btn">
      {button}
    </TiltScene>
  )

  if (fluidBorder) {
    return (
      <FluidBorderHost autoPeriod={fluidBorderAuto} physics={fluidBorderPhysics}>
        {tilted}
      </FluidBorderHost>
    )
  }

  return tilted
}
