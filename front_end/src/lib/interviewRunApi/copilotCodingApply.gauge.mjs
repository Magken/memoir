/**
 * Copilot coding apply gauge — intent → dry-run ops → Apply/miss → cites.
 * No Edge, no OpenAI. Run: npx tsx front_end/src/lib/interviewRunApi/copilotCodingApply.gauge.mjs
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyCopilotOps } from './copilotApply.ts'
import {
  applyCopilotPendingOps,
  copilotApplyMissReason,
} from './applyLiveEditorAssist.ts'
import { inferCopilotIntent as inferFe } from './inferCopilotIntent.ts'
import { mapCopilotReplyParts } from './mapCopilotReplyParts.ts'
import { copilotApplyEnabled, latestCopilotPendingMessageId } from './copilotPendingChrome.ts'
import {
  isWorkspacePathCite,
  splitWorkspacePathCites,
} from '../markdownRenderer/workspacePathCites.ts'
import { inferCopilotIntent as inferBe } from '../../../../back_end/supabase/functions/interview-copilot-edit/inferCopilotIntent.ts'
import { applyCopilotOps as applyBe } from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotApply.ts'
import { isComposeDud } from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotCompose.ts'
import { BANNED_CONFIRM_RE } from '../../../../back_end/supabase/functions/interview-copilot-edit/allowlist.ts'
import { scoreCopilotBite, scoreCopilotScope } from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotScopeGate.ts'
import { buildCopilotReplyParts } from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotReply.ts'
import { copilotWriteHonorBlock } from '../../../../back_end/supabase/functions/interview-brief-edit/assistCatalog.ts'
import { buildCopilotPlanUser } from '../../../../back_end/supabase/functions/interview-copilot-edit/prompts/planCheck.ts'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../../..')
const write = { write: true, spoilers: true }
const coach = { write: false, spoilers: true }
const assistant = { write: false, spoilers: false }

let failed = 0
function check(label, ok, detail = '') {
  if (ok) {
    console.log(`ok   ${label}${detail ? ` | ${detail}` : ''}`)
    return
  }
  failed += 1
  console.error(`FAIL ${label}${detail ? ` | ${detail}` : ''}`)
}

const parseDoc = {
  kind: 'coding',
  generation: 1,
  snapshotHash: 'h',
  coding: {
    files: [{ path: 'src/parse.ts', content: 'export function n(x) {\n  return 1\n}\n' }],
  },
}

const guardOp = {
  op: 'search_replace',
  path: 'src/parse.ts',
  old: 'return 1',
  new: 'if (!n) return []\n  return 1',
}

{
  const rows = [
    ['add a guard in parse.ts', write, 'edit'],
    ['help me implement parse.ts', write, 'edit'],
    ['edit parse.ts', write, 'edit'],
    ['put this in the editor', write, 'edit'],
    ['propose an edit', write, 'edit'],
    ['apply this', write, 'edit'],
    ['add a function', write, 'edit'],
    ['help me', write, 'assist'],
    ['where is the editor', write, 'assist'],
    ['what does this mean', write, 'assist'],
    ['yes', write, 'assist'],
    ['help me implement parse.ts', coach, 'assist'],
    ['put this in the editor', coach, 'assist'],
    ['add a guard in parse.ts', assistant, 'assist'],
    ['implement the entire solution', write, 'edit'],
    ['implement the entire solution', coach, 'assist'],
    ['put a 1-1000 loop in helper.js', write, 'edit'],
    ['put it in the file', write, 'edit'],
    ['pls just write the code', write, 'edit'],
    ['write and add my counter', write, 'edit'],
    ['add it', write, 'edit'],
    ['put it in the file', coach, 'assist'],
    ['yes pls', write, 'assist'],
  ]
  for (const [text, caps, want] of rows) {
    const fe = inferFe(text, caps)
    const be = inferBe(text, caps)
    check(
      `intent ${JSON.stringify(text)} write=${caps.write}`,
      fe.kind === want && be.kind === want && fe.kind === be.kind,
      `fe=${fe.kind} be=${be.kind} want=${want}`,
    )
  }
}

{
  const fe = applyCopilotOps(parseDoc, [guardOp])
  const be = applyBe(parseDoc, [guardOp])
  check('guard-parse dry-run FE', fe.ok && String(fe.doc.coding?.files?.[0]?.content ?? '').includes('if (!n)'))
  check('guard-parse dry-run Edge', be.ok && String(be.doc.coding?.files?.[0]?.content ?? '').includes('if (!n)'))
  check('guard-parse FE/Edge same body', fe.doc.coding.files[0].content === be.doc.coding.files[0].content)
  check('original file not rewritten', parseDoc.coding.files[0].content.includes('return 1') && !parseDoc.coding.files[0].content.includes('if (!n)'))
}

{
  const ws = applyCopilotOps(parseDoc, [
    { op: 'search_replace', path: 'src/parse.ts', old: '  return 1  ', new: 'return []' },
  ])
  check('whitespace retry applies once', ws.ok && /return \[\]/.test(ws.doc.coding.files[0].content))
  const miss = applyCopilotOps(parseDoc, [
    { op: 'search_replace', path: 'src/parse.ts', old: 'NOPE_NOT_HERE', new: 'x' },
  ])
  check('honest no_match', !miss.ok && miss.failed[0].code === 'no_match')
  const deny = applyCopilotOps(parseDoc, [
    { op: 'search_replace', path: 'tests/cases.json', old: 'a', new: 'b' },
  ])
  check('denied cases.json', deny.failed[0].code === 'denied_path')
  const stale = applyCopilotOps(parseDoc, [guardOp], { expectedGeneration: 9 })
  check('stale_generation', stale.failed[0].code === 'stale_generation')
}

{
  let loaded = null
  const ok = await applyCopilotPendingOps({
    kind: 'coding',
    write: true,
    ops: [guardOp],
    getContext: () => ({
      files: [{ path: 'src/parse.ts', language: 'ts', content: 'export function n(x) {\n  return 1\n}\n' }],
      openIds: ['src/parse.ts'],
      activeId: 'src/parse.ts',
    }),
    loadContext: (p) => {
      loaded = p
    },
  })
  check('pending Apply mutates buffer-as-content', ok.ok && /if \(!n\)/.test(loaded?.files?.[0]?.content ?? ''))

  const empty = await applyCopilotPendingOps({
    kind: 'coding',
    write: true,
    ops: [],
    getContext: () => ({ files: [] }),
    loadContext: () => {
      throw new Error('must not load')
    },
  })
  check('empty ops miss', !empty.ok && empty.reason === 'no_ops')

  const noWrite = await applyCopilotPendingOps({
    kind: 'coding',
    write: false,
    ops: [guardOp],
    getContext: () => ({ files: [] }),
    loadContext: () => {
      throw new Error('must not load')
    },
  })
  check('Coach write=false cannot Apply', !noWrite.ok && noWrite.reason === 'no_write')

  const noMatch = await applyCopilotPendingOps({
    kind: 'coding',
    write: true,
    ops: [guardOp],
    getContext: () => ({
      files: [{ path: 'src/parse.ts', content: 'export function n() { return 9 }\n' }],
    }),
    loadContext: () => {
      throw new Error('must not load on miss')
    },
  })
  check('Apply miss no_match', !noMatch.ok && noMatch.reason === 'no_match')
  check('miss copy no_match', /no longer matches/.test(copilotApplyMissReason('no_match')))
  check('miss copy no_handle', /not ready/.test(copilotApplyMissReason('no_handle')))
  check('miss copy stale_pending', /no longer current/.test(copilotApplyMissReason('stale_pending')))
  check('miss copy apply_failed', /ask again/i.test(copilotApplyMissReason('apply_failed')))
  check('miss copy no_change', /would not change/.test(copilotApplyMissReason('no_change')))
}

{
  const scope = scoreCopilotScope({
    userMessage: 'add a guard in parse.ts',
    doc: parseDoc,
    ops: [guardOp],
    caps: { write: true, spoilers: true },
  })
  check('scope conversational guard', scope.action === 'ok', `${scope.action}${scope.sheet ? ` ${scope.sheet}` : ''}`)
  const bite = scoreCopilotBite({
    userMessage: 'implement the entire solution',
    doc: parseDoc,
    ops: [{ op: 'replace_all', path: 'src/parse.ts', text: 'cheat' }],
  })
  check(
    'bite-size whole solve',
    bite.action === 'ask' || bite.action === 'refuse',
    bite.action,
  )
}

{
  const none = buildCopilotReplyParts({
    markdown: 'Here is what the prompt asks in plain terms.',
    receipt: { applied: [], failed: [], lines: [], bodyChanged: false },
  })
  check('no ops → no Apply card', !none.some((p) => p.actionId === 'copilot.action.apply-pending'))
  const parts = buildCopilotReplyParts({
    markdown: 'Proposed a guard in parse.ts.',
    receipt: {
      applied: [guardOp],
      failed: [],
      lines: [{ kind: 'coding', line: 'src/parse.ts', locus: 'src/parse.ts' }],
      bodyChanged: true,
    },
    pending: true,
    goTo: { actionId: 'copilot.action.go-to-file', label: 'Go to file', value: 'src/parse.ts' },
  })
  check('pending ops → no Apply card', !parts.some((p) => p.actionId === 'copilot.action.apply-pending'))
  check('pending ops → go-to-file', parts.some((p) => p.actionId === 'copilot.action.go-to-file'))
  const mapped = mapCopilotReplyParts(parts)
  check(
    'mapped no Apply actionId',
    !mapped.some(
      (p) => p.type === 'card' && p.actions?.some((a) => a.actionId === 'copilot.action.apply-pending'),
    ),
  )
  const page = readFileSync(join(repo, 'front_end/src/pages/InterviewPage.tsx'), 'utf8')
  check('auto proposeEdit after ops', /runCopilotPropose\(ops/.test(page))
  check('page sends editMemory', /editMemory: copilotEditMemoryRef\.current/.test(page))
  const msgs = [
    { id: 'old', role: 'assistant', pendingStatus: 'pending', editRunId: '1' },
    { id: 'live', role: 'assistant', pendingStatus: 'pending', editRunId: '2' },
  ]
  check('latest pending wins', latestCopilotPendingMessageId(msgs) === 'live')
  check(
    'history Apply locked',
    copilotApplyEnabled({ messages: msgs, messageId: 'old', liveEditRunId: '2' }) === false,
  )
  check(
    'live Apply enabled',
    copilotApplyEnabled({ messages: msgs, messageId: 'live', liveEditRunId: '2' }) === true,
  )
}

{
  check('chat yes banned', BANNED_CONFIRM_RE.test('yes'))
  check(
    'want me to apply is compose dud',
    isComposeDud('Proposed a change. Do you want me to apply it in the editor now please.', 'edit'),
  )
  check(
    'say yes is compose dud',
    isComposeDud('I drafted a hunk. Please say yes if you want it in the editor right now.', 'edit'),
  )
  check(
    'proceed tutorial is compose dud',
    isComposeDud(
      'Here is how you can add a counter. Let me know if you want to proceed with this change.',
      'edit',
    ),
  )
  check(
    'fenced counter dump is compose dud',
    isComposeDud(
      'Proposed.\n```python\ndef counter():\n    n = 0\n    while n < 1000:\n        yield n\n        n += 1\n```\n',
      'edit',
    ),
  )
}

{
  const honor = copilotWriteHonorBlock('coding')
  // Heading is "# Write assist", not "# Copilot write": the block forbids the
  // bot naming itself Copilot, so the heading must not hand it that name.
  check('write honor present', honor.includes('# Write assist') && honor.includes('this coding editor'))
  check('write honor never names Copilot as the speaker', !/^#.*Copilot/m.test(honor))
  check('write honor no catalog dump', !/assist\.catalog/.test(honor))
  const packed = buildCopilotPlanUser({
    message: 'add a guard in parse.ts',
    liveMap: { kind: 'coding', files: ['src/parse.ts'], generation: 1 },
    opsDigest: { may: 'hunk', mustNot: 'cases.json' },
    history: [{ role: 'assistant', text: 'Ask here.' }],
  })
  check('plan follow-up has write honor', packed.includes('# Write assist'))
  check('plan follow-up no assist.catalog', !/assist\.catalog/.test(packed))
}

{
  const cites = splitWorkspacePathCites('Look at src/parse.ts then solve.ts.')
  check(
    'cite src + solve',
    cites.filter((p) => p.path).map((p) => p.path).join(',') === 'src/parse.ts,solve.ts',
  )
  check('cite token src/parse.ts', isWorkspacePathCite('src/parse.ts'))
  check('cite token solve.ts', isWorkspacePathCite('solve.ts'))
  check('cite rejects prose', isWorkspacePathCite('hello') === false)
  const urlParts = splitWorkspacePathCites('See https://example.com/docs for the prompt.')
  check(
    'cite ignores example.com URL',
    urlParts.every((p) => !p.path || !p.path.includes('example.com')),
  )
}

{
  const edgeCat = readFileSync(
    join(repo, 'back_end/supabase/functions/interview-brief-edit/nested/fragments/assist.catalog.json'),
    'utf8',
  )
  const feCat = readFileSync(join(repo, 'front_end/src/lib/interviewBrief/toolAssistCatalog.json'), 'utf8')
  const h = (s) => createHash('sha256').update(s).digest('hex')
  check('assist catalog FE/Edge byte-identical', h(edgeCat) === h(feCat))
  check('catalog Copilot may uses sitting editor', /Propose the change into the sitting editor/.test(edgeCat))
  check(
    'catalog runtimeNote forbids editorApply compose',
    /Do not return editorApply from Assist compose/.test(edgeCat),
  )
}

{
  const guardEx = JSON.parse(
    readFileSync(
      join(repo, 'back_end/supabase/functions/interview-copilot-edit/examples/coding/guard-parse.json'),
      'utf8',
    ),
  )
  const planEx = JSON.parse(
    readFileSync(
      join(repo, 'back_end/supabase/functions/interview-copilot-edit/examples/plans/edit-coding-conversational.json'),
      'utf8',
    ),
  )
  check('few-shot path is parse.ts', guardEx.ops[0].path === 'src/parse.ts')
  check('few-shot is search_replace not fence', guardEx.ops[0].op === 'search_replace')
  check('plan few-shot binds parse.ts', planEx.workPackages[0].ops[0].path === 'src/parse.ts')
  const applied = applyCopilotOps(parseDoc, guardEx.ops)
  check('few-shot ops apply on fixture', applied.ok)
}

assert.equal(failed, 0, `${failed} copilot coding apply gauge checks failed`)
console.log(`copilotCodingApply.gauge: ok`)
