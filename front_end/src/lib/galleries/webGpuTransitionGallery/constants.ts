import type { WebGpuGalleryImage } from './types'

/** Slot aspect ratios from ref `global.css` — portrait-heavy demo framing. */
export const WEBGPU_GALLERY_SLOT_ASPECTS = [
  4907 / 7360,
  6000 / 4000,
  3634 / 5998,
  3769 / 5025,
  6804 / 4104,
] as const

export const WEBGPU_GALLERY_MAIN_COUNT = 5
export const WEBGPU_GALLERY_SATELLITES_PER_IMAGE = 4
export const WEBGPU_GALLERY_SATELLITE_COUNT =
  WEBGPU_GALLERY_MAIN_COUNT * WEBGPU_GALLERY_SATELLITES_PER_IMAGE

export const WEBGPU_GALLERY_CORNER_RADIUS = 8
export const WEBGPU_GALLERY_CAMERA_DISTANCE = 1000

export const WEBGPU_CAROUSEL_LERP = 0.075
export const WEBGPU_CAROUSEL_WHEEL_SCALE = 0.88
export const WEBGPU_CAROUSEL_GAP_PX = 56
/** Slot drift while scrolling — subtle rail parallax (px at rail edge). */
export const WEBGPU_CAROUSEL_PARALLAX_Y = 14
export const WEBGPU_CAROUSEL_PARALLAX_X = 6
/** Minimum UV bleed for cover pan (drag-carousel-style headroom inside frames). */
export const WEBGPU_TEXTURE_MIN_BLEED = 0.1
/** Per-slide horizontal pan from rail position (relX / cellW). */
export const WEBGPU_TEXTURE_PARALLAX_U = 0.38
export const WEBGPU_TEXTURE_PARALLAX_V = 0.08
/** Extra pan while the rail is moving (scroll velocity). */
export const WEBGPU_TEXTURE_VELOCITY_U = 0.012
export const WEBGPU_TEXTURE_VELOCITY_V = 0.004

export const WEBGPU_TILT_RAD_PER_PX = 0.005
export const WEBGPU_TILT_MAX_RAD = 0.05
export const WEBGPU_TILT_LERP = 0.09

export const WEBGPU_INNER_TILT_RAD_PER_PX = 0.003
export const WEBGPU_INNER_TILT_MAX_RAD = 0.05
export const WEBGPU_INNER_TILT_LERP = 0.09

export function webGpuMainIdx(image: number): number {
  return image
}

export function webGpuSatIdx(image: number, j: number): number {
  return WEBGPU_GALLERY_MAIN_COUNT + image * WEBGPU_GALLERY_SATELLITES_PER_IMAGE + j
}

export const WEBGPU_GALLERY_DEFAULT_FACTS: readonly string[] = [
  'Warm facades against an open sky — wheel the carousel, then open a slide for the vertical detail stack.',
  'Suspension lines and amber light. Satellite planes fade in below the hero when you enter detail mode.',
  'Orange petals in soft natural light — shared WebGPU textures morph between horizontal and vertical layouts.',
  'Vinyl spinning on a gray turntable. Scroll the detail stack; planes lean with scroll velocity.',
  'Penguins gathered along the shoreline — drag the index constellation or return to the infinite rail.',
]

export function webGpuGallerySlidesFromPool(
  pool: readonly { src: string; alt: string; title?: string; text?: string }[],
): WebGpuGalleryImage[] {
  return Array.from({ length: WEBGPU_GALLERY_MAIN_COUNT }, (_, index) => {
    const item = pool[index % pool.length]!
    return {
      src: item.src,
      alt: item.alt,
      caption: item.title ?? item.alt,
      fact: item.text ?? WEBGPU_GALLERY_DEFAULT_FACTS[index]!,
    }
  })
}
