import { useRef, useState, type RefObject } from 'react'
import type { IconSvgElement } from '@hugeicons/react'
import {
  CheckListIcon,
  FileCheckIcon,
  InboxIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HomeWhatWeDoVideoReel } from '../components/HomeWhatWeDoVideoReel'
import { PageScrollType } from '../components/PageScrollType'
import { PointerFollowDeck } from '../components/PointerFollowDeck'
import { VurifyIcon } from '../components/VurifyIcon'
import { gsap, ScrollTrigger, useGSAP, useGsapPage } from '../lib/gsap'
import { HOME_ASSETS } from '../lib/homeAssets/catalog'

type FlavourTicket = {
  id: string
  label: string
  meta: string
  body: string
  icon: IconSvgElement
}

/**
 * Toast-style tickets — Auryn “What more does Vurify offer” extras,
 * rendered as small notification chips around the miniature.
 */
const FLAVOUR_TICKETS: readonly FlavourTicket[] = [
  {
    id: 'cv-taken',
    label: 'Résumé taken',
    meta: 'Intake · just now',
    body: 'Gather details and documents before the interview starts.',
    icon: FileCheckIcon,
  },
  {
    id: 'intake-ready',
    label: 'Intake ready',
    meta: 'Documents on file',
    body: 'Eligibility sits ready so the interview opens clean.',
    icon: InboxIcon,
  },
  {
    id: 'form-cleared',
    label: 'Form cleared',
    meta: 'Eligibility · passed',
    body: 'Screening passed — the candidate can continue.',
    icon: Tick02Icon,
  },
  {
    id: 'shortlist-ready',
    label: 'Output card ready',
    meta: 'Reasons attached',
    body: 'Ranked people with short reasons you can check.',
    icon: CheckListIcon,
  },
]

type HomeWhatWeDoSceneProps = {
  scrollerRef: RefObject<HTMLDivElement | null>
}

/**
 * Home Internal Scene 02 — “See beyond” / looping video / “the résumé.”
 * Flavour art + toast tickets orbit the miniature, then exit as the video expands.
 */
