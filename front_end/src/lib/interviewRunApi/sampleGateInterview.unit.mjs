/**
 * Deterministic full walk of the sample `/interview` brief — every gate into Results.
 * No OpenAI / no live Edge. Mock tool assess; collector fallbacks for signals / tape.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sampleGateInterview.unit.mjs
 * npm: front_end:test:sample-gate
 */
import assert from 'node:assert/strict'
import {
  INTERVIEW_PAGE_BRIEF_FIXTURE,
  interviewPageLandingView,
} from '../interviewBrief/interviewPageFixture.ts'
import { mapCreator2BriefToTimeline } from '../interviewBrief/mapCreator2BriefToTimeline.ts'
import { TALK_VERIFY_ATTEMPT_FIXTURE_ID } from './fixtures/attempt-responses/loadAttemptResponseFixture.ts'
import { EDITOR_TAPE_SCHEMA } from './editorCapture/types.ts'
import { saveEditorTape } from './editorCapture/store.ts'
import {
  appendResponseMessage,
  getInterviewResponse,
  mergeFilledAfterTurnGrains,
  mergeFilledTopicEnd,
} from './interviewResponse.ts'
import { enqueueSectionMarks, runCompleteSection } from './completeSection.ts'
import { awaitMarkJobs, bumpMarkJobGeneration } from './markJobs.ts'
import { buildLiveOutputCard } from './liveOutputCard.ts'
import {
  runLeaveToLanding,
  runOpenAttempt,
  runRestartAttempt,
  runStartTalk,
} from './localRunner.ts'
import { resolveGateToolMount } from './resolveGateToolMount.ts'
import { buildResultReviewPack, fillResultReviewStage, liveResultReviewAttempt } from './resultSectionReview.ts'
import {
  resetTelemetrySession,
  setTelemetryPhase,
  startSessionTelemetry,
  stopSessionTelemetry,
  tickTelemetryForTests,
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

globalThis.fetch = async () => {
  throw new Error('sample-gate: Edge is offline')
}

const BANNED = /\bthe (?:day|sitting|board)\b/i
const CANNED_ID = TALK_VERIFY_ATTEMPT_FIXTURE_ID
const brief = INTERVIEW_PAGE_BRIEF_FIXTURE
const landing = interviewPageLandingView()
const PHASE_IDS = brief.phases.map((p) => p.id)
assert.equal(PHASE_IDS.length, 7)

function grain(input) {
  return {
    order: 1,
    status: 'filled',
    result: null,
    justification: 'Offline mock',
    confidence: 'med',
    ...input,
  }
}

async function mockAssessTool(input) {
  const phase = brief.phases.find((p) => p.id === input.phaseId)
  const hostRef =
    phase && 'toolRef' in phase && typeof phase.toolRef === 'string' ? phase.toolRef : ''
  const type = String(brief.tools[hostRef]?.type ?? '')
  if (type === 'form' || type === 'form_quiz') {
    return {
      hostRef,
      codeRun: null,
      result: {
        package: { boardSummary: 'Cleared the work-authorization screen.', kind: 'form' },
        grains: {
          'mark.form.key.v1': grain({
            templateId: 'mark.form.key.v1',
            hostRef,
            grain: 'after_tool',
            result: { gradedScore: 14, gradedMax: 16, passed: true },
          }),
          'synth.tool.v1': grain({
            templateId: 'synth.tool.v1',
            hostRef,
            grain: 'after_tool',
            result: { boardSummary: 'Cleared the work-authorization screen.' },
          }),
        },
      },
    }
  }
  if (type === 'coding') {
    return {
      hostRef,
      codeRun: null,
      result: {
        package: { boardSummary: 'Tests passed on the visible cases.', kind: 'coding' },
        grains: {
          'mark.code.tests.v1': grain({
            templateId: 'mark.code.tests.v1',
            hostRef,
            grain: 'after_tool',
            result: { passedCount: 3, total: 3, passed: true },
          }),
          'mark.code.method.v1': grain({
            templateId: 'mark.code.method.v1',
            hostRef,
            grain: 'after_tool',
            result: { composite: 0.8 },
            dimensions: [
              { key: 'approach', score: 'strong' },
              { key: 'clarity', score: 'strong' },
              { key: 'complexity', score: 'mixed' },
            ],
          }),
          'mark.code.structure.v1': grain({
            templateId: 'mark.code.structure.v1',
            hostRef,
            grain: 'after_tool',
            result: { composite: 0.75 },
          }),
          'synth.tool.v1': grain({
            templateId: 'synth.tool.v1',
            hostRef,
            grain: 'after_tool',
            result: { boardSummary: 'Tests passed on the visible cases.' },
          }),
        },
      },
    }
  }
  if (type === 'doc') {
    return {
      hostRef,
      codeRun: null,
      result: {
        package: { boardSummary: 'Memo named the tradeoff and the rollback.', kind: 'doc' },
        grains: {
          'mark.doc.essay.v1': grain({
            templateId: 'mark.doc.essay.v1',
            hostRef,
            grain: 'after_tool',
            result: { composite: 0.72 },
          }),
          'synth.tool.v1': grain({
            templateId: 'synth.tool.v1',
            hostRef,
            grain: 'after_tool',
            result: { boardSummary: 'Memo named the tradeoff and the rollback.' },
          }),
        },
      },
    }
  }
  return null
}

async function mockAssess() {
  throw new Error('sample-gate: collector fallback')
}

function plantTape(briefId, phaseId, kind) {
  const attemptId = getInterviewResponse(briefId).attemptId
  const final = { kind }
  saveEditorTape({
    schema: EDITOR_TAPE_SCHEMA,
    schemaVersion: 1,
    briefId,
    attemptId,
    phaseId,
    kind,
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationMs: 90_000,
    initial: final,
    events: [
      { t: 0, type: 'checkpoint', checkpoint: final },
      { t: 90_000, type: 'session_end' },
    ],
    final,
  })
}

function mockArtifact(phaseId, toolKind) {
  const mount = resolveGateToolMount({ brief, phaseId })
  if (!mount || mount.kind !== toolKind) return null
  if (mount.kind === 'form') return { kind: 'form', document: mount.document }
  if (mount.kind === 'coding') return { kind: 'coding', payload: mount.workspace }
  if (mount.kind === 'doc') return { kind: 'doc', payload: mount.document }
  return null
}

function seedTalkAnswer(briefId, phaseId) {
  const phase = brief.phases.find((p) => p.id === phaseId)
  const topicId = phase && 'topicId' in phase ? String(phase.topicId ?? '') : ''
  appendResponseMessage(getInterviewResponse(briefId), {
    phaseId,
    topicId,
    role: 'candidate',
    text: 'I owned the pager rotation last quarter and declared the rollback myself.',
    probeId: null,
    kind: 'answer',
  })
}

function fillTalkOffline(briefId, phaseId) {
  const phase = brief.phases.find((p) => p.id === phaseId)
  const topicId = phase && 'topicId' in phase ? String(phase.topicId ?? '') : ''
  const doc = getInterviewResponse(briefId)
  const cand = [...doc.messages]
    .reverse()
    .find((m) => m.phaseId === phaseId && m.role === 'candidate')
  if (cand) {
    mergeFilledAfterTurnGrains(getInterviewResponse(briefId), cand.id, {
      'iv.delivery.v1': grain({
        templateId: 'iv.delivery.v1',
        hostRef: topicId,
        grain: 'after_turn',
        dimensions: [
          { key: 'clarity', score: 'strong' },
          { key: 'composure', score: 'strong' },
          { key: 'structure', score: 'mixed' },
        ],
      }),
      'iv.content.v1': grain({
        templateId: 'iv.content.v1',
        hostRef: topicId,
        grain: 'after_turn',
        dimensions: [
          { key: 'relevance', score: 'strong' },
          { key: 'depth', score: 'mixed' },
          { key: 'specificity', score: 'strong' },
        ],
      }),
    })
  }
  if (!topicId) return
  mergeFilledTopicEnd(getInterviewResponse(briefId), topicId, {
    synthesisText: 'Named a concrete incident and the call they made.',
    targets: {},
    byTemplate: {
      'synth.topic.v1': grain({
        templateId: 'synth.topic.v1',
        hostRef: topicId,
        grain: 'topic_end',
        result: { boardSummary: 'Named a concrete incident and the call they made.' },
      }),
    },
  })
}

async function walkSitting(briefId, { forfeitLast } = {}) {
  runRestartAttempt({ briefId, landing, brief })
  const attemptId = getInterviewResponse(briefId).attemptId
  startSessionTelemetry({
    briefId,
    attemptId,
    phaseId: PHASE_IDS[0],
  })
  try {
    let snap = runOpenAttempt({ briefId, landing, brief })
    const visited = []
    while (snap.mode === 'gate' && snap.gate) {
      const phaseId = snap.gate.phaseId
      const isTalk = snap.gate.isTalk
      const toolKind = snap.gate.toolKind
      visited.push(phaseId)
      assert.ok(visited.length <= PHASE_IDS.length + 1, 'gate loop')
      setTelemetryPhase(phaseId)
      tickTelemetryForTests(2000)

      if (forfeitLast && visited.length === PHASE_IDS.length) {
        snap = runLeaveToLanding({
          briefId,
          landing,
          brief,
          phaseId,
          forfeit: true,
        })
        break
      }

      const shared = {
        briefId,
        landing,
        phaseId,
        brief,
        stageStarted: true,
        assess: mockAssess,
        assessTool: mockAssessTool,
      }

      if (isTalk) {
        snap = await runStartTalk({ briefId, landing, phaseId, brief })
        seedTalkAnswer(briefId, phaseId)
        const done = await runCompleteSection({ ...shared, isTalk: true })
        snap = done.snapshot
        await awaitMarkJobs()
        fillTalkOffline(briefId, phaseId)
      } else {
        assert.ok(toolKind, phaseId)
        plantTape(briefId, phaseId, toolKind)
        const done = await runCompleteSection({
          ...shared,
          isTalk: false,
          artifact: mockArtifact(phaseId, toolKind),
        })
        snap = done.snapshot
        await awaitMarkJobs()
      }
    }
    await awaitMarkJobs()
    return { snap, visited }
  } finally {
    stopSessionTelemetry()
    resetTelemetrySession()
  }
}

function assertNoBanned(label, text) {
  assert.equal(BANNED.test(String(text ?? '')), false, label)
}

function assertResults(briefId, { skippedLast } = {}) {
  const pack = buildLiveOutputCard({ briefId, brief })
  const { card, overview, response } = pack
  assert.equal(card.id, response.attemptId)
  assert.notEqual(card.id, CANNED_ID)
  assert.ok(!String(card.id).includes(CANNED_ID))

  const sections = overview.sittingSections
  assert.equal(sections.length, PHASE_IDS.length)
  for (const id of PHASE_IDS) {
    const row = sections.find((s) => s.sectionId === id)
    assert.ok(row, id)
    assert.ok(String(row.body ?? '').trim(), `${id} sitting body`)
    assertNoBanned(`${id} body`, row.body)
  }

  if (skippedLast) {
    const last = sections.find((s) => s.sectionId === PHASE_IDS.at(-1))
    assert.match(last.body, /forfeit/i)
    assert.ok(last.tags.some((t) => t.label === 'Fail'))
  } else {
    const form = sections.find((s) => s.sectionId === 'ph.fi4fpq')
    assert.ok(form.tags.some((t) => t.label === '14 / 16'), form.tags)
    const codes = sections.filter((s) => s.sectionId === 'ph.8xz0sd' || s.sectionId === 'ph.bd0xml')
    assert.equal(codes.length, 2)
    for (const row of codes) {
      assert.ok(row.tags.some((t) => t.hint === 'Tests'), row.tags)
      assert.ok(row.tags.some((t) => t.hint === 'Method'), row.tags)
    }
  }

  const signals = response.analysis.signals ?? {}
  assert.ok(signals['sig.clarity.v1'], 'sig.clarity.v1')
  assert.ok(signals['sig.security.v1'], 'sig.security.v1')
  assert.notEqual(signals['sig.clarity.v1']?.status, 'pending')
  assert.notEqual(signals['sig.security.v1']?.status, 'pending')

  const timeline = mapCreator2BriefToTimeline(brief)
  const review = buildResultReviewPack({
    overview,
    steps: timeline.steps,
    brief,
    attempt: liveResultReviewAttempt({ briefId, brief, scored: pack.scored }),
  })
  const toolSteps = timeline.steps.filter(
    (s) => s.kind === 'form' || s.kind === 'coding' || s.kind === 'doc',
  )
  for (const step of toolSteps) {
    if (skippedLast && step.id === PHASE_IDS.at(-1)) continue
    assert.equal(review.sections[step.id]?.canEditor, true, step.id)
  }
  if (!skippedLast) {
    assert.equal(Object.keys(review.form).length, 0)
    assert.equal(Object.keys(review.coding).length, 0)
    fillResultReviewStage(review, 'ph.fi4fpq', 'editor')
    fillResultReviewStage(review, 'ph.8xz0sd', 'editor')
    fillResultReviewStage(review, 'ph.bd0xml', 'editor')
    fillResultReviewStage(review, 'ph.6pltkr', 'editor')
    assert.ok(review.form['ph.fi4fpq'])
    assert.ok(review.coding['ph.8xz0sd'])
    assert.ok(review.coding['ph.bd0xml'])
    assert.ok(review.essay['ph.6pltkr'])
    const talks = timeline.steps.filter((s) => s.kind === 'talk')
    assert.equal(talks.length, 3)
    for (const step of talks) {
      assert.equal(review.sections[step.id]?.canChat, true, step.id)
    }
  }

  const blob = JSON.stringify({
    sitting: sections,
    overview: overview.sittingSections,
  })
  assert.equal(BANNED.test(blob), false, 'banned copy')
  return pack
}

{
  const briefId = 'fixture:sample-gate-happy'
  const { snap, visited } = await walkSitting(briefId)
  assert.equal(snap.mode, 'finished')
  assert.deepEqual(visited, PHASE_IDS)
  const response = getInterviewResponse(briefId)
  assert.deepEqual([...response.completedPhaseIds], PHASE_IDS)
  assert.equal(response.skippedPhaseIds.length, 0)
  assertResults(briefId)
}

{
  const briefId = 'fixture:sample-gate-forfeit'
  const { snap, visited } = await walkSitting(briefId, { forfeitLast: true })
  assert.equal(snap.mode, 'finished')
  assert.deepEqual(visited, PHASE_IDS)
  const response = getInterviewResponse(briefId)
  const last = PHASE_IDS.at(-1)
  assert.deepEqual([...response.completedPhaseIds], PHASE_IDS.slice(0, -1))
  assert.ok(response.skippedPhaseIds.includes(last))
  assertResults(briefId, { skippedLast: true })
}

{
  const briefId = 'fixture:sample-gate-leave-marks'
  runRestartAttempt({ briefId, landing, brief })
  let snap = runOpenAttempt({ briefId, landing, brief })
  assert.equal(snap.mode, 'gate')
  const phaseId = snap.gate.phaseId
  const isTalk = snap.gate.isTalk
  const toolKind = snap.gate.toolKind
  const phase = brief.phases.find((p) => p.id === phaseId)
  const topicId = phase && 'topicId' in phase ? String(phase.topicId ?? '') : ''
  const toolRef = phase && 'toolRef' in phase ? String(phase.toolRef ?? '') : ''

  const shared = {
    briefId,
    landing,
    phaseId,
    brief,
    stageStarted: true,
    assess: mockAssess,
    assessTool: mockAssessTool,
  }

  if (isTalk) {
    snap = await runStartTalk({ briefId, landing, phaseId, brief })
    seedTalkAnswer(briefId, phaseId)
    await enqueueSectionMarks({ ...shared, isTalk: true })
  } else {
    assert.ok(toolKind, phaseId)
    plantTape(briefId, phaseId, toolKind)
    await enqueueSectionMarks({
      ...shared,
      isTalk: false,
      artifact: mockArtifact(phaseId, toolKind),
    })
  }

  snap = runLeaveToLanding({
    briefId,
    landing,
    brief,
    phaseId,
    forfeit: false,
  })
  assert.equal(snap.mode, 'landing')
  const response = getInterviewResponse(briefId)
  assert.equal(response.completedPhaseIds.includes(phaseId), false)
  assert.equal(response.skippedPhaseIds.includes(phaseId), false)
  if (isTalk) {
    const row = response.analysis.topics[topicId]?.byTemplate ?? {}
    assert.ok(
      Object.values(row).some((g) => g.status === 'pending'),
      'leave-after-Start Talk pending topic_end',
    )
  } else {
    const row = response.analysis.tools[toolRef] ?? {}
    assert.ok(
      Object.values(row).some((g) => g.status === 'pending'),
      'leave-after-Start tool pending after_tool',
    )
  }
  bumpMarkJobGeneration()
}

console.log('sampleGateInterview.unit.mjs: ok')
