/**
 * Template shape parse/serialize — optionNotes, evidenceModel, polarity.
 * Run: npx tsx front_end/src/lib/interviewBrief/analysisTemplateShape.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  parseTemplateShapeFields,
  resolveTemplateShape,
  serializeTemplateShape,
  sanitizeAxisPolarity,
} from './analysisTemplateShape.ts'

{
  const parsed = parseTemplateShapeFields('custom.impact', {
    outputKind: 'dimensions',
    dimensions: [
      {
        key: 'impact',
        label: 'Impact',
        bands: [
          { id: 'absent', label: 'absent', descriptor: 'Not shown in the answer.' },
          { id: 'emerging', label: 'emerging', descriptor: 'One named instance.' },
          { id: 'consistent', label: 'consistent', descriptor: 'Several named instances.' },
        ],
      },
    ],
  })
  const dim = parsed.dimensions[0]
  assert.deepEqual(dim.options, ['absent', 'emerging', 'consistent'])
  assert.equal(dim.optionNotes?.[0], 'Not shown in the answer.')
  assert.equal(dim.optionNotes?.[2], 'Several named instances.')
  const round = serializeTemplateShape(parsed, 'custom.impact')
  assert.equal(round.dimensions[0].optionNotes?.[1], 'One named instance.')
}

{
  const parsed = parseTemplateShapeFields('custom.blame', {
    outputKind: 'dimensions',
    dimensions: [
      {
        key: 'blameShift',
        label: 'Blame shift',
        options: ['low', 'med', 'high'],
        evidenceModel: 'accumulative',
        polarity: 'negative',
      },
    ],
  })
  assert.equal(parsed.dimensions[0].polarity, 'negative')
  assert.equal(parsed.dimensions[0].evidenceModel, 'accumulative')
}

{
  const parsed = parseTemplateShapeFields('custom.clarity', {
    outputKind: 'dimensions',
    dimensions: [
      {
        key: 'clarity',
        label: 'Clarity',
        options: ['weak', 'mixed', 'strong'],
        evidenceModel: 'manner',
        polarity: 'negative',
      },
    ],
  })
  assert.equal(parsed.dimensions[0].evidenceModel, 'manner')
  assert.equal(parsed.dimensions[0].polarity, 'positive', 'negative polarity rejected on manner')
}

{
  const catalog = resolveTemplateShape('iv.delivery.v1', {})
  assert.ok(catalog.dimensions.length >= 3)
  const emptyOverride = resolveTemplateShape('iv.delivery.v1', { dimensions: [] })
  assert.equal(
    emptyOverride.dimensions.length,
    catalog.dimensions.length,
    'empty override must not wipe catalog axes',
  )
}

{
  const bare = parseTemplateShapeFields('custom.old', {
    outputKind: 'dimensions',
    dimensions: [{ key: 'impact', label: 'Impact', options: ['weak', 'mixed', 'strong'] }],
  })
  assert.equal(bare.dimensions[0].evidenceModel, undefined)
  assert.equal(bare.dimensions[0].optionNotes, undefined)
}

assert.equal(sanitizeAxisPolarity('manner', 'negative'), 'positive')
assert.equal(sanitizeAxisPolarity('accumulative', 'negative'), 'negative')

console.log('analysisTemplateShape.unit.mjs ok')
