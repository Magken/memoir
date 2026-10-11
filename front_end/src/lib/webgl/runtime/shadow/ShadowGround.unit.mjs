/**
 * ShadowGround is the editable catcher — meshStandardMaterial, not the grid.
 * Run: node front_end/src/lib/webgl/runtime/shadow/ShadowGround.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

export function shadowCatcher(src) {
  return {
    receives: /receiveShadow/.test(src),
    editable: /color\?: string/.test(src) && /opacity\?: number/.test(src) && /size\?: number/.test(src),
    standard: /<meshStandardMaterial[\s>]/.test(src),
    notShadowMat: !/<shadowMaterial[\s/>]/.test(src),
  }
}

const src = fs.readFileSync(fileURLToPath(new URL('./ShadowGround.tsx', import.meta.url)), 'utf8')
const catcher = shadowCatcher(src)
assert.equal(catcher.receives, true, 'ground must receiveShadow')
assert.equal(catcher.editable, true, 'ground must expose size, opacity, color')
assert.equal(catcher.standard, true, 'ground must use meshStandardMaterial so shadows land on an editable surface')
assert.equal(catcher.notShadowMat, true, 'shadowMaterial + grid at y=0 z-fights')

const ghost = src.replace(/<meshStandardMaterial[\s\S]*?\/>/, '<shadowMaterial transparent />').replace(/color\?: string/, '')
assert.equal(shadowCatcher(ghost).standard, false, 'negative: a shadowMaterial-only catcher must fail')
assert.equal(shadowCatcher(ghost).notShadowMat, false, 'negative: shadowMaterial must fail')

console.log('ShadowGround: ok')
