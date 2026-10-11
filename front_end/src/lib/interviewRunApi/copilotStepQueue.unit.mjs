/**
 * Copilot pending-step Keep / Discard cascade.
 * Run: npx tsx front_end/src/lib/interviewRunApi/copilotStepQueue.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  createCopilotStepQueue,
  keepCopilotStep,
  discardCopilotStep,
  keepAllCopilotSteps,
  discardAllCopilotSteps,
  copilotSheetRows,
  pendingCopilotCount,
  unlockedPendingIds,
  mergeCopilotStepsByFile,
  actionableCopilotSteps,
} from './copilotStepQueue.ts'

const raw = [
  {
    packageId: 'pkg.create',
    locus: 'src/helper2.py',
    summary: 'Create helper2.py',
    dependsOn: [],
    ops: [{ op: 'create_file', path: 'src/helper2.py', contents: '' }],
  },
  {
    packageId: 'pkg.hunk',
    locus: 'src/helper2.py',
    summary: 'Add loop',
    dependsOn: ['pkg.create'],
    ops: [{ op: 'line_hunk', path: 'src/helper2.py', start: 1, end: 0, text: 'def loop():\n    pass\n' }],
  },
  {
    packageId: 'pkg.import',
    locus: 'src/solve.py',
    summary: 'Import in solve.py',
    dependsOn: ['pkg.hunk'],
    ops: [{ op: 'search_replace', path: 'src/solve.py', old: 'x', new: 'y' }],
  },
]

{
  const q = createCopilotStepQueue(raw)
  assert.deepEqual(keepCopilotStep(q, 'pkg.import'), q, 'cannot Keep import before create')
  assert.deepEqual(unlockedPendingIds(q), ['pkg.create'])
}

{
  const q = discardCopilotStep(createCopilotStepQueue(raw), 'pkg.create')
  assert.equal(q.find((s) => s.packageId === 'pkg.create')?.status, 'discarded')
  assert.equal(q.find((s) => s.packageId === 'pkg.hunk')?.status, 'skipped_dep')
  assert.equal(q.find((s) => s.packageId === 'pkg.import')?.status, 'skipped_dep')
}

{
  const all = keepAllCopilotSteps(createCopilotStepQueue(raw))
  assert.deepEqual(all.order, ['pkg.create', 'pkg.hunk', 'pkg.import'])
  assert.equal(all.steps.every((s) => s.status === 'kept'), true)
}

{
  const q = keepCopilotStep(createCopilotStepQueue(raw), 'pkg.create')
  assert.deepEqual(unlockedPendingIds(q), ['pkg.hunk'])
}

{
  let q = keepCopilotStep(createCopilotStepQueue(raw), 'pkg.create')
  q = discardCopilotStep(q, 'pkg.hunk')
  assert.equal(q.find((s) => s.packageId === 'pkg.hunk')?.status, 'discarded')
  assert.equal(q.find((s) => s.packageId === 'pkg.import')?.status, 'skipped_dep')
  assert.equal(pendingCopilotCount(q), 0)
}

{
  const a = {
    packageId: 'pkg.a',
    locus: 'a.ts',
    summary: 'a',
    dependsOn: [],
    ops: [{ op: 'search_replace', path: 'a.ts', old: 'a', new: 'b' }],
  }
  const b = {
    packageId: 'pkg.b',
    locus: 'b.ts',
    summary: 'b',
    dependsOn: [],
    ops: [{ op: 'search_replace', path: 'b.ts', old: 'a', new: 'b' }],
  }
  let q = createCopilotStepQueue([a, b])
  q = discardCopilotStep(q, 'pkg.a')
  assert.equal(q.find((s) => s.packageId === 'pkg.b')?.status, 'pending')
  const keptB = keepCopilotStep(createCopilotStepQueue([a, b]), 'pkg.b')
  assert.equal(keptB.find((s) => s.packageId === 'pkg.b')?.status, 'kept')
  assert.equal(keptB.find((s) => s.packageId === 'pkg.a')?.status, 'pending')
  const all = keepAllCopilotSteps(createCopilotStepQueue([a, b]))
  assert.deepEqual(all.order, ['pkg.a', 'pkg.b'])
  assert.equal(pendingCopilotCount(all.steps), 0)
}

// A dependency that never reached the sheet — the package produced no ops, so the caller
// filtered it out — must not lock the step that follows it. Blocking there disabled Keep
// on the second edit with no earlier edit the candidate could keep to unblock it.
{
  const q = createCopilotStepQueue(raw).filter((s) => s.packageId !== 'pkg.create')
  const rows = copilotSheetRows(q)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].id, 'pkg.hunk')
  assert.equal(rows[0].locked, false, 'a step whose dependency was dropped is clickable')
  assert.deepEqual(unlockedPendingIds(q), ['pkg.hunk'])
  const kept = keepCopilotStep(q, 'pkg.hunk')
  assert.equal(kept.find((s) => s.packageId === 'pkg.hunk')?.status, 'kept')
  assert.equal(copilotSheetRows(kept)[0]?.locked, false, 'the next step unlocks in turn')
  assert.equal(pendingCopilotCount(keepAllCopilotSteps(q).steps), 0, 'Keep all drains the queue')
}

// Present dependencies still gate: an unmet one keeps its dependant locked.
{
  const rows = copilotSheetRows(createCopilotStepQueue(raw))
  assert.equal(rows.find((r) => r.id === 'pkg.hunk')?.locked, true)
}

{
  const gone = discardAllCopilotSteps(createCopilotStepQueue(raw))
  assert.equal(gone.every((s) => s.status !== 'pending'), true)
}

// Two packages editing one file become one proposal. Kept separately, the second one's
// whole-file write restored the turn baseline and undid the first.
{
  const merged = mergeCopilotStepsByFile(
    createCopilotStepQueue([
      {
        packageId: 'pkg.one',
        locus: 'src/solve.ts',
        summary: 'add helper',
        ops: [{ op: 'search_replace', path: 'src/solve.ts', old: 'a', new: 'b' }],
      },
      {
        packageId: 'pkg.two',
        locus: 'src/solve.ts',
        summary: 'call helper',
        dependsOn: ['pkg.one'],
        ops: [{ op: 'replace_all', path: 'src/solve.ts', text: 'whole file' }],
      },
    ]),
  )
  assert.equal(merged.length, 1, 'same-file packages collapse to a single accept')
  assert.equal(merged[0].packageId, 'src/solve.ts', 'the row id is the path the editor reports')
  assert.equal(merged[0].locus, 'src/solve.ts')
  assert.equal(merged[0].ops.length, 2, 'both packages ship in one apply, in order')
  assert.deepEqual(merged[0].dependsOn, [], 'a dependency inside the group cannot lock it')
  assert.match(merged[0].summary, /add helper/)
  assert.match(merged[0].summary, /call helper/)
}

// Across files the ordering still holds: the import waits for the file it imports from.
{
  const merged = mergeCopilotStepsByFile(
    createCopilotStepQueue([
      {
        packageId: 'pkg.create',
        locus: 'src/george.ts',
        summary: 'create helper',
        ops: [{ op: 'create_file', path: 'src/george.ts', text: 'x' }],
      },
      {
        packageId: 'pkg.import',
        locus: 'src/solve.ts',
        summary: 'import helper',
        dependsOn: ['pkg.create'],
        ops: [{ op: 'search_replace', path: 'src/solve.ts', old: 'a', new: 'b' }],
      },
      {
        packageId: 'pkg.call',
        locus: 'src/solve.ts',
        summary: 'call helper',
        dependsOn: ['pkg.import'],
        ops: [{ op: 'search_replace', path: 'src/solve.ts', old: 'c', new: 'd' }],
      },
    ]),
  )
  assert.deepEqual(
    merged.map((s) => s.packageId),
    ['src/george.ts', 'src/solve.ts'],
  )
  assert.deepEqual(merged[1].dependsOn, ['src/george.ts'], 'cross-file dependency is remapped, self-dependency dropped')
  assert.equal(merged[1].ops.length, 2)
  const rows = copilotSheetRows(merged)
  assert.equal(rows.find((r) => r.id === 'src/solve.ts')?.locked, true)
  assert.equal(
    copilotSheetRows(keepCopilotStep(merged, 'src/george.ts')).find((r) => r.id === 'src/solve.ts')?.locked,
    false,
    'keeping the created file unlocks the file that imports it',
  )
}

// A package with no locus falls back to the path its ops carry.
{
  const merged = mergeCopilotStepsByFile(
    createCopilotStepQueue([
      { packageId: 'pkg.a', ops: [{ op: 'search_replace', path: 'src/a.ts', old: 'a', new: 'b' }] },
      { packageId: 'pkg.b', ops: [{ op: 'search_replace', path: 'src/a.ts', old: 'c', new: 'd' }] },
    ]),
  )
  assert.equal(merged.length, 1)
  assert.equal(merged[0].packageId, 'src/a.ts')
}

// A package the Edge attempted and lost used to be filtered out before anything could
// render it, so the sheet showed two rows for a three-package turn and the candidate read
// the missing one as never attempted. It stays, as a row that says what happened.
{
  const q = createCopilotStepQueue([
    { packageId: 'pkg.ok', locus: 'src/a.ts', summary: 'edit a', ops: [{ op: 'search_replace', path: 'src/a.ts', old: 'a', new: 'b' }] },
    { packageId: 'pkg.lost', locus: 'src/b.ts', summary: 'edit b', status: 'dry_fail', ops: [] },
    { packageId: 'pkg.broke', locus: 'src/c.ts', summary: 'edit c', status: 'editors_budget', ops: [] },
  ])
  assert.equal(q.length, 3, 'failed packages are retained')
  assert.equal(q.find((s) => s.packageId === 'pkg.lost')?.status, 'failed')
  assert.ok(q.find((s) => s.packageId === 'pkg.lost')?.reason, 'a failed row carries a reason')
  assert.deepEqual(
    actionableCopilotSteps(q).map((s) => s.packageId),
    ['pkg.ok'],
    'only the packages a candidate can Keep are actionable',
  )
  const rows = copilotSheetRows(q)
  assert.equal(rows.length, 3, 'the sheet shows the attempt that lost')
  const lost = rows.find((r) => r.id === 'pkg.lost')
  assert.equal(lost.skipped, true)
  assert.equal(lost.locked, false, 'a failed row is not waiting on a dependency')
  assert.ok(lost.reason, 'the row explains itself instead of vanishing')
  assert.notEqual(lost.reason, rows.find((r) => r.id === 'pkg.broke').reason, 'each status reads differently')
  assert.equal(pendingCopilotCount(q), 1, 'a failed row is not pending work')
}

// A failed dependency must not lock the step behind it — there is no earlier edit the
// candidate could Keep to unblock it, so locking is a dead end.
{
  const q = createCopilotStepQueue([
    { packageId: 'pkg.first', locus: 'src/a.ts', summary: 'create a', status: 'dry_fail', ops: [] },
    {
      packageId: 'pkg.second',
      locus: 'src/b.ts',
      summary: 'import a',
      dependsOn: ['pkg.first'],
      ops: [{ op: 'search_replace', path: 'src/b.ts', old: 'a', new: 'b' }],
    },
  ])
  assert.deepEqual(unlockedPendingIds(q), ['pkg.second'])
  const merged = mergeCopilotStepsByFile(q)
  assert.equal(merged.length, 2, 'a failed row survives the same-file merge')
  assert.equal(merged.find((s) => s.status === 'failed')?.packageId, 'pkg.first')
}

console.log('copilotStepQueue: ok')
