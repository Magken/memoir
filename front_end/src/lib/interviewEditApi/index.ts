/**
 * interviewEditApi — Edge interview-brief-edit (NDJSON chat-driven Creator-2 board edits).
 *
 * plan: userMessage -> plan -> (questionnaire | execute) -> persist -> reply.
 * continue: editRunId (+ answers | skipped) -> continue plan -> execute -> persist -> reply.
 */
import { getSupabase, getSupabasePublicKey, getSupabaseUrl, DataApiError } from '../dataApi'

export type InterviewEditPhase =
  | 'resolve'
  | 'planning'
  | 'await_questionnaire'
  | 'continue_planning'
  | 'editing'
  | 'checking'
  | 'finalising'
  | 'done'
  | 'cancelled'

export type InterviewEditMessagePart =
  | { type: 'markdown'; text: string }
  | { type: 'thinking'; text: string; summary?: string; collapsed?: boolean }
  | { type: 'divider'; label?: string }
  | {
      type: 'card'
      title: string
      body?: string
      intent: 'scroll' | 'open' | 'save' | 'apply'
      targetSectionId?: string
      actionId?: string
    }

export type InterviewEditQuestionOption = {
  id: string
  label: string
  /** Machine meaning folded into continue context when chosen. */
  interpretation?: string
}

export type InterviewEditQuestion = {
  id: string
  prompt: string
  kind: 'text' | 'single' | 'multi'
  options?: InterviewEditQuestionOption[]
  allowText?: boolean
  placeholder?: string
}

export type InterviewEditQuestionnaire = {
  title: string
  questions: InterviewEditQuestion[]
  timeoutMs: number
  editRunId: string
  deadlineAt: string
}

export type InterviewEditTagMeta = { kind?: string; index?: number; total?: number }

export type InterviewEditStreamHandlers = {
  onPhase?: (phase: InterviewEditPhase) => void
  onTag?: (label: string, meta?: InterviewEditTagMeta) => void
  onThinkingDelta?: (text: string) => void
  onThinkingDone?: (text?: string) => void
  onPlanDelta?: (text: string) => void
  /** Critic-final planner packages + blank-slate timer map (always log in compose Generate). */
  onPlanSnapshot?: (snapshot: Record<string, unknown>) => void
  onQuestionnaire?: (questionnaire: InterviewEditQuestionnaire) => void
  onReplyDelta?: (text: string) => void
  onReplyParts?: (parts: InterviewEditMessagePart[]) => void
  onDone?: (result: InterviewEditResult) => void
  onError?: (err: DataApiError) => void
}

export type InterviewEditResult = {
  briefId: string
  body?: Record<string, unknown>
  editRunId?: string
  replyParts?: InterviewEditMessagePart[]
  meta?: Record<string, unknown> | null
}

type EdgeEnvelope = {
  data?: {
    briefId?: string
    body?: Record<string, unknown>
    editRunId?: string
    replyParts?: InterviewEditMessagePart[]
  } | null
  meta?: Record<string, unknown> | null
  error?: { code?: string; detail?: string } | string | null
}

type RequestPayload = {
  accountId: string
  briefId: string
  conversationId?: string
  userMessage?: string
  mode: 'plan' | 'continue'
  editRunId?: string
  answers?: Record<string, string | string[]>
  skipped?: boolean
  stream?: boolean
}

function edgeError(body: EdgeEnvelope, status: number): DataApiError {
  const raw = body.error
  if (raw && typeof raw === 'object' && typeof raw.code === 'string') {
    const detail =
      typeof raw.detail === 'string' && raw.detail.trim() ? raw.detail.trim() : undefined
    // Prefer machine detail when it is a known soft code (e.g. edit_run_not_found).
    if (detail && !detail.includes(' ')) {
      return new DataApiError(detail as never, detail)
    }
    return new DataApiError(raw.code as never, raw.code, detail)
  }
  if (typeof raw === 'string' && raw) {
    return new DataApiError(raw as never, raw)
  }
  return new DataApiError('unknown', `interview_brief_edit_${status}`)
}

function unwrapDone(body: EdgeEnvelope): InterviewEditResult {
  if (body.error) throw edgeError(body, 200)
  const data = body.data
  if (!data?.briefId) {
    throw new DataApiError('unknown', 'interview_brief_edit_empty')
  }
  return {
    briefId: data.briefId,
    body: data.body,
    editRunId: data.editRunId,
    replyParts: data.replyParts,
    meta: body.meta ?? null,
  }
}

