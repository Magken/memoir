/**
 * Session-signal atlas — no secrets, not a Soft Decision source.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sessionSignals.unit.mjs
 */
import assert from 'node:assert/strict'
import { afterTurnTemplateIds } from './buildTalkContext.ts'
import { catalogSourceWeight } from '../interviewBrief/analysisTemplateCatalog.ts'
import {
  atlasHasSecretLeak,
  compileSessionSignalAtlas,
  collectorSignalGrains,
  collectHostClarityGrains,
  composeClarityGrain,
  mergeSessionSignals,
  metaFromSessionSignals,
  overviewSignalGrains,
} from './sessionSignals.ts'
import {
  emptyInterviewResponse,
  saveInterviewResponse,
} from './interviewResponse.ts'
import { digestEditorTape } from './editorCapture/tapeDigest.ts'
import { stageSessionMix } from './recruiterProcess.ts'
import { scoreAttempt } from './scoreAttempt.ts'
import {
  recordDictationSession,
  resetTelemetrySession,
  setTelemetryPhase,
  startSessionTelemetry,
  tickTelemetryForTests,
  ensureSessionTelemetry,
  saveSessionTelemetry,
} from './sessionTelemetry/index.ts'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    store.set(k, String(v))
  },
  removeItem: (k) => {
    store.delete(k)
  },
}

const briefId = 'fixture:session-signals'
const brief = {
  phases: [
    { id: 'ph.talk', kind: 'discussion', topicId: 'topic.a', title: 'Opening' },
    { id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: 'Coding' },
  ],
  tools: { 'tool.code': { type: 'coding', title: 'Coding' } },
  topicLibrary: [{ id: 'topic.a', label: 'Opening' }],
  definition: { meta: { title: 'Signals fixture' } },
}

let doc = saveInterviewResponse(emptyInterviewResponse(briefId))
doc = saveInterviewResponse({
  ...doc,
  completedPhaseIds: ['ph.talk', 'ph.code'],
  analysis: {
    ...doc.analysis,
    topics: {
      'topic.a': {
        status: 'filled',
        synthesisText: 'Owned the incident.',
        targets: {},
        byTemplate: {
          'iv.delivery.v1': {
            templateId: 'iv.delivery.v1',
            hostRef: 'topic.a',
            grain: 'topic_end',
            order: 1,
            status: 'filled',
            result: { boardSummary: 'Clear and paced.' },
            justification: 'Clear and paced.',
            evidence: ['I owned the outage'],
          },
          'sig.clarity.v1': {
            templateId: 'sig.clarity.v1',
            hostRef: 'topic.a',
            grain: 'topic_end',
            order: 90,
            status: 'filled',
            result: {
              boardSummary: 'Talk stayed paced.',
              boardSummaryDetail: 'Paragraph one on pace.\n\nParagraph two on what to check.',
              tags: [{ signal: 'good', label: 'Paced', hint: 'Pace' }],
            },
            justification: 'Paragraph one on pace.\n\nParagraph two on what to check.',
            evidenceRefs: [
              { kind: 'message', ref: 'msg.1', quote: 'I owned the outage' },
              { kind: 'case', ref: 'ph.talk' },
            ],
          },
        },
      },
    },
    tools: {
      'tool.code': {
        'mark.code.tests.v1': {
          templateId: 'mark.code.tests.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 1,
          status: 'filled',
          result: { boardSummary: 'Cleared the suite.', passed: true },
          justification: 'Cleared the suite.',
        },
      },
    },
  },
})

const atlas = compileSessionSignalAtlas({ brief, response: doc })
assert.equal(atlas.schema, 'vurify/session-signal-atlas.v1')
assert.equal(atlasHasSecretLeak(atlas), false)
assert.ok(!JSON.stringify(atlas).includes('answerKey'))
assert.ok(!JSON.stringify(atlas).includes('candidateMarkdown'))
assert.ok(atlas.leftover.some((r) => r.templateId === 'iv.delivery.v1'))
assert.ok(atlas.leftover.some((r) => r.templateId === 'mark.code.tests.v1'))
assert.ok(!atlas.leftover.some((r) => String(r.templateId).startsWith('sig.')))
assert.ok(atlas.sessionSeries?.byPhase?.length >= 1)
assert.ok(atlas.collectors.clarityUnit >= 0 && atlas.collectors.clarityUnit <= 1)
assert.equal(atlas.collectors.checks.find((c) => c.id === 'dictation')?.reading, 'not observed')
assert.equal(atlas.collectors.checks.find((c) => c.id === 'hotkeys')?.reading, 'none observed')
const vpnRow = atlas.collectors.checks.find((c) => c.id === 'vpn')
assert.ok(vpnRow)
assert.ok(!/\bVPN likely\b/i.test(`${vpnRow.note} ${vpnRow.reading}`))
assert.equal(atlas.declaration.empty, true)
assert.ok(atlas.patterns.some((row) => row.id === 'support'))
assert.ok(atlas.patterns.some((row) => row.id === 'task_split'))
assert.ok(!/they have adhd/i.test(JSON.stringify(atlas.patterns)))

