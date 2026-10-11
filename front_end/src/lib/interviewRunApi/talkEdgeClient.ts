/**
 * FE client for Edge interview-talk-turn (OpenAI compose + early cues + analysis).
 * History/context always come from InterviewResponse / TalkContext on the FE.
 * Compose uses raw fetch + NDJSON so OpenAI token deltas reach the UI live
 * (supabase.functions.invoke buffers the full body).
 */
import {
  DataApiError,
  getSupabase,
  getSupabasePublicKey,
  getSupabaseUrl,
  resolveDataApiErrorCode,
  type DataApiErrorCode,
} from '../dataApi'
import { requireInterviewEdgeAccessToken } from './edgeAccessToken'
import type {
  AnalysisGrainStub,
  InterviewResponseMessage,
  TalkContext,
  TalkDecision,
  TalkRuntimeState,
  TopicEndStub,
} from './talkTypes'

export type TalkComposeMeta = {
  situation: string
  sampleIdsUsed: string[]
  model: string
  missingGaps: string[]
  repetitive?: boolean
}

export type TalkComposeResult = {
  utterance: string
  composeMeta: TalkComposeMeta
  needRetrieval?: {
    needs: Array<{ sourceId: string; query?: string; phaseId?: string; reason: string }>
  } | null
  persistNotes?: Array<{ kind: string; key?: string; text: string }>
}

type EdgeEnvelope<T> = {
  data?: T | null
  meta?: Record<string, unknown> | null
  error?: { code?: string; detail?: string } | string | null
}

function edgeErrorCode(error: EdgeEnvelope<unknown>['error']): string {
  if (!error) return 'unknown'
  if (typeof error === 'string') return error
  return error.code || 'unknown'
}

function knownTalkCode(code: string): DataApiErrorCode {
  const known =
    code === 'missing_openai_key' ||
    code === 'not_authenticated' ||
    code === 'talk_turn_failed' ||
    code === 'compose_empty' ||
    code === 'validation_failed'
      ? code
      : 'talk_turn_failed'
  return known
}

function throwEdgeError(error: EdgeEnvelope<unknown>['error'], fallbackMessage?: string): never {
  const code = knownTalkCode(edgeErrorCode(error))
  throw new DataApiError(
    resolveDataApiErrorCode(code),
    typeof error === 'string' ? error : fallbackMessage || code,
  )
}

async function invokeTalkTurn<T>(
  body: Record<string, unknown>,
  accessToken?: string | null,
): Promise<T> {
  const briefId =
    typeof body.briefId === 'string'
      ? body.briefId
      : typeof (body.talkContext as { briefId?: string } | undefined)?.briefId === 'string'
        ? (body.talkContext as { briefId: string }).briefId
        : null
  const token = await requireInterviewEdgeAccessToken(accessToken, briefId)
  const supabase = getSupabase()

  const { data, error } = await supabase.functions.invoke('interview-talk-turn', {
    body,
    headers: { Authorization: `Bearer ${token}` },
  })

  if (error) {
    // supabase-js may put JSON body on context
    const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context
    let code = 'talk_turn_failed'
    if (ctx?.json) {
      try {
        const env = (await ctx.json()) as EdgeEnvelope<unknown>
        code = edgeErrorCode(env.error) || code
      } catch {
        /* ignore */
      }
    }
    if (/openai|missing_openai/i.test(error.message)) code = 'missing_openai_key'
    throw new DataApiError(resolveDataApiErrorCode(knownTalkCode(code)), error.message || knownTalkCode(code))
  }

  const env = data as EdgeEnvelope<T>
  if (env?.error) {
    throwEdgeError(env.error)
  }
  if (!env?.data) {
    throw new DataApiError('unknown', 'interview_talk_turn_empty')
  }
  return env.data
}

function unwrapComposeData(raw: unknown): TalkComposeResult {
  if (!raw || typeof raw !== 'object') {
    throw new DataApiError('unknown', 'interview_talk_turn_empty')
  }
  const o = raw as Record<string, unknown>
  const meta = (o.composeMeta && typeof o.composeMeta === 'object'
    ? o.composeMeta
    : {}) as Partial<TalkComposeMeta>
  return {
    utterance: String(o.utterance ?? ''),
    composeMeta: {
      situation: String(meta.situation ?? ''),
      sampleIdsUsed: Array.isArray(meta.sampleIdsUsed)
        ? meta.sampleIdsUsed.map(String)
        : [],
      model: String(meta.model ?? ''),
      missingGaps: Array.isArray(meta.missingGaps) ? meta.missingGaps.map(String) : [],
      repetitive: meta.repetitive === true,
    },
    needRetrieval:
      o.needRetrieval && typeof o.needRetrieval === 'object'
        ? (o.needRetrieval as TalkComposeResult['needRetrieval'])
        : null,
    persistNotes: Array.isArray(o.persistNotes)
      ? (o.persistNotes as TalkComposeResult['persistNotes'])
      : undefined,
  }
}

