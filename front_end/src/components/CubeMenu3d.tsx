import { useCallback, useState } from 'react'
import {
  type CubeMenu3dFaceId,
} from '../lib/menus/cubeMenu3d'
import { CssShape3dMenuCube } from './CssShape3dMenuCube'
import { CubeMenu3dFaceNav } from './CubeMenu3dFaceNav'

type CubeMenu3dProps = {
  activeFace?: CubeMenu3dFaceId
  defaultActiveFace?: CubeMenu3dFaceId
  onFaceChange?: (face: CubeMenu3dFaceId) => void
  label?: string
  className?: string
  faceBorder?: boolean
  /** Pseudo-3D — lift face buttons off the cube surface with layered shadows (no mouse follow) */
  buttonLift?: boolean
  debug?: boolean
}

export function CubeMenu3d({
  activeFace: activeFaceProp,
  defaultActiveFace = 'home',
  onFaceChange,
  label = '3D cube menu',
  className = '',
  faceBorder = false,
  buttonLift = false,
  debug = false,
}: CubeMenu3dProps) {
  const [internalFace, setInternalFace] = useState<CubeMenu3dFaceId>(defaultActiveFace)
  const activeFace = activeFaceProp ?? internalFace
  const rootClass = ['theme-cube-menu-3d', className].filter(Boolean).join(' ')

  const handleNavigate = useCallback(
    (face: CubeMenu3dFaceId) => {
      if (activeFaceProp === undefined) {
        setInternalFace(face)
      }
      onFaceChange?.(face)
    },
    [activeFaceProp, onFaceChange],
  )

  return (
    <nav
      className={rootClass}
      aria-label={label}
      data-button-lift={buttonLift ? 'true' : undefined}
      data-debug={debug ? 'true' : undefined}
      data-active-face={debug ? activeFace : undefined}
    >
      <CssShape3dMenuCube activeFace={activeFace} mode="menu" size="md" faceBorder={faceBorder}>
        {(faceId) => (
          <CubeMenu3dFaceNav
            faceId={faceId}
            label={`${label} — ${faceId}`}
            onNavigate={handleNavigate}
          />
        )}
      </CssShape3dMenuCube>
    </nav>
  )
}
