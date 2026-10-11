import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import type { TypeAnimPreset, TypeAnimTrigger } from '../../lib/animations/typeAnimPresets'
import {
  TYPE_MARQUEE_DIRECTION_OPTIONS,
  TYPE_MARQUEE_EDGE_FADE_OPTIONS,
  TYPE_MARQUEE_SPEED_OPTIONS,
  TYPE_MARQUEE_VARIANT_OPTIONS,
  type TypeMarqueeDirection,
  type TypeMarqueeVariant,
} from '../../lib/animations/typeMarquee'
import { TypeAnimText } from '../TypeAnimText'
import { TraceAnimText } from '../TraceAnimText'
import { TypeMarquee } from '../TypeMarquee'
import { ThemeFontPicker } from '../ThemeFontPicker'
import { Select } from '../Select'
import { useThemeFont } from '../../lib/theme'
import {
  TEXT_SHADOW_VARIANT_OPTIONS,
  textShadowClass,
  type TextShadowVariant,
} from '../../lib/theme/shadowVariants'

const displayScale = [
  {
    className: 'type-display-xl',
    label: 'Cosmic · font-larger · 27vw · 600',
    sample: 'Proof over polish.',
  },
  {
    className: 'type-display-lg',
    label: 'Cosmic · font-medium · 6vw · 600',
    sample: 'Your work gets seen first.',
  },
  {
    className: 'type-display-md',
    label: 'Cosmic · content__title · 4vw · 600',
    sample: 'One task. One conversation.',
  },
  {
    className: 'type-display-sm',
    label: 'Cosmic · font-sub · 5vw · 600',
    sample: 'Verified hiring',
  },
] as const

const brandLandingScale: readonly {
  className: string
  label: string
  sample: ReactNode
  caption?: string
}[] = [
  { className: 'type-hero-name', label: 'Hero name', sample: 'Vurify' },
  {
    className: 'type-role-bridge',
    label: 'Role bridge',
    sample: (
      <>
        Résumé theatre →{' '}
        <span className="type-role-bridge__target">demonstrated judgment</span>
      </>
    ),
  },
  { className: 'type-credential', label: 'Credential', sample: 'One task · one conversation · one decision' },
  {
    className: 'type-stat',
    label: 'Stat',
    sample: '27',
    caption: 'Minutes, not six weeks',
  },
]

const headingScale = [
  { className: 'type-h1', tag: 'h1' as const, sample: 'Heading 1 — Page title' },
  { className: 'type-h2', tag: 'h2' as const, sample: 'Heading 2 — Section title' },
  { className: 'type-h3', tag: 'h3' as const, sample: 'Heading 3 — Cosmic subline' },
  { className: 'type-h4', tag: 'h4' as const, sample: 'Heading 4 — Nunito UI' },
  { className: 'type-h5', tag: 'h5' as const, sample: 'Heading 5 — UI section' },
  { className: 'type-h6', tag: 'h6' as const, sample: 'Eyebrow label' },
  { className: 'type-title', tag: 'p' as const, sample: 'Title — Card or component' },
  { className: 'type-subtitle', tag: 'p' as const, sample: 'Subtitle — Supporting context' },
] as const

const bodyScale = [
  {
    className: 'type-lead',
    label: 'Lead',
    sample:
      'Opening narrative with generous line height — easy to scan, easy to trust, never dense.',
  },
  {
    className: 'type-body-lg',
    label: 'Body large',
    sample: 'Emphasized body for intros and feature explanations without sacrificing clarity.',
  },
  {
    className: 'type-body',
    label: 'Body',
    sample:
      'Default reading text. Nunito (Hoss Round) stays soft and round — clear at 16px, never below 12px.',
  },
  {
    className: 'type-body-sm type-muted',
    label: 'Body small + muted',
    sample: 'Secondary text, helpers, and de-emphasized content.',
  },
  { className: 'type-caption', label: 'Caption', sample: 'Timestamps · footnotes · metadata' },
  { className: 'type-overline', label: 'Overline', sample: 'Section label' },
  { className: 'type-label', label: 'Label', sample: 'Form field · control' },
  { className: 'type-tag', label: 'Tag', sample: 'v1.0' },
] as const

