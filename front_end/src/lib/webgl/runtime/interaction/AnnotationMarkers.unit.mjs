/**
 * Tiny pins, filled surface-offset highlight, thin region stroke, hover cursor.
 * Run: node front_end/src/lib/webgl/runtime/interaction/AnnotationMarkers.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./AnnotationMarkers.tsx', import.meta.url)), 'utf8')

assert.match(src, /function SurfaceCursor/)
assert.match(src, /circleGeometry/)
assert.match(src, /ringGeometry/)
assert.match(src, /SURFACE_LIFT/)
assert.match(src, /clampHighlightRadius/)
assert.match(src, /worldUnits=\{false\}/)
assert.match(src, /pointerEvents=\{onSelect \? 'auto' : 'none'\}/)
assert.match(src, /theme-webgl-toolkit__mark-label--pick/)
assert.match(src, /wrapperClass="theme-webgl-toolkit__mark-label-wrap"/)
assert.match(src, /occlude=\{false\}/)
assert.match(src, /onSelect\?: \(id: string\) => void/)
assert.match(src, /selectedId/)
assert.match(src, /stopPropagation/)
assert.match(src, /VIEW_HOME_MARK_ID/)
assert.doesNotMatch(
  src,
  /mark\.kind === 'viewpoint'[\s\S]{0,120}return null/,
  'negative: viewpoints must render and pick like other marks',
)
assert.doesNotMatch(src, /torusGeometry/, 'negative: highlight must not be a clipping torus')
assert.doesNotMatch(src, /distanceFactor=\{8\}/, 'negative: labels must not scale up with distanceFactor 8')
assert.doesNotMatch(src, /function LabelStem/, 'negative: placed marks must not carry a stem')
assert.match(src, /function RegionPatch/)
assert.doesNotMatch(
  src,
  /pointerEvents="auto"/,
  'negative: labels without onSelect must not steal the canvas',
)
assert.doesNotMatch(
  src,
  /draftRing\.map\(\(point/,
  'negative: a region stroke must not drop thick vertex spheres',
)

const draftBlock = src.slice(src.indexOf('{draftHighlight'), src.indexOf('{cursorHit'))
assert.match(draftBlock, /draftRing\.length > 1/)
assert.doesNotMatch(
  draftBlock,
  /RegionPatch/,
  'negative: a live lasso must not rebuild a filled fan on every sample',
)

const cursorBlock = src.slice(src.indexOf('function SurfaceCursor'), src.indexOf('export function AnnotationMarkers'))
assert.match(cursorBlock, /stemTip\(/, 'cursor must show the short normal tick')

console.log('AnnotationMarkers: ok')
