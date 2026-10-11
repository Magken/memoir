import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { GalleryExpandItem, GalleryExpandVariant } from '../lib/galleries/galleryExpand'
import {
  createSpiralGalleryEngine,
  resolveSpiralGalleryVanishBand,
  type SpiralGalleryLayoutConfig,
  type SpiralGallerySourceImage,
  type SpiralGalleryTilt,
  type SpiralGalleryTiltControl,
  type SpiralGalleryVanishing,
} from '../lib/galleries/spiralGallery'
import { DEFAULT_LOADER_LABEL, formatLoadingProgress } from '../lib/loaders/loaderVariants'
import { GalleryExpandOverlay } from './GalleryExpandOverlay'
import { ContentLoadOverlay } from './Loader'

export type { GalleryExpandVariant } from '../lib/galleries/galleryExpand'
export type SpiralGalleryImage = SpiralGallerySourceImage
export type {
  SpiralGalleryTilt,
  SpiralGalleryTiltControl,
  SpiralGalleryVanishing,
} from '../lib/galleries/spiralGallery'

export type SpiralGalleryProps = {
  images: readonly SpiralGalleryImage[]
  label?: string
  className?: string
  layout?: Partial<SpiralGalleryLayoutConfig>
  expandVariant?: GalleryExpandVariant
  /** Top/bottom edge fade — `true` default; `false` off; number = band fraction of stage height. */
  vanishing?: SpiralGalleryVanishing
  /** `drag` — pointer / two-finger tilt; `prop` — use `tilt`; `auto` — scroll-linked drift. */
  tiltControl?: SpiralGalleryTiltControl
  /** Radian tilt offset when `tiltControl="prop"`. */
  tilt?: SpiralGalleryTilt
  debug?: boolean
}

export function SpiralGallery({
  images,
  label = 'Spiral gallery',
  className = '',
  layout,
  expandVariant = 'detail',
  vanishing = true,
  tiltControl = 'auto',
  tilt,
  debug = false,
}: SpiralGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const expandedItemRef = useRef<GalleryExpandItem | null>(null)
  const tiltControlRef = useRef(tiltControl)
  const tiltRef = useRef(tilt)
  const [loading, setLoading] = useState(true)
  const [loadLabel, setLoadLabel] = useState(DEFAULT_LOADER_LABEL)
  const [expandedItem, setExpandedItem] = useState<GalleryExpandItem | null>(null)

  expandedItemRef.current = expandedItem
  tiltControlRef.current = tiltControl
  tiltRef.current = tilt

  const vanishBand = useMemo(() => resolveSpiralGalleryVanishBand(vanishing), [vanishing])
  const vanishingOn = vanishBand !== null

  const rootStyle = useMemo((): CSSProperties | undefined => {
    if (vanishBand === null) return undefined
    return { '--theme-spiral-vanish': `${vanishBand * 100}%` } as CSSProperties
  }, [vanishBand])

  const closeExpanded = useCallback(() => {
    setExpandedItem(null)
  }, [])

  useEffect(() => {
    if (expandedItem === null) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeExpanded()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeExpanded, expandedItem])

  useEffect(() => {
    const root = rootRef.current
    const host = canvasHostRef.current
    if (!root || !host || images.length === 0) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setLoading(true)
    setLoadLabel(DEFAULT_LOADER_LABEL)

    const engine = createSpiralGalleryEngine(
      host,
      root,
      {
        images,
        layout,
        reducedMotion,
        debug,
      },
      {
        onLoadProgress: (loaded, total) => {
          setLoadLabel(formatLoadingProgress(loaded, total))
        },
        onReady: () => {
          setLoading(false)
          if (debug) console.debug('[SpiralGallery] ready')
        },
        onImageClick: (item) => setExpandedItem(item),
        onDragBeyondClick: () => {
          if (expandedItemRef.current !== null) setExpandedItem(null)
        },
        isInteractionPaused: () => expandedItemRef.current !== null,
        getTiltControl: () => tiltControlRef.current,
        getTilt: () => tiltRef.current ?? {},
      }
    )

    return () => engine.dispose()
  }, [debug, images.length, layout])

  if (images.length === 0) return null

  const rootClass = [
    'theme-spiral-gallery',
    vanishingOn ? 'theme-spiral-gallery--vanishing' : '',
    expandedItem !== null ? 'theme-spiral-gallery--expanded-open' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const expandOverlay =
    expandedItem !== null ? (
      <GalleryExpandOverlay
        key={expandedItem.src}
        item={expandedItem}
        variant={expandVariant}
        onClose={closeExpanded}
      />
    ) : null

  return (
    <div className={rootClass}>
      <div className="theme-gallery__stage-wrap">
        <div
          ref={rootRef}
          className="theme-spiral-gallery__root"
          style={rootStyle}
          aria-label={label}
          role="region"
          tabIndex={0}
          data-lenis-prevent
          data-lenis-prevent-touch
          data-lenis-prevent-wheel
        >
          <div ref={canvasHostRef} className="theme-spiral-gallery__canvas-host" aria-hidden />
          <ContentLoadOverlay loading={loading} label={loadLabel} />
        </div>
        {expandOverlay}
      </div>
    </div>
  )
}
