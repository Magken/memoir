/**
 * FE client for Edge interview-code-run (Judge0 hidden_cases_v1).
 */
import { DataApiError, getSupabasePublicKey, getSupabaseUrl } from '../dataApi'
import { requireInterviewEdgeAccessToken } from './edgeAccessToken'
import type { CodeRunRequestBody } from '../interviewBrief/buildCodeRunRequest'

export type CodeRunCaseResult = {
  id: string
  name?: string
  passed: boolean
  compare?: string
  expected?: unknown
  actual?: unknown
  message?: string
  timeMs?: number | null
}

export type CodeRunResult = {
  passed: boolean
  passedCount: number
  total: number
  status: string
  cases: CodeRunCaseResult[]
  lines: string[]
  judge0?: {
    statusId?: number
    statusDescription?: string
    time?: string | null
    memory?: number | null
    compileOutput?: string | null
    stderr?: string | null
    stdout?: string | null
  }
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

export async function runInterviewCode(input: {
  body: CodeRunRequestBody
  accessToken?: string | null
  /** Fixture demo brief — allows anon guest Edge when unsigned. */
  briefId?: string | null
}): Promise<CodeRunResult> {
  const token = await requireInterviewEdgeAccessToken(input.accessToken, input.briefId)
  const base = getSupabaseUrl()
  if (!base) throw new DataApiError('unknown', 'missing_supabase_url')

  const res = await fetch(`${base}/functions/v1/interview-code-run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: getSupabasePublicKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...input.body,
      ...(input.briefId ? { briefId: input.briefId } : {}),
    }),
  })

  let env: EdgeEnvelope<CodeRunResult> = {}
  try {
    env = (await res.json()) as EdgeEnvelope<CodeRunResult>
  } catch {
    throw new DataApiError('unknown', `code_run_http_${res.status}`)
  }

  if (!res.ok) {
    const code = edgeErrorCode(env.error) || `http_${res.status}`
    const detail = edgeErrorDetail(env.error)
    // Prefer data.lines when Edge still returned a report (compile/runtime paths).
    if (env.data && Array.isArray(env.data.lines) && env.data.lines.length) {
      return {
        passed: Boolean(env.data.passed),
        passedCount: Number(env.data.passedCount) || 0,
        total: Number(env.data.total) || 0,
        status: String(env.data.status || code),
        cases: Array.isArray(env.data.cases) ? env.data.cases : [],
        lines: env.data.lines,
        judge0: env.data.judge0,
      }
    }
    // Never surface the bare word "unknown" — a 502/503 with an empty Edge body used to
    // become "Run failed: unknown" in the coding terminal with no hint what failed.
    const hint =
      (detail && detail !== 'unknown' ? detail : '') ||
      (code && code !== 'unknown' ? code : '') ||
      `code_run_http_${res.status}`
    throw new DataApiError('unknown', hint)
  }

  const data = env.data
  if (!data || !Array.isArray(data.lines)) {
    throw new DataApiError('unknown', 'empty code-run response')
  }
  return {
    passed: Boolean(data.passed),
    passedCount: Number(data.passedCount) || 0,
    total: Number(data.total) || 0,
    status: String(data.status || 'ok'),
    cases: Array.isArray(data.cases) ? data.cases : [],
    lines: data.lines.map(String),
    judge0: data.judge0
      ? {
          statusId: data.judge0.statusId,
          statusDescription: data.judge0.statusDescription,
          time: data.judge0.time ?? null,
          memory: data.judge0.memory ?? null,
          compileOutput: data.judge0.compileOutput ?? null,
          stderr: data.judge0.stderr ?? null,
          stdout: data.judge0.stdout ?? null,
        }
      : undefined,
  }
}
