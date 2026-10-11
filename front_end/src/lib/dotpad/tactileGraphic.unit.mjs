/**
 * Dot Pad X tactile graphic: outline pins and the 30×10-cell hex.
 * Run: npx tsx front_end/src/lib/dotpad/tactileGraphic.unit.mjs
 */
import assert from 'node:assert/strict'
import { DOTPAD_DOT_COLUMNS, DOTPAD_DOT_ROWS, graphicHex, outlineDots } from './tactileGraphic.ts'

assert.equal(DOTPAD_DOT_COLUMNS, 60)
assert.equal(DOTPAD_DOT_ROWS, 40)

const W = DOTPAD_DOT_COLUMNS
const H = DOTPAD_DOT_ROWS
const image = new Uint8ClampedArray(W * H * 4)
for (let y = 10; y < 30; y += 1) for (let x = 20; x < 40; x += 1) image[(y * W + x) * 4 + 3] = 255

const dots = outlineDots(image)
assert.equal(dots[10 * W + 20], 1, 'corner of the square is raised')
assert.equal(dots[10 * W + 30], 1, 'top edge is raised')
assert.equal(dots[20 * W + 30], 0, 'negative: the inside stays flat — outline, not fill')
assert.equal(dots[5 * W + 5], 0, 'negative: empty background stays flat')
assert.equal(dots.reduce((a, b) => a + b, 0), 20 * 4 - 4, 'only the square perimeter is raised')
assert.throws(() => outlineDots(new Uint8ClampedArray(10)), /Bad image size/)

const hex = graphicHex(new Uint8Array(W * H))
assert.equal(hex.length, 30 * 10 * 2, 'one byte per cell over 30×10 cells')
assert.match(hex, /^(00)+$/)

const one = new Uint8Array(W * H)
one[0] = 1
one[3 * W + 1] = 1
assert.equal(graphicHex(one).slice(0, 2), '81', 'left top pin is bit 0, right bottom pin is bit 7')
const second = new Uint8Array(W * H)
second[4 * W + 0] = 1
assert.equal(graphicHex(second).slice(60, 62), '01', 'pin row 4 starts the second cell row')
assert.equal(graphicHex(second).slice(0, 2), '00', 'negative: it does not leak into the first cell row')
assert.throws(() => graphicHex(new Uint8Array(5)), /Bad graphic size/)

console.log('tactileGraphic: ok')
