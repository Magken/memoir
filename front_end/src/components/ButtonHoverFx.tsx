import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import type { ButtonHoverPresetId } from '../lib/animations/buttonHoverPresets'
import { BUTTON_HOVER_PRESETS } from '../lib/animations/buttonHoverPresets'

const DEFAULT_MARQUEE_MENU_IMAGES = [
  'https://picsum.photos/seed/btn-fx-marquee-l/64/64',
  'https://picsum.photos/seed/btn-fx-marquee-r/64/64',
] as const

export type ButtonHoverFxMarqueeSideIconPlacement = 'both' | 'start' | 'end'

export type ButtonHoverFxMarqueeContent = {
  label: string
  marqueeLabel: string
  /** Optional cycle of hover phrases (e.g. audience synonyms). Falls back to `marqueeLabel`. */
  marqueeLabels?: readonly string[]
  marqueeImages?: readonly string[]
  sideImages?: readonly [string, string]
  /** Hugeicons glyph for resting side flag(s) (preferred over photos). */
  sideIcon?: IconSvgElement
  /** Optional right-side glyph when different from `sideIcon` (left keeps `sideIcon`). */
  sideIconEnd?: IconSvgElement
  /**
   * Where `sideIcon` / `sideIconEnd` render. Default `both`.
   * `start` = left only · `end` = right only · `both` = left and right.
   */
  sideIconPlacement?: ButtonHoverFxMarqueeSideIconPlacement
  /** Hugeicons glyph repeated in the hover marquee track. Defaults to `sideIcon`. */
  marqueeIcon?: IconSvgElement
}

type ButtonHoverFxProps = {
  variant: ButtonHoverPresetId
  children?: ReactNode
  className?: string
  label?: string
  /** Portable resting/hover copy and images for `marquee-menu`. */
  marqueeContent?: ButtonHoverFxMarqueeContent
  /**
   * Marquee-menu only: `lg` is the default oversized title CTA;
   * `md` / `sm` step down type + flag size (same scale language as VurifyMenuButton).
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Marquee-menu only: 2px + 4px pad card frame. Border shows on hover / selected
   * (`.is-active` / `aria-pressed`); selected also keeps the marquee strip open.
   */
  housing?: boolean
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

function MarqueeLayers({ text }: { text: string }) {
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee__inner">
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
      </div>
    </div>
  )
}

function MenuFlag({
  image,
  icon,
}: {
  image?: string
  icon?: IconSvgElement
}) {
  if (icon) {
    return (
      <HugeiconsIcon
        icon={icon}
        className="theme-btn-fx__menu-flag theme-btn-fx__menu-flag--icon"
        aria-hidden
      />
    )
  }
  if (!image) return null
  return (
    <img
      className="theme-btn-fx__menu-flag"
      src={image}
      alt=""
      width={40}
      height={40}
      aria-hidden
    />
  )
}

