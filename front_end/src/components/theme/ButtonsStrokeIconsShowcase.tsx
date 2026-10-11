import { STROKE_MENU_ICON_PRESETS } from '../../lib/animations/strokeMenuIcons'
import { StrokeMenuIcon } from '../StrokeMenuIcon'

export function ButtonsStrokeIconsShowcase() {
  return (
    <div className="theme-stroke-icons-showcase space-y-8">
      <section className="space-y-4">
        <p className="type-overline">Stroke SVG icons</p>
        <p className="type-body-sm type-muted prose-measure">
          Checkbox-driven SVG stroke-dash morphs — distinct from Lucide Motion{' '}
          <code className="type-code">AnimatedIcon</code> (<code className="type-code">ref.animated-icon-1</code>
          ). Tap each icon to toggle open/close; hover shows accent hit target.
        </p>
        <div className="theme-stroke-icons-showcase__grid">
          {STROKE_MENU_ICON_PRESETS.map((preset) => (
            <div key={preset.variant} className="theme-stroke-icons-showcase__cell">
              <StrokeMenuIcon variant={preset.variant} label={preset.label} />
            </div>
          ))}
        </div>
        <ul className="type-caption type-muted grid gap-1 sm:grid-cols-2">
          {STROKE_MENU_ICON_PRESETS.map((preset) => (
            <li key={preset.variant}>
              <code className="type-code">{preset.variant}</code> — {preset.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Lucide Motion (existing)</p>
        <p className="type-body-sm type-muted prose-measure">
          Signature hover animation via <code className="type-code">IconButton animatedIcon</code> — see{' '}
          <strong>Buttons → Overview</strong> extensions row.
        </p>
      </section>
    </div>
  )
}
