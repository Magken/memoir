/**
 * Chat send-failure bubble + composer-header absence.
 * Run: npx tsx front_end/src/lib/chat/errorBubble.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildChatErrorMessage,
  isRepeatOfLastCandidate,
  lastUserPlainText,
  sittingChatErrorCopy,
} from './errorBubble.ts'

const err = buildChatErrorMessage({
  text: 'Could not send that message. Try again.',
  conversationId: 'c1',
  senderId: 'chat-error',
})
assert.equal(err.kind, 'error')
assert.equal(err.role, 'assistant')
assert.equal(err.parts[0]?.type, 'text')

assert.match(sittingChatErrorCopy('missing_openai_key', 'bot'), /OpenAI/)
assert.match(sittingChatErrorCopy('not_authenticated', 'assist'), /Copilot/)
assert.match(sittingChatErrorCopy('not_authenticated', 'talk'), /Retry/)
assert.match(sittingChatErrorCopy('http_503', 'bot'), /restarting/)
assert.equal(
  /Sign in to use stage assist/.test(sittingChatErrorCopy('not_authenticated', 'assist')),
  false,
  'negative: guest Copilot must not be a sign-in-only header line',
)

const rows = [
  { role: 'assistant', text: 'Hello' },
  { role: 'candidate', text: 'My last ask' },
]
assert.equal(lastUserPlainText(rows), 'My last ask')
assert.equal(isRepeatOfLastCandidate(rows, 'My last ask'), true)
assert.equal(
  isRepeatOfLastCandidate(rows, 'A different ask'),
  false,
  'negative: a new candidate turn is not a retry of the last bubble',
)
assert.equal(isRepeatOfLastCandidate([], 'My last ask'), false)

const here = dirname(fileURLToPath(import.meta.url))
const composer = readFileSync(join(here, '../../components/chatParts/ChatComposer.tsx'), 'utf8')
assert.equal(
  /theme-chat-composer__error/.test(composer),
  false,
  'negative: composer hint must not print send errors',
)

const bubble = readFileSync(join(here, '../../components/chatParts/ChatBubble.tsx'), 'utf8')
assert.match(bubble, /export function ChatErrorBubble/)
assert.match(bubble, /theme-chat-bubble--error/)
assert.match(bubble, /variant="error"/)

const css = readFileSync(join(here, '../../css/effects/chat-shared.css'), 'utf8')
assert.match(css, /theme-chat-bubble--error/)
assert.match(css, /border: 1px dashed/)

const assist = readFileSync(join(here, '../../components/InterviewAssistPeelChat.tsx'), 'utf8')
assert.match(assist, /ChatErrorBubble/)
assert.equal(
  /theme-interview-gate__talk-error/.test(assist),
  false,
  'negative: Copilot peel must not print errors above the composer',
)

const talkPage = readFileSync(join(here, '../../components/InterviewTalkPageChat.tsx'), 'utf8')
assert.match(talkPage, /ChatErrorBubble/)
assert.equal(
  /theme-interview-talk-page__error/.test(talkPage),
  false,
  'negative: Talk page must not print errors above the composer',
)

const talkPeel = readFileSync(join(here, '../../components/InterviewTalkChatSpace.tsx'), 'utf8')
assert.match(talkPeel, /ChatErrorBubble/)
assert.equal(/theme-interview-gate__talk-error/.test(talkPeel), false)

const botThread = readFileSync(join(here, '../../components/botChatParts/BotChatThread.tsx'), 'utf8')
assert.match(botThread, /ChatErrorBubble/)
assert.match(botThread, /errorText/)

const dmThread = readFileSync(join(here, '../../components/dmChatParts/DmChatThread.tsx'), 'utf8')
assert.match(dmThread, /ChatErrorBubble/)
assert.match(dmThread, /errorText/)

const statusBot = readFileSync(join(here, '../../components/botChatParts/BotChatStatusBar.tsx'), 'utf8')
assert.equal(
  /theme-chat-composer__error/.test(statusBot),
  false,
  'negative: bot status bar must not print send errors',
)
const statusDm = readFileSync(join(here, '../../components/dmChatParts/DmChatStatusBar.tsx'), 'utf8')
assert.equal(
  /theme-chat-composer__error/.test(statusDm),
  false,
  'negative: DM status bar must not print send errors',
)

const copilotClient = readFileSync(join(here, '../interviewRunApi/copilotEditEdgeClient.ts'), 'utf8')
assert.match(copilotClient, /requireInterviewEdgeAccessToken\(null, payload\.briefId\)/)
assert.equal(/if \(!session\?\.access_token\)/.test(copilotClient), false)

console.log('errorBubble.unit.mjs: ok')
