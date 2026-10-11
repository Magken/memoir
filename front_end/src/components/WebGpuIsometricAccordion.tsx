import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { IsometricPlane } from './IsometricPlane'
import { ImageDragCarousel, type ImageDragCarouselImage } from './ImageDragCarousel'
import { GALLERY_DEMO_IMAGES, galleryDemoImageSrc } from '../lib/galleries/galleryDemoImages'
import { Flip, gsap, ScrollTrigger } from '../lib/gsap'
import { useVisualActivity } from '../hooks/useVisualActivity'
import {
  OFFER_FRAME_HOLD_MS,
  midHasTimedPreview,
  nextOfferFrameIndex,
  offerDesktopLayoutOpen,
  pickExclusiveCopyId,
  pickExclusiveFanId,
} from '../lib/animations/offerAccordionMotion'

export type WebGpuIsometricAccordionImage = {
  src: string
  alt: string
  /** Default `image`. Mid cards may use muted looping `video`. */
  kind?: 'image' | 'video'
  /** Idle still for `kind: 'video'` so the card is never blank before decode. */
  poster?: string
  /** Timestamp WebPs — hover cycles these instead of a decoder. */
  frames?: readonly string[]
}

export type WebGpuIsometricAccordionItem = {
  id: string
  title: string
  /** One-line tease always visible at rest. */
  teaser: ReactNode
  /** Full copy revealed when the row expands. */
  body: ReactNode
  /** Optional control under the body when expanded (e.g. See more). */
  action?: ReactNode
  /**
   * Deck cards — back · mid · front.
   * Pass `null` for back to omit the rear card (mid + front only).
   */
  images: readonly [
    WebGpuIsometricAccordionImage | null,
    WebGpuIsometricAccordionImage,
    WebGpuIsometricAccordionImage,
  ]
}

/** Focus / gallery handoff effects for the accordion data-display modes. */
export type WebGpuIsometricAccordionEffect =
  | 'hover'
  | 'filmstrip'
  | 'flip'
  | 'gallery'
  | 'overlay'
  | 'section'

export const WEBGPU_ISO_ACCORDION_EFFECT_OPTIONS = [
  { value: 'hover', label: 'Hover expand (default)' },
  { value: 'filmstrip', label: 'Focus + filmstrip' },
  { value: 'flip', label: 'Focus + Flip morph' },
  { value: 'gallery', label: 'Mounted drag gallery' },
  { value: 'overlay', label: 'Portal overlay gallery' },
  { value: 'section', label: 'Expand + text/stack browse' },
] as const satisfies ReadonlyArray<{ value: WebGpuIsometricAccordionEffect; label: string }>

type WebGpuIsometricAccordionProps = {
  items?: readonly WebGpuIsometricAccordionItem[]
  /** Gallery handoff effect — cycle from Theme showcase Select. */
  effect?: WebGpuIsometricAccordionEffect
  label?: string
  className?: string
  /** Row index chrome (01, 02…). Default true. */
  showIndex?: boolean
  /**
   * `offer` — Home Scene 03; sizes owned by `vurify-offer-accordion.css` (no type utilities).
   * `default` — numbered showcase (h3 + body-sm + body).
   */
  copyStyle?: 'default' | 'offer'
  /**
   * ThemeScroll (or other) viewport — when set with `effect="hover"`, re-hit-tests the
   * row under the cursor on scroll so expand follows the section without needing a nudge.
   */
  scrollerRef?: RefObject<HTMLElement | null>
  /**
   * When true, rows never expand on coarse/touch or ≤40rem viewports — activation
   * still fires `onItemOpen` (e.g. menu info peel).
   */
  suppressMobileExpand?: boolean
  /**
   * Desktop offer: one illustration fan and hover copy expand. Hover / scroll own
   * illustration follow — never mark every row `--active`.
   */
  alwaysExpanded?: boolean
  /**
   * Keep mid videos on posters (no decoder). Home offer lag probe.
   * Theme gallery leaves this off.
   */
  pauseVideos?: boolean
  /** Fired when a row is clicked for reading (desktop click · See more · mobile tap). */
  onItemOpen?: (itemId: string) => void
}

type IsoAccordionVisualProps = {
  active: boolean
  orientation: 'oblique-left' | 'oblique-right'
  itemId: string
  backImage: WebGpuIsometricAccordionImage | null
  midImage: WebGpuIsometricAccordionImage
  frontImage: WebGpuIsometricAccordionImage
  /** Compact cover-only rail tile (filmstrip / flip inactive). */
  rail?: boolean
  /** Play the mid video (at most one row in the accordion). */
  videoPlaying?: boolean
  scrollerRef?: RefObject<HTMLElement | null>
  onVisibleRatio?: (itemId: string, ratio: number) => void
}

