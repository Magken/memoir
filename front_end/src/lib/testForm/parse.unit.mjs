/**
 * Unit: legacy form dialect coerce + no Screening sample fallback.
 * Run: npx tsx front_end/src/lib/testForm/parse.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const mod = await import(pathToFileURL(join(root, 'parse.ts')).href)
const { coerceLegacyTestFormDocument, normalizeTestFormDocument, isTestFormDocument } = mod

const nested = {
  title: 'Gate',
  sections: [
    {
      id: 'sec.a',
      title: 'Auth',
      questions: [
        {
          id: 'q1',
          type: 'single',
          prompt: 'Authorized?',
          options: [
            { id: 'yes', label: 'Yes' },
            { id: 'no', label: 'No' },
          ],
        },
      ],
    },
  ],
}

const coerced = coerceLegacyTestFormDocument(nested)
assert.ok(coerced, 'coerce nested')
assert.equal(coerced.schema, 'vurify/test-form')
assert.equal(coerced.questions.length, 1)
assert.equal(coerced.questions[0].kind, 'mcq_single')
assert.ok(!('type' in coerced.questions[0]))
assert.equal(coerced.sections[0].questions, undefined)
assert.ok(isTestFormDocument(coerced))

const { document, warnings } = normalizeTestFormDocument(nested)
assert.equal(document.title, 'Gate')
assert.equal(document.questions[0].kind, 'mcq_single')
assert.ok(warnings?.some((w) => /Coerced/i.test(w)))
assert.notEqual(document.title, 'Screening sample')

const { document: emptyDoc, warnings: emptyWarn } = normalizeTestFormDocument({
  foo: 'bar',
})
assert.equal(emptyDoc.questions.length, 0)
assert.notEqual(emptyDoc.title, 'Screening sample')
assert.ok(emptyWarn?.some((w) => /empty form/i.test(w)))

const typesMod = await import(pathToFileURL(join(root, 'types.ts')).href)
const { answerKeyHasContent, ensureAnswerKeys } = typesMod

const regexDoc = {
  schema: 'vurify/test-form',
  version: 1,
  id: 'tf_rt',
  title: 'Round trip',
  settings: { shuffleQuestions: false, showHintsInTake: true },
  sections: [{ id: 'sec.main', title: 'Main' }],
  questions: [
    {
      id: 'q.email',
      kind: 'short_text',
      sectionId: 'sec.main',
      prompt: 'Email',
      required: true,
      points: 1,
      inputFormat: 'email',
    },
  ],
  // Bot sometimes omits kind tag — must still display
  answerKey: {
    'q.email': {
      match: 'regex',
      value: '^[^@]+@[^@]+\\.[^@]+$',
      rejects: ['test@test.com'],
    },
  },
}

const ensured = ensureAnswerKeys(regexDoc)
assert.equal(ensured.answerKey['q.email'].kind, 'short_text')
assert.equal(ensured.answerKey['q.email'].match, 'regex')
assert.ok(answerKeyHasContent(ensured.answerKey['q.email']), 'answerKeyHasContent')

const coercedRegex = coerceLegacyTestFormDocument(regexDoc)
assert.ok(coercedRegex)
assert.ok(answerKeyHasContent(coercedRegex.answerKey['q.email']), 'coerce keeps regex key')

// Schema-tagged bot doc with fill_blank blanks dialect (no segments) must not crash.
{
  const botDoc = {
    schema: 'vurify/test-form',
    version: 1,
    id: 'tf_bot',
    title: 'Eligibility',
    settings: { shuffleQuestions: false, showHintsInTake: true },
    sections: [{ id: 'sec.main', title: 'Main' }],
    questions: [
      {
        id: 'q.blank',
        kind: 'fill_blank',
        sectionId: 'sec.main',
        prompt: 'HTTP success status is {{code}}.',
        required: true,
        blanks: [{ id: 'code', label: 'code' }],
      },
      {
        id: 'q.ord',
        kind: 'ordinal',
        sectionId: 'sec.main',
        prompt: 'Confidence',
        required: true,
        min: 1,
        max: 5,
      },
    ],
    answerKey: {
      'q.blank': { kind: 'fill_blank', blanks: { code: ['200'] } },
      'q.ord': { kind: 'ordinal', min: 3, max: 5 },
    },
  }
  assert.ok(isTestFormDocument(botDoc))
  const { document: normalized } = normalizeTestFormDocument(botDoc)
  const blank = normalized.questions.find((q) => q.id === 'q.blank')
  assert.equal(blank?.kind, 'fill_blank')
  assert.ok(Array.isArray(blank?.segments) && blank.segments.length >= 2, 'segments built from blanks')
  assert.ok(blank.segments.some((s) => s.type === 'blank' && s.blankId === 'code'))
  const ord = normalized.questions.find((q) => q.id === 'q.ord')
  assert.equal(ord?.kind, 'ordinal')
  assert.equal(ord?.scale?.min, 1)
  assert.equal(ord?.scale?.max, 5)
  // ensureAnswerKeys must not throw on pre-normalize missing segments either
  const { emptyAnswerKeyForQuestion } = typesMod
  const rawish = { kind: 'fill_blank', segments: undefined }
  assert.equal(emptyAnswerKeyForQuestion(rawish).kind, 'fill_blank')
}

// ── Creator add-bar, parse ingest, and Edge persist share the same eight kinds ──
{
  const typesSrc = readFileSync(join(root, 'types.ts'), 'utf8')
  const union = typesSrc.match(/export type TestFormQuestionKind =\s*([\s\S]*?)\n\n/)
  assert.ok(union, 'TestFormQuestionKind union')
  const liveKinds = [...union[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()

  const menuSrc = readFileSync(
    join(root, '../../components/testFormParts/questionEdgeMenu.ts'),
    'utf8',
  )
  const addBar = [...menuSrc.matchAll(/kind: '([a-z_]+)'/g)].map((m) => m[1])
  assert.deepEqual(
    [...new Set(addBar)].sort(),
    liveKinds,
    'Creator add-bar must offer every TestForm kind and no extras',
  )

  const triageMod = await import(
    pathToFileURL(
      join(
        root,
        '../../../../back_end/supabase/functions/_shared/interview-assessors/formQuestionTriage.ts',
      ),
    ).href
  )
  assert.deepEqual(
    { ...mod.KIND_ALIASES },
    { ...triageMod.FORM_KIND_ALIASES },
    'Creator ingest aliases must match Edge persist/marker aliases',
  )

  const aliased = coerceLegacyTestFormDocument({
    title: 'Gate',
    questions: [
      {
        id: 'q.auth',
        kind: 'single_choice',
        prompt: 'Authorized?',
        options: [
          { id: 'yes', label: 'Yes' },
          { id: 'no', label: 'No' },
        ],
      },
      { id: 'q.essay', kind: 'long_text', prompt: 'Write a paragraph.' },
      { id: 'q.n', kind: 'number', prompt: 'Years of experience?' },
      { id: 'q.tf', kind: 'true_false', prompt: 'Eligible to work?' },
    ],
  })
  assert.ok(aliased)
  const byId = Object.fromEntries(aliased.questions.map((q) => [q.id, q]))
  assert.equal(byId['q.auth'].kind, 'mcq_single', 'single_choice must not become short_text in the editor')
  assert.equal(byId['q.auth'].options?.[0]?.id, 'yes')
  assert.equal(byId['q.essay'].kind, 'essay', 'long_text is the paragraph kind')
  assert.equal(byId['q.n'].kind, 'short_text')
  assert.equal(byId['q.n'].inputFormat, 'number')
  assert.equal(byId['q.tf'].kind, 'mcq_single')
  assert.deepEqual(
    byId['q.tf'].options?.map((o) => o.id),
    ['yes', 'no'],
    'true_false without options becomes Yes/No',
  )
}

console.log('ok — parse coerce + empty fallback + answerKey round-trip')
