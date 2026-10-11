import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three-stdlib'

type EnvironmentRigProps = {
  intensity?: number
}

/**
 * Local RoomEnvironment → PMREM. Never uses drei `<Environment preset>` (CDN).
 */
export function EnvironmentRig({ intensity = 1 }: EnvironmentRigProps) {
  const { gl, scene } = useThree()

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()
    const envScene = RoomEnvironment()
    const envTex = pmrem.fromScene(envScene, 0.04).texture
    const previous = scene.environment
    scene.environment = envTex
    scene.environmentIntensity = intensity
    return () => {
      scene.environment = previous
      envTex.dispose()
      pmrem.dispose()
      envScene.traverse((obj) => {
        const mesh = obj as { geometry?: { dispose?: () => void }; material?: { dispose?: () => void } | { dispose?: () => void }[] }
        mesh.geometry?.dispose?.()
        const mat = mesh.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.())
        else mat?.dispose?.()
      })
    }
  }, [gl, scene, intensity])

  return null
}
