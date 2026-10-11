import type { MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ViewPose } from '../../assets/viewPose'
import { isOrbitFrameHandle, poseFromLiveOrbit, type OrbitFrameHandle } from './cameraJourney'

/** Keep a ref in sync with the live OrbitControls frame (same capture the model-viewer Copy uses). */
export function liveViewPose(
  poseRef: MutableRefObject<ViewPose>,
  orbitHandleRef: MutableRefObject<OrbitFrameHandle | null>,
): ViewPose {
  const last = poseRef.current
  const framed = poseFromLiveOrbit(orbitHandleRef.current, last)
  return {
    ...last,
    position: framed.pose.position,
    target: framed.pose.target,
    orbit: framed.orbit,
  }
}

export function LivePoseCapture({
  poseRef,
  orbitHandleRef,
}: {
  poseRef: MutableRefObject<ViewPose>
  orbitHandleRef: MutableRefObject<OrbitFrameHandle | null>
}) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  useFrame(() => {
    const handle = isOrbitFrameHandle(controls) ? controls : null
    orbitHandleRef.current = handle
    const framed = poseFromLiveOrbit(handle, poseRef.current)
    poseRef.current = {
      ...framed.pose,
      orbit: framed.orbit,
      up: [camera.up.x, camera.up.y, camera.up.z],
      quaternion: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w],
    }
  })
  return null
}
