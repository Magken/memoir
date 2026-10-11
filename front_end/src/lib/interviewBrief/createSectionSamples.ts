import { impliedToolTemplateIds } from '../interviewRunApi/buildTalkContext'
import { createSampleTestForm } from '../testForm/seedContent'
import type { TestFormDocument } from '../testForm/types'
import {
  CODING_CASES_PATH,
  ensureSolveFilesForLanguages,
  serializeCodingCasesFile,
} from './codingWorkspaceFiles'
import type { Creator2Probe, Creator2Target, Creator2Tool } from './creator2BriefTypes'
import { estimateFormSectionMinutes } from './estimateFormSectionMinutes'
import {
  composeWritingDocument,
  WRITING_RUBRIC_DIMENSION_PRESETS,
} from './writingDocCompose'

/** Middle-talk attach set (pack.talk members written as templateIds). */
export const MIDDLE_TALK_TEMPLATE_IDS = [
  'iv.delivery.v1',
  'iv.content.v1',
  'synth.topic.v1',
] as const

export type FormAssessmentSample = {
  form: TestFormDocument
  title: string
  instructions: string
  minutes: number
  blurb: string
  packLabel: string
  requiredQuestionIds: string[]
}

export function formAssessmentSample(): FormAssessmentSample {
  const form = createSampleTestForm()
  const minutes = Math.max(estimateFormSectionMinutes(form), 12)
  return {
    form,
    title: 'Screening sample',
    instructions:
      'Sample covering every form question type with an answer key. Swap prompts for this role; keep the kinds so authors can see what the form editor can do.',
    minutes,
    blurb:
      'Screening sample with short text, multiple choice, checkboxes, dropdown, fill-in, scales, a grid, and a paragraph item.',
    packLabel: 'Form sample',
    requiredQuestionIds: form.questions.filter((q) => q.required).map((q) => q.id),
  }
}

export type TalkAssessmentSample = {
  minutes: number
  label: string
  purpose: string
  probes: Creator2Probe[]
  targets: Creator2Target[]
  templateIds: string[]
  blurb: string
}

export function talkAssessmentSample(topicId: string, seedMinutes: number): TalkAssessmentSample {
  const minutes = Math.max(seedMinutes, 12)
  return {
    minutes,
    label: 'Decision conversation',
    purpose:
      'Sample talk with delivery and content marks. Rewrite the probes for this role; keep at least one required follow-up.',
    probes: [
      {
        id: `${topicId}.p1`,
        goal: 'Walk me through a recent decision you owned end to end.',
        required: true,
        order: 0,
        hint: 'Start with the constraint, not the résumé line.',
      },
      {
        id: `${topicId}.p2`,
        goal: 'What option did you reject, and what would have gone wrong if you took it?',
        required: true,
        order: 1,
        hint: null,
      },
      {
        id: `${topicId}.p3`,
        goal: 'How did you know the outcome was good enough to ship?',
        required: true,
        order: 2,
        hint: 'Look for a metric, a review, or a customer signal.',
      },
    ],
    targets: [
      {
        key: 'decision',
        label: 'The decision',
        required: true,
        datatype: 'text',
        description: 'What they chose and the constraint that forced it.',
      },
      {
        key: 'tradeoff',
        label: 'Rejected option',
        required: true,
        datatype: 'text',
        description: 'What they did not do, and why.',
      },
    ],
    templateIds: [...MIDDLE_TALK_TEMPLATE_IDS],
    blurb:
      'Sample conversation with three probes, two harvest targets, and delivery + content marks.',
  }
}

export type CodingAssessmentSample = {
  minutes: number
  title: string
  instructions: string
  testsBundle: NonNullable<Creator2Tool['tests']>
  workspace: Record<string, unknown>
  blurb: string
  packLabel: string
}

