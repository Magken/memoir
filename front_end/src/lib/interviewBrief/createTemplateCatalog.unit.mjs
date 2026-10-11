/**
 * Picker create templates must match the live Creator-2 editor contract.
 * Run: npx tsx front_end/src/lib/interviewBrief/createTemplateCatalog.unit.mjs
 */
import assert from 'node:assert/strict'
import { impliedToolTemplateIds } from '../interviewRunApi/buildTalkContext.ts'
import { emptyCreator2BriefDocument, emptyComposeMeta } from './compose.ts'
import { patchCreator2Spine } from './patchCreator2Spine.ts'
import {
  buildBlankCreateDocument,
  buildCreateTemplateDocument,
  canOpenCreator2Builder,
  CREATE_TEMPLATE_CATALOG,
  createTemplateAccuracyIssues,
  createTemplateEntry,
  createTemplatePreview,
  documentForPickerStart,
  MIDDLE_TALK_TEMPLATE_IDS,
  pickerStartWelcomeMarkdown,
  stampCopyTitleOnBriefBody,
} from './createTemplateCatalog.ts'

{
  const blank = buildBlankCreateDocument()
  assert.equal(blank.phases.length, 0, `blank phases got ${blank.phases.length}`)
  assert.deepEqual(blank.analysis.rollup?.weights ?? {}, {}, 'blank weights must stay empty')
  assert.equal(blank.topicLibrary.length, 0, 'blank has no topics')
  assert.equal(createTemplateAccuracyIssues(blank).length, 0, 'blank accuracy')
  assert.equal(canOpenCreator2Builder(blank, 'picker'), true, 'picker opens blank')
  assert.equal(canOpenCreator2Builder(blank, 'generate'), false, 'generate rejects blank')
  assert.equal(canOpenCreator2Builder(null, 'picker'), false, 'picker rejects null')
}

{
  let threw = false
  try {
    createTemplateEntry('create.nope')
  } catch (e) {
    threw = /Unknown create template id/.test(String(e))
  }
  assert.ok(threw, 'unknown id must throw')
}

function toolType(doc, phase) {
  if (phase.kind !== 'tool' || !phase.toolRef) return ''
  return String(doc.tools[phase.toolRef]?.type ?? '')
}

function kindOf(doc, phase) {
  if (phase.kind === 'discussion') return 'talk'
  const t = toolType(doc, phase)
  if (t === 'form_quiz') return 'form'
  if (t === 'coding') return 'coding'
  if (t === 'doc') return 'doc'
  return t || phase.kind
}

{
  const order = CREATE_TEMPLATE_CATALOG.map((row) => row.id)
  assert.deepEqual(order, [
    'create.form',
    'create.talk',
    'create.coding',
    'create.doc',
    'create.full',
  ])
}

{
  const form = buildCreateTemplateDocument('create.form')
  assert.equal(form.phases.length, 1, `form phases got ${form.phases.length}`)
  assert.equal(kindOf(form, form.phases[0]), 'form')
  const ids = form.tools[form.phases[0].toolRef]?.analysis?.templateIds ?? []
  assert.deepEqual(ids, impliedToolTemplateIds('form_quiz'))
  assert.deepEqual(Object.keys(form.analysis.rollup?.weights ?? {}), [])
  assert.ok(!('formMark' in (form.analysis.rollup?.weights ?? {})), 'form is a hard gate, not a default folder')
  assert.ok(!('essay' in (form.analysis.rollup?.weights ?? {})), 'form-only must not carry essay')
  const formDoc = form.tools[form.phases[0].toolRef]?.artifact?.inline
  const formKinds = new Set((formDoc?.questions ?? []).map((q) => q.kind))
  for (const kind of [
    'short_text',
    'essay',
    'mcq_single',
    'mcq_multi',
    'dropdown',
    'fill_blank',
    'ordinal',
    'ordinal_grid',
  ]) {
    assert.ok(formKinds.has(kind), `form sample missing ${kind}`)
  }
  assert.ok(Object.keys(formDoc?.answerKey ?? {}).length > 0, 'form sample has an answer key')
  if (ids.length === 1) {
    const formTw = form.analysis.rollup?.templateWeights?.[form.phases[0].id] ?? {}
    assert.equal(Number(formTw[ids[0]] ?? 0), 1, 'a single counted chip may be 1')
  }
  const issues = createTemplateAccuracyIssues(form)
  assert.equal(issues.length, 0, `form accuracy ${issues.join('; ')}`)
  assert.equal(canOpenCreator2Builder(form, 'generate'), true)
}

