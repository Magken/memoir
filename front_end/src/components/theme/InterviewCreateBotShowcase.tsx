import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  signIn,
  signOut,
} from '../../lib/authApi'
import * as assessmentApi from '../../lib/assessmentApi'
import { toUserMessage, hasSupabasePublicConfig } from '../../lib/dataApi'
import { CREATE_BOT_ACTION_KEYS, createStarterInterviewBrief } from '../../lib/interviewBrief'
import { listMyAccounts } from '../../lib/userApi'
import { Button } from '../Button'
import { Card } from '../Card'
import { FlowEditorEmbed } from '../FlowEditor'
import { Input } from '../Input'
import { InterviewCreateBotPanel } from '../InterviewCreateBotPanel'
import { MermaidRendererEmbed } from '../MermaidRenderer'

type InterviewCreateBotShowcaseProps = {
  className?: string
}

const DEMO_EMAIL = 'platform-notify-demo@lab.local'
const DEMO_PASSWORD = 'PlatformNotify-Demo-1!'

const MERMAID_FLOW = `flowchart LR
  manage[Manage] --> compose[Compose]
  compose --> builder[Builder_FlowEditor]
  builder <--> bot[interview_create_bot]
  bot --> decide[actionDecide]
  decide --> spine[dispatchEditorAction]
  spine --> canvas[FlowEditor.invokeAction]`

const COOKBOOK: Array<{
  key: string
  when: string
  whenNot: string
  example: string
}> = [
  {
    key: 'interview.create.seed_starter',
    when: 'User wants a standard opening → coding → closing spine.',
    whenNot: 'Canvas already has a full brief; prefer add_* / stamp_meta.',
    example: '{ "meta": { "title": "Backend screen", "roleTitle": "SWE II", "estimatedMinutes": "45" } }',
  },
  {
    key: 'interview.create.stamp_meta',
    when: 'Title / role / minutes / description confirmed from compose or chat.',
    whenNot: 'Changing phase topology — use add_discussion / add_tool.',
    example: '{ "meta": { "title": "X", "roleTitle": "Y", "estimatedMinutes": "45" } }',
  },
  {
    key: 'interview.create.add_discussion',
    when: 'Add a behavioural / Q&A phase after an existing phase.',
    whenNot: 'Mounting a coding/doc tool — use add_tool.',
    example: '{ "parentNodeId": "phase-opening", "label": "Warm-up" }',
  },
  {
    key: 'interview.create.add_tool',
    when: 'Insert a tool phase (coding, doc, etc.) before close.',
    whenNot: 'Pure discussion — use add_discussion.',
    example: '{ "parentNodeId": "phase-warmup", "label": "Coding", "toolType": "coding" }',
  },
  {
    key: 'interview.create.update_node',
    when: 'Patch label/config (opening/closing flags, toolRef, probes).',
    whenNot: 'Creating a new phase — use add_*.',
    example: '{ "nodeId": "tool-1", "config": { "toolType": "coding" } }',
  },
  {
    key: 'interview.create.attach_topic',
    when: 'Wire a discussion phase to a topic node.',
    whenNot: 'Inventing employers or off-catalog tools.',
    example: '{ "discussionNodeId": "disc-1", "topicNodeId": "topic-1" }',
  },
  {
    key: 'interview.create.replace_flow',
    when: 'User explicitly OK’d a large rewrite.',
    whenNot: 'Stepwise edits — prefer small mutates (replace clears undo).',
    example: '{ "flow": { "nodes": [], "edges": [] } }',
  },
]

function envConfigured(): boolean {
  return hasSupabasePublicConfig()
}

async function resolveOrgAccountId(): Promise<string | null> {
  const accounts = await listMyAccounts()
  for (const row of accounts) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    if (r.kind === 'organisation' && r.id) return String(r.id)
  }
  return null
}

