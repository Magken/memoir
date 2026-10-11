import { Card } from '../Card'
import { MermaidRendererEmbed } from '../MermaidRenderer'

type HiringPipelineShowcaseProps = {
  className?: string
}

const MERMAID_SPINE = `flowchart LR
  acquire["Acquire"] --> assess["Assess"] --> read["Read"]`

const MERMAID_END_TO_END = `sequenceDiagram
  participant Emp as Employer
  participant V as Vurify
  participant Cand as Candidate
  Emp->>V: Author the assessment
  alt Invite_path
    Emp->>V: Send invite
    V->>Cand: Invitation
    Cand->>V: Accept
  else Apply_with_CV
    Cand->>V: CV plus apply
    Emp->>V: Accept into the assessment
  end
  V->>Cand: Open the assessment
  Cand->>V: Talk plus editor work
  V->>Emp: Output card
  Emp->>Cand: Decision with a reason`

const MERMAID_RECRUIT = `flowchart LR
  source["Sourcing"] --> acquire["Acquire"]
  acquire --> assess["Assess"]
  assess --> read["Read"]
  read --> hire["Hire"]`

const MERMAID_TWO_WALKS = `flowchart TB
  subgraph employer [Employer]
    eRole["This_role"] --> eAuthor["Author_the_assessment"]
    eRole --> ePeople["People_on_the_spine"]
    ePeople --> eCard["Output_card"]
  end
  subgraph candidate [Candidate]
    cHome["Invites_or_apply"] --> cAssess["The_assessment"]
    cAssess --> cOut["Outcome"]
  end
  eAuthor -.-> cAssess
  ePeople -.-> cHome
  eCard -.-> cOut`

const MERMAID_SERVICES = `flowchart TB
  spine["Acquire_Assess_Read"]
  lists["Role_and_people_lists"] -.-> spine
  mail["Invites_and_mail"] -.-> spine
  editors["Custom_editors"] -.-> spine
  bots["Bots_and_messaging"] -.-> spine
  report["Reporting"] -.-> spine`

const SPINE_STEPS = [
  [
    'Acquire',
    'Talent enters this role',
    'Invite someone, or take a person who applied with a CV. Done when a named person is attached to the role and ready for the assessment.',
  ],
  [
    'Assess',
    'Proof, not a test catalog',
    'The employer authors the path (talk, form, coding, writing, later custom editors). The candidate walks that path. Done when the attempt is complete or forfeited, with artifacts.',
  ],
  [
    'Read',
    'A card a person can open',
    'The hiring manager sees evidence, integrity signals, and follow-ups — then decides with a reason. The candidate is not left in silence.',
  ],
] as const

const NOT_PRODUCTS = [
  ['ATS', 'The list of people on this spine: invited, in the assessment, card ready. Not a second product.'],
  ['Assessments', 'Assess itself — one authored path per role, using editors we already host.'],
  ['Talent pool', 'Acquire intake. CV plus apply feeding roles, not a separate cloud.'],
  ['Messaging / email', 'How invite and follow-up reach a person. Reachable from the role.'],
  ['Reporting', 'Aggregated Read across attempts. Still this spine, many cards.'],
  ['Security', 'Signals beside the assessment. Never a product home of its own.'],
] as const

const EMPLOYER_NAV = [
  ['Organisation home', 'Roles. Each role shows where it sits: Acquire, Assess, or Read.'],
  ['This role', 'People in those three columns. Author the assessment, invite, or open a card.'],
  ['Author', 'Create the path for this role. Creator and create-bot live here — not in a separate product.'],
  ['Output card', 'One attempt. Evidence, follow-ups, decide.'],
] as const

const CANDIDATE_NAV = [
  ['CV intake', 'Once, at account. Stage 1 — then the person can enter Acquire.'],
  ['Home', 'Invites and applications. The candidate side of Acquire.'],
  ['Assessment', 'Walk the authored path. `/interview` gates — this is Assess.'],
  ['Outcome', 'The reason. The candidate side of Read.'],
] as const

const VS_CATALOG = [
  ['Catalog tools', 'A library of generic tests and a score. The hire happens somewhere else.'],
  ['Vurify', 'The path you host: conversation plus real work in custom editors, then a card a manager can open.'],
] as const

function PlanDiagram({ title, source }: { title: string; source: string }) {
  return (
    <div className="space-y-2">
      <p className="type-label type-muted mb-0">{title}</p>
      <div className="theme-mermaid-renderer--showcase-embed overflow-hidden rounded-lg border border-[color:var(--theme-border)]">
        <MermaidRendererEmbed source={source} className="min-h-[12rem]" />
      </div>
    </div>
  )
}

