import { Box } from '@react-three/drei'
import type { ThemePalette } from '../../lib/theme/colorPalettes'
import { r3fShape3dPaletteFromTheme } from '../../lib/shape3d/r3fShape3dPalette'
import { R3fShape3dEdgeOverlay } from './R3fShape3dEdgeOverlay'
import { R3fShape3dFaceMaterial } from './R3fShape3dFaceMaterial'

type CubieCoord = { x: -1 | 0 | 1; y: -1 | 0 | 1; z: -1 | 0 | 1 }

const AXES = [-1, 0, 1] as const
const CUBIE_STEP = 0.36
const CUBIE_SIZE = 0.32

const CUBIES: CubieCoord[] = AXES.flatMap((x) =>
  AXES.flatMap((y) => AXES.map((z) => ({ x, y, z }))),
)

type CubieFace = 'front' | 'rear' | 'left' | 'right' | 'top' | 'bottom'

function cubieFaces({ x, y, z }: CubieCoord): CubieFace[] {
  const faces: CubieFace[] = []
  if (z === 1) faces.push('front')
  if (z === -1) faces.push('rear')
  if (x === 1) faces.push('right')
  if (x === -1) faces.push('left')
  if (y === 1) faces.push('top')
  if (y === -1) faces.push('bottom')
  return faces
}

function stickerColor(face: CubieFace, palette: ThemePalette): string {
  const colors = r3fShape3dPaletteFromTheme(palette)
  switch (face) {
    case 'front':
      return colors.primary
    case 'rear':
      return colors.secondary
    case 'right':
      return colors.tertiary
    case 'left':
      return colors.quaternary
    case 'top':
      return colors.highlight
    case 'bottom':
      return colors.surface
    default:
      return colors.primary
  }
}

function Cubie({
  coord,
  palette,
  edges,
  edgeColor,
}: {
  coord: CubieCoord
  palette: ThemePalette
  edges?: boolean
  edgeColor: string
}) {
  const faces = cubieFaces(coord)
  if (faces.length === 0) return null

  const position: [number, number, number] = [
    coord.x * CUBIE_STEP,
    coord.y * CUBIE_STEP,
    coord.z * CUBIE_STEP,
  ]

  const body = palette.borderStrong
  const materials = [
    faces.includes('right') ? stickerColor('right', palette) : body,
    faces.includes('left') ? stickerColor('left', palette) : body,
    faces.includes('top') ? stickerColor('top', palette) : body,
    faces.includes('bottom') ? stickerColor('bottom', palette) : body,
    faces.includes('front') ? stickerColor('front', palette) : body,
    faces.includes('rear') ? stickerColor('rear', palette) : body,
  ]

  return (
    <Box args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]} position={position}>
      {materials.map((color, index) => (
        <R3fShape3dFaceMaterial key={index} attach={`material-${index}`} color={color} />
      ))}
      <R3fShape3dEdgeOverlay enabled={edges} color={edgeColor} />
    </Box>
  )
}

type R3fShape3dRubiksProps = {
  palette: ThemePalette
  edges?: boolean
  edgeColor: string
}

export function R3fShape3dRubiks({ palette, edges = false, edgeColor }: R3fShape3dRubiksProps) {
  return (
    <group scale={1.05}>
      {CUBIES.map((coord) => (
        <Cubie
          key={`${coord.x}${coord.y}${coord.z}`}
          coord={coord}
          palette={palette}
          edges={edges}
          edgeColor={edgeColor}
        />
      ))}
    </group>
  )
}
