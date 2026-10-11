import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import gsap, { easeCarouselWheel, useGSAP } from '../lib/gsap'
import type { DottedNavMenuItem } from '../lib/menus/dottedNavMenu'
import { DottedNavMenu } from './DottedNavMenu'
import { IconButton } from './IconButton'

export type LandingStyleGallerySlide = {
  src: string
  alt: string
  title: string
  description?: string
}

export type LandingStyleGalleryCopyPosition = 'left' | 'right' | 'bottom'

export type LandingStyleGalleryProps = {
  slides: readonly LandingStyleGallerySlide[]
  label?: string
  className?: string
  footerLabel?: string
  /** Title + description overlay placement (may overlap main card) */
  copyPosition?: LandingStyleGalleryCopyPosition
  /** Dot navigation below stage (defaults to on when there are 2+ slides) */
  showDotNav?: boolean
  dotNavLabel?: string
  debug?: boolean
}

type SlideDirection = 'up' | 'down'

type AnimSlots = {
  out: number
  in: number
  direction: SlideDirection
}

const ANIM_DURATION = 1.25
const SCROLL_COOLDOWN_MS = 1000

const CLIP_FULL = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
const CLIP_COLLAPSED_TOP = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)'
const CLIP_COLLAPSED_BOTTOM = 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)'
const CLIP_REVEAL_DOWN = 'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)'
const CLIP_REVEAL_UP = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'

const TITLE_CLASS =
  'theme-landing-style-gallery__title theme-landing-style-gallery__chrome theme-landing-style-gallery__copy-line'
const DESC_CLASS =
  'theme-landing-style-gallery__description theme-landing-style-gallery__chrome theme-landing-style-gallery__copy-line'
const COUNTER_CLASS = 'theme-landing-style-gallery__counter-digit'

function wrapIndex(index: number, total: number, direction: SlideDirection): number {
  if (direction === 'down') {
    return index === total - 1 ? 0 : index + 1
  }
  return index === 0 ? total - 1 : index - 1
}

function slideDescription(slide: LandingStyleGallerySlide): string {
  return slide.description ?? slide.alt
}

function slideId(index: number): string {
  return `slide-${index}`
}

function indexFromSlideId(id: string): number {
  const match = /^slide-(\d+)$/.exec(id)
  return match ? Number.parseInt(match[1], 10) : 0
}

function mountCopyLine(
  well: HTMLElement,
  tag: 'h2' | 'p',
  className: string,
  text: string
): HTMLElement {
  well.replaceChildren()
  const el = document.createElement(tag)
  el.className = className
  el.textContent = text
  el.dataset.landingCopy = 'current'
  gsap.set(el, { y: 0, clearProps: 'transform' })
  well.appendChild(el)
  return el
}

function mountCopyWells(
  titleWell: HTMLElement,
  descWell: HTMLElement,
  counterWell: HTMLElement,
  slide: LandingStyleGallerySlide,
  slideNumber: number
) {
  mountCopyLine(titleWell, 'h2', TITLE_CLASS, slide.title)
  mountCopyLine(descWell, 'p', DESC_CLASS, slideDescription(slide))
  mountCopyLine(counterWell, 'p', COUNTER_CLASS, String(slideNumber))
}

function appendCopyLine(
  well: HTMLElement,
  tag: 'h2' | 'p',
  className: string,
  text: string,
  y: number
): HTMLElement {
  const el = document.createElement(tag)
  el.className = className
  el.textContent = text
  el.dataset.landingCopy = 'incoming'
  gsap.set(el, { y })
  well.appendChild(el)
  return el
}

/** Ref parity: incoming line starts one full well-height off-screen; must match CSS clip well height. */
function copyWellTravelY(well: HTMLElement): number {
  return well.offsetHeight
}

