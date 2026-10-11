/**
 * Message send-time pipeline — UI storage through assessment injection.
 * Run: npx tsx front_end/src/lib/interviewRunApi/messageTimestampPipeline.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatTranscriptTailForMessages } from '../../../../back_end/supabase/functions/interview-talk-turn/prompts/composeDiscussion.ts'
import { buildAssessorAidContext } from './buildAssessorAidContext.ts'
import { buildAssistDayContinuity } from './buildAssistDayContinuity.ts'
import { assistHistoryForCopilot, peelRuntimeFromPersisted } from './assistChatPersist.ts'
import { assistMarkThreadSlice } from './assistTurnMarks.ts'
import { emptyInterviewResponse } from './interviewResponse.ts'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../../..')

const PAST = '2020-06-01T10:15:00.000Z'
const LATER = '2020-06-01T10:22:00.000Z'

const msg = {
  id: 'msg.c1',
  phaseId: 'ph.talk',
  topicId: 'topic.a',
  role: 'candidate',
  text: 'I owned the rollout.',
  at: PAST,
  probeId: 'p1',
  kind: 'answer',
}

let doc = emptyInterviewResponse('fixture:ts-pipeline')
doc = { ...doc, messages: [msg] }

const peel = peelRuntimeFromPersisted(doc.messages, 'ph.talk')
assert.equal(peel[0]?.at, PAST, 'peel hydrate keeps at')

const thread = assistMarkThreadSlice(doc.messages, 'ph.talk')
assert.equal(thread[0]?.at, PAST, 'assist_turn thread carries at')

const aidCtx = buildAssessorAidContext({
  modal: {
    fixtureId: 'fixture:ts-pipeline',
    sectionKey: 'talk-1',
    sectionLabel: 'Conversation',
    title: 'Talk',
    description: '',
    depthLabel: '1 of 1',
    messages: [msg],
    cards: [],
  },
})
assert.equal(aidCtx.messages[0]?.at, PAST, 'Aid context carries at')

doc = {
  ...doc,
  messages: [
    ...doc.messages,
    {
      id: 'msg.a1',
      phaseId: 'ph.other',
      topicId: null,
      role: 'assistant',
      text: 'Prior section opener.',
      at: LATER,
      probeId: null,
      kind: 'assist',
    },
  ],
}
const day = buildAssistDayContinuity({
  response: doc,
  currentPhaseId: 'ph.talk',
  previousSectionTitle: 'Other',
})
assert.equal(day.dayHistoryTail[0]?.at, LATER, 'dayHistoryTail carries at')

const hist = assistHistoryForCopilot([{ role: 'candidate', text: 'hint please', at: PAST }])
assert.equal(hist[0]?.at, PAST, 'copilot history carries at when present')

const tail = formatTranscriptTailForMessages(
  [
    { role: 'candidate', text: 'First', at: PAST },
    { role: 'assistant', text: 'Follow up', at: LATER },
  ],
  8,
)
assert.match(tail, /\[\d/, 'talk compose tail prefixes clock when at present')
assert.match(tail, /candidate: First/)

const assessorSrc = readFileSync(
  join(repo, 'back_end/supabase/functions/_shared/interview-assessors/prompts/assessorPrompts.ts'),
  'utf8',
)
assert.match(assessorSrc, /thisSend\.at and threadSlice/, 'assist_turn prompt cites send time')

const reportSrc = readFileSync(
  join(repo, 'back_end/supabase/functions/interview-talk-turn/prompts/reportRules.ts'),
  'utf8',
)
assert.match(reportSrc, /Transcript rows may include at/, 'talk analysis rules cite send time')

const aidDialect = readFileSync(
  join(repo, 'back_end/supabase/functions/interview-assessor-aid/prompts/dialect.ts'),
  'utf8',
)
assert.match(aidDialect, /SEND TIME.*messages may include at/)

const composeAssistSrc = readFileSync(
  join(repo, 'back_end/supabase/functions/interview-stage-assist/prompts/composeAssist.ts'),
  'utf8',
)
assert.match(composeAssistSrc, /o\.at === 'string'/, 'stage assist maps at from wire messages')

const pageSrc = readFileSync(join(here, '../../pages/InterviewPage.tsx'), 'utf8')
assert.match(pageSrc, /m\.at\?\.trim\(\) \? \{ at: m\.at\.trim\(\) \}/, 'InterviewPage passes at to Edge')

// Negative: peel builders must not re-stamp with Date.now()+index
const assistPeelSrc = readFileSync(join(here, '../../components/InterviewAssistPeelChat.tsx'), 'utf8')
assert.doesNotMatch(assistPeelSrc, /Date\.now\(\)\s*\+\s*i/)

console.log('messageTimestampPipeline.unit.mjs: ok')
