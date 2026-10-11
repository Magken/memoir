/**
 * Sitting-wide hop trace — every speech/write hop receives the packs FE posted.
 * $0, no OpenAI. Run: npm run front_end:test:sitting-inject
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildComposeUserPrompt } from '../../../../back_end/supabase/functions/interview-talk-turn/prompts/composeDiscussion.ts'
import {
  parseNeedRetrieval,
  talkNeedRetrievalSourceUnion,
  TALK_NEED_RETRIEVAL_ALL,
} from '../../../../back_end/supabase/functions/interview-talk-turn/needRetrieval.ts'
import { buildAssistUserPrompt } from '../../../../back_end/supabase/functions/interview-stage-assist/prompts/composeAssist.ts'
import { buildCopilotPlanUser } from '../../../../back_end/supabase/functions/interview-copilot-edit/prompts/planCheck.ts'
import { composeConverseSystem } from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotCompose.ts'
import { ctxForConverse, ctxForEditor, ctxForPlan } from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotContext.ts'
import {
  uniqueCodingTargetPath,
  boundCodingPaths,
} from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotTargetBind.ts'
import { buildKindUserPrompt } from '../../../../back_end/supabase/functions/interview-copilot-edit/prompts/editors.ts'
import {
  injectMissPeel,
  postedPriorPeelTurn,
  peelChatMessages,
  formatPeelBlock,
} from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotPeel.ts'
import { formatSectionContractBlock as formatEdgeContract } from '../../../../back_end/supabase/functions/_shared/sectionContract.ts'
import { formatSectionContractBlock as formatFeContract } from './sectionContract.ts'
import { peelRuntimeFromPersisted } from './assistChatPersist.ts'
import {
  ASK1,
  ASK2,
  CORRECTION,
  OPENER,
  RECEIPT,
  SITTING_INJECT_CONTRACT,
  SITTING_INJECT_LIVE_DOC,
  SITTING_INJECT_THREAD,
} from './sittingInject.fixture.mjs'
import { runAssistMemoryCompose, retrieveCopilotDayMemory } from './dayMemory/index.ts'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../../..')
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

hop('barrel', () => {
  assert.equal(typeof runAssistMemoryCompose, 'function', 'dayMemory barrel missing runAssistMemoryCompose')
  assert.equal(typeof retrieveCopilotDayMemory, 'function', 'dayMemory barrel missing retrieveCopilotDayMemory')
})

const talkContext = {
  persona: { name: 'Sam', voice: 'fair', behaviourPrompt: 'Curious.' },
  phaseId: 'ph.talk',
  title: 'Ownership',
  topic: { label: 'Ownership', purpose: 'Hear a recent incident they owned.' },
}

hop('talk', () => {
  const user = buildComposeUserPrompt({
    talkContext,
    messages: SITTING_INJECT_THREAD,
    decide: {
      situation: 'clarify',
      missingGaps: [],
      activeProbeId: null,
      nextProbeGoal: null,
      canPass: false,
      signals: [],
      composeCues: [],
    },
    fewShots: [],
  })
  assert.ok(user.includes('# SECTION CONTRACT'), 'talk has section contract')
  assert.ok(user.includes(ASK1), 'talk transcript has ASK1')
  assert.ok(user.includes(ASK2), 'talk has current ASK2')
  assert.equal(user.includes(RECEIPT), false, 'talk transcript must drop receipts')
  const unbound = talkNeedRetrievalSourceUnion(false)
  assert.equal(unbound.includes('stage_artifact'), false)
  assert.equal(user.includes('stage_artifact'), false, 'unbound talk must not teach stage_artifact')
  const allowed = parseNeedRetrieval({ needs: [{ sourceId: 'stage_artifact', reason: 'x' }] }, 0)
  assert.ok(allowed?.some((n) => n.sourceId === 'stage_artifact'), 'parser allows advertised ids')
})

hop('assist', () => {
  const user = buildAssistUserPrompt({
    ctx: {
      chromeMap: { panel: 'editor' },
      historyTail: [{ role: 'candidate', text: 'SECRET_TAIL_DUP' }],
      liveComposition: {
        kind: 'coding',
        files: SITTING_INJECT_LIVE_DOC.coding.files,
      },
      sectionContract: SITTING_INJECT_CONTRACT,
      document: { title: 'Cache' },
    },
    messages: SITTING_INJECT_THREAD,
  })
  assert.ok(user.includes('# SECTION CONTRACT'))
  assert.ok(user.includes('# Recent messages'))
  assert.ok(user.includes(ASK1))
  assert.ok(user.includes('src/helpers.py') || user.includes('helpers.py'))
  assert.equal(user.includes('SECRET_TAIL_DUP'), false, 'historyTail must not appear in Rest')
  assert.equal(user.includes(RECEIPT), false)
  const first = buildAssistUserPrompt({
    ctx: {
      chromeMap: {},
      document: { title: 'Cache', instructions: 'Never overwrite a newer version.' },
      sectionContract: SITTING_INJECT_CONTRACT,
    },
    messages: [],
  })
  assert.equal(/Never overwrite a newer version/.test(first), false, 'instruction dump on first turn')
})

hop('plan', () => {
  const planUser = buildCopilotPlanUser({
    message: ASK2,
    liveMap: { kind: 'coding', files: ['src/solve.ts', 'src/helpers.py'] },
    opsDigest: { may: 'hunk', mustNot: 'cases.json' },
    history: SITTING_INJECT_THREAD,
    sectionContract: SITTING_INJECT_CONTRACT,
  })
  assert.ok(planUser.includes('# History'))
  assert.ok(planUser.includes(ASK1))
  assert.ok(planUser.includes('# Write assist'))
  const histBlock = planUser.split('# User')[0] ?? ''
  assert.equal(histBlock.includes(ASK2), false, 'peel skips ASK2 as prior')
  assert.equal(planUser.includes(RECEIPT), false)
  const atlas = readFileSync(
    join(repo, 'back_end/supabase/functions/interview-copilot-edit/prompts/userLanguageAtlas.ts'),
    'utf8',
  )
  assert.ok(atlas.includes('Pick exactly one mode'))
  assert.ok(atlas.includes('helper/python'))
  assert.ok(atlas.includes('# History / # Peel'))
})

hop('converse', () => {
  const peelChat = peelChatMessages(SITTING_INJECT_THREAD, ASK2)
  assert.ok(peelChat.some((m) => m.content.includes(ASK1)), 'ASK1 in chat messages')
  const converse = ctxForConverse(SITTING_INJECT_LIVE_DOC, {
    message: ASK2,
    peel: peelChat.length ? '' : formatPeelBlock(SITTING_INJECT_THREAD, ASK2),
    day: {
      continuing: true,
      previousSectionTitle: 'Ownership',
      standingNotes: 'prefers Jordan',
      candidateCvNote: 'Jordan · 8y backend',
      dayHistoryTail: [{ role: 'candidate', text: 'I owned the paging conflict.', phaseId: 'ph.talk' }],
    },
  })
  assert.ok(converse.includes('# User') && converse.includes(ASK2))
  assert.ok(converse.includes('Jordan · 8y backend'), 'converse # Interview includes CV note')
  assert.ok(converse.includes('I owned the paging conflict.'), 'converse # Interview includes prior Talk')
  assert.ok(converse.includes('# Interview'), 'converse header is Interview not Day')
  assert.equal(/# Day\b/.test(converse), false, 'converse must not use # Day jargon')
  assert.equal(/dayHistoryTail/.test(converse), false, 'converse JSON uses priorTurns')
  assert.equal(/# Peel/.test(converse), false, 'one peel channel when chat messages exist')
  const plan = ctxForPlan(SITTING_INJECT_LIVE_DOC)
  const planText = JSON.stringify(plan)
  assert.equal(/Jordan · 8y backend/.test(planText), false, 'plan hop must not dump CV note')
  assert.equal(/I owned the paging conflict/.test(planText), false, 'plan hop must not dump Talk tail')
  const planUser = buildCopilotPlanUser({
    message: ASK2,
    liveMap: plan.liveMap,
    history: SITTING_INJECT_THREAD,
    sectionContract: SITTING_INJECT_CONTRACT,
  })
  assert.equal(/Jordan · 8y backend/.test(planUser), false, 'plan user must not dump CV note')
  const sys = composeConverseSystem()
  assert.ok(sys.includes('# Thread'))
  const index = readFileSync(
    join(repo, 'back_end/supabase/functions/interview-copilot-edit/index.ts'),
    'utf8',
  )
  // No closing paren: the call also takes a persona name.
  assert.ok(index.includes('copilotWriteHonorBlock(doc.kind'))
})

hop('editor', () => {
  const bound = boundCodingPaths(CORRECTION, SITTING_INJECT_LIVE_DOC, `${ASK1}\n${CORRECTION}`)
  assert.deepEqual(bound, ['src/helpers.py'])
  const numbered = ctxForEditor(SITTING_INJECT_LIVE_DOC, bound)
  assert.ok(numbered.includes('helpers.py'))
  const editor = buildKindUserPrompt('coding', numbered, `Bind targetPath=${bound[0]}`, `${ASK1}\n${CORRECTION}`)
  assert.ok(editor.includes('# Turn context'), 'the hop still sees the peel, under its scoped heading')
  assert.ok(editor.includes('helpers.py'))
  assert.equal(numbered.includes('export function updateCache'), false, 'numbered must not be solve.ts body')
})

hop('bind', () => {
  assert.equal(uniqueCodingTargetPath(SITTING_INJECT_LIVE_DOC, ASK1, ''), 'src/helpers.py')
  assert.equal(uniqueCodingTargetPath(SITTING_INJECT_LIVE_DOC, CORRECTION, ASK1), 'src/helpers.py')
  assert.notEqual(uniqueCodingTargetPath(SITTING_INJECT_LIVE_DOC, ASK1), 'src/solve.ts')
})

hop('hydrate', () => {
  const phaseId = 'ph.code'
  const persisted = [
    {
      id: '1',
      phaseId,
      topicId: null,
      role: 'assistant',
      text: OPENER,
      at: 't',
      probeId: null,
      kind: 'assist',
    },
    {
      id: '2',
      phaseId,
      topicId: null,
      role: 'candidate',
      text: ASK1,
      at: 't',
      probeId: null,
      kind: 'answer',
    },
    {
      id: '3',
      phaseId,
      topicId: null,
      role: 'assistant',
      text: 'Kept Copilot change on src/solve.ts.',
      at: 't',
      probeId: null,
      kind: 'assist',
      compose: { situation: 'applied', missingGaps: [], sampleIdsUsed: [], model: 'copilot' },
    },
  ]
  const rowsOut = peelRuntimeFromPersisted(persisted, phaseId)
  assert.ok(rowsOut.some((r) => r.text === ASK1))
  assert.ok(rowsOut.some((r) => r.text === OPENER))
  assert.equal(
    rowsOut.some((r) => /Kept Copilot|accepted ·/.test(r.text)),
    false,
    'hydrate must drop Copilot receipt rows',
  )
})

hop('contract', () => {
  const edge = formatEdgeContract(SITTING_INJECT_CONTRACT, { firstTurn: true })
  const fe = formatFeContract(SITTING_INJECT_CONTRACT, { firstTurn: true })
  assert.equal(edge, fe, 'FE vs Edge first-turn rest line must be byte-identical')
  assert.ok(edge.includes('Do not recap'))
  assert.equal(edge.includes('Restate where you are'), false)
})

hop('inject_miss', () => {
  assert.equal(postedPriorPeelTurn(SITTING_INJECT_THREAD, ASK2), true)
  assert.equal(injectMissPeel(SITTING_INJECT_THREAD, ASK2), false, 'healthy peel is not a miss')
  assert.equal(injectMissPeel([{ role: 'candidate', text: ASK1 }], ASK1), false)
  assert.equal(postedPriorPeelTurn([{ role: 'candidate', text: ASK1 }], ASK1), false)
  const index = readFileSync(
    join(repo, 'back_end/supabase/functions/interview-copilot-edit/index.ts'),
    'utf8',
  )
  assert.ok(index.includes('inject_miss:peel'), 'hop stamps inject_miss:peel when peel pack is empty with prior speech')
})

{
  const assistSrc = readFileSync(
    join(repo, 'back_end/supabase/functions/interview-stage-assist/prompts/composeAssist.ts'),
    'utf8',
  )
  assert.equal(/JSON\.stringify\(\s*[^)]*historyTail/.test(assistSrc), false, 'Assist compose does not stringify historyTail')
  const index = readFileSync(
    join(repo, 'back_end/supabase/functions/interview-copilot-edit/index.ts'),
    'utf8',
  )
  assert.ok(index.includes('copilotWriteHonorBlock(doc.kind'))
  const talkSrc = readFileSync(
    join(repo, 'back_end/supabase/functions/interview-talk-turn/prompts/composeDiscussion.ts'),
    'utf8',
  )
  const needSrc = readFileSync(
    join(repo, 'back_end/supabase/functions/interview-talk-turn/needRetrieval.ts'),
    'utf8',
  )
  assert.ok(talkSrc.includes('talkNeedRetrievalSourceUnion'))
  for (const id of TALK_NEED_RETRIEVAL_ALL) {
    assert.ok(needSrc.includes(`'${id}'`), `parser allowlist includes ${id}`)
  }
}

console.log(rows.join(' | '))
console.log('sittingInject.trace: ok')