{
  const added = patchCreator2Spine(emptyCreator2BriefDocument(emptyComposeMeta()), {
    type: 'addSection',
    kind: 'form',
  })
  const picker = buildCreateTemplateDocument('create.form')
  assert.equal(added.phases[0]?.title, picker.phases[0]?.title, 'Contents add form title matches picker')
  const addedKinds = (added.tools[added.phases[0].toolRef]?.artifact?.inline?.questions ?? [])
    .map((q) => q.kind)
    .sort()
  const pickerKinds = (picker.tools[picker.phases[0].toolRef]?.artifact?.inline?.questions ?? [])
    .map((q) => q.kind)
    .sort()
  assert.deepEqual(addedKinds, pickerKinds, 'Contents add form kinds match the Form assessment sample')
  assert.notEqual(added.phases[0]?.title, 'Eligibility screening')
}

{
  const talk = buildCreateTemplateDocument('create.talk')
  assert.equal(talk.phases.length, 1)
  assert.equal(kindOf(talk, talk.phases[0]), 'talk')
  const topic = talk.topicLibrary[0]
  assert.equal(topic.analysis?.attachPack ?? null, null)
  assert.deepEqual(topic.analysis?.templateIds, [...MIDDLE_TALK_TEMPLATE_IDS])
  const weights = talk.analysis.rollup?.weights ?? {}
  assert.ok('conversation' in weights)
  assert.equal(Number(weights.conversation), 1)
  assert.ok(!('essay' in weights), 'talk-only must not carry essay')
  assert.ok(!('interviewDelivery' in weights), 'must not auto-seed six catalog keys')
  const mapped = talk.analysis.rollup?.weightSections?.conversation ?? []
  assert.ok(mapped.includes(talk.phases[0].id), 'talk weightSections maps phase')
  const talkTw = talk.analysis.rollup?.templateWeights?.[talk.phases[0].id] ?? {}
  const talkTplIds = [...MIDDLE_TALK_TEMPLATE_IDS]
  assert.ok(talkTplIds.length > 1, 'talk kit has multiple templates')
  assert.equal(
    talkTplIds.every((id) => talkTw[id] === 1),
    false,
    'talk kit must not leave every analysis chip at 1',
  )
  const talkSum = talkTplIds.reduce((s, id) => s + Number(talkTw[id] ?? 0), 0)
  assert.ok(Math.abs(talkSum - 1) < 1e-6, `talk templateWeights sum ${talkSum}`)
  assert.ok((topic.probes ?? []).length >= 3, `talk sample probes got ${(topic.probes ?? []).length}`)
  assert.ok((topic.targets ?? []).length >= 2, 'talk sample has harvest targets')
  const issues = createTemplateAccuracyIssues(talk)
  assert.equal(issues.length, 0, `talk accuracy ${issues.join('; ')}`)
}

{
  const coding = buildCreateTemplateDocument('create.coding')
  assert.equal(kindOf(coding, coding.phases[0]), 'coding')
  const ids = coding.tools[coding.phases[0].toolRef]?.analysis?.templateIds ?? []
  assert.deepEqual(ids, impliedToolTemplateIds('coding'))
  assert.ok(!ids.includes('mark.assist.use.v1'), 'coding starter has Assist off')
  const weights = coding.analysis.rollup?.weights ?? {}
  assert.ok('coding-work' in weights)
  assert.equal(Number(weights['coding-work']), 1)
  assert.ok(!('codingTests' in weights), 'must not auto-seed codingTests')
  assert.ok(!('essay' in weights), 'coding-only must not carry essay')
  const codingTw = coding.analysis.rollup?.templateWeights?.[coding.phases[0].id] ?? {}
  assert.ok(ids.length > 1, 'coding kit has multiple templates')
  assert.equal(
    ids.every((id) => codingTw[id] === 1),
    false,
    'coding kit must not leave every analysis chip at 1',
  )
  const codingSum = ids.reduce((s, id) => s + Number(codingTw[id] ?? 0), 0)
  assert.ok(Math.abs(codingSum - 1) < 1e-6, `coding templateWeights sum ${codingSum}`)
  const codingTool = coding.tools[coding.phases[0].toolRef]
  const cases = codingTool?.tests?.cases ?? []
  assert.ok(cases.length >= 3, `coding sample cases got ${cases.length}`)
  assert.ok(cases.some((c) => c.hidden), 'coding sample has a hidden case')
  const readme = (codingTool?.artifact?.inline?.files ?? []).find((f) => f.path === 'README.md')
  assert.ok(String(readme?.content ?? '').includes('Example'), 'coding README has an example')
  const issues = createTemplateAccuracyIssues(coding)
  assert.equal(issues.length, 0, `coding accuracy ${issues.join('; ')}`)
}

