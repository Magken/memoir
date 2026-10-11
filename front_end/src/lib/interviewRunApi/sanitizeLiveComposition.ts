/**
 * Sanitize live Form / Coding / Doc editor state for stage-assist context.
 * Never include answerKey, scores, or hidden-test oracles.
 */
import type { CodeEditorPayload, DocEditorPayload } from '../editorContext/types'
import type { TestFormDocument } from '../testForm/types'
import { formatHardTimerMmSs, hardTimerRemainingMs } from './hardTimerMath'

export type AssistLiveCompositionKind = 'form' | 'coding' | 'doc'

export type AssistLiveComposition = {
  kind: AssistLiveCompositionKind
  updatedAt: string
  /** Candidate-safe snapshot — never answerKey / hidden tests. */
  snapshot: Record<string, unknown>
  hasDraft: boolean
}

export type AssistTimerPack = {
  timed: boolean
  limitMinutes: number | null
  remainingMs: number | null
  remainingLabel: string | null
  expired: boolean
}

const FORM_ANSWER_CAP = 400
const CODE_FILE_CAP = 2_400
const CODE_FILE_MAX = 16
const DOC_BODY_CAP = 3_500

function trunc(s: string, n: number): string {
  const t = s.trim()
  if (t.length <= n) return t
  return `${t.slice(0, n)}…`
}

/** Strip secrets from a live TestForm document for assist. */
export function sanitizeFormLiveComposition(doc: TestFormDocument): AssistLiveComposition {
  const questions = doc.questions ?? []
  const responses = doc.attempt?.responses ?? {}
  const answered: Array<Record<string, unknown>> = []
  let answeredCount = 0
  let requiredAnswered = 0
  let requiredTotal = 0

  for (const q of questions) {
    if (q.required) requiredTotal += 1
    const raw = responses[q.id]
    if (raw == null) continue
    answeredCount += 1
    if (q.required) requiredAnswered += 1
    const opts =
      'options' in q && Array.isArray((q as { options?: Array<{ id: string; label: string }> }).options)
        ? (q as { options: Array<{ id: string; label: string }> }).options
        : []
    const labelFor = (id: string) => opts.find((o) => o.id === id)?.label ?? id
    let display: string | string[] | Record<string, string> | null = null
    if (typeof raw === 'object' && raw !== null) {
      const r = raw as Record<string, unknown>
      if (typeof r.text === 'string') display = trunc(r.text, FORM_ANSWER_CAP)
      else if (typeof r.optionId === 'string') display = labelFor(r.optionId)
      else if (Array.isArray(r.optionIds)) {
        display = r.optionIds.map((id) => labelFor(String(id)))
      } else if (r.blanks && typeof r.blanks === 'object') {
        const blanks: Record<string, string> = {}
        for (const [k, v] of Object.entries(r.blanks as Record<string, unknown>)) {
          blanks[k] = trunc(String(v ?? ''), 120)
        }
        display = blanks
      } else {
        display = trunc(JSON.stringify(raw), FORM_ANSWER_CAP)
      }
    } else {
      display = trunc(String(raw), FORM_ANSWER_CAP)
    }
    answered.push({
      questionId: q.id,
      questionPrompt: trunc(q.prompt, 220),
      kind: q.kind,
      required: Boolean(q.required),
      response: display,
    })
  }

  return {
    kind: 'form',
    updatedAt: new Date().toISOString(),
    hasDraft: answeredCount > 0,
    snapshot: {
      title: doc.title,
      progress: {
        answeredCount,
        questionCount: questions.length,
        requiredAnswered,
        requiredTotal,
      },
      responses: answered.slice(0, 40),
      note: 'Candidate responses only - never treat as correct answers. Do not reveal keys. Copilot proposes into the sitting editor; this Assist compose does not write.',
    },
  }
}

export type CodingAttachHint = {
  focusPath?: string | null
  attachedPaths?: readonly string[]
}

/** Live coding workspace for assist — candidate files only. */
export function sanitizeCodingLiveComposition(
  payload: CodeEditorPayload,
  attach?: CodingAttachHint,
): AssistLiveComposition {
  const files = (payload.files ?? [])
    .filter(
      (f) =>
        !/(^|\/)cases\.json$/i.test(f.path) &&
        !/reference/i.test(f.path) &&
        !/\/hidden/i.test(f.path),
    )
  const tree = files.map((f) => f.path)
  const listed = files.slice(0, CODE_FILE_MAX).map((f) => ({
      path: f.path,
      language: f.language,
      content: trunc(String(f.content ?? ''), CODE_FILE_CAP),
    }))
  const focus =
    String(attach?.focusPath ?? payload.activeId ?? '').trim() ||
    (typeof payload.activeId === 'string' ? payload.activeId : null)
  const requested = (attach?.attachedPaths ?? []).map(String).filter(Boolean)
  const attachedPaths = [...new Set([...(focus ? [focus] : []), ...requested])]
  const byPath = new Map(files.map((f) => [f.path, f]))
  const attachedFiles = attachedPaths.slice(0, CODE_FILE_MAX).map((path) => {
    const hit = byPath.get(path)
    return {
      path,
      language: hit?.language ?? null,
      content: trunc(String(hit?.content ?? ''), CODE_FILE_CAP),
    }
  })
  const hasDraft = listed.some((f) => f.content.trim().length > 0)
  return {
    kind: 'coding',
    updatedAt: new Date().toISOString(),
    hasDraft,
    snapshot: {
      title: payload.title ?? null,
      openIds: payload.openIds ?? [],
      activeId: payload.activeId ?? null,
      focusPath: focus,
      attachedPaths,
      attachedFiles,
      tree,
      files: listed,
      note: 'Live candidate files - clarify chrome and constraints. Do not invent hidden tests. Copilot proposes into the sitting editor; this Assist compose does not write. tree lists every path even when bodies are truncated. Prefer attachedFiles and focusPath as the files the candidate is working on.',
    },
  }
}

/** Live essay body for assist. */
export function sanitizeDocLiveComposition(
  payload: DocEditorPayload,
  limits?: { minWords?: number | null; maxWords?: number | null },
): AssistLiveComposition {
  const title = payload.title?.trim() || 'Untitled'
  const body = trunc(String(payload.markdown ?? ''), DOC_BODY_CAP)
  const words = body ? body.split(/\s+/).filter(Boolean).length : 0
  return {
    kind: 'doc',
    updatedAt: new Date().toISOString(),
    hasDraft: body.length > 0 || title !== 'Untitled',
    snapshot: {
      title,
      body,
      wordCount: words,
      minWords: limits?.minWords ?? null,
      maxWords: limits?.maxWords ?? null,
      note: 'Candidate draft only - restate prompt/rubric labels. Copilot proposes into the sitting editor; this Assist compose does not write.',
    },
  }
}

export function buildAssistTimerPack(input: {
  timed: boolean
  limitMinutes: number | null
  deadlineAt: string | null
  now?: number
}): AssistTimerPack {
  if (!input.timed) {
    return {
      timed: false,
      limitMinutes: input.limitMinutes,
      remainingMs: null,
      remainingLabel: null,
      expired: false,
    }
  }
  if (!input.deadlineAt) {
    return {
      timed: true,
      limitMinutes: input.limitMinutes,
      remainingMs: null,
      remainingLabel: null,
      expired: false,
    }
  }
  const remainingMs = hardTimerRemainingMs(input.deadlineAt, input.now)
  return {
    timed: true,
    limitMinutes: input.limitMinutes,
    remainingMs,
    remainingLabel: formatHardTimerMmSs(remainingMs),
    expired: remainingMs <= 0,
  }
}
