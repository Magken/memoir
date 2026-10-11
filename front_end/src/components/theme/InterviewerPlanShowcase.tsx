import { Card } from '../Card'
import { MermaidRendererEmbed } from '../MermaidRenderer'

type InterviewerPlanShowcaseProps = {
  className?: string
}

const MERMAID_GAP_BYPASS = `flowchart TD
  subgraph critical [Critical_bypass_before]
    propose["action_propose_any_catalog"]
    decide["action_decide_apply_CV"]
    finalize["client_botRunFinalize"]
  end
  subgraph soft [Soft_isolation_before]
    prompt["system_prompt_only"]
    allTools["context_all_bot_dm_tools"]
  end
  propose --> decide
  finalize --> decide
  allTools --> edge["chat_bot_run"]
  prompt --> edge
  edge --> finalize`

const MERMAID_HARD_PATH = `flowchart TD
  create["bot_create_plus_eligibility"] --> profile["chat_bot_profiles"]
  profile --> junction["chat_bot_profile_actions"]
  catalog["chat_action_catalog"] --> junction
  junction --> ctx["context_tools_allowlist_only"]
  ctx --> edge["chat_bot_run_intersect"]
  edge --> finalize["finalize_junction_reject_bad"]
  propose["action_propose"] --> junction
  propose --> kindGate["kind_matches_target_kind"]
  decide["action_decide"] --> junction`

const MERMAID_THREE_SURFACES = `flowchart LR
  help["Help_BotChat"] --> helpTools["catalog_summarize_rename"]
  cv["CV_intake_UI"] --> cvTools["cvApi_plus_cv_extract"]
  assess["Assessment_shell"] --> phaseTools["brief_phases_editors"]
  helpTools -.->|never| cv
  helpTools -.->|never| assess
  cvTools -.->|never| help
  phaseTools -.->|never| help`

const MERMAID_BOT_LOOP = `sequenceDiagram
  participant UI as BotChat_liveStore
  participant RPC as app_chat_RPCs
  participant Edge as chat_bot_run
  participant LC as LangChain
  participant DB as Postgres
  UI->>RPC: bot_create_bot_key
  RPC->>DB: conversation_kind_bot
  UI->>RPC: app_chat_send
  UI->>Edge: runBotStream
  Edge->>RPC: run_begin
  Edge->>RPC: bot_context_allowlist_tools
  Edge->>LC: stream
  LC-->>Edge: deltas
  Edge-->>UI: SSE
  Edge->>RPC: finalize_allowlisted_actions_only`

const MERMAID_DISCUSSION = `sequenceDiagram
  participant User as Candidate
  participant Chat as chat_messages
  participant Edge as interview_discussion
  participant Session as interview_session_doc
  User->>Chat: answer_turn
  Chat->>Edge: stream_probe_scoped
  Edge->>Chat: assistant_reply
  Edge->>Session: after_turn_scores
  Edge->>Session: advance_or_stay_phase`

const MERMAID_TOOL_STAGE = `sequenceDiagram
  participant Graph as InterviewGraph
  participant Chat as chat_messages
  participant UI as AssessmentShell
  participant Files as Drive_code_or_doc
  Graph->>Chat: tool_part_running
  Graph->>Files: documentCreate
  Graph->>UI: mount_CodeEditor_or_DocEditor
  Note over Graph: Discussion_LLM_paused
  UI->>Files: documentUpdate
  UI->>Graph: tool_complete
  Graph->>Chat: tool_part_success
  Graph->>Graph: score_then_next_phase`

const MERMAID_BRIEF_SPINE = `flowchart TD
  registry["template_registry_define_once"] --> attach["attach_ids_on_hosts"]
  def["definition_meta"] --> phases["phases_sole_ordered_spine"]
  topics["topicLibrary"] --> phases
  tools["tools_form_code_doc"] --> phases
  attach --> topics
  attach --> tools
  phases --> bindings["analysis_schedule_when"]
  bindings --> pipeline["pipeline_grains"]
  pipeline --> session["session_analysis_outputs"]`

