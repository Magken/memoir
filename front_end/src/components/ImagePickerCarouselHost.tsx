import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ImagePickerCarousel } from './ImagePickerCarousel'
import { IconButton } from './IconButton'
import { clampIndex } from '../lib/galleries/imagePickerCarousel'
import type { ImagePickerCarouselImage, ImagePickerCarouselSize } from '../lib/galleries/imagePickerCarousel'

type ImagePickerCarouselHostProps = {
  images: readonly ImagePickerCarouselImage[]
  size?: ImagePickerCarouselSize
  showNav?: boolean
  label?: string
  className?: string
}

/** Vertical rail + preview + horizontal thumb strip — ref.image-carousel-10 live port. */
export function ImagePickerCarouselHost({
  images,
  size = 'sm',
  showNav = true,
  label = 'Image picker',
  className = '',
}: ImagePickerCarouselHostProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const controlsRef = useRef<HTMLDivElement>(null)
  const active = images[selectedIndex] ?? images[0]

  const atStart = selectedIndex <= 0
  const atEnd = selectedIndex >= images.length - 1

  const stepBy = useCallback(
    (delta: -1 | 1) => {
      setSelectedIndex((current) => clampIndex(current + delta, images.length))
    },
    [images.length],
  )

  useEffect(() => {
    const controlsEl = controlsRef.current
    if (!controlsEl) return undefined

    const blockWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }

    const options: AddEventListenerOptions = { passive: false, capture: true }
    controlsEl.addEventListener('wheel', blockWheel, options)
    return () => controlsEl.removeEventListener('wheel', blockWheel, options)
  }, [images.length])

  if (!active) return null

  return (
    <div className={['theme-image-picker-carousel-host theme-image-picker-carousel-host--stacked', className].filter(Boolean).join(' ')}>
      <div className="theme-image-picker-carousel-host__row">
        <ImagePickerCarousel
          images={images}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          axis="vertical"
          size={size}
          layout="rail"
          showNav={showNav}
          label={`${label} — vertical`}
        />
        <div className="theme-image-picker-carousel-host__preview">
          <img
            key={active.src}
            src={active.src}
            alt={active.alt ?? ''}
            className="theme-image-picker-carousel-host__preview-img"
          />
        </div>
      </div>
      <div
        ref={controlsRef}
        className="theme-image-picker-carousel-host__controls"
        data-lenis-prevent-wheel
      >
        <IconButton
          type="button"
          variant="cardless"
          size="xxs"
          borderGlow="icon"
          icon={ChevronLeft}
          aria-label="Previous image"
          disabled={atStart}
          onClick={() => stepBy(-1)}
        />
        <ImagePickerCarousel
          images={images}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          axis="horizontal"
          size={size}
          layout="strip"
          showNav={false}
          label={`${label} — horizontal`}
        />
        <IconButton
          type="button"
          variant="cardless"
          size="xxs"
          borderGlow="icon"
          icon={ChevronRight}
          aria-label="Next image"
          disabled={atEnd}
          onClick={() => stepBy(1)}
        />
      </div>
    </div>
  )
}
