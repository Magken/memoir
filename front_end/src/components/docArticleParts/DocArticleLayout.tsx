import type { ReactNode } from 'react'
import type { DocArticleLayoutVariant } from '../../lib/docArticle'

type DocArticleLayoutProps = {
  variant: DocArticleLayoutVariant
  aside?: ReactNode
  media?: ReactNode
  label?: string
  className?: string
  children: ReactNode
}

export function DocArticleLayout({
  variant,
  aside,
  media,
  label,
  className = '',
  children,
}: DocArticleLayoutProps) {
  const rootClass = [
    'theme-doc-article__layout',
    `theme-doc-article__layout--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (variant === 'sidebar') {
    return (
      <div className={rootClass} aria-label={label}>
        <div className="theme-doc-article__layout-main">{children}</div>
        {aside ? <aside className="theme-doc-article__layout-aside">{aside}</aside> : null}
      </div>
    )
  }

  if (variant === 'split') {
    return (
      <div className={rootClass} aria-label={label}>
        <div className="theme-doc-article__layout-copy">{children}</div>
        {media ? <div className="theme-doc-article__layout-media">{media}</div> : null}
      </div>
    )
  }

  if (variant === 'float-start' || variant === 'float-end') {
    return (
      <div className={rootClass} aria-label={label}>
        {media ? <div className="theme-doc-article__layout-media">{media}</div> : null}
        <div className="theme-doc-article__layout-copy">{children}</div>
      </div>
    )
  }

  if (variant === 'two-column') {
    return (
      <div className={rootClass} aria-label={label}>
        <div className="theme-doc-article__layout-copy theme-doc-article__layout-copy--columns">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={rootClass} aria-label={label}>
      <div className="theme-doc-article__layout-copy">{children}</div>
    </div>
  )
}
