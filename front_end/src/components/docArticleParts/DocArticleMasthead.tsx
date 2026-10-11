type DocArticleMastheadProps = {
  title: string
  kicker?: string
  byline?: string
  publishedAt?: string
  className?: string
}

export function DocArticleMasthead({
  title,
  kicker,
  byline,
  publishedAt,
  className = '',
}: DocArticleMastheadProps) {
  if (!kicker && !title && !byline && !publishedAt) return null

  return (
    <header
      className={[
        'theme-doc-article__header',
        'theme-doc-article__header--masthead',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {kicker ? (
        <p className="theme-doc-article__kicker type-overline type-tracking-wide">{kicker}</p>
      ) : null}
      <h1 className="theme-doc-article__title type-h1 type-serif-italic">{title}</h1>
      {(byline || publishedAt) && (
        <p className="theme-doc-article__meta type-caption type-faint">
          {byline ? <span className="theme-doc-article__meta-byline">{byline}</span> : null}
          {byline && publishedAt ? <span aria-hidden> · </span> : null}
          {publishedAt ? <time dateTime={publishedAt}>{publishedAt}</time> : null}
        </p>
      )}
    </header>
  )
}