function IsoAccordionMedia({
  image,
  playing = false,
}: {
  image: WebGpuIsometricAccordionImage
  /** Timed preview (video or timestamp stills) — only the chosen row. */
  playing?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frames = image.frames && image.frames.length > 1 ? image.frames : null
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    if (!frames || !playing) {
      setFrameIndex(0)
      return
    }
    for (const src of frames) {
      const preload = new Image()
      preload.src = src
    }
    const timer = window.setInterval(() => {
      setFrameIndex((current) => nextOfferFrameIndex(current, frames.length))
    }, OFFER_FRAME_HOLD_MS)
    return () => window.clearInterval(timer)
  }, [frames, playing])

  useEffect(() => {
    if (image.kind !== 'video') return
    const el = videoRef.current
    if (!el) return

    const clipPreview = () => {
      if (el.currentTime >= VIDEO_PREVIEW_SECONDS) {
        el.currentTime = 0.08
      }
    }

    if (!el.getAttribute('src')) {
      el.src = image.src
    }
    el.preload = 'auto'
    el.muted = true
    el.addEventListener('timeupdate', clipPreview)

    if (!playing) {
      el.pause()
      return () => {
        el.removeEventListener('timeupdate', clipPreview)
      }
    }

    const tryPlay = () => {
      void el.play().catch(() => {})
    }
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryPlay()
    } else {
      el.addEventListener('canplay', tryPlay, { once: true })
    }

    return () => {
      el.removeEventListener('timeupdate', clipPreview)
      el.removeEventListener('canplay', tryPlay)
    }
  }, [image.kind, image.src, playing])

  if (image.kind === 'video') {
    return (
      <span
        className="theme-webgpu-iso-accordion__media theme-webgpu-iso-accordion__media--video"
        data-playing={playing ? 'true' : 'false'}
      >
        {image.poster ? (
          <img
            className="theme-webgpu-iso-accordion__media-poster"
            src={image.poster}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : null}
        <video
          ref={videoRef}
          className="theme-webgpu-iso-accordion__media-player"
          src={image.src}
          muted
          playsInline
          preload="auto"
          poster={image.poster}
          disablePictureInPicture
          aria-hidden
        />
      </span>
    )
  }

  return (
    <img
      className="theme-webgpu-iso-accordion__media theme-webgpu-iso-accordion__media--still"
      src={frames ? (frames[frameIndex] ?? image.src) : image.src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  )
}

function demoImage(index: number, width = 640): WebGpuIsometricAccordionImage {
  const item = GALLERY_DEMO_IMAGES[index % GALLERY_DEMO_IMAGES.length]!
  return {
    src: galleryDemoImageSrc(item.src, width),
    alt: item.alt,
  }
}

const DEFAULT_ITEMS: readonly WebGpuIsometricAccordionItem[] = [
  {
    id: 'craft',
    title: 'Craft',
    teaser: 'Surface, spacing, and motion that feel inevitable.',
    body: 'Shape the surface carefully — spacing, type, and motion that feel inevitable rather than decorative. Every row should read as one clean decision.',
    images: [demoImage(0), demoImage(1), demoImage(2)],
  },
  {
    id: 'proof',
    title: 'Proof',
    teaser: 'Evidence first. Claims second.',
    body: 'Show the work, not the claim. Let evidence lead so the next step is obvious without a sales pitch or decorative noise.',
    images: [demoImage(3), demoImage(4), demoImage(5)],
  },
  {
    id: 'signal',
    title: 'Signal',
    teaser: 'Brand loud. Meaning clear.',
    body: 'Keep the brand loud enough to own the viewport, then let one clear supporting line carry the meaning through the expand.',
    images: [demoImage(6), demoImage(7), demoImage(8)],
  },
  {
    id: 'expand',
    title: 'Expand',
    teaser: 'Hover opens the story under the title.',
    body: 'The active row grows to reveal the full passage. Neighbors stay compact with a single hairline separator — no framed cards, no blur.',
    images: [demoImage(9), demoImage(10), demoImage(1)],
  },
]

const FOLLOW_MOVE_DURATION = 0.38
const FOLLOW_REST_DURATION = 0.78
const FLIP_DURATION = 0.55
/** Preview loop — keep source quality; only replay the opening beat. */
const VIDEO_PREVIEW_SECONDS = 4
/** Intersection fallback — ScrollTrigger zone is preferred on coarse pointers. */
const VIDEO_PLAY_MIN_RATIO = 0.12
/** Coarse/touch: play when the row crosses this viewport line. */
const VIDEO_SCROLL_START = 'top 72%'
const VIDEO_SCROLL_END = 'bottom 28%'

function formatIndex(index: number) {
  return String(index + 1).padStart(2, '0')
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function applyFollowVars(el: HTMLElement, x: number, y: number) {
  el.style.setProperty('--iso-follow-x', x.toFixed(3))
  el.style.setProperty('--iso-follow-y', y.toFixed(3))
}

function isClickEffect(effect: WebGpuIsometricAccordionEffect) {
  return effect !== 'hover'
}

function prefersFineHover() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  )
}

function prefersMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 40rem)').matches
}

function isFilmstripLayout(effect: WebGpuIsometricAccordionEffect) {
  return effect === 'filmstrip' || effect === 'flip'
}

function pickVisibleVideoId(
  items: readonly WebGpuIsometricAccordionItem[],
  ratios: Map<string, number>,
) {
  let bestId: string | null = null
  let best = VIDEO_PLAY_MIN_RATIO
  for (const item of items) {
    if (!midHasTimedPreview(item.images[1])) continue
    const ratio = ratios.get(item.id) ?? 0
    if (ratio > best) {
      best = ratio
      bestId = item.id
    }
  }
  return bestId
}

type IsoAccordionSectionBrowseProps = {
  items: readonly WebGpuIsometricAccordionItem[]
  focusId: string
  label: string
  onBack: () => void
}

export type IsoAccordionVisualFollowHandle = {
  /** Map pointer to the stack — call from the whole row (copy + images). */
  followPointer: (clientX: number, clientY: number) => void
  resetFollow: () => void
}

/**
 * Right-column deck: soft pointer follow.
 * Follow is driven from the row article (copy + visual) via `followPointer`, so the stack
 * tracks while the cursor is over text too. Deck stays pointer-events: none.
 */