startSessionTelemetry({ briefId, attemptId: 'local:signals', phaseId: 'ph.talk' })
recordDictationSession('dictation_start', { surface: 'talk' })
tickTelemetryForTests(41000)
recordDictationSession('dictation_stop', { surface: 'talk', charCount: 80 })
const atlasSpoken = compileSessionSignalAtlas({ brief, response: doc })
assert.match(String(atlasSpoken.collectors.checks.find((c) => c.id === 'dictation')?.reading), /session/)
assert.ok(atlasSpoken.sessionSeries.byPhase.some((p) => p.dictation.sessions.length >= 1))

setTelemetryPhase('ph.code')
tickTelemetryForTests(2000)
const seriesSplit = compileSessionSignalAtlas({ brief, response: doc }).sessionSeries
const talkDwell = seriesSplit.byPhase.find((p) => p.phaseId === 'ph.talk')?.dwell
const codeDwell = seriesSplit.byPhase.find((p) => p.phaseId === 'ph.code')?.dwell
assert.equal(talkDwell?.visibleMs ?? -1, 0)
assert.ok((codeDwell?.visibleMs ?? 0) >= 2000)
assert.ok((talkDwell?.visibleMs ?? 0) !== (codeDwell?.visibleMs ?? 0))

const hosts = collectHostClarityGrains({ brief, response: doc })
assert.equal(hosts.length, 1)
assert.equal(hosts[0]?.sectionId, 'ph.talk')
const composed = composeClarityGrain({ atlas, hosts })
assert.match(String(composed.justification), /Paragraph one on pace/)
assert.ok(composed.result?.sections?.some((s) => s.sectionId === 'ph.talk'))
assert.ok(composed.result?.sections?.some((s) => s.sectionId === 'ph.code'))

const grains = collectorSignalGrains({ atlas, hosts })
assert.ok(Array.isArray(grains['sig.clarity.v1'].result?.sections))
assert.ok(grains['sig.clarity.v1'].result?.sessionSeries)
assert.equal(grains['sig.clarity.v1'].status, 'filled')
assert.equal(grains['sig.security.v1'].status, 'filled')
assert.match(grains['sig.security.v1'].justification, /live work/)
assert.ok(!/Session integrity|leftover grains|authored spine|this sitting|in-gate|internal_assist_help|external_dump/i.test(grains['sig.security.v1'].justification))
assert.ok(!/\bthe sitting\b|\bthe day\b/.test(grains['sig.security.v1'].justification))
assert.ok(!/Work-state from the collectors|Observed clocks|leftover grains|authored spine|this sitting/i.test(String(grains['sig.clarity.v1'].justification)))
assert.ok(!/\bthe sitting\b|\bthe day\b/.test(String(grains['sig.clarity.v1'].justification)))
assert.match(String(grains['sig.clarity.v1'].justification), /finished/)
assert.match(String(grains['sig.clarity.v1'].justification), /Opening/)
assert.match(String(grains['sig.clarity.v1'].justification), /Coding/)
assert.match(String(grains['sig.clarity.v1'].result?.boardSummary ?? ''), /finished/)
assert.match(String(grains['sig.clarity.v1'].result?.boardSummary ?? ''), /Opening/)
assert.match(String(grains['sig.clarity.v1'].result?.boardSummary ?? ''), /Coding/)
assert.ok(
  !/Cleared the suite/.test(String(grains['sig.clarity.v1'].result?.boardSummary ?? '')),
  'Clarity lead is sitting-wide, not leftover dump',
)
assert.ok(
  !/left notes a marker can read/.test(JSON.stringify(grains['sig.clarity.v1'].result?.sections ?? [])),
  'section findings are work-state clocks, not leftover paste',
)
assert.ok(
  atlas.leftover.some((r) => /Cleared the suite/.test(String(r.boardSummary ?? r.justification ?? ''))),
  'leftover still lives on the atlas for Conversation / Work',
)
assert.ok(!/\b47 wpm\b/i.test(grains['sig.security.v1'].justification))
const collectorDiagrams = grains['sig.security.v1'].result?.diagrams
assert.ok(collectorDiagrams?.location && collectorDiagrams?.pointer && collectorDiagrams?.incidents)
assert.ok(
  !/on-stage trail|median gap clocks/i.test(
    `${collectorDiagrams.location} ${collectorDiagrams.pointer} ${collectorDiagrams.incidents}`,
  ),
)
const clarityDiagrams = grains['sig.clarity.v1'].result?.diagrams
assert.ok(clarityDiagrams?.cadence && clarityDiagrams?.pace)
assert.ok(!/median gap clocks|on-stage trail/i.test(`${clarityDiagrams.cadence} ${clarityDiagrams.pace}`))

