import { Card } from '../Card'
import { MermaidRendererEmbed } from '../MermaidRenderer'

type InterviewSystemShowcaseProps = {
  className?: string
}

const MERMAID_PLACEMENT = `flowchart LR
  subgraph userSys [user_system]
    RBAC[assessment_perms]
    Briefs[interview_briefs_LIVE]
    Attempts[interview_attempts_LIVE]
  end
  subgraph files [file_management]
    BriefDoc[interview_brief_node]
    SessionDoc[interview_session_node]
  end
  subgraph chat [chat_service]
    Bot[assessment_bot]
    Msgs[chat_messages]
  end
  subgraph platform [platform_STUB]
    Inv[interview_invites_STUB]
    Mail[mail_tag_SEED_UNUSED]
  end
  Briefs --> BriefDoc
  Attempts --> SessionDoc
  Attempts --> Bot
  Bot --> Msgs
  Briefs --> Inv
  Inv -.-> Mail
  RBAC --> Briefs`

const MERMAID_ER = `erDiagram
  interview_briefs ||--o{ interview_attempts : has
  interview_briefs ||--o{ interview_invites : stubs
  interview_briefs ||--|| files_nodes : brief_node
  interview_attempts ||--|| files_nodes : session_node
  interview_attempts ||--|| chat_conversations : assessment_bot`

const MERMAID_BRIEF_LIFE = `flowchart LR
  draft --> publish
  publish --> window[set_window]
  publish --> unpublish
  unpublish --> draft
  publish --> archive
  draft --> archive`

const MERMAID_ATTEMPT_LIFE = `flowchart LR
  start --> in_progress
  in_progress --> complete
  in_progress --> abandon
  complete --> retake[start_again_if_limit_ok]
  abandon --> retake`

function Diagram({ title, source }: { title: string; source: string }) {
  return (
    <div className="space-y-2">
      <p className="type-caption type-muted mb-0">{title}</p>
      <div className="overflow-x-auto rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
        <MermaidRendererEmbed source={source} />
      </div>
    </div>
  )
}

