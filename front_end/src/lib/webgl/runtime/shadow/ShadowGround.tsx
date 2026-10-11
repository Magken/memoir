type ShadowGroundProps = {
  size?: number
  opacity?: number
  color?: string
}

/**
 * Editable shadow receiver. The helper grid must not receive shadows —
 * this plane is the only ground catcher.
 */
export function ShadowGround({ size = 12, opacity = 1, color = '#1a1c22' }: ShadowGroundProps) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        color={color}
        roughness={1}
        metalness={0}
        transparent={opacity < 1}
        opacity={opacity}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  )
}