const fontWeights = [
  { className: 'type-h3', label: 'Cosmic 600 · small', sample: 'Secondary title treatment' },
  { className: 'type-h1', label: 'Cosmic 600 · large', sample: 'Primary title treatment' },
  { className: 'type-body type-medium', label: 'Medium 500', sample: 'Medium body emphasis' },
  { className: 'type-body type-bold', label: 'Bold 700', sample: 'Bold callout in sans' },
] as const

const fontStyles: readonly {
  label: string
  className: string
  sample: string
  invertDemo?: boolean
}[] = [
  {
    label: 'Serif italic',
    className: 'type-h2 type-serif-italic',
    sample: 'Editorial voice for quotes and highlights',
  },
  {
    label: 'Sans italic',
    className: 'type-body-lg type-sans-italic type-muted',
    sample: 'Subtle emphasis in interface copy',
  },
  {
    label: 'Small caps',
    className: 'type-h4 type-small-caps',
    sample: 'Premium Label',
  },
  {
    label: 'Outlined',
    className: 'type-display-sm type-outlined',
    sample: 'Outlined',
  },
  {
    label: 'Tracking wide',
    className: 'type-overline type-tracking-wide',
    sample: 'WIDE SPACED LABEL',
  },
  {
    label: 'Invert (difference)',
    className: 'type-h3 type-invert',
    sample: 'Legible on any background',
    invertDemo: true,
  },
]

const typeAnimations: {
  anim: TypeAnimPreset
  trigger: TypeAnimTrigger
  label: string
  sample: string
  typeClass: string
  usage: string
  split?: 'chars' | 'words' | 'line'
  sync?: boolean
}[] = [
  {
    anim: 'flip',
    trigger: 'hover',
    label: 'Flip (hover)',
    sample: 'Refined motion',
    typeClass: 'type-h3',
    usage: '<TypeAnimText anim="flip" trigger="hover" className="type-h3">…</TypeAnimText>',
  },
  {
    anim: 'slide-left',
    trigger: 'hover',
    label: 'Slide left (hover)',
    sample: 'Enter from the left',
    typeClass: 'type-display-sm',
    usage: 'anim="slide-left" trigger="hover"',
  },
  {
    anim: 'slide-right',
    trigger: 'hover',
    label: 'Slide right (hover)',
    sample: 'Sweep from the right',
    typeClass: 'type-h4',
    usage: 'anim="slide-right" trigger="hover"',
  },
  {
    anim: 'slide-up',
    trigger: 'hover',
    label: 'Slide up (hover)',
    sample: 'Rise into place',
    typeClass: 'type-title',
    usage: 'anim="slide-up" trigger="hover"',
  },
  {
    anim: 'fade',
    trigger: 'hover',
    label: 'Fade (hover)',
    sample: 'Soft opacity reveal',
    typeClass: 'type-body-lg',
    usage: 'anim="fade" trigger="hover"',
  },
  {
    anim: 'blur-in',
    trigger: 'hover',
    label: 'Blur in (hover)',
    sample: 'Focus from blur',
    typeClass: 'type-body',
    usage: 'anim="blur-in" trigger="hover"',
  },
  {
    anim: 'slide-left',
    trigger: 'enter',
    label: 'Slide left (enter)',
    sample: 'Loads staggered in',
    typeClass: 'type-h3 type-accent',
    usage: 'anim="slide-left" trigger="enter"',
  },
  {
    anim: 'flip',
    trigger: 'enter',
    label: 'Flip reveal (enter)',
    sample: 'Flip on mount',
    typeClass: 'type-h4',
    usage: 'anim="flip" trigger="enter"',
  },
  {
    anim: 'slide-up',
    trigger: 'enter',
    label: 'Line slide up (enter)',
    sample: 'Whole line rises once',
    typeClass: 'type-lead',
    usage: 'split="line" anim="slide-up" trigger="enter"',
    split: 'line',
  },
  {
    anim: 'reveal-up',
    trigger: 'hover',
    label: 'Reveal up (hover)',
    sample: 'Masked rise per character',
    typeClass: 'type-h3',
    usage: 'anim="reveal-up" trigger="hover"',
  },
  {
    anim: 'reveal-up',
    trigger: 'hover',
    label: 'Reveal up — all at once',
    sample: 'Hidden to visible together',
    typeClass: 'type-display-sm',
    usage: 'anim="reveal-up" trigger="hover" sync={false}',
    sync: false,
  },
  {
    anim: 'reveal-left',
    trigger: 'hover',
    label: 'Reveal left (hover)',
    sample: 'Sweep from masked left',
    typeClass: 'type-h4',
    usage: 'anim="reveal-left" trigger="hover"',
  },
  {
    anim: 'scale-in',
    trigger: 'hover',
    label: 'Scale in (hover)',
    sample: 'Zoom into place',
    typeClass: 'type-h3 type-accent',
    usage: 'anim="scale-in" trigger="hover"',
  },
  {
    anim: 'pop-in',
    trigger: 'hover',
    label: 'Pop in (hover)',
    sample: 'Elastic overshoot',
    typeClass: 'type-h2',
    usage: 'anim="pop-in" trigger="hover"',
    sync: false,
  },
  {
    anim: 'rotate-y',
    trigger: 'hover',
    label: 'Rotate Y (hover)',
    sample: '3D flip from depth',
    typeClass: 'type-h4',
    usage: 'anim="rotate-y" trigger="hover"',
  },
  {
    anim: 'drop-in',
    trigger: 'hover',
    label: 'Drop in (hover)',
    sample: 'Falls into the mask',
    typeClass: 'type-title',
    usage: 'anim="drop-in" trigger="hover"',
  },
  {
    anim: 'reveal-up',
    trigger: 'hover',
    label: 'Line reveal (hover)',
    sample: 'Whole line unmasks at once',
    typeClass: 'type-lead',
    usage: 'split="line" anim="reveal-up" trigger="hover"',
    split: 'line',
  },
]

