/**
 * Talk peel opener craft (gate scene has no conversational intro).
 * Run: npx tsx front_end/src/lib/interviewRunApi/composeSessionIntro.unit.mjs
 */
import assert from 'node:assert/strict'
import comprehensive from '../interviewBrief/fixtures/creator2ComprehensiveBrief.json' with { type: 'json' }
import staff from '../interviewBrief/fixtures/staffSecurityEngineer80mHardenedLoop.json' with { type: 'json' }
import { buildTalkContext } from './buildTalkContext.ts'
import { composeGateIntroMessage } from './composeGateIntro.ts'
import { composeTalkOpenerUtterance, midSectionOrientation } from './composeTalkOpenerUtterance.ts'

// The invite phrasing varies by seed, so a peer test listing a retired phrase passes until
// the seed shifts. Sweep every variant here instead of trusting the one this fixture draws.
const INVITE = /Let's talk about|I'd like to hear about|Next up is/i
const invites = new Set()
for (let i = 0; i < 60; i += 1) {
  const line = midSectionOrientation('', 'Conflict handling', `seed-${i}`)
  assert.ok(INVITE.test(line), `every mid invite variant reads as an invite: ${line}`)
  invites.add(line)
}
assert.equal(invites.size, 3, `expected 3 mid invite variants, saw ${[...invites].join(' | ')}`)