const MERMAID_SAMPLE_FLOW = `flowchart LR
  form["1_form_eligibility"] --> discuss["2_discussion_topic"]
  discuss --> code["3_coding_tool"]
  code --> close["4_close"]
  close --> rollup["5_interview_rollup"]`

const MERMAID_PERSISTENCE = `flowchart LR
  brief["Drive_interview_brief"] --> session["Drive_interview_session"]
  session --> scores["analysis_grains_plus_artifacts"]
  bot["bot_conversation"] --> msgs["chat_messages_transcript"]
  session -.->|pointers_not_dup| msgs
  tools["code_doc_form_nodes"] --> session`

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

export function InterviewerPlanShowcase({ className = '' }: InterviewerPlanShowcaseProps) {
  return (
    <article className={['mx-auto max-w-5xl space-y-10 pb-16', className].filter(Boolean).join(' ')}>
      <header className="max-w-3xl">
        <p className="type-caption type-accent mb-3">Vurify · Planning</p>
        <h2 className="type-h1 mb-4">Assessment interviewer</h2>
        <p className="type-body-lg type-muted mb-0">
          One unified system: phases order the interview, a single template registry is attached by id to
          topics and tools, and one analysis pipeline runs at utterance / tool / topic / interview
          grains. Full engine stays planned — domain + this brief are live.
        </p>
      </header>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Why assessment</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Hiring / Proof over polish: discussion probes plus deterministic tool stages (form quiz,
          coding, essay) — not LLM tool-calling. Define analysis templates once; attach them where
          needed. Session holds scores, reasons, synthesis, and targets — not a duplicated transcript.
        </p>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Creation-first + Drive brief</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Authors save an interview definition as Drive JSON (`interview_brief`). Runtime loads by
          node id. Session holds analysis grains and artifact pointers; turns live in{' '}
          <code className="type-code">chat_messages</code>.
        </p>
        <PlanDiagram title="Persistence (no transcript duplication)" source={MERMAID_PERSISTENCE} />
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Unified model — registry → attach → pipeline</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Do not clone the same rubric per topic. Registry owns bodies (
          <code className="type-code">mark.*</code>, <code className="type-code">iv.*</code>,{' '}
          <code className="type-code">synth.*</code>, <code className="type-code">sig.*</code> LATER,{' '}
          <code className="type-code">rollup.*</code>). Topics and tools only store{' '}
          <code className="type-code">analysis.templateIds</code>. Bindings schedule{' '}
          <code className="type-code">when</code>; hosts supply which templates run.
        </p>
        <PlanDiagram title="Brief spine + registry attach" source={MERMAID_BRIEF_SPINE} />
        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">Define once</p>
            <p className="type-body-sm type-muted mb-0">Template registry — kinds fit form vs talk vs code vs synth.</p>
          </Card>
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">Attach 0..n</p>
            <p className="type-body-sm type-muted mb-0">Same id on many hosts; one or many templates per host.</p>
          </Card>
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">Pipeline grains</p>
            <p className="type-body-sm type-muted mb-0">
              <code className="type-code">after_turn</code> · <code className="type-code">after_tool</code> ·{' '}
              <code className="type-code">topic_end</code> · <code className="type-code">interview_end</code>
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Sample interview flow</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Eligibility form (<code className="type-code">mark.form</code>) → discussion (
          <code className="type-code">iv.*</code> each turn; synth + targets at topic end) → coding (
          <code className="type-code">mark.code.tests</code> + <code className="type-code">mark.code.method</code>)
          → close → rollup.
        </p>
        <PlanDiagram title="Sample spine" source={MERMAID_SAMPLE_FLOW} />
        <ol className="type-body-sm type-muted list-decimal pl-5 mb-0 space-y-2 max-w-3xl">
          <li>
            <span className="type-label">Form tool</span> — attach <code className="type-code">mark.form.key</code>;{' '}
            <code className="type-code">after_tool</code> scores answers vs key.
          </li>
          <li>
            <span className="type-label">Discussion</span> — probes + depth; each utterance through attached{' '}
            <code className="type-code">iv.*</code>; at end aggregate → <code className="type-code">synth.topic</code>{' '}
            + fill <code className="type-code">targets[]</code>.
          </li>
          <li>
            <span className="type-label">Coding tool</span> — <code className="type-code">mark.code.tests</code>{' '}
            (cases) + <code className="type-code">mark.code.method</code> (approach); optional synth.
          </li>
          <li>
            <span className="type-label">Interview end</span> — <code className="type-code">rollup.attempt</code>.
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Timing budget</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          <code className="type-code">proposedMinutes</code> is the agency budget; section{' '}
          <code className="type-code">targetMinutes</code> / tool{' '}
          <code className="type-code">timing.estimatedMinutes</code> sum to{' '}
          <code className="type-code">estimatedMinutes</code>. Tools declare{' '}
          <code className="type-code">timing.mode</code> <code className="type-code">timed</code> or{' '}
          <code className="type-code">untimed</code> (timer UI later). Create-bot must fit the spine to
          the budget. Full JSON: planned interviewer-engine canonical brief.
        </p>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Gap audit — soft vs hard</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Before hardening, every bot saw the full action catalog; clients could propose/approve CV
          apply on any thread and call finalize like Edge. Critical/high gaps G1–G6 are fixed in
          migration <code className="type-code">app_bot_profile_actions_patch</code>.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">Fixed now (G1–G6)</p>
            <ul className="type-body-sm type-muted list-disc pl-5 mb-0 space-y-1">
              <li>Propose/decide require bot + allowlist for CV apply</li>
              <li>Finalize rejects non-allowlisted actions</li>
              <li>Context tools = junction only</li>
              <li>kind ↔ target_kind on propose</li>
              <li>create_policy on bot_create</li>
              <li>Edge actions ∩ ctx.tools</li>
            </ul>
          </Card>
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">Deferred (G7–G13)</p>
            <ul className="type-body-sm type-muted list-disc pl-5 mb-0 space-y-1">
              <li>input_schema validation</li>
              <li>DM send role lock</li>
              <li>tool part spoofing</li>
              <li>doc_kind allowlists</li>
              <li>Edge-only finalize</li>
            </ul>
          </Card>
        </div>
        <PlanDiagram title="Bypass paths (before)" source={MERMAID_GAP_BYPASS} />
        <PlanDiagram title="Hard allowlist path (after)" source={MERMAID_HARD_PATH} />
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Three surfaces — do not share BotChat chrome</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="outline" className="p-5">
            <p className="type-label mb-2">Help</p>
            <p className="type-body-sm type-muted mb-0">
              BotChat · profile <code className="type-code">default</code> · allowlist summarize /
              rename
            </p>
          </Card>
          <Card variant="outline" className="p-5">
            <p className="type-label mb-2">CV intake</p>
            <p className="type-body-sm type-muted mb-0">
              CV UI · empty chat allowlist · <code className="type-code">cvApi</code> + Edge
              cv-extract
            </p>
          </Card>
          <Card variant="outline" className="p-5">
            <p className="type-label mb-2">Assessment</p>
            <p className="type-body-sm type-muted mb-0">
              Assessment shell · empty chat allowlist · brief{' '}
              <code className="type-code">phases[]</code> editors
            </p>
          </Card>
        </div>
        <PlanDiagram title="Separate tool systems" source={MERMAID_THREE_SURFACES} />
        <PlanDiagram title="Today’s BotChat loop (help)" source={MERMAID_BOT_LOOP} />
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Discussion vs tool stage</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Hard split vs Intellivey-style mid-chat tool calling. Discussion = probes and talk only —
          the bot never opens form/code/doc mid-topic. Tool stages are dedicated spine steps: pause
          discussion, mount CodeEditor / DocEditor / quiz, complete, then advance. The model never
          chooses the editor — <code className="type-code">phases[]</code> does. Linear, not interleaved.
          Optional <code className="type-code">when</code> on a phase lets the engine skip steps (e.g.
          coding only if eligibility passed) — still not model-chosen branches.
        </p>
        <PlanDiagram title="Discussion turn" source={MERMAID_DISCUSSION} />
        <PlanDiagram title="Tool stage" source={MERMAID_TOOL_STAGE} />
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Authoring field catalog — create-bot checklist</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Complete variable list lives in the planned memoir. Prompt order: meta (+{' '}
          <code className="type-code">proposedMinutes</code>) → spine (+ when/onFail) → per
          discussion (depth, probes, targets, <code className="type-code">attachPack</code>) → per
          tool (timing + artifact + pack) → timingSummary → rollup → coverage.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">A · Meta + behaviour</p>
            <p className="type-body-sm type-muted mb-0">
              title, role, persona name/voice/<code className="type-code">behaviourPrompt</code>,
              guardrails, budget, <code className="type-code">probeDefaults</code>
            </p>
          </Card>
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">C–E · Discussion</p>
            <p className="type-body-sm type-muted mb-0">
              depth overrides, probes, targets,{' '}
              <code className="type-code">attachPack</code> (talk / star / conflict / …)
            </p>
          </Card>
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">F–H · Tools</p>
            <p className="type-body-sm type-muted mb-0">
              form (<code className="type-code">pack.form_gate</code>) · coding (
              <code className="type-code">pack.coding</code>) · doc marks
            </p>
          </Card>
        </div>
        <p className="type-body-sm type-muted mb-0">
          Section defaults: warmup <code className="type-code">pack.shallow</code>; close optional{' '}
          <code className="type-code">iv.question</code>; deep topics raise{' '}
          <code className="type-code">maxFollowUps</code> / minutes; tools use timing + type fields.
          Full tables: §§ A–K in{' '}
          <code className="type-code">planned/interviewer-engine.md</code>.
        </p>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Discussion depth — short style, per topic</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          No nested scenarios. Global{' '}
          <code className="type-code">probeDefaults</code> fall back; each topic may override{' '}
          <code className="type-code">maxFollowUps</code> and <code className="type-code">targetMinutes</code>.
          Probes keep conversational <code className="type-code">goal</code>. Optional{' '}
          <code className="type-code">targets[]</code> fill at topic end.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">Depth</p>
            <p className="type-body-sm type-muted mb-0">
              Fast ace <code className="type-code">maxFollowUps: 0</code> vs deeper dig{' '}
              <code className="type-code">: 3</code>
            </p>
          </Card>
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">Attach</p>
            <p className="type-body-sm type-muted mb-0">
              <code className="type-code">iv.*</code> per utterance · <code className="type-code">synth.*</code>{' '}
              at topic end
            </p>
          </Card>
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">Targets</p>
            <p className="type-body-sm type-muted mb-0">
              Structured slots the bot fills from the discussion at{' '}
              <code className="type-code">topic_end</code>
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Template lanes (compact)</p>
        <p className="type-body type-muted mb-0 max-w-3xl">
          Shared result: <code className="type-code">result</code> + <code className="type-code">justification</code>{' '}
          + optional dimensions/evidence. Interview-first — not survey emotion/appraisal.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">mark.*</p>
            <p className="type-body-sm type-muted mb-0">
              Answer sheet — form key, code tests, code method, essay. Grain:{' '}
              <code className="type-code">after_tool</code>
            </p>
          </Card>
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">iv.*</p>
            <p className="type-body-sm type-muted mb-0">
              Hiring talk — delivery, content, STAR, ownership, tradeoff. Grain: turn → aggregate
              topic_end
            </p>
          </Card>
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">synth.* · sig.* · rollup</p>
            <p className="type-body-sm type-muted mb-0">
              Reviewer paragraph · typing/latency LATER · attempt package
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Score families + synthesis</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card variant="outline" className="p-5">
            <p className="type-label mb-2">Performance</p>
            <p className="type-body-sm type-muted mb-0">
              <code className="type-code">mark.*</code> on form / coding / essay
            </p>
          </Card>
          <Card variant="outline" className="p-5">
            <p className="type-label mb-2">Behavioural · delivery</p>
            <p className="type-body-sm type-muted mb-0">
              <code className="type-code">iv.delivery</code>
            </p>
          </Card>
          <Card variant="outline" className="p-5">
            <p className="type-label mb-2">Behavioural · content</p>
            <p className="type-body-sm type-muted mb-0">
              <code className="type-code">iv.content</code> · STAR · ownership · …
            </p>
          </Card>
          <Card variant="outline" className="p-5">
            <p className="type-label mb-2">Synth / signal</p>
            <p className="type-body-sm type-muted mb-0">
              Narrative <code className="type-code">synth.*</code>; <code className="type-code">sig.*</code>{' '}
              telemetry LATER
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Bits to build (next stage checklist)</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">Live / partial</p>
            <ul className="type-body-sm type-muted list-disc pl-5 mb-0 space-y-1">
              <li>Brief phases spine + create-bot authoring</li>
              <li>Domain RPCs / invites / session docs</li>
              <li>Tool type stubs (form / coding / doc)</li>
            </ul>
          </Card>
          <Card variant="outline" className="p-5 space-y-2">
            <p className="type-label mb-0">LATER</p>
            <ul className="type-body-sm type-muted list-disc pl-5 mb-0 space-y-1">
              <li>Template registry + attach UI</li>
              <li>Analysis Edge stage (all grains)</li>
              <li>Topic targets + synthesis fill</li>
              <li>Candidate shell + reviewer card</li>
            </ul>
          </Card>
        </div>
        <p className="type-body-sm type-muted mb-0">
          Authoring path: compose meta (+ budget) → place phases → attach packs → verify
          timingSummary → publish. Spec:{' '}
          <code className="type-code">project_indexer/planned/interviewer-engine.md</code>
        </p>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Phased build</p>
        <ol className="type-body-sm type-muted list-decimal pl-5 mb-0 space-y-1 max-w-3xl">
          <li>Live: bot allowlist hardening + this Theme brief</li>
          <li>
            Live: assessment domain —{' '}
            <a className="underline" href="/theme?section=interview-system">
              Interview system
            </a>
          </li>
          <li>Later: template registry + attach on builder</li>
          <li>Later: Edge interview graph (discussion \| tool \| analysis)</li>
          <li>Later: assessment host chrome + reviewer card</li>
        </ol>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-accent mb-0">Locked decisions</p>
        <ul className="type-body-sm type-muted list-disc pl-5 mb-0 space-y-1 max-w-3xl">
          <li>One global chat_action_catalog; per-profile junction allowlist</li>
          <li>Shared actions = multiple junction rows, not duplicate catalog entries</li>
          <li>Assessment create_policy server_only until assessment start RPC</li>
          <li>One analysis template registry — attach by pack/id; hosts own attach</li>
          <li>Schedule = when list; packs preferred; templateIds override pack</li>
          <li>Create-bot: meta (+ budget) → spine → packs → timingSummary</li>
          <li>Hard tool isolation: no mid-discussion mounts — tools only as phases[] stages</li>
          <li>Conditional phases: engine-eval when/onFail (skip/gate) — not LLM branches</li>
          <li>Aggregate mean_last_n (STAR=worst); form = hard gate; partial keeps grains</li>
          <li>Discussion depth = topic overrides; no nested scenarios</li>
          <li>Analysis registry = backend/Edge — not a FE lib</li>
          <li>No interview Edge engine in this slice</li>
        </ul>
      </section>
    </article>
  )
}