const marqueeItems = [
  'Typography',
  'Motion',
  'Display',
  'Rhythm',
  'GSAP',
  'Marquee',
] as const

const marqueeStyleGalleryItems = ['Display', 'Motion', 'Type', 'Flow'] as const

const linkSamples = [
  { id: 'overview', label: 'Overview' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'motion', label: 'Motion' },
] as const

const decorations = [
  { className: 'type-h3 type-underline', sample: 'Underline accent' },
  { className: 'type-h3 type-underline-wavy', sample: 'Wavy underline' },
  { className: 'type-h3 type-strike', sample: 'Strikethrough offer' },
  { className: 'type-body type-highlight', sample: 'Soft highlight on phrase' },
  { className: 'type-body type-highlight-strong', sample: 'Strong highlight' },
] as const

function primaryFontName(stackValue: string): string {
  const quoted = stackValue.match(/'([^']+)'/)
  if (quoted) return quoted[1]
  return stackValue.split(',')[0]?.trim() ?? stackValue
}

function ScaleRow({
  label,
  className,
  children,
}: {
  label: string
  className: string
  children: ReactNode
}) {
  return (
    <li className="theme-shell-divider grid gap-2 border-b py-5 last:border-b-0 sm:grid-cols-[9.5rem_1fr] sm:gap-8">
      <div className="shrink-0">
        <p className="type-label type-muted">{label}</p>
        <p className="mt-1 font-mono text-[0.65rem] leading-snug type-faint">{className}</p>
      </div>
      <div>{children}</div>
    </li>
  )
}

function StyleCard({
  label,
  className,
  children,
}: {
  label: string
  className: string
  children: ReactNode
}) {
  return (
    <div className="theme-card theme-card--flat p-5">
      <p className="type-caption mb-3">{label}</p>
      <p className="font-mono text-[0.65rem] type-faint mb-4">{className}</p>
      {children}
    </div>
  )
}

