import type { ReactNode } from 'react'

type ChartCardProps = {
  title: string
  subtitle?: string
  /** Library badge — e.g. "Nivo" / "ECharts". */
  badge?: string
  children: ReactNode
  className?: string
}

/** Framed container for a single chart example — title, optional badge, themed surface. */
export function ChartCard({ title, subtitle, badge, children, className = '' }: ChartCardProps) {
  return (
    <figure
      className={[
        'flex flex-col rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <figcaption className="mb-3 flex items-start justify-between gap-3">
        <span>
          <span className="type-h5 block">{title}</span>
          {subtitle ? <span className="type-caption type-muted block">{subtitle}</span> : null}
        </span>
        {badge ? (
          <span className="type-caption font-mono rounded border border-[var(--theme-border)] px-2 py-0.5 type-faint">
            {badge}
          </span>
        ) : null}
      </figcaption>
      <div className="min-w-0">{children}</div>
    </figure>
  )
}
