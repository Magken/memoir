/**
 * Section-chrome insert profile: filter banned ids only — never reorder survivors.
 * Run: npx tsx front_end/src/lib/docEditor/insertRegistry.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DOC_EDITOR_ASSESSMENT_INSERT_EXCLUDE,
  filterAssessmentInsertItems,
  isDocEditorAssessmentInsertExcluded,
} from './insertAssessment.ts'

const catalog = [
  { id: 'horizontal-rule' },
  { id: 'page-break' },
  { id: 'image' },
  { id: 'gif' },
  { id: 'table' },
  { id: 'poll' },
  { id: 'columns' },
  { id: 'equation' },
  { id: 'sticky-note' },
  { id: 'code' },
  { id: 'collapsible' },
  { id: 'date' },
  { id: 'video' },
  { id: 'youtube' },
]

const bannedMenu = ['image', 'gif', 'video', 'youtube']
for (const id of bannedMenu) {
  assert.ok(DOC_EDITOR_ASSESSMENT_INSERT_EXCLUDE.has(id), `${id} is in the assessment exclude set`)
}
assert.ok(DOC_EDITOR_ASSESSMENT_INSERT_EXCLUDE.has('page-break'), 'page-break is excluded on section chrome')

const survivors = filterAssessmentInsertItems(catalog)
assert.deepEqual(
  survivors.map((item) => item.id),
  catalog.filter((item) => !DOC_EDITOR_ASSESSMENT_INSERT_EXCLUDE.has(item.id)).map((item) => item.id),
  'filter must not reorder remaining insert ids',
)
assert.equal(
  survivors.some((item) => bannedMenu.includes(item.id) || item.id === 'page-break'),
  false,
)
assert.ok(survivors.some((item) => item.id === 'poll'))
assert.ok(survivors.some((item) => item.id === 'columns'))
assert.ok(survivors.some((item) => item.id === 'equation'))
assert.equal(isDocEditorAssessmentInsertExcluded('columns:2-equal'), false)
assert.equal(isDocEditorAssessmentInsertExcluded('image'), true)

const registry = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'insertRegistry.ts'), 'utf8')
assert.match(registry, /isDocEditorAssessmentInsertExcluded\(item\.id\)/, 'toolbar menu filters via the shared helper')
assert.match(registry, /DOC_EDITOR_INSERT_ITEMS/, 'catalog order lives in insertRegistry')

console.log('ok — insertRegistry assessment exclude')
