/** Editorial layout catalog — ids align with [wireframeLayouts](../wireframes/wireframeLayouts.ts). */

export type DocArticleLayoutVariant =
  | 'single'
  | 'sidebar'
  | 'split'
  | 'two-column'
  | 'float-start'
  | 'float-end'

export const DOC_ARTICLE_LAYOUTS: readonly {
  variant: DocArticleLayoutVariant
  wireframeId: string
  name: string
  purpose: string
}[] = [
  {
    variant: 'single',
    wireframeId: 'blog-single',
    name: 'Single column',
    purpose: 'Narrow measure — title, body, author, related (long-form reading).',
  },
  {
    variant: 'sidebar',
    wireframeId: 'blog-sidebar',
    name: 'Main + sidebar',
    purpose: '2fr article · 1fr rail — TOC, newsletter, tags.',
  },
  {
    variant: 'split',
    wireframeId: 'hero-split-copy-media',
    name: 'Split copy / media',
    purpose: '50/50 — copy column beside hero image or illustration.',
  },
  {
    variant: 'two-column',
    wireframeId: 'magazine',
    name: 'Two-column prose',
    purpose: 'CSS columns for dense essay or newsletter body copy.',
  },
  {
    variant: 'float-start',
    wireframeId: 'features-alternating-rows',
    name: 'Float image (start)',
    purpose: 'Image left, body wraps — editorial feature row feel.',
  },
  {
    variant: 'float-end',
    wireframeId: 'features-alternating-rows',
    name: 'Float image (end)',
    purpose: 'Image right, body wraps — alternating row mirror.',
  },
]
