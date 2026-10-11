/**
 * LclTable modes: 4 columns at L0, 2 on drill, 1 at views. Leave order is stats first.
 * Run: npx tsx front_end/src/components/LclTable.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { LEDGER_LEAVE_KEYS } from '../lib/lcl/lclLedgerContent.ts'
import { lclSwap } from '../lib/lcl/lclChoreo.ts'

const src = fs.readFileSync(fileURLToPath(new URL('./LclTable.tsx', import.meta.url)), 'utf8')
assert.match(src, /mode: LclTableMode/)
assert.match(src, /columns\.map/)
assert.match(src, /<th/)
assert.match(src, /theme-lcl-table/)

const ledgerSrc = fs.readFileSync(
  fileURLToPath(new URL('./webglToolkit/LclLedgerPreview.tsx', import.meta.url)),
  'utf8',
)
assert.match(ledgerSrc, /INDEX_COLS[\s\S]*id: 'views'/)
assert.equal([...ledgerSrc.matchAll(/\{ id: '/g)].length >= 4, true)
assert.match(ledgerSrc, /DETAIL_COLS[\s\S]*id: 'value'/)
assert.match(ledgerSrc, /VIEW_COLS[\s\S]*id: 'view'/)
assert.match(ledgerSrc, /LclBreadcrumb/)
assert.match(ledgerSrc, /LclMediaFrame/)
assert.match(ledgerSrc, /data-split/)
assert.match(ledgerSrc, /rootLabel="Ledger"/)
assert.equal([...LEDGER_LEAVE_KEYS].join(), 'stats,tbody,thead,kicker,note')

let committed = false
const hang = {
  ready: Promise.resolve(),
  done: new Promise(() => {}),
}
const hung = lclSwap(
  {
    leave: [
      {
        key: 'stats',
        el: /** @type {HTMLElement} */ ({}),
        out: () => hang,
        in: () => hang,
      },
    ],
    commit: () => {
      committed = true
    },
    enter: () => [],
  },
  {},
)
await new Promise((resolve) => setTimeout(resolve, 30))
assert.equal(committed, false, 'negative: 4-column DOM stays mounted while stats leave never resolves done')
void hung

assert.doesNotMatch(src, /style=/, 'negative: table cells use classes')

console.log('LclTable: ok')
