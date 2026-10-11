import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react'
import {
  animateImagePickerScroll,
  clampIndex,
  imagePickerDistanceClass,
  IMAGE_PICKER_SCROLL_MS,
  readImagePickerIndex,
  readImagePickerScrollOffset,
  scrollTargetForIndex,
  writeImagePickerScrollOffset,
  type ImagePickerCarouselAxis,
  type ImagePickerCarouselImage,
  type ImagePickerCarouselLayout,
  type ImagePickerCarouselSize,
} from '../lib/galleries/imagePickerCarousel'
import { IconButton } from './IconButton'

type ImagePickerCarouselProps = {
  images: readonly ImagePickerCarouselImage[]
  selectedIndex: number
  onSelect: (index: number) => void
  axis?: ImagePickerCarouselAxis
  size?: ImagePickerCarouselSize
  layout?: ImagePickerCarouselLayout
  showNav?: boolean
  label?: string
  disabled?: boolean
  className?: string
  debug?: boolean
}

const SNAP_DELAY_MS = 100

function isThumbPointerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('.theme-image-picker-carousel__item, button, a, [role="button"]'))
}

function finishProgrammaticScroll(programmaticRef: { current: boolean }) {
  queueMicrotask(() => {
    programmaticRef.current = false
  })
}

const NAV_ICONS: Record<ImagePickerCarouselAxis, { prev: LucideIcon; next: LucideIcon }> = {
  vertical: { prev: ChevronUp, next: ChevronDown },
  horizontal: { prev: ChevronLeft, next: ChevronRight },
}

