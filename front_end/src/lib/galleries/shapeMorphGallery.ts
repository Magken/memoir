/** SVG shape-morph gallery — ref.image-carousel-9 (flubber path tween) */

import { interpolate } from 'flubber'
import gsap from '../gsap'

export const SHAPE_MORPH_VIEWBOX = '-20 -20 1087 653'
export const SHAPE_MORPH_WIDTH = 1087
export const SHAPE_MORPH_HEIGHT = 653
export const DEFAULT_SHAPE_MORPH_DURATION_S = 1.6
export const DEFAULT_SHAPE_MORPH_LOOP_DELAY_S = 1.4
export const DEFAULT_SHAPE_MORPH_IMAGE_SWAP_S = 0.75

export type ShapeMorphGallerySlide = {
  src: string
  alt: string
  path: string
  stroke?: string
}

export function createShapePathInterpolator(fromPath: string, toPath: string) {
  return interpolate(fromPath, toPath, { maxSegmentLength: 8 })
}

type MorphShapePairOptions = {
  maskPath: SVGPathElement
  outlinePath: SVGPathElement
  imageEl: SVGImageElement
  from: ShapeMorphGallerySlide
  to: ShapeMorphGallerySlide
  duration?: number
  imageSwapAt?: number
  delay?: number
  onComplete?: () => void
}

/** GSAP timeline — morph mask/outline path + image crossfade (ref.image-carousel-9 timing). */
export function morphShapePair({
  maskPath,
  outlinePath,
  imageEl,
  from,
  to,
  duration = DEFAULT_SHAPE_MORPH_DURATION_S,
  imageSwapAt = DEFAULT_SHAPE_MORPH_IMAGE_SWAP_S,
  delay = 0,
  onComplete,
}: MorphShapePairOptions) {
  const pathTween = createShapePathInterpolator(from.path, to.path)
  const state = { t: 0 }
  const stroke = to.stroke ?? from.stroke

  const tl = gsap.timeline({ delay, onComplete })

  tl.to(
    state,
    {
      t: 1,
      duration,
      ease: 'expo.inOut',
      onUpdate: () => {
        const d = pathTween(state.t)
        maskPath.setAttribute('d', d)
        outlinePath.setAttribute('d', d)
        if (stroke) outlinePath.setAttribute('stroke', stroke)
      },
    },
    0,
  )

  tl.call(
    () => {
      imageEl.setAttribute('href', to.src)
      gsap.fromTo(imageEl, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'none' })
    },
    undefined,
    imageSwapAt,
  )

  return tl
}

export function applyShapeMorphSlide(
  maskPath: SVGPathElement,
  outlinePath: SVGPathElement,
  imageEl: SVGImageElement,
  slide: ShapeMorphGallerySlide,
) {
  maskPath.setAttribute('d', slide.path)
  outlinePath.setAttribute('d', slide.path)
  if (slide.stroke) outlinePath.setAttribute('stroke', slide.stroke)
  imageEl.setAttribute('href', slide.src)
  gsap.set(imageEl, { opacity: 1 })
}
