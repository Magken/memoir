import { useRef } from 'react'
import {
  directionAwareCubeEdge,
  DIRECTION_AWARE_CUBE_GALLERY_DEMO_ITEMS,
  type DirectionAwareCubeFlip,
  type DirectionAwareCubeGalleryItem,
} from '../lib/galleries/directionAwareCubeGallery'

type DirectionAwareCubeGalleryProps = {
  items?: readonly DirectionAwareCubeGalleryItem[]
  label?: string
  className?: string
}

function DirectionAwareCubeTile({ item }: { item: DirectionAwareCubeGalleryItem }) {
  const tileRef = useRef<HTMLLIElement>(null)

  const setFlip = (event: React.PointerEvent<HTMLLIElement>, phase: 'in' | 'out') => {
    const tile = tileRef.current
    if (!tile) return
    const edge = directionAwareCubeEdge(
      event.clientX,
      event.clientY,
      tile.getBoundingClientRect(),
    )
    tile.dataset.flip = `${phase}-${edge}` satisfies DirectionAwareCubeFlip
  }

  return (
    <li
      ref={tileRef}
      className="theme-dir-cube-gallery__tile"
      onPointerEnter={(event) => setFlip(event, 'in')}
      onPointerLeave={(event) => setFlip(event, 'out')}
    >
      <div className="theme-dir-cube-gallery__inner">
        <div className="theme-dir-cube-gallery__front">
          <img src={item.src} alt={item.alt} loading="lazy" draggable={false} />
        </div>
        <div className="theme-dir-cube-gallery__back">
          <h3 className="theme-dir-cube-gallery__title type-h5">{item.title}</h3>
        </div>
      </div>
    </li>
  )
}

export function DirectionAwareCubeGallery({
  items = DIRECTION_AWARE_CUBE_GALLERY_DEMO_ITEMS,
  label = 'Direction-aware 3D cube gallery',
  className = '',
}: DirectionAwareCubeGalleryProps) {
  if (items.length === 0) return null

  const rootClass = ['theme-dir-cube-gallery', className].filter(Boolean).join(' ')

  return (
    <ul className={rootClass} aria-label={label}>
      {items.map((item) => (
        <DirectionAwareCubeTile key={`${item.src}-${item.title}`} item={item} />
      ))}
    </ul>
  )
}
