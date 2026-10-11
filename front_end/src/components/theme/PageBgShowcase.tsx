import { ThemePalettePicker } from '../ThemePalettePicker'
import { PageBgDivDemo } from './PageBgDivDemo'
import { PageBgPatternDemo } from './PageBgPatternDemo'
import { PageBgTextureShowcase } from './PageBgTextureShowcase'

export function PageBgShowcase() {
  return (
    <div className="space-y-10">
      <p className="type-body-sm type-muted prose-measure">
        Page backgrounds: pattern classes on <code className="type-code">html</code> / section hosts, or a{' '}
        <strong>fixed div layer</strong> for extra-long pages (
        <code className="type-code">ref.background-types-1</code>). Base fill uses{' '}
        <code className="type-code">--theme-page-bg</code>; child sections keep{' '}
        <code className="type-code">--theme-surface</code> solid.
      </p>

      <ThemePalettePicker />

      <section className="space-y-6">
        <div>
          <p className="type-overline">Div backgrounds</p>
          <p className="type-body-sm type-muted prose-measure">
            A single <code className="type-code">.theme-page-bg-div</code> behind scroll content — no pattern
            on <code className="type-code">html</code>. Use <code className="type-code">PageBgDiv</code> at
            the page shell root; wrap scroll sections in{' '}
            <code className="type-code">.theme-page-bg-host__content</code> when nesting inside a host.
          </p>
        </div>
        <PageBgDivDemo
          variant="solid"
          title="Solid div"
          description="--theme-page-bg only. Fixed to the viewport in production; scroll the panel to see sections pass over the fill."
        />
        <PageBgDivDemo
          variant="grid"
          title="Grid div"
          description="Same graph grid as the html host — applied to the background div instead."
        />
        <PageBgDivDemo
          variant="checker"
          title="Checker div"
          description="Checker on the div layer for long landing-style pages without touching document root."
        />
        <PageBgDivDemo
          variant="neuro"
          title="Neuro noise (WebGL)"
          description="Animated neural noise from ref.background-types-2 — vein tint uses --theme-accent on --theme-page-bg. Move the pointer; palette picker updates colors live."
        />
      </section>

      <PageBgTextureShowcase />

      <section className="space-y-6">
        <div>
          <p className="type-overline">Host pattern classes</p>
          <p className="type-body-sm type-muted prose-measure">
            Apply <code className="type-code">.theme-page-bg--grid</code> or{' '}
            <code className="type-code">.theme-page-bg--checker</code> on a section host (
            <code className="type-code">main</code>, landing band, or{' '}
            <code className="type-code">.theme-root</code>).
          </p>
        </div>
      <PageBgPatternDemo
        variant="grid"
        title="Graph grid"
        description="Minor + major lines from --theme-border-strong on --theme-page-bg. Standard CSS linear-gradient grid (no image asset)."
      />

      <PageBgPatternDemo
        variant="checker"
        title="Checker"
        description="Two-tone checker from --theme-page-bg and a mix of --theme-surface-inset."
      />
      </section>

      <section className="space-y-3">
        <p className="type-overline">Site usage</p>
        <p className="type-body-sm type-muted prose-measure">
          Landing (<code className="type-code">/</code>) uses{' '}
          <code className="type-code">ThemeColorProvider pageBg="grid"</code> — pattern class on{' '}
          <code className="type-code">&lt;html&gt;</code> so Lenis/window scroll shows the grid. Section
          composites should use <code className="type-code">--theme-surface</code> so content blocks stay
          readable.
        </p>
      </section>
    </div>
  )
}
