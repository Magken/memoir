import { useRef, type RefObject } from 'react'
import {
  ArrowRight01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons'
import {
  ButtonHoverFx,
  type ButtonHoverFxMarqueeContent,
} from './ButtonHoverFx'
import { PointerFollowDeck } from './PointerFollowDeck'
import { useGlowTimelineScroll } from '../hooks/useGlowTimelineScroll'
import gsap, { ScrollTrigger, useGSAP, useGsapPage } from '../lib/gsap'
import type { GlowTimelineScrollRange } from '../lib/timeline/glowTimelineTypes'
import type { VurifyExpertiseStep } from '../lib/timeline/vurifyExpertiseTimeline'

type VurifyExpertiseTimelineProps = {
  steps: readonly VurifyExpertiseStep[]
  /** Page ThemeScroll viewport — drives the glow marker scrub + enter reveals. */
  scrollerRef?: RefObject<HTMLElement | null>
  scroll?: GlowTimelineScrollRange
  /** Override glow scrub lag (defaults to page scrub token). */
  scrub?: number | boolean
  /**
   * When false, skip ScrollTrigger bind (panel CSS transforms would skew measures).
   * Home Scene 04 sets this false during audience out/in.
   */
  motionReady?: boolean
  label?: string
  className?: string
  /** Marquee on the final `kind: 'cta'` note; defaults to Get Started. */
  ctaContent?: ButtonHoverFxMarqueeContent
  onCtaClick?: () => void
}

/** Map timeline travel through viewport center for even progress. */
const DEFAULT_SCROLL: GlowTimelineScrollRange = {
  start: 'top center',
  end: 'bottom center',
}

const DEFAULT_CTA = {
  label: 'Get Started',
  marqueeLabel: 'Open the path',
  marqueeLabels: ['Get Started', 'Open the path', 'See the package', 'Walk the interview'],
  sideIcon: SparklesIcon,
  sideIconEnd: ArrowRight01Icon,
} satisfies ButtonHoverFxMarqueeContent

/**
 * Vurify expertise timeline — GlowTimeline rail/marker scrub + big title / body / image steps.
 * Titles/bodies batch-reveal from the left; each step uses one scrubbed timeline for parallax.
 * Final `kind: 'cta'` note mounts the Get Started marquee on the rail.
 */
export function VurifyExpertiseTimeline({
  steps,
  scrollerRef,
  scroll = DEFAULT_SCROLL,
  scrub,
  motionReady = true,
  label = 'How it works',
  className = '',
  ctaContent = DEFAULT_CTA,
  onCtaClick,
}: VurifyExpertiseTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLOListElement>(null)
  const { reducedMotion, timing, refreshScroll } = useGsapPage()

  useGlowTimelineScroll({
    scopeRef: rootRef,
    triggerRef,
    timelineRef,
    scroll,
    scrub,
    scrollerRef,
    orientation: 'vertical',
    enabled: motionReady,
  })

  useGSAP(
    () => {
      if (reducedMotion || !motionReady) return

      let cancelled = false
      let attempts = 0
      let frameId = 0
      const scrubTimelines: gsap.core.Timeline[] = []
      let batchTriggers: ScrollTrigger[] = []

      const bind = () => {
        if (cancelled) return
        const timeline = timelineRef.current
        const scroller = scrollerRef?.current ?? undefined
        if (!timeline || (scrollerRef && !scroller)) {
          attempts += 1
          if (attempts < 16) frameId = requestAnimationFrame(bind)
          return
        }

        const items = gsap.utils.toArray<HTMLElement>(
          '.theme-vurify-expertise-timeline__item',
          timeline,
        )
        if (items.length === 0) return

        const revealEls = gsap.utils.toArray<HTMLElement>(
          '.theme-vurify-expertise-timeline__title, .theme-vurify-expertise-timeline__body',
          timeline,
        )
        gsap.set(revealEls, { autoAlpha: 0, x: -36 })

        const firstReveal = items[0]
          ? gsap.utils.toArray<HTMLElement>(
              '.theme-vurify-expertise-timeline__title, .theme-vurify-expertise-timeline__body',
              items[0],
            )
          : []
        if (firstReveal.length > 0) {
          gsap.to(firstReveal, {
            autoAlpha: 1,
            x: 0,
            duration: 0.6,
            ease: 'power2.out',
            stagger: 0.08,
            delay: 0.06,
            overwrite: 'auto',
          })
        }

        batchTriggers = ScrollTrigger.batch(revealEls, {
          ...(scroller ? { scroller } : {}),
          start: 'top 88%',
          once: true,
          onEnter: (batch) => {
            const pending = batch.filter((el) => !firstReveal.includes(el as HTMLElement))
            if (pending.length === 0) return
            gsap.to(pending as HTMLElement[], {
              autoAlpha: 1,
              x: 0,
              duration: 0.6,
              ease: 'power2.out',
              stagger: 0.08,
              overwrite: 'auto',
            })
          },
        })

        const scrubLag = timing.scroll.scrubPage
        // Desktop: image ↔ copy drift. Mobile: whole card rises together (no clip).
        const pairedParallax =
          typeof window !== 'undefined' &&
          window.matchMedia('(max-width: 52rem)').matches

        items.forEach((item) => {
          if (item.classList.contains('theme-vurify-expertise-timeline__item--cta')) return

          if (pairedParallax) {
            const card = item.querySelector<HTMLElement>(
              '.theme-vurify-expertise-timeline__card',
            )
            if (!card) return
            gsap.set(card, { y: 16, force3D: true })
            const stepTl = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                ...(scroller ? { scroller } : {}),
                trigger: item,
                start: 'top bottom',
                end: 'bottom top',
                scrub: scrubLag,
              },
            })
            stepTl.to(card, { y: -16, duration: 1, force3D: true }, 0)
            scrubTimelines.push(stepTl)
            return
          }

          /* Parallax the deck host — not the img (scale+overflow was clipping art). */
          const media = item.querySelector<HTMLElement>(
            '.theme-vurify-expertise-timeline__media',
          )
          const copy = item.querySelector<HTMLElement>(
            '.theme-vurify-expertise-timeline__copy',
          )
          if (!media && !copy) return

          if (media) gsap.set(media, { y: -14, force3D: true })
          if (copy) gsap.set(copy, { y: 18 })

          const stepTl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              ...(scroller ? { scroller } : {}),
              trigger: item,
              start: 'top bottom',
              end: 'bottom top',
              scrub: scrubLag,
            },
          })

          if (media) stepTl.to(media, { y: 14, duration: 1, force3D: true }, 0)
          if (copy) stepTl.to(copy, { y: -18, duration: 1 }, 0)
          scrubTimelines.push(stepTl)
        })

        refreshScroll()
      }

      frameId = requestAnimationFrame(bind)
      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
        batchTriggers.forEach((t) => t.kill())
        scrubTimelines.forEach((tl) => {
          tl.scrollTrigger?.kill()
          tl.kill()
        })
      }
    },
    {
      scope: rootRef,
      dependencies: [reducedMotion, motionReady, steps, scrollerRef, timing, refreshScroll],
    },
  )

  return (
    <div
      ref={rootRef}
      className={[
        'theme-vurify-expertise-timeline',
        'theme-glow-timeline',
        'theme-glow-timeline--cardless',
        'theme-glow-timeline--vertical',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
    >
      <div ref={triggerRef}>
        <div className="theme-glow-timeline__shell theme-vurify-expertise-timeline__shell">
          <span className="theme-glow-timeline__axis" aria-hidden />
          <span className="theme-glow-timeline__axis-glow" aria-hidden />
          <span className="theme-glow-timeline__marker" aria-hidden />
          <ol
            ref={timelineRef}
            className="theme-glow-timeline__list theme-glow-timeline__list--glow theme-vurify-expertise-timeline__list"
          >
            {steps.map((step) => {
              const isCta = step.kind === 'cta'
              return (
                <li
                  key={step.id}
                  className={[
                    'theme-glow-timeline__item',
                    'theme-vurify-expertise-timeline__item',
                    isCta ? 'theme-vurify-expertise-timeline__item--cta' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="theme-glow-timeline__dot" aria-hidden />
                  {isCta ? (
                    <div className="theme-vurify-expertise-timeline__note">
                      <div className="theme-vurify-expertise-timeline__copy">
                        <h3 className="theme-vurify-expertise-timeline__title type-display-md">
                          {step.title}
                        </h3>
                        <p className="theme-vurify-expertise-timeline__body type-body type-muted">
                          {step.body}
                        </p>
                      </div>
                      <div className="theme-vurify-expertise-timeline__cta">
                        <ButtonHoverFx
                          variant="marquee-menu"
                          marqueeContent={ctaContent}
                          housing
                          className="theme-vurify-expertise-timeline__cta-btn type-title"
                          aria-label={ctaContent.label}
                          onClick={onCtaClick}
                        />
                      </div>
                    </div>
                  ) : (
                    <article className="theme-vurify-expertise-timeline__card">
                      <div className="theme-vurify-expertise-timeline__media">
                        <PointerFollowDeck
                          className="theme-vurify-expertise-timeline__follow"
                          fit="contain"
                          autoPivot
                          idleWobble
                          scrollerRef={scrollerRef}
                        >
                          <img
                            src={step.image.src}
                            alt={step.image.alt}
                            className="theme-vurify-expertise-timeline__image"
                            decoding="async"
                          />
                        </PointerFollowDeck>
                      </div>
                      <div className="theme-vurify-expertise-timeline__copy">
                        <h3 className="theme-vurify-expertise-timeline__title type-display-md">
                          {step.title}
                        </h3>
                        <p className="theme-vurify-expertise-timeline__body type-body type-muted">
                          {step.body}
                        </p>
                        {step.tags && step.tags.length > 0 ? (
                          <ul className="theme-vurify-expertise-timeline__tags">
                            {step.tags.map((tag) => {
                              const Icon = tag.icon
                              return (
                                <li
                                  key={tag.label}
                                  className="theme-vurify-expertise-timeline__tag"
                                >
                                  <span
                                    className="theme-vurify-expertise-timeline__tag-icon"
                                    aria-hidden
                                  >
                                    <Icon strokeWidth={1.75} />
                                  </span>
                                  <span className="theme-vurify-expertise-timeline__tag-label">
                                    {tag.label}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        ) : null}
                      </div>
                    </article>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
