/**
 * assessmentApi — DEFINER RPC wrappers for interview briefs / attempts / invites.
 * Invites are LIVE: create enqueues mail or emit; accept_by_token starts attempt.
 */
import { callPlatform, unwrapPlatformEnvelope } from '../dataApi'
import type { PlatformEnvelope } from '../dataApi'

export type InterviewBriefStatus = 'draft' | 'published' | 'archived'
export type InterviewAttemptStatus = 'in_progress' | 'complete' | 'abandoned'
export type InterviewInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export type InterviewBrief = {
  id: string
  accountId: string
  createdBy?: string
  updatedBy?: string | null
  briefNodeId: string
  title: string
  status: InterviewBriefStatus
  opensAt?: string | null
  closesAt?: string | null
  maxAttempts?: number | null
  archivedAt?: string | null
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
  body?: Record<string, unknown> | null
}

export type InterviewAttempt = {
  id: string
  briefId: string
  candidateUserId: string
  orgAccountId: string
  sessionNodeId: string
  conversationId: string
  status: InterviewAttemptStatus
  attemptNumber: number
  startedAt?: string
  completedAt?: string | null
  metadata?: Record<string, unknown>
  sessionBody?: Record<string, unknown> | null
}

export type InterviewInvite = {
  id: string
  briefId?: string
  email: string
  status?: InterviewInviteStatus
  expiresAt: string
  token?: string
  invitedBy?: string
  createdAt?: string
  revokedAt?: string | null
}

export type InterviewListEnvelope<T> = { items: T[]; total: number }

export type InterviewAttemptCounts = {
  total: number
  inProgress: number
  complete: number
  abandoned: number
}

