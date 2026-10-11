/**
 * Model viewer Ref column: locator beside Home, not a Place-tool click.
 * Model switch reseats Home in the same click (not useEffect after first paint).
 * Run: node front_end/src/components/webglToolkit/WebglAssetLoader.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./WebglAssetLoader.tsx', import.meta.url)), 'utf8')

assert.match(src, /<AboutUsWordmark/)
assert.match(src, /<ProjectsWordmark/)
assert.match(src, /assetId === 'projects-letters'/)
assert.match(src, /label="Path"/)
assert.match(src, /Copy point/)
assert.match(src, /Capture camera/)
assert.match(src, /<ReferencePointer/)
assert.match(src, /referencePointerHome/)
assert.match(src, /serializeReferencePointer/)
assert.match(src, /homeViewPose\(marks\)\.target/)
assert.match(src, /orbitEnabled=\{orbitEnabled && !locatorDragging\}/)
assert.match(
  src,
  /<AnnotationMarkers\s+annotations=\{kind === 'splat' \? annotations\.filter\(\(mark\) => mark\.kind !== 'viewpoint'\) : annotations\}/,
  'a splat does not draw its Home dot in the middle of the view',
)
assert.match(src, /tag="item"/)
assert.match(src, /serializeReferencePointer\(\{ position: locatorPos, rotation: locatorRot \}, 'item'\)/)
assert.doesNotMatch(
  src,
  /from '\.\.\/\.\.\/lib\/webgl\/runtime\/helpers\/referencePointer'/,
  'negative: a helpers/referencePointer.ts sibling steals ReferencePointer.tsx on Windows',
)
assert.doesNotMatch(src, /setLocatorTag/, 'negative: the viewer tag is always item, not a scene/item toggle')
assert.doesNotMatch(
  src,
  /TransformControls/,
  'negative: the viewer locator is PivotControls in ReferencePointer, not a TransformControls overlay here',
)

assert.match(src, /const selectAsset = useCallback/)
assert.match(src, /onSelect=\{selectAsset\}/)
assert.match(src, /<Fragment key=\{`\$\{assetId\}-camera`\}>\s*<CameraRig/)
assert.match(src, /<GltfSubject\s+key=\{assetId\}/)
assert.match(src, /<ViewpointFly key=\{assetId\}/)
assert.match(src, /setFlyPose\(home\)/)
assert.match(src, /setOpeningPose\(home\)/)
assert.doesNotMatch(
  src,
  /onSelect=\{setAssetId\}/,
  'negative: setAssetId alone paints the next glTF with the previous Home',
)
assert.doesNotMatch(
  src,
  /<Fragment key=\{kind\}>/,
  'negative: OrbitRig/CameraRig keyed only by kind reuse damping across glTFs',
)
assert.doesNotMatch(
  src,
  /useEffect\(\(\) => \{\s*const loaded = loadMarks\(assetId\)/,
  'negative: pose reset in useEffect([assetId]) seats last Home on the first frame after switch',
)

console.log('WebglAssetLoader: ok')
