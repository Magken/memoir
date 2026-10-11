/**
 * Harbor sample overlay for Home Try kits.
 * Spine ids stay; staff JSON is not mutated.
 */

import type { Creator2BriefDocument, Creator2Topic } from '../interviewBrief/creator2BriefTypes'
import type { InterviewLandingExtras, InterviewLandingView } from '../interviewBrief/interviewLandingView'
import { interviewPageLandingView } from '../interviewBrief/interviewPageFixture'
import type { TryInterviewKitId } from './tryInterviewKits'

export const TRY_INTERVIEW_SAMPLE_ORG = 'Harbor'

export const TRY_INTERVIEW_LANDING_EXTRAS: InterviewLandingExtras = {
  ownerLabel: TRY_INTERVIEW_SAMPLE_ORG,
  coverUrl: 'https://picsum.photos/seed/vurify-interview-harbor/840/560',
  hasInProgressAttempt: false,
}

export function tryInterviewLandingView(brief: Creator2BriefDocument): InterviewLandingView {
  return interviewPageLandingView(TRY_INTERVIEW_LANDING_EXTRAS, { brief })
}

const BANNED_READER = /\bthe (?:day|sitting|board)\b/i

const HARBOR_README = `# Harbor momentum score

Harbor is a notes product. Each week the recap card prints a **momentum score** for week \`n\`.

The score is defined as:

- \`solve(0) = 0\`
- \`solve(1) = 1\`
- \`solve(n) = solve(n - 1) + solve(n - 2)\` when \`n > 1\`

That is Fibonacci. Implement \`solve(n)\` with **recursion only**. Do not use a loop or a cache.

## Examples

- \`solve(0)\` → \`0\`
- \`solve(1)\` → \`1\`
- \`solve(5)\` → \`5\`
- \`solve(10)\` → \`55\`

## Files

- \`src/solve.*\` is your function (language tabs)
- \`README.md\` is this brief
- \`tests/cases.json\` is visible cases plus hidden ones used when you Run

Copilot can propose an edit in the editor. Review it with Check or X before you keep it.
`

const HARBOR_CODING_INSTRUCTIONS =
  'Harbor prints a momentum score for week n on the recap card. Implement solve(n) so that solve(0) is 0, solve(1) is 1, and each later week is the sum of the two weeks before it. Use recursion only. Do not use a loop or a cache. Visible cases: solve(0) => 0, solve(1) => 1, solve(5) => 5. Hidden cases run when you press Run. Copilot can suggest one edit. Review it before you keep it.'

const STARTER: Record<string, string> = {
  'src/solve.ts':
    'export function solve(n: number): number {\n  // Harbor momentum score for week n. Recursion only.\n  return 0;\n}\n',
  'src/solve.py':
    'def solve(n):\n    # Harbor momentum score for week n. Recursion only.\n    return 0\n',
  'src/solve.java':
    'public class Solution {\n    public static int solve(int n) {\n        // Harbor momentum score for week n. Recursion only.\n        return 0;\n    }\n}\n',
  'src/solve.go':
    'package main\nfunc solve(n int) int {\n    // Harbor momentum score for week n. Recursion only.\n    return 0\n}\n',
  'src/solve.js':
    'function solve(n) {\n  // Harbor momentum score for week n. Recursion only.\n  return 0;\n}\n',
}

type FormArtifact = {
  inline?: {
    id?: string
    title?: string
    sections?: Array<{ id?: string; title?: string; description?: string }>
    settings?: { showHintsInTake?: boolean; shuffleQuestions?: boolean }
    answerKey?: Record<string, unknown>
    questions?: unknown[]
    schema?: string
    version?: number
  }
}

type LooseTool = {
  title?: string
  instructions?: string
  prompt?: { brief?: string; structure?: unknown; requirements?: string[] }
  answerKey?: Record<string, unknown>
  passThreshold?: unknown
  artifact?: FormArtifact & {
    inline?: { files?: Array<{ path?: string; content?: string }>; title?: string }
    docKind?: string
  }
}

function assertClean(text: string, label: string): void {
  if (BANNED_READER.test(text)) {
    throw new Error(`try sample copy uses banned reader words (${label})`)
  }
  if (/[—–]/.test(text)) {
    throw new Error(`try sample copy uses an em or en dash (${label})`)
  }
}

