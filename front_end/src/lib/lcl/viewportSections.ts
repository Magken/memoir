/**
 * LCL viewport section paint — 8×8 (64) cells on a 16:9 PC screen.
 * Copy payload is `lcl-viewport-sections`. Not a four-quadrant split.
 */

export const LCL_VIEWPORT_SECTIONS_KIND = 'lcl-viewport-sections'
export const LCL_GRID_COLS = 8
export const LCL_GRID_ROWS = 8
export const LCL_GRID_CELLS = LCL_GRID_COLS * LCL_GRID_ROWS

export type LclCell = {
  col: number
  row: number
}

/** Bounding box in viewport fractions (0–1). Source of truth for a block is still `cells`. */
export type LclViewportBounds = {
  x: number
  y: number
  w: number
  h: number
}

export type LclViewportSection = {
  id: string
  label: string
  cells: LclCell[]
  bounds: LclViewportBounds
}

export type LclViewportSectionsPayload = {
  kind: typeof LCL_VIEWPORT_SECTIONS_KIND
  cols: number
  rows: number
  sections: LclViewportSection[]
}

export function cellKey(col: number, row: number): string {
  return `${col},${row}`
}

export function parseCellKey(key: string): LclCell | null {
  const [colRaw, rowRaw] = key.split(',')
  const col = Number(colRaw)
  const row = Number(rowRaw)
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null
  return { col, row }
}

export function isInGrid(cell: LclCell, cols = LCL_GRID_COLS, rows = LCL_GRID_ROWS): boolean {
  return cell.col >= 0 && cell.row >= 0 && cell.col < cols && cell.row < rows
}

export function boundsFromCells(
  cells: readonly LclCell[],
  cols = LCL_GRID_COLS,
  rows = LCL_GRID_ROWS,
): LclViewportBounds {
  if (!cells.length) return { x: 0, y: 0, w: 0, h: 0 }
  let minC = cols
  let minR = rows
  let maxC = -1
  let maxR = -1
  for (const cell of cells) {
    minC = Math.min(minC, cell.col)
    minR = Math.min(minR, cell.row)
    maxC = Math.max(maxC, cell.col)
    maxR = Math.max(maxR, cell.row)
  }
  return {
    x: minC / cols,
    y: minR / rows,
    w: (maxC - minC + 1) / cols,
    h: (maxR - minR + 1) / rows,
  }
}

export function sectionFromCells(
  id: string,
  label: string,
  cells: readonly LclCell[],
  cols = LCL_GRID_COLS,
  rows = LCL_GRID_ROWS,
): LclViewportSection {
  const unique = new Map<string, LclCell>()
  for (const cell of cells) {
    if (!isInGrid(cell, cols, rows)) continue
    unique.set(cellKey(cell.col, cell.row), { col: cell.col, row: cell.row })
  }
  const packed = [...unique.values()].sort((a, b) => a.row - b.row || a.col - b.col)
  return { id, label, cells: packed, bounds: boundsFromCells(packed, cols, rows) }
}

/** Inclusive rectangle of cells. `col`/`row` are the origin; `width`/`height` count cells. */
export function cellsRect(col: number, row: number, width: number, height: number): LclCell[] {
  const cells: LclCell[] = []
  for (let r = row; r < row + height; r += 1) {
    for (let c = col; c < col + width; c += 1) {
      cells.push({ col: c, row: r })
    }
  }
  return cells
}

/** True when two sections share a cell. */
export function lclSectionsOverlap(payload: LclViewportSectionsPayload): boolean {
  const seen = new Set<string>()
  for (const section of payload.sections) {
    for (const cell of section.cells) {
      const key = cellKey(cell.col, cell.row)
      if (seen.has(key)) return true
      seen.add(key)
    }
  }
  return false
}

/** 1-based CSS grid line box that covers the painted cells’ bounding rectangle. */
export function gridPlacementFromCells(cells: readonly LclCell[]): {
  columnStart: number
  columnEnd: number
  rowStart: number
  rowEnd: number
} | null {
  if (!cells.length) return null
  let minC = Infinity
  let minR = Infinity
  let maxC = -Infinity
  let maxR = -Infinity
  for (const cell of cells) {
    minC = Math.min(minC, cell.col)
    minR = Math.min(minR, cell.row)
    maxC = Math.max(maxC, cell.col)
    maxR = Math.max(maxR, cell.row)
  }
  return {
    columnStart: minC + 1,
    columnEnd: maxC + 2,
    rowStart: minR + 1,
    rowEnd: maxR + 2,
  }
}

