import type { LucideProps } from 'lucide-react'
import { forwardRef } from 'react'

/** Lucide-compatible SVG icons matching Excalidraw property panel glyphs. */

type IconProps = LucideProps

function baseProps(props: IconProps) {
  const { size = 16, color = 'currentColor', strokeWidth = 1.5, className, style, ...rest } = props
  return {
    xmlns: 'http://www.w3.org/2000/svg' as const,
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
    ...rest,
  }
}

export const StrokeWidthThinIcon = forwardRef<SVGSVGElement, IconProps>(function StrokeWidthThinIcon(
  props,
  ref,
) {
  return (
    <svg ref={ref} {...baseProps(props)}>
      <path d="M4.167 12h15.666" strokeWidth="1.25" />
    </svg>
  )
})

export const StrokeWidthBoldIcon = forwardRef<SVGSVGElement, IconProps>(function StrokeWidthBoldIcon(
  props,
  ref,
) {
  return (
    <svg ref={ref} {...baseProps(props)}>
      <path d="M5 12h14" strokeWidth="2.5" />
    </svg>
  )
})

export const StrokeWidthExtraBoldIcon = forwardRef<SVGSVGElement, IconProps>(
  function StrokeWidthExtraBoldIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path d="M5 12h14" strokeWidth="3.75" />
      </svg>
    )
  },
)

export const StrokeStyleSolidIcon = forwardRef<SVGSVGElement, IconProps>(function StrokeStyleSolidIcon(
  props,
  ref,
) {
  return (
    <svg ref={ref} {...baseProps(props)}>
      <path d="M4 12h16" strokeWidth="2" />
    </svg>
  )
})

export const StrokeStyleDashedIcon = forwardRef<SVGSVGElement, IconProps>(
  function StrokeStyleDashedIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path d="M5 12h2" strokeWidth="2" />
        <path d="M11 12h2" strokeWidth="2" />
        <path d="M17 12h2" strokeWidth="2" />
      </svg>
    )
  },
)

export const StrokeStyleDottedIcon = forwardRef<SVGSVGElement, IconProps>(
  function StrokeStyleDottedIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path d="M4 12v.01" strokeWidth="2" />
        <path d="M8 12v.01" strokeWidth="2" />
        <path d="M12 12v.01" strokeWidth="2" />
        <path d="M16 12v.01" strokeWidth="2" />
        <path d="M20 12v.01" strokeWidth="2" />
      </svg>
    )
  },
)

export const SloppinessArchitectIcon = forwardRef<SVGSVGElement, IconProps>(
  function SloppinessArchitectIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path
          d="M2.5 12.038c1.655-.885 5.9-3.292 8.568-4.354 2.668-1.063.101 2.821 1.32 3.104 1.218.283 5.112-1.814 5.112-1.814"
          strokeWidth="1.25"
        />
      </svg>
    )
  },
)

export const SloppinessArtistIcon = forwardRef<SVGSVGElement, IconProps>(
  function SloppinessArtistIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path
          d="M2.5 12.563c1.655-.886 5.9-3.293 8.568-4.355 2.668-1.062.101 2.822 1.32 3.105 1.218.283 5.112-1.814 5.112-1.814m-13.469 2.23c2.963-1.586 6.13-5.62 7.468-4.998 1.338.623-1.153 4.11-.132 5.595 1.02 1.487 6.133-1.43 6.133-1.43"
          strokeWidth="1.25"
        />
      </svg>
    )
  },
)

export const SloppinessCartoonistIcon = forwardRef<SVGSVGElement, IconProps>(
  function SloppinessCartoonistIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path
          d="M2.5 11.936c1.737-.879 8.627-5.346 10.42-5.268 1.795.078-.418 5.138.345 5.736.763.598 3.53-1.789 4.235-2.147M2.929 9.788c1.164-.519 5.47-3.28 6.987-3.114 1.519.165 1 3.827 2.121 4.109 1.122.281 3.839-2.016 4.606-2.42"
          strokeWidth="1.25"
        />
      </svg>
    )
  },
)

export const LayerSendToBackIcon = forwardRef<SVGSVGElement, IconProps>(
  function LayerSendToBackIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path d="M12 5v12" />
        <path d="m7 12 5 5 5-5" />
        <path d="M6 19h12" />
      </svg>
    )
  },
)

export const LayerSendBackwardIcon = forwardRef<SVGSVGElement, IconProps>(
  function LayerSendBackwardIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path d="M12 5v14" />
        <path d="m7 14 5 5 5-5" />
      </svg>
    )
  },
)

export const LayerBringForwardIcon = forwardRef<SVGSVGElement, IconProps>(
  function LayerBringForwardIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path d="M12 19V5" />
        <path d="m7 10 5-5 5 5" />
      </svg>
    )
  },
)

export const LayerBringToFrontIcon = forwardRef<SVGSVGElement, IconProps>(
  function LayerBringToFrontIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path d="M12 19V7" />
        <path d="m7 12 5-5 5 5" />
        <path d="M6 5h12" />
      </svg>
    )
  },
)

export const ArrowTypeStraightIcon = forwardRef<SVGSVGElement, IconProps>(
  function ArrowTypeStraightIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path d="M5 19 19 5" />
        <path d="M13 5h6v6" />
      </svg>
    )
  },
)

export const ArrowTypeCurvedIcon = forwardRef<SVGSVGElement, IconProps>(
  function ArrowTypeCurvedIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path d="M5 19c4-10 10-14 14-14" />
        <path d="M13 5h6v6" />
      </svg>
    )
  },
)

export const ArrowTypeElbowIcon = forwardRef<SVGSVGElement, IconProps>(
  function ArrowTypeElbowIcon(props, ref) {
    return (
      <svg ref={ref} {...baseProps(props)}>
        <path d="M5 19h8V5" />
        <path d="M9 9l4-4 4 4" />
      </svg>
    )
  },
)

export const ArrowheadNoneIcon = forwardRef<SVGSVGElement, IconProps>(function ArrowheadNoneIcon(
  props,
  ref,
) {
  return (
    <svg ref={ref} {...baseProps(props)}>
      <path d="M4 12h10" />
      <path d="m16 8 4 4-4 4" opacity={0.35} />
      <path d="m17 9 4 6M21 9l-4 6" opacity={0.35} />
    </svg>
  )
})

export const ArrowheadArrowIcon = forwardRef<SVGSVGElement, IconProps>(function ArrowheadArrowIcon(
  props,
  ref,
) {
  return (
    <svg ref={ref} {...baseProps(props)}>
      <path d="M4 12h14" />
      <path d="m14 7 6 5-6 5" />
    </svg>
  )
})

export const ArrowheadClosedIcon = forwardRef<SVGSVGElement, IconProps>(function ArrowheadClosedIcon(
  props,
  ref,
) {
  return (
    <svg ref={ref} {...baseProps(props)}>
      <path d="M4 12h10" />
      <path d="m12 7 8 5-8 5z" fill="currentColor" stroke="none" />
    </svg>
  )
})
