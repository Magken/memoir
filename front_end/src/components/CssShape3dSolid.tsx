import type { CssShape3dKind } from '../lib/shape3d/cssShape3dTypes'
import { CssShape3dRubiks } from './CssShape3dRubiks'
import {
  CssShape3dZdogCone,
  CssShape3dZdogCylinder,
  CssShape3dZdogDodecahedron,
  CssShape3dZdogHourglass,
  CssShape3dZdogIcosahedron,
  CssShape3dZdogCube,
  CssShape3dZdogOctahedron,
  CssShape3dZdogSphere,
  CssShape3dZdogTetrahedron,
} from './cssShape3d/CssShape3dZdogSolids'

type CssShape3dSolidProps = {
  kind: CssShape3dKind
}

export function CssShape3dSolid({ kind }: CssShape3dSolidProps) {
  switch (kind) {
    case 'hourglass':
      return <CssShape3dZdogHourglass />
    case 'sphere':
      return <CssShape3dZdogSphere />
    case 'cylinder':
      return <CssShape3dZdogCylinder />
    case 'cone':
      return <CssShape3dZdogCone />
    case 'tetrahedron':
      return <CssShape3dZdogTetrahedron />
    case 'octahedron':
      return <CssShape3dZdogOctahedron />
    case 'cube':
      return <CssShape3dZdogCube />
    case 'dodecahedron':
      return <CssShape3dZdogDodecahedron />
    case 'icosahedron':
      return <CssShape3dZdogIcosahedron />
    case 'rubiks':
      return <CssShape3dRubiks />
    default:
      return <CssShape3dZdogCube />
  }
}
