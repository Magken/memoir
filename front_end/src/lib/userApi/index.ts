/**
 * userApi — profile, account, membership, RBAC, admin, and relation operations.
 *
 * - Own profile CRUD goes through the data platform (`profiles` resource, owner-scoped).
 * - Everything membership/permission-aware uses specialized DEFINER RPCs via callPlatform,
 *   because owner-scoped `app_fetch` cannot see organisations you only joined.
 *
 * Soft envelopes: always `unwrapPlatformEnvelope` — never read `env.data` alone
 * (jsonb_strip_nulls can omit `data` on soft fail).
 *
 * Auth (sign up/in/out, password) lives in authApi. Never call service-role APIs from the browser.
 */
import {
  callPlatform,
  DataApiError,
  fetchResourceOne,
  updateResource,
  unwrapPlatformEnvelope,
  type PlatformEnvelope,
} from '../dataApi'
import { getCurrentUser } from '../authApi'

type Json = Record<string, unknown>

function dataOf<T>(env: PlatformEnvelope<T>): T {
  return unwrapPlatformEnvelope(env)
}

function listOf<T>(env: PlatformEnvelope<T[]>): T[] {
  const data = dataOf(env)
  return Array.isArray(data) ? data : []
}

// --- Profile (data platform, owner-scoped) --------------------------------

export async function getMyProfile(): Promise<Json | null> {
  const user = await getCurrentUser()
  if (!user) return null
  return fetchResourceOne('profiles', user.id)
}

/** Update own profile. Allowlist excludes primary_role / status / signup_kind (server-enforced). */
export async function updateMyProfile(patch: Json): Promise<Json> {
  const user = await getCurrentUser()
  if (!user) throw new DataApiError('not_authenticated', 'not_authenticated')
  return updateResource('profiles', user.id, patch)
}

/** Repair helper — (re)provision profile + personal account if the signup trigger missed it. */
export async function ensureProfile(): Promise<unknown> {
  return dataOf(await callPlatform('app_profile_ensure', {}))
}

// --- Accounts + membership (specialized RPCs) -----------------------------

export async function listMyAccounts(): Promise<unknown[]> {
  return listOf(await callPlatform<unknown[]>('app_accounts_list_mine', {}))
}

export async function getAccount(accountId: string): Promise<unknown> {
  return dataOf(await callPlatform('app_account_get', { p_account_id: accountId }))
}

export async function createOrganisation(name: string, slug?: string): Promise<unknown> {
  return dataOf(
    await callPlatform('app_account_create_organisation', {
      p_name: name,
      p_slug: slug ?? null,
    }),
  )
}

export async function listAccountMembers(accountId: string): Promise<unknown[]> {
  return listOf(
    await callPlatform<unknown[]>('app_account_members_list', { p_account_id: accountId }),
  )
}

export async function addAccountMember(
  accountId: string,
  target: { userId?: string; email?: string },
): Promise<unknown> {
  return dataOf(
    await callPlatform('app_account_members_add', {
      p_account_id: accountId,
      p_user_id: target.userId ?? null,
      p_email: target.email ?? null,
    }),
  )
}

export async function inviteAccountMember(accountId: string, email: string): Promise<unknown> {
  return dataOf(
    await callPlatform('app_account_members_invite', {
      p_account_id: accountId,
      p_email: email,
    }),
  )
}

export async function acceptAccountInvite(accountId: string): Promise<unknown> {
  return dataOf(await callPlatform('app_account_members_accept', { p_account_id: accountId }))
}

export async function removeAccountMember(accountId: string, userId: string): Promise<unknown> {
  return dataOf(
    await callPlatform('app_account_members_remove', {
      p_account_id: accountId,
      p_user_id: userId,
    }),
  )
}

export async function setMemberRole(
  accountId: string,
  userId: string,
  roleKey: string,
): Promise<unknown> {
  return dataOf(
    await callPlatform('app_account_members_set_role', {
      p_account_id: accountId,
      p_user_id: userId,
      p_role_key: roleKey,
    }),
  )
}