type ComposeBodyInput = {
  briefId: string
  talkContext: TalkContext
  messages: InterviewResponseMessage[]
  talkRuntime: TalkRuntimeState
  decide: Pick<
    TalkDecision,
    | 'situation'
    | 'missingGaps'
    | 'activeProbeId'
    | 'nextProbeGoal'
    | 'canPass'
    | 'signals'
    | 'composeCues'
    | 'difficulty'
  >
  priorTopicNote?: string | null
  candidateCvNote?: string | null
  retrievedMemory?: {
    candidateCvNote?: string | null
    dayHits?: Array<{ phaseId: string; role: string; text: string; at?: string }>
    topicSynths?: Array<{ topicId: string; text: string }>
    phaseHits?: Array<{ phaseId: string; role: string; text: string }>
    botNotes?: string[]
    sourceIdsUsed?: string[]
    stageArtifacts?: Array<{ phaseId: string; kind: string; digest: string }>
    toolRuns?: Array<{
      phaseId: string
      passed: boolean | null
      passedCount?: number
      total?: number
      failingIds: string[]
    }>
    toolSynths?: Array<{ phaseId: string; boardSummary: string }>
  } | null
  dayMeta?: {
    continuing?: boolean
    previousSectionTitle?: string | null
    standingNotes?: string | null
    referencedStages?: Array<{
      phaseId: string
      title: string
      kind: string
      available?: string[]
    }>
  } | null
  retrievalPass?: 0 | 1
  accessToken?: string | null
  /** Live OpenAI token deltas (NDJSON). Default true. */
  stream?: boolean
  onUtteranceDelta?: (delta: string, full: string) => void
}

function buildComposeBody(input: ComposeBodyInput, stream: boolean): Record<string, unknown> {
  return {
    mode: 'compose',
    stream,
    briefId: input.briefId,
    talkContext: input.talkContext,
    messages: input.messages,
    talkRuntime: input.talkRuntime,
    decide: {
      situation: input.decide.situation,
      missingGaps: input.decide.missingGaps,
      activeProbeId: input.decide.activeProbeId,
      nextProbeGoal: input.decide.nextProbeGoal,
      canPass: input.decide.canPass,
      signals: input.decide.signals ?? [],
      composeCues: input.decide.composeCues ?? [],
      difficulty: input.decide.difficulty,
    },
    priorTopicNote: input.priorTopicNote ?? null,
    candidateCvNote: input.candidateCvNote ?? null,
    retrievedMemory: input.retrievedMemory ?? null,
    dayMeta: input.dayMeta ?? null,
    retrievalPass: input.retrievalPass ?? 0,
  }
}

