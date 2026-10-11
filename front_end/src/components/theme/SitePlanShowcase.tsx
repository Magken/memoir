import { Card } from '../Card'

type SitePlanShowcaseProps = {
  className?: string
}

const EXPERIENCE_STEPS = [
  ['Enter with context', 'The invitation states the role, total time, deadline, and decision date before the candidate begins.'],
  ['Skip repetitive forms', 'A résumé supplies the basics, followed by only two short questions tailored to the person’s experience.'],
  ['Show real judgment', 'A practical situation, an adaptive curveball, and a final voice prompt reveal how the candidate thinks and responds.'],
  ['Be reviewed by a person', 'The reviewer sees complete responses, focused evidence, integrity signals, and useful interview follow-ups.'],
  ['Receive a clear outcome', 'Every candidate gets a timely decision with a specific reason—never silence.'],
] as const

const SITE_SURFACES = [
  ['Home', 'Explain proof over polish, the human-review promise, and the faster path from application to decision.'],
  ['Candidate journey', 'Invitation, résumé intake, adaptive questions, three-stage project task, and reassuring completion state.'],
  ['Reviewer Output Card', 'Full responses, four evidence areas, advisory integrity signals, and tailored interview questions.'],
  ['Employer dashboard', 'Active roles, candidate shortlist, decision deadlines, and accountability for candidate experience.'],
  ['Proof Profile', 'A portable, candidate-owned record of demonstrated capability for a role category.'],
] as const

const PRODUCT_PRINCIPLES = [
  'Demonstrated work matters more than résumé polish or keyword matching.',
  'Specific and honest responses matter more than rehearsed eloquence.',
  'Integrity signals support human judgment; they never auto-reject a candidate.',
  'The changing second stage must build directly on the candidate’s first response.',
  'Hiring teams commit to a decision deadline and provide a real reason.',
] as const

const STAGE1_SCOPE = [
  ['In scope', 'Account creation only — organisation (employer / hiring team) and personal (candidate). Sign-in to an existing account. Org legitimacy checklist + candidate CV intake that feed a later verification step.'],
  ['Out of scope', 'Inviting teammates, adding members, roles UI, billing, live verification decisions, reviewer workflows, and the full candidate assessment journey.'],
  ['Entry from Home', 'Landing Hire → organisation signup. Landing Apply → personal / candidate signup. Pricing Get Started can route by selected audience (Candidates vs Employers Solo/Team).'],
] as const

const LOCKED_DECISIONS = [
  ['CV intake', 'Required. Candidates cannot skip. status.onboarding.cv_intake stays pending → in_progress → complete only.'],
  ['Org legitimacy (v1)', 'Start with company registration number to prove a real org exists. Expand the checklist later; do not hard-code the list in the FE.'],
  ['Verified vs submitted', 'Submitting a registration number (or later a file) means “submitted / ready for review”, never “verified”. Verification is a later human/ops step.'],
] as const

const ORG_FLOW = [
  ['Choose organisation signup', 'signup_kind = organisation. Collect email, password, display name, username, org name, org slug.'],
  ['Auth + provision', 'signUpOrganisation → handle_new_user creates profile, personal workspace, and organisation account with org_owner.'],
  ['Session + home account', 'After confirm/session, set current workspace to the organisation account (personal home still exists).'],
  ['Legitimacy checklist', 'Load migration-seeded org onboarding requirements. v1 seed: company_registration_number (text). FE renders whatever the catalog returns.'],
  ['Submit answers / files', 'Text values write via DEFINER RPC into account onboarding submissions; file-type rows (later) use the org file library and link the node id.'],
  ['Gate to product', 'Empty employer shell ok; hiring features wait until required catalog rows are submitted. docs_verified stays false until a real review step exists.'],
] as const

const CANDIDATE_FLOW = [
  ['Choose personal signup', 'signup_kind = personal. Collect email, password, display name, username.'],
  ['Auth + provision', 'signUpPersonal → profile + personal account + personal_owner. No organisation row.'],
  ['Open CV intake bot', 'Required first long-chain bot: attach CV / résumé, extract structured basics via LangChain Edge (chat-bot-run). No skip control.'],
  ['Confirm extracted fields', 'Candidate reviews bot proposals (name, experience, links) before they write into profile metadata.'],
  ['Gate to product', 'No candidate product shell until cv_intake = complete. Assessment / Proof Profile stay deferred.'],
] as const

