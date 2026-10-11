/**
 * Catalog shelf titles — ignore stored `title: id` from addFromCatalog.
 * Run: npx tsx front_end/src/lib/interviewBrief/analysisLabels.unit.mjs
 */
import assert from 'node:assert/strict'
import { labelTemplate, resolveTemplateCardMeta, TEMPLATE_DETAILS } from './analysisLabels.ts'
import catalog from './analysisTemplateCatalog.json' with { type: 'json' }

assert.equal(labelTemplate('iv.content.v1'), 'Substance vs the topic')
assert.equal(
  labelTemplate('iv.content.v1', { title: 'iv.content.v1' }),
  'Substance vs the topic',
)
assert.equal(
  labelTemplate('iv.content.v1', { title: 'My renamed content card' }),
  'My renamed content card',
)

const fromRawId = resolveTemplateCardMeta('iv.delivery.v1', {
  title: 'iv.delivery.v1',
  details: '',
  outputKind: 'dimensions',
})
assert.equal(fromRawId.title, 'How they speak (clarity, composure)')
assert.match(fromRawId.details, /clarity/i)

const customKept = resolveTemplateCardMeta('custom.oncall-ownership', {
  title: 'On-call ownership stress',
  details: 'Score incident ownership.',
  outputKind: 'dimensions',
})
assert.equal(customKept.title, 'On-call ownership stress')

for (const [id, text] of Object.entries(TEMPLATE_DETAILS)) {
  assert.equal(/[\u2014\u2013]/.test(text), false, `${id} details must not use em dashes`)
}
for (const [id, entry] of Object.entries(catalog.templates ?? catalog)) {
  const summary = entry && typeof entry === 'object' ? entry.summary : null
  if (typeof summary === 'string') {
    assert.equal(/[\u2014\u2013]/.test(summary), false, `${id} catalog summary must not use em dashes`)
    assert.equal(/session time buckets|sitting day/i.test(summary), false, `${id} catalog summary jargon`)
  }
}

console.log('analysisLabels.unit.mjs ok')
