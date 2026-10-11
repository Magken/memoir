import { Box } from '@react-three/drei'
import { useThemeColor } from '../../lib/theme'
import { r3fShape3dEdgeColor, r3fShape3dPaletteFromTheme } from '../../lib/shape3d/r3fShape3dPalette'
import type { Shape3dPalette } from '../../lib/shape3d/shape3dPalette'
import { R3fShape3dEdgeOverlay } from './R3fShape3dEdgeOverlay'
import { R3fShape3dFaceMaterial } from './R3fShape3dFaceMaterial'

type R3fShape3dCubeProps = {
  colors?: Shape3dPalette
  edges?: boolean
  edgeColor?: string
  size?: number
}

export function R3fShape3dCube({
  colors: colorsProp,
  edges = false,
  edgeColor: edgeColorProp,
  size = 1,
}: R3fShape3dCubeProps) {
  const { palette } = useThemeColor()
  const colors = colorsProp ?? r3fShape3dPaletteFromTheme(palette)
  const edgeColor = edgeColorProp ?? r3fShape3dEdgeColor(palette)

  return (
    <Box args={[size, size, size]}>
      <R3fShape3dFaceMaterial attach="material-0" color={colors.tertiary} />
      <R3fShape3dFaceMaterial attach="material-1" color={colors.tertiary} />
      <R3fShape3dFaceMaterial attach="material-2" color={colors.highlight} />
      <R3fShape3dFaceMaterial attach="material-3" color={colors.primary} />
      <R3fShape3dFaceMaterial attach="material-4" color={colors.quaternary} />
      <R3fShape3dFaceMaterial attach="material-5" color={colors.secondary} />
      <R3fShape3dEdgeOverlay enabled={edges} color={edgeColor} />
    </Box>
  )
}
