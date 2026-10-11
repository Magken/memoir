import { Box, Shield, Zap } from 'lucide-react'
import type { CardArrangement } from '../lib/cards/cardDisplayArrangements'
import { Badge } from './Badge'
import { Card } from './Card'
import { InfoTooltip } from './InfoTooltip'
import { TypeCounter } from './TypeCounter'
import { ArrangementRule } from './cardDisplayLayout'

/** Feature, stat, info, layout — bento rhythm and dashboard composition. */
export const infoCardArrangements: CardArrangement[] = [
  {
    id: 'feature-bento-editorial',
    category: 'feature',
    name: 'Editorial bento',
    purpose: 'Wide hero cell + two stacked narrow cells — not three equal columns.',
    reference: 'Linear / Apple feature grids — 1 large + 2 small, shared gap rhythm.',
    stack: 'grid cols-[1.4fr_1fr] rows-2 gap-3 · Card raised row-span-2 · Card flat · Card outline',
    preview: (
      <div className="theme-card-arrangement grid max-w-2xl grid-cols-[1.4fr_1fr] grid-rows-2 gap-3">
        <Card variant="raised" className="row-span-2 flex flex-col justify-between px-5 py-6">
          <Zap className="size-6 type-accent" aria-hidden />
          <div>
            <p className="type-overline type-faint mb-2">Primary</p>
            <p className="type-h4 mb-0">Fast by default</p>
          </div>
        </Card>
        <Card variant="flat" className="px-4 py-5">
          <Shield className="size-5 type-accent mb-3" aria-hidden />
          <p className="type-title mb-0">Consistent</p>
        </Card>
        <Card variant="outline" className="px-4 py-5">
          <Box className="size-5 type-accent mb-3" aria-hidden />
          <p className="type-title mb-0">Composable</p>
        </Card>
      </div>
    ),
  },
  {
    id: 'feature-spec-sheet',
    category: 'feature',
    name: 'Spec sheet',
    purpose: 'Label column fixed width; values right-aligned — spreadsheet calm with tooltip on terms.',
    reference: 'Enterprise spec tables — dt/dd grid, not bullet lists.',
    stack: 'Card flat · cap label · grid cols-[1fr_auto] rows · InfoTooltip · tabular values',
    preview: (
      <Card variant="flat" className="theme-card-arrangement max-w-sm overflow-hidden p-0">
        <div className="border-b px-4 py-3">
          <p className="type-overline type-faint mb-0">Specifications</p>
        </div>
        <dl className="mb-0">
          {[
            { term: 'Latency', value: '< 50ms', tip: 'P95 under load.' },
            { term: 'Uptime', value: '99.9%', tip: 'Rolling 30-day SLA.' },
            { term: 'Regions', value: '12', tip: 'Multi-region edge.' },
          ].map((row) => (
            <div
              key={row.term}
              className="grid grid-cols-[1fr_auto] items-center gap-6 border-b px-4 py-3 last:border-b-0"
            >
              <dt className="flex items-center gap-1.5 mb-0">
                <span className="type-body-sm">{row.term}</span>
                <InfoTooltip content={row.tip} />
              </dt>
              <dd className="type-body-sm type-tabular type-muted mb-0">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    ),
  },
  {
    id: 'stat-monument',
    category: 'stat',
    name: 'Stat monument',
    purpose: 'One metric centered with monument padding — caption below rule, badge optional.',
    reference: 'Annual report KPI cards — number as hero, everything else recedes.',
    stack: 'Card raised · py-10 px-8 · text-center · type-display-md tabular · rule · caption',
    preview: (
      <Card variant="raised" className="theme-card-arrangement max-w-[14rem] px-8 py-10 text-center">
        <p className="type-display-md type-tabular type-semibold mb-0">12.4k</p>
        <ArrangementRule />
        <Badge tone="success" className="mb-2">
          +18%
        </Badge>
        <p className="type-caption type-faint mb-0 tracking-wide">Active users</p>
      </Card>
    ),
  },
  {
    id: 'stat-counter-strip',
    category: 'stat',
    name: 'Counter strip',
    purpose: 'Wide flat band — counter left-aligned, vertical rule, caption block right.',
    reference: 'Marketing proof strips — animated stat + restrained label column.',
    stack: 'Card flat · flex items-center · TypeCounter · w-px rule · type-overline + caption',
    preview: (
      <Card variant="flat" className="theme-card-arrangement flex max-w-lg items-center gap-6 px-6 py-5">
        <TypeCounter value={98} suffix="%" />
        <span className="h-10 w-px shrink-0 bg-[var(--theme-border)]" aria-hidden />
        <div>
          <p className="type-overline type-faint mb-1">Satisfaction</p>
          <p className="type-caption type-muted mb-0">Rolling 90-day score</p>
        </div>
      </Card>
    ),
  },
  {
    id: 'info-process-column',
    category: 'info',
    name: 'Process column',
    purpose: 'Vertical step stack — index, rule, body; not a horizontal divide-x rail.',
    reference: 'Onboarding flows — top-to-bottom narrative, not tab strips.',
    stack: 'Card ghost · stack gap-0 · row flex gap-4 py-4 border-b last:border-0 · type-overline accent',
    preview: (
      <Card variant="ghost" className="theme-card-arrangement max-w-md px-2 py-1">
        <ol className="mb-0 list-none p-0">
          {[
            { step: '01', label: 'Browse arrangements' },
            { step: '02', label: 'Copy stack string' },
            { step: '03', label: 'Compose in product' },
          ].map(({ step, label }) => (
            <li key={step} className="flex gap-4 border-b py-4 last:border-b-0">
              <p className="type-overline type-accent mb-0 w-8 shrink-0">{step}</p>
              <p className="type-body-sm type-muted mb-0 pt-0.5">{label}</p>
            </li>
          ))}
        </ol>
      </Card>
    ),
  },
  {
    id: 'info-settings-rail',
    category: 'info',
    name: 'Settings rail',
    purpose: 'Muted vertical category rail (~4.5rem) + primary heading block — docs/settings pattern.',
    reference: 'Notion settings — sidebar category + content header in one card.',
    stack: 'Card raised · grid cols-[4.5rem_1fr] · type-caption faint vertical · border-l pl-5',
    preview: (
      <Card variant="raised" className="theme-card-arrangement max-w-md px-5 py-5">
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-4">
          <p className="type-caption type-faint mb-0 pt-1">Account</p>
          <div className="border-l pl-5">
            <h3 className="type-h5 mb-1">Email preferences</h3>
            <p className="type-body-sm type-muted mb-0">Choose frequency and channels.</p>
          </div>
        </div>
      </Card>
    ),
  },
  {
    id: 'layout-feature-spine',
    category: 'layout',
    name: 'Feature spine',
    purpose: 'Full-width raised header band atop ghost body field — vertical spine, not side-by-side cards.',
    reference: 'Dashboard sections — title slab + open content well below.',
    stack: 'stack · Card raised header px-5 py-4 · Card ghost body min-h px-5 py-6',
    preview: (
      <div className="theme-card-arrangement max-w-lg space-y-0">
        <Card variant="raised" className="rounded-b-none px-5 py-4">
          <p className="type-overline type-faint mb-1">Section</p>
          <p className="type-h5 mb-0">Overview</p>
        </Card>
        <Card variant="ghost" className="min-h-[7rem] rounded-t-none border-t-0 px-5 py-6">
          <p className="type-body-sm type-muted mb-0">Content well — charts, tables, or nested cards.</p>
        </Card>
      </div>
    ),
  },
  {
    id: 'layout-overlap-bridge',
    category: 'layout',
    name: 'Overlap bridge',
    purpose: 'Lead card ~58% width; trailing inset overlaps with deliberate vertical offset.',
    reference: 'Editorial card pairs — not symmetric grid, intentional tension.',
    stack: 'flex items-start · Card raised w-[58%] · Card inset -ml-10 mt-8 z-10 · shadow',
    preview: (
      <div className="theme-card-arrangement flex max-w-lg items-start">
        <Card variant="raised" className="w-[58%] shrink-0 px-5 py-6">
          <p className="type-overline type-faint mb-2">Lead</p>
          <p className="type-h5 mb-0">Primary surface</p>
        </Card>
        <Card variant="inset" className="relative z-10 -ml-10 mt-8 w-[52%] px-4 py-5 shadow-md">
          <p className="type-body-sm type-muted mb-0">Overlapping detail panel with offset bridge.</p>
        </Card>
      </div>
    ),
  },
  {
    id: 'layout-asymmetric-stack',
    category: 'layout',
    name: 'Asymmetric stack',
    purpose: 'Two cards vertically stacked — second offset right with narrower width, not centered.',
    reference: 'Editorial page stacks — broken symmetry creates movement.',
    stack: 'flex flex-col gap-3 · Card flat w-full · Card outline w-[78%] self-end -mt-1',
    preview: (
      <div className="theme-card-arrangement flex max-w-sm flex-col gap-3">
        <Card variant="flat" className="px-5 py-5">
          <p className="type-h5 mb-0">First block</p>
        </Card>
        <Card variant="outline" className="-mt-1 w-[78%] self-end px-4 py-4">
          <p className="type-body-sm type-muted mb-0">Offset follow-up</p>
        </Card>
      </div>
    ),
  },
]
