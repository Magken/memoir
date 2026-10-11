import { WEBGL_SPACE } from '../space/webglSpace'

type StudioLightRigProps = {
  intensity?: number
  castShadow?: boolean
}

export function StudioLightRig({ intensity = 1, castShadow = true }: StudioLightRigProps) {
  return (
    <>
      <hemisphereLight args={['#e8eef6', '#1a1c22', 0.45 * intensity]} />
      <directionalLight
        position={[...WEBGL_SPACE.lights.key]}
        intensity={1.15 * intensity}
        castShadow={castShadow}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00015}
        shadow-normalBias={0.02}
        shadow-radius={3}
        shadow-camera-near={0.2}
        shadow-camera-far={12}
        shadow-camera-left={-2.2}
        shadow-camera-right={2.2}
        shadow-camera-top={2.2}
        shadow-camera-bottom={-2.2}
      />
      <directionalLight position={[...WEBGL_SPACE.lights.fill]} intensity={0.25 * intensity} />
      <directionalLight position={[...WEBGL_SPACE.lights.rim]} intensity={0.18 * intensity} />
    </>
  )
}
