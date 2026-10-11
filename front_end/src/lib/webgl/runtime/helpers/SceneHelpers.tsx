import { Box, GizmoHelper, GizmoViewport, Grid } from '@react-three/drei'

/** Lift the overlay grid off ShadowGround so they do not z-fight. */
export const SCENE_HELPER_GRID_Y = 0.03

type SceneHelpersProps = {
  grid?: boolean
  axes?: boolean
  box?: boolean
  cellSize?: number
  boxSize?: number
}

export function SceneHelpers({
  grid = true,
  axes = true,
  box = true,
  cellSize = 0.5,
  boxSize = 1,
}: SceneHelpersProps) {
  return (
    <>
      {grid ? (
        <Grid
          position={[0, SCENE_HELPER_GRID_Y, 0]}
          infiniteGrid
          fadeDistance={40}
          fadeStrength={1}
          sectionSize={cellSize * 10}
          cellSize={cellSize}
          cellThickness={0.6}
          sectionThickness={1.1}
          cellColor="#6b7280"
          sectionColor="#9ca3af"
          receiveShadow={false}
          castShadow={false}
        />
      ) : null}
      {box ? (
        <Box args={[boxSize, boxSize, boxSize]} position={[0, boxSize / 2, 0]}>
          <meshBasicMaterial color="#22d3ee" wireframe />
        </Box>
      ) : null}
      {axes ? (
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
        </GizmoHelper>
      ) : null}
    </>
  )
}
