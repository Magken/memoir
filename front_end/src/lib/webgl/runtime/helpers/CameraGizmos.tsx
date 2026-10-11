import { Line } from '@react-three/drei'
import { frustumLineStrips } from './frustumLines'
import { homeViewPose } from '../../assets/viewPose'

type CameraGizmoPose = {
  id: string
  position: readonly [number, number, number]
  target: readonly [number, number, number]
}

type CameraGizmosProps = {
  poses?: readonly CameraGizmoPose[]
  includeHome?: boolean
  home?: { position: readonly [number, number, number]; target: readonly [number, number, number] }
  color?: string
}

export function CameraGizmos({
  poses = [],
  includeHome = true,
  home = homeViewPose(),
  color = '#38bdf8',
}: CameraGizmosProps) {
  const rows: CameraGizmoPose[] = includeHome
    ? [{ id: '__home__', position: home.position, target: home.target }, ...poses]
    : [...poses]
  return (
    <group>
      {rows.map((pose) => (
        <FrustumMark key={pose.id} pose={pose} color={color} />
      ))}
    </group>
  )
}

function FrustumMark({ pose, color }: { pose: CameraGizmoPose; color: string }) {
  const strips = frustumLineStrips(pose.position, pose.target)
  return (
    <group>
      {strips.map((points, index) => (
        <Line key={`${pose.id}-${index}`} points={points} color={color} lineWidth={1} />
      ))}
    </group>
  )
}
