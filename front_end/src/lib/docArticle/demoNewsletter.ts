import { GALLERY_DEMO_IMAGES, galleryDemoImageSrc } from '../galleries/galleryDemoImages'

export const DOC_ARTICLE_DEMO_NEWSLETTER = {
  title: 'Field notes — spring editorial',
  slug: 'field-notes-spring',
  kicker: 'Newsletter · Issue 04',
  byline: 'Editorial team',
  publishedAt: '2026-06-28',
  heroImage: {
    src: galleryDemoImageSrc(GALLERY_DEMO_IMAGES[0]!.src, 1200),
    alt: GALLERY_DEMO_IMAGES[0]!.alt,
    caption: 'Cover — warm facades against an open sky.',
  },
  intro:
    'DocArticle composes in-page editorials with named sections, tags, and internal references. Each block registers with context so navigation, tables of contents, and cross-links stay in sync.',
  bodyLead:
    'Use section ids as stable anchors. Tags group blocks for filtered navigation — the demo table of contents reads directly from the registry.',
  callout:
    'Internal links call scrollToSection via context. External links open in a new tab with an icon affordance.',
  floatImage: {
    src: galleryDemoImageSrc(GALLERY_DEMO_IMAGES[1]!.src, 800),
    alt: GALLERY_DEMO_IMAGES[1]!.alt,
    caption: 'Detail — texture and light along the facade.',
  },
  splitImage: {
    src: galleryDemoImageSrc(GALLERY_DEMO_IMAGES[2]!.src, 900),
    alt: GALLERY_DEMO_IMAGES[2]!.alt,
    caption: 'Split layout — copy beside media (hero-split-copy-media).',
  },
  floatLead:
    'Feature rows in the wireframe catalog alternate image and copy. DocArticle mirrors that with float-start and float-end layouts so body text wraps naturally around a figure without bespoke markup.',
  columnsA:
    'Two-column prose suits dense essays and newsletter digests. CSS columns keep a single reading flow while doubling horizontal density on wide viewports — the magazine wireframe uses a similar modular grid for story cards.',
  columnsB:
    'On narrow screens columns collapse to a single measure so line length stays comfortable. Pair with type-body-sm for legible long-form copy at a slightly smaller scale than default theme body text.',
  quote:
    'Documents built into the site should feel like first-class pages — not pasted HTML with one-off styles.',
  quoteAttribution: 'Design systems note',
  tableCaption: 'Supported section kinds (v1)',
} as const
