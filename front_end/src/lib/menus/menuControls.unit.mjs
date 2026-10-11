/**
 * Detail rows widen the dropdown so two-line options do not stack into each other.
 * Run: npx tsx front_end/src/lib/menus/menuControls.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  MENU_DETAIL_PANEL_MIN_WIDTH_PX,
  menuPanelDisplayHeight,
  menuPanelMetrics,
  menuPanelWidthPx,
} from './menuControls.ts'

assert.equal(menuPanelWidthPx('compact'), menuPanelMetrics.compact.width)
assert.equal(menuPanelWidthPx('compact', true), MENU_DETAIL_PANEL_MIN_WIDTH_PX)
assert.ok(
  menuPanelWidthPx('compact', true) > menuPanelWidthPx('compact'),
  'detail menus must be wider than a one-line compact panel',
)
assert.equal(
  menuPanelWidthPx('compact', false),
  menuPanelMetrics.compact.width,
  'negative: a one-line menu keeps the compact width',
)

const oneLine = menuPanelDisplayHeight(5, 'compact')
const twoLine = menuPanelDisplayHeight(5, 'compact', true)
assert.ok(twoLine > oneLine, 'detail rows must grow the panel')
assert.equal(menuPanelDisplayHeight(5, 'compact', false), oneLine, 'negative: omitting detail keeps the short panel')

console.log('menuControls: ok')
