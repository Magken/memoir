/**
 * Compose identity stamp — generated meta must not lose to leftover form fields.
 * Run: npx tsx front_end/src/lib/interviewBrief/compose.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  applyComposeMetaToCreator2,
  composeMetaFromCreator2,
  composeSessionHasSaveablePlan,
  countCreator2HostTemplateIds,
  createComposeSession,
  emptyComposeMeta,
  emptyCreator2BriefDocument,
  preferRicherCreator2Doc,
} from './compose.ts'

const compose = {
  ...emptyComposeMeta(),
  title: 'engineer',
  roleTitle: 'engineer',
  description: 'leftover agency notes',
  candidateDescription: 'leftover intro',
  personaName: 'Alex',
  proposedMinutes: '45',
}

{
  const generated = emptyCreator2BriefDocument(compose)
  generated.definition.meta.title = 'Backend engineering loop'
  generated.definition.meta.roleTitle = 'Backend engineer'
  generated.definition.meta.roleDescription = 'Assess backend ownership and APIs.'
  generated.definition.meta.candidateDescription = 'You will walk through production work.'
  generated.definition.meta.proposedMinutes = 70
  generated.definition.persona = {
    ...generated.definition.persona,
    name: 'Jordan',
  }

  const composeWins = applyComposeMetaToCreator2(generated, compose)
  assert.equal(composeWins.definition.meta.title, 'engineer', 'compose-wins title')
  assert.equal(composeWins.definition.meta.roleTitle, 'engineer', 'compose-wins role')

  const docWins = applyComposeMetaToCreator2(generated, compose, { prefer: 'document' })
  assert.equal(docWins.definition.meta.title, 'Backend engineering loop')
  assert.equal(docWins.definition.meta.roleTitle, 'Backend engineer')
  assert.equal(docWins.definition.meta.roleDescription, 'Assess backend ownership and APIs.')
  assert.equal(docWins.definition.meta.candidateDescription, 'You will walk through production work.')
  assert.equal(docWins.definition.meta.proposedMinutes, 70)
  assert.equal(docWins.definition.persona.name, 'Jordan')

  const synced = composeMetaFromCreator2(compose, docWins)
  assert.equal(synced.title, 'Backend engineering loop')
  assert.equal(synced.roleTitle, 'Backend engineer')
  assert.equal(synced.personaName, 'Jordan')
  assert.equal(synced.proposedMinutes, '70')
  assert.equal(
    synced.description,
    'leftover agency notes',
    'compose description stays enricher/human notes — never copy bot roleDescription',
  )
  assert.equal(synced.category, compose.category)
}

{
  const housing = {
    ...emptyComposeMeta(),
    title: 'Loop',
    roleTitle: 'Engineer',
    category: 'engineering-software',
    coverName: 'cover.png',
    rolePdfName: 'handoff.pdf',
    maxInterviews: '25',
    opensAt: '2026-09-05',
    closesAt: '2026-10-01',
  }
  const stamped = applyComposeMetaToCreator2(emptyCreator2BriefDocument(housing), housing)
  assert.equal(stamped.definition.meta.category, 'engineering-software')
  assert.equal(stamped.definition.meta.coverName, 'cover.png')
  assert.equal(stamped.definition.meta.rolePdfName, 'handoff.pdf')
  assert.equal(stamped.definition.meta.maxInterviews, 25)
  assert.equal(stamped.definition.meta.opensAt, '2026-09-05')
}

{
  const untitled = emptyCreator2BriefDocument({ ...compose, title: '', roleTitle: '' })
  untitled.definition.meta.title = 'Untitled interview'
  untitled.definition.meta.roleTitle = 'Role'
  const filled = applyComposeMetaToCreator2(untitled, compose, { prefer: 'document' })
  assert.equal(filled.definition.meta.title, 'engineer', 'placeholder title fills from compose')
  assert.equal(filled.definition.meta.roleTitle, 'engineer', 'placeholder role fills from compose')
}

{
  const { composeEditTurnFailureReason, composeGeneratePathFromResult } = await import(
    './composeGenerateDebug.ts'
  )
  const compiler = composeEditTurnFailureReason({
    briefId: 'x',
    meta: {
      planSource: 'compiler',
      hadFailures: false,
      guardDrops: ['generate_compiler', 'generate_checked'],
    },
  })
  assert.equal(compiler, null, 'compiler planSource is not a Generate failure')
  const legacyLabel = composeEditTurnFailureReason({
    briefId: 'x',
    meta: {
      planSource: 'fallback',
      hadFailures: false,
      guardDrops: ['generate_compiler', 'generate_checked'],
    },
  })
  assert.equal(legacyLabel, null, 'generate_compiler + generate_checked fallback is still success')
  const failClosed = composeEditTurnFailureReason({
    briefId: 'x',
    meta: {
      planSource: 'fallback',
      hadFailures: false,
      guardDrops: ['generate_llm', 'generate_empty_llm_plan'],
      editRun: {
        plan: { intent: 'generate_llm_failed', planningNotes: 'generate_empty_llm_plan' },
      },
    },
  })
  assert.match(String(failClosed), /did not return a usable interview plan|returned no sections/)
  const noCredits = composeEditTurnFailureReason({
    briefId: 'x',
    meta: {
      planSource: 'fallback',
      hadFailures: false,
      guardDrops: [
        'generate_llm',
        'plan_llm_failed:invoke_failed:429 You have no credits remaining.',
      ],
      editRun: {
        plan: {
          intent: 'generate_llm_failed',
          planningNotes: 'plan_llm_failed:invoke_failed:429 You have no credits remaining.',
        },
      },
    },
  })
  assert.match(String(noCredits), /API credits/)
  const realFallback = composeEditTurnFailureReason({
    briefId: 'x',
    meta: { planSource: 'fallback', hadFailures: false, guardDrops: ['plan_timeout_or_abort'] },
  })
  assert.match(String(realFallback), /timed out before a full plan|fell back without a full LLM plan/)

  const divergent = composeGeneratePathFromResult({
    briefId: 'x',
    meta: {
      planSource: 'compiler',
      hadFailures: false,
      guardDrops: [
        'generate_compiler',
        'generate_checked',
        'generate_path:compiler:divergent:band=full',
      ],
    },
  })
  assert.equal(divergent.shape, 'divergent')
  assert.match(divergent.why, /divergent numbered Flow/)
  const fullBox = composeGeneratePathFromResult({
    briefId: 'x',
    meta: {
      planSource: 'compiler',
      hadFailures: false,
      guardDrops: [
        'generate_compiler',
        'generate_checked',
        'generate_path:compiler:full-box:band=standard',
      ],
    },
  })
  assert.equal(fullBox.shape, 'full-box')
  assert.match(fullBox.why, /full-box Prompt-1 loop/)
}

{
  const thin = emptyCreator2BriefDocument(compose)
  thin.topicLibrary = [{ id: 't1', label: 'Debrief', analysis: { templateIds: [] } }]
  thin.tools = { 'tool.x': { type: 'coding', title: 'Drill', analysis: { templateIds: [] } } }
  const rich = structuredClone(thin)
  rich.topicLibrary[0].analysis.templateIds = ['iv.delivery.v1', 'iv.content.v1']
  rich.tools['tool.x'].analysis.templateIds = ['mark.code.tests.v1']
  assert.equal(countCreator2HostTemplateIds(thin), 0)
  assert.equal(countCreator2HostTemplateIds(rich), 3)
  assert.equal(preferRicherCreator2Doc(rich, thin), rich)
  assert.equal(preferRicherCreator2Doc(thin, rich), rich)
}

{
  const blank = createComposeSession('create')
  assert.equal(blank.flow, null, 'blank-slate sessions keep flow null')
  assert.equal(
    composeSessionHasSaveablePlan(blank, null),
    false,
    'negative: no flow and no Creator-2 plan is not saveable',
  )
  assert.equal(
    composeSessionHasSaveablePlan(blank, emptyCreator2BriefDocument(blank.meta)),
    true,
    'Creator-2 board is enough without a FlowDocument',
  )
  const withFlow = { ...blank, flow: { nodes: [], edges: [] } }
  assert.equal(
    composeSessionHasSaveablePlan(withFlow, null),
    true,
    'leftover FlowDocument still saveable without Creator-2',
  )
  assert.equal(composeSessionHasSaveablePlan(null, emptyCreator2BriefDocument(emptyComposeMeta())), false)
}

console.log('compose.unit.mjs: ok')