const IsoAccordionVisual = forwardRef<IsoAccordionVisualFollowHandle, IsoAccordionVisualProps>(
  function IsoAccordionVisual(
    {
      active,
      orientation,
      itemId,
      backImage,
      midImage,
      frontImage,
      rail = false,
      videoPlaying = false,
      scrollerRef,
      onVisibleRatio,
    },
    ref,
  ) {
    const visualRef = useRef<HTMLDivElement>(null)
    const current = useRef({ x: 0, y: 0 })
    const tweenRef = useRef<gsap.core.Tween | null>(null)
    const wasActiveRef = useRef(false)
    const visuallyActive = useVisualActivity(visualRef, {
      enabled: !rail,
      rootRef: scrollerRef,
      checkPainted: false,
    })

    useEffect(() => {
      if (rail || !midHasTimedPreview(midImage) || !onVisibleRatio) return

      let cancelled = false
      let attempts = 0
      let frameId = 0
      let io: IntersectionObserver | null = null

      const bind = () => {
        if (cancelled) return
        const el = visualRef.current
        const root = scrollerRef?.current ?? null
        if (!el || (scrollerRef && !root)) {
          attempts += 1
          if (attempts < 48) frameId = requestAnimationFrame(bind)
          return
        }
        io = new IntersectionObserver(
          ([entry]) => {
            onVisibleRatio(itemId, entry?.isIntersecting ? entry.intersectionRatio : 0)
          },
          { root, threshold: [0, 0.12, 0.22, 0.35, 0.5, 0.7, 1] },
        )
        io.observe(el)
      }

      bind()
      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
        io?.disconnect()
        onVisibleRatio(itemId, 0)
      }
    }, [itemId, midImage.kind, onVisibleRatio, rail, scrollerRef])

    const paintFollow = () => {
      const el = visualRef.current
      if (!el) return
      applyFollowVars(el, current.current.x, current.current.y)
    }

    const tweenFollowTo = (x: number, y: number, duration: number) => {
      const el = visualRef.current
      if (!el) return

      tweenRef.current?.kill()
      tweenRef.current = null

      if (prefersReducedMotion() || duration <= 0 || rail) {
        current.current.x = x
        current.current.y = y
        paintFollow()
        return
      }

      tweenRef.current = gsap.to(current.current, {
        x,
        y,
        duration,
        ease: 'power3.out',
        onUpdate: paintFollow,
        onComplete: () => {
          current.current.x = x
          current.current.y = y
          paintFollow()
          tweenRef.current = null
        },
      })
    }

    const resetFollow = (duration = FOLLOW_REST_DURATION) => {
      tweenFollowTo(0, 0, duration)
    }

    const followPointer = (clientX: number, clientY: number) => {
      if (rail || !visuallyActive) return
      const el = visualRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const x = ((clientX - rect.left) / rect.width) * 2 - 1
      const y = ((clientY - rect.top) / rect.height) * 2 - 1
      tweenFollowTo(
        Math.max(-1, Math.min(1, x)),
        Math.max(-1, Math.min(1, -y)),
        FOLLOW_MOVE_DURATION,
      )
    }

    useImperativeHandle(ref, () => ({ followPointer, resetFollow }), [rail, visuallyActive])

    useEffect(() => {
      if (active) {
        wasActiveRef.current = true
        return
      }
      if (!wasActiveRef.current) return
      wasActiveRef.current = false
      resetFollow()
    }, [active])

    useEffect(() => {
      return () => {
        tweenRef.current?.kill()
        tweenRef.current = null
      }
    }, [])

    return (
      <div
        ref={visualRef}
        className="theme-webgpu-iso-accordion__visual"
        aria-hidden="true"
        data-rail={rail ? 'true' : undefined}
        data-deck={backImage ? 'stack' : 'pair'}
        data-in-view={visuallyActive ? 'true' : 'false'}
      >
        <div className="theme-webgpu-iso-accordion__deck">
          {backImage ? (
            <div
              className="theme-webgpu-iso-accordion__card theme-webgpu-iso-accordion__card--back"
              data-flip-id={`${itemId}-back`}
              data-media-kind={backImage.kind ?? 'image'}
            >
              <IsometricPlane orientation={orientation} className="theme-webgpu-iso-accordion__plane">
                <IsoAccordionMedia image={backImage} playing={videoPlaying} />
              </IsometricPlane>
            </div>
          ) : null}
          <div
            className="theme-webgpu-iso-accordion__card theme-webgpu-iso-accordion__card--mid"
            data-flip-id={`${itemId}-mid`}
            data-media-kind={midImage.kind ?? 'image'}
            data-video-playing={midImage.kind === 'video' && videoPlaying ? 'true' : undefined}
          >
            <IsometricPlane orientation={orientation} className="theme-webgpu-iso-accordion__plane">
              <IsoAccordionMedia image={midImage} playing={videoPlaying && visuallyActive} />
            </IsometricPlane>
          </div>
          <div
            className="theme-webgpu-iso-accordion__card theme-webgpu-iso-accordion__card--front"
            data-flip-id={`${itemId}-front`}
            data-media-kind={frontImage.kind ?? 'image'}
          >
            <IsometricPlane orientation={orientation} className="theme-webgpu-iso-accordion__plane">
              <IsoAccordionMedia image={frontImage} />
            </IsometricPlane>
          </div>
        </div>
      </div>
    )
  },
)

/**
 * Section expand stage — centered thrice-stack, hover fans into a seamless
 * horizontal text | stack gallery (no divider from the expanded row).
 */
