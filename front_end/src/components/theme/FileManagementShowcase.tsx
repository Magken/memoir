import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  signIn,
  signOut,
} from '../../lib/authApi'
import * as fileApi from '../../lib/fileApi'
import { hasSupabasePublicConfig } from '../../lib/dataApi'
import { formatFileExplorerError } from '../../lib/fileExplorer'
import { listMyAccounts } from '../../lib/userApi'
import type { DriveEntry } from '../../lib/fileExplorer'
import type { TabbedMenuItem } from '../../lib/menus/tabbedMenu'
import { Button } from '../Button'
import { FileExplorer } from '../FileExplorer'
import { Input } from '../Input'
import { Select } from '../Select'
import { TabbedMenu, TabbedMenuPanel } from '../TabbedMenu'

const DEMO_EMAIL = 'platform-notify-demo@lab.local'
const DEMO_PASSWORD = 'PlatformNotify-Demo-1!'
const BUDDY_EMAIL = 'platform-notify-buddy@lab.local'
const BUDDY_PASSWORD = 'PlatformNotify-Buddy-1!'
const BUDDY_USER_ID = 'a0000000-0000-4000-8000-000000000002'
const DEMO_LINK_TOKEN = 'demo-files-link-token-lab-fixed-0001'

const LAB_TABS: readonly TabbedMenuItem[] = [
  { id: 'explorer', label: 'Explorer' },
  { id: 'selection', label: 'Selection' },
  { id: 'documents', label: 'Documents' },
  { id: 'quota', label: 'Quota' },
  { id: 'admin', label: 'Admin' },
]

type AccountRow = { id: string; kind?: string; name?: string }

function envConfigured(): boolean {
  return hasSupabasePublicConfig()
}

function formatError(err: unknown): string {
  const friendly = formatFileExplorerError(err)
  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as { message?: string; code?: string; details?: string; detail?: string }
    return JSON.stringify(
      {
        message: friendly,
        code: e.code,
        details: e.details ?? e.detail,
      },
      null,
      2,
    )
  }
  return friendly
}

