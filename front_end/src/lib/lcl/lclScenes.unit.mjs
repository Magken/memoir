/**
 * Named LCL scenes resolve to their cell payloads. Pages pick by id.
 * Run: npx tsx front_end/src/lib/lcl/lclScenes.unit.mjs
 */
import assert from 'node:assert/strict'
import { lclScene } from './lclScenes.ts'
import { LCL_LANDING_LOAD_FIXTURE, LCL_PREVIEW_FIXTURE } from './viewportSections.ts'

assert.equal(lclScene('loader'), LCL_LANDING_LOAD_FIXTURE)
assert.equal(lclScene('preview'), LCL_PREVIEW_FIXTURE)
assert.equal(lclScene('aboutHome').sections.length, 2)
assert.equal(lclScene('aboutWork').sections.length, 2)
assert.deepEqual(lclScene('aboutWork').sections[0]?.bounds, lclScene('aboutHome').sections[0]?.bounds)
assert.notEqual(lclScene('loader'), lclScene('preview'), 'negative: loader is not the preview scene')
assert.notEqual(lclScene('aboutHome'), lclScene('loader'), 'negative: About Home is not the load overlay')
assert.notEqual(lclScene('aboutWork'), lclScene('aboutHome'), 'negative: How we work is not the Home panel')
assert.equal(lclScene('aboutCollaborate').sections.length, 2)
assert.equal(lclScene('aboutCollaborate').sections[0]?.id, 's1')
assert.equal(lclScene('aboutCollaborate').sections[1]?.id, 's2')
assert.notEqual(
  lclScene('aboutCollaborate'),
  lclScene('aboutWork'),
  'negative: Collaborate with us is not the How we work panel',
)
assert.equal(lclScene('projectsSoon').sections.length, 1)
assert.equal(lclScene('projectsSoon').sections[0]?.id, 's1')
assert.notEqual(
  lclScene('projectsSoon'),
  lclScene('aboutCollaborate'),
  'negative: Projects is not the Collaborate panel',
)
assert.equal(lclScene('projectsDetail').sections.length, 2)
assert.equal(lclScene('projectsDetail').sections[0]?.id, 's1')
assert.equal(lclScene('projectsDetail').sections[1]?.id, 's2')
assert.notEqual(
  lclScene('projectsDetail'),
  lclScene('projectsSoon'),
  'negative: detail canvas is not the catalog tile',
)
assert.equal(lclScene('footerLinks').sections.length, 2)
assert.equal(lclScene('footerLinks').sections[0]?.id, 's1')
assert.equal(lclScene('footerLinks').sections[1]?.id, 's2')
assert.notEqual(
  lclScene('footerLinks').sections[1]?.bounds.x,
  lclScene('footerLinks').sections[0]?.bounds.x,
  'negative: the GRAS mark is not the link column',
)
assert.notEqual(lclScene('footerLinks'), lclScene('projectsSoon'), 'negative: Footer is not the Projects title')
assert.equal(lclScene('ledger').sections.length, 4)
assert.equal(lclScene('reel').sections.length, 4)
assert.equal(lclScene('atlas').sections.length, 6)
assert.equal(lclScene('type').sections.length, 3)
assert.notEqual(lclScene('ledger'), lclScene('preview'), 'negative: Ledger is not the reference preview')

console.log('lclScenes: ok')
