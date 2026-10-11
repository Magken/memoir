/**
 * Space debug ships probe + align marker + shadow gizmos.
 * Run: node front_end/src/lib/webgl/runtime/space/SpaceDebug.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

export function spaceDebugSurface(src) {
  return {
    probe: /export function SpaceProbe/.test(src),
    marker: /export function SpaceAlignMarker/.test(src),
    shadow: /export function ShadowAlignGizmos/.test(src),
    percent: /alignPct = \[75, 50\]/.test(src),
  }
}

const src = fs.readFileSync(fileURLToPath(new URL('./SpaceDebug.tsx', import.meta.url)), 'utf8')
const surface = spaceDebugSurface(src)
assert.equal(surface.probe, true)
assert.equal(surface.marker, true)
assert.equal(surface.shadow, true)
assert.equal(surface.percent, true, 'default align is 75% × 50% viewport')

const stripped = src.replace(/export function SpaceProbe[\s\S]*?return null\s*\}/, '')
assert.equal(spaceDebugSurface(stripped).probe, false, 'negative: a debug overlay without SpaceProbe must fail')

console.log('SpaceDebug: ok')
