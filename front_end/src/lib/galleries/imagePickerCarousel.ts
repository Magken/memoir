/** Mini image picker rail — ref.image-carousel-10 · scroll math matches pickerCarousel.ts */

import {
  clampIndex,
  indexFromScrollTop,
  PICKER_VISIBLE_ITEMS,
  scrollTopForIndex,
} from './pickerCarousel'

export { clampIndex }

export type ImagePickerCarouselAxis = 'vertical' | 'horizontal'
export type ImagePickerCarouselSize = 'sm' | 'md'
export type ImagePickerCarouselLayout = 'rail' | 'strip'

export type ImagePickerCarouselImage = {
  id: string
  src: string
  alt?: string
}

export const IMAGE_PICKER_VISIBLE_ITEMS = PICKER_VISIBLE_ITEMS
export const IMAGE_PICKER_SCROLL_MS = 340

export type ImagePickerMetrics = {
  itemSize: number
  containerSize: number
}

export function imagePickerDistanceClass(distance: number): string {
  const clamped = Math.min(2, Math.max(0, distance))
  return `theme-image-picker-carousel__item--distance-${clamped}`
}

export function measureImagePickerMetrics(
  scrollEl: HTMLElement,
  axis: ImagePickerCarouselAxis,
): ImagePickerMetrics {
  const containerSize = axis === 'vertical' ? scrollEl.clientHeight : scrollEl.clientWidth
  const firstItem = scrollEl.querySelector<HTMLElement>('.theme-image-picker-carousel__item')
  const measured =
    firstItem && (axis === 'vertical' ? firstItem.offsetHeight : firstItem.offsetWidth) > 0
      ? axis === 'vertical'
        ? firstItem.offsetHeight
        : firstItem.offsetWidth
      : 0
  const itemSize =
    measured > 0
      ? measured
      : containerSize > 0
        ? containerSize / IMAGE_PICKER_VISIBLE_ITEMS
        : 48

  return { itemSize, containerSize }
}

export function scrollOffsetForIndex(
  index: number,
  itemSize: number,
  containerSize: number,
): number {
  return scrollTopForIndex(index, itemSize, containerSize)
}

export function indexFromScrollOffset(
  offset: number,
  itemSize: number,
  containerSize: number,
): number {
  return indexFromScrollTop(offset, itemSize, containerSize)
}

export function readImagePickerScrollOffset(
  scrollEl: HTMLElement,
  axis: ImagePickerCarouselAxis,
): number {
  return axis === 'vertical' ? scrollEl.scrollTop : scrollEl.scrollLeft
}

export function readImagePickerIndex(
  scrollEl: HTMLElement,
  length: number,
  axis: ImagePickerCarouselAxis,
): number {
  const { itemSize, containerSize } = measureImagePickerMetrics(scrollEl, axis)
  const offset = readImagePickerScrollOffset(scrollEl, axis)
  return clampIndex(indexFromScrollOffset(offset, itemSize, containerSize), length)
}

function clampScrollTarget(
  scrollEl: HTMLElement,
  target: number,
  axis: ImagePickerCarouselAxis,
): number {
  const maxScroll = Math.max(
    0,
    axis === 'vertical'
      ? scrollEl.scrollHeight - scrollEl.clientHeight
      : scrollEl.scrollWidth - scrollEl.clientWidth,
  )
  return Math.max(0, Math.min(target, maxScroll))
}

/** Ideal scroll offset — may exceed current maxScroll until layout has measured trailing pad. */
export function scrollOffsetForIndexOnElement(
  scrollEl: HTMLElement,
  index: number,
  axis: ImagePickerCarouselAxis,
): number {
  const { itemSize, containerSize } = measureImagePickerMetrics(scrollEl, axis)
  return scrollOffsetForIndex(index, itemSize, containerSize)
}

export function scrollTargetForIndex(
  scrollEl: HTMLElement,
  index: number,
  axis: ImagePickerCarouselAxis,
): number {
  return clampScrollTarget(scrollEl, scrollOffsetForIndexOnElement(scrollEl, index, axis), axis)
}

export function writeImagePickerScrollOffset(
  scrollEl: HTMLElement,
  offset: number,
  axis: ImagePickerCarouselAxis,
): void {
  if (axis === 'vertical') {
    scrollEl.scrollTop = offset
  } else {
    scrollEl.scrollLeft = offset
  }
}

/** Eased scroll — picker-carousel parity. Returns cancel fn. */
export function animateImagePickerScroll(
  scrollEl: HTMLElement,
  index: number,
  length: number,
  axis: ImagePickerCarouselAxis,
  smooth: boolean,
  onSettled?: () => void,
): () => void {
  if (length === 0) {
    onSettled?.()
    return () => {}
  }

  const clamped = clampIndex(index, length)
  const target = scrollTargetForIndex(scrollEl, clamped, axis)
  const current = readImagePickerScrollOffset(scrollEl, axis)

  if (!smooth || Math.abs(current - target) < 1) {
    writeImagePickerScrollOffset(scrollEl, target, axis)
    onSettled?.()
    return () => {}
  }

  const distance = target - current
  const startTime = performance.now()
  let frame: number | null = null

  const tick = (now: number) => {
    const progress = Math.min((now - startTime) / IMAGE_PICKER_SCROLL_MS, 1)
    const eased = 1 - (1 - progress) ** 3
    writeImagePickerScrollOffset(scrollEl, current + distance * eased, axis)
    if (progress < 1) {
      frame = requestAnimationFrame(tick)
      return
    }
    writeImagePickerScrollOffset(scrollEl, target, axis)
    frame = null
    onSettled?.()
  }

  frame = requestAnimationFrame(tick)
  return () => {
    if (frame !== null) {
      cancelAnimationFrame(frame)
      frame = null
    }
  }
}

export { scrollTopForIndex as scrollTopForImagePickerIndex } from './pickerCarousel'
