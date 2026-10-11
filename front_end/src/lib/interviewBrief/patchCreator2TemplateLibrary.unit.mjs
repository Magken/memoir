import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mapCreator2BriefToTimeline } from './mapCreator2BriefToTimeline.ts'
import {
  deleteCreator2Template,
  patchCreator2TemplateLibrary,
} from './patchCreator2TemplateLibrary.ts'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(here, 'fixtures/creator2ComprehensiveBrief.json'), 'utf8'),
)

{
  const mapped = mapCreator2BriefToTimeline(structuredClone(fixture))
  const shelf = mapped.analysisShelf
  assert.ok(shelf, 'analysis shelf present')
  assert.ok(shelf.libraryIds.length > 0, 'library seeded from attached templates')
  for (const id of shelf.libraryIds) {
    assert.ok(shelf.templateMeta[id]?.title, `meta for ${id}`)
    assert.ok(shelf.templateMeta[id]?.outputKind, `outputKind for ${id}`)
    assert.ok(shelf.templateMeta[id]?.storageKey, `storageKey for ${id}`)
    assert.ok(
      id.startsWith('custom.') || id.startsWith('iv.') || id.startsWith('synth.topic'),
      `library is discussion analysis only, got ${id}`,
    )
    assert.ok(!id.startsWith('mark.'), `assessment mark.* must not enter Templates library: ${id}`)
  }
  const delivery = shelf.templateMeta['iv.delivery.v1']
  if (delivery) {
    assert.equal(delivery.outputKind, 'dimensions')
    assert.ok(delivery.dimensions.length >= 3, 'delivery axes from catalog JSON')
    assert.equal(delivery.dimensions[0]?.key, 'clarity')
  }
}

{
  const doc = structuredClone(fixture)
  const before = mapCreator2BriefToTimeline(doc)
  const victim = before.analysisShelf.libraryIds.find((id) =>
    before.steps.some((s) => s.talkEditor?.templateIds.includes(id)),
  )
  assert.ok(victim, 'pick an attached template')

  const deleted = deleteCreator2Template(doc, victim, {
    libraryIds: before.analysisShelf.libraryIds,
    templateMeta: before.analysisShelf.templateMeta,
  }).doc

  const after = mapCreator2BriefToTimeline(deleted)
  assert.equal(after.analysisShelf.libraryIds.includes(victim), false)
  assert.equal(after.analysisShelf.templateMeta[victim], undefined)
  for (const step of after.steps) {
    assert.equal(
      step.talkEditor?.templateIds.includes(victim) ?? false,
      false,
      `scrubbed from ${step.id}`,
    )
  }
}

{
  const doc = structuredClone(fixture)
  const before = mapCreator2BriefToTimeline(doc)
  const id = before.analysisShelf.libraryIds[0]
  assert.ok(id)
  const nextMeta = {
    ...before.analysisShelf.templateMeta,
    [id]: {
      ...before.analysisShelf.templateMeta[id],
      title: 'Renamed template title',
      outputKind: 'taxonomy',
      taxonomy: ['curious', 'driven'],
      maxPerTurn: 2,
      dimensions: [],
      enumValues: [],
    },
  }
  const patched = patchCreator2TemplateLibrary(doc, {
    libraryIds: before.analysisShelf.libraryIds,
    templateMeta: nextMeta,
  }).doc
  const after = mapCreator2BriefToTimeline(patched)
  assert.equal(after.analysisShelf.templateMeta[id].title, 'Renamed template title')
  assert.equal(after.analysisShelf.templateMeta[id].outputKind, 'taxonomy')
  assert.deepEqual(after.analysisShelf.templateMeta[id].taxonomy, ['curious', 'driven'])
  assert.equal(after.analysisShelf.templateMeta[id].maxPerTurn, 2)
  assert.ok(
    after.analysisShelf.templateMeta[id].storageKey,
    'storage key stays derived internally',
  )
}

console.log('patchCreator2TemplateLibrary.unit.mjs: ok')
