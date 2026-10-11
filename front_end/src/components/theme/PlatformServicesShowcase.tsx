import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  requestPasswordReset,
  signIn,
  signOut,
  validateSignup,
} from '../../lib/authApi'
import {
  AUTH_SIGNUP_POLICY,
  validateSignupLocal,
} from '../../lib/authValidation'
import {
  listCronJobs,
  listCronRuns,
  runCronNow,
  setCronEnabled,
  setCronSchedule as updateCronSchedule,
  type CronJobRow,
  type CronRunRow,
} from '../../lib/cronApi'
import {
  acceptAccountInviteToken,
  archiveNotification,
  createAccountInvite,
  dispatchMailMine,
  emitTestNotification,
  flushDigestMine,
  flushMailMine,
  getDigestSettings,
  getMailTagPrefs,
  getNotificationPrefs,
  listAccountInvites,
  listMailOutboxMine,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  previewDigestMine,
  revokeAccountInvite,
  setDigestSettings,
  setMailTagPref,
  setNotificationPrefs,
  softDeleteNotification,
  unreadNotificationCount,
  type InboxView,
  type MailTagPrefRow,
  type NotificationRow,
} from '../../lib/notifyApi'
import { toUserMessage, hasSupabasePublicConfig } from '../../lib/dataApi'
import { listMyAccounts, listMyPermissions, requestRelation } from '../../lib/userApi'
import type { TabbedMenuItem } from '../../lib/menus/tabbedMenu'
import { Button } from '../Button'
import { Input } from '../Input'
import { PasswordInput } from '../PasswordInput'
import { Select } from '../Select'
import { TabbedMenu, TabbedMenuPanel } from '../TabbedMenu'

const MAILPIT_URL = 'http://127.0.0.1:55544'
const DEMO_EMAIL = 'platform-notify-demo@lab.local'
const DEMO_PASSWORD = 'PlatformNotify-Demo-1!'
const DEMO_USERNAME = 'notify_demo'
const BUDDY_EMAIL = 'platform-notify-buddy@lab.local'
const BUDDY_USER_ID = 'a0000000-0000-4000-8000-000000000002'
const INVITEE_EMAIL = 'platform-notify-invitee@lab.local'
const DEMO_INVITE_TOKEN = 'demo-invite-token-lab-fixed-0001'

const LAB_TABS: readonly TabbedMenuItem[] = [
  { id: 'validation', label: 'Validation' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'mail', label: 'Mail' },
  { id: 'digests', label: 'Digests' },
  { id: 'cron', label: 'Cron' },
  { id: 'invites', label: 'Invite tokens' },
]

type AccountRow = { id: string; kind?: string; name?: string }

function envConfigured(): boolean {
  return hasSupabasePublicConfig()
}

function formatError(err: unknown): string {
  return toUserMessage(err)
}

