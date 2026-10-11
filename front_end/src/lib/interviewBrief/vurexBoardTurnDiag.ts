/**
 * Vurex board-turn DIAG — same 3-part console dump used by Creator board chat
 * and compose blank-slate Generate. Filter DevTools by `Vurex DIAG` / `[Vurex]`.
 */
import type { InterviewEditResult } from '../interviewEditApi'
import { composeGeneratePathFromResult, isGenerateCompilerPlanSource } from './composeGenerateDebug'
import { matchToolAssistBundle, resolveToolAssistCaps } from './toolAssistBundles'

export type VurexBoardTurnDiagInput = {
  userMessage: string
  replyMarkdown: string
  thinkText: string
  result: InterviewEditResult | null
  error?: unknown
  /** Optional tag on PART 1 USER line (e.g. compose-generate). */
  source?: string
}

function toolAssistSnapshot(body: Record<string, unknown> | null | undefined) {
  const tools = body?.tools
  if (!tools || typeof tools !== 'object' || Array.isArray(tools)) return []
  return Object.entries(tools as Record<string, Record<string, unknown>>)
    .filter(([, tool]) => {
      const type = String(tool?.type ?? '')
      return type === 'form_quiz' || type === 'coding' || type === 'doc'
    })
    .map(([ref, tool]) => {
      const assist = (tool?.assist ?? null) as Record<string, unknown> | null
      const leftovers = assist
        ? ['level', 'mode', 'preset', 'max', 'full'].filter((k) => assist[k] != null)
        : []
      const caps = resolveToolAssistCaps(
        assist
          ? {
              chat: Boolean(assist.chat),
              spoilers: Boolean(assist.spoilers),
              write: Boolean(assist.write),
            }
          : null,
      )
      return {
        ref,
        type: tool?.type ?? null,
        title: tool?.title ?? null,
        bundleId: matchToolAssistBundle(caps),
        caps,
        leftovers,
      }
    })
}

function toolTimingSnapshot(body: Record<string, unknown> | null | undefined) {
  const tools = body?.tools
  if (!tools || typeof tools !== 'object' || Array.isArray(tools)) return []
  return Object.entries(tools as Record<string, Record<string, unknown>>).map(([ref, tool]) => {
    const timing = (tool?.timing ?? null) as Record<string, unknown> | null
    const mode = timing && typeof timing.mode === 'string' ? timing.mode : null
    const nonCanonical =
      timing != null &&
      (mode === 'hard' ||
        mode === 'strict' ||
        mode === 'timer' ||
        Object.prototype.hasOwnProperty.call(timing, 'minutes') ||
        (mode != null && mode !== 'timed' && mode !== 'untimed'))
    return {
      ref,
      type: tool?.type ?? null,
      title: tool?.title ?? null,
      timing,
      editorKind: tool?.editorKind ?? null,
      /** True when shape won't light FE timer chrome without coerce (`timed` + `limitMinutes`). */
      timingNonCanonical: nonCanonical || undefined,
    }
  })
}

/** Collapse long prompts so console paste stays diagnosable (Edge truncates huge logs). */
function clipDiagText(text: string, max = 160): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (!t) return '(empty)'
  if (t.length <= max) return t
  return `${t.slice(0, max)}… [${t.length} chars]`
}

function readPhaseReferenceIds(phase: Record<string, unknown>): string[] {
  const refs = phase.references
  if (!refs || typeof refs !== 'object' || Array.isArray(refs)) return []
  const ids = (refs as { phaseIds?: unknown }).phaseIds
  return Array.isArray(ids) ? ids.map(String).map((id) => id.trim()).filter(Boolean) : []
}

const GHOST_MARK_IDS = ['mark.form.rubric.v1', 'mark.doc.rubric.v1'] as const

function collectGhostMarkIds(body: Record<string, unknown> | null | undefined): string[] {
  const found = new Set<string>()
  const note = (id: string) => {
    if ((GHOST_MARK_IDS as readonly string[]).includes(id)) found.add(id)
  }
  for (const id of templateIdsFromBody(body)) note(id)
  const tools = body?.tools
  if (tools && typeof tools === 'object' && !Array.isArray(tools)) {
    for (const tool of Object.values(tools as Record<string, Record<string, unknown>>)) {
      const analysis = tool?.analysis
      if (!analysis || typeof analysis !== 'object') continue
      const ids = (analysis as { templateIds?: unknown }).templateIds
      if (Array.isArray(ids)) for (const id of ids) note(String(id))
    }
  }
  return [...found]
}

function formatAnswerKeyDialect(kind: string, ak: Record<string, unknown>): string {
  if (kind === 'mcq_single' || kind === 'dropdown') {
    return ak.optionId != null ? `optionId=${String(ak.optionId)}` : 'no optionId'
  }
  if (kind === 'mcq_multi') {
    return Array.isArray(ak.optionIds) ? `optionIds=${(ak.optionIds as unknown[]).join(',')}` : 'no optionIds'
  }
  if (kind === 'short_text') {
    return `match=${String(ak.match ?? '—')} value=${String(ak.value ?? '').slice(0, 24)}`
  }
  return `keys=${Object.keys(ak).slice(0, 6).join(',')}`
}

function answerKeyDialectFail(kind: string, ak: Record<string, unknown>): string | null {
  if (kind === 'mcq_single' || kind === 'dropdown') {
    if (ak.optionId == null && (ak.value != null || ak.match != null)) {
      return 'legacy match/value dialect (want optionId)'
    }
  }
  if (kind === 'mcq_multi' && !Array.isArray(ak.optionIds) && ak.value != null) {
    return 'legacy match/value dialect (want optionIds)'
  }
  return null
}

