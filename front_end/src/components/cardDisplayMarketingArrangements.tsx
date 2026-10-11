import { ArrowUpRight } from 'lucide-react'
import type { CardArrangement } from '../lib/cards/cardDisplayArrangements'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card } from './Card'
import { LinkButton } from './LinkButton'
import { Tag } from './Tag'
import {
  ARRANGEMENT_IMG,
  ArrangementMedia,
  ArrangementRule,
  cardImageEnd,
} from './cardDisplayLayout'

/** Pricing, marketing, testimonial — structured zones and editorial rhythm. */
export const marketingCardArrangements: CardArrangement[] = [
  {
    id: 'pricing-pedestal',
    category: 'pricing',
    name: 'Pedestal tier',
    purpose: 'Single plan with vertical air — display price centered, sparse feature list, one CTA foot.',
    reference: 'Notion / Linear solo tier — monument spacing, not cramped bullet lists.',
    stack:
      'Card raised · borderGlow · py-8 px-6 · text-center · type-display-sm · space-y-6 · type-body-sm list · Button',
    preview: (
      <Card variant="raised" borderGlow className="theme-card-arrangement max-w-[15rem] px-6 py-8">
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="type-overline type-faint mb-0">Pro</p>
            <p className="type-display-sm type-tabular type-semibold mb-0">$29</p>
            <p className="type-caption type-muted mb-0">per seat / month</p>
          </div>
          <ArrangementRule />
          <ul className="space-y-2 mb-0 list-none p-0 text-left">
            <li className="type-body-sm type-muted mb-0">Unlimited projects</li>
            <li className="type-body-sm type-muted mb-0">Priority support</li>
            <li className="type-body-sm type-muted mb-0">Audit log export</li>
          </ul>
          <Button variant="accent" size="sm" className="w-full">
            Start trial
          </Button>
        </div>
      </Card>
    ),
  },
  {
    id: 'pricing-compare-slab',
    category: 'pricing',
    name: 'Compare slab',
    purpose: 'Two tiers in one raised slab — shared cap height, hairline divide, mirrored price stacks.',
    reference: 'Mobile plan compare — single surface, equal columns, no floating card trio.',
    stack: 'Card raised · type-label cap · grid cols-2 · divide-x · py-6 · display-sm tabular each',
    preview: (
      <Card variant="raised" className="theme-card-arrangement max-w-md overflow-hidden p-0">
        <p className="type-overline type-faint border-b px-5 py-3 mb-0 text-center">Choose plan</p>
        <div className="grid grid-cols-2 divide-x">
          {[
            { name: 'Starter', price: '$0' },
            { name: 'Team', price: '$49' },
          ].map(({ name, price }) => (
            <div key={name} className="flex flex-col items-center gap-4 px-4 py-7 text-center">
              <p className="type-label mb-0">{name}</p>
              <p className="type-display-sm type-tabular type-semibold mb-0">{price}</p>
              <Button variant="ghost" size="sm">
                Select
              </Button>
            </div>
          ))}
        </div>
      </Card>
    ),
  },
  {
    id: 'pricing-featured-lip',
    category: 'pricing',
    name: 'Featured lip',
    purpose: 'Center tier breaks the row upward with border glow; flanking tiers sit on baseline.',
    reference: 'SaaS pricing hero column — vertical pop without changing column widths.',
    stack: 'grid cols-3 items-end gap-2 · flat side · raised center -translate-y-3 · borderGlow · Tag',
    preview: (
      <ul className="theme-card-arrangement grid max-w-2xl grid-cols-3 items-end gap-2 mb-0 list-none p-0">
        {[
          { tier: 'Hobby', price: '$0', featured: false },
          { tier: 'Business', price: '$79', featured: true },
          { tier: 'Scale', price: '$199', featured: false },
        ].map(({ tier, price, featured }) => (
          <li key={tier}>
            <Card
              variant={featured ? 'raised' : 'flat'}
              borderGlow={featured}
              className={featured ? '-translate-y-3 px-4 py-5' : 'px-3 py-4'}
            >
              <div className="space-y-3 text-center">
                {featured ? <Tag size="sm">Popular</Tag> : <span className="block h-6" aria-hidden />}
                <p className="type-label mb-0">{tier}</p>
                <p className="type-display-sm type-tabular type-semibold mb-0">{price}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: 'marketing-manifesto',
    category: 'marketing',
    name: 'Manifesto rail',
    purpose: 'Accent left rail + headline stack + trailing link — no button clutter.',
    reference: 'Stripe press blocks — border accent, one strong line, text link exit.',
    stack: 'Card flat · theme-card-arrangement__rail · type-h4 · type-body-sm muted · LinkButton',
    preview: (
      <Card variant="flat" className="theme-card-arrangement max-w-lg px-6 py-5">
        <div className="theme-card-arrangement__rail space-y-3">
          <p className="type-h4 mb-0 text-balance">Ship surfaces, not one-offs.</p>
          <p className="type-body-sm type-muted mb-0 max-w-md">
            Compose cards from shared primitives — arrangement references, not page-specific CSS.
          </p>
          <LinkButton
            href="#"
            variant="ghost"
            size="sm"
            icon={ArrowUpRight}
            iconPosition="right"
            className="px-0"
          >
            Read approach
          </LinkButton>
        </div>
      </Card>
    ),
  },
  {
    id: 'marketing-offer-lip',
    category: 'marketing',
    name: 'Offer lip',
    purpose: 'Warning badge breaks top edge; interior uses generous padding and single accent link.',
    reference: 'Promo modules — badge overlap + calm interior, not stacked widgets.',
    stack: 'relative pt-4 · Badge absolute · Card outline px-5 py-6 · type-body-sm · LinkButton accent',
    preview: (
      <div className="theme-card-arrangement relative max-w-sm pt-4">
        <Badge tone="warning" className="absolute left-5 top-0 z-10">
          Limited
        </Badge>
        <Card variant="outline" className="px-5 py-6">
          <p className="type-body-lg type-semibold mb-1">Annual plan — 40% off</p>
          <p className="type-caption type-muted mb-4">Ends Sunday · terms apply</p>
          <LinkButton href="#" variant="accent" size="sm" icon={ArrowUpRight} iconPosition="right">
            Claim offer
          </LinkButton>
        </Card>
      </div>
    ),
  },
  {
    id: 'marketing-cover-tag',
    category: 'marketing',
    name: 'Cover tag tension',
    purpose: 'Tag top-right, display headline bottom-left — opposing anchors on vignette cover.',
    reference: 'Drop campaigns — diagonal read path across the image field.',
    stack:
      'theme-card-arrangement-portrait · bg-scrim-vignette · justify-between · Tag · type-display-sm light',
    preview: (
      <Card
        variant="raised"
        image={{ src: ARRANGEMENT_IMG.editorial, alt: '' }}
        className={`theme-card-arrangement theme-card-arrangement-portrait theme-card--bg-scrim-vignette theme-card--bg-scrim-on-dark ${cardImageEnd} [&_.theme-card__content]:justify-between [&_.theme-card__content]:py-6`}
      >
        <Tag size="sm" className="self-end">
          New
        </Tag>
        <p className="type-display-sm type-light type-tracking-tight mb-0 max-w-[12ch] text-balance">
          Summer edit
        </p>
      </Card>
    ),
  },
  {
    id: 'testimonial-editorial',
    category: 'testimonial',
    name: 'Editorial pull',
    purpose: 'Serif quote at lead scale; attribution separated below with em dash and tracked caption.',
    reference: 'Magazine pull quotes — quote dominates, credit whispers.',
    stack: 'Card inset · px-6 py-7 · type-quote / type-serif-italic · mt-4 · type-caption faint',
    preview: (
      <Card variant="inset" className="theme-card-arrangement max-w-lg px-6 py-7">
        <blockquote className="type-quote type-serif-italic mb-0 text-balance">
          &ldquo;The arrangement library changed how we compose marketing surfaces.&rdquo;
        </blockquote>
        <p className="type-caption type-faint mt-5 mb-0 tracking-wide">— Alex Chen · Product Design</p>
      </Card>
    ),
  },
  {
    id: 'testimonial-portrait-split',
    category: 'testimonial',
    name: 'Portrait split',
    purpose: 'Portrait media (~42%) beside quote — image taller than copy column for editorial balance.',
    reference: 'Case-study cards — vertical photo + restrained quote block.',
    stack: 'Card raised · grid cols-[0.42fr_1fr] · portrait media foot scrim · quote · caption',
    preview: (
      <Card variant="raised" className="theme-card-arrangement max-w-lg overflow-hidden p-0">
        <div className="grid grid-cols-[0.42fr_1fr]">
          <ArrangementMedia src={ARRANGEMENT_IMG.portrait} className="min-h-[11rem]" scrim="foot" />
          <div className="flex flex-col justify-center gap-3 px-5 py-6">
            <p className="type-quote mb-0">&ldquo;We stopped rewriting card CSS.&rdquo;</p>
            <ArrangementRule accent />
            <p className="type-caption type-faint mb-0">Jordan Lee</p>
          </div>
        </div>
      </Card>
    ),
  },
]