{
  const writing = buildCreateTemplateDocument('create.doc')
  assert.equal(kindOf(writing, writing.phases[0]), 'doc')
  const ids = writing.tools[writing.phases[0].toolRef]?.analysis?.templateIds ?? []
  assert.deepEqual(ids, impliedToolTemplateIds('doc'))
  assert.deepEqual(Object.keys(writing.analysis.rollup?.weights ?? {}), ['write'])
  assert.equal(Number(writing.analysis.rollup?.weights?.write), 1)
  const writingTw = writing.analysis.rollup?.templateWeights?.[writing.phases[0].id] ?? {}
  assert.ok(ids.length > 1, 'writing kit has multiple templates')
  assert.equal(
    ids.every((id) => writingTw[id] === 1),
    false,
    'writing kit must not leave every analysis chip at 1',
  )
  const writingSum = ids.reduce((s, id) => s + Number(writingTw[id] ?? 0), 0)
  assert.ok(Math.abs(writingSum - 1) < 1e-6, `writing templateWeights sum ${writingSum}`)
  const writingTool = writing.tools[writing.phases[0].toolRef]
  assert.ok(
    (writingTool?.assessment?.dimensions ?? []).length >= 4,
    'writing sample has a full rubric',
  )
  assert.ok(
    String(writingTool?.artifact?.inline?.markdown ?? '').includes('## Prompt'),
    'writing sample has a prompt scaffold',
  )
  assert.ok((writingTool?.prompt?.structure ?? []).length >= 3, 'writing sample has an outline')
  const issues = createTemplateAccuracyIssues(writing)
  assert.equal(issues.length, 0, `writing accuracy ${issues.join('; ')}`)
}

{
  const full = buildCreateTemplateDocument('create.full')
  const kinds = full.phases.map((p) => kindOf(full, p))
  assert.deepEqual(kinds, ['form', 'talk', 'coding', 'doc'], `full order ${kinds.join(',')}`)
  const fullWeights = full.analysis.rollup?.weights ?? {}
  for (const key of ['codingTests', 'codingMethod', 'essay', 'interviewDelivery', 'interviewContent', 'formMark']) {
    assert.ok(!(key in fullWeights), `full must not seed catalog key ${key}`)
  }
  assert.ok('coding-work' in fullWeights)
  assert.ok('write' in fullWeights)
  assert.ok('conversation' in fullWeights)
  const softSum =
    Number(fullWeights['coding-work']) + Number(fullWeights.write) + Number(fullWeights.conversation)
  assert.ok(Math.abs(softSum - 1) < 1e-6, `full soft sum ${softSum}`)
  const sections = full.analysis.rollup?.weightSections ?? {}
  assert.ok(sections['coding-work']?.includes(full.phases[2].id), 'full coding section')
  assert.ok(sections.conversation?.includes(full.phases[1].id), 'full talk section')
  assert.ok(sections.write?.includes(full.phases[3].id), 'full writing section')
  assert.equal(full.analysis.rollup?.weightTemplates, undefined)
  const issues = createTemplateAccuracyIssues(full)
  assert.equal(issues.length, 0, `full accuracy ${issues.join('; ')}`)
}

{
  const planted = emptyCreator2BriefDocument(emptyComposeMeta())
  planted.topicLibrary = [
    {
      id: 'topic.bad',
      label: 'Bad',
      probes: [],
      analysis: {
        attachPack: 'pack.coding',
        templateIds: ['mark.code.tests.v1', 'iv.conflict.v1', 'mark.doc.brief.v1'],
      },
    },
  ]
  planted.phases = [{ id: 'ph.bad', kind: 'discussion', topicId: 'topic.bad' }]
  const issues = createTemplateAccuracyIssues(planted)
  assert.ok(
    issues.some((m) => m.includes('mark.code.tests.v1')),
    `expected code-on-talk, got ${issues.join('; ')}`,
  )
  assert.ok(
    issues.some((m) => m.includes('iv.conflict.v1')),
    `expected abandoned talk id, got ${issues.join('; ')}`,
  )
  assert.ok(
    issues.some((m) => m.includes('pack.coding')),
    `expected attachPack reject, got ${issues.join('; ')}`,
  )
}

