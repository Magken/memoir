/**
 * Process / assist-use skip rules.
 * Run: npx tsx front_end/src/lib/interviewRunApi/processMarks.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  scoreApproachGrain,
  scoreAssistUseGrain,
  scoreAuthorshipGrain,
} from './processMarks.ts'

const skipped = scoreApproachGrain({
  templateId: 'mark.code.approach.v1',
  hostRef: 'tool.code',
  digest: null,
})
assert.equal(skipped.status, 'skipped')

const noneAssist = scoreAssistUseGrain({
  hostRef: 'tool.code',
  phaseId: 'ph.code',
  messages: [],
  digest: null,
  chat: false,
})
assert.equal(noneAssist.status, 'skipped')

{
  const copilotOnly = scoreAssistUseGrain({
    hostRef: 'tool.code',
    phaseId: 'ph.code',
    messages: [],
    digest: {
      kind: 'coding',
      durationMs: 8000,
      truncated: false,
      actions: [{ t: 1200, action: 'copilot_apply', detail: { files: 1 } }],
      checkpoints: [],
      cadence: { tickCount: 2, medianGapMs: 400, p95GapMs: 800 },
      patchCount: 0,
      filesTouched: ['src/solve.ts'],
    },
    chat: true,
  })
  assert.equal(copilotOnly.status, 'filled', 'Copilot apply without a peel ask is still an Assist mark')
  assert.ok(copilotOnly.dimensions?.some((d) => d.key === 'asked_well' && d.notes))
}

const auth = scoreAuthorshipGrain({ hostRef: 'tool.doc', digest: null })
assert.equal(auth.status, 'skipped')

const digest = {
  kind: 'coding',
  durationMs: 20000,
  truncated: false,
  actions: [
    { t: 400, action: 'run' },
    { t: 12000, action: 'paste' },
  ],
  checkpoints: [],
  cadence: { tickCount: 8, medianGapMs: 900, p95GapMs: 4000 },
  patchCount: 0,
  filesTouched: ['src/solve.ts'],
}
const filled = scoreApproachGrain({
  templateId: 'mark.code.approach.v1',
  hostRef: 'tool.code',
  digest,
  atlas: {
    durationMs: 20000,
    truncated: false,
    buckets: [
      {
        id: 'b1',
        start: '0:00',
        end: '0:02',
        startMs: 0,
        endMs: 2000,
        kind: 'active',
        actionCounts: { run: 1 },
        filesTouched: ['src/solve.ts'],
        messages: [],
      },
    ],
    tags: [],
  },
})
assert.equal(filled.status, 'filled')
assert.ok(filled.result?.boardSummary)
assert.ok(Array.isArray(filled.result?.bucketNotes))
assert.ok(!String(filled.justification).includes('Process read from the session tape digest'))

const codeAuth = scoreAuthorshipGrain({
  templateId: 'mark.code.authorship.v1',
  hostRef: 'tool.code',
  digest,
  atlas: filled.result ? undefined : undefined,
})
assert.equal(codeAuth.templateId, 'mark.code.authorship.v1')
assert.ok(Array.isArray(codeAuth.result?.pasteBursts))

{
  const botDigest = {
    ...digest,
    cadence: { tickCount: 1, medianGapMs: 900, p95GapMs: 4000 },
    patchCount: 0,
    actions: [
      { t: 12000, action: 'copilot_apply', detail: { files: 1 } },
      { t: 12120, action: 'paste', detail: { chars: 80, path: 'src/solve.ts' } },
    ],
  }
  const botAuth = scoreAuthorshipGrain({
    templateId: 'mark.code.authorship.v1',
    hostRef: 'tool.code',
    digest: botDigest,
    phaseId: 'ph.code',
    copilotSection: false,
  })
  assert.ok(!/Large pastes/.test(String(botAuth.justification)))
  assert.equal(botAuth.dimensions?.find((d) => d.key === 'human_agency')?.score, 'weak')
  assert.equal(botAuth.result?.pasteBursts?.length, 1)
  assert.equal(botAuth.result?.pasteBursts?.[0]?.route, 'bot')
  assert.equal(botAuth.result?.sessionMix?.copilotApplyShare, 1)
  const dumped = scoreAuthorshipGrain({
    templateId: 'mark.code.authorship.v1',
    hostRef: 'tool.code',
    digest: {
      ...digest,
      cadence: { tickCount: 1, medianGapMs: 900, p95GapMs: 4000 },
      patchCount: 0,
      actions: [
        { t: 4000, action: 'paste' },
        { t: 12000, action: 'paste' },
      ],
    },
  })
  assert.equal(dumped.dimensions?.find((d) => d.key === 'human_agency')?.score, 'weak')
}

{
  const emptyTape = scoreApproachGrain({
    templateId: 'mark.code.approach.v1',
    hostRef: 'tool.code',
    digest: {
      kind: 'coding',
      durationMs: 4000,
      truncated: false,
      actions: [{ t: 0, action: 'open_file' }],
      checkpoints: [{ t: 0, bytes: 8 }],
      cadence: { tickCount: 3, medianGapMs: 0, p95GapMs: 0 },
      patchCount: 0,
      filesTouched: ['src/solve.ts'],
    },
  })
  assert.equal(emptyTape.status, 'skipped')
  assert.equal(
    scoreAuthorshipGrain({
      templateId: 'mark.code.authorship.v1',
      hostRef: 'tool.code',
      digest: {
        kind: 'coding',
        durationMs: 4000,
        truncated: false,
        actions: [{ t: 0, action: 'open_file' }],
        checkpoints: [{ t: 0, bytes: 8 }],
        cadence: { tickCount: 3, medianGapMs: 0, p95GapMs: 0 },
        patchCount: 0,
        filesTouched: ['src/solve.ts'],
      },
    }).status,
    'skipped',
  )
}

console.log('processMarks.unit.mjs: ok')
