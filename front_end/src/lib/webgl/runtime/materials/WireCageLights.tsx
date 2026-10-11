import { useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { easeCarouselWheel, gsap, useGSAP } from '../../../gsap'
import { setCeramicMeshColor, setCeramicScatterScale, syncCeramicScatter } from './ceramicScatter'
import { setWireLightColor, setWireLightGain } from './wireLights'
import {
  dimHexRgb,
  formatHexRgb,
  parseHexRgb,
  SCENE_OBJECT_COLOR_DIM_DURATION,
} from './sceneObjectColor'

type WireCageLightsProps = {
  color: string
  meshColor?: string
  intensity?: number
  scatter?: number
  /** Animate object color down (scene hover). Does not change lamp gain. */
  dim?: boolean
  /** Set the lamp color immediately. Turn-on drives it every frame; the dim ease must not restart. */
  immediate?: boolean
}

/** Viewer object color, mesh color, intensity, and ceramic scatter. Pose is driven from the spring tick. */
export function WireCageLights({
  color,
  meshColor,
  intensity = 0.05,
  scatter,
  dim = false,
  immediate = false,
}: WireCageLightsProps) {
  const scene = useThree((state) => state.scene)
  const invalidate = useThree((state) => state.invalidate)
  const rgb = useRef(parseHexRgb(color) ?? { r: 242, g: 196, b: 138 })
  useLayoutEffect(() => {
    setWireLightGain(intensity)
    if (meshColor) setCeramicMeshColor(meshColor)
    if (scatter !== undefined) setCeramicScatterScale(scatter)
    syncCeramicScatter(scene)
  }, [meshColor, intensity, scatter, scene])
  useGSAP(
    () => {
      const target = parseHexRgb(dim ? dimHexRgb(color) : color)
      if (!target) return
      if (immediate) {
        rgb.current = target
        setWireLightColor(formatHexRgb(target))
        invalidate()
        return
      }
      const proxy = { ...rgb.current }
      const tween = gsap.to(proxy, {
        r: target.r,
        g: target.g,
        b: target.b,
        duration: SCENE_OBJECT_COLOR_DIM_DURATION,
        ease: easeCarouselWheel,
        onUpdate: () => {
          rgb.current = { r: proxy.r, g: proxy.g, b: proxy.b }
          setWireLightColor(formatHexRgb(rgb.current))
          invalidate()
        },
      })
      return () => tween.kill()
    },
    { dependencies: [color, dim, immediate, invalidate] },
  )
  return null
}
