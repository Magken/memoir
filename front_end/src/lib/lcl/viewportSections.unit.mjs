/**
 * LCL viewport paint is 64 cells; copy payload names sections as viewport fractions.
 * Run: npx tsx front_end/src/lib/lcl/viewportSections.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  LCL_GRID_CELLS,
  LCL_GRID_COLS,
  LCL_GRID_ROWS,
  LCL_ABOUT_HOME_FIXTURE,
  LCL_ABOUT_WORK_FIXTURE,
  LCL_ABOUT_COLLAB_FIXTURE,
  LCL_PROJECTS_SOON_FIXTURE,
  LCL_PROJECTS_DETAIL_FIXTURE,
  LCL_FOOTER_LINKS_FIXTURE,
  LCL_LANDING_LOAD_FIXTURE,
  LCL_LEDGER_FIXTURE,
  LCL_REEL_FIXTURE,
  LCL_ATLAS_FIXTURE,
  LCL_TYPE_FIXTURE,
  LCL_PREVIEW_FIXTURE,
  LCL_VIEWPORT_SECTIONS_KIND,
  boundsFromCells,
  gridPlacementFromCells,
  parseLclViewportSections,
  sectionFromCells,
  serializeLclViewportSections,
  lclSectionsOverlap,
} from './viewportSections.ts'

assert.equal(LCL_GRID_COLS, 8)
assert.equal(LCL_GRID_ROWS, 8)
assert.equal(LCL_GRID_CELLS, 64)
assert.notEqual(LCL_GRID_CELLS, 4, 'negative: LCL is not a four-quadrant split')
assert.notEqual(LCL_GRID_COLS * LCL_GRID_ROWS, 32, 'negative: resolution is 64, not 32')

const topLeft = boundsFromCells(
  [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ],
)
assert.deepEqual(topLeft, { x: 0, y: 0, w: 0.25, h: 0.25 })

const empty = boundsFromCells([])
assert.deepEqual(empty, { x: 0, y: 0, w: 0, h: 0 })

const section = sectionFromCells('s1', 'Section 1', [
  { col: 7, row: 7 },
  { col: 7, row: 7 },
  { col: 99, row: 0 },
])
assert.deepEqual(section.cells, [{ col: 7, row: 7 }])
assert.deepEqual(section.bounds, { x: 0.875, y: 0.875, w: 0.125, h: 0.125 })

const json = serializeLclViewportSections({
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: LCL_GRID_COLS,
  rows: LCL_GRID_ROWS,
  sections: [section],
})
assert.match(json, /lcl-viewport-sections/)
const parsed = parseLclViewportSections(JSON.parse(json))
assert.ok(!('error' in parsed))
if (!('error' in parsed)) {
  assert.equal(parsed.sections[0]?.id, 's1')
  assert.deepEqual(parsed.sections[0]?.bounds, section.bounds)
}

const four = parseLclViewportSections({
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: 2,
  rows: 2,
  sections: [],
})
assert.ok('error' in four)
assert.match('error' in four ? four.error : '', /8×8/)

const wrongKind = parseLclViewportSections({ kind: 'quadrants', cols: 8, rows: 8, sections: [] })
assert.ok('error' in wrongKind)
assert.match('error' in wrongKind ? wrongKind.error : '', /lcl-viewport-sections/)

assert.equal(LCL_PREVIEW_FIXTURE.sections.length, 3)
assert.equal(LCL_PREVIEW_FIXTURE.sections[0]?.id, 's1')
assert.equal(LCL_PREVIEW_FIXTURE.sections[1]?.id, 's2')
assert.equal(LCL_PREVIEW_FIXTURE.sections[2]?.id, 's3')
assert.deepEqual(LCL_PREVIEW_FIXTURE.sections[0]?.bounds, { x: 0.375, y: 0.625, w: 0.625, h: 0.375 })
assert.deepEqual(LCL_PREVIEW_FIXTURE.sections[1]?.bounds, { x: 0, y: 0, w: 0.375, h: 0.25 })
assert.deepEqual(LCL_PREVIEW_FIXTURE.sections[2]?.bounds, { x: 0.625, y: 0, w: 0.375, h: 0.5 })
assert.deepEqual(gridPlacementFromCells(LCL_PREVIEW_FIXTURE.sections[0]?.cells ?? []), {
  columnStart: 4,
  columnEnd: 9,
  rowStart: 6,
  rowEnd: 9,
})
assert.deepEqual(gridPlacementFromCells(LCL_PREVIEW_FIXTURE.sections[1]?.cells ?? []), {
  columnStart: 1,
  columnEnd: 4,
  rowStart: 1,
  rowEnd: 3,
})
assert.deepEqual(gridPlacementFromCells(LCL_PREVIEW_FIXTURE.sections[2]?.cells ?? []), {
  columnStart: 6,
  columnEnd: 9,
  rowStart: 1,
  rowEnd: 5,
})
assert.notDeepEqual(
  LCL_PREVIEW_FIXTURE.sections[0]?.bounds,
  { x: 0, y: 0, w: 0.375, h: 0.375 },
  'negative: s1 is no longer the old top-left 3×3',
)
assert.equal(gridPlacementFromCells([]), null)
assert.equal(LCL_LANDING_LOAD_FIXTURE.sections.length, 1)
assert.deepEqual(LCL_LANDING_LOAD_FIXTURE.sections[0]?.bounds, {
  x: 0.25,
  y: 0.375,
  w: 0.5,
  h: 0.25,
})
assert.deepEqual(gridPlacementFromCells(LCL_LANDING_LOAD_FIXTURE.sections[0]?.cells ?? []), {
  columnStart: 3,
  columnEnd: 7,
  rowStart: 4,
  rowEnd: 6,
})
assert.notEqual(
  LCL_LANDING_LOAD_FIXTURE.sections.length,
  2,
  'negative: the word and the percent are not two cells',
)
assert.equal(LCL_ABOUT_HOME_FIXTURE.sections.length, 2)
assert.deepEqual(LCL_ABOUT_HOME_FIXTURE.sections[0]?.bounds, {
  x: 0,
  y: 0,
  w: 0.375,
  h: 1,
})
assert.deepEqual(LCL_ABOUT_HOME_FIXTURE.sections[1]?.bounds, {
  x: 0.625,
  y: 0,
  w: 0.375,
  h: 0.75,
})
assert.notEqual(
  LCL_ABOUT_HOME_FIXTURE.sections[1]?.bounds.h,
  0.375,
  'negative: About Home s2 must not keep the short three-row reserve',
)
assert.notEqual(
  LCL_ABOUT_HOME_FIXTURE.sections[0]?.bounds.w,
  0.25,
  'negative: About Home left must not keep the narrow two-column strip',
)
assert.equal(LCL_ABOUT_WORK_FIXTURE.sections.length, 2)
assert.deepEqual(
  LCL_ABOUT_WORK_FIXTURE.sections[0]?.bounds,
  LCL_ABOUT_HOME_FIXTURE.sections[0]?.bounds,
)
assert.deepEqual(LCL_ABOUT_WORK_FIXTURE.sections[1]?.bounds, {
  x: 0.25,
  y: 0.125,
  w: 0.375,
  h: 0.5,
})
assert.notEqual(
  LCL_ABOUT_WORK_FIXTURE.sections[1]?.bounds.x,
  0.375,
  'negative: the text tile must sit closer to the title than the old center start',
)
assert.notEqual(
  LCL_ABOUT_WORK_FIXTURE.sections[1]?.bounds.h,
  0.125,
  'negative: raising the text must not squash it into the one-row start band',
)
assert.notEqual(
  LCL_ABOUT_WORK_FIXTURE.sections[1]?.bounds.y,
  0.25,
  'negative: the text tile must not stay on the lower start row',
)
assert.notEqual(
  LCL_ABOUT_WORK_FIXTURE.sections[0]?.bounds.w,
  0.25,
  'negative: How we work left must match stage 1, not the narrow two-column strip',
)
assert.notEqual(
  LCL_ABOUT_WORK_FIXTURE.sections[1]?.bounds.x,
  LCL_ABOUT_HOME_FIXTURE.sections[1]?.bounds.x,
  'negative: How we work text is centered, not the stage-1 top-right panel',
)
assert.deepEqual(LCL_ABOUT_COLLAB_FIXTURE.sections[0]?.bounds, {
  x: 0.375,
  y: 0,
  w: 0.625,
  h: 0.375,
})
assert.deepEqual(LCL_ABOUT_COLLAB_FIXTURE.sections[1]?.bounds, {
  x: 0.25,
  y: 0.375,
  w: 0.375,
  h: 0.5,
})
assert.equal(LCL_ABOUT_COLLAB_FIXTURE.sections[0]?.id, 's1')
assert.equal(LCL_ABOUT_COLLAB_FIXTURE.sections[1]?.id, 's2')
assert.notEqual(
  LCL_ABOUT_COLLAB_FIXTURE.sections[0]?.bounds.y,
  0.375,
  'negative: Collaborate with us title is the top band, not the center note',
)
assert.deepEqual(LCL_PROJECTS_SOON_FIXTURE.sections[0]?.bounds, {
  x: 0.625,
  y: 0.125,
  w: 0.375,
  h: 0.625,
})
assert.equal(LCL_PROJECTS_SOON_FIXTURE.sections.length, 1)
assert.equal(LCL_PROJECTS_SOON_FIXTURE.sections[0]?.id, 's1')
assert.notEqual(
  LCL_PROJECTS_SOON_FIXTURE.sections[0]?.bounds.h,
  0.375,
  'negative: Projects catalog tile is rows 1–5, not the old Coming soon band',
)
assert.equal(LCL_PROJECTS_DETAIL_FIXTURE.sections.length, 2)
assert.equal(LCL_PROJECTS_DETAIL_FIXTURE.sections[0]?.id, 's1')
assert.equal(LCL_PROJECTS_DETAIL_FIXTURE.sections[1]?.id, 's2')
assert.deepEqual(LCL_PROJECTS_DETAIL_FIXTURE.sections[0]?.bounds, {
  x: 0.125,
  y: 0,
  w: 0.625,
  h: 0.25,
})
assert.deepEqual(LCL_PROJECTS_DETAIL_FIXTURE.sections[1]?.bounds, {
  x: 0.25,
  y: 0.375,
  w: 0.375,
  h: 0.375,
})
assert.notEqual(
  LCL_PROJECTS_DETAIL_FIXTURE.sections[0]?.bounds.y,
  0.375,
  'negative: detail title is the top band, not the body panel',
)
assert.deepEqual(LCL_FOOTER_LINKS_FIXTURE.sections[0]?.bounds, {
  x: 0.375,
  y: 0.25,
  w: 0.125,
  h: 0.5,
})
assert.notEqual(
  LCL_FOOTER_LINKS_FIXTURE.sections[0]?.bounds.w,
  0.375,
  'negative: the link tile is one column, not the wide block',
)
assert.deepEqual(LCL_FOOTER_LINKS_FIXTURE.sections[1]?.bounds, {
  x: 0.625,
  y: 0.75,
  w: 0.375,
  h: 0.25,
})
assert.equal(LCL_FOOTER_LINKS_FIXTURE.sections.length, 2)
assert.equal(LCL_FOOTER_LINKS_FIXTURE.sections[0]?.id, 's1')
assert.equal(LCL_FOOTER_LINKS_FIXTURE.sections[1]?.id, 's2')
assert.notEqual(
  LCL_FOOTER_LINKS_FIXTURE.sections[1]?.bounds.y,
  0,
  'negative: the GRAS mark sits on the bottom band, not the top',
)
const previewParsed = parseLclViewportSections(JSON.parse(serializeLclViewportSections(LCL_PREVIEW_FIXTURE)))
assert.ok(!('error' in previewParsed), 'negative: the preview fixture must parse')

assert.equal(LCL_LEDGER_FIXTURE.sections.length, 4)
assert.equal(lclSectionsOverlap(LCL_LEDGER_FIXTURE), false)
assert.equal(LCL_REEL_FIXTURE.sections.length, 4)
assert.equal(lclSectionsOverlap(LCL_REEL_FIXTURE), false)
assert.equal(LCL_ATLAS_FIXTURE.sections.length, 6)
assert.equal(lclSectionsOverlap(LCL_ATLAS_FIXTURE), false)
assert.equal(LCL_TYPE_FIXTURE.sections.length, 3)
assert.equal(lclSectionsOverlap(LCL_TYPE_FIXTURE), false)
assert.equal(LCL_LEDGER_FIXTURE.sections[0]?.id, 'head')
assert.equal(LCL_LEDGER_FIXTURE.sections[1]?.id, 'table')
const clash = {
  kind: LCL_VIEWPORT_SECTIONS_KIND,
  cols: 8,
  rows: 8,
  sections: [
    sectionFromCells('a', 'A', [{ col: 0, row: 0 }]),
    sectionFromCells('b', 'B', [{ col: 0, row: 0 }]),
  ],
}
assert.equal(lclSectionsOverlap(clash), true, 'negative: overlapping sections fail')

console.log('viewportSections: ok')
