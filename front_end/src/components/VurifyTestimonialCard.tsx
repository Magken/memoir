import { StarIcon } from '@hugeicons/core-free-icons'
import { VurifyIcon } from './VurifyIcon'
import type { VurifyTestimonial } from '../lib/testimonials/vurifyTestimonials'

type VurifyTestimonialCardProps = {
  testimonial: VurifyTestimonial
  className?: string
}

/**
 * Testimonial review — portrait + stars/quote/meta (title lives beside portrait in the shift shell).
 */
export function VurifyTestimonialCard({ testimonial, className = '' }: VurifyTestimonialCardProps) {
  const { quote, name, role, rating, image } = testimonial

  return (
    <article
      className={['theme-vurify-testimonial-card', className].filter(Boolean).join(' ')}
      aria-label={`${name}, ${rating} of 5 stars`}
    >
      <div className="theme-vurify-testimonial-card__media">
        <img
          className="theme-vurify-testimonial-card__image"
          src={image.src}
          alt={image.alt}
          loading="lazy"
          draggable={false}
        />
      </div>

      <div className="theme-vurify-testimonial-card__body">
        <div className="theme-vurify-testimonial-card__stars" aria-hidden>
          {Array.from({ length: 5 }, (_, index) => {
            const filled = index < rating
            return (
              <VurifyIcon
                key={index}
                iconNode={StarIcon}
                variant="plain"
                tone={filled ? 'complement' : 'muted'}
                size="sm"
                className={
                  filled
                    ? 'theme-vurify-testimonial-card__star theme-vurify-testimonial-card__star--filled'
                    : 'theme-vurify-testimonial-card__star'
                }
              />
            )
          })}
        </div>

        <p className="theme-vurify-testimonial-card__quote type-body">{quote}</p>

        <footer className="theme-vurify-testimonial-card__meta">
          <p className="theme-vurify-testimonial-card__name type-body-sm">{name}</p>
          <p className="theme-vurify-testimonial-card__role type-caption type-muted">{role}</p>
        </footer>
      </div>
    </article>
  )
}
