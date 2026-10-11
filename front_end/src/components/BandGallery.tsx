import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GalleryExpandItem, GalleryExpandVariant } from '../lib/galleries/galleryExpand'
import {
  BAND_GALLERY_DEFAULT_BAND_CONFIGS,
  BAND_GALLERY_DEFAULT_IMAGES_PER_BAND,
  createBandGalleryEngine,
  distributeBandGallerySlots,
  type BandGalleryBandConfig,
  type BandGalleryEngine,
  type BandGallerySourceImage,
} from '../lib/galleries/bandGallery'
import { useBandGalleryPageBottomWheel } from '../hooks/useBandGalleryPageBottomWheel'
import { useLenisScrollContextOptional } from '../hooks/lenisScrollContext'
import { DEFAULT_LOADER_LABEL, formatLoadingProgress } from '../lib/loaders/loaderVariants'
import { GalleryExpandOverlay } from './GalleryExpandOverlay'
import { ContentLoadOverlay } from './Loader'

export type { GalleryExpandVariant } from '../lib/galleries/galleryExpand'
export type BandGalleryImage = BandGallerySourceImage

export type BandGalleryWheelNav = boolean | 'page-bottom'

export type BandGalleryProps = {
  images: readonly BandGalleryImage[]
  label?: string
  className?: string
  /** Images per band — ref default `[8, 12, 9, 13, 14, 10, 9, 13]` */
  imagesPerBand?: readonly number[]
  /** Per-band scroll speed, curve, rotation — ref default 8-band stack */
  bandConfigs?: readonly BandGalleryBandConfig[]
  /** Tap-expand layout — shared with ImageDragCarousel / OrbitalGallery */
  expandVariant?: GalleryExpandVariant
  /**
   * `true` — wheel pans on the gallery root.
   * `false` — drag / touch / keys only.
   * `'page-bottom'` — wheel down pans only when Lenis is at page bottom; wheel up always scrolls the page.
   */
  wheelNav?: BandGalleryWheelNav
  debug?: boolean
}

export function BandGallery({
  images,
  label = 'Band gallery',
  className = '',
  imagesPerBand = BAND_GALLERY_DEFAULT_IMAGES_PER_BAND,
  bandConfigs = BAND_GALLERY_DEFAULT_BAND_CONFIGS,
  expandVariant = 'detail',
  wheelNav = true,
  debug = false,
}: BandGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BandGalleryEngine | null>(null)
  const expandedItemRef = useRef<GalleryExpandItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadLabel, setLoadLabel] = useState(DEFAULT_LOADER_LABEL)
  const [expandedItem, setExpandedItem] = useState<GalleryExpandItem | null>(null)
  const lenis = useLenisScrollContextOptional()?.lenis ?? null
  const engineWheelNav = wheelNav === true

  expandedItemRef.current = expandedItem

  const isInteractionPaused = useCallback(() => expandedItemRef.current !== null, [])

  const { urls: bandImageUrls, items: bandSlotItems } = useMemo(
    () => distributeBandGallerySlots(images, imagesPerBand),
    [images, imagesPerBand],
  )

  const closeExpanded = useCallback(() => {
    setExpandedItem(null)
  }, [])

  useBandGalleryPageBottomWheel({
    enabled: wheelNav === 'page-bottom',
    engineRef,
    lenis,
    isInteractionPaused,
  })

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

    const engine = createBandGalleryEngine(
      host,
      root,
      {
        bandImageUrls,
        bandSlotItems,
        bandConfigs,
        reducedMotion,
        wheelNav: engineWheelNav,
        debug,
      },
      {
        onLoadProgress: (loaded, total) => {
          setLoadLabel(formatLoadingProgress(loaded, total))
        },
        onReady: () => {
          setLoading(false)
          if (debug) console.debug('[BandGallery] ready')
        },
        onImageClick: (item) => setExpandedItem(item),
        onDragBeyondClick: () => {
          if (expandedItemRef.current !== null) setExpandedItem(null)
        },
        isInteractionPaused,
      },
    )

    engineRef.current = engine

    return () => {
      engineRef.current = null
      engine.dispose()
    }
  }, [
    bandConfigs,
    bandImageUrls,
    bandSlotItems,
    debug,
    engineWheelNav,
    images.length,
    isInteractionPaused,
  ])

  if (images.length === 0) return null

  const rootClass = [
    'theme-band-gallery',
    expandedItem !== null ? 'theme-band-gallery--expanded-open' : '',
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

  const lenisPreventWheel = wheelNav === true
  const lenisPreventRoot = wheelNav === true

  return (
    <div className={rootClass}>
      <div className="theme-gallery__stage-wrap">
        <div
          ref={rootRef}
          className="theme-band-gallery__root"
          aria-label={label}
          role="region"
          tabIndex={0}
          {...(lenisPreventRoot ? { 'data-lenis-prevent': true } : undefined)}
          {...(lenisPreventRoot ? { 'data-lenis-prevent-touch': true } : undefined)}
          {...(lenisPreventWheel ? { 'data-lenis-prevent-wheel': true } : undefined)}
        >
          <div ref={canvasHostRef} className="theme-band-gallery__canvas-host" aria-hidden />
          <ContentLoadOverlay loading={loading} label={loadLabel} />
        </div>
        {expandOverlay}
      </div>
    </div>
  )
}
