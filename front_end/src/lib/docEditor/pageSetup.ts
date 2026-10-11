/** Page layout presets — mirrors Lexical playground `PagesExtension/constants`. */

export type PageSize =
  | 'A3'
  | 'A4'
  | 'A5'
  | 'B4'
  | 'B5'
  | 'Executive'
  | 'Folio'
  | 'Legal'
  | 'Letter'
  | 'Statement'
  | 'Tabloid'

export type PageOrientation = 'portrait' | 'landscape'

export type PageSetup = {
  pageSize: PageSize | 'pageless'
  orientation: PageOrientation
  /** Margin in inches (all sides) — default matches playground Normal preset */
  marginInches: number
}

export const PAGE_SIZES: Record<
  PageSize,
  { width: number; height: number; label: string }
> = {
  A3: { height: 1587, label: 'A3 (11.69" × 16.54")', width: 1123 },
  A4: { height: 1123, label: 'A4 (8.27" × 11.69")', width: 794 },
  A5: { height: 794, label: 'A5 (5.83" × 8.27")', width: 559 },
  B4: { height: 1334, label: 'B4 (9.84" × 13.90")', width: 945 },
  B5: { height: 945, label: 'B5 (6.93" × 9.84")', width: 665 },
  Executive: { height: 1008, label: 'Executive (7.25" × 10.5")', width: 696 },
  Folio: { height: 1248, label: 'Folio (8.5" × 13")', width: 816 },
  Legal: { height: 1344, label: 'Legal (8.5" × 14")', width: 816 },
  Letter: { height: 1056, label: 'Letter (8.5" × 11")', width: 816 },
  Statement: { height: 816, label: 'Statement (5.5" × 8.5")', width: 528 },
  Tabloid: { height: 1632, label: 'Tabloid (11" × 17")', width: 1056 },
}

/** Playground toolbar order */
export const PAGE_SIZE_ORDER: readonly PageSize[] = [
  'A4',
  'Letter',
  'Legal',
  'Tabloid',
  'A3',
  'A5',
  'B4',
  'B5',
  'Statement',
  'Executive',
  'Folio',
]

export const DEFAULT_PAGE_SETUP: PageSetup = {
  marginInches: 0.4,
  orientation: 'portrait',
  pageSize: 'A4',
}

export const PAGE_SIZE_MENU_ITEMS = [
  { id: 'pageless', label: 'Pageless' },
  ...PAGE_SIZE_ORDER.map((size) => ({
    id: size,
    label: PAGE_SIZES[size].label,
  })),
] as const

/** Toolbar page picker — pageless hidden until layout is stable */
export const PAGE_SIZE_TOOLBAR_ITEMS = PAGE_SIZE_ORDER.map((size) => ({
  id: size,
  label: PAGE_SIZES[size].label,
}))

export function pageSizeTriggerLabel(pageSize: PageSetup['pageSize']): string {
  if (pageSize === 'pageless') return 'Pageless'
  return pageSize
}

const DPI = 96

export function pageMarginPx(marginInches: number): number {
  return Math.round(marginInches * DPI)
}

export function resolvePageDimensions(setup: PageSetup): {
  width: number
  height: number
  margin: number
} | null {
  if (setup.pageSize === 'pageless') return null
  const spec = PAGE_SIZES[setup.pageSize]
  const portraitWidth = spec.width
  const portraitHeight = spec.height
  const width = setup.orientation === 'landscape' ? portraitHeight : portraitWidth
  const height = setup.orientation === 'landscape' ? portraitWidth : portraitHeight
  return {
    width,
    height,
    margin: pageMarginPx(setup.marginInches),
  }
}
