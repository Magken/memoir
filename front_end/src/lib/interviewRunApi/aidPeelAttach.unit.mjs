/**
 * Aid peel attach is a pill + pack, not a pasted Ask draft.
 * Run: npx tsx front_end/src/lib/interviewRunApi/aidPeelAttach.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  attachFromMarkCard,
  attachFromHome,
  mergeAidTrailRefs,
  trailRefsFromAttach,
  resolveAidOpenRef,
  AID_HOUSING_OVERVIEW,
  AID_HOUSING_SECURITY,
  aidPeelErrorCopy,
  aidErrorCodeFromCatch,
  AID_PEEL_GENERIC_ERROR,
} from './aidPeelAttach.ts'

{
  const attach = attachFromMarkCard({
    id: 'card.own',
    kind: 'utterance',
    anchorMessageId: 'msg.owned',
    messageIds: ['msg.owned'],
    title: 'Ownership',
    lane: 'content',
    emphasized: false,
    dimensions: [],
    evidence: [],
  })
  assert.equal(attach.kind, 'mark')
  assert.equal(attach.id, 'card.own')
  assert.equal(attach.label, 'Ownership · content')
  assert.equal(attach.snapshot?.id, 'card.own')
  assert.equal(attach.snapshot?.title, 'Ownership')
  assert.equal(
    /Tell me about the/.test(attach.label),
    false,
    'negative: attach label is not the old paste sentence',
  )
}

{
  const home = attachFromHome({
    kind: 'section_work',
    id: 'ph.code',
    label: 'Two-sum · Work',
  })
  assert.equal(home.kind, 'section_work')
  assert.equal(home.id, 'ph.code')
}

{
  const trails = mergeAidTrailRefs(
    [{ sectionId: 'bogus', label: 'drop me' }],
    { kind: 'section_work', id: 'ph.code', label: 'Parse and sum · Work' },
  )
  assert.equal(trails[0]?.sectionId, 'ph.code')
  assert.equal(trails[0]?.stage, 'editor')
}

{
  const overall = trailRefsFromAttach({ kind: 'overall', label: 'Overall' })
  assert.equal(overall[0]?.sectionId, AID_HOUSING_OVERVIEW)
  const security = trailRefsFromAttach({ kind: 'security', label: 'Security' })
  assert.equal(security[0]?.sectionId, AID_HOUSING_SECURITY)
  const markOrphan = trailRefsFromAttach({
    kind: 'mark',
    id: 'card.own',
    label: 'Ownership · content',
  })
  assert.equal(markOrphan.length, 0, 'negative: a mark Chip must not jump a card id')
  const markHome = trailRefsFromAttach({
    kind: 'mark',
    id: 'card.own',
    sectionId: 'ph.code',
    stage: 'editor',
    label: 'Ownership · content',
  })
  assert.equal(markHome[0]?.sectionId, 'ph.code')
  assert.equal(markHome[0]?.stage, 'editor')
}

{
  const pack = {
    'ph.talk': { canChat: true, canEditor: false, kind: 'talk' },
    'ph.code': { canChat: true, canEditor: true, kind: 'coding' },
    'ph.form': { canChat: true, canEditor: true, kind: 'form' },
  }
  assert.equal(resolveAidOpenRef({ sectionId: 'overall' }, pack).action, 'overview')
  assert.equal(resolveAidOpenRef({ sectionId: 'security' }, pack).action, 'security')
  assert.equal(resolveAidOpenRef({ sectionId: 'clarity' }, pack).action, 'clarity')
  const talk = resolveAidOpenRef({ sectionId: 'ph.talk', stage: 'chat' }, pack)
  assert.equal(talk.action, 'review')
  if (talk.action === 'review') {
    assert.equal(talk.mode, 'chat')
  }
  const radar = resolveAidOpenRef({ sectionId: 'ph.code' }, pack)
  assert.equal(radar.action, 'review')
  if (radar.action === 'review') {
    assert.equal(radar.mode, 'editor', 'coding opens Work first')
  }
  const codingChat = resolveAidOpenRef({ sectionId: 'ph.code', stage: 'chat' }, pack)
  assert.equal(codingChat.action, 'review')
  if (codingChat.action === 'review') {
    assert.equal(codingChat.mode, 'chat', 'explicit Conversation still opens when the section has chat')
  }
  const form = resolveAidOpenRef({ sectionId: 'ph.form' }, pack)
  assert.equal(form.action, 'review')
  if (form.action === 'review') {
    assert.equal(form.mode, 'editor', 'form with Work opens Work, not Conversation')
  }
  const formChat = resolveAidOpenRef({ sectionId: 'ph.form', stage: 'chat' }, pack)
  assert.equal(formChat.action, 'review')
  if (formChat.action === 'review') {
    assert.equal(formChat.mode, 'chat')
  }
  assert.equal(
    resolveAidOpenRef({ sectionId: 'card.own' }, pack).action,
    'none',
    'negative: mark-card ids must not open a blank edit stage',
  )
}

{
  assert.equal(
    aidPeelErrorCopy('http_503'),
    'Assessor Aid is restarting. Try again in a moment.',
  )
  assert.equal(aidPeelErrorCopy('http_502'), 'Assessor Aid is restarting. Try again in a moment.')
  assert.equal(
    aidPeelErrorCopy('http_546'),
    AID_PEEL_GENERIC_ERROR,
  )
  assert.equal(
    /room|one home|context/i.test(aidPeelErrorCopy('http_546')),
    false,
    'negative: 546 must not pretend the model ran out of context',
  )
  assert.equal(aidPeelErrorCopy('WORKER_RESOURCE_LIMIT'), aidPeelErrorCopy('http_546'))
  assert.equal(
    aidPeelErrorCopy('http_546') === aidPeelErrorCopy('http_503'),
    false,
    'negative: a 546 worker stop is not a Kong restart',
  )
  assert.equal(aidPeelErrorCopy('compose_empty'), 'Could not write a reply from this card. Try again.')
  assert.equal(aidPeelErrorCopy('missing_openai_key').includes('OpenAI'), true)
  assert.match(aidPeelErrorCopy('not_authenticated'), /Retry/)
  assert.equal(
    /Sign in to use Assessor Aid/.test(aidPeelErrorCopy('not_authenticated')),
    false,
    'negative: guest Try interviews must not be blocked on a sign-in-only Aid line',
  )
  assert.equal(aidPeelErrorCopy('unknown'), AID_PEEL_GENERIC_ERROR)
  assert.equal(
    aidPeelErrorCopy('http_503') === AID_PEEL_GENERIC_ERROR,
    false,
    'negative: http_503 must not map to the generic line',
  )
  assert.equal(aidErrorCodeFromCatch({ code: 'unknown', message: 'http_503' }), 'http_503')
  assert.equal(aidErrorCodeFromCatch({ code: 'unknown', message: 'http_546' }), 'http_546')
  assert.equal(
    aidErrorCodeFromCatch({ code: 'unknown', message: 'WORKER_RESOURCE_LIMIT' }),
    'http_546',
  )
  assert.equal(aidErrorCodeFromCatch({ code: 'compose_empty' }), 'compose_empty')
  assert.equal(
    aidErrorCodeFromCatch({
      code: 'missing_openai_key',
      message: 'WORKER_RESOURCE_LIMIT',
    }),
    'missing_openai_key',
    'negative: a known Edge code must not be remapped to http_546',
  )
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const peel = readFileSync(join(here, '../../components/InterviewAssessorAidPeelChat.tsx'), 'utf8')
  assert.match(peel, /theme-interview-assessor-aid-peel__attach/)
  assert.match(peel, /selected/)
  assert.match(peel, /onDismiss=\{onDismissAttach\}/)
  assert.match(peel, /aid\.jump-utterance/)
  assert.match(peel, /presentation: 'links'/)
  assert.match(peel, /Jump to utterance/)
  assert.equal(
    /Jump to cited utterance/.test(peel),
    false,
    'negative: Jump lives on the bubble card-link, not a cited-utterance footer',
  )
  assert.equal(
    /theme-interview-assessor-aid-peel__cites/.test(peel),
    false,
    'negative: cite jump is not a peel footer strip',
  )
  assert.match(peel, /aidPeelErrorCopy/)
  assert.match(peel, /boardTrailFor/)
  assert.match(peel, /theme-interview-assessor-aid-peel__head-refs/)
  assert.match(peel, /<Bookmark size=\{12\}/)
  assert.equal(
    /if \(message\.role !== 'assistant'\) return null/.test(peel),
    false,
    'negative: You and Aid bubbles both show the home Chip',
  )
  const bubble = readFileSync(join(here, '../../components/chatParts/ChatBubble.tsx'), 'utf8')
  const headAt = bubble.indexOf('theme-chat-bubble__board-head')
  const trailAt = bubble.indexOf('theme-chat-bubble__board-trail')
  assert.ok(headAt >= 0 && trailAt > headAt, 'Chip sits below the name/time divider')
  const headBlock = bubble.slice(headAt, trailAt)
  assert.equal(
    /\{boardTrail\}/.test(headBlock),
    false,
    'negative: boardTrail must not sit inside the board-head row',
  )
  assert.equal(
    /AskAidLink/.test(peel),
    false,
    'negative: reply homes are composer-style Chips below the divider, not AskAidLink rows',
  )
  assert.equal(
    /aid\.error === 'missing_openai_key'/.test(peel),
    false,
    'negative: peel must not inline a two-code error ternary',
  )
  const landingCss = readFileSync(join(here, '../../css/effects/interview-landing.css'), 'utf8')
  assert.match(landingCss, /theme-interview-ask-aid-link/)
  assert.match(landingCss, /width: max-content/)
  assert.match(landingCss, /theme-interview-assessor-aid-peel .theme-interview-creator-chat__composer-leading/)
  assert.match(landingCss, /justify-content: center/)
  assert.match(landingCss, /max-width: 16rem/)
  assert.match(landingCss, /theme-chat-bubble__board-trail/)
  assert.match(landingCss, /theme-interview-assessor-aid-peel__head-refs \.theme-chip__surface/)
  assert.match(landingCss, /padding: 0\.06rem 0\.4rem/)
  assert.match(landingCss, /text-overflow: ellipsis/)
  assert.match(landingCss, /white-space: nowrap/)
  assert.match(landingCss, /theme-interview-assessor-aid-peel__head-refs \{[\s\S]*?max-width: 66\.67%/)
  assert.match(
    landingCss,
    /theme-interview-assessor-aid-peel \.theme-chat-bubble__board-trail \{[\s\S]*?justify-content: flex-start/,
  )
  assert.equal(
    /theme-interview-assessor-aid-peel__head-refs[\s\S]{0,900}overflow-wrap: anywhere/.test(landingCss),
    false,
    'negative: bubble home Chip must not wrap into a tall two-line pill',
  )
  assert.equal(
    /theme-interview-assessor-aid-peel__head-refs \.theme-chip__label span \{[\s\S]*?max-width: min\(16rem/.test(
      landingCss,
    ),
    false,
    'negative: bubble Chip is corner-tucked at 2/3 width, not a 16rem full-row label',
  )
  const creatorCss = readFileSync(join(here, '../../css/effects/interview-creator-chat.css'), 'utf8')
  assert.match(creatorCss, /theme-interview-creator-chat__composer-attach \.theme-chip__label \{[\s\S]*?max-width: 7\.5rem/)
  assert.equal(
    /theme-interview-assessor-aid-peel[\s\S]*max-width: 7\.5rem/.test(landingCss),
    false,
    'negative: Aid peel must not inherit a left-only 7.5rem attach clip as its only layout',
  )
  const reviewSrc = readFileSync(join(here, '../../components/InterviewFlowResultSection.tsx'), 'utf8')
  assert.match(reviewSrc, /onAskAboutCard\(card, \{ sectionId: step\.id, stage: mode \}\)/)
  assert.match(reviewSrc, /theme-interview-ask-aid-link/)
  assert.equal(
    /onAskAboutCard=\{onAskAboutCard\}/.test(reviewSrc),
    false,
    'negative: mark Ask must stamp the parent Results step, not only the card',
  )
  assert.equal(
    /\[\s*'theme-chat-part__card-link'/.test(reviewSrc),
    false,
    'negative: header Ask must not use the full-width card-link row',
  )
  const timeline = readFileSync(join(here, '../../components/InterviewFlowTimeline.tsx'), 'utf8')
  const openAt = timeline.indexOf("openReview: (id: string, mode?: 'chat' | 'editor') => {")
  const focusAt = timeline.indexOf('focusSection:', openAt)
  const openBlock = timeline.slice(openAt, focusAt > openAt ? focusAt : openAt + 1200)
  assert.match(openBlock, /resolveAidOpenRef/)
  assert.equal(
    /enterEditStage\(id\)/.test(openBlock),
    false,
    'negative: unknown Chip ids must not open a blank edit stage',
  )
  const page = readFileSync(join(here, '../../pages/InterviewPage.tsx'), 'utf8')
  assert.match(page, /attachTrail\.length \? \{ openRefs: attachTrail \}/)
  assert.match(page, /attachFromMarkCard\(card, home\)/)
  assert.equal(
    /Tell me about the \$\{/.test(page),
    false,
    'negative: Ask Aid must not paste a Tell me about draft',
  )
  assert.match(page, /aidErrorCodeFromCatch/)
  assert.match(page, /attachFromMarkCard/)
  assert.match(page, /mergeAidTrailRefs/)
  assert.match(page, /focusPrompt: null/)
  assert.match(page, /attach: sentAttach/)
  assert.match(page, /const sentAttach = assessorAidAttachRef\.current/)
  const sendStart = page.indexOf('const handleAssessorAidSend')
  const sendEnd = page.indexOf('const expireCopilotPending')
  assert.ok(sendStart >= 0 && sendEnd > sendStart, 'Aid send exists')
  const send = page.slice(sendStart, sendEnd)
  const ctxAttachAt = send.indexOf('attach: sentAttach')
  const clearAt = send.indexOf('setAssessorAidAttach(null)')
  assert.ok(ctxAttachAt >= 0 && clearAt > ctxAttachAt, 'composer Chip clears after this turn captures attach')
  assert.match(send, /mergeAidTrailRefs\(\s*result\.composeMeta\.openRefs,\s*sentAttach/)
  assert.equal(
    /attach: assessorAidAttachRef\.current/.test(send),
    false,
    'negative: send must not keep reading the composer Chip after it is cleared',
  )
  assert.match(page, /messages: prev\.messages\.filter\(\(m\) => m\.id !== streamId\)/)
  const citeStart = page.indexOf('const handleAssessorAidCite')
  const citeEnd = page.indexOf('const handleAssessorAidAttach')
  assert.ok(citeStart >= 0 && citeEnd > citeStart, 'Aid cite jump exists')
  const cite = page.slice(citeStart, citeEnd)
  assert.match(cite, /setPendingReviewJump/)
  assert.match(cite, /sectionIdForCitedUtterance/)
  assert.match(cite, /openReview\(sectionId, 'chat'\)/)
  assert.equal(
    /onAssessorAidCite=\{handleVerifyCiteMessage\}/.test(page),
    false,
    'negative: Aid Jump must not only flash the sitting Talk overlay',
  )
}

console.log('aidPeelAttach.unit.mjs: ok')
