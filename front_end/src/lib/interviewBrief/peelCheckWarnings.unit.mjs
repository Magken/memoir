/**
 * Peel Check Suite must re-scan the live brief — a frozen getContext snapshot stays stale.
 * Run: node front_end/src/lib/interviewBrief/peelCheckWarnings.unit.mjs
 */
import assert from 'node:assert/strict'
import { emptyComposeMeta, emptyCreator2BriefDocument } from './compose.ts'
import {
  normalizePeelCheckWarnings,
  peelCheckWarningsFromContext,
  peelCheckWarningsFromDoc,
} from './peelCheckWarnings.ts'

const empty = emptyCreator2BriefDocument(emptyComposeMeta())

const missingTitle = structuredClone(empty)
missingTitle.definition.meta.title = ''
const first = peelCheckWarningsFromDoc(missingTitle)
assert.ok(first.some((w) => w.id === 'overview.missing_title'), 'empty title fires missing title')
assert.ok(first.some((w) => w.id === 'spine.empty'), 'empty board fires empty spine')

const filledTitle = structuredClone(missingTitle)
filledTitle.definition.meta.title = 'Staff loop'
const second = peelCheckWarningsFromDoc(filledTitle)
assert.ok(
  !second.some((w) => w.id === 'overview.missing_title'),
  're-scan after a title fill drops that warning',
)
assert.ok(
  first.some((w) => w.id === 'overview.missing_title'),
  'negative: the frozen first snapshot still claims missing title',
)
assert.notDeepEqual(
  first.map((w) => w.id).sort(),
  second.map((w) => w.id).sort(),
  'live scan after input must not equal the stale snapshot',
)

const ctx = {
  checkWarnings: second,
  body: empty,
}
assert.deepEqual(
  peelCheckWarningsFromContext(ctx).map((w) => w.id),
  second.map((w) => w.id),
  'context reader prefers checkWarnings over a stale body',
)
assert.deepEqual(
  peelCheckWarningsFromContext({ body: filledTitle }).map((w) => w.id),
  second.map((w) => w.id),
  'bot apply can scan the turn body when checkWarnings is omitted',
)
assert.deepEqual(
  peelCheckWarningsFromContext({ checkWarnings: [] }),
  [],
  'empty checkWarnings is takeable, not a fall-through rescan of body',
)

assert.deepEqual(
  normalizePeelCheckWarnings([{ id: 'overview.missing_title', short: 'No interview title' }]),
  [],
  'negative: incomplete rows never reach the peel',
)

console.log('peelCheckWarnings.unit.mjs: ok')
