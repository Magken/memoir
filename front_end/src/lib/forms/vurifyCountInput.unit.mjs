/**
 * Count-field text parse — integer stays integer; weights keep a decimal.
 * Run: npx tsx front_end/src/lib/forms/vurifyCountInput.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  formatCountInputText,
  parseCountInput,
} from '../../components/VurifyCountInput.tsx'

{
  assert.equal(formatCountInputText('0.5'), '05')
  assert.equal(formatCountInputText('12a3'), '123')
  assert.equal(parseCountInput('0.5', false), null)
  assert.equal(parseCountInput('12', false), 12)
}

{
  assert.equal(formatCountInputText('0.5', 4, true), '0.5')
  assert.equal(formatCountInputText('0.55.1', 4, true), '0.551')
  assert.equal(formatCountInputText('.25', 4, true), '.25')
  assert.equal(parseCountInput('0.5', false, true), 0.5)
  assert.equal(parseCountInput('0.05', false, true), 0.05)
  assert.equal(parseCountInput('1', false, true), 1)
  assert.equal(parseCountInput('0.', false, true), null)
}

console.log('vurifyCountInput.unit.mjs ok')
