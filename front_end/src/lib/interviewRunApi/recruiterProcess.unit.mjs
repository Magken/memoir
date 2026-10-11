/**
 * Recruiter process helpers — bucket notes, paste bursts, session mix, thesis.
 * Run: npx tsx front_end/src/lib/interviewRunApi/recruiterProcess.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  digestBucketNotes,
  digestPasteBursts,
  parsePasteBursts,
  stageSessionMix,
  weightSessionMixOverall,
  stitchSittingThesis,
} from './recruiterProcess.ts'
import { pasteBurstAccount } from './resultHomes.ts'

const atlas = {
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
    {
      id: 'b2',
      start: '0:02',
      end: '0:20',
      startMs: 2000,
      endMs: 20000,
      kind: 'idle',
      actionCounts: {},
      filesTouched: [],
      messages: [],
    },
  ],
  tags: [],
}
const notes = digestBucketNotes(atlas)
assert.equal(notes.length, 2)
assert.match(notes[1].summary, /idle/i)
assert.match(notes[0].summary, /src\/solve\.ts/)
assert.ok(!/run\s*[×x]\s*\d/.test(notes[0].summary), 'negative: caption is a sentence, not a telegram')
assert.ok(!/[—–]/.test(notes.map((n) => n.summary).join(' ')))

const digest = {
  kind: 'coding',
  durationMs: 20000,
  truncated: false,
  actions: [
    { t: 400, action: 'run' },
    {
      t: 12000,
      action: 'paste',
      detail: {
        chars: 80,
        path: 'src/solve.ts',
        excerpt: 'export function parseAndSum(lines) {',
        lineCount: 12,
        coverage: 0.92,
        wholeFile: true,
      },
    },
    { t: 14000, action: 'run' },
  ],
  checkpoints: [],
  cadence: { tickCount: 10, medianGapMs: 800, p95GapMs: 4000 },
  patchCount: 0,
  filesTouched: ['src/solve.ts'],
}
const bursts = digestPasteBursts(digest, atlas)
assert.ok(bursts.length >= 1)
assert.match(bursts[0].summary, /pasted/i)
assert.match(bursts[0].summary, /src\/solve\.ts/)
assert.match(bursts[0].summary, /parseAndSum/)
assert.equal(bursts[0].wholeFile, true)
assert.equal(bursts[0].after.ranTests, true)
assert.ok(!JSON.stringify(bursts[0]).includes('clipboard'), 'negative: burst must not carry clipboard text')
const notesWithPaste = digestBucketNotes(atlas, digest)
assert.match(notesWithPaste.find((n) => n.id === 'b2')?.summary ?? '', /parseAndSum/)
{
  const sentence = pasteBurstAccount({
    ...bursts[0],
    before: { bucketId: 'b1', lastActions: ['run'] },
    after: { ...bursts[0].after, ranTests: false, edited: true, nextActions: ['open_file'] },
  })
  assert.match(sentence, /ran tests/i)
  assert.match(sentence, /paste/i)
  assert.match(sentence, /edited/i)
  assert.match(sentence, /src\/solve\.ts/)
}

{
  const bot = pasteBurstAccount({
    t: 12_000,
    clock: '0:12',
    file: 'src/solve.ts',
    route: 'bot',
    before: { bucketId: 'b1', lastActions: ['run'] },
    after: { nextActions: ['run'], ranTests: true, edited: false, idleMs: 0 },
    summary: '',
  })
  assert.match(bot, /Bot edit/)
  assert.match(bot, /bot edit/)
  assert.ok(!/^Outside paste/.test(bot), 'negative: a bot edit is not an outside paste')
  const inside = pasteBurstAccount({
    t: 12_000,
    clock: '0:12',
    file: 'src/solve.ts',
    route: 'internal',
    before: { bucketId: 'b1', lastActions: ['run'] },
    after: { nextActions: ['open_file'], ranTests: false, edited: true, idleMs: 0 },
    summary: '',
  })
  assert.match(inside, /In-app paste/)
  const outside = pasteBurstAccount({
    t: 12_000,
    clock: '0:12',
    file: 'src/solve.ts',
    route: 'external',
    before: { bucketId: 'b1', lastActions: ['run'] },
    after: { nextActions: ['open_file'], ranTests: false, edited: true, idleMs: 0 },
    summary: '',
  })
  assert.match(outside, /Outside paste/)
}

{
  const mixed = digestPasteBursts(
    {
      ...digest,
      actions: [
        { t: 12000, action: 'copilot_apply', detail: { files: 1 } },
        { t: 12100, action: 'paste', detail: { chars: 80, path: 'src/solve.ts' } },
      ],
    },
    atlas,
  )
  assert.equal(mixed.length, 1)
  assert.equal(mixed[0].route, 'bot')
  assert.match(mixed[0].summary, /Bot edit/)
  assert.ok(!mixed.some((row) => row.route === 'external'), 'negative: a bot edit is not an outside paste')
}

{
  const botMix = stageSessionMix({
    phaseId: 'ph.code',
    toolRef: 'tool.code',
    bucket: 'codingMethod',
    digest: {
      ...digest,
      actions: [
        { t: 12000, action: 'copilot_apply', detail: { files: 1 } },
        { t: 12100, action: 'paste', detail: { chars: 80, path: 'src/solve.ts' } },
      ],
    },
  })
  assert.equal(botMix?.copilotApply, 1)
  assert.equal(botMix?.pasteEvents, 0, 'negative: a bot edit is not a paste slice on the mix')
  assert.equal(botMix?.humanTicks, 0)
  assert.equal(botMix?.copilotApplyShare, 1)
  assert.equal(botMix?.humanTickShare, 0)
  assert.equal(botMix?.pasteShare, 0)
}

{
  const parsed = parsePasteBursts([
    {
      t: 12_000,
      summary: 'Bot edit into src/solve.ts.',
      route: 'bot',
    },
  ])
  assert.equal(parsed[0]?.route, 'bot')
}

{
  const emptyMix = stageSessionMix({
    phaseId: 'ph.code',
    toolRef: 'tool.code',
    bucket: 'codingMethod',
    digest: {
      kind: 'coding',
      durationMs: 1000,
      truncated: false,
      actions: [{ t: 0, action: 'open_file' }],
      checkpoints: [{ t: 0, bytes: 12 }],
      cadence: { tickCount: 4, medianGapMs: 0, p95GapMs: 0 },
      patchCount: 0,
    },
  })
  assert.equal(emptyMix, null, 'negative: checkpoint ticks are not a human mix')
}

{
  const botOnly = stageSessionMix({
    phaseId: 'ph.code',
    toolRef: 'tool.code',
    bucket: 'codingMethod',
    digest: {
      ...digest,
      patchCount: 0,
      cadence: { tickCount: 2, medianGapMs: 0, p95GapMs: 0 },
      actions: [{ t: 12000, action: 'copilot_apply', detail: { files: 1 } }],
    },
  })
  assert.equal(botOnly?.copilotApplyShare, 1)
  assert.equal(botOnly?.humanTickShare, 0)
  assert.equal(botOnly?.pasteShare, 0)
}

{
  const typed = stageSessionMix({
    phaseId: 'ph.code',
    toolRef: 'tool.code',
    bucket: 'codingMethod',
    digest: {
      ...digest,
      patchCount: 10,
      cadence: { tickCount: 12, medianGapMs: 200, p95GapMs: 400 },
      actions: [{ t: 400, action: 'run' }],
    },
  })
  assert.equal(typed?.humanTickShare, 1)
  assert.equal(typed?.copilotApplyShare, 0)
  assert.equal(typed?.pasteShare, 0)
}

{
  const split = stageSessionMix({
    phaseId: 'ph.code',
    toolRef: 'tool.code',
    bucket: 'codingMethod',
    digest: {
      ...digest,
      patchCount: 8,
      actions: [
        { t: 400, action: 'run' },
        { t: 12000, action: 'paste', detail: { chars: 80, path: 'src/solve.ts' } },
      ],
    },
  })
  const denom = (split?.humanTicks ?? 0) + (split?.copilotApply ?? 0) + (split?.pasteEvents ?? 0)
  assert.equal(denom, 9)
  assert.equal(
    (split?.humanTickShare ?? 0) + (split?.copilotApplyShare ?? 0) + (split?.pasteShare ?? 0),
    1,
  )
  assert.equal(split?.pasteShare, 1 / 9)
}

const mixA = stageSessionMix({
  phaseId: 'ph.code',
  toolRef: 'tool.code',
  bucket: 'codingMethod',
  digest,
})
const mixB = stageSessionMix({
  phaseId: 'ph.essay',
  toolRef: 'tool.doc',
  bucket: 'essay',
  digest: {
    ...digest,
    patchCount: 6,
    actions: digest.actions.filter((a) => a.action !== 'paste'),
  },
})
assert.ok(mixA)
assert.ok(mixB)
const overall = weightSessionMixOverall(
  [mixA, mixB],
  {
    codingMethod: { weight: 0.1, included: true, unit: 0.5, label: 'Method', sources: [], summary: '' },
    essay: { weight: 0.15, included: true, unit: 0.4, label: 'Essay', sources: [], summary: '' },
  },
)
assert.ok(overall)
assert.ok(overall.copilotApplyShare >= 0 && overall.copilotApplyShare <= 1)

const thesis = stitchSittingThesis({
  scored: {
    softGrade: {
      method: 'template_role_v1',
      mapsVersion: 1,
      overall: 0.4,
      byWeight: {
        codingTests: {
          label: 'Tests',
          unit: 0.2,
          weight: 0.25,
          included: true,
          sources: [],
          summary: 'Suite landed low.',
        },
      },
      excludedBuckets: [],
    },
    formGate: { passed: false, gradedScore: 1, gradedMax: 2, ungradedIds: [], authorHints: [] },
    artifacts: { topicSynths: {}, toolSynths: {}, taxonomies: {}, enums: {}, targets: {}, targetMisses: [], histograms: {}, tensions: [] },
    contributions: [],
    pendingCount: 0,
    resultStatus: 'complete',
  },
  skipped: 1,
  phases: [
    { title: 'Eligibility', kind: 'tool', toolRef: 'tool.form' },
    { title: 'Opening', kind: 'discussion' },
    { title: 'Coding', kind: 'tool', toolRef: 'tool.code' },
  ],
  tools: { 'tool.form': { type: 'form' }, 'tool.code': { type: 'coding' } },
})
assert.match(thesis.summary, /three stages/i)
assert.match(thesis.summary, /Eligibility/)
assert.match(thesis.summary, /forfeit/i)
assert.equal(thesis.strengths.length, 0)
assert.equal(thesis.risks.length, 0)
assert.ok(!/Suite landed low/.test(thesis.summary))

console.log('recruiterProcess.unit.mjs: ok')
