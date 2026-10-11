import { useEffect, useRef, useState, type RefObject } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  ButtonHoverFx,
  type ButtonHoverFxMarqueeContent,
} from './ButtonHoverFx'
import { IconButton } from './IconButton'
import { PageScrollType } from './PageScrollType'
import { PointerFollowDeck } from './PointerFollowDeck'
import { TypeAnimText } from './TypeAnimText'
import { VurifyPricingTable } from './VurifyPricingTable'
import { CURVED_MONITOR_CHROME_IN_MS } from '../lib/shape3d/curvedMonitor'
import {
  TRY_INTERVIEW_KITS,
  type TryInterviewKit,
  type TryInterviewKitId,
} from '../lib/tryInterview/tryInterviewKits'
import { wrapTryInterviewKitIndex } from '../lib/tryInterview/wrapTryInterviewKitIndex'

type HomeTryInterviewChooserProps = {
  scrollerRef: RefObject<HTMLDivElement | null>
  reducedMotion: boolean
  /** Opens `/try-interview?kit=` for the displayed kit. */
  onTakeInterview?: (kitId: TryInterviewKitId) => void
}

type ChromePhase = 'idle' | 'out' | 'in'

/** Menu preview L/R slide — art out must finish before the still swaps. */
const KIT_ART_OUT_MS = 520

function kitTakeMarquee(kit: TryInterviewKit): ButtonHoverFxMarqueeContent {
  return {
    label: kit.ctaLabel,
    marqueeLabel: kit.ctaMarquee,
    sideIcon: kit.icon,
    sideIconPlacement: 'end',
  }
}

/**
 * Scene 07 kit picker — section title, copy, floating art, feature table,
 * then chevron / take marquee / chevron. Take opens `/try-interview` for the displayed kit.
 */
