import {
  ISOMETRIC_SPACE,
  isometricPivotPoint,
  isometricSeamX,
  type IsometricPivotSurface,
} from '../lib/isometrics/isometricSpace'

export type { IsometricPivotSurface } from '../lib/isometrics/isometricSpace'
export { isometricMaskRightX, isometricMaskSplitX, isometricMaskBottomY, isometricMaskSplitY, isometricUsesCurvedMask } from '../lib/isometrics/isometricSpace'

/** Curved inner-corner seam — concave fillet at pivot (not a gap). */
export function isometricCurvedMaskPath(side: 'left' | 'right'): string {
  const { x: cx } = isometricPivotPoint()
  const { top, bottom, fillet } = ISOMETRIC_SPACE.corner
  const midY = (top + bottom) / 2
  const { width: w, height: h } = ISOMETRIC_SPACE.viewBox

  if (side === 'left') {
    return [
      `M 0 0`,
      `H ${cx}`,
      `C ${cx - fillet * 0.35} ${top + 40}, ${cx - fillet} ${midY - 80}, ${cx - fillet * 0.15} ${midY}`,
      `C ${cx - fillet} ${midY + 80}, ${cx - fillet * 0.35} ${bottom - 40}, ${cx} ${bottom}`,
      `V ${h}`,
      `H 0`,
      'Z',
    ].join(' ')
  }

  return [
    `M ${w} 0`,
    `H ${cx}`,
    `C ${cx + fillet * 0.35} ${top + 40}, ${cx + fillet} ${midY - 80}, ${cx + fillet * 0.15} ${midY}`,
    `C ${cx + fillet} ${midY + 80}, ${cx + fillet * 0.35} ${bottom - 40}, ${cx} ${bottom}`,
    `V ${h}`,
    `H ${w}`,
    'Z',
  ].join(' ')
}

type IsometricPivotSurfaceGraphicProps = {
  uid: string
  surface: IsometricPivotSurface
}

/** Subtle cylindrical highlight on the rounded seam (not blocking text). */
export function IsometricPivotSurfaceGraphic({
  uid,
  surface,
}: IsometricPivotSurfaceGraphicProps) {
  if (surface === 'sharp') return null

  const { x: cx } = isometricPivotPoint()
  const { top, bottom, fillet } = ISOMETRIC_SPACE.corner
  const gradId = `isometric-pivot-seam-${uid}`

  return (
    <g className="theme-isometric-pivot-surface theme-isometric-pivot-surface--curved-wall" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--theme-text)" stopOpacity="0.12" />
          <stop offset="50%" stopColor="var(--theme-border-strong)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--theme-text)" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <path
        className="theme-isometric-pivot__seam-highlight"
        fill={`url(#${gradId})`}
        d={[
          `M ${cx - fillet * 0.55} ${top + 24}`,
          `Q ${cx} ${top + 8} ${cx + fillet * 0.55} ${top + 24}`,
          `L ${cx + fillet * 0.45} ${bottom - 24}`,
          `Q ${cx} ${bottom - 8} ${cx - fillet * 0.45} ${bottom - 24}`,
          'Z',
        ].join(' ')}
        opacity={0.55}
      />
    </g>
  )
}

/** Seam x for debug overlays — same as mask split center. */
export function isometricPivotSeamX(): number {
  return isometricSeamX()
}
