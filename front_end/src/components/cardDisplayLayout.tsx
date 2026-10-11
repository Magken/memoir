import type { ReactNode } from 'react'

/** Curated demo imagery — consistent tones across arrangements. */
export const ARRANGEMENT_IMG = {
  productA: 'https://picsum.photos/720/960?random=31',
  productB: 'https://picsum.photos/720/960?random=37',
  productC: 'https://picsum.photos/640/480?random=44',
  heroWide: 'https://picsum.photos/1280/720?random=52',
  heroTall: 'https://picsum.photos/800/1000?random=58',
  portrait: 'https://picsum.photos/600/800?random=63',
  editorial: 'https://picsum.photos/900/600?random=71',
} as const

type ArrangementMediaProps = {
  src: string
  alt?: string
  scrim?: 'default' | 'foot' | 'edge' | 'none'
  className?: string
  children?: ReactNode
}

export function ArrangementMedia({
  src,
  alt = '',
  scrim = 'default',
  className = '',
  children,
}: ArrangementMediaProps) {
  const scrimClass =
    scrim === 'foot'
      ? 'theme-card-arrangement-media__scrim--foot'
      : scrim === 'edge'
        ? 'theme-card-arrangement-media__scrim--edge'
        : scrim === 'default'
          ? 'theme-card-arrangement-media__scrim'
          : ''

  return (
    <div className={['theme-card-arrangement-media', className].filter(Boolean).join(' ')}>
      <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      {scrim !== 'none' ? <span className={scrimClass} aria-hidden /> : null}
      {children}
    </div>
  )
}

export function ArrangementRule({ accent = false }: { accent?: boolean }) {
  return (
    <hr
      className={['theme-card-arrangement__rule', accent ? 'theme-card-arrangement__rule--accent' : '']
        .filter(Boolean)
        .join(' ')}
    />
  )
}

/** Card image + scrim content helpers — override default bottom-anchored flex. */
export const cardImageContent =
  '[&_.theme-card__content]:min-h-[inherit] [&_.theme-card__body]:min-h-[inherit] [&_.theme-card__body]:w-full'

export const cardImageTop =
  `${cardImageContent} [&_.theme-card__content]:justify-start [&_.theme-card__content]:pt-[var(--arr-pad,1.5rem)]`

export const cardImageEnd =
  `${cardImageContent} [&_.theme-card__content]:justify-end [&_.theme-card__content]:pb-[var(--arr-pad,1.5rem)]`

export const cardImageBetween =
  `${cardImageContent} [&_.theme-card__content]:justify-between [&_.theme-card__content]:py-[var(--arr-pad,1.5rem)]`

export const cardImageCenter =
  `${cardImageContent} [&_.theme-card__content]:items-center [&_.theme-card__content]:justify-center [&_.theme-card__content]:text-center`

export const cardImageThirds =
  `${cardImageEnd} [&_.theme-card__content]:items-start [&_.theme-card__body]:max-w-[58%]`