/** Stream compose via NDJSON utterance_delta from OpenAI; fall back to buffered JSON once. */
async function streamComposeTalk(input: ComposeBodyInput): Promise<TalkComposeResult> {
  const token = await requireInterviewEdgeAccessToken(input.accessToken, input.briefId)
  const base = getSupabaseUrl()
  const anon = getSupabasePublicKey()
  const body = buildComposeBody(input, true)

  const res = await fetch(`${base}/functions/v1/interview-talk-turn`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson, application/json',
    },
    body: JSON.stringify(body),
  })

  const ctype = (res.headers.get('content-type') || '').toLowerCase()
  const isNdjson = ctype.includes('ndjson') || ctype.includes('x-ndjson')

  if (!res.ok || !isNdjson || !res.body) {
    if (res.ok && !isNdjson) {
      const envelope = (await res.json().catch(() => ({}))) as EdgeEnvelope<TalkComposeResult>
      if (envelope.error) throwEdgeError(envelope.error)
      if (!envelope.data) throw new DataApiError('unknown', 'interview_talk_turn_empty')
      const result = unwrapComposeData(envelope.data)
      if (result.utterance && input.onUtteranceDelta) {
        input.onUtteranceDelta(result.utterance, result.utterance)
      }
      return result
    }
    if (!res.ok) {
      const envelope = (await res.json().catch(() => ({}))) as EdgeEnvelope<unknown>
      if (envelope.error) throwEdgeError(envelope.error, `http_${res.status}`)
      throw new DataApiError('talk_turn_failed', `http_${res.status}`)
    }
    // Retry without stream (buffered invoke path).
    return invokeTalkTurn<TalkComposeResult>(buildComposeBody(input, false), token)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let carry = ''
  let full = ''
  let finalResult: TalkComposeResult | null = null
  let streamError: { code: string; detail?: string } | null = null

  const consumeLine = (trimmed: string) => {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      return
    }
    const type = String(event.type ?? '')
    if (type === 'ping') return
    if (type === 'utterance_delta') {
      const delta = typeof event.text === 'string' ? event.text : ''
      if (!delta) return
      full += delta
      input.onUtteranceDelta?.(delta, full)
      return
    }
    if (type === 'done') {
      finalResult = unwrapComposeData(event.data)
      // Keep the scrubbed utterance for the compose result. Do not push it
      // through the live stream — a second full-text replace remounts markdown
      // after type-in. The runner settles the same bubble via stripToFinalAsk.
      if (finalResult.utterance && finalResult.utterance !== full) {
        full = finalResult.utterance
      }
      return
    }
    if (type === 'error') {
      const errObj = event.error
      if (errObj && typeof errObj === 'object' && !Array.isArray(errObj)) {
        const o = errObj as { code?: string; detail?: string }
        streamError = {
          code: String(o.code ?? 'talk_turn_failed'),
          detail: typeof o.detail === 'string' ? o.detail : undefined,
        }
      } else {
        streamError = { code: 'talk_turn_failed' }
      }
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
  const tail = carry.trim()
  if (tail) consumeLine(tail)

  const finalStreamError = streamError as { code: string; detail?: string } | null
  if (finalStreamError) {
    throw new DataApiError(
      knownTalkCode(finalStreamError.code),
      finalStreamError.detail || finalStreamError.code,
    )
  }
  if (!finalResult) {
    throw new DataApiError('unknown', 'interview_talk_turn_incomplete_stream')
  }
  return finalResult
}

export async function edgeComposeTalk(input: ComposeBodyInput): Promise<TalkComposeResult> {
  const wantStream = input.stream !== false
  if (!wantStream) {
    return invokeTalkTurn<TalkComposeResult>(buildComposeBody(input, false), input.accessToken)
  }
  return streamComposeTalk(input)
}

export async function edgeComposeCues(input: {
  briefId: string
  talkContext: TalkContext
  messages: InterviewResponseMessage[]
  talkRuntime: TalkRuntimeState
  decide: Pick<
    TalkDecision,
    'situation' | 'missingGaps' | 'signals' | 'nextProbeGoal' | 'composeCues'
  >
  candidateText: string
  accessToken?: string | null
}): Promise<{ composeCues: string[] }> {
  return invokeTalkTurn<{ composeCues: string[] }>(
    {
      mode: 'compose_cues',
      briefId: input.briefId,
      talkContext: input.talkContext,
      messages: input.messages,
      talkRuntime: input.talkRuntime,
      decide: {
        situation: input.decide.situation,
        missingGaps: input.decide.missingGaps,
        signals: input.decide.signals,
        nextProbeGoal: input.decide.nextProbeGoal,
        composeCues: input.decide.composeCues ?? [],
      },
      candidateText: input.candidateText,
    },
    input.accessToken,
  )
}

export async function edgeAfterTurn(input: {
  briefId: string
  talkContext: TalkContext
  messages: InterviewResponseMessage[]
  talkRuntime: TalkRuntimeState
  candidateMessageId: string
  templateIds: string[]
  hostRef: string
  order: number
  accessToken?: string | null
  referencedEvidence?: unknown
}): Promise<{ grains: Record<string, AnalysisGrainStub> }> {
  return invokeTalkTurn<{ grains: Record<string, AnalysisGrainStub> }>(
    {
      mode: 'after_turn',
      briefId: input.briefId,
      talkContext: input.talkContext,
      messages: input.messages,
      talkRuntime: input.talkRuntime,
      candidateMessageId: input.candidateMessageId,
      templateIds: input.templateIds,
      hostRef: input.hostRef,
      order: input.order,
      ...(input.referencedEvidence ? { referencedEvidence: input.referencedEvidence } : {}),
    },
    input.accessToken,
  )
}

export async function edgeTopicEnd(input: {
  briefId: string
  talkContext: TalkContext
  messages: InterviewResponseMessage[]
  talkRuntime: TalkRuntimeState
  templateIds: string[]
  accessToken?: string | null
  referencedEvidence?: unknown
  afterTurnGrains?: Record<string, Record<string, unknown>>
  rollupTemplateIds?: string[]
}): Promise<
  Pick<TopicEndStub, 'synthesisText' | 'targets' | 'byTemplate'> & { status: 'filled' }
> {
  return invokeTalkTurn(
    {
      mode: 'topic_end',
      briefId: input.briefId,
      talkContext: input.talkContext,
      messages: input.messages,
      talkRuntime: input.talkRuntime,
      templateIds: input.templateIds,
      ...(input.rollupTemplateIds?.length
        ? { rollupTemplateIds: input.rollupTemplateIds }
        : {}),
      ...(input.afterTurnGrains ? { afterTurnGrains: input.afterTurnGrains } : {}),
      ...(input.referencedEvidence ? { referencedEvidence: input.referencedEvidence } : {}),
    },
    input.accessToken,
  )
}
