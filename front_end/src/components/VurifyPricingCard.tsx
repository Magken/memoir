import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ButtonHoverFx,
  type ButtonHoverFxMarqueeContent,
} from './ButtonHoverFx'
import type { VurifyPricingFeature } from '../lib/pricing/vurifyPricingTiers'
import { VURIFY_PRICING_TICK_ICON } from '../lib/pricing/vurifyPricingTiers'

type VurifyPricingCardProps = {
  title: string
  price: string
  priceNote: string
  features: readonly VurifyPricingFeature[]
  icon: IconSvgElement
  cta: ButtonHoverFxMarqueeContent
  onCtaClick?: () => void
  className?: string
}

/**
 * Standard Vurify pricing card — icon, price, feature list, marquee CTA.
 */
export function VurifyPricingCard({
  title,
  price,
  priceNote,
  features,
  icon,
  cta,
  onCtaClick,
  className = '',
}: VurifyPricingCardProps) {
  return (
    <article
      className={['theme-vurify-pricing-card', className].filter(Boolean).join(' ')}
      aria-label={`${title} plan`}
    >
      <div className="theme-vurify-pricing-card__head">
        <span className="theme-vurify-pricing-card__icon" aria-hidden>
          <HugeiconsIcon icon={icon} size={28} strokeWidth={1.75} />
        </span>
        <div className="theme-vurify-pricing-card__titles">
          <h3 className="theme-vurify-pricing-card__title type-display-md">{title}</h3>
          <p className="theme-vurify-pricing-card__price type-display-sm type-tabular">{price}</p>
          <p className="theme-vurify-pricing-card__note type-body-sm type-muted">{priceNote}</p>
        </div>
      </div>

      <ul className="theme-vurify-pricing-card__features">
        {features.map((feature) => (
          <li key={feature.id} className="theme-vurify-pricing-card__feature type-body">
            <span className="theme-vurify-pricing-card__feature-icon" aria-hidden>
              <HugeiconsIcon icon={feature.icon} size={16} strokeWidth={1.75} />
            </span>
            <span className="theme-vurify-pricing-card__feature-label">{feature.label}</span>
            <span className="theme-vurify-pricing-card__feature-tick" aria-hidden>
              <HugeiconsIcon icon={VURIFY_PRICING_TICK_ICON} size={16} strokeWidth={2} />
            </span>
          </li>
        ))}
      </ul>

      <div className="theme-vurify-pricing-card__cta">
        <ButtonHoverFx
          variant="marquee-menu"
          marqueeContent={cta}
          housing
          className="theme-vurify-pricing-card__cta-btn type-title"
          aria-label={cta.label}
          onClick={onCtaClick}
        />
      </div>
    </article>
  )
}