function overlayDefinition(doc: Creator2BriefDocument, kit: TryInterviewKitId): void {
  const role =
    kit === 'talk'
      ? 'Software engineer (talk tryout)'
      : kit === 'coding'
        ? 'Software engineer (coding tryout)'
        : 'Software engineer'
  doc.definition.meta.roleTitle = role
  doc.definition.meta.roleDescription =
    'Harbor is a notes product. This is a practice interview. Speak as yourself.'
  doc.definition.persona = {
    name: 'Maya',
    voice: 'Warm, curious, and specific',
    behaviourPrompt:
      'Be a fair, curious interviewer. Stay on this section. Ask for concrete examples. Do not hint at coding answers or form keys. Do not invent extra sections.',
  }
  doc.definition.guardrails = [
    'Do not reveal scoring criteria.',
    'Do not ask about protected-class information.',
    'Keep questions relevant to this Harbor practice interview.',
    'Do not coach the candidate during the interview.',
  ]
  doc.definition.systemGoals =
    kit === 'talk'
      ? [
          'Hear one concrete story about work they owned.',
          'Leave them with a clear close.',
        ]
      : kit === 'coding'
        ? ['See how they solve a small, well-specified function.']
        : [
            'Hear one concrete story about work they owned.',
            'See how they solve a small, well-specified function.',
            'See how they write a clear product call.',
            'Leave them with a clear close.',
          ]
  assertClean(doc.definition.meta.roleDescription, 'roleDescription')
}

function overlayTalkTopic(topic: Creator2Topic): void {
  topic.label = 'A piece of work you owned'
  topic.purpose =
    'Harbor wants one real story about work you owned from start to finish. Strong answers name the decision you made, what changed, and what you would do next time.'
  topic.behaviourPromptOverride =
    'Keep the talk on one owned piece of work. Ask for a decision, an outcome, and a lesson. Do not turn this into a security incident drill. Do not hint at what a strong answer sounds like.'
  topic.probes = [
    {
      id: 'pr.own1',
      goal: 'Tell me about a piece of work you owned from start to finish. What was the outcome?',
      hint: 'Look for a specific example with a result they can point to.',
      order: 0,
      required: true,
    },
    {
      id: 'pr.own2',
      goal: 'What was the hardest call you made on that work, and why did you pick that path?',
      hint: 'Ask for a real tradeoff, not a list of tasks.',
      order: 1,
      required: true,
    },
    {
      id: 'pr.own3',
      goal: 'If you ran it again next month, what would you change?',
      hint: 'Probe for reflection, not a recap.',
      order: 2,
      required: false,
    },
  ]
  topic.targets = [
    {
      key: 'owned_work',
      label: 'The work they owned',
      required: true,
      datatype: 'string',
      description: 'Name of the project, feature, or delivery.',
    },
    {
      key: 'hard_call',
      label: 'The hard call',
      required: true,
      datatype: 'string',
      description: 'The tradeoff they chose and why.',
    },
    {
      key: 'lesson',
      label: 'What they would change',
      required: false,
      datatype: 'string',
      description: 'A concrete lesson, not a slogan.',
    },
  ]
  topic.analysis = {
    attachPack: 'pack.talk',
    templateIds: ['iv.delivery.v1', 'iv.content.v1', 'synth.topic.v1'],
  }
  topic.maxFollowUps = 2
  topic.targetMinutes = 8
}

function overlayCloseTopic(topic: Creator2Topic): void {
  topic.label = 'Questions about Harbor'
  topic.purpose =
    'Wrap this practice interview. Invite questions about Harbor, this interview, or how marking works. Confirm they are done.'
  topic.probes = [
    {
      id: 'probe.closing.1',
      goal: 'What do you want to ask about Harbor, this interview, or how marking works?',
      hint: 'Invite remaining questions, then close.',
      order: 0,
      required: true,
    },
  ]
  topic.maxFollowUps = 1
  topic.targetMinutes = 5
}

