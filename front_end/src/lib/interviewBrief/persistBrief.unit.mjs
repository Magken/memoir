/**
 * Check Suite shorts persist on brief metadata and surface on the manage list.
 * Run: npx tsx front_end/src/lib/interviewBrief/persistBrief.unit.mjs
 */
import assert from 'node:assert/strict'
import { emptyComposeMeta, emptyCreator2BriefDocument } from './compose.ts'
import { listedCheckWarningShorts, listItemFromBrief } from './managerFixtures.ts'
import { composeBriefMetadata } from './persistBrief.ts'
import {
  checkSuiteWarningShorts,
  collectCheckSuite,
  stampCheckWarningShortsOnMetadata,
} from '../../../../back_end/supabase/functions/interview-brief-edit/checkSuite.ts'

{
  const gappy = emptyCreator2BriefDocument(emptyComposeMeta())
  const meta = composeBriefMetadata(emptyComposeMeta(), null, { creator2: gappy })
  const shorts = Array.isArray(meta.checkWarningShorts) ? meta.checkWarningShorts.map(String) : []
  assert.ok(shorts.length > 0, 'empty board snapshot is nonempty')
  assert.ok(shorts.includes('No interview sections'), 'empty spine short is persisted')
}

{
  const meta = composeBriefMetadata(emptyComposeMeta(), null, { creator2: null })
  assert.deepEqual(meta.checkWarningShorts, [], 'no creator2 → empty shorts, not omitted')
}

{
  const described = emptyCreator2BriefDocument(emptyComposeMeta())
  described.definition.meta.roleDescription = 'Hire a backend owner who can ship APIs.'
  const stamped = composeBriefMetadata(emptyComposeMeta(), null, { creator2: described })
  assert.equal(stamped.roleDescription, 'Hire a backend owner who can ship APIs.')
  const listed = listItemFromBrief(
    {
      id: 'b-desc',
      accountId: 'a1',
      briefNodeId: 'n1',
      title: 'Loop',
      status: 'draft',
      metadata: stamped,
    },
    {},
  )
  assert.equal(listed.description, 'Hire a backend owner who can ship APIs.')
  const blank = listItemFromBrief(
    {
      id: 'b-empty',
      accountId: 'a1',
      briefNodeId: 'n1',
      title: 'Loop',
      status: 'draft',
      metadata: {},
    },
    {},
  )
  assert.equal(blank.description, undefined, 'negative: no description when metadata is empty')
}

{
  const row = listItemFromBrief(
    {
      id: 'b1',
      accountId: 'a1',
      briefNodeId: 'n1',
      title: 'Loop',
      status: 'draft',
      metadata: { checkWarningShorts: ['No Decision folders', 'Conversation has no analysis'] },
    },
    {},
  )
  assert.deepEqual(row.checkWarningShorts, ['No Decision folders', 'Conversation has no analysis'])
  const clear = listItemFromBrief(
    {
      id: 'b2',
      accountId: 'a1',
      briefNodeId: 'n1',
      title: 'Loop',
      status: 'draft',
      metadata: { checkWarningShorts: [] },
    },
    {},
  )
  assert.deepEqual(clear.checkWarningShorts, [], 'empty snapshot clears the row')
}

{
  assert.equal(listedCheckWarningShorts(undefined), null, 'no metadata → scan the body')
  assert.equal(listedCheckWarningShorts({}), null, 'missing key is not takeable-by-omission')
  assert.equal(listedCheckWarningShorts({ roleTitle: 'Loop' }), null)
  assert.deepEqual(listedCheckWarningShorts({ checkWarningShorts: [] }), [])
  assert.deepEqual(listedCheckWarningShorts({ checkWarningShorts: ['No Decision folders'] }), [
    'No Decision folders',
  ])
}

{
  const leftover = ['Stale empty-board pile']
  const gappy = emptyCreator2BriefDocument(emptyComposeMeta())
  const live = checkSuiteWarningShorts(collectCheckSuite(gappy))
  assert.ok(live.length > 0, 'empty board still has live shorts')
  const spread = { checkWarningShorts: leftover, editRun: { id: 'gen' } }
  assert.deepEqual(
    listedCheckWarningShorts(spread),
    leftover,
    'negative: metadata spread / hydrate keeps leftover shorts',
  )
  const stamped = stampCheckWarningShortsOnMetadata(spread, gappy)
  assert.deepEqual(
    listedCheckWarningShorts(stamped),
    live,
    'stamp replaces leftover shorts with a live scan before hydrate',
  )
  assert.ok(
    !(listedCheckWarningShorts(stamped) ?? []).includes('Stale empty-board pile'),
    'stale tag does not survive a restamp',
  )
  assert.equal(stamped.editRun?.id, 'gen', 'sibling metadata keys stay')
}

console.log('persistBrief.unit.mjs: ok')
