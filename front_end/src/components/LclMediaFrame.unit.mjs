/**
 * Media frame keeps the image class the motion helpers target.
 * Run: node front_end/src/components/LclMediaFrame.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./LclMediaFrame.tsx', import.meta.url)), 'utf8')
assert.match(src, /theme-lcl-media__img/)
assert.match(src, /showVideo && videoSrc/)
assert.doesNotMatch(src, /style=/, 'negative: no inline style on the frame')

console.log('LclMediaFrame: ok')