function overlayForm(tool: LooseTool): void {
  const answerKey = {
    'q.name': { kind: 'short_text', match: 'regex', value: '.{2,}' },
    'q.email': {
      kind: 'short_text',
      match: 'regex',
      value: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      rejects: ['test@test.com', 'noreply@'],
      caseSensitive: false,
    },
    'q.auth': { kind: 'mcq_single', optionIds: ['opt.auth.yes', 'opt.auth.no'] },
    'q.sponsorship': {
      kind: 'mcq_single',
      optionIds: ['opt.sponsorship.no', 'opt.sponsorship.yes'],
    },
    'q.incident': {
      kind: 'mcq_single',
      optionIds: ['opt.incident.yes', 'opt.incident.no', 'opt.incident.talk'],
    },
    'q.experience': {
      kind: 'mcq_single',
      optionIds: ['opt.exp.0_2', 'opt.exp.3_5', 'opt.exp.6_8', 'opt.exp.9plus'],
    },
    'q.oncall': { kind: 'mcq_single', optionIds: ['opt.oncall.yes', 'opt.oncall.no'] },
    'q.day_to_day': { kind: 'short_text', match: 'regex', value: '.{10,}' },
  }
  tool.title = 'A few facts before you start'
  tool.instructions =
    'Answer a few questions so Harbor can open this practice interview. There is no seniority gate. Fill every line, then continue.'
  assertClean(tool.instructions, 'form instructions')
  tool.answerKey = answerKey
  tool.passThreshold = {
    mode: 'required_items',
    requiredQuestionIds: [
      'q.name',
      'q.email',
      'q.auth',
      'q.sponsorship',
      'q.incident',
      'q.experience',
      'q.oncall',
      'q.day_to_day',
    ],
  }
  tool.artifact = {
    ...tool.artifact,
    docKind: 'form',
    inline: {
      id: 'tf_harbor_try_intro',
      title: 'A few facts before you start',
      schema: 'vurify/test-form',
      version: 1,
      sections: [
        {
          id: 'sec.elig',
          title: 'About you',
          description:
            'This is a practice interview for a software engineer role at Harbor. Speak as yourself. Every line is required.',
        },
      ],
      settings: { showHintsInTake: false, shuffleQuestions: false },
      answerKey,
      questions: [
        {
          id: 'q.name',
          kind: 'short_text',
          points: 1,
          prompt: 'Your name',
          required: true,
          sectionId: 'sec.elig',
        },
        {
          id: 'q.email',
          kind: 'short_text',
          points: 1,
          prompt: 'Email we can show on this practice session',
          required: true,
          sectionId: 'sec.elig',
          inputFormat: 'email',
        },
        {
          id: 'q.auth',
          kind: 'mcq_single',
          points: 1,
          prompt: 'Have you used a code editor in the last year?',
          options: [
            { id: 'opt.auth.yes', label: 'Yes' },
            { id: 'opt.auth.no', label: 'No' },
          ],
          required: true,
          sectionId: 'sec.elig',
        },
        {
          id: 'q.sponsorship',
          kind: 'mcq_single',
          points: 1,
          prompt: 'Are you answering as yourself, not from a script?',
          options: [
            { id: 'opt.sponsorship.yes', label: 'Yes' },
            { id: 'opt.sponsorship.no', label: 'No' },
          ],
          required: true,
          sectionId: 'sec.elig',
        },
        {
          id: 'q.incident',
          kind: 'mcq_single',
          points: 1,
          prompt: 'Which part of this interview are you most curious to try?',
          options: [
            { id: 'opt.incident.yes', label: 'The coding challenge' },
            { id: 'opt.incident.no', label: 'The written memo' },
            { id: 'opt.incident.talk', label: 'The talk' },
          ],
          required: true,
          sectionId: 'sec.elig',
        },
        {
          id: 'q.experience',
          kind: 'mcq_single',
          points: 1,
          prompt: 'How long have you been building software?',
          options: [
            { id: 'opt.exp.0_2', label: '0-2 years' },
            { id: 'opt.exp.3_5', label: '3-5 years' },
            { id: 'opt.exp.6_8', label: '6-8 years' },
            { id: 'opt.exp.9plus', label: '9+ years' },
          ],
          required: true,
          sectionId: 'sec.elig',
        },
        {
          id: 'q.oncall',
          kind: 'mcq_single',
          points: 1,
          prompt: 'Are you ready to start this practice interview?',
          options: [
            { id: 'opt.oncall.yes', label: 'Yes' },
            { id: 'opt.oncall.no', label: 'Not yet' },
          ],
          required: true,
          sectionId: 'sec.elig',
        },
        {
          id: 'q.day_to_day',
          kind: 'short_text',
          points: 1,
          prompt: 'Name one product you used this week and one thing it does well.',
          required: true,
          sectionId: 'sec.elig',
        },
      ],
    },
  }
}

function overlayCoding(tool: LooseTool): void {
  assertClean(HARBOR_README, 'coding README')
  assertClean(HARBOR_CODING_INSTRUCTIONS, 'coding instructions')
  tool.title = 'Harbor momentum score'
  tool.instructions = HARBOR_CODING_INSTRUCTIONS
  const files = tool.artifact?.inline?.files
  if (Array.isArray(files)) {
    for (const file of files) {
      if (!file.path) continue
      if (file.path === 'README.md') file.content = HARBOR_README
      const starter = STARTER[file.path]
      if (starter) file.content = starter
    }
    if (tool.artifact?.inline) tool.artifact.inline.title = 'Harbor momentum score'
  }
}

