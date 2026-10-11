/**
 * AssetBoundary fallback must stay Canvas-safe (no DOM nodes).
 * Run: node front_end/src/lib/webgl/runtime/assets/AssetBoundary.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

export function canvasSafeFallback(src) {
  return (
    /fallback !== undefined/.test(src) &&
    !/<p[\s>]/.test(src)
  )
}

const src = fs.readFileSync(fileURLToPath(new URL('./AssetBoundary.tsx', import.meta.url)), 'utf8')
assert.equal(canvasSafeFallback(src), true, 'AssetBoundary must not mount a DOM node inside Canvas')

const withDom = src.replace(
  /return this\.props\.fallback !== undefined \? this\.props\.fallback : null/,
  'return <p role="alert">{this.state.message}</p>',
)
assert.equal(canvasSafeFallback(withDom), false, 'negative: a DOM <p> fallback must fail')

console.log('AssetBoundary: ok')