export function HomeTryInterviewChooser({
  scrollerRef,
  reducedMotion,
  onTakeInterview,
}: HomeTryInterviewChooserProps) {
  const [index, setIndex] = useState(0)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [chromePhase, setChromePhase] = useState<ChromePhase>('idle')
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward')
  const navLockRef = useRef(false)
  const handoffTimerRef = useRef<number | null>(null)
  const switchTimerRef = useRef<number | null>(null)
  const artHitRef = useRef<HTMLDivElement>(null)

  const kit = TRY_INTERVIEW_KITS[displayIndex] ?? TRY_INTERVIEW_KITS[0]
  const navKit = TRY_INTERVIEW_KITS[index] ?? kit
  const prevKit =
    TRY_INTERVIEW_KITS[wrapTryInterviewKitIndex(index - 1, TRY_INTERVIEW_KITS.length)] ?? kit
  const nextKit =
    TRY_INTERVIEW_KITS[wrapTryInterviewKitIndex(index + 1, TRY_INTERVIEW_KITS.length)] ?? kit
  const titleOut = chromePhase === 'out'

  useEffect(
    () => () => {
      if (handoffTimerRef.current !== null) window.clearTimeout(handoffTimerRef.current)
      if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current)
    },
    [],
  )

  const goTo = (nextRaw: number) => {
    const next = wrapTryInterviewKitIndex(nextRaw, TRY_INTERVIEW_KITS.length)
    if (next === index || navLockRef.current) return

    navLockRef.current = true
    setNavDirection(nextRaw < index ? 'back' : 'forward')
    setIndex(next)

    if (handoffTimerRef.current !== null) window.clearTimeout(handoffTimerRef.current)
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current)

    if (reducedMotion) {
      setDisplayIndex(next)
      setChromePhase('idle')
      navLockRef.current = false
      return
    }

    setChromePhase('out')
    handoffTimerRef.current = window.setTimeout(() => {
      setDisplayIndex(next)
      setChromePhase('in')
      switchTimerRef.current = window.setTimeout(() => {
        setChromePhase('idle')
        switchTimerRef.current = null
        navLockRef.current = false
      }, CURVED_MONITOR_CHROME_IN_MS)
      handoffTimerRef.current = null
    }, KIT_ART_OUT_MS)
  }

  const sectionTitle = reducedMotion ? (
    <h2 className="theme-home-try-kit__section-title type-display-lg theme-page-scroll-type--center">
      Take a <span className="theme-home-try-kit__word--accent">test</span> interview
    </h2>
  ) : (
    <PageScrollType
      as="h2"
      text="Take a test interview"
      effect={6}
      mode="enter"
      scrollerRef={scrollerRef}
      className="theme-home-try-kit__section-title type-display-lg theme-page-scroll-type--center theme-page-scroll-type--block"
      start="top 85%"
      wordClassNames={{
        test: 'theme-home-try-kit__word--accent',
      }}
    />
  )

  return (
    <div className="theme-home-try-kit" aria-label="Take a test interview">
      {sectionTitle}

      {reducedMotion ? (
        <div className="theme-home-try-kit__copy">
          <div className="theme-home-try-kit__copy-sizer" aria-hidden>
            {TRY_INTERVIEW_KITS.map((item) => (
              <p key={item.id} className="type-body">
                {item.description}
              </p>
            ))}
          </div>
          <p className="theme-home-try-kit__desc type-body">{kit.description}</p>
        </div>
      ) : (
        <div className="theme-home-try-kit__copy">
          <div className="theme-home-try-kit__copy-sizer" aria-hidden>
            {TRY_INTERVIEW_KITS.map((item) => (
              <p key={item.id} className="type-body">
                {item.description}
              </p>
            ))}
          </div>
          <TypeAnimText
            key={`${kit.id}-desc-${titleOut ? 'out' : 'in'}`}
            as="p"
            anim="slide-up"
            trigger="enter"
            split="line"
            className={[
              'type-body',
              'theme-home-try-kit__desc',
              titleOut ? 'theme-home-try-kit__desc--out' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {kit.description}
          </TypeAnimText>
        </div>
      )}

      <div className="theme-home-try-kit__body">
        <div className="theme-home-try-kit__art" ref={artHitRef}>
          <div className="theme-home-try-kit__art-clip" data-phase={chromePhase}>
            <div
              className="theme-home-try-kit__art-panel"
              data-phase={chromePhase}
              data-direction={navDirection}
            >
              <PointerFollowDeck
                fit="contain"
                autoPivot
                idleWobble
                decorative
                triggerRef={artHitRef}
                scrollerRef={scrollerRef}
                reducedMotion={reducedMotion}
              >
                <img
                  src={kit.art.src}
                  alt=""
                  loading="eager"
                  decoding="async"
                  draggable={false}
                />
              </PointerFollowDeck>
            </div>
          </div>
        </div>
        <div className="theme-home-try-kit__stack">
          <div className="theme-home-try-kit__table-slot">
            <div className="theme-home-try-kit__table-sizer" aria-hidden>
              {TRY_INTERVIEW_KITS.map((item) => (
                <VurifyPricingTable
                  key={item.id}
                  contentKey={item.id}
                  title={item.title}
                  price={item.headline}
                  priceNote={item.note}
                  features={item.features}
                  stages={item.stages}
                  proposedMinutes={item.proposedMinutes}
                  hideHead
                  hideCta
                  reducedMotion
                />
              ))}
            </div>
            <VurifyPricingTable
              contentKey={navKit.id}
              contentIndex={index}
              title={navKit.title}
              price={navKit.headline}
              priceNote={navKit.note}
              features={navKit.features}
              stages={navKit.stages}
              proposedMinutes={navKit.proposedMinutes}
              hideHead
              hideCta
              swapDirection={navDirection}
              reducedMotion={reducedMotion}
              className="theme-home-try-kit__table"
            />
          </div>

          <div className="theme-home-try-kit__actions">
            <IconButton
              type="button"
              variant="cardless"
              size="lg"
              className="theme-home-try-kit__nav"
              icon={ChevronLeft}
              aria-label={`Previous: ${prevKit.title}`}
              onClick={() => goTo(index - 1)}
            />
            <div className="theme-home-try-kit__cta-slot" data-phase={chromePhase}>
              <span className="theme-home-try-kit__cta-sizer type-title" aria-hidden>
                {TRY_INTERVIEW_KITS.map((item) => (
                  <span key={`${item.id}-label`}>{item.ctaLabel}</span>
                ))}
                {TRY_INTERVIEW_KITS.map((item) => (
                  <span key={`${item.id}-marquee`}>{item.ctaMarquee}</span>
                ))}
              </span>
              <div
                className="theme-home-try-kit__cta-panel"
                data-phase={chromePhase}
                data-direction={navDirection}
              >
                <ButtonHoverFx
                  type="button"
                  variant="marquee-menu"
                  size="md"
                  housing
                  marqueeContent={kitTakeMarquee(kit)}
                  className="theme-home-try-kit__cta type-title"
                  aria-label={kit.ctaLabel}
                  onClick={() => onTakeInterview?.(kit.id)}
                />
              </div>
            </div>
            <IconButton
              type="button"
              variant="cardless"
              size="lg"
              className="theme-home-try-kit__nav"
              icon={ChevronRight}
              aria-label={`Next: ${nextKit.title}`}
              onClick={() => goTo(index + 1)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
