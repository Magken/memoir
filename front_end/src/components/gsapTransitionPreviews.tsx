import { useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap, { easeCarouselWheel } from '../lib/gsap'
import { SLIDESHOW_FX_META } from '../lib/galleries/slideshowNavigators'
import type { MorphGalleryEngine } from '../lib/galleries/morphGallery'
import { MorphTransitionCanvas } from './MorphGallery'
import { ShapeMorphTransitionSvg } from './ShapeMorphGallery'
import { SHAPE_MORPH_GALLERY_DEMO_SLIDES } from '../lib/galleries/shapeMorphGalleryFixtures'
import {
  WaveMaskTransitionStage,
  type WaveMaskTransitionApi,
} from './WaveMaskTransitionStage'
import {
  CLIP_COLLAPSED_BOTTOM,
  CLIP_COLLAPSED_TOP,
  CLIP_FULL,
  CLIP_REVEAL_DOWN,
  TRANSITION_DURATION,
  TRANSITION_EASE,
} from '../lib/transitions/gsapTransitionClip'
import { useGsapHoverTransition } from '../hooks/useGsapHoverTransition'
import type { GsapTransitionArrangement } from '../lib/transitions/gsapTransitionArrangements'
import {
  TRANSITION_IMG,
  TransitionCopyWell,
  TransitionPanel,
  TransitionSlide,
  TransitionStage,
} from './gsapTransitionLayout'

const EASE = TRANSITION_EASE
const SNAP = 'power2.out'
const DUR = TRANSITION_DURATION

/** CodePen tutsplus/abgxGaE — vertical clip peel through stacked slides */
function VerticalPeelPreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const slides = stage.querySelectorAll<HTMLElement>('.gsap-transition-slide:not(:last-child)')
        const headings = stage.querySelectorAll<HTMLElement>('.gsap-transition-slide__heading')
        const tl = gsap.timeline({ defaults: { ease: EASE } })
        tl.to(slides, {
          clipPath: 'inset(0 0 100% 0)',
          duration: 0.75,
          stagger: 0.28,
        }).to(
          headings,
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.28 },
          0.12,
        )
        return tl
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const slides = stage.querySelectorAll<HTMLElement>('.gsap-transition-slide')
        const headings = stage.querySelectorAll<HTMLElement>('.gsap-transition-slide__heading')
        gsap.set(slides, { clipPath: 'inset(0 0 0 0)' })
        headings.forEach((heading, index) => {
          gsap.set(heading, { opacity: index === 0 ? 1 : 0, y: index === 0 ? 0 : 24 })
        })
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--stacked">
      <div className="gsap-transition-slides">
        <TransitionSlide image={TRANSITION_IMG.cityA} title="Edinburgh" />
        <TransitionSlide image={TRANSITION_IMG.cityB} title="Berlin" />
        <TransitionSlide image={TRANSITION_IMG.cityC} title="Havana" />
      </div>
    </TransitionStage>
  )
}

/** king816 gist — horizontal xPercent panel train */
function HorizontalTrainPreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const track = stage.querySelector<HTMLElement>('.gsap-transition-track')
        if (!track) return undefined
        return gsap.to(track, {
          xPercent: -200,
          duration: 1.35,
          ease: easeCarouselWheel,
        })
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const track = stage.querySelector<HTMLElement>('.gsap-transition-track')
        if (!track) return
        gsap.set(track, { xPercent: 0 })
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef}>
      <div className="gsap-transition-track">
        <TransitionSlide
          image={TRANSITION_IMG.landscapeA}
          title="First section"
          className="gsap-transition-track__panel"
        />
        <TransitionSlide
          image={TRANSITION_IMG.landscapeB}
          title="Second section"
          className="gsap-transition-track__panel"
        />
        <TransitionSlide
          image={TRANSITION_IMG.cityD}
          title="Third section"
          className="gsap-transition-track__panel"
        />
      </div>
    </TransitionStage>
  )
}

