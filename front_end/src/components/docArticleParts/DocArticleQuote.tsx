import type { ReactNode } from 'react'

type DocArticleQuoteProps = {
  children: ReactNode
  attribution?: string
  pull?: boolean
  className?: string
}

export function DocArticleQuote({
  children,
  attribution,
  pull = false,
  className = '',
}: DocArticleQuoteProps) {
  return (
    <figure
      className={[
        'theme-doc-article__quote',
        pull ? 'theme-doc-article__quote--pull' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {pull ? (
        <blockquote className="type-quote mb-0">{children}</blockquote>
      ) : (
        <blockquote className="type-blockquote mb-0">{children}</blockquote>
      )}
      {attribution ? (
        <figcaption className="theme-doc-article__quote-attribution type-caption type-faint">
          {attribution}
        </figcaption>
      ) : null}
    </figure>
  )
}