function IsoAccordionSectionBrowse({
  items,
  focusId,
  label,
  onBack,
}: IsoAccordionSectionBrowseProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [browsing, setBrowsing] = useState(false)
  const focusIndex = Math.max(
    0,
    items.findIndex((item) => item.id === focusId),
  )
  const focusItem = items[focusIndex] ?? items[0]!
  const [backImage, midImage, frontImage] = focusItem.images

  useEffect(() => {
    if (!browsing) return
    const scroller = scrollerRef.current
    if (!scroller) return
    const slide = scroller.querySelector<HTMLElement>(`[data-slide-id="${focusId}"]`)
    if (!slide) return
    scroller.scrollTo({
      left: slide.offsetLeft,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [browsing, focusId])

  const scrollBySlide = (direction: -1 | 1) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const amount = scroller.clientWidth * direction
    scroller.scrollBy({
      left: amount,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  return (
    <div
      className="theme-webgpu-iso-accordion__section-browse"
      data-browsing={browsing ? 'true' : 'false'}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header className="theme-webgpu-iso-accordion__section-browse-bar">
        <button
          type="button"
          className="theme-webgpu-iso-accordion__section-browse-back type-body-sm"
          onClick={onBack}
        >
          Back
        </button>
        {browsing ? (
          <div className="theme-webgpu-iso-accordion__section-browse-nav">
            <button
              type="button"
              className="theme-webgpu-iso-accordion__section-browse-arrow type-body-sm"
              aria-label="Previous slide"
              onClick={() => scrollBySlide(-1)}
            >
              Prev
            </button>
            <button
              type="button"
              className="theme-webgpu-iso-accordion__section-browse-arrow type-body-sm"
              aria-label="Next slide"
              onClick={() => scrollBySlide(1)}
            >
              Next
            </button>
          </div>
        ) : (
          <p className="theme-webgpu-iso-accordion__section-browse-hint type-caption type-muted">
            Hover the stack to browse
          </p>
        )}
      </header>

      <div
        className="theme-webgpu-iso-accordion__section-hero"
        onPointerEnter={() => setBrowsing(true)}
        onFocusCapture={() => setBrowsing(true)}
      >
        <IsoAccordionVisual
          active
          orientation="oblique-left"
          itemId={`${focusItem.id}-hero`}
          backImage={backImage}
          midImage={midImage}
          frontImage={frontImage}
        />
      </div>

      <div
        ref={scrollerRef}
        className="theme-webgpu-iso-accordion__section-scroller"
        role="region"
        aria-label={`${label} browse gallery`}
        tabIndex={browsing ? 0 : -1}
        aria-hidden={!browsing}
      >
        {items.map((item, index) => {
          const [slideBack, slideMid, slideFront] = item.images
          const orientation = index % 2 === 0 ? 'oblique-left' : 'oblique-right'
          return (
            <article
              key={item.id}
              className="theme-webgpu-iso-accordion__section-slide"
              data-slide-id={item.id}
              data-layout={index % 2 === 0 ? 'copy-left' : 'copy-right'}
            >
              <div className="theme-webgpu-iso-accordion__section-slide-copy">
                <p className="theme-webgpu-iso-accordion__section-slide-index type-caption">
                  {formatIndex(index)}
                </p>
                <h3 className="theme-webgpu-iso-accordion__section-slide-title type-h3">
                  {item.title}
                </h3>
                <p className="theme-webgpu-iso-accordion__section-slide-body type-body type-muted">
                  {item.body}
                </p>
              </div>
              <IsoAccordionVisual
                active
                orientation={orientation}
                itemId={`${item.id}-slide`}
                backImage={slideBack}
                midImage={slideMid}
                frontImage={slideFront}
              />
            </article>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Showcase rows — numbered copy + oblique isometric card stack.
 * `effect` switches hover expand vs click-focus gallery handoffs (filmstrip / Flip / mounted
 * carousel / portal overlay / expand-with-in-row gallery). WebGPU transition stays reserved.
 */
type IsoAccordionRowArticleProps = {
  item: WebGpuIsometricAccordionItem
  index: number
  isActive: boolean
  rail: boolean
  collapsed: boolean
  planeOrientation: 'oblique-left' | 'oblique-right'
  titleId: string
  teaserId: string
  bodyId: string
  showIndex: boolean
  copyStyle: 'default' | 'offer'
  videoPlaying: boolean
  /** Copy body open — exclusive on desktop offer; matches `isActive` elsewhere. */
  textExpanded: boolean
  scrollerRef?: RefObject<HTMLElement | null>
  onVisibleRatio?: (itemId: string, ratio: number) => void
  onClick: () => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
}

function IsoAccordionRowArticle({
  item,
  index,
  isActive,
  rail,
  collapsed,
  planeOrientation,
  titleId,
  teaserId,
  bodyId,
  showIndex,
  copyStyle,
  videoPlaying,
  textExpanded,
  scrollerRef,
  onVisibleRatio,
  onClick,
  onKeyDown,
}: IsoAccordionRowArticleProps) {
  const followRef = useRef<IsoAccordionVisualFollowHandle>(null)
  const [backImage, midImage, frontImage] = item.images
  const titleClass =
    copyStyle === 'offer'
      ? 'theme-webgpu-iso-accordion__title'
      : 'theme-webgpu-iso-accordion__title type-h3'
  const teaserClass =
    copyStyle === 'offer'
      ? 'theme-webgpu-iso-accordion__teaser'
      : 'theme-webgpu-iso-accordion__teaser type-body-sm type-muted'
  const bodyClass =
    copyStyle === 'offer'
      ? 'theme-webgpu-iso-accordion__body'
      : 'theme-webgpu-iso-accordion__body type-body type-muted'

  return (
    <article
      className="theme-webgpu-iso-accordion__article"
      tabIndex={0}
      aria-labelledby={titleId}
      aria-describedby={rail || collapsed ? undefined : `${teaserId} ${bodyId}`}
      aria-expanded={textExpanded}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onPointerMove={(event) => {
        if (rail || collapsed) return
        followRef.current?.followPointer(event.clientX, event.clientY)
      }}
      onPointerLeave={() => {
        if (rail || collapsed) return
        followRef.current?.resetFollow()
      }}
    >
      {!rail ? (
        <div className="theme-webgpu-iso-accordion__copy">
          <header className="theme-webgpu-iso-accordion__head">
            {showIndex ? (
              <span className="theme-webgpu-iso-accordion__index type-caption" aria-hidden="true">
                {formatIndex(index)}
              </span>
            ) : null}
            <h3 id={titleId} className={titleClass}>
              {item.title}
            </h3>
          </header>
          {!collapsed ? (
            <>
              <p id={teaserId} className={teaserClass}>
                {item.teaser}
              </p>
              <div className="theme-webgpu-iso-accordion__detail">
                <div className="theme-webgpu-iso-accordion__detail-inner">
                  <p id={bodyId} className={bodyClass}>
                    {item.body}
                  </p>
                  {item.action ? (
                    <div className="theme-webgpu-iso-accordion__action">{item.action}</div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <span id={titleId} className="theme-webgpu-iso-accordion__rail-label type-caption">
          {item.title}
        </span>
      )}

      {!collapsed ? (
        <IsoAccordionVisual
          ref={followRef}
          active={isActive}
          orientation={planeOrientation}
          itemId={item.id}
          backImage={backImage}
          midImage={midImage}
          frontImage={frontImage}
          rail={rail}
          videoPlaying={videoPlaying}
          scrollerRef={scrollerRef}
          onVisibleRatio={onVisibleRatio}
        />
      ) : null}
    </article>
  )
}

export function WebGpuIsometricAccordion({
  items = DEFAULT_ITEMS,
  effect = 'hover',
  label = 'WebGPU isometric accordion',
  className,
  showIndex = true,
  copyStyle = 'default',
  scrollerRef,
  suppressMobileExpand = false,
  alwaysExpanded = false,
  pauseVideos = false,
  onItemOpen,
}: WebGpuIsometricAccordionProps) {
  const groupId = useId().replace(/:/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const flipStateRef = useRef<Flip.FlipState | null>(null)
  const pointerRef = useRef({ x: 0, y: 0, inside: false })
  const copyScrollLockRef = useRef(false)
  const copyScrollUnlockRef = useRef(0)
  const videoRatioRef = useRef(new Map<string, number>())
  const videoScrollZoneRef = useRef(new Set<string>())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [fineHover, setFineHover] = useState(() => prefersFineHover())
  const [compactViewport, setCompactViewport] = useState(() => prefersMobileViewport())
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion())
  const [videoPlayId, setVideoPlayId] = useState<string | null>(null)
  const [exclusiveCopyId, setExclusiveCopyId] = useState<string | null>(null)
  const [pointerCopyId, setPointerCopyId] = useState<string | null>(null)
  const layoutOpen = offerDesktopLayoutOpen({
    alwaysExpanded,
    suppressMobileExpand,
    fineHover,
    compactViewport,
  })
  const layoutOpenRef = useRef(layoutOpen)
  layoutOpenRef.current = layoutOpen
  const copyOpenId = layoutOpen ? (pointerCopyId ?? exclusiveCopyId) : null
  const fanOpenId = layoutOpen ? pickExclusiveFanId(hoverId, exclusiveCopyId) : activeId
  const focused = activeId !== null
  const clickMode = isClickEffect(effect)
  const sectionMode = effect === 'section'
  const filmstrip = isFilmstripLayout(effect) && focused

  const siblingGalleryImages = useMemo((): readonly ImageDragCarouselImage[] => {
    if (!activeId) return []
    return items
      .filter((item) => item.id !== activeId)
      .flatMap((item) =>
        item.images.flatMap((image, imageIndex) => {
          if (!image || image.kind === 'video') return []
          return [
            {
              src: image.src,
              alt: image.alt,
              title: `${item.title} · ${formatIndex(imageIndex)}`,
            },
          ]
        }),
      )
  }, [activeId, items])

  const overlaySiblings = useMemo(() => {
    if (!activeId) return []
    return items.filter((item) => item.id !== activeId)
  }, [activeId, items])

  useEffect(() => {
    const hoverMq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const compactMq = window.matchMedia('(max-width: 40rem)')
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      setFineHover(hoverMq.matches)
      setCompactViewport(compactMq.matches)
      setReducedMotion(motionMq.matches)
    }
    sync()
    hoverMq.addEventListener('change', sync)
    compactMq.addEventListener('change', sync)
    motionMq.addEventListener('change', sync)
    return () => {
      hoverMq.removeEventListener('change', sync)
      compactMq.removeEventListener('change', sync)
      motionMq.removeEventListener('change', sync)
    }
  }, [])

  /**
   * Desktop offer: most-visible row owns the illustration fan (and copy) when
   * there is no hover.
   */
  useEffect(() => {
    if (!layoutOpen) {
      setExclusiveCopyId(null)
      setPointerCopyId(null)
      return
    }

    let cancelled = false
    let attempts = 0
    let frameId = 0
    let io: IntersectionObserver | null = null
    const ratios = new Map<string, number>()

    const bind = () => {
      if (cancelled) return
      const root = rootRef.current
      const scroller = scrollerRef?.current ?? null
      if (!root || (scrollerRef && !scroller)) {
        attempts += 1
        if (attempts < 48) frameId = requestAnimationFrame(bind)
        return
      }
      if (typeof IntersectionObserver === 'undefined') return

      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = entry.target.getAttribute('data-item-id')
            if (!id) continue
            ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0)
          }
          setExclusiveCopyId((current) =>
            pickExclusiveCopyId(
              items.map((item) => ({ id: item.id, ratio: ratios.get(item.id) ?? 0 })),
              current,
            ),
          )
        },
        {
          root: scroller,
          threshold: [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
        },
      )

      root.querySelectorAll<HTMLElement>('.theme-webgpu-iso-accordion__row').forEach((row) => {
        io?.observe(row)
      })
    }

    frameId = requestAnimationFrame(bind)

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      io?.disconnect()
    }
  }, [items, layoutOpen, scrollerRef])

  const syncVideoPlayId = useCallback(() => {
    if (pauseVideos) {
      setVideoPlayId((current) => (current === null ? current : null))
      return
    }
    if (reducedMotion || (typeof document !== 'undefined' && document.hidden)) {
      setVideoPlayId((current) => (current === null ? current : null))
      return
    }
    const host = rootRef.current
    if (host?.closest('[aria-hidden="true"]')) {
      setVideoPlayId((current) => (current === null ? current : null))
      return
    }
    if (fineHover) {
      const rowId = layoutOpen ? hoverId : activeId
      if (!rowId) {
        setVideoPlayId((current) => (current === null ? current : null))
        return
      }
      const measured = videoRatioRef.current.get(rowId)
      const inFrame = measured === undefined || measured >= VIDEO_PLAY_MIN_RATIO
      const next = inFrame ? rowId : null
      setVideoPlayId((current) => (current === next ? current : next))
      return
    }
    // Prefer the ScrollTrigger play-zone row; fall back to most-visible IO ratio.
    let chosen: string | null = null
    for (const item of items) {
      if (!midHasTimedPreview(item.images[1])) continue
      if (!videoScrollZoneRef.current.has(item.id)) continue
      chosen = item.id
    }
    if (!chosen) {
      chosen = pickVisibleVideoId(items, videoRatioRef.current)
    }
    setVideoPlayId((current) => (current === chosen ? current : chosen))
  }, [activeId, fineHover, hoverId, items, layoutOpen, pauseVideos, reducedMotion])

  const syncVideoPlayIdRef = useRef(syncVideoPlayId)
  syncVideoPlayIdRef.current = syncVideoPlayId

  useEffect(() => {
    syncVideoPlayId()
  }, [syncVideoPlayId])

  useEffect(() => {
    const onVisibility = () => syncVideoPlayIdRef.current()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  /**
   * Touch / coarse: play mid video when the row scrolls past a fixed viewport
   * anchor. IntersectionObserver ratios fill gaps when the zone is empty.
   */
  useEffect(() => {
    if (pauseVideos || fineHover || reducedMotion) {
      videoScrollZoneRef.current.clear()
      return
    }

    let cancelled = false
    let attempts = 0
    let frameId = 0
    const triggers: ScrollTrigger[] = []

    const bind = () => {
      if (cancelled) return
      const root = rootRef.current
      const scroller = scrollerRef?.current
      if (!root || (scrollerRef && !scroller)) {
        attempts += 1
        if (attempts < 48) frameId = requestAnimationFrame(bind)
        return
      }

      for (const item of items) {
        if (!midHasTimedPreview(item.images[1])) continue
        const row = root.querySelector<HTMLElement>(
          `.theme-webgpu-iso-accordion__row[data-item-id="${item.id}"]`,
        )
        if (!row) continue

        triggers.push(
          ScrollTrigger.create({
            scroller: scroller ?? undefined,
            trigger: row,
            start: VIDEO_SCROLL_START,
            end: VIDEO_SCROLL_END,
            onEnter: () => {
              videoScrollZoneRef.current.add(item.id)
              syncVideoPlayIdRef.current()
            },
            onEnterBack: () => {
              videoScrollZoneRef.current.add(item.id)
              syncVideoPlayIdRef.current()
            },
            onLeave: () => {
              videoScrollZoneRef.current.delete(item.id)
              syncVideoPlayIdRef.current()
            },
            onLeaveBack: () => {
              videoScrollZoneRef.current.delete(item.id)
              syncVideoPlayIdRef.current()
            },
            invalidateOnRefresh: true,
          }),
        )
      }

      ScrollTrigger.refresh()
      syncVideoPlayIdRef.current()
    }

    frameId = requestAnimationFrame(bind)

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      triggers.forEach((trigger) => trigger.kill())
      videoScrollZoneRef.current.clear()
    }
  }, [fineHover, items, pauseVideos, reducedMotion, scrollerRef])

  const onVisibleRatio = useCallback((itemId: string, ratio: number) => {
    videoRatioRef.current.set(itemId, ratio)
    syncVideoPlayIdRef.current()
  }, [])

  useEffect(() => {
    setActiveId(null)
    flipStateRef.current = null
  }, [effect])

  useEffect(() => {
    if (!clickMode || !activeId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clickMode, activeId])

  /**
   * Hover: expand (Theme) or video/follow row (desktop offer). Pointerenter alone
   * misses ThemeScroll: content moves under a still cursor while scrolling.
   */
  const syncHoverFromPoint = () => {
    if (effect !== 'hover' || !prefersFineHover()) return
    if (suppressMobileExpand && prefersMobileViewport()) return
    if (!pointerRef.current.inside) return
    const stack = rootRef.current?.querySelector<HTMLElement>('.theme-webgpu-iso-accordion__stack')
    if (!stack) return

    const { x, y } = pointerRef.current
    const hit = document.elementFromPoint(x, y)
    const setRow = layoutOpenRef.current ? setHoverId : setActiveId
    if (!(hit instanceof Element) || !stack.contains(hit)) {
      setRow((current) => (current === null ? current : null))
      return
    }

    const row = hit.closest<HTMLElement>('.theme-webgpu-iso-accordion__row')
    const nextId = row?.getAttribute('data-item-id') ?? null
    setRow((current) => (current === nextId ? current : nextId))
  }

  useEffect(() => {
    if (effect !== 'hover') return

    let cancelled = false
    let attempts = 0
    let frameId = 0
    let attached: HTMLElement | null = null

    const onScrollOrResize = () => {
      syncHoverFromPoint()
      if (!layoutOpenRef.current) return
      copyScrollLockRef.current = true
      window.clearTimeout(copyScrollUnlockRef.current)
      copyScrollUnlockRef.current = window.setTimeout(() => {
        copyScrollLockRef.current = false
      }, 140)
      setPointerCopyId((current) => (current === null ? current : null))
    }

    const bindScroller = () => {
      if (cancelled) return
      const scroller = scrollerRef?.current ?? null
      if (scrollerRef && !scroller) {
        attempts += 1
        if (attempts < 48) frameId = requestAnimationFrame(bindScroller)
      }
      if (scroller && attached !== scroller) {
        if (attached) attached.removeEventListener('scroll', onScrollOrResize)
        scroller.addEventListener('scroll', onScrollOrResize, { passive: true })
        attached = scroller
      }
    }

    bindScroller()
    window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true })
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      window.clearTimeout(copyScrollUnlockRef.current)
      if (attached) attached.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [effect, scrollerRef])

  useLayoutEffect(() => {
    if (effect !== 'flip' || prefersReducedMotion()) {
      flipStateRef.current = null
      return
    }
    const state = flipStateRef.current
    if (!state) return
    flipStateRef.current = null
    Flip.from(state, {
      duration: FLIP_DURATION,
      ease: 'power2.inOut',
      absolute: true,
      nested: true,
      prune: true,
    })
  }, [activeId, effect])

  const captureFlip = () => {
    if (effect !== 'flip' || prefersReducedMotion()) return
    const root = rootRef.current
    if (!root) return
    flipStateRef.current = Flip.getState(root.querySelectorAll('[data-flip-id]'))
  }

  const activate = (id: string) => {
    captureFlip()
    setActiveId(id)
  }

  const deactivate = () => {
    captureFlip()
    setActiveId(null)
  }

  const toggle = (id: string) => {
    if (activeId === id) deactivate()
    else activate(id)
  }

  const expandSuppressed = () =>
    suppressMobileExpand && (!prefersFineHover() || prefersMobileViewport())

  const onRowPointerEnter = (id: string) => {
    if (effect !== 'hover' || !prefersFineHover() || expandSuppressed()) return
    if (layoutOpenRef.current) {
      setHoverId(id)
      if (!copyScrollLockRef.current) setPointerCopyId(id)
      return
    }
    setActiveId(id)
  }

  const onStackPointerMove = (event: ReactPointerEvent<HTMLUListElement>) => {
    if (effect !== 'hover' || !prefersFineHover() || expandSuppressed()) return
    pointerRef.current = { x: event.clientX, y: event.clientY, inside: true }
    syncHoverFromPoint()
  }

  const onStackPointerEnter = (event: ReactPointerEvent<HTMLUListElement>) => {
    if (effect !== 'hover' || !prefersFineHover() || expandSuppressed()) return
    pointerRef.current = { x: event.clientX, y: event.clientY, inside: true }
    syncHoverFromPoint()
  }

  const onStackPointerLeave = () => {
    if (effect !== 'hover' || !prefersFineHover() || expandSuppressed()) return
    pointerRef.current.inside = false
    if (layoutOpenRef.current) {
      setHoverId(null)
      setPointerCopyId(null)
      return
    }
    setActiveId(null)
  }

  const onArticleClick = (id: string) => {
    if (expandSuppressed()) {
      onItemOpen?.(id)
      return
    }
    if (clickMode) {
      toggle(id)
      return
    }
    if (effect !== 'hover') return
    // Fine pointer: hover expands; click opens the reading peel when wired.
    if (prefersFineHover()) {
      if (!layoutOpenRef.current && activeId !== id) setActiveId(id)
      onItemOpen?.(id)
      return
    }
    toggle(id)
    onItemOpen?.(id)
  }

  const onArticleKeyDown = (event: ReactKeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (!clickMode && effect !== 'hover') return
    event.preventDefault()
    if (expandSuppressed()) {
      onItemOpen?.(id)
      return
    }
    if (effect === 'hover') {
      onItemOpen?.(id)
      if (!prefersFineHover()) toggle(id)
      return
    }
    toggle(id)
  }

  const classes = ['theme-webgpu-iso-accordion', className].filter(Boolean).join(' ')

  return (
    <div
      ref={rootRef}
      className={classes}
      role="region"
      aria-label={label}
      data-webgpu-isometric-accordion="rows"
      data-effect={effect}
      data-mode={focused ? 'focused' : 'rest'}
      data-active={focused ? 'true' : 'false'}
      data-show-index={showIndex ? 'true' : 'false'}
      data-copy-style={copyStyle}
      data-expand={layoutOpen ? 'open' : 'hover'}
    >
      <ul
        className="theme-webgpu-iso-accordion__stack"
        onPointerEnter={onStackPointerEnter}
        onPointerMove={onStackPointerMove}
        onPointerLeave={onStackPointerLeave}
        onBlurCapture={(event) => {
          if (effect !== 'hover' || !prefersFineHover()) return
          const next = event.relatedTarget
          if (next instanceof Node && event.currentTarget.contains(next)) return
          if (layoutOpenRef.current) {
            setHoverId(null)
            setPointerCopyId(null)
          } else {
            setActiveId(null)
          }
        }}
      >
        {items.map((item, index) => {
          const isHoverRow = hoverId === item.id
          const isActive = fanOpenId === item.id
          const rail = filmstrip && !isActive
          const collapsed = sectionMode && focused && !isActive
          const layout = index % 2 === 0 ? 'copy-left' : 'copy-right'
          const planeOrientation = layout === 'copy-right' ? 'oblique-right' : 'oblique-left'
          const titleId = `${groupId}-${item.id}-title`
          const teaserId = `${groupId}-${item.id}-teaser`
          const bodyId = `${groupId}-${item.id}-body`

          return (
            <li
              key={item.id}
              className={[
                'theme-webgpu-iso-accordion__row',
                isActive ? 'theme-webgpu-iso-accordion__row--active' : '',
                rail ? 'theme-webgpu-iso-accordion__row--rail' : '',
                collapsed ? 'theme-webgpu-iso-accordion__row--collapsed' : '',
                sectionMode && isActive ? 'theme-webgpu-iso-accordion__row--section' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-item-id={item.id}
              data-active={isActive ? 'true' : 'false'}
              data-hover={isHoverRow ? 'true' : undefined}
              data-copy={copyOpenId === item.id ? 'open' : undefined}
              data-layout={layout}
              data-rail={rail ? 'true' : undefined}
              data-collapsed={collapsed ? 'true' : undefined}
              onPointerEnter={() => onRowPointerEnter(item.id)}
              onFocusCapture={() => {
                if (effect === 'hover' && prefersFineHover() && !expandSuppressed()) {
                  if (layoutOpenRef.current) {
                    setHoverId(item.id)
                    if (!copyScrollLockRef.current) setPointerCopyId(item.id)
                  } else {
                    setActiveId(item.id)
                  }
                }
              }}
            >
              {sectionMode && isActive ? (
                <IsoAccordionSectionBrowse
                  items={items}
                  focusId={item.id}
                  label={label}
                  onBack={deactivate}
                />
              ) : (
                <IsoAccordionRowArticle
                  item={item}
                  index={index}
                  isActive={isActive}
                  rail={rail}
                  collapsed={collapsed}
                  planeOrientation={planeOrientation}
                  titleId={titleId}
                  teaserId={teaserId}
                  bodyId={bodyId}
                  showIndex={showIndex}
                  copyStyle={copyStyle}
                  videoPlaying={!pauseVideos && !rail && videoPlayId === item.id}
                  textExpanded={isActive}
                  scrollerRef={scrollerRef}
                  onVisibleRatio={onVisibleRatio}
                  onClick={() => onArticleClick(item.id)}
                  onKeyDown={(event) => onArticleKeyDown(event, item.id)}
                />
              )}
            </li>
          )
        })}
      </ul>

      {effect === 'gallery' && focused && siblingGalleryImages.length > 0 ? (
        <div className="theme-webgpu-iso-accordion__mounted-gallery">
          <p className="theme-webgpu-iso-accordion__mounted-label type-overline">Sibling gallery</p>
          <ImageDragCarousel
            images={siblingGalleryImages}
            label={`${label} sibling gallery`}
            showDotNav={false}
            vanishing={false}
            expandVariant="image"
          />
        </div>
      ) : null}

      {effect === 'overlay' && focused && overlaySiblings.length > 0
        ? createPortal(
            <div
              className="theme theme-webgpu-iso-accordion-overlay"
              role="dialog"
              aria-modal="true"
              aria-label={`${label} sibling gallery`}
            >
              <button
                type="button"
                className="theme-webgpu-iso-accordion-overlay__backdrop"
                aria-label="Close sibling gallery"
                onClick={deactivate}
              />
              <div className="theme-webgpu-iso-accordion-overlay__panel">
                <header className="theme-webgpu-iso-accordion-overlay__head">
                  <p className="type-overline">Sibling sections</p>
                  <button
                    type="button"
                    className="theme-webgpu-iso-accordion-overlay__close type-body-sm"
                    onClick={deactivate}
                  >
                    Close
                  </button>
                </header>
                <ul className="theme-webgpu-iso-accordion-overlay__grid">
                  {overlaySiblings.map((item, index) => {
                    const cover = item.images[2]
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="theme-webgpu-iso-accordion-overlay__tile"
                          onClick={() => activate(item.id)}
                        >
                          <img src={cover.src} alt="" loading="lazy" draggable={false} />
                          <span className="theme-webgpu-iso-accordion-overlay__tile-meta">
                            <span className="type-caption">{formatIndex(index)}</span>
                            <span className="type-body-sm">{item.title}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
