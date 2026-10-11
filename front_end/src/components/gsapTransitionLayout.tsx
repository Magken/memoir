import { forwardRef, type ReactNode } from 'react'

/** Demo imagery — wide crops for section-transition stages. */
export const TRANSITION_IMG = {
  cityA: 'https://picsum.photos/1600/900?random=81',
  cityB: 'https://picsum.photos/1600/900?random=82',
  cityC: 'https://picsum.photos/1600/900?random=83',
  cityD: 'https://picsum.photos/1600/900?random=84',
  cityE: 'https://picsum.photos/1600/900?random=85',
  cityF: 'https://picsum.photos/1600/900?random=86',
  landscapeA: 'https://picsum.photos/1600/900?random=91',
  landscapeB: 'https://picsum.photos/1600/900?random=92',
  interiorA: 'https://picsum.photos/1600/900?random=97',
  interiorB: 'https://picsum.photos/1600/900?random=98',
} as const

export type TransitionPanelTone = 'violet' | 'teal' | 'amber' | 'rose' | 'slate' | 'ink'

type TransitionSlideProps = {
  image: string
  title: string
  className?: string
  dataPanel?: string
  children?: ReactNode
}

/** Full-bleed slide — image, scrim, display title (CodePen tutsplus / GSAP slide stacks). */
export const TransitionSlide = forwardRef<HTMLElement, TransitionSlideProps>(function TransitionSlide(
  { image, title, className = '', dataPanel, children },
  ref,
) {
  return (
    <figure
      ref={ref}
      className={['gsap-transition-slide', className].filter(Boolean).join(' ')}
      data-panel={dataPanel}
    >
      <img className="gsap-transition-slide__img" src={image} alt="" loading="lazy" decoding="async" />
      <figcaption className="gsap-transition-slide__caption">
        <span className="gsap-transition-slide__heading type-display-sm">{title}</span>
        {children}
      </figcaption>
    </figure>
  )
})

type TransitionPanelProps = {
  tone: TransitionPanelTone
  label: string
  className?: string
  children?: ReactNode
}

export const TransitionPanel = forwardRef<HTMLDivElement, TransitionPanelProps>(function TransitionPanel(
  { tone, label, className = '', children },
  ref,
) {
  return (
    <div
      ref={ref}
      className={['gsap-transition-panel', `gsap-transition-panel--${tone}`, className].filter(Boolean).join(' ')}
      data-panel={label}
    >
      <span className="gsap-transition-panel__eyebrow type-overline">{label}</span>
      {children ?? <span className="gsap-transition-panel__fill" aria-hidden />}
    </div>
  )
})

type TransitionStageProps = {
  className?: string
  hint?: string
  children: ReactNode
}

export const TransitionStage = forwardRef<HTMLDivElement, TransitionStageProps>(function TransitionStage(
  { className = '', hint = 'Hover to preview transition', children },
  ref,
) {
  return (
    <div
      ref={ref}
      className={['gsap-transition-stage', className].filter(Boolean).join(' ')}
      tabIndex={0}
      aria-label={hint}
    >
      {children}
      <span className="gsap-transition-stage__hint type-label">{hint}</span>
    </div>
  )
})

type TransitionCopyWellProps = {
  tag?: string
  title: string
  className?: string
}

/** Masked typography line — item-reference/front-end/gsap-transition-2 nav stagger pattern. */
export function TransitionCopyWell({ tag, title, className = '' }: TransitionCopyWellProps) {
  return (
    <div className={['gsap-transition-copy', className].filter(Boolean).join(' ')}>
      {tag ? <span className="type-tag gsap-transition-copy__tag">{tag}</span> : null}
      <div className="gsap-transition-copy__mask">
        <span className="type-display-sm gsap-transition-copy__line">{title}</span>
      </div>
    </div>
  )
}
