/**
 * Ledger nest views use GrasUnderlineButton (shared hairline recipe).
 * Run: node front_end/src/components/webglToolkit/LclLedgerPreview.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./LclLedgerPreview.tsx', import.meta.url)), 'utf8')

assert.match(src, /export const LclLedgerPreview|export function LclLedgerPreview/)
assert.match(src, /GrasUnderlineButton/)
assert.match(src, /layout="nest"/)
assert.doesNotMatch(
  src,
  /className="theme-lcl-layout__nest-item/,
  'negative: nest rows use GrasUnderlineButton, not hand-rolled nest class strings',
)

console.log('LclLedgerPreview: ok')
