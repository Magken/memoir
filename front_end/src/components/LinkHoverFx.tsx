import type { AnchorHTMLAttributes, ReactNode } from 'react'
import type { LinkHoverPresetId, LinkHoverSvgKind } from '../lib/animations/linkHoverPresets'

type LinkHoverFxProps = {
  variant: LinkHoverPresetId
  children: ReactNode
  className?: string
  /** For leda slide-in duplicate text */
  dataText?: string
  href?: string
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'>

function LinkGraphic({ kind }: { kind: LinkHoverSvgKind }) {
  if (kind === 'wave') {
    return (
      <svg
        className="theme-link-fx__graphic theme-link-fx__graphic--slide"
        width="300%"
        height="100%"
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0,56.5c0,0,298.666,0,399.333,0C448.336,56.5,513.994,46,597,46c77.327,0,135,10.5,200.999,10.5c95.996,0,402.001,0,402.001,0" />
      </svg>
    )
  }
  if (kind === 'arc') {
    return (
      <svg
        className="theme-link-fx__graphic theme-link-fx__graphic--stroke theme-link-fx__graphic--arc"
        width="100%"
        height="18"
        viewBox="0 0 59 18"
        aria-hidden
      >
        <path d="M.945.149C12.3 16.142 43.573 22.572 58.785 10.842" pathLength="1" />
      </svg>
    )
  }
  return (
    <svg
      className="theme-link-fx__graphic theme-link-fx__graphic--stroke theme-link-fx__graphic--scribble"
      width="100%"
      height="9"
      viewBox="0 0 101 9"
      aria-hidden
    >
      <path d="M.426 1.973C4.144 1.567 17.77-.514 21.443 1.48 24.296 3.026 24.844 4.627 27.5 7c3.075 2.748 6.642-4.141 10.066-4.688 7.517-1.2 13.237 5.425 17.59 2.745C58.5 3 60.464-1.786 66 2c1.996 1.365 3.174 3.737 5.286 4.41 5.423 1.727 25.34-7.981 29.14-1.294" pathLength="1" />
    </svg>
  )
}

const SVG_BY_VARIANT: Partial<Record<LinkHoverPresetId, LinkHoverSvgKind>> = {
  iocaste: 'wave',
  herse: 'arc',
  carme: 'scribble',
}

const SPAN_VARIANTS = new Set<LinkHoverPresetId>([
  'leda',
  'ersa',
  'elara',
  'helike',
  'iocaste',
  'herse',
  'carme',
  'eirene',
])

export function LinkHoverFx({
  variant,
  children,
  className,
  dataText,
  href = '#',
  ...rest
}: LinkHoverFxProps) {
  const svg = SVG_BY_VARIANT[variant]
  const wrapSpan = SPAN_VARIANTS.has(variant)
  const classes = ['theme-link-fx', `theme-link-fx--${variant}`, className].filter(Boolean).join(' ')

  return (
    <a
      href={href}
      className={classes}
      data-text={variant === 'leda' ? (dataText ?? String(children)) : undefined}
      onClick={(event) => {
        if (href === '#') event.preventDefault()
        rest.onClick?.(event)
      }}
      {...rest}
    >
      {wrapSpan ? <span>{children}</span> : children}
      {svg ? <LinkGraphic kind={svg} /> : null}
    </a>
  )
}