export function serializeLclViewportSections(payload: LclViewportSectionsPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`
}

export function parseLclViewportSections(raw: unknown): LclViewportSectionsPayload | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'sections must be an object' }
  const row = raw as Record<string, unknown>
  if (row.kind !== LCL_VIEWPORT_SECTIONS_KIND) {
    return { error: 'kind must be lcl-viewport-sections' }
  }
  const cols = row.cols
  const rows = row.rows
  if (cols !== LCL_GRID_COLS || rows !== LCL_GRID_ROWS) {
    return { error: `grid must be ${LCL_GRID_COLS}×${LCL_GRID_ROWS}` }
  }
  if (!Array.isArray(row.sections)) return { error: 'sections must be an array' }
  const sections: LclViewportSection[] = []
  const seen = new Set<string>()
  for (const item of row.sections) {
    if (!item || typeof item !== 'object') return { error: 'section must be an object' }
    const next = item as Record<string, unknown>
    if (typeof next.id !== 'string' || !next.id.trim()) return { error: 'section.id is required' }
    if (seen.has(next.id)) return { error: `duplicate section id ${next.id}` }
    seen.add(next.id)
    if (typeof next.label !== 'string' || !next.label.trim()) return { error: 'section.label is required' }
    if (!Array.isArray(next.cells) || next.cells.length < 1) {
      return { error: 'section.cells must have at least one cell' }
    }
    const cells: LclCell[] = []
    for (const cellRaw of next.cells) {
      if (!cellRaw || typeof cellRaw !== 'object') return { error: 'cell must be an object' }
      const cell = cellRaw as Record<string, unknown>
      if (!Number.isInteger(cell.col) || !Number.isInteger(cell.row)) {
        return { error: 'cell needs integer col and row' }
      }
      const packed = { col: cell.col as number, row: cell.row as number }
      if (!isInGrid(packed, cols, rows)) return { error: 'cell is outside the grid' }
      cells.push(packed)
    }
    sections.push(sectionFromCells(next.id, next.label, cells, cols, rows))
  }
  return { kind: LCL_VIEWPORT_SECTIONS_KIND, cols, rows, sections }
}

/** Painted s1 (cols 3–7, rows 5–7), s2 (cols 0–2, rows 0–1), s3 text-steps (cols 5–7, rows 0–3). */
export const LCL_PREVIEW_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('s1', 'Section 1', [
      { col: 3, row: 5 },
      { col: 4, row: 5 },
      { col: 5, row: 5 },
      { col: 6, row: 5 },
      { col: 7, row: 5 },
      { col: 3, row: 6 },
      { col: 4, row: 6 },
      { col: 5, row: 6 },
      { col: 6, row: 6 },
      { col: 7, row: 6 },
      { col: 3, row: 7 },
      { col: 4, row: 7 },
      { col: 5, row: 7 },
      { col: 6, row: 7 },
      { col: 7, row: 7 },
    ]),
    sectionFromCells('s2', 'Section 2', [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
      { col: 2, row: 1 },
    ]),
    sectionFromCells('s3', 'Section 3', [
      { col: 5, row: 0 },
      { col: 6, row: 0 },
      { col: 7, row: 0 },
      { col: 5, row: 1 },
      { col: 6, row: 1 },
      { col: 7, row: 1 },
      { col: 5, row: 2 },
      { col: 6, row: 2 },
      { col: 7, row: 2 },
      { col: 5, row: 3 },
      { col: 6, row: 3 },
      { col: 7, row: 3 },
    ]),
  ],
}

/** Landing load overlay — one display area, rows 3–4, cols 2–5. */
/** Memoir home — one centered 4×6 window; everything outside is glass over the scene. */
export const LCL_MEMOIR_FRAME_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('s1', 'Section 1', cellsRect(2, 1, 4, 6)),
    sectionFromCells('s2', 'Object', cellsRect(0, 1, 2, 3)),
    sectionFromCells('s3', 'Dot Pad', cellsRect(0, 4, 2, 3)),
    sectionFromCells('s4', 'Screenshot', cellsRect(6, 1, 2, 3)),
    sectionFromCells('s5', 'Description', cellsRect(6, 4, 2, 3)),
  ],
}

/** Up to four strips (top, bottom, left, right) that cover the grid outside `cells`' rectangle. */
export function cellsOutside(
  cells: readonly LclCell[],
  cols = LCL_GRID_COLS,
  rows = LCL_GRID_ROWS,
): { id: 'top' | 'bottom' | 'left' | 'right'; cells: LclCell[] }[] {
  if (!cells.length) return [{ id: 'top', cells: cellsRect(0, 0, cols, rows) }]
  const minC = Math.min(...cells.map((cell) => cell.col))
  const maxC = Math.max(...cells.map((cell) => cell.col))
  const minR = Math.min(...cells.map((cell) => cell.row))
  const maxR = Math.max(...cells.map((cell) => cell.row))
  const strips = [
    { id: 'top' as const, cells: cellsRect(0, 0, cols, minR) },
    { id: 'bottom' as const, cells: cellsRect(0, maxR + 1, cols, rows - maxR - 1) },
    { id: 'left' as const, cells: cellsRect(0, minR, minC, maxR - minR + 1) },
    { id: 'right' as const, cells: cellsRect(maxC + 1, minR, cols - maxC - 1, maxR - minR + 1) },
  ]
  return strips.filter((strip) => strip.cells.length > 0)
}

export const LCL_LANDING_LOAD_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('s1', 'Section 1', [
      { col: 2, row: 3 },
      { col: 3, row: 3 },
      { col: 4, row: 3 },
      { col: 5, row: 3 },
      { col: 2, row: 4 },
      { col: 3, row: 4 },
      { col: 4, row: 4 },
      { col: 5, row: 4 },
    ]),
  ],
}

/**
 * About Home (stage 1). Tall left display (s1) for flipped type; s2 top-right
 * collective intro, hairline breadcrumb, and navigable area list.
 * Left is wider and full-height so large sideways type fits. Right is tall
 * enough for intro + four list rows.
 */
export const LCL_ABOUT_HOME_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('s1', 'Section 1', [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
      { col: 2, row: 1 },
      { col: 0, row: 2 },
      { col: 1, row: 2 },
      { col: 2, row: 2 },
      { col: 0, row: 3 },
      { col: 1, row: 3 },
      { col: 2, row: 3 },
      { col: 0, row: 4 },
      { col: 1, row: 4 },
      { col: 2, row: 4 },
      { col: 0, row: 5 },
      { col: 1, row: 5 },
      { col: 2, row: 5 },
      { col: 0, row: 6 },
      { col: 1, row: 6 },
      { col: 2, row: 6 },
      { col: 0, row: 7 },
      { col: 1, row: 7 },
      { col: 2, row: 7 },
    ]),
    sectionFromCells('s2', 'Section 2', [
      { col: 5, row: 0 },
      { col: 6, row: 0 },
      { col: 7, row: 0 },
      { col: 5, row: 1 },
      { col: 6, row: 1 },
      { col: 7, row: 1 },
      { col: 5, row: 2 },
      { col: 6, row: 2 },
      { col: 7, row: 2 },
      { col: 5, row: 3 },
      { col: 6, row: 3 },
      { col: 7, row: 3 },
      { col: 5, row: 4 },
      { col: 6, row: 4 },
      { col: 7, row: 4 },
      { col: 5, row: 5 },
      { col: 6, row: 5 },
      { col: 7, row: 5 },
    ]),
  ],
}

/**
 * About Text canvas (stage 2). Left s1 matches stage 1 so the sideways title
 * strip does not jump. s2 is the center text tile (cols 2–4, rows 1–4):
 * one column closer to the title, same height as before.
 */
const aboutWorkTextCells: LclCell[] = []
for (let row = 1; row <= 4; row += 1) {
  for (let col = 2; col <= 4; col += 1) aboutWorkTextCells.push({ col, row })
}

export const LCL_ABOUT_WORK_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('s1', 'Section 1', LCL_ABOUT_HOME_FIXTURE.sections[0]?.cells ?? []),
    sectionFromCells('s2', 'Section 2', aboutWorkTextCells),
  ],
}

/**
 * About Text inset (stage 3). s1 is the top-right title (cols 3–7, rows 0–2).
 * s2 is the center note (cols 2–4, rows 3–6).
 */
const aboutCollabTitleCells: LclCell[] = []
for (let row = 0; row <= 2; row += 1) {
  for (let col = 3; col <= 7; col += 1) aboutCollabTitleCells.push({ col, row })
}
const aboutCollabContentCells: LclCell[] = []
for (let row = 3; row <= 6; row += 1) {
  for (let col = 2; col <= 4; col += 1) aboutCollabContentCells.push({ col, row })
}

export const LCL_ABOUT_COLLAB_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('s1', 'Section 1', aboutCollabTitleCells),
    sectionFromCells('s2', 'Section 2', aboutCollabContentCells),
  ],
}

/**
 * Projects on `/`. Catalog tile (cols 5–7, rows 1–5).
 */
const projectsSoonCells: LclCell[] = []
for (let row = 1; row <= 5; row += 1) {
  for (let col = 5; col <= 7; col += 1) projectsSoonCells.push({ col, row })
}

export const LCL_PROJECTS_SOON_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [sectionFromCells('s1', 'Section 1', projectsSoonCells)],
}

/**
 * Projects detail on `/` text canvas.
 * s1 title: cols 1–5, rows 0–1. s2 body: cols 2–4, rows 3–5.
 */
const projectsDetailTitleCells: LclCell[] = []
for (let row = 0; row <= 1; row += 1) {
  for (let col = 1; col <= 5; col += 1) projectsDetailTitleCells.push({ col, row })
}
const projectsDetailBodyCells: LclCell[] = []
for (let row = 3; row <= 5; row += 1) {
  for (let col = 2; col <= 4; col += 1) projectsDetailBodyCells.push({ col, row })
}

export const LCL_PROJECTS_DETAIL_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('s1', 'Section 1', projectsDetailTitleCells),
    sectionFromCells('s2', 'Section 2', projectsDetailBodyCells),
  ],
}

/**
 * Footer on `/`. Links on col 3, rows 2–5. Mark on cols 5–7, rows 6–7.
 */
const footerLinkCells: LclCell[] = []
for (let row = 2; row <= 5; row += 1) footerLinkCells.push({ col: 3, row })

const footerMarkCells: LclCell[] = []
for (let row = 6; row <= 7; row += 1) {
  for (let col = 5; col <= 7; col += 1) footerMarkCells.push({ col, row })
}

export const LCL_FOOTER_LINKS_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('s1', 'Section 1', footerLinkCells),
    sectionFromCells('s2', 'Section 2', footerMarkCells),
  ],
}

/** Ledger toolkit layout: head, table, stats, note. */
export const LCL_LEDGER_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('head', 'Head', cellsRect(0, 0, 4, 2)),
    sectionFromCells('table', 'Table', cellsRect(0, 2, 6, 6)),
    sectionFromCells('stats', 'Stats', cellsRect(6, 0, 2, 4)),
    sectionFromCells('note', 'Note', cellsRect(6, 4, 2, 4)),
  ],
}

/** Reel toolkit layout: head, series list, hero, thumb strip. */
export const LCL_REEL_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('head', 'Head', cellsRect(0, 0, 3, 2)),
    sectionFromCells('series', 'Series', cellsRect(0, 2, 3, 6)),
    sectionFromCells('hero', 'Hero', cellsRect(3, 0, 5, 6)),
    sectionFromCells('strip', 'Strip', cellsRect(3, 6, 5, 2)),
  ],
}

/** Atlas toolkit layout: head, note, hover columns, index, stage, timeline. */
export const LCL_ATLAS_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('head', 'Head', cellsRect(0, 0, 4, 2)),
    sectionFromCells('note', 'Note', cellsRect(4, 0, 4, 2)),
    sectionFromCells('columns', 'Columns', cellsRect(0, 2, 8, 4)),
    sectionFromCells('index', 'Index', cellsRect(0, 6, 3, 2)),
    sectionFromCells('stage', 'Stage', cellsRect(3, 6, 3, 2)),
    sectionFromCells('timeline', 'Timeline', cellsRect(6, 6, 2, 2)),
  ],
}

/** Type toolkit layout: head, specimens list, stage. */
export const LCL_TYPE_FIXTURE: LclViewportSectionsPayload = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [
    sectionFromCells('head', 'Head', cellsRect(0, 0, 3, 2)),
    sectionFromCells('specimens', 'Specimens', cellsRect(0, 2, 3, 6)),
    sectionFromCells('stage', 'Stage', cellsRect(3, 0, 5, 8)),
  ],
}
