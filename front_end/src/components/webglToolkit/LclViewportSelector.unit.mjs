/**
 * LCL selector paints 64 cells and copies lcl-viewport-sections.
 * Run: node front_end/src/components/webglToolkit/LclViewportSelector.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./LclViewportSelector.tsx', import.meta.url)), 'utf8')

assert.match(src, /export function LclViewportSelector/)
assert.match(src, /LCL_GRID_CELLS/)
assert.match(src, /serializeLclViewportSections/)
assert.match(src, /aria-label=\{copied \? 'Copied sections' : 'Copy sections'\}/)
assert.match(src, /aria-label="New section"/)
assert.match(src, /aria-label="Clear all"/)
assert.match(src, /function clearAll/)
assert.match(src, /function clearActive/)
assert.match(src, /setSections\(\[emptyDraft\(\)\]\)/)
assert.doesNotMatch(
  src,
  /function clearAll\(\) \{\s*clearActive/,
  'negative: Clear all must reset every section, not only the active one',
)
assert.match(src, /theme-lcl-selector__screen/)
assert.match(src, /role="grid"/)
assert.match(src, /LclSceneOverlay/)
assert.match(src, /WebglStage/)
assert.match(src, /SceneWorld/)
assert.match(src, /sceneId \? \(/)
assert.match(src, /orbitEnabled=\{false\}/)
assert.match(src, /lockPageScroll=\{false\}/)
assert.match(src, /sceneViewpointMarks/)
assert.match(src, /cameraMotions/)
assert.match(src, /RibbonCol label="Scene"/)
assert.match(src, /RibbonCol label="Tags"/)
assert.match(src, /RibbonCol label="Animations"/)
assert.match(src, /aria-label="LCL constructor"/)
assert.match(src, /LCL_SCENE_NONE/)
assert.doesNotMatch(src, /onSelectView/, 'negative: overlay tags must not steal paint from the grid')
assert.doesNotMatch(src, /style=/, 'negative: no inline style on the selector')
assert.doesNotMatch(
  src,
  /LCL_GRID_COLS = 2/,
  'negative: do not paint a four-quadrant screen',
)
assert.doesNotMatch(
  src,
  /<WebglStage[\s\S]*\/>\s*$/,
  'negative: Canvas must not be the whole LCL page — only the 16:9 overlay',
)

console.log('LclViewportSelector: ok')