export function InterviewCreateBotShowcase({ className = '' }: InterviewCreateBotShowcaseProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [briefId, setBriefId] = useState<string | null>(null)
  const flowPreview = useMemo(() => createStarterInterviewBrief(), [])

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

  const openLab = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const accountId = await resolveOrgAccountId()
      if (!accountId) {
        setError('Sign in as an organisation user with assessment.write.')
        return
      }
      const brief = await assessmentApi.briefCreate(accountId, `Theme lab ${Date.now()}`)
      const opened = await assessmentApi.createBotOpen(accountId, brief.id, {
        title: 'Theme interview create lab',
        clientSnapshot: {
          title: brief.title,
          roleTitle: '',
          phases: [],
          topics: [],
          tools: [],
          coverage: { hasMeta: false, hasOpening: false, hasClosing: false },
        },
      })
      setBriefId(brief.id)
      setConversationId(opened.conversationId)
    } catch (e) {
      setError(toUserMessage(e))
    } finally {
      setBusy(false)
    }
  }, [])

  return (
    <div className={['space-y-10', className].filter(Boolean).join(' ')}>
      <header className="space-y-2 prose-measure">
        <p className="type-caption type-accent mb-0">Backend · Interview create bot</p>
        <h2 className="type-title mb-0">Authoring coach for FlowEditor briefs</h2>
        <p className="type-body-sm type-muted mb-0">
          Same chat machinery as Help / assessment — shared catalog, profile{' '}
          <code className="type-code">interview_create</code>, actions{' '}
          <code className="type-code">interview.create.*</code>. Approve maps through{' '}
          <code className="type-code">dispatchEditorAction</code> →{' '}
          <code className="type-code">FlowEditor.invokeAction</code>. Candidate engine remains in{' '}
          <a className="underline" href="/theme?section=interviewer-plan">
            Interviewer plan
          </a>
          .
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="type-title-sm mb-0">Creator flow</h3>
        <div className="overflow-x-auto rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
          <MermaidRendererEmbed source={MERMAID_FLOW} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="type-title-sm mb-0">Three-bot matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--theme-border)]">
                <th className="type-caption py-2 pr-3">Profile</th>
                <th className="type-caption py-2 pr-3">Surface</th>
                <th className="type-caption py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="type-body-sm">
              <tr className="border-b border-[var(--theme-border)]">
                <td className="py-2 pr-3">
                  <code className="type-code">default</code> (Help)
                </td>
                <td className="py-2 pr-3">BotChat</td>
                <td className="py-2">summarize / rename — never interview.create.*</td>
              </tr>
              <tr className="border-b border-[var(--theme-border)]">
                <td className="py-2 pr-3">
                  <code className="type-code">assessment</code>
                </td>
                <td className="py-2 pr-3">Candidate attempt</td>
                <td className="py-2">Empty allowlist (engine later)</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">
                  <code className="type-code">interview_create</code>
                </td>
                <td className="py-2 pr-3">Interview manager builder</td>
                <td className="py-2">
                  {CREATE_BOT_ACTION_KEYS.length} interview.create.* keys only
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="type-title-sm mb-0">Action cookbook</h3>
        <p className="type-body-sm type-muted mb-0">
          Prefer small mutates. <code className="type-code">replace_flow</code> wipes FlowEditor undo.
          On approve race (canvas edited while pending), reject soft and re-propose — no silent
          overwrite. Role PDFs: extract text client-side (CV pattern); do not upload PDF to the model.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {COOKBOOK.map((row) => (
            <Card key={row.key} className="shadow-none">
              <div className="space-y-2 p-3">
                <p className="type-caption type-accent mb-0">
                  <code className="type-code">{row.key}</code>
                </p>
                <p className="type-body-sm mb-0">
                  <span className="type-emphasis">When:</span> {row.when}
                </p>
                <p className="type-body-sm type-muted mb-0">
                  <span className="type-emphasis">Not when:</span> {row.whenNot}
                </p>
                <pre className="type-code overflow-x-auto rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] p-2 text-[0.7rem]">
                  {row.example}
                </pre>
              </div>
            </Card>
          ))}
        </div>
        <Card className="shadow-none">
          <div className="space-y-2 p-3">
            <p className="type-caption type-accent mb-0">Bad examples</p>
            <ul className="type-body-sm mb-0 list-disc space-y-1 pl-5">
              <li>Inventing employers or calling Help summarize from this profile</li>
              <li>Mutating the graph without approval cards</li>
              <li>Skipping opening/closing coverage when context flags them missing</li>
            </ul>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="type-title-sm mb-0">Live lab</h3>
        <p className="type-body-sm type-muted mb-0">
          Opens a throwaway draft brief + create-bot conversation. Needs org session + migrations
          applied. Stream needs <code className="type-code">OPENAI_API_KEY</code> on Edge.
        </p>
        {!envConfigured() ? (
          <p className="type-body-sm type-muted">
            Configure <code className="type-code">VITE_SUPABASE_URL</code> and{' '}
            <code className="type-code">VITE_SUPABASE_PUBLISHABLE_KEY</code>.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--theme-border)] p-3">
              {user ? (
                <>
                  <p className="type-body-sm grow mb-0">
                    Signed in as <span className="type-emphasis">{user.email}</span>
                    {session ? ' · session ok' : ''}
                    {briefId ? (
                      <>
                        {' '}
                        · brief <code className="type-code">{briefId.slice(0, 8)}</code>
                      </>
                    ) : null}
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
                  <Button size="sm" disabled={busy} onClick={() => void openLab()}>
                    Open against draft brief
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
            {error ? (
              <p className="type-body-sm type-error mb-0" role="alert">
                {error}
              </p>
            ) : null}
            <div className="grid gap-3 lg:grid-cols-2">
              <FlowEditorEmbed
                toolkit="interview-brief"
                flow={flowPreview}
                className="min-h-[18rem] rounded-lg border border-[var(--theme-border)]"
              />
              {conversationId ? (
                <InterviewCreateBotPanel
                  conversationId={conversationId}
                  getFlowRuntime={() => null}
                  onConflict={setError}
                />
              ) : (
                <p className="type-body-sm type-muted self-center">
                  Open a draft brief to mount the live creator bot (approve path needs a workbench
                  FlowEditor ref — use Dashboard Interviews for full spine).
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="type-title-sm mb-0">Test commands</h3>
        <pre className="type-code overflow-x-auto rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3 text-[0.75rem]">
          {`npm run back_end:test:interview-create-bot
npm run back_end:test:interview-create-bot:stress`}
        </pre>
        <p className="type-body-sm type-muted mb-0">
          Memoirs: <code className="type-code">assessment.md</code>,{' '}
          <code className="type-code">chat-service.md</code>, migration entries{' '}
          <code className="type-code">app-interview-create-bot-*</code>. Product surface:{' '}
          <a className="underline" href="/theme/vurify/dashboard">
            Dashboard · Interviews
          </a>
          .
        </p>
      </section>
    </div>
  )
}
