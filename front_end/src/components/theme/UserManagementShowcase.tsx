import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  requestPasswordReset,
  signIn,
  signOut,
  signUpOrganisation,
  signUpPersonal,
  updatePassword,
} from '../../lib/authApi'
import {
  acceptAccountInvite,
  acceptRelation,
  addAccountMember,
  assignRole,
  banUser,
  createAccountRole,
  createOrganisation,
  deleteAccountRole,
  deleteMyAccount,
  deleteUserAdmin,
  ensureProfile,
  getAccount,
  getMyProfile,
  inviteAccountMember,
  listAccountMembers,
  listMyAccounts,
  listMyPermissions,
  listRelations,
  listUsersAdmin,
  rejectRelation,
  removeAccountMember,
  requestRelation,
  revokeRole,
  setMemberRole,
  transferOwnership,
  updateAccountRole,
  updateMyProfile,
} from '../../lib/userApi'
import { toUserMessage, hasSupabasePublicConfig } from '../../lib/dataApi'
import type { TabbedMenuItem } from '../../lib/menus/tabbedMenu'
import { Button } from '../Button'
import { Input } from '../Input'
import { PasswordInput } from '../PasswordInput'
import { Select } from '../Select'
import { TabbedMenu, TabbedMenuPanel } from '../TabbedMenu'

const MAILPIT_URL = 'http://127.0.0.1:55544'
const RECOVERY_REDIRECT = 'http://127.0.0.1:5173/theme?section=user-management'

const LAB_TABS: readonly TabbedMenuItem[] = [
  { id: 'auth', label: 'Auth' },
  { id: 'profile', label: 'Profile' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'members', label: 'Members' },
  { id: 'roles', label: 'Roles' },
  { id: 'admin', label: 'Admin' },
  { id: 'relations', label: 'Relations' },
]

type AccountRow = {
  id: string
  kind?: string
  name?: string
  slug?: string
  owner_id?: string
}

type MemberRow = {
  user_id?: string
  status?: string
  roles?: string[]
}

function envConfigured(): boolean {
  return hasSupabasePublicConfig()
}

function formatError(err: unknown): string {
  return toUserMessage(err)
}

function promoteSql(userId: string): string {
  return `-- Platform admin promote (ops / Studio / docker psql only — not self-serve)
INSERT INTO public.user_roles (user_id, role_id, account_id)
SELECT '${userId}'::uuid, r.id, NULL
FROM public.roles r
WHERE r.key = 'admin' AND r.account_id IS NULL
ON CONFLICT DO NOTHING;

UPDATE public.profiles
SET primary_role = 'admin'
WHERE id = '${userId}'::uuid;`
}

function demoteSql(userId: string): string {
  return `-- Platform admin demote
DELETE FROM public.user_roles ur
USING public.roles r
WHERE ur.role_id = r.id
  AND ur.user_id = '${userId}'::uuid
  AND ur.account_id IS NULL
  AND r.key = 'admin'
  AND r.account_id IS NULL;

UPDATE public.profiles
SET primary_role = 'user'
WHERE id = '${userId}'::uuid;`
}

