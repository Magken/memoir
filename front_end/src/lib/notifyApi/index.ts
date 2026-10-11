/**
 * notifyApi — inbox CRUD via data platform `notifications` + specialized RPCs
 * for prefs, emit_test, mark-all, unread, mail outbox, digests, and invite tokens.
 *
 * Realtime subscribeNotifications is v2 — not implemented here.
 */
import {
  callPlatform,
  countResource,
  fetchResource,
  fetchResourceOne,
  getSupabase,
  updateResource,
  unwrapPlatformEnvelope,
  type FilterInput,
  type PageMeta,
  type PlatformEnvelope,
} from '../dataApi'

export type NotificationRow = Record<string, unknown> & {
  id?: string
  owner_id?: string
  type_key?: string
  title?: string
  body?: string
  data?: Record<string, unknown>
  read_at?: string | null
  archived_at?: string | null
  deleted_at?: string | null
  created_at?: string
}

export type InboxView = 'inbox' | 'unread' | 'archived' | 'deleted' | 'all'

function dataOf<T>(env: PlatformEnvelope<T>): T {
  return unwrapPlatformEnvelope(env)
}

function listOf<T>(env: PlatformEnvelope<T[]>): T[] {
  const data = dataOf(env)
  return Array.isArray(data) ? data : []
}

function inboxFilters(view: InboxView): FilterInput {
  if (view === 'all') return {}
  if (view === 'deleted') {
    return { and: [{ field: 'deleted_at', op: 'is', value: 'not_null' }] }
  }
  const base: FilterInput[] = [{ field: 'deleted_at', op: 'is', value: null }]
  if (view === 'archived') {
    base.push({ field: 'archived_at', op: 'is', value: 'not_null' })
    return { and: base }
  }
  base.push({ field: 'archived_at', op: 'is', value: null })
  if (view === 'unread') {
    base.push({ field: 'read_at', op: 'is', value: null })
  }
  return { and: base }
}

export async function listNotifications(
  view: InboxView = 'inbox',
  opts: { limit?: number; offset?: number } = {},
): Promise<{ rows: NotificationRow[]; meta: PageMeta }> {
  const { rows, meta } = await fetchResource('notifications', {
    filters: inboxFilters(view),
    order: [{ field: 'created_at', asc: false }],
    limit: opts.limit ?? 50,
    offset: opts.offset ?? 0,
    count: 'exact',
  })
  return { rows: rows as NotificationRow[], meta }
}

export async function getNotification(id: string): Promise<NotificationRow | null> {
  return fetchResourceOne('notifications', id) as Promise<NotificationRow | null>
}

export async function markNotificationRead(id: string, read = true): Promise<NotificationRow> {
  return updateResource('notifications', id, {
    read_at: read ? new Date().toISOString() : null,
  }) as Promise<NotificationRow>
}

export async function archiveNotification(id: string, archived = true): Promise<NotificationRow> {
  return updateResource('notifications', id, {
    archived_at: archived ? new Date().toISOString() : null,
  }) as Promise<NotificationRow>
}

/** Soft-delete (patch deleted_at). Hard delete is not allowed on this resource. */
export async function softDeleteNotification(id: string, deleted = true): Promise<NotificationRow> {
  return updateResource('notifications', id, {
    deleted_at: deleted ? new Date().toISOString() : null,
  }) as Promise<NotificationRow>
}

export async function markAllNotificationsRead(): Promise<unknown> {
  return dataOf(await callPlatform('app_notifications_mark_all_read', {}))
}

export async function unreadNotificationCount(): Promise<number> {
  const env = await callPlatform<number | { count?: number }>('app_notifications_unread_count', {})
  const data = dataOf(env)
  if (typeof data === 'number') return data
  if (data && typeof data === 'object' && 'count' in data) {
    return Number((data as { count?: number }).count ?? 0)
  }
  // Fallback: owner-scoped count via pipeline filters.
  const n = await countResource('notifications', {
    and: [
      { field: 'deleted_at', op: 'is', value: null },
      { field: 'archived_at', op: 'is', value: null },
      { field: 'read_at', op: 'is', value: null },
    ],
  })
  return n
}

export async function emitTestNotification(
  typeKey = 'system.emit_test',
  data: Record<string, unknown> = {},
  title?: string,
  body?: string,
): Promise<unknown> {
  return dataOf(
    await callPlatform('app_emit_test', {
      p_type_key: typeKey,
      p_data: data,
      p_title: title ?? null,
      p_body: body ?? null,
    }),
  )
}

