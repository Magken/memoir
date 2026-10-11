/**
 * Gate tool mount + stage assist context + hard timer math.
 * Run: npx tsx front_end/src/lib/interviewRunApi/gateMountsAssist.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveGateToolMount, candidateCodingWorkspace } from './resolveGateToolMount.ts'
import { buildStageAssistContext } from './buildStageAssistContext.ts'
import { inferAssistSituation } from './inferAssistSituation.ts'
import { formatHardTimerMmSs, hardTimerRemainingMs } from './hardTimerMath.ts'
import { sanitizeCodingLiveComposition } from './sanitizeLiveComposition.ts'
import { listWorkingSrcFiles } from '../interviewBrief/codingWorkspaceFiles.ts'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(here, '../interviewBrief/fixtures/creator2ComprehensiveBrief.json'),
    'utf8',
  ),
)

{
  const mount = resolveGateToolMount({ brief: fixture, phaseId: 'ph.eligible' })
  assert.ok(mount && mount.kind === 'form', 'form mount')
  const raw = JSON.stringify(mount.document)
  assert.ok(!/answerKey/i.test(raw), 'form mount must strip answerKey')
  assert.ok((mount.document.questions?.length ?? 0) >= 1, 'questions present')
}

{
  const mount = resolveGateToolMount({ brief: fixture, phaseId: 'ph.code' })
  if (mount?.kind === 'coding') {
    const raw = JSON.stringify(mount)
    assert.ok(!/referenceSolution/i.test(raw), 'no referenceSolution')
    assert.ok(
      !(mount.workspace.files ?? []).some((f) => /reference/i.test(f.path)),
      'no reference paths',
    )
    assert.ok(
      !(mount.workspace.files ?? []).some((f) => /(^|\/)cases\.json$/i.test(f.path)),
      'candidate workspace must not include cases.json',
    )
    assert.ok(mount.briefMarkdown.trim().length > 0, 'brief markdown from README + visible cases')
    assert.ok(Array.isArray(mount.runTests.cases) && mount.runTests.cases.length > 0, 'runTests for Run')
    assert.ok(
      mount.runTests.cases.every((c) => !c.hidden),
      'candidate Run must only load visible cases',
    )
    assert.equal(
      mount.runTests.cases.length,
      mount.visibleSampleCases.length,
      'runTests matches visible samples',
    )
    for (const c of mount.visibleSampleCases) {
      if (c.description) {
        assert.equal(typeof c.description, 'string', 'sample description from case')
      }
    }
  } else {
    assert.fail('coding mount expected for ph.code')
  }
}

{
  const stripped = structuredClone(fixture)
  const tool = stripped.tools?.['t.code'] ?? stripped.tools?.[Object.keys(stripped.tools ?? {}).find((k) => stripped.tools[k]?.type === 'coding')]
  if (tool?.artifact?.inline?.files) {
    for (const f of tool.artifact.inline.files) {
      if (String(f.path).replace(/\\/g, '/') === 'README.md') f.content = ''
    }
    tool.instructions = 'You will implement solve. Hidden cases also grade the return value.'
    const mount = resolveGateToolMount({ brief: stripped, phaseId: 'ph.code' })
    assert.ok(mount?.kind === 'coding')
    assert.ok(mount.readmeMarkdown.includes('You will implement solve'), 'empty README falls back to instructions')
  }
}

{
  const packed = candidateCodingWorkspace({
    workspace: {
      files: [
        { path: 'src/solve.ts', language: 'typescript', content: 'import { parse } from "./parse"\n' },
        { path: 'src/parse.ts', language: 'typescript', content: 'export function parse() {}\n' },
        { path: 'README.md', language: 'markdown', content: '# Parse and sum\n' },
        { path: 'tests/cases.json', language: 'json', content: '{}\n' },
        { path: 'tests/reference/solve.ts', language: 'typescript', content: '// oracle\n' },
        { path: 'src/hidden/secret.ts', language: 'typescript', content: 'x\n' },
      ],
      folders: ['src', 'tests', 'src/hidden'],
      openIds: ['src/solve.ts', 'tests/cases.json'],
      activeId: 'src/solve.ts',
    },
    tests: {
      runner: 'hidden_cases_v1',
      entryPoint: 'solve',
      referenceSolution: null,
      cases: [
        {
          id: 't1',
          name: 'basic',
          args: [1],
          expected: 1,
          hidden: false,
          covers: ['src/parse.ts', 'src/solve.ts'],
        },
        { id: 't2', name: 'hidden', args: [2], expected: 2, hidden: true },
      ],
    },
  })
  const paths = (packed.workspace.files ?? []).map((f) => f.path)
  assert.ok(paths.includes('src/parse.ts'), 'helpers stay on candidate mount')
  assert.ok(paths.includes('src/solve.ts'))
  assert.ok(!paths.some((p) => /cases\.json$/i.test(p)), 'strip cases.json')
  assert.ok(!paths.some((p) => /reference/i.test(p)), 'strip reference')
  assert.ok(!paths.some((p) => /\/hidden\//i.test(p)), 'strip /hidden')
  assert.ok(listWorkingSrcFiles(packed.workspace, 'typescript').length > 1)
  assert.ok(
    packed.workspace.openIds?.includes('src/parse.ts'),
    'candidate tabs open every src/ file of the language group',
  )
  assert.ok(packed.workspace.openIds?.includes('src/solve.ts'))
  assert.equal(listWorkingSrcFiles({ files: packed.workspace.files?.filter((f) => f.path === 'src/solve.ts') }, 'typescript').length, 1)
  assert.equal(packed.runTests.cases.length, 1)
}

{
  const files = Array.from({ length: 18 }, (_, i) => ({
    path: i === 0 ? 'src/solve.ts' : `src/h${i}.ts`,
    language: 'typescript',
    content: `export const n${i} = ${i}\n`,
  }))
  const snap = sanitizeCodingLiveComposition(
    { files, activeId: 'src/solve.ts' },
    { focusPath: 'src/solve.ts', attachedPaths: ['src/h1.ts'] },
  )
  const tree = snap.snapshot.tree
  const listed = snap.snapshot.files
  assert.ok(Array.isArray(tree) && tree.length === 18, 'tree lists every path')
  assert.ok(Array.isArray(listed) && listed.length === 16, 'bodies cap at CODE_FILE_MAX')
  assert.equal(snap.snapshot.focusPath, 'src/solve.ts')
  assert.ok(
    Array.isArray(snap.snapshot.attachedFiles) &&
      snap.snapshot.attachedFiles.some((f) => f.path === 'src/h1.ts'),
    'attached helper is in the working set',
  )
}

{
  const mount = resolveGateToolMount({ brief: fixture, phaseId: 'ph.essay' })
  assert.ok(mount && mount.kind === 'doc', 'doc mount')
  assert.ok(mount.prompt.brief.trim().length > 0, 'writing prompt brief')
  assert.equal(mount.document.pageSetup.pageSize, 'pageless', 'candidate essay is pageless')
  assert.ok(
    !/##\s*Rubric\s*\(author only\)/i.test(String(mount.document.markdown ?? '')) &&
      !/##\s*Marking matrix/i.test(String(mount.document.markdown ?? '')),
    'candidate doc strips author rubric / marking matrix scaffold',
  )
  assert.match(String(mount.document.markdown ?? ''), /###\s*Approach/i, 'sitting editor keeps outline template')
  assert.doesNotMatch(String(mount.document.markdown ?? ''), /##\s*Prompt\b/i, 'prompt stays in prep chrome')
  assert.doesNotMatch(String(mount.document.markdown ?? ''), /:::doc-page-break/)
}

{
  const staff = JSON.parse(
    readFileSync(
      join(here, '../interviewBrief/fixtures/staffSecurityEngineer80mHardenedLoop.json'),
      'utf8',
    ),
  )
  const mount = resolveGateToolMount({ brief: staff, phaseId: 'ph.v35g7z' })
  assert.ok(mount && mount.kind === 'doc', 'staff writing mount')
  assert.match(String(mount.document.markdown ?? ''), /Rate limiter/i, 'keeps seed markdown in editor')
}

{
  const { toolKindFromGateLabel } = await import('./resolveGateToolMount.ts')
  assert.equal(toolKindFromGateLabel('Form'), 'form')
  assert.equal(toolKindFromGateLabel('Coding'), 'coding')
  assert.equal(toolKindFromGateLabel('Writing'), 'doc', 'Writing label maps to doc mount kind')
  assert.equal(toolKindFromGateLabel('Talk'), null)
  assert.equal(toolKindFromGateLabel('Conversation'), null)
}

{
  const ctx = buildStageAssistContext({
    briefId: 'brief.test',
    brief: fixture,
    phaseId: 'ph.eligible',
    timed: true,
    limitMinutes: 10,
  })
  assert.ok(ctx, 'assist context')
  assert.equal(ctx.kind, 'form')
  assert.equal(ctx.candidate, null, 'no CV when not passed')
  assert.equal(ctx.day.continuing, false, 'no day continuity by default')
  assert.ok(ctx.referenceIndex.some((r) => r.ref.startsWith('q.')), 'q. refs')
  assert.ok(ctx.chromeMap.regions.some((r) => r.id === 'questions'), 'chrome')
  assert.ok(ctx.markingMap.summary.length > 10, 'marking summary')
  assert.ok(!JSON.stringify(ctx).includes('"answerKey"'), 'ctx no answerKey')
  assert.ok(ctx.privileges, 'privileges bundle on interviewer context')
  assert.equal(typeof ctx.privileges.bundleId, 'string')
  assert.equal(typeof ctx.privileges.caps.chat, 'boolean')
}

{
  const ctx = buildStageAssistContext({
    briefId: 'brief.test',
    brief: fixture,
    phaseId: 'ph.code',
    timed: false,
    limitMinutes: null,
  })
  assert.ok(ctx && ctx.kind === 'coding')
  assert.equal(typeof ctx.document.readmeMarkdown, 'string', 'coding README in always-on document')
}

{
  const ctx = buildStageAssistContext({
    briefId: 'brief.test',
    brief: fixture,
    phaseId: 'ph.essay',
    timed: false,
    limitMinutes: null,
  })
  assert.ok(ctx && ctx.kind === 'doc', 'doc assist context')
  assert.equal(typeof ctx.document.seedBody, 'string', 'writing seed body in document')
  assert.ok(
    ctx.referenceIndex.some((r) => r.ref.startsWith('rubric.') || r.ref.startsWith('prompt.')),
    'doc refs',
  )
}

{
  const ctx = buildStageAssistContext({
    briefId: 'brief.test',
    brief: fixture,
    phaseId: 'ph.eligible',
    timed: true,
    limitMinutes: 10,
    candidateCv: {
      hasCv: true,
      preferredName: 'Jordan',
      displayName: 'Jordan Lee',
      note: 'Candidate: preferred "Jordan" (display "Jordan Lee").',
    },
  })
  assert.ok(ctx?.candidate, 'candidate from CV')
  assert.equal(ctx.candidate.preferredName, 'Jordan')
  assert.ok(ctx.candidate.note.includes('Jordan'), 'CV note present')
}

{
  const { buildAssistDayContinuity } = await import('./buildAssistDayContinuity.ts')
  const { emptyInterviewResponse } = await import('./interviewResponse.ts')
  const base = emptyInterviewResponse('fixture:assist-day')
  const response = {
    ...base,
    messages: [
      {
        id: 't1',
        phaseId: 'ph.own',
        topicId: 'topic.own',
        role: 'assistant',
        text: 'What motivates you in security work?',
        at: '2026-01-01T00:00:00.000Z',
        probeId: 'p1',
        kind: 'opener',
      },
      {
        id: 't2',
        phaseId: 'ph.own',
        topicId: 'topic.own',
        role: 'candidate',
        text: 'I care about platform hardening and reducing auth risk.',
        at: '2026-01-01T00:01:00.000Z',
        probeId: 'p1',
        kind: 'answer',
      },
      {
        id: 'a1',
        phaseId: 'ph.eligible',
        topicId: null,
        role: 'assistant',
        text: 'Next up is Eligibility.',
        at: '2026-01-01T00:02:00.000Z',
        probeId: null,
        kind: 'assist',
      },
    ],
  }
  const day = buildAssistDayContinuity({
    response,
    currentPhaseId: 'ph.eligible',
    previousSectionTitle: 'Motivation and interests',
  })
  assert.equal(day.continuing, true)
  assert.equal(day.previousSectionTitle, 'Motivation and interests')
  assert.ok(day.priorNote && /platform hardening|auth risk/i.test(day.priorNote), 'prior Talk in note')
  assert.ok(
    day.dayHistoryTail.some((m) => m.phaseId === 'ph.own' && m.role === 'candidate'),
    'day history has Talk turns',
  )
  assert.ok(
    !day.dayHistoryTail.some((m) => m.phaseId === 'ph.eligible'),
    'current assist phase excluded from dayHistoryTail',
  )

  const withDay = buildStageAssistContext({
    briefId: 'brief.test',
    brief: fixture,
    phaseId: 'ph.eligible',
    timed: true,
    limitMinutes: 10,
    dayContinuity: day,
  })
  assert.ok(withDay?.day.continuing)
  assert.equal(withDay.day.previousSectionTitle, 'Motivation and interests')
}

{
  const now = 1_000_000
  assert.equal(hardTimerRemainingMs(now + 65_000, now), 65_000)
  assert.equal(hardTimerRemainingMs(now - 1, now), 0)
  assert.equal(formatHardTimerMmSs(65_000), '01:05')
  assert.equal(formatHardTimerMmSs(0), '00:00')
}

{
  const { composeAssistOpenerUtterance } = await import('./composeAssistOpenerUtterance.ts')
  const open = composeAssistOpenerUtterance({
    title: 'Eligibility & Work Authorization Screening',
    description:
      'Complete this required eligibility and work authorization screening before proceeding to the main interview. All items must be passed to continue.',
    kind: 'form',
    timed: true,
    limitMinutes: 6,
    seed: 't1',
    personaName: 'Morgan',
    preferredName: 'Jordan',
    previousTitle: 'Opening: recent platform work',
  })
  assert.ok(!/^Hi Jordan\b|^Hey Jordan\b/i.test(open), 'no mid-day Hi {name} reintro')
  assert.ok(!/\bI'm Morgan\b|\bI am Morgan\b/i.test(open), 'no persona reintro on assist opener')
  assert.ok(/Thanks for (completing|wrapping up)|Appreciate you finishing/i.test(open), 'thanks prior section')
  assert.ok(/recent platform work|Opening/i.test(open), 'names prior section')
  assert.ok(/Eligibility/i.test(open), 'names section')
  assert.ok(!/You are on /i.test(open), 'not cold status line')
  assert.ok(!/Ask me where/i.test(open), 'no meta assist brochure')
  assert.ok(!/All items must be passed/i.test(open), 'no gate jargon dump')
  assert.ok(!/\bI am \w+ in chat\b/i.test(open), 'no "I am Name in chat" slop')
  assert.ok(/unpack|clarify|plain language|confusing|unclear/i.test(open), 'clarifier invite')
  assert.ok(!/\bApply\b/i.test(open), 'fallback opener must not teach Apply')
  assert.ok(!/[\u2014\u2013]/.test(open), 'opener must not use em/en dashes')
  assert.ok(!/\bdump\b/i.test(open), 'opener must not say dump')
  assert.ok(!/named slice|helper chat/i.test(open), 'opener must not use catalog jargon')
  assert.ok(/[.?]$/.test(open.trim()), 'ends sentence')
}

{
  const { composeAssistOpenerUtterance } = await import('./composeAssistOpenerUtterance.ts')
  const copilotFirst = composeAssistOpenerUtterance({
    title: 'Eligibility & Work Authorization Screening',
    kind: 'form',
    seed: 'copilot-first',
    bundleId: 'copilot',
    personaName: 'Morgan',
  })
  assert.ok(/^(Hi|Hello)\b/i.test(copilotFirst), 'first-assessment Copilot peel greets')
  assert.ok(/I'm Morgan|I am Morgan/i.test(copilotFirst), 'first-assessment intro names the persona')
  assert.ok(!/Next up is|We're moving into|This next piece is|Thanks for (completing|wrapping up)|Appreciate you finishing/i.test(copilotFirst), 'first assessment is not a handoff')
  assert.ok(!/\bApply\b/i.test(copilotFirst), 'Copilot opener must not teach Apply')
  assert.ok(/Check or X/i.test(copilotFirst), 'Copilot opener mentions Check or X')
  assert.ok(!/three required|preferred contact email/i.test(copilotFirst), 'fallback must not dump stems')
}

{
  const { composeAssistOpenerUtterance } = await import('./composeAssistOpenerUtterance.ts')
  const handoff = composeAssistOpenerUtterance({
    title: 'Eligibility',
    kind: 'form',
    seed: 'handoff',
    previousTitle: 'Opening',
    personaName: 'Morgan',
  })
  assert.ok(!/^(Hi|Hello)\b/i.test(handoff), 'negative: mid-day handoff still has no Hi')
  assert.ok(/Next up is|We're moving into|This next piece is/i.test(handoff), 'mid-day still hands off')
}

{
  assert.equal(inferAssistSituation('Give me the answer'), 'refuse_spoiler')
  assert.equal(
    inferAssistSituation('Give me the answer', { spoilers: true }),
    'narrow_slice',
  )
  assert.equal(inferAssistSituation('please solve it for me', { spoilers: true }), 'narrow_slice')
  assert.equal(inferAssistSituation('give me a hint'), 'refuse_spoiler')
  assert.equal(inferAssistSituation('am I on the right track'), 'refuse_spoiler')
  assert.equal(
    inferAssistSituation('show me how to implement a for loop', { spoilers: true }),
    'clarify',
  )
  assert.equal(inferAssistSituation('yes pls'), 'clarify')
  assert.equal(inferAssistSituation('yes please'), 'clarify')
  assert.equal(inferAssistSituation('continue'), 'clarify')
  assert.equal(inferAssistSituation('Where is the file tree?'), 'navigate')
  assert.equal(inferAssistSituation('What does this question mean?'), 'restate')
  assert.equal(inferAssistSituation('its confusing'), 'restate')
  assert.equal(inferAssistSituation('what is question 3'), 'clarify')
  assert.equal(inferAssistSituation('restate that question'), 'restate')
  assert.equal(inferAssistSituation('How is this marked?'), 'marking')
  assert.equal(inferAssistSituation('do you know who I am?'), 'clarify')
  assert.equal(inferAssistSituation('Hmm'), 'clarify')
}

{
  const sanitizeSrc = readFileSync(join(here, 'sanitizeLiveComposition.ts'), 'utf8')
  assert.equal(/editorApply/.test(sanitizeSrc), false, 'snapshot notes must not teach editorApply')
}

console.log('gateMountsAssist.unit: ok')