/** king816 gist + LandingStyleGallery parallax — iris expand with base scale + type reveal */
function CircleIrisPreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const base = stage.querySelector<HTMLElement>('.gsap-transition-iris-base')
        const baseImg = stage.querySelector<HTMLElement>('.gsap-transition-iris-base__img')
        const iris = stage.querySelector<HTMLElement>('.gsap-transition-iris')
        const irisImg = stage.querySelector<HTMLElement>('.gsap-transition-iris__img')
        const copy = stage.querySelector<HTMLElement>('.gsap-transition-iris__copy')
        if (!base || !iris || !baseImg || !irisImg) return undefined
        const tl = gsap.timeline({ defaults: { ease: easeCarouselWheel } })
        tl.to(baseImg, { scale: 1.18, filter: 'brightness(0.55)', duration: DUR }, 0)
          .to(base, { scale: 0.97, duration: DUR }, 0)
          .to(iris, { clipPath: 'circle(155% at 50% 50%)', duration: DUR }, 0.06)
          .fromTo(irisImg, { scale: 1.22 }, { scale: 1, duration: DUR }, 0.06)
        if (copy) {
          tl.fromTo(copy, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: DUR * 0.75, ease: EASE }, 0.28)
        }
        return tl
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const base = stage.querySelector<HTMLElement>('.gsap-transition-iris-base')
        const baseImg = stage.querySelector<HTMLElement>('.gsap-transition-iris-base__img')
        const iris = stage.querySelector<HTMLElement>('.gsap-transition-iris')
        const irisImg = stage.querySelector<HTMLElement>('.gsap-transition-iris__img')
        const copy = stage.querySelector<HTMLElement>('.gsap-transition-iris__copy')
        if (base) gsap.set(base, { scale: 1 })
        if (baseImg) gsap.set(baseImg, { scale: 1, filter: 'brightness(1)' })
        if (iris) gsap.set(iris, { clipPath: 'circle(0% at 50% 50%)' })
        if (irisImg) gsap.set(irisImg, { scale: 1.12 })
        if (copy) gsap.set(copy, { opacity: 0, y: 32 })
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--iris">
      <div className="gsap-transition-iris-base">
        <img className="gsap-transition-iris-base__img" src={TRANSITION_IMG.interiorA} alt="" loading="lazy" />
        <TransitionCopyWell tag="Current" title="Workspace" className="gsap-transition-iris-base__copy" />
      </div>
      <div className="gsap-transition-iris">
        <img className="gsap-transition-iris__img" src={TRANSITION_IMG.interiorB} alt="" loading="lazy" />
        <TransitionCopyWell tag="Next section" title="Studio" className="gsap-transition-iris__copy" />
      </div>
    </TransitionStage>
  )
}

/** Inverse of circle iris — full overlay contracts to pinhole; base brightens underneath */
function CircleIrisReversePreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const base = stage.querySelector<HTMLElement>('.gsap-transition-iris-base')
        const baseImg = stage.querySelector<HTMLElement>('.gsap-transition-iris-base__img')
        const baseCopy = stage.querySelector<HTMLElement>('.gsap-transition-iris-base__copy')
        const iris = stage.querySelector<HTMLElement>('.gsap-transition-iris')
        const irisImg = stage.querySelector<HTMLElement>('.gsap-transition-iris__img')
        const irisCopy = stage.querySelector<HTMLElement>('.gsap-transition-iris__copy')
        if (!base || !iris || !baseImg || !irisImg) return undefined
        const tl = gsap.timeline({ defaults: { ease: easeCarouselWheel } })
        tl.to(baseImg, { scale: 1, filter: 'brightness(1)', duration: DUR }, 0)
          .to(base, { scale: 1, duration: DUR }, 0)
          .to(iris, { clipPath: 'circle(0% at 50% 50%)', duration: DUR }, 0.06)
          .fromTo(irisImg, { scale: 1 }, { scale: 1.22, duration: DUR }, 0.06)
        if (irisCopy) {
          tl.to(irisCopy, { opacity: 0, y: 32, duration: DUR * 0.55, ease: EASE }, 0)
        }
        if (baseCopy) {
          tl.fromTo(
            baseCopy,
            { opacity: 0, y: 32 },
            { opacity: 1, y: 0, duration: DUR * 0.75, ease: EASE },
            0.28,
          )
        }
        return tl
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const base = stage.querySelector<HTMLElement>('.gsap-transition-iris-base')
        const baseImg = stage.querySelector<HTMLElement>('.gsap-transition-iris-base__img')
        const baseCopy = stage.querySelector<HTMLElement>('.gsap-transition-iris-base__copy')
        const iris = stage.querySelector<HTMLElement>('.gsap-transition-iris')
        const irisImg = stage.querySelector<HTMLElement>('.gsap-transition-iris__img')
        const irisCopy = stage.querySelector<HTMLElement>('.gsap-transition-iris__copy')
        if (base) gsap.set(base, { scale: 0.97 })
        if (baseImg) gsap.set(baseImg, { scale: 1.18, filter: 'brightness(0.55)' })
        if (iris) gsap.set(iris, { clipPath: 'circle(155% at 50% 50%)' })
        if (irisImg) gsap.set(irisImg, { scale: 1 })
        if (baseCopy) gsap.set(baseCopy, { opacity: 0, y: 32 })
        if (irisCopy) gsap.set(irisCopy, { opacity: 1, y: 0 })
      },
    },
    [],
  )

  return (
    <TransitionStage
      ref={stageRef}
      className="gsap-transition-stage--iris gsap-transition-stage--iris-reverse"
    >
      <div className="gsap-transition-iris-base">
        <img className="gsap-transition-iris-base__img" src={TRANSITION_IMG.interiorA} alt="" loading="lazy" />
        <TransitionCopyWell tag="Revealed" title="Workspace" className="gsap-transition-iris-base__copy" />
      </div>
      <div className="gsap-transition-iris">
        <img className="gsap-transition-iris__img" src={TRANSITION_IMG.interiorB} alt="" loading="lazy" />
        <TransitionCopyWell tag="Cover layer" title="Studio" className="gsap-transition-iris__copy" />
      </div>
    </TransitionStage>
  )
}

function CrossfadePreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const a = stage.querySelector<HTMLElement>('[data-panel="A"]')
        const b = stage.querySelector<HTMLElement>('[data-panel="B"]')
        const imgB = stage.querySelector<HTMLElement>('[data-panel="B"] .gsap-transition-slide__img')
        if (!a || !b) return undefined
        const tl = gsap.timeline({ defaults: { duration: 0.85, ease: EASE } })
        tl.to(a, { opacity: 0, scale: 1.04 }, 0)
          .to(b, { opacity: 1, scale: 1 }, 0)
          .to(imgB, { scale: 1.08, duration: 1.4, ease: 'none' }, 0)
        return tl
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const a = stage.querySelector<HTMLElement>('[data-panel="A"]')
        const b = stage.querySelector<HTMLElement>('[data-panel="B"]')
        const imgB = stage.querySelector<HTMLElement>('[data-panel="B"] .gsap-transition-slide__img')
        if (!a || !b) return
        gsap.set(a, { opacity: 1, scale: 1 })
        gsap.set(b, { opacity: 0, scale: 1.06 })
        if (imgB) gsap.set(imgB, { scale: 1 })
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--stacked">
      <TransitionSlide
        image={TRANSITION_IMG.cityE}
        title="Outgoing"
        className="gsap-transition-slide--base"
        dataPanel="A"
      />
      <TransitionSlide
        image={TRANSITION_IMG.cityF}
        title="Incoming"
        className="gsap-transition-slide--overlay"
        dataPanel="B"
      />
    </TransitionStage>
  )
}

/** LandingStyleGallery clip-path cover — dual-layer bg + main card + masked type */
function SlideCoverPreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const outBg = stage.querySelector<HTMLElement>('[data-cover="out-bg"]')
        const outBgImg = stage.querySelector<HTMLElement>('[data-cover="out-bg"] img')
        const outMain = stage.querySelector<HTMLElement>('[data-cover="out-main"]')
        const outMainImg = stage.querySelector<HTMLElement>('[data-cover="out-main"] img')
        const outTitle = stage.querySelector<HTMLElement>('[data-cover="out-title"]')
        const inBg = stage.querySelector<HTMLElement>('[data-cover="in-bg"]')
        const inMain = stage.querySelector<HTMLElement>('[data-cover="in-main"]')
        const inMainImg = stage.querySelector<HTMLElement>('[data-cover="in-main"] img')
        const inTitle = stage.querySelector<HTMLElement>('[data-cover="in-title"]')
        if (!outBg || !outBgImg || !outMain || !outMainImg || !inBg || !inMain || !inMainImg || !outTitle || !inTitle) {
          return undefined
        }
        const titleTravel = outTitle.offsetHeight || 48
        gsap.set(inTitle, { y: titleTravel })
        const tl = gsap.timeline({ defaults: { duration: DUR, ease: easeCarouselWheel } })
        tl.to(inBg, { clipPath: CLIP_REVEAL_DOWN }, 0)
          .to(outBgImg, { scale: 1.45 }, 0)
          .to(inMain, { clipPath: CLIP_FULL }, 0)
          .to(outMainImg, { y: '50%' }, 0)
          .to(inMainImg, { y: 0 }, 0)
          .to(outTitle, { y: -titleTravel }, 0)
          .to(inTitle, { y: 0 }, 0)
        return tl
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const outBgImg = stage.querySelector<HTMLElement>('[data-cover="out-bg"] img')
        const outMainImg = stage.querySelector<HTMLElement>('[data-cover="out-main"] img')
        const outTitle = stage.querySelector<HTMLElement>('[data-cover="out-title"]')
        const inBg = stage.querySelector<HTMLElement>('[data-cover="in-bg"]')
        const inMain = stage.querySelector<HTMLElement>('[data-cover="in-main"]')
        const inMainImg = stage.querySelector<HTMLElement>('[data-cover="in-main"] img')
        const inTitle = stage.querySelector<HTMLElement>('[data-cover="in-title"]')
        if (outBgImg) gsap.set(outBgImg, { scale: 1, clearProps: 'transform' })
        if (outMainImg) gsap.set(outMainImg, { y: 0, clearProps: 'transform' })
        if (outTitle) gsap.set(outTitle, { y: 0, clearProps: 'transform' })
        if (inBg) gsap.set(inBg, { clipPath: CLIP_COLLAPSED_BOTTOM })
        if (inMain) gsap.set(inMain, { clipPath: CLIP_COLLAPSED_TOP })
        if (inMainImg) gsap.set(inMainImg, { y: '-50%' })
        if (inTitle) gsap.set(inTitle, { y: 48, opacity: 1 })
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--gallery-cover">
      <div className="gsap-transition-gallery-cover">
        <div className="gsap-transition-gallery-cover__layer gsap-transition-gallery-cover__layer--out">
          <div className="gsap-transition-gallery-cover__bg" data-cover="out-bg">
            <img src={TRANSITION_IMG.landscapeA} alt="" loading="lazy" />
          </div>
          <div className="gsap-transition-gallery-cover__main" data-cover="out-main">
            <img src={TRANSITION_IMG.landscapeA} alt="" loading="lazy" />
          </div>
          <div className="gsap-transition-gallery-cover__copy-well" data-cover="out-title">
            <span className="type-display-sm gsap-transition-gallery-cover__title">Current band</span>
          </div>
        </div>
        <div className="gsap-transition-gallery-cover__layer gsap-transition-gallery-cover__layer--in">
          <div className="gsap-transition-gallery-cover__bg" data-cover="in-bg">
            <img src={TRANSITION_IMG.landscapeB} alt="" loading="lazy" />
          </div>
          <div className="gsap-transition-gallery-cover__main" data-cover="in-main">
            <img src={TRANSITION_IMG.landscapeB} alt="" loading="lazy" />
          </div>
          <div className="gsap-transition-gallery-cover__copy-well" data-cover="in-title">
            <span className="type-display-sm gsap-transition-gallery-cover__title">Cover section</span>
          </div>
        </div>
      </div>
    </TransitionStage>
  )
}

function StaggerRevealPreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const rows = stage.querySelectorAll<HTMLElement>('.gsap-transition-row')
        return gsap.fromTo(
          rows,
          { opacity: 0, y: 56 },
          { opacity: 1, y: 0, duration: 0.65, ease: SNAP, stagger: 0.14 },
        )
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const rows = stage.querySelectorAll<HTMLElement>('.gsap-transition-row')
        gsap.set(rows, { opacity: 1, y: 0 })
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--rows">
      <TransitionPanel tone="ink" label="Section mount" className="gsap-transition-panel--shell">
        <div className="gsap-transition-rows">
          {[
            { title: 'Hero band', meta: 'Display + deck' },
            { title: 'Feature grid', meta: 'Three-up cards' },
            { title: 'CTA strip', meta: 'Buttons + proof' },
          ].map((row) => (
            <div key={row.title} className="gsap-transition-row">
              <span className="gsap-transition-row__title">{row.title}</span>
              <span className="gsap-transition-row__meta">{row.meta}</span>
            </div>
          ))}
        </div>
      </TransitionPanel>
    </TransitionStage>
  )
}

/** LandingStyleGallery clip peel on photo stack — top card collapses, deck promotes */
function StackedRevealPreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const cards = stage.querySelectorAll<HTMLElement>('.gsap-transition-stack-card')
        if (cards.length < 3) return undefined
        const [top, mid, base] = Array.from(cards)
        const topTitle = top.querySelector<HTMLElement>('.gsap-transition-copy__line')
        const midTitle = mid.querySelector<HTMLElement>('.gsap-transition-copy__line')
        const tl = gsap.timeline({ defaults: { ease: easeCarouselWheel } })
        tl.to(top, { clipPath: CLIP_COLLAPSED_TOP, y: '-6%', scale: 0.98, duration: DUR }, 0)
          .to(mid, { y: '0%', scale: 1, duration: DUR }, 0.1)
          .to(base, { y: '10%', scale: 0.96, duration: DUR }, 0.14)
        if (topTitle) tl.to(topTitle, { yPercent: -120, opacity: 0, duration: DUR * 0.7 }, 0)
        if (midTitle) tl.fromTo(midTitle, { yPercent: 100 }, { yPercent: 0, duration: DUR * 0.85, ease: EASE }, 0.22)
        return tl
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const cards = stage.querySelectorAll<HTMLElement>('.gsap-transition-stack-card')
        cards.forEach((card, index) => {
          gsap.set(card, {
            clipPath: CLIP_FULL,
            y: `${index * 12}%`,
            scale: 1 - index * 0.06,
            clearProps: 'boxShadow',
          })
          const line = card.querySelector<HTMLElement>('.gsap-transition-copy__line')
          if (line) gsap.set(line, { yPercent: index === 0 ? 0 : 100, opacity: 1 })
        })
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--stack-deck">
      {[
        { tag: '01', title: 'Launch', img: TRANSITION_IMG.cityA },
        { tag: '02', title: 'Scale', img: TRANSITION_IMG.cityB },
        { tag: '03', title: 'Ship', img: TRANSITION_IMG.cityC },
      ].map((card) => (
        <div key={card.title} className="gsap-transition-stack-card">
          <img className="gsap-transition-stack-card__img" src={card.img} alt="" loading="lazy" />
          <TransitionCopyWell tag={card.tag} title={card.title} className="gsap-transition-stack-card__copy" />
        </div>
      ))}
    </TransitionStage>
  )
}

function FourPanelCurtainPreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const strips = stage.querySelectorAll<HTMLElement>('.gsap-transition-curtain-strip')
        const tl = gsap.timeline({ defaults: { duration: 0.55, ease: SNAP } })
        strips.forEach((strip, index) => {
          tl.to(strip, { y: '-108%' }, index * 0.09)
        })
        return tl
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const strips = stage.querySelectorAll<HTMLElement>('.gsap-transition-curtain-strip')
        gsap.set(strips, { y: '0%' })
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--stacked">
      <TransitionSlide image={TRANSITION_IMG.cityD} title="Revealed section" className="gsap-transition-slide--base" />
      <div className="gsap-transition-curtains" aria-hidden>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="gsap-transition-curtain-strip" />
        ))}
      </div>
    </TransitionStage>
  )
}

/** item-reference/front-end/gsap-transition-2 — viewport scale + overlay scaleY + masked type stagger */
function PinStackPreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const viewport = stage.querySelector<HTMLElement>('.gsap-transition-pin-viewport')
        const overlay = stage.querySelector<HTMLElement>('.gsap-transition-pin-overlay')
        const lines = stage.querySelectorAll<HTMLElement>('.gsap-transition-pin-line')
        if (!viewport || !overlay) return undefined
        const tl = gsap.timeline({ defaults: { ease: EASE } })
        tl.to(viewport, { scale: 0.95, duration: DUR }, 0)
          .to(overlay, { scaleY: 1, duration: DUR }, '-=0.55')
          .to(lines, { yPercent: 0, stagger: 0.12, duration: DUR * 1.4, ease: EASE }, '-=0.85')
        return tl
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const viewport = stage.querySelector<HTMLElement>('.gsap-transition-pin-viewport')
        const overlay = stage.querySelector<HTMLElement>('.gsap-transition-pin-overlay')
        const lines = stage.querySelectorAll<HTMLElement>('.gsap-transition-pin-line')
        if (viewport) gsap.set(viewport, { scale: 1 })
        if (overlay) gsap.set(overlay, { scaleY: 0 })
        gsap.set(lines, { yPercent: 100 })
      },
    },
    [],
  )

  const sections = [
    { tag: 'Pinned', title: 'Section one', body: 'Hero + deck band' },
    { tag: 'Stack', title: 'Section two', body: 'Feature grid' },
    { tag: 'Handoff', title: 'Section three', body: 'CTA + proof' },
  ]

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--pin-compress">
      <div className="gsap-transition-pin-viewport">
        <div className="gsap-transition-pin-stack-inner">
          {sections.map((section, index) => (
            <article key={section.title} className="gsap-transition-pin-section" style={{ zIndex: index + 1 }}>
              <span className="type-overline gsap-transition-pin-section__index">0{index + 1}</span>
              <div className="gsap-transition-copy__mask">
                <h3 className="type-display-sm gsap-transition-pin-line">{section.title}</h3>
              </div>
              <p className="type-body-sm gsap-transition-pin-section__body">{section.body}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="gsap-transition-pin-overlay" aria-hidden />
    </TransitionStage>
  )
}

/** item-reference/front-end/gsap-transition-1 — three diagonal panels scale/slide to cover (UI8 Nav) */
function DiagonalPanelCoverPreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const top = stage.querySelector<HTMLElement>('.gsap-transition-diagonal--top')
        const middle = stage.querySelector<HTMLElement>('.gsap-transition-diagonal--middle')
        const bottom = stage.querySelector<HTMLElement>('.gsap-transition-diagonal--bottom')
        const lines = stage.querySelectorAll<HTMLElement>('.gsap-transition-diagonal-line')
        if (!top || !middle || !bottom) return undefined
        const tl = gsap.timeline({ defaults: { ease: EASE } })
        tl.to(top, { y: '14%', duration: DUR * 0.85 }, 0)
          .to(middle, { scaleY: 1, duration: DUR * 0.85 }, 0)
          .to(bottom, { y: '-112%', duration: DUR * 0.85 }, 0)
          .fromTo(lines, { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: DUR * 0.65, ease: SNAP }, '-=0.35')
        return tl
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const top = stage.querySelector<HTMLElement>('.gsap-transition-diagonal--top')
        const middle = stage.querySelector<HTMLElement>('.gsap-transition-diagonal--middle')
        const bottom = stage.querySelector<HTMLElement>('.gsap-transition-diagonal--bottom')
        const lines = stage.querySelectorAll<HTMLElement>('.gsap-transition-diagonal-line')
        if (top) gsap.set(top, { y: '-152%' })
        if (middle) gsap.set(middle, { scaleY: 0 })
        if (bottom) gsap.set(bottom, { y: '25%' })
        gsap.set(lines, { y: 28, opacity: 0 })
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--diagonal">
      <div className="gsap-transition-diagonal-content">
        <TransitionCopyWell tag="Revealed" title="Next section" />
        <ul className="gsap-transition-diagonal-nav">
          {['Overview', 'Features', 'Pricing'].map((item) => (
            <li key={item}>
              <span className="type-body-lg gsap-transition-diagonal-line">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <i className="gsap-transition-diagonal gsap-transition-diagonal--top" aria-hidden />
      <i className="gsap-transition-diagonal gsap-transition-diagonal--middle" aria-hidden />
      <i className="gsap-transition-diagonal gsap-transition-diagonal--bottom" aria-hidden />
    </TransitionStage>
  )
}

function OverlayRisePreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const scrim = stage.querySelector<HTMLElement>('.gsap-transition-scrim')
        const panel = stage.querySelector<HTMLElement>('.gsap-transition-overlay-panel')
        if (!scrim || !panel) return undefined
        return gsap
          .timeline({ defaults: { duration: 0.65, ease: easeCarouselWheel } })
          .to(scrim, { opacity: 1 }, 0)
          .fromTo(panel, { y: '115%', opacity: 0 }, { y: '0%', opacity: 1 }, 0.08)
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const scrim = stage.querySelector<HTMLElement>('.gsap-transition-scrim')
        const panel = stage.querySelector<HTMLElement>('.gsap-transition-overlay-panel')
        if (!scrim || !panel) return
        gsap.set(scrim, { opacity: 0 })
        gsap.set(panel, { y: '115%', opacity: 0 })
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--stacked">
      <TransitionSlide image={TRANSITION_IMG.interiorA} title="Page section" className="gsap-transition-slide--base" />
      <div className="gsap-transition-scrim" aria-hidden />
      <TransitionPanel tone="ink" label="Overlay section" className="gsap-transition-overlay-panel" />
    </TransitionStage>
  )
}