export function TypographyShowcase() {
  const { stack } = useThemeFont()
  const [selectedLinkId, setSelectedLinkId] = useState<(typeof linkSamples)[number]['id']>('tokens')
  const [marqueeSpeed, setMarqueeSpeed] = useState('80')
  const [marqueeDirection, setMarqueeDirection] = useState<TypeMarqueeDirection>('left')
  const [marqueeVariant, setMarqueeVariant] = useState<TypeMarqueeVariant>('band')
  const [marqueeEdgeFade, setMarqueeEdgeFade] = useState<'on' | 'off'>('on')
  const [textShadowVariant, setTextShadowVariant] = useState<TextShadowVariant>('brutal')

  const fontFamilies = useMemo(
    () => [
      {
        role: 'Cosmic · large treatment',
        family: primaryFontName(stack.display),
        utility: 'font-display',
        sampleClass: 'type-display-lg',
        note: 'Nagel · face 19 · XL / LG / H1',
      },
      {
        role: 'Cosmic · small treatment',
        family: primaryFontName(stack.displaySans ?? stack.display),
        utility: 'font-display-sans',
        sampleClass: 'type-display-sm',
        note: 'Nagel · face 19 · MD / SM / H2–H3',
      },
      {
        role: 'Nunito · round body',
        family: primaryFontName(stack.sans),
        utility: 'font-sans',
        sampleClass: 'type-body',
        note: 'Hoss Round · face 7 · 12px floor',
      },
      {
        role: 'Code',
        family: primaryFontName(stack.mono),
        utility: 'font-mono',
        sampleClass: 'type-mono',
        note: 'Tabular figures · tags · inline code',
      },
    ],
    [stack],
  )

  return (
    <div className="space-y-14">
      <section className="space-y-6">
        <p className="type-overline type-accent mb-0">Vurify type system</p>
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="type-display-xl mb-2">Proof over polish.</p>
            <p className="type-display-md type-muted mb-4">One task. One conversation.</p>
            <p className="type-lead type-muted prose-measure mb-0">
              Cosmic carries both display levels: oversized for the lead and restrained for the
              smaller title. Nunito keeps the body round and friendly.
            </p>
          </div>
          <div className="theme-card theme-card--flat space-y-3 p-5">
            <p className="type-caption type-accent mb-0">Pairing rule</p>
            <p className="type-body-sm mb-0">
              <span className="type-semibold">Cosmic large</span> (Bricolage · face 19) for XL /
              LG / H1 — source specimen weight 600; <code className="type-code">font-larger</code> /
              <code className="type-code">font-medium</code> sizing (
              <code className="type-code">type-cosmic</code>).
            </p>
            <p className="type-body-sm mb-0">
              <span className="type-semibold">Cosmic small</span> uses the same face and weight for
              MD / SM / H2–H3, with <code className="type-code">content__title</code> /
              <code className="type-code">font-sub</code> sizing.
            </p>
            <p className="type-body-sm type-muted mb-0">
              Body is Nunito (Hoss Round · face 7) — round terminals, 12px floor.
            </p>
          </div>
        </div>
      </section>

      <p className="type-body-sm type-muted prose-measure mb-0">
        Related:{' '}
        <a className="underline" href="/theme?section=colors">
          Colors
        </a>
        {' · '}
        <a className="underline" href="/theme?section=typography-display-faces">
          Display faces
        </a>
        {' · '}
        <a className="underline" href="/theme?section=typography-link-hovers">
          Link underlines
        </a>
        {' · '}
        <a className="underline" href="/theme?section=typography-scroll-fx">
          On-scroll type
        </a>
      </p>
      <section className="space-y-4">
        <ThemeFontPicker />
        <p className="type-body-sm type-muted prose-measure mb-0">
          Default stack is <span className="type-semibold">GRAS</span>. Switches{' '}
          <code className="type-code">--font-display</code>,{' '}
          <code className="type-code">--font-display-sans</code>,{' '}
          <code className="type-code">--font-sans</code>, and{' '}
          <code className="type-code">--font-mono</code> via{' '}
          <code className="type-code">ThemeFontProvider</code>.
        </p>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Reading sample</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Body legibility is the first priority — measure, size, and leading are tuned for calm
          long-form reading on white surfaces.
        </p>
        <div className="theme-card theme-card--flat max-w-3xl space-y-4 p-6">
          <p className="type-h3 type-serif-italic mb-0">A human reads every word.</p>
          <p className="type-body prose-measure mb-0">
            Vurify replaces six rounds of résumé theatre with one focused task, one conversation,
            and one clear decision. Candidates know the deadline before they begin. Hiring teams
            commit to a reasoned outcome. The type system should feel the same way: direct,
            specific, and never exhausting to read.
          </p>
          <p className="type-body-sm type-muted prose-measure mb-0">
            Prefer white neutrals, deep ink, indigo accent, and amber highlights. Keep navigation
            labels short. Let display faces do the drama — body copy stays quiet and clear.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Text shadows</p>
        <p className="type-body-sm type-muted prose-measure">
          Presets from <code className="type-code">ref.shadows-1</code> — apply{' '}
          <code className="type-code">textShadowClass()</code> or class{' '}
          <code className="type-code">theme-text-shadow--*</code> on any scale utility.
        </p>
        <div className="max-w-xs">
          <Select
            label="textShadowVariant"
            options={[...TEXT_SHADOW_VARIANT_OPTIONS]}
            value={textShadowVariant}
            onChange={(value) => setTextShadowVariant(value as TextShadowVariant)}
          />
        </div>
        <ul className="space-y-4">
          <li className="theme-card theme-card--flat p-6">
            <p
              className={[
                'type-display-sm mb-2',
                textShadowClass(textShadowVariant),
              ]
                .filter(Boolean)
                .join(' ')}
            >
              Display with shadow
            </p>
            <p
              className={['type-body mb-0', textShadowClass(textShadowVariant)].filter(Boolean).join(' ')}
            >
              Body copy keeps the same shadow preset for legibility checks on long lines.
            </p>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Font families</p>
        <p className="type-body-sm type-muted prose-measure">
          Self-hosted via Fontsource. Scale classes set size; style modifiers (
          <code className="type-code">type-accent</code>,{' '}
          <code className="type-code">type-serif-italic</code>, etc.) stack on top.
        </p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fontFamilies.map(({ role, family, utility, sampleClass, note }) => (
            <li
              key={role}
              className="theme-card theme-card--flat p-4"
            >
              <p className="type-caption">{role}</p>
              <p className={`mt-2 ${sampleClass}`}>{family}</p>
              <p className="mt-2 type-caption">{note}</p>
              <p className="mt-3 font-mono text-xs type-faint">{utility}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Brand / landing</p>
        <p className="type-body-sm type-muted prose-measure">
          Landing composites — bright gold accent · espresso focus (brand) or gold links (dark).
        </p>
        <ul className="theme-shell-divider divide-y border-y">
          {brandLandingScale.map(({ className, label, sample, caption }) => (
            <ScaleRow key={label} label={label} className={className}>
              <div>
                <p className={className}>{sample}</p>
                {caption ? <p className="type-stat-caption mt-2">{caption}</p> : null}
              </div>
            </ScaleRow>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Display scale</p>
        <ul className="theme-shell-divider divide-y border-y">
          {displayScale.map(({ className, label, sample }) => (
            <ScaleRow key={label} label={label} className={className}>
              <p className={className}>{sample}</p>
            </ScaleRow>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Heading scale</p>
        <ul className="theme-shell-divider divide-y border-y">
          {headingScale.map(({ className, tag, sample }) => {
            const Tag = tag
            return (
              <ScaleRow key={className} label={className.replace('type-', '')} className={className}>
                <Tag className={className}>{sample}</Tag>
              </ScaleRow>
            )
          })}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Font weights</p>
        <ul className="theme-shell-divider divide-y border-y">
          {fontWeights.map(({ className, label, sample }) => (
            <ScaleRow key={label} label={label} className={className}>
              <p className={className}>{sample}</p>
            </ScaleRow>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Font styles</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {fontStyles.map(({ label, className, sample, invertDemo }) => (
            <StyleCard key={label} label={label} className={className}>
              {invertDemo ? (
                <div className="relative h-28 overflow-hidden rounded-[0.125rem] border-2 border-[var(--theme-border-strong)]">
                  <div className="type-invert-demo-bg absolute inset-0" />
                  <p className={`${className} absolute left-4 top-1/2 max-w-[85%] -translate-y-1/2`}>
                    {sample}
                  </p>
                </div>
              ) : (
                <p className={className}>{sample}</p>
              )}
            </StyleCard>
          ))}
        </div>
        <div className="theme-card theme-card--flat relative mt-4 h-36 overflow-hidden p-0">
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src="https://picsum.photos/960/360?random=88"
            alt=""
            loading="lazy"
          />
          <p className="type-overline type-tracking-wide type-invert absolute left-5 top-5 origin-left rotate-90 whitespace-nowrap">
            Rotated invert label
          </p>
          <p className="type-body-sm type-invert absolute bottom-4 left-4 max-w-[14rem]">
            Stacks on any scale class — text flips against photos and UI fills.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Text animations</p>
        <p className="type-body-sm type-muted prose-measure">
          Use <code className="type-code">TypeAnimText</code> with a preset and trigger — or stack{' '}
          <code className="type-code">type-anim type-anim--*</code> classes from{' '}
          <code className="type-code">typography-animations.css</code>. Modifiers:{' '}
          <code className="type-code">--hover</code> (default) ·{' '}
          <code className="type-code">--enter</code> (play on load). Tune via{' '}
          <code className="type-code">--type-anim-duration</code>,{' '}
          <code className="type-code">--type-anim-stagger</code>,{' '}
          <code className="type-code">--type-anim-distance</code>. GSAP-style presets:{' '}
          <code className="type-code">reveal-up</code>, <code className="type-code">reveal-left</code>,{' '}
          <code className="type-code">scale-in</code>, <code className="type-code">pop-in</code>,{' '}
          <code className="type-code">rotate-y</code>, <code className="type-code">drop-in</code>. Use{' '}
          <code className="type-code">sync=&#123;false&#125;</code> for all characters at once.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {typeAnimations.map(({ anim, trigger, label, sample, typeClass, usage, split, sync }) => (
            <li
              key={`${anim}-${trigger}-${label}`}
              className="theme-card theme-card--flat type-anim-card p-5"
            >
              <p className="type-caption mb-1">{label}</p>
              <p className="font-mono text-[0.65rem] leading-snug type-faint mb-4">{usage}</p>
              <TypeAnimText
                anim={anim}
                trigger={trigger}
                split={split ?? 'chars'}
                sync={sync}
                className={typeClass}
              >
                {sample}
              </TypeAnimText>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Text trace</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">TraceAnimText</code> — SVG stroke draw + fill from{' '}
          <code className="type-code">ref.text-trace-1</code>. Presets{' '}
          <code className="type-code">trace-in</code> (draw then fill) and{' '}
          <code className="type-code">trace-out</code> (undraw). Hover pairs in ↔ out;{' '}
          <code className="type-code">trigger=&quot;enter&quot;</code> plays once on mount.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2">
          <li className="theme-card theme-card--flat type-anim-card p-5">
            <p className="type-caption mb-4">trace-in · hover</p>
            <TraceAnimText trace="trace-in" trigger="hover" className="type-h3">
              Stroke reveal
            </TraceAnimText>
          </li>
          <li className="theme-card theme-card--flat type-anim-card p-5">
            <p className="type-caption mb-4">trace-out · hover</p>
            <TraceAnimText trace="trace-out" trigger="hover" className="type-h3">
              Stroke retreat
            </TraceAnimText>
          </li>
          <li className="theme-card theme-card--flat type-anim-card p-5">
            <p className="type-caption mb-4">trace-in · enter</p>
            <TraceAnimText trace="trace-in" trigger="enter" className="type-display-sm">
              On load
            </TraceAnimText>
          </li>
          <li className="theme-card theme-card--flat type-anim-card p-5">
            <p className="type-caption mb-4">trace-out · enter</p>
            <TraceAnimText trace="trace-out" trigger="enter" className="type-display-sm">
              Undraw once
            </TraceAnimText>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Infinite marquee</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">TypeMarquee</code> — GSAP linear loop on a duplicated track.{' '}
          <strong>Edge fade</strong> masks the viewport so type vanishes at both sides;{' '}
          <strong>variant</strong> switches band chrome and default typography presets (
          <code className="type-code">gradient</code>, <code className="type-code">outline</code>,{' '}
          <code className="type-code">invert</code>, etc.). Bordered variants stack{' '}
          <code className="type-code">theme-card--*</code> surfaces — neobrutal{' '}
          <code className="type-code">--theme-shadow-brutal</code> offset; pill uses{' '}
          <code className="type-code">theme-card--shape-pill</code>.
        </p>
        <div className="grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="speed"
            options={[...TYPE_MARQUEE_SPEED_OPTIONS]}
            value={marqueeSpeed}
            onChange={setMarqueeSpeed}
          />
          <Select
            label="direction"
            options={[...TYPE_MARQUEE_DIRECTION_OPTIONS]}
            value={marqueeDirection}
            onChange={(value) => setMarqueeDirection(value as TypeMarqueeDirection)}
          />
          <Select
            label="variant"
            options={[...TYPE_MARQUEE_VARIANT_OPTIONS]}
            value={marqueeVariant}
            onChange={(value) => setMarqueeVariant(value as TypeMarqueeVariant)}
          />
          <Select
            label="edge fade"
            options={[...TYPE_MARQUEE_EDGE_FADE_OPTIONS]}
            value={marqueeEdgeFade}
            onChange={(value) => setMarqueeEdgeFade(value as 'on' | 'off')}
          />
        </div>
        <TypeMarquee
          items={marqueeItems}
          variant={marqueeVariant}
          speed={Number(marqueeSpeed)}
          direction={marqueeDirection}
          edgeFade={marqueeEdgeFade === 'on'}
          label="Infinite typography marquee"
        />
        <p className="type-label mb-2">Style gallery — all with edge fade</p>
        <ul className="space-y-3">
          {TYPE_MARQUEE_VARIANT_OPTIONS.map(({ value, label }) => (
            <li key={value}>
              <p className="type-caption type-muted mb-1">{label}</p>
              <TypeMarquee
                items={marqueeStyleGalleryItems}
                variant={value}
                direction={value === 'dense' ? 'right' : 'left'}
                pauseOnHover={false}
                edgeFade
                label={`Marquee style ${value}`}
              />
            </li>
          ))}
        </ul>
        <p className="type-caption type-muted mb-0">
          Interactive row — hover to pause · gallery rows roll continuously with vanishing edges.
        </p>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Linked text</p>
        <p className="type-body-sm type-muted prose-measure">
          Stack <code className="type-code">type-link</code> on any scale class. Use{' '}
          <code className="type-code">is-active</code> or <code className="type-code">aria-current=&quot;page&quot;</code>{' '}
          for the current location; <code className="type-code">is-selected</code> or{' '}
          <code className="type-code">aria-current=&quot;true&quot;</code> for a chosen item.
        </p>
        <div className="theme-card theme-card--flat space-y-5 p-5">
          <p className="type-body prose-measure">
            Read the{' '}
            <a href="#typography" className="type-link">
              typography guide
            </a>{' '}
            or jump to{' '}
            <a href="#motion" className="type-link is-active" aria-current="page">
              motion presets
            </a>{' '}
            — both stack with body scale classes on the anchor.
          </p>
          <nav aria-label="Example doc sections" className="flex flex-wrap gap-x-4 gap-y-2">
            {linkSamples.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className={['type-label type-link', id === 'tokens' ? 'is-active' : ''].filter(Boolean).join(' ')}
                aria-current={id === 'tokens' ? 'page' : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-caption type-muted">Filter:</span>
            {linkSamples.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={['type-label type-link', selectedLinkId === id ? 'is-selected' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-current={selectedLinkId === id ? 'true' : undefined}
                onClick={() => setSelectedLinkId(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Decorations & emphasis</p>
        <ul className="flex flex-col gap-4">
          {decorations.map(({ className, sample }) => (
            <li key={className}>
              <StyleCard label={className} className={className}>
                <span className={className}>{sample}</span>
              </StyleCard>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Body & UI</p>
        <ul className="theme-shell-divider divide-y border-y">
          {bodyScale.map(({ className, label, sample }) => (
            <ScaleRow key={label} label={label} className={className}>
              <p className={className}>{sample}</p>
            </ScaleRow>
          ))}
        </ul>
      </section>

      <section className="space-y-6 prose-measure">
        <p className="type-overline">Quotes & narrative</p>
        <p className="type-quote">
          &ldquo;Typography is the craft of endowing human language with a durable visual form.&rdquo;
        </p>
        <blockquote className="type-blockquote">
          Modern elegance pairs a refined serif display with a calm, readable sans body.
        </blockquote>
        <p className="type-body type-dropcap">
          Drop cap opens a story block with editorial flair. The first letter scales in the active
          display face with a gold accent while the remainder stays in comfortable sans rhythm for
          long reading sessions across the template sites you build from this schema.
        </p>
        <p className="type-body">
          Combine modifiers freely:{' '}
          <span className="type-semibold type-accent">accent semibold</span>,{' '}
          <span className="type-sans-italic type-muted">muted italic aside</span>, or{' '}
          <code className="type-code">type-code</code> for technical tokens.
        </p>
        <p className="type-mono type-tabular type-muted">
          0123456789 · $1,240.00 · id: pages.theme
        </p>
      </section>
    </div>
  )
}
