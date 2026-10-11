import { useState } from 'react'
import { Droplet, Flame, Footprints, Thermometer, Timer } from 'lucide-react'
import {
  DEFAULT_LOADER_VARIANT,
  LOADER_SIZES,
} from '../../lib/loaders/loaderVariants'
import {
  BAR_LOADER_VARIANTS,
  DIAL_LOADER_SHAPES,
  FLUID_LOADER_GRADIENTS,
  FLUID_LOADER_SHAPES,
  FLUID_LOADER_SIZES,
  PROGRESS_LOADER_SIZES,
  PROGRESS_LOADER_TONES,
  RADIAL_LOADER_DEMO_RINGS,
  RADIAL_LOADER_SHAPES,
  STEP_LOADER_VARIANTS,
  type BarLoaderVariant,
  type DialLoaderShape,
  type FluidLoaderGradient,
  type FluidLoaderShape,
  type FluidLoaderSize,
  type ProgressLoaderSize,
  type ProgressLoaderTone,
  type RadialLoaderRing,
  type RadialLoaderShape,
  type StepLoaderVariant,
} from '../../lib/loaders/progressLoaders'
import { Button } from '../Button'
import { FluidLoader } from '../FluidLoader'
import { ContentLoadOverlay, Loader, PageLoader } from '../Loader'
import { LoadingButton } from '../LoadingButton'
import { BarLoader, RadialLoader } from '../ProgressLoader'
import { Select } from '../Select'
import { BatteryLoader, DialLoader, StepLoader } from '../StepLoader'

const ACTIVITY_RING_ICONS = [Footprints, Flame, Timer]
const ACTIVITY_RINGS: RadialLoaderRing[] = RADIAL_LOADER_DEMO_RINGS.map((ring, index) => ({
  ...ring,
  icon: ACTIVITY_RING_ICONS[index],
}))

const toOptions = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }))
const ON_OFF = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

export type LoadersShowcasePanel = 'radial' | 'linear' | 'app'

type LoadersShowcaseProps = {
  panel: LoadersShowcasePanel
}