const BACKEND_FIT = [
  ['User system', 'Dual signup, profiles, accounts, membership, hybrid RBAC, ban via profiles.status.active — already live. Org onboarding hangs off accounts here.'],
  ['Auth FE', 'lib/authApi signUpPersonal / signUpOrganisation / signIn + lib/authValidation + app_signup_validate.'],
  ['Catalog pattern', 'Same shape as files_doc_kinds / chat_action_catalog / permissions: migration-seeded table, deny-all RLS, read via DEFINER RPC — not a CRUD registry resource.'],
  ['Files', 'Account-scoped libraries for future file-type legitimacy rows and CV binaries. Reuse files_nodes status; do not invent a second binary state machine.'],
  ['Chat / bots', 'Seed chat_bot_profiles key cv_intake; Edge chat-bot-run + chat_actions for confirmable field writes.'],
] as const

const BACKEND_ORG = [
  [
    'Where it lives',
    'Under user-system (not a new peer system). Additive prod migrations: app_org_onboarding_schema / _helpers / _rls / _rpc. Memoir + systems.ts offerings on user-system when RPCs land.',
  ],
  [
    'Catalog table',
    'org_onboarding_requirements — key, label, description, input_kind (text|file), required boolean, enabled boolean, sort_order, metadata (validation hints). Seeded in migration; clients cannot INSERT/UPDATE. Toggle required/enabled later with a tiny patch migration or admin RPC.',
  ],
  [
    'v1 seed row',
    'key = company_registration_number · input_kind = text · required = true · enabled = true. Enough to test the workflow; add tax ID / certificate file rows later without FE rewrites.',
  ],
  [
    'Submissions',
    'org_onboarding_submissions — (account_id, requirement_key) unique. value text nullable, file_node_id → files_nodes nullable, status submitted|needs_review|accepted|rejected, submitted_by, timestamps. RPC-only; deny-all RLS like account_members.',
  ],
  [
    'Aggregate readiness',
    'Server computes “all required+enabled rows submitted” and writes accounts.metadata.onboarding = { complete, docs_verified: false } (or a privileged accounts.status later). Never let the client set docs_verified.',
  ],
  [
    'Read RPC',
    'app_org_onboarding_list(account_id) → catalog rows joined with this account’s submissions. FE form is catalog-driven. Submit via app_org_onboarding_submit(account_id, key, value|file_node_id).',
  ],
  [
    'Why not only accounts.metadata',
    'A freeform JSON blob cannot evolve “required vs optional” rows cleanly. Catalog + submissions matches how permissions, files_doc_kinds, and chat_action_catalog already work.',
  ],
  [
    'Why not a data-platform CRUD resource',
    'Catalog is migration-defined policy; submissions are membership-aware. Pipelines are owner-scoped CRUD — wrong authz model. Use DEFINER RPCs + capabilities.ts rows.',
  ],
  [
    'Candidate side (parallel)',
    'profiles.status.onboarding.cv_intake (server-only). Extracted CV draft → profiles.metadata.cv after bot action approve. CV file → personal account files library.',
  ],
] as const

const IMPROVEMENTS = [
  [
    'Put verification flags on status / DEFINER paths',
    'profiles.status is privileged. Never let the browser set cv_intake complete or docs_verified. DEFINER RPCs flip flags after bot finalize / required submissions.',
  ],
  [
    'Split person vs organisation readiness',
    'CV completion on the person (profiles.status). Org legitimacy on the organisation account (submissions + accounts.metadata.onboarding) because the checklist belongs to the workspace.',
  ],
  [
    'Reuse files for file-type requirements later',
    'When a catalog row is input_kind=file, upload via app_files_* into the org library, then pass file_node_id into app_org_onboarding_submit. Binary lifecycle stays in files.',
  ],
  [
    'Seed cv_intake bot profile',
    'chat_bot_profiles key cv_intake with a narrow prompt + allowlisted propose actions; user must approve before profile metadata writes.',
  ],
  [
    'Keep invite scenes separate',
    'Home plan muted invite placeholders stay future. Stage 1 is self-serve signup only; token invites remain platform-services.',
  ],
  [
    'Production shell still missing',
    'authApi + theme labs exist; no AuthProvider / public /sign-in|/sign-up routes yet. Stage 1 ships those and wires Hire / Apply.',
  ],
] as const

