import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowRight,
  Bell,
  Bold,
  Download,
  Home,
  Italic,
  Mail,
  Minus,
  Moon,
  Package,
  PaintBucket,
  Plus,
  Settings,
  Square,
  Sun,
  Trash2,
  Type,
  Underline,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FLUID_BORDER_DEFAULT_AUTO_SECONDS,
  FLUID_BORDER_PHYSICS_PRESET_OPTIONS,
  FLUID_BORDER_PHYSICS_PRESETS,
  type FluidBorderPhysicsPreset,
} from '../../lib/animations/fluidBorder'
import { MOUSE_TILT_EFFECTS } from '../../lib/animations/tiltEffects'
import { TYPE_ANIM_PRESETS } from '../../lib/animations/typeAnimPresets'
import {
  SURFACE_SHADOW_VARIANT_OPTIONS,
  type SurfaceShadowVariant,
} from '../../lib/theme/shadowVariants'
import { Button, type ButtonImage, type ButtonSize, type ButtonVariant } from '../Button'
import { MENU_SIZES } from '../../lib/menus/menuControls'
import { PAGINATOR_VARIANTS } from '../../lib/pagination/paginatorVariants'
import { Paginator } from '../Paginator'
import { Chip } from '../Chip'
import { CopyButton } from '../CopyButton'
import { Fab } from '../Fab'
import { IconButton } from '../IconButton'
import { LinkButton } from '../LinkButton'
import { LoadingButton } from '../LoadingButton'
import { MenuButton } from '../MenuButton'
import { CheckboxGroup } from '../CheckboxGroup'
import { RadioGroup } from '../RadioGroup'
import { Switch } from '../Switch'
import { ToggleGroup } from '../ToggleGroup'
import { ThemeModeToggle } from '../ThemeModeToggle'
import { ThemePalettePicker } from '../ThemePalettePicker'
import { Select } from '../Select'

const SCROLL_MENU_ITEMS = [
  { id: 'alpha', label: 'Alpha channel' },
  { id: 'beta', label: 'Beta rollout' },
  { id: 'gamma', label: 'Gamma correction' },
  { id: 'delta', label: 'Delta sync' },
  { id: 'epsilon', label: 'Epsilon guard' },
  { id: 'zeta', label: 'Zeta cache' },
  { id: 'eta', label: 'Eta pipeline' },
  { id: 'theta', label: 'Theta export' },
] as const

const demoAvatar: ButtonImage = {
  src: `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect fill="%236366f1" width="64" height="64"/><text x="32" y="40" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="26" font-weight="600">A</text></svg>',
  )}`,
  alt: 'Alex Chen',
}

const demoLogo: ButtonImage = {
  src: `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect fill="%23f97316" width="64" height="64" rx="10"/><text x="32" y="42" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="28" font-weight="700">L</text></svg>',
  )}`,
  alt: 'Acme logo',
}

const demoPhoto: ButtonImage = {
  type: 'image',
  src: '/demo-thumb.jpg',
  alt: 'Team member photo',
}

const demoLoopVideo: ButtonImage = {
  type: 'video',
  src: '/demo-loop.webm',
  poster: '/demo-thumb.jpg',
  alt: 'Live preview clip',
}

const sizes: ButtonSize[] = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl']

const variants: { variant: ButtonVariant; label: string }[] = [
  { variant: 'default', label: 'Default (raised)' },
  { variant: 'inset', label: 'Inset' },
  { variant: 'outline', label: 'Outline' },
  { variant: 'ghost', label: 'Ghost' },
  { variant: 'tray', label: 'Tray' },
  { variant: 'cardless', label: 'Cardless' },
  { variant: 'accent', label: 'Accent' },
  { variant: 'action', label: 'Action' },
  { variant: 'stack', label: 'Stack' },
  { variant: 'media', label: 'Media' },
]

const planOptions = [
  { value: 'standard', label: 'Standard shipping', description: '5–7 business days · Free' },
  { value: 'express', label: 'Express', description: '2–3 business days · $12' },
  { value: 'overnight', label: 'Overnight', description: 'Next day · $28' },
] as const

