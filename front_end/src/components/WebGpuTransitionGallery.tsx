import { useMemo, useRef, type RefObject } from 'react'
import {
  WEBGPU_GALLERY_MAIN_COUNT,
  WEBGPU_GALLERY_SLOT_ASPECTS,
  webGpuGallerySlidesFromPool,
} from '../lib/galleries/webGpuTransitionGallery/constants'
import type { WebGpuGalleryImage } from '../lib/galleries/webGpuTransitionGallery/types'
import {
  useWebGpuTransitionGallery,
  type WebGpuGalleryIntro,
  type WebGpuGalleryView,
} from '../hooks/useWebGpuTransitionGallery'
import { Card } from './Card'
import { ButtonGroup } from './ButtonGroup'
import { Button } from './Button'
import { ContentLoadOverlay } from './Loader'

export type WebGpuTransitionGalleryImage = {
  src: string
  alt: string
  title?: string
  text?: string
}

type WebGpuTransitionGalleryProps = {
  images: readonly WebGpuTransitionGalleryImage[]
  label?: string
  className?: string
  /** Opt-in full-stage image loader that morphs into the first gallery slot. */
  intro?: WebGpuGalleryIntro
  /** Dummy 0→90 progress duration while the engine boots (loader-morph only). */
  dummyDurationMs?: number
  debug?: boolean
}

function resolveSlotAspect(index: number, aspects: readonly number[]) {
  return aspects[index] ?? WEBGPU_GALLERY_SLOT_ASPECTS[index] ?? 0.75
}

