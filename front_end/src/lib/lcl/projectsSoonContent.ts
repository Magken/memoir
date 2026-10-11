/**
 * Projects catalog fixtures for `/` Projects LCL.
 * Access kinds map to Lucide icons (git · npm · pip · website).
 */

export type ProjectAccessKind = 'git' | 'npm' | 'pip' | 'website'

export type ProjectCatalogRow = {
  id: string
  name: string
  /** Short blurb; UI truncates with ellipsis. */
  desc: string
  access: readonly ProjectAccessKind[]
}

/** Page size for load-on-scroll. */
export const PROJECTS_CATALOG_PAGE = 8

/** Fixture rows — filter by name/desc locally. */
export const PROJECTS_CATALOG_FIXTURES: readonly ProjectCatalogRow[] = [
  {
    id: 'gras-to-text',
    name: 'gras_to_text',
    desc: 'Measure and steer prose toward a reading profile.',
    access: ['git', 'npm'],
  },
  {
    id: 'wire-cage',
    name: 'Wire cage',
    desc: 'Ceramic pulse lamps and crest-following lighting for product scenes.',
    access: ['git'],
  },
  {
    id: 'lcl-layout',
    name: 'LCL layout',
    desc: '8×8 viewport tiles, hairline enter, nest lists, and prose clip.',
    access: ['git', 'website'],
  },
  {
    id: 'scene-player',
    name: 'Scene player',
    desc: 'One canvas boom-arc crane with ACM lock for landing wheels.',
    access: ['git'],
  },
  {
    id: 'menu-lcl',
    name: 'Menu LCL',
    desc: 'Home Menu chrome with lamp intensity retreat and Quick access.',
    access: ['git', 'website'],
  },
  {
    id: 'gras-search',
    name: 'Gras search',
    desc: 'Floating label search with a thicken underline on focus.',
    access: ['npm'],
  },
  {
    id: 'pip-bridge',
    name: 'pip bridge',
    desc: 'Thin Python tooling shim for local research scripts.',
    access: ['pip', 'git'],
  },
  {
    id: 'docs-site',
    name: 'Docs site',
    desc: 'Public memoir and package index for published projects.',
    access: ['website', 'git'],
  },
  {
    id: 'atlas-preview',
    name: 'Atlas preview',
    desc: 'Toolkit atlas layout with media frames and nest dives.',
    access: ['git'],
  },
  {
    id: 'ledger-preview',
    name: 'Ledger preview',
    desc: 'Index table that drills into a media frame and breadcrumb.',
    access: ['git', 'website'],
  },
  {
    id: 'reel-preview',
    name: 'Reel preview',
    desc: 'Horizontal reel of LCL frames with orientation-matched enter.',
    access: ['git'],
  },
  {
    id: 'type-preview',
    name: 'Type preview',
    desc: 'Display face samples over the painted viewport grid.',
    access: ['website'],
  },
  {
    id: 'flame-ink',
    name: 'Flame ink',
    desc: 'Warm ink wash hover for GRAS wordmarks and titles.',
    access: ['git', 'npm'],
  },
  {
    id: 'stroke-icons',
    name: 'Stroke icons',
    desc: 'Checkbox SVG stroke-dash hamburger that morphs to an X.',
    access: ['git'],
  },
  {
    id: 'scroll-clouds',
    name: 'Scroll clouds',
    desc: 'Vanishing edge masks for overflowing ThemeScroll viewports.',
    access: ['git'],
  },
  {
    id: 'data-grid',
    name: 'Data grid',
    desc: 'Fixture grid chrome for dense tabular project lists.',
    access: ['npm', 'website'],
  },
]

/** Case-insensitive name/desc filter, optional access-kind toggles (OR when any active). */
export function filterProjectsCatalog(
  rows: readonly ProjectCatalogRow[],
  query: string,
  access: readonly ProjectAccessKind[] = [],
): ProjectCatalogRow[] {
  const q = query.trim().toLowerCase()
  let next = q
    ? rows.filter(
        (row) => row.name.toLowerCase().includes(q) || row.desc.toLowerCase().includes(q),
      )
    : [...rows]
  if (access.length > 0) {
    next = next.filter((row) => access.some((kind) => row.access.includes(kind)))
  }
  return next
}

/** Header filter toggles — three stack icons (git · npm · website). */
export const PROJECT_ACCESS_FILTERS = ['git', 'npm', 'website'] as const


/** Slice fixtures for infinite scroll pages. */
export function pageProjectsCatalog(
  rows: readonly ProjectCatalogRow[],
  page: number,
  pageSize = PROJECTS_CATALOG_PAGE,
): ProjectCatalogRow[] {
  const safePage = Math.max(1, Math.floor(page))
  const end = safePage * pageSize
  return rows.slice(0, end)
}