function hostAnalysisSnapshot(body: Record<string, unknown> | null | undefined): string[] {
  const lines: string[] = []
  const tools = body?.tools
  if (tools && typeof tools === 'object' && !Array.isArray(tools)) {
    for (const [ref, tool] of Object.entries(tools as Record<string, Record<string, unknown>>)) {
      const type = String(tool?.type ?? '')
      if (type !== 'form_quiz' && type !== 'coding' && type !== 'doc') continue
      const analysis =
        tool?.analysis && typeof tool.analysis === 'object'
          ? (tool.analysis as { attachPack?: unknown; templateIds?: unknown })
          : null
      const pack = analysis?.attachPack ? String(analysis.attachPack) : ''
      const ids = Array.isArray(analysis?.templateIds)
        ? (analysis!.templateIds as unknown[]).map(String).filter(Boolean)
        : []
      lines.push(
        `${ref} ${type}${pack ? ` ${pack}` : ''}${ids.length ? `[${ids.length}:${ids.slice(0, 3).join(',')}]` : ' empty'}`,
      )
    }
  }
  const phases = Array.isArray(body?.phases) ? (body!.phases as Array<Record<string, unknown>>) : []
  const topics = Array.isArray(body?.topicLibrary)
    ? (body!.topicLibrary as Array<Record<string, unknown>>)
    : []
  for (const p of phases) {
    if (p.kind !== 'discussion') continue
    const topic = topics.find((t) => String(t.id ?? '') === String(p.topicId ?? ''))
    const analysis =
      topic?.analysis && typeof topic.analysis === 'object'
        ? (topic.analysis as { attachPack?: unknown; templateIds?: unknown })
        : null
    const pack = analysis?.attachPack ? String(analysis.attachPack) : ''
    const ids = Array.isArray(analysis?.templateIds)
      ? (analysis!.templateIds as unknown[]).map(String).filter(Boolean)
      : []
    lines.push(
      `talk.${String(p.id ?? '?')} “${String(p.title ?? '').slice(0, 22)}”${pack ? ` ${pack}` : ''}${
        ids.length ? `[${ids.length}]` : ' empty'
      }`,
    )
  }
  return lines
}

function formKindsFromBody(body: Record<string, unknown> | null | undefined): string[] {
  const tools = body?.tools
  if (!tools || typeof tools !== 'object' || Array.isArray(tools)) return []
  const kinds = new Set<string>()
  for (const tool of Object.values(tools as Record<string, Record<string, unknown>>)) {
    if (tool?.type !== 'form_quiz') continue
    const art = tool.artifact as Record<string, unknown> | undefined
    const inline = art?.inline as Record<string, unknown> | undefined
    const questions = Array.isArray(inline?.questions) ? inline.questions : []
    for (const q of questions) {
      if (q && typeof q === 'object' && (q as { kind?: string }).kind) {
        kinds.add(String((q as { kind: string }).kind))
      }
    }
  }
  return [...kinds].sort()
}

function templateIdsFromBody(body: Record<string, unknown> | null | undefined): string[] {
  const analysis = body?.analysis as Record<string, unknown> | undefined
  const overrides = analysis?.overrides as Record<string, unknown> | undefined
  const ids = Array.isArray(overrides?.libraryIds) ? overrides.libraryIds.map(String) : []
  return ids
}

function spineDiagLines(body: Record<string, unknown> | null | undefined): string[] {
  const phases = Array.isArray(body?.phases) ? (body.phases as Array<Record<string, unknown>>) : []
  return phases.map((p, i) => {
    const title = String(p.title ?? 'Untitled').slice(0, 48)
    const kind =
      p.kind === 'discussion'
        ? 'Conversation'
        : String(
            ((body?.tools as Record<string, { type?: string }> | undefined)?.[String(p.toolRef ?? '')]
              ?.type ??
              'tool') as string,
          )
    const flags = [
      p.isOpening ? 'open' : null,
      p.isClosing ? 'close' : null,
      p.required ? 'req' : null,
    ].filter(Boolean)
    return `${i + 1}. ${title} (${kind}${flags.length ? `; ${flags.join(',')}` : ''})`
  })
}

/** Per-Talk host templateIds for DIAG PART 3 (attach/detach debugging). */
function talkHostTemplateDiagLines(body: Record<string, unknown> | null | undefined): string[] {
  if (!body) return []
  const phases = Array.isArray(body.phases) ? (body.phases as Array<Record<string, unknown>>) : []
  const topics = Array.isArray(body.topicLibrary)
    ? (body.topicLibrary as Array<Record<string, unknown>>)
    : []
  const lines: string[] = []
  for (const p of phases) {
    if (p.kind !== 'discussion') continue
    const id = String(p.id ?? '')
    const title = String(p.title ?? id).slice(0, 36)
    const topic = topics.find((t) => String(t.id) === String(p.topicId ?? ''))
    const tids =
      topic?.analysis && typeof topic.analysis === 'object'
        ? Array.isArray((topic.analysis as { templateIds?: unknown }).templateIds)
          ? ((topic.analysis as { templateIds: unknown[] }).templateIds as unknown[]).map(String)
          : []
        : []
    const customs = tids.filter((t) => t.startsWith('custom.'))
    lines.push(
      `${id || '?'} “${title}” templates=${tids.length ? tids.join(',') : '∅'} custom=${customs.length}`,
    )
  }
  return lines
}

function pipelinePhaseLines(detail: Record<string, unknown> | null): string[] {
  const phases = Array.isArray(detail?.pipelinePhases) ? detail.pipelinePhases : []
  if (!phases.length) return []
  return phases.map((raw) => {
    const p = raw as {
      phase?: string
      ok?: boolean
      retries?: number
      packageIds?: string[]
    }
    const ids = Array.isArray(p.packageIds) ? p.packageIds.join(', ') : '?'
    return `${p.phase ?? '?'} ${p.ok === false ? 'FAIL' : 'ok'} r${p.retries ?? 0}: ${ids}`
  })
}

