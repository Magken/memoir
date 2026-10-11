import {
  CUBE_MENU3D_FACES,
  cubeMenu3dCellClass,
  cubeMenu3dFaceRowCount,
  type CubeMenu3dFaceId,
  type CubeMenu3dItem,
} from '../lib/menus/cubeMenu3d'
import { ICON_SVG_GLOW_CLASS } from '../lib/animations/borderGlow'
import { Button } from './Button'

type CubeMenu3dFaceNavProps = {
  faceId: CubeMenu3dFaceId
  label?: string
  onNavigate: (face: CubeMenu3dFaceId) => void
}

function CubeMenu3dBackButton({
  item,
  onNavigate,
}: {
  item: CubeMenu3dItem
  onNavigate: (face: CubeMenu3dFaceId) => void
}) {
  const Icon = item.icon
  if (!Icon) {
    return null
  }

  return (
    <span className="theme-cube-menu-3d__back-wrap">
      <Button
        type="button"
        variant="default"
        size="sm"
        icon={Icon}
        borderGlow="icon"
        className="theme-cube-menu-3d__back-btn"
        aria-label={item.label ?? 'Back'}
        onClick={() => {
          if (item.navigateTo) {
            onNavigate(item.navigateTo)
          }
        }}
      />
    </span>
  )
}

function CubeMenu3dStackButton({
  item,
  onNavigate,
}: {
  item: CubeMenu3dItem
  onNavigate: (face: CubeMenu3dFaceId) => void
}) {
  const Icon = item.icon
  if (!Icon || !item.label) {
    return null
  }

  const isLogo = item.cellMod === 'logo'

  return (
    <span className="theme-cube-menu-3d__stack-wrap">
      <Button
        type="button"
        variant="stack"
        size={isLogo ? 'md' : 'sm'}
        icon={Icon}
        labelAnim="flip"
        borderGlow="icon"
        className="theme-cube-menu-3d__stack-btn theme-hmenu__stack-sublink"
        aria-label={item.label}
        onClick={() => {
          if (item.navigateTo) {
            onNavigate(item.navigateTo)
          }
        }}
      >
        {item.label}
      </Button>
    </span>
  )
}

function CubeMenu3dCell({
  item,
  onNavigate,
}: {
  item: CubeMenu3dItem
  onNavigate: (face: CubeMenu3dFaceId) => void
}) {
  if (item.kind === 'spacer') {
    return <span className="theme-cube-menu-3d__spacer" aria-hidden />
  }

  if (item.kind === 'header') {
    const Icon = item.icon

    return (
      <div className="theme-card theme-card--flat theme-card--shape-rect theme-cube-menu-3d__face-title">
        <div className="theme-cube-menu-3d__face-title-inner">
          {Icon ? (
            <span className="theme-btn__icon-svg-glow-host shrink-0">
              <Icon
                className={['theme-btn__icon shrink-0', ICON_SVG_GLOW_CLASS].join(' ')}
                strokeWidth={2}
                aria-hidden
              />
            </span>
          ) : null}
          {item.label ? (
            <span className="theme-cube-menu-3d__face-title-label type-label type-glow">{item.label}</span>
          ) : null}
        </div>
      </div>
    )
  }

  if (item.kind === 'note') {
    return <p className="theme-cube-menu-3d__note type-caption mb-0">{item.label}</p>
  }

  if (item.kind === 'back') {
    return <CubeMenu3dBackButton item={item} onNavigate={onNavigate} />
  }

  if (item.kind === 'link') {
    return <CubeMenu3dStackButton item={item} onNavigate={onNavigate} />
  }

  return null
}

export function CubeMenu3dFaceNav({
  faceId,
  label = 'Cube face menu',
  onNavigate,
}: CubeMenu3dFaceNavProps) {
  const items = CUBE_MENU3D_FACES[faceId]
  const rows = cubeMenu3dFaceRowCount(faceId)

  return (
    <div
      className={[
        'theme-cube-menu-3d__menu',
        `theme-cube-menu-3d__menu--rows-${rows}`,
      ].join(' ')}
      aria-label={label}
      data-cube-face={faceId}
    >
      <ul className="theme-cube-menu-3d__grid">
        {items.map((item) => (
          <li key={item.id} className={cubeMenu3dCellClass(item)}>
            <CubeMenu3dCell item={item} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  )
}
