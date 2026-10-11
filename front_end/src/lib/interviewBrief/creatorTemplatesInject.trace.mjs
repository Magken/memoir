/**
 * Creator Templates / Decision hop trace — $0, no OpenAI.
 * Run: npx tsx front_end/src/lib/interviewBrief/creatorTemplatesInject.trace.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../../..')
const edit = join(repo, 'back_end/supabase/functions/interview-brief-edit')
const rows = []

function hop(name, fn) {
  try {
    fn()
    rows.push(`ok ${name}`)
  } catch (e) {
    rows.push(`FAIL ${name}`)
    console.error(`FAIL ${name}`, e instanceof Error ? e.message : e)
    throw e
  }
}

const {
  buildCreatorTemplateRoster,
  rehydrateLockedToolAnalysisOnDoc,
  isLockedImpliedTemplateId,
  templateRosterPromptBlock,
  boardCapabilityPromptBlock,
  formatStageRetryCoach,
  criterionLineForTemplate,
  TEMPLATE_ROSTER_HEADING,
  BOARD_CAPABILITY_HEADING,
} = await import('../../../../back_end/supabase/functions/interview-brief-edit/templateRoster.ts')
const { seedSectionTemplateWeightsOnDoc } = await import(
  '../../../../back_end/supabase/functions/interview-brief-edit/sectionTemplateWeights.ts'
)
const { collectCheckSuite, structuralCheckWarnings } = await import(
  '../../../../back_end/supabase/functions/interview-brief-edit/checkSuite.ts'
)
const { mergeHostTemplateIds, FORM_TEMPLATE_IDS } = await import(
  '../../../../back_end/supabase/functions/interview-brief-edit/allowlist.ts'
)
const { shouldIncludeApplyCard, honestEditAckMarkdown } = await import(
  '../../../../back_end/supabase/functions/interview-brief-edit/composeGate.ts'
)
const { formatHopRetryCoach } = await import(
  '../../../../back_end/supabase/functions/interview-brief-edit/plannerErrorCoach.ts'
)
const { ctxForPlanUser, ctxForEditor } = await import(
  '../../../../back_end/supabase/functions/interview-brief-edit/contextPack.ts'
)
const { critiqueAndEnrichPlan } = await import(
  '../../../../back_end/supabase/functions/interview-brief-edit/planCritic.ts'
)

const formTalk = {
  definition: {
    meta: {
      title: 'Staff',
      roleTitle: 'Eng',
      category: 'engineering',
      candidateDescription: 'Intro',
      roleDescription: 'Desc',
      opensAt: '2026-09-01T00:00:00.000Z',
      closesAt: '2026-09-30T00:00:00.000Z',
    },
    persona: { name: 'Alex' },
  },
  phases: [
    { id: 'ph.form', kind: 'tool', toolRef: 'tool.form', title: 'Screening' },
    { id: 'ph.talk', kind: 'discussion', topicId: 't1', title: 'Ownership' },
  ],
  tools: {
    'tool.form': { type: 'form_quiz', analysis: { templateIds: [] } },
  },
  topicLibrary: [
    { id: 't1', analysis: { templateIds: ['iv.ownership.v1', 'sig.clarity.v1'] } },
  ],
  analysis: {
    overrides: { libraryIds: ['iv.ownership.v1'], templateCards: {} },
    rollup: { weights: {}, templateWeights: {} },
  },
}

hop('roster_helper', () => {
  const rows = buildCreatorTemplateRoster(formTalk)
  const byId = Object.fromEntries(rows.map((r) => [r.templateId, r]))
  assert.ok(byId['mark.form.key.v1'])
  assert.equal(byId['mark.form.key.v1'].origin, 'locked')
  assert.ok(byId['iv.ownership.v1'])
  assert.equal(byId['sig.clarity.v1'].countsInDecision, false)
  assert.match(criterionLineForTemplate('iv.ownership.v1'), /Counts in the Decision mix/)
  assert.match(criterionLineForTemplate('sig.clarity.v1'), /Does not count in the Decision mix/)
})

hop('capability_locked_delete', () => {
  assert.equal(isLockedImpliedTemplateId('mark.form.key.v1'), true)
  const stripped = mergeHostTemplateIds({
    liveIds: ['mark.form.key.v1'],
    patchIds: ['mark.form.key.v1'],
    mode: 'subtract',
    allow: FORM_TEMPLATE_IDS,
    lockedIds: ['mark.form.key.v1'],
  })
  assert.ok(stripped.includes('mark.form.key.v1'))
  const next = rehydrateLockedToolAnalysisOnDoc({
    tools: { 'tool.form': { type: 'form_quiz', analysis: { templateIds: [] } } },
  })
  assert.ok(next.tools['tool.form'].analysis.templateIds.includes('mark.form.key.v1'))
})

hop('merge_grade_only', () => {
  const seeded = seedSectionTemplateWeightsOnDoc(formTalk)
  const tw = seeded.analysis.rollup.templateWeights['ph.talk']
  assert.equal(tw['sig.clarity.v1'], undefined)
  assert.equal(tw['iv.ownership.v1'], 1)
})

hop('check_orphan', () => {
  const orphan = {
    definition: {
      meta: {
        title: 'T',
        roleTitle: 'R',
        category: 'engineering',
        candidateDescription: 'Intro',
        roleDescription: 'Desc',
        opensAt: '2026-09-01T00:00:00.000Z',
        closesAt: '2026-09-30T00:00:00.000Z',
      },
      persona: { name: 'Alex' },
    },
    phases: [{ id: 'ph.talk', kind: 'discussion', topicId: 't1', title: 'Ownership' }],
    topicLibrary: [{ id: 't1', probes: [{ id: 'p', goal: 'g' }], targets: ['x'], analysis: { templateIds: ['custom.x'] } }],
    tools: {},
    analysis: { overrides: { libraryIds: [] }, rollup: { weights: { conversation: 1 }, weightSections: { conversation: ['ph.talk'] } } },
  }
  assert.ok(collectCheckSuite(orphan).some((w) => w.id === 'templates.host_orphan'))
  orphan.analysis.overrides.libraryIds = ['custom.x']
  orphan.analysis.overrides.templateCards = { 'custom.x': { title: 'X' } }
  assert.equal(collectCheckSuite(orphan).some((w) => w.id === 'templates.host_orphan'), false)
})

hop('check_nongrade', () => {
  const doc = {
    ...formTalk,
    definition: {
      meta: {
        title: 'T',
        roleTitle: 'R',
        category: 'engineering',
        candidateDescription: 'Intro',
        roleDescription: 'Desc',
        opensAt: '2026-09-01T00:00:00.000Z',
        closesAt: '2026-09-30T00:00:00.000Z',
      },
      persona: { name: 'Alex' },
    },
    topicLibrary: [
      {
        id: 't1',
        probes: [{ id: 'p', goal: 'g' }],
        targets: ['x'],
        analysis: { templateIds: ['iv.ownership.v1'] },
      },
    ],
    analysis: {
      overrides: { libraryIds: ['iv.ownership.v1'] },
      rollup: {
        weights: { conversation: 1 },
        weightSections: { conversation: ['ph.talk'] },
        templateWeights: { 'ph.talk': { 'sig.clarity.v1': 0.5, 'iv.ownership.v1': 0.5 } },
      },
    },
  }
  assert.ok(collectCheckSuite(doc).some((w) => w.id === 'decision.nongrade_weighted'))
})

hop('check_duplicate_titles', () => {
  const doc = {
    definition: {
      meta: {
        title: 'T',
        roleTitle: 'R',
        category: 'engineering',
        candidateDescription: 'Intro',
        roleDescription: 'Desc',
        opensAt: '2026-09-01T00:00:00.000Z',
        closesAt: '2026-09-30T00:00:00.000Z',
      },
      persona: { name: 'Alex' },
    },
    phases: [
      { id: 'ph.a', kind: 'discussion', topicId: 't1', title: 'Ownership' },
      { id: 'ph.b', kind: 'discussion', topicId: 't2', title: 'Ownership' },
    ],
    topicLibrary: [
      { id: 't1', probes: [{ id: 'p', goal: 'g' }], targets: ['x'], analysis: { templateIds: ['iv.ownership.v1'] } },
      { id: 't2', probes: [{ id: 'p', goal: 'g' }], targets: ['x'], analysis: { templateIds: ['iv.content.v1'] } },
    ],
    tools: {},
    analysis: {
      rollup: {
        weights: { conversation: 1 },
        weightSections: { conversation: ['ph.a', 'ph.b'] },
      },
    },
  }
  assert.ok(collectCheckSuite(doc).some((w) => w.id === 'sections.duplicate_titles'))
})

hop('check_unused', () => {
  const doc = {
    definition: {
      meta: {
        title: 'T',
        roleTitle: 'R',
        category: 'engineering',
        candidateDescription: 'Intro',
        roleDescription: 'Desc',
        opensAt: '2026-09-01T00:00:00.000Z',
        closesAt: '2026-09-30T00:00:00.000Z',
      },
      persona: { name: 'Alex' },
    },
    phases: [{ id: 'ph.talk', kind: 'discussion', topicId: 't1', title: 'Ownership' }],
    topicLibrary: [
      { id: 't1', probes: [{ id: 'p', goal: 'g' }], targets: ['x'], analysis: { templateIds: [] } },
    ],
    tools: {},
    analysis: {
      overrides: { libraryIds: ['custom.x'], templateCards: { 'custom.x': { title: 'X' } } },
      rollup: { weights: { conversation: 1 }, weightSections: { conversation: ['ph.talk'] } },
    },
  }
  assert.ok(collectCheckSuite(doc).some((w) => w.id === 'templates.unassigned'))
})

hop('atlas_structural_clear', () => {
  const atlas = readFileSync(join(edit, 'prompts/userLanguageAtlas.ts'), 'utf8')
  assert.match(atlas, /same-turn failures/)
  assert.equal(/Do not emit packages solely to clear them unless the user asked/.test(atlas), false)
})

hop('retry_payload_has_check', () => {
  const coach = formatStageRetryCoach({
    userMessage: 'add Ownership',
    structuralWarnings: [
      { id: 'templates.unassigned', short: 'Shelf card unused' },
      { id: 'overview.missing_title', short: 'No title' },
    ],
  })
  assert.match(coach, /templates.unassigned/)
  assert.equal(/overview.missing_title/.test(coach), false)
  const factSrc = readFileSync(join(edit, 'factRetryBrief.ts'), 'utf8')
  assert.match(factSrc, /formatStageRetryCoach/)
  const execSrc = readFileSync(join(edit, 'execute.ts'), 'utf8')
  assert.match(execSrc, /formatHopRetryCoach/)
  assert.match(execSrc, /formatStageRetryCoach/)
})

const liveCtx = {
  userMessage: 'Add Ownership to the Talk',
  history: [],
  liveDoc: formTalk,
  liveMap: {
    brief: { interviewTitle: 'Staff' },
    sections: [],
    templatesShelf: { libraryIds: ['iv.ownership.v1'], cards: [] },
    rollup: {},
  },
  deepSlices: {},
  sampleDoc: {},
  mdReplyGuides: '',
  bodyHash: 'h',
  catalogueVersion: 'v',
}

hop('plan_inject', () => {
  const user = ctxForPlanUser(liveCtx)
  assert.match(user, new RegExp(TEMPLATE_ROSTER_HEADING))
  assert.match(user, new RegExp(BOARD_CAPABILITY_HEADING))
  assert.match(user, /collect/)
})

hop('templates_editor_inject', () => {
  const { user } = ctxForEditor(liveCtx, 'templates', { planningBrief: 'add catalog ownership' })
  assert.match(user, new RegExp(TEMPLATE_ROSTER_HEADING))
  const editors = readFileSync(join(edit, 'prompts/editors.ts'), 'utf8')
  assert.match(editors, /addFromCatalog/)
  assert.match(editors, /iv.ownership.v1/)
})

hop('rollup_editor_inject', () => {
  const { user } = ctxForEditor(liveCtx, 'rollup', { planningBrief: 'set templateWeights' })
  assert.match(user, new RegExp(TEMPLATE_ROSTER_HEADING))
  const editors = readFileSync(join(edit, 'prompts/editors.ts'), 'utf8')
  assert.match(editors, /templateWeights/)
  assert.match(editors, /mark.code.method.v1/)
})

hop('compose_leftover_unused', () => {
  assert.equal(shouldIncludeApplyCard({ bodyChanged: true, pendingStepCount: 1 }), false)
  assert.equal(shouldIncludeApplyCard({ bodyChanged: false, pendingStepCount: 1 }), true)
  const ack = honestEditAckMarkdown(
    {
      ...liveCtx,
      liveDoc: {
        ...formTalk,
        definition: liveCtx.liveDoc.definition,
        analysis: {
          overrides: { libraryIds: ['custom.x'], templateCards: { 'custom.x': { title: 'X' } } },
          rollup: { weights: {} },
        },
        topicLibrary: [{ id: 't1', analysis: { templateIds: [] } }],
        editOutcome: undefined,
      },
      editOutcome: {
        bodyChanged: true,
        warnings: [],
        receipt: {
          bodyChanged: true,
          added: [],
          removed: [],
          modified: [],
          meta: [],
          rollup: [],
          templatesShelf: [{ path: 'libraryIds:custom.x', line: 'Added custom.x' }],
          reordered: false,
        },
        factResults: [],
      },
    },
    {
      mode: 'edit',
      summary: 'Add rubric card',
      workPackages: [{ packageId: 'pkg.templates.create', kind: 'templates', planningBrief: 'upsert custom.x' }],
    },
  )
  assert.match(ack, /unused|Still missing|templates.unassigned/i)
  assert.equal(/^Done/m.test(ack), false)
})

hop('intent_ownership_not_five_seeds', () => {
  const critic = readFileSync(join(edit, 'planCritic.ts'), 'utf8')
  assert.match(critic, /!hasAttachFact && !inventoryOnly/)
  assert.equal(/if \(!hasAttachFact && !generateEmpty\)/.test(critic), false)
  const msg = 'add Ownership to the Talk'
  assert.equal(/custom\.oncall-ownership/.test(msg), false)
})

hop('dead_inject', () => {
  const enricherDir = join(repo, 'back_end/supabase/functions/_shared/interview-brief-enricher')
  for (const file of ['prompts.ts', 'recommendations.ts', 'sectionSketches.ts', 'mechanicsAtlas.md']) {
    const src = readFileSync(join(enricherDir, file), 'utf8')
    assert.equal(
      /weightTemplates/.test(src),
      false,
      `${file} still teaches weightTemplates`,
    )
  }
  const readme = readFileSync(join(edit, 'README.md'), 'utf8')
  assert.match(readme, /validator-only/)
  assert.equal(
    /\+ \[`examples\/creator2-spine-catalogue/.test(readme),
    false,
    'README must not list creator2-spine-catalogue as a live system-prompt inject',
  )
  const skillRef = readFileSync(join(repo, '.claude/skills/chat-bot-creation-workflow/reference.md'), 'utf8')
  assert.equal(
    /examples\/_shared\/dialect-rules\.md/.test(skillRef) && !/retired|not injected|validator/.test(skillRef),
    false,
    'reference.md must not claim dialect-rules.md is injected',
  )
})

hop('inject_miss', () => {
  const ctx = readFileSync(join(edit, 'contextPack.ts'), 'utf8')
  assert.match(ctx, /templateRosterPromptBlock/)
  assert.match(ctx, /boardCapabilityPromptBlock/)
  assert.match(ctx, /formatCheckSuiteComposeBlock/)
  const reply = readFileSync(join(edit, 'reply.ts'), 'utf8')
  assert.match(reply, /\.invoke/)
})

hop('editor_retry_coach', () => {
  const coach = formatHopRetryCoach({
    kind: 'templates',
    attempts: [{ n: 1, ops: ['(returned no ops)'], rejected: 'zod fail' }],
    facts: [{ code: 'editor_envelope', detail: 'zod fail' }],
  })
  assert.match(coach, /Previous attempts/)
  assert.match(coach, /zod fail/)
  const exec = readFileSync(join(edit, 'execute.ts'), 'utf8')
  assert.equal(/Previous editor attempt failed:/.test(exec), false)
})

hop('critic_same_turn_assign', () => {
  const plan = {
    mode: 'edit',
    summary: 'Add Ownership',
    askRequired: false,
    questions: [],
    workPackages: [
      {
        packageId: 'pkg.templates.catalog',
        kind: 'templates',
        required: true,
        planningBrief: 'addFromCatalog iv.ownership.v1',
      },
    ],
    expectedFacts: [],
    replyGuideId: 'edit_ack',
    focusSectionIds: ['ph.talk'],
  }
  const ctx = {
    userMessage: 'add Ownership to the Talk',
    liveDoc: formTalk,
    liveMap: { brief: { interviewTitle: 'Staff' }, sections: [{ sectionId: 'ph.talk', spineKind: 'Conversation' }] },
  }
  const res = critiqueAndEnrichPlan(plan, ctx)
  assert.ok(
    res.plan.expectedFacts.some(
      (f) => f.kind === 'host_template_ids_include' && f.wantTemplateId === 'iv.ownership.v1',
    ),
    'shelf_has requires sibling attach',
  )
  const later = critiqueAndEnrichPlan(plan, {
    ...ctx,
    userMessage: "add a rubric card to Templates, I'll assign later",
  })
  assert.equal(
    later.plan.expectedFacts.some((f) => f.kind === 'host_template_ids_include'),
    false,
    'inventory-only skips attach',
  )
})

console.log(rows.join('\n'))
console.log('ok creatorTemplatesInject.trace')