function overlayWriting(tool: LooseTool): void {
  const instructions =
    'Write a short memo for Harbor\'s product lead. Recommend whether to ship search-in-notes as a beta this quarter. Open the Recommendation with a clear ship or wait call. Include one metric, one path you rejected, and what you would watch if you ship.'
  const brief =
    'Harbor is about to decide whether to ship search-in-notes as a beta this quarter. You have two minutes of a product lead\'s attention. Write a concise memo that opens with your ship or wait call, supports it with at least one metric and a rejected alternative, and explains what you would watch if you ship.'
  assertClean(instructions, 'writing instructions')
  assertClean(brief, 'writing brief')
  tool.title = 'Ship or wait on Harbor search'
  tool.instructions = instructions
  tool.prompt = {
    brief,
    structure: [
      {
        id: 's1',
        hint: 'What changed in the product or in how people use notes that led to this call?',
        label: 'Context',
        minParagraphs: 1,
      },
      {
        id: 's2',
        hint: 'State your ship or wait decision in the first sentence and briefly explain why.',
        label: 'Recommendation',
        minParagraphs: 1,
      },
      {
        id: 's3',
        hint: 'What could go wrong if you ship, and what would you watch to catch it early?',
        label: 'Risks',
        minParagraphs: 1,
      },
    ],
    requirements: [
      'Include at least one concrete metric that supports your recommendation.',
      'Name one alternative you considered and rejected.',
      'State a clear ship or wait call in the first sentence of the Recommendation section.',
    ],
  }
}

function pruneIncidentLibrary(doc: Creator2BriefDocument): void {
  const overrides = doc.analysis?.overrides as
    | { libraryIds?: string[]; templateCards?: Record<string, unknown> }
    | undefined
  if (!overrides || !Array.isArray(overrides.libraryIds)) return
  const drop = new Set([
    'custom.oncall-ownership',
    'custom.incident-themes',
    'custom.severity-band',
    'custom.evidence-gate',
    'custom.reviewer-note',
  ])
  overrides.libraryIds = overrides.libraryIds.filter((id) => !drop.has(id))
  if (overrides.templateCards) {
    for (const id of drop) delete overrides.templateCards[id]
  }
}

/** Rewrite sliced staff leftovers into one Harbor sample world. */
export function adaptTryInterviewScenario(
  doc: Creator2BriefDocument,
  kit: TryInterviewKitId,
): Creator2BriefDocument {
  overlayDefinition(doc, kit)
  pruneIncidentLibrary(doc)

  const form = doc.tools['tool.form.he5jad'] as LooseTool | undefined
  if (form) overlayForm(form)

  const coding = doc.tools['tool.coding.j8sx8g'] as LooseTool | undefined
  if (coding) overlayCoding(coding)

  const writing = doc.tools['tool.doc.q1bbhg'] as LooseTool | undefined
  if (writing) overlayWriting(writing)

  for (const phase of doc.phases) {
    if (phase.id === 'ph.k5wuze') {
      phase.title = 'A piece of work you owned'
      phase.estimatedMinutes = 8
      phase.summary = {
        blurb:
          'Walk through one piece of work you owned at Harbor speed: the decision, the outcome, and what you would change. Speak as yourself.',
        packLabel: 'Owned work',
      }
    }
    if (phase.id === 'ph.fi4fpq') {
      phase.title = 'A few facts before you start'
      phase.summary = {
        blurb:
          'A short form so Harbor can open this practice interview. Fill every line, then continue.',
        packLabel: 'Intro form',
      }
    }
    if (phase.id === 'ph.8xz0sd') {
      phase.title = 'Harbor momentum score'
      phase.summary = {
        blurb:
          'Write solve(n) for Harbor\'s weekly momentum score. Recursion only. Copilot can propose an edit. Review it with Check or X.',
        packLabel: 'Coding',
      }
    }
    if (phase.id === 'ph.6pltkr') {
      phase.title = 'Ship or wait on Harbor search'
      phase.summary = {
        blurb:
          'Write a short memo on whether Harbor should ship search-in-notes this quarter. Lead with the call, then evidence and risk.',
        packLabel: 'Product memo',
      }
    }
    if (phase.id === 'ph.6mvyht') {
      phase.title = 'Questions about Harbor'
      phase.summary = {
        blurb:
          'Ask anything left about Harbor, this interview, or how marking works. Then we wrap.',
        packLabel: 'Close',
      }
    }
  }

  for (const topic of doc.topicLibrary) {
    if (topic.id === 'topic.890lut') overlayTalkTopic(topic)
    if (topic.id === 'topic.qm4ypl') overlayCloseTopic(topic)
  }

  return doc
}
