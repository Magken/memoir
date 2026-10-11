type PageBgPatternDemoProps = {
  variant: 'grid' | 'checker'
  title: string
  description: string
}

export function PageBgPatternDemo({ variant, title, description }: PageBgPatternDemoProps) {
  const patternClass = variant === 'grid' ? 'theme-page-bg--grid' : 'theme-page-bg--checker'

  return (
    <section className="space-y-3">
      <div>
        <p className="type-overline">{title}</p>
        <p className="type-body-sm type-muted prose-measure">{description}</p>
      </div>
      <div className={`theme-page-bg-demo__panel ${patternClass}`}>
        <p className="type-caption type-muted mb-4">
          Open host area — grid visible. Solid blocks below use <code className="type-code">--theme-surface</code>{' '}
          and cover the pattern.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="theme-page-bg-demo__section">
            <p className="type-label">Section A</p>
            <p className="type-body-sm type-muted">Solid surface panel</p>
          </div>
          <div className="theme-page-bg-demo__section">
            <p className="type-label">Section B</p>
            <p className="type-body-sm type-muted">Solid surface panel</p>
          </div>
        </div>
      </div>
      <p className="type-caption type-muted">
        Class: <code className="type-code">{patternClass}</code> on the page/section host — not on every child.
      </p>
    </section>
  )
}
