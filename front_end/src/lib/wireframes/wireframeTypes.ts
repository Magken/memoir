export const WIREFRAME_SCOPES = [
  { value: 'all', label: 'All' },
  { value: 'page', label: 'Page layouts' },
  { value: 'section', label: 'Section frames' },
] as const

export type WireframeScope = (typeof WIREFRAME_SCOPES)[number]['value']

export const WIREFRAME_PAGE_CATEGORIES = [
  { value: 'page-shell', label: 'Page shells' },
  { value: 'marketing', label: 'Marketing pages' },
  { value: 'content', label: 'Content & blog' },
  { value: 'app', label: 'App & dashboard' },
  { value: 'commerce', label: 'Commerce' },
] as const

export const WIREFRAME_SECTION_CATEGORIES = [
  { value: 'section-hero', label: 'Hero' },
  { value: 'section-cta', label: 'CTA' },
  { value: 'section-features', label: 'Features' },
  { value: 'section-proof', label: 'Social proof' },
  { value: 'section-nav', label: 'Header & nav' },
  { value: 'section-footer', label: 'Footer' },
  { value: 'section-content', label: 'Content blocks' },
  { value: 'section-forms', label: 'Forms' },
  { value: 'section-stats', label: 'Stats & data' },
  { value: 'section-doc', label: 'Doc & editor' },
] as const

export const WIREFRAME_CATEGORIES = [
  { value: 'all', label: 'All categories' },
  ...WIREFRAME_PAGE_CATEGORIES,
  ...WIREFRAME_SECTION_CATEGORIES,
] as const

export type WireframePageCategory = (typeof WIREFRAME_PAGE_CATEGORIES)[number]['value']
export type WireframeSectionCategory = (typeof WIREFRAME_SECTION_CATEGORIES)[number]['value']
export type WireframeCategory = WireframePageCategory | WireframeSectionCategory

export type WireframeBlockTone =
  | 'nav'
  | 'hero'
  | 'main'
  | 'aside'
  | 'footer'
  | 'media'
  | 'cta'
  | 'card'
  | 'muted'
  | 'stat'
  | 'quote'
  | 'logo'
  | 'form'
  | 'list'
  | 'badge'
  | 'editor'
  | 'source'
  | 'preview'

export type WireframeMicroBlockDef = {
  label: string
  tone?: WireframeBlockTone
}

export type WireframeMicroGrid = {
  columns: string
  rows?: string
  areas: readonly string[]
  blocks: Record<string, WireframeMicroBlockDef>
}

export type WireframeBlockDef = {
  label: string
  hint?: string
  tone?: WireframeBlockTone
  micro?: WireframeMicroGrid
}

export type WireframeFrame =
  | 'default'
  | 'section'
  | 'inset'
  | 'band'
  | 'full-bleed'
  | 'bento'
  | 'split'

export type WireframeLayout = {
  id: string
  name: string
  tier: 'page' | 'section'
  category: WireframeCategory
  purpose: string
  reference: string
  frame?: WireframeFrame
  /** Badge on section frames — e.g. Hero, CTA */
  sectionTag?: string
  columns: string
  rows?: string
  areas: readonly string[]
  blocks: Record<string, WireframeBlockDef>
}
