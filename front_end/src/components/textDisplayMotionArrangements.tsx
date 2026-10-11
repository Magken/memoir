import type { TextArrangement } from '../lib/animations/textDisplayArrangements'
import { IsometricCssWords } from './IsometricCssWords'
import { TypeAnimText } from './TypeAnimText'
import { TypeAnnouncementBar } from './TypeAnnouncementBar'
import { TypeCounter } from './TypeCounter'
import { TypeMarquee } from './TypeMarquee'
import { TypeRotate } from './TypeRotate'
import { TypeTicker } from './TypeTicker'

const motionMarqueeItems = ['Ship', 'Scale', 'Refine', 'Repeat'] as const
const motionLogoItems = ['Acme', 'North', 'Studio', 'Form'] as const
const motionVerticalItems = ['Research', 'Design', 'Build', 'Launch'] as const
const motionTickerItems = ['New: motion composites', 'Pricing refresh live', 'API v2 stable'] as const
const motionRotateItems = ['Build faster.', 'Ship smarter.', 'Scale calmly.'] as const

/** Motion & band arrangements — TypeMarquee, TypeTicker, TypeRotate, etc. */
export const motionTextArrangements: TextArrangement[] = [
  {
    id: 'motion-marquee-band',
    category: 'motion',
    name: 'Infinite marquee band',
    purpose: 'Full-width display strip — GSAP loop, edge fade, theme-card flat shell.',
    reference: 'Stripe / Linear feature bands — continuous type with vanishing edges.',
    stack: 'TypeMarquee · variant=band · edgeFade · theme-card--flat',
    preview: (
      <TypeMarquee
        items={motionMarqueeItems}
        variant="band"
        edgeFade
        speed={64}
        pauseOnHover={false}
        label="Feature marquee"
      />
    ),
  },
  {
    id: 'motion-marquee-split',
    category: 'motion',
    name: 'Split counter-flow marquees',
    purpose: 'Two bands scrolling opposite directions — rhythm without collision.',
    reference: 'Editorial sites — dual ticker rows under hero.',
    stack: 'TypeMarquee ×2 · opposite direction · pill + dense',
    preview: (
      <div className="space-y-3">
        <TypeMarquee items={motionMarqueeItems} variant="pill" direction="left" edgeFade pauseOnHover={false} speed={52} />
        <TypeMarquee items={motionLogoItems} variant="dense" direction="right" edgeFade pauseOnHover={false} speed={40} />
      </div>
    ),
  },
  {
    id: 'motion-marquee-vertical',
    category: 'motion',
    name: 'Vertical marquee column',
    purpose: 'Credits, stack lists, or sidebar labels — vertical loop with top/bottom fade.',
    reference: 'Film credits / product stack columns.',
    stack: 'TypeMarquee · axis=vertical · edgeFade',
    preview: (
      <div className="max-w-xs">
        <TypeMarquee
          items={motionVerticalItems}
          axis="vertical"
          variant="outline"
          edgeFade
          speed={36}
          pauseOnHover={false}
          label="Vertical stack marquee"
        />
      </div>
    ),
  },
  {
    id: 'motion-marquee-logo',
    category: 'motion',
    name: 'Logo / mark strip',
    purpose: 'Short names at overline scale — ghost card, slow loop.',
    reference: 'Client logo strips · trust bands.',
    stack: 'TypeMarquee · variant=ghost · type-overline · separator=·',
    preview: (
      <TypeMarquee
        items={motionLogoItems}
        variant="ghost"
        typeClass="type-overline type-tracking-wide"
        separator="·"
        speed={44}
        edgeFade
        pauseOnHover={false}
      />
    ),
  },
  {
    id: 'motion-ticker-status',
    category: 'motion',
    name: 'Status ticker',
    purpose: 'One discrete message at a time — news, system status, release notes.',
    reference: 'GitHub status / product banners — clipped slot, slide swap.',
    stack: 'TypeTicker · TypeAnimText anim=slide-up · trigger=enter · split=line',
    preview: (
      <div className="theme-card theme-card--outline max-w-md px-4 py-3">
        <TypeTicker items={motionTickerItems} anim="slide-up" interval={2800} />
      </div>
    ),
  },
  {
    id: 'motion-rotate-hero',
    category: 'motion',
    name: 'Rotating hero headline',
    purpose: 'Fixed-height display slot cycles hero promises without layout shift.',
    reference: 'SaaS hero A/B phrases — rotate on interval.',
    stack: 'TypeRotate · TypeAnimText anim=slide-up · type-display-md',
    preview: (
      <div className="max-w-2xl space-y-2">
        <p className="type-overline mb-0">Platform</p>
        <TypeRotate items={motionRotateItems} interval={3400} />
      </div>
    ),
  },
  {
    id: 'motion-announcement-bar',
    category: 'motion',
    name: 'Announcement bar',
    purpose: 'Top-of-page strip — label, rotating copy, text link; theme-card flat.',
    reference: 'Product launch bars · cookie-lite promo rows.',
    stack: 'TypeAnnouncementBar · theme-card--flat · TypeTicker anim=fade',
    preview: (
      <TypeAnnouncementBar
        label="Update"
        messages={motionTickerItems}
        href="#motion"
        linkLabel="Details"
      />
    ),
  },
  {
    id: 'motion-counter-stat',
    category: 'motion',
    name: 'Stat counter',
    purpose: 'Odometer count-up on scroll enter — pricing, social proof, dashboards.',
    reference: 'Landing stat rows — tabular display + suffix.',
    stack: 'TypeCounter · type-display-sm type-tabular · ScrollTrigger once',
    preview: (
      <div className="flex flex-wrap items-baseline gap-6">
        <TypeCounter value={99.9} suffix="%" decimals={1} />
        <TypeCounter value={12000} suffix="k+" />
        <TypeCounter value={48} suffix="/mo" />
      </div>
    ),
  },
  {
    id: 'motion-slot-column',
    category: 'motion',
    name: 'Clip-slot word column',
    purpose: 'Bounded vertical slots — hover advances one row (ref isometric2 lightweight stack).',
    reference: 'Isometric2 CSS clip rows — one word per slot.',
    stack: 'IsometricCssWords · layout=vertical · isometricCssWordPairs',
    preview: (
      <div className="max-w-xs">
        <IsometricCssWords
          lines={motionVerticalItems}
          layout="vertical"
          typeClass="type-title"
          showPlaneBorders
        />
      </div>
    ),
  },
  {
    id: 'motion-scroll-lines',
    category: 'motion',
    name: 'Scroll-enter line stack',
    purpose: 'Display lines animate in on mount — section intro without continuous motion.',
    reference: 'Marketing section reveals — TypeAnimText enter per line.',
    stack: 'TypeAnimText · trigger=enter · split=line · type-display-sm',
    preview: (
      <div className="space-y-1">
        <TypeAnimText anim="slide-up" trigger="enter" split="line" className="type-display-sm type-light">
          Plan with clarity
        </TypeAnimText>
        <TypeAnimText anim="slide-up" trigger="enter" split="line" className="type-display-sm type-accent">
          Build with confidence
        </TypeAnimText>
      </div>
    ),
  },
  {
    id: 'motion-parallax-stack',
    category: 'motion',
    name: 'Display depth stack',
    purpose: 'Three display lines at different scales — static parallax-ready hierarchy.',
    reference: 'Hero depth — back line muted, front line accent (pair with scroll scrub in page).',
    stack: 'type-display-lg type-muted · type-display-md · type-display-sm type-accent',
    preview: (
      <div className="space-y-0">
        <p className="type-display-lg type-muted type-light mb-0 opacity-40">Background layer</p>
        <p className="type-display-md type-light mb-0 -mt-2">Middle statement</p>
        <p className="type-display-sm type-accent mb-0 -mt-1">Foreground payoff</p>
      </div>
    ),
  },
  {
    id: 'motion-pull-quote',
    category: 'motion',
    name: 'Animated pull quote',
    purpose: 'Blockquote + attribution — line reveal on the quote body.',
    reference: 'Editorial landing — type-blockquote + TypeAnimText.',
    stack: 'type-blockquote · TypeAnimText reveal-up · type-caption',
    preview: (
      <figure className="max-w-xl space-y-3">
        <TypeAnimText anim="reveal-up" trigger="enter" split="line" className="type-blockquote mb-0">
          Typography is the craft of endowing language with a durable visual form.
        </TypeAnimText>
        <figcaption className="type-caption type-muted mb-0">Robert Bringhurst</figcaption>
      </figure>
    ),
  },
  {
    id: 'motion-highlight-sweep',
    category: 'motion',
    name: 'Highlight emphasis headline',
    purpose: 'Soft highlight on display type — static prose modifier, no custom motion.',
    reference: 'Promo subheads — existing type-highlight-strong.',
    stack: 'type-display-sm type-highlight-strong',
    preview: (
      <p className="type-display-sm type-highlight-strong mb-0">Highlighted display line</p>
    ),
  },
  {
    id: 'motion-mask-fill',
    category: 'motion',
    name: 'Gradient mask fill',
    purpose: 'Display type with gradient fill — static hero accent.',
    reference: 'Apple / Stripe gradient headlines — type-gradient on display scale.',
    stack: 'type-display-lg type-gradient',
    preview: <p className="type-display-lg type-gradient mb-0">Gradient display mask</p>,
  },
  {
    id: 'motion-marquee-invert',
    category: 'motion',
    name: 'Invert marquee band',
    purpose: 'Dark fill band with invert type — event / launch moments.',
    reference: 'Night-mode promo strips — theme-card raised + invert type.',
    stack: 'TypeMarquee · variant=invert · edgeFade',
    preview: (
      <TypeMarquee
        items={['Launch week', 'Live now', 'Join us']}
        variant="invert"
        edgeFade
        speed={56}
        pauseOnHover={false}
      />
    ),
  },
]
