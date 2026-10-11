import { WEBGL_SPACE } from '../space/webglSpace'

export type CameraPresetId = 'perspective' | 'orthographic'

export type PerspectiveCameraPreset = {
  type: 'perspective'
  fov: number
  near: number
  far: number
  position: readonly [number, number, number]
}

export type OrthographicCameraPreset = {
  type: 'orthographic'
  frustum: number
  near: number
  far: number
  position: readonly [number, number, number]
}

export type CameraPreset = PerspectiveCameraPreset | OrthographicCameraPreset

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPreset> = {
  perspective: {
    type: 'perspective',
    fov: 45,
    near: 0.001,
    far: 100,
    position: [...WEBGL_SPACE.cameraHome],
  },
  orthographic: {
    type: 'orthographic',
    frustum: 2,
    near: 0.001,
    far: 100,
    position: [...WEBGL_SPACE.cameraHome],
  },
}

export function getCameraPreset(id: CameraPresetId = 'perspective'): CameraPreset {
  return CAMERA_PRESETS[id]
}
