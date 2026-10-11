/**
 * Validate gate start-prompt sample bank (recommendations-style).
 * Run: npm run front_end:test:gate-start-prompts
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const bankDir = join(root, 'examples', 'gate-start-prompts')
const KINDS = new Set(['talk', 'form', 'coding', 'doc'])

const ASSESSOR_TEASER =
  /^(helps the candidate|surfaces|extracts|assess(?:es| the candidate)|welcome the candidate)\b/i
const BUILDER_TEASER =
  /\b\d+\s+(probe|target|question|test|template)s?\b| · |opens the day|closes the day|opens the interview|closes the interview|optional pack/i

const files = readdirSync(bankDir).filter((f) => f.endsWith('.json'))
assert.ok(files.length >= 4, 'expected kind JSON files in gate-start-prompts/')

const seenIds = new Set()

for (const file of files) {
  const kindFromName = file.replace(/\.json$/, '')
  assert.ok(KINDS.has(kindFromName), `${file}: filename must be a known kind`)
  const rows = JSON.parse(readFileSync(join(bankDir, file), 'utf8'))
  assert.ok(Array.isArray(rows) && rows.length >= 1, `${file}: non-empty array`)
  for (const [i, row] of rows.entries()) {
    const path = `${file}[${i}]`
    assert.equal(typeof row.id, 'string', `${path}.id`)
    assert.ok(row.id.trim(), `${path}.id empty`)
    assert.ok(!seenIds.has(row.id), `${path}.id duplicate ${row.id}`)
    seenIds.add(row.id)
    assert.equal(row.kind, kindFromName, `${path}.kind must match file`)
    assert.equal(typeof row.startPrompt, 'string', `${path}.startPrompt`)
    assert.ok(row.startPrompt.trim().length >= 12, `${path}.startPrompt too short`)
    assert.ok(!ASSESSOR_TEASER.test(row.startPrompt), `${path}: assessor teaser`)
    assert.ok(!BUILDER_TEASER.test(row.startPrompt), `${path}: builder teaser`)
    assert.ok(!/[\u2014\u2013]/.test(row.startPrompt), `${path}: em/en dash dialect`)
  }
}

console.log(`gate-start-prompts: ok (${seenIds.size} samples across ${files.length} kinds)`)
