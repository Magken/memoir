import { Link } from 'react-router-dom'
import { BUTTON_HOVER_PRESETS } from '../../lib/animations/buttonHoverPresets'
import { ButtonHoverFx } from '../ButtonHoverFx'

export function ButtonHoverFxShowcase() {
  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure mb-0">
        CSS-only button hover styles ported from{' '}
        <a
          className="underline"
          href="https://github.com/codrops/ButtonHoverStyles"
          target="_blank"
          rel="noreferrer"
        >
          Codrops ButtonHoverStyles
        </a>{' '}
        and the{' '}
        <a
          className="underline"
          href="https://github.com/codrops/MarqueeMenu/"
          target="_blank"
          rel="noreferrer"
        >
          Codrops MarqueeMenu
        </a>{' '}
        reveal (MIT). Decorative FX — not product <code className="type-code">Button</code> variants. See also{' '}
        <Link className="underline" to="/theme?section=buttons">
          Buttons overview
        </Link>
        .
      </p>
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {BUTTON_HOVER_PRESETS.map((preset) => (
          <li
            key={preset.id}
            className="theme-card theme-card--flat flex min-h-[12rem] flex-col items-center justify-center gap-3 p-6"
          >
            <ButtonHoverFx variant={preset.id} label={preset.sample} />
            <p className="type-label mb-0">{preset.label}</p>
            <p className="font-mono text-[0.65rem] type-faint mb-0">theme-btn-fx--{preset.id}</p>
            <p className="type-caption type-muted mb-0 text-center">{preset.purpose}</p>
          </li>
        ))}
      </ul>

      <section className="space-y-4">
        <p className="type-overline">Marquee housing</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          <code className="type-code">housing</code> on <code className="type-code">marquee-menu</code>{' '}
          — border on hover/selected; selected keeps the marquee strip open.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          <ButtonHoverFx variant="marquee-menu" label="Hire" housing />
          <ButtonHoverFx
            variant="marquee-menu"
            label="Apply"
            housing
            className="is-active"
            aria-pressed={true}
          />
        </div>
      </section>
    </div>
  )
}
