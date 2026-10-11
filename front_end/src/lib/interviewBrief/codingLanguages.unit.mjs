/**
 * Coding language leftover aliases + catalogue lockstep.
 * Run: npx tsx front_end/src/lib/interviewBrief/codingLanguages.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CODING_LANGUAGE_IDS, normalizeCodingLanguageId } from './codingLanguages.ts'
import {
  aliasCodingLanguageId,
  CODING_LANGUAGE_ALIASES,
} from '../../../../back_end/supabase/functions/interview-brief-edit/codingLanguageAliases.ts'

const here = dirname(fileURLToPath(import.meta.url))
const catalogue = JSON.parse(
  readFileSync(
    join(
      here,
      '../../../../back_end/supabase/functions/interview-code-run/catalogue/coding-challenges.catalogue.json',
    ),
    'utf8',
  ),
)

assert.deepEqual(
  [...CODING_LANGUAGE_IDS].sort(),
  catalogue.languages.map((l) => l.id).sort(),
  'Creator chips must match the coding catalogue ids',
)

assert.equal(normalizeCodingLanguageId('ts'), 'typescript')
assert.equal(normalizeCodingLanguageId('golang'), 'go')
assert.equal(normalizeCodingLanguageId('c++'), 'cpp')
assert.equal(aliasCodingLanguageId('ts'), normalizeCodingLanguageId('ts'))
assert.equal(aliasCodingLanguageId('PY'), 'python')
assert.equal(CODING_LANGUAGE_ALIASES.ts, 'typescript')

const mergeSrc = readFileSync(
  join(here, '../../../../back_end/supabase/functions/interview-brief-edit/merge.ts'),
  'utf8',
)
assert.match(
  mergeSrc,
  /aliasCodingLanguageId/,
  'persist must share the leftover language alias table',
)

console.log('codingLanguages: ok')
