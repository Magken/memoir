/**
 * Memoir frame: the window is clear, everything outside is tinted glass.
 * Run: npx tsx front_end/src/css/effects/memoir-frame.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gridPlacementFromCells, cellsOutside, LCL_MEMOIR_FRAME_FIXTURE } from '../../lib/lcl/viewportSections.ts'

const dir = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(dir, 'memoir-frame.css'), 'utf8')
const index = readFileSync(join(dir, '..', 'index.css'), 'utf8')

assert.match(index, /@import '\.\/effects\/memoir-frame\.css';/)
assert.match(css, /\.theme-memoir-frame__glass\.theme-lcl-layout__tile \{[^}]*backdrop-filter:\s*blur/)
assert.match(css, /\.theme-memoir-frame__glass\.theme-lcl-layout__tile \{[^}]*background:\s*rgb\(/)
assert.doesNotMatch(
  css,
  /\.theme-memoir-frame__window\.theme-lcl-layout__tile \{[^}]*backdrop-filter/,
  'negative: the window shows the scene clear',
)
assert.match(css, /\.theme-memoir-frame\.theme-lcl-layout \{[^}]*pointer-events:\s*none/, 'the frame never blocks orbit')
assert.match(css, /\.theme-memoir-frame\.theme-lcl-layout \{[^}]*animation:\s*memoir-frame-in/, 'the glass animates in')
assert.match(css, /@keyframes memoir-frame-in \{\s*from \{\s*opacity:\s*0/)
assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]*theme-memoir-frame[\s\S]*animation:\s*none/)
const page = readFileSync(join(dir, '..', '..', 'pages', 'MemoirHomePage.tsx'), 'utf8')
assert.match(page, /\{loading \? null : <MemoirFrame side=\{side\} \/>\}/, 'the tint mounts only after the loader leaves')
assert.doesNotMatch(page, /^\s*<MemoirFrame \/>\s*$/m, 'negative: the tint is not under the loading screen')

const frame = LCL_MEMOIR_FRAME_FIXTURE.sections[0]
assert.deepEqual(frame.bounds, { x: 0.25, y: 0.125, w: 0.5, h: 0.75 }, 'the window is the centered half-width frame')
assert.deepEqual(gridPlacementFromCells(frame.cells), { columnStart: 3, columnEnd: 7, rowStart: 2, rowEnd: 8 })

const strips = cellsOutside(frame.cells)
assert.deepEqual(
  strips.map((strip) => [strip.id, gridPlacementFromCells(strip.cells)]),
  [
    ['top', { columnStart: 1, columnEnd: 9, rowStart: 1, rowEnd: 2 }],
    ['bottom', { columnStart: 1, columnEnd: 9, rowStart: 8, rowEnd: 9 }],
    ['left', { columnStart: 1, columnEnd: 3, rowStart: 2, rowEnd: 8 }],
    ['right', { columnStart: 7, columnEnd: 9, rowStart: 2, rowEnd: 8 }],
  ],
  'four glass strips tile exactly the area outside the window',
)
const covered = new Set(strips.flatMap((strip) => strip.cells.map((cell) => `${cell.col},${cell.row}`)))
for (const cell of frame.cells) assert.ok(!covered.has(`${cell.col},${cell.row}`), 'negative: no glass over the window')
assert.equal(covered.size + frame.cells.length, 64, 'window plus glass is the whole 8×8 page')
const [, objectPane, padPane] = LCL_MEMOIR_FRAME_FIXTURE.sections
assert.deepEqual(gridPlacementFromCells(objectPane.cells), { columnStart: 1, columnEnd: 3, rowStart: 2, rowEnd: 5 }, 'object window: top half of the left column')
assert.deepEqual(gridPlacementFromCells(padPane.cells), { columnStart: 1, columnEnd: 3, rowStart: 5, rowEnd: 8 }, 'Dot Pad window: bottom half')
for (const cell of [...objectPane.cells, ...padPane.cells]) {
  assert.ok(covered.has(`${cell.col},${cell.row}`), 'the side windows sit on the glass')
  assert.ok(!frame.cells.some((c) => c.col === cell.col && c.row === cell.row), 'negative: not over the clear window')
}
assert.match(page, /<MemoirSidePanes objectCells=\{objectPane\.cells\} padCells=\{padPane\.cells\} side=\{side\} \/>/)

assert.deepEqual(
  cellsOutside([{ col: 0, row: 0 }, { col: 7, row: 7 }]).length,
  0,
  'a full-page window leaves no glass',
)

console.log('memoir-frame: ok')
