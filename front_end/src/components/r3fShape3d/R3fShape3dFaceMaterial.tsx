import { useMemo } from 'react'
import { r3fShape3dToonGradientMap } from '../../lib/shape3d/r3fShape3dToonGradient'

type R3fShape3dFaceMaterialProps = {
  color: string
  attach?: string
}

export function R3fShape3dFaceMaterial({ color, attach }: R3fShape3dFaceMaterialProps) {
  const gradientMap = useMemo(() => r3fShape3dToonGradientMap(), [])

  return <meshToonMaterial attach={attach} color={color} gradientMap={gradientMap} />
}
