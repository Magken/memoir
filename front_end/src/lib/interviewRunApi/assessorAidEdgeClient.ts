/**
 * FE client for Edge interview-assessor-aid (buffered or NDJSON stream).
 */
import {
  DataApiError,
  getSupabase,
  getSupabasePublicKey,
  getSupabaseUrl,
  type DataApiErrorCode,
} from '../dataApi'
import { requireInterviewEdgeAccessToken } from './edgeAccessToken'
import type { AssessorAidContext } from './buildAssessorAidContext'

export type AssessorAidComposeResult = {
  utterance: string
  composeMeta: {
    situation: string
    model: string
    sampleIdsUsed: string[]
    citeMessageIds?: string[]
    citeTopicId?: string
    openRefs?: Array<{ sectionId: string; stage?: 'chat' | 'editor'; label: string }>
    mode?: string
    planSource?: string
    phaseTrace?: string[]
    peelUserLines?: string[]
    from?: 'edge' | 'fallback'
    /** Guard drops from plan + compose hops, e.g. `compose_echo:msg.7:equal draft="…"`. */
    drops?: string[]
    homes?: string[]
    needs?: string[]
    retrieved?: string[]
    injectMiss?: string[]
  }
}

type EdgeEnvelope<T> = {
  data?: T | null
  error?: { code?: string; detail?: string } | string | null
}

function edgeErrorCode(error: EdgeEnvelope<unknown>['error']): string {
  if (!error) return 'unknown'
  if (typeof error === 'string') return error
  return error.code || 'unknown'
}

const AID_KNOWN_CODES = ['missing_openai_key', 'compose_empty', 'not_authenticated'] as const

/**
 * Kong returns HTML on 502/503 while Edge is restarting, and 546
 * (`WORKER_RESOURCE_LIMIT`) when the isolate hits CPU/memory. Parsing that as
 * JSON used to leave the code as "unknown", so DIAG could not tell a dead
 * gateway from a compose bug. The status is the only signal in that case.
 * 546 is not a restart — do not map it to http_503.
 */
export function classifyAssessorAidHttpError(input: {
  status: number
  error?: EdgeEnvelope<unknown>['error']
}): { code: DataApiErrorCode; message: string } {
  let raw = edgeErrorCode(input.error)
  if (input.status === 401) raw = 'not_authenticated'
  if ((AID_KNOWN_CODES as readonly string[]).includes(raw)) {
    return { code: raw as DataApiErrorCode, message: raw }
  }
  if (
    input.status === 546 ||
    raw === 'WORKER_RESOURCE_LIMIT' ||
    raw === 'WORKER_LIMIT'
  ) {
    return { code: 'unknown', message: 'http_546' }
  }
  const message = raw && raw !== 'unknown' ? raw : `http_${input.status}`
  return { code: 'unknown', message }
}

function unwrapResult(
  payload: AssessorAidComposeResult | null | undefined,
  situation: string,
): AssessorAidComposeResult {
  if (!payload?.utterance?.trim()) {
    throw new DataApiError('compose_empty', 'compose_empty')
  }
  return {
    utterance: payload.utterance.trim(),
    composeMeta: {
      situation: payload.composeMeta?.situation ?? situation,
      model: payload.composeMeta?.model ?? '',
      sampleIdsUsed: payload.composeMeta?.sampleIdsUsed ?? [],
      citeMessageIds: Array.isArray(payload.composeMeta?.citeMessageIds)
        ? payload.composeMeta.citeMessageIds.map(String)
        : [],
      citeTopicId: payload.composeMeta?.citeTopicId,
      openRefs: Array.isArray(payload.composeMeta?.openRefs)
        ? payload.composeMeta.openRefs
            .map((row) => {
              if (!row || typeof row !== 'object') return null
              const rec = row as { sectionId?: unknown; stage?: unknown; label?: unknown }
              const sectionId = String(rec.sectionId ?? '').trim()
              if (!sectionId) return null
              const stage = rec.stage === 'editor' || rec.stage === 'chat' ? rec.stage : undefined
              const label = String(rec.label ?? '').trim() || sectionId
              return { sectionId, ...(stage ? { stage } : {}), label }
            })
            .filter((row): row is { sectionId: string; stage?: 'chat' | 'editor'; label: string } => Boolean(row))
        : [],
      mode: payload.composeMeta?.mode,
      planSource: payload.composeMeta?.planSource,
      phaseTrace: Array.isArray(payload.composeMeta?.phaseTrace)
        ? payload.composeMeta.phaseTrace.map(String)
        : [],
      peelUserLines: Array.isArray(payload.composeMeta?.peelUserLines)
        ? payload.composeMeta.peelUserLines.map(String)
        : [],
      from: payload.composeMeta?.from,
      drops: Array.isArray(payload.composeMeta?.drops)
        ? payload.composeMeta.drops.map(String)
        : [],
      homes: Array.isArray(payload.composeMeta?.homes)
        ? payload.composeMeta.homes.map(String)
        : [],
      needs: Array.isArray(payload.composeMeta?.needs)
        ? payload.composeMeta.needs.map(String)
        : [],
      retrieved: Array.isArray(payload.composeMeta?.retrieved)
        ? payload.composeMeta.retrieved.map(String)
        : [],
      injectMiss: Array.isArray(payload.composeMeta?.injectMiss)
        ? payload.composeMeta.injectMiss.map(String)
        : [],
    },
  }
}

