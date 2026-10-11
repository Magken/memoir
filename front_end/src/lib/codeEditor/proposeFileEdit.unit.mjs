import assert from 'node:assert/strict'
import { capEditMemory, streamPrefixes, COPILOT_EDIT_MEMORY_CAP } from './proposeFileEdit.ts'

{
  assert.deepEqual(streamPrefixes('short', true), ['short'])
  const long = 'abcdefghijklmnopqrstuvwxyz0123456789MORE'.repeat(3)
  const prefixes = streamPrefixes(long, false)
  assert.ok(prefixes.length > 1)
  assert.equal(prefixes.at(-1), long)
}

{
  const rows = []
  let last = rows
  for (let i = 0; i < COPILOT_EDIT_MEMORY_CAP + 3; i += 1) {
    last = capEditMemory(last, {
      status: 'rejected',
      kind: 'coding',
      locus: `src/f${i}.py`,
      summary: `row ${i}`,
      at: i,
    })
  }
  assert.equal(last.length, COPILOT_EDIT_MEMORY_CAP)
  assert.equal(last[0].locus, 'src/f3.py')
}

console.log('proposeFileEdit: ok')
