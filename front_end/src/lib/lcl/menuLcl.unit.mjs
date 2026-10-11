/**
 * Menu LCL helpers: lamp intensity → 0 (fast), RGB −150. No focal Distance / orbit dolly.
 * Run: npx tsx front_end/src/lib/lcl/menuLcl.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  MENU_LCL_OBJECT_COLOR_DIM,
  MENU_LCL_QUICK_LINKS,
  MENU_LCL_RETREAT_DURATION,
  MENU_LCL_RETREAT_MAX,
  clampMenuRetreat,
  menuRetreatHex,
  menuRetreatIntensity,
} from './menuLcl.ts'

assert.equal(MENU_LCL_RETREAT_MAX, 1)
assert.equal(MENU_LCL_OBJECT_COLOR_DIM, 150)
assert.ok(MENU_LCL_RETREAT_DURATION > 0.22 && MENU_LCL_RETREAT_DURATION < 0.45)
assert.equal(clampMenuRetreat(2), 1)
assert.equal(clampMenuRetreat(-1), 0)
assert.equal(menuRetreatIntensity(0.05, 0), 0.05)
assert.equal(menuRetreatIntensity(0.05, 1), 0)
assert.equal(menuRetreatIntensity(0.05, 0.5), 0.025)
assert.equal(menuRetreatHex('#f2c48a', 0), '#f2c48a')
assert.equal(menuRetreatHex('#f2c48a', 1), '#5c2e00')
assert.deepEqual(
  MENU_LCL_QUICK_LINKS.map((link) => link.id),
  ['who', 'projects'],
)
assert.doesNotMatch(
  String(MENU_LCL_OBJECT_COLOR_DIM),
  /^160$/,
  'negative: menu dim is 150, not the hover cage dim of 160',
)

console.log('menuLcl: ok')
