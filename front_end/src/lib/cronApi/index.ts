/**
 * cronApi — platform-admin wrappers for app_cron catalog + run log.
 * Enable/schedule require pg_cron; run_now works when jobs are disabled.
 *
 * Soft envelopes: always unwrap via unwrapPlatformEnvelope.
 */
import { callPlatform, unwrapPlatformEnvelope, type PlatformEnvelope } from '../dataApi'

export type CronJobRow = Record<string, unknown> & {
  job_key?: string
  feature?: string
  description?: string
  cron_expr?: string
  worker_sql?: string
  enabled?: boolean
}

export type CronRunRow = Record<string, unknown> & {
  id?: string
  job_key?: string
  ok?: boolean | null
  error_text?: string | null
  triggered_by?: string
  started_at?: string
  finished_at?: string | null
}

function dataOf<T>(env: PlatformEnvelope<T>): T {
  return unwrapPlatformEnvelope(env)
}

export async function listCronJobs(feature?: string | null): Promise<{
  jobs: CronJobRow[]
  extensionAvailable?: boolean
}> {
  const env = await callPlatform<CronJobRow[]>('app_cron_list', {
    p_feature: feature ?? null,
  })
  const data = dataOf(env)
  const meta = (env.meta ?? {}) as { extension_available?: boolean }
  return {
    jobs: Array.isArray(data) ? data : [],
    extensionAvailable: meta.extension_available,
  }
}

export async function listCronRuns(
  jobKey?: string | null,
  limit = 50,
  offset = 0,
): Promise<{ runs: CronRunRow[]; total?: number }> {
  const env = await callPlatform<CronRunRow[]>('app_cron_runs_list', {
    p_job_key: jobKey ?? null,
    p_limit: limit,
    p_offset: offset,
  })
  const data = dataOf(env)
  const meta = (env.meta ?? {}) as { total?: number }
  return {
    runs: Array.isArray(data) ? data : [],
    total: meta.total,
  }
}

export async function registerCronJob(input: {
  jobKey: string
  cronExpr: string
  workerSql: string
  description?: string
  enabled?: boolean
  feature?: string
  timeoutHintMs?: number
  metadata?: Record<string, unknown>
}): Promise<unknown> {
  return dataOf(
    await callPlatform('app_cron_register', {
      p_job_key: input.jobKey,
      p_cron_expr: input.cronExpr,
      p_worker_sql: input.workerSql,
      p_description: input.description ?? null,
      p_enabled: input.enabled ?? false,
      p_feature: input.feature ?? 'platform',
      p_timeout_hint_ms: input.timeoutHintMs ?? null,
      p_metadata: input.metadata ?? {},
    }),
  )
}

export async function unregisterCronJob(jobKey: string): Promise<unknown> {
  return dataOf(await callPlatform('app_cron_unregister', { p_job_key: jobKey }))
}

export async function setCronEnabled(jobKey: string, enabled: boolean): Promise<unknown> {
  return dataOf(
    await callPlatform('app_cron_set_enabled', {
      p_job_key: jobKey,
      p_enabled: enabled,
    }),
  )
}

export async function setCronSchedule(jobKey: string, cronExpr: string): Promise<unknown> {
  return dataOf(
    await callPlatform('app_cron_set_schedule', {
      p_job_key: jobKey,
      p_cron_expr: cronExpr,
    }),
  )
}

export async function runCronNow(jobKey: string): Promise<unknown> {
  return dataOf(await callPlatform('app_cron_run_now', { p_job_key: jobKey }))
}