function unwrap<T>(env: PlatformEnvelope<T>): T {
  return unwrapPlatformEnvelope(env)
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function normalizeBrief(raw: unknown): InterviewBrief {
  const r = asRecord(raw)
  return {
    id: String(r.id ?? ''),
    accountId: String(r.accountId ?? r.account_id ?? ''),
    createdBy: r.createdBy != null ? String(r.createdBy) : r.created_by != null ? String(r.created_by) : undefined,
    updatedBy:
      r.updatedBy != null ? String(r.updatedBy) : r.updated_by != null ? String(r.updated_by) : null,
    briefNodeId: String(r.briefNodeId ?? r.brief_node_id ?? ''),
    title: String(r.title ?? ''),
    status: (r.status as InterviewBriefStatus) ?? 'draft',
    opensAt: (r.opensAt as string | null | undefined) ?? (r.opens_at as string | null | undefined) ?? null,
    closesAt: (r.closesAt as string | null | undefined) ?? (r.closes_at as string | null | undefined) ?? null,
    maxAttempts:
      r.maxAttempts != null
        ? Number(r.maxAttempts)
        : r.max_attempts != null
          ? Number(r.max_attempts)
          : null,
    archivedAt:
      (r.archivedAt as string | null | undefined) ?? (r.archived_at as string | null | undefined) ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.createdAt != null ? String(r.createdAt) : r.created_at != null ? String(r.created_at) : undefined,
    updatedAt: r.updatedAt != null ? String(r.updatedAt) : r.updated_at != null ? String(r.updated_at) : undefined,
    body: (r.body as Record<string, unknown> | null | undefined) ?? null,
  }
}

function normalizeAttempt(raw: unknown): InterviewAttempt {
  const r = asRecord(raw)
  return {
    id: String(r.id ?? ''),
    briefId: String(r.briefId ?? r.brief_id ?? ''),
    candidateUserId: String(r.candidateUserId ?? r.candidate_user_id ?? ''),
    orgAccountId: String(r.orgAccountId ?? r.org_account_id ?? ''),
    sessionNodeId: String(r.sessionNodeId ?? r.session_node_id ?? ''),
    conversationId: String(r.conversationId ?? r.conversation_id ?? ''),
    status: (r.status as InterviewAttemptStatus) ?? 'in_progress',
    attemptNumber: Number(r.attemptNumber ?? r.attempt_number ?? 1),
    startedAt: r.startedAt != null ? String(r.startedAt) : r.started_at != null ? String(r.started_at) : undefined,
    completedAt:
      (r.completedAt as string | null | undefined) ?? (r.completed_at as string | null | undefined) ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    sessionBody: (r.sessionBody as Record<string, unknown> | null | undefined) ?? null,
  }
}

function normalizeListBriefs(data: unknown): InterviewListEnvelope<InterviewBrief> {
  const r = asRecord(data)
  const items = Array.isArray(r.items) ? r.items.map(normalizeBrief) : []
  return { items, total: Number(r.total ?? items.length) }
}

function normalizeListAttempts(data: unknown): InterviewListEnvelope<InterviewAttempt> {
  const r = asRecord(data)
  const items = Array.isArray(r.items) ? r.items.map(normalizeAttempt) : []
  return { items, total: Number(r.total ?? items.length) }
}

/* ── Briefs (LIVE) ─────────────────────────────────────────────────────── */

export async function briefCreate(accountId: string, title: string): Promise<InterviewBrief> {
  return normalizeBrief(
    unwrap(await callPlatform('app_interview_brief_create', { p_account_id: accountId, p_title: title })),
  )
}

export async function briefUpdate(
  briefId: string,
  opts: { title?: string; metadata?: Record<string, unknown>; body?: Record<string, unknown> } = {},
): Promise<InterviewBrief> {
  return normalizeBrief(
    unwrap(
      await callPlatform('app_interview_brief_update', {
        p_brief_id: briefId,
        p_title: opts.title ?? null,
        p_metadata: opts.metadata ?? null,
        p_body: opts.body ?? null,
      }),
    ),
  )
}

export async function briefGet(briefId: string, includeBody = true): Promise<InterviewBrief> {
  return normalizeBrief(
    unwrap(
      await callPlatform('app_interview_brief_get', {
        p_brief_id: briefId,
        p_include_body: includeBody,
      }),
    ),
  )
}

export async function briefList(
  accountId: string,
  opts: { status?: InterviewBriefStatus; limit?: number; offset?: number } = {},
): Promise<InterviewListEnvelope<InterviewBrief>> {
  return normalizeListBriefs(
    unwrap(
      await callPlatform('app_interview_brief_list', {
        p_account_id: accountId,
        p_status: opts.status ?? null,
        p_limit: opts.limit ?? 50,
        p_offset: opts.offset ?? 0,
      }),
    ),
  )
}

export async function briefPublish(briefId: string): Promise<InterviewBrief> {
  return normalizeBrief(unwrap(await callPlatform('app_interview_brief_publish', { p_brief_id: briefId })))
}

export async function briefUnpublish(briefId: string): Promise<InterviewBrief> {
  return normalizeBrief(unwrap(await callPlatform('app_interview_brief_unpublish', { p_brief_id: briefId })))
}

export async function briefArchive(briefId: string): Promise<InterviewBrief> {
  return normalizeBrief(unwrap(await callPlatform('app_interview_brief_archive', { p_brief_id: briefId })))
}

export async function briefUnarchive(briefId: string): Promise<InterviewBrief> {
  return normalizeBrief(unwrap(await callPlatform('app_interview_brief_unarchive', { p_brief_id: briefId })))
}

export async function briefSetWindow(
  briefId: string,
  opts: { opensAt?: string | null; closesAt?: string | null; maxAttempts?: number | null } = {},
): Promise<InterviewBrief> {
  return normalizeBrief(
    unwrap(
      await callPlatform('app_interview_brief_set_window', {
        p_brief_id: briefId,
        p_opens_at: opts.opensAt ?? null,
        p_closes_at: opts.closesAt ?? null,
        p_max_attempts: opts.maxAttempts ?? null,
      }),
    ),
  )
}

/* ── Attempts (LIVE) ───────────────────────────────────────────────────── */

export async function attemptStart(briefId: string): Promise<InterviewAttempt> {
  return normalizeAttempt(unwrap(await callPlatform('app_interview_attempt_start', { p_brief_id: briefId })))
}

export async function attemptGet(attemptId: string, includeSessionBody = false): Promise<InterviewAttempt> {
  return normalizeAttempt(
    unwrap(
      await callPlatform('app_interview_attempt_get', {
        p_attempt_id: attemptId,
        p_include_session_body: includeSessionBody,
      }),
    ),
  )
}

export async function attemptListMine(
  opts: { limit?: number; offset?: number } = {},
): Promise<InterviewListEnvelope<InterviewAttempt>> {
  return normalizeListAttempts(
    unwrap(
      await callPlatform('app_interview_attempt_list_mine', {
        p_limit: opts.limit ?? 50,
        p_offset: opts.offset ?? 0,
      }),
    ),
  )
}

export async function attemptListForBrief(
  briefId: string,
  opts: { status?: InterviewAttemptStatus; limit?: number; offset?: number } = {},
): Promise<InterviewListEnvelope<InterviewAttempt>> {
  return normalizeListAttempts(
    unwrap(
      await callPlatform('app_interview_attempt_list_for_brief', {
        p_brief_id: briefId,
        p_status: opts.status ?? null,
        p_limit: opts.limit ?? 50,
        p_offset: opts.offset ?? 0,
      }),
    ),
  )
}

export async function attemptCountForBrief(briefId: string): Promise<InterviewAttemptCounts> {
  const raw = asRecord(
    unwrap(await callPlatform('app_interview_attempt_count_for_brief', { p_brief_id: briefId })),
  )
  return {
    total: Number(raw.total ?? 0),
    inProgress: Number(raw.inProgress ?? raw.in_progress ?? 0),
    complete: Number(raw.complete ?? 0),
    abandoned: Number(raw.abandoned ?? 0),
  }
}

export async function attemptComplete(attemptId: string): Promise<InterviewAttempt> {
  return normalizeAttempt(
    unwrap(await callPlatform('app_interview_attempt_complete', { p_attempt_id: attemptId })),
  )
}

export async function attemptAbandon(attemptId: string): Promise<InterviewAttempt> {
  return normalizeAttempt(
    unwrap(await callPlatform('app_interview_attempt_abandon', { p_attempt_id: attemptId })),
  )
}

/* ── Invites (LIVE) — mail/emit on create; accept starts attempt ─────────── */

/** Persist invite; emits to existing user or enqueues assessment_invite mail. */
export async function inviteCreate(
  briefId: string,
  email: string,
  expiresAt?: string | null,
): Promise<InterviewInvite & { notifiedExistingUser?: boolean; mailOutboxId?: string | null }> {
  const raw = asRecord(
    unwrap(
      await callPlatform('app_interview_invite_create', {
        p_brief_id: briefId,
        p_email: email,
        p_expires_at: expiresAt ?? null,
      }),
    ),
  )
  return {
    id: String(raw.id ?? ''),
    email: String(raw.email ?? email),
    expiresAt: String(raw.expiresAt ?? raw.expires_at ?? ''),
    token: raw.token != null ? String(raw.token) : undefined,
    notifiedExistingUser: Boolean(raw.notifiedExistingUser ?? raw.notified_existing_user),
    mailOutboxId:
      raw.mailOutboxId != null
        ? String(raw.mailOutboxId)
        : raw.mail_outbox_id != null
          ? String(raw.mail_outbox_id)
          : null,
  }
}

/** List invites without tokens. */
export async function inviteList(briefId: string): Promise<InterviewInvite[]> {
  const data = unwrap(await callPlatform('app_interview_invite_list', { p_brief_id: briefId }))
  const rows = Array.isArray(data) ? data : []
  return rows.map((row) => {
    const r = asRecord(row)
    return {
      id: String(r.id ?? ''),
      briefId: r.briefId != null ? String(r.briefId) : r.brief_id != null ? String(r.brief_id) : undefined,
      email: String(r.email ?? ''),
      status: r.status as InterviewInviteStatus | undefined,
      expiresAt: String(r.expiresAt ?? r.expires_at ?? ''),
      invitedBy: r.invitedBy != null ? String(r.invitedBy) : undefined,
      createdAt: r.createdAt != null ? String(r.createdAt) : undefined,
      revokedAt: (r.revokedAt as string | null | undefined) ?? (r.revoked_at as string | null | undefined) ?? null,
    }
  })
}

/** Revoke pending invite. */
export async function inviteRevoke(inviteId: string): Promise<InterviewInvite> {
  const raw = asRecord(
    unwrap(await callPlatform('app_interview_invite_revoke', { p_invite_id: inviteId })),
  )
  return {
    id: String(raw.id ?? inviteId),
    email: '',
    status: (raw.status as InterviewInviteStatus) ?? 'revoked',
    expiresAt: '',
    revokedAt: (raw.revokedAt as string | null | undefined) ?? (raw.revoked_at as string | null | undefined) ?? null,
  }
}

/** Accept invite by token — starts attempt; email must match signed-in user. */
export async function inviteAcceptByToken(token: string): Promise<{
  inviteId: string
  briefId: string
  attemptId: string
  status: string
  attempt: InterviewAttempt
}> {
  const raw = asRecord(
    unwrap(await callPlatform('app_interview_invite_accept_by_token', { p_token: token })),
  )
  return {
    inviteId: String(raw.inviteId ?? raw.invite_id ?? ''),
    briefId: String(raw.briefId ?? raw.brief_id ?? ''),
    attemptId: String(raw.attemptId ?? raw.attempt_id ?? ''),
    status: String(raw.status ?? 'accepted'),
    attempt: normalizeAttempt(raw.attempt),
  }
}

/* ── Interview create bot (LIVE) ───────────────────────────────────────── */

export type InterviewCreateBotLink = {
  id: string
  briefId: string
  accountId: string
  conversationId: string
  status: 'active' | 'closed'
  createdBy?: string
  metadata?: Record<string, unknown>
}

export type InterviewCreateBotOpenResult = {
  link: InterviewCreateBotLink
  conversationId: string
  briefId: string
  accountId: string
  briefSnapshot?: Record<string, unknown>
}

function normalizeCreateBotLink(raw: unknown): InterviewCreateBotLink {
  const r = asRecord(raw)
  return {
    id: String(r.id ?? ''),
    briefId: String(r.briefId ?? r.brief_id ?? ''),
    accountId: String(r.accountId ?? r.account_id ?? ''),
    conversationId: String(r.conversationId ?? r.conversation_id ?? ''),
    status: (r.status as 'active' | 'closed') ?? 'active',
    createdBy: r.createdBy != null ? String(r.createdBy) : r.created_by != null ? String(r.created_by) : undefined,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }
}

function normalizeCreateBotOpen(raw: unknown): InterviewCreateBotOpenResult {
  const r = asRecord(raw)
  return {
    link: normalizeCreateBotLink(r.link),
    conversationId: String(r.conversationId ?? r.conversation_id ?? ''),
    briefId: String(r.briefId ?? r.brief_id ?? ''),
    accountId: String(r.accountId ?? r.account_id ?? ''),
    briefSnapshot: (r.briefSnapshot as Record<string, unknown> | undefined) ??
      (r.brief_snapshot as Record<string, unknown> | undefined),
  }
}

/** Open or reopen the interview_create bot thread for a brief (server_only profile). */
export async function createBotOpen(
  accountId: string,
  briefId: string,
  opts: { title?: string; clientSnapshot?: Record<string, unknown> } = {},
): Promise<InterviewCreateBotOpenResult> {
  return normalizeCreateBotOpen(
    unwrap(
      await callPlatform('app_interview_create_bot_open', {
        p_account_id: accountId,
        p_brief_id: briefId,
        p_title: opts.title ?? null,
        p_client_snapshot: opts.clientSnapshot ?? null,
      }),
    ),
  )
}

/** Get active create-bot link for a brief (reopen conversation). */
export async function createBotGet(
  briefId: string,
  clientSnapshot?: Record<string, unknown>,
): Promise<InterviewCreateBotOpenResult> {
  return normalizeCreateBotOpen(
    unwrap(
      await callPlatform('app_interview_create_bot_get', {
        p_brief_id: briefId,
        p_client_snapshot: clientSnapshot ?? null,
      }),
    ),
  )
}

/** Close the active create-bot link for a brief. */
export async function createBotClose(briefId: string): Promise<InterviewCreateBotLink> {
  return normalizeCreateBotLink(
    unwrap(await callPlatform('app_interview_create_bot_close', { p_brief_id: briefId })),
  )
}

/* ── Interview board bot (LIVE) — creator2_board peel, separate purpose from create bot ── */

export type BoardBotOpenResult = InterviewCreateBotOpenResult
export type BoardBotLink = InterviewCreateBotLink

/** Open or reopen the interview_creator_board bot thread for a brief (server_only profile). */
export async function boardBotOpen(
  accountId: string,
  briefId: string,
  opts: { title?: string; clientSnapshot?: Record<string, unknown> } = {},
): Promise<BoardBotOpenResult> {
  return normalizeCreateBotOpen(
    unwrap(
      await callPlatform('app_interview_board_bot_open', {
        p_account_id: accountId,
        p_brief_id: briefId,
        p_title: opts.title ?? null,
        p_client_snapshot: opts.clientSnapshot ?? null,
      }),
    ),
  )
}

/** Get active board-bot link for a brief (reopen conversation). */
export async function boardBotGet(
  briefId: string,
  clientSnapshot?: Record<string, unknown>,
): Promise<BoardBotOpenResult> {
  return normalizeCreateBotOpen(
    unwrap(
      await callPlatform('app_interview_board_bot_get', {
        p_brief_id: briefId,
        p_client_snapshot: clientSnapshot ?? null,
      }),
    ),
  )
}

/** Close the active board-bot link for a brief. */
export async function boardBotClose(briefId: string): Promise<BoardBotLink> {
  return normalizeCreateBotLink(
    unwrap(await callPlatform('app_interview_board_bot_close', { p_brief_id: briefId })),
  )
}

export type BoardEditCancelResult = { briefId: string; editRun: Record<string, unknown> }

/** Stamp `metadata.editRun.cancelRequested` — the running interview-brief-edit turn checks this. */
export async function boardEditCancel(
  briefId: string,
  editRunId?: string,
): Promise<BoardEditCancelResult> {
  const raw = asRecord(
    unwrap(
      await callPlatform('app_interview_board_edit_cancel', {
        p_brief_id: briefId,
        p_edit_run_id: editRunId ?? null,
      }),
    ),
  )
  return {
    briefId: String(raw.briefId ?? raw.brief_id ?? briefId),
    editRun: (raw.editRun as Record<string, unknown> | undefined) ??
      (raw.edit_run as Record<string, unknown> | undefined) ?? {},
  }
}

/** Publishable brief body fixture (phases required for publish). */
export function publishableBriefBody(title = 'Assessment brief'): Record<string, unknown> {
  return {
    schemaVersion: 1,
    kind: 'interview_brief',
    definition: {
      meta: { title, status: 'draft' },
      persona: {},
      systemGoals: [],
      guardrails: [],
      probeDefaults: { maxFollowUps: 1 },
    },
    topicLibrary: [],
    phases: [{ id: 'p1', kind: 'discussion', title: 'Intro' }],
    tools: {},
    analysis: { bindings: [] },
  }
}
