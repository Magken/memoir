import assert from 'node:assert/strict'
import { applyCopilotOps } from './copilotApply.ts'
import { mergeCodingLiveAssist, applyCopilotPendingOps } from './applyLiveEditorAssist.ts'
import { keepCopilotPlanningParts, mapCopilotReplyParts } from './mapCopilotReplyParts.ts'
import { inferCopilotIntent } from './inferCopilotIntent.ts'
import { revealEssayRange } from '../docEditor/revealEssayRange.ts'
import { copilotApplyEnabled, latestCopilotPendingMessageId } from './copilotPendingChrome.ts'

{
  const coding = {
    kind: 'coding',
    generation: 1,
    snapshotHash: 'h',
    coding: { files: [{ path: 'src/parse.ts', content: 'return 1' }] },
  }
  const r = applyCopilotOps(coding, [
    { op: 'search_replace', path: 'src/parse.ts', old: 'return 1', new: 'return []' },
  ])
  assert.equal(r.ok, true)
}

{
  const essay = {
    kind: 'doc',
    generation: 1,
    snapshotHash: 'h',
    doc: { markdown: 'helo\n' },
  }
  const after = applyCopilotOps(
    essay,
    [{ op: 'search_replace', old: 'helo', new: 'the fox jumps over the fence' }],
    { peelAsk: 'after helo' },
  )
  assert.equal(after.ok, true)
  assert.ok(String(after.doc.doc.markdown).includes('helo'))
  assert.ok(String(after.doc.doc.markdown).includes('the fox jumps over the fence'))
}

{
  const payload = { files: [{ path: 'a.ts', language: 'ts', content: 'x' }], openIds: ['a.ts'], activeId: 'a.ts' }
  const created = mergeCodingLiveAssist(payload, [{ path: 'b.ts', contents: 'export {}' }], { create: true })
  assert.equal(created.applied, 1)
  assert.ok(created.payload.files.some((f) => f.path === 'b.ts'))
  assert.equal(
    created.payload.files.find((f) => f.path === 'b.ts')?.language,
    'typescript',
    'created .ts files are typescript, not plaintext',
  )
}

{
  const parts = mapCopilotReplyParts([
    { type: 'markdown', text: 'Proposed: mark Yes.' },
    { type: 'card', title: 'Go to question', intent: 'scroll', actionId: 'copilot.action.go-to-question', body: 'q.a' },
  ])
  assert.equal(parts.some((p) => p.type === 'thinking'), false)
  assert.ok(parts.some((p) => p.type === 'divider' && p.label === 'Actions'))
  assert.equal(
    parts.some((p) => p.type === 'card' && p.actions?.some((a) => a.actionId === 'copilot.action.apply-pending')),
    false,
  )
  const go = parts.find((p) => p.type === 'card' && p.presentation === 'links')
  assert.ok(go && go.type === 'card')
  assert.equal(go.actions?.[0]?.actionId, 'copilot.action.go-to-question')
}

{
  const none = mapCopilotReplyParts([{ type: 'markdown', text: 'Here is the prompt in plain terms.' }])
  assert.equal(none.some((p) => p.type === 'divider'), false)
  const fromMarkdownField = mapCopilotReplyParts([
    { type: 'markdown', markdown: 'Fallback markdown field.' },
  ])
  const mdField = fromMarkdownField.find((p) => p.type === 'markdown')
  assert.ok(mdField && mdField.type === 'markdown')
  assert.match(mdField.markdown, /Fallback markdown field/)
}

{
  const listed = mapCopilotReplyParts([
    {
      type: 'markdown',
      text: 'Lead sentence.\n- first helper\n- second helper',
    },
  ])
  const md = listed.find((p) => p.type === 'markdown')
  assert.ok(md && md.type === 'markdown')
  assert.match(md.markdown, /Lead sentence\.\n\n- first helper\n- second helper/)
  assert.equal(/Lead sentence\. - first/.test(md.markdown), false)
}

{
  assert.equal(inferCopilotIntent('help me').kind, 'assist')
  assert.equal(inferCopilotIntent('what does this mean').kind, 'assist')
  assert.equal(inferCopilotIntent('fix my code').kind, 'edit')
  assert.equal(inferCopilotIntent("what's the answer").kind, 'spoiler')
  assert.equal(inferCopilotIntent("what's the answer", { spoilers: true }).kind, 'assist')
  assert.equal(inferCopilotIntent("what's the answer", { spoilers: true, write: true }).kind, 'edit')
  assert.equal(inferCopilotIntent('solve it for me', { write: true }).kind, 'edit')
  assert.equal(inferCopilotIntent('implement the entire solution').kind, 'edit')
  assert.equal(inferCopilotIntent('help me with this').kind, 'ambiguous')
  assert.equal(inferCopilotIntent('mark work authorization Yes').kind, 'edit')
  const write = { write: true, spoilers: true }
  assert.equal(inferCopilotIntent('add a guard in parse.ts', write).kind, 'edit')
  assert.equal(inferCopilotIntent('help me implement parse.ts', write).kind, 'edit')
  assert.equal(inferCopilotIntent('put this in the editor', write).kind, 'edit')
  assert.equal(inferCopilotIntent('propose an edit', write).kind, 'edit')
  assert.equal(inferCopilotIntent('pls write the fox humps over the fence', write).kind, 'edit')
  assert.equal(inferCopilotIntent('add it to the document', write).kind, 'edit')
  assert.equal(
    inferCopilotIntent('help me implement parse.ts', { write: false, spoilers: true }).kind,
    'assist',
  )
}

