/** Shared click-expand layouts for gallery carousels (drag, orbital, …) */
export type GalleryExpandVariant = 'image' | 'detail' | 'native'

export type GalleryExpandItem = {
  src: string
  alt: string
  /** `detail` expand — optional copy */
  title?: string
  text?: string
  num?: string | number
  /** Project-card slides — horizontal tech tag row */
  techStack?: readonly string[]
}

export const GALLERY_EXPAND_CLICK_MOVE_PX = 8

export function fitGalleryNativeExpandSize(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxWidth, height: maxHeight }
  }
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight)
  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
  }
}
