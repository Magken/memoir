/**
 * Collaborate with us copy. Run: npx tsx front_end/src/lib/lcl/aboutCollaborateContent.unit.mjs
 */
import assert from 'node:assert/strict'
import { ABOUT_COLLAB_DISPLAY, ABOUT_COLLAB_INTRO, ABOUT_COLLAB_SOON, aboutCollabTitleRows } from './aboutCollaborateContent.ts'

assert.equal(ABOUT_COLLAB_DISPLAY, 'Collaborate with us')
assert.deepEqual(aboutCollabTitleRows(), ['Collaborate', 'with us'])
assert.notEqual(aboutCollabTitleRows().length, 3, 'negative: the title is two rows, not three words')
assert.match(ABOUT_COLLAB_INTRO, /as simple as possible/)
assert.match(ABOUT_COLLAB_INTRO, /Propose projects/)
assert.match(ABOUT_COLLAB_INTRO, /together we explore/)
assert.equal(ABOUT_COLLAB_SOON, 'Coming soon')
assert.doesNotMatch(
  `${ABOUT_COLLAB_INTRO}\n${ABOUT_COLLAB_SOON}`,
  /\u2014|\u2013/,
  'negative: reader copy has no em or en dash',
)
assert.doesNotMatch(ABOUT_COLLAB_INTRO, /Coming soon/, 'negative: Coming soon is the list row, not the paragraph')
assert.doesNotMatch(ABOUT_COLLAB_INTRO, /students and peers/, 'negative: the old collaborate paragraph is gone')

console.log('aboutCollaborateContent: ok')