/** FE-side board substance checks — do not rely on Edge facts alone. */
function boardSubstanceChecks(body: Record<string, unknown> | null | undefined): string[] {
  if (!body) return ['FAIL: no body on result']
  const checks: string[] = []
  const phases = Array.isArray(body.phases) ? (body.phases as Array<Record<string, unknown>>) : []
  const tools = (body.tools && typeof body.tools === 'object' && !Array.isArray(body.tools)
    ? (body.tools as Record<string, Record<string, unknown>>)
    : {}) as Record<string, Record<string, unknown>>
  const topics = Array.isArray(body.topicLibrary)
    ? (body.topicLibrary as Array<Record<string, unknown>>)
    : []

  const closeIdx = phases.findIndex((p) => p.isClosing === true)
  if (closeIdx >= 0 && closeIdx < phases.length - 1) {
    const after = phases
      .slice(closeIdx + 1)
      .map((p) => String(p.title ?? p.id ?? '?'))
      .join(', ')
    checks.push(`FAIL: closing not last — after it: ${after}`)
  } else if (closeIdx === phases.length - 1) {
    checks.push('OK: closing is last')
  } else if (phases.length) {
    checks.push('WARN: no isClosing section')
  }

  const expectedKinds = [
    'short_text',
    'essay',
    'mcq_single',
    'mcq_multi',
    'dropdown',
    'fill_blank',
    'ordinal',
    'ordinal_grid',
  ]
  let formCount = 0
  for (const [ref, tool] of Object.entries(tools)) {
    if (tool?.type !== 'form_quiz') continue
    formCount += 1
    const art = tool.artifact as Record<string, unknown> | undefined
    const inline = (art?.inline as Record<string, unknown> | undefined) ?? {}
    const questions = Array.isArray(inline.questions)
      ? (inline.questions as Array<Record<string, unknown>>)
      : []
    const kinds = questions.map((q) => String(q.kind ?? '?'))
    const missing = expectedKinds.filter((k) => !kinds.includes(k))
    const pt = tool.passThreshold as Record<string, unknown> | null | undefined
    const reqIds = Array.isArray(pt?.requiredQuestionIds)
      ? (pt.requiredQuestionIds as unknown[]).map(String)
      : Array.isArray(pt?.required_items)
        ? (pt.required_items as unknown[]).map(String)
        : []
    const answerKey =
      inline.answerKey && typeof inline.answerKey === 'object'
        ? (inline.answerKey as Record<string, unknown>)
        : tool.answerKey && typeof tool.answerKey === 'object'
          ? (tool.answerKey as Record<string, unknown>)
          : {}
    const akIds = Object.keys(answerKey)
    const qWithAk = questions.filter((q) => akIds.includes(String(q.id))).length
    const timing = tool.timing as Record<string, unknown> | undefined
    checks.push(
      `FORM ${ref}: q=${questions.length} kinds=[${[...new Set(kinds)].join(',')}]` +
        (missing.length ? ` MISSING_KINDS=[${missing.join(',')}]` : ' kinds=ok') +
        ` gate=${pt ? `${String(pt.mode ?? 'on')} req=${reqIds.length}` : 'OFF'}` +
        ` answerKeys=${akIds.length}/${questions.length} (qWithKey=${qWithAk})` +
        ` timer=${timing?.mode ?? 'none'}${timing?.limitMinutes != null ? `:${timing.limitMinutes}m` : ''}`,
    )
    for (const q of questions) {
      const id = String(q.id ?? '')
      const kind = String(q.kind ?? '')
      const hasAk = Boolean(id && answerKey[id])
      const needsAk =
        kind === 'short_text' ||
        kind === 'essay' ||
        kind === 'mcq_single' ||
        kind === 'mcq_multi' ||
        kind === 'dropdown' ||
        kind === 'fill_blank'
      if (needsAk && !hasAk) {
        checks.push(`  FAIL: ${id || '?'} (${kind}) has no answerKey`)
      } else if (hasAk) {
        const ak = answerKey[id] as Record<string, unknown>
        checks.push(`  OK: ${id} (${kind}) ${formatAnswerKeyDialect(kind, ak)}`)
        const dialectFail = answerKeyDialectFail(kind, ak)
        if (dialectFail) checks.push(`  FAIL: ${id} ${dialectFail}`)
        const stub = String(ak.value ?? '')
        if (kind === 'short_text' && /^(US|ok)$/i.test(stub)) {
          checks.push(`  FAIL: ${id} placeholder answerKey value=${stub} (want regex / honest key)`)
        }
      }
      if (kind === 'ordinal_grid') {
        const cols = Array.isArray(q.columns) ? q.columns : []
        const rows = Array.isArray(q.rows) ? q.rows : []
        const badCol = cols.some((c) => !(c && typeof c === 'object' && (c as { id?: string }).id))
        const badRow = rows.some((r) => !(r && typeof r === 'object' && (r as { id?: string }).id))
        if (badCol || badRow || !cols.length || !rows.length) {
          checks.push(`  FAIL: ${id} ordinal_grid bad rows/cols`)
        }
      }
      if (kind === 'fill_blank') {
        const segs = Array.isArray(q.segments) ? q.segments : null
        if (!segs?.length) checks.push(`  FAIL: ${id} fill_blank missing segments`)
      }
    }
    if (!pt || reqIds.length === 0) checks.push(`  FAIL: ${ref} pass gate off or empty requiredQuestionIds`)
  }
  if (!formCount) checks.push('WARN: no form_quiz on board')

  const assistRows = toolAssistSnapshot(body)
  for (const row of assistRows) {
    const caps = `chat=${row.caps.chat} spoilers=${row.caps.spoilers} write=${row.caps.write}`
    checks.push(`ASSIST ${row.ref}: ${row.type}/${row.bundleId} ${caps}`)
    if (row.leftovers.length) {
      checks.push(
        `  FAIL: ${row.ref} leftover assist keys ${row.leftovers.join(',')} (store chat/spoilers/write only)`,
      )
    }
  }
  const codingAssist = assistRows.filter((row) => row.type === 'coding')
  if (codingAssist.length >= 2) {
    checks.push(
      `CODING ASSIST mix (${codingAssist.length}): ${codingAssist
        .map((row) => `${String(row.title ?? row.ref).slice(0, 28)}/${row.bundleId}`)
        .join(' · ')}`,
    )
    const bundles = new Set(codingAssist.map((row) => row.bundleId))
    if (bundles.size === 1) {
      checks.push(
        `  WARN: every coding section is ${[...bundles][0]} — ladder prompts expect mixed None/Coach/Copilot`,
      )
    }
  }

  for (const [ref, tool] of Object.entries(tools)) {
    if (tool?.type !== 'doc' && tool?.type !== 'writing') continue
    const timing = tool.timing as Record<string, unknown> | undefined
    const art = tool.artifact as Record<string, unknown> | undefined
    const inline = (art?.inline as Record<string, unknown> | undefined) ?? {}
    const prompt = (inline.prompt as Record<string, unknown> | undefined) ?? {}
    const minW = Number(prompt.minWords ?? tool.minWords ?? NaN)
    const maxW = Number(prompt.maxWords ?? tool.maxWords ?? NaN)
    const mins = Number(timing?.limitMinutes ?? NaN)
    checks.push(
      `DOC ${ref}: timer=${timing?.mode ?? 'none'}${Number.isFinite(mins) ? `:${mins}m` : ''}` +
        ` words=${Number.isFinite(minW) ? minW : '?'}-${Number.isFinite(maxW) ? maxW : '?'}`,
    )
    if (timing?.mode !== 'timed' || !Number.isFinite(mins) || mins <= 0) {
      checks.push(`  FAIL: ${ref} hard timer missing/untimed`)
    }
    if (!Number.isFinite(minW) || !Number.isFinite(maxW)) {
      checks.push(`  FAIL: ${ref} word range missing`)
    }
  }

  for (const [ref, tool] of Object.entries(tools)) {
    if (tool?.type !== 'coding') continue
    const timing = tool.timing as Record<string, unknown> | undefined
    const tests = tool.tests as Record<string, unknown> | undefined
    const cases = Array.isArray(tests?.cases) ? tests.cases : []
    const art = tool.artifact as Record<string, unknown> | undefined
    const inline = (art?.inline as Record<string, unknown> | undefined) ?? {}
    const files = Array.isArray(inline.files) ? inline.files as Array<{ path?: string }> : []
    const paths = files.map((f) => String(f.path ?? '')).filter(Boolean)
    const src = paths.filter((p) => p.startsWith('src/'))
    checks.push(
      `CODING ${ref}: timer=${timing?.mode ?? 'none'}${
        timing?.limitMinutes != null ? `:${timing.limitMinutes}m` : ''
      } tests=${cases.length} src=${src.length ? src.join(',') : '(none)'} leftoverRootFiles=${art?.files ? 'YES' : 'no'}`,
    )
  }

  const phaseIds = phases.map((p) => String(p.id ?? '')).filter(Boolean)
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i]!
    if (p.kind !== 'discussion') continue
    const title = String(p.title ?? p.id ?? 'talk')
    const when = p.when
    const onFail = p.onFail
    const topic = topics.find((t) => String(t.id) === String(p.topicId ?? ''))
    const probes = Array.isArray(topic?.probes) ? topic.probes : []
    const tids =
      topic?.analysis && typeof topic.analysis === 'object'
        ? Array.isArray((topic.analysis as { templateIds?: unknown }).templateIds)
          ? ((topic.analysis as { templateIds: unknown[] }).templateIds as unknown[]).map(String)
          : []
        : []
    const refIds = readPhaseReferenceIds(p)
    const earlier = new Set(phaseIds.slice(0, i))
    checks.push(
      `TALK ${title.slice(0, 40)}: probes=${probes.length} refs=${refIds.length ? refIds.join(',') : 'none'} when=${when == null ? 'none' : JSON.stringify(when).slice(0, 80)} onFail=${onFail == null ? 'none' : JSON.stringify(onFail).slice(0, 60)} templates=${tids.length ? tids.join(',') : 'none'}`,
    )
    if (refIds.length > 3) {
      checks.push(`  FAIL: ${title.slice(0, 32)} references ${refIds.length} ids (max 3)`)
    }
    for (const id of refIds) {
      if (id === String(p.id ?? '')) {
        checks.push(`  FAIL: ${title.slice(0, 32)} references self ${id}`)
      } else if (!earlier.has(id)) {
        checks.push(`  FAIL: ${title.slice(0, 32)} references ${id} (not an earlier spine id)`)
      }
    }
  }

  const ghosts = collectGhostMarkIds(body)
  if (ghosts.length) {
    checks.push(`FAIL: ghost mark ids still on board: ${ghosts.join(', ')}`)
  }

  const lib = templateIdsFromBody(body)
  const customLib = lib.filter((id) => id.startsWith('custom.'))
  const attachedCustoms = new Set<string>()
  for (const topic of topics) {
    const tids =
      topic?.analysis && typeof topic.analysis === 'object'
        ? Array.isArray((topic.analysis as { templateIds?: unknown }).templateIds)
          ? ((topic.analysis as { templateIds: unknown[] }).templateIds as unknown[]).map(String)
          : []
        : []
    for (const id of tids) {
      if (id.startsWith('custom.')) attachedCustoms.add(id)
    }
  }
  const unusedCustoms = customLib.filter((id) => !attachedCustoms.has(id))
  checks.push(`TEMPLATES shelf=${lib.length} custom=${customLib.length}: ${lib.length ? lib.join(', ') : '(none)'}`)
  checks.push(
    `  custom attached=${attachedCustoms.size}${
      attachedCustoms.size ? `: ${[...attachedCustoms].join(', ')}` : ''
    }`,
  )
  if (unusedCustoms.length) {
    checks.push(`  WARN: unused custom shelf cards (${unusedCustoms.length}): ${unusedCustoms.join(', ')}`)
  }
  if (customLib.length > 6) checks.push(`  WARN: shelf has ${customLib.length} custom cards (Prompt 1 expects 5)`)
  if (customLib.length > 0 && attachedCustoms.size === 0) {
    const bodyTalks = phases.filter(
      (p) => p.kind === 'discussion' && p.isOpening !== true && p.isClosing !== true,
    )
    const needsOwnershipAttach = bodyTalks.some((p) => {
      const title = String(p.title ?? '')
      return !/\bdebrief\b|\bwalk through\b|\bcoding approach\b|\bfirst coding\b/i.test(title)
    })
    if (needsOwnershipAttach) {
      checks.push('  FAIL: custom shelf cards exist but none attached to Talks')
    } else {
      checks.push('  WARN: custom shelf unused (no scored ownership Talk in this interview)')
    }
  }
  const rollup = (body.analysis as {
    rollup?: {
      weights?: Record<string, unknown>
      weightSections?: Record<string, unknown>
    }
  } | undefined)?.rollup
  const weights = rollup?.weights && typeof rollup.weights === 'object' ? rollup.weights : null
  const weightSections =
    rollup?.weightSections && typeof rollup.weightSections === 'object' ? rollup.weightSections : null
  if (weights) {
    checks.push(`ROLLUP keys=${Object.keys(weights).join(',')}`)
    const soft = Object.entries(weights)
      .filter(([k, v]) => k !== 'formMark' && typeof v === 'number')
      .map(([k, v]) => `${k}=${v}`)
    if (soft.length) checks.push(`  soft=${soft.join(' ')}`)
    if (weights.formMark != null) checks.push(`  formMark=${String(weights.formMark)}`)
  } else {
    checks.push('WARN: no decision rollup.weights')
  }
  if (weightSections) {
    const keys = Object.keys(weightSections)
    checks.push(`ROLLUP weightSections keys=${keys.join(',')}`)
    for (const key of keys) {
      const ids = Array.isArray(weightSections[key])
        ? (weightSections[key] as unknown[]).map(String)
        : []
      checks.push(`  ${key} → ${ids.length ? ids.join(',') : '(empty)'}`)
    }
    const content = Array.isArray(weightSections.interviewContent)
      ? (weightSections.interviewContent as unknown[]).map(String).sort().join(',')
      : ''
    const delivery = Array.isArray(weightSections.interviewDelivery)
      ? (weightSections.interviewDelivery as unknown[]).map(String).sort().join(',')
      : ''
    if (content && delivery && content === delivery) {
      const talkCount = phases.filter((p) => p.kind === 'discussion').length
      if (talkCount >= 2) {
        checks.push('  FAIL: interviewContent and interviewDelivery map to the same sections')
      } else {
        checks.push('  WARN: interviewContent and interviewDelivery share the same section (ok with a single Talk)')
      }
    }
    const codingPhaseIds = phases
      .filter((p) => {
        const t = tools[String(p.toolRef ?? '')]
        return t?.type === 'coding'
      })
      .map((p) => String(p.id ?? ''))
      .filter(Boolean)
    const codingTestsIds = Array.isArray(weightSections.codingTests)
      ? (weightSections.codingTests as unknown[]).map(String)
      : []
    if (codingPhaseIds.length >= 2 && codingTestsIds.length && codingTestsIds.length < codingPhaseIds.length) {
      checks.push(
        `  WARN: codingTests chips ${codingTestsIds.length}/${codingPhaseIds.length} coding sections (want all drills on the lens)`,
      )
    }
    const seed = ['formMark', 'codingTests', 'codingMethod', 'essay', 'interviewContent', 'interviewDelivery']
    const weightKeys = Object.keys(weights ?? {})
    const hasCustom = weightKeys.some((k) => !seed.includes(k) && !k.startsWith('topic.') && !k.startsWith('ph.'))
    if (!hasCustom) {
      const absent = seed.filter((k) => !(k in (weights ?? {})))
      if (absent.length >= 4) {
        checks.push(`  FAIL: Decision only set ${weightKeys.length} weight keys (${absent.join(',')} missing)`)
      }
    }
  } else if (weights) {
    checks.push('  FAIL: rollup.weights present but weightSections missing (Decision section chips empty)')
  }

  return checks
}

