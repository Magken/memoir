import { GALLERY_DEMO_IMAGES, galleryDemoImageSrc } from './galleryDemoImages'

/** Edge a pointer crossed, relative to a tile's center. */
export type DirectionAwareCubeEdge = 'top' | 'right' | 'bottom' | 'left'

/** in/out animation phase per edge — drives the tile `data-flip` attribute. */
export type DirectionAwareCubeFlip =
  | `in-${DirectionAwareCubeEdge}`
  | `out-${DirectionAwareCubeEdge}`

export type DirectionAwareCubeGalleryItem = {
  src: string
  alt: string
  title: string
}

const EDGES: readonly DirectionAwareCubeEdge[] = ['top', 'right', 'bottom', 'left']

/**
 * Direction-aware edge detection (Noel Delgado's ref.image-carousel-11):
 * map the pointer position to the nearest tile edge using atan2 quadrants,
 * compensating for non-square tiles.
 */
export function directionAwareCubeEdge(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): DirectionAwareCubeEdge {
  const w = rect.width
  const h = rect.height
  const x = (clientX - rect.left - w / 2) * (w > h ? h / w : 1)
  const y = (clientY - rect.top - h / 2) * (h > w ? w / h : 1)
  const d = (Math.round(Math.atan2(y, x) / (Math.PI / 2) + 5) % 4 + 4) % 4
  return EDGES[d]
}

/** Showcase demo tiles — reuse the shared gallery image pool. */
export const DIRECTION_AWARE_CUBE_GALLERY_DEMO_ITEMS: readonly DirectionAwareCubeGalleryItem[] =
  GALLERY_DEMO_IMAGES.map((image, index) => ({
    src: galleryDemoImageSrc(image.src, 360),
    alt: image.alt,
    title: image.title ?? image.alt ?? `Tile ${String(index + 1).padStart(2, '0')}`,
  }))