function BlurDissolvePreview() {
  const stageRef = useRef<HTMLDivElement>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const stage = stageRef.current
        if (!stage) return undefined
        const a = stage.querySelector<HTMLElement>('[data-panel="A"]')
        const b = stage.querySelector<HTMLElement>('[data-panel="B"]')
        if (!a || !b) return undefined
        return gsap
          .timeline({ defaults: { duration: 0.8, ease: 'power2.inOut' } })
          .to(a, { opacity: 0, filter: 'blur(16px) brightness(1.1)' }, 0)
          .fromTo(b, { opacity: 0, filter: 'blur(16px)' }, { opacity: 1, filter: 'blur(0px)' }, 0.15)
      },
      onLeave: () => {
        const stage = stageRef.current
        if (!stage) return
        const a = stage.querySelector<HTMLElement>('[data-panel="A"]')
        const b = stage.querySelector<HTMLElement>('[data-panel="B"]')
        if (!a || !b) return
        gsap.set(a, { opacity: 1, filter: 'blur(0px) brightness(1)' })
        gsap.set(b, { opacity: 0, filter: 'blur(16px)' })
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--stacked">
      <TransitionSlide image={TRANSITION_IMG.cityE} title="Fade out" className="gsap-transition-slide--base" dataPanel="A" />
      <TransitionSlide image={TRANSITION_IMG.cityF} title="Fade in" className="gsap-transition-slide--overlay" dataPanel="B" />
    </TransitionStage>
  )
}

function WebGLMorphDissolvePreview() {
  const stageRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<MorphGalleryEngine | null>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => {
        const engine = engineRef.current
        if (!engine) return undefined
        engine.setPair(0, 1, 1)
        const proxy = { progress: 0 }
        engine.setProgress(0)
        return gsap.to(proxy, {
          progress: 1,
          duration: 1.5,
          ease: easeCarouselWheel,
          onUpdate: () => engine.setProgress(proxy.progress),
        })
      },
      onLeave: () => {
        const engine = engineRef.current
        if (!engine) return
        engine.setPair(0, 0, 1)
        engine.setProgress(1)
      },
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--morph">
      <MorphTransitionCanvas
        imageA={TRANSITION_IMG.landscapeA}
        imageB={TRANSITION_IMG.landscapeB}
        onEngineReady={(engine) => {
          engineRef.current = engine
        }}
      />
    </TransitionStage>
  )
}

function SvgShapeMorphPreview() {
  const stageRef = useRef<HTMLDivElement>(null)
  const morphRef = useRef<{
    morphToB: () => gsap.core.Timeline
    resetA: () => void
  } | null>(null)

  const slideA = SHAPE_MORPH_GALLERY_DEMO_SLIDES[0]
  const slideB = SHAPE_MORPH_GALLERY_DEMO_SLIDES[1]

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => morphRef.current?.morphToB(),
      onLeave: () => morphRef.current?.resetA(),
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--shape-morph">
      <ShapeMorphTransitionSvg
        slideA={slideA}
        slideB={slideB}
        onReady={(api) => {
          morphRef.current = api
        }}
      />
    </TransitionStage>
  )
}