{
  const copy = stampCopyTitleOnBriefBody(
    { definition: { meta: { title: 'Source' } } },
    'Source (copy)',
  )
  assert.equal(copy?.definition?.meta?.title, 'Source (copy)')
  assert.equal(stampCopyTitleOnBriefBody(null, 'x'), null)
}

{
  const blank = documentForPickerStart({ kind: 'blank' })
  assert.equal(blank.phases.length, 0)
  const templated = documentForPickerStart({ kind: 'template', templateId: 'create.form' })
  assert.equal(templated.phases.length, 1)
  let missingCopy = false
  try {
    documentForPickerStart({ kind: 'copy', sourceBody: null })
  } catch (e) {
    missingCopy = /Missing source/.test(String(e))
  }
  assert.ok(missingCopy, 'copy without source must throw (no empty brief)')
}

{
  const preview = createTemplatePreview('create.form')
  assert.deepEqual(
    preview.restTags.map((t) => t.label),
    ['Form'],
    `form rest tags ${preview.restTags.map((t) => t.label).join(',')}`,
  )
  assert.ok(preview.description.length > 80, 'form kit has a sample interview description')
  assert.equal(
    /[\u2014\u2013]/.test(preview.description),
    false,
    'form description must not use em/en dashes',
  )
  const formDoc = buildCreateTemplateDocument('create.form')
  assert.equal(
    formDoc.definition.meta.roleDescription,
    preview.description,
    'template body stamps the sample description',
  )
  assert.ok(preview.hoverTags.some((t) => /m$/.test(t.label)), 'form hover has minutes')
  assert.ok(preview.hoverTags.some((t) => t.label === '1 step'), 'form hover has step count')
  assert.ok(
    preview.hoverTags.every((t) => /steps?$/.test(t.label) || /^\d+m$/.test(t.label)),
    `form hover must match manage meta (steps + minutes), got ${preview.hoverTags.map((t) => t.label).join(',')}`,
  )
  for (const banned of ['Multiple choice', 'Checkboxes', 'Dropdown', 'Fill in the blank']) {
    assert.ok(
      !preview.restTags.some((t) => t.label === banned) &&
        !preview.hoverTags.some((t) => t.label === banned),
      `form must not show ${banned} as a tag`,
    )
  }
  assert.ok(!preview.hoverTags.some((t) => /taken|invite/i.test(t.label)), 'templates omit applicants')
  const full = createTemplatePreview('create.full')
  assert.deepEqual(
    full.restTags.map((t) => t.label),
    ['Form', 'Conversation', 'Coding', 'Writing'],
  )
  assert.ok(
    full.hoverTags.every((t) => /steps?$/.test(t.label) || /^\d+m$/.test(t.label)),
    'full hover is steps + minutes only',
  )
  for (const row of CREATE_TEMPLATE_CATALOG) {
    assert.equal(
      /[\u2014\u2013]/.test(row.description),
      false,
      `${row.id} description must not use em/en dashes`,
    )
  }
}

{
  const blankHello = pickerStartWelcomeMarkdown({ kind: 'blank' })
  assert.ok(/blank/i.test(blankHello) && /upload/i.test(blankHello), 'blank welcome names upload')
  const formHello = pickerStartWelcomeMarkdown({ kind: 'template', templateId: 'create.form' })
  assert.ok(
    /form assessment/i.test(formHello) && /multiple choice/i.test(formHello),
    'form welcome names the kit and question types',
  )
  const copyHello = pickerStartWelcomeMarkdown({ kind: 'copy', sourceTitle: 'Staff loop' })
  assert.ok(/Staff loop/.test(copyHello), 'copy welcome names the source')
  assert.ok(!/blank/i.test(formHello), 'form welcome is not the empty-board speech')
  for (const hello of [blankHello, formHello, copyHello]) {
    assert.equal(/[\u2014\u2013]/.test(hello), false, 'picker welcome must not use em/en dashes')
  }
}