export function UserManagementShowcase() {
  const configured = envConfigured()
  const [tab, setTab] = useState('auth')
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [activeAccountId, setActiveAccountId] = useState('')
  const [permKeys, setPermKeys] = useState<string[]>([])
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [result, setResult] = useState<string>('')
  const [busy, setBusy] = useState(false)

  // Auth forms
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')

  // Profile
  const [bio, setBio] = useState('')
  const [profileUsername, setProfileUsername] = useState('')

  // Accounts / members
  const [newOrgName, setNewOrgName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberUserId, setMemberUserId] = useState('')
  const [transferToUserId, setTransferToUserId] = useState('')
  const [setRoleKey, setSetRoleKey] = useState('org_member')
  const [setRoleUserId, setSetRoleUserId] = useState('')
  const [members, setMembers] = useState<MemberRow[]>([])

  // Roles
  const [customKey, setCustomKey] = useState('editor')
  const [customName, setCustomName] = useState('Editor')
  const [customPerms, setCustomPerms] = useState('accounts.read,accounts.members.list')
  const [customRoleId, setCustomRoleId] = useState('')

  // Admin / relations
  const [banUserId, setBanUserId] = useState('')
  const [relationToUserId, setRelationToUserId] = useState('')
  const [relationId, setRelationId] = useState('')
  const [adminUsers, setAdminUsers] = useState<unknown[]>([])
  const [relations, setRelations] = useState<unknown[]>([])

  const hasPerm = useCallback((key: string) => permKeys.includes(key), [permKeys])

  const profileActive = profile
    ? (profile.status as { active?: boolean } | undefined)?.active !== false
    : true

  const run = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      const data = await fn()
      setResult(`${label}\n${JSON.stringify(data, null, 2)}`)
      return data
    } catch (err) {
      setResult(`${label} ERROR\n${formatError(err)}`)
      throw err
    } finally {
      setBusy(false)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    if (!configured) return
    try {
      const [s, u] = await Promise.all([getSession(), getCurrentUser()])
      setSession(s)
      setUser(u)
    } catch (err) {
      setResult(`Session ERROR\n${formatError(err)}`)
    }
  }, [configured])

  const refreshAccountsAndPerms = useCallback(async () => {
    if (!configured || !user) {
      setAccounts([])
      setPermKeys([])
      setIsPlatformAdmin(false)
      setProfile(null)
      return
    }
    try {
      const list = (await listMyAccounts()) as AccountRow[]
      setAccounts(list)
      const nextId =
        activeAccountId && list.some((a) => a.id === activeAccountId)
          ? activeAccountId
          : (list.find((a) => a.kind === 'organisation')?.id ?? list[0]?.id ?? '')
      setActiveAccountId(nextId)
      const perms = await listMyPermissions(nextId || null)
      setPermKeys(perms.keys)
      setIsPlatformAdmin(perms.isPlatformAdmin)
      const p = await getMyProfile()
      setProfile(p)
      if (p && typeof p.bio === 'string') setBio(p.bio)
      if (p && typeof p.username === 'string') setProfileUsername(p.username)
      if (p && typeof p.display_name === 'string') setDisplayName(p.display_name)
    } catch (err) {
      setResult(`Refresh ERROR\n${formatError(err)}`)
    }
  }, [configured, user, activeAccountId])

  useEffect(() => {
    if (!configured) return
    void refreshSession()
    return onAuthStateChange((event, next) => {
      setSession(next)
      setUser(next?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      if (event === 'SIGNED_OUT') {
        setRecoveryMode(false)
        setAccounts([])
        setPermKeys([])
        setProfile(null)
      }
    })
  }, [configured, refreshSession])

  useEffect(() => {
    void refreshAccountsAndPerms()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional: re-load when identity changes

  async function onAccountChange(id: string) {
    setActiveAccountId(id)
    try {
      const perms = await listMyPermissions(id || null)
      setPermKeys(perms.keys)
      setIsPlatformAdmin(perms.isPlatformAdmin)
    } catch (err) {
      setResult(`Permissions ERROR\n${formatError(err)}`)
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setResult(`${label} copied`)
    } catch {
      setResult(`${label}\n${text}`)
    }
  }

  if (!configured) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
          <p className="type-label">Supabase not configured</p>
          <p className="type-body-sm type-muted mt-2 prose-measure">
            Set <code className="type-code">VITE_SUPABASE_URL</code> and{' '}
            <code className="type-code">VITE_SUPABASE_PUBLISHABLE_KEY</code> in{' '}
            <code className="type-code">front_end/.env</code>, then run{' '}
            <code className="type-code">npm run back_end:start</code> (and{' '}
            <code className="type-code">back_end:reset</code> after new user-system migrations).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 prose-measure">
        <p className="type-label mb-1">Interview system</p>
        <p className="type-body-sm type-muted mb-2">
          Assessment briefs/attempts/invites live under user-system. Invites enqueue Mailpit mail (or
          notify existing users) and accept starts an attempt. Full definition:
        </p>
        <a className="type-body-sm underline" href="/theme?section=interview-system">
          /theme?section=interview-system
        </a>
      </div>
      <p className="type-body-sm type-muted prose-measure">
        Local user-system lab — two browsers, two sessions. Auth emails (password reset) land in{' '}
        <a className="underline" href={MAILPIT_URL} target="_blank" rel="noreferrer">
          Mailpit
        </a>
        ; thin invites do <strong>not</strong> send email (token invites live under{' '}
        <a className="underline" href="/theme?section=platform-services">
          Platform services
        </a>
        ). Platform admin is DB/SQL only.
      </p>

      <ol className="type-body-sm type-muted list-decimal space-y-1 pl-5 prose-measure">
        <li>Browser A — organisation signup</li>
        <li>Browser B — personal signup → copy email from the session strip</li>
        <li>A invites B → B accepts (Members) — no Mailpit wait</li>
        <li>A sets B role / custom role → B Refresh → watch permission chips</li>
        <li>Password reset → Mailpit → link returns here → set new password</li>
        <li>Promote admin via SQL (Admin tab) → Refresh → list/ban/unban</li>
        <li>Negatives: personal membership, sole-owner delete, transfer</li>
      </ol>

      {/* Session strip */}
      <div className="space-y-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="type-label">Session</p>
          {!profileActive ? (
            <span className="type-caption rounded border border-[var(--theme-border)] px-2 py-0.5 text-[var(--theme-danger)]">
              banned / inactive
            </span>
          ) : null}
          {isPlatformAdmin ? (
            <span className="type-caption rounded border border-[var(--theme-border)] px-2 py-0.5">
              platform admin
            </span>
          ) : null}
          {recoveryMode ? (
            <span className="type-caption rounded border border-[var(--theme-border)] px-2 py-0.5">
              password recovery
            </span>
          ) : null}
        </div>
        {user ? (
          <div className="space-y-2 type-body-sm">
            <p>
              <span className="type-muted">email </span>
              {user.email}{' '}
              <Button size="xs" variant="ghost" onClick={() => void copyText(user.email ?? '', 'Email')}>
                Copy
              </Button>
            </p>
            <p className="break-all">
              <span className="type-muted">user id </span>
              {user.id}{' '}
              <Button size="xs" variant="ghost" onClick={() => void copyText(user.id, 'User id')}>
                Copy
              </Button>
            </p>
            <Select
              label="Active account"
              size="sm"
              value={activeAccountId}
              options={accounts.map((a) => ({
                value: a.id,
                label: `${a.kind ?? '?'} · ${a.name ?? a.id}`,
              }))}
              onChange={(v) => void onAccountChange(v)}
              placeholder={accounts.length ? undefined : 'No accounts yet'}
            />
            {activeAccountId ? (
              <p className="break-all type-caption type-muted">
                account id {activeAccountId}{' '}
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => void copyText(activeAccountId, 'Account id')}
                >
                  Copy
                </Button>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-1">
              {permKeys.length === 0 ? (
                <span className="type-caption type-muted">no permission keys</span>
              ) : (
                permKeys.map((k) => (
                  <span
                    key={k}
                    className="type-caption rounded border border-[var(--theme-border)] px-2 py-0.5"
                  >
                    {k}
                  </span>
                ))
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="inset"
                disabled={busy}
                onClick={() => void refreshAccountsAndPerms().then(() => refreshSession())}
              >
                Refresh
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run('signOut', async () => {
                    await signOut()
                    setUser(null)
                    setSession(null)
                    return { ok: true }
                  })
                }
              >
                Sign out
              </Button>
            </div>
          </div>
        ) : (
          <p className="type-body-sm type-muted">Not signed in — use the Auth tab.</p>
        )}
      </div>

      {/* Result panel */}
      <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
        <p className="type-label">Result / error</p>
        <pre className="type-code mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all">
          {result || 'Actions print here.'}
        </pre>
      </div>

      <TabbedMenu items={LAB_TABS} selectedId={tab} onSelect={setTab} size="sm" label="Lab sections">
      {/* AUTH */}
      <TabbedMenuPanel id="auth">
          <div className="space-y-6">
            <section className="space-y-3">
              <p className="type-overline">Sign up / sign in</p>
              <div className="grid max-w-xl gap-3">
                <Input label="Email" size="sm" value={email} onChange={(e) => setEmail(e.target.value)} />
                <PasswordInput
                  label="Password"
                  size="sm"
                  value={password}
                  onValueChange={setPassword}
                />
                <Input
                  label="Username"
                  size="sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <Input
                  label="Display name"
                  size="sm"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <Input
                  label="Org name (org signup)"
                  size="sm"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
                <Input
                  label="Org slug (optional)"
                  size="sm"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="action"
                    disabled={busy}
                    onClick={() =>
                      void run('signUpPersonal', async () => {
                        const data = await signUpPersonal({
                          email,
                          password,
                          username,
                          displayName: displayName || undefined,
                        })
                        await refreshSession()
                        return data
                      })
                    }
                  >
                    Sign up personal
                  </Button>
                  <Button
                    size="sm"
                    variant="action"
                    disabled={busy}
                    onClick={() =>
                      void run('signUpOrganisation', async () => {
                        const data = await signUpOrganisation({
                          email,
                          password,
                          username,
                          displayName: displayName || undefined,
                          orgName,
                          orgSlug: orgSlug || undefined,
                        })
                        await refreshSession()
                        return data
                      })
                    }
                  >
                    Sign up organisation
                  </Button>
                  <Button
                    size="sm"
                    variant="inset"
                    disabled={busy}
                    onClick={() =>
                      void run('signIn', async () => {
                        const data = await signIn({ email, password })
                        await refreshSession()
                        return data
                      })
                    }
                  >
                    Sign in
                  </Button>
                </div>
                <p className="type-caption type-muted">
                  Username is required (local + <code className="type-code">app_signup_validate</code>
                  ). Deeper probes:{' '}
                  <a className="underline" href="/theme?section=platform-services">
                    Platform services → Validation
                  </a>
                  .
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <p className="type-overline">Password</p>
              <p className="type-body-sm type-muted prose-measure">
                Signed-in change has no email. Reset emails go to Mailpit (local rate limit ~2/hour).
                Reset link uses <code className="type-code">redirectTo</code> back to this lab.
              </p>
              <div className="grid max-w-xl gap-3">
                <PasswordInput
                  label="New password (signed-in or recovery)"
                  size="sm"
                  value={newPassword}
                  onValueChange={setNewPassword}
                />
                <Button
                  size="sm"
                  variant="action"
                  disabled={busy || !session}
                  onClick={() =>
                    void run('updatePassword', async () => {
                      const u = await updatePassword(newPassword)
                      setRecoveryMode(false)
                      return u
                    })
                  }
                >
                  Update password
                </Button>
                <Input
                  label="Reset email"
                  size="sm"
                  value={resetEmail || email}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="inset"
                    disabled={busy}
                    onClick={() =>
                      void run('requestPasswordReset', async () => {
                        await requestPasswordReset(resetEmail || email, RECOVERY_REDIRECT)
                        return { mailpit: MAILPIT_URL, redirectTo: RECOVERY_REDIRECT }
                      })
                    }
                  >
                    Request password reset
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(MAILPIT_URL, '_blank', 'noopener,noreferrer')}
                  >
                    Open Mailpit
                  </Button>
                </div>
              </div>
            </section>
          </div>
      </TabbedMenuPanel>

      {/* PROFILE */}
      <TabbedMenuPanel id="profile">
          <div className="space-y-4 max-w-xl">
            <p className="type-overline">Profile</p>
            <p className="type-body-sm type-muted">
              <code className="type-code">primary_role</code>, <code className="type-code">status</code>,{' '}
              <code className="type-code">signup_kind</code> are read-only (DB-managed).
            </p>
            <pre className="type-code max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--theme-border)] p-3">
              {profile ? JSON.stringify(profile, null, 2) : 'Load via Refresh or Get profile'}
            </pre>
            <Input label="Bio" size="sm" value={bio} onChange={(e) => setBio(e.target.value)} />
            <Input
              label="Username"
              size="sm"
              value={profileUsername}
              onChange={(e) => setProfileUsername(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !user}
                onClick={() => void run('getMyProfile', () => getMyProfile())}
              >
                Get profile
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy || !user}
                onClick={() =>
                  void run('updateMyProfile', async () => {
                    const p = await updateMyProfile({
                      bio,
                      display_name: displayName || undefined,
                      username: profileUsername || undefined,
                    })
                    setProfile(p as Record<string, unknown>)
                    return p
                  })
                }
              >
                Update profile
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || !user}
                onClick={() => void run('ensureProfile', () => ensureProfile())}
              >
                Ensure profile
              </Button>
            </div>
          </div>
      </TabbedMenuPanel>

      {/* ACCOUNTS */}
      <TabbedMenuPanel id="accounts">
          <div className="space-y-4 max-w-xl">
            <p className="type-overline">Accounts</p>
            <pre className="type-code max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--theme-border)] p-3">
              {JSON.stringify(accounts, null, 2)}
            </pre>
            <Input
              label="New organisation name"
              size="sm"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
            />
            <Input
              label="Transfer ownership to user id"
              size="sm"
              value={transferToUserId}
              onChange={(e) => setTransferToUserId(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !user}
                onClick={() =>
                  void run('listMyAccounts', async () => {
                    const list = await listMyAccounts()
                    setAccounts(list as AccountRow[])
                    return list
                  })
                }
              >
                List mine
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !activeAccountId || !hasPerm('accounts.read')}
                title={!hasPerm('accounts.read') ? 'needs accounts.read' : undefined}
                onClick={() => void run('getAccount', () => getAccount(activeAccountId))}
              >
                Get active
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy || !user}
                onClick={() =>
                  void run('createOrganisation', async () => {
                    const row = await createOrganisation(newOrgName)
                    await refreshAccountsAndPerms()
                    return row
                  })
                }
              >
                Create organisation
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy || !activeAccountId || !transferToUserId}
                onClick={() =>
                  void run('transferOwnership', async () => {
                    const row = await transferOwnership(activeAccountId, transferToUserId)
                    await refreshAccountsAndPerms()
                    return row
                  })
                }
              >
                Transfer ownership
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || !user}
                onClick={() =>
                  void run('deleteMyAccount (soft)', async () => {
                    const row = await deleteMyAccount()
                    await refreshAccountsAndPerms()
                    return row
                  })
                }
              >
                Soft-delete self
              </Button>
            </div>
            <p className="type-caption type-muted">
              Soft-delete while sole org owner should return{' '}
              <code className="type-code">transfer_org_ownership_first</code>.{' '}
              <code className="type-code">accounts.update</code> has no FE RPC yet (catalog only).
            </p>
          </div>
      </TabbedMenuPanel>

      {/* MEMBERS */}
      <TabbedMenuPanel id="members">
          <div className="space-y-4 max-w-xl">
            <p className="type-overline">Members & invites</p>
            <p className="type-body-sm type-muted prose-measure">
              Thin invites only — no email. Copy the other browser&apos;s email from its session strip.
              Invite/add require an existing user.
            </p>
            <Input
              label="Member email"
              size="sm"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
            />
            <Input
              label="Member user id (optional for add)"
              size="sm"
              value={memberUserId}
              onChange={(e) => setMemberUserId(e.target.value)}
            />
            <Input
              label="Set role · user id"
              size="sm"
              value={setRoleUserId}
              onChange={(e) => setSetRoleUserId(e.target.value)}
            />
            <Select
              label="Role key"
              size="sm"
              value={setRoleKey}
              options={[
                { value: 'org_member', label: 'org_member' },
                { value: 'org_admin', label: 'org_admin' },
                { value: 'org_owner', label: 'org_owner (should fail — use transfer)' },
              ]}
              onChange={setSetRoleKey}
            />
            <pre className="type-code max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--theme-border)] p-3">
              {JSON.stringify(members, null, 2)}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !activeAccountId || !hasPerm('accounts.members.list')}
                title={!hasPerm('accounts.members.list') ? 'needs accounts.members.list' : undefined}
                onClick={() =>
                  void run('listAccountMembers', async () => {
                    const rows = await listAccountMembers(activeAccountId)
                    setMembers(rows as MemberRow[])
                    return rows
                  })
                }
              >
                List members
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy || !activeAccountId || !hasPerm('accounts.members.add')}
                title={!hasPerm('accounts.members.add') ? 'needs accounts.members.add' : undefined}
                onClick={() =>
                  void run('addAccountMember', () =>
                    addAccountMember(activeAccountId, {
                      email: memberEmail || undefined,
                      userId: memberUserId || undefined,
                    }),
                  )
                }
              >
                Add member
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy || !activeAccountId || !memberEmail || !hasPerm('accounts.members.add')}
                onClick={() =>
                  void run('inviteAccountMember', () =>
                    inviteAccountMember(activeAccountId, memberEmail),
                  )
                }
              >
                Invite (thin)
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !activeAccountId}
                onClick={() =>
                  void run('acceptAccountInvite', () => acceptAccountInvite(activeAccountId))
                }
              >
                Accept invite
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={
                  busy || !activeAccountId || !setRoleUserId || !hasPerm('accounts.roles.manage')
                }
                title={!hasPerm('accounts.roles.manage') ? 'needs accounts.roles.manage' : undefined}
                onClick={() =>
                  void run('setMemberRole', () =>
                    setMemberRole(activeAccountId, setRoleUserId, setRoleKey),
                  )
                }
              >
                Set member role
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={
                  busy || !activeAccountId || !memberUserId || !hasPerm('accounts.members.remove')
                }
                onClick={() =>
                  void run('removeAccountMember', () =>
                    removeAccountMember(activeAccountId, memberUserId),
                  )
                }
              >
                Remove member
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || !user}
                onClick={() => {
                  const personal = accounts.find((a) => a.kind === 'personal')
                  if (!personal || !user) return
                  void run('add to personal (expect personal_membership_immutable)', () =>
                    addAccountMember(personal.id, { email: memberEmail || user.email || undefined }),
                  )
                }}
              >
                Negative: add to personal
              </Button>
            </div>
          </div>
      </TabbedMenuPanel>

      {/* ROLES */}
      <TabbedMenuPanel id="roles">
          <div className="space-y-4 max-w-xl">
            <p className="type-overline">Custom org roles</p>
            <p className="type-body-sm type-muted prose-measure">
              Org-safe permission keys only. Seeded system roles already carry the matrix — custom
              roles start empty until you attach keys.
            </p>
            <Input label="Role key" size="sm" value={customKey} onChange={(e) => setCustomKey(e.target.value)} />
            <Input label="Role name" size="sm" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            <Input
              label="Permission keys (comma-separated)"
              size="sm"
              value={customPerms}
              onChange={(e) => setCustomPerms(e.target.value)}
            />
            <Input
              label="Custom role id (update/delete)"
              size="sm"
              value={customRoleId}
              onChange={(e) => setCustomRoleId(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="action"
                disabled={busy || !activeAccountId || !hasPerm('accounts.roles.manage')}
                onClick={() =>
                  void run('createAccountRole', async () => {
                    const keys = customPerms
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                    const row = (await createAccountRole(
                      activeAccountId,
                      customKey,
                      customName,
                      keys,
                    )) as { id?: string }
                    if (row?.id) setCustomRoleId(row.id)
                    return row
                  })
                }
              >
                Create custom role
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !customRoleId || !hasPerm('accounts.roles.manage')}
                onClick={() =>
                  void run('updateAccountRole', () =>
                    updateAccountRole(customRoleId, {
                      name: customName,
                      permissionKeys: customPerms
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }),
                  )
                }
              >
                Update custom role
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || !customRoleId || !hasPerm('accounts.roles.manage')}
                onClick={() => void run('deleteAccountRole', () => deleteAccountRole(customRoleId))}
              >
                Delete custom role
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || !activeAccountId || !setRoleUserId}
                onClick={() =>
                  void run('assignRole (account-scoped)', () =>
                    assignRole(setRoleUserId, setRoleKey, activeAccountId),
                  )
                }
              >
                Assign scoped role
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || !activeAccountId || !setRoleUserId}
                onClick={() =>
                  void run('revokeRole (account-scoped)', () =>
                    revokeRole(setRoleUserId, setRoleKey, activeAccountId),
                  )
                }
              >
                Revoke scoped role
              </Button>
            </div>
            <section className="space-y-2 rounded-lg border border-[var(--theme-border)] p-3">
              <p className="type-label">Permission-gated probes</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['accounts.members.list', () => listAccountMembers(activeAccountId)],
                    ['accounts.members.add', () => addAccountMember(activeAccountId, { email: memberEmail })],
                    ['users.list', () => listUsersAdmin()],
                    ['users.ban', () => banUser(banUserId || setRoleUserId, true)],
                  ] as const
                ).map(([key, fn]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={hasPerm(key) ? 'action' : 'ghost'}
                    disabled={busy || !hasPerm(key)}
                    title={hasPerm(key) ? key : `missing ${key}`}
                    onClick={() => void run(`probe ${key}`, fn)}
                  >
                    {hasPerm(key) ? '✓' : '✗'} {key}
                  </Button>
                ))}
              </div>
            </section>
          </div>
      </TabbedMenuPanel>

      {/* ADMIN */}
      <TabbedMenuPanel id="admin">
          <div className="space-y-4 max-w-2xl">
            <p className="type-overline">Platform / admin (DB)</p>
            <p className="type-body-sm type-muted prose-measure">
              Platform admin is <strong>not</strong> self-serve. Run SQL in Studio or{' '}
              <code className="type-code">
                docker exec supabase_db_vurify psql -U postgres -d postgres
              </code>
              , then Refresh.
            </p>
            <p className="type-body-sm">
              Am I platform admin?{' '}
              <strong>{isPlatformAdmin ? 'yes' : 'no'}</strong>
              {profile ? (
                <>
                  {' '}
                  · primary_role=<code className="type-code">{String(profile.primary_role)}</code>
                </>
              ) : null}
            </p>
            {user ? (
              <>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="inset" onClick={() => void copyText(promoteSql(user.id), 'Promote SQL')}>
                      Copy promote SQL
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void copyText(demoteSql(user.id), 'Demote SQL')}>
                      Copy demote SQL
                    </Button>
                  </div>
                  <pre className="type-code max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--theme-border)] p-3">
                    {promoteSql(user.id)}
                  </pre>
                </div>
              </>
            ) : null}
            <Input
              label="Target user id (ban / admin delete)"
              size="sm"
              value={banUserId}
              onChange={(e) => setBanUserId(e.target.value)}
            />
            <pre className="type-code max-h-32 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--theme-border)] p-3">
              {JSON.stringify(adminUsers, null, 2)}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !hasPerm('users.list')}
                title={!hasPerm('users.list') ? 'needs users.list (promote via SQL)' : undefined}
                onClick={() =>
                  void run('listUsersAdmin', async () => {
                    const rows = await listUsersAdmin()
                    setAdminUsers(rows)
                    return rows
                  })
                }
              >
                List users
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy || !banUserId || !hasPerm('users.ban')}
                onClick={() => void run('banUser', () => banUser(banUserId, true))}
              >
                Ban
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !banUserId || !hasPerm('users.ban')}
                onClick={() => void run('unbanUser', () => banUser(banUserId, false))}
              >
                Unban
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || !banUserId || !hasPerm('users.delete')}
                onClick={() => void run('deleteUserAdmin', () => deleteUserAdmin(banUserId))}
              >
                Soft-delete user (admin)
              </Button>
            </div>
          </div>
      </TabbedMenuPanel>

      {/* RELATIONS */}
      <TabbedMenuPanel id="relations">
          <div className="space-y-4 max-w-xl">
            <p className="type-overline">Person ↔ person relations</p>
            <Input
              label="To user id"
              size="sm"
              value={relationToUserId}
              onChange={(e) => setRelationToUserId(e.target.value)}
            />
            <Input
              label="Relation id"
              size="sm"
              value={relationId}
              onChange={(e) => setRelationId(e.target.value)}
            />
            <pre className="type-code max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--theme-border)] p-3">
              {JSON.stringify(relations, null, 2)}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="action"
                disabled={busy || !relationToUserId}
                onClick={() =>
                  void run('requestRelation', async () => {
                    const row = (await requestRelation(relationToUserId)) as { id?: string }
                    if (row?.id) setRelationId(row.id)
                    return row
                  })
                }
              >
                Request
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !relationId}
                onClick={() => void run('acceptRelation', () => acceptRelation(relationId))}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || !relationId}
                onClick={() => void run('rejectRelation', () => rejectRelation(relationId))}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !user}
                onClick={() =>
                  void run('listRelations', async () => {
                    const rows = await listRelations()
                    setRelations(rows)
                    return rows
                  })
                }
              >
                List mine
              </Button>
            </div>
          </div>
      </TabbedMenuPanel>
      </TabbedMenu>
    </div>
  )
}
