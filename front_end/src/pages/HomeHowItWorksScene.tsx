import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  Briefcase01Icon,
  Building03Icon,
  File01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import {
  ButtonHoverFx,
  type ButtonHoverFxMarqueeContent,
} from '../components/ButtonHoverFx'
import { PageScrollType } from '../components/PageScrollType'
import { RadioGroup } from '../components/RadioGroup'
import { VurifyExpertiseTimeline } from '../components/VurifyExpertiseTimeline'
import { gsap, useGsapPage } from '../lib/gsap'
import { animateScrollTop, scrollTopForElement } from '../lib/scroll/scrollSpeedCap'
import {
  VURIFY_EXPERTISE_BY_AUDIENCE,
  type VurifyExpertiseAudience,
} from '../lib/timeline/vurifyExpertiseTimeline'

type HomeHowItWorksSceneProps = {
  scrollerRef: RefObject<HTMLDivElement | null>
  onOpenBooking?: () => void
}

type HowItWorksAudience = VurifyExpertiseAudience
type PreviewPhase = 'idle' | 'out' | 'in'

/** Match SceneStackMenu preview slide duration. */
const PANEL_SWITCH_MS = 520
/** Desktop How-it-works layout (marquees + sticky rail). CSS stacks ≤52rem. */
const HOW_IT_WORKS_DESKTOP_MQ = '(min-width: 52.0625rem)'

/** Glow scrub: center-to-center travel (tracks sticky page scroll more evenly). */
const EXPERTISE_SCROLL = { start: 'top center', end: 'bottom center' } as const
/** Tighter scrub than page default so the marker doesn’t lag behind scroll. */
const EXPERTISE_SCRUB = 0.45

const AUDIENCE_TOGGLE_OPTIONS = [
  { value: 'employers', label: 'Employers' },
  { value: 'candidates', label: 'Candidates' },
] as const

const EMPLOYERS_MARQUEE = {
  label: 'employers',
  marqueeLabel: 'hiring teams',
  marqueeLabels: ['employers', 'hiring teams', 'recruiters', 'companies'],
  sideIcon: Briefcase01Icon,
  sideIconEnd: Building03Icon,
} satisfies ButtonHoverFxMarqueeContent

const CANDIDATES_MARQUEE = {
  label: 'candidates',
  marqueeLabel: 'interviewees',
  marqueeLabels: ['candidates', 'interviewees', 'talent', 'applicants'],
  sideIcon: UserIcon,
  sideIconEnd: File01Icon,
} satisfies ButtonHoverFxMarqueeContent

/**
 * Home Internal Scene 04 — page-scrolled timeline with sticky How-Vurify-works + For
 * + marquees. Sticky rail holds until the section (timeline) ends. Audience switch:
 * lead text fades out → For moves → lead fades in; timeline out → swap → in.
 * Desktop also glides the page scroller back to the section start so the new
 * timeline is not entered mid-scrub.
 */
