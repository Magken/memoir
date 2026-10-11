/**
 * FE client for Edge interview-copilot-edit (NDJSON plan/continue).
 * Same phases as interviewEditApi — different document (liveDoc, no brief persist).
 */
import { getSupabasePublicKey, getSupabaseUrl, DataApiError } from '../dataApi'
import { requireInterviewEdgeAccessToken } from './edgeAccessToken'
import type {
  InterviewEditMessagePart,
  InterviewEditPhase,
  InterviewEditQuestionnaire,
  InterviewEditResult,
  InterviewEditStreamHandlers,
  InterviewEditTagMeta,
} from '../interviewEditApi'

export type CopilotEditLiveDoc = {
  kind: 'form' | 'coding' | 'doc'
  generation: number
  snapshotHash: string
  form?: Record<string, unknown>
  coding?: Record<string, unknown>
  doc?: Record<string, unknown>
  selection?: Record<string, unknown>
  diagnostics?: Array<{ path: string; line: number; message: string }>
}

export type CopilotEditRequest = {
  briefId?: string
  liveDoc: CopilotEditLiveDoc
  history?: Array<{ role: string; text: string }>
  privileges: { caps: { chat?: boolean; spoilers?: boolean; write: boolean } }
  sectionContract?: {
    phaseId: string
    title: string
    kind: 'form' | 'coding' | 'doc'
    purpose: string
    identity: string
    may: string
    mustNot: string
  }
  persona?: { name: string; voice?: string; behaviourPrompt?: string }
  remainingMs?: number
  userMessage?: string
  mode: 'plan' | 'continue' | 'repair'
  editRunId?: string
  answers?: Record<string, string | string[]>
  skipped?: boolean
  pendingPlan?: Record<string, unknown>
  /** `mode: 'repair'` — our own dry-run against the live editor rejected the proposal. */
  repair?: { reason: string; rejectedOps?: unknown[] }
  day?: {
    continuing?: boolean
    previousSectionTitle?: string | null
    priorNote?: string | null
    standingNotes?: string | null
    candidateCvNote?: string | null
    dayHistoryTail?: Array<{
      role: 'assistant' | 'candidate'
      text: string
      phaseId: string
    }>
    referencedStages?: Array<{
      phaseId: string
      title: string
      kind: string
      available?: string[]
    }>
    candidateSafe?: {
      artifacts?: unknown[]
      runs?: unknown[]
      synths?: unknown[]
    }
  }
  editMemory?: Array<{
    status: 'accepted' | 'rejected' | 'applied'
    kind: 'form' | 'coding' | 'doc'
    locus: string
    summary: string
    at: number
  }>
}

export type CopilotEditHandlers = InterviewEditStreamHandlers
export type CopilotEditResult = InterviewEditResult
export type CopilotEditPhase = InterviewEditPhase
export type CopilotEditQuestionnaire = InterviewEditQuestionnaire
export type CopilotEditMessagePart = InterviewEditMessagePart
export type CopilotEditTagMeta = InterviewEditTagMeta

type EdgeEnvelope = {
  data?: {
    briefId?: string
    editRunId?: string
    replyParts?: InterviewEditMessagePart[]
  } | null
  meta?: Record<string, unknown> | null
  error?: { code?: string; detail?: string } | string | null
}

function copilotTokenError(token: string, code: DataApiError['code'] = 'unknown'): DataApiError {
  return new DataApiError(code, token, token)
}

function edgeError(body: EdgeEnvelope, status: number): DataApiError {
  const raw = body.error
  if (raw && typeof raw === 'object' && typeof raw.code === 'string') {
    const detail = typeof raw.detail === 'string' && raw.detail.trim() ? raw.detail.trim() : undefined
    return new DataApiError(raw.code as never, raw.code, detail)
  }
  if (typeof raw === 'string' && raw) return new DataApiError(raw as never, raw)
  return copilotTokenError(`interview_copilot_edit_${status}`)
}

function unwrapDone(body: EdgeEnvelope): InterviewEditResult {
  if (body.error) throw edgeError(body, 200)
  const data = body.data
  if (!data?.briefId) throw copilotTokenError('interview_copilot_edit_empty')
  return {
    briefId: data.briefId,
    editRunId: data.editRunId,
    replyParts: data.replyParts,
    meta: body.meta ?? null,
  }
}

