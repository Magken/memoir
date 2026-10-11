import { useMemo, useState } from 'react'
import { ImagePickerCarousel } from './ImagePickerCarousel'
import { Card } from './Card'
import { ARRANGEMENT_IMG } from './cardDisplayLayout'
import type { ImagePickerCarouselImage } from '../lib/galleries/imagePickerCarousel'

const PICKER_IMAGES: readonly ImagePickerCarouselImage[] = [
  { id: 'a', src: ARRANGEMENT_IMG.productA, alt: 'Standard kit' },
  { id: 'b', src: ARRANGEMENT_IMG.productB, alt: 'Express kit' },
  { id: 'c', src: ARRANGEMENT_IMG.productC, alt: 'Wool throw' },
]

/** Compact picker rail inside a card shell — item-display picker arrangement. */
export function ItemImagePickerCardPreview() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const images = PICKER_IMAGES
  const active = useMemo(() => images[selectedIndex] ?? images[0], [images, selectedIndex])

  if (!active) return null

  return (
    <Card variant="outline" className="theme-card-arrangement max-w-md p-3">
      <div className="theme-image-picker-carousel-host__row">
        <ImagePickerCarousel
          images={images}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          axis="vertical"
          size="sm"
          label="SKU image picker"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="theme-image-picker-carousel-host__preview">
            <img src={active.src} alt="" loading="lazy" decoding="async" />
          </div>
          <p className="type-body-sm type-semibold mb-0">{active.alt}</p>
          <p className="type-caption type-muted mb-0">Scroll the rail or tap a thumb — fits beside catalog tiles.</p>
        </div>
      </div>
      <div className="theme-image-picker-carousel-host__strip theme-image-picker-carousel-host__controls">
        <ImagePickerCarousel
          images={images}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          axis="horizontal"
          size="sm"
          layout="strip"
          label="SKU thumb strip"
        />
      </div>
    </Card>
  )
}
