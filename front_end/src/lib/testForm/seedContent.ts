import { stripAnswerKey } from './scoring'
import {
  createEmptyTestForm,
  emptyAnswerKeyForQuestion,
  newTestFormId,
  type TestFormDocument,
  type TestFormEditorPayload,
} from './types'

/** Mixed-kind sample with sections + answer key (author / Drive). */
export function createSampleTestForm(): TestFormDocument {
  const secBasics = newTestFormId('sec')
  const secFormats = newTestFormId('sec')
  const secSkills = newTestFormId('sec')
  const secFit = newTestFormId('sec')

  const shortId = newTestFormId('q')
  const numberId = newTestFormId('q')
  const emailId = newTestFormId('q')
  const phoneId = newTestFormId('q')
  const dateId = newTestFormId('q')
  const nickId = newTestFormId('q')
  const essayId = newTestFormId('q')
  const singleA = newTestFormId('opt')
  const singleB = newTestFormId('opt')
  const singleC = newTestFormId('opt')
  const singleId = newTestFormId('q')
  const multiA = newTestFormId('opt')
  const multiB = newTestFormId('opt')
  const multiC = newTestFormId('opt')
  const multiId = newTestFormId('q')
  const dropA = newTestFormId('opt')
  const dropB = newTestFormId('opt')
  const dropC = newTestFormId('opt')
  const dropId = newTestFormId('q')
  const blank1 = newTestFormId('blank')
  const blank2 = newTestFormId('blank')
  const fillId = newTestFormId('q')
  const ordinalId = newTestFormId('q')
  const gridId = newTestFormId('q')
  const gridR1 = newTestFormId('row')
  const gridR2 = newTestFormId('row')
  const gridR3 = newTestFormId('row')
  const gridC1 = newTestFormId('col')
  const gridC2 = newTestFormId('col')
  const gridC3 = newTestFormId('col')
  const gridC4 = newTestFormId('col')
  const gridC5 = newTestFormId('col')

  const doc = createEmptyTestForm('Screening sample')
  doc.id = newTestFormId('form')
  doc.settings = { shuffleQuestions: false, showHintsInTake: true }
  doc.sections = [
    {
      id: secBasics,
      title: 'Basics',
      description: 'Warm-up checks — short answers and fill-ins.',
    },
    {
      id: secFormats,
      title: 'Formats',
      description:
        'Typed fields with inputFormat + rejects — try Submit empty or with bad values to see validation.',
    },
    {
      id: secSkills,
      title: 'Skills',
      description: 'Technical judgment across choice and written prompts.',
    },
    {
      id: secFit,
      title: 'Fit',
      description: 'Self-ratings and confidence scales.',
    },
  ]
  doc.questions = [
    {
      id: shortId,
      sectionId: secBasics,
      kind: 'short_text',
      inputFormat: 'text',
      prompt: 'What does HTTP stand for?',
      description: 'Spell out the full expansion — abbreviations alone will not score.',
      required: true,
      points: 1,
      hint: 'It is the protocol browsers use to request web pages. Think “Hypertext…”',
    },
    {
      id: fillId,
      sectionId: secBasics,
      kind: 'fill_blank',
      prompt: 'Complete the sentence',
      description: 'Type a natural word in each blank. Spelling counts — some words are rejected.',
      required: true,
      points: 2,
      hint: 'Common answers include “excited / ready / nervous” and “ace / take / attend”.',
      segments: [
        { type: 'text', text: 'I am ' },
        { type: 'blank', blankId: blank1, placeholder: 'feeling' },
        { type: 'text', text: ' going to ' },
        { type: 'blank', blankId: blank2, placeholder: 'verb' },
        { type: 'text', text: ' the interview.' },
      ],
    },
    {
      id: dropId,
      sectionId: secBasics,
      kind: 'dropdown',
      prompt: 'Which environment is best for local Supabase work?',
      description: 'Pick one from the list.',
      required: true,
      points: 1,
      hint: 'You want a stack you can start and reset on your machine.',
      options: [
        { id: dropA, label: 'Only production cloud' },
        { id: dropB, label: 'Local Supabase CLI' },
        { id: dropC, label: 'Email-only staging' },
      ],
    },
    {
      id: numberId,
      sectionId: secFormats,
      kind: 'short_text',
      inputFormat: 'number',
      prompt: 'How many years of professional experience do you have?',
      description: 'Numbers only — decimals allowed (e.g. 2.5). Letters fail format checks.',
      required: true,
      points: 1,
      hint: 'Round to the nearest half-year if helpful.',
    },
    {
      id: emailId,
      sectionId: secFormats,
      kind: 'short_text',
      inputFormat: 'email',
      prompt: 'Work email for follow-ups',
      description: 'Must look like name@domain.tld — try a bare word to see the format error.',
      required: true,
      points: 1,
      hint: 'Use the address you check daily.',
    },
    {
      id: phoneId,
      sectionId: secFormats,
      kind: 'short_text',
      inputFormat: 'phone',
      prompt: 'Mobile phone (with country code)',
      description: 'Example shape: +1 555 123 4567.',
      required: true,
      points: 1,
      hint: 'Include + and country code.',
    },
    {
      id: dateId,
      sectionId: secFormats,
      kind: 'short_text',
      inputFormat: 'date',
      prompt: 'Earliest start date',
      description: 'YYYY-MM-DD — the date field formats as you type.',
      required: true,
      points: 1,
      hint: 'Pick a realistic first available day.',
    },
    {
      id: nickId,
      sectionId: secFormats,
      kind: 'short_text',
      inputFormat: 'text',
      prompt: 'Preferred nickname (optional)',
      description: 'Not required — leave blank to confirm optional fields still Submit.',
      required: false,
      points: 0,
      hint: 'Only if you want interviewers to use a shorter name.',
    },
    {
      id: essayId,
      sectionId: secSkills,
      kind: 'essay',
      prompt: 'Describe how you would debug a flaky integration test.',
      description: 'A few sentences is fine — focus on method, not tools trivia.',
      required: true,
      points: 5,
      hint: 'Mention isolating the failure, reading logs, and making it reproducible.',
    },
    {
      id: singleId,
      sectionId: secSkills,
      kind: 'mcq_single',
      prompt: 'Which structure has O(1) average lookup?',
      description: 'Select exactly one answer.',
      required: true,
      points: 1,
      hint: 'Think about key → value maps, not sequential scans.',
      options: [
        { id: singleA, label: 'Array' },
        { id: singleB, label: 'Hash map' },
        { id: singleC, label: 'Linked list' },
      ],
    },
    {
      id: multiId,
      sectionId: secSkills,
      kind: 'mcq_multi',
      prompt: 'Select all HTTP methods that are typically idempotent.',
      description: 'More than one may be correct.',
      required: true,
      points: 2,
      hint: 'Idempotent means repeating the request has the same effect as doing it once.',
      options: [
        { id: multiA, label: 'GET' },
        { id: multiB, label: 'PUT' },
        { id: multiC, label: 'POST' },
      ],
    },
    {
      id: ordinalId,
      sectionId: secFit,
      kind: 'ordinal',
      prompt: 'How confident are you with TypeScript?',
      description: 'Tap a number — 1 is low confidence, 5 is expert.',
      required: true,
      points: 1,
      hint: 'Be honest; this is used for placement, not a pass/fail gate.',
      scale: {
        min: 1,
        max: 5,
        step: 1,
        minLabel: 'Not at all',
        maxLabel: 'Expert',
      },
    },
    {
      id: gridId,
      sectionId: secFit,
      kind: 'ordinal_grid',
      prompt: 'Rate how often each statement applies to you',
      description: 'One choice per row — same scale as a Google Forms multiple-choice grid.',
      required: true,
      points: 3,
      hint: 'There are no wrong feelings here; consistency across rows matters more than extremes.',
      rows: [
        { id: gridR1, label: 'I ask clarifying questions early' },
        { id: gridR2, label: 'I document decisions as I go' },
        { id: gridR3, label: 'I prefer pair debugging on blockers' },
      ],
      columns: [
        { id: gridC1, label: 'Never' },
        { id: gridC2, label: 'Rarely' },
        { id: gridC3, label: 'Sometimes' },
        { id: gridC4, label: 'Often' },
        { id: gridC5, label: 'Always' },
      ],
    },
  ]

  doc.answerKey = {
    [shortId]: {
      kind: 'short_text',
      match: 'contains',
      value: 'hypertext transfer protocol',
      caseSensitive: false,
      rejects: ['http', 'https', 'html'],
    },
    [numberId]: {
      kind: 'short_text',
      match: 'regex',
      value: '^[0-9]+(\\.[0-9]+)?$',
      caseSensitive: false,
      rejects: ['0', '00'],
    },
    [emailId]: {
      kind: 'short_text',
      match: 'contains',
      value: '@',
      caseSensitive: false,
      rejects: ['noreply@', 'test@test.com'],
    },
    [phoneId]: {
      kind: 'short_text',
      match: 'contains',
      value: '+',
      caseSensitive: false,
      rejects: ['000', '1234567890'],
    },
    [dateId]: {
      kind: 'short_text',
      match: 'regex',
      value: '^\\d{4}-\\d{2}-\\d{2}$',
      caseSensitive: false,
    },
    [nickId]: {
      kind: 'short_text',
      match: 'exact',
      value: '',
      caseSensitive: false,
      rejects: ['admin', 'root', 'null'],
    },
    [essayId]: {
      kind: 'essay',
      keywords: ['reproduc', 'log', 'isolat'],
      rubricNotes: 'Manual review for clarity and method.',
    },
    [singleId]: { kind: 'mcq_single', optionId: singleB },
    [multiId]: { kind: 'mcq_multi', optionIds: [multiA, multiB] },
    [dropId]: { kind: 'dropdown', optionId: dropB },
    [fillId]: {
      kind: 'fill_blank',
      blanks: {
        [blank1]: ['excited', 'ready', 'nervous'],
        [blank2]: ['ace', 'take', 'attend'],
      },
      rejects: {
        [blank1]: ['sad', 'angry', 'bored'],
        [blank2]: ['skip', 'miss', 'cancel'],
      },
    },
    [ordinalId]: { kind: 'ordinal', min: 3, max: 5 },
    [gridId]: {
      kind: 'ordinal_grid',
      expected: {},
      rubricNotes: 'Self-report — manual / soft review.',
    },
  }

  for (const q of doc.questions) {
    if (!doc.answerKey![q.id]) {
      doc.answerKey![q.id] = emptyAnswerKeyForQuestion(q)
    }
  }

  return doc
}