const alignOptions = [
  { value: 'left', label: 'Left', icon: AlignLeft },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'right', label: 'Right', icon: AlignRight },
] as const

const styleOptions = [
  { value: 'bold', label: 'Bold', icon: Bold },
  { value: 'italic', label: 'Italic', icon: Italic },
  { value: 'underline', label: 'Underline', icon: Underline },
] as const

const filterOptions = [
  { value: 'alerts', label: 'Alerts', icon: Bell },
  { value: 'boost', label: 'Boost', icon: Zap },
  { value: 'night', label: 'Night', icon: Moon },
] as const

const addonOptions = [
  { value: 'gift', label: 'Gift wrap', description: 'Reusable box · $4' },
  { value: 'insurance', label: 'Shipping insurance', description: 'Loss or damage cover' },
  { value: 'signature', label: 'Signature required', description: 'Adult must be present' },
] as const

const FLUID_BORDER_AUTO_OPTIONS = [
  { value: String(FLUID_BORDER_DEFAULT_AUTO_SECONDS), label: `${FLUID_BORDER_DEFAULT_AUTO_SECONDS}s idle orbit` },
  { value: '4', label: '4s idle orbit' },
  { value: 'off', label: 'Hover only' },
] as const

export function ButtonsShowcase() {
  const [plan, setPlan] = useState('standard')
  const [tier, setTier] = useState('free')
  const [align, setAlign] = useState('center')
  const [view, setView] = useState('bold')
  const [trayActive, setTrayActive] = useState(false)
  const [trayColorText, setTrayColorText] = useState('#4a86e8')
  const [trayColorFill, setTrayColorFill] = useState('#ff9900')
  const [filters, setFilters] = useState<string[]>(['alerts'])
  const [addons, setAddons] = useState<string[]>(['gift'])
  const [checkboxButtons, setCheckboxButtons] = useState<string[]>(['alerts'])
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [saving, setSaving] = useState(false)
  const [chips, setChips] = useState<string[]>(['react', 'css'])
  const [page, setPage] = useState(3)
  const totalPages = 12
  const [menuAction, setMenuAction] = useState('edit')
  const [buttonShadowVariant, setButtonShadowVariant] = useState<SurfaceShadowVariant>('brutal')
  const [buttonFluidBorderAuto, setButtonFluidBorderAuto] = useState(
    String(FLUID_BORDER_DEFAULT_AUTO_SECONDS),
  )
  const [buttonFluidPhysics, setButtonFluidPhysics] =
    useState<FluidBorderPhysicsPreset>('default')
  const resolvedButtonFluidAuto =
    buttonFluidBorderAuto === 'off' ? false : Number(buttonFluidBorderAuto)
  const buttonFluidBorderPhysics = FLUID_BORDER_PHYSICS_PRESETS[buttonFluidPhysics]

  return (
    <div className="space-y-12">
      <p className="type-body-sm type-muted prose-measure">
        Sizes <code className="type-code">xxs</code> through{' '}
        <code className="type-code">xxl</code> use theme typography classes. Hover lifts with
        animated neobrutal / soft shadows; click presses in. Icons from{' '}
        <code className="type-code">lucide-react</code> only — never emoji as UI icons.         Vurify chrome lives under{' '}
        <Link className="underline" to="/theme?section=buttons-vurify">
          Buttons → Vurify
        </Link>
        .
      </p>

      <section className="space-y-4">
        <p className="type-overline">Shadow variants</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">shadowVariant</code> on <code className="type-code">Button</code>{' '}
          — same surface presets as cards (<code className="type-code">ref.shadows-1</code>). Hover
          and active states animate shadow + transform together.
        </p>
        <div className="max-w-xs">
          <Select
            label="shadowVariant"
            options={[...SURFACE_SHADOW_VARIANT_OPTIONS]}
            value={buttonShadowVariant}
            onChange={(value) => setButtonShadowVariant(value as SurfaceShadowVariant)}
          />
        </div>
        <ul className="flex flex-wrap gap-3">
          <li>
            <Button variant="default" shadowVariant={buttonShadowVariant}>
              Default
            </Button>
          </li>
          <li>
            <Button variant="outline" shadowVariant={buttonShadowVariant}>
              Outline
            </Button>
          </li>
          <li>
            <Button variant="accent" shadowVariant={buttonShadowVariant}>
              Accent
            </Button>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Size scale</p>
        <ul className="flex flex-wrap items-end gap-3">
          {sizes.map((size) => (
            <li key={size} className="flex flex-col items-center gap-2">
              <Button size={size} variant="default">
                {size}
              </Button>
              <span className="type-caption font-mono">{size}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Variants (md)</p>
        <ul className="flex flex-wrap gap-3">
          {variants.map(({ variant, label }) => (
            <li key={variant}>
              <Button variant={variant} size="md">
                {label}
              </Button>
            </li>
          ))}
          <li>
            <Button
              variant="tray"
              size="md"
              active={trayActive}
              aria-pressed={trayActive}
              onClick={() => setTrayActive((on) => !on)}
            >
              {trayActive ? 'Tray (on)' : 'Tray (off)'}
            </Button>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Tray color</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">variant=&quot;tray-color&quot;</code> — icon stays theme-colored;
          a dash under the icon shows <code className="type-code">indicatorColor</code>. Used in the doc
          editor for text and fill color.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <IconButton
            variant="tray-color"
            size="md"
            icon={Type}
            indicatorColor={trayColorText}
            aria-label="Text color"
            aria-pressed={false}
          />
          <IconButton
            variant="tray-color"
            size="md"
            icon={PaintBucket}
            indicatorColor={trayColorFill}
            aria-label="Fill color"
            aria-pressed={false}
          />
          <IconButton
            variant="tray-color"
            size="md"
            icon={Type}
            indicatorColor={trayColorText}
            aria-label="Text color (active)"
            aria-pressed
            active
          />
        </div>
        <div className="flex flex-wrap items-end gap-4 max-w-md">
          <label className="theme-field theme-field--xs">
            <span className="theme-field__label type-caption">Text dash</span>
            <input
              type="color"
              className="theme-field__control h-8 w-full cursor-pointer"
              value={trayColorText}
              onChange={(event) => setTrayColorText(event.target.value)}
              aria-label="Tray color text indicator"
            />
          </label>
          <label className="theme-field theme-field--xs">
            <span className="theme-field__label type-caption">Fill dash</span>
            <input
              type="color"
              className="theme-field__control h-8 w-full cursor-pointer"
              value={trayColorFill}
              onChange={(event) => setTrayColorFill(event.target.value)}
              aria-label="Tray color fill indicator"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Cardless</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">variant=&quot;cardless&quot;</code> — no border, fill, or shadow
          (surface hidden). Unlike <code className="type-code">ghost</code>, hover stays flat — accent
          text only. Supports <code className="type-code">labelAnim</code> like action.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="cardless" size="md" icon={Settings}>
            Settings
          </Button>
          <Button variant="cardless" size="md" icon={Mail} iconPosition="right">
            Contact
          </Button>
          <Button variant="cardless" size="md" labelAnim="flip">
            Flip label
          </Button>
          <Button variant="cardless" size="md" active>
            Active
          </Button>
          <IconButton variant="cardless" size="md" icon={Bell} aria-label="Notifications" />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Fluid border</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">fluidBorder</code> — dual-layer spring stroke (
          <code className="type-code">ref.fluid-borders-1</code> geometry,{' '}
          <code className="type-code">ref.fluid-borders-2</code> viscosity). Tune with{' '}
          <code className="type-code">fluidBorderPhysics</code> — per-layer viscosity, mouse force,
          and hover pull.
        </p>
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <Select
            label="fluidBorderAuto"
            options={[...FLUID_BORDER_AUTO_OPTIONS]}
            value={buttonFluidBorderAuto}
            onChange={setButtonFluidBorderAuto}
          />
          <Select
            label="fluidBorderPhysics"
            options={[...FLUID_BORDER_PHYSICS_PRESET_OPTIONS]}
            value={buttonFluidPhysics}
            onChange={(value) => setButtonFluidPhysics(value as FluidBorderPhysicsPreset)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="outline"
            size="md"
            fluidBorder
            fluidBorderAuto={resolvedButtonFluidAuto}
            fluidBorderPhysics={buttonFluidBorderPhysics}
          >
            Outline
          </Button>
          <Button
            variant="inset"
            size="md"
            fluidBorder
            fluidBorderAuto={resolvedButtonFluidAuto}
            fluidBorderPhysics={buttonFluidBorderPhysics}
          >
            Inset
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Border glow</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">borderGlow</code> — palette-linked gradient ring on hover (
          <code className="type-code">--theme-glow-*</code>). Cardless and icon-only default to ink
          glow (masked fill). <code className="type-code">borderGlow=&quot;icon&quot;</code> — SVG
          stroke glow only on cardless <code className="type-code">IconButton</code> (no border ring,
          no icon card halo).
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="inset" size="md" borderGlow>
            Typography
          </Button>
          <Button variant="outline" size="md" borderGlow icon={Settings}>
            Settings
          </Button>
          <Button variant="cardless" size="md" borderGlow>
            Text only
          </Button>
          <Button variant="cardless" size="md" borderGlow icon={Mail}>
            Contact
          </Button>
          <IconButton variant="ghost" size="md" borderGlow icon={Bell} aria-label="Notifications" />
          <IconButton variant="cardless" size="md" borderGlow icon={Settings} aria-label="Settings ink" />
          <IconButton
            variant="cardless"
            size="md"
            borderGlow="icon"
            icon={Settings}
            aria-label="Settings icon glow"
          />
          <IconButton
            variant="cardless"
            size="md"
            borderGlow="icon"
            icon={Bell}
            aria-label="Bell icon glow"
          />
        </div>
        <p className="type-body type-glow w-fit">Hover this label for ink glow</p>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Stack</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">variant=&quot;stack&quot;</code> — icon above label in a compact
          nav tile. Use <code className="type-code">active</code> for the selected tab; pairs with{' '}
          [StackNavMenu](StackNavMenu.tsx).
        </p>
        <ul className="flex flex-wrap items-end gap-3">
          <li className="flex flex-col items-center gap-1">
            <Button variant="stack" size="md" icon={Home} active>
              Home
            </Button>
            <span className="type-caption font-mono type-faint">active</span>
          </li>
          <li className="flex flex-col items-center gap-1">
            <Button variant="stack" size="md" icon={Package}>
              Products
            </Button>
          </li>
          <li className="flex flex-col items-center gap-1">
            <Button variant="stack" size="sm" icon={Mail}>
              Contact
            </Button>
            <span className="type-caption font-mono type-faint">sm</span>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Action + labelAnim</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">variant=&quot;action&quot;</code> with{' '}
          <code className="type-code">labelAnim</code> — any preset from{' '}
          <code className="type-code">TYPE_ANIM_PRESETS</code> / typography animations (default{' '}
          <code className="type-code">flip</code>).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="action" icon={ArrowRight} size="lg" labelAnim="flip">
            Get started
          </Button>
          <Button variant="action" icon={Plus} size="md" labelAnim="slide-left">
            New project
          </Button>
          <Button variant="action" icon={ArrowRight} iconPosition="right" size="md" labelAnim="fade">
            Continue
          </Button>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TYPE_ANIM_PRESETS.map((preset) => (
            <li key={preset}>
              <Button variant="action" size="sm" labelAnim={preset}>
                {preset}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Media (image · video thumb)</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">variant=&quot;media&quot;</code> with{' '}
          <code className="type-code">image=&#123; src, alt, type? &#125;</code> — raster photo (
          <code className="type-code">type=&quot;image&quot;</code>), SVG avatar, or loop clip (
          <code className="type-code">type=&quot;video&quot;</code> + optional <code className="type-code">poster</code>
          ). Shapes: <code className="type-code">round</code> · <code className="type-code">square</code>. Thumb
          animates on <code className="type-code">imageEffect</code> <code className="type-code">hover</code> or{' '}
          <code className="type-code">click</code>.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="media" size="md" image={demoPhoto}>
            Photo thumb
          </Button>
          <Button variant="media" size="md" image={demoLoopVideo}>
            Loop video
          </Button>
          <Button variant="media" size="md" image={demoAvatar}>
            Alex Chen
          </Button>
          <Button variant="media" size="lg" image={demoLogo} imageShape="square">
            Acme Inc
          </Button>
          <Button
            variant="media"
            size="md"
            image={demoLoopVideo}
            imageShape="square"
            imageEffect="click"
          >
            Press clip
          </Button>
          <Button variant="media" size="sm" image={demoPhoto} aria-label="Team member" />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Expandable</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">expandable</code> + <code className="type-code">animatedLabel</code>{' '}
          — chip stays icon-only or media-only when collapsed; label morphs open on hover, focus, or{' '}
          <code className="type-code">expanded</code>. When <code className="type-code">image</code> is
          set, the collapsed chip shows media instead of <code className="type-code">icon</code>.
        </p>
        <ul className="flex flex-wrap items-center gap-3">
          <li>
            <Button expandable animatedLabel="Home" icon={Home} variant="ghost" size="md" />
          </li>
          <li>
            <Button expandable animatedLabel="Alex Chen" image={demoAvatar} variant="ghost" size="md" />
          </li>
          <li>
            <Button
              expandable
              expanded
              animatedLabel="Pinned"
              icon={Settings}
              variant="action"
              size="md"
            />
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">With icons</p>
        <div className="flex flex-wrap gap-3">
          <Button icon={Plus} size="md" variant="accent">
            Add item
          </Button>
          <Button icon={ArrowRight} iconPosition="right" size="lg" variant="default">
            Continue
          </Button>
          <Button icon={Settings} size="md" variant="outline" aria-label="Settings" />
          <Button icon={Trash2} size="sm" variant="inset" aria-label="Delete" />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Icon-only by size</p>
        <ul className="flex flex-wrap items-end gap-3">
          {sizes.map((size) => (
            <li key={size}>
              <Button
                icon={Plus}
                size={size}
                variant="default"
                aria-label={`Add (${size})`}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Mouse tilt</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">mouseTilt</code> on <code className="type-code">Button</code> — same
          <code className="type-code">variant=&quot;action&quot;</code> +{' '}
          <code className="type-code">labelAnim=&quot;flip&quot;</code> with pointer-driven 3D tilt.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {MOUSE_TILT_EFFECTS.map((effect) => (
            <Button
              key={effect}
              variant="action"
              size="md"
              labelAnim="flip"
              icon={effect === 'follow' ? ArrowRight : Plus}
              iconPosition={effect === 'follow' ? 'right' : 'left'}
              mouseTilt={effect}
            >
              {effect}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <p className="type-overline">Button extensions</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">IconButton</code> · <code className="type-code">ButtonGroup</code> ·{' '}
          <code className="type-code">LoadingButton</code> · <code className="type-code">LinkButton</code> ·{' '}
          <code className="type-code">Paginator</code> · <code className="type-code">MenuButton</code> ·{' '}
          <code className="type-code">SplitButton</code> ·{' '}
          <code className="type-code">Chip</code> · <code className="type-code">CopyButton</code> ·{' '}
          <code className="type-code">Fab</code> · <code className="type-code">AnimatedIcon</code>
        </p>
        <p className="type-body-sm type-muted prose-measure">
          Pass <code className="type-code">animatedIcon</code> on <code className="type-code">IconButton</code>{' '}
          for Lucide Motion hover/signature animation (<code className="type-code">lucide-motion</code>
          ) — static Lucide icons remain the default. For SVG stroke-dash toggles see{' '}
          <strong>Buttons → Stroke SVG icons</strong> (<code className="type-code">ref.animated-icon-1</code>
          ).
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <IconButton icon={Mail} aria-label="Send email" variant="outline" />
          <IconButton icon={Settings} aria-label="Settings" variant="ghost" />
          <IconButton animatedIcon="mail" aria-label="Send email (animated)" variant="outline" />
          <IconButton animatedIcon="settings" aria-label="Settings (animated)" variant="ghost" />
          <IconButton animatedIcon="heart" aria-label="Favorite (animated)" variant="accent" />
          <CopyButton text="npm run dev" variant="ghost" />
          <LinkButton href="#buttons" variant="accent" icon={Download}>
            Download
          </LinkButton>
          <LoadingButton
            variant="action"
            loading={saving}
            loadingLabel="Saving…"
            onClick={() => {
              setSaving(true)
              window.setTimeout(() => setSaving(false), 1600)
            }}
          >
            Save draft
          </LoadingButton>
        </div>

        <div className="space-y-4">
          <p className="type-caption type-faint font-mono">Theme selectors</p>
          <p className="type-body-sm type-muted prose-measure">
            <code className="type-code">ThemeModeToggle</code> shows the target mode — Moon on brand
            (switch to dark), Sun on dark (switch to light) — morph on click · SVG glow on Sun (dark mode only).{' '}
            <code className="type-code">ThemePalettePicker</code> — labeled brand/dark buttons.
          </p>
          <div className="flex flex-wrap items-start gap-10">
            <div className="space-y-3">
              <p className="type-caption type-muted">Morph toggle</p>
              <div className="flex flex-wrap items-center gap-3">
                <ThemeModeToggle size="sm" />
                <ThemeModeToggle size="md" />
                <ThemeModeToggle size="lg" />
              </div>
            </div>
            <div className="space-y-3">
              <p className="type-caption type-muted">Palette picker</p>
              <ThemePalettePicker />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="type-caption type-faint font-mono">Pagination</p>
          <p className="type-body-sm type-muted prose-measure">
            Prev, page numbers, and next live in separate slots inside an invisible{' '}
            <code className="type-code">theme-paginator__shell</code> — each page cell is its
            own outline button with even gaps (no joined mid-cluster).
          </p>
          <ul className="space-y-6">
            {PAGINATOR_VARIANTS.map((variant) => (
              <li key={variant} className="space-y-2">
                <span className="type-caption font-mono type-faint">{variant}</span>
                <Paginator
                  variant={variant}
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  showTotal={variant === 'arrows'}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <p className="type-caption type-faint font-mono">Dropdown selectors</p>
          <p className="type-body-sm type-muted prose-measure">
            <code className="type-code">MenuButton</code> dropdown selector —{' '}
            <code className="type-code">menuSize</code> scales the trigger and list rows together (
            <code className="type-code">sm</code> · <code className="type-code">md</code> ·{' '}
            <code className="type-code">lg</code> button sizes). Override the trigger alone with{' '}
            Long lists scroll inside the panel — pass{' '}
            <code className="type-code">scrollRail</code> (<code className="type-code">curved</code> ·{' '}
            <code className="type-code">straight</code> · <code className="type-code">hidden</code>) and{' '}
            <code className="type-code">scrollClouds</code> (default <code className="type-code">true</code>) for
            edge fades when the list overflows.
            Cap height via <code className="type-code">--theme-menu-visible-rows</code> ×{' '}
            <code className="type-code">--theme-menu-row-height</code> per size in{' '}
            <code className="type-code">button-extras.css</code>.
          </p>
          <ul className="flex flex-wrap items-end gap-4">
            {MENU_SIZES.map((menuSize) => (
              <li key={menuSize} className="flex flex-col items-start gap-1.5">
                <MenuButton
                  label="Actions"
                  menuSize={menuSize}
                  selectedId={menuAction}
                  onSelect={setMenuAction}
                  items={[
                    { id: 'edit', label: 'Edit' },
                    { id: 'duplicate', label: 'Duplicate' },
                    { id: 'archive', label: 'Archive' },
                  ]}
                />
                <span className="type-caption font-mono type-faint">{menuSize}</span>
              </li>
            ))}
            <li className="flex flex-col items-start gap-1.5">
              <MenuButton
                label="Scroll list"
                menuSize="md"
                selectedId={menuAction}
                onSelect={setMenuAction}
                items={[...SCROLL_MENU_ITEMS]}
              />
              <span className="type-caption font-mono type-faint">curved · md</span>
            </li>
            {(['straight', 'hidden'] as const).map((rail) => (
              <li key={rail} className="flex flex-col items-start gap-1.5">
                <MenuButton
                  label={`Scroll ${rail}`}
                  menuSize="md"
                  scrollRail={rail}
                  selectedId={menuAction}
                  onSelect={setMenuAction}
                  items={[...SCROLL_MENU_ITEMS]}
                />
                <span className="type-caption font-mono type-faint">scrollRail=&quot;{rail}&quot;</span>
              </li>
            ))}
            <li className="flex flex-col items-start gap-1.5">
              <MenuButton
                label="No clouds"
                menuSize="md"
                scrollClouds={false}
                selectedId={menuAction}
                onSelect={setMenuAction}
                items={[...SCROLL_MENU_ITEMS]}
              />
              <span className="type-caption font-mono type-faint">scrollClouds=&#123;false&#125;</span>
            </li>
          </ul>
          <p className="type-caption type-faint font-mono pt-2">Icon dropdown (tiny chevron)</p>
          <p className="type-body-sm type-muted prose-measure">
            <code className="type-code">iconDropdown</code> — icon + Counter-style mini chevron; slightly
            wider than square <code className="type-code">iconOnly</code>. Use for compact toolbar menus
            (stroke width, fill style, etc.).
          </p>
          <ul className="flex flex-wrap items-end gap-4">
            <li className="flex flex-col items-start gap-1.5">
              <MenuButton
                label="Stroke width"
                icon={Minus}
                iconDropdown
                size="xs"
                variant="tray"
                menuSize="compact"
                selectedId={menuAction}
                onSelect={setMenuAction}
                items={[
                  { id: 'edit', label: 'Thin' },
                  { id: 'duplicate', label: 'Bold' },
                  { id: 'archive', label: 'Extra' },
                ]}
              />
              <span className="type-caption font-mono type-faint">tray · xs</span>
            </li>
            <li className="flex flex-col items-start gap-1.5">
              <MenuButton
                label="Fill style"
                icon={Square}
                iconDropdown
                size="sm"
                variant="outline"
                menuSize="sm"
                selectedId={menuAction}
                onSelect={setMenuAction}
                items={[
                  { id: 'edit', label: 'Hachure' },
                  { id: 'duplicate', label: 'Solid' },
                  { id: 'archive', label: 'Cross' },
                ]}
              />
              <span className="type-caption font-mono type-faint">outline · sm</span>
            </li>
            <li className="flex flex-col items-start gap-1.5">
              <MenuButton
                label="Actions"
                icon={Settings}
                iconDropdown
                size="md"
                variant="default"
                menuSize="md"
                selectedId={menuAction}
                onSelect={setMenuAction}
                items={[
                  { id: 'edit', label: 'Edit' },
                  { id: 'duplicate', label: 'Duplicate' },
                  { id: 'archive', label: 'Archive' },
                ]}
              />
              <span className="type-caption font-mono type-faint">default · md</span>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="type-caption type-faint font-mono">Chips</p>
          <div className="theme-chip-group">
            {['react', 'css', 'theme'].map((tag) => (
              <Chip
                key={tag}
                selected={chips.includes(tag)}
                onClick={() =>
                  setChips((current) =>
                    current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
                  )
                }
                onDismiss={chips.includes(tag) ? () => setChips((c) => c.filter((t) => t !== tag)) : undefined}
              >
                {tag}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="type-caption type-faint font-mono">Fab (inline preview)</p>
          <Fab icon={Plus} aria-label="Create new" className="theme-fab--inline" />
        </div>
      </section>

      <section className="space-y-6">
        <p className="type-overline">Radio · checkbox · toggle · switch</p>
        <p className="type-body-sm type-muted prose-measure">
          Round <code className="type-code">RadioGroup</code> (fill dot), tiered Free/Premium pill,
          animated <code className="type-code">CheckboxGroup</code> (fill + check), segmented
          toolbar radios, <code className="type-code">ToggleGroup</code>, and{' '}
          <code className="type-code">Switch</code> with track fill + sliding thumb. Vurify-tiered
          radios live under{' '}
          <Link className="underline" to="/theme?section=buttons-vurify">
            Buttons → Vurify
          </Link>
          .
        </p>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Radio buttons — classic · md</p>
          <RadioGroup
            aria-label="Shipping method"
            options={planOptions}
            value={plan}
            onChange={setPlan}
            size="md"
          />
          <p className="type-caption type-muted">
            Selected: <span className="font-mono">{plan}</span>
          </p>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">CheckboxGroup classic — md</p>
          <CheckboxGroup
            aria-label="Order add-ons"
            options={addonOptions}
            value={addons}
            onChange={setAddons}
            size="md"
          />
          <p className="type-caption type-muted">
            Checked:{' '}
            <span className="font-mono">{addons.length ? addons.join(', ') : 'none'}</span>
          </p>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">CheckboxGroup button — md</p>
          <CheckboxGroup
            aria-label="Feature toggles"
            variant="button"
            options={filterOptions}
            value={checkboxButtons}
            onChange={setCheckboxButtons}
            size="md"
          />
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">RadioGroup segmented — alignment</p>
          <RadioGroup
            aria-label="Text alignment"
            variant="segmented"
            options={alignOptions}
            value={align}
            onChange={setAlign}
            size="md"
          />
          <p className="type-caption type-muted">
            Selected: <span className="font-mono">{align}</span>
          </p>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">RadioGroup tiered — Free · Premium Solo/Team</p>
          <RadioGroup
            aria-label="Pricing tier"
            variant="tiered"
            tierLabel="Premium"
            options={[
              { value: 'free', label: 'Free' },
              { value: 'solo', label: 'Solo' },
              { value: 'team', label: 'Team' },
            ]}
            value={tier}
            onChange={setTier}
            size="md"
          />
          <p className="type-caption type-muted">
            Selected: <span className="font-mono">{tier}</span>
          </p>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">ToggleGroup single — lg</p>
          <ToggleGroup
            aria-label="Text style"
            mode="single"
            options={styleOptions}
            value={view}
            onChange={(v) => setView(typeof v === 'string' ? v : v[0] ?? 'bold')}
            size="lg"
          />
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">ToggleGroup multiple — md</p>
          <ToggleGroup
            aria-label="Filters"
            mode="multiple"
            options={filterOptions}
            value={filters}
            onChange={(v) => setFilters(Array.isArray(v) ? v : [v])}
            size="md"
          />
          <p className="type-caption type-muted">
            Active:{' '}
            <span className="font-mono">{filters.length ? filters.join(', ') : 'none'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-8">
          <div className="space-y-2">
            <p className="type-caption type-faint font-mono">Switch — md</p>
            <Switch
              label="Dark mode"
              checked={darkMode}
              onChange={setDarkMode}
              size="md"
            />
          </div>
          <div className="space-y-2">
            <p className="type-caption type-faint font-mono">Switch — sm · label left</p>
            <Switch
              label="Notifications"
              labelPosition="left"
              checked={notifications}
              onChange={setNotifications}
              size="sm"
            />
          </div>
          <div className="space-y-2">
            <p className="type-caption type-faint font-mono">Switch — lg</p>
            <Switch label="Live preview" defaultChecked size="lg" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Size scale — radio sm / toggle sm</p>
          <div className="flex flex-wrap items-center gap-4">
            <RadioGroup
              aria-label="Theme"
              size="sm"
              className="theme-choice--horizontal"
              options={[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
              ]}
              defaultValue="light"
            />
            <ToggleGroup
              aria-label="Quick filters"
              mode="multiple"
              size="sm"
              options={[
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
                { value: 'c', label: 'C' },
              ]}
              defaultValue={['a']}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">States</p>
        <div className="flex flex-wrap gap-3">
          <Button size="md" variant="default" active>
            Active
          </Button>
          <Button size="md" variant="default" disabled>
            Disabled
          </Button>
          <Button
            size="md"
            variant="outline"
            icon={Settings}
            aria-pressed={true}
            active
            aria-label="Toggle on"
          />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Variant × size matrix</p>
        <div className="overflow-x-auto">
          <table className="theme-token-table w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="type-caption py-2 pr-4">Variant</th>
                {sizes.map((size) => (
                  <th key={size} className="type-caption py-2 pr-2 font-mono">
                    {size}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map(({ variant }) => (
                <tr key={variant} className="theme-shell-divider border-b">
                  <td className="type-caption py-3 pr-4 font-mono">{variant}</td>
                  {sizes.map((size) => (
                    <td key={size} className="py-3 pr-2">
                      <Button size={size} variant={variant}>
                        Btn
                      </Button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
