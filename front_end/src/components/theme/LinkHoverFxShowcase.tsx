import { Link } from 'react-router-dom'
import { LINK_HOVER_PRESETS } from '../../lib/animations/linkHoverPresets'
import { LinkHoverFx } from '../LinkHoverFx'

export function LinkHoverFxShowcase() {
  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure mb-0">
        CSS-only underline hover styles ported from{' '}
        <a
          className="underline"
          href="https://github.com/codrops/LineHoverStyles"
          target="_blank"
          rel="noreferrer"
        >
          Codrops LineHoverStyles
        </a>{' '}
        (MIT). Class API: <code className="type-code">theme-link-fx--*</code>. See also{' '}
        <Link className="underline" to="/theme?section=typography">
          Typography overview
        </Link>
        .
      </p>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {LINK_HOVER_PRESETS.map((preset) => (
          <li key={preset.id} className="theme-card theme-card--flat flex flex-col items-center gap-3 p-6">
            <LinkHoverFx variant={preset.id} dataText={preset.sample}>
              {preset.sample}
            </LinkHoverFx>
            <p className="type-label mb-0">{preset.label}</p>
            <p className="font-mono text-[0.65rem] type-faint mb-0">theme-link-fx--{preset.id}</p>
            <p className="type-caption type-muted mb-0 text-center">{preset.purpose}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
