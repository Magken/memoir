import { forwardRef, useLayoutEffect, useMemo, useRef, type Ref } from 'react'
import {
  BackSide,
  Color,
  GLSL3,
  RawShaderMaterial,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { installDoubleSideMeshPick } from '../interaction/cameraPick'
import { POLY_DEFAULT } from '../interaction/markStem'
import {
  CLOUD_BASE,
  CLOUD_FRAGMENT,
  CLOUD_OPACITY,
  CLOUD_PROFILE_XZ,
  CLOUD_PROFILE_Y,
  CLOUD_RANGE,
  CLOUD_SIZE,
  CLOUD_THRESHOLD,
  CLOUD_VERTEX,
  cloudMarchSteps,
  makeCloudDensityTexture,
} from './cloudVolume'

type PointerHandler = (event: ThreeEvent<PointerEvent>) => void

type VolumetricCloudProps = {
  wireframe?: boolean
  poly?: number
  onPointerDown?: PointerHandler
  onPointerMove?: PointerHandler
  onPointerLeave?: PointerHandler
  onPointerUp?: PointerHandler
}

export const VolumetricCloud = forwardRef<Group, VolumetricCloudProps>(function VolumetricCloud(
  { wireframe = false, poly = POLY_DEFAULT, onPointerDown, onPointerMove, onPointerLeave, onPointerUp },
  ref: Ref<Group>,
) {
  const meshRef = useRef<Mesh>(null)
  const density = useMemo(() => makeCloudDensityTexture(), [])
  const material = useMemo(() => {
    const mat = new RawShaderMaterial({
      glslVersion: GLSL3,
      uniforms: {
        base: { value: new Color(CLOUD_BASE) },
        map: { value: density },
        cameraPos: { value: new Vector3() },
        threshold: { value: CLOUD_THRESHOLD },
        opacity: { value: CLOUD_OPACITY },
        range: { value: CLOUD_RANGE },
        steps: { value: cloudMarchSteps(poly) },
        frame: { value: 0 },
        uTime: { value: 0 },
        uHalfSize: { value: new Vector3(CLOUD_SIZE.x / 2, CLOUD_SIZE.y / 2, CLOUD_SIZE.z / 2) },
        uProfileY: { value: CLOUD_PROFILE_Y },
        uProfileXZ: { value: CLOUD_PROFILE_XZ },
      },
      vertexShader: CLOUD_VERTEX,
      fragmentShader: CLOUD_FRAGMENT,
      side: BackSide,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    return mat
  }, [density])

  useLayoutEffect(() => {
    material.uniforms.steps.value = cloudMarchSteps(poly)
  }, [material, poly])

  useLayoutEffect(() => {
    if (meshRef.current) installDoubleSideMeshPick(meshRef.current)
  }, [])

  useLayoutEffect(
    () => () => {
      material.dispose()
      density.dispose()
    },
    [material, density],
  )

  useFrame(({ camera }, delta) => {
    material.uniforms.cameraPos.value.copy(camera.position)
    material.uniforms.frame.value += 1
    material.uniforms.uTime.value += delta
  })

  return (
    <group
      ref={ref}
      userData={{ webglPickRoot: true }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
    >
      <mesh
        ref={meshRef}
        position={[0, CLOUD_SIZE.y / 2, 0]}
        material={material}
        frustumCulled={false}
      >
        <boxGeometry args={[CLOUD_SIZE.x, CLOUD_SIZE.y, CLOUD_SIZE.z]} />
      </mesh>
      {wireframe ? (
        <mesh position={[0, CLOUD_SIZE.y / 2, 0]}>
          <boxGeometry args={[CLOUD_SIZE.x, CLOUD_SIZE.y, CLOUD_SIZE.z]} />
          <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.45} />
        </mesh>
      ) : null}
    </group>
  )
})