export function LoadersShowcase({ panel }: LoadersShowcaseProps) {
  const [btnLoading, setBtnLoading] = useState(false)
  const [overlayDemo, setOverlayDemo] = useState(true)
  const [progress, setProgress] = useState(64)

  const [radialShape, setRadialShape] = useState<RadialLoaderShape>('full')
  const [radialSize, setRadialSize] = useState<ProgressLoaderSize>('lg')
  const [radialTone, setRadialTone] = useState<ProgressLoaderTone>('accent')
  const [radialGlow, setRadialGlow] = useState('off')
  const [radialAnimate, setRadialAnimate] = useState('on')

  const [barVariant, setBarVariant] = useState<BarLoaderVariant>('solid')
  const [barSize, setBarSize] = useState<ProgressLoaderSize>('md')
  const [barTone, setBarTone] = useState<ProgressLoaderTone>('accent')
  const [barGlow, setBarGlow] = useState('off')

  const [fluidShape, setFluidShape] = useState<FluidLoaderShape>('tube')
  const [fluidSize, setFluidSize] = useState<FluidLoaderSize>('md')
  const [fluidTone, setFluidTone] = useState<ProgressLoaderTone>('info')
  const [fluidGlow, setFluidGlow] = useState('off')
  const [fluidGradient, setFluidGradient] = useState('none')

  const [stepVariant, setStepVariant] = useState<StepLoaderVariant>('dots')
  const [stepTone, setStepTone] = useState<ProgressLoaderTone>('accent')
  const [dialShape, setDialShape] = useState<DialLoaderShape>('donut')
  const [dialTone, setDialTone] = useState<ProgressLoaderTone>('accent')

  return (
    <div className="space-y-12">
      {panel === 'radial' ? (
        <>
      <section className="space-y-4">
        <p className="type-overline">Radial progress loader — playground</p>
        <p className="type-body-sm type-muted prose-measure">
          Determinate SVG ring (ref.radial-loader-1) via <code className="type-code">RadialLoader</code>.
          The fill animates in on mount and tweens on value change. Configure the props below.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="Shape"
            value={radialShape}
            options={toOptions(RADIAL_LOADER_SHAPES)}
            onChange={(v) => setRadialShape(v as RadialLoaderShape)}
          />
          <Select
            label="Size"
            value={radialSize}
            options={toOptions(PROGRESS_LOADER_SIZES)}
            onChange={(v) => setRadialSize(v as ProgressLoaderSize)}
          />
          <Select
            label="Tone"
            value={radialTone}
            options={toOptions(PROGRESS_LOADER_TONES)}
            onChange={(v) => setRadialTone(v as ProgressLoaderTone)}
          />
          <Select label="Glow" value={radialGlow} options={ON_OFF} onChange={setRadialGlow} />
          <Select
            label="Animate"
            value={radialAnimate}
            options={ON_OFF}
            onChange={setRadialAnimate}
          />
        </div>
        <div className="flex flex-wrap items-center gap-8">
          <RadialLoader
            key={`${radialShape}-${radialAnimate}-${radialSize}`}
            value={progress}
            shape={radialShape}
            size={radialSize}
            tone={radialTone}
            glow={radialGlow === 'on'}
            animate={radialAnimate === 'on'}
          >
            <span className="font-mono font-semibold">{Math.round(progress)}%</span>
          </RadialLoader>
          <RadialLoader size={radialSize} indeterminate tone={radialTone} label="Loading" />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProgress((v) => Math.max(0, v - 12))}
            >
              −12%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProgress((v) => Math.min(100, v + 12))}
            >
              +12%
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Stacked radial (activity rings)</p>
        <p className="type-body-sm type-muted prose-measure">
          Concentric arcs via the <code className="type-code">rings</code> prop — move / exercise /
          stand, each with its own value, tone, and arc-tip <code className="type-code">icon</code>.
          Rings pack into the outer band, keeping the center clear for content.
        </p>
        <div className="flex flex-wrap items-center gap-10">
          <RadialLoader rings={ACTIVITY_RINGS} size="lg" glow label="Activity rings">
            <span className="theme-radial-loader__metric">3</span>
            <span className="theme-radial-loader__unit">rings</span>
          </RadialLoader>
          <RadialLoader rings={ACTIVITY_RINGS} size="md" label="Activity rings" />
          <div className="flex flex-col items-center gap-2">
            <RadialLoader rings={ACTIVITY_RINGS} size="micro" label="Activity rings" />
            <span className="type-caption font-mono type-faint">micro</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Stacked semicircle</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">shape=&quot;semi&quot;</code> with <code className="type-code">rings</code> —
          multi-metric half gauges; outer-band packing leaves the base free for labels.
        </p>
        <div className="flex flex-wrap items-end gap-12">
          <RadialLoader rings={ACTIVITY_RINGS} shape="semi" size="lg" glow label="Stacked gauge">
            <span className="theme-radial-loader__unit">today</span>
          </RadialLoader>
          <RadialLoader rings={ACTIVITY_RINGS} shape="semi" size="md" label="Stacked gauge" />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Semicircle gauge (scale unit)</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">shape=&quot;semi&quot;</code> with <code className="type-code">min</code>/
          <code className="type-code">max</code>, <code className="type-code">unit</code>,{' '}
          <code className="type-code">ticks</code>, and <code className="type-code">showScale</code> — for
          distance, weight, speed, etc.
        </p>
        <div className="flex flex-wrap items-end gap-12">
          <RadialLoader shape="semi" value={72} min={0} max={120} unit="kg" tone="info" ticks={6} showScale />
          <RadialLoader shape="semi" value={18} min={0} max={30} unit="km" tone="success" ticks={6} showScale glow />
          <RadialLoader shape="semi" value={progress} unit="%" tone="warning" ticks={10} showScale />
        </div>
      </section>
        </>
      ) : null}

      {panel === 'linear' ? (
        <>
      <section className="space-y-4">
        <p className="type-overline">Straight (linear) loader — playground</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">BarLoader</code> — configure variant / size / tone / glow.
          Sizes <code className="type-code">micro</code> → <code className="type-code">lg</code>.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Variant"
            value={barVariant}
            options={toOptions(BAR_LOADER_VARIANTS)}
            onChange={(v) => setBarVariant(v as BarLoaderVariant)}
          />
          <Select
            label="Size"
            value={barSize}
            options={toOptions(PROGRESS_LOADER_SIZES)}
            onChange={(v) => setBarSize(v as ProgressLoaderSize)}
          />
          <Select
            label="Tone"
            value={barTone}
            options={toOptions(PROGRESS_LOADER_TONES)}
            onChange={(v) => setBarTone(v as ProgressLoaderTone)}
          />
          <Select label="Glow" value={barGlow} options={ON_OFF} onChange={setBarGlow} />
        </div>
        <div className="max-w-md space-y-5">
          <BarLoader
            value={progress}
            variant={barVariant}
            size={barSize}
            tone={barTone}
            glow={barGlow === 'on'}
            icon={Timer}
            label="Configured"
            showValue
          />
          <BarLoader indeterminate tone={barTone} label="Indeterminate" />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Fluid loaders — playground</p>
        <p className="type-body-sm type-muted prose-measure">
          Liquid-fill vessels with an animated wave surface (port of{' '}
          <code className="type-code">ref.liquid-loader</code>) via <code className="type-code">FluidLoader</code>.
          Shapes <code className="type-code">tube</code> / <code className="type-code">bottle</code> /{' '}
          <code className="type-code">circle</code> / <code className="type-code">drop</code>; the level
          rises on mount and tweens on value change.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Shape"
            value={fluidShape}
            options={toOptions(FLUID_LOADER_SHAPES)}
            onChange={(v) => setFluidShape(v as FluidLoaderShape)}
          />
          <Select
            label="Size"
            value={fluidSize}
            options={toOptions(FLUID_LOADER_SIZES)}
            onChange={(v) => setFluidSize(v as FluidLoaderSize)}
          />
          <Select
            label="Gradient"
            value={fluidGradient}
            options={toOptions(['none', ...FLUID_LOADER_GRADIENTS])}
            onChange={setFluidGradient}
          />
          <Select
            label="Tone"
            value={fluidTone}
            options={toOptions(PROGRESS_LOADER_TONES)}
            onChange={(v) => setFluidTone(v as ProgressLoaderTone)}
          />
          <Select label="Glow" value={fluidGlow} options={ON_OFF} onChange={setFluidGlow} />
        </div>
        <p className="type-caption type-faint">
          A <code className="type-code">gradient</code> overrides <code className="type-code">tone</code> — the
          low end shows a different color than the high end as it fills.
        </p>
        <div className="flex flex-wrap items-end gap-10">
          <FluidLoader
            key={`${fluidShape}-${fluidSize}`}
            value={progress}
            shape={fluidShape}
            size={fluidSize}
            tone={fluidTone}
            gradient={fluidGradient === 'none' ? undefined : (fluidGradient as FluidLoaderGradient)}
            glow={fluidGlow === 'on'}
            unit="%"
          />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Color-scale gradients</p>
        <p className="type-body-sm type-muted prose-measure">
          Named <code className="type-code">gradient</code> presets anchored to the vessel — cold blues at
          the base shift to hot crests up top (port of the <code className="type-code">ref.liquid-loader</code>{' '}
          thermal fill). Hover the ticks to read the scale.
        </p>
        <div className="flex flex-wrap items-end gap-12">
          <div className="flex flex-col items-center gap-2">
            <FluidLoader
              shape="tube"
              value={42}
              min={0}
              max={50}
              unit="°"
              gradient="thermal"
              ticks={5}
              showScale
            />
            <span className="type-caption font-mono type-faint">thermal</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <FluidLoader shape="tube" value={progress} unit="%" gradient="rainbow" ticks={5} />
            <span className="type-caption font-mono type-faint">rainbow</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <FluidLoader shape="bottle" value={70} unit="%" gradient="ocean" glow />
            <span className="type-caption font-mono type-faint">ocean</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <FluidLoader shape="circle" value={58} unit="%" gradient="aurora" />
            <span className="type-caption font-mono type-faint">aurora</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <FluidLoader shape="drop" value={64} gradient="sunset" />
            <span className="type-caption font-mono type-faint">sunset</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <FluidLoader shape="tube" value={28} unit="%" gradient="cold" />
            <span className="type-caption font-mono type-faint">cold</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <FluidLoader shape="bottle" value={80} unit="%" gradient="heat" glow />
            <span className="type-caption font-mono type-faint">heat</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Step loaders</p>
        <p className="type-body-sm type-muted prose-measure">
          Discrete progress via <code className="type-code">StepLoader</code> — <code className="type-code">dots</code>{' '}
          / <code className="type-code">bars</code> / <code className="type-code">steps</code> cells that fill by
          count. Great for multi-step flows; indeterminate runs a travelling pulse.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
          <Select
            label="Variant"
            value={stepVariant}
            options={toOptions(STEP_LOADER_VARIANTS)}
            onChange={(v) => setStepVariant(v as StepLoaderVariant)}
          />
          <Select
            label="Tone"
            value={stepTone}
            options={toOptions(PROGRESS_LOADER_TONES)}
            onChange={(v) => setStepTone(v as ProgressLoaderTone)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-10">
          <StepLoader
            value={progress}
            steps={5}
            variant={stepVariant}
            tone={stepTone}
            showValue
            label="Upload"
          />
          <StepLoader value={progress} steps={8} variant={stepVariant} tone={stepTone} glow />
          <StepLoader indeterminate steps={5} variant={stepVariant} tone={stepTone} label="Working" />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Dial loaders (conic)</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">DialLoader</code> — a CSS conic-gradient fill as a{' '}
          <code className="type-code">pie</code> or <code className="type-code">donut</code>. Lighter than the
          SVG ring; the wedge tweens via a registered <code className="type-code">@property</code>.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
          <Select
            label="Shape"
            value={dialShape}
            options={toOptions(DIAL_LOADER_SHAPES)}
            onChange={(v) => setDialShape(v as DialLoaderShape)}
          />
          <Select
            label="Tone"
            value={dialTone}
            options={toOptions(PROGRESS_LOADER_TONES)}
            onChange={(v) => setDialTone(v as ProgressLoaderTone)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-10">
          <DialLoader value={progress} shape={dialShape} tone={dialTone} unit="%" />
          <DialLoader value={72} shape={dialShape} tone={dialTone} size="lg" glow unit="%" />
          <div className="flex flex-col items-center gap-2">
            <DialLoader value={40} shape={dialShape} tone={dialTone} size="sm" unit="%" />
            <span className="type-caption font-mono type-faint">sm</span>
          </div>
          <DialLoader indeterminate shape={dialShape} tone={dialTone} />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Battery loaders</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">BatteryLoader</code> — liquid fill with an animated wave surface,{' '}
          <code className="type-code">autoTone</code> thresholds (low red · mid amber · high green), a value
          readout, hover <code className="type-code">ticks</code> scale, a <code className="type-code">charging</code>{' '}
          bolt, and horizontal / vertical orientation.
        </p>
        <div className="flex flex-wrap items-center gap-12">
          <BatteryLoader value={12} showValue />
          <BatteryLoader value={46} showValue ticks={4} showScale />
          <BatteryLoader value={88} showValue glow ticks={4} />
          <BatteryLoader value={64} charging size="lg" />
          <BatteryLoader value={50} tone="info" autoTone={false} showValue label="Brand tone" />
        </div>
        <div className="flex flex-wrap items-end gap-12">
          <div className="flex flex-col items-center gap-2">
            <BatteryLoader value={progress} orientation="vertical" showValue ticks={4} showScale />
            <span className="type-caption font-mono type-faint">vertical</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <BatteryLoader value={28} orientation="vertical" charging size="lg" />
            <span className="type-caption font-mono type-faint">charging</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Fluid presets (temperature · water · scale)</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">min</code>/<code className="type-code">max</code>,{' '}
          <code className="type-code">unit</code>, hoverable <code className="type-code">ticks</code> +
          <code className="type-code">showScale</code> — thermometers, water bottles, and round flasks.
        </p>
        <div className="flex flex-wrap items-end gap-14">
          <div className="flex flex-col items-center gap-2">
            <FluidLoader
              shape="tube"
              value={37}
              min={0}
              max={50}
              unit="°"
              tone="error"
              ticks={5}
              showScale
            />
            <span className="type-caption font-mono type-faint">temperature</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <FluidLoader shape="bottle" value={64} unit="%" tone="info" icon={Droplet} glow />
            <span className="type-caption font-mono type-faint">water</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <FluidLoader shape="circle" value={progress} unit="%" tone="success" />
            <span className="type-caption font-mono type-faint">flask</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <FluidLoader shape="drop" value={progress} tone="accent" icon={Thermometer} />
            <span className="type-caption font-mono type-faint">drop</span>
          </div>
        </div>
      </section>
        </>
      ) : null}

      {panel === 'app' ? (
        <>
      <p className="type-body-sm type-muted prose-measure">
        Neobrutal gyroscopic and triad loaders — thick accent rings, theme border palette. Set{' '}
        <code className="type-code">DEFAULT_LOADER_VARIANT</code> in{' '}
        <code className="type-code">loaderVariants.ts</code> once;{' '}
        <code className="type-code">PageLoader</code>,{' '}
        <code className="type-code">ContentLoadOverlay</code> (galleries), and{' '}
        <code className="type-code">LoadingButton</code> inherit unless a call site passes{' '}
        <code className="type-code">variant</code>.
      </p>

      <section className="space-y-4">
        <p className="type-overline">Page loader (app default: {DEFAULT_LOADER_VARIANT})</p>
        <PageLoader label="Fetching workspace…" />
        <PageLoader fill label="Full-area loading…" />
      </section>

      <section className="space-y-4">
        <p className="type-overline">Content overlay (galleries)</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">ContentLoadOverlay</code> — absolute blur overlay with compact{' '}
          <code className="type-code">PageLoader</code>. Used by band and spiral galleries.
        </p>
        <div className="relative min-h-[14rem] rounded border border-[var(--theme-border)] bg-[var(--theme-surface)]">
          <ContentLoadOverlay loading={overlayDemo} label="Loading gallery…" />
          <div className="flex min-h-[14rem] items-center justify-center p-6">
            <Button variant="outline" onClick={() => setOverlayDemo((value) => !value)}>
              {overlayDemo ? 'Hide overlay' : 'Show overlay'}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Triad variant</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">variant=&quot;triad&quot;</code> (default) — three perspective rings.
          Use <code className="type-code">fill</code> for route/section loading on{' '}
          <code className="type-code">--theme-page-bg</code>.
        </p>
        <PageLoader variant="triad" label="Loading app…" />
        <ul className="flex flex-wrap items-end gap-8">
          {LOADER_SIZES.filter((size) => size !== 'button').map((size) => (
            <li key={size} className="flex flex-col items-center gap-2">
              <Loader variant="triad" size={size} />
              <span className="type-caption font-mono type-faint">{size}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Size scale</p>
        <ul className="flex flex-wrap items-end gap-8">
          {LOADER_SIZES.filter((size) => size !== 'button').map((size) => (
            <li key={size} className="flex flex-col items-center gap-2">
              <Loader size={size} />
              <span className="type-caption font-mono type-faint">{size}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Button element loaders</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">LoadingButton</code> uses the app default loader when{' '}
          <code className="type-code">loading</code> is set.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <LoadingButton
            variant="accent"
            loading={btnLoading}
            loadingLabel="Saving…"
            onClick={() => {
              setBtnLoading(true)
              window.setTimeout(() => setBtnLoading(false), 2200)
            }}
          >
            Save changes
          </LoadingButton>
          <Button variant="outline" disabled aria-busy="true">
            <Loader size="button" label="Loading" />
            <span className="theme-btn__label">Processing</span>
          </Button>
        </div>
      </section>
        </>
      ) : null}
    </div>
  )
}
