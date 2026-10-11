/**
 * Chat message clock + send-time round-trip gates.
 * Run: npx tsx front_end/src/lib/chat/chatMessageTime.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  epochMsToIso,
  formatMessageClock,
  messageCreatedAtIso,
} from './time.ts'
import { stampChatSendAt } from '../interviewRunApi/chatSendAt.ts'
import { peelRuntimeFromPersisted } from '../interviewRunApi/assistChatPersist.ts'

const past = '2020-01-15T14:30:00.000Z'
const pastMs = Date.parse(past)

assert.equal(messageCreatedAtIso(past), past)
assert.equal(messageCreatedAtIso(pastMs), past)
assert.equal(messageCreatedAtIso(''), '')
assert.equal(messageCreatedAtIso(0), '')
assert.equal(epochMsToIso(0), '')
assert.match(formatMessageClock(past), /\d/)

assert.notEqual(stampChatSendAt(past), stampChatSendAt())
assert.equal(stampChatSendAt(past), past)

const peelRows = peelRuntimeFromPersisted(
  [
    {
      id: 'm1',
      phaseId: 'p1',
      topicId: null,
      role: 'candidate',
      text: 'hello',
      at: past,
      probeId: null,
      kind: 'answer',
    },
  ],
  'p1',
)
assert.equal(peelRows[0]?.at, past)

const assistSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../components/InterviewAssistPeelChat.tsx'),
  'utf8',
)
assert.match(assistSrc, /messageCreatedAtIso\(msg\.at\)/)
assert.doesNotMatch(assistSrc, /Date\.now\(\)\s*\+\s*i/)

const aidSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../components/InterviewAssessorAidPeelChat.tsx'),
  'utf8',
)
assert.match(aidSrc, /messageCreatedAtIso\(msg\.at\)/)
assert.doesNotMatch(aidSrc, /Date\.now\(\)\s*\+\s*i/)

const talkSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../components/InterviewTalkPageChat.tsx'),
  'utf8',
)
assert.doesNotMatch(talkSrc, /return new Date\(\)\.toISOString\(\)/)

const openerSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../interviewRunApi/composeAssistOpenerUtterance.ts'),
  'utf8',
)
assert.match(openerSrc, /timer keeps running/)

const policySrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../interviewRunApi/sittingPolicy/SittingPolicyOverlay.tsx'),
  'utf8',
)
assert.match(policySrc, /stage timer keeps running/)

console.log('chatMessageTime.unit.mjs: ok')
