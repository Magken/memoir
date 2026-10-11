/**
 * orgOnboardingApi — DEFINER RPC wrappers for organisation legitimacy checklist.
 */
import { callPlatform, unwrapPlatformEnvelope } from '../dataApi'
import type { PlatformEnvelope } from '../dataApi'

export type OrgOnboardingInputKind = 'text' | 'file'

export type OrgOnboardingRequirementRow = {
  key: string
  label: string
  description?: string | null
  inputKind: OrgOnboardingInputKind
  required: boolean
  enabled: boolean
  sortOrder: number
  metadata?: Record<string, unknown>
  submission?: {
    id?: string
    value?: string | null
    fileNodeId?: string | null
    status?: string
  } | null
}

export type OrgOnboardingSnapshot = {
  complete?: boolean
  docsVerified?: boolean
  requiredCount?: number
  submittedCount?: number
  missingKeys?: string[]
}

function unwrap<T>(env: PlatformEnvelope<T>): T {
  return unwrapPlatformEnvelope(env)
}

function normalizeRow(raw: Record<string, unknown>): OrgOnboardingRequirementRow {
  const sub = raw.submission as Record<string, unknown> | null | undefined
  return {
    key: String(raw.key ?? ''),
    label: String(raw.label ?? raw.key ?? ''),
    description: (raw.description as string | null | undefined) ?? null,
    inputKind: (raw.inputKind as OrgOnboardingInputKind) ?? (raw.input_kind as OrgOnboardingInputKind) ?? 'text',
    required: Boolean(raw.required ?? true),
    enabled: Boolean(raw.enabled ?? true),
    sortOrder: Number(raw.sortOrder ?? raw.sort_order ?? 0),
    metadata: (raw.metadata as Record<string, unknown>) ?? {},
    submission: sub
      ? {
          id: sub.id != null ? String(sub.id) : undefined,
          value: (sub.value as string | null | undefined) ?? null,
          fileNodeId:
            (sub.fileNodeId as string | null | undefined) ??
            (sub.file_node_id as string | null | undefined) ??
            null,
          status: sub.status != null ? String(sub.status) : undefined,
        }
      : null,
  }
}

export async function orgOnboardingList(accountId: string): Promise<{
  rows: OrgOnboardingRequirementRow[]
  snapshot: OrgOnboardingSnapshot | null
}> {
  const env = await callPlatform<unknown>('app_org_onboarding_list', {
    p_account_id: accountId,
  })
  const data = unwrap(env)
  const rowsRaw = Array.isArray(data)
    ? data
    : Array.isArray((data as { rows?: unknown })?.rows)
      ? (data as { rows: unknown[] }).rows
      : []
  const rows = rowsRaw.map((r) => normalizeRow(r as Record<string, unknown>))
  const meta = (env.meta ?? {}) as Record<string, unknown>
  const snapshot = (meta.onboarding ?? meta.snapshot ?? null) as OrgOnboardingSnapshot | null
  return { rows, snapshot }
}

export async function orgOnboardingSubmit(input: {
  accountId: string
  requirementKey: string
  value?: string | null
  fileNodeId?: string | null
}): Promise<unknown> {
  return unwrap(
    await callPlatform('app_org_onboarding_submit', {
      p_account_id: input.accountId,
      p_requirement_key: input.requirementKey,
      p_value: input.value ?? null,
      p_file_node_id: input.fileNodeId ?? null,
    }),
  )
}

export async function orgOnboardingGetStatus(accountId: string): Promise<OrgOnboardingSnapshot> {
  const env = await callPlatform<OrgOnboardingSnapshot>('app_org_onboarding_get_status', {
    p_account_id: accountId,
  })
  const data = unwrap(env)
  if (data && typeof data === 'object') return data
  const meta = (env.meta ?? {}) as Record<string, unknown>
  return (meta.onboarding as OrgOnboardingSnapshot) ?? { complete: false }
}