export function FileManagementShowcase() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [accountId, setAccountId] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string>('')
  const [tab, setTab] = useState('explorer')
  const [selected, setSelected] = useState<DriveEntry | null>(null)
  const [docName, setDocName] = useState('lab-note.md')
  const [docKind, setDocKind] = useState('markdown')
  const [docBody, setDocBody] = useState('{"markdown":"# Lab note"}')
  const [shareUserId, setShareUserId] = useState(BUDDY_USER_ID)
  const [visibility, setVisibility] = useState<'private' | 'link' | 'public_world'>(
    'private',
  )
  const [linkToken, setLinkToken] = useState(DEMO_LINK_TOKEN)
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null)
  const [explorerKey, setExplorerKey] = useState(0)

  const run = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      const data = await fn()
      setResult(JSON.stringify({ ok: true, label, data }, null, 2))
    } catch (err) {
      setResult(JSON.stringify({ ok: false, label, error: formatError(err) }, null, 2))
    } finally {
      setBusy(false)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    const [s, u] = await Promise.all([getSession(), getCurrentUser()])
    setSession(s)
    setUser(u)
    if (u) {
      const mine = await listMyAccounts()
      const rows = (mine ?? []) as AccountRow[]
      setAccounts(rows)
      if (!accountId && rows[0]?.id) setAccountId(rows[0].id)
    } else {
      setAccounts([])
      setAccountId('')
    }
  }, [accountId])

  useEffect(() => {
    if (!envConfigured()) return
    void refreshSession()
    return onAuthStateChange(() => {
      void refreshSession()
    })
  }, [refreshSession])

  useEffect(() => {
    setExplorerKey((k) => k + 1)
  }, [accountId])

  if (!envConfigured()) {
    return (
      <div className="space-y-3">
        <h2 className="type-title">File management</h2>
        <p className="type-body type-muted">
          Supabase not configured. Set VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="type-title">File management</h2>
        <p className="type-body type-muted max-w-3xl">
          Live lab for <code className="type-caption">app_files</code> + FileExplorer.
          After <code className="type-caption">back_end:reset</code>, demo Drive is
          pre-populated (Projects / Media / Shared drafts). Serve Edge with{' '}
          <code className="type-caption">back_end:functions:serve</code> for signed
          URLs. Fixture chrome stays under Docs → Files.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--theme-border)] p-4 space-y-3">
        <p className="type-label">Demo credentials</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void run('sign-in-demo', async () => {
                await signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
                await refreshSession()
                return { email: DEMO_EMAIL }
              })
            }
          >
            Sign in demo
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run('sign-in-buddy', async () => {
                await signIn({ email: BUDDY_EMAIL, password: BUDDY_PASSWORD })
                await refreshSession()
                return { email: BUDDY_EMAIL }
              })
            }
          >
            Sign in buddy
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || !user}
            onClick={() =>
              void run('sign-out', async () => {
                await signOut()
                await refreshSession()
                return { signedOut: true }
              })
            }
          >
            Sign out
          </Button>
        </div>
        <p className="type-caption type-muted">
          {DEMO_EMAIL} / {DEMO_PASSWORD}
        </p>
      </div>

      <div className="rounded-lg border border-[var(--theme-border)] p-4 space-y-3">
        <p className="type-label">Session</p>
        <p className="type-caption">
          {user ? `${user.email} (${user.id})` : 'Not signed in'}
          {session ? ' · session ok' : ''}
        </p>
        <Select
          label="Account"
          size="sm"
          value={accountId}
          onChange={setAccountId}
          disabled={!accounts.length}
          options={accounts.map((a) => ({
            value: a.id,
            label: `${a.name ?? a.id} (${a.kind ?? '?'})`,
          }))}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={busy || !accountId}
          onClick={() => setExplorerKey((k) => k + 1)}
        >
          Refresh explorer
        </Button>
      </div>

      <div className="rounded-lg border border-[var(--theme-border)] p-4">
        <p className="type-label mb-2">Result / error</p>
        <pre className="type-caption overflow-auto max-h-48 whitespace-pre-wrap">
          {result || '—'}
        </pre>
      </div>

      <TabbedMenu items={LAB_TABS} selectedId={tab} onSelect={setTab} size="sm" label="Lab sections">
        <TabbedMenuPanel id="explorer">
          {accountId && user ? (
            <div className="min-h-[32rem] rounded-lg border border-[var(--theme-border)] overflow-hidden">
              <FileExplorer
                key={explorerKey}
                variant="showcase"
                initialTitle="Live library"
                source={{ mode: 'live', accountId, allowLocalUndo: false }}
                onError={(err) => setResult(formatError(err))}
                onSelectionMeta={setSelected}
              />
            </div>
          ) : (
            <p className="type-body type-muted">
              Sign in and pick an account to mount the live explorer.
            </p>
          )}
        </TabbedMenuPanel>

        <TabbedMenuPanel id="selection">
          <div className="space-y-3 max-w-xl">
            <p className="type-caption type-muted">
              Selected: {selected ? `${selected.name} (${selected.id})` : 'none'}
            </p>
            <Select
              label="Visibility"
              size="sm"
              value={visibility}
              onChange={(v) => setVisibility(v as 'private' | 'link' | 'public_world')}
              options={[
                { value: 'private', label: 'private' },
                { value: 'link', label: 'link' },
                { value: 'public_world', label: 'public_world' },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy || !selected}
                onClick={() =>
                  void run('set-visibility', () =>
                    fileApi.setVisibility(selected!.id, visibility),
                  )
                }
              >
                Apply visibility
              </Button>
              <Button
                size="sm"
                disabled={busy || !selected}
                onClick={() =>
                  void run('share-buddy', () =>
                    fileApi.shareCreate(selected!.id, {
                      granteeUserId: shareUserId,
                      role: 'viewer',
                    }),
                  )
                }
              >
                Share → buddy
              </Button>
              <Button
                size="sm"
                disabled={busy || !selected}
                onClick={() =>
                  void run('link-create', async () => {
                    const row = await fileApi.linkCreate(selected!.id)
                    if (row.token) setLinkToken(String(row.token))
                    return row
                  })
                }
              >
                Create link
              </Button>
              <Button
                size="sm"
                disabled={busy || !selected}
                onClick={() =>
                  void run('download-url', () => fileApi.getDownloadUrl(selected!.id))
                }
              >
                Download URL
              </Button>
              <Button
                size="sm"
                disabled={busy || !selected}
                onClick={() =>
                  void run('restore', () => fileApi.restoreFile(selected!.id))
                }
              >
                Restore
              </Button>
            </div>
            <Input
              label="Share grantee user id"
              size="sm"
              value={shareUserId}
              onChange={(e) => setShareUserId(e.target.value)}
            />
            <Input
              label="Link token"
              size="sm"
              value={linkToken}
              onChange={(e) => setLinkToken(e.target.value)}
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void run('link-access', () => fileApi.linkAccess(linkToken))}
            >
              Redeem link token
            </Button>
          </div>
        </TabbedMenuPanel>

        <TabbedMenuPanel id="documents">
          <div className="space-y-3 max-w-xl">
            <Input
              label="Name"
              size="sm"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
            <Select
              label="doc_kind"
              size="sm"
              value={docKind}
              onChange={setDocKind}
              options={[
                'json',
                'doc',
                'markdown',
                'code',
                'draw',
                'plot',
                'force',
                'flow',
                'grid',
                'result',
              ].map((k) => ({ value: k, label: k }))}
            />
            <label className="block space-y-1">
              <span className="type-label">Body JSON</span>
              <textarea
                className="w-full min-h-28 rounded-md border border-[var(--theme-border)] bg-transparent p-2 type-caption"
                value={docBody}
                onChange={(e) => setDocBody(e.target.value)}
              />
            </label>
            <Button
              size="sm"
              disabled={busy || !accountId}
              onClick={() =>
                void run('document-create', () =>
                  fileApi.documentCreate(
                    accountId,
                    docName,
                    docKind,
                    JSON.parse(docBody),
                    selected?.kind === 'folder' ? selected.id : null,
                  ),
                )
              }
            >
              Create document
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !selected}
              onClick={() =>
                void run('document-update', () =>
                  fileApi.documentUpdate(selected!.id, JSON.parse(docBody)),
                )
              }
            >
              Update selected body
            </Button>
          </div>
        </TabbedMenuPanel>

        <TabbedMenuPanel id="quota">
          <div className="space-y-3">
            <Button
              size="sm"
              disabled={busy || !accountId}
              onClick={() =>
                void run('usage', async () => {
                  const u = await fileApi.usageGet(accountId)
                  setUsage(u)
                  return u
                })
              }
            >
              Load usage
            </Button>
            <pre className="type-caption overflow-auto max-h-48">
              {usage ? JSON.stringify(usage, null, 2) : '—'}
            </pre>
          </div>
        </TabbedMenuPanel>

        <TabbedMenuPanel id="admin">
          <p className="type-body type-muted max-w-xl mb-3">
            Soft-delete from explorer File menu. Retention cron:{' '}
            <code className="type-caption">files.retention_purge</code> via Platform
            services → Cron (platform admin + run_now). Storage CORS: allow Vite origin
            against local API for signed uploads.
          </p>
          <Button
            size="sm"
            disabled={busy || !selected}
            onClick={() =>
              void run('share-list', () => fileApi.shareList(selected!.id))
            }
          >
            List shares on selection
          </Button>
        </TabbedMenuPanel>
      </TabbedMenu>
    </div>
  )
}
