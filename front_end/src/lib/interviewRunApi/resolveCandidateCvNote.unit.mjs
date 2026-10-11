/**
 * resolveCandidateCvNote — sample fallback without loading cvApi/pdfjs.
 * Run: npx tsx front_end/src/lib/interviewRunApi/resolveCandidateCvNote.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  clearCandidateCvNoteCache,
  resolveCandidateCvNote,
} from './resolveCandidateCvNote.ts'

clearCandidateCvNoteCache()
const a = await resolveCandidateCvNote('fixture:cv-resolve-a')
assert.equal(a.hasCv, true)
assert.equal(a.source, 'sample')
assert.ok(a.note.includes('Jordan') || a.preferredName === 'Jordan')
assert.ok(/Northwind|checkout|popisnatch/i.test(a.note))

const b = await resolveCandidateCvNote('fixture:cv-resolve-a')
assert.equal(b.note, a.note, 'cached per brief')

clearCandidateCvNoteCache()
const c = await resolveCandidateCvNote('fixture:cv-resolve-b')
assert.equal(c.source, 'sample')
assert.ok(c.hasCv)

console.log('resolveCandidateCvNote: ok')