const pendingOverlay = overviewSignalGrains({
  brief,
  response: {
    ...doc,
    analysis: {
      ...doc.analysis,
      signals: {
        'sig.clarity.v1': {
          templateId: 'sig.clarity.v1',
          hostRef: 'attempt',
          grain: 'interview_end',
          order: 90,
          status: 'pending',
          result: null,
          justification: '',
        },
      },
    },
  },
})
assert.equal(pendingOverlay.grains['sig.clarity.v1'].status, 'filled')
assert.ok(pendingOverlay.grains['sig.clarity.v1'].result?.sections?.length >= 1)

mergeSessionSignals(doc, grains)
assert.deepEqual(afterTurnTemplateIds(['sig.clarity.v1', 'sig.security.v1']), [])
assert.equal(catalogSourceWeight('mark.code.approach.v1'), 0.5)

const scored = scoreAttempt({ brief, response: saveInterviewResponse({
  ...doc,
  analysis: {
    ...doc.analysis,
    signals: grains,
  },
}) })
const signalIds = Object.keys(scored.softGrade.byWeight)
assert.ok(!JSON.stringify(scored).includes('sig.clarity.v1') || scored.softGrade.byWeight.interviewContent)
for (const bucket of Object.values(scored.softGrade.byWeight)) {
  assert.ok(!bucket.sources?.some((s) => s.templateId.startsWith('sig.')))
}
assert.ok(signalIds.length >= 0)

saveSessionTelemetry({
  ...ensureSessionTelemetry(briefId, 'local:signals'),
  networkSamples: [
    {
      t: 1000,
      phaseId: 'ph.talk',
      ip: '52.1.2.3',
      city: 'Ashburn',
      region: 'VA',
      country: 'United States',
      lat: 39.04,
      lon: -77.49,
      rttMs: 40,
      vpnLikely: true,
      reasons: ['cloud_org'],
    },
  ],
})
const atlasVpn = compileSessionSignalAtlas({ brief, response: doc })
const vpnLive = atlasVpn.collectors.checks.find((c) => c.id === 'vpn')
assert.match(String(vpnLive?.reading), /VPN likely/)
assert.match(String(vpnLive?.note), /cloud provider/)
assert.ok(!String(vpnLive?.note).includes('cloud_org'))
assert.ok(!JSON.stringify(atlasVpn).includes('52.1.2.3'))

const declared = saveInterviewResponse({
  ...doc,
  sittingDeclaration: {
    schema: 'vurify/sitting-declaration.v1',
    updatedAt: '2026-08-27T00:00:00.000Z',
    nothingToDeclare: false,
    preferNotToSay: false,
    conditions: ['adhd'],
    helps: ['timed_pace'],
    notes: 'Timers dump me at the end.',
  },
})
const atlasDecl = compileSessionSignalAtlas({ brief, response: declared })
assert.ok(atlasDecl.declaration.labels.some((row) => /ADHD \(self-report\)/.test(row)))
assert.equal(atlasDecl.patterns.find((row) => row.id === 'support')?.reading, 'on file')
assert.match(String(atlasDecl.patterns.find((row) => row.id === 'support')?.note), /not as a diagnosis/)
assert.equal(atlasDecl.patterns.find((row) => row.id === 'support')?.signal, 'good')
assert.ok((atlasDecl.patterns.find((row) => row.id === 'support')?.note ?? '').length >= 80)
assert.ok(!JSON.stringify(declared.messages ?? []).includes('ADHD'))

