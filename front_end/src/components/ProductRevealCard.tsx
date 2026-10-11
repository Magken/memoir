import type { ReactNode } from 'react'
import { ShoppingCart } from 'lucide-react'
import { LinkButton } from './LinkButton'

export type ProductRevealCardTone = 'default' | 'cool' | 'warm' | 'deep'

export type ProductRevealCardProps = {
  title: string
  category: string
  price: string
  description: string
  tags?: string[]
  image: string
  /** Color reveal layer — defaults to `image` */
  imageHover?: string
  ctaLabel?: string
  ctaHref?: string
  tone?: ProductRevealCardTone
  className?: string
}

const toneClass: Record<ProductRevealCardTone, string> = {
  default: 'theme-product-reveal-card--tone-default',
  cool: 'theme-product-reveal-card--tone-cool',
  warm: 'theme-product-reveal-card--tone-warm',
  deep: 'theme-product-reveal-card--tone-deep',
}

export function ProductRevealCard({
  title,
  category,
  price,
  description,
  tags = [],
  image,
  imageHover,
  ctaLabel = 'Add to cart',
  ctaHref = '#',
  tone = 'default',
  className = '',
}: ProductRevealCardProps) {
  const hoverSrc = imageHover ?? image

  return (
    <article
      className={[
        'theme-product-reveal-card',
        toneClass[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-product-reveal-card__thumb-stack">
        <img src={image} alt="" className="theme-product-reveal-card__img" loading="lazy" decoding="async" />
        <img src={hoverSrc} alt="" className="theme-product-reveal-card__img" loading="lazy" decoding="async" />
      </div>
      <p className="theme-product-reveal-card__category type-caption type-semibold">{category}</p>
      <h3 className="theme-product-reveal-card__title type-title mb-0">{title}</h3>
      <p className="theme-product-reveal-card__price type-body-sm type-tabular type-semibold mb-0">{price}</p>
      <p className="theme-product-reveal-card__description type-body-sm type-muted mb-0">{description}</p>
      {tags.length > 0 ? (
        <ul className="theme-product-reveal-card__tags mb-0 list-none p-0">
          {tags.map((tag) => (
            <li key={tag}>
              <span className="theme-product-reveal-card__tag type-caption">{tag}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="theme-product-reveal-card__cta-wrap">
        <LinkButton
          href={ctaHref}
          icon={ShoppingCart}
          size="md"
          variant="default"
          className="theme-product-reveal-card__cta w-full justify-center"
        >
          {ctaLabel}
        </LinkButton>
      </div>
    </article>
  )
}

type ProductRevealCardGridProps = {
  children: ReactNode
  className?: string
}

export function ProductRevealCardGrid({ children, className = '' }: ProductRevealCardGridProps) {
  return (
    <div className={['theme-product-reveal-card-grid', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
