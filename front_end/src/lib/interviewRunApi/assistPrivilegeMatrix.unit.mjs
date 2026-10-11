/**
 * 4×3 Assist chrome + context + seed matrix on the comprehensive brief.
 * Run via npm run front_end:test:gate-mounts-assist
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  candidateAssistChrome,
  candidateAssistChromeFromBrief,
  withToolAssist,
} from '../interviewBrief/candidateAssistChrome.ts'
import { toolAssistPatchFromBundle } from '../interviewBrief/toolAssistBundles.ts'
import { buildStageAssistContext } from './buildStageAssistContext.ts'
import { buildGatePreamble } from './gatePreamble.ts'
import { resolveGateToolMount } from './resolveGateToolMount.ts'
import { sanitizeFormLiveComposition } from './sanitizeLiveComposition.ts'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(here, '../interviewBrief/fixtures/creator2ComprehensiveBrief.json'),
    'utf8',
  ),
)

const CELLS = [
  { phaseId: 'ph.eligible', kind: 'form' },
  { phaseId: 'ph.code', kind: 'coding' },
  { phaseId: 'ph.essay', kind: 'doc' },
]
const BUNDLES = ['none', 'assistant', 'coach', 'copilot']

assert.equal(candidateAssistChrome(null).openPeel, false)
assert.equal(candidateAssistChrome(null).label, 'Off')
assert.match(candidateAssistChrome(null).candidateNotice, /off|no helper/i)

{
  const nonePrep = buildGatePreamble({
    kindLabel: 'Form',
    timed: true,
    timeLabel: '5 min',
    index: 1,
    assist: {
      candidateNotice: candidateAssistChrome(null).candidateNotice,
      label: candidateAssistChrome(null).label,
    },
  })
  const assistRow = nonePrep.items.find((i) => i.id === 'assist')
  assert.ok(assistRow, 'Form preamble includes Assist row')
  assert.equal(assistRow.meta, 'Off')
  assert.ok(nonePrep.items.length <= 5)

  const asst = candidateAssistChrome(toolAssistPatchFromBundle('assistant'))
  const asstPrep = buildGatePreamble({
    kindLabel: 'Form',
    timed: false,
    timeLabel: '',
    index: 1,
    assist: { candidateNotice: asst.candidateNotice, label: asst.label },
  })
  const asstRow = asstPrep.items.find((i) => i.id === 'assist')
  assert.equal(asstRow?.meta, 'Assistant')
  assert.ok(/unclear|chat/i.test(asstRow?.label ?? ''))

  const talkPrep = buildGatePreamble({
    kindLabel: 'Conversation',
    timed: false,
    timeLabel: '',
    index: 1,
    assist: { candidateNotice: asst.candidateNotice, label: asst.label },
  })
  assert.equal(
    talkPrep.items.find((i) => i.id === 'assist'),
    undefined,
    'Talk preamble has no Assist row',
  )
}

for (const cell of CELLS) {
  for (const bundleId of BUNDLES) {
    const brief = withToolAssist(fixture, cell.phaseId, bundleId)
    const chrome = candidateAssistChromeFromBrief(brief, cell.phaseId)
    const label = `${cell.kind}×${bundleId}`
    assert.equal(chrome.bundleId, bundleId, `${label} bundle`)
    assert.equal(chrome.openPeel, bundleId !== 'none', `${label} peel`)
    assert.ok(chrome.candidateNotice.length > 8, `${label} notice`)
    assert.ok(!/[\u2014\u2013]/.test(chrome.candidateNotice), `${label} notice em dash`)
    assert.ok(!/\bdump\b/i.test(chrome.candidateNotice), `${label} notice dump`)
    assert.ok(!/helper chat|named slice/i.test(chrome.candidateNotice), `${label} notice jargon`)
    assert.ok(!/\b(I|I'm|I'll|me)\b/i.test(chrome.candidateNotice), `${label} notice is not first person`)
    if (bundleId === 'coach') {
      assert.match(chrome.candidateNotice, /hint/i, `${label} coach says hint`)
      assert.ok(!/part you name|named part/i.test(chrome.candidateNotice), `${label} no catalog leftover`)
    }
    if (bundleId === 'none') assert.equal(chrome.label, 'Off')
    if (bundleId === 'assistant') assert.equal(chrome.label, 'Assistant')
    if (bundleId === 'coach') assert.equal(chrome.label, 'Coach')
    if (bundleId === 'copilot') assert.equal(chrome.label, 'Copilot')
    assert.equal(chrome.caps.write, bundleId === 'copilot', `${label} write`)
    assert.equal(chrome.caps.chat, bundleId !== 'none', `${label} chat`)

    const ctx = buildStageAssistContext({
      briefId: 'brief.matrix',
      brief,
      phaseId: cell.phaseId,
      timed: false,
      limitMinutes: null,
    })
    assert.ok(ctx, `${label} context`)
    assert.equal(ctx.kind, cell.kind)
    assert.equal(ctx.privileges.bundleId, bundleId)
    const chatRegion = ctx.chromeMap.regions.some((r) => r.id === 'chat')
    assert.equal(chatRegion, bundleId !== 'none', `${label} chrome chat`)
    const blanketBan = ctx.guardrails.some((g) =>
      /^Never give answers, keys, solutions, or write the candidate response for them\.$/.test(g),
    )
    if (bundleId === 'copilot') {
      assert.equal(blanketBan, false, `${label} no blanket write ban`)
      // Copilot may write, so it needs the narrower rule instead: propose into the
      // sitting editor and wait for the candidate's Check. The candidate-facing verb is
      // Check/X (the Apply-card wording was retired); `editorApply` is internal and
      // must never reach a prompt.
      assert.ok(
        ctx.guardrails.some((g) => /\bCheck\b/.test(g) && /editor/i.test(g) && !/editorApply/i.test(g)),
        `${label} editor-write guardrail names Check`,
      )
      assert.ok(
        ctx.guardrails.every((g) => !/editorApply/i.test(g)),
        `${label} guardrails never leak editorApply`,
      )
    } else {
      assert.equal(blanketBan, true, `${label} explain-only ban`)
    }

    const mount = resolveGateToolMount({ brief, phaseId: cell.phaseId })
    assert.ok(mount && mount.kind === cell.kind, `${label} mount`)
    if (cell.kind === 'form' && mount.kind === 'form') {
      const seed = sanitizeFormLiveComposition(mount.document)
      assert.equal(seed.kind, 'form')
      assert.ok(
        !JSON.stringify(seed).includes('"answerKey"'),
        `${label} seed no answerKey`,
      )
    }
    if (cell.kind === 'coding') {
      assert.ok(
        typeof ctx.document.readmeMarkdown === 'string',
        `${label} README in document`,
      )
    }
    if (cell.kind === 'doc') {
      assert.equal(typeof ctx.document.seedBody, 'string', `${label} seed body`)
    }
  }
}

console.log('assistPrivilegeMatrix.unit: ok')