/** Streams Edge interview-brief-edit; falls back to non-stream once if buffered JSON comes back. */
async function runEditStream(
  payload: RequestPayload,
  opts: { signal?: AbortSignal; handlers?: InterviewEditStreamHandlers },
): Promise<InterviewEditResult> {
  const supabase = getSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    console.error('[compose-generate]', 'edit-api:not-authenticated', {
      mode: payload.mode,
      briefId: payload.briefId,
    })
    throw new DataApiError('not_authenticated', 'not_authenticated')
  }

  const base = getSupabaseUrl()
  const anon = getSupabasePublicKey()
  const body = { ...payload, stream: true }

  console.log('[compose-generate]', 'edit-api:fetch', {
    mode: payload.mode,
    briefId: payload.briefId,
    accountId: payload.accountId,
    editRunId: payload.editRunId ?? null,
    skipped: payload.skipped ?? null,
    messageChars: payload.userMessage?.length ?? 0,
    url: `${base}/functions/v1/interview-brief-edit`,
  })

  const res = await fetch(`${base}/functions/v1/interview-brief-edit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson, application/json',
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })

  const ctype = (res.headers.get('content-type') || '').toLowerCase()
  const isNdjson = ctype.includes('ndjson') || ctype.includes('x-ndjson')

  console.log('[compose-generate]', 'edit-api:response', {
    mode: payload.mode,
    status: res.status,
    ok: res.ok,
    contentType: ctype || null,
    isNdjson,
    hasBody: Boolean(res.body),
  })

  if (!res.ok || !isNdjson || !res.body) {
    if (res.ok && !isNdjson) {
      const envelope = (await res.json().catch(() => ({}))) as EdgeEnvelope
      console.log('[compose-generate]', 'edit-api:buffered-json', {
        mode: payload.mode,
        hasError: Boolean(envelope.error),
        hasData: Boolean(envelope.data),
        metaKeys: envelope.meta ? Object.keys(envelope.meta) : [],
      })
      const result = unwrapDone(envelope)
      opts.handlers?.onPhase?.('done')
      opts.handlers?.onDone?.(result)
      return result
    }
    if (!res.ok) {
      const envelope = (await res.json().catch(() => ({}))) as EdgeEnvelope
      console.error('[compose-generate]', 'edit-api:http-error', {
        mode: payload.mode,
        status: res.status,
        error: envelope.error ?? null,
        meta: envelope.meta ?? null,
      })
      throw edgeError(envelope, res.status)
    }
    // Retry without stream.
    console.warn('[compose-generate]', 'edit-api:retry-non-stream', {
      mode: payload.mode,
      status: res.status,
      contentType: ctype || null,
    })
    const retry = await fetch(`${base}/functions/v1/interview-brief-edit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anon,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ...body, stream: false }),
      signal: opts.signal,
    })
    const envelope = (await retry.json().catch(() => ({}))) as EdgeEnvelope
    if (!retry.ok) {
      console.error('[compose-generate]', 'edit-api:retry-http-error', {
        mode: payload.mode,
        status: retry.status,
        error: envelope.error ?? null,
      })
      throw edgeError(envelope, retry.status)
    }
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
      const phase = String(event.phase ?? '') as InterviewEditPhase
      opts.handlers?.onPhase?.(phase)
      return
    }
    if (type === 'tag') {
      const label = typeof event.label === 'string' ? event.label : ''
      if (label) {
        opts.handlers?.onTag?.(label, {
          kind: typeof event.kind === 'string' ? event.kind : undefined,
          index: typeof event.index === 'number' ? event.index : undefined,
          total: typeof event.total === 'number' ? event.total : undefined,
        })
      }
      return
    }
    if (type === 'thinking_delta') {
      opts.handlers?.onThinkingDelta?.(typeof event.text === 'string' ? event.text : '')
      return
    }
    if (type === 'thinking_done') {
      opts.handlers?.onThinkingDone?.(typeof event.text === 'string' ? event.text : undefined)
      return
    }
    if (type === 'plan_delta') {
      opts.handlers?.onPlanDelta?.(typeof event.text === 'string' ? event.text : '')
      return
    }
    if (type === 'plan_snapshot') {
      const snapshot = { ...event }
      delete (snapshot as { type?: string }).type
      const pkgs = Array.isArray(snapshot.packages)
        ? (snapshot.packages as Array<Record<string, unknown>>)
        : []
      console.log('[compose-generate]', 'edit-api:plan_snapshot', {
        workerMark: snapshot.workerMark ?? null,
        runAt: snapshot.runAt ?? null,
        pkgCount: pkgs.length,
        packages: pkgs.map((p) => {
          const id = String(p.packageId ?? '?')
          const kind = String(p.kind ?? '?')
          const mins = p.limitMinutes != null ? `${p.limitMinutes}m` : '—'
          const hint = p.titleHint ? String(p.titleHint).slice(0, 28) : ''
          return hint ? `${id} [${kind}] ${mins} “${hint}”` : `${id} [${kind}] ${mins}`
        }),
        blankSlateMap: snapshot.blankSlateMap ?? null,
        dropCount: Array.isArray(snapshot.guardDrops) ? snapshot.guardDrops.length : 0,
      })
      opts.handlers?.onPlanSnapshot?.(snapshot)
      return
    }
    if (type === 'questionnaire') {
      opts.handlers?.onQuestionnaire?.({
        title: typeof event.title === 'string' ? event.title : 'Questions',
        questions: Array.isArray(event.questions)
          ? (event.questions as InterviewEditQuestion[])
          : [],
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
        body?: Record<string, unknown>
        editRunId?: string
        replyParts?: InterviewEditMessagePart[]
      }
      if (!data.briefId) {
        throw new DataApiError('unknown', 'interview_brief_edit_empty')
      }
      finalResult = {
        briefId: data.briefId,
        body: data.body,
        editRunId: data.editRunId,
        replyParts: data.replyParts,
        meta: (event.meta as Record<string, unknown>) ?? null,
      }
      opts.handlers?.onDone?.(finalResult)
      return
    }
    if (type === 'error') {
      console.error('[compose-generate]', 'edit-api:ndjson-error', event)
      const errObj = event.error
      let err: DataApiError
      if (errObj && typeof errObj === 'object') {
        const code = String((errObj as { code?: string }).code ?? 'unknown')
        const detail =
          typeof (errObj as { detail?: string }).detail === 'string'
            ? (errObj as { detail: string }).detail
            : undefined
        err =
          detail && !detail.includes(' ')
            ? new DataApiError(detail as never, detail)
            : new DataApiError(code as never, code, detail)
      } else {
        err = new DataApiError('unknown', 'interview_brief_edit_failed')
      }
      opts.handlers?.onError?.(err)
      throw err
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    carry += decoder.decode(value, { stream: true })
    const lines = carry.split('\n')
    carry = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed) consumeLine(trimmed)
    }
  }
  if (carry.trim()) consumeLine(carry.trim())

  if (!finalResult) {
    console.error('[compose-generate]', 'edit-api:incomplete-stream', {
      mode: payload.mode,
      briefId: payload.briefId,
      carryChars: carry.length,
    })
    throw new DataApiError('unknown', 'interview_brief_edit_incomplete')
  }
  return finalResult
}

