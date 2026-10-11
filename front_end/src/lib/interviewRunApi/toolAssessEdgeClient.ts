/**
 * FE client for Edge interview-tool-assess (form / writing / coding after_tool).
 */
import { DataApiError, getSupabasePublicKey, getSupabaseUrl } from '../dataApi'
import { requireInterviewEdgeAccessToken } from './edgeAccessToken'
import type { AnalysisGrainStub, MarkStageEntry } from './talkTypes'

/** Edge `meta.toolAssessTurnDiag` — per-stage status so a failure names itself. */
export type ToolAssessDiag = {
  kind?: string
  hostRef?: string
  model?: string | null
  totalMs?: number
  stages?: MarkStageEntry[]
  failed?: string
}

export type ToolAssessResult = {
  grains: Record<string, AnalysisGrainStub>
  package: unknown
  /** Present when Edge returned a trace; undefined for older deployments. */
  diag?: ToolAssessDiag
}

type EdgeEnvelope<T> = {
  data?: T | null
  error?: { code?: string; detail?: string } | string | null
  meta?: unknown
}

function edgeErrorCode(error: EdgeEnvelope<unknown>['error']): string {
  if (!error) return 'unknown'
  if (typeof error === 'string') return error
  return error.code || 'unknown'
}

function edgeErrorDetail(error: EdgeEnvelope<unknown>['error']): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  return error.detail || error.code || ''
}

/**
 * Assessor fan-out is several LLM calls, so the budget is generous — but it must
 * exist. Without one a hung Edge call parks the serial mark chain indefinitely.
 */
export const TOOL_ASSESS_TIMEOUT_MS = 120_000

export async function runInterviewToolAssess(input: {
  body: Record<string, unknown>
  accessToken?: string | null
  timeoutMs?: number
  signal?: AbortSignal
}): Promise<ToolAssessResult> {
  const briefId =
    typeof input.body.briefId === 'string' ? input.body.briefId : null
  const token = await requireInterviewEdgeAccessToken(input.accessToken, briefId)
  const base = getSupabaseUrl()
  if (!base) throw new DataApiError('unknown', 'missing_supabase_url')

  const budget = input.timeoutMs ?? TOOL_ASSESS_TIMEOUT_MS
  const timer = new AbortController()
  const timeout = setTimeout(() => timer.abort(new Error('tool_assess_timeout')), budget)
  ;(timeout as unknown as { unref?: () => void }).unref?.()
  const onOuterAbort = () => timer.abort(input.signal?.reason)
  input.signal?.addEventListener('abort', onOuterAbort, { once: true })

  let res: Response
  try {
    res = await fetch(`${base}/functions/v1/interview-tool-assess`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: getSupabasePublicKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input.body),
      signal: timer.signal,
    })
  } catch (e) {
    if (timer.signal.aborted && !input.signal?.aborted) {
      throw new ToolAssessError(`tool_assess_timeout_${budget}ms`)
    }
    throw e
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener('abort', onOuterAbort)
  }

  let env: EdgeEnvelope<ToolAssessResult> = {}
  try {
    env = (await res.json()) as EdgeEnvelope<ToolAssessResult>
  } catch {
    throw new DataApiError('unknown', `tool_assess_http_${res.status}`)
  }

  const diag = toolAssessDiagFromMeta(env.meta)

  if (!res.ok) {
    const code = edgeErrorCode(env.error) || `http_${res.status}`
    const detail = edgeErrorDetail(env.error)
    // Carry the partial trace on the error: knowing which stages ran before the
    // failure is the difference between "timed out" and "never started".
    throw new ToolAssessError(detail || code, diag)
  }

  const data = env.data
  if (!data || typeof data !== 'object' || !data.grains) {
    throw new ToolAssessError('empty tool-assess response', diag)
  }
  return {
    grains: data.grains,
    package: data.package ?? null,
    diag,
  }
}

/** DataApiError that also carries whatever stage trace Edge managed to return. */
export class ToolAssessError extends DataApiError {
  readonly diag: ToolAssessDiag | undefined

  constructor(message: string, diag?: ToolAssessDiag) {
    super('unknown', message)
    this.name = 'ToolAssessError'
    this.diag = diag
  }
}

export function toolAssessDiagFromMeta(meta: unknown): ToolAssessDiag | undefined {
  if (!meta || typeof meta !== 'object') return undefined
  const raw = (meta as { toolAssessTurnDiag?: unknown }).toolAssessTurnDiag
  if (!raw || typeof raw !== 'object') return undefined
  const row = raw as ToolAssessDiag
  return {
    kind: typeof row.kind === 'string' ? row.kind : undefined,
    hostRef: typeof row.hostRef === 'string' ? row.hostRef : undefined,
    model: typeof row.model === 'string' ? row.model : null,
    totalMs: typeof row.totalMs === 'number' ? row.totalMs : undefined,
    stages: Array.isArray(row.stages) ? row.stages : [],
    failed: typeof row.failed === 'string' ? row.failed : undefined,
  }
}