export function codingAssessmentSample(seedMinutes: number): CodingAssessmentSample {
  const minutes = Math.max(seedMinutes, 20)
  const cases = [
    {
      id: 't1',
      name: 'basic',
      description: 'Happy path',
      args: [
        [2, 7, 11, 15],
        9,
      ],
      expected: [0, 1],
      compare: 'deep_equal' as const,
      hidden: false,
      timeoutMs: null,
    },
    {
      id: 't2',
      name: 'duplicates',
      description: 'Same value twice',
      args: [
        [3, 3],
        6,
      ],
      expected: [0, 1],
      compare: 'deep_equal' as const,
      hidden: true,
      timeoutMs: null,
    },
    {
      id: 't3',
      name: 'no_pair',
      description: 'No pair sums to the target',
      args: [[1, 2, 3], 100],
      expected: [],
      compare: 'deep_equal' as const,
      hidden: true,
      timeoutMs: null,
    },
  ]
  const testsBundle = {
    runner: 'hidden_cases_v1',
    entryPoint: 'solve',
    cases,
    referenceSolution: null as string | null,
  }
  const readme = [
    '# Two-sum',
    '',
    'Return the indices of the pair that sums to `target`. Prefer O(n) with a hash map.',
    '',
    '## Example',
    '',
    '`nums = [2, 7, 11, 15]`, `target = 9` → `[0, 1]`',
    '',
    '## Constraints',
    '',
    '- Exactly one valid pair, or `[]` when none exists',
    '- Do not use the same element twice',
    '',
    '## Tests',
    '',
    'Visible `basic` plus hidden `duplicates` and `no_pair` in `tests/cases.json`.',
    '',
  ].join('\n')
  let workspace = ensureSolveFilesForLanguages(
    {
      title: 'two-sum',
      files: [
        {
          path: 'README.md',
          language: 'markdown',
          content: readme,
        },
        {
          path: CODING_CASES_PATH,
          language: 'json',
          content: serializeCodingCasesFile(testsBundle),
        },
      ],
      folders: ['src', 'tests'],
      openIds: ['README.md', 'src/solve.ts'],
      activeId: 'README.md',
    },
    ['typescript', 'python'],
    {
      entryPoint: 'solve',
      activateDefault: true,
      defaultLanguage: 'typescript',
    },
  )
  workspace = {
    ...workspace,
    openIds: Array.from(new Set(['README.md', ...(workspace.openIds ?? [])])),
    activeId: 'README.md',
  }
  return {
    minutes,
    title: 'Two-sum coding drill',
    instructions:
      'Sample timed drill: return indices of two numbers that add to the target. Visible and hidden cases are in tests/cases.json. Rewrite the README for this role; keep at least two cases.',
    testsBundle,
    workspace,
    blurb:
      'Timed two-sum drill with a problem README, TypeScript and Python solve files, and hidden tests.',
    packLabel: 'Coding sample',
  }
}

export type WritingAssessmentSample = {
  minutes: number
  title: string
  instructions: string
  prompt: NonNullable<Creator2Tool['prompt']>
  assessment: NonNullable<Creator2Tool['assessment']>
  minWords: number
  maxWords: number
  inline: Record<string, unknown>
  blurb: string
  packLabel: string
}

export function writingAssessmentSample(seedMinutes: number): WritingAssessmentSample {
  const minutes = Math.max(seedMinutes, 15)
  const structure = [
    { id: 'situation', label: 'Situation', minParagraphs: 1, hint: 'Context and the constraint' },
    { id: 'decision', label: 'Decision', minParagraphs: 1, hint: 'What you chose and why' },
    { id: 'impact', label: 'Impact', minParagraphs: 1, hint: 'How you measured the result' },
  ]
  const requirements = [
    'Keep the Situation / Decision / Impact headings in that order',
    'Name a concrete artifact, metric, or review, not a slogan',
  ]
  const dimensions = WRITING_RUBRIC_DIMENSION_PRESETS.slice(0, 5).map((row) => ({
    ...row,
    bands: row.bands?.map((b) => ({ ...b })),
  }))
  const title = 'Ownership essay'
  const brief =
    'Describe a time you owned an ambiguous delivery end to end. What tradeoff did you make, and how did you measure impact?'
  const assessment = {
    kind: 'rubric' as const,
    dimensions,
    formatNotes:
      'The response must use the Situation / Decision / Impact outline as visible headings, in that order.',
  }
  return {
    minutes,
    title,
    instructions:
      'Ask the candidate to write a short ownership narrative for this role. Score relevance and specificity; do not invent company secrets or offer language.',
    prompt: { brief, structure, requirements },
    assessment,
    minWords: 180,
    maxWords: 700,
    inline: composeWritingDocument({
      title,
      brief,
      structure,
      requirements,
      assessment,
      minWords: 180,
      maxWords: 700,
      timed: false,
    }) as Record<string, unknown>,
    blurb:
      'Ownership essay with a three-part outline, sample answer scaffold, and a five-criterion rubric.',
    packLabel: 'Writing sample',
  }
}

export function formToolFromSample(
  sample: FormAssessmentSample,
  extra: { estimatedMinutes: number },
): Pick<
  Creator2Tool,
  'type' | 'title' | 'instructions' | 'editorKind' | 'timing' | 'artifact' | 'passThreshold' | 'analysis'
> {
  return {
    type: 'form_quiz',
    title: sample.title,
    instructions: sample.instructions,
    editorKind: 'testform',
    timing: {
      mode: 'untimed',
      estimatedMinutes: extra.estimatedMinutes,
      limitMinutes: null,
    },
    artifact: {
      docKind: 'form',
      nodeId: null,
      inline: sample.form,
    },
    passThreshold: {
      mode: 'required_items',
      minScore: null,
      requiredQuestionIds: sample.requiredQuestionIds,
    },
    analysis: {
      attachPack: null,
      templateIds: impliedToolTemplateIds('form_quiz'),
    },
  }
}