async function runCopilotStream(
  payload: CopilotEditRequest,
  opts: { signal?: AbortSignal; handlers?: CopilotEditHandlers },
): Promise<InterviewEditResult> {
  const token = await requireInterviewEdgeAccessToken(null, payload.briefId)
  const base = getSupabaseUrl()
  const anon = getSupabasePublicKey()
  const body = { ...payload, stream: true }
  const url = `${base}/functions/v1/interview-copilot-edit`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson, application/json',
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    })
  } catch (e) {
    if (e instanceof DataApiError) throw e
    if (opts.signal?.aborted) throw e
    throw copilotTokenError('interview_copilot_edit_unreachable')
  }

  const ctype = (res.headers.get('content-type') || '').toLowerCase()
  const isNdjson = ctype.includes('ndjson') || ctype.includes('x-ndjson')

  if (!res.ok || !isNdjson || !res.body) {
    if (res.ok && !isNdjson) {
      const envelope = (await res.json().catch(() => ({}))) as EdgeEnvelope
      const result = unwrapDone(envelope)
      opts.handlers?.onPhase?.('done')
      opts.handlers?.onDone?.(result)
      return result
    }
    if (!res.ok) {
      const envelope = (await res.json().catch(() => ({}))) as EdgeEnvelope
      throw edgeError(envelope, res.status)
    }
    let retry: Response
    try {
      retry = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anon,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ ...payload, stream: false }),
        signal: opts.signal,
      })
    } catch (e) {
      if (e instanceof DataApiError) throw e
      if (opts.signal?.aborted) throw e
      throw copilotTokenError('interview_copilot_edit_unreachable')
    }
    const envelope = (await retry.json().catch(() => ({}))) as EdgeEnvelope
    if (!retry.ok) throw edgeError(envelope, retry.status)
    const result = unwrapDone(envelope)
    opts.handlers?.onPhase?.('done')
    opts.handlers?.onDone?.(result)
    return result
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let carry = ''
  let finalResult: InterviewEditResult | null = null

  const consumeLine = (trimmed: string) => {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      return
    }
    const type = String(event.type ?? '')
    if (type === 'ping') return
    if (type === 'phase') {
      opts.handlers?.onPhase?.(String(event.phase ?? '') as InterviewEditPhase)
      return
    }
    if (type === 'tag') {
      const label = typeof event.label === 'string' ? event.label : ''
      if (label) opts.handlers?.onTag?.(label, { kind: typeof event.kind === 'string' ? event.kind : undefined })
      return
    }
    if (type === 'questionnaire') {
      opts.handlers?.onQuestionnaire?.({
        title: typeof event.title === 'string' ? event.title : 'Questions',
        questions: Array.isArray(event.questions) ? (event.questions as InterviewEditQuestionnaire['questions']) : [],
        timeoutMs: typeof event.timeoutMs === 'number' ? event.timeoutMs : 90_000,
        editRunId: typeof event.editRunId === 'string' ? event.editRunId : '',
        deadlineAt:
          typeof event.deadlineAt === 'string'
            ? event.deadlineAt
            : new Date(Date.now() + 90_000).toISOString(),
      })
      return
    }
    if (type === 'reply_delta') {
      opts.handlers?.onReplyDelta?.(typeof event.text === 'string' ? event.text : '')
      return
    }
    if (type === 'reply_parts') {
      opts.handlers?.onReplyParts?.(
        Array.isArray(event.parts) ? (event.parts as InterviewEditMessagePart[]) : [],
      )
      return
    }
    if (type === 'done' && event.data && typeof event.data === 'object') {
      const data = event.data as {
        briefId?: string
        editRunId?: string
        replyParts?: InterviewEditMessagePart[]
      }
      if (!data.briefId) throw copilotTokenError('interview_copilot_edit_empty')
      finalResult = {
        briefId: data.briefId,
        editRunId: data.editRunId,
        replyParts: data.replyParts,
        meta: (event.meta as Record<string, unknown>) ?? null,
      }
      opts.handlers?.onDone?.(finalResult)
      return
    }
    if (type === 'error') {
      const errObj = event.error
      const code =
        errObj && typeof errObj === 'object'
          ? String((errObj as { code?: string }).code ?? 'unknown')
          : 'unknown'
      const detail =
        errObj && typeof errObj === 'object' && typeof (errObj as { detail?: string }).detail === 'string'
          ? (errObj as { detail: string }).detail
          : undefined
      throw new DataApiError(code as never, detail || code, detail)
    }
    if (type === 'cancelled') {
      opts.handlers?.onPhase?.('cancelled')
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    carry += decoder.decode(value || new Uint8Array(), { stream: !done })
    const lines = carry.split('\n')
    carry = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed) consumeLine(trimmed)
    }
    if (done) break
  }
  if (carry.trim()) consumeLine(carry.trim())
  if (!finalResult) throw copilotTokenError('interview_copilot_edit_empty')
  return finalResult
}

export function runCopilotEditPlan(
  payload: Omit<CopilotEditRequest, 'mode'>,
  opts: { signal?: AbortSignal; handlers?: CopilotEditHandlers } = {},
): Promise<InterviewEditResult> {
  return runCopilotStream({ ...payload, mode: 'plan' }, opts)
}

export function runCopilotEditContinue(
  payload: Omit<CopilotEditRequest, 'mode' | 'userMessage'> & { userMessage?: string },
  opts: { signal?: AbortSignal; handlers?: CopilotEditHandlers } = {},
): Promise<InterviewEditResult> {
  return runCopilotStream({ ...payload, mode: 'continue' }, opts)
}

/**
 * Ask for the same edit again after the live editor refused the proposal.
 *
 * Not a re-plan: the Edge skips the planner and re-enters the editor hop with the miss
 * quoted, so the retry costs one hop rather than a whole turn.
 */
export function runCopilotEditRepair(
  payload: Omit<CopilotEditRequest, 'mode'> & { repair: { reason: string; rejectedOps?: unknown[] } },
  opts: { signal?: AbortSignal; handlers?: CopilotEditHandlers } = {},
): Promise<InterviewEditResult> {
  return runCopilotStream({ ...payload, mode: 'repair' }, opts)
}