export async function getNotificationPrefs(): Promise<unknown> {
  return dataOf(await callPlatform('app_notification_prefs_get', {}))
}

export async function setNotificationPrefs(prefs: Record<string, unknown>): Promise<unknown> {
  return dataOf(
    await callPlatform('app_notification_prefs_set', {
      p_type_key: String(prefs.type_key ?? prefs.typeKey ?? ''),
      p_in_app_enabled: prefs.in_app_enabled ?? prefs.inAppEnabled ?? null,
      p_email_enabled: prefs.email_enabled ?? prefs.emailEnabled ?? null,
      p_digest_enabled: prefs.digest_enabled ?? prefs.digestEnabled ?? null,
    }),
  )
}

export type MailTagPrefRow = {
  tag_key: string
  label: string
  description?: string | null
  default_email_enabled?: boolean
  email_enabled: boolean
  override_email_enabled?: boolean | null
  sort_order?: number
}

export async function getMailTagPrefs(): Promise<MailTagPrefRow[]> {
  return listOf(await callPlatform<MailTagPrefRow[]>('app_mail_tag_prefs_get', {}))
}

export async function setMailTagPref(tagKey: string, emailEnabled: boolean): Promise<unknown> {
  return dataOf(
    await callPlatform('app_mail_tag_prefs_set', {
      p_tag_key: tagKey,
      p_email_enabled: emailEnabled,
    }),
  )
}

export async function listMailOutboxMine(limit = 50, offset = 0): Promise<unknown[]> {
  return listOf(
    await callPlatform<unknown[]>('app_mail_outbox_list_mine', {
      p_limit: limit,
      p_offset: offset,
    }),
  )
}

/** Mark pending rows sent_local without SMTP (offline fallback). Prefer dispatchMailMine. */
export async function flushMailMine(ids?: string[]): Promise<unknown> {
  return dataOf(
    await callPlatform('app_mail_flush_mine', {
      p_ids: ids && ids.length > 0 ? ids : null,
    }),
  )
}

/**
 * Deliver pending outbox rows to Mailpit via Edge Function `mail-dispatch`.
 * Requires `npm run back_end:functions:serve` (or deployed functions).
 */
export async function dispatchMailMine(ids?: string[]): Promise<unknown> {
  const { data, error } = await getSupabase().functions.invoke('mail-dispatch', {
    body: ids && ids.length > 0 ? { ids } : {},
  })
  if (error) throw error
  if (data && typeof data === 'object') {
    const obj = data as { error?: unknown; data?: unknown; meta?: unknown }
    if (obj.error) throw new Error(String(obj.error))
    if ('data' in obj || 'error' in obj || 'meta' in obj) {
      return unwrapPlatformEnvelope(data as PlatformEnvelope<unknown>)
    }
  }
  return data
}

export async function getDigestSettings(): Promise<unknown> {
  return dataOf(await callPlatform('app_digest_settings_get', {}))
}

export async function setDigestSettings(settings: Record<string, unknown>): Promise<unknown> {
  return dataOf(
    await callPlatform('app_digest_settings_set', {
      p_enabled: settings.enabled ?? null,
      p_cadence: settings.cadence ?? null,
      p_quiet_hours: settings.quiet_hours ?? settings.quietHours ?? null,
    }),
  )
}

export async function previewDigestMine(): Promise<unknown> {
  return dataOf(await callPlatform('app_digest_preview_mine', {}))
}

export async function flushDigestMine(): Promise<unknown> {
  return dataOf(await callPlatform('app_digest_flush_mine', {}))
}

export async function createAccountInvite(
  accountId: string,
  email: string,
  opts: { roleKey?: string; expiresInHours?: number } = {},
): Promise<unknown> {
  return dataOf(
    await callPlatform('app_account_invite_create', {
      p_account_id: accountId,
      p_email: email,
      p_role_key: opts.roleKey ?? 'org_member',
      p_expires_in_hours: opts.expiresInHours ?? null,
    }),
  )
}

export async function listAccountInvites(accountId: string): Promise<unknown[]> {
  return listOf(
    await callPlatform<unknown[]>('app_account_invite_list', {
      p_account_id: accountId,
    }),
  )
}

export async function revokeAccountInvite(inviteId: string): Promise<unknown> {
  return dataOf(await callPlatform('app_account_invite_revoke', { p_invite_id: inviteId }))
}

export async function acceptAccountInviteToken(token: string): Promise<unknown> {
  return dataOf(await callPlatform('app_account_invite_accept_by_token', { p_token: token }))
}