async function streamAssessorAid(input: {
  assessorAidContext: AssessorAidContext
  messages: Array<{ role: string; text: string }>
  situation: string
  accessToken?: string | null
  briefId?: string | null
  onUtteranceDelta?: (delta: string, full: string) => void
}): Promise<AssessorAidComposeResult> {
  const token = await requireInterviewEdgeAccessToken(input.accessToken, input.briefId)
  const base = getSupabaseUrl()
  if (!base) throw new DataApiError('unknown', 'missing_supabase_url')

  const res = await fetch(`${base}/functions/v1/interview-assessor-aid`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: getSupabasePublicKey(),
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
    },
    body: JSON.stringify({
      assessorAidContext: input.assessorAidContext,
      messages: input.messages,
      situation: input.situation,
      stream: true,
      ...(input.briefId ? { briefId: input.briefId } : {}),
    }),
  })

  if (!res.ok || !res.body) {
    let error: EdgeEnvelope<unknown>['error']
    try {
      const env = (await res.json()) as EdgeEnvelope<unknown>
      error = env.error
    } catch {
      /* Kong HTML 503 / empty gateway body */
    }
    const { code, message } = classifyAssessorAidHttpError({ status: res.status, error })
    throw new DataApiError(code, message)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let full = ''
  let finalResult: AssessorAidComposeResult | null = null
  let streamError: { code: string; detail?: string } | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      let event: {
        type?: string
        text?: string
        data?: AssessorAidComposeResult
        error?: { code?: string; detail?: string }
      }
      try {
        event = JSON.parse(trimmed) as typeof event
      } catch {
        continue
      }
      if (event.type === 'utterance_delta' && typeof event.text === 'string') {
        full += event.text
        input.onUtteranceDelta?.(event.text, full)
      } else if (event.type === 'done' && event.data) {
        finalResult = unwrapResult(event.data, input.situation)
      } else if (event.type === 'error' && event.error) {
        streamError = {
          code: event.error.code || 'unknown',
          detail: event.error.detail,
        }
      }
    }
  }

  if (streamError) {
    const code = streamError.code
    throw new DataApiError(
      (code === 'missing_openai_key' || code === 'compose_empty' || code === 'not_authenticated'
        ? code
        : 'unknown') as DataApiErrorCode,
      streamError.detail || streamError.code,
    )
  }
  if (!finalResult) {
    throw new DataApiError('unknown', 'interview_assessor_aid_incomplete_stream')
  }
  return finalResult
}

export async function composeAssessorAid(input: {
  assessorAidContext: AssessorAidContext
  messages: Array<{ role: string; text: string }>
  situation?: string
  accessToken?: string | null
  briefId?: string | null
  onUtteranceDelta?: (delta: string, full: string) => void
  stream?: boolean
}): Promise<AssessorAidComposeResult> {
  const situation = input.situation ?? 'clarify'
  const wantStream = input.stream !== false && Boolean(input.onUtteranceDelta)

  if (wantStream) {
    return streamAssessorAid({
      assessorAidContext: input.assessorAidContext,
      messages: input.messages,
      situation,
      accessToken: input.accessToken,
      briefId: input.briefId,
      onUtteranceDelta: input.onUtteranceDelta,
    })
  }

  const token = await requireInterviewEdgeAccessToken(input.accessToken, input.briefId)
  const supabase = getSupabase()
  const { data, error } = await supabase.functions.invoke('interview-assessor-aid', {
    body: {
      assessorAidContext: input.assessorAidContext,
      messages: input.messages,
      situation,
      stream: false,
      ...(input.briefId ? { briefId: input.briefId } : {}),
    },
    headers: { Authorization: `Bearer ${token}` },
  })

  if (error) {
    let code: 'missing_openai_key' | 'unknown' = 'unknown'
    if (/openai|missing_openai/i.test(error.message)) code = 'missing_openai_key'
    throw new DataApiError(code, error.message || code)
  }

  const env = data as EdgeEnvelope<AssessorAidComposeResult>
  if (env?.error) {
    const code = edgeErrorCode(env.error)
    throw new DataApiError(
      (code === 'missing_openai_key' || code === 'compose_empty' || code === 'not_authenticated'
        ? code
        : 'unknown') as DataApiErrorCode,
      code,
    )
  }
  return unwrapResult(env?.data, situation)
}