/**
 * Lean eligibility / screening starter for fixtures and Edge regen.
 * Creator Contents Add and picker Form assessment use createSampleTestForm
 * via createSectionSamples — not this gate.
 */
export function createStarterEligibilityForm(
  title = 'Eligibility screening',
): TestFormDocument {
  const secWork = newTestFormId('sec')
  const qAuth = newTestFormId('q')
  const qNotice = newTestFormId('q')
  const qRelo = newTestFormId('q')
  const optAuthYes = newTestFormId('opt')
  const optAuthNo = newTestFormId('opt')
  const optReloYes = newTestFormId('opt')
  const optReloMaybe = newTestFormId('opt')
  const optReloNo = newTestFormId('opt')

  const doc = createEmptyTestForm(title)
  doc.settings = { shuffleQuestions: false, showHintsInTake: false }
  doc.sections = [
    {
      id: secWork,
      title: 'Work authorization',
      description: 'Gate checks before deeper craft sections.',
    },
  ]
  doc.questions = [
    {
      id: qAuth,
      sectionId: secWork,
      kind: 'mcq_single',
      prompt: 'Are you authorized to work in this location without sponsorship?',
      required: true,
      points: 1,
      options: [
        { id: optAuthYes, label: 'Yes' },
        { id: optAuthNo, label: 'No' },
      ],
    },
    {
      id: qNotice,
      sectionId: secWork,
      kind: 'short_text',
      inputFormat: 'number',
      prompt: 'Notice period (days)',
      required: false,
      points: 0,
      description: 'Optional',
    },
    {
      id: qRelo,
      sectionId: secWork,
      kind: 'mcq_single',
      prompt: 'Are you open to relocating if the role requires it?',
      required: true,
      points: 1,
      options: [
        { id: optReloYes, label: 'Yes' },
        { id: optReloMaybe, label: 'Maybe / hybrid only' },
        { id: optReloNo, label: 'No' },
      ],
    },
  ]
  doc.answerKey = {
    [qAuth]: { kind: 'mcq_single', optionId: optAuthYes },
    [qNotice]: emptyAnswerKeyForQuestion(doc.questions[1]!),
    [qRelo]: { kind: 'mcq_single', optionId: optReloYes },
  }
  return doc
}

export function createSampleTestFormPayload(): TestFormEditorPayload {
  return { document: createSampleTestForm(), mode: 'author' }
}

export function createTakeSamplePayload(): TestFormEditorPayload {
  return { document: stripAnswerKey(createSampleTestForm()), mode: 'take' }
}
