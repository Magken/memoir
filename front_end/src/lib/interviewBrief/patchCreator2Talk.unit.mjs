/**
 * Unit checks for Creator 2 talk / analysis / spine patches.
 * Run: npx tsx front_end/src/lib/interviewBrief/patchCreator2Talk.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { patchCreator2TalkStep } from './patchCreator2TalkStep.ts'
import {
  patchCreator2AnalysisShelf,
  resetBuiltinAttachPacks,
} from './patchCreator2AnalysisShelf.ts'
import { patchCreator2Spine } from './patchCreator2Spine.ts'
import { mapCreator2BriefToTimeline } from './mapCreator2BriefToTimeline.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/creator2ComprehensiveBrief.json'), 'utf8'),
)

{
  const mapped = mapCreator2BriefToTimeline(structuredClone(fixture))
  const talk = mapped.steps.find((s) => s.talkEditor)
  assert.ok(talk?.talkEditor, 'talk steps should expose talkEditor')
  assert.ok(mapped.analysisShelf, 'brief should expose analysisShelf')
  assert.ok(
    talk.tags.every((t) => !t.id.includes('override')),
    'talk tags should be live-derived only',
  )
  assert.ok(
    talk.tags.some((t) => t.id.endsWith('.tag.probes')),
    'talk should have probe count tag',
  )
}

{
  const doc = structuredClone(fixture)
  const mapped = mapCreator2BriefToTimeline(doc)
  const talk = mapped.steps.find((s) => s.id === 'ph.conflict')
  assert.ok(talk?.talkEditor)
  const next = {
    ...talk.talkEditor,
    sectionTitle: 'Conflict deep-dive',
    targetMinutes: 12,
    maxFollowUps: talk.talkEditor.maxFollowUps, // keep override or null
    probes: [
      ...talk.talkEditor.probes,
      { id: 'p.new', goal: 'New goal', required: false, hint: null },
    ],
    templateIds: ['iv.question.v1'],
    onFail: 'endAttempt',
    onFailPhaseId: null,
  }
  // Force inherit: equal to defaults should omit
  next.maxProbes = mapped.probeDefaults?.maxProbes ?? 4
  const patched = patchCreator2TalkStep(doc, 'ph.conflict', {
    ...next,
    maxProbes: mapped.probeDefaults?.maxProbes ?? 4,
  })
  const phase = patched.phases.find((p) => p.id === 'ph.conflict')
  const topic = patched.topicLibrary.find((t) => t.id === patched.phases.find((p) => p.id === 'ph.conflict')?.topicId)
  assert.equal(phase?.title, 'Conflict deep-dive')
  assert.equal(topic?.label, 'Conflict deep-dive')
  assert.equal(phase?.estimatedMinutes, 12)
  assert.equal(topic?.targetMinutes, 12)
  assert.equal(phase?.onFail, 'endAttempt')
  assert.equal(topic?.probes.length, talk.talkEditor.probes.length + 1)
  assert.deepEqual(topic?.analysis?.templateIds, ['iv.question.v1'])
  assert.equal(topic?.analysis?.attachPack, null)
  assert.equal(phase?.summary?.tags, undefined)
  // sparse: maxProbes equal to default should be omitted
  assert.equal(topic?.maxProbes, undefined)
  assert.ok(patched.timingSummary?.sections?.some((s) => s.phaseId === 'ph.conflict' && s.estimatedMinutes === 12))
}

{
  // Title / purpose stay synced across timeline fields and topic library
  const doc = structuredClone(fixture)
  const mapped = mapCreator2BriefToTimeline(doc)
  const talk = mapped.steps.find((s) => s.id === 'ph.conflict')
  assert.ok(talk?.talkEditor)
  const fromTopic = patchCreator2TalkStep(doc, 'ph.conflict', {
    ...talk.talkEditor,
    sectionTitle: 'Owned conflict story',
    summaryBlurb: 'Learn how they handle ownership under pressure',
  })
  const phase = fromTopic.phases.find((p) => p.id === 'ph.conflict')
  const topic = fromTopic.topicLibrary.find((t) => t.id === phase?.topicId)
  assert.equal(phase?.title, 'Owned conflict story')
  assert.equal(topic?.label, 'Owned conflict story')
  assert.equal(phase?.summary?.blurb, 'Learn how they handle ownership under pressure')
  assert.equal(topic?.purpose, 'Learn how they handle ownership under pressure')
  const remapped = mapCreator2BriefToTimeline(fromTopic)
  const again = remapped.steps.find((s) => s.id === 'ph.conflict')?.talkEditor
  assert.equal(again?.sectionTitle, 'Owned conflict story')
  assert.equal(again?.topicLabel, 'Owned conflict story')
  assert.equal(again?.summaryBlurb, 'Learn how they handle ownership under pressure')
  assert.equal(again?.purpose, 'Learn how they handle ownership under pressure')
}

{
  // 1:1 clone when two phases share a topic
  const doc = structuredClone(fixture)
  const sharedTopicId = 'topic.warmup'
  doc.phases.push({
    id: 'ph.warmup2',
    kind: 'discussion',
    topicId: sharedTopicId,
    title: 'Warmup copy phase',
    estimatedMinutes: 3,
  })
  const mapped = mapCreator2BriefToTimeline(doc)
  const talk = mapped.steps.find((s) => s.id === 'ph.warmup')
  assert.ok(talk?.talkEditor)
  const patched = patchCreator2TalkStep(doc, 'ph.warmup', {
    ...talk.talkEditor,
    summaryBlurb: 'Cloned purpose',
  })
  const p1 = patched.phases.find((p) => p.id === 'ph.warmup')
  const p2 = patched.phases.find((p) => p.id === 'ph.warmup2')
  assert.notEqual(p1?.topicId, p2?.topicId)
  assert.equal(p2?.topicId, sharedTopicId)
  const t1 = patched.topicLibrary.find((t) => t.id === p1?.topicId)
  assert.equal(t1?.purpose, 'Cloned purpose')
}

{
  const doc = structuredClone(fixture)
  const mapped = mapCreator2BriefToTimeline(doc)
  const shelf = mapped.analysisShelf
  assert.ok(shelf)
  const referencedPack =
    Object.keys(shelf.attachPacks).find((id) =>
      JSON.stringify(doc).includes(`"attachPack": "${id}"`),
    ) ?? null
  if (referencedPack) {
    const bad = patchCreator2AnalysisShelf(doc, {
      ...shelf,
      attachPacks: Object.fromEntries(
        Object.entries(shelf.attachPacks).filter(([id]) => id !== referencedPack),
      ),
    })
    assert.ok(bad.warning, `removing referenced ${referencedPack} should warn`)
    assert.equal(bad.doc, doc)
  }

  const ok = patchCreator2AnalysisShelf(doc, {
    ...shelf,
    probeDefaults: { ...shelf.probeDefaults, targetMinutes: 7 },
  })
  assert.equal(ok.doc.definition.probeDefaults.targetMinutes, 7)
  assert.ok(!ok.warning)

  const withMeta = patchCreator2AnalysisShelf(doc, {
    ...shelf,
    templateMeta: {
      'iv.delivery.v1': {
        title: 'Clarity card',
        subtitle: 'Custom subtitle',
        details: 'Edited details for the card strip.',
      },
    },
  })
  assert.equal(
    withMeta.doc.analysis.overrides?.templateCards?.['iv.delivery.v1']?.title,
    'Clarity card',
  )
  const remapped = mapCreator2BriefToTimeline(withMeta.doc)
  assert.equal(remapped.analysisShelf?.templateMeta['iv.delivery.v1']?.title, 'Clarity card')

  const reset = resetBuiltinAttachPacks(doc)
  assert.ok(reset.analysis.attachPacks['pack.talk']?.includes('iv.delivery.v1'))
}

{
  const doc = structuredClone(fixture)
  const before = doc.phases.length
  const added = patchCreator2Spine(doc, { type: 'addTalk' })
  assert.equal(added.phases.length, before + 1)
  assert.equal(added.topicLibrary.length, doc.topicLibrary.length + 1)
  const newPhase = added.phases[added.phases.length - 1]
  assert.equal(newPhase.kind, 'discussion')
  assert.ok(newPhase.topicId)
  const addedTopic = added.topicLibrary.find((t) => t.id === newPhase.topicId)
  assert.equal(newPhase.title, 'Decision conversation')
  assert.ok((addedTopic?.probes ?? []).length >= 3, 'talk add uses the picker probes')
  assert.ok(!addedTopic?.probes?.some((p) => /What should we learn/.test(p.goal)))
  assert.notEqual(addedTopic?.purpose, 'Please edit')
  assert.notEqual(newPhase.title, 'New talk')

  const moved = patchCreator2Spine(added, {
    type: 'moveTalk',
    phaseId: newPhase.id,
    direction: 'up',
  })
  const idx = moved.phases.findIndex((p) => p.id === newPhase.id)
  assert.ok(idx >= 0 && idx < moved.phases.length - 1)

  const reversed = [...moved.phases].map((p) => p.id).reverse()
  const reordered = patchCreator2Spine(moved, {
    type: 'reorderPhases',
    phaseIds: reversed,
  })
  assert.deepEqual(
    reordered.phases.map((p) => p.id),
    reversed,
  )

  const removed = patchCreator2Spine(moved, { type: 'removeTalk', phaseId: newPhase.id })
  assert.equal(removed.phases.length, before)
  assert.ok(!removed.topicLibrary.some((t) => t.id === newPhase.topicId))
}

{
  const doc = structuredClone(fixture)
  const before = doc.phases.length
  const formDoc = patchCreator2Spine(doc, { type: 'addSection', kind: 'form' })
  assert.equal(formDoc.phases.length, before + 1)
  const formPhase = formDoc.phases[formDoc.phases.length - 1]
  assert.equal(formPhase.kind, 'tool')
  assert.ok(formPhase.toolRef)
  assert.equal(formDoc.tools[formPhase.toolRef]?.type, 'form_quiz')
  assert.deepEqual(
    formDoc.tools[formPhase.toolRef]?.analysis?.templateIds,
    ['mark.form.key.v1', 'mark.form.reasoning.v1', 'synth.tool.v1'],
  )
  const formTool = formDoc.tools[formPhase.toolRef]
  assert.equal(formTool?.title, 'Screening sample', `form title got ${formTool?.title}`)
  assert.equal(formPhase.title, 'Screening sample')
  const formHay = JSON.stringify(formTool)
  assert.ok(
    !/authorized to work|Notice period|open to relocating/i.test(formHay),
    'Contents/add form must not be the eligibility screening starter',
  )
  const formKinds = new Set((formTool?.artifact?.inline?.questions ?? []).map((q) => q.kind))
  for (const kind of ['short_text', 'mcq_single', 'mcq_multi', 'dropdown', 'fill_blank', 'ordinal', 'ordinal_grid', 'essay']) {
    assert.ok(formKinds.has(kind), `form sample missing ${kind}`)
  }

  const codingDoc = patchCreator2Spine(formDoc, { type: 'addSection', kind: 'coding' })
  const codingPhase = codingDoc.phases[codingDoc.phases.length - 1]
  assert.equal(codingDoc.tools[codingPhase.toolRef]?.type, 'coding')
  assert.deepEqual(
    codingDoc.tools[codingPhase.toolRef]?.analysis?.templateIds,
    [
      'mark.code.tests.v1',
      'mark.code.method.v1',
      'mark.code.structure.v1',
      'mark.code.approach.v1',
      // Coding carries an authorship mark like writing does — paste and tape provenance.
      'mark.code.authorship.v1',
      'synth.tool.v1',
    ],
  )

  const codingTool = codingDoc.tools[codingPhase.toolRef]
  assert.ok((codingTool?.tests?.cases ?? []).length >= 3, `coding cases got ${(codingTool?.tests?.cases ?? []).length}`)
  const readme = (codingTool?.artifact?.inline?.files ?? []).find((f) => f.path === 'README.md')
  assert.ok(String(readme?.content ?? '').includes('Example'), 'coding add uses the picker README')

  const writingDoc = patchCreator2Spine(codingDoc, { type: 'addSection', kind: 'doc' })
  const writingPhase = writingDoc.phases[writingDoc.phases.length - 1]
  assert.equal(writingDoc.tools[writingPhase.toolRef]?.type, 'doc')
  assert.deepEqual(
    writingDoc.tools[writingPhase.toolRef]?.analysis?.templateIds,
    ['mark.doc.essay.v1', 'mark.doc.approach.v1', 'mark.doc.authorship.v1', 'synth.tool.v1'],
  )
  const writingTool = writingDoc.tools[writingPhase.toolRef]
  assert.ok(
    (writingTool?.assessment?.dimensions ?? []).length >= 4,
    'writing add uses the picker rubric',
  )
  assert.ok(
    (writingTool?.prompt?.structure ?? []).length >= 3,
    'writing add uses the picker outline',
  )
}

{
  const leftover = structuredClone(fixture)
  leftover.tools['tool.form.eligibility'].type = 'form'
  leftover.tools['tool.coding.1'].type = 'leetcode'
  leftover.tools['tool.doc.essay.optional'].type = 'writing'
  const mapped = mapCreator2BriefToTimeline(leftover)
  const form = mapped.steps.find((s) => s.id === 'ph.eligible')
  const coding = mapped.steps.find((s) => s.id === 'ph.code')
  const essay = mapped.steps.find((s) => s.id === 'ph.essay')
  assert.ok(form?.formEditor, 'leftover type form must still open the form editor')
  assert.ok(
    form.formEditor.document.questions.length >= 1,
    'leftover type form must still read the form body (not skip on !== form_quiz)',
  )
  assert.equal(form.kind, 'form')
  assert.ok(coding?.codingEditor, 'leftover type leetcode must still open the coding editor')
  assert.equal(coding.kind, 'coding')
  assert.ok(essay?.docEditor, 'leftover type writing must still open the essay editor')
  assert.equal(essay.kind, 'doc')
}

{
  const custom = structuredClone(fixture)
  const codePhase = custom.phases.find((p) => p.id === 'ph.code')
  assert.ok(codePhase, 'fixture has coding phase')
  custom.analysis.rollup.weights['coding-output'] = 0.3
  custom.analysis.rollup.weightSections['coding-output'] = ['ph.code']
  custom.analysis.rollup.weightTemplates = {
    ...(custom.analysis.rollup.weightTemplates ?? {}),
    'coding-output': ['mark.code.tests.v1'],
  }
  custom.analysis.rollup.weightLabels = {
    ...(custom.analysis.rollup.weightLabels ?? {}),
    'coding-output': 'Coding output',
  }
  const afterTalk = patchCreator2Spine(custom, { type: 'addTalk' })
  assert.ok(
    Object.prototype.hasOwnProperty.call(afterTalk.analysis.rollup?.weights ?? {}, 'coding-output'),
    'add-Talk keeps a custom folder that still has a live coding section',
  )

  const removedCoding = patchCreator2Spine(afterTalk, { type: 'removeTalk', phaseId: 'ph.code' })
  assert.equal(
    Object.prototype.hasOwnProperty.call(removedCoding.analysis.rollup?.weights ?? {}, 'coding-output'),
    false,
    'removing the last coding phase drops a folder whose only section was that coding id',
  )
}

{
  const doc = structuredClone(fixture)
  const mapped = mapCreator2BriefToTimeline(doc)
  const talk = mapped.steps.find((s) => s.id === 'ph.conflict')
  assert.ok(talk?.talkEditor)
  const firstId = talk.talkEditor.templateIds[0] ?? 'iv.delivery.v1'
  const weighted = patchCreator2TalkStep(doc, 'ph.conflict', {
    ...talk.talkEditor,
    templateWeights: { [firstId]: 0 },
  })
  assert.equal(weighted.analysis.rollup?.templateWeights?.['ph.conflict']?.[firstId], 0)
  const remapped = mapCreator2BriefToTimeline(weighted)
  const talk2 = remapped.steps.find((s) => s.id === 'ph.conflict')
  assert.equal(talk2?.talkEditor?.templateWeights?.[firstId], 0)
  const omitted = patchCreator2TalkStep(weighted, 'ph.conflict', {
    ...talk.talkEditor,
    templateWeights: {},
  })
  const even = omitted.analysis.rollup?.templateWeights?.['ph.conflict'] ?? {}
  const liveIds = talk.talkEditor.templateIds
  assert.ok(liveIds.length > 1, 'conflict talk has multiple templates')
  assert.equal(
    liveIds.every((id) => even[id] === 1),
    false,
    'empty omitted even-splits instead of all-1s',
  )
  const evenSum = liveIds.reduce((s, id) => s + Number(even[id] ?? 0), 0)
  assert.ok(Math.abs(evenSum - 1) < 1e-6, `even-split sum ${evenSum}`)
}

console.log('patchCreator2Talk.unit.mjs: ok')
