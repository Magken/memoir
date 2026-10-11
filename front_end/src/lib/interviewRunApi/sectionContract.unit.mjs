/**
 * SECTION CONTRACT formatter.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sectionContract.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  buildAssistSectionContract,
  buildTalkSectionContract,
  formatSectionContractBlock,
} from './sectionContract.ts'
import { formatSectionContractBlock as formatEdgeContract } from '../../../../back_end/supabase/functions/_shared/sectionContract.ts'

const talk = buildTalkSectionContract({
  phaseId: 'ph.talk',
  title: 'Ownership stories',
  topicLabel: 'Ownership',
  topicPurpose: 'Hear a recent incident they owned.',
})
assert.equal(talk.kind, 'talk')
assert.match(talk.purpose, /incident/)
const talkBlock = formatSectionContractBlock(talk, { firstTurn: true })
assert.match(talkBlock, /# SECTION CONTRACT/)
assert.match(talkBlock, /Ownership stories/)
assert.match(talkBlock, /first turn/)
assert.match(talkBlock, /Do not recap instructions/)
assert.match(talkBlock, /previousSection/)
assert.doesNotMatch(talkBlock, /Restate where you are/)

const openingBlock = formatSectionContractBlock(talk, { firstTurn: true, openingPeel: true })
assert.match(openingBlock, /first assessment/)
assert.match(openingBlock, /Greet once/)
assert.doesNotMatch(openingBlock, /no Hi/)
assert.match(openingBlock, /Next up/)
assert.equal(
  formatSectionContractBlock(talk, { firstTurn: true }),
  formatEdgeContract(talk, { firstTurn: true }),
  'FE vs Edge first-turn rest line must be byte-identical',
)
assert.equal(
  formatSectionContractBlock(talk, { firstTurn: true, openingPeel: true }),
  formatEdgeContract(talk, { firstTurn: true, openingPeel: true }),
  'FE vs Edge opening rest line must be byte-identical',
)

const assist = buildAssistSectionContract({
  phaseId: 'ph.code',
  title: 'Two sum',
  kind: 'coding',
  bundleId: 'copilot',
  caps: { chat: true, spoilers: true, write: true },
})
assert.match(assist.identity, /Copilot/i)
const assistBlock = formatSectionContractBlock(assist)
assert.match(assistBlock, /kind=coding/)
assert.match(assistBlock, /MUST NOT/)
assert.doesNotMatch(assistBlock, /first turn/)

const assistant = buildAssistSectionContract({
  phaseId: 'ph.form',
  title: 'Eligibility',
  kind: 'form',
  bundleId: 'assistant',
  caps: { chat: true, spoilers: false, write: false },
})
assert.match(assistant.identity, /Assistant/i)
assert.match(assistant.mustNot.toLowerCase(), /hint|write|answer/)

console.log('ok — sectionContract')
