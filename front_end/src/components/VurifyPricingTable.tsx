import { useEffect, useRef, useState } from 'react'
import {
  ButtonHoverFx,
  type ButtonHoverFxMarqueeContent,
} from './ButtonHoverFx'
import { Tag } from './Tag'
import { VurifyIcon } from './VurifyIcon'
import type { VurifyPricingFeature, VurifyPricingTierId } from '../lib/pricing/vurifyPricingTiers'
import {
  pricingTierIndex,
  VURIFY_PRICING_TICK_ICON,
} from '../lib/pricing/vurifyPricingTiers'
import {
  TRY_INTERVIEW_STAGE_META,
  TRY_INTERVIEW_TIME_ICON,
  tryInterviewProposedTimeLabel,
  type TryInterviewStageId,
} from '../lib/tryInterview/tryInterviewStages'

type SwapPhase = 'idle' | 'out' | 'in'
type SwapDirection = 'forward' | 'back'

type VurifyPricingTableProps = {
  tierId?: VurifyPricingTierId
  /** Identity for L/R swap when this is not a pricing tier. */
  contentKey?: string
  /** Sort index for swap direction when `contentKey` is set. */
  contentIndex?: number
  title: string
  price: string
  priceNote: string
  features: readonly VurifyPricingFeature[]
  /** Interview landing stage tags (Scene 06). No tick. */
  stages?: readonly TryInterviewStageId[]
  /** Proposed minutes for the landing-style time tag beside stages. */
  proposedMinutes?: number
  cta?: ButtonHoverFxMarqueeContent
  onCtaClick?: () => void
  /** Hide the footer CTA (Scene 06 kit chooser — Take an interview sits below). */
  hideCta?: boolean
  /** Hide the price header (Scene 06 — the take marquee is the title). */
  hideHead?: boolean
  /** When wrapping a kit list, pass the click direction instead of index compare. */
  swapDirection?: SwapDirection
  reducedMotion?: boolean
  className?: string
}

const ROW_ANIM_MS = 520
const ROW_STAGGER_MS = 45

function extraRowCount(hideHead: boolean, hideCta: boolean, hasStages: boolean) {
  return Number(!hideHead) + Number(!hideCta) + Number(hasStages)
}

function rowAnimationMs(rowCount: number) {
  return ROW_ANIM_MS + Math.max(rowCount - 1, 0) * ROW_STAGGER_MS
}

type DisplayedTier = {
  key: string
  index: number
  title: string
  price: string
  priceNote: string
  features: readonly VurifyPricingFeature[]
  stages?: readonly TryInterviewStageId[]
  proposedMinutes?: number
  cta?: ButtonHoverFxMarqueeContent
}

function tableIdentity(tierId: VurifyPricingTierId | undefined, contentKey: string | undefined) {
  return contentKey ?? tierId ?? ''
}

function tableIndex(
  tierId: VurifyPricingTierId | undefined,
  contentIndex: number | undefined,
) {
  if (typeof contentIndex === 'number') return contentIndex
  if (tierId) return pricingTierIndex(tierId)
  return 0
}

/**
 * Tiered pricing table — price header, icon+feature+tick rows, CTA footer.
 * Tier changes swap content with menu-style L/R out→in row slides.
 */
