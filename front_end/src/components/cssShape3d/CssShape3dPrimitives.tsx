import type { CSSProperties, ReactNode } from 'react'

type CssShape3dAnchorProps = {
  tx?: number
  ty?: number
  tz?: number
  rx?: number
  ry?: number
  rz?: number
  sx?: number
  sy?: number
  sz?: number
  className?: string
  children?: ReactNode
}

export function CssShape3dAnchor({
  tx = 0,
  ty = 0,
  tz = 0,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
  className = '',
  children,
}: CssShape3dAnchorProps) {
  const style = {
    ['--anchor-tx' as string]: String(tx),
    ['--anchor-ty' as string]: String(ty),
    ['--anchor-tz' as string]: String(tz),
    ['--anchor-rx' as string]: `${rx}deg`,
    ['--anchor-ry' as string]: `${ry}deg`,
    ['--anchor-rz' as string]: `${rz}deg`,
    ['--anchor-sx' as string]: String(sx),
    ['--anchor-sy' as string]: String(sy),
    ['--anchor-sz' as string]: String(sz),
  } satisfies CSSProperties

  return (
    <div
      className={`theme-css-shape3d__anchor ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  )
}

type CssShape3dFaceProps = {
  kind: 'tri' | 'pent' | 'disc' | 'quad'
  tone: 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
  /** Zdog polygon radius in scene units */
  radius?: number
  tx?: number
  ty?: number
  tz?: number
  rx?: number
  ry?: number
  rz?: number
  sy?: number
}

export function CssShape3dFace({
  kind,
  tone,
  radius = 0.5,
  tx = 0,
  ty = 0,
  tz = 0,
  rx = 0,
  ry = 0,
  rz = 0,
  sy = 1,
}: CssShape3dFaceProps) {
  const style = {
    ['--face-r' as string]: String(radius),
    ['--anchor-tx' as string]: String(tx),
    ['--anchor-ty' as string]: String(ty),
    ['--anchor-tz' as string]: String(tz),
    ['--anchor-rx' as string]: `${rx}deg`,
    ['--anchor-ry' as string]: `${ry}deg`,
    ['--anchor-rz' as string]: `${rz}deg`,
    ['--anchor-sy' as string]: String(sy),
  } satisfies CSSProperties

  return (
    <div
      className={`theme-css-shape3d__anchor theme-css-shape3d__face-primitive theme-css-shape3d__face-primitive--${kind} theme-css-shape3d__face-primitive--tone-${tone}`}
      style={style}
    />
  )
}

/** Zdog Hemisphere — flat disc + curved dome shell (not a faceted sphere). */
export function CssShape3dHemisphere({
  tone,
  backTone,
  pole,
}: {
  tone: CssShape3dFaceProps['tone']
  backTone: CssShape3dFaceProps['tone']
  pole: 'pos' | 'neg'
}) {
  return (
    <>
      <CssShape3dFace kind="disc" tone={tone} radius={1} />
      <CssShape3dAnchor ry={180}>
        <CssShape3dFace kind="disc" tone={backTone} radius={1} />
      </CssShape3dAnchor>
      <div
        className={`theme-css-shape3d__dome theme-css-shape3d__dome--pole-${pole} theme-css-shape3d__face-primitive--tone-${tone}`}
      />
    </>
  )
}

/** Full sphere from two dome halves — Zdog uses twin Hemispheres, not flat discs. */
export function CssShape3dDomeHalf({
  tone,
  pole,
}: {
  tone: CssShape3dFaceProps['tone']
  pole: 'pos' | 'neg'
}) {
  return (
    <div
      className={`theme-css-shape3d__dome theme-css-shape3d__dome--pole-${pole} theme-css-shape3d__face-primitive--tone-${tone}`}
    />
  )
}
