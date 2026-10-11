import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three'

let gradientMap: CanvasTexture | null = null

/** Three-band toon ramp — smooth meshes, flat Zdog-like shading. */
export function r3fShape3dToonGradientMap(): CanvasTexture {
  if (gradientMap) return gradientMap

  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D not supported')

  const ramp = ctx.createLinearGradient(0, 0, 4, 0)
  ramp.addColorStop(0, '#888888')
  ramp.addColorStop(0.4, '#bbbbbb')
  ramp.addColorStop(1, '#ffffff')
  ctx.fillStyle = ramp
  ctx.fillRect(0, 0, 4, 1)

  gradientMap = new CanvasTexture(canvas)
  gradientMap.minFilter = NearestFilter
  gradientMap.magFilter = NearestFilter
  gradientMap.colorSpace = SRGBColorSpace
  gradientMap.needsUpdate = true
  return gradientMap
}