{
  const msgs = [
    { id: 'a', role: 'assistant', pendingStatus: 'pending', editRunId: '1' },
    { id: 'b', role: 'assistant', pendingStatus: 'pending', editRunId: '2' },
  ]
  assert.equal(latestCopilotPendingMessageId(msgs), 'b')
  assert.equal(copilotApplyEnabled({ messages: msgs, messageId: 'a', liveEditRunId: '1' }), false)
  assert.equal(copilotApplyEnabled({ messages: msgs, messageId: 'b', liveEditRunId: '2' }), true)
  const applied = [{ id: 'b', role: 'assistant', pendingStatus: 'applied', editRunId: '2' }]
  assert.equal(copilotApplyEnabled({ messages: applied, messageId: 'b', liveEditRunId: '2' }), false)
  const expired = [
    { id: 'old', role: 'assistant', pendingStatus: 'expired', editRunId: '1' },
    { id: 'user', role: 'candidate', pendingStatus: null },
  ]
  assert.equal(copilotApplyEnabled({ messages: expired, messageId: 'old' }), false)
}

{
  const kept = keepCopilotPlanningParts(
    [
      {
        type: 'planning',
        title: 'Questions',
        questions: [{ id: 'q.bite_size', prompt: 'slice?', kind: 'single' }],
        editRunId: 'run-1',
      },
    ],
    [{ type: 'markdown', markdown: 'Answer in the Questions sheet.' }],
  )
  assert.ok(kept.some((p) => p.type === 'planning'))
  assert.ok(kept.some((p) => p.type === 'markdown'))
}

{
  assert.equal(revealEssayRange(null, { search: 'x' }), false)
}

{
  let loaded = null
  const result = await applyCopilotPendingOps({
    kind: 'coding',
    write: true,
    ops: [{ op: 'create_file', path: 'n.ts', contents: 'export {}' }],
    getContext: () => ({ files: [{ path: 'a.ts', language: 'ts', content: 'x' }], openIds: ['a.ts'], activeId: 'a.ts' }),
    loadContext: (p) => {
      loaded = p
    },
  })
  assert.equal(result.ok, true)
  assert.ok(loaded.files.some((f) => f.path === 'src/n.ts'), 'bare create_file lands under src/')
}

{
  const miss = applyCopilotOps(
    {
      kind: 'coding',
      generation: 1,
      snapshotHash: 'h',
      coding: { files: [{ path: 'src/parse.ts', content: 'export function n() { return 1 }\n' }] },
    },
    [{ op: 'search_replace', path: 'src/parse.ts', old: '  return 1  ', new: 'return []' }],
  )
  assert.equal(miss.ok, true, 'whitespace-normalized search_replace retries once')
  const still = applyCopilotOps(
    {
      kind: 'coding',
      generation: 1,
      snapshotHash: 'h',
      coding: { files: [{ path: 'src/parse.ts', content: 'export function n() { return 1 }\n' }] },
    },
    [{ op: 'search_replace', path: 'src/parse.ts', old: 'NOPE_NOT_HERE', new: 'x' }],
  )
  assert.equal(still.ok, false)
  assert.equal(still.failed[0].code, 'no_match')
}

{
  const empty = await applyCopilotPendingOps({
    kind: 'coding',
    write: true,
    ops: [],
    getContext: () => ({ files: [] }),
    loadContext: () => {
      throw new Error('must not load')
    },
  })
  assert.equal(empty.ok, false)
  assert.equal(empty.reason, 'no_ops')
}

{
  const { copilotApplyMissReason } = await import('./applyLiveEditorAssist.ts')
  assert.match(copilotApplyMissReason('no_match'), /no longer matches/)
  assert.match(copilotApplyMissReason('no_handle'), /not ready/)
  assert.match(copilotApplyMissReason('apply_failed'), /ask again/i)
  assert.match(copilotApplyMissReason('no_change'), /would not change/)
}

{
  const { isWorkspacePathCite, splitWorkspacePathCites } = await import(
    '../markdownRenderer/workspacePathCites.ts'
  )
  assert.equal(isWorkspacePathCite('src/parse.ts'), true)
  assert.equal(isWorkspacePathCite('solve.ts'), true)
  assert.equal(isWorkspacePathCite('hello'), false)
  const parts = splitWorkspacePathCites('Look at src/parse.ts then solve.ts.')
  assert.equal(parts.filter((p) => p.path).length, 2)
}