export function PlatformServicesShowcase() {
  const configured = envConfigured()
  const [tab, setTab] = useState('validation')
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [activeAccountId, setActiveAccountId] = useState('')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)

  // Validation probes
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [username, setUsername] = useState(DEMO_USERNAME)
  const [orgName, setOrgName] = useState('Demo Org')

  // Inbox
  const [inboxView, setInboxView] = useState<InboxView>('inbox')
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unread, setUnread] = useState(0)
  const [prefsJson, setPrefsJson] = useState(
    '{"type_key":"system.emit_test","email_enabled":false}',
  )

  // Mail / digests
  const [outbox, setOutbox] = useState<unknown[]>([])
  const [mailTags, setMailTags] = useState<MailTagPrefRow[]>([])
  const [digestJson, setDigestJson] = useState('{"enabled":true,"cadence":"daily"}')
  const [digestPreview, setDigestPreview] = useState('')

  // Cron
  const [cronJobs, setCronJobs] = useState<CronJobRow[]>([])
  const [cronRuns, setCronRuns] = useState<CronRunRow[]>([])
  const [cronFeature, setCronFeature] = useState('')
  const [cronSchedule, setCronSchedule] = useState('*/15 * * * *')
  const [cronExt, setCronExt] = useState<boolean | undefined>()

  // Invites
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [invites, setInvites] = useState<unknown[]>([])

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

  const refreshAccounts = useCallback(async () => {
    if (!configured || !user) {
      setAccounts([])
      setIsPlatformAdmin(false)
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
      setIsPlatformAdmin(perms.isPlatformAdmin)
    } catch (err) {
      setResult(`Refresh ERROR\n${formatError(err)}`)
    }
  }, [configured, user, activeAccountId])

  const refreshInbox = useCallback(async () => {
    if (!user) return
    const [{ rows }, count] = await Promise.all([
      listNotifications(inboxView, { limit: 40 }),
      unreadNotificationCount(),
    ])
    setNotifications(rows)
    setUnread(count)
  }, [user, inboxView])

  useEffect(() => {
    if (!configured) return
    void refreshSession()
    return onAuthStateChange((_event, next) => {
      setSession(next)
      setUser(next?.user ?? null)
    })
  }, [configured, refreshSession])

  useEffect(() => {
    void refreshAccounts()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) void refreshInbox().catch((err) => setResult(`Inbox ERROR\n${formatError(err)}`))
  }, [user?.id, inboxView]) // eslint-disable-line react-hooks/exhaustive-deps

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
            <code className="type-code">VITE_SUPABASE_PUBLISHABLE_KEY</code>, then{' '}
            <code className="type-code">npm run back_end:start</code> /{' '}
            <code className="type-code">back_end:reset</code>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure">
        Platform services lab — validation, inbox, mail outbox, digests, cron, invite tokens. App
        mail queues with email ON by default per tag; Dispatch sends to{' '}
        <a className="underline" href={MAILPIT_URL} target="_blank" rel="noreferrer">
          Mailpit
        </a>
        . Auth templates also land there. Signup username also lives under{' '}
        <a className="underline" href="/theme?section=user-management">
          User management
        </a>
        .
      </p>

      {/* Demo credentials */}
      <div className="space-y-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
        <p className="type-label">Demo user (local fixture)</p>
        <p className="type-body-sm">
          <span className="type-muted">email </span>
          {DEMO_EMAIL}{' '}
          <Button size="xs" variant="ghost" onClick={() => void copyText(DEMO_EMAIL, 'Email')}>
            Copy
          </Button>
        </p>
        <p className="type-body-sm">
          <span className="type-muted">password </span>
          {DEMO_PASSWORD}{' '}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => void copyText(DEMO_PASSWORD, 'Password')}
          >
            Copy
          </Button>
        </p>
        <p className="type-body-sm">
          <span className="type-muted">username </span>
          {DEMO_USERNAME}
        </p>
        <p className="type-body-sm type-muted">
          Buddy recipient: {BUDDY_EMAIL} · invitee mail target: {INVITEE_EMAIL}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="action"
            disabled={busy}
            onClick={() =>
              void run('signIn demo', async () => {
                const data = await signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
                await refreshSession()
                return data
              })
            }
          >
            Sign in demo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || !session}
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(MAILPIT_URL, '_blank', 'noopener,noreferrer')}
          >
            Open Mailpit
          </Button>
        </div>
        {user?.email === DEMO_EMAIL ? (
          <div className="space-y-2 border-t border-[var(--theme-border)] pt-3">
            <p className="type-label">Demo actions (live)</p>
            <p className="type-body-sm type-muted">
              Send requests as the demo user. App mail rows appear in the Mail tab; Auth recovery
              emails land in Mailpit.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !activeAccountId}
                onClick={() =>
                  void run('inviteBuddy', async () => {
                    const row = (await createAccountInvite(activeAccountId, BUDDY_EMAIL)) as {
                      token?: string
                    }
                    if (row?.token) setInviteToken(row.token)
                    setInviteEmail(BUDDY_EMAIL)
                    return row
                  })
                }
              >
                Invite buddy (token)
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy}
                onClick={() =>
                  void run('relationToBuddy', () => requestRelation(BUDDY_USER_ID, 'contact'))
                }
              >
                Relation → buddy
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !activeAccountId}
                onClick={() =>
                  void run('inviteNewEmail', async () => {
                    const row = (await createAccountInvite(activeAccountId, INVITEE_EMAIL)) as {
                      token?: string
                    }
                    if (row?.token) setInviteToken(row.token)
                    setInviteEmail(INVITEE_EMAIL)
                    return row
                  })
                }
              >
                Invite new email (outbox)
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy}
                onClick={() => void run('emitTest', () => emitTestNotification('Lab emit'))}
              >
                Emit test
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy}
                onClick={() =>
                  void run('authRecoveryMailpit', () =>
                    requestPasswordReset(DEMO_EMAIL, `${window.location.origin}/theme?section=platform-services`),
                  )
                }
              >
                Recovery email → Mailpit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void copyText(DEMO_INVITE_TOKEN, 'Fixture invite token')}
              >
                Copy fixture token
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Session */}
      <div className="space-y-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="type-label">Session</p>
          {isPlatformAdmin ? (
            <span className="type-caption rounded border border-[var(--theme-border)] px-2 py-0.5">
              platform admin
            </span>
          ) : null}
          {user ? (
            <span className="type-caption rounded border border-[var(--theme-border)] px-2 py-0.5">
              unread {unread}
            </span>
          ) : null}
        </div>
        {user ? (
          <div className="space-y-1 type-body-sm">
            <p>
              <span className="type-muted">email </span>
              {user.email}
            </p>
            <p className="break-all">
              <span className="type-muted">user id </span>
              {user.id}
            </p>
            <Select
              label="Active account"
              size="sm"
              value={activeAccountId}
              options={accounts.map((a) => ({
                value: a.id,
                label: `${a.kind ?? '?'} · ${a.name ?? a.id}`,
              }))}
              onChange={setActiveAccountId}
              placeholder={accounts.length ? undefined : 'No accounts'}
            />
          </div>
        ) : (
          <p className="type-body-sm type-muted">Not signed in — use demo strip or Validation tab.</p>
        )}
      </div>

      <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
        <p className="type-label">Result / error</p>
        <pre className="type-code mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all">
          {result || 'Actions print here.'}
        </pre>
      </div>

      <TabbedMenu items={LAB_TABS} selectedId={tab} onSelect={setTab} size="sm" label="Lab sections">
        <TabbedMenuPanel id="validation">
          <div className="space-y-4 max-w-xl">
            <p className="type-overline">Signup validation</p>
            <p className="type-body-sm type-muted prose-measure">
              Local policy: password ≥ {AUTH_SIGNUP_POLICY.password.minLength} + complexity;
              username <code className="type-code">{AUTH_SIGNUP_POLICY.username.patternSource}</code>
              . Then <code className="type-code">app_signup_validate</code>.
            </p>
            <Input label="Email" size="sm" value={email} onChange={(e) => setEmail(e.target.value)} />
            <PasswordInput label="Password" size="sm" value={password} onValueChange={setPassword} />
            <Input
              label="Username"
              size="sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label="Org name (org probe)"
              size="sm"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="inset"
                disabled={busy}
                onClick={() =>
                  void run('validateSignupLocal', async () =>
                    validateSignupLocal({
                      email,
                      password,
                      username,
                      signupKind: 'personal',
                    }),
                  )
                }
              >
                Local personal
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy}
                onClick={() =>
                  void run('validateSignup (BE)', () =>
                    validateSignup({
                      email,
                      password,
                      username,
                      signupKind: 'personal',
                    }),
                  )
                }
              >
                BE personal
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy}
                onClick={() =>
                  void run('validateSignup org (BE)', () =>
                    validateSignup({
                      email,
                      password,
                      username,
                      signupKind: 'organisation',
                      orgName,
                    }),
                  )
                }
              >
                BE organisation
              </Button>
              <Button
                size="sm"
                variant="ghost"
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
          </div>
        </TabbedMenuPanel>

        <TabbedMenuPanel id="notifications">
          <div className="space-y-4 max-w-2xl">
            <p className="type-overline">Inbox</p>
            <Select
              label="View"
              size="sm"
              value={inboxView}
              options={[
                { value: 'inbox', label: 'Inbox' },
                { value: 'unread', label: 'Unread' },
                { value: 'archived', label: 'Archived' },
                { value: 'deleted', label: 'Deleted' },
                { value: 'all', label: 'All' },
              ]}
              onChange={(v) => setInboxView(v as InboxView)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !user}
                onClick={() => void run('refresh inbox', () => refreshInbox())}
              >
                Refresh
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy || !user}
                onClick={() =>
                  void run('emitTest', async () => {
                    const row = await emitTestNotification('account.welcome', {
                      source: 'platform-services-lab',
                    })
                    await refreshInbox()
                    return row
                  })
                }
              >
                Emit test to self
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !user}
                onClick={() =>
                  void run('markAllRead', async () => {
                    const r = await markAllNotificationsRead()
                    await refreshInbox()
                    return r
                  })
                }
              >
                Mark all read
              </Button>
            </div>
            <ul className="space-y-2">
              {notifications.length === 0 ? (
                <li className="type-body-sm type-muted">No rows.</li>
              ) : (
                notifications.map((n) => (
                  <li
                    key={String(n.id)}
                    className="rounded border border-[var(--theme-border)] p-3 space-y-1"
                  >
                    <p className="type-body-sm">
                      <span className="type-muted">{String(n.type_key)} · </span>
                      {String(n.title ?? '')}
                      {!n.read_at ? (
                        <span className="type-caption ml-2 rounded border border-[var(--theme-border)] px-1">
                          unread
                        </span>
                      ) : null}
                    </p>
                    <p className="type-caption type-muted">{String(n.body ?? '')}</p>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={busy || !n.id}
                        onClick={() =>
                          void run('mark read', async () => {
                            const row = await markNotificationRead(String(n.id), !n.read_at)
                            await refreshInbox()
                            return row
                          })
                        }
                      >
                        {n.read_at ? 'Mark unread' : 'Mark read'}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={busy || !n.id}
                        onClick={() =>
                          void run(n.archived_at ? 'unarchive' : 'archive', async () => {
                            const row = await archiveNotification(String(n.id), !n.archived_at)
                            await refreshInbox()
                            return row
                          })
                        }
                      >
                        {n.archived_at ? 'Unarchive' : 'Archive'}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={busy || !n.id}
                        onClick={() =>
                          void run(n.deleted_at ? 'undelete' : 'soft-delete', async () => {
                            const row = await softDeleteNotification(String(n.id), !n.deleted_at)
                            await refreshInbox()
                            return row
                          })
                        }
                      >
                        {n.deleted_at ? 'Undelete' : 'Soft-delete'}
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
            <section className="space-y-2">
              <p className="type-label">Prefs JSON</p>
              <Input
                label="Prefs override"
                size="sm"
                value={prefsJson}
                onChange={(e) => setPrefsJson(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="inset"
                  disabled={busy || !user}
                  onClick={() =>
                    void run('getPrefs', async () => {
                      const p = await getNotificationPrefs()
                      setPrefsJson(JSON.stringify(p ?? {}, null, 0))
                      return p
                    })
                  }
                >
                  Get prefs
                </Button>
                <Button
                  size="sm"
                  variant="action"
                  disabled={busy || !user}
                  onClick={() =>
                    void run('setPrefs', () =>
                      setNotificationPrefs(JSON.parse(prefsJson || '{}') as Record<string, unknown>),
                    )
                  }
                >
                  Set prefs
                </Button>
              </div>
            </section>
          </div>
        </TabbedMenuPanel>

        <TabbedMenuPanel id="mail">
          <div className="space-y-4 max-w-xl">
            <p className="type-overline">Mail outbox</p>
            <p className="type-body-sm type-muted prose-measure">
              App transactional rows tagged by category (invite, relation, digest, …). Email is ON by
              default; turn a tag off below to stop enqueue. Dispatch delivers pending rows to
              Mailpit via Edge Function <span className="type-code">mail-dispatch</span> (
              <span className="type-code">npm run back_end:functions:serve</span>). Mark-sent-only is
              the offline fallback.
            </p>
            <section className="space-y-2">
              <p className="type-label">Mail tags (email by default)</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="inset"
                  disabled={busy || !user}
                  onClick={() =>
                    void run('getMailTagPrefs', async () => {
                      const rows = await getMailTagPrefs()
                      setMailTags(rows)
                      return rows
                    })
                  }
                >
                  Load tags
                </Button>
              </div>
              <ul className="space-y-2">
                {mailTags.length === 0 ? (
                  <li className="type-body-sm type-muted">Load tags to toggle email per category.</li>
                ) : (
                  mailTags.map((t) => (
                    <li
                      key={t.tag_key}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--theme-border)] px-3 py-2"
                    >
                      <div>
                        <p className="type-body-sm">{t.label}</p>
                        <p className="type-muted type-code">{t.tag_key}</p>
                      </div>
                      <Button
                        size="xs"
                        variant={t.email_enabled ? 'action' : 'ghost'}
                        disabled={busy || !user}
                        onClick={() =>
                          void run(`tag:${t.tag_key}`, async () => {
                            const next = !t.email_enabled
                            const row = await setMailTagPref(t.tag_key, next)
                            setMailTags((prev) =>
                              prev.map((x) =>
                                x.tag_key === t.tag_key ? { ...x, email_enabled: next } : x,
                              ),
                            )
                            return row
                          })
                        }
                      >
                        Email {t.email_enabled ? 'ON' : 'OFF'}
                      </Button>
                    </li>
                  ))
                )}
              </ul>
            </section>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !user}
                onClick={() =>
                  void run('listMailOutbox', async () => {
                    const rows = await listMailOutboxMine()
                    setOutbox(rows)
                    return rows
                  })
                }
              >
                List mine
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy || !user}
                onClick={() =>
                  void run('dispatchMailMine', async () => {
                    const data = await dispatchMailMine()
                    const rows = await listMailOutboxMine()
                    setOutbox(rows)
                    return data
                  })
                }
              >
                Dispatch → Mailpit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || !user}
                onClick={() => void run('flushMailMine', () => flushMailMine())}
              >
                Mark sent only
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(MAILPIT_URL, '_blank', 'noopener,noreferrer')}
              >
                Mailpit
              </Button>
            </div>
            <pre className="type-code max-h-48 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--theme-border)] p-3">
              {JSON.stringify(outbox, null, 2)}
            </pre>
          </div>
        </TabbedMenuPanel>

        <TabbedMenuPanel id="digests">
          <div className="space-y-4 max-w-xl">
            <p className="type-overline">Digests</p>
            <Input
              label="Settings JSON"
              size="sm"
              value={digestJson}
              onChange={(e) => setDigestJson(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !user}
                onClick={() =>
                  void run('getDigestSettings', async () => {
                    const s = await getDigestSettings()
                    setDigestJson(JSON.stringify(s ?? {}, null, 0))
                    return s
                  })
                }
              >
                Get settings
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy || !user}
                onClick={() =>
                  void run('setDigestSettings', () =>
                    setDigestSettings(JSON.parse(digestJson || '{}') as Record<string, unknown>),
                  )
                }
              >
                Set settings
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !user}
                onClick={() =>
                  void run('previewDigest', async () => {
                    const p = await previewDigestMine()
                    setDigestPreview(JSON.stringify(p, null, 2))
                    return p
                  })
                }
              >
                Preview
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy || !user}
                onClick={() => void run('flushDigest', () => flushDigestMine())}
              >
                Flush mine
              </Button>
            </div>
            <pre className="type-code max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--theme-border)] p-3">
              {digestPreview || 'Preview prints here.'}
            </pre>
          </div>
        </TabbedMenuPanel>

        <TabbedMenuPanel id="cron">
          <div className="space-y-4 max-w-2xl">
            <p className="type-overline">Cron (platform admin)</p>
            <p className="type-body-sm type-muted prose-measure">
              Jobs start disabled. Run now works without enabling. Enable needs pg_cron (
              <code className="type-code">cron_unavailable</code> if missing).
            </p>
            <Input
              label="Filter feature (optional)"
              size="sm"
              value={cronFeature}
              onChange={(e) => setCronFeature(e.target.value)}
            />
            <Input
              label="Schedule for first listed job"
              size="sm"
              value={cronSchedule}
              onChange={(e) => setCronSchedule(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !isPlatformAdmin}
                title={!isPlatformAdmin ? 'needs platform admin' : undefined}
                onClick={() =>
                  void run('listCronJobs', async () => {
                    const { jobs, extensionAvailable } = await listCronJobs(
                      cronFeature || null,
                    )
                    setCronJobs(jobs)
                    setCronExt(extensionAvailable)
                    return { jobs, extensionAvailable }
                  })
                }
              >
                List jobs
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || !isPlatformAdmin || !cronJobs[0]?.job_key || !cronSchedule.trim()}
                onClick={() =>
                  void run('setCronSchedule', async () => {
                    const jobKey = String(cronJobs[0]?.job_key)
                    const row = await updateCronSchedule(jobKey, cronSchedule.trim())
                    const { jobs } = await listCronJobs(cronFeature || null)
                    setCronJobs(jobs)
                    return row
                  })
                }
              >
                Update first job schedule
              </Button>
            </div>
            <p className="type-caption type-muted">
              extension available: {cronExt == null ? '—' : String(cronExt)}
            </p>
            <ul className="space-y-2">
              {cronJobs.map((j) => (
                <li
                  key={String(j.job_key)}
                  className="rounded border border-[var(--theme-border)] p-3 space-y-1"
                >
                  <p className="type-body-sm">
                    {String(j.job_key)}{' '}
                    <span className="type-muted">
                      · {String(j.feature)} · {j.enabled ? 'enabled' : 'disabled'} ·{' '}
                      {String(j.cron_expr)}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void run('setEnabled', async () => {
                          const row = await setCronEnabled(String(j.job_key), !j.enabled)
                          const { jobs } = await listCronJobs(cronFeature || null)
                          setCronJobs(jobs)
                          return row
                        })
                      }
                    >
                      {j.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      size="xs"
                      variant="action"
                      disabled={busy}
                      onClick={() =>
                        void run('runNow', async () => {
                          const row = await runCronNow(String(j.job_key))
                          const { runs } = await listCronRuns(String(j.job_key), 10)
                          setCronRuns(runs)
                          return row
                        })
                      }
                    >
                      Run now
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void run('listRuns', async () => {
                          const { runs } = await listCronRuns(String(j.job_key), 10)
                          setCronRuns(runs)
                          return runs
                        })
                      }
                    >
                      Runs
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <pre className="type-code max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--theme-border)] p-3">
              {JSON.stringify(cronRuns, null, 2)}
            </pre>
          </div>
        </TabbedMenuPanel>

        <TabbedMenuPanel id="invites">
          <div className="space-y-4 max-w-xl">
            <p className="type-overline">Invite tokens</p>
            <p className="type-body-sm type-muted prose-measure">
              Create → copy accept URL/token → second session Accept. Thin invite still exists under
              User management.
            </p>
            <Input
              label="Invite email"
              size="sm"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Input
              label="Accept token"
              size="sm"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="action"
                disabled={busy || !activeAccountId || !inviteEmail}
                onClick={() =>
                  void run('createInvite', async () => {
                    const row = (await createAccountInvite(activeAccountId, inviteEmail)) as {
                      token?: string
                      accept_url?: string
                      id?: string
                    }
                    if (row?.token) setInviteToken(row.token)
                    if (row?.accept_url) await copyText(row.accept_url, 'Accept URL')
                    const list = await listAccountInvites(activeAccountId)
                    setInvites(list)
                    return row
                  })
                }
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="inset"
                disabled={busy || !activeAccountId}
                onClick={() =>
                  void run('listInvites', async () => {
                    const list = await listAccountInvites(activeAccountId)
                    setInvites(list)
                    return list
                  })
                }
              >
                List
              </Button>
              <Button
                size="sm"
                variant="action"
                disabled={busy || !inviteToken || !user}
                onClick={() =>
                  void run('acceptToken', () => acceptAccountInviteToken(inviteToken))
                }
              >
                Accept token
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || invites.length === 0}
                onClick={() => {
                  const first = invites[0] as { id?: string }
                  if (!first?.id) return
                  void run('revokeInvite', async () => {
                    const row = await revokeAccountInvite(String(first.id))
                    const list = await listAccountInvites(activeAccountId)
                    setInvites(list)
                    return row
                  })
                }}
              >
                Revoke first
              </Button>
            </div>
            <pre className="type-code max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--theme-border)] p-3">
              {JSON.stringify(invites, null, 2)}
            </pre>
          </div>
        </TabbedMenuPanel>
      </TabbedMenu>
    </div>
  )
}
