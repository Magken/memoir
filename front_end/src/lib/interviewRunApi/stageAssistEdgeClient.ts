/**
 * FE client for Edge interview-stage-assist (buffered or NDJSON stream).
 */
import {
  DataApiError,
  getSupabase,
  getSupabasePublicKey,
  getSupabaseUrl,
  type DataApiErrorCode,
} from '../dataApi'
import { requireInterviewEdgeAccessToken } from './edgeAccessToken'
import type { StageAssistContext } from './buildStageAssistContext'

export type StageAssistComposeResult = {
  utterance: string
  composeMeta: {
    situation: string
    model: string
    sampleIdsUsed: string[]
    injectTrace?: { contract?: boolean; peel?: boolean; liveMap?: boolean }
    injectMiss?: string[]
  }
  /** When always-on + current packs lack facts — FE retrieves then re-composes once. */
  needRetrieval?: {
    needs: Array<{ sourceId: string; query?: string; phaseId?: string; reason: string }>
  } | null
  persistNotes?: Array<{ kind: string; key?: string; text: string }>
  /** Copilot write — FE applies locally; drop when !caps.write. */
  editorApply?: {
    kind: 'form' | 'coding' | 'doc'
    responses?: Array<{ questionId: string; value: unknown }>
    files?: Array<{ path: string; contents: string }>
    markdown?: string
    title?: string
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

function unwrapResult(
  payload: StageAssistComposeResult | null | undefined,
  situation: string,
): StageAssistComposeResult {
  if (!payload) throw new DataApiError('compose_empty', 'compose_empty')
  const needRetrieval =
    payload.needRetrieval && typeof payload.needRetrieval === 'object'
      ? payload.needRetrieval
      : null
  if (needRetrieval && !payload.utterance?.trim()) {
    return {
      utterance: '',
      composeMeta: payload.composeMeta ?? {
        situation,
        model: '',
        sampleIdsUsed: [],
        injectMiss: [],
      },
      needRetrieval,
    }
  }
  if (!payload.utterance?.trim() && !needRetrieval) {
    throw new DataApiError('compose_empty', 'compose_empty')
  }
  return {
    utterance: payload.utterance?.trim() || '',
    composeMeta: payload.composeMeta ?? {
      situation,
      model: '',
      sampleIdsUsed: [],
      injectMiss: [],
    },
    needRetrieval,
    persistNotes: Array.isArray(payload.persistNotes) ? payload.persistNotes : undefined,
    editorApply:
      payload.editorApply && typeof payload.editorApply === 'object'
        ? payload.editorApply
        : undefined,
  }
}

async function streamStageAssist(input: {
  stageAssistContext: StageAssistContext
  messages: Array<{ role: string; text: string }>
  situation: string
  retrievalPass: 0 | 1
  retrievedSourceIds: string[]
  accessToken?: string | null
  onUtteranceDelta?: (delta: string, full: string) => void
}): Promise<StageAssistComposeResult> {
  const token = await requireInterviewEdgeAccessToken(
    input.accessToken,
    input.stageAssistContext?.briefId,
  )
  const base = getSupabaseUrl()
  if (!base) throw new DataApiError('unknown', 'missing_supabase_url')

  const res = await fetch(`${base}/functions/v1/interview-stage-assist`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: getSupabasePublicKey(),
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
    },
    body: JSON.stringify({
      stageAssistContext: input.stageAssistContext,
      messages: input.messages,
      situation: input.situation,
      retrievalPass: input.retrievalPass,
      retrievedSourceIds: input.retrievedSourceIds,
      stream: true,
    }),
  })

  if (!res.ok || !res.body) {
    let code = 'unknown'
    try {
      const env = (await res.json()) as EdgeEnvelope<unknown>
      code = edgeErrorCode(env.error) || code
    } catch {
      /* ignore */
    }
    if (res.status === 401) code = 'not_authenticated'
    throw new DataApiError(
      (code === 'missing_openai_key' ? 'missing_openai_key' : code) as DataApiErrorCode,
      code,
    )
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let full = ''
  let finalResult: StageAssistComposeResult | null = null
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
        data?: StageAssistComposeResult
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
    throw new DataApiError(
      streamError.code === 'missing_openai_key' ? 'missing_openai_key' : 'unknown',
      streamError.detail || streamError.code,
    )
  }
  if (!finalResult) {
    throw new DataApiError('unknown', 'interview_stage_assist_incomplete_stream')
  }
  return finalResult
}

export async function composeStageAssist(input: {
  stageAssistContext: StageAssistContext
  messages: Array<{ role: string; text: string }>
  situation?: string
  /** 0 = first compose; 1 = after broader retrieve — must answer or admit. */
  retrievalPass?: 0 | 1
  retrievedSourceIds?: string[]
  /** Reuse JWT from the same turn (skip repeated getSession). */
  accessToken?: string | null
  /** Live utterance growth (NDJSON stream). */
  onUtteranceDelta?: (delta: string, full: string) => void
  /** Default true when onUtteranceDelta is set. */
  stream?: boolean
}): Promise<StageAssistComposeResult> {
  const situation = input.situation ?? 'clarify'
  const retrievalPass = input.retrievalPass ?? 0
  const wantStream = input.stream !== false && Boolean(input.onUtteranceDelta)

  if (wantStream) {
    return streamStageAssist({
      stageAssistContext: input.stageAssistContext,
      messages: input.messages,
      situation,
      retrievalPass,
      retrievedSourceIds: input.retrievedSourceIds ?? [],
      accessToken: input.accessToken,
      onUtteranceDelta: input.onUtteranceDelta,
    })
  }

  const token = await requireInterviewEdgeAccessToken(
    input.accessToken,
    input.stageAssistContext?.briefId,
  )
  const supabase = getSupabase()

  const { data, error } = await supabase.functions.invoke('interview-stage-assist', {
    body: {
      stageAssistContext: input.stageAssistContext,
      messages: input.messages,
      situation,
      retrievalPass,
      retrievedSourceIds: input.retrievedSourceIds ?? [],
      stream: false,
    },
    headers: { Authorization: `Bearer ${token}` },
  })

  if (error) {
    let code: 'missing_openai_key' | 'unknown' = 'unknown'
    if (/openai|missing_openai/i.test(error.message)) code = 'missing_openai_key'
    throw new DataApiError(code, error.message || code)
  }

  const env = data as EdgeEnvelope<StageAssistComposeResult>
  if (env?.error) {
    const code = edgeErrorCode(env.error)
    throw new DataApiError(
      code === 'missing_openai_key' ? 'missing_openai_key' : 'unknown',
      code,
    )
  }
  return unwrapResult(env?.data, situation)
}