const BUILD_ORDER = [
  ['1', 'Routes + shells', 'Public /sign-up (kind toggle) and /sign-in; post-auth redirect by signup_kind / current account.'],
  ['2', 'Org onboarding SQL', 'Catalog + submissions tables, RLS revoke, list/submit RPCs, seed company_registration_number; capabilities + memoir.'],
  ['3', 'Organisation path', 'Org form → signUpOrganisation → checklist UI from app_org_onboarding_list → submit registration number.'],
  ['4', 'Candidate path', 'Personal form → signUpPersonal → required BotChat cv_intake → confirm fields; block shell until complete.'],
  ['5', 'Soft product gates', 'Empty employer / candidate homes that read onboarding flags; defer real dashboards and verification review.'],
] as const

/** Compact inventory — full build checklist lives in planned/stage1-account-onboarding.md */
const BUILD_INVENTORY = [
  [
    'Reuse (no new SQL)',
    'authApi signUp*/signIn · app_signup_validate · handle_new_user · accounts RPCs · app_files_* · app_chat_bot_* · chat-bot-run Edge · BotChat live.',
  ],
  [
    'New enums',
    'org_onboarding_input_kind (text|file) · org_onboarding_submission_status (submitted|needs_review|accepted|rejected).',
  ],
  [
    'New tables',
    'org_onboarding_requirements (catalog) · org_onboarding_submissions (per org account). Deny-all RLS; DEFINER-only.',
  ],
  [
    'JSONB conventions',
    'profiles.status.onboarding.cv_intake · profiles.metadata.cv · accounts.metadata.onboarding { complete, docs_verified:false } — server-written flags.',
  ],
  [
    'New helpers',
    'app_org_onboarding_recompute · assert_member · app_profile_onboarding_set_cv_intake · app_profile_apply_cv_fields.',
  ],
  [
    'New RPCs',
    'app_org_onboarding_list / _submit / _get_status · app_profile_cv_intake_begin / _status / _complete (or via chat_action_decide).',
  ],
  [
    'Seeds / patches',
    'Requirement company_registration_number · chat_bot_profiles cv_intake · chat_action_catalog profile.apply_cv_fields · decide-hook apply.',
  ],
  [
    'Migrations',
    'app_org_onboarding_{schema,helpers,rls,rpc} · user-system onboarding patch · bot cv_intake patch (+ optional migrations_test fixtures).',
  ],
  [
    'Frontend',
    'AuthProvider · /sign-in · /sign-up · /onboarding/organisation · /onboarding/candidate · orgOnboardingApi · capabilities rows · Hire/Apply wires.',
  ],
  [
    'Tests (opt-in)',
    'back_end/tests/org-onboarding smoke+stress · extend user-system for cv_intake · npm scripts back_end:test:org-onboarding*.',
  ],
] as const

