import type { ItemDisplayArrangement } from '../lib/cards/itemDisplayArrangements'
import { ProductRevealCard, ProductRevealCardGrid } from './ProductRevealCard'
import { Button } from './Button'
import { Card } from './Card'
import { ARRANGEMENT_IMG, ArrangementMedia } from './cardDisplayLayout'
import { ItemImagePickerCardPreview } from './ItemImagePickerCardPreview'

/** Item-centric card shells — catalog tiles, cart lines, dense lists, pickers. */
export const itemDisplayCardArrangements: ItemDisplayArrangement[] = [
  {
    id: 'item-product-reveal',
    category: 'catalog',
    name: 'Product reveal',
    purpose:
      'Editorial product card — grayscale base image, color clip reveal on CTA hover, category tab, accent price pill, tags, cart CTA.',
    reference: 'ref.data-card-1 — kiso.css product-cards grid',
    stack:
      'ProductRevealCard · tone default|cool|warm|deep · ProductRevealCardGrid · theme-product-reveal-card.css',
    preview: (
      <ProductRevealCardGrid className="max-w-3xl">
        <ProductRevealCard
          title="Ceramic vessel"
          category="Category A"
          price="$34"
          description="Hand-thrown stoneware with matte glaze. Dishwasher safe."
          tags={['Tag A', 'Tag B']}
          image={ARRANGEMENT_IMG.productA}
          imageHover={ARRANGEMENT_IMG.productB}
          tone="default"
        />
        <ProductRevealCard
          title="Wool throw"
          category="Category B"
          price="$120"
          description="Ivory merino blend — lightweight warmth for sofa or bed."
          tags={['Tag A', 'Tag B']}
          image={ARRANGEMENT_IMG.productC}
          tone="cool"
        />
      </ProductRevealCardGrid>
    ),
  },
  {
    id: 'item-cinematic-overlay',
    category: 'display',
    name: 'Cinematic overlay',
    purpose: 'Portrait shop card — full-bleed cover, foot gradient, title + price + ghost CTA on image.',
    reference: 'Editorial commerce hero tile',
    stack: 'theme-item-display-card--overlay · absolute media · gradient foot · Button ghost',
    preview: (
      <article className="theme-item-display-card theme-item-display-card--overlay theme-card-arrangement">
        <div className="theme-item-display-card__media">
          <img src={ARRANGEMENT_IMG.portrait} alt="" loading="lazy" decoding="async" />
        </div>
        <div className="theme-item-display-card__body">
          <p className="type-overline type-faint mb-0">New arrival</p>
          <p className="type-title type-light mb-0">Linen coat</p>
          <p className="type-caption type-muted mb-0">Relaxed fit · sand</p>
          <div className="theme-item-display-card__shop">
            <p className="type-body-lg type-tabular type-semibold mb-0">$248</p>
            <Button variant="ghost" size="sm" className="border-white/25 text-white hover:text-white">
              Shop
            </Button>
          </div>
        </div>
      </article>
    ),
  },
  {
    id: 'item-magazine-row',
    category: 'display',
    name: 'Magazine row',
    purpose: 'Horizontal shelf — tall thumb column, accent rule, title + meta + price in padded copy block.',
    reference: 'SSENSE / magazine product row',
    stack: 'theme-item-display-card--magazine · grid 7.5rem 1fr · neobrutal shadow',
    preview: (
      <article className="theme-item-display-card theme-item-display-card--magazine theme-card-arrangement">
        <div className="theme-item-display-card__media">
          <img src={ARRANGEMENT_IMG.productB} alt="" loading="lazy" decoding="async" />
        </div>
        <div className="theme-item-display-card__body">
          <p className="type-overline type-faint mb-0">Essentials</p>
          <hr className="theme-item-display-card__rule" />
          <p className="type-title mb-0">Merino crew</p>
          <p className="type-caption type-muted mb-0">Charcoal · size M</p>
          <p className="type-body-sm type-tabular type-semibold mb-0">$86</p>
        </div>
      </article>
    ),
  },
  {
    id: 'item-ribbon-sale',
    category: 'display',
    name: 'Ribbon sale',
    purpose: 'Compact promo tile — diagonal sale ribbon, was/now price pair, square media.',
    reference: 'Flash sale grid cell',
    stack: 'theme-item-display-card--ribbon · absolute ribbon · price-was strike',
    preview: (
      <article className="theme-item-display-card theme-item-display-card--ribbon theme-card-arrangement">
        <span className="theme-item-display-card__ribbon">−20%</span>
        <div className="theme-item-display-card__media">
          <img src={ARRANGEMENT_IMG.productC} alt="" loading="lazy" decoding="async" />
        </div>
        <div className="theme-item-display-card__body">
          <p className="type-body-sm type-semibold mb-1">Wool throw</p>
          <div className="theme-item-display-card__price-row">
            <p className="type-body-sm type-tabular type-semibold mb-0">$96</p>
            <p className="theme-item-display-card__price-was type-tabular mb-0">$120</p>
          </div>
        </div>
      </article>
    ),
  },
  {
    id: 'item-bento-metric',
    category: 'display',
    name: 'Bento metric',
    purpose: 'Analytics item tile — oversized KPI, product thumb chip, accent delta pill.',
    reference: 'Dashboard SKU snapshot',
    stack: 'theme-item-display-card--bento · metric + thumb grid · delta pill',
    preview: (
      <article className="theme-item-display-card theme-item-display-card--bento theme-card-arrangement">
        <div className="theme-item-display-card__metric">
          <p className="theme-item-display-card__metric-value mb-0">128</p>
          <p className="type-caption type-muted mb-0">Units sold</p>
        </div>
        <div className="theme-item-display-card__thumb">
          <img src={ARRANGEMENT_IMG.productA} alt="" loading="lazy" decoding="async" />
        </div>
        <span className="theme-item-display-card__delta">+12%</span>
        <p className="theme-item-display-card__label type-caption type-semibold mb-0">Ceramic vessel</p>
      </article>
    ),
  },
  {
    id: 'item-chip-strip',
    category: 'display',
    name: 'Chip strip',
    purpose: 'Horizontal scroll of mini item chips — snap points, hover lift, 4:3 thumbs.',
    reference: 'Mobile category carousel',
    stack: 'theme-item-display-chip-strip · scroll-snap · theme-item-display-card--chip',
    preview: (
      <div className="theme-item-display-chip-strip">
        {[
          { title: 'Mug', price: '$34', img: ARRANGEMENT_IMG.productC },
          { title: 'Vase', price: '$58', img: ARRANGEMENT_IMG.productA },
          { title: 'Throw', price: '$120', img: ARRANGEMENT_IMG.productB },
          { title: 'Tray', price: '$42', img: ARRANGEMENT_IMG.editorial },
        ].map((item) => (
          <article
            key={item.title}
            className="theme-item-display-card theme-item-display-card--chip theme-card-arrangement"
          >
            <div className="theme-item-display-card__media">
              <img src={item.img} alt="" loading="lazy" decoding="async" />
            </div>
            <div className="theme-item-display-card__body">
              <p className="type-caption type-semibold mb-0 truncate">{item.title}</p>
              <p className="type-caption type-tabular type-muted mb-0">{item.price}</p>
            </div>
          </article>
        ))}
      </div>
    ),
  },
  {
    id: 'item-duo-stack',
    category: 'display',
    name: 'Duo stack',
    purpose: 'Pair suggestion — two rotated cards overlapping for depth; front card leads.',
    reference: 'Complete the look / bundle pair',
    stack: 'theme-item-display-duo · rotate ±2° · absolute back card',
    preview: (
      <div className="theme-item-display-duo">
        {[
          { title: 'Coat', price: '$248', img: ARRANGEMENT_IMG.productB },
          { title: 'Scarf', price: '$68', img: ARRANGEMENT_IMG.productC },
        ].map((item) => (
          <article
            key={item.title}
            className="theme-item-display-card theme-item-display-card--duo theme-card-arrangement"
          >
            <div className="theme-item-display-card__media">
              <img src={item.img} alt="" loading="lazy" decoding="async" />
            </div>
            <div className="theme-item-display-card__body">
              <p className="type-body-sm type-semibold mb-0">{item.title}</p>
              <p className="type-caption type-tabular type-muted mb-0">{item.price}</p>
            </div>
          </article>
        ))}
      </div>
    ),
  },
  {
    id: 'item-catalog-tile',
    category: 'catalog',
    name: 'Catalog tile',
    purpose: 'Minimal grid cell — square media, title, tabular price; dense 2–4 column grids.',
    reference: 'Marketplace micro tile',
    stack: 'Card flat · ArrangementMedia aspect-square · p-3 · type-body-sm · type-caption price',
    preview: (
      <Card variant="flat" className="theme-card-arrangement max-w-[11rem] overflow-hidden p-0">
        <ArrangementMedia src={ARRANGEMENT_IMG.productC} className="aspect-square" scrim="edge" />
        <div className="space-y-1 px-3 py-3">
          <p className="type-body-sm type-semibold mb-0 line-clamp-2">Stoneware mug</p>
          <p className="type-caption type-tabular type-muted mb-0">$34</p>
        </div>
      </Card>
    ),
  },
  {
    id: 'item-cart-line',
    category: 'cart',
    name: 'Cart line',
    purpose: 'Checkout row — fixed thumb, spec column, qty control, trailing total.',
    reference: 'ref.data-card-2 — checkout qty row',
    stack: 'Card outline · grid [thumb|copy|qty|price] · aspect-square 5rem · tabular qty · total',
    preview: (
      <Card variant="outline" className="theme-card-arrangement max-w-lg overflow-hidden p-0">
        <div className="grid grid-cols-[5rem_minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-3">
          <ArrangementMedia src={ARRANGEMENT_IMG.productA} className="aspect-square rounded-md" scrim="none" />
          <div className="min-w-0 space-y-0.5">
            <p className="type-body-sm type-semibold mb-0 truncate">Ceramic vessel</p>
            <p className="type-caption type-muted mb-0">Natural · 400ml</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="xxs" aria-label="Decrease quantity">
              −
            </Button>
            <span className="type-caption type-tabular type-semibold min-w-[1.25rem] text-center">2</span>
            <Button variant="outline" size="xxs" aria-label="Increase quantity">
              +
            </Button>
          </div>
          <p className="type-body-sm type-tabular type-semibold mb-0">$68</p>
        </div>
      </Card>
    ),
  },
  {
    id: 'item-feed-row',
    category: 'list',
    name: 'Feed row',
    purpose: 'Dense notification-style row — small round thumb, primary + meta, trailing chevron space.',
    reference: 'ref.data-card-3 — activity feed rows',
    stack: 'Card ghost · flex gap-3 py-2.5 · round thumb 2.75rem · type-body-sm · type-caption meta',
    preview: (
      <Card variant="ghost" className="theme-card-arrangement max-w-md p-0">
        <div className="flex items-center gap-3 border-b px-1 py-2.5 last:border-b-0">
          <ArrangementMedia
            src={ARRANGEMENT_IMG.productB}
            className="size-11 shrink-0 rounded-full"
            scrim="none"
          />
          <div className="min-w-0 flex-1">
            <p className="type-body-sm type-semibold mb-0 truncate">Order shipped</p>
            <p className="type-caption type-muted mb-0">Linen coat · arrives Thu</p>
          </div>
          <span className="type-caption type-faint shrink-0">2h</span>
        </div>
        <div className="flex items-center gap-3 border-b px-1 py-2.5 last:border-b-0">
          <ArrangementMedia
            src={ARRANGEMENT_IMG.productC}
            className="size-11 shrink-0 rounded-full"
            scrim="none"
          />
          <div className="min-w-0 flex-1">
            <p className="type-body-sm type-semibold mb-0 truncate">Back in stock</p>
            <p className="type-caption type-muted mb-0">Wool throw · ivory</p>
          </div>
          <span className="type-caption type-faint shrink-0">1d</span>
        </div>
      </Card>
    ),
  },
  {
    id: 'item-image-picker-rail',
    category: 'picker',
    name: 'Image picker rail',
    purpose:
      'Mini vertical + horizontal thumb rails beside a preview — compact enough for cards or gallery companions.',
    reference: 'ref.image-carousel-10 — ImagePickerCarousel live port',
    stack:
      'ImagePickerCarousel sm · axis vertical|horizontal · theme-image-picker-carousel.css · Card outline shell',
    preview: <ItemImagePickerCardPreview />,
  },
  {
    id: 'item-picker-card',
    category: 'picker',
    name: 'Picker card',
    purpose: 'Selectable item shell — accent ring when active, thumb + label + optional badge.',
    reference: 'ref.data-card-4 — SKU picker stack',
    stack: 'Card outline active:border-accent · flex gap-3 p-3 · thumb · label · Tag sm',
    preview: (
      <div className="flex max-w-md flex-col gap-3">
        <Card variant="outline" className="theme-card-arrangement ring-2 ring-[var(--theme-accent)] p-0">
          <div className="flex items-center gap-3 p-3">
            <ArrangementMedia src={ARRANGEMENT_IMG.productA} className="size-14 rounded-md" scrim="none" />
            <div className="min-w-0 flex-1">
              <p className="type-body-sm type-semibold mb-0">Standard kit</p>
              <p className="type-caption type-muted mb-0">Ships in 3–5 days</p>
            </div>
            <span className="type-caption type-tabular type-semibold mb-0">$48</span>
          </div>
        </Card>
        <Card variant="outline" className="theme-card-arrangement p-0">
          <div className="flex items-center gap-3 p-3">
            <ArrangementMedia src={ARRANGEMENT_IMG.productC} className="size-14 rounded-md" scrim="none" />
            <div className="min-w-0 flex-1">
              <p className="type-body-sm type-semibold mb-0">Express kit</p>
              <p className="type-caption type-muted mb-0">Next-day delivery</p>
            </div>
            <span className="type-caption type-tabular type-semibold mb-0">$72</span>
          </div>
        </Card>
      </div>
    ),
  },
]
