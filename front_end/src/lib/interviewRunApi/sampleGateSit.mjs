/**
 * Live sit of the sample `/interview` brief — candidate from Node.
 * Talk + tool assess hit Edge when local Supabase + keys are up.
 *
 *   npm run front_end:sit:sample-gate
 *
 * Writes `.sit-last.json` beside this file (gitignored). Not a $0 unit.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function loadFrontEndEnv() {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env')
  let text = ''
  try {
    text = readFileSync(envPath, 'utf8')
  } catch {
    throw new Error(`Missing ${envPath} — copy from front_end/.env.example`)
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadFrontEndEnv()

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    store.set(k, String(v))
  },
  removeItem: (k) => {
    store.delete(k)
  },
}

const {
  INTERVIEW_PAGE_BRIEF_FIXTURE,
  interviewPageLandingView,
} = await import('../interviewBrief/interviewPageFixture.ts')
const { EDITOR_TAPE_SCHEMA } = await import('./editorCapture/types.ts')
const { saveEditorTape } = await import('./editorCapture/store.ts')
const { runCompleteSection } = await import('./completeSection.ts')
const { awaitMarkJobs } = await import('./markJobs.ts')
const { buildLiveOutputCard } = await import('./liveOutputCard.ts')
const { getInterviewResponse } = await import('./interviewResponse.ts')
const {
  runOpenAttempt,
  runRestartAttempt,
  runStartTalk,
  runTalkTurn,
} = await import('./localRunner.ts')
const { resolveGateToolMount } = await import('./resolveGateToolMount.ts')
const {
  resetTelemetrySession,
  setTelemetryPhase,
  startSessionTelemetry,
  stopSessionTelemetry,
  tickTelemetryForTests,
} = await import('./sessionTelemetry/index.ts')

const brief = INTERVIEW_PAGE_BRIEF_FIXTURE
const landing = interviewPageLandingView()
const BRIEF_ID = 'fixture:sample-gate-live-sit'
const MAX_TALK_TURNS = 3
const log = []

function note(event, extra = {}) {
  const row = { t: new Date().toISOString(), event, ...extra }
  log.push(row)
  const line = extra.text
    ? `${event}: ${String(extra.text).replace(/\s+/g, ' ').slice(0, 220)}`
    : extra.error
      ? `${event}: ${extra.error}`
      : event
  console.log(line)
}

function lastAssistant(snap) {
  const msgs = snap?.talk?.state?.messages ?? getInterviewResponse(BRIEF_ID).messages
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    if (msgs[i].role === 'assistant') return String(msgs[i].text ?? '')
  }
  return ''
}

function talkReply(phaseId, assistantText, turnIndex) {
  const ask = assistantText.toLowerCase()
  const nameAsk = /call you|what.*name|is it (ok|okay) if|preferred name/.test(ask)
  if (phaseId === 'ph.0qloid') {
    if (nameAsk || turnIndex === 0) {
      return 'Alex is good — please use Alex.'
    }
    if (turnIndex === 1) {
      return 'I came into security from platform work. Last year I owned IAM guardrails for a multi-account AWS org after a contractor leftover admin role sat unused. I wrote the deny-by-default SCP, ran it in dry-run for two weeks, then enforced it. Misconfigured admin grants dropped from 14 to 1.'
    }
    return 'The part that still interests me is detection that engineers will actually use. I paired with the runtime team on a CloudTrail → SIEM rule for unusual AssumeRole, and I cut the page noise by requiring a ticket tag before paging. That is the kind of platform-security work I want more of.'
  }
  if (phaseId === 'ph.k5wuze') {
    if (turnIndex === 0) {
      return 'Pager for payments auth went off at 2am. JWT validation was failing for a slice of traffic after a library bump. I declared a rollback of the auth service to the previous image, kept the new build on a canary host, and told the on-call PM we would lose new-device logins for about eight minutes. Conversion held; error rate went from 12% to under 0.4%.'
    }
    if (turnIndex === 1) {
      return 'I personally made the rollback call. The other engineer wanted to hotfix forward because the canary looked clean. I rejected that because we did not have a reproduction on the canary population. After we were stable I owned the postmortem: pin the library, add a contract test on token clock-skew, and change the deploy checklist so auth bumps need a second reviewer.'
    }
    return 'What I would do differently is freeze the canary percentage until the contract test is green, not after the page. The decision was still mine; I just would have given myself a cheaper off-ramp.'
  }
  if (turnIndex === 0) {
    return 'No questions that change the loop. The ownership talk and the memo were the parts I would keep if you shortened the sitting. Thanks for the time.'
  }
  if (turnIndex === 1) {
    return 'I am comfortable with the on-call expectation we covered. If there is a follow-up, I can walk a threat model for the IAM change in more depth.'
  }
  return 'That is all from me.'
}

function fillForm(phaseId) {
  const mount = resolveGateToolMount({ brief, phaseId })
  if (!mount || mount.kind !== 'form') return null
  const responses = {}
  for (const q of mount.document.questions ?? []) {
    if (q.kind === 'short_text' || q.kind === 'essay') {
      const prompt = String(q.prompt ?? '').toLowerCase()
      let value = 'Alex Chen'
      if (prompt.includes('email')) value = 'alex.chen@example.com'
      else if (prompt.includes('day') || prompt.length > 40) {
        value =
          'I design controls with the owning team, review the change, and stay on the first production window.'
      }
      responses[q.id] = { kind: q.kind, value }
      continue
    }
    if (q.kind === 'mcq_single' || q.kind === 'dropdown') {
      const prompt = String(q.prompt ?? '').toLowerCase()
      const opts = q.options ?? []
      const yes = opts.find((o) => /^yes$/i.test(o.label))
      const no = opts.find((o) => /^no$/i.test(o.label))
      let optionId = opts[0]?.id ?? null
      if (prompt.includes('sponsor')) optionId = no?.id ?? optionId
      else if (prompt.includes('experience')) {
        optionId =
          opts.find((o) => /6|9|8|\+|plus/i.test(o.label))?.id ?? opts.at(-1)?.id ?? optionId
      } else if (yes) optionId = yes.id
      responses[q.id] = { kind: q.kind, optionId }
    }
  }
  return {
    kind: 'form',
    document: {
      ...mount.document,
      attempt: { startedAt: new Date().toISOString(), submittedAt: new Date().toISOString(), responses },
    },
  }
}

function patchSolve(content, path) {
  if (path.endsWith('solve.ts') && content.includes('export function solve')) {
    return `export function solve(n: number): number {
  if (n <= 0) return 0
  if (n === 1) return 1
  return solve(n - 1) + solve(n - 2)
}
`
  }
  if (path.endsWith('solve.ts') && content.includes('twoSum')) {
    return `export function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>()
  for (let i = 0; i < nums.length; i += 1) {
    const want = target - nums[i]
    if (seen.has(want)) return [seen.get(want), i]
    seen.set(nums[i], i)
  }
  return []
}
`
  }
  if (path.endsWith('solve.py') && content.includes('def solve')) {
    return `def solve(n):
    if n <= 0:
        return 0
    if n == 1:
        return 1
    return solve(n - 1) + solve(n - 2)
`
  }
  if (path.endsWith('solve.py') && content.includes('twoSum')) {
    return `def twoSum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        want = target - n
        if want in seen:
            return [seen[want], i]
        seen[n] = i
    return []
`
  }
  return content
}

function fillCoding(phaseId) {
  const mount = resolveGateToolMount({ brief, phaseId })
  if (!mount || mount.kind !== 'coding') return null
  const files = (mount.workspace.files ?? []).map((f) => ({
    ...f,
    content: patchSolve(f.content, f.path),
  }))
  return { kind: 'coding', payload: { ...mount.workspace, files }, activeLanguage: 'typescript' }
}

function fillDoc(phaseId) {
  const mount = resolveGateToolMount({ brief, phaseId })
  if (!mount || mount.kind !== 'doc') return null
  const markdown = `## Context
Activation for the beta cohort stalled at 18% last month, down from 31% the month before. Sales is asking to ship the self-serve invite this quarter so they can run a 400-account outbound sprint. Engineering still has an open P0 on invite-token reuse.

## Recommendation
Ship the beta this quarter with the invite token scoped to a single use and a 24-hour expiry. Waiting another quarter would miss the outbound window, and the 18% activation drop is already a louder signal than the remaining polish items. I rejected a full wait until the P0 backlog is empty because that work is not on the invite path.

## Risks
If we ship, reused tokens could let one invite create multiple seats. I would watch unique-token redemption vs seats created, and page if the ratio drops below 0.95 for two consecutive hours. I would also watch activation for the outbound cohort against the 31% baseline. If redemption integrity fails, we disable self-serve invites and fall back to manual CSV upload without rolling back the rest of the beta.`
  return {
    kind: 'doc',
    payload: { ...mount.document, markdown, title: mount.title ?? 'Memo' },
  }
}

function plantTape(phaseId, kind) {
  const attemptId = getInterviewResponse(BRIEF_ID).attemptId
  const final = { kind }
  saveEditorTape({
    schema: EDITOR_TAPE_SCHEMA,
    schemaVersion: 1,
    briefId: BRIEF_ID,
    attemptId,
    phaseId,
    kind,
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationMs: 90_000,
    initial: final,
    events: [
      { t: 0, type: 'checkpoint', checkpoint: final },
      { t: 90_000, type: 'session_end' },
    ],
    final,
  })
}

function artifactFor(phaseId, toolKind) {
  if (toolKind === 'form') return fillForm(phaseId)
  if (toolKind === 'coding') return fillCoding(phaseId)
  if (toolKind === 'doc') return fillDoc(phaseId)
  return null
}

async function sitTalk(phaseId) {
  let snap = await runStartTalk({ briefId: BRIEF_ID, landing, phaseId, brief })
  note('talk_open', { phaseId, text: lastAssistant(snap) })
  for (let i = 0; i < MAX_TALK_TURNS; i += 1) {
    if (snap.talk?.canPass) break
    const assistant = lastAssistant(snap)
    const text = talkReply(phaseId, assistant, i)
    note('candidate', { phaseId, text })
    try {
      snap = await runTalkTurn({ briefId: BRIEF_ID, landing, text, brief })
      const err = snap.talk?.error
      if (err) {
        note('talk_error', { phaseId, error: err })
        break
      }
      note('bot', { phaseId, text: lastAssistant(snap) })
    } catch (e) {
      note('talk_error', { phaseId, error: e instanceof Error ? e.message : String(e) })
      break
    }
  }
  const done = await runCompleteSection({
    briefId: BRIEF_ID,
    landing,
    phaseId,
    brief,
    stageStarted: true,
    isTalk: true,
  })
  await awaitMarkJobs()
  note('next', { phaseId, mode: done.snapshot?.mode })
  return done.snapshot
}

async function sitTool(phaseId, toolKind) {
  plantTape(phaseId, toolKind)
  const artifact = artifactFor(phaseId, toolKind)
  const done = await runCompleteSection({
    briefId: BRIEF_ID,
    landing,
    phaseId,
    brief,
    stageStarted: true,
    isTalk: false,
    artifact,
  })
  if (done.assessError) note('assess_error', { phaseId, error: done.assessError })
  await awaitMarkJobs()
  note('next', { phaseId, mode: done.snapshot?.mode, toolKind })
  return done.snapshot
}

async function play() {
  runRestartAttempt({ briefId: BRIEF_ID, landing, brief })
  const attemptId = getInterviewResponse(BRIEF_ID).attemptId
  startSessionTelemetry({
    briefId: BRIEF_ID,
    attemptId,
    phaseId: brief.phases[0].id,
  })
  try {
    let snap = runOpenAttempt({ briefId: BRIEF_ID, landing, brief })
    const visited = []
    while (snap.mode === 'gate' && snap.gate) {
      const phaseId = snap.gate.phaseId
      visited.push(phaseId)
      if (visited.length > 8) throw new Error('gate loop')
      setTelemetryPhase(phaseId)
      tickTelemetryForTests(2000)
      note('gate', { phaseId, title: snap.gate.title, isTalk: snap.gate.isTalk })
      if (snap.gate.isTalk) snap = await sitTalk(phaseId)
      else snap = await sitTool(phaseId, snap.gate.toolKind)
    }
    await awaitMarkJobs()
    const pack = buildLiveOutputCard({ briefId: BRIEF_ID, brief })
    const response = getInterviewResponse(BRIEF_ID)
    const out = {
      mode: snap.mode,
      visited,
      completedPhaseIds: [...response.completedPhaseIds],
      skippedPhaseIds: [...response.skippedPhaseIds],
      attemptId: response.attemptId,
      talkError: log.filter((r) => r.event === 'talk_error'),
      assessError: log.filter((r) => r.event === 'assess_error'),
      sittingRead: pack.overview.sittingSections,
      formGate: pack.scored.formGate,
      softGrade: Object.fromEntries(
        Object.entries(pack.scored.softGrade.byWeight ?? {}).map(([k, v]) => [
          k,
          { unit: v.unit, included: v.included, summary: v.summary },
        ]),
      ),
      signals: Object.fromEntries(
        Object.entries(response.analysis.signals ?? {}).map(([k, g]) => [
          k,
          { status: g.status, boardSummary: g.result?.boardSummary ?? g.justification },
        ]),
      ),
      transcript: log,
    }
    const dest = join(dirname(fileURLToPath(import.meta.url)), '.sit-last.json')
    writeFileSync(dest, JSON.stringify(out, null, 2))
    console.log(`wrote ${dest}`)
    console.log(JSON.stringify({ mode: out.mode, visited: out.visited, sittingRead: out.sittingRead }, null, 2))
    return out
  } finally {
    stopSessionTelemetry()
    resetTelemetrySession()
  }
}

await play()
