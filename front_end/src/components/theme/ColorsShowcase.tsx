import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { themePaletteFamily, useThemeColor } from '../../lib/theme'
import { buildPaletteVars } from '../../lib/theme/buildPaletteVars'
import type { ThemePalette } from '../../lib/theme/colorPalettes'
import { Button } from '../Button'
import { Card } from '../Card'
import { ThemeModeToggle } from '../ThemeModeToggle'
import { ThemePalettePicker } from '../ThemePalettePicker'

type TokenGroup = {
  label: string
  rows: { varName: string; key: keyof ThemePalette }[]
}

const tokenGroups: TokenGroup[] = [
  {
    label: 'Surfaces',
    rows: [
      { varName: '--theme-page-bg', key: 'pageBg' },
      { varName: '--theme-surface', key: 'surface' },
      { varName: '--theme-surface-raised', key: 'surfaceRaised' },
      { varName: '--theme-surface-inset', key: 'surfaceInset' },
    ],
  },
  {
    label: 'Borders & text',
    rows: [
      { varName: '--theme-border', key: 'border' },
      { varName: '--theme-border-strong', key: 'borderStrong' },
      { varName: '--theme-text', key: 'text' },
      { varName: '--theme-text-muted', key: 'textMuted' },
    ],
  },
  {
    label: 'Accent fill + complement outline',
    rows: [
      { varName: '--theme-accent', key: 'accent' },
      { varName: '--theme-accent-text', key: 'accentText' },
      { varName: '--theme-focus', key: 'focus' },
      { varName: '--theme-accent-border', key: 'accentBorder' },
      { varName: '--theme-complement', key: 'complement' },
      { varName: '--theme-complement-bg', key: 'complementBg' },
      { varName: '--theme-complement-border', key: 'complementBorder' },
    ],
  },
  {
    label: 'Semantic (status only)',
    rows: [
      { varName: '--theme-success', key: 'success' },
      { varName: '--theme-success-bg', key: 'successBg' },
      { varName: '--theme-success-border', key: 'successBorder' },
      { varName: '--theme-warning', key: 'warning' },
      { varName: '--theme-warning-bg', key: 'warningBg' },
      { varName: '--theme-warning-border', key: 'warningBorder' },
      { varName: '--theme-error', key: 'error' },
      { varName: '--theme-error-bg', key: 'errorBg' },
      { varName: '--theme-error-border', key: 'errorBorder' },
      { varName: '--theme-info', key: 'info' },
      { varName: '--theme-info-bg', key: 'infoBg' },
      { varName: '--theme-info-border', key: 'infoBorder' },
    ],
  },
  {
    label: 'Border glow (accent → complement)',
    rows: [
      { varName: '--theme-glow-border-rest', key: 'glowBorderRest' },
      { varName: '--theme-glow-border-from', key: 'glowBorderFrom' },
      { varName: '--theme-glow-border-mid', key: 'glowBorderMid' },
      { varName: '--theme-glow-shadow', key: 'glowShadow' },
    ],
  },
  {
    label: 'Border glow (ink)',
    rows: [
      { varName: '--theme-glow-ink-from', key: 'glowInkFrom' },
      { varName: '--theme-glow-ink-mid', key: 'glowInkMid' },
      { varName: '--theme-glow-ink-shadow', key: 'glowInkShadow' },
    ],
  },
  {
    label: 'Shadows',
    rows: [
      { varName: '--theme-shadow-brutal', key: 'shadowBrutal' },
      { varName: '--theme-shadow-outer', key: 'shadowOuter' },
      { varName: '--theme-shadow-inner', key: 'shadowInner' },
      { varName: '--theme-shadow-highlight', key: 'shadowHighlight' },
    ],
  },
]

function swatchLabelColor(key: keyof ThemePalette, palette: ThemePalette): string {
  if (key === 'pageBg' || key === 'surface' || key === 'surfaceRaised' || key === 'surfaceInset') {
    return palette.text
  }
  if (key.endsWith('Bg') || key.endsWith('Border')) {
    return palette.text
  }
  if (
    key === 'accent' ||
    key === 'focus' ||
    key === 'info' ||
    key === 'success' ||
    key === 'error' ||
    key === 'warning' ||
    key === 'complement'
  ) {
    return palette.accentText
  }
  return palette.text
}

