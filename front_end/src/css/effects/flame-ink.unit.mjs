/**
 * Flame ink CSS — reusable host + data-ink seeds.
 * Run: node front_end/src/css/effects/flame-ink.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(dir, 'flame-ink.css'), 'utf8')

assert.match(css, /\.theme-flame-ink/)
assert.match(css, /--theme-flame-ink-gradient:/)
assert.match(css, /--theme-flame-ink-flame:\s*#b86a08/)
assert.match(css, /--theme-flame-ink-bright:\s*#ffc400/)
assert.match(css, /@keyframes theme-flame-ink-bloom-pulse/)
assert.match(css, /@keyframes theme-flame-ink-line-pulse/)
assert.match(css, /theme-ink-glow-fill/)
assert.match(css, /theme-border-glow-slide/)
assert.match(css, /background-clip:\s*text/)
assert.match(css, /\[data-ink='0'\]/)
assert.match(css, /\[data-ink='7'\]/)
assert.match(css, /theme-hairline-fx__pill/)
assert.match(css, /theme-flame-ink__line/)
assert.doesNotMatch(
  css,
  /filter:\s/,
  'negative: no filter / drop-shadow stack (clips as a square light)',
)
assert.doesNotMatch(
  css,
  /background-attachment:\s*fixed/,
  'negative: fixed attachment is not the reusable ink recipe',
)
assert.doesNotMatch(
  css,
  /theme-lcl-/,
  'negative: flame-ink is shared theme chrome, not LCL-scoped',
)

console.log('flame-ink: ok')