function WaveMaskPulsePreview() {
  const stageRef = useRef<HTMLDivElement>(null)
  const waveRef = useRef<WaveMaskTransitionApi | null>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => waveRef.current?.playEnter(),
      onLeave: () => waveRef.current?.reset(),
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--wave-mask">
      <WaveMaskTransitionStage
        imageA={TRANSITION_IMG.interiorA}
        imageB={TRANSITION_IMG.interiorB}
        titleA="Animation"
        titleB="Development"
        variant="pulse"
        onReady={(api) => {
          waveRef.current = api
        }}
      />
    </TransitionStage>
  )
}

function WaveMaskScrollPreview() {
  const stageRef = useRef<HTMLDivElement>(null)
  const waveRef = useRef<WaveMaskTransitionApi | null>(null)

  useGsapHoverTransition(
    stageRef,
    {
      onEnter: () => waveRef.current?.playEnter(),
      onLeave: () => waveRef.current?.reset(),
    },
    [],
  )

  return (
    <TransitionStage ref={stageRef} className="gsap-transition-stage--wave-mask">
      <WaveMaskTransitionStage
        imageA={TRANSITION_IMG.landscapeA}
        imageB={TRANSITION_IMG.landscapeB}
        titleA="Animation"
        titleB="Development"
        variant="scroll"
        onReady={(api) => {
          waveRef.current = api
        }}
      />
    </TransitionStage>
  )
}

