/**
 * Tool assist presets / coerce.
 * Run: npx tsx front_end/src/lib/interviewBrief/toolAssistBundles.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  matchToolAssistBundle,
  resolveToolAssistCaps,
  stampStructureCopilotAssist,
  STRUCTURE_ASSIST_TOOL_TYPES,
  toolAssistForStore,
  toolAssistInterviewerPayload,
  toolAssistPatchFromBundle,
  toolAssistSummaryLine,
} from './toolAssistBundles.ts'
import {
  TOOL_ASSIST_CAP_ORDER,
  TOOL_ASSIST_EDITOR_CATALOG,
  toolAssistCapRows,
} from './toolAssistCatalog.ts'
import catalog from './toolAssistCatalog.json' with { type: 'json' }
import spine from './fixtures/creator2SpineCatalogue.json' with { type: 'json' }

assert.deepEqual(resolveToolAssistCaps(undefined), {
  chat: false,
  spoilers: false,
  write: false,
})
assert.equal(matchToolAssistBundle(resolveToolAssistCaps(undefined)), 'none')

assert.deepEqual(toolAssistPatchFromBundle('assistant'), {
  chat: true,
  spoilers: false,
  write: false,
})
assert.equal(matchToolAssistBundle(toolAssistPatchFromBundle('assistant')), 'assistant')
assert.equal(
  toolAssistSummaryLine(toolAssistPatchFromBundle('assistant')),
  'Assist · Assistant',
)
assert.deepEqual(toolAssistPatchFromBundle('coach'), {
  chat: true,
  spoilers: true,
  write: false,
})
assert.equal(matchToolAssistBundle(toolAssistPatchFromBundle('coach')), 'coach')
assert.equal(matchToolAssistBundle(toolAssistPatchFromBundle('copilot')), 'copilot')

{
  const implied = resolveToolAssistCaps({ write: true, chat: false, spoilers: false })
  assert.equal(implied.chat, true)
  assert.equal(implied.write, true)
  assert.equal(matchToolAssistBundle(implied), 'custom')
}

assert.equal(toolAssistSummaryLine(toolAssistPatchFromBundle('none')), 'Assist off')
assert.equal(toolAssistSummaryLine(toolAssistPatchFromBundle('coach')), 'Assist · Coach')
assert.equal(toolAssistForStore(undefined), undefined)
assert.deepEqual(toolAssistForStore(toolAssistPatchFromBundle('coach')), {
  chat: true,
  spoilers: true,
  write: false,
})

for (const kind of ['form', 'coding', 'doc']) {
  const rows = toolAssistCapRows(kind)
  assert.deepEqual(
    rows.map((r) => r.id),
    [...TOOL_ASSIST_CAP_ORDER],
    `${kind} must define every cap`,
  )
  assert.ok(TOOL_ASSIST_EDITOR_CATALOG[kind].caps.write.does.length > 8)
}
assert.equal('talk' in TOOL_ASSIST_EDITOR_CATALOG, false)

assert.equal(catalog.bundles[0].ordinal, 0)
assert.equal(catalog.bundles[0].id, 'none')
assert.deepEqual(toolAssistInterviewerPayload(undefined), {
  bundleId: 'none',
  caps: { chat: false, spoilers: false, write: false },
})
assert.equal(toolAssistInterviewerPayload(toolAssistPatchFromBundle('copilot')).bundleId, 'copilot')

{
  const assist = spine.capabilities.find((c) => c.id === 'assist')
  assert.ok(assist)
  assert.equal(assist.cells.Form, 'yes')
  assert.equal(assist.cells.Coding, 'yes')
  assert.equal(assist.cells.Writing, 'yes')
  assert.equal(assist.cells.Conversation, 'no', 'negative: Conversation Assist cell is no')
  assert.deepEqual(
    [...STRUCTURE_ASSIST_TOOL_TYPES].sort(),
    ['coding', 'doc', 'form_quiz'],
    'stamp kinds must match spine Assist=yes (Form/Coding/Writing)',
  )
}

{
  const stamped = stampStructureCopilotAssist({
    tools: {
      'tool.form': { type: 'form_quiz' },
      'tool.coding': { type: 'coding' },
      'tool.doc': { type: 'doc' },
      'tool.skip': { type: 'talk' },
    },
  })
  const copilot = toolAssistPatchFromBundle('copilot')
  assert.deepEqual(stamped.tools['tool.form']?.assist, copilot)
  assert.deepEqual(stamped.tools['tool.coding']?.assist, copilot)
  assert.deepEqual(stamped.tools['tool.doc']?.assist, copilot)
  assert.equal(stamped.tools['tool.skip']?.assist, undefined, 'negative: Talk has no Assist peel')
}

for (const b of catalog.bundles) {
  assert.ok(typeof b.candidateNotice === 'string' && b.candidateNotice.length > 12, `${b.id}: candidateNotice`)
  assert.ok(b.candidateNotice.includes('.'), `${b.id}: candidateNotice is a sentence`)
}

console.log('toolAssistBundles.unit.mjs: ok')
