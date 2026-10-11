/**
 * No miss template.
 *
 * Every built-in analysis template is either wired into the grade or deliberately
 * classified as something else. This gate walks `builtinTemplateIds()` rather than a
 * hand-written list, so adding a template without deciding where it lands fails here
 * instead of silently vanishing from a candidate's score.
 *
 * It also pins the answer-key mark's two modes: gate only by default, blended into the
 * score when the author weights it.
 */
import assert from 'node:assert/strict'
import { scoreAttempt } from './scoreAttempt.ts'
import { builtinTemplateIds, isGradeRole, resolveTemplateRole } from './templateRoles.ts'

/**
 * Templates that do not carry a score, and why. A new id must be added here or wired
 * into the grade — the roster assertion below refuses a third option.
 */
const NON_GRADE = {
  'synth.topic.v1': 'narrative.paragraph',
  'synth.tool.v1': 'narrative.paragraph',
  'mark.form.reasoning.v1': 'narrative.paragraph',
  'rollup.attempt.v1': 'narrative.rollup',
  'sig.security.v1': 'collect.scalar',
  'sig.clarity.v1': 'collect.scalar',
}

const briefWith = (formMarkWeight) => ({
  schemaVersion: 1,
  kind: 'interview_brief',
  definition: {},
  topicLibrary: [{ id: 'topic.t1', label: 'Opening', probes: [] }],
  phases: [
    { id: 'ph.talk', kind: 'discussion', topicId: 'topic.t1', title: 'Talk' },
    { id: 'ph.form', kind: 'tool', toolRef: 'tool.form', title: 'Form' },
    { id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: 'Code' },
    { id: 'ph.doc', kind: 'tool', toolRef: 'tool.doc', title: 'Essay' },
  ],
  tools: {
    'tool.form': { type: 'form' },
    'tool.code': { type: 'coding' },
    'tool.doc': { type: 'doc' },
  },
  analysis: {
    rollup: {
      weights: {
        interviewDelivery: 0.2,
        interviewContent: 0.3,
        codingTests: 0.2,
        codingMethod: 0.1,
        essay: 0.2,
        formMark: formMarkWeight,
      },
    },
  },
})

const dimsGrain = (templateId, hostRef) => ({
  templateId,
  hostRef,
  status: 'filled',
  dimensions: [{ key: 'k', label: 'K', score: 'strong', depth: { position: 5 } }],
})
const passGrain = (templateId, hostRef) => ({
  templateId,
  hostRef,
  status: 'filled',
  result: { passed: true, gradedScore: 8, gradedMax: 10 },
})
const scalarGrain = (templateId, hostRef) => ({
  templateId,
  hostRef,
  status: 'filled',
  result: { score: 4, max: 5 },
})

function markEverything() {
  const tools = {}
  const topics = { 'topic.t1': { byTemplate: {} } }
  const turns = { m1: {} }

  for (const id of builtinTemplateIds()) {
    const meta = resolveTemplateRole(id)
    if (!isGradeRole(meta.role)) continue
    const make =
      meta.outputKind === 'passFail'
        ? passGrain
        : meta.outputKind === 'scalar'
          ? scalarGrain
          : dimsGrain

    if (id === 'mark.assist.use.v1') {
      // Assist is marked per turn against the tool it assisted, never on the tool row.
      turns.m1[id] = make(id, 'tool.code')
      continue
    }
    const host = id.startsWith('mark.form.')
      ? 'tool.form'
      : id.startsWith('mark.code.')
        ? 'tool.code'
        : id.startsWith('mark.doc.')
          ? 'tool.doc'
          : null
    if (host) {
      tools[host] = tools[host] ?? {}
      tools[host][id] = make(id, host)
    } else if (id === 'iv.delivery.v1' || id === 'iv.question.v1') {
      turns.m1[id] = make(id, 'topic.t1')
    } else {
      topics['topic.t1'].byTemplate[id] = make(id, 'topic.t1')
    }
  }

  return {
    schema: 'vurify/interview-response',
    version: 1,
    briefId: 'coverage',
    messages: [{ id: 'm1', role: 'candidate', phaseId: 'ph.talk', text: 'hi' }],
    analysis: { turns, tools, topics, signals: {} },
    completedPhaseIds: ['ph.talk', 'ph.form', 'ph.code', 'ph.doc'],
    skippedPhaseIds: [],
  }
}

const response = markEverything()

// ── Roster: every built-in is graded or explicitly excused ───────────────────
for (const id of builtinTemplateIds()) {
  const meta = resolveTemplateRole(id)
  if (isGradeRole(meta.role)) {
    assert.ok(
      meta.decisionBucket,
      `${id} carries a grade role but no decision bucket — it can never reach a score`,
    )
    continue
  }
  assert.equal(
    NON_GRADE[id],
    meta.role,
    `${id} is not graded and is not listed in NON_GRADE. Wire it into a bucket or record why it carries no score.`,
  )
}

// ── Every grade template reaches the grade ───────────────────────────────────
{
  const scored = scoreAttempt({ brief: briefWith(0.2), response })
  const reached = new Set(scored.contributions.map((c) => c.templateId))
  const missing = builtinTemplateIds().filter(
    (id) => isGradeRole(resolveTemplateRole(id).role) && !reached.has(id),
  )
  assert.deepEqual(
    missing,
    [],
    `marked templates that never reached the grade: ${missing.join(', ')}`,
  )
}

// ── The answer-key mark: gate only by default, counted when weighted ─────────
// This is the pair that used to be broken. `mark.form.key.v1` was skipped in three
// places, so a form section could pass or fail an attempt and still contribute
// nothing to the score no matter what weight the author set.
{
  const gateOnly = scoreAttempt({ brief: briefWith('gate_only'), response })
  assert.equal(
    gateOnly.contributions.some((c) => c.templateId === 'mark.form.key.v1'),
    false,
    'gate_only must keep the answer key out of the blended score',
  )
  assert.equal(
    gateOnly.softGrade.byWeight.formMark,
    undefined,
    'gate_only must not open a formMark bucket',
  )
  assert.equal(gateOnly.formGate?.passed, true, 'the gate still fires when it is gate only')

  const counted = scoreAttempt({ brief: briefWith(0.2), response })
  const row = counted.softGrade.byWeight.formMark
  assert.ok(row?.included, 'a weighted answer key opens a counted bucket')
  // 8 of 10 on the key is 0.8 — partial credit, not a bare pass/fail 1.
  assert.ok(
    Math.abs(row.unit - 0.8) < 1e-9,
    `answer key scores its partial credit, got ${row.unit}`,
  )
  assert.equal(
    counted.formGate?.passed,
    true,
    'counting the answer key does not disable the gate',
  )

  // A weight of 0 is "recorded, does not count" — same rule as every other tier.
  const zero = scoreAttempt({ brief: briefWith(0), response })
  assert.equal(
    zero.contributions.some((c) => c.templateId === 'mark.form.key.v1'),
    false,
    'a 0-weight answer key does not count',
  )

  // Weighting it must actually move the number, or "counts toward grading" is a lie.
  assert.notEqual(
    counted.softGrade.overall,
    gateOnly.softGrade.overall,
    'weighting the answer key must change the overall score',
  )
}

console.log('templateGradeCoverage.unit.mjs OK')
