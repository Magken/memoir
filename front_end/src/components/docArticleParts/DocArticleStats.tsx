import type { ReactNode } from 'react'

type DocArticleStatProps = {
  value: string
  label: string
}

export function DocArticleStat({ value, label }: DocArticleStatProps) {
  return (
    <div className="theme-doc-article__stat" role="listitem">
      <p className="theme-doc-article__stat-value type-h3 type-serif-italic">{value}</p>
      <p className="theme-doc-article__stat-label type-overline type-faint">{label}</p>
    </div>
  )
}

type DocArticleStatsProps = {
  children: ReactNode
  className?: string
}

export function DocArticleStats({ children, className = '' }: DocArticleStatsProps) {
  return (
    <div
      className={['theme-doc-article__stats', className].filter(Boolean).join(' ')}
      role="list"
      aria-label="Key figures"
    >
      {children}
    </div>
  )
}
