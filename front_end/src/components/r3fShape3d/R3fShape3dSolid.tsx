import {
  Cone,
  Cylinder,
  Dodecahedron,
  Icosahedron,
  Octahedron,
  Sphere,
  Tetrahedron,
} from '@react-three/drei'
import { useThemeColor } from '../../lib/theme'
import type { CssShape3dKind } from '../../lib/shape3d/cssShape3dTypes'
import { r3fShape3dEdgeColor, r3fShape3dPaletteFromTheme } from '../../lib/shape3d/r3fShape3dPalette'
import type { Shape3dPalette } from '../../lib/shape3d/shape3dPalette'
import { R3fShape3dCube } from './R3fShape3dCube'
import { R3fShape3dEdgeOverlay } from './R3fShape3dEdgeOverlay'
import { R3fShape3dFaceMaterial } from './R3fShape3dFaceMaterial'
import { R3fShape3dRubiks } from './R3fShape3dRubiks'

type R3fShape3dSolidProps = {
  kind: CssShape3dKind
  edges?: boolean
}

const HOURGLASS_RADIUS = 0.52

type SolidPartProps = {
  colors: Shape3dPalette
  edges?: boolean
  edgeColor: string
}

function Hemisphere({
  color,
  flip,
  edges,
  edgeColor,
}: {
  color: string
  flip?: boolean
  edges?: boolean
  edgeColor: string
}) {
  return (
    <mesh rotation={flip ? [Math.PI, 0, 0] : [0, 0, 0]}>
      <sphereGeometry args={[HOURGLASS_RADIUS, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <R3fShape3dFaceMaterial color={color} />
      <R3fShape3dEdgeOverlay enabled={edges} color={edgeColor} />
    </mesh>
  )
}

function HourglassSolid({ colors, edges, edgeColor }: SolidPartProps) {
  return (
    <>
      <Hemisphere color={colors.secondary} edges={edges} edgeColor={edgeColor} />
      <Hemisphere color={colors.primary} flip edges={edges} edgeColor={edgeColor} />
    </>
  )
}

function SphereSolid({ colors, edges, edgeColor }: SolidPartProps) {
  return (
    <Sphere args={[0.55, 48, 48]}>
      <R3fShape3dFaceMaterial color={colors.tertiary} />
      <R3fShape3dEdgeOverlay enabled={edges} color={edgeColor} />
    </Sphere>
  )
}

function CylinderSolid({ colors, edges, edgeColor }: SolidPartProps) {
  return (
    <Cylinder args={[0.5, 0.5, 1, 48]}>
      <R3fShape3dFaceMaterial color={colors.quaternary} />
      <R3fShape3dEdgeOverlay enabled={edges} color={edgeColor} />
    </Cylinder>
  )
}

function ConeSolid({ colors, edges, edgeColor }: SolidPartProps) {
  return (
    <Cone args={[0.55, 1, 48]} rotation={[Math.PI, 0, 0]}>
      <R3fShape3dFaceMaterial color={colors.secondary} />
      <R3fShape3dEdgeOverlay enabled={edges} color={edgeColor} />
    </Cone>
  )
}

function TetrahedronSolid({ colors, edges, edgeColor }: SolidPartProps) {
  return (
    <group scale={1.15}>
      <Tetrahedron args={[0.62, 1]}>
        <R3fShape3dFaceMaterial color={colors.primary} />
        <R3fShape3dEdgeOverlay enabled={edges} color={edgeColor} />
      </Tetrahedron>
    </group>
  )
}

function OctahedronSolid({ colors, edges, edgeColor }: SolidPartProps) {
  return (
    <group scale={1.05}>
      <Octahedron args={[0.62, 1]}>
        <R3fShape3dFaceMaterial color={colors.tertiary} />
        <R3fShape3dEdgeOverlay enabled={edges} color={edgeColor} />
      </Octahedron>
    </group>
  )
}

function DodecahedronSolid({ colors, edges, edgeColor }: SolidPartProps) {
  return (
    <group scale={0.82}>
      <Dodecahedron args={[0.72, 1]}>
        <R3fShape3dFaceMaterial color={colors.highlight} />
        <R3fShape3dEdgeOverlay enabled={edges} color={edgeColor} />
      </Dodecahedron>
    </group>
  )
}

function IcosahedronSolid({ colors, edges, edgeColor }: SolidPartProps) {
  return (
    <group scale={1.02}>
      <Icosahedron args={[0.62, 1]}>
        <R3fShape3dFaceMaterial color={colors.quaternary} />
        <R3fShape3dEdgeOverlay enabled={edges} color={edgeColor} />
      </Icosahedron>
    </group>
  )
}

export function R3fShape3dSolid({ kind, edges = false }: R3fShape3dSolidProps) {
  const { palette } = useThemeColor()
  const colors = r3fShape3dPaletteFromTheme(palette)
  const edgeColor = r3fShape3dEdgeColor(palette)
  const partProps: SolidPartProps = { colors, edges, edgeColor }

  switch (kind) {
    case 'hourglass':
      return <HourglassSolid {...partProps} />
    case 'sphere':
      return <SphereSolid {...partProps} />
    case 'cylinder':
      return <CylinderSolid {...partProps} />
    case 'cone':
      return <ConeSolid {...partProps} />
    case 'cube':
      return <R3fShape3dCube colors={colors} edges={edges} edgeColor={edgeColor} />
    case 'tetrahedron':
      return <TetrahedronSolid {...partProps} />
    case 'octahedron':
      return <OctahedronSolid {...partProps} />
    case 'dodecahedron':
      return <DodecahedronSolid {...partProps} />
    case 'icosahedron':
      return <IcosahedronSolid {...partProps} />
    case 'rubiks':
      return <R3fShape3dRubiks palette={palette} edges={edges} edgeColor={edgeColor} />
    default:
      return <R3fShape3dCube colors={colors} edges={edges} edgeColor={edgeColor} />
  }
}