export function ColorsShowcase() {
  const { palette, paletteId } = useThemeColor()
  const vars = buildPaletteVars(palette)
  const family = themePaletteFamily(paletteId)

  const intro =
    family === 'ember'
      ? 'Ember crimson lead: peach wash on the page, crimson fills, peach as complement outlines/glow, navy for type. Swap to lead with navy (crimson complement).'
      : family === 'eugenia'
        ? 'Eugenia: Eugenia red fills · process blue highlights on white.'
        : 'Brand: indigo fills · amber highlights for outlines and glow. White page.'

  return (
    <div className="space-y-12">
      <p className="type-body-sm type-muted prose-measure">{intro}</p>

      <section className="space-y-4">
        <ThemePalettePicker />
        <div className="flex flex-wrap items-center gap-3">
          <p className="type-overline mb-0">Mode</p>
          <ThemeModeToggle size="md" />
          <p className="type-caption type-muted mb-0">Light / dark for the active family</p>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Fill vs outline</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="accent">Accent fill</Button>
          <Button variant="outline">Outline (complement)</Button>
          <Button variant="action">Action fill</Button>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Status callouts</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <li className="theme-callout theme-callout--accent">
            <p className="theme-callout__label type-caption type-semibold mb-1">Accent</p>
            <p className="type-body-sm mb-0">Primary fill</p>
          </li>
          <li className="theme-callout theme-callout--success">
            <p className="theme-callout__label type-caption type-semibold mb-1">Success</p>
            <p className="type-body-sm mb-0">Status only</p>
          </li>
          <li className="theme-callout theme-callout--warning">
            <p className="theme-callout__label type-caption type-semibold mb-1">Warning</p>
            <p className="type-body-sm mb-0">Status only</p>
          </li>
          <li className="theme-callout theme-callout--error">
            <p className="theme-callout__label type-caption type-semibold mb-1">Error</p>
            <p className="type-body-sm mb-0">Status only</p>
          </li>
        </ul>
      </section>

      {tokenGroups.map((group) => (
        <section key={group.label} className="space-y-4">
          <p className="type-overline">{group.label}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {group.rows.map(({ varName, key }) => (
              <li
                key={varName}
                className="theme-swatch flex items-center gap-3 px-3"
                style={{ backgroundColor: palette[key] }}
              >
                <span
                  className="type-caption min-w-0 flex-1 font-mono"
                  style={{ color: swatchLabelColor(key, palette) }}
                >
                  {varName}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="space-y-4">
        <p className="type-overline">Semantic UI</p>
        <div className="flex flex-wrap gap-3">
          <span className="theme-badge theme-badge--success">Success</span>
          <span className="theme-badge theme-badge--warning">Warning</span>
          <span className="theme-badge theme-badge--error">Error</span>
          <span className="theme-badge theme-badge--info">Info</span>
        </div>
        <p className="type-body-sm">
          <span className="type-success">Success text</span>
          {' · '}
          <span className="type-error">Error text</span>
          {' · '}
          <span className="type-warning">Warning text</span>
          {' · '}
          <span className="type-info">Info text</span>
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="success" icon={CheckCircle2} size="md">
            Success
          </Button>
          <Button variant="error" icon={AlertCircle} size="md">
            Error
          </Button>
          <Button variant="warning" size="md">
            Warning
          </Button>
          <Button variant="default" icon={Info} size="md">
            Info (default)
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Surfaces on palette ({paletteId})</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="raised" title="Raised">
            Neobrutal offset: <code className="type-code">--theme-shadow-brutal</code> (10px, no
            blur).
          </Card>
          <Card variant="inset" title="Inset">
            Pressed — inset brutal shadow + slight translate.
          </Card>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="default">Default</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="outline">Outline</Button>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Injected variables</p>
        <pre className="type-mono overflow-x-auto rounded-sm border border-[var(--theme-border)] bg-[var(--theme-surface-inset)] p-4 text-[0.7rem] leading-relaxed type-muted">
          {JSON.stringify(vars, null, 2)}
        </pre>
      </section>
    </div>
  )
}
