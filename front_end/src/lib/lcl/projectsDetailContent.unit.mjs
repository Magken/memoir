/**
 * Projects detail content — nested depth + lookup.
 * Run: node front_end/src/lib/lcl/projectsDetailContent.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  PROJECTS_DETAIL_DOCS,
  projectsDetailById,
  projectsDetailSectionByLabel,
  projectsDetailStub,
} from './projectsDetailContent.ts'

assert.ok(PROJECTS_DETAIL_DOCS.length >= 3, 'at least three deep fixtures')

const gras = projectsDetailById('gras-to-text')
assert.ok(gras)
assert.equal(gras.name, 'gras_to_text')
assert.ok(gras.pillars.some((p) => p.label === 'Overview'))
assert.ok(gras.pillars.some((p) => p.label === 'Pipeline'))
const pipeline = projectsDetailSectionByLabel(gras, 'Pipeline')
assert.ok(pipeline?.subsections?.some((s) => s.label === 'Blind batch'))
const readings = projectsDetailSectionByLabel(gras, 'Readings')
assert.ok(readings, 'Overview prose-links into Readings')

const cage = projectsDetailById('wire-cage')
assert.ok(projectsDetailSectionByLabel(cage, 'Tuning'))

const lcl = projectsDetailById('lcl-layout')
assert.ok(projectsDetailSectionByLabel(lcl, 'Nest rows'))

assert.equal(projectsDetailById('missing-id'), undefined, 'unknown id returns undefined')
const stub = projectsDetailStub('scene-player', 'Scene player', 'One canvas boom-arc.')
assert.equal(stub.pillars[0]?.label, 'Notes')
assert.doesNotMatch(JSON.stringify(PROJECTS_DETAIL_DOCS), /\u2014|\u2013/, 'negative: no em/en dashes')

console.log('projectsDetailContent: ok')
