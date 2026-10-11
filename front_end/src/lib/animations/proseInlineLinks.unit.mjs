/**
 * Prose inline link class helpers.
 * Run: node front_end/src/lib/animations/proseInlineLinks.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  PROSE_INLINE_CLASS,
  PROSE_INLINE_LINK_CLASS,
  proseInlineLinkClass,
} from './proseInlineLinks.ts'

assert.equal(PROSE_INLINE_CLASS, 'theme-prose-inline')
assert.equal(proseInlineLinkClass('lg'), `${PROSE_INLINE_LINK_CLASS} ${PROSE_INLINE_LINK_CLASS}--lg`)
assert.equal(proseInlineLinkClass('sm'), `${PROSE_INLINE_LINK_CLASS} ${PROSE_INLINE_LINK_CLASS}--sm`)
assert.equal(proseInlineLinkClass(), `${PROSE_INLINE_LINK_CLASS} ${PROSE_INLINE_LINK_CLASS}--md`)
assert.doesNotMatch(proseInlineLinkClass('lg'), /font-size/, 'negative: size is a class, not inline style')

console.log('proseInlineLinks: ok')