export function InterviewSystemShowcase({ className }: InterviewSystemShowcaseProps) {
  return (
    <div className={['space-y-10', className].filter(Boolean).join(' ')}>
      <header className="space-y-2 prose-measure">
        <p className="type-caption type-accent mb-0">Backend · Interview system</p>
        <h2 className="type-title mb-0">Assessment domain</h2>
        <p className="type-body-sm type-muted mb-0">
          Production registry under user-system: org briefs, personal attempts, Drive bodies, assessment
          bot transcript. Invites are <strong className="type-body-sm">LIVE</strong> (mail/emit + accept
          starts attempt; expire cron disabled). Engine brief JSON lives in{' '}
          <a className="underline" href="/theme?section=interviewer-plan">
            Interviewer plan
          </a>
          . Authoring bot:{' '}
          <a className="underline" href="/theme?section=interview-create-bot">
            Interview create bot
          </a>
          .
        </p>
      </header>

      <section className="space-y-4">
        <p className="type-label mb-0">1. System placement</p>
        <Diagram title="Cross-system map" source={MERMAID_PLACEMENT} />
      </section>

      <section className="space-y-4">
        <p className="type-label mb-0">2. ER diagram</p>
        <Diagram title="Tables + Drive + chat" source={MERMAID_ER} />
      </section>

      <section className="space-y-4">
        <p className="type-label mb-0">3. Permission matrix</p>
        <div className="overflow-x-auto rounded-lg border border-[var(--theme-border)]">
          <table className="w-full type-body-sm text-left">
            <thead className="border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
              <tr>
                <th className="p-3 type-caption">Actor</th>
                <th className="p-3 type-caption">read</th>
                <th className="p-3 type-caption">write</th>
                <th className="p-3 type-caption">manage</th>
                <th className="p-3 type-caption">attempt</th>
              </tr>
            </thead>
            <tbody className="type-muted">
              <tr className="border-b border-[var(--theme-border)]">
                <td className="p-3">org_owner / org_admin</td>
                <td className="p-3">yes</td>
                <td className="p-3">yes</td>
                <td className="p-3">yes</td>
                <td className="p-3">no (signup org)</td>
              </tr>
              <tr className="border-b border-[var(--theme-border)]">
                <td className="p-3">org_member</td>
                <td className="p-3">yes</td>
                <td className="p-3">no</td>
                <td className="p-3">no</td>
                <td className="p-3">if personal signup</td>
              </tr>
              <tr className="border-b border-[var(--theme-border)]">
                <td className="p-3">candidate (personal)</td>
                <td className="p-3">own attempts</td>
                <td className="p-3">—</td>
                <td className="p-3">—</td>
                <td className="p-3">yes</td>
              </tr>
              <tr>
                <td className="p-3">share-editor on brief node</td>
                <td className="p-3">via share</td>
                <td className="p-3">brief_update</td>
                <td className="p-3">no</td>
                <td className="p-3">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-label mb-0">4. Brief lifecycle</p>
        <Diagram title="draft → publish → window / unpublish / archive" source={MERMAID_BRIEF_LIFE} />
        <p className="type-body-sm type-muted prose-measure mb-0">
          Publish requires phases with id + kind in (discussion, tool). Unpublish blocked when any
          attempts exist.
        </p>
      </section>

      <section className="space-y-4">
        <p className="type-label mb-0">5. Attempt lifecycle</p>
        <Diagram title="start → complete | abandon; retakes" source={MERMAID_ATTEMPT_LIFE} />
      </section>

      <section className="space-y-4">
        <p className="type-label mb-0">6. RPC inventory</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Card variant="outline" className="p-4 space-y-2">
            <p className="type-caption type-accent mb-0">LIVE briefs</p>
            <ul className="type-body-sm type-muted list-disc pl-5 mb-0 space-y-1">
              <li>app_interview_brief_create / update / get / list</li>
              <li>publish / unpublish / archive / set_window</li>
            </ul>
          </Card>
          <Card variant="outline" className="p-4 space-y-2">
            <p className="type-caption type-accent mb-0">LIVE attempts</p>
            <ul className="type-body-sm type-muted list-disc pl-5 mb-0 space-y-1">
              <li>attempt_start / get / list_mine / list_for_brief</li>
              <li>count_for_brief / complete / abandon</li>
            </ul>
          </Card>
          <Card variant="outline" className="p-4 space-y-2 md:col-span-2">
            <p className="type-caption type-accent mb-0">LIVE invites</p>
            <ul className="type-body-sm type-muted list-disc pl-5 mb-0 space-y-1">
              <li>invite_create — emit (known user) or mail_enqueue assessment_invite</li>
              <li>invite_list / revoke</li>
              <li>invite_accept_by_token — starts attempt; links attempt_id</li>
              <li>expire_due worker + cron assessment.invite_expire (disabled; run_now locally)</li>
            </ul>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-label mb-0">7. Error glossary</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          interview_not_open · interview_archived · interview_not_published · interview_not_draft ·
          interview_has_attempts · interview_attempt_open · interview_attempt_limit ·
          interview_attempt_state · interview_org_only · interview_personal_only · plus shared
          forbidden / not_found / validation_failed / conflict.
        </p>
      </section>

      <section className="space-y-4">
        <p className="type-label mb-0">8. Drive body shapes</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Card variant="outline" className="p-4">
            <p className="type-caption mb-2">interview_brief (minimal)</p>
            <pre className="type-code type-caption overflow-x-auto whitespace-pre-wrap mb-0">{`{
  schemaVersion: 1,
  kind: "interview_brief",
  phases: [{ id, kind }],
  ...
}`}</pre>
          </Card>
          <Card variant="outline" className="p-4">
            <p className="type-caption mb-2">interview_session</p>
            <pre className="type-code type-caption overflow-x-auto whitespace-pre-wrap mb-0">{`{
  schemaVersion: 1,
  kind: "interview_session",
  briefId, attemptId,
  scores, toolResults, messageRange
}`}</pre>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-label mb-0">9. Stub / SEED_UNUSED / LATER / HALF_WIRE</p>
        <div className="overflow-x-auto rounded-lg border border-[var(--theme-border)]">
          <table className="w-full type-body-sm text-left">
            <thead className="border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
              <tr>
                <th className="p-3 type-caption">Surface</th>
                <th className="p-3 type-caption">Status</th>
              </tr>
            </thead>
            <tbody className="type-muted">
              <tr className="border-b border-[var(--theme-border)]">
                <td className="p-3">briefs / attempts / assessment.* / bot transcript</td>
                <td className="p-3">LIVE</td>
              </tr>
              <tr className="border-b border-[var(--theme-border)]">
                <td className="p-3">interview_invites + create/list/revoke/accept</td>
                <td className="p-3">LIVE</td>
              </tr>
              <tr className="border-b border-[var(--theme-border)]">
                <td className="p-3">mail_tags.assessment_invite + notify types</td>
                <td className="p-3">LIVE (Mailpit locally; prod SMTP later)</td>
              </tr>
              <tr className="border-b border-[var(--theme-border)]">
                <td className="p-3">cron assessment.invite_expire</td>
                <td className="p-3">LIVE registered disabled</td>
              </tr>
              <tr className="border-b border-[var(--theme-border)]">
                <td className="p-3">Prod Auth SMTP / ESP mail-dispatch</td>
                <td className="p-3">LATER</td>
              </tr>
              <tr>
                <td className="p-3">Interview engine / assessment product shell</td>
                <td className="p-3">LATER</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-label mb-0">10. Tests</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          After <code className="type-code">npm run back_end:reset</code>:{' '}
          <code className="type-code">npm run back_end:test:assessment</code> ·{' '}
          <code className="type-code">npm run back_end:test:assessment:stress</code> (A–R, leaves
          leftovers).
        </p>
      </section>

      <section className="space-y-2 prose-measure">
        <p className="type-label mb-0">11. Links</p>
        <ul className="type-body-sm type-muted list-disc pl-5 mb-0 space-y-1">
          <li>
            <a className="underline" href="/theme?section=interviewer-plan">
              Interviewer plan
            </a>{' '}
            (engine / brief JSON)
          </li>
          <li>
            <a className="underline" href="/theme?section=user-management">
              User management
            </a>
          </li>
          <li>
            <a className="underline" href="/theme?section=backend-systems">
              Systems catalog
            </a>
          </li>
          <li>
            Memoir: <code className="type-code">project_indexer/planned/interviewer-engine.md</code>
          </li>
        </ul>
      </section>
    </div>
  )
}
