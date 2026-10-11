import { Edges } from '@react-three/drei'

type R3fShape3dEdgeOverlayProps = {
  enabled?: boolean
  color: string
  threshold?: number
}

export function R3fShape3dEdgeOverlay({
  enabled = false,
  color,
  threshold = 15,
}: R3fShape3dEdgeOverlayProps) {
  if (!enabled) return null

  return <Edges threshold={threshold} color={color} lineWidth={1.25} />
}
