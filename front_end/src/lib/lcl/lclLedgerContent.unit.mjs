/**
 * Ledger sample rows are local, unique, and dash-free.
 * Run: npx tsx front_end/src/lib/lcl/lclLedgerContent.unit.mjs
 */
import assert from 'node:assert/strict'
import { LCL_LEDGER_ROWS } from './lclLedgerContent.ts'

const ids = LCL_LEDGER_ROWS.map((row) => row.id)
assert.equal(new Set(ids).size, ids.length)
assert.equal(LCL_LEDGER_ROWS.length, 6)
for (const row of LCL_LEDGER_ROWS) {
  assert.ok(row.views.length >= 2, `${row.id} needs at least two views`)
  assert.doesNotMatch(row.note, /[—–]/)
  for (const view of row.views) {
    assert.doesNotMatch(view.caption, /[—–]/)
    assert.ok(view.src.includes('assets/lcl/ledger') || view.src.endsWith('.svg'))
    assert.doesNotMatch(view.src, /^https?:/, 'negative: frames must not be hotlinked')
  }
}

console.log('lclLedgerContent: ok')
