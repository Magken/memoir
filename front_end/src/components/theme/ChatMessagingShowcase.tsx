import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  signIn,
  signOut,
} from '../../lib/authApi'
import { toUserMessage, hasSupabasePublicConfig } from '../../lib/dataApi'
import { Button } from '../Button'
import { DmChat } from '../DmChat'
import { Input } from '../Input'

const DEMO_EMAIL = 'platform-notify-demo@lab.local'
const DEMO_PASSWORD = 'PlatformNotify-Demo-1!'
const BUDDY_USER_ID = 'a0000000-0000-4000-8000-000000000002'

function envConfigured(): boolean {
  return hasSupabasePublicConfig()
}

export function ChatMessagingShowcase() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveKey, setLiveKey] = useState(0)

  const refreshSession = useCallback(async () => {
    const [s, u] = await Promise.all([getSession(), getCurrentUser()])
    setSession(s)
    setUser(u)
  }, [])

  useEffect(() => {
    if (!envConfigured()) return
    void refreshSession()
    return onAuthStateChange(() => {
      void refreshSession()
    })
  }, [refreshSession])

  if (!envConfigured()) {
    return (
      <p className="type-body-sm type-muted">
        Configure <code className="type-code">VITE_SUPABASE_URL</code> and{' '}
        <code className="type-code">VITE_SUPABASE_PUBLISHABLE_KEY</code> (hosted API keys, or local
        JWT anon from <code className="type-code">back_end:status</code>) to use the live messaging
        lab.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="type-title-sm">Chat messaging</h2>
        <p className="type-body-sm type-muted mt-1">
          Live DmChat against <code className="type-code">app_chat_*</code> RPCs. Prefer{' '}
          <code className="type-code">npm run back_end:reset</code> first so demo↔buddy DM fixtures
          exist. Sign in as demo; OpenAI key is not required here.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--theme-border)] p-3">
        {user ? (
          <>
            <p className="type-body-sm grow">
              Signed in as <span className="type-emphasis">{user.email}</span>
              {session ? ' · session ok' : ''}
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void signOut()
                  .then(() => refreshSession())
                  .finally(() => setBusy(false))
              }}
            >
              Sign out
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLiveKey((k) => k + 1)}>
              Reload workbench
            </Button>
          </>
        ) : (
          <>
            <Input
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-[14rem]"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-w-[12rem]"
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                setError(null)
                void signIn({ email, password })
                  .then(() => refreshSession())
                  .catch((e) => setError(toUserMessage(e)))
                  .finally(() => setBusy(false))
              }}
            >
              Sign in
            </Button>
          </>
        )}
      </div>

      {error ? <p className="type-body-sm text-[var(--theme-danger)]">{error}</p> : null}

      {user ? (
        <DmChat
          key={liveKey}
          source={{ mode: 'live', bootstrapPeerUserId: BUDDY_USER_ID }}
          initialTitle="Live direct messages"
        />
      ) : (
        <p className="type-body-sm type-muted">Sign in to open the live workbench.</p>
      )}
    </div>
  )
}
