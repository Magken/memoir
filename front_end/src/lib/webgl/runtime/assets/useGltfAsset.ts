import { useGLTF } from '@react-three/drei'
import type { Object3D } from 'three'

export const WEBGL_DRACO_DECODER_PATH = '/3d/decoders/gltf/'

useGLTF.setDecoderPath(WEBGL_DRACO_DECODER_PATH)

export type GltfAssetResult = {
  scene: Object3D
}

export function useGltfAsset(url: string): GltfAssetResult {
  const gltf = useGLTF(url)
  return { scene: gltf.scene }
}

export function preloadGltfAsset(url: string): void {
  useGLTF.preload(url)
}
