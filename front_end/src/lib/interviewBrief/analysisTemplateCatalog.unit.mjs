/**
 * Catalog sectionTypes / conflictsWith helpers.
 * Run: npx tsx front_end/src/lib/interviewBrief/analysisTemplateCatalog.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  attachOverlapWarnings,
  attachableTemplateIds,
  conflictingTemplateIds,
  catalogSchedulesAfterTurn,
  isCreatorAnalysisLibraryTemplateId,
  resolveTalkSectionTypes,
  templateAfterTurnEligible,
  templateAllowsAfterTurn,
  templatesConflict,
} from './analysisTemplateCatalog.ts'

assert.equal(templatesConflict('iv.content.v1', 'iv.star.v1'), true)
assert.equal(templatesConflict('iv.content.v1', 'iv.ownership.v1'), true)
assert.equal(templatesConflict('iv.star.v1', 'iv.ownership.v1'), false)
assert.equal(templatesConflict('iv.delivery.v1', 'iv.content.v1'), false)

assert.deepEqual(resolveTalkSectionTypes({ isOpening: true }), ['discussion.opening'])
assert.deepEqual(resolveTalkSectionTypes({ isClosing: true }), ['discussion.closing'])
assert.ok(resolveTalkSectionTypes({}).includes('discussion.deep'))

const deepAttachable = attachableTemplateIds({
  host: 'discussion',
  attached: [],
  sectionTypes: resolveTalkSectionTypes({}),
})
assert.ok(deepAttachable.includes('iv.content.v1'))
assert.ok(deepAttachable.includes('iv.ownership.v1'))
assert.ok(!deepAttachable.includes('iv.question.v1'))
assert.ok(!deepAttachable.includes('mark.form.key.v1'))
assert.ok(isCreatorAnalysisLibraryTemplateId('iv.delivery.v1'))
assert.ok(isCreatorAnalysisLibraryTemplateId('synth.topic.v1'))
assert.ok(isCreatorAnalysisLibraryTemplateId('custom.foo'))
assert.ok(!isCreatorAnalysisLibraryTemplateId('mark.form.key.v1'))
assert.ok(!isCreatorAnalysisLibraryTemplateId('synth.tool.v1'))
assert.ok(!isCreatorAnalysisLibraryTemplateId('mark.code.tests.v1'))
assert.ok(!isCreatorAnalysisLibraryTemplateId('mark.code.structure.v1'))
assert.ok(!isCreatorAnalysisLibraryTemplateId('mark.form.reasoning.v1'))
assert.ok(!isCreatorAnalysisLibraryTemplateId('sig.security.v1'))
assert.ok(!isCreatorAnalysisLibraryTemplateId('sig.clarity.v1'))

const withContent = attachableTemplateIds({
  host: 'discussion',
  attached: ['iv.content.v1'],
  sectionTypes: resolveTalkSectionTypes({}),
})
assert.ok(!withContent.includes('iv.star.v1'))
assert.ok(!withContent.includes('iv.ownership.v1'))
assert.ok(withContent.includes('iv.delivery.v1'))

const blocked = conflictingTemplateIds(['iv.content.v1'])
assert.ok(blocked.has('iv.star.v1'))
assert.ok(blocked.has('iv.ownership.v1'))

const closing = attachableTemplateIds({
  host: 'discussion',
  attached: [],
  sectionTypes: resolveTalkSectionTypes({ isClosing: true }),
})
assert.ok(closing.includes('iv.question.v1'))
assert.ok(!closing.includes('iv.content.v1'))

assert.equal(attachOverlapWarnings(['iv.content.v1', 'iv.star.v1']).length, 1)
assert.equal(attachOverlapWarnings(['iv.delivery.v1', 'synth.topic.v1']).length, 0)

assert.equal(templateAfterTurnEligible('iv.delivery.v1'), 'answer')
assert.equal(templateAfterTurnEligible('iv.question.v1'), 'clarify')
assert.equal(catalogSchedulesAfterTurn('iv.delivery.v1'), true)
assert.equal(catalogSchedulesAfterTurn('iv.question.v1'), true)
assert.equal(catalogSchedulesAfterTurn('iv.ownership.v1'), false)
assert.equal(catalogSchedulesAfterTurn('iv.content.v1'), false)
assert.equal(catalogSchedulesAfterTurn('mark.assist.use.v1'), false)
assert.equal(templateAllowsAfterTurn('iv.delivery.v1', 'answer'), true)
assert.equal(templateAllowsAfterTurn('iv.delivery.v1', 'clarify'), false)
assert.equal(templateAllowsAfterTurn('iv.question.v1', 'clarify'), true)
assert.equal(templateAllowsAfterTurn('iv.question.v1', 'answer'), false)

// Shelf custom.* appears when libraryIds includes it (edit Templates → Talk attach)
const withShelfCustom = attachableTemplateIds({
  host: 'discussion',
  attached: [],
  sectionTypes: resolveTalkSectionTypes({}),
  libraryIds: ['iv.delivery.v1', 'custom.life-stress'],
})
assert.ok(withShelfCustom.includes('custom.life-stress'), 'shelf custom attachable')
assert.ok(withShelfCustom.includes('iv.delivery.v1'))
assert.ok(!withShelfCustom.includes('iv.content.v1'), 'catalog not on shelf filtered out')

console.log('analysisTemplateCatalog.unit: ok')