/** Start a new board edit turn from a free-text user message. */
export async function runBoardEditPlan(input: {
  accountId: string
  briefId: string
  conversationId?: string
  userMessage: string
  signal?: AbortSignal
  handlers?: InterviewEditStreamHandlers
}): Promise<InterviewEditResult> {
  const message = input.userMessage.trim()
  if (!message) {
    throw new DataApiError('empty_message' as never, 'empty_message')
  }
  return runEditStream(
    {
      accountId: input.accountId,
      briefId: input.briefId,
      conversationId: input.conversationId,
      userMessage: message,
      mode: 'plan',
    },
    { signal: input.signal, handlers: input.handlers },
  )
}

/** Continue a paused board edit turn — answers (or skipped) feed the refined plan. */
export async function runBoardEditContinue(input: {
  accountId: string
  briefId: string
  conversationId?: string
  editRunId: string
  answers?: Record<string, string | string[]>
  skipped?: boolean
  signal?: AbortSignal
  handlers?: InterviewEditStreamHandlers
}): Promise<InterviewEditResult> {
  return runEditStream(
    {
      accountId: input.accountId,
      briefId: input.briefId,
      conversationId: input.conversationId,
      mode: 'continue',
      editRunId: input.editRunId,
      answers: input.answers,
      skipped: input.skipped,
    },
    { signal: input.signal, handlers: input.handlers },
  )
}
