import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Color, FogExp2 } from 'three'

type DarkFogRigProps = {
  color?: string
  density?: number
}

export const DARK_FOG_COLOR = '#000000'
export const DARK_FOG_DENSITY = 0.12

/** Pitch-black void around the subject. No studio fill — cage lights are the only illumination. */
export function DarkFogRig({ color = DARK_FOG_COLOR, density = DARK_FOG_DENSITY }: DarkFogRigProps) {
  const scene = useThree((state) => state.scene)
  const gl = useThree((state) => state.gl)

  useLayoutEffect(() => {
    const fog = new FogExp2(color, density)
    const bg = new Color(color)
    const prevFog = scene.fog
    const prevBg = scene.background
    const prevEnv = scene.environment
    const prevEnvI = scene.environmentIntensity
    const prevClear = gl.getClearColor(new Color())
    const prevAlpha = gl.getClearAlpha()
    scene.fog = fog
    scene.background = bg
    scene.environment = null
    scene.environmentIntensity = 0
    gl.setClearColor(bg, 1)
    return () => {
      scene.fog = prevFog
      scene.background = prevBg
      scene.environment = prevEnv
      scene.environmentIntensity = prevEnvI
      gl.setClearColor(prevClear, prevAlpha)
    }
  }, [color, density, gl, scene])

  return null
}
