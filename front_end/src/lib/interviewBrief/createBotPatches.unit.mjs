/**
 * Pure unit checks for interview create-bot flow patches.
 * Run: npx tsx front_end/src/lib/interviewBrief/createBotPatches.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  applyCreateBotAction,
  buildBriefContextSnapshot,
  CHAT_TO_EDITOR_ACTION_MAP,
  CREATE_BOT_ACTION_KEYS,
} from './createBotPatches.ts'

const blank = { nodes: [], edges: [], groups: [] }

{
  const result = applyCreateBotAction(blank, 'interview.create.seed_starter')
  assert.equal(result.ok, true, 'seed_starter should succeed')
  if (!result.ok) throw new Error(result.error)
  const metas = result.flow.nodes.filter((n) => n.kind === 'interview.meta')
  const phases = result.flow.nodes.filter(
    (n) => n.kind === 'interview.phase.discussion' || n.kind === 'interview.phase.tool',
  )
  assert.equal(metas.length, 1, 'seed_starter should include one meta node')
  assert.ok(phases.length >= 3, 'seed_starter should include opening/tool/closing phases')
  const snap = buildBriefContextSnapshot(result.flow)
  assert.ok(snap.coverage.hasMeta)
  assert.ok(snap.coverage.phaseCount >= 3)
}

{
  const seeded = applyCreateBotAction(blank, 'interview.create.seed_starter', {
    meta: { title: 'Staff screen', roleTitle: 'Staff eng', proposedMinutes: '60' },
  })
  assert.equal(seeded.ok, true)
  if (!seeded.ok) throw new Error(seeded.error)
  const meta = seeded.flow.nodes.find((n) => n.kind === 'interview.meta')
  assert.equal(meta?.config?.title, 'Staff screen')
  assert.equal(meta?.config?.roleTitle, 'Staff eng')
  assert.equal(meta?.config?.proposedMinutes, 60)
  assert.equal(meta?.config?.estimatedMinutes, 35)
}

{
  for (const key of CREATE_BOT_ACTION_KEYS) {
    assert.ok(CHAT_TO_EDITOR_ACTION_MAP[key]?.startsWith('flow.action.'), key)
  }
  const viaEditor = applyCreateBotAction(blank, CHAT_TO_EDITOR_ACTION_MAP['interview.create.seed_starter'])
  assert.equal(viaEditor.ok, true, 'editor action id should resolve')
}

console.log('createBotPatches.unit.mjs OK')
