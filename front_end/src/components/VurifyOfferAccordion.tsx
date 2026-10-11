import { useRef, type MouseEvent, type RefObject } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  WebGpuIsometricAccordion,
  type WebGpuIsometricAccordionImage,
  type WebGpuIsometricAccordionItem,
} from './WebGpuIsometricAccordion'
import { VurifyMenuButton } from './VurifyMenuButton'
import { HOME_ASSETS } from '../lib/homeAssets/catalog'
import {
  OFFER_VISUAL_ENTER_START,
  pickExclusiveFollowVisual,
} from '../lib/animations/offerAccordionMotion'
import { gsap, ScrollTrigger, useGSAP, useGsapPage } from '../lib/gsap'

function offerStill(asset: (typeof HOME_ASSETS)[keyof typeof HOME_ASSETS]): WebGpuIsometricAccordionImage {
  return { src: asset.src, alt: asset.alt, kind: 'image' }
}

function offerMidFrame(
  asset: (typeof HOME_ASSETS)[keyof typeof HOME_ASSETS],
): WebGpuIsometricAccordionImage {
  const frames = 'frames' in asset && asset.frames && asset.frames.length > 1 ? asset.frames : undefined
  const src = frames?.[0] ?? ('poster' in asset && asset.poster ? asset.poster : asset.src)
  return { src, alt: asset.alt, kind: 'image', frames }
}

type OfferSeeMoreProps = {
  itemId: string
  onOpenInfo?: (itemId: string) => void
}

/** Soft-launch See more — opens the menu info peel when wired. */
function OfferSeeMore({ itemId, onOpenInfo }: OfferSeeMoreProps) {
  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onOpenInfo?.(itemId)
  }

  return (
    <VurifyMenuButton
      type="button"
      variant="label"
      size="sm"
      activeChrome={false}
      lineTone="muted"
      icon={ChevronDown}
      iconPosition="right"
      className="theme-vurify-offer-accordion__see-more"
      onClick={onClick}
    >
      See more
    </VurifyMenuButton>
  )
}

/**
 * Vurify offer rows for Home Scene 03 — Auryn overview path:
 * organisation → create interviews → CV intake → candidates walk → package.
 * Deck: timestamp WebP stills on the mid card + front illustration (no back card).
 */
export function buildVurifyOfferAccordionItems(
  onOpenInfo?: (itemId: string) => void,
): readonly WebGpuIsometricAccordionItem[] {
  return [
    {
      id: 'organisation',
      title: 'Hiring managers',
      teaser: (
        <>
          Your roof for <em>every hire</em>
        </>
      ),
      body: (
        <>
          Stand up hiring under your name for recruiters and hiring managers. Roles, interviewers,
          and results live there. Your team steers; Vurify can interview under you when you want
          that.
        </>
      ),
      action: <OfferSeeMore itemId="organisation" onOpenInfo={onOpenInfo} />,
      images: [
        null,
        offerMidFrame(HOME_ASSETS.offerAgencyManagementVideo),
        offerStill(HOME_ASSETS.offerAgencyManagement),
      ],
    },
    {
      id: 'interview-creation',
      title: 'Interview creation',
      teaser: (
        <>
          Build the <em>path</em> for the role
        </>
      ),
      body: (
        <>
          Pick the steps and what good looks like. Conversation, quiz, coding, writing, and{' '}
          <strong>custom editors</strong> stay in one creator.
        </>
      ),
      action: <OfferSeeMore itemId="interview-creation" onOpenInfo={onOpenInfo} />,
      images: [
        null,
        offerMidFrame(HOME_ASSETS.offerInterviewCreationVideo),
        offerStill(HOME_ASSETS.offerReviewAnalysis),
      ],
    },
    {
      id: 'cv-intake',
      title: 'Résumé intake',
      teaser: (
        <>
          Ready before the interview <em>starts</em>
        </>
      ),
      body: (
        <>
          Gather details and documents up front so the interview opens clean, not in a separate
          pile of forms.
        </>
      ),
      action: <OfferSeeMore itemId="cv-intake" onOpenInfo={onOpenInfo} />,
      images: [
        null,
        offerMidFrame(HOME_ASSETS.offerCvIntakeVideo),
        offerStill(HOME_ASSETS.offerResumeUpload),
      ],
    },
    {
      id: 'live-interview',
      title: 'Live interview',
      teaser: (
        <>
          Candidates <em>walk</em> the path
        </>
      ),
      body: (
        <>
          Clear overview, then each step in order. Follow-ups land when answers stay thin. One
          story for the whole interview.
        </>
      ),
      action: <OfferSeeMore itemId="live-interview" onOpenInfo={onOpenInfo} />,
      images: [
        null,
        offerMidFrame(HOME_ASSETS.offerLiveInterviewVideo),
        offerStill(HOME_ASSETS.offerInterviewTaking),
      ],
    },
    {
      id: 'hiring-package',
      title: 'Output card',
      teaser: (
        <>
          An output card you can <em>read</em>
        </>
      ),
      body: (
        <>
          Who rose, and why. Open the reasons, check the signals, and keep the call in your hands.
        </>
      ),
      action: <OfferSeeMore itemId="hiring-package" onOpenInfo={onOpenInfo} />,
      images: [
        null,
        offerMidFrame(HOME_ASSETS.offerHiringPackageVideo),
        offerStill(HOME_ASSETS.offerInformedDecision),
      ],
    },
  ]
}

