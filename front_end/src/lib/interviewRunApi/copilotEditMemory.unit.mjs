import assert from 'node:assert/strict'
import { capEditMemory, codingDiffIsNoop, codingPathsFromOps, memoryEntryFromOps, formatEditMemoryLine, opsForPath } from './copilotEditMemory.ts'

{
  const entry = memoryEntryFromOps({
    status: 'rejected',
    kind: 'coding',
    ops: [
      {
        op: 'line_hunk',
        path: 'src/helpers.py',
        start: 12,
        end: 11,
        text: 'def counter():\n    yield 1',
      },
    ],
  })
  assert.equal(entry.locus, 'src/helpers.py')
  assert.match(entry.summary, /counter|yield|def /)
  assert.equal(formatEditMemoryLine(entry), `${entry.status} · ${entry.locus} · ${entry.summary}`)
}

{
  const form = memoryEntryFromOps({
    status: 'applied',
    kind: 'form',
    ops: [{ op: 'set_response', questionId: 'q.work_auth', value: { optionId: 'yes' } }],
  })
  assert.equal(form.locus, 'q.work_auth')
  assert.match(form.summary, /set q\.work_auth/)
}

{
  const insert = memoryEntryFromOps({
    status: 'accepted',
    kind: 'doc',
    ops: [{ op: 'search_replace', old: 'helo\n', new: 'helo\nThe fox jumps.\n' }],
  })
  assert.match(insert.summary, /fox jumps/)
  assert.equal(insert.summary.includes('helo\nThe fox'), false)
}

{
  const capped = capEditMemory([], {
    status: 'accepted',
    kind: 'doc',
    locus: 'essay',
    summary: 'heading rewrite',
    at: 1,
  })
  assert.equal(capped.length, 1)
}

{
  const paths = codingPathsFromOps([
    { op: 'line_hunk', path: 'src/helpers.py', start: 1, end: 0, text: 'x' },
    { op: 'search_replace', path: 'src/solve.py', old: 'a', new: 'b' },
    { op: 'line_hunk', path: 'src/helpers.py', start: 4, end: 3, text: 'y' },
  ])
  assert.deepEqual(paths, ['src/helpers.py', 'src/solve.py'])
  const slice = opsForPath(
    [
      { op: 'line_hunk', path: 'src/helpers.py', start: 1, end: 0, text: 'x' },
      { op: 'search_replace', path: 'src/solve.py', old: 'a', new: 'b' },
    ],
    'src/helpers.py',
  )
  assert.equal(slice.length, 1)
  assert.equal(slice[0]?.op, 'line_hunk')
}

{
  assert.equal(codingDiffIsNoop([]), true)
  assert.equal(
    codingDiffIsNoop([{ original: 'a', next: 'a' }]),
    true,
    'identical bodies are a no-op overlay',
  )
  assert.equal(codingDiffIsNoop([{ original: 'a', next: 'a\ndef x():\n    yield 1\n' }]), false)
}

console.log('copilotEditMemory: ok')