function WebGpuGalleryPageView({
  view,
  slides,
  slotAspects,
  registerPageEl,
  innerScrollRef,
  attachInnerScroll,
  onSelectInner,
  interactive,
}: {
  view: WebGpuGalleryView
  slides: readonly WebGpuGalleryImage[]
  slotAspects: readonly number[]
  registerPageEl: (key: string, node: HTMLElement | null) => void
  innerScrollRef: RefObject<HTMLDivElement | null>
  attachInnerScroll: boolean
  onSelectInner: (index: number) => void
  interactive: boolean
}) {
  if (view.page === 'main') {
    return (
      <div
        ref={(node) => registerPageEl(view.key, node)}
        className="theme-webgpu-transition-gallery__page theme-webgpu-transition-gallery__page--main"
        data-page="main"
      >
        <h2 className="theme-webgpu-transition-gallery__page-title type-overline type-muted">Selected</h2>
        {slides.map((slide, index) => (
          <div
            key={slide.src}
            role="button"
            tabIndex={interactive ? 0 : -1}
            className={[
              'theme-webgpu-transition-gallery__slot',
              `theme-webgpu-transition-gallery__slot--${index}`,
            ].join(' ')}
            data-index={index}
            style={{ aspectRatio: String(resolveSlotAspect(index, slotAspects)) }}
            aria-label={`Open ${slide.caption}`}
            aria-disabled={!interactive || undefined}
            onClick={() => {
              if (!interactive) return
              onSelectInner(index)
            }}
            onKeyDown={(event) => {
              if (!interactive) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectInner(index)
              }
            }}
          >
            <span className="theme-webgpu-transition-gallery__slot-caption type-caption">{slide.caption}</span>
          </div>
        ))}
      </div>
    )
  }

  if (view.page === 'index') {
    return (
      <div
        ref={(node) => registerPageEl(view.key, node)}
        className="theme-webgpu-transition-gallery__page theme-webgpu-transition-gallery__page--index"
        data-page="index"
      >
        <h2 className="theme-webgpu-transition-gallery__page-title type-overline type-muted">Index</h2>
        <p className="theme-webgpu-transition-gallery__index-hint type-caption type-muted">
          Drag to orbit the constellation
        </p>
      </div>
    )
  }

  const imageIndex = view.imageIndex ?? 0
  const slide = slides[imageIndex]!
  const cellAspect = resolveSlotAspect(imageIndex, slotAspects)

  return (
    <div
      ref={(node) => registerPageEl(view.key, node)}
      className="theme-webgpu-transition-gallery__page theme-webgpu-transition-gallery__page--inner"
      data-page="inner"
      data-image={imageIndex}
    >
      <div
        ref={attachInnerScroll ? innerScrollRef : undefined}
        className="theme-webgpu-transition-gallery__inner-scroll"
      >
        <h2 className="theme-webgpu-transition-gallery__page-title type-overline type-muted">Inner</h2>
        <p className="theme-webgpu-transition-gallery__inner-fact type-body-sm">{slide.fact}</p>
        <div
          className="theme-webgpu-transition-gallery__stack"
          style={{ ['--cell-aspect' as string]: String(cellAspect) }}
        >
          {Array.from({ length: 1 + 4 }, (_, slotIndex) => (
            <div
              key={slotIndex}
              className="theme-webgpu-transition-gallery__slot theme-webgpu-transition-gallery__slot--stack"
              style={{ aspectRatio: String(cellAspect) }}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function WebGpuTransitionGallery({
  images,
  label = 'WebGPU transition gallery',
  className = '',
  intro = 'none',
  dummyDurationMs,
  debug = false,
}: WebGpuTransitionGalleryProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const slides = useMemo(() => webGpuGallerySlidesFromPool(images), [images])
  const hero = slides[0]
  const {
    unsupported,
    loading,
    loadLabel,
    slotAspects,
    mutating,
    views,
    activeNav,
    innerScrollRef,
    registerPageEl,
    registerLoaderEl,
    goMain,
    goIndex,
    goInner,
    loaderPhase,
    loaderProgress,
    interactive,
  } = useWebGpuTransitionGallery({
    hostRef,
    images: slides,
    intro,
    dummyDurationMs,
    debug,
  })

  if (images.length < WEBGPU_GALLERY_MAIN_COUNT) return null

  const loaderMorph = intro === 'loader-morph'
  const showLoaderOverlay =
    loaderMorph &&
    hero &&
    (loaderPhase === 'loading' || loaderPhase === 'handoff' || loaderPhase === 'morphing')
  const chromeHidden = loaderMorph && !interactive

  return (
    <div className={['theme-webgpu-transition-gallery-wrap', className].filter(Boolean).join(' ')}>
      <div className="theme-gallery__stage-wrap">
        <Card variant="flat" shadowVariant="none" className="theme-webgpu-transition-gallery__card">
          <div
            ref={hostRef}
            className={[
              'theme-webgpu-transition-gallery',
              loaderMorph ? 'theme-webgpu-transition-gallery--loader-morph' : '',
              chromeHidden ? 'theme-webgpu-transition-gallery--intro' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-lenis-prevent-wheel=""
            aria-label={label}
            aria-busy={loading || mutating || undefined}
          >
            <nav
              className="theme-webgpu-transition-gallery__nav"
              aria-label="Gallery modes"
              hidden={chromeHidden || undefined}
            >
              <ButtonGroup variant="compact" groupOutline="muted" aria-label="Gallery modes">
                <Button
                  variant="inset"
                  size="xs"
                  labelAnim={false}
                  active={activeNav === 'main'}
                  aria-pressed={activeNav === 'main'}
                  disabled={mutating || !interactive}
                  onClick={goMain}
                >
                  Selected
                </Button>
                <Button
                  variant="inset"
                  size="xs"
                  labelAnim={false}
                  active={activeNav === 'index'}
                  aria-pressed={activeNav === 'index'}
                  disabled={mutating || !interactive}
                  onClick={goIndex}
                >
                  Index
                </Button>
              </ButtonGroup>
            </nav>

            <footer
              className="theme-webgpu-transition-gallery__footer type-caption"
              hidden={chromeHidden || undefined}
            >
              <div className="theme-webgpu-transition-gallery__footer-links">
                {slides.map((slide, index) => (
                  <button
                    key={slide.src}
                    type="button"
                    className="theme-webgpu-transition-gallery__footer-link type-label"
                    onClick={() => goInner(index)}
                    disabled={mutating || !interactive}
                  >
                    {slide.caption}
                  </button>
                ))}
              </div>
            </footer>

            <div className="theme-webgpu-transition-gallery__stage">
              {unsupported ? (
                <p className="theme-webgpu-transition-gallery__state type-body-sm type-muted" role="status">
                  WebGPU is not available in this browser — try Chrome or Edge on desktop.
                </p>
              ) : (
                views.map((view, index) => (
                  <WebGpuGalleryPageView
                    key={view.key}
                    view={view}
                    slides={slides}
                    slotAspects={slotAspects}
                    registerPageEl={registerPageEl}
                    innerScrollRef={innerScrollRef}
                    attachInnerScroll={view.page === 'inner' && index === views.length - 1}
                    onSelectInner={goInner}
                    interactive={interactive}
                  />
                ))
              )}
            </div>

            {showLoaderOverlay && hero ? (
              <div
                ref={registerLoaderEl}
                className="theme-webgpu-transition-gallery__loader"
                aria-live="polite"
                aria-busy={loaderPhase !== 'morphing'}
              >
                <img
                  className="theme-webgpu-transition-gallery__loader-image"
                  src={hero.src}
                  alt={hero.alt}
                  draggable={false}
                />
                <div className="theme-webgpu-transition-gallery__loader-meter">
                  <p className="theme-webgpu-transition-gallery__loader-label type-label">
                    {unsupported ? 'Fallback ready' : 'Loading image'}
                  </p>
                  <p className="theme-webgpu-transition-gallery__loader-progress type-display-sm">
                    {loaderProgress}
                  </p>
                </div>
              </div>
            ) : null}

            {!loaderMorph ? <ContentLoadOverlay loading={loading} label={loadLabel} /> : null}
          </div>
        </Card>
      </div>
    </div>
  )
}
