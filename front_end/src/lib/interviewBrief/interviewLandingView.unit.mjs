/**
 * Landing extras from live brief metadata + persona fallback.
 * Run: npx tsx front_end/src/lib/interviewBrief/interviewLandingView.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildInterviewLandingView,
  coverNodeIdFromBriefMetadata,
  creatorNameFromBriefMetadata,
  humanAccountLabel,
  isEmailLabel,
  ownerLabelFromBriefMetadata,
} from './interviewLandingView.ts'
import { coerceStoredBriefBody, creator2FromStoredBriefBody } from './compose.ts'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(here, 'fixtures/staffSecurityEngineer80mHardenedLoop.json'), 'utf8'),
)

assert.equal(coverNodeIdFromBriefMetadata({ coverNodeId: ' node-1 ' }), 'node-1')
assert.equal(coverNodeIdFromBriefMetadata({ cover_node_id: 'node-2' }), 'node-2')
assert.equal(coverNodeIdFromBriefMetadata({}), null)

assert.equal(ownerLabelFromBriefMetadata({ accountUsername: ' acme_labs ' }), 'acme_labs')
assert.equal(ownerLabelFromBriefMetadata({ username: 'northwind' }), 'northwind')
assert.equal(ownerLabelFromBriefMetadata({ accountName: 'Acme Labs' }), null)
assert.equal(creatorNameFromBriefMetadata({ createdByName: 'Ada Lovelace' }), 'Ada Lovelace')

assert.equal(isEmailLabel('owner@agency.test'), true)
assert.equal(humanAccountLabel('owner@agency.test'), '')
assert.equal(humanAccountLabel('Acme Labs'), 'Acme Labs')

const parsed = creator2FromStoredBriefBody(coerceStoredBriefBody(JSON.stringify(fixture)))
assert.ok(parsed, 'string JSON body coerces + parses as Creator-2')

const withPersona = buildInterviewLandingView(parsed, {
  ownerLabel: 'Acme Labs',
  interviewerName: 'Should not win',
  coverUrl: 'https://example.test/cover.jpg',
})
assert.equal(withPersona.ownerLabel, 'Acme Labs')
assert.equal(withPersona.coverUrl, 'https://example.test/cover.jpg')
assert.equal(withPersona.coverNodeId, null)
assert.ok(!withPersona.description.includes('…'), 'overview description is not truncated')
assert.notEqual(withPersona.interviewerName, 'Should not win')

const noPersona = structuredClone(parsed)
if (noPersona.definition?.persona) noPersona.definition.persona.name = ''
const creatorFallback = buildInterviewLandingView(noPersona, {
  ownerLabel: 'Acme Labs',
  interviewerName: 'Ada Lovelace',
  coverNodeId: 'node-cover',
})
assert.equal(creatorFallback.interviewerName, 'Ada Lovelace')
assert.equal(creatorFallback.ownerLabel, 'Acme Labs')
assert.equal(creatorFallback.coverNodeId, 'node-cover')

const emailOwner = buildInterviewLandingView(noPersona, {
  ownerLabel: 'owner@agency.test',
  interviewerName: 'creator@agency.test',
})
assert.equal(emailOwner.ownerLabel, '')
assert.equal(emailOwner.interviewerName, null)

console.log('interviewLandingView.unit.mjs: ok')