export function HiringPipelineShowcase({ className = '' }: HiringPipelineShowcaseProps) {
  return (
    <article className={['mx-auto max-w-5xl space-y-10 pb-16', className].filter(Boolean).join(' ')}>
      <header className="max-w-3xl">
        <p className="type-caption type-accent mb-3">Vurify · Planning</p>
        <h2 className="type-h1 mb-4">One pipeline.</h2>
        <p className="type-body-lg type-muted mb-0">
          Vurify is a hiring intelligence platform. Not a suite. One spine takes an employer or a
          candidate from first contact to a readable decision: acquire talent, run a custom
          assessment, read the result. Everything else wraps this path.
        </p>
      </header>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">The spine</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Three stages. Same for both audiences. Do not brand wrapping work as “Vurify ATS” or
          “Vurify Assessments” — those names split the product and the nav.
        </p>
        <PlanDiagram title="Acquire then Assess then Read" source={MERMAID_SPINE} />
        <Card variant="outline" className="divide-y divide-[var(--theme-border)]">
          {SPINE_STEPS.map(([title, kicker, description], index) => (
            <div key={title} className="grid gap-2 p-5 sm:grid-cols-[2rem_12rem_1fr] sm:items-start">
              <span className="type-caption type-accent type-tabular">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="type-label mb-1">{title}</p>
                <p className="type-caption type-muted mb-0">{kicker}</p>
              </div>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </div>
          ))}
        </Card>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Start to finish</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Two ways in: the employer invites, or the candidate applies with a CV. After that the
          path is the same. The employer authored the assessment before anyone takes it. The output is a
          card, then a decision with a reason.
        </p>
        <PlanDiagram title="Employer and candidate on the same spine" source={MERMAID_END_TO_END} />
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Where we sit in recruitment</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Sourcing (LinkedIn, referrals) and the final HRIS offer can stay outside. Vurify still
          paints a complete hire: Acquire is the first owned step, Read is the last. We can start
          at invite (skip apply) or at CV (skip sourcing). We can stop at the card. The spine does
          not change.
        </p>
        <PlanDiagram title="Owned path inside the wider hire" source={MERMAID_RECRUIT} />
        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">We own</p>
            <p className="type-body-sm type-muted mb-0">
              Acquire, Assess, Read — invite or CV, the authored assessment, the output card, the
              reasoned decision.
            </p>
          </Card>
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">We can wrap later</p>
            <p className="type-body-sm type-muted mb-0">
              Sourcing tools, background checks, offer letters, employee onboarding. Services
              around the spine — not new products.
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Two walks, few screens</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Easy to navigate means few homes, each named as a stage — not a product switcher. The
          employer lives in roles. The candidate lives in invites and the assessment.
        </p>
        <PlanDiagram title="Homes map to the spine" source={MERMAID_TWO_WALKS} />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="type-label mb-0">Employer</p>
            <Card variant="outline" className="divide-y divide-[var(--theme-border)]">
              {EMPLOYER_NAV.map(([title, description]) => (
                <div key={title} className="p-5 space-y-1">
                  <p className="type-label mb-0">{title}</p>
                  <p className="type-body-sm type-muted mb-0">{description}</p>
                </div>
              ))}
            </Card>
          </div>
          <div className="space-y-3">
            <p className="type-label mb-0">Candidate</p>
            <Card variant="outline" className="divide-y divide-[var(--theme-border)]">
              {CANDIDATE_NAV.map(([title, description]) => (
                <div key={title} className="p-5 space-y-1">
                  <p className="type-label mb-0">{title}</p>
                  <p className="type-body-sm type-muted mb-0">{description}</p>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Why not a TestGorilla</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Catalog assessment software sells generic tests and a score. Vurify sells the path the
          employer hosts. Talk plus real work in editors we already have — then a human reads the
          card. Intelligence is the evidence on that card, not a second product line.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {VS_CATALOG.map(([title, description]) => (
            <Card key={title} variant="outline" className="p-5">
              <p className="type-label mb-2">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Services around the spine — not products</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Lists, mail, bots, reporting, and security exist so this path runs. They must not get
          their own brand or top-level product home. Reach them from the role they serve.
        </p>
        <PlanDiagram title="Wrap the path; do not fork it" source={MERMAID_SERVICES} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {NOT_PRODUCTS.map(([title, description]) => (
            <Card key={title} variant="outline" className="p-5">
              <p className="type-label mb-2">{title}</p>
              <p className="type-body-sm type-muted mb-0">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Locked for this picture</p>
        <ul className="type-body-sm type-muted list-disc pl-5 mb-0 space-y-2 max-w-3xl">
          <li>One product. Every screen is a stage on this spine, or a service that feeds it.</li>
          <li>Assess is authored — not a catalog of generic tests.</li>
          <li>Scores and integrity signals advise. They never auto-reject.</li>
          <li>No product-switcher nav (ATS | Interviews | Reports). Reports live on the role.</li>
        </ul>
      </section>

      <section className="space-y-3 max-w-3xl">
        <p className="type-caption type-accent mb-0">Where the other plans sit</p>
        <p className="type-body-sm type-muted mb-0">
          <a className="underline" href="/theme?section=site-plan">
            Site plan
          </a>{' '}
          — voice, surfaces, Stage 1 accounts and CV intake (the door into Acquire).
        </p>
        <p className="type-body-sm type-muted mb-0">
          <a className="underline" href="/theme?section=interviewer-plan">
            Interviewer plan
          </a>{' '}
          — how Assess is built and scored (phases, editors, analysis). This page does not replace
          it.
        </p>
        <p className="type-body-sm type-muted mb-0">
          Spec memoir:{' '}
          <code className="type-code">project_indexer/planned/hiring-pipeline.md</code>
        </p>
      </section>
    </article>
  )
}
