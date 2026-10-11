export type DocArticleTocLevel = 2 | 3 | 4

export type DocArticleTocEntry = {
  id: string
  label: string
  level: DocArticleTocLevel
  element: HTMLElement | null
  order: number
}

export type DocArticleTocNode = DocArticleTocEntry & {
  children: DocArticleTocNode[]
}

export type DocArticleTocVariant = 'list' | 'sticky-anchor' | 'micro-anchor'

export type DocArticleSectionKind =
  | 'heading'
  | 'paragraph'
  | 'richText'
  | 'image'
  | 'figure'
  | 'link'
  | 'divider'
  | 'list'
  | 'quote'
  | 'callout'
  | 'table'
  | 'layout'
  | 'aside'
  | 'stats'
  | 'sectionBreak'
  | 'custom'

export type DocArticleRegisterTocInput = {
  id: string
  label: string
  level: DocArticleTocLevel
  element: HTMLElement | null
}

export type DocArticleSectionMeta = {
  id: string
  label?: string
  tags?: readonly string[]
  kind: DocArticleSectionKind
  element: HTMLElement | null
}

export type DocArticleMeta = {
  title: string
  slug?: string
  kicker?: string
  byline?: string
  publishedAt?: string
}

export type DocArticleRegisterInput = {
  id: string
  label?: string
  tags?: readonly string[]
  kind: DocArticleSectionKind
  element: HTMLElement | null
}

const SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export function isValidDocArticleSectionId(id: string): boolean {
  return SLUG_PATTERN.test(id)
}

export const DOC_ARTICLE_SECTION_KINDS: readonly {
  kind: DocArticleSectionKind
  label: string
  description: string
}[] = [
  { kind: 'heading', label: 'Heading', description: 'Section titles with anchor links (h2/h3).' },
  { kind: 'paragraph', label: 'Paragraph', description: 'Body and lead copy blocks.' },
  { kind: 'link', label: 'Link', description: 'External URLs or internal sectionRef jumps.' },
  { kind: 'image', label: 'Image', description: 'Cover figure with optional caption.' },
  { kind: 'divider', label: 'Divider', description: 'Horizontal or labeled section breaks.' },
  { kind: 'list', label: 'List', description: 'Bullet, ordered, or checked lists.' },
  { kind: 'quote', label: 'Quote', description: 'Blockquote and pull-quote layouts.' },
  { kind: 'callout', label: 'Callout', description: 'Aside / note surface card.' },
  { kind: 'table', label: 'Table', description: 'Static prose table (not DataTable).' },
  { kind: 'layout', label: 'Layout', description: 'Wireframe arrangements — sidebar, split, float, columns.' },
  { kind: 'aside', label: 'Aside', description: 'Sidebar rail — TOC, notes, related links.' },
  { kind: 'stats', label: 'Stats', description: 'KPI row — proof-stats-row wireframe pattern.' },
  { kind: 'custom', label: 'Custom', description: 'Named section wrapper for composed content.' },
]