export function HomeHowItWorksScene({ scrollerRef, onOpenBooking }: HomeHowItWorksSceneProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stickyRailRef = useRef<HTMLDivElement>(null)
  const comboRef = useRef<HTMLDivElement>(null)
  const moverRef = useRef<HTMLDivElement>(null)
  const leadRef = useRef<HTMLDivElement>(null)
  const forBlockRef = useRef<HTMLDivElement>(null)
  const audienceColRef = useRef<HTMLDivElement>(null)
  const employersRowRef = useRef<HTMLDivElement>(null)
  const candidatesRowRef = useRef<HTMLDivElement>(null)
  const panelExitTimerRef = useRef<number | null>(null)
  const panelEnterTimerRef = useRef<number | null>(null)
  const audienceScrollCancelRef = useRef<(() => void) | null>(null)
  const moverTweenRef = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null)
  const leadAnimatingRef = useRef(false)
  const audienceRef = useRef<HowItWorksAudience>('employers')
  const prevAudienceRef = useRef<HowItWorksAudience>('employers')
  const [audience, setAudience] = useState<HowItWorksAudience>('employers')
  const [displayedAudience, setDisplayedAudience] = useState<HowItWorksAudience>('employers')
  const [panelPhase, setPanelPhase] = useState<PreviewPhase>('idle')
  const { reducedMotion, refreshScroll } = useGsapPage()
  audienceRef.current = audience

  const clearPanelTimers = useCallback(() => {
    if (panelExitTimerRef.current !== null) {
      window.clearTimeout(panelExitTimerRef.current)
      panelExitTimerRef.current = null
    }
    if (panelEnterTimerRef.current !== null) {
      window.clearTimeout(panelEnterTimerRef.current)
      panelEnterTimerRef.current = null
    }
  }, [])

  const restoreLead = useCallback(() => {
    const lead = leadRef.current
    if (!lead) return
    gsap.set(lead, { opacity: 1, clearProps: 'transform' })
  }, [])

  const syncComboWidth = useCallback(() => {
    const combo = comboRef.current
    const forBlock = forBlockRef.current
    const audienceCol = audienceColRef.current
    if (!combo || !forBlock || !audienceCol) return
    const styles = getComputedStyle(combo)
    const gap = Number.parseFloat(styles.columnGap || '0') || 0
    const width = forBlock.offsetWidth + gap + audienceCol.offsetWidth
    combo.style.setProperty('--how-it-works-combo-width', `${Math.ceil(width)}px`)
  }, [])

  const syncMoverToAudience = useCallback(
    (opts?: { animateLead?: boolean }) => {
      const activeAudience = audienceRef.current
      const combo = comboRef.current
      const mover = moverRef.current
      const lead = leadRef.current
      const forBlock = forBlockRef.current
      const row =
        activeAudience === 'employers'
          ? employersRowRef.current
          : candidatesRowRef.current
      if (!combo || !mover || !forBlock || !row) return

      syncComboWidth()

      const comboBox = combo.getBoundingClientRect()
      const rowBox = row.getBoundingClientRect()
      const leadH = lead?.offsetHeight ?? 0
      const gap = lead
        ? Number.parseFloat(getComputedStyle(mover).rowGap || '0') || 0
        : 0
      const forCenterInMover = leadH + gap + forBlock.offsetHeight / 2
      const underlineBias = Math.min(10, rowBox.height * 0.16)
      const y = Math.max(
        0,
        rowBox.top + rowBox.height / 2 - comboBox.top - forCenterInMover - underlineBias,
      )

      const animateLead = opts?.animateLead === true && Boolean(lead) && !reducedMotion

      // Layout sync while switching — do not kill the vanish/reappear timeline.
      if (!animateLead && leadAnimatingRef.current) {
        return
      }

      moverTweenRef.current?.kill()
      moverTweenRef.current = null

      if (reducedMotion) {
        leadAnimatingRef.current = false
        gsap.set(mover, { y })
        restoreLead()
        return
      }

      if (!animateLead) {
        leadAnimatingRef.current = false
        restoreLead()
        moverTweenRef.current = gsap.to(mover, {
          y,
          duration: 0.55,
          ease: 'power2.out',
          overwrite: 'auto',
          force3D: true,
        })
        return
      }

      // Opacity-only on lead so nested transforms can’t leave it stranded at 0.
      leadAnimatingRef.current = true
      gsap.set(lead, { opacity: 1, clearProps: 'transform' })
      const tl = gsap.timeline({
        overwrite: 'auto',
        onComplete: () => {
          leadAnimatingRef.current = false
          restoreLead()
        },
      })
      moverTweenRef.current = tl
      tl.to(lead, {
        opacity: 0,
        duration: 0.16,
        ease: 'power2.in',
      })
      tl.to(
        mover,
        {
          y,
          duration: 0.55,
          ease: 'power2.out',
          force3D: true,
        },
        0.08,
      )
      tl.to(
        lead,
        {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        },
        '>-0.16',
      )
    },
    [reducedMotion, restoreLead, syncComboWidth],
  )

  const scrollDesktopTimelineToStart = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia(HOW_IT_WORKS_DESKTOP_MQ).matches) {
      return
    }
    const scroller = scrollerRef.current
    const section = sectionRef.current
    if (!scroller || !section) return
    const top = scrollTopForElement(scroller, section)
    if (Math.abs(scroller.scrollTop - top) < 12) return
    audienceScrollCancelRef.current?.()
    audienceScrollCancelRef.current = animateScrollTop(scroller, top, {
      immediate: reducedMotion,
    })
  }, [reducedMotion, scrollerRef])

  useEffect(() => {
    const audienceChanged = prevAudienceRef.current !== audience
    prevAudienceRef.current = audience
    const frame = requestAnimationFrame(() => {
      syncMoverToAudience({ animateLead: audienceChanged })
    })
    const combo = comboRef.current
    const rail = stickyRailRef.current
    if ((!combo && !rail) || typeof ResizeObserver === 'undefined') {
      return () => cancelAnimationFrame(frame)
    }

    const observer = new ResizeObserver(() => {
      syncComboWidth()
      syncMoverToAudience({ animateLead: false })
    })
    if (combo) observer.observe(combo)
    if (rail) observer.observe(rail)
    if (audienceColRef.current) observer.observe(audienceColRef.current)
    if (forBlockRef.current) observer.observe(forBlockRef.current)
    if (employersRowRef.current) observer.observe(employersRowRef.current)
    if (candidatesRowRef.current) observer.observe(candidatesRowRef.current)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [audience, syncComboWidth, syncMoverToAudience])

  useEffect(() => {
    clearPanelTimers()

    if (audience === displayedAudience) {
      setPanelPhase('idle')
      return
    }

    scrollDesktopTimelineToStart()

    if (reducedMotion) {
      setDisplayedAudience(audience)
      setPanelPhase('idle')
      return
    }

    let cancelled = false

    // Timeline out → swap → in. Desktop also glides back to the section start
    // so the new audience is not entered mid-scrub.
    setPanelPhase('out')
    panelExitTimerRef.current = window.setTimeout(() => {
      if (cancelled) return
      setDisplayedAudience(audience)
      setPanelPhase('in')
      panelExitTimerRef.current = null
      panelEnterTimerRef.current = window.setTimeout(() => {
        if (cancelled) return
        setPanelPhase('idle')
        panelEnterTimerRef.current = null
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (cancelled) return
            refreshScroll()
          })
        })
      }, PANEL_SWITCH_MS)
    }, PANEL_SWITCH_MS)

    return () => {
      cancelled = true
      clearPanelTimers()
    }
  }, [
    audience,
    clearPanelTimers,
    displayedAudience,
    reducedMotion,
    refreshScroll,
    scrollDesktopTimelineToStart,
  ])

  useEffect(() => {
    if (panelPhase !== 'idle') return
    const frame = requestAnimationFrame(() => refreshScroll())
    return () => cancelAnimationFrame(frame)
  }, [displayedAudience, panelPhase, refreshScroll])

  useEffect(() => {
    return () => {
      moverTweenRef.current?.kill()
      leadAnimatingRef.current = false
      audienceScrollCancelRef.current?.()
      audienceScrollCancelRef.current = null
    }
  }, [])

  const onCtaClick = useCallback(() => {
    onOpenBooking?.()
  }, [onOpenBooking])

  return (
    <section
      ref={sectionRef}
      id="home-scene-4"
      className="page-scene page-scene--home-how-it-works"
      aria-label="How it Works"
      data-audience={audience}
    >
      <div className="page-scene--home-how-it-works__layout">
        <div ref={stickyRailRef} className="page-scene--home-how-it-works__sticky-rail">
          <div ref={comboRef} className="page-scene--home-how-it-works__combo">
            <span
              className="page-scene--home-how-it-works__for-gutter type-display-lg"
              aria-hidden="true"
            >
              For
            </span>

            <div ref={audienceColRef} className="page-scene--home-how-it-works__audience-col">
              <div
                ref={employersRowRef}
                className={[
                  'page-scene--home-how-it-works__audience-row',
                  'page-scene--home-how-it-works__audience-row--employers',
                  audience === 'employers' ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <ButtonHoverFx
                  variant="marquee-menu"
                  marqueeContent={EMPLOYERS_MARQUEE}
                  housing
                  className={[
                    'page-scene--home-how-it-works__cta type-title',
                    audience === 'employers' ? 'is-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label="For employers"
                  aria-pressed={audience === 'employers'}
                  onClick={() => setAudience('employers')}
                />
              </div>

              <div
                ref={candidatesRowRef}
                className={[
                  'page-scene--home-how-it-works__audience-row',
                  'page-scene--home-how-it-works__audience-row--candidates',
                  audience === 'candidates' ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <ButtonHoverFx
                  variant="marquee-menu"
                  marqueeContent={CANDIDATES_MARQUEE}
                  housing
                  className={[
                    'page-scene--home-how-it-works__cta type-title',
                    audience === 'candidates' ? 'is-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label="For candidates"
                  aria-pressed={audience === 'candidates'}
                  onClick={() => setAudience('candidates')}
                />
              </div>
            </div>

            {/* Mobile: For + menu-style vurify RadioGroup. Desktop uses marquees. */}
            <div className="page-scene--home-how-it-works__audience-toggle">
              <p className="page-scene--home-how-it-works__audience-toggle-for type-display-lg">
                <span className="page-scene--home-how-it-works__word--accent">For</span>
              </p>
              <RadioGroup
                aria-label="How Vurify works for"
                variant="vurify"
                size="md"
                options={[...AUDIENCE_TOGGLE_OPTIONS]}
                value={audience}
                onChange={(next) => setAudience(next as HowItWorksAudience)}
              />
            </div>

            <div ref={moverRef} className="page-scene--home-how-it-works__combo-mover">
              <div ref={leadRef} className="page-scene--home-how-it-works__lead-wrap">
                {reducedMotion ? (
                  <p className="page-scene--home-how-it-works__lead">
                    How{' '}
                    <span className="page-scene--home-how-it-works__word--accent">Vurify</span>{' '}
                    works
                  </p>
                ) : (
                  <PageScrollType
                    as="p"
                    text="How Vurify works"
                    effect={6}
                    mode="enter"
                    scrollerRef={scrollerRef}
                    className="page-scene--home-how-it-works__lead theme-page-scroll-type--block"
                    start="top 85%"
                    wordClassNames={{
                      Vurify: 'page-scene--home-how-it-works__word--accent',
                    }}
                  />
                )}
              </div>
              <div ref={forBlockRef} className="page-scene--home-how-it-works__for-block">
          {reducedMotion ? (
            <h2 className="page-scene--home-how-it-works__title type-display-lg">
                    <span className="page-scene--home-how-it-works__word--accent">For</span>
            </h2>
          ) : (
            <PageScrollType
              as="h2"
                    text="For"
              effect={2}
              mode="enter"
              scrollerRef={scrollerRef}
              className="page-scene--home-how-it-works__title type-display-lg theme-page-scroll-type--block"
              start="top 85%"
              wordClassNames={{
                      For: 'page-scene--home-how-it-works__word--accent',
              }}
            />
          )}
        </div>
            </div>
          </div>
        </div>

        <div
          className="page-scene--home-how-it-works__panel"
          data-preview-phase={panelPhase}
          aria-live="polite"
        >
          <div
            className={[
              'page-scene--home-how-it-works__panel-swap',
              reducedMotion ? 'page-scene--home-how-it-works__panel-swap--instant' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <VurifyExpertiseTimeline
              key={displayedAudience}
              steps={VURIFY_EXPERTISE_BY_AUDIENCE[displayedAudience]}
              scrollerRef={scrollerRef}
              scroll={EXPERTISE_SCROLL}
              scrub={EXPERTISE_SCRUB}
              motionReady={panelPhase === 'idle'}
              onCtaClick={onCtaClick}
              label={
                displayedAudience === 'employers'
                  ? 'How it works for employers'
                  : 'How it works for candidates'
              }
            />
          </div>
        </div>
      </div>
    </section>
  )
}
