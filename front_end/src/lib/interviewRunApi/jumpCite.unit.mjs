/**
 * Jump cite helper.
 * Run: npx tsx front_end/src/lib/interviewRunApi/jumpCite.unit.mjs
 */
import assert from 'node:assert/strict'
import { cardHasJump, firstJumpCite, jumpFromCard, sectionIdForCitedUtterance } from './jumpCite.ts'

const cite = firstJumpCite([
  { kind: 'file', ref: 'src/solve.ts', t: 12, end: 18, quote: 'const map' },
])
assert.equal(cite?.kind, 'file')
assert.equal(cite?.t, 12)
assert.equal(cite?.end, 18)

assert.equal(firstJumpCite([{ kind: 'tape_stat', ref: 'paste' }]), null)

const tape = firstJumpCite([{ kind: 'tape_action', ref: 'b2', t: 20000 }])
assert.equal(tape?.kind, 'tape_action')
assert.equal(tape?.t, 20000)

const tapeTOnly = firstJumpCite([{ kind: 'tape_action', ref: '', t: 400 }])
assert.equal(tapeTOnly?.kind, 'tape_action')
assert.equal(tapeTOnly?.t, 400)

assert.ok(
  cardHasJump({
    id: 'x',
    kind: 'general',
    anchorMessageId: '',
    messageIds: [],
    title: 't',
    lane: 'general',
    emphasized: false,
    dimensions: [],
    evidence: [],
    evidenceRefs: [{ kind: 'question', ref: 'q1' }],
  }),
)
assert.ok(
  cardHasJump({
    id: 'p',
    kind: 'general',
    anchorMessageId: '',
    messageIds: [],
    title: 'process',
    lane: 'general',
    emphasized: false,
    dimensions: [],
    evidence: [],
    evidenceRefs: [{ kind: 'tape_action', ref: 'run', t: 900 }],
  }),
)

const seeks = []
const files = []
jumpFromCard(
  {
    id: 'both',
    kind: 'general',
    anchorMessageId: '',
    messageIds: [],
    title: 't',
    lane: 'general',
    emphasized: false,
    dimensions: [],
    evidence: [],
    evidenceRefs: [
      { kind: 'tape_action', ref: 'b1', t: 1400 },
      { kind: 'file', ref: 'src/solve.ts', t: 3, end: 8 },
    ],
  },
  {
    seekTape: (t) => seeks.push(t),
    revealFileRange: (path, start, end) => files.push({ path, start, end }),
  },
)
assert.deepEqual(seeks, [1400])
assert.deepEqual(files, [{ path: 'src/solve.ts', start: 3, end: 8 }])

const caseCite = firstJumpCite([{ kind: 'case', ref: 'ph.code' }])
assert.equal(caseCite?.kind, 'case')
assert.equal(caseCite?.ref, 'ph.code')
const jumped = []
jumpFromCard(
  {
    id: 'case',
    kind: 'general',
    anchorMessageId: '',
    messageIds: [],
    title: 't',
    lane: 'general',
    emphasized: false,
    dimensions: [],
    evidence: [],
    evidenceRefs: [{ kind: 'case', ref: 'ph.warmup' }],
  },
  { jumpToSection: (id) => jumped.push(id) },
)
assert.deepEqual(jumped, ['ph.warmup'])

{
  assert.equal(
    sectionIdForCitedUtterance('msg.owned', {
      messages: [{ id: 'msg.owned', phaseId: 'ph.talk' }],
    }),
    'ph.talk',
  )
  assert.equal(
    sectionIdForCitedUtterance('msg.owned', {
      cards: [{ anchorMessageId: 'msg.owned', messageIds: ['msg.owned'], phaseId: 'ph.code' }],
    }),
    'ph.code',
  )
  assert.equal(
    sectionIdForCitedUtterance('msg.owned', { fallbackSectionId: 'ph.talk' }),
    'ph.talk',
  )
  assert.equal(
    sectionIdForCitedUtterance('msg.missing', {
      messages: [{ id: 'msg.owned', phaseId: 'ph.talk' }],
    }),
    null,
    'negative: an unknown cite must not invent a section',
  )
}

console.log('jumpCite: ok')