export function VurifyPricingTable({
  tierId,
  contentKey,
  contentIndex,
  title,
  price,
  priceNote,
  features,
  stages,
  proposedMinutes,
  cta,
  onCtaClick,
  hideCta = false,
  hideHead = false,
  swapDirection,
  reducedMotion = false,
  className = '',
}: VurifyPricingTableProps) {
  const [displayed, setDisplayed] = useState<DisplayedTier>(() => ({
    key: tableIdentity(tierId, contentKey),
    index: tableIndex(tierId, contentIndex),
    title,
    price,
    priceNote,
    features,
    stages,
    proposedMinutes,
    cta,
  }))
  const [phase, setPhase] = useState<SwapPhase>('idle')
  const [direction, setDirection] = useState<SwapDirection>('forward')
  const exitTimerRef = useRef<number | null>(null)
  const enterTimerRef = useRef<number | null>(null)
  const displayedRef = useRef(displayed)
  const pendingRef = useRef({
    key: tableIdentity(tierId, contentKey),
    index: tableIndex(tierId, contentIndex),
    title,
    price,
    priceNote,
    features,
    stages,
    proposedMinutes,
    cta,
  })

  displayedRef.current = displayed
  pendingRef.current = {
    key: tableIdentity(tierId, contentKey),
    index: tableIndex(tierId, contentIndex),
    title,
    price,
    priceNote,
    features,
    stages,
    proposedMinutes,
    cta,
  }

  useEffect(() => {
    const clearTimers = () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current)
        exitTimerRef.current = null
      }
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current)
        enterTimerRef.current = null
      }
    }

    const next = pendingRef.current
    if (next.key === displayedRef.current.key) {
      setDisplayed(next)
      return
    }

    clearTimers()

    const nextDir: SwapDirection =
      swapDirection ?? (next.index < displayedRef.current.index ? 'back' : 'forward')

    if (reducedMotion) {
      setDirection(nextDir)
      setDisplayed(next)
      setPhase('idle')
      return
    }

    const extraExit = extraRowCount(
      hideHead,
      hideCta,
      Boolean(displayedRef.current.stages?.length) ||
        (displayedRef.current.proposedMinutes ?? 0) > 0,
    )
    const extraEnter = extraRowCount(
      hideHead,
      hideCta,
      Boolean(next.stages?.length) || (next.proposedMinutes ?? 0) > 0,
    )
    const exitMs = rowAnimationMs(displayedRef.current.features.length + extraExit)
    const enterMs = rowAnimationMs(next.features.length + extraEnter)

    setDirection(nextDir)
    setPhase('out')
    exitTimerRef.current = window.setTimeout(() => {
      setDisplayed(pendingRef.current)
      setPhase('in')
      exitTimerRef.current = null
      enterTimerRef.current = window.setTimeout(() => {
        setPhase('idle')
        enterTimerRef.current = null
      }, enterMs)
    }, exitMs)

    return clearTimers
  }, [tierId, contentKey, contentIndex, hideHead, hideCta, swapDirection, reducedMotion])

  const rowCount =
    displayed.features.length +
    extraRowCount(
      hideHead,
      hideCta,
      Boolean(displayed.stages?.length) || (displayed.proposedMinutes ?? 0) > 0,
    )
  const featureStaggerOffset = hideHead ? 0 : 1

  return (
    <div
      className={['theme-vurify-pricing-table', className].filter(Boolean).join(' ')}
      data-phase={phase}
      data-direction={direction}
      data-tier={displayed.key}
      data-hide-head={hideHead ? 'true' : undefined}
      aria-label={displayed.title}
    >
      {hideHead ? null : (
        <div
          className="theme-vurify-pricing-table__row theme-vurify-pricing-table__row--head"
          data-stagger={0}
        >
          <div className="theme-vurify-pricing-table__price-block">
            <p className="theme-vurify-pricing-table__price type-display-md type-tabular">
              {displayed.price}
            </p>
            <p className="theme-vurify-pricing-table__note type-body-sm type-muted">
              {displayed.priceNote}
            </p>
          </div>
        </div>
      )}

      <ul className="theme-vurify-pricing-table__features" aria-live="polite">
        {displayed.features.map((feature, index) => (
            <li
              key={`${displayed.key}-${feature.id}`}
              className="theme-vurify-pricing-table__row theme-vurify-pricing-table__row--feature"
              data-stagger={index + featureStaggerOffset}
            >
              <span className="theme-vurify-pricing-table__feature-icon">
                <VurifyIcon iconNode={feature.icon} variant="bordered" tone="accent" size="sm" />
              </span>
              <span className="theme-vurify-pricing-table__feature-label type-body">
                {feature.label}
              </span>
              <span className="theme-vurify-pricing-table__tick">
                <VurifyIcon
                  iconNode={VURIFY_PRICING_TICK_ICON}
                  variant="plain"
                  tone="complement"
                  size="sm"
                />
              </span>
            </li>
          ))}
        {displayed.stages?.length || (displayed.proposedMinutes ?? 0) > 0 ? (
          <li
            className="theme-vurify-pricing-table__row theme-vurify-pricing-table__row--stages"
            data-stagger={displayed.features.length + featureStaggerOffset}
          >
            <span className="theme-vurify-pricing-table__stages-label type-caption type-muted">
              Stages
            </span>
            <div className="theme-vurify-pricing-table__stages theme-tag-group">
              {displayed.stages?.map((id) => {
                const meta = TRY_INTERVIEW_STAGE_META[id]
                const Icon = meta.icon
                return (
                  <Tag
                    key={id}
                    size="sm"
                    className="theme-interview-flow-timeline__tag theme-interview-landing__meta-tag"
                  >
                    <Icon
                      className="theme-interview-landing__meta-tag-icon size-3 shrink-0"
                      aria-hidden
                    />
                    <span>{meta.label}</span>
                  </Tag>
                )
              })}
              {(displayed.proposedMinutes ?? 0) > 0 ? (
                <Tag
                  size="sm"
                  className="theme-interview-flow-timeline__tag theme-interview-flow-timeline__tag--time theme-interview-landing__meta-tag"
                >
                  <TRY_INTERVIEW_TIME_ICON
                    className="theme-interview-landing__meta-tag-icon size-3 shrink-0"
                    aria-hidden
                  />
                  <span>{tryInterviewProposedTimeLabel(displayed.proposedMinutes ?? 0)}</span>
                </Tag>
              ) : null}
            </div>
          </li>
        ) : null}
      </ul>

      {hideCta || !displayed.cta ? null : (
      <div
        className="theme-vurify-pricing-table__row theme-vurify-pricing-table__row--cta"
        data-stagger={rowCount - 1}
      >
        <ButtonHoverFx
          variant="marquee-menu"
          marqueeContent={displayed.cta}
          housing
          className="theme-vurify-pricing-table__cta-btn type-title"
          aria-label={displayed.cta.label}
          onClick={onCtaClick}
        />
      </div>
      )}
    </div>
  )
}