{
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const here = dirname(fileURLToPath(import.meta.url))
  const live = readFileSync(join(here, '../../components/InterviewGateToolLive.tsx'), 'utf8')
  const page = readFileSync(join(here, '../../pages/InterviewPage.tsx'), 'utf8')
  const reply = readFileSync(
    join(here, '../../../../back_end/supabase/functions/interview-copilot-edit/copilotReply.ts'),
    'utf8',
  )
  const code = readFileSync(join(here, '../../components/CodeEditor.tsx'), 'utf8')
  const peel = readFileSync(join(here, '../../components/InterviewAssistPeelChat.tsx'), 'utf8')
  const propose = live.indexOf('proposeEdit:')
  const formStart = live.indexOf("if (mount.kind === 'form')", propose)
  const codingStart = live.indexOf("if (mount.kind === 'coding')", formStart + 1)
  const formBranch = live.slice(formStart, codingStart)
  assert.equal(/proposeDiff/.test(formBranch), false, 'form fill has no pending diff')
  assert.ok(/formStepWaitRef/.test(formBranch), 'two-question form waits on the peel sheet')
  const singleForm = live.indexOf("if (mount.kind === 'form')", codingStart)
  const singleFormEnd = live.indexOf("if (mount.kind === 'coding')", singleForm + 1)
  const singleFormBranch = live.slice(singleForm, singleFormEnd)
  assert.ok(/applyCopilotPendingOps/.test(singleFormBranch), 'one-question form fills immediately')
  assert.equal(/proposeDiff/.test(singleFormBranch), false, 'single-question form has no pending diff')
  assert.ok(/if \(decision === 'rejected'\) return \{ status: 'rejected'/.test(live), 'reject restores without loadContext')
  assert.ok(/if \(decision === 'replaced'\) return \{ status: 'replaced'/.test(live), 'overlay replace is not a miss error')
  assert.ok(/codingDiffIsNoop/.test(live), 'identical dry-run bodies miss as no_change')
  assert.ok(
    /isPackedCodingPath,/.test(page) && /src\.filter\(\(p\) => isPackedCodingPath\(p, lang\)\)/.test(page),
    'coding attach chips import and use packed-src filter',
  )
  assert.ok(/runCopilotPropose\(ops/.test(page), 'InterviewPage auto-proposes after ops')
  assert.ok(/if \(res.status === 'replaced'\)/.test(page), 'replaced overlay does not peel-error the prior turn')
  assert.ok(/if \(pendingEdits.length > 0\) return/.test(page), 'composer send blocked while a proposal is live')
  assert.ok(/BoardProposedEditSheet/.test(peel), 'pending write uses questionnaire sheet chrome')
  assert.ok(/pendingCount > 0/.test(peel) && /locked=\{Boolean\(livePlanning\) \|\| planMounted \|\| pendingCount > 0\}/.test(peel), 'composer locked while proposed edit is open')
  assert.ok(/prev\?\.\('replaced'\)/.test(code), 'second proposeDiff replaces overlay without miss error')
  assert.ok(/assistHistoryForCopilot\(nextMessages\)/.test(page), 'Copilot history recovers markdown when text is empty')
  assert.ok(/assistOpenPhaseRef/.test(page), 'section_open runs once per phase')
  assert.ok(/setAssist\(\(prev\) => \{/.test(page), 'opener settle must not wipe later peel turns')
  assert.equal(/actionId: 'copilot.action.apply-pending'/.test(reply), false, 'peel has no Apply card')

  // The commit-time miss used to be the end of the turn: our own dry-run against the live
  // editor refused the proposal, the candidate got "retype it", and the Edge never heard
  // that its work was rejected. It now re-enters the same ladder — bounded, so a proposal
  // that survives the cap still lands on the honest message instead of looping.
  assert.ok(/const COPILOT_REPAIR_ROUNDS = \d/.test(page), 'the repair round-trip has a cap')
  assert.ok(/copilotRepairCountRef/.test(page), 'rounds are counted per ask')
  assert.ok(
    /copilotRepairCountRef\.current >= COPILOT_REPAIR_ROUNDS/.test(page),
    'the cap is enforced before another round-trip',
  )
  assert.ok(
    /copilotRepairCountRef\.current = 0/.test(page),
    'the count resets on a new candidate send, not once per sitting',
  )
  assert.ok(/runCopilotEditRepair/.test(page), 'the miss goes back to the Edge as a repair')
  assert.ok(
    /pendingStatus: 'retrying'/.test(page),
    'the bubble says a retry is running instead of sitting silent',
  )
  assert.ok(/Retrying edit/.test(peel), 'the peel renders the retry label')
  const copilotClient = readFileSync(join(here, 'copilotEditEdgeClient.ts'), 'utf8')
  assert.match(
    copilotClient,
    /requireInterviewEdgeAccessToken\(null, payload\.briefId\)/,
    'Copilot Edge uses the same guest JWT helper as Talk',
  )
  assert.equal(
    /if \(!session\?\.access_token\)/.test(copilotClient),
    false,
    'negative: Copilot must not require a signed-in session token',
  )
  assert.match(peel, /ChatErrorBubble/, 'Copilot peel send failures are a bot error bubble')
  assert.equal(
    /theme-interview-gate__talk-error/.test(peel),
    false,
    'negative: Copilot peel must not print errors above the composer',
  )
}

console.log('front_end copilot-edit: ok')

await import('./interviewLoadBindings.unit.mjs')