export function HomeWhatWeDoScene({ scrollerRef }: HomeWhatWeDoSceneProps) {
  const rootRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const videoShellRef = useRef<HTMLDivElement>(null)
  const flavourRef = useRef<HTMLDivElement>(null)
  const topLineRef = useRef<HTMLHeadingElement>(null)
  const bottomLineRef = useRef<HTMLHeadingElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [reelPlaying, setReelPlaying] = useState(false)
  const { reducedMotion, refreshScroll } = useGsapPage()

  useGSAP(
    () => {
      const track = trackRef.current
      const stage = stageRef.current
      const slot = slotRef.current
      const videoShell = videoShellRef.current
      const flavour = flavourRef.current
      const topLine = topLineRef.current
      const bottomLine = bottomLineRef.current
      if (!track || !stage || !slot || !videoShell || !flavour || !topLine || !bottomLine) {
        return
      }

      const artNodes = gsap.utils.toArray<HTMLElement>(
        flavour.querySelectorAll('[data-flavour="art"]'),
      )
      const ticketNodes = gsap.utils.toArray<HTMLElement>(
        flavour.querySelectorAll('[data-flavour="ticket"]'),
      )

      /**
       * Mini frame must match the layout slot box (width + height).
       * Width-only scale of a full-stage shell looks fine on desktop but on
       * tall mobile it stays much taller than the 16:9 slot, so titles clip.
       */
      const isMobileStage = () => window.matchMedia('(max-width: 40rem)').matches

      const remPx = () =>
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

      const shellEdgePx = () => (isMobileStage() ? remPx() * 0.4 : 0)

      const miniShellBox = () => {
        const stageRect = stage.getBoundingClientRect()
        const slotRect = slot.getBoundingClientRect()
        return {
          top: slotRect.top - stageRect.top,
          left: slotRect.left - stageRect.left,
          width: Math.max(1, slotRect.width),
          height: Math.max(1, slotRect.height),
          borderRadius: isMobileStage() ? remPx() * 0.55 : 0,
        }
      }

      /** Placeholder reel — stop short of fullscreen so scroll can hand off sooner. */
      const EXPAND_RATIO = 0.75

      const expandedShellBox = () => {
        const mini = miniShellBox()
        const edge = shellEdgePx()
        const full = {
          top: edge,
          left: edge,
          width: Math.max(1, stage.clientWidth - edge * 2),
          height: Math.max(1, stage.clientHeight - edge * 2),
          borderRadius: isMobileStage() ? remPx() * 0.35 : 0,
        }
        const mix = (from: number, to: number) => from + (to - from) * EXPAND_RATIO
        return {
          top: mix(mini.top, full.top),
          left: mix(mini.left, full.left),
          width: mix(mini.width, full.width),
          height: mix(mini.height, full.height),
          borderRadius: mix(mini.borderRadius, full.borderRadius),
        }
      }

      if (reducedMotion) {
        gsap.set(videoShell, { ...miniShellBox(), clipPath: 'none', filter: 'grayscale(1)' })
        gsap.set([topLine, bottomLine, ...artNodes, ...ticketNodes], {
          clearProps: 'opacity,visibility,y,x,scale,rotate',
        })
        setExpanded(false)
        setReelPlaying(false)
        return
      }

      gsap.set(videoShell, {
        ...miniShellBox(),
        clipPath: 'inset(0 100% 0 0)',
        filter: 'grayscale(1)',
        force3D: true,
      })

      gsap.set(artNodes, {
        autoAlpha: 0,
        x: (index) => (index % 2 === 0 ? -56 : 56),
        y: (index) => (index % 2 === 0 ? 18 : -14),
        scale: 0.92,
        rotate: (index) => (index % 2 === 0 ? -4 : 5),
        force3D: true,
      })
      gsap.set(ticketNodes, {
        autoAlpha: 0,
        x: (index) => (index % 2 === 0 ? 36 : -36),
        y: (index) => (index % 3 === 0 ? 16 : -10),
        scale: 0.96,
        rotate: (index) => (index % 2 === 0 ? -1.5 : 1.8),
        force3D: true,
      })

      let cancelled = false
      let timeline: ReturnType<typeof gsap.timeline> | null = null
      let enterTween: ReturnType<typeof gsap.timeline> | null = null
      let scene2PlayTrigger: ScrollTrigger | null = null
      let scene3PlayTrigger: ScrollTrigger | null = null

      const frameId = requestAnimationFrame(() => {
        if (cancelled) return
        const scroller = scrollerRef.current
        if (!scroller) return

        // Re-measure after layout — slot box is wrong on first paint sometimes.
        gsap.set(videoShell, { ...miniShellBox(), force3D: true })

        const HOLD_START = 0.94
        const nextSection = rootRef.current?.parentElement?.querySelector<HTMLElement>(
          '#home-scene-3',
        )

        const syncPlaying = () => {
          const s2 = scene2PlayTrigger
          const s3 = scene3PlayTrigger
          if (!s2) return
          const reachedHold = s2.progress >= HOLD_START
          const clipOpen = s2.progress >= 0.12
          const beforeQuarterIntoNext = !s3 || s3.progress < 0.25
          const shouldExpand = reachedHold && beforeQuarterIntoNext
          const shouldPlay = clipOpen && beforeQuarterIntoNext
          setExpanded((current) => (current === shouldExpand ? current : shouldExpand))
          setReelPlaying((current) => (current === shouldPlay ? current : shouldPlay))
        }

        scene2PlayTrigger = ScrollTrigger.create({
          scroller,
          trigger: track,
          start: 'top 70%',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onRefresh: () => {
            if ((scene2PlayTrigger?.progress ?? 0) < 0.56) {
              gsap.set(videoShell, { ...miniShellBox(), force3D: true })
            }
          },
          onUpdate: syncPlaying,
          onToggle: syncPlaying,
        })

        if (nextSection) {
          scene3PlayTrigger = ScrollTrigger.create({
            scroller,
            trigger: nextSection,
            start: 'top top',
            end: 'bottom bottom',
            invalidateOnRefresh: true,
            onUpdate: syncPlaying,
            onToggle: syncPlaying,
          })
        }

        // Match PageScrollType “See beyond” enter (`start: top 75%` on the top line).
        enterTween = gsap.timeline({
          scrollTrigger: {
            scroller,
            trigger: topLine,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
            invalidateOnRefresh: true,
          },
        })
        enterTween
          .to(
            artNodes,
            {
              autoAlpha: 1,
              x: 0,
              y: 0,
              scale: 1,
              rotate: (index) => (index % 2 === 0 ? -2.5 : 3),
              duration: 0.85,
              stagger: 0.08,
              ease: 'power3.out',
              force3D: true,
              overwrite: 'auto',
            },
            0,
          )
          .to(
            ticketNodes,
            {
              autoAlpha: 1,
              x: 0,
              y: 0,
              scale: 1,
              rotate: (index) => (index % 2 === 0 ? -1.2 : 1.4),
              duration: 0.8,
              stagger: 0.05,
              ease: 'power2.out',
              force3D: true,
              overwrite: 'auto',
            },
            0,
          )

        timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            scroller,
            trigger: track,
            start: 'top 70%',
            end: 'bottom bottom',
            scrub: 0.5,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              // Once scrub owns the exit, stop the enter timeline fighting ticket/art props.
              if (!enterTween) return
              if (self.progress >= 0.22) {
                if (!enterTween.paused()) enterTween.pause()
              } else if (enterTween.paused()) {
                enterTween.resume()
              }
            },
          },
        })

        timeline
          .to(
            videoShell,
            { clipPath: 'inset(0 0% 0 0)', duration: 0.14, ease: 'power2.out', force3D: true },
            0,
          )
          .to({}, { duration: 0.08 }, 0.14)
          /* Tickets/art leave while still under the video — finish before shell grow. */
          .to(
            ticketNodes,
            {
              autoAlpha: 0,
              x: (index) => (index % 2 === 0 ? 64 : -64),
              y: (index) => (index % 3 === 0 ? -22 : 18),
              scale: 0.92,
              duration: 0.18,
              stagger: 0.015,
              ease: 'power2.in',
              force3D: true,
              overwrite: 'auto',
            },
            0.22,
          )
          .to(
            artNodes,
            {
              autoAlpha: 0,
              x: (index) => (index % 2 === 0 ? -120 : 120),
              y: (index) => (index % 2 === 0 ? -24 : 28),
              scale: 0.88,
              rotate: (index) => (index % 2 === 0 ? -10 : 12),
              duration: 0.2,
              stagger: 0.03,
              ease: 'power2.in',
              force3D: true,
              overwrite: 'auto',
            },
            0.26,
          )
          .to(
            [topLine, bottomLine],
            {
              autoAlpha: 0,
              y: (index) => (index === 0 ? -48 : 48),
              duration: 0.16,
              ease: 'power2.inOut',
              force3D: true,
              overwrite: 'auto',
            },
            0.4,
          )
          .fromTo(
            videoShell,
            {
              top: () => miniShellBox().top,
              left: () => miniShellBox().left,
              width: () => miniShellBox().width,
              height: () => miniShellBox().height,
              borderRadius: () => miniShellBox().borderRadius,
            },
            {
              top: () => expandedShellBox().top,
              left: () => expandedShellBox().left,
              width: () => expandedShellBox().width,
              height: () => expandedShellBox().height,
              borderRadius: () => expandedShellBox().borderRadius,
              duration: 0.34,
              ease: 'power3.inOut',
              force3D: true,
              immediateRender: false,
            },
            0.5,
          )
          .to({}, { duration: 0.16 }, 0.84)

        syncPlaying()
        refreshScroll()
      })

      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
        scene2PlayTrigger?.kill()
        scene3PlayTrigger?.kill()
        enterTween?.scrollTrigger?.kill()
        enterTween?.kill()
        timeline?.scrollTrigger?.kill()
        timeline?.kill()
        setExpanded(false)
        setReelPlaying(false)
      }
    },
    {
      scope: rootRef,
      dependencies: [reducedMotion, refreshScroll, scrollerRef],
      revertOnUpdate: true,
    },
  )

  return (
    <section
      ref={rootRef}
      id="home-scene-2"
      className="page-scene page-scene--home-what-we-do"
      aria-label="What we do"
      data-expanded={expanded ? 'true' : 'false'}
    >
      <div ref={trackRef} className="page-scene--home-what-we-do__track">
        <div ref={stageRef} className="page-scene--home-what-we-do__stage">
          <div ref={videoShellRef} className="page-scene--home-what-we-do__video-shell">
            <HomeWhatWeDoVideoReel
              className="page-scene--home-what-we-do__video"
              playing={reelPlaying}
            />
          </div>

          <div
            ref={flavourRef}
            className="page-scene--home-what-we-do__flavour"
            aria-hidden="true"
          >
            <div
              data-flavour="art"
              data-side="left"
              className="page-scene--home-what-we-do__art page-scene--home-what-we-do__art--a"
            >
              <PointerFollowDeck
                fit="contain"
                plain
                autoPivot
                idleWobble
                decorative
                scrollerRef={scrollerRef}
                reducedMotion={reducedMotion}
              >
                <img
                  src={HOME_ASSETS.beyondResumeA.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </PointerFollowDeck>
            </div>
            <div
              data-flavour="art"
              data-side="right"
              className="page-scene--home-what-we-do__art page-scene--home-what-we-do__art--b"
            >
              <PointerFollowDeck
                fit="contain"
                plain
                autoPivot
                idleWobble
                decorative
                scrollerRef={scrollerRef}
                reducedMotion={reducedMotion}
              >
                <img
                  src={HOME_ASSETS.beyondResumeB.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </PointerFollowDeck>
            </div>
            {FLAVOUR_TICKETS.map((ticket) => (
              <div
                key={ticket.id}
                data-flavour="ticket"
                data-ticket={ticket.id}
                className="page-scene--home-what-we-do__ticket"
                role="status"
              >
                <span className="page-scene--home-what-we-do__ticket-icon" aria-hidden>
                  <VurifyIcon
                    iconNode={ticket.icon}
                    variant="plain"
                    tone="accent"
                    size="lg"
                  />
                </span>
                <span className="page-scene--home-what-we-do__ticket-copy">
                  <span className="page-scene--home-what-we-do__ticket-label type-title">
                    {ticket.label}
                  </span>
                  <span className="page-scene--home-what-we-do__ticket-meta type-caption type-muted">
                    {ticket.meta}
                  </span>
                  <span className="page-scene--home-what-we-do__ticket-body type-caption type-muted">
                    {ticket.body}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="page-scene--home-what-we-do__layout">
            <h2
              ref={topLineRef}
              className="page-scene--home-what-we-do__line page-scene--home-what-we-do__line--top type-display-lg"
            >
              {reducedMotion ? (
                <>
                  See{' '}
                  <span className="page-scene--home-what-we-do__word page-scene--home-what-we-do__word--accent">
                    beyond
                  </span>
                </>
              ) : (
                <PageScrollType
                  text="See beyond"
                  effect={2}
                  mode="enter"
                  scrollerRef={scrollerRef}
                  className="theme-page-scroll-type--center"
                  start="top 75%"
                  wordClassNames={{
                    beyond:
                      'page-scene--home-what-we-do__word page-scene--home-what-we-do__word--accent',
                  }}
                />
              )}
            </h2>

            <div ref={slotRef} className="page-scene--home-what-we-do__video-slot" aria-hidden="true" />

            <h2
              ref={bottomLineRef}
              className="page-scene--home-what-we-do__line page-scene--home-what-we-do__line--bottom type-display-lg"
            >
              {reducedMotion ? (
                <>
                  the{' '}
                  <span className="page-scene--home-what-we-do__word page-scene--home-what-we-do__word--complement">
                    résumé
                  </span>
                  .
                </>
              ) : (
                <PageScrollType
                  text="the résumé."
                  effect={2}
                  mode="enter"
                  scrollerRef={scrollerRef}
                  className="theme-page-scroll-type--center"
                  start="top 75%"
                  wordClassNames={{
                    'résumé.':
                      'page-scene--home-what-we-do__word page-scene--home-what-we-do__word--complement',
                  }}
                />
              )}
            </h2>
          </div>
        </div>
      </div>
    </section>
  )
}