export function ImagePickerCarousel({
  images,
  selectedIndex,
  onSelect,
  axis = 'vertical',
  size = 'sm',
  layout = 'rail',
  showNav = false,
  label = 'Image picker',
  disabled = false,
  className = '',
  debug = false,
}: ImagePickerCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const snapTimerRef = useRef<number | null>(null)
  const programmaticRef = useRef(false)
  const scrollCancelRef = useRef<(() => void) | null>(null)
  const isDraggingRef = useRef(false)
  const lastPointerPosRef = useRef(0)
  const selectedIndexRef = useRef(selectedIndex)
  const prevSafeIndexRef = useRef<number | null>(null)
  const skipPropSyncRef = useRef(false)
  const [previewIndex, setPreviewIndex] = useState(selectedIndex)

  const safeIndex = clampIndex(selectedIndex, images.length)
  const focusIndex = clampIndex(previewIndex, images.length)

  selectedIndexRef.current = selectedIndex

  if (debug) {
    console.debug('[ImagePickerCarousel]', { axis, size, layout, safeIndex, focusIndex, count: images.length })
  }

  const clearSnapTimer = useCallback(() => {
    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current)
      snapTimerRef.current = null
    }
  }, [])

  const cancelScrollAnim = useCallback(() => {
    scrollCancelRef.current?.()
    scrollCancelRef.current = null
  }, [])

  const commitIndex = useCallback(
    (index: number) => {
      const next = clampIndex(index, images.length)
      const changed = next !== selectedIndexRef.current
      setPreviewIndex(next)
      selectedIndexRef.current = next
      if (changed) {
        skipPropSyncRef.current = true
        onSelect(next)
      }
    },
    [images.length, onSelect],
  )

  const applyScrollIndex = useCallback(
    (index: number) => {
      const scrollEl = scrollRef.current
      if (!scrollEl || images.length === 0) return
      const clamped = clampIndex(index, images.length)
      programmaticRef.current = true
      writeImagePickerScrollOffset(scrollEl, scrollTargetForIndex(scrollEl, clamped, axis), axis)
      setPreviewIndex(clamped)
      finishProgrammaticScroll(programmaticRef)
    },
    [axis, images.length],
  )

  const scrollToIndex = useCallback(
    (index: number, smooth: boolean, onSettled?: () => void) => {
      const scrollEl = scrollRef.current
      if (!scrollEl || images.length === 0) return
      clearSnapTimer()
      cancelScrollAnim()
      programmaticRef.current = true
      setPreviewIndex(clampIndex(index, images.length))
      scrollCancelRef.current = animateImagePickerScroll(
        scrollEl,
        index,
        images.length,
        axis,
        smooth,
        () => {
          scrollCancelRef.current = null
          finishProgrammaticScroll(programmaticRef)
          onSettled?.()
        },
      )
    },
    [axis, cancelScrollAnim, clearSnapTimer, images.length],
  )

  const snapAndCommit = useCallback(
    () => {
      const scrollEl = scrollRef.current
      if (!scrollEl || images.length === 0 || isDraggingRef.current) return

      const propIndex = clampIndex(selectedIndexRef.current, images.length)
      const scrolledIndex = readImagePickerIndex(scrollEl, images.length, axis)

      if (scrolledIndex !== propIndex) {
        scrollToIndex(propIndex, true)
        return
      }

      const target = scrollTargetForIndex(scrollEl, propIndex, axis)
      const current = readImagePickerScrollOffset(scrollEl, axis)
      if (Math.abs(current - target) >= 1) {
        scrollToIndex(propIndex, true)
      }
    },
    [axis, images.length, scrollToIndex],
  )

  const scheduleSnap = useCallback(() => {
    clearSnapTimer()
    snapTimerRef.current = window.setTimeout(() => snapAndCommit(), SNAP_DELAY_MS)
  }, [clearSnapTimer, snapAndCommit])

  const handleScroll = useCallback(() => {
    if (programmaticRef.current || isDraggingRef.current) return
    const scrollEl = scrollRef.current
    if (!scrollEl || images.length === 0) return
    setPreviewIndex(readImagePickerIndex(scrollEl, images.length, axis))
    scheduleSnap()
  }, [axis, images.length, scheduleSnap])

  const handlePick = useCallback(
    (index: number) => {
      if (disabled) return
      commitIndex(index)
      scrollToIndex(index, true)
    },
    [commitIndex, disabled, scrollToIndex],
  )

  const stepBy = useCallback(
    (delta: -1 | 1) => {
      if (disabled || images.length === 0) return
      const next = clampIndex(safeIndex + delta, images.length)
      if (next === safeIndex) return
      handlePick(next)
    },
    [disabled, handlePick, images.length, safeIndex],
  )

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0 || isThumbPointerTarget(event.target)) return
      isDraggingRef.current = true
      lastPointerPosRef.current = axis === 'vertical' ? event.clientY : event.clientX
      clearSnapTimer()
      cancelScrollAnim()
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [axis, cancelScrollAnim, clearSnapTimer, disabled],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return
      const scrollEl = scrollRef.current
      if (!scrollEl) return
      const pos = axis === 'vertical' ? event.clientY : event.clientX
      const delta = lastPointerPosRef.current - pos
      if (axis === 'vertical') {
        scrollEl.scrollTop += delta
      } else {
        scrollEl.scrollLeft += delta
      }
      lastPointerPosRef.current = pos
      setPreviewIndex(readImagePickerIndex(scrollEl, images.length, axis))
    },
    [axis, images.length],
  )

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    window.setTimeout(() => {
      const scrollEl = scrollRef.current
      if (!scrollEl || images.length === 0) return
      const index = readImagePickerIndex(scrollEl, images.length, axis)
      scrollToIndex(index, true, () => commitIndex(index))
    }, 50)
  }, [axis, commitIndex, images.length, scrollToIndex])

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || images.length === 0) return

    const prev = prevSafeIndexRef.current
    prevSafeIndexRef.current = safeIndex

    clearSnapTimer()

    // handlePick already started scroll — do not cancel that animation
    if (skipPropSyncRef.current) {
      skipPropSyncRef.current = false
      return
    }

    cancelScrollAnim()

    if (prev === null) {
      applyScrollIndex(safeIndex)
      return
    }

    if (prev !== safeIndex) {
      scrollToIndex(safeIndex, true)
    }
  }, [applyScrollIndex, axis, cancelScrollAnim, clearSnapTimer, images.length, safeIndex, scrollToIndex])

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return undefined

    const observer = new ResizeObserver(() => {
      if (isDraggingRef.current || programmaticRef.current) return
      applyScrollIndex(clampIndex(selectedIndexRef.current, images.length))
    })
    observer.observe(scrollEl)
    return () => observer.disconnect()
  }, [applyScrollIndex, images.length])

  useEffect(() => {
    prevSafeIndexRef.current = null
  }, [axis, images.length])

  useEffect(() => {
    const scrollEl = scrollRef.current
    const hostEl = hostRef.current
    if (disabled) return undefined

    const blockWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }

    const options: AddEventListenerOptions = { passive: false, capture: true }
    const targets = [scrollEl, hostEl, frameRef.current].filter((el): el is HTMLDivElement => el !== null)

    for (const el of targets) {
      el.addEventListener('wheel', blockWheel, options)
    }

    return () => {
      for (const el of targets) {
        el.removeEventListener('wheel', blockWheel, options)
      }
    }
  }, [disabled, images.length, showNav])

  useEffect(() => {
    return () => {
      cancelScrollAnim()
      clearSnapTimer()
    }
  }, [cancelScrollAnim, clearSnapTimer])

  if (images.length === 0) return null

  const hostClass = [
    'theme-image-picker-carousel',
    `theme-image-picker-carousel--${axis}`,
    `theme-image-picker-carousel--${size}`,
    layout === 'strip' ? 'theme-image-picker-carousel--strip' : '',
    disabled ? 'theme-image-picker-carousel--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const navIcons = NAV_ICONS[axis]
  const atStart = safeIndex <= 0
  const atEnd = safeIndex >= images.length - 1
  const navSize = axis === 'horizontal' ? 'xxs' : 'sm'

  const carousel = (
    <div
      ref={hostRef}
      className={hostClass}
      aria-disabled={disabled || undefined}
      data-lenis-prevent-wheel
    >
      <div className="theme-image-picker-carousel__fade theme-image-picker-carousel__fade--start" aria-hidden />
      <div className="theme-image-picker-carousel__fade theme-image-picker-carousel__fade--end" aria-hidden />
      <div className="theme-image-picker-carousel__highlight" aria-hidden />
      <div
        ref={scrollRef}
        className="theme-image-picker-carousel__scroll"
        role="listbox"
        aria-label={label}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        data-lenis-prevent-wheel
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="theme-image-picker-carousel__list">
          {images.map((image, index) => {
            const distance = Math.abs(index - focusIndex)
            const isSelected = index === focusIndex
            return (
              <button
                key={image.id ?? `${image.src}-${index}`}
                type="button"
                role="option"
                aria-selected={index === safeIndex}
                aria-label={image.alt ?? `Image ${index + 1}`}
                disabled={disabled}
                className={[
                  'theme-image-picker-carousel__item',
                  imagePickerDistanceClass(distance),
                  isSelected ? 'theme-image-picker-carousel__item--active' : '',
                ].join(' ')}
                onClick={() => handlePick(index)}
              >
                <img src={image.src} alt="" className="theme-image-picker-carousel__img" loading="lazy" decoding="async" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (!showNav) return carousel

  return (
    <div
      ref={frameRef}
      className={[
        'theme-image-picker-carousel-frame',
        `theme-image-picker-carousel-frame--${axis}`,
        layout === 'strip' ? 'theme-image-picker-carousel-frame--strip' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-lenis-prevent-wheel
    >
      <IconButton
        type="button"
        size={navSize}
        variant="cardless"
        borderGlow="icon"
        className="theme-image-picker-carousel__nav theme-image-picker-carousel__nav--prev"
        icon={navIcons.prev}
        aria-label="Show previous image"
        disabled={disabled || atStart}
        onClick={() => stepBy(-1)}
      />
      {carousel}
      <IconButton
        type="button"
        size={navSize}
        variant="cardless"
        borderGlow="icon"
        className="theme-image-picker-carousel__nav theme-image-picker-carousel__nav--next"
        icon={navIcons.next}
        aria-label="Show next image"
        disabled={disabled || atEnd}
        onClick={() => stepBy(1)}
      />
    </div>
  )
}

export { IMAGE_PICKER_SCROLL_MS }