const opening = buildTalkContext({
  briefId: 'fixture:comprehensive',
  brief: comprehensive,
  phaseId: 'ph.warmup',
})
assert.ok(opening)
assert.equal(opening.isOpening, true)
const openUtter = composeTalkOpenerUtterance(opening)
assert.ok(openUtter.includes(opening.persona.name), 'introduces persona from brief')
assert.ok(!/Morgan/i.test(openUtter), 'never hardcodes Morgan')
assert.ok(new RegExp(`Hi, I'm ${opening.persona.name}, your interviewer for today\\.`, 'i').test(openUtter), 'professional intro with who')
assert.ok(/Thanks for joining/i.test(openUtter))
assert.ok(/I('d like| want)|We'll start|First up/i.test(openUtter), 'states purpose orientation')
assert.ok(/real (situations|experiences)|behavioral|no single right answer|there isn'?t one right answer|may dig|follow-ups/i.test(openUtter), 'how-this-works beat')
assert.ok(!/here\s*-/i.test(openUtter), 'not informal radio lead')
assert.ok(/What have you been working on recently\?/i.test(openUtter), 'speaks assessor goal to candidate')

const conflict = buildTalkContext({
  briefId: 'fixture:comprehensive',
  brief: comprehensive,
  phaseId: 'ph.conflict',
})
assert.ok(conflict)
const midUtter = composeTalkOpenerUtterance(conflict)
assert.ok(/conflict|disagreement|owned/i.test(midUtter), 'mid-gate is ask-forward')
assert.ok(/Let's talk about|I'd like to hear about|Next up is/i.test(midUtter), 'mid-gate invites the section')
assert.ok(!/^We're now on/i.test(midUtter), 'mid-gate is not an agenda stamp')
assert.ok(!/(?:^|\n)I need (a specific|one concrete|you to)/i.test(midUtter), 'mid-gate is not homework')
assert.ok(!/I'm hoping for/i.test(midUtter), 'mid-gate does not lecture the probe hint')
assert.ok(!/ - (walk|tell|what|when|how)\b/i.test(midUtter), 'mid-gate does not hyphen-glue invite onto the ask')
assert.ok(!/the candidate/i.test(midUtter), 'mid-gate speaks to you not the candidate')
assert.ok(!/This part is about how you take|take responsibility and drive results|Welcome to the discussion section|Can you describe/i.test(midUtter), 'no assessor brochure or product jargon')
assert.ok(!/Earlier you/i.test(midUtter), 'mid-gate must not force prior callback')
assert.ok(!/\bI'?m\b/i.test(midUtter), 'mid-gate must not re-introduce persona')
assert.ok(!/^Hi\b/i.test(midUtter), 'mid-gate must not say Hi')

const staffOpen = buildTalkContext({
  briefId: 'fixture:staff',
  brief: staff,
  phaseId: 'ph.0qloid',
})
assert.ok(staffOpen)
const staffUtter = composeTalkOpenerUtterance(staffOpen)
assert.ok(staffUtter.includes(staffOpen.persona.name))
assert.ok(!/\bAvery\b/i.test(staffUtter), 'uses this brief persona only')
assert.equal(staffOpen.persona.name, 'Morgan', 'staff fixture persona (injectable, not craft hardcode)')
const staffCv = composeTalkOpenerUtterance(staffOpen, null, {
  hasCv: true,
  preferredName: 'Jordan',
  displayName: 'Jordan',
  rapportHook: 'Staff Software Engineer at Northwind Platforms',
})
assert.ok(/I'd like to start with a recent platform project you owned/i.test(staffCv), 'states topic purpose')
assert.ok(/real (situations|experiences)|behavioral|no single right answer|there isn'?t one right answer|may dig|follow-ups/i.test(staffCv), 'day-1 how-this-works')
assert.ok(/I'm hoping|A good answer will|focus on what made it interesting/i.test(staffCv), 'expectation from probe hint')
assert.ok(/platform project/i.test(staffCv) && !/what motivates you most/i.test(staffCv), 'authored probe not motivation softball')
assert.ok(/Looking at your work at Northwind Platforms,/i.test(staffCv))

const staffOwn = buildTalkContext({
  briefId: 'fixture:staff',
  brief: staff,
  phaseId: 'ph.k5wuze',
})
assert.ok(staffOwn)
const staffOwnUtter = composeTalkOpenerUtterance(staffOwn)
assert.ok(/Let's talk about Ownership and incident impact|I'd like to hear about Ownership and incident impact|Next up is Ownership and incident impact/i.test(staffOwnUtter), 'ownership mid names the section')
assert.ok(!/I'm hoping for/i.test(staffOwnUtter), 'ownership mid does not lecture the hint')
assert.ok(!/ - walk me through/i.test(staffOwnUtter), 'ownership mid does not hyphen-glue the ask')
assert.ok(!/(?:^|\n)I need a specific/i.test(staffOwnUtter), 'ownership mid is not homework')
assert.ok(/Walk me through a recent incident|walk me through a recent incident/i.test(staffOwnUtter), 'authored ask spoken')
assert.ok(!/This part is about how you take|take responsibility and drive results|Strong answers|Welcome to the discussion section|Can you describe/i.test(staffOwnUtter), 'ownership mid strips assessor brochure')

const withBridge = composeTalkOpenerUtterance(conflict, {
  hasMemory: true,
  bridge: 'Earlier you shared: I owned the API freeze and cut error rate 12%.',
})
assert.ok(/Let's talk about|I'd like to hear about|Next up is/i.test(withBridge), 'mid with memory still invites the section')
assert.ok(!/Earlier you shared/i.test(withBridge), 'mid open ignores forced prior bridge')
assert.ok(!/\bI'?m\b/i.test(withBridge), 'bridged mid open never re-introduces')
assert.ok(/conflict|disagreement|owned/i.test(withBridge), 'bridged open keeps ask')

{
  const thanked = composeTalkOpenerUtterance(staffOwn, null, null, {
    previousTitle: 'Two Sum',
  })
  assert.ok(
    /Thanks for (completing|wrapping up) Two Sum|Appreciate you finishing Two Sum/i.test(thanked),
    'mid-day thanks the prior section like Assist',
  )
  assert.ok(/Walk me through a recent incident|walk me through a recent incident/i.test(thanked))
  assert.ok(!/I'm hoping for/i.test(thanked))
}

const withCv = composeTalkOpenerUtterance(opening, null, {
  hasCv: true,
  preferredName: 'Jordan',
  displayName: 'Jordan Lee',
  rapportHook: 'Staff Software Engineer at Northwind Platforms',
})
assert.ok(
  new RegExp(`^Hi Jordan, I'm ${opening.persona.name}, your interviewer for today\\.`, 'i').test(withCv),
  'day-1: Hi preferred, I\'m persona, your interviewer',
)
assert.ok(/Thanks for joining/i.test(withCv))
assert.ok(!/I('d like| want)|We'll start|First up/i.test(withCv), 'name beat defers purpose to probe turn')
assert.ok(/real (situations|experiences)|behavioral|no single right answer|there isn'?t one right answer|may dig|follow-ups/i.test(withCv), 'day-1 how-this-works')
assert.ok(/Is Jordan the right name to use\?/i.test(withCv), 'address check when preferred differs')
assert.ok(!/Still Jordan/i.test(withCv), 'never nonsense Still-name')
assert.ok(!/here\s*-/i.test(withCv), 'not informal')
assert.ok(!/Good to meet you/i.test(withCv))
assert.ok(!/I noticed you'?re a/i.test(withCv))
assert.ok(!/what motivates you most/i.test(withCv), 'never invent motivation softballs')
assert.ok(!/Looking at your work at Northwind Platforms,/i.test(withCv), 'name beat omits probe')
assert.ok(!/working on recently|project you owned/i.test(withCv), 'name beat has no probe ask')
assert.equal((withCv.match(/\?/g) || []).length, 1, 'name beat: exactly one ask')
assert.ok(
  !/looked over your background|stood out|Nice to connect|Purpose of this gate|To get us going|settling into|I'd love to hear|looking forward|kick things off|feel free to|We're starting|We'll stay on|This part is about|Welcome to the/i.test(
    withCv,
  ),
)
assert.ok(!/popisnatch[\s\S]*Harbor|Highlights:/i.test(withCv), 'no resume dump')

const sameName = composeTalkOpenerUtterance(opening, null, {
  hasCv: true,
  preferredName: 'Jordan',
  displayName: 'Jordan',
  rapportHook: 'Staff platform engineer',
})
assert.ok(new RegExp(`Hi Jordan, I'm ${opening.persona.name}, your interviewer for today\\.`, 'i').test(sameName))
assert.ok(/Looking at your Staff platform engineer work,/i.test(sameName))
assert.ok(!/Is Jordan the right name|Still Jordan/i.test(sameName), 'skip address check when names match')
assert.equal((sameName.match(/\?/g) || []).length, 1, 'probe beat: exactly one ask')

const nameOnlyExplicit = composeTalkOpenerUtterance(opening, null, {
  hasCv: true,
  preferredName: 'Jordan',
  displayName: 'Jordan Lee',
  rapportHook: 'Staff Software Engineer at Northwind Platforms',
}, { openBeat: 'day1_name' })
assert.ok(/Is Jordan the right name to use\?/i.test(nameOnlyExplicit))
assert.ok(!/Looking at your work/i.test(nameOnlyExplicit))

const probeOnlyExplicit = composeTalkOpenerUtterance(opening, null, {
  hasCv: true,
  preferredName: 'Jordan',
  displayName: 'Jordan Lee',
  rapportHook: 'Staff Software Engineer at Northwind Platforms',
}, { openBeat: 'day1_first_probe' })
assert.ok(/Looking at your work at Northwind Platforms,/i.test(probeOnlyExplicit))
assert.ok(!/Is Jordan the right name/i.test(probeOnlyExplicit), 'probe beat skips name check')
assert.equal((probeOnlyExplicit.match(/\?/g) || []).length, 1)

{
  const { stripToFinalAsk } = await import('./stripToFinalAsk.ts')
  const stacked =
    'Hi Jordan, I am your interviewer. Is Jordan the right name to use? Looking at your work at Northwind, what project did you own?'
  const one = stripToFinalAsk(stacked)
  assert.equal((one.match(/\?/g) || []).length, 1)
  assert.ok(/what project did you own\?/i.test(one))
  assert.ok(!/right name to use/i.test(one))

  const md = stripToFinalAsk(
    'Still looking for drive.\n\n### Example\n\n> A short sample.\n\n**What keeps you in this work?**',
  )
  assert.ok(/\n### Example\n/.test(md), 'stripToFinalAsk preserves ### Example newline structure')
  assert.ok(/^>/m.test(md) || /\n> /.test(md), 'stripToFinalAsk preserves blockquote')
  assert.equal((md.match(/\?/g) || []).length, 1)

  const broken = stripToFinalAsk('Lead sentence. ** **What did you decide?')
  assert.ok(!/\*\*\s*\*\*/.test(broken), 'strips empty bold markers')

  const { ensureTalkMarkdownEmphasisSpacing } = await import('./stripToFinalAsk.ts')
  assert.equal(
    ensureTalkMarkdownEmphasisSpacing('That covers this part. **Use Next**when you are ready.'),
    'That covers this part. **Use Next** when you are ready.',
  )
  assert.equal(
    ensureTalkMarkdownEmphasisSpacing('I do not have what I need on *security*or *platform*.'),
    'I do not have what I need on *security* or *platform*.',
  )
  assert.equal(
    ensureTalkMarkdownEmphasisSpacing('Pick one**real project**you owned.'),
    'Pick one **real project** you owned.',
  )
  assert.equal(
    ensureTalkMarkdownEmphasisSpacing('**Use Next** when you are ready.'),
    '**Use Next** when you are ready.',
  )
  assert.equal(
    ensureTalkMarkdownEmphasisSpacing('API *freeze*. What next?'),
    'API *freeze*. What next?',
  )
  assert.equal(
    ensureTalkMarkdownEmphasisSpacing('Proposed`incrementOneTo200`in`src/helpers.ts`.'),
    'Proposed `incrementOneTo200` in `src/helpers.ts`.',
  )

  const { scrubBrokenTalkMarkdown } = await import('./stripToFinalAsk.ts')
  assert.equal(
    scrubBrokenTalkMarkdown(
      '** Happy to clarify q6. That asks about years.\n\nYou will see this in the **question list ** on the main panel.',
    ),
    'Happy to clarify q6. That asks about years.\n\nYou will see this in the **question list** on the main panel.',
  )
  assert.equal(
    scrubBrokenTalkMarkdown('Work in the ** main panel** when ready.'),
    'Work in the **main panel** when ready.',
  )

  const { ensureTalkMarkdownListBreaks, scrubChatDashMarkers } = await import('./stripToFinalAsk.ts')
  const soup =
    'Done - updated coding workspace files: - Parse and sum drill: helpers. - API rate limiter design: helpers.'
  const listed = ensureTalkMarkdownListBreaks(soup)
  assert.match(listed, /^Done - updated coding workspace files:/)
  assert.match(listed, /\n- Parse and sum drill:/)
  assert.match(listed, /\n- API rate limiter design:/)
  const paragraphList = ensureTalkMarkdownListBreaks('Lead sentence.\n- first helper\n- second helper')
  assert.match(paragraphList, /Lead sentence\.\n\n- first helper\n- second helper/)
  const dumped = ensureTalkMarkdownListBreaks('Lead sentence. - first helper - second helper')
  assert.match(dumped, /Lead sentence\.\n\n- first helper/)
  assert.equal(/Lead sentence\. - first/.test(dumped), false, 'must split sentence-end list soup')
  const kept = scrubChatDashMarkers('Lead:\n- first helper\n- second helper')
  assert.match(kept, /Lead:\n\n- first helper/)
  assert.equal(/Lead: - first/.test(kept), false, 'must not flatten list markers onto one line')
}
const midNoNameRecheck = composeTalkOpenerUtterance(conflict, null, {
  hasCv: true,
  preferredName: 'Jordan',
  displayName: 'Jordan Lee',
  rapportHook: 'Staff Software Engineer at Northwind Platforms',
})
assert.ok(!/Is Jordan the right name|Still Jordan/i.test(midNoNameRecheck), 'mid-gate skips name check')
assert.ok(!/Looking at your work/i.test(midNoNameRecheck), 'mid-gate skips day-1 CV bridge')
assert.ok(!/\bI'?m\b/i.test(midNoNameRecheck), 'mid-gate with CV never re-introduces')

const midWithMemoryAndCv = composeTalkOpenerUtterance(
  conflict,
  { hasMemory: true, bridge: 'Earlier you owned the API freeze.' },
  {
    hasCv: true,
    preferredName: 'Jordan',
    displayName: 'Jordan Lee',
    rapportHook: 'Staff Software Engineer at Northwind Platforms',
  },
)
assert.ok(!/Hi Jordan/i.test(midWithMemoryAndCv), 'continuing day: no CV day-1 greet')
assert.ok(!/here - Jordan/i.test(midWithMemoryAndCv), 'continuing day: no informal lead')
assert.ok(!/I noticed you'?re/i.test(midWithMemoryAndCv), 'continuing day: no CV day-1 hook greeting')
assert.ok(!/\bI'?m\b/i.test(midWithMemoryAndCv), 'continuing day: no persona re-intro')

{
  const { scrubContinuingDayOpen, looksLikeDay1Reintro } = await import('./scrubContinuingDayOpen.ts')
  const leaked =
    "Hi Jordan, I'm Morgan, your interviewer for today. Thanks for joining. In these conversations, I'll ask about real experiences-there's no single right answer, and I may dig a bit with follow-ups as we go. We're starting with motivation and interests. What motivates you most? Is Jordan the right name to use?"
  assert.ok(looksLikeDay1Reintro(leaked), 'detects day-1 leak')
  const cleaned = scrubContinuingDayOpen(leaked)
  assert.ok(!looksLikeDay1Reintro(cleaned), 'scrub removes day-1 re-intro')
  assert.ok(!/Hi Jordan|I'm Morgan|Thanks for joining|right name to use|In these conversations/i.test(cleaned), 'scrub strips greet/who/thanks/name/how-this-works')
}

assert.equal(
  composeGateIntroMessage({
    stageLabel: 'Conversation',
    sectionTitle: 'Opening',
    description: 'Settle in',
    startPrompt: 'Briefly describe a recent platform project you worked on',
    interviewerName: 'Avery',
    isOpening: true,
  }),
  '',
  'gate scene no longer carries conversational intro',
)

console.log('composeSessionIntro: ok')