const thinOverlay = saveInterviewResponse({
  ...declared,
  analysis: {
    ...declared.analysis,
    signals: {
      'sig.clarity.v1': {
        templateId: 'sig.clarity.v1',
        hostRef: 'attempt',
        grain: 'interview_end',
        status: 'filled',
        result: {
          unit: 0.91,
          boardSummary: 'Fine.',
          checks: [
            { id: 'stages', check: 'Stage order', reading: '2 / 2', note: 'Held.', signal: 'good' },
            { id: 'support', check: 'Support note', reading: 'on file', note: 'ADHD.', signal: 'watch' },
          ],
        },
        justification: 'Fine.',
      },
    },
  },
})
const mergedMeta = metaFromSessionSignals(thinOverlay, atlasDecl)
assert.ok((mergedMeta.clarityChecks ?? []).length >= 18)
assert.ok(mergedMeta.clarityChecks?.some((row) => row.id === 'task_split'))
assert.ok((mergedMeta.clarityChecks?.find((row) => row.id === 'stages')?.note ?? '').length >= 80)
assert.equal(mergedMeta.clarityChecks?.find((row) => row.id === 'support')?.signal, 'good')
assert.ok(!mergedMeta.clarityChecks?.some((row) => row.note === 'Held.'))

{
  const dumpOverlay = saveInterviewResponse({
    ...doc,
    analysis: {
      ...doc.analysis,
      signals: {
        'sig.security.v1': {
          templateId: 'sig.security.v1',
          hostRef: 'attempt',
          grain: 'interview_end',
          status: 'filled',
          result: {
            checks: [
              {
                id: 'cursor',
                check: 'On-stage dwell',
                reading: 'dwellRatio 1.08',
                note: 'Pointer stayed on stage for most of the visible clock. Trail samples are coarse.',
                signal: 'watch',
              },
            ],
          },
          justification: 'Integrity glance.',
        },
      },
    },
  })
  const dumpMeta = metaFromSessionSignals(dumpOverlay, atlasVpn)
  assert.ok(dumpMeta.securityChecks?.some((row) => row.id === 'cursor'))
  assert.ok(!dumpMeta.securityChecks?.some((row) => /dwellRatio/.test(row.reading)))
}

assert.equal(
  scored.contributions.some((c) => String(c.templateId).startsWith('sig.')),
  false,
)

resetTelemetrySession()

{
  const startedAt = '2026-09-04T12:00:00.000Z'
  const tape = {
    schema: 'vurify/editor-tape',
    schemaVersion: 1,
    briefId,
    attemptId: 'local:signals',
    phaseId: 'ph.code',
    kind: 'coding',
    startedAt,
    endedAt: null,
    durationMs: 20000,
    initial: {},
    events: [
      { t: 12000, type: 'action', action: 'copilot_apply', detail: { files: 1 } },
      { t: 12120, type: 'action', action: 'paste', detail: { path: 'src/solve.ts', chars: 80 } },
    ],
    final: {},
  }
  const atlas = compileSessionSignalAtlas({
    brief,
    response: { ...doc, startedAt },
    telemetry: null,
    tapes: { schema: 'vurify/editor-tapes', schemaVersion: 1, byKind: {}, byPhaseId: { 'ph.code': tape } },
  })
  const codeTape = atlas.tapes.find((row) => row.phaseId === 'ph.code')
  assert.equal(codeTape?.applyCount, 1)
  assert.equal(codeTape?.pasteCount, 0, 'negative: atlas pasteCount must not include a bot edit')
  const pasteCheck = atlas.collectors.checks.find((row) => row.id === 'paste')
  assert.equal(pasteCheck?.reading, '0 pastes')
  assert.match(String(pasteCheck?.note), /bot edit/i)
  assert.ok(!/from Assist or the editor/.test(String(pasteCheck?.note)))
  assert.ok(
    !atlas.sessionSeries.incidents.some((row) => row.kind === 'paste' || row.kind === 'paste_internal'),
    'negative: security incidents must not call a bot edit a paste',
  )
}

