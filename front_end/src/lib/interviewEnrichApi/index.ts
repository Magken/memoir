/**
 * interviewEnrichApi — Edge interview-brief-enrich (NDJSON text_delta into compose).
 *
 * Compose Enrich button only. Pipelines use batch via `_shared/interview-brief-enricher`.
 */
import { getSupabase, getSupabasePublicKey, getSupabaseUrl, DataApiError } from '../dataApi'
import type { InterviewComposeMeta } from '../interviewBrief/compose'

export type InterviewEnrichStreamHandlers = {
  onPhase?: (phase: string) => void
  onTag?: (label: string) => void
  onTextDelta?: (text: string) => void
  onDone?: (result: InterviewEnrichResult) => void
}

export type InterviewEnrichResult = {
  enrichedText: string
  warnings: string[]
  trimApplied: boolean
  meta: Record<string, unknown> | null
}

type EdgeEnvelope = {
  data?: {
    enrichedText?: string
    warnings?: string[]
    trimApplied?: boolean
  } | null
  meta?: Record<string, unknown> | null
  error?: { code?: string; detail?: string } | string | null
}

function throwEdgeError(body: EdgeEnvelope, status: number): never {
  const raw = body.error
  if (raw && typeof raw === 'object' && typeof raw.code === 'string') {
    const detail =
      typeof raw.detail === 'string' && raw.detail.trim() ? raw.detail.trim() : undefined
    if (detail && !detail.includes(' ')) {
      throw new DataApiError(detail as never, detail)
    }
    throw new DataApiError(raw.code as never, raw.code, detail)
  }
  if (typeof raw === 'string' && raw) {
    throw new DataApiError(raw as never, raw)
  }
  throw new DataApiError('unknown', `interview_brief_enrich_${status}`)
}

function unwrapDone(body: EdgeEnvelope): InterviewEnrichResult {
  if (body.error) throwEdgeError(body, 200)
  const data = body.data
  if (!data?.enrichedText || typeof data.enrichedText !== 'string') {
    throw new DataApiError('unknown', 'interview_brief_enrich_empty')
  }
  return {
    enrichedText: data.enrichedText,
    warnings: Array.isArray(data.warnings) ? data.warnings.map(String) : [],
    trimApplied: Boolean(data.trimApplied),
    meta: body.meta ?? null,
  }
}

/**
 * Stream enrich into the compose description box (delivery: stream_text).
 */
export async function enrichInterviewDescriptionStream(input: {
  skeletalText: string
  meta: Pick<
    InterviewComposeMeta,
    'title' | 'roleTitle' | 'category' | 'proposedMinutes' | 'description'
  >
  rolePdfText?: string | null
  signal?: AbortSignal
  handlers?: InterviewEnrichStreamHandlers
}): Promise<InterviewEnrichResult> {
  const supabase = getSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new DataApiError('not_authenticated', 'not_authenticated')
  }

  const base = getSupabaseUrl()
  const anon = getSupabasePublicKey()
  if (!base || !anon) {
    throw new DataApiError('unknown', 'missing_supabase_env')
  }

  const payload = {
    skeletalText: input.skeletalText,
    meta: {
      title: input.meta.title,
      roleTitle: input.meta.roleTitle,
      category: input.meta.category,
      proposedMinutes: input.meta.proposedMinutes,
      description: input.meta.description,
    },
    rolePdfText: input.rolePdfText ?? null,
    stream: true,
    delivery: 'stream_text' as const,
    trim: false,
  }

  const res = await fetch(`${base}/functions/v1/interview-brief-enrich`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson, application/json',
    },
    body: JSON.stringify(payload),
    signal: input.signal,
  })

  const ctype = res.headers.get('content-type') ?? ''
  const isNdjson = ctype.includes('ndjson') || ctype.includes('x-ndjson')

  if (!res.ok) {
    let body: EdgeEnvelope = {}
    try {
      body = (await res.json()) as EdgeEnvelope
    } catch {
      /* ignore */
    }
    throwEdgeError(body, res.status)
  }

  if (!isNdjson) {
    const body = (await res.json()) as EdgeEnvelope
    const result = unwrapDone(body)
    input.handlers?.onDone?.(result)
    return result
  }

  if (!res.body) {
    throw new DataApiError('unknown', 'interview_brief_enrich_empty_body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let carry = ''
  let result: InterviewEnrichResult | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    carry += decoder.decode(value, { stream: true })
    const lines = carry.split('\n')
    carry = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      let event: Record<string, unknown>
      try {
        event = JSON.parse(trimmed) as Record<string, unknown>
      } catch {
        continue
      }
      const type = event.type
      if (type === 'phase' && typeof event.phase === 'string') {
        input.handlers?.onPhase?.(event.phase)
      } else if (type === 'tag' && typeof event.label === 'string') {
        input.handlers?.onTag?.(event.label)
      } else if (type === 'text_delta' && typeof event.text === 'string') {
        input.handlers?.onTextDelta?.(event.text)
      } else if (type === 'done') {
        result = unwrapDone({
          data: event.data as EdgeEnvelope['data'],
          meta: (event.meta as Record<string, unknown>) ?? null,
          error: null,
        })
        input.handlers?.onDone?.(result)
      } else if (type === 'error') {
        throwEdgeError(
          { error: (event.error as EdgeEnvelope['error']) ?? { code: 'enrich_failed' } },
          200,
        )
      }
    }
  }

  if (carry.trim()) {
    try {
      const event = JSON.parse(carry.trim()) as Record<string, unknown>
      if (event.type === 'done') {
        result = unwrapDone({
          data: event.data as EdgeEnvelope['data'],
          meta: (event.meta as Record<string, unknown>) ?? null,
          error: null,
        })
        input.handlers?.onDone?.(result)
      } else if (event.type === 'error') {
        throwEdgeError(
          { error: (event.error as EdgeEnvelope['error']) ?? { code: 'enrich_failed' } },
          200,
        )
      }
    } catch (e) {
      if (e instanceof DataApiError) throw e
    }
  }

  if (!result) {
    throw new DataApiError('unknown', 'interview_brief_enrich_incomplete')
  }
  return result
}
