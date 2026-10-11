import type { ReactNode } from 'react'

type DocArticleCalloutProps = {
  title?: string
  children: ReactNode
  className?: string
}

export function DocArticleCallout({ title, children, className = '' }: DocArticleCalloutProps) {
  return (
    <aside className={['theme-doc-article__callout', className].filter(Boolean).join(' ')}>
      {title ? <p className="theme-doc-article__callout-title type-overline">{title}</p> : null}
      <div className="theme-doc-article__callout-body type-body-sm type-muted">{children}</div>
    </aside>
  )
}