export async function transferOwnership(accountId: string, toUserId: string): Promise<unknown> {
  return dataOf(
    await callPlatform('app_account_transfer_ownership', {
      p_account_id: accountId,
      p_to_user_id: toUserId,
    }),
  )
}

// --- Custom organisation roles --------------------------------------------

export async function createAccountRole(
  accountId: string,
  key: string,
  name: string,
  permissionKeys: string[],
): Promise<unknown> {
  return dataOf(
    await callPlatform('app_account_roles_create', {
      p_account_id: accountId,
      p_key: key,
      p_name: name,
      p_permission_keys: permissionKeys,
    }),
  )
}

export async function updateAccountRole(
  roleId: string,
  updates: { name?: string; permissionKeys?: string[] },
): Promise<unknown> {
  return dataOf(
    await callPlatform('app_account_roles_update', {
      p_role_id: roleId,
      p_name: updates.name ?? null,
      p_permission_keys: updates.permissionKeys ?? null,
    }),
  )
}

export async function deleteAccountRole(roleId: string): Promise<unknown> {
  return dataOf(await callPlatform('app_account_roles_delete', { p_role_id: roleId }))
}

// --- Global / scoped RBAC --------------------------------------------------

export async function assignRole(
  userId: string,
  roleKey: string,
  accountId?: string,
): Promise<unknown> {
  return dataOf(
    await callPlatform('app_roles_assign', {
      p_user_id: userId,
      p_role_key: roleKey,
      p_account_id: accountId ?? null,
    }),
  )
}

export async function revokeRole(
  userId: string,
  roleKey: string,
  accountId?: string,
): Promise<unknown> {
  return dataOf(
    await callPlatform('app_roles_revoke', {
      p_user_id: userId,
      p_role_key: roleKey,
      p_account_id: accountId ?? null,
    }),
  )
}

// --- Platform admin --------------------------------------------------------

export async function listUsersAdmin(limit = 50, offset = 0): Promise<unknown[]> {
  return listOf(
    await callPlatform<unknown[]>('app_users_list_admin', {
      p_limit: limit,
      p_offset: offset,
    }),
  )
}

export async function banUser(userId: string, banned = true): Promise<unknown> {
  return dataOf(await callPlatform('app_user_ban', { p_user_id: userId, p_banned: banned }))
}

export async function deleteMyAccount(): Promise<unknown> {
  return dataOf(await callPlatform('app_account_delete_self', {}))
}

export async function deleteUserAdmin(userId: string): Promise<unknown> {
  return dataOf(await callPlatform('app_account_delete_admin', { p_user_id: userId }))
}

// --- Person-to-person relations -------------------------------------------

export async function requestRelation(toUserId: string, kind = 'contact'): Promise<unknown> {
  return dataOf(
    await callPlatform('app_relation_request', {
      p_to_user_id: toUserId,
      p_kind: kind,
    }),
  )
}

export async function acceptRelation(relationId: string): Promise<unknown> {
  return dataOf(await callPlatform('app_relation_accept', { p_relation_id: relationId }))
}

export async function rejectRelation(relationId: string): Promise<unknown> {
  return dataOf(await callPlatform('app_relation_reject', { p_relation_id: relationId }))
}

export async function listRelations(): Promise<unknown[]> {
  return listOf(await callPlatform<unknown[]>('app_relation_list', {}))
}

/** Permission keys for the caller (account-scoped + global; platform admin → full catalog). */
export async function listMyPermissions(accountId?: string | null): Promise<{
  keys: string[]
  isPlatformAdmin: boolean
}> {
  const env = await callPlatform<string[]>('app_permissions_mine', {
    p_account_id: accountId ?? null,
  })
  const keys = listOf(env)
  const meta = (env.meta ?? {}) as { is_platform_admin?: boolean }
  return {
    keys,
    isPlatformAdmin: Boolean(meta.is_platform_admin),
  }
}
