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
import { BotChat } from '../BotChat'
import { Input } from '../Input'

const DEMO_EMAIL = 'platform-notify-demo@lab.local'
const DEMO_PASSWORD = 'PlatformNotify-Demo-1!'

function envConfigured(): boolean {
  return hasSupabasePublicConfig()
}

export function ChatBotShowcase() {
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
        JWT anon from <code className="type-code">back_end:status</code>) to use the live bot lab.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="type-title-sm">Chat bot</h2>
        <p className="type-body-sm type-muted mt-1">
          Live BotChat via <code className="type-code">chatApi</code> + Edge{' '}
          <code className="type-code">chat-bot-run</code>. Serve functions after setting{' '}
          <code className="type-code">OPENAI_API_KEY</code>; without the secret, streams return{' '}
          <code className="type-code">missing_openai_key</code> (RPC create/begin still work).
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
        <BotChat key={liveKey} source={{ mode: 'live' }} initialTitle="Live bot chats" />
      ) : (
        <p className="type-body-sm type-muted">Sign in to open the live workbench.</p>
      )}
    </div>
  )
}