function packageDiagLines(editRun: Record<string, unknown> | null): string[] {
  const pkgs = Array.isArray(editRun?.workPackages) ? editRun.workPackages : []
  if (!pkgs.length) return []
  return pkgs.map((raw, i) => {
    const p = raw as {
      packageId?: string
      kind?: string
      targetSectionId?: string | null
      titleHint?: string
      planningBrief?: string
    }
    return `${i + 1}. ${p.packageId ?? '?'} [${p.kind ?? '?'}]${
      p.targetSectionId ? ` → ${p.targetSectionId}` : ''
    }${p.titleHint ? ` “${String(p.titleHint).slice(0, 32)}”` : ''}`
  })
}

export function logBoardTurnDebug(input: VurexBoardTurnDiagInput) {
  const meta = (input.result?.meta ?? null) as Record<string, unknown> | null
  const editRun =
    meta && typeof meta.editRun === 'object' && meta.editRun
      ? (meta.editRun as Record<string, unknown>)
      : null
  const body = (input.result?.body ?? null) as Record<string, unknown> | null
  const detail =
    meta?.phaseTraceDetail && typeof meta.phaseTraceDetail === 'object'
      ? (meta.phaseTraceDetail as Record<string, unknown>)
      : null
  const phaseTrace = (editRun?.phaseTrace ?? meta?.phaseTrace ?? null) as string[] | null
  const factResults = (
    Array.isArray(editRun?.factResults)
      ? editRun.factResults
      : Array.isArray(meta?.factResults)
        ? meta.factResults
        : []
  ) as Array<{ id?: string; ok?: boolean; detail?: string }>
  const failedFacts = factResults.filter((f) => f && f.ok === false)
  const okFacts = factResults.filter((f) => f && f.ok === true)
  const warnings = (editRun?.warnings ?? meta?.warnings ?? null) as string[] | null
  const guardDrops = (meta?.guardDrops ?? null) as string[] | null
  const spineDetractors = Array.isArray(meta?.spineDetractors) ? meta.spineDetractors : []
  const timing = toolTimingSnapshot(body)
  const assist = toolAssistSnapshot(body)
  const assistLeftovers = assist.filter((a) => a.leftovers.length)
  const formKinds = formKindsFromBody(body)
  const expectedFormKinds = [
    'short_text',
    'essay',
    'mcq_single',
    'mcq_multi',
    'dropdown',
    'fill_blank',
    'ordinal',
    'ordinal_grid',
  ]
  const missingFormKinds = expectedFormKinds.filter((k) => !formKinds.includes(k))
  const templateIds = templateIdsFromBody(body)
  const pipelineLines = pipelinePhaseLines(detail)
  const pkgLines = packageDiagLines(editRun)
  const generatePath = input.result ? composeGeneratePathFromResult(input.result) : null
  const substance = boardSubstanceChecks(body)
  const substanceFails = substance.filter((l) => l.startsWith('FAIL') || l.includes('FAIL:'))
  const err =
    input.error && typeof input.error === 'object'
      ? {
          code: (input.error as { code?: string }).code ?? null,
          detail: (input.error as { detail?: string }).detail ?? null,
          message: (input.error as { message?: string }).message ?? null,
        }
      : null

  const head: string[] = [
    '======== Vurex DIAG PART 1/3 (copy ALL parts) ========',
    `USER${input.source ? ` [${input.source}]` : ''}: ${clipDiagText(input.userMessage, 120)}`,
    `REPLY: ${clipDiagText(input.replyMarkdown, 180)}`,
    `THINK: ${clipDiagText(input.thinkText.split('\n').filter(Boolean).slice(-2).join(' | '), 140)}`,
    '',
    `PLAN: ${String(editRun?.planSource ?? meta?.planSource ?? detail?.planSource ?? '—')}  mode=${String(editRun?.mode ?? meta?.mode ?? '—')}  bodyChanged=${String(editRun?.bodyChanged ?? meta?.bodyChanged ?? '—')}  hadFailures=${String(editRun?.hadFailures ?? meta?.hadFailures ?? '—')}  pkgs=${String(detail?.packageCount ?? (pkgLines.length || '—'))}`,
    ...(generatePath
      ? [
          `PATH: ${generatePath.status} · ${generatePath.shape ?? '—'} · band=${generatePath.band ?? '—'} — ${generatePath.why}`,
        ]
      : []),
    `STEPS: ${Array.isArray(phaseTrace) && phaseTrace.length ? phaseTrace.join(' → ') : '—'}`,
  ]
  if (pipelineLines.length) {
    head.push('PIPELINE:')
    for (const row of pipelineLines) head.push(`  ${row}`)
  }
  if (pkgLines.length) {
    head.push('PACKAGES:')
    for (const row of pkgLines) head.push(`  ${row}`)
  }
  head.push(
    `FACTS: ${okFacts.length} ok / ${failedFacts.length} fail / ${factResults.length} total`,
  )
  if (failedFacts.length) {
    head.push('FACT FAILS:')
    for (const f of failedFacts.slice(0, 40)) {
      head.push(`  - ${f.id ?? '?'}: ${f.detail ?? 'fail'}`)
    }
  } else if (okFacts.length) {
    head.push('FACT OK (ids):')
    head.push(`  ${okFacts.map((f) => f.id ?? '?').join(', ')}`)
  }
  if (Array.isArray(warnings) && warnings.length) {
    head.push('WARN:')
    for (const w of warnings) head.push(`  - ${w}`)
  }
  if (Array.isArray(guardDrops) && guardDrops.length) {
    head.push('DROPS:')
    for (const d of guardDrops) head.push(`  - ${d}`)
  }
  if (spineDetractors.length) {
    head.push(`SPINE DETRACTORS: ${JSON.stringify(spineDetractors)}`)
  }
  if (assist.length) {
    head.push('ASSIST:')
    for (const row of assist) head.push(`  ${formatAssistDiagLine(row)}`)
  }
  const assistFacts = factResults.filter((f) => isAssistFact(f))
  if (assistFacts.length) {
    head.push('ASSIST FACTS:')
    for (const f of assistFacts.slice(0, 20)) {
      head.push(`  ${f.ok === false ? 'FAIL' : 'ok'} ${f.id ?? '?'}: ${f.detail ?? ''}`)
    }
  }
  const refFacts = factResults.filter((f) => isReferencesFact(f))
  if (refFacts.length) {
    head.push('REFERENCES FACTS:')
    for (const f of refFacts.slice(0, 16)) {
      head.push(`  ${f.ok === false ? 'FAIL' : 'ok'} ${f.id ?? '?'}: ${f.detail ?? ''}`)
    }
  }
  const criticAssist = Array.isArray(detail?.criticNotes)
    ? (detail.criticNotes as string[]).filter((n) => /assist/i.test(n))
    : []
  if (criticAssist.length) {
    head.push('CRITIC ASSIST:')
    for (const n of criticAssist.slice(0, 16)) head.push(`  ${n}`)
  }
  const assistDetractors = spineDetractors.filter((d) =>
    /assist/i.test(JSON.stringify(d)),
  )
  if (assistDetractors.length) {
    head.push(`ASSIST DETRACTORS: ${JSON.stringify(assistDetractors)}`)
  }
  const receipt = (editRun?.receipt ?? meta?.receipt ?? null) as
    | { lines?: unknown[]; summary?: string }
    | null
  const receiptAssist = Array.isArray(receipt?.lines)
    ? receipt.lines.map(String).filter((l) => /assist/i.test(l))
    : receipt?.summary && /assist/i.test(receipt.summary)
      ? [receipt.summary]
      : []
  if (receiptAssist.length) {
    head.push('RECEIPT ASSIST:')
    for (const line of receiptAssist.slice(0, 12)) head.push(`  ${line}`)
  }
  if (detail?.checkSkippedReason) head.push(`CHECK SKIP: ${String(detail.checkSkippedReason)}`)
  if (detail?.editorsBudgetPartial) head.push('BUDGET: editorsBudgetPartial=true')
  if (Array.isArray(detail?.composeNotes) && detail.composeNotes.length) {
    head.push(`COMPOSE: ${(detail.composeNotes as string[]).join(' | ')}`)
  }
  if (Array.isArray(detail?.stepGateFailures) && (detail.stepGateFailures as unknown[]).length) {
    head.push(`STEP GATES: ${JSON.stringify(detail.stepGateFailures)}`)
  }
  const scoreTrace = Array.isArray(detail?.scoreTrace)
    ? (detail.scoreTrace as string[])
    : Array.isArray(warnings)
      ? warnings.filter(
          (w) =>
            /talk_score_attach|talk_merge|prompt2_score_attach|talk_score_attach_plan/.test(w),
        )
      : []
  if (scoreTrace.length) {
    head.push('SCORE TRACE:')
    for (const row of scoreTrace.slice(0, 40)) head.push(`  ${row}`)
    if (scoreTrace.length > 40) head.push(`  … +${scoreTrace.length - 40} more`)
  }
  const criticTpl = Array.isArray(detail?.criticNotes)
    ? (detail.criticNotes as string[]).filter((n) =>
        /template_include|template_absent|facts_flipped_detach|attach|detach/i.test(n),
      )
    : []
  if (criticTpl.length) {
    head.push('CRITIC TPL:')
    for (const n of criticTpl.slice(0, 20)) head.push(`  ${n}`)
  }
  if (err) {
    head.push(`ERROR: ${err.code ?? ''} ${err.detail ?? err.message ?? ''}`.trim())
  }
  head.push('======== end PART 1/3 ========')

  const mid: string[] = [
    '======== Vurex DIAG PART 2/3 (CHECKS from live body) ========',
    `SUBSTANCE FAILS: ${substanceFails.length}`,
    ...substance.map((l) => `  ${l}`),
    '======== end PART 2/3 ========',
  ]

  const spine = spineDiagLines(body)
  const talkHosts = talkHostTemplateDiagLines(body)
  const tail: string[] = [
    '======== Vurex DIAG PART 3/3 (BOARD SNAPSHOT) ========',
    `sections (${spine.length}):`,
    ...(spine.length ? spine.map((s) => `  ${s}`) : ['  (none)']),
    `form kinds (${formKinds.length}): ${formKinds.length ? formKinds.join(', ') : '(none)'}${
      missingFormKinds.length ? ` | MISSING: ${missingFormKinds.join(', ')}` : ''
    }`,
    `templates (${templateIds.length}):`,
    `  ${templateIds.length ? templateIds.join(', ') : '(none)'}`,
  ]
  if (talkHosts.length) {
    tail.push('talk hosts:')
    for (const row of talkHosts) tail.push(`  ${row}`)
  }
  const refLines = (Array.isArray(body?.phases) ? (body.phases as Array<Record<string, unknown>>) : [])
    .filter((p) => p.kind === 'discussion')
    .map((p) => {
      const ids = readPhaseReferenceIds(p)
      return `${String(p.id ?? '?')} “${String(p.title ?? '').slice(0, 28)}” refs=${ids.length ? ids.join(',') : 'none'}`
    })
  if (refLines.length) {
    tail.push('talk references:')
    for (const row of refLines) tail.push(`  ${row}`)
  }
  if (timing.length) {
    tail.push('timers:')
    for (const t of timing) {
      const mode = t.timing && typeof t.timing.mode === 'string' ? t.timing.mode : '?'
      const mins = t.timing && t.timing.limitMinutes != null ? `${t.timing.limitMinutes}m` : ''
      tail.push(
        `  ${t.ref} ${t.type}/${mode}${mins}${t.timingNonCanonical ? ' NONCANONICAL' : ''}`,
      )
    }
  }
  if (assist.length) {
    tail.push('assist:')
    for (const row of assist) tail.push(`  ${formatAssistDiagLine(row)}`)
  }
  const hostAnalysis = hostAnalysisSnapshot(body)
  if (hostAnalysis.length) {
    tail.push('analysis hosts:')
    for (const row of hostAnalysis) tail.push(`  ${row}`)
  }
  tail.push('======== end Vurex DIAG (all 3 parts) ========')

  const planSource = String(
    editRun?.planSource ?? meta?.planSource ?? detail?.planSource ?? '—',
  )
  const hadFailures = Boolean(editRun?.hadFailures ?? meta?.hadFailures)
  const warnList = Array.isArray(warnings) ? warnings.map(String) : []
  // Drops live on meta AND editRun — merge so we never miss plan_llm_failed.
  const dropList = [
    ...((Array.isArray(meta?.guardDrops) ? meta.guardDrops : []) as unknown[]),
    ...((Array.isArray(editRun?.guardDrops) ? editRun.guardDrops : []) as unknown[]),
    ...((Array.isArray(guardDrops) ? guardDrops : []) as unknown[]),
  ]
    .map(String)
    .filter(Boolean)
  const uniqDrops = [...new Set(dropList)]
  const errorLines = pickErrorLines(uniqDrops, warnList)
  const rootCauses = collectDiagRootCauses({
    err,
    planSource,
    hadFailures,
    warnings: warnList,
    drops: uniqDrops,
    failedFacts,
    substanceFails,
    missingForm: formKinds.length === 0,
    spineLines: spine,
    assistLeftovers,
    userMessage: input.userMessage,
  })
  const compilerOk = isGenerateCompilerPlanSource(planSource, uniqDrops)
  const verdict =
    err ||
    (planSource === 'fallback' && !compilerOk) ||
    failedFacts.length > 0 ||
    substanceFails.length > 0 ||
    errorLines.length > 0
      ? 'degraded'
      : hadFailures
        ? 'partial'
        : 'ok'

  const primaryError =
    (err
      ? [err.code, err.detail, err.message].filter(Boolean).join(' — ')
      : null) ||
    errorLines[0] ||
    (planSource === 'fallback' && !compilerOk ? 'PLAN=fallback (see ERRORS below)' : null) ||
    (failedFacts[0]
      ? `fact ${failedFacts[0].id ?? '?'}: ${failedFacts[0].detail ?? 'fail'}`
      : null) ||
    (substanceFails[0] ? substanceFails[0].trim() : null)

  const summary: string[] = [
    '======== Vurex DIAG SUMMARY ========',
    `VERDICT: ${verdict}${input.source ? `  [${input.source}]` : ''}`,
    `ERROR: ${primaryError ? clipDiagText(primaryError, 220) : '(none)'}`,
    `PLAN: ${planSource}  mode=${String(editRun?.mode ?? meta?.mode ?? '—')}  bodyChanged=${String(editRun?.bodyChanged ?? meta?.bodyChanged ?? '—')}  hadFailures=${hadFailures}`,
    ...(generatePath
      ? [
          `PATH: ${generatePath.status} · ${generatePath.shape ?? '—'} · band=${generatePath.band ?? '—'} — ${generatePath.why}`,
        ]
      : []),
    `SPINE (${spine.length}): ${spine.length ? spine.map(compactSpineLabel).join(' · ') : '(none)'}`,
    `FACTS: ${okFacts.length} ok / ${failedFacts.length} fail`,
    `USER: ${clipDiagText(input.userMessage, 80)}`,
    `REPLY: ${clipDiagText(input.replyMarkdown, 100)}`,
  ]
  if (errorLines.length) {
    summary.push('ERRORS:')
    for (const line of errorLines.slice(0, 10)) {
      summary.push(`  - ${clipDiagText(line, 200)}`)
    }
  }
  if (rootCauses.length) {
    summary.push('ROOT:')
    for (const c of rootCauses.slice(0, 8)) summary.push(`  - ${c}`)
  } else if (!errorLines.length) {
    summary.push('ROOT: (none — turn looks clean)')
  }
  if (failedFacts.length) {
    summary.push('FACT FAILS:')
    for (const f of failedFacts.slice(0, 6)) {
      summary.push(`  - ${f.id ?? '?'}: ${clipDiagText(String(f.detail ?? 'fail'), 100)}`)
    }
  }
  if (timing.length) {
    summary.push('TIMERS:')
    for (const t of timing) {
      const mode = t.timing && typeof t.timing.mode === 'string' ? t.timing.mode : '?'
      const mins = t.timing && t.timing.limitMinutes != null ? `${t.timing.limitMinutes}m` : ''
      summary.push(`  ${t.ref} ${t.type}/${mode}${mins}`)
    }
  }
  if (assist.length) {
    summary.push('ASSIST:')
    for (const row of assist) summary.push(`  ${formatAssistDiagLine(row)}`)
  }
  const analysisHosts = hostAnalysisSnapshot(body)
  if (analysisHosts.length) {
    summary.push('ANALYSIS:')
    for (const row of analysisHosts) summary.push(`  ${row}`)
  }
  summary.push(
    `TEMPLATES shelf=${templateIds.length}${
      templateIds.length ? `: ${templateIds.join(', ')}` : ' (none — custom seed missing)'
    }`,
  )
  const planSnap =
    detail?.planTimerSnapshot && typeof detail.planTimerSnapshot === 'object'
      ? (detail.planTimerSnapshot as {
          workerMark?: string
          runAt?: string
          blankSlateMap?: Record<string, number>
          packages?: Array<{
            packageId?: string
            kind?: string
            limitMinutes?: number | null
            titleHint?: string
          }>
        })
      : null
  if (planSnap?.workerMark || planSnap?.runAt) {
    summary.push(
      `WORKER: ${planSnap.workerMark ?? '—'} ${planSnap.runAt ? planSnap.runAt : ''}`.trim(),
    )
  }
  if (planSnap?.blankSlateMap && Object.keys(planSnap.blankSlateMap).length) {
    summary.push(
      `BLANK-SLATE MAP: ${Object.entries(planSnap.blankSlateMap)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')}`,
    )
  }
  if (Array.isArray(planSnap?.packages) && planSnap.packages.length) {
    summary.push('PLANNER limitMinutes:')
    for (const p of planSnap.packages) {
      summary.push(
        `  ${p.packageId ?? '?'} [${p.kind ?? '?'}] → ${p.limitMinutes ?? '—'}m${
          p.titleHint ? ` “${String(p.titleHint).slice(0, 28)}”` : ''
        }`,
      )
    }
  }
  summary.push(
    '======== end SUMMARY (full PART 1–3: localStorage.vurexDiagVerbose = "1") ========',
  )

  const summaryText = summary.join('\n')
  console.log(summaryText)
  if (primaryError) {
    console.error('[Vurex] ERROR', clipDiagText(primaryError, 300))
  }
  if (errorLines.length > 1) {
    console.error('[Vurex] ERRORS', errorLines.slice(0, 10))
  }
  if (failedFacts.length) console.warn('[Vurex] fact fails', failedFacts.slice(0, 12))
  if (substanceFails.length) console.warn('[Vurex] substance fails', substanceFails)
  if (spineDetractors.length) console.warn('[Vurex] spineDetractors', spineDetractors)
  const nonCanonical = timing.filter((t) => t.timingNonCanonical)
  if (nonCanonical.length && !spineDetractors.length) {
    console.warn('[Vurex] non-canonical timing', nonCanonical)
  }
  if (assistLeftovers.length) {
    console.warn('[Vurex] leftover assist keys', assistLeftovers)
  }

  let verbose = false
  try {
    verbose =
      typeof localStorage !== 'undefined' && localStorage.getItem('vurexDiagVerbose') === '1'
  } catch {
    verbose = false
  }
  if (verbose) {
    console.log(head.join('\n'))
    console.log(mid.join('\n'))
    console.log(tail.join('\n'))
  }
}

