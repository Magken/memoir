/**
 * Named fluid-motion tokens and recipes.
 * Run: node front_end/src/css/effects/fluid-motion.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(dir, 'fluid-motion.css'), 'utf8')

assert.match(css, /--theme-fluid-ease-in:\s*cubic-bezier\(0\.16, 1, 0\.3, 1\)/)
assert.match(css, /--theme-fluid-ease-out:\s*cubic-bezier\(0\.35, 0, 0, 1\)/)
assert.match(css, /theme-fluid-line__fill/)
assert.match(css, /theme-fluid-chars__fill/)
assert.match(css, /theme-fluid-roll/)
assert.match(css, /theme-fluid-media/)
assert.match(css, /--theme-fluid-cover-from/)
assert.match(css, /theme-fluid-flip/)
assert.match(css, /transform:\s*none/)
assert.doesNotMatch(css, /rotateX/, 'negative: not the TypeAnim flip preset')
assert.doesNotMatch(css, /translate3d\(0, 110%/, 'negative: curtain fills must be readable at rest')

console.log('fluid-motion: ok')