export const gsapTransitionArrangements: GsapTransitionArrangement[] = [
  {
    id: 'vertical-clip-peel',
    category: 'reveal',
    name: 'Vertical clip peel',
    purpose: 'Stacked full-bleed slides peel upward via inset clip-path — ScrollTrigger pin pattern from Envato Tuts+.',
    reference: 'CodePen tutsplus/abgxGaE · GSAP clipPath inset(0 0 100% 0)',
    stack: 'gsap.timeline · clipPath peel · heading fade · stagger 0.28',
    preview: <VerticalPeelPreview />,
  },
  {
    id: 'horizontal-train',
    category: 'cover',
    name: 'Horizontal panel train',
    purpose: 'Sections ride horizontally on a flex track — carousel / pinned horizontal scrub.',
    reference: 'Gist king816 ScrollTrigger clip-path horizontal · xPercent train',
    stack: 'gsap.to(track, { xPercent: -200 }) · easeCarouselWheel',
    preview: <HorizontalTrainPreview />,
  },
  {
    id: 'circle-iris',
    category: 'reveal',
    name: 'Circle iris reveal',
    purpose: 'Iris clip-path expands over a dimming base layer — incoming image scales down with masked type.',
    reference: 'Gist king816 · LandingStyleGallery parallax · easeCarouselWheel',
    stack: 'gsap.timeline · circle clip + base scale 1.18 · iris img 1.22→1 · type fade',
    preview: <CircleIrisPreview />,
  },
  {
    id: 'circle-iris-reverse',
    category: 'reveal',
    name: 'Circle iris contract',
    purpose:
      'Inverse iris — full overlay contracts to a pinhole while the base layer brightens and scales up; type handoff to the revealed layer.',
    reference: 'Pair of circle-iris reveal · easeCarouselWheel',
    stack: 'gsap.timeline · circle 155%→0 · base brighten · iris img 1→1.22 · base type fade',
    preview: <CircleIrisReversePreview />,
  },
  {
    id: 'diagonal-panel-cover',
    category: 'cover',
    name: 'Diagonal panel cover',
    purpose: 'Three rotated panels sweep open — UI8 Nav (Dribbble) diagonal cover from item-reference/front-end/gsap-transition-1.',
    reference: 'item-reference/front-end/gsap-transition-1 · TimelineMax middle scaleY + top/bottom y',
    stack: 'gsap.timeline · scaleY middle · y top/bottom · nav stagger fade',
    preview: <DiagonalPanelCoverPreview />,
  },
  {
    id: 'four-panel-curtain',
    category: 'reveal',
    name: 'Four-panel curtain',
    purpose: 'Vertical strips lift in sequence to unveil the section beneath — agency menu curtain pattern.',
    reference: 'FreeFrontend staggered panel curtain · GSAP strip stagger',
    stack: 'gsap.timeline · y -108% per strip · stagger 0.09',
    preview: <FourPanelCurtainPreview />,
  },
  {
    id: 'slide-cover',
    category: 'cover',
    name: 'Gallery clip cover',
    purpose: 'Dual-layer clip-path cover — bg diagonal reveal + main card wipe + masked display title (LandingStyleGallery).',
    reference: 'LandingStyleGallery · ref.image-carousel-3 · easeCarouselWheel',
    stack: 'gsap.timeline · CLIP_REVEAL_DOWN bg · CLIP_FULL main · title well travel · bg scale 1.45',
    preview: <SlideCoverPreview />,
  },
  {
    id: 'crossfade-panels',
    category: 'crossfade',
    name: 'Crossfade + ken burns',
    purpose: 'Opacity handoff with subtle incoming image scale — hero-to-hero transitions.',
    reference: 'GSAP opacity timelines · LandingStyleGallery ken burns',
    stack: 'gsap.timeline · opacity + scale on panels · img scale 1 → 1.08',
    preview: <CrossfadePreview />,
  },
  {
    id: 'blur-dissolve',
    category: 'crossfade',
    name: 'Blur dissolve',
    purpose: 'Cinematic dissolve — blur + brightness on exit, sharp enter on the next section.',
    reference: 'GSAP filter blur · hero transition conventions',
    stack: 'gsap.timeline · opacity + filter blur(16px) · overlap 0.15s',
    preview: <BlurDissolvePreview />,
  },
  {
    id: 'webgl-morph-dissolve',
    category: 'crossfade',
    name: 'WebGL noise morph',
    purpose: 'Shader dissolve between two full-bleed images — FBM noise mask + vertical distort (ref.image-carousel-8).',
    reference: 'item-reference/front-end/image-carousel-8 · @wethegit/react-gallery morph canvas',
    stack: 'MorphGalleryEngine · gsap.to({ progress }) · easeCarouselWheel · u_progress scrub',
    preview: <WebGLMorphDissolvePreview />,
  },
  {
    id: 'svg-shape-morph',
    category: 'crossfade',
    name: 'SVG shape morph',
    purpose: 'Masked photo inside a morphing pixel silhouette — flubber path tween + mid-morph image swap (ref.image-carousel-9).',
    reference: 'item-reference/front-end/image-carousel-9 · GSAP expo.inOut path morph',
    stack: 'flubber interpolate · morphShapePair · SVG mask + outline stroke',
    preview: <SvgShapeMorphPreview />,
  },
  {
    id: 'stagger-reveal',
    category: 'stagger',
    name: 'Stagger reveal',
    purpose: 'Section children mount with staggered y + opacity — batch / on-enter pattern.',
    reference: 'GSAP stagger · item-reference/front-end/gsap-transition-2 · ScrollTrigger.batch',
    stack: 'gsap.fromTo · y 56 → 0 · opacity · stagger 0.14',
    preview: <StaggerRevealPreview />,
  },
  {
    id: 'stacked-reveal',
    category: 'stack',
    name: 'Stacked clip peel',
    purpose: 'Top photo card clip-collapses upward; deck promotes with masked display title on the next card.',
    reference: 'LandingStyleGallery CLIP_COLLAPSED_TOP · demos.gsap.com card stack',
    stack: 'gsap.timeline · clipPath collapse top card · y scale deck · yPercent title masks',
    preview: <StackedRevealPreview />,
  },
  {
    id: 'pin-stack',
    category: 'stack',
    name: 'Pin stack compress',
    purpose: 'Viewport scales to 0.95 while accent overlay wipes down — pinned sections with masked titles (gsap-transition-2).',
    reference: 'item-reference/front-end/gsap-transition-2 · scale + scaleY overlay · yPercent stagger',
    stack: 'gsap.timeline · viewport scale 0.95 · overlay scaleY · pin-line yPercent 100→0',
    preview: <PinStackPreview />,
  },
  {
    id: 'overlay-rise',
    category: 'overlay',
    name: 'Overlay rise',
    purpose: 'Full scrim + large overlay panel rises over the page section.',
    reference: 'item-reference/front-end/gsap-transition-5 · modal section pattern',
    stack: 'gsap.timeline · scrim opacity · panel y 115% → 0',
    preview: <OverlayRisePreview />,
  },
  {
    id: 'wave-mask-pulse',
    category: 'reveal',
    name: 'Wave mask pulse',
    purpose: 'Animated sine-wave SVG mask reveals the next layer — p5 ticker parity from item-reference/front-end/gsap-transition-7.',
    reference: 'item-reference/front-end/gsap-transition-7 · GSAP ticker + polygon mask',
    stack: 'gsap.ticker · waveMaskPolygonPoints pulse · gsap.to(waveY) reveal',
    preview: <WaveMaskPulsePreview />,
  },
  {
    id: 'wave-mask-scroll',
    category: 'reveal',
    name: 'Wave mask scroll',
    purpose: 'Scroll-scrubbed wave mask sweeps upward to hand off typography or imagery — item-reference/front-end/gsap-transition-8.',
    reference: 'item-reference/front-end/gsap-transition-8 · waveY scrub · dashed stroke bands',
    stack: 'gsap.ticker · waveMaskPolygonPoints scroll · gsap.to(waveY) · power2.inOut',
    preview: <WaveMaskScrollPreview />,
  },
  ...SLIDESHOW_FX_META.map((entry) => ({
    id: `slideshow-${entry.id}`,
    category: 'slideshow' as const,
    name: entry.name,
    purpose: entry.purpose,
    reference: `Codrops Slideshow Animations · ${entry.id}`,
    stack: entry.stack,
    preview: (
      <p className="type-body-sm mb-0">
        Open interactive demo:{' '}
        <Link className="underline" to={`/theme?section=gallery-slideshow&fx=${entry.id}`}>
          /theme?section=gallery-slideshow&fx={entry.id}
        </Link>
      </p>
    ),
  })),
]