/** Prefer real failure strings from drops/warns — never hide plan_llm_failed behind a vague label. */
function pickErrorLines(drops: string[], warnings: string[]): string[] {
  const pool = [...drops, ...warnings]
  const scored = pool
    .map((raw) => {
      const s = String(raw)
      let score = 0
      if (/plan_llm_failed|continue_llm_failed/i.test(s)) score += 100
      if (/429|no credits|insufficient_quota|billing/i.test(s)) score += 90
      if (/empty_flow|dud_excerpt|ungrounded|generate_compiler/i.test(s)) score += 85
      if (/invoke_failed|compose_fallback|timeout|abort/i.test(s)) score += 70
      if (/editor_fallback|editor_retry|repaired via fallback/i.test(s)) score += 50
      if (/_failed|error/i.test(s)) score += 30
      return { s, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  const out: string[] = []
  const seen = new Set<string>()
  for (const { s } of scored) {
    const key = s.slice(0, 160)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length >= 12) break
  }
  return out
}

function formatAssistDiagLine(row: {
  ref: string
  type: unknown
  bundleId: string
  caps: { chat: boolean; spoilers: boolean; write: boolean }
  leftovers: string[]
}): string {
  const leftover = row.leftovers.length ? ` LEFTOVER=${row.leftovers.join(',')}` : ''
  return `${row.ref} ${row.type}/${row.bundleId} chat=${row.caps.chat} spoilers=${row.caps.spoilers} write=${row.caps.write}${leftover}`
}

function isAssistFact(f: { id?: string; kind?: string; detail?: string }): boolean {
  const blob = `${f.id ?? ''} ${f.kind ?? ''} ${f.detail ?? ''}`
  return /assist|wantChat|wantSpoilers|wantWrite|wantBundleId/i.test(blob)
}

function isReferencesFact(f: { id?: string; kind?: string; detail?: string }): boolean {
  const blob = `${f.id ?? ''} ${f.kind ?? ''} ${f.detail ?? ''}`
  return /phase_references|wantPhaseId|references\.phaseIds/i.test(blob)
}

function compactSpineLabel(line: string): string {
  const m = line.match(/^\d+\.\s+(.+?)\s+\(([^)]+)\)/)
  if (!m) return line.slice(0, 40)
  const title = m[1].slice(0, 28)
  const kind = m[2].split(';')[0]?.trim() ?? m[2]
  return `${kind}:${title}`
}

function collectDiagRootCauses(input: {
  err: { code?: string | null; detail?: string | null; message?: string | null } | null
  planSource: string
  hadFailures: boolean
  warnings: string[]
  drops: string[]
  failedFacts: Array<{ id?: string; detail?: string }>
  substanceFails: string[]
  missingForm: boolean
  spineLines: string[]
  assistLeftovers?: Array<{ ref: string; leftovers: string[] }>
  userMessage?: string
}): string[] {
  const out: string[] = []
  const planFail = input.drops.find((d) => /plan_llm_failed|continue_llm_failed/i.test(d))
  if (planFail) {
    out.push(clipDiagText(planFail, 200))
  } else if (input.planSource === 'fallback' && !isGenerateCompilerPlanSource(input.planSource, input.drops)) {
    out.push('plan used FALLBACK — no plan_llm_failed drop in meta (check Edge logs)')
  }
  if (input.err) {
    out.push(
      `transport/error: ${[input.err.code, input.err.detail, input.err.message].filter(Boolean).join(' — ')}`,
    )
  }
  const billing = [...input.warnings, ...input.drops].find((w) =>
    /429|no credits|insufficient_quota|billing/i.test(w),
  )
  if (billing && (!planFail || !/429|credits|billing/i.test(planFail))) {
    out.push(`OpenAI billing/quota: ${clipDiagText(billing, 160)}`)
  }
  if (input.missingForm) {
    out.push('board has NO eligibility form (form_quiz missing from spine)')
  }
  const codingLive = input.spineLines.filter((l) => /^coding:/i.test(l) || /\(coding/i.test(l)).length
  const askedLadder =
    /\bassist\s*none\b/i.test(String(input.userMessage ?? '')) &&
    /\bcoach\b/i.test(String(input.userMessage ?? '')) &&
    /\bcopilot\b/i.test(String(input.userMessage ?? ''))
  if (askedLadder && codingLive > 0 && codingLive < 3) {
    out.push(`Assist ladder: live ${codingLive} coding section(s), expected 3 (None/Coach/Copilot)`)
  }
  const slotMiss = input.warnings.find((w) => /coding_slots_live_missing/i.test(w))
  if (slotMiss) {
    out.push(slotMiss)
  }
  const askedOwnership = /\b(ownership|on-call|oncall|incident leadership)\b/i.test(
    String(input.userMessage ?? ''),
  )
  const hasOwnershipTalk = input.spineLines.some(
    (l) => /Talk/i.test(l) && /ownership|reliability|incident|on-call|oncall/i.test(l),
  )
  const talkCount = input.spineLines.filter((l) => /\(Talk/i.test(l)).length
  if (
    !askedLadder &&
    askedOwnership &&
    talkCount <= 2 &&
    !hasOwnershipTalk &&
    input.spineLines.some((l) => /coding|doc|form/i.test(l))
  ) {
    out.push('deep ownership Talk may be missing (only open/close talks?)')
  }
  for (const s of input.substanceFails.slice(0, 4)) {
    out.push(`substance: ${s.replace(/^\s+/, '')}`)
  }
  for (const f of input.failedFacts.slice(0, 4)) {
    out.push(`fact: ${f.id ?? '?'}: ${clipDiagText(String(f.detail ?? 'fail'), 80)}`)
  }
  for (const row of (input.assistLeftovers ?? []).slice(0, 4)) {
    out.push(`assist leftover on ${row.ref}: ${row.leftovers.join(',')}`)
  }
  if (input.hadFailures && out.length === 0) {
    out.push('hadFailures=true but no classified root — enable vurexDiagVerbose')
  }
  return out
}