function MenuMarqueeLayers({
  text,
  marqueeText = text,
  marqueeTexts,
  marqueeImages,
  sideImages,
  sideIcon,
  sideIconEnd,
  sideIconPlacement = 'both',
  marqueeIcon,
  alternateItalic = false,
}: {
  text: string
  marqueeText?: string
  marqueeTexts?: readonly string[]
  marqueeImages?: readonly string[]
  sideImages?: readonly [string, string]
  sideIcon?: IconSvgElement
  sideIconEnd?: IconSvgElement
  sideIconPlacement?: ButtonHoverFxMarqueeSideIconPlacement
  marqueeIcon?: IconSvgElement
  alternateItalic?: boolean
}) {
  const trackIcon = marqueeIcon ?? sideIcon ?? sideIconEnd
  const startIcon = sideIconPlacement !== 'end' ? sideIcon : undefined
  const endIcon =
    sideIconPlacement !== 'start' ? (sideIconEnd ?? sideIcon) : undefined
  const showStartImage = Boolean(sideImages?.[0]) && !startIcon
  const showEndImage = Boolean(sideImages?.[1]) && !endIcon
  const units = marqueeImages?.length
    ? [...marqueeImages, ...marqueeImages]
    : ([0, 1, 2, 3] as const)
  const phraseFor = (index: number) =>
    marqueeTexts && marqueeTexts.length > 0
      ? marqueeTexts[index % marqueeTexts.length]
      : marqueeText

  return (
    <>
      <span
        className={[
          'theme-btn-fx__menu-label',
          sideIconPlacement === 'start' ? 'theme-btn-fx__menu-label--icon-start' : '',
          sideIconPlacement === 'end' ? 'theme-btn-fx__menu-label--icon-end' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {(startIcon || showStartImage) && (
          <MenuFlag image={sideImages?.[0]} icon={startIcon} />
        )}
        <span>{text}</span>
        {(endIcon || showEndImage) && (
          <MenuFlag image={sideImages?.[1]} icon={endIcon} />
        )}
      </span>
      <span className="theme-btn-fx__menu-marquee" aria-hidden>
        <span className="theme-btn-fx__menu-marquee-wrap">
          <span className="theme-btn-fx__menu-marquee-track">
            {units.map((unit, index) => (
              <span
                className={[
                  'theme-btn-fx__menu-marquee-unit',
                  alternateItalic && index % 2 === 0
                    ? 'theme-btn-fx__menu-marquee-unit--italic'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={`${unit}-${index}`}
              >
                {typeof unit === 'string' ? (
                  <img
                    className="theme-btn-fx__menu-marquee-image"
                    src={unit}
                    alt=""
                    width={28}
                    height={28}
                  />
                ) : trackIcon ? (
                  <HugeiconsIcon
                    icon={trackIcon}
                    className="theme-btn-fx__menu-marquee-image theme-btn-fx__menu-marquee-image--icon"
                    aria-hidden
                  />
                ) : null}
                <span>{phraseFor(index)}</span>
                <span className="theme-btn-fx__menu-marquee-dot" />
              </span>
            ))}
          </span>
        </span>
      </span>
    </>
  )
}

function SurturInner() {
  return (
    <>
      <svg className="textcircle" viewBox="0 0 500 500" aria-hidden>
        <defs>
          <path
            id="theme-btn-fx-textcircle"
            d="M250,400 a150,150 0 0,1 0,-300a150,150 0 0,1 0,300Z"
          />
        </defs>
        <text>
          <textPath href="#theme-btn-fx-textcircle" textLength="900">
            Projects &amp; client work 2020
          </textPath>
        </text>
      </svg>
      <svg className="eye" width="70" height="70" viewBox="0 0 70 70" aria-hidden>
        <path
          className="eye__outer"
          d="M10.5 35.308c5.227-7.98 14.248-13.252 24.5-13.252s19.273 5.271 24.5 13.252c-5.227 7.98-14.248 13.253-24.5 13.253s-19.273-5.272-24.5-13.253z"
        />
        <path className="eye__lashes-up" d="M35 8.802v8.836M49.537 11.383l-3.31 8.192M20.522 11.684l3.31 8.192" />
        <path
          className="eye__lashes-down"
          d="M35 61.818v-8.836 8.836zM49.537 59.237l-3.31-8.193 3.31 8.193zM20.522 58.936l3.31-8.193-3.31 8.193z"
        />
        <circle className="eye__iris" cx="35" cy="35.31" r="5.221" />
        <circle className="eye__inner" cx="35" cy="35.31" r="10.041" />
      </svg>
    </>
  )
}

function FenrirInner({ label }: { label: string }) {
  return (
    <>
      <svg className="progress" width="70" height="70" viewBox="0 0 70 70" aria-hidden>
        <path
          className="progress__circle"
          d="m35,2.5c17.955803,0 32.5,14.544199 32.5,32.5c0,17.955803 -14.544197,32.5 -32.5,32.5c-17.955803,0 -32.5,-14.544197 -32.5,-32.5c0,-17.955801 14.544197,-32.5 32.5,-32.5z"
        />
        <path
          className="progress__path"
          d="m35,2.5c17.955803,0 32.5,14.544199 32.5,32.5c0,17.955803 -14.544197,32.5 -32.5,32.5c-17.955803,0 -32.5,-14.544197 -32.5,-32.5c0,-17.955801 14.544197,-32.5 32.5,-32.5z"
          pathLength="1"
        />
      </svg>
      <span>{label}</span>
    </>
  )
}

export function ButtonHoverFx({
  variant,
  children,
  className,
  label,
  marqueeContent,
  size = 'lg',
  housing = false,
  type = 'button',
  ...rest
}: ButtonHoverFxProps) {
  const preset = BUTTON_HOVER_PRESETS.find((entry) => entry.id === variant)
  const text =
    marqueeContent?.label ??
    label ??
    (typeof children === 'string' ? children : preset?.sample ?? 'Action')
  const usesIcons = Boolean(
    marqueeContent?.sideIcon || marqueeContent?.sideIconEnd || marqueeContent?.marqueeIcon,
  )
  const marqueeMenuImages = usesIcons
    ? marqueeContent?.sideImages
    : (marqueeContent?.sideImages ?? DEFAULT_MARQUEE_MENU_IMAGES)
  const classes = [
    'theme-btn-fx',
    `theme-btn-fx--${variant}`,
    variant === 'marquee-menu' ? `theme-btn-fx--size-${size}` : '',
    housing && variant === 'marquee-menu' ? 'theme-btn-fx--housing' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const markup = preset?.markup ?? 'simple'

  let inner: ReactNode
  switch (markup) {
    case 'plain':
      inner = text
      break
    case 'doubleSpan':
      inner = (
        <span>
          <span>{text}</span>
        </span>
      )
      break
    case 'textFlags':
      inner = (
        <MenuMarqueeLayers
          text={text}
          marqueeText={marqueeContent?.marqueeLabel ?? 'See what stands out'}
          marqueeTexts={marqueeContent?.marqueeLabels}
          marqueeImages={
            usesIcons ? marqueeContent?.marqueeImages : (marqueeContent?.marqueeImages ?? marqueeMenuImages)
          }
          sideImages={marqueeMenuImages}
          sideIcon={marqueeContent?.sideIcon}
          sideIconEnd={marqueeContent?.sideIconEnd}
          sideIconPlacement={marqueeContent?.sideIconPlacement}
          marqueeIcon={
            marqueeContent?.marqueeIcon ?? marqueeContent?.sideIcon ?? marqueeContent?.sideIconEnd
          }
          alternateItalic
        />
      )
      break
    case 'marquee':
      inner = (
        <>
          <span>{text}</span>
          <MarqueeLayers text={text} />
        </>
      )
      break
    case 'bestia':
      inner = (
        <>
          <div className="theme-btn-fx__bg" />
          <span>{text}</span>
        </>
      )
      break
    case 'surtur':
      inner = <SurturInner />
      break
    case 'fenrir':
      inner = <FenrirInner label={text} />
      break
    default:
      inner = <span>{text}</span>
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children && markup === 'simple' && typeof children !== 'string' ? children : inner}
    </button>
  )
}
