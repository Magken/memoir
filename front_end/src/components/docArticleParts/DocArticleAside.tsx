import type { ReactNode } from 'react'

type DocArticleAsideProps = {
  title?: string
  children: ReactNode
  className?: string
}

export function DocArticleAside({ title, children, className = '' }: DocArticleAsideProps) {
  return (
    <aside
      className={['theme-doc-article__aside', className].filter(Boolean).join(' ')}
      aria-label={title}
    >
      {title ? <p className="theme-doc-article__aside-title type-overline">{title}</p> : null}
      <div className="theme-doc-article__aside-body">{children}</div>
    </aside>
  )
}