/** @deprecated Prefer `buildVurifyOfferAccordionItems` when wiring See more. */
export const VURIFY_OFFER_ACCORDION_ITEMS = buildVurifyOfferAccordionItems()

type VurifyOfferAccordionProps = {
  className?: string
  label?: string
  /** ThemeScroll viewport — lateral visual slide enter. */
  scrollerRef?: RefObject<HTMLElement | null>
  /** Opens SceneStackMenu info peel for this offer row. */
  onOpenInfo?: (itemId: string) => void
}

/**
 * Home / Verify offer accordion — hover expands copy + illustration fan (one row).
 * Fine pointer hover tilts the illustration. Mids are timestamp WebP stills
 * that step on hover (no decoder). Click (or See more) opens the info peel.
 */
export function VurifyOfferAccordion({
  className = '',
  label = 'What gets it done',
  scrollerRef,
  onOpenInfo,
}: VurifyOfferAccordionProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { reducedMotion } = useGsapPage()
  const items = buildVurifyOfferAccordionItems(onOpenInfo)

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const rows = Array.from(
        root.querySelectorAll<HTMLElement>('.theme-webgpu-iso-accordion__row'),
      )
      if (rows.length === 0) return

      const visuals = root.querySelectorAll<HTMLElement>('.theme-webgpu-iso-accordion__visual')

      if (reducedMotion) {
        gsap.set(visuals, { clearProps: 'transform,opacity' })
        return
      }

      let cancelled = false
      let attempts = 0
      let frameId = 0
      const enterTweens: gsap.core.Tween[] = []
      const followTriggers: ScrollTrigger[] = []
      const fineHover =
        typeof window !== 'undefined' &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches

      const showVisuals = () => {
        gsap.set(visuals, { clearProps: 'transform,opacity' })
      }

      const resetFollow = (visual: HTMLElement) => {
        visual.style.setProperty('--iso-follow-x', '0')
        visual.style.setProperty('--iso-follow-y', '0')
      }

      const visualFromX = (row: HTMLElement) =>
        row.getAttribute('data-layout') === 'copy-right' ? -140 : 140

      const visualOf = (row: Element) =>
        row.querySelector<HTMLElement>('.theme-webgpu-iso-accordion__visual')

      const bind = () => {
        if (cancelled) return
        const scroller = scrollerRef?.current
        if (!scroller) {
          attempts += 1
          if (attempts < 48) {
            frameId = requestAnimationFrame(bind)
          } else {
            // Fail open — never leave stacks invisible if ThemeScroll never attaches.
            showVisuals()
          }
          return
        }

        // Wipe leftover row transforms (old y-parallax / HMR).
        gsap.set(rows, { clearProps: 'transform' })

        rows.forEach((row) => {
          const visual = visualOf(row)
          if (!visual) return
          gsap.set(visual, { x: visualFromX(row), autoAlpha: 0, force3D: true })
        })

        /*
         * Lateral enter on the image stack only — copy is already open on desktop.
         * Play on enter; reverse when scrolling back past start. No stagger delay.
         */
        rows.forEach((row) => {
          const visual = visualOf(row)
          if (!visual) return

          enterTweens.push(
            gsap.to(visual, {
              x: 0,
              autoAlpha: 1,
              duration: 0.72,
              ease: 'power3.out',
              force3D: true,
              overwrite: 'auto',
              scrollTrigger: {
                scroller,
                trigger: row,
                start: OFFER_VISUAL_ENTER_START,
                toggleActions: 'play none none reverse',
                invalidateOnRefresh: true,
              },
              onComplete: () => {
                visual.style.removeProperty('will-change')
              },
            }),
          )
        })

        /*
         * Touch / coarse: no pointer follow — one deck wobbles from the row
         * closest to mid-viewport so five 3D tilts do not run together.
         */
        if (!fineHover) {
          const progresses = new Map<HTMLElement, number>()
          const paintExclusiveFollow = () => {
            const winner = pickExclusiveFollowVisual(
              Array.from(progresses.entries()).map(([visual, progress]) => ({
                visual,
                progress,
              })),
            )
            rows.forEach((row) => {
              const visual = visualOf(row)
              if (!visual) return
              if (visual !== winner) {
                resetFollow(visual)
                return
              }
              const p = progresses.get(visual) ?? 0.5
              const x = Math.sin(p * Math.PI * 2.15) * 0.95
              const y = Math.cos(p * Math.PI * 1.7) * 0.72
              visual.style.setProperty('--iso-follow-x', x.toFixed(3))
              visual.style.setProperty('--iso-follow-y', y.toFixed(3))
            })
          }

          rows.forEach((row) => {
            const visual = visualOf(row)
            if (!visual) return
            followTriggers.push(
              ScrollTrigger.create({
                scroller,
                trigger: row,
                start: OFFER_VISUAL_ENTER_START,
                end: 'bottom 18%',
                scrub: 0.55,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                  progresses.set(visual, self.progress)
                  paintExclusiveFollow()
                },
                onLeave: () => {
                  progresses.delete(visual)
                  resetFollow(visual)
                  paintExclusiveFollow()
                },
                onLeaveBack: () => {
                  progresses.delete(visual)
                  resetFollow(visual)
                  paintExclusiveFollow()
                },
              }),
            )
          })
        }

        // One refresh after all triggers — avoid double thrash with page timing.
        ScrollTrigger.refresh()
      }

      frameId = requestAnimationFrame(bind)

      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
        enterTweens.forEach((tween) => tween.scrollTrigger?.kill())
        enterTweens.forEach((tween) => tween.kill())
        followTriggers.forEach((trigger) => trigger.kill())
        visuals.forEach((visual) => resetFollow(visual))
      }
    },
    {
      scope: rootRef,
      dependencies: [reducedMotion, scrollerRef, onOpenInfo],
      revertOnUpdate: true,
    },
  )

  return (
    <div ref={rootRef} className="theme-vurify-offer-accordion-host">
      <WebGpuIsometricAccordion
        effect="hover"
        items={items}
        label={label}
        showIndex={false}
        copyStyle="offer"
        scrollerRef={scrollerRef}
        suppressMobileExpand
        alwaysExpanded
        onItemOpen={onOpenInfo}
        className={['theme-vurify-offer-accordion', className].filter(Boolean).join(' ')}
      />
    </div>
  )
}