{
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const here = dirname(fileURLToPath(import.meta.url))
  const creator = readFileSync(join(here, '../../components/InterviewCreator.tsx'), 'utf8')
  const stash = readFileSync(
    join(here, '../../components/interviewCreator/_stash/ComposeHome.tsx'),
    'utf8',
  )
  const picker = readFileSync(
    join(here, '../../components/InterviewCreatorPickerHome.tsx'),
    'utf8',
  )
  assert.ok(
    /type PanelMode = 'manage' \| 'picker' \| 'builder'/.test(creator),
    'PanelMode is manage | picker | builder',
  )
  assert.ok(creator.includes("setPanel('picker')"), 'Create path sets picker')
  assert.ok(
    !/setPanel\('compose'\)/.test(creator),
    'live InterviewCreator must not setPanel compose',
  )
  assert.ok(
    !/<ComposeHome\b/.test(creator),
    'ComposeHome is not rendered in the live switch',
  )
  assert.ok(
    /canOpenCreator2Builder\(stamped, 'picker'\)/.test(creator),
    'picker/edit open-builder compares canOpenCreator2Builder from picker',
  )
  assert.ok(/<InterviewCreatorPickerHome\b/.test(creator), 'picker home is wired')
  assert.ok(/export function ComposeHome/.test(stash), 'stashed ComposeHome still exists')
  assert.ok(
    /CREATE_TEMPLATE_CATALOG/.test(picker),
    'picker lists CREATE_TEMPLATE_CATALOG',
  )
  assert.ok(!/setPanel\('compose'\)/.test(picker), 'picker does not route to compose')
  assert.ok(
    /cachedCreateTemplatePreview|createTemplatePreview/.test(picker),
    'picker rows use template preview tags',
  )
  assert.ok(
    /list-meta-tags/.test(picker),
    'template rows have a hover tag layer',
  )
  const templateRow = picker.match(
    /function PickerTemplateRow\([\s\S]*?\nfunction PickerCopyRow\(/,
  )
  assert.ok(templateRow, 'PickerTemplateRow is defined')
  const heading = templateRow[0].match(
    /theme-interview-creator__list-heading[\s\S]*?theme-interview-creator__list-sub/,
  )
  assert.ok(
    /list-blurb/.test(templateRow[0]),
    'template rows show a truncated interview description',
  )
  assert.ok(heading, 'template row has a heading block')
  assert.ok(
    !/estimatedMinutes/.test(heading[0]) && !/list-dates/.test(heading[0]),
    'template heading trail is not a duration slot (dates live there on manage rows)',
  )
  assert.ok(
    /seedPickerStartWelcome/.test(creator) &&
      /pickerStartWelcomeMarkdown/.test(creator) &&
      /seedBoardChatFromEditReply/.test(creator),
    'picker persist seeds peel welcome',
  )
  const startBlock = creator.match(
    /const startFromDocument = useCallback\([\s\S]*?\[applySessionLocal, openingBuilder, saveBriefFromSession, upsertListFromBrief\],\n  \)/,
  )
  assert.ok(startBlock, 'startFromDocument is still the picker persist helper')
  assert.ok(
    startBlock[0].indexOf('seedPickerStartWelcome') < startBlock[0].indexOf("setPanel('builder')"),
    'welcome seeds before the builder panel opens',
  )
  const copyBlock = creator.match(
    /const handlePickerCopy = useCallback\([\s\S]*?\[openBuilderFromList, openingBuilder, orgAccountId\],\n  \)/,
  )
  assert.ok(copyBlock, 'handlePickerCopy exists')
  assert.ok(
    copyBlock[0].indexOf('seedPickerStartWelcome') < copyBlock[0].indexOf('openBuilderFromList(row)'),
    'picker copy seeds welcome before opening the builder',
  )
  const editBlock = creator.match(
    /const handleEditInterview = useCallback\([\s\S]*?\[openBuilderFromList\],\n  \)/,
  )
  assert.ok(editBlock, 'handleEditInterview exists')
  assert.ok(
    !/seedPickerStartWelcome|pickerStartWelcomeMarkdown/.test(editBlock[0]),
    'Edit must not seed picker welcome',
  )
}

console.log('createTemplateCatalog.unit.mjs: ok')