export function SitePlanShowcase({ className = '' }: SitePlanShowcaseProps) {
  return (
    <article className={['mx-auto max-w-5xl space-y-10 pb-16', className].filter(Boolean).join(' ')}>
      <header className="max-w-3xl">
        <p className="type-caption type-accent mb-3">Vurify · Site essence</p>
        <h2 className="type-h1 mb-4">Proof over polish.</h2>
        <p className="type-body-lg type-muted mb-0">
          Vurify is a verified hiring experience built to show how people actually think, adapt,
          and communicate—not how well they optimize a résumé. The promise is simple: one focused
          task, one human conversation, and one clear decision.
        </p>
      </header>

      <section>
        <p className="type-caption type-accent mb-3">Who the site serves</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="outline" className="p-5">
            <p className="type-label mb-2">Candidates</p>
            <p className="type-body-sm type-muted mb-0">
              A respectful path to demonstrate real capability, be seen by a person, and receive a
              reasoned outcome without being ghosted.
            </p>
          </Card>
          <Card variant="outline" className="p-5">
            <p className="type-label mb-2">Reviewers</p>
            <p className="type-body-sm type-muted mb-0">
              Clear evidence of judgment, communication, adaptability, and context—plus focused
              questions for the final conversation.
            </p>
          </Card>
          <Card variant="outline" className="p-5">
            <p className="type-label mb-2">Hiring teams</p>
            <p className="type-body-sm type-muted mb-0">
              A shorter, more accountable hiring process with visible candidates, deadlines, and
              decisions rather than another large applicant-tracking system.
            </p>
          </Card>
        </div>
      </section>

      <section>
        <p className="type-caption type-accent mb-3">Core experience</p>
        <Card variant="outline" className="divide-y divide-[var(--theme-border)]">
          {EXPERIENCE_STEPS.map(([title, description], index) => (
            <div key={title} className="grid gap-2 p-5 sm:grid-cols-[2rem_12rem_1fr] sm:items-start">
              <span className="type-caption type-accent type-tabular">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="type-label mb-0">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <p className="type-caption type-accent mb-3">Essential site surfaces</p>
        <div className="grid gap-4 md:grid-cols-2">
          {SITE_SURFACES.map(([title, description]) => (
            <Card key={title} variant="outline" className="p-5">
              <p className="type-label mb-2">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="type-caption type-accent mb-3">Product principles</p>
          <ul className="space-y-3">
            {PRODUCT_PRINCIPLES.map((principle) => (
              <li key={principle} className="type-body-sm type-muted flex gap-3">
                <span className="type-accent" aria-hidden>
                  —
                </span>
                <span>{principle}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="type-caption type-accent mb-3">Voice and visual direction</p>
          <p className="type-body-sm type-muted mb-3">
            Calm, direct, specific, and human. The site should feel credible without becoming cold
            or institutional. It explains what will happen, why it is fair, and when a person will
            respond.
          </p>
          <p className="type-body-sm type-muted mb-0">
            Use white surfaces, dark ink, indigo for fills, and amber as the highlight for
            outlines and glow. Sage and rose stay status-only. Use Cosmic (Bricolage) across both
            oversized and secondary title treatments, with Nunito for a round body. Favor clear steps,
            real examples, and visible commitments over abstract marketing copy.
          </p>
        </div>
      </section>

      <hr className="border-[var(--theme-border)]" />

      <header className="max-w-3xl">
        <p className="type-caption type-accent mb-3">Stage 1 · User management</p>
        <h2 className="type-h2 mb-4">Account creation first.</h2>
        <p className="type-body type-muted mb-0">
          Before hiring flows or verification decisions, ship two self-serve create-account lanes:
          organisation for employers / hiring teams, and personal for candidates. Backend identity,
          files, and bot chat already exist — this stage wires product routes and onboarding prep
          only.
        </p>
      </header>

      <section>
        <p className="type-caption type-accent mb-3">Scope</p>
        <div className="grid gap-4 md:grid-cols-3">
          {STAGE1_SCOPE.map(([title, description]) => (
            <Card key={title} variant="outline" className="p-5">
              <p className="type-label mb-2">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <p className="type-caption type-accent mb-3">Locked decisions</p>
        <div className="grid gap-4 md:grid-cols-3">
          {LOCKED_DECISIONS.map(([title, description]) => (
            <Card key={title} variant="outline" className="p-5">
              <p className="type-label mb-2">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <p className="type-caption type-accent mb-3">Organisation signup — employers</p>
        <Card variant="outline" className="divide-y divide-[var(--theme-border)]">
          {ORG_FLOW.map(([title, description], index) => (
            <div key={title} className="grid gap-2 p-5 sm:grid-cols-[2rem_14rem_1fr] sm:items-start">
              <span className="type-caption type-accent type-tabular">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="type-label mb-0">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <p className="type-caption type-accent mb-3">Personal signup — candidates</p>
        <Card variant="outline" className="divide-y divide-[var(--theme-border)]">
          {CANDIDATE_FLOW.map(([title, description], index) => (
            <div key={title} className="grid gap-2 p-5 sm:grid-cols-[2rem_14rem_1fr] sm:items-start">
              <span className="type-caption type-accent type-tabular">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="type-label mb-0">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <p className="type-caption type-accent mb-3">What already fits</p>
        <div className="grid gap-4 md:grid-cols-2">
          {BACKEND_FIT.map(([title, description]) => (
            <Card key={title} variant="outline" className="p-5">
              <p className="type-label mb-2">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <p className="type-caption type-accent mb-3">Backend organisation · org legitimacy checklist</p>
        <p className="type-body-sm type-muted mb-4 max-w-3xl">
          Registration number is a good v1 legitimacy signal: cheap to collect, easy to test the
          workflow, and expandable without rewriting the FE. Organise it like existing
          migration-seeded catalogs — not as ad-hoc JSON or a generic CRUD resource.
        </p>
        <Card variant="outline" className="divide-y divide-[var(--theme-border)]">
          {BACKEND_ORG.map(([title, description]) => (
            <div key={title} className="grid gap-2 p-5 sm:grid-cols-[16rem_1fr] sm:items-start">
              <p className="type-label mb-0">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <p className="type-caption type-accent mb-3">Pressure test · improve before build</p>
        <Card variant="outline" className="divide-y divide-[var(--theme-border)]">
          {IMPROVEMENTS.map(([title, description]) => (
            <div key={title} className="grid gap-2 p-5 sm:grid-cols-[16rem_1fr] sm:items-start">
              <p className="type-label mb-0">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <p className="type-caption type-accent mb-3">Suggested build order</p>
        <Card variant="outline" className="divide-y divide-[var(--theme-border)]">
          {BUILD_ORDER.map(([step, title, description]) => (
            <div key={step} className="grid gap-2 p-5 sm:grid-cols-[2rem_12rem_1fr] sm:items-start">
              <span className="type-caption type-accent type-tabular">{step}</span>
              <p className="type-label mb-0">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <p className="type-caption type-accent mb-3">Build inventory · tables, RPCs, FE</p>
        <p className="type-body-sm type-muted mb-4 max-w-3xl">
          Compact checklist for implementation and testing. Full column lists, migration stems,
          capability rows, Edge notes, and smoke matrices live in{' '}
          <span className="type-label">project_indexer/planned/stage1-account-onboarding.md</span>
          — do not implement until asked.
        </p>
        <Card variant="outline" className="divide-y divide-[var(--theme-border)]">
          {BUILD_INVENTORY.map(([title, description]) => (
            <div key={title} className="grid gap-2 p-5 sm:grid-cols-[14rem_1fr] sm:items-start">
              <p className="type-label mb-0">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <p className="type-caption type-accent mb-3">Open decisions</p>
        <ul className="space-y-3">
          <li className="type-body-sm type-muted flex gap-3">
            <span className="type-accent" aria-hidden>
              —
            </span>
            <span>
              Country / format rules for company_registration_number — free text for workflow
              testing, or metadata.validation hints per locale later?
            </span>
          </li>
          <li className="type-body-sm type-muted flex gap-3">
            <span className="type-accent" aria-hidden>
              —
            </span>
            <span>
              Next catalog rows after registration number (tax ID, certificate file, brand pack) —
              seed disabled (enabled=false) now, or add only when needed?
            </span>
          </li>
          <li className="type-body-sm type-muted flex gap-3">
            <span className="type-accent" aria-hidden>
              —
            </span>
            <span>
              Does Solo vs Team pricing change Stage 1 signup (still one organisation account), or
              only post-signup billing / seat limits?
            </span>
          </li>
          <li className="type-body-sm type-muted flex gap-3">
            <span className="type-accent" aria-hidden>
              —
            </span>
            <span>
              When email confirmation is enabled, is onboarding (checklist / CV bot) blocked until
              confirm, or allowed on the provisional session?
            </span>
          </li>
        </ul>
      </section>
    </article>
  )
}
