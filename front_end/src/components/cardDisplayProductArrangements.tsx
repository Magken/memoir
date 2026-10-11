import type { CardArrangement } from '../lib/cards/cardDisplayArrangements'
import { Button } from './Button'
import { Card } from './Card'
import { Tag } from './Tag'
import {
  ARRANGEMENT_IMG,
  ArrangementMedia,
  ArrangementRule,
  cardImageBetween,
  cardImageEnd,
  cardImageThirds,
  cardImageTop,
} from './cardDisplayLayout'

/** Product tiles — editorial proportion, price hierarchy, list density. */
export const productCardArrangements: CardArrangement[] = [
  {
    id: 'product-editorial-portrait',
    category: 'product',
    name: 'Editorial portrait',
    purpose: 'Tall 3:4 cover — price and title separated by a hairline in a weighted foot; image breathes above.',
    reference: 'Aesop / Kinfolk product cards — minimal copy, generous upper field, rule before title.',
    stack:
      'theme-card-arrangement-portrait · Card raised · image · bg-scrim-foot · type-display-sm price · rule · type-title',
    preview: (
      <Card
        variant="raised"
        image={{ src: ARRANGEMENT_IMG.productA, alt: '' }}
        className={`theme-card-arrangement theme-card-arrangement-portrait theme-card--bg-scrim-foot theme-card--bg-scrim-on-dark ${cardImageEnd}`}
      >
        <div className="flex w-full flex-col gap-3">
          <div className="theme-card-arrangement__price-row">
            <p className="type-display-sm type-tabular type-light mb-0">248</p>
            <p className="type-caption type-faint mb-0">USD</p>
          </div>
          <ArrangementRule />
          <p className="type-title type-light mb-0">Ceramic vessel</p>
        </div>
      </Card>
    ),
  },
  {
    id: 'product-shelf-row',
    category: 'product',
    name: 'Shelf row',
    purpose: 'Square thumbnail (~38% width) beside a vertically centered spec column — cart-line rhythm.',
    reference: 'Shopify order rows — fixed square media, padded copy block, price on baseline grid.',
    stack:
      'Card flat · grid cols-[7.5rem_1fr] · aspect-square media · py-5 px-4 · label · title · meta/price row',
    preview: (
      <Card variant="flat" className="theme-card-arrangement max-w-md overflow-hidden p-0">
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)]">
          <ArrangementMedia src={ARRANGEMENT_IMG.productC} scrim="edge" className="aspect-square" />
          <div className="flex flex-col justify-center gap-3 px-5 py-4">
            <p className="type-overline type-faint mb-0">Collection</p>
            <p className="type-title mb-0">Wool throw</p>
            <div className="flex items-end justify-between gap-4 pt-1">
              <p className="type-caption type-muted mb-0">Ivory · Standard</p>
              <p className="type-body-lg type-tabular type-semibold mb-0">$120</p>
            </div>
          </div>
        </div>
      </Card>
    ),
  },
  {
    id: 'product-index-drop',
    category: 'product',
    name: 'Index drop',
    purpose: 'Oversized index numeral anchors top-right; label + title stack in lower third on vignette scrim.',
    reference: 'Fashion drop cards — scale contrast between index and product name.',
    stack:
      'theme-card-arrangement-portrait · bg-scrim-vignette · type-display-xl index · type-overline · type-h5',
    preview: (
      <Card
        variant="outline"
        image={{ src: ARRANGEMENT_IMG.productB, alt: '' }}
        className={`theme-card-arrangement theme-card-arrangement-portrait theme-card--bg-scrim-vignette theme-card--bg-scrim-on-dark ${cardImageBetween}`}
      >
        <p className="theme-card-arrangement__index type-display-xl type-faint self-end mb-0 opacity-50">
          02
        </p>
        <div className="space-y-1">
          <p className="type-overline type-faint mb-0">Drop</p>
          <p className="type-h5 type-light mb-0">Linen coat</p>
        </div>
      </Card>
    ),
  },
  {
    id: 'product-diptych-caption',
    category: 'product',
    name: 'Diptych caption',
    purpose: 'Asymmetric twin images (5:4 + 4:5) share one caption bar — lookbook pair in a single shell.',
    reference: 'SSENSE / editorial commerce — dual aspect cells, unified metadata strip.',
    stack: 'Card outline · grid cols-[1.15fr_0.85fr] · unequal media heights · border-t caption flex',
    preview: (
      <Card variant="outline" className="theme-card-arrangement max-w-lg overflow-hidden p-0">
        <div className="grid grid-cols-[1.15fr_0.85fr]">
          <ArrangementMedia src={ARRANGEMENT_IMG.productA} className="min-h-[10rem]" scrim="foot" />
          <ArrangementMedia
            src={ARRANGEMENT_IMG.productB}
            className="min-h-[12rem] border-l"
            scrim="foot"
          />
        </div>
        <div className="flex items-baseline justify-between gap-6 border-t px-5 py-4">
          <div>
            <p className="type-overline type-faint mb-1">Pair</p>
            <p className="type-title mb-0">Studio set</p>
          </div>
          <p className="type-body-lg type-tabular type-semibold mb-0">$380</p>
        </div>
      </Card>
    ),
  },
  {
    id: 'media-cinematic-left',
    category: 'media',
    name: 'Cinematic left stack',
    purpose: 'Wide cover with copy constrained to left third — display + accent rule + single action.',
    reference: 'Apple TV+ / Stripe campaign cards — left-weighted type on cinematic field.',
    stack:
      'theme-card-arrangement-wide · bg-scrim-foot · cardImageThirds · type-overline · type-display-md · rule accent · Button ghost',
    preview: (
      <Card
        variant="raised"
        image={{ src: ARRANGEMENT_IMG.heroWide, alt: '' }}
        className={`theme-card-arrangement theme-card-arrangement-wide theme-card--bg-scrim-foot theme-card--bg-scrim-on-dark ${cardImageThirds}`}
      >
        <div className="space-y-4">
          <p className="type-overline type-faint mb-0">Feature</p>
          <p className="type-display-md type-light type-tracking-tight mb-0 text-balance">
            Built for focus
          </p>
          <ArrangementRule accent />
          <Button variant="ghost" size="sm" className="border-white/20 text-white hover:text-white">
            Explore
          </Button>
        </div>
      </Card>
    ),
  },
  {
    id: 'media-poster-overlap',
    category: 'media',
    name: 'Poster overlap',
    purpose: 'Cover card with inset panel overlapping bottom-right — negative margin creates poster depth.',
    reference: 'Gallery opening cards — image field + floating inset copy block.',
    stack: 'Card raised image · bg-scrim-top · Card inset -mt-10 ml-8 mr-4 · type-h4 · type-caption',
    preview: (
      <div className="theme-card-arrangement max-w-md pb-2">
        <Card
          variant="raised"
          image={{ src: ARRANGEMENT_IMG.heroTall, alt: '' }}
          className={`theme-card--bg-scrim-top theme-card--bg-scrim-on-dark min-h-[14rem] ${cardImageTop}`}
        >
          <Tag size="sm">Live</Tag>
        </Card>
        <Card variant="inset" className="relative z-10 -mt-10 ml-8 mr-5 shadow-lg">
          <p className="type-h4 mb-1">Opening night</p>
          <p className="type-caption type-muted mb-0">18 Apr · Main hall</p>
        </Card>
      </div>
    ),
  },
  {
    id: 'media-trust-minimal',
    category: 'media',
    name: 'Trust whisper',
    purpose: 'Single-row marks with wide letter-spacing — no boxes, no dividers; air and overline scale only.',
    reference: 'Luxury press rows — spaced caps, not logo grids.',
    stack: 'Card ghost · flex justify-between · type-overline type-faint · tracking-wide · px-2',
    preview: (
      <Card variant="ghost" className="theme-card-arrangement max-w-xl px-2 py-3">
        <ul className="flex w-full items-center justify-between gap-6 mb-0 list-none p-0">
          {['North', 'Form', 'Atelier', 'Studio'].map((mark) => (
            <li key={mark}>
              <span className="type-overline type-faint type-tracking-wide">{mark}</span>
            </li>
          ))}
        </ul>
      </Card>
    ),
  },
]
