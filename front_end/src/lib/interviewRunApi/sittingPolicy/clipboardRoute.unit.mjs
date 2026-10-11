/**
 * Sitting clipboard route — hash only, never text.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sittingPolicy/clipboardRoute.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  formatPasteRouteNote,
  hashClipboardText,
  peekClipboardBufferForTests,
  rememberSittingCopy,
  resetClipboardBuffer,
  routeSittingPaste,
} from './clipboardRoute.ts'

assert.equal(hashClipboardText('abc'), hashClipboardText('abc'))
assert.notEqual(hashClipboardText('abc'), hashClipboardText('abd'))

resetClipboardBuffer()
rememberSittingCopy('hello from chat', 'chat')
const buf = peekClipboardBufferForTests()
assert.ok(buf)
assert.equal(buf.chars, 15)
assert.equal(buf.hash, hashClipboardText('hello from chat'))
assert.equal(Object.hasOwn(buf, 'text'), false)

const internal = routeSittingPaste('hello from chat', 'editor')
assert.equal(internal.from, 'internal')
assert.equal(internal.srcSurface, 'chat')
assert.equal(internal.destSurface, 'editor')
assert.equal(internal.label, 'internal_assist_help')
assert.ok(!JSON.stringify(internal).includes('hello from chat'))

const external = routeSittingPaste('dumped from another tab onto this sitting editor', 'editor')
assert.equal(external.from, 'external')
assert.equal(external.label, 'external_dump')
assert.equal(external.srcSurface, undefined)

const small = routeSittingPaste('x', 'form')
assert.equal(small.from, 'external')
assert.equal(small.label, 'external_small')
assert.equal(small.chars, 1)

const note = formatPasteRouteNote(internal)
assert.match(note, /^internal\|chat->editor\|15\|internal_assist_help$/)
assert.ok(!note.includes('hello'))

resetClipboardBuffer()
console.log('ok — clipboardRoute')
