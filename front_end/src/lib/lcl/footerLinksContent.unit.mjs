/**
 * Footer link copy. Run: npx tsx front_end/src/lib/lcl/footerLinksContent.unit.mjs
 */
import assert from 'node:assert/strict'
import { FOOTER_COPYRIGHT, FOOTER_HOME_LABEL, FOOTER_LINKS, FOOTER_MARK } from './footerLinksContent.ts'

assert.equal(FOOTER_HOME_LABEL, 'home')
assert.equal(FOOTER_MARK, 'GRAS')
assert.equal(FOOTER_COPYRIGHT, '© 2026')
assert.notEqual(FOOTER_MARK, FOOTER_COPYRIGHT, 'negative: the year is not the wordmark')
assert.deepEqual(
  FOOTER_LINKS.map((link) => link.label),
  ['who are we ?', 'how we work', 'Collaborate with us', 'Projects'],
)
assert.equal(FOOTER_LINKS.some((link) => link.id === 'home'), false, 'negative: home is the subtitle, not a link')
assert.doesNotMatch(
  FOOTER_LINKS.map((link) => link.label).join(' '),
  /\u2014|\u2013/,
  'negative: reader copy has no em or en dash',
)

console.log('footerLinksContent: ok')