{
  const startedAt = '2026-09-04T12:00:00.000Z'
  const emptyTape = {
    schema: 'vurify/editor-tape',
    schemaVersion: 1,
    briefId,
    attemptId: 'local:signals',
    phaseId: 'ph.code',
    kind: 'coding',
    startedAt,
    endedAt: null,
    durationMs: 20000,
    initial: { files: [{ path: 'src/solve.ts', language: 'typescript', content: '' }] },
    events: [
      { t: 0, type: 'checkpoint', checkpoint: { files: [{ path: 'src/solve.ts' }] } },
      { t: 80, type: 'action', action: 'open_file', detail: { path: 'src/solve.ts' } },
    ],
    final: { files: [{ path: 'src/solve.ts', language: 'typescript', content: '' }] },
  }
  const mix = stageSessionMix({
    phaseId: 'ph.code',
    toolRef: 'tool.code',
    bucket: 'codingMethod',
    digest: digestEditorTape(emptyTape),
  })
  assert.equal(mix, null, 'negative: no typing and no bot is not a 100% bot mix')
  const atlas = compileSessionSignalAtlas({
    brief,
    response: { ...doc, startedAt },
    telemetry: null,
    tapes: {
      schema: 'vurify/editor-tapes',
      schemaVersion: 1,
      byKind: {},
      byPhaseId: { 'ph.code': emptyTape },
    },
  })
  assert.equal(atlas.tapes.find((row) => row.phaseId === 'ph.code')?.applyCount, 0)
  const pasteCheck = atlas.collectors.checks.find((row) => row.id === 'paste')
  const typingCheck = atlas.collectors.checks.find((row) => row.id === 'typing')
  const snapshot = (row) => {
    if (typeof row?.unit !== 'number') return String(row?.reading ?? '')
    return `${row.reading} · ${Math.round(row.unit * 100)}%`
  }
  assert.ok(!/100%/.test(snapshot(pasteCheck)), 'negative: empty sitting must not paint Paste bursts as 100%')
  assert.ok(!/100%/.test(snapshot(typingCheck)), 'negative: empty sitting must not paint Typing as 100%')
  assert.equal(pasteCheck?.unit, undefined)
  assert.equal(typingCheck?.unit, undefined)
}

{
  const empty = compileSessionSignalAtlas({
    brief,
    response: {
      ...emptyInterviewResponse(briefId),
      completedPhaseIds: ['ph.talk'],
    },
  })
  assert.ok(!empty.leftover.some((r) => r.boardSummary))
  const emptyGrains = collectorSignalGrains({ atlas: empty, hosts: [] })
  assert.match(String(emptyGrains['sig.clarity.v1'].justification), /finished/)
  assert.ok(!/Cleared the suite/.test(String(emptyGrains['sig.clarity.v1'].justification)), 'negative: empty leftovers stay clock-only')
}

{
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const here = dirname(fileURLToPath(import.meta.url))
  const beats = readFileSync(join(here, '../../components/InterviewFlowReportBeats.tsx'), 'utf8')
  for (const name of [
    'OverviewBeat',
    'OverviewBeatStack',
    'OverviewSnapshot',
    'BeatTagRow',
    'featureTags',
    'ReportShell',
    'ResultRadar',
    'ResultRadarNotes',
    'ResultRadarKey',
  ]) {
    assert.ok(
      new RegExp(`export function ${name}\\b`).test(beats),
      `InterviewFlowReportBeats must export ${name}`,
    )
  }
  const overview = readFileSync(join(here, '../../components/InterviewFlowOverviewSection.tsx'), 'utf8')
  assert.ok(
    /from '.\/InterviewFlowReportBeats'/.test(overview),
    'Clarity Overview imports shared report beats',
  )
  const detailStart = overview.indexOf('function ClarityDetailBeats')
  const detailEnd = overview.indexOf('function asSeries', detailStart)
  const detail = overview.slice(detailStart, detailEnd)
  assert.ok(detail.includes('clarityChecks'), 'See more renders named clock checks')
  assert.ok(detail.includes('clarityFindings'), 'See more keeps per-section work-state')
  assert.ok(
    /sittingWideClarityParas/.test(detail) && /clarityParagraphs/.test(detail),
    'See more lead is the sitting-wide glance, not every paragraph',
  )
  assert.equal(
    /overview\.clarityParagraphs\.map/.test(detail),
    false,
    'negative: Clarity See more must not dump every summary paragraph',
  )
  const result = readFileSync(join(here, '../../components/InterviewFlowResultSection.tsx'), 'utf8')
  assert.ok(
    /from '.\/InterviewFlowReportBeats'/.test(result),
    'Collapsed Results imports shared ResultRadar',
  )
  assert.equal(
    /function ResultRadar\(/.test(result),
    false,
    'negative: ResultRadar must not be redeclared in ResultSection',
  )
}

console.log('sessionSignals.unit.mjs: ok')
