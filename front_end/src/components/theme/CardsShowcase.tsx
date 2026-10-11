import {
  Clapperboard,
  Filter,
  Gem,
  Globe,
  LayoutGrid,
  Puzzle,
  ScrollText,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import {
  FLUID_BORDER_DEFAULT_AUTO_SECONDS,
  FLUID_BORDER_PHYSICS_PRESET_OPTIONS,
  FLUID_BORDER_PHYSICS_PRESETS,
  type FluidBorderPhysicsPreset,
} from '../../lib/animations/fluidBorder'
import { MOUSE_TILT_EFFECTS } from '../../lib/animations/tiltEffects'
import {
  TYPE_TRACE_PRESET_OPTIONS,
  type TypeTracePreset,
  type TypeTraceTrigger,
} from '../../lib/animations/typeTracePresets'
import {
  SURFACE_SHADOW_VARIANT_OPTIONS,
  type SurfaceShadowVariant,
} from '../../lib/theme/shadowVariants'
import { Accordion, type AccordionItemData } from '../Accordion'
import { Card, type CardCornerGeometry, type CardShape, type CardVariant } from '../Card'
import { Select } from '../Select'

const accordionItems: AccordionItemData[] = [
  {
    id: 'design-engineering',
    title: 'What is design engineering?',
    icon: Wrench,
    content:
      'Where design intuition meets code execution — enabling you to see UI problems and build solutions from the ground up.',
  },
  {
    id: 'craft-ui',
    title: 'What is the craft of UI?',
    icon: Puzzle,
    content:
      'A course about building things well — mastering the web platform so you are not limited by tools or libraries.',
  },
  {
    id: 'web-platform',
    title: 'Why focus on the web platform?',
    icon: Globe,
    content:
      'Because when you work with the web — not fight it — you unlock performance, accessibility, and durability that last.',
  },
  {
    id: 'craft-matters',
    title: 'Why does craft matter?',
    icon: Sparkles,
    content:
      'Because it is more than making something work — it is making something feel right: inclusive, resilient, and scalable.',
  },
  {
    id: 'audience',
    title: 'Who is this for?',
    icon: Users,
    content:
      'Designers who code, developers who design — anyone ready to stop chasing snippets and become the person who can build anything.',
  },
]

const panelAccordionItems: AccordionItemData[] = [
  {
    id: 'craft',
    title: 'The Craft',
    icon: Gem,
    content:
      'Gain the confidence to build anything you envision, transforming motion, interaction, and design principles into second nature.',
    image: { src: 'https://picsum.photos/720/720?random=12', alt: '' },
    link: { href: '#', label: 'Watch now' },
  },
  {
    id: 'css-animation',
    title: 'CSS Animation',
    icon: Clapperboard,
    content:
      'Master CSS animations from your very first set of @keyframes right through to things no one else ever teaches you.',
    image: { src: 'https://picsum.photos/720/720?random=17', alt: '' },
    link: { href: '#', label: 'Watch now' },
  },
  {
    id: 'svg-filters',
    title: 'SVG Filters',
    icon: Filter,
    content:
      'Shaders on a budget. Learn how to use noise to your advantage whilst making flames and stickers.',
    image: { src: 'https://picsum.photos/720/720?random=19', alt: '' },
    link: { href: '#', label: 'Watch now' },
  },
  {
    id: 'scroll-animation',
    title: 'Scroll Animation',
    icon: ScrollText,
    content:
      'Take your users on a journey with the joy of tasteful scroll animation. You might not even need JavaScript.',
    image: { src: 'https://picsum.photos/720/720?random=42', alt: '' },
    link: { href: '#', label: 'Watch now' },
  },
  {
    id: 'layout-tricks',
    title: 'Layout Tricks',
    icon: LayoutGrid,
    content:
      'Do you really need a library for that? Sometimes stepping back and rethinking the problem yields a nifty solution.',
    image: { src: 'https://picsum.photos/720/720?random=56', alt: '' },
    link: { href: '#', label: 'Watch now' },
  },
]

const cardShapes: { shape: CardShape; title: string; description: string }[] = [
  {
    shape: 'circle',
    title: 'Circle',
    description: 'Centered copy in a round panel — avatars, badges, highlights.',
  },
  {
    shape: 'hexagon',
    title: 'Hexagon',
    description: 'Embossed hex rim + inset face — border-shape when the browser supports it.',
  },
  {
    shape: 'pill',
    title: 'Pill',
    description: 'Capsule outline for short labels, tags, or compact CTAs.',
  },
]

const cardCornerGeometries: {
  cornerGeometry: CardCornerGeometry
  title: string
  description: string
}[] = [
  {
    cornerGeometry: 'square',
    title: 'Square',
    description: 'Default neobrutal corner — subtle 2px radius on all four corners.',
  },
  {
    cornerGeometry: 'sharp',
    title: 'Sharp',
    description: 'Zero radius — hard editorial panels and strict grid layouts.',
  },
  {
    cornerGeometry: 'round',
    title: 'Round',
    description: 'Even 0.5rem radius — softer containers without going full pill.',
  },
  {
    cornerGeometry: 'soft',
    title: 'Soft',
    description: '0.75rem radius + `corner-shape: squircle` when supported — smooth Apple-style corners.',
  },
  {
    cornerGeometry: 'asymmetric',
    title: 'Asymmetric',
    description: 'Alternating tight and open corners — diagonal rhythm.',
  },
  {
    cornerGeometry: 'tab',
    title: 'Tab',
    description: 'Rounded top, square bottom — folder or section header feel.',
  },
  {
    cornerGeometry: 'chamfer',
    title: 'Chamfer',
    description: 'CSS `corner-shape: bevel` + radius — diagonal corners; shadows follow the shape.',
  },
  {
    cornerGeometry: 'notch',
    title: 'Notch',
    description: 'CSS `corner-shape: notch` on top-left — concave 90° cut; brutal shadow stays native.',
  },
]

const cardVariants: { variant: CardVariant; title: string; description: string }[] = [
  {
    variant: 'raised',
    title: 'Raised',
    description: 'Lifts off the surface with a soft outer shadow — default elevated panel.',
  },
  {
    variant: 'inset',
    title: 'Inset',
    description: 'Pressed into the background with an inner shadow — wells and selected states.',
  },
  {
    variant: 'flat',
    title: 'Flat',
    description: 'Neutral fill and hairline border — no emphasis shadow.',
  },
  {
    variant: 'outline',
    title: 'Outline',
    description: 'Transparent fill with a stronger border — lightweight containers.',
  },
  {
    variant: 'ghost',
    title: 'Ghost',
    description: 'Minimal border and fill — subtle grouping without heavy chrome.',
  },
  {
    variant: 'vurify',
    title: 'Vurify',
    description:
      'Default — outlined two-card stack (thick outer always on + thin inner) with soft float shadow; hover lifts, press settles.',
  },
  {
    variant: 'vurify-outlined',
    title: 'Vurify outlined',
    description:
      'Same two-card stack with always-on outer border, but no default shadow — border-only chrome.',
  },
  {
    variant: 'vurify-inset',
    title: 'Vurify inset',
    description:
      'Window into chrome bg (dashboard menu fill) — soft inset shadow, no thick borders; radius matches the dashboard peel.',
  },
]

const FLUID_BORDER_AUTO_OPTIONS = [
  { value: String(FLUID_BORDER_DEFAULT_AUTO_SECONDS), label: `${FLUID_BORDER_DEFAULT_AUTO_SECONDS}s idle orbit` },
  { value: '4', label: '4s idle orbit' },
  { value: 'off', label: 'Hover only' },
] as const

export function CardsShowcase() {
  const [cardShadowVariant, setCardShadowVariant] = useState<SurfaceShadowVariant>('vurify')
  const [cardFluidBorderAuto, setCardFluidBorderAuto] = useState(
    String(FLUID_BORDER_DEFAULT_AUTO_SECONDS),
  )
  const [cardFluidPhysics, setCardFluidPhysics] = useState<FluidBorderPhysicsPreset>('default')
  const resolvedCardFluidAuto =
    cardFluidBorderAuto === 'off' ? false : Number(cardFluidBorderAuto)
  const cardFluidBorderPhysics = FLUID_BORDER_PHYSICS_PRESETS[cardFluidPhysics]
  const [cardTitleTrace, setCardTitleTrace] = useState<TypeTracePreset>('trace-in')
  const [cardTitleTraceTrigger, setCardTitleTraceTrigger] = useState<TypeTraceTrigger>('enter')

  return (
    <div className="space-y-10">
      <p className="type-body-sm type-muted prose-measure">
        Default <code className="type-code">Card</code> is{' '}
        <code className="type-code">variant=&quot;vurify&quot;</code> — outlined two nested cards
        (thick outer always on + thin inner inset <code className="type-code">4px</code>) with a soft
        float shadow. Hover lifts; press settles like other cards. Use{' '}
        <code className="type-code">vurify-outlined</code> for the same housing without a default
        shadow, or <code className="type-code">vurify-inset</code> for a borderless window into the
        chrome / menu background.
      </p>

      <section className="space-y-4">
        <p className="type-overline">Shadow variants</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">shadowVariant</code> prop overrides box-shadow on any{' '}
          <code className="type-code">Card</code> — presets from{' '}
          <code className="type-code">ref.shadows-1</code> plus <code className="type-code">vurify</code>.
          Each preset includes matched hover lift and active press motion.
        </p>
        <div className="max-w-xs">
          <Select
            portal
            label="shadowVariant"
            options={[...SURFACE_SHADOW_VARIANT_OPTIONS]}
            value={cardShadowVariant}
            onChange={(value) => setCardShadowVariant(value as SurfaceShadowVariant)}
          />
        </div>
        <div className="max-w-md">
          <Card
            variant="vurify"
            shadowVariant={cardShadowVariant}
            title="Shadow preview"
          >
            Hover to lift · click to press — shadow preset drives the motion stack on top of{' '}
            <code className="type-code">variant=&quot;vurify&quot;</code>.
          </Card>
        </div>
      </section>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cardVariants.map(({ variant, title, description }) => (
          <li key={variant}>
            <Card variant={variant} title={title}>
              {description}
            </Card>
            <p className="type-caption mt-2 font-mono type-faint">variant=&quot;{variant}&quot;</p>
          </li>
        ))}
      </ul>

      <section className="space-y-4">
        <p className="type-overline">Shapes</p>
        <p className="type-body-sm type-muted prose-measure">
          Optional <code className="type-code">shape</code> prop —{' '}
          <code className="type-code">rect</code> (default), <code className="type-code">circle</code>
          , <code className="type-code">hexagon</code>, <code className="type-code">pill</code>.
          Pair with any <code className="type-code">variant</code>; hover and focus match rect cards.
        </p>
        <ul className="grid gap-8 sm:grid-cols-3">
          {cardShapes.map(({ shape, title, description }) => (
            <li key={shape} className="flex flex-col items-center">
              <Card variant="raised" shape={shape} title={title}>
                {description}
              </Card>
              <p className="type-caption mt-3 font-mono type-faint">shape=&quot;{shape}&quot;</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Corner geometry</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">cornerGeometry</code> on <code className="type-code">shape=&quot;rect&quot;</code>{' '}
          cards — per-corner <code className="type-code">border-radius</code> +{' '}
          <code className="type-code">corner-shape</code> (CSS Borders 4). Shadows and borders follow
          the corner natively — no clip masks.
        </p>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cardCornerGeometries.map(({ cornerGeometry, title, description }) => (
            <li key={cornerGeometry}>
              <Card variant="raised" cornerGeometry={cornerGeometry} title={title}>
                {description}
              </Card>
              <p className="type-caption mt-2 font-mono type-faint">
                cornerGeometry=&quot;{cornerGeometry}&quot;
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Title trace</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">titleTrace</code> on <code className="type-code">Card</code> —{' '}
          <code className="type-code">trace-in</code> / <code className="type-code">trace-out</code> via{' '}
          <code className="type-code">TraceAnimText</code> (<code className="type-code">ref.text-trace-1</code>
          ). <code className="type-code">titleTraceTrigger=&quot;hover&quot;</code> plays on card hover.
        </p>
        <div className="grid max-w-xs gap-4">
          <Select
            portal
            label="titleTrace"
            options={[...TYPE_TRACE_PRESET_OPTIONS]}
            value={cardTitleTrace}
            onChange={(value) => setCardTitleTrace(value as TypeTracePreset)}
          />
          <Select
            portal
            label="titleTraceTrigger"
            options={[
              { value: 'enter', label: 'enter — on mount' },
              { value: 'hover', label: 'hover — on card hover' },
            ]}
            value={cardTitleTraceTrigger}
            onChange={(value) => setCardTitleTraceTrigger(value as TypeTraceTrigger)}
          />
        </div>
        <Card
          key={`${cardTitleTrace}-${cardTitleTraceTrigger}`}
          variant="raised"
          title="Traced headline"
          titleTrace={cardTitleTrace}
          titleTraceTrigger={cardTitleTraceTrigger}
          className="max-w-sm"
        >
          Body copy stays static — only the title uses SVG stroke trace. Remount the preview when
          changing trigger to replay enter animations.
        </Card>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Fluid border</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">fluidBorder</code> — dual-layer spring stroke (
          <code className="type-code">ref.fluid-borders-1</code> +{' '}
          <code className="type-code">ref.fluid-borders-2</code>).{' '}
          <code className="type-code">fluidBorderPhysics</code> sets per-layer viscosity, mouse
          force, and hover pull; <code className="type-code">fluidBorderAuto</code> is idle orbit
          seconds or <code className="type-code">false</code> for hover-only.
        </p>
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <Select
            portal
            label="fluidBorderAuto"
            options={[...FLUID_BORDER_AUTO_OPTIONS]}
            value={cardFluidBorderAuto}
            onChange={setCardFluidBorderAuto}
          />
          <Select
            portal
            label="fluidBorderPhysics"
            options={[...FLUID_BORDER_PHYSICS_PRESET_OPTIONS]}
            value={cardFluidPhysics}
            onChange={(value) => setCardFluidPhysics(value as FluidBorderPhysicsPreset)}
          />
        </div>
        <Card
          variant="raised"
          fluidBorder
          fluidBorderAuto={resolvedCardFluidAuto}
          fluidBorderPhysics={cardFluidBorderPhysics}
          title="Fluid border"
          className="max-w-sm"
        >
          Move the pointer near the edge — or wait for the idle orbit when auto is on.
        </Card>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Border glow</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">borderGlow</code> — animated gradient ring from palette{' '}
          <code className="type-code">glowBorder*</code> tokens; calm static ring at rest.
        </p>
        <Card variant="raised" borderGlow title="Summary" className="max-w-sm">
          Hover for accent gradient border and soft outer glow — same tokens as [Button](Button.tsx){' '}
          <code className="type-code">borderGlow</code>.
        </Card>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Background parallax</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">mouseBgParallax</code> on a <code className="type-code">Card</code>{' '}
          with an <code className="type-code">image</code> — cover scales up slightly and shifts opposite
          the pointer on hover (Windows-style depth). Same engine on accordion panels via{' '}
          <code className="type-code">panelBgParallax</code>.
        </p>
        <ul className="grid gap-5 sm:grid-cols-2">
          <li className="min-w-0">
            <Card
              variant="raised"
              image={{ src: 'https://picsum.photos/960/640?random=88', alt: '' }}
              mouseBgParallax
              title="Spotlight"
            >
              Move the cursor — the photo drifts the other way while copy stays fixed.
            </Card>
            <p className="type-caption mt-2 font-mono type-faint">mouseBgParallax + image</p>
          </li>
          <li className="min-w-0">
            <Card
              variant="outline"
              image={{ src: 'https://picsum.photos/960/640?random=91', alt: '' }}
              title="Static cover"
            >
              Same cover image without parallax — for comparison.
            </Card>
            <p className="type-caption mt-2 font-mono type-faint">image only</p>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Scroll rails</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">scroll</code> or legacy <code className="type-code">roundedScroll</code>{' '}
          — set <code className="type-code">scrollRail</code> /{' '}
          <code className="type-code">data-scroll-rail</code> to <code className="type-code">curved</code>{' '}
          (SVG accent), <code className="type-code">straight</code> (native thin bar),{' '}
          <code className="type-code">mini</code> (tiny straight bar for compact cards),{' '}
          <code className="type-code">nano</code> (overlay mobile bar — zero gutter, thumb on hover), or{' '}
          <code className="type-code">hidden</code> (rail-less). Curved vertical cards use shared{' '}
          <code className="type-code">cardScrollConfig</code> (full-height path, inline-end rail inset) — override
          with <code className="type-code">scrollConfig</code> when needed. Use{' '}
          <code className="type-code">scrollClouds</code> (default <code className="type-code">true</code> on cards)
          for the soft edge fade when more content sits above or below. Hover or focus the card to scroll inside it.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {(['curved', 'straight', 'mini', 'nano', 'hidden'] as const).map((rail) => (
            <div key={rail} className="max-w-sm min-w-0">
              <Card variant="raised" scroll scrollRail={rail} title={`${rail} rail`}>
                <p>
                  Raised variant with <span className="font-mono">{rail}</span> scroll — same card chrome;
                  only the scroll affordance changes.
                </p>
                <p>
                  Five base surfaces use neobrutal offset shadows. This panel keeps that look while
                  content overflows vertically.
                </p>
                <p>
                  Pair with inset for contrast — e.g. toolbar raised, content area inset. Useful for nested
                  fields, filters, or recessed content blocks.
                </p>
                <p>
                  Morphing disclosure stacks and typography motion live elsewhere in this showcase.
                </p>
                <p className="type-muted">Scroll to the end to compare rail behavior.</p>
              </Card>
              <p className="type-caption mt-2 font-mono type-faint">scrollRail=&quot;{rail}&quot;</p>
            </div>
          ))}
        </div>
        <div className="max-w-sm">
          <Card variant="vurify" scroll title="Vurify · hidden scroll">
            <p>
              Vurify outlined two-card nest — thick outer always on + thin inner (4px pad), soft
              float by default. Scroll rail defaults to{' '}
              <span className="font-mono">hidden</span> unless you pass{' '}
              <span className="font-mono">scrollRail</span> explicitly.
            </p>
            <p>
              Use this when product surfaces should match Vurify button / field chrome without
              changing every raised card on Theme.
            </p>
            <p className="type-muted">Overflow stays rail-less by default.</p>
          </Card>
          <p className="type-caption mt-2 font-mono type-faint">
            variant=&quot;vurify&quot; · scroll (default hidden)
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="max-w-sm">
            <Card variant="inset" scroll scrollRail="hidden" title="Edge clouds on">
              <p>
                Default <code className="type-code">scrollClouds</code> — gradient hints at the top and bottom
                when content overflows.
              </p>
              <p>Works with any rail type, including hidden (no scrollbar thumb).</p>
              <p>Scroll down — the bottom cloud fades in; at the end the top cloud returns.</p>
              <p className="type-muted">Host sets <code className="type-code">data-scroll-clouds=&quot;true&quot;</code>.</p>
            </Card>
            <p className="type-caption mt-2 font-mono type-faint">scrollClouds (default)</p>
          </div>
          <div className="max-w-sm">
            <Card variant="flat" scroll scrollRail="straight" scrollClouds={false} title="Edge clouds off">
              <p>
                <code className="type-code">scrollClouds=&#123;false&#125;</code> — plain scrollport with no edge
                fade overlays.
              </p>
              <p>Same straight native rail; only the cloud overlays are omitted.</p>
              <p>Use when the panel background should stay crisp at the edges.</p>
              <p className="type-muted">Or pass <code className="type-code">scroll=&#123; clouds: false &#125;</code>.</p>
            </Card>
            <p className="type-caption mt-2 font-mono type-faint">scrollClouds=&#123;false&#125;</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="max-w-sm">
            <Card variant="raised" roundedScroll title="Curved (legacy prop)">
              <p>
                <code className="type-code">roundedScroll</code> still maps to curved vertical scroll for
                backward compatibility.
              </p>
              <p>Same curved accent thumb as before — use `scroll` + `scrollRail` for new work.</p>
              <p>Extra paragraphs to force overflow inside the card body.</p>
              <p className="type-muted">Accent thumb travels the curved rail on the right.</p>
            </Card>
            <p className="type-caption mt-2 font-mono type-faint">roundedScroll (vertical)</p>
          </div>
          <div className="min-w-0">
            <Card variant="outline" scroll={{ axis: 'horizontal', rail: 'straight' }}>
              <div className="theme-card__scroll-panel shrink-0">
                <p className="type-label">Panel A</p>
                <p className="type-body-sm type-muted">Straight bottom scrollbar.</p>
              </div>
              <div className="theme-card__scroll-panel shrink-0">
                <p className="type-label">Panel B</p>
                <p className="type-body-sm type-muted">Wide content scrolls on the x-axis.</p>
              </div>
              <div className="theme-card__scroll-panel shrink-0">
                <p className="type-label">Panel C</p>
                <p className="type-body-sm type-muted">Wheel maps to horizontal when focused.</p>
              </div>
              <div className="theme-card__scroll-panel shrink-0">
                <p className="type-label">Panel D</p>
                <p className="type-body-sm type-muted">Native thin rail — no SVG curve.</p>
              </div>
              <div className="theme-card__scroll-panel shrink-0">
                <p className="type-label">Panel E</p>
                <p className="type-body-sm type-muted">scroll=&#123; axis: &apos;horizontal&apos;, rail: &apos;straight&apos; &#125;</p>
              </div>
            </Card>
            <p className="type-caption mt-2 font-mono type-faint">horizontal · straight</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Mouse tilt</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">mouseTilt=&#123;true&#125;</code> on any <code className="type-code">Card</code> —
          at rest: normal neobrutal card · on hover: soft tilt shadow, 3D follow/away, text pop
          automatically. Use <code className="type-code">&quot;away&quot;</code> to invert.
        </p>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <li className="min-w-0">
            <Card variant="raised" mouseTilt title="Raised">
              Default tilt — move the cursor over the card.
            </Card>
            <p className="type-caption mt-2 font-mono type-faint">mouseTilt</p>
          </li>
          {MOUSE_TILT_EFFECTS.map((effect) => (
            <li key={effect} className="min-w-0">
              <Card variant={effect === 'away' ? 'outline' : 'flat'} mouseTilt={effect} title={effect}>
                {effect === 'follow' ? 'Tilts toward pointer' : 'Tilts away from pointer'}
              </Card>
              <p className="type-caption mt-2 font-mono type-faint">
                mouseTilt=&quot;{effect}&quot;
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Accordion cards</p>
        <p className="type-body-sm type-muted prose-measure">
          Morphing disclosure stack — <code className="type-code">Button</code> triggers, neobrutal
          borders, rounded morph on open, body enter animation. Exclusive mode (one open at a time).
        </p>
        <Accordion items={accordionItems} triggerVariant="ghost" />
        <div className="space-y-2 pt-2">
          <p className="type-caption type-faint font-mono">variant=&quot;panels&quot;</p>
          <p className="type-body-sm type-muted prose-measure">
            Expanding columns — rotated titles on collapsed edges, image + copy reveal on active.
            Hover or click to expand; always one panel open.
          </p>
          <Accordion
            items={panelAccordionItems}
            variant="panels"
            defaultOpenId="craft"
            panelBgParallax
          />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Side by side</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="raised" title="Raised panel">
            Pair with inset for contrast — e.g. toolbar raised, content area inset.
          </Card>
          <Card variant="inset" title="Inset panel">
            Useful for nested fields, filters, or recessed content blocks.
          </Card>
        </div>
      </section>
    </div>
  )
}