export function LandingStyleGallery({
  slides,
  label = 'Landing style gallery',
  className = '',
  footerLabel = 'Gallery',
  copyPosition = 'left',
  showDotNav,
  dotNavLabel,
  debug = false,
}: LandingStyleGalleryProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const titleWellRef = useRef<HTMLDivElement>(null)
  const descWellRef = useRef<HTMLDivElement>(null)
  const counterWellRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(0)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const skipCopySyncRef = useRef(false)
  const [index, setIndex] = useState(0)
  const [animSlots, setAnimSlots] = useState<AnimSlots | null>(null)
  const isAnimatingRef = useRef(false)
  const scrollAllowedRef = useRef(true)
  const lastScrollTimeRef = useRef(0)

  const total = slides.length
  const isAnimating = animSlots != null
  const dotNavEnabled = showDotNav ?? total > 1
  const navItems = useMemo<readonly DottedNavMenuItem[]>(
    () =>
      slides.map((slide, slideIndex) => ({
        id: slideId(slideIndex),
        label: slide.title || slide.alt || `Slide ${slideIndex + 1}`,
      })),
    [slides]
  )
  const selectedNavId = slideId(index)

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    if (animSlots || skipCopySyncRef.current) {
      skipCopySyncRef.current = false
      return
    }
    const titleWell = titleWellRef.current
    const descWell = descWellRef.current
    const counterWell = counterWellRef.current
    if (!titleWell || !descWell || !counterWell || total === 0) return

    mountCopyWells(titleWell, descWell, counterWell, slides[index], index + 1)
  }, [index, slides, animSlots, total])

  const goToSlide = useCallback(
    (targetIndex: number) => {
      const now = Date.now()
      if (isAnimatingRef.current || !scrollAllowedRef.current || total < 2) return
      if (now - lastScrollTimeRef.current < SCROLL_COOLDOWN_MS) return

      const from = indexRef.current
      if (targetIndex === from || targetIndex < 0 || targetIndex >= total) return

      lastScrollTimeRef.current = now
      isAnimatingRef.current = true
      scrollAllowedRef.current = false

      const direction: SlideDirection = targetIndex > from ? 'down' : 'up'
      setAnimSlots({
        out: from,
        in: targetIndex,
        direction,
      })
    },
    [total]
  )

  const beginTransition = useCallback(
    (direction: SlideDirection) => {
      goToSlide(wrapIndex(indexRef.current, total, direction))
    },
    [goToSlide, total]
  )

  const handleDotSelect = useCallback(
    (id: string) => {
      goToSlide(indexFromSlideId(id))
    },
    [goToSlide]
  )

  useGSAP(
    () => {
      if (!animSlots || !stageRef.current) return

      const { in: incoming, direction } = animSlots
      const root = stageRef.current
      const titleWell = titleWellRef.current
      const descWell = descWellRef.current
      const counterWell = counterWellRef.current
      const incomingSlide = slides[incoming]

      const outgoingBgClip = root.querySelector<HTMLElement>(
        '[data-landing-bg="out"] .theme-landing-style-gallery__slide-bg'
      )
      const incomingBgClip = root.querySelector<HTMLElement>(
        '[data-landing-bg="in"] .theme-landing-style-gallery__slide-bg'
      )
      const outgoingBgImg = root.querySelector<HTMLElement>('[data-landing-bg="out"] img')
      const outgoingMainWrap = root.querySelector<HTMLElement>('[data-landing-main="out"]')
      const incomingMainWrap = root.querySelector<HTMLElement>('[data-landing-main="in"]')
      const outgoingMainImg = outgoingMainWrap?.querySelector('img') ?? null
      const incomingMainImg = incomingMainWrap?.querySelector('img') ?? null

      if (
        !titleWell ||
        !descWell ||
        !counterWell ||
        !outgoingBgClip ||
        !incomingBgClip ||
        !outgoingBgImg ||
        !outgoingMainWrap ||
        !incomingMainWrap ||
        !outgoingMainImg ||
        !incomingMainImg
      ) {
        isAnimatingRef.current = false
        scrollAllowedRef.current = true
        setAnimSlots(null)
        return
      }

      const currentTitle = titleWell.querySelector<HTMLElement>('[data-landing-copy="current"]')
      const currentDesc = descWell.querySelector<HTMLElement>('[data-landing-copy="current"]')
      const currentCounter = counterWell.querySelector<HTMLElement>('[data-landing-copy="current"]')

      if (!currentTitle || !currentDesc || !currentCounter) {
        isAnimatingRef.current = false
        scrollAllowedRef.current = true
        setAnimSlots(null)
        return
      }

      timelineRef.current?.kill()

      const titleTravel = copyWellTravelY(titleWell)
      const descTravel = copyWellTravelY(descWell)
      const counterTravel = copyWellTravelY(counterWell)

      const titleInOffset = direction === 'down' ? titleTravel : -titleTravel
      const titleOutOffset = direction === 'down' ? -titleTravel : titleTravel
      const descInOffset = direction === 'down' ? descTravel : -descTravel
      const descOutOffset = direction === 'down' ? -descTravel : descTravel
      const counterInOffset = direction === 'down' ? counterTravel : -counterTravel
      const counterOutOffset = direction === 'down' ? -counterTravel : counterTravel

      const incomingTitle = appendCopyLine(
        titleWell,
        'h2',
        TITLE_CLASS,
        incomingSlide.title,
        titleInOffset
      )
      const incomingDesc = appendCopyLine(
        descWell,
        'p',
        DESC_CLASS,
        slideDescription(incomingSlide),
        descInOffset
      )
      const incomingCounter = appendCopyLine(
        counterWell,
        'p',
        COUNTER_CLASS,
        String(incoming + 1),
        counterInOffset
      )

      gsap.set(incomingBgClip, {
        clipPath: direction === 'down' ? CLIP_COLLAPSED_BOTTOM : CLIP_COLLAPSED_TOP,
      })
      gsap.set(incomingMainWrap, {
        clipPath: direction === 'down' ? CLIP_COLLAPSED_TOP : CLIP_COLLAPSED_BOTTOM,
      })
      gsap.set(incomingMainImg, {
        y: direction === 'down' ? '-50%' : '50%',
      })

      const ease = easeCarouselWheel

      const tl = gsap.timeline({
        onComplete: () => {
          currentTitle.remove()
          currentDesc.remove()
          currentCounter.remove()
          incomingTitle.dataset.landingCopy = 'current'
          incomingDesc.dataset.landingCopy = 'current'
          incomingCounter.dataset.landingCopy = 'current'
          gsap.set([incomingTitle, incomingDesc, incomingCounter, incomingMainImg], {
            y: 0,
            clearProps: 'transform',
          })
          gsap.set(outgoingMainImg, { clearProps: 'transform' })
          gsap.set(outgoingBgImg, { clearProps: 'transform' })

          skipCopySyncRef.current = true
          indexRef.current = incoming
          setIndex(incoming)
          setAnimSlots(null)
          isAnimatingRef.current = false
          window.setTimeout(() => {
            scrollAllowedRef.current = true
            lastScrollTimeRef.current = Date.now()
          }, 100)
        },
      })

      timelineRef.current = tl

      tl.to(
        incomingBgClip,
        {
          clipPath: direction === 'down' ? CLIP_REVEAL_DOWN : CLIP_REVEAL_UP,
          duration: ANIM_DURATION,
          ease,
        },
        0
      )
      tl.to(outgoingBgImg, { scale: 1.5, duration: ANIM_DURATION, ease }, 0)
      tl.to(incomingMainWrap, { clipPath: CLIP_FULL, duration: ANIM_DURATION, ease }, 0)
      tl.to(
        outgoingMainImg,
        {
          y: direction === 'down' ? '50%' : '-50%',
          duration: ANIM_DURATION,
          ease,
        },
        0
      )
      tl.to(incomingMainImg, { y: 0, duration: ANIM_DURATION, ease }, 0)
      tl.to(currentTitle, { y: titleOutOffset, duration: ANIM_DURATION, ease }, 0)
      tl.to(incomingTitle, { y: 0, duration: ANIM_DURATION, ease }, 0)
      tl.to(currentDesc, { y: descOutOffset, duration: ANIM_DURATION, ease }, 0)
      tl.to(incomingDesc, { y: 0, duration: ANIM_DURATION, ease }, 0)
      tl.to(currentCounter, { y: counterOutOffset, duration: ANIM_DURATION, ease }, 0)
      tl.to(incomingCounter, { y: 0, duration: ANIM_DURATION, ease }, 0)

      return () => {
        tl.kill()
        timelineRef.current = null
      }
    },
    { dependencies: [animSlots, slides], scope: stageRef, revertOnUpdate: false }
  )

  useGSAP(
    () => {
      const el = stageRef.current
      if (!el || total < 2) return

      const onWheel = (event: WheelEvent) => {
        event.preventDefault()
        beginTransition(event.deltaY > 0 ? 'down' : 'up')
      }

      let touchStartY = 0
      let touchActive = false

      const onTouchStart = (event: TouchEvent) => {
        touchStartY = event.touches[0].clientY
        touchActive = true
      }

      const onTouchMove = (event: TouchEvent) => {
        event.preventDefault()
        if (!touchActive || isAnimatingRef.current || !scrollAllowedRef.current) return
        const delta = touchStartY - event.touches[0].clientY
        if (Math.abs(delta) > 10) {
          touchActive = false
          beginTransition(delta > 0 ? 'down' : 'up')
        }
      }

      const onTouchEnd = () => {
        touchActive = false
      }

      el.addEventListener('wheel', onWheel, { passive: false })
      el.addEventListener('touchstart', onTouchStart, { passive: false })
      el.addEventListener('touchmove', onTouchMove, { passive: false })
      el.addEventListener('touchend', onTouchEnd)

      return () => {
        el.removeEventListener('wheel', onWheel)
        el.removeEventListener('touchstart', onTouchStart)
        el.removeEventListener('touchmove', onTouchMove)
        el.removeEventListener('touchend', onTouchEnd)
      }
    },
    { dependencies: [beginTransition, total], scope: stageRef }
  )

  if (total === 0) return null

  const renderSlideLayers = () => {
    if (isAnimating && animSlots) {
      const fromSlide = slides[animSlots.out]
      const toSlide = slides[animSlots.in]
      return (
        <>
          <div className="theme-landing-style-gallery__slide" data-landing-bg="out">
            <div className="theme-landing-style-gallery__slide-bg">
              <img src={fromSlide.src} alt={fromSlide.alt} draggable={false} />
            </div>
          </div>
          <div className="theme-landing-style-gallery__slide" data-landing-bg="in">
            <div className="theme-landing-style-gallery__slide-bg">
              <img src={toSlide.src} alt={toSlide.alt} draggable={false} />
            </div>
          </div>
        </>
      )
    }

    const current = slides[index]
    return (
      <div className="theme-landing-style-gallery__slide" data-landing-bg="current">
        <div className="theme-landing-style-gallery__slide-bg">
          <img src={current.src} alt={current.alt} draggable={false} />
        </div>
      </div>
    )
  }

  const renderMainCard = () => {
    if (isAnimating && animSlots) {
      const fromSlide = slides[animSlots.out]
      const toSlide = slides[animSlots.in]
      return (
        <>
          <div className="theme-landing-style-gallery__main-wrap" data-landing-main="out">
            <img src={fromSlide.src} alt="" aria-hidden draggable={false} />
          </div>
          <div className="theme-landing-style-gallery__main-wrap" data-landing-main="in">
            <img src={toSlide.src} alt="" aria-hidden draggable={false} />
          </div>
        </>
      )
    }

    const current = slides[index]
    return (
      <div className="theme-landing-style-gallery__main-wrap" data-landing-main="current">
        <img src={current.src} alt="" aria-hidden draggable={false} />
      </div>
    )
  }

  const galleryShellClass = [
    'theme-dotnav-gallery',
    'theme-dotnav-gallery--horizontal',
    'theme-landing-style-gallery-shell',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const hostClass = ['theme-landing-style-gallery-host', className].filter(Boolean).join(' ')

  const stageBlock = (
    <div className="theme-landing-style-gallery">
      <div
        ref={stageRef}
        className="theme-landing-style-gallery__stage"
        aria-label={label}
        role="region"
        data-lenis-prevent-wheel
        data-landing-index={debug ? index : undefined}
        data-landing-animating={debug ? isAnimating : undefined}
      >
        <header className="theme-landing-style-gallery__header theme-landing-style-gallery__chrome">
          <p className="type-overline theme-landing-style-gallery__chrome">{label}</p>
          {total > 1 ? (
            <p className="type-caption theme-landing-style-gallery__chrome theme-landing-style-gallery__chrome--muted">
              Scroll or swipe
            </p>
          ) : null}
        </header>

        <div className="theme-landing-style-gallery__slider">{renderSlideLayers()}</div>

        <div className="theme-landing-style-gallery__stage-ui">
          <div className="theme-landing-style-gallery__main-card">{renderMainCard()}</div>
          <div
            className="theme-landing-style-gallery__copy"
            data-copy-position={copyPosition}
            aria-live="polite"
          >
            <div
              ref={titleWellRef}
              className="theme-landing-style-gallery__title-well"
              data-landing-title-well
            />
            <div
              ref={descWellRef}
              className="theme-landing-style-gallery__desc-well"
              data-landing-desc-well
            />
          </div>
        </div>

        <footer className="theme-landing-style-gallery__footer theme-landing-style-gallery__chrome">
          <p className="type-caption theme-landing-style-gallery__chrome">{footerLabel}</p>
          <div className="theme-landing-style-gallery__counter">
            <div
              ref={counterWellRef}
              className="theme-landing-style-gallery__counter-index"
              data-landing-counter-well
            />
            <span className="theme-landing-style-gallery__counter-sep">/</span>
            <span className="theme-landing-style-gallery__counter-total">{total}</span>
          </div>
        </footer>
      </div>
    </div>
  )

  if (!dotNavEnabled) {
    return <div className={hostClass}>{stageBlock}</div>
  }

  return (
    <div className={galleryShellClass}>
      <div className="theme-dotnav-gallery__stage">{stageBlock}</div>
      {dotNavEnabled ? (
        <div className="theme-landing-style-gallery__controls">
          <IconButton
            type="button"
            variant="cardless"
            size="xxs"
            icon={ChevronLeft}
            aria-label="Previous slide"
            disabled={isAnimating}
            onClick={() => beginTransition('up')}
          />
          <DottedNavMenu
            label={dotNavLabel ?? label}
            orientation="horizontal"
            size="md"
            items={navItems}
            selectedId={selectedNavId}
            onSelect={handleDotSelect}
          />
          <IconButton
            type="button"
            variant="cardless"
            size="xxs"
            icon={ChevronRight}
            aria-label="Next slide"
            disabled={isAnimating}
            onClick={() => beginTransition('down')}
          />
        </div>
      ) : null}
    </div>
  )
}
