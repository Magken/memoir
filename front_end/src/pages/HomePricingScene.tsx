import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { PageScrollType } from '../components/PageScrollType'
import { RadioGroup } from '../components/RadioGroup'
import { TypeAnimText } from '../components/TypeAnimText'
import { VurifyPricingTable } from '../components/VurifyPricingTable'
import { useGsapPage } from '../lib/gsap'
import {
  VURIFY_PRICING_BY_ID,
  type VurifyPricingTierId,
} from '../lib/pricing/vurifyPricingTiers'

type HomePricingSceneProps = {
  scrollerRef: RefObject<HTMLDivElement | null>
  onOpenBooking?: () => void
}

const TIER_OPTIONS = [
  { value: 'free', label: 'Candidates' },
  { value: 'solo', label: 'Solo' },
  { value: 'team', label: 'Team' },
] as const

const FLIP_DURATION_MS = 360
const FLIP_STAGGER_MS = 40
const FLIP_HANDOFF_MS = 220

const PRICING_PREDICATES = ['is?', 'Costs?'] as const

function pricingPredicate(tier: VurifyPricingTierId) {
  return tier === 'free' ? 'is?' : 'Costs?'
}

function flipRunMs(label: string) {
  const units = Math.min(Math.max(label.length, 1), 14)
  return FLIP_DURATION_MS + FLIP_STAGGER_MS * (units - 1)
}

type PricingPredicateFlipProps = {
  text: string
  reducedMotion: boolean
}

/** Menu-style flip out→in for Costs? ↔ is? — width reserved for both so the sentence doesn’t jump. */
function PricingPredicateFlip({ text, reducedMotion }: PricingPredicateFlipProps) {
  const currentRef = useRef(text)
  const handoffTimerRef = useRef<number | null>(null)
  const switchTimerRef = useRef<number | null>(null)
  const [displayed, setDisplayed] = useState(text)
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle')

  useEffect(() => {
    if (Object.is(text, currentRef.current)) return

    if (handoffTimerRef.current !== null) window.clearTimeout(handoffTimerRef.current)
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current)

    const previous = currentRef.current
    currentRef.current = text

    if (reducedMotion) {
      setDisplayed(text)
      setPhase('idle')
      return
    }

    setDisplayed(previous)
    setPhase('out')
    handoffTimerRef.current = window.setTimeout(() => {
      setDisplayed(text)
      setPhase('in')
      switchTimerRef.current = window.setTimeout(() => {
        setPhase('idle')
        switchTimerRef.current = null
      }, flipRunMs(text) + 40)
      handoffTimerRef.current = null
    }, Math.min(FLIP_HANDOFF_MS, Math.round(flipRunMs(previous) * 0.62)))
  }, [reducedMotion, text])

  useEffect(
    () => () => {
      if (handoffTimerRef.current !== null) window.clearTimeout(handoffTimerRef.current)
      if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current)
    },
    [],
  )

  if (reducedMotion) {
    return <span className="page-scene--home-pricing__predicate">{text}</span>
  }

  return (
    <span
      className="page-scene--home-pricing__predicate"
      data-flip-phase={phase}
      aria-live="polite"
    >
      <span className="page-scene--home-pricing__predicate-sizer" aria-hidden>
        {PRICING_PREDICATES.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </span>
      <TypeAnimText
        key={`${displayed}-${phase === 'out' ? 'out' : phase === 'in' ? 'in' : 'idle'}`}
        anim="flip"
        trigger={phase === 'idle' ? 'hover' : 'enter'}
        split="chars"
        className={[
          'page-scene--home-pricing__predicate-label',
          phase === 'out' ? 'page-scene--home-pricing__predicate-label--out' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {displayed}
      </TypeAnimText>
    </span>
  )
}

/**
 * Home Internal Scene 05 — Pricing.
 * VPH header + tiered feature table (L/R row swap on tier change).
 */
export function HomePricingScene({ scrollerRef, onOpenBooking }: HomePricingSceneProps) {
  const { reducedMotion } = useGsapPage()
  const [tier, setTier] = useState<VurifyPricingTierId>('free')
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 52rem)').matches,
  )
  const active = VURIFY_PRICING_BY_ID[tier]
  const predicate = pricingPredicate(tier)
  /** Skip per-char Effect 2 / flip on phones — those splits ladder into a vertical column. */
  const staticStatement = reducedMotion || compact

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 52rem)')
    const sync = () => setCompact(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const onTierChange = useCallback((value: string) => {
    if (value === 'free' || value === 'solo' || value === 'team') {
      setTier(value)
    }
  }, [])

  const tierControl = (
    <span className="page-scene--home-pricing__tier">
      <RadioGroup
        aria-label="Vurify pricing tier"
        variant="vurify-tiered"
        tierLabel="Employers"
        options={[...TIER_OPTIONS]}
        value={tier}
        onChange={onTierChange}
        size={compact ? 'md' : 'lg'}
        className="page-scene--home-pricing__tier-control"
      />
    </span>
  )

  const title = staticStatement ? (
    <h2 className="page-scene--home-pricing__title type-display-lg">
      <span className="page-scene--home-pricing__title-main">
        <span className="page-scene--home-pricing__word">Vurify</span>
        <span className="page-scene--home-pricing__costs">{predicate}</span>
      </span>
    </h2>
  ) : (
    <h2 className="page-scene--home-pricing__title type-display-lg">
      <span className="page-scene--home-pricing__title-main">
        <PageScrollType
          as="span"
          text="Vurify"
          effect={2}
          mode="enter"
          scrollerRef={scrollerRef}
          className="page-scene--home-pricing__word"
          start="top 85%"
          wordClassNames={{
            Vurify: 'page-scene--home-pricing__word',
          }}
        />
        <PricingPredicateFlip text={predicate} reducedMotion={reducedMotion} />
      </span>
    </h2>
  )

  return (
    <section
      id="home-scene-5"
      className="page-scene page-scene--home-pricing"
      aria-label="Pricing"
      data-tier={tier}
    >
      <div className="page-scene--home-pricing__layout">
        <header className="page-scene--home-pricing__header">
          <div className="page-scene--home-pricing__statement">
            {staticStatement ? (
              <>
                <span className="page-scene--home-pricing__lead type-display-lg">for</span>
                {tierControl}
                {title}
              </>
            ) : (
              <>
                <PageScrollType
                  as="span"
                  text="for"
                  effect={2}
                  mode="enter"
                  scrollerRef={scrollerRef}
                  className="page-scene--home-pricing__lead type-display-lg theme-page-scroll-type--block"
                  start="top 85%"
                />
                {tierControl}
                {title}
              </>
            )}
          </div>
        </header>

        <div className="page-scene--home-pricing__body">
          <VurifyPricingTable
            tierId={active.id}
            title={active.title}
            price={active.price}
            priceNote={active.priceNote}
            features={active.features}
            cta={active.cta}
            reducedMotion={reducedMotion}
            onCtaClick={onOpenBooking}
          />
        </div>
      </div>
    </section>
  )
}
