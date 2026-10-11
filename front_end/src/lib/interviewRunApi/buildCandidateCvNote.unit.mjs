/**
 * buildCandidateCvNote unit.
 * Run: npx tsx front_end/src/lib/interviewRunApi/buildCandidateCvNote.unit.mjs
 */
import assert from 'node:assert/strict'
import { buildCandidateCvNote, sampleCandidateCvNote } from './buildCandidateCvNote.ts'

const sample = sampleCandidateCvNote()
assert.equal(sample.hasCv, true)
assert.equal(sample.source, 'sample')
assert.equal(sample.preferredName, 'Jordan')
assert.ok(sample.displayName.includes('Jordan'))
assert.ok(/Northwind|checkout|popisnatch|API freeze/i.test(sample.note))
assert.ok(sample.rapportHook.includes('Northwind') || /Staff/i.test(sample.rapportHook))
assert.ok(sample.note.length <= 1000)
assert.ok(sample.note.length >= 80)

const empty = buildCandidateCvNote({ cv: { basics: {}, sections: [] }, useSampleFallback: false })
assert.equal(empty.hasCv, false)
assert.equal(empty.source, 'none')

const fallback = buildCandidateCvNote({ cv: null, useSampleFallback: true })
assert.equal(fallback.source, 'sample')
assert.ok(fallback.hasCv)

const live = buildCandidateCvNote({
  cv: {
    basics: {
      display_name: 'Alex Rivera',
      preferred_name: 'Alex',
      headline: 'Senior engineer',
      summary: 'Builds APIs.',
    },
    sections: [
      {
        kind: 'experience',
        sort_order: 0,
        items: [
          {
            org: 'Acme',
            title: 'Senior Engineer',
            bullets: ['Shipped billing v2 and cut chargebacks 8%.'],
          },
        ],
      },
    ],
  },
  useSampleFallback: false,
})
assert.equal(live.source, 'live')
assert.equal(live.preferredName, 'Alex')
assert.ok(live.note.includes('Acme') || live.note.includes('billing'))

console.log('buildCandidateCvNote: ok')
