/**
 * Trace gauge — each hop must receive peel / bound helper / prior turn.
 * $0, no OpenAI. Wired into front_end:test:copilot-edit.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCopilotPlanUser } from '../../../../back_end/supabase/functions/interview-copilot-edit/prompts/planCheck.ts'
import { USER_LANGUAGE_ATLAS } from '../../../../back_end/supabase/functions/interview-copilot-edit/prompts/userLanguageAtlas.ts'
import { ctxForConverse, ctxForEditor } from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotContext.ts'
import { uniqueCodingTargetPath, boundCodingPaths, dropOffBoundSolveOps } from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotTargetBind.ts'
import { priorCandidate, formatPeelBlock, peelChatMessages } from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotPeel.ts'
import { buildKindUserPrompt } from '../../../../back_end/supabase/functions/interview-copilot-edit/prompts/editors.ts'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../../..')

const ASK1 =
  'Please help me write a simple sample case statement template in the Python helper function file'
const ASK2 = 'what did I ask'
const CORRECTION = 'I said in the python helper function file'

const history = [
  { role: 'assistant', text: 'Welcome.' },
  { role: 'candidate', text: ASK1 },
  { role: 'assistant', text: 'Proposed a hunk in src/solve.ts.' },
  { role: 'assistant', text: 'accepted · src/solve.ts · updateCache' },
  { role: 'candidate', text: ASK2 },
]

const doc = {
  kind: 'coding',
  generation: 1,
  snapshotHash: 'h',
  selection: { path: 'src/solve.ts' },
  coding: {
    activeId: 'src/solve.ts',
    files: [
      { path: 'src/solve.ts', content: 'export function updateCache() {\n  return cache\n}\n' },
      { path: 'src/helpers.py', content: 'def is_newer_version(current, incoming):\n    return False\n' },
    ],
  },
}

{
  const planUser = buildCopilotPlanUser({
    message: ASK2,
    liveMap: { kind: 'coding', files: ['src/solve.ts', 'src/helpers.py'] },
    opsDigest: { may: 'hunk', mustNot: 'cases.json' },
    history,
  })
  assert.ok(planUser.includes('# History'), 'plan has # History')
  assert.ok(planUser.includes('Python helper'), 'plan history has ask1')
  assert.ok(planUser.includes('# Write assist'), 'plan injects write honor')
  assert.equal(planUser.includes('accepted ·'), false, 'plan history must drop Check/X receipts')
  const histBlock = planUser.split('# User')[0] ?? ''
  assert.equal(histBlock.includes(ASK2), false, 'priorUser must not be ask2')
}

{
  assert.ok(USER_LANGUAGE_ATLAS.includes('Pick exactly one mode'), 'atlas is a mode table')
  assert.ok(USER_LANGUAGE_ATLAS.includes('helper/python'))
  assert.ok(USER_LANGUAGE_ATLAS.includes('# History / # Peel'))
  assert.ok(USER_LANGUAGE_ATLAS.includes('Never sampleCase()'))
}

{
  assert.equal(priorCandidate(history, ASK2), ASK1)
  assert.equal(priorCandidate(history, ASK2) === ASK2, false)
}

{
  assert.equal(uniqueCodingTargetPath(doc, ASK1, ''), 'src/helpers.py')
  assert.equal(uniqueCodingTargetPath(doc, CORRECTION, ASK1), 'src/helpers.py')
  assert.notEqual(uniqueCodingTargetPath(doc, ASK1), 'src/solve.ts')
}

{
  const peelChat = peelChatMessages(history, ASK2)
  assert.ok(peelChat.some((m) => m.content.includes(ASK1)), 'converse chat messages have ask1')
  const converse = ctxForConverse(doc, {
    message: ASK2,
    peel: peelChat.length ? '' : formatPeelBlock(history, ASK2),
  })
  assert.equal(/# Peel/.test(converse), false, 'one peel channel: omit # Peel when chat messages exist')
  assert.ok(converse.includes('# User') && converse.includes(ASK2))
  assert.equal(converse.includes('accepted ·'), false)
}

{
  const bound = boundCodingPaths(CORRECTION, doc, `${ASK1}\n${CORRECTION}`)
  assert.deepEqual(bound, ['src/helpers.py'])
  const numbered = ctxForEditor(doc, bound)
  assert.ok(numbered.includes('helpers.py'))
  const editor = buildKindUserPrompt('coding', numbered, `Bind targetPath=${bound[0]}`, `${ASK1}\n${CORRECTION}`)
  assert.ok(editor.includes('# Turn context'), 'the hop still sees the peel, under its scoped heading')
  assert.ok(editor.includes('Python helper'))
  assert.equal(numbered.includes('export function updateCache'), false, 'editor numbered must not be solve.ts')
}

{
  assert.deepEqual(
    dropOffBoundSolveOps(
      [{ op: 'line_hunk', path: 'src/solve.ts', start: 1, end: 0, text: 'x' }],
      'src/helpers.py',
    ),
    [],
  )
}

{
  const talk = readFileSync(join(repo, 'front_end/src/components/InterviewTalkChatSpace.tsx'), 'utf8')
  assert.equal(/onStop=\{onAssistStop\}/.test(talk), false, 'sitting peel must not pass onStop')
  const peelChat = readFileSync(join(repo, 'front_end/src/components/InterviewAssistPeelChat.tsx'), 'utf8')
  assert.equal(/onStop=\{write \? onStop/.test(peelChat), false, 'Copilot sitting peel has no Stop')
  const page = readFileSync(join(repo, 'front_end/src/pages/InterviewPage.tsx'), 'utf8')
  assert.ok(page.includes('peelRuntimeFromPersisted'), 'Start hydrates peel from persist')
  const index = readFileSync(join(repo, 'back_end/supabase/functions/interview-copilot-edit/index.ts'), 'utf8')
  // No closing paren: the call takes a persona name too, and this assertion is
  // about the call site being wired to doc.kind, not about its arity.
  assert.ok(index.includes('copilotWriteHonorBlock(doc.kind'), 'converse compose injects write honor')
}

console.log('copilotPeelHistory.gauge: ok')
