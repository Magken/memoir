/**
 * Sitting declaration digest — no DOM. Note-only: never extra time.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sittingDeclaration.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  DECLARE_FORM_COPY,
  SITTING_CONDITION_OPTIONS,
  SITTING_HELP_OPTIONS,
  digestSittingDeclaration,
  emptySittingDeclaration,
  packageIntakeDeclarations,
  sittingDeclarationBlockHint,
  sittingDeclarationReady,
  sittingDeclarationReviewTag,
  stampSittingDeclaration,
  stampSittingTerms,
} from './sittingDeclaration.ts'

assert.equal(digestSittingDeclaration(null).empty, true)
assert.equal(digestSittingDeclaration(emptySittingDeclaration()).empty, true)

const named = digestSittingDeclaration({
  schema: 'vurify/sitting-declaration.v1',
  updatedAt: '2026-08-27T00:00:00.000Z',
  nothingToDeclare: false,
  preferNotToSay: false,
  conditions: ['adhd', 'dyslexia'],
  helps: ['timed_pace'],
  notes: 'I lose the last minutes of a timer.',
})
assert.equal(named.empty, false)
assert.ok(named.labels.some((row) => /ADHD \(self-report\)/.test(row)))
assert.ok(named.labels.some((row) => /Dyslexia/.test(row)))
assert.ok(named.helps.some((row) => /timed work can bunch/.test(row)))
assert.ok(!named.helps.some((row) => /allow for extra time|grant|Asked staff/i.test(row)))
assert.match(named.notes ?? '', /timer/)
assert.ok(!named.labels.some((row) => /diagnos/i.test(row)))

const legacy = digestSittingDeclaration({
  schema: 'vurify/sitting-declaration.v1',
  updatedAt: '2026-08-27T00:00:00.000Z',
  nothingToDeclare: false,
  preferNotToSay: false,
  conditions: [],
  helps: ['extra_time'],
})
assert.ok(legacy.helps.some((row) => /timed work can bunch/.test(row)))
assert.ok(!/extra time/i.test(legacy.helps.join(' ')))

const quiet = digestSittingDeclaration({
  schema: 'vurify/sitting-declaration.v1',
  updatedAt: '2026-08-27T00:00:00.000Z',
  nothingToDeclare: false,
  preferNotToSay: true,
  conditions: ['adhd'],
  helps: [],
})
assert.equal(quiet.preferNotToSay, true)
assert.deepEqual(quiet.labels, ['Prefer not to say'])

assert.equal(sittingDeclarationReady(emptySittingDeclaration()), false)
assert.equal(
  sittingDeclarationReady({
    ...emptySittingDeclaration(),
    declareMode: 'none',
    nothingToDeclare: true,
  }),
  true,
)
assert.equal(
  sittingDeclarationReady({
    ...emptySittingDeclaration(),
    declareMode: 'named',
    conditions: ['adhd'],
  }),
  false,
)
assert.equal(
  sittingDeclarationReady({
    ...emptySittingDeclaration(),
    declareMode: 'named',
    conditions: ['adhd'],
    helps: ['timed_pace'],
  }),
  true,
)

assert.equal(sittingDeclarationBlockHint(emptySittingDeclaration()), null)
assert.equal(
  sittingDeclarationBlockHint({
    ...emptySittingDeclaration(),
    declareMode: 'none',
    nothingToDeclare: true,
  }),
  null,
)
assert.equal(
  sittingDeclarationBlockHint({
    ...emptySittingDeclaration(),
    declareMode: 'named',
    conditions: ['adhd'],
  }),
  'Choose how your work can look during this interview.',
)
assert.equal(
  sittingDeclarationBlockHint({
    ...emptySittingDeclaration(),
    declareMode: 'named',
    conditions: ['other'],
    helps: ['timed_pace'],
  }),
  'Name the condition in your own words.',
)
assert.equal(
  sittingDeclarationBlockHint({
    ...emptySittingDeclaration(),
    declareMode: 'named',
    conditions: ['adhd'],
    helps: ['other'],
  }),
  'Describe what a reviewer might see.',
)

const stamped = stampSittingDeclaration(
  emptySittingDeclaration(),
  { declareMode: 'named', conditions: ['adhd'] },
  '2026-08-28T12:00:00.000Z',
)
assert.equal(stamped.updatedAt, '2026-08-28T12:00:00.000Z')
assert.equal(stamped.fieldAt?.mode, '2026-08-28T12:00:00.000Z')
assert.equal(stamped.fieldAt?.conditions, '2026-08-28T12:00:00.000Z')

const terms = stampSittingTerms(null, true, '2026-08-28T12:01:00.000Z')
assert.equal(terms.agreed, true)
assert.equal(terms.agreedAt, '2026-08-28T12:01:00.000Z')
const pack = packageIntakeDeclarations({ terms, supportNote: stamped })
assert.equal(pack.schema, 'vurify/intake-declarations.v1')
assert.equal(pack.terms?.agreed, true)
assert.equal(pack.terms?.agreedAt, '2026-08-28T12:01:00.000Z')
assert.match(pack.terms?.statement ?? '', /interview terms/)
assert.equal(pack.supportNote?.declareMode, 'named')
assert.ok(pack.supportNoteDigest.labels.some((row) => /ADHD/.test(row)))

assert.equal(sittingDeclarationReviewTag(null).label, 'No note')
assert.equal(
  sittingDeclarationReviewTag(
    packageIntakeDeclarations({
      supportNote: {
        ...emptySittingDeclaration(),
        declareMode: 'none',
        nothingToDeclare: true,
      },
    }),
  ).label,
  'Nothing to declare',
)
assert.equal(
  sittingDeclarationReviewTag(
    packageIntakeDeclarations({
      supportNote: {
        ...emptySittingDeclaration(),
        declareMode: 'quiet',
        preferNotToSay: true,
      },
    }),
  ).label,
  'Prefer not to say',
)
assert.equal(
  sittingDeclarationReviewTag(
    packageIntakeDeclarations({
      supportNote: {
        ...emptySittingDeclaration(),
        declareMode: 'named',
        conditions: ['adhd'],
        helps: ['timed_pace'],
      },
    }),
  ).label,
  'Declared',
)

{
  const candidateCopy = [
    DECLARE_FORM_COPY.mode.prompt,
    DECLARE_FORM_COPY.mode.description,
    DECLARE_FORM_COPY.mode.hint,
    ...DECLARE_FORM_COPY.mode.options.map((row) => row.label),
    DECLARE_FORM_COPY.conditions.prompt,
    DECLARE_FORM_COPY.conditions.description,
    DECLARE_FORM_COPY.conditions.hint,
    DECLARE_FORM_COPY.look.prompt,
    DECLARE_FORM_COPY.look.description,
    DECLARE_FORM_COPY.look.hint,
    DECLARE_FORM_COPY.notes.prompt,
    DECLARE_FORM_COPY.notes.description,
    DECLARE_FORM_COPY.notes.hint,
    DECLARE_FORM_COPY.otherConditionLabel,
    DECLARE_FORM_COPY.otherHelpLabel,
    ...SITTING_CONDITION_OPTIONS.flatMap((row) => [row.label, row.hint]),
    ...SITTING_HELP_OPTIONS.flatMap((row) => [row.label, row.hint]),
    sittingDeclarationBlockHint({
      ...emptySittingDeclaration(),
      declareMode: 'named',
      conditions: ['adhd'],
    }) ?? '',
  ].join('\n')
  const jargon = /tape|clocks look|spoken clocks|mix of channels|this sitting looks|look on the tape|What a reviewer should know|\bAssist\b|intervention/i
  assert.ok(jargon.test('Select how this sitting can look on the tape.'), 'negative: old look hint is jargon')
  assert.equal(jargon.test(candidateCopy), false, 'candidate Support copy stays plain')
  assert.notEqual(DECLARE_FORM_COPY.mode.options[0].label, 'No', 'negative: mode none is not a one-word answer')
  assert.match(DECLARE_FORM_COPY.mode.prompt, /reviewer/)
  assert.match(DECLARE_FORM_COPY.notes.prompt, /reviewer/)
  assert.ok(DECLARE_FORM_COPY.look.prompt.length > 36, 'look prompt names the interview, not only “today”')
}

{
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const here = dirname(fileURLToPath(import.meta.url))
  const decl = readFileSync(join(here, '../../components/InterviewLandingDeclaration.tsx'), 'utf8')
  const css = readFileSync(join(here, '../../css/effects/interview-landing.css'), 'utf8')
  assert.equal(/What a reviewer should know/.test(decl), false, 'Support form has no reviewer heading')
  assert.equal(/interview-declaration-heading/.test(decl), false, 'Support form has no heading id')
  assert.ok(/aria-label="Support note"/.test(decl), 'Support form keeps an accessible name')
  assert.ok(/DECLARE_FORM_COPY/.test(decl), 'Support prompts come from DECLARE_FORM_COPY')
  const formStart = css.indexOf('.theme .theme-interview-landing__declare-form {')
  const formEnd = css.indexOf('}', formStart)
  const formBlock = css.slice(formStart, formEnd)
  assert.ok(formStart >= 0, 'declare-form rule exists')
  assert.equal(/border-top/.test(formBlock), false, 'declare-form has no lead divider')
}

console.log('sittingDeclaration.unit.mjs: ok')
