import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { gsap, Observer, useGSAP } from '../lib/gsap'
import { GALLERY_DEMO_IMAGES, galleryDemoImageSrc } from '../lib/galleries/galleryDemoImages'
import { SLIDESHOW_FX_META, SLIDESHOW_NAVIGATORS } from '../lib/galleries/slideshowNavigators'
import type { SlideshowDecoKind, SlideshowFxId, SlideshowNavigateCtx } from '../lib/galleries/slideshowTypes'

type SlideshowGalleryProps = {
  fx: SlideshowFxId
  label?: string
}

function decoNodes(kind: SlideshowDecoKind) {
  switch (kind) {
    case 'single':
      return [<div key="d" className="theme-slideshow__deco" data-deco />]
    case 'stack12':
      return [1, 2, 3].map((n) => (
        <div key={n} className={`theme-slideshow__deco theme-slideshow__deco--${n}`} data-deco />
      ))
    case 'dual15':
      return [0, 1].map((n) => (
        <div key={n} className="theme-slideshow__deco theme-slideshow__deco--4" data-deco />
      ))
    case 'multi16':
      return [5, 5, 6, 6, 7, 7].map((n, i) => (
        <div key={i} className={`theme-slideshow__deco theme-slideshow__deco--${n}`} data-deco />
      ))
    default:
      return null
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function SlideshowGallery({ fx, label = 'Slideshow FX demo' }: SlideshowGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<SlideshowNavigateCtx | null>(null)
  const [ready, setReady] = useState(false)
  const meta = SLIDESHOW_FX_META.find((entry) => entry.id === fx) ?? SLIDESHOW_FX_META[0]
  const images = useMemo(
    () =>
      GALLERY_DEMO_IMAGES.slice(0, 6).map((item) => ({
        src: galleryDemoImageSrc(item.src, 1400),
        alt: item.alt,
      })),
    [],
  )

  useEffect(() => {
    let cancelled = false
    Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => resolve()
            img.onerror = () => resolve()
            img.src = image.src
          }),
      ),
    ).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [images, fx])

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root || !ready) return

      const slides = [...root.querySelectorAll<HTMLElement>('[data-slide]')]
      const slidesInner = slides.map((slide) => slide.querySelector<HTMLElement>('[data-slide-img]')!)
      const decoEls = [...root.querySelectorAll<HTMLElement>('[data-deco]')]
      const deco =
        meta.deco === 'none'
          ? null
          : decoEls.length <= 1
            ? decoEls[0] ?? null
            : decoEls

      slides.forEach((slide, index) => {
        gsap.set(slide, { clearProps: 'all' })
        gsap.set(slidesInner[index], { clearProps: 'all' })
        slide.classList.toggle('theme-slideshow__slide--current', index === 0)
        slide.classList.toggle('slide--current', index === 0)
      })
      decoEls.forEach((el) => gsap.set(el, { clearProps: 'all', autoAlpha: 0 }))

      const ctx: SlideshowNavigateCtx = {
        el: root,
        slides,
        slidesInner,
        deco,
        current: 0,
        slidesTotal: slides.length,
        isAnimating: false,
        tl: null,
      }
      ctxRef.current = ctx

      const navigate = (direction: number) => {
        if (!ctxRef.current) return
        if (prefersReducedMotion()) {
          const previous = ctx.current
          ctx.current =
            direction === 1
              ? ctx.current < ctx.slidesTotal - 1
                ? ctx.current + 1
                : 0
              : ctx.current > 0
                ? ctx.current - 1
                : ctx.slidesTotal - 1
          slides[previous].classList.remove('theme-slideshow__slide--current', 'slide--current')
          slides[ctx.current].classList.add('theme-slideshow__slide--current', 'slide--current')
          return
        }
        SLIDESHOW_NAVIGATORS[fx](gsap, ctx, direction)
        // Keep theme class in sync with Codrops slide--current
        slides.forEach((slide, index) => {
          const on = slide.classList.contains('slide--current')
          slide.classList.toggle('theme-slideshow__slide--current', on || index === ctx.current)
        })
      }

      const onPrev = () => navigate(-1)
      const onNext = () => navigate(1)
      root.querySelector('[data-nav-prev]')?.addEventListener('click', onPrev)
      root.querySelector('[data-nav-next]')?.addEventListener('click', onNext)

      const observer = Observer.create({
        target: root,
        type: 'wheel,touch,pointer',
        onDown: () => navigate(-1),
        onUp: () => navigate(1),
        wheelSpeed: -1,
        tolerance: 10,
      })

      return () => {
        observer.kill()
        root.querySelector('[data-nav-prev]')?.removeEventListener('click', onPrev)
        root.querySelector('[data-nav-next]')?.removeEventListener('click', onNext)
        ctxRef.current = null
      }
    },
    { scope: rootRef, dependencies: [fx, ready, meta.deco] },
  )

  const hostClass = [
    'theme-slideshow',
    ...meta.hostModifiers.map((mod) => `theme-slideshow--${mod}`),
  ].join(' ')

  return (
    <div
      ref={rootRef}
      className={hostClass}
      role="region"
      aria-label={label}
      data-fx={fx}
    >
      <div className="theme-slideshow__slides">
        {images.map((image, index) => (
          <div
            key={image.src}
            className={[
              'theme-slideshow__slide',
              'slide',
              index === 0 ? 'theme-slideshow__slide--current slide--current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-slide
          >
            <img
              className="theme-slideshow__img slide__img"
              data-slide-img
              src={image.src}
              alt={image.alt}
              draggable={false}
            />
          </div>
        ))}
        {decoNodes(meta.deco)}
      </div>
      <div className="theme-slideshow__nav">
        <button type="button" className="theme-slideshow__nav-btn" data-nav-prev aria-label="Previous slide">
          <ChevronLeft size={18} />
        </button>
        <button type="button" className="theme-slideshow__nav-btn" data-nav-next aria-label="Next slide">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
