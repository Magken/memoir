import { PageBgDiv, type PageBgDivVariant } from '../PageBgDiv'

type PageBgDivDemoProps = {
  variant: PageBgDivVariant
  title: string
  description: string
}

const demoBlocks = [
  'Hero band',
  'Feature row',
  'Metrics strip',
  'Quote block',
  'Gallery band',
  'FAQ section',
  'CTA band',
  'Footer band',
] as const

export function PageBgDivDemo({ variant, title, description }: PageBgDivDemoProps) {
  return (
    <section className="space-y-3">
      <div>
        <p className="type-overline">{title}</p>
        <p className="type-body-sm type-muted prose-measure">{description}</p>
      </div>
      <div className="theme-page-bg-demo__scroll-host">
        <div className="theme-page-bg-host">
          <PageBgDiv variant={variant} />
          <div className="theme-page-bg-host__content space-y-3 p-4">
            {demoBlocks.map((label) => (
              <div key={label} className="theme-page-bg-demo__section">
                <p className="type-label">{label}</p>
                <p className="type-body-sm type-muted">
                  Solid <code className="type-code">--theme-surface</code> — pattern shows in gaps when
                  sections do not span full width.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="type-caption type-muted">
        Production: <code className="type-code">&lt;PageBgDiv variant=&quot;{variant}&quot; /&gt;</code>{' '}
        as first child of the page shell (fixed viewport). Demo uses{' '}
        <code className="type-code">.theme-page-bg-host</code> so the same div stretches inside the scroll
        panel.
      </p>
    </section>
  )
}
