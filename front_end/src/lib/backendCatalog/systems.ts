/**
 * Human-facing catalog of backend platform systems and what they offer.
 * Theme lab: `/theme?section=backend-systems`. Keep in sync with
 * `project_indexer/back_end/{data-platform,user-system,cron-service,platform-services,file-management}.md`.
 */

export type BackendOfferingKind =
  | 'rpc'
  | 'helper'
  | 'resource'
  | 'catalog'
  | 'edge'
  | 'client'
  | 'table'

export type BackendOffering = {
  name: string
  kind: BackendOfferingKind
  summary: string
}

export type BackendSystem = {
  id: string
  title: string
  summary: string
  /** Memoir filename under project_indexer/back_end/ */
  memoir: string
  /** Optional Theme deep link for a live lab */
  themeLab?: string
  feLibs: readonly string[]
  /** One-line how a new feature plugs in */
  hotWire: string
  offerings: readonly BackendOffering[]
}

export const BACKEND_SYSTEMS: readonly BackendSystem[] = [
  {
    id: 'data-platform',
    title: 'Data platform',
    summary:
      'Allowlisted CRUD via shared pipelines. Register a resource once — no new per-table CRUD RPCs.',
    memoir: 'data-platform.md',
    feLibs: ['lib/dataApi'],
    hotWire:
      'Add table + registry row (templates) → FE resourceCatalog + ResourceKey → use fetch/create/update wrappers.',
    offerings: [
      { name: 'app_resource_registry', kind: 'catalog', summary: 'Allowlists fields, filters, scope, limits per resource_key' },
      { name: 'app_fetch / app_fetch_one', kind: 'rpc', summary: 'List or load one row by resource_key' },
      { name: 'app_exists / app_count', kind: 'rpc', summary: 'Existence and counts with filters' },
      { name: 'app_create / app_create_many', kind: 'rpc', summary: 'Insert (bulk capped)' },
      { name: 'app_update / app_update_many', kind: 'rpc', summary: 'Patch by id / id arrays' },
      { name: 'app_upsert', kind: 'rpc', summary: 'Upsert via registry upsert_keys' },
      { name: 'app_delete / app_delete_many', kind: 'rpc', summary: 'Delete by id / id arrays' },
      { name: 'app_describe_resource', kind: 'rpc', summary: 'Safe field specs for FE (no physical table names)' },
      { name: 'profiles / accounts / notifications', kind: 'resource', summary: 'Prod registry resources (owner scope)' },
      { name: 'demo_items / fixtures', kind: 'resource', summary: 'Test-only resources after back_end:reset' },
    ],
  },
  {
    id: 'user-system',
    title: 'User system',
    summary:
      'Auth + profiles + dual signup + hybrid RBAC + membership + person relations. Membership-aware work uses DEFINER RPCs, not generic CRUD.',
    memoir: 'user-system.md',
    themeLab: '/theme?section=user-management',
    feLibs: ['lib/authApi', 'lib/userApi', 'lib/cvApi', 'lib/orgOnboardingApi', 'lib/assessmentApi', 'lib/liveTranscribeApi'],
    hotWire:
      'Auth via authApi; own profile via dataApi profiles; org/membership/roles/relations via userApi RPCs; CV Path A via cvApi; agency checklist via orgOnboardingApi; interview briefs/attempts via assessmentApi.',
    offerings: [
      { name: 'auth.signUp / signIn / session', kind: 'client', summary: 'GoTrue client (authApi) — not SQL CRUD' },
      { name: 'profiles', kind: 'resource', summary: '1:1 with auth.users; owner pipeline CRUD (privileged fields locked)' },
      { name: 'accounts', kind: 'resource', summary: 'Personal/org workspaces; owned rows via pipeline' },
      { name: 'app_profile_ensure', kind: 'rpc', summary: 'Repair missing profile after signup glitch' },
      { name: 'app_accounts_list_mine / app_account_get', kind: 'rpc', summary: 'List/get accounts including memberships' },
      { name: 'app_account_create_organisation', kind: 'rpc', summary: 'Create org workspace' },
      { name: 'Members RPCs', kind: 'rpc', summary: 'add / invite / accept / remove / set_role' },
      { name: 'Roles RPCs', kind: 'rpc', summary: 'create / update / delete account roles; assign / revoke' },
      { name: 'app_permissions_mine', kind: 'rpc', summary: 'Effective permissions for current user' },
      { name: 'Relations RPCs', kind: 'rpc', summary: 'request / accept / reject / list person↔person' },
      { name: 'Admin RPCs', kind: 'rpc', summary: 'ban, list users, transfer ownership, delete account' },
      { name: 'account_members / roles / user_roles', kind: 'table', summary: 'RPC-only (deny-all RLS) — not in CRUD registry' },
      { name: 'org_onboarding_requirements / submissions', kind: 'table', summary: 'Org legitimacy checklist catalog + answers (RPC-only)' },
      { name: 'app_org_onboarding_list / submit / get_status', kind: 'rpc', summary: 'Org checklist read/write + readiness snapshot' },
      { name: 'app_profile_cv_intake_*', kind: 'rpc', summary: 'Personal CV intake begin/status/complete' },
      { name: 'app_profile_cv_get / update / section_*', kind: 'rpc', summary: 'Editable CV document (profile-like)' },
      { name: 'app_profile_cv_get_for / list_discoverable', kind: 'rpc', summary: 'Employer talent-pool read of discoverable CVs' },
      { name: 'cv-extract', kind: 'edge', summary: 'Two-pass LangChain CvExtractV2; prefer FE text (Path A) over Edge PDF download' },
      { name: 'interview-brief-enrich', kind: 'edge', summary: 'Skeletal description → mechanics-aware markdown; stream_text compose / batch pipelines' },
      { name: 'interview-brief-edit', kind: 'edge', summary: 'Board peel edit + compose blank-slate Generate: plan → editors → persist; NDJSON footer tags' },
      { name: 'live-transcribe', kind: 'edge', summary: 'Mint ephemeral Realtime client secret for gpt-live-transcribe (browser WebRTC)' },
      { name: 'cvApi Path A', kind: 'client', summary: 'extractPdfText + extractCv({ text, fileNodeId }) — Edge skips download' },
      { name: 'interviewEnrichApi', kind: 'client', summary: 'enrichInterviewDescriptionStream — text_delta into compose description' },
      { name: 'interviewEditApi', kind: 'client', summary: 'runBoardEditPlan/Continue — compose blank-slate + Creator-2 peel chat' },
      { name: 'liveTranscribeApi', kind: 'client', summary: 'createLiveTranscribeSession + startLiveTranscription — mic → composer text' },
      { name: 'interview_briefs / attempts', kind: 'table', summary: 'LIVE assessment domain (RPC-only); invites LIVE' },
      { name: 'interview_brief_conversations', kind: 'table', summary: 'LIVE brief ↔ bot link (active unique per brief+purpose: create vs board)' },
      { name: 'app_interview_brief_* / attempt_*', kind: 'rpc', summary: 'Brief CRUD/publish/window + attempt start/complete' },
      { name: 'app_interview_invite_*', kind: 'rpc', summary: 'LIVE create/list/revoke/accept — mail enqueue + emit + expire cron (disabled)' },
      { name: 'app_interview_create_bot_*', kind: 'rpc', summary: 'LIVE open/get/close Flow authoring bot + briefSnapshot context' },
      { name: 'app_interview_board_bot_* / board_edit_cancel', kind: 'rpc', summary: 'LIVE board peel open/get/close + editRun cancel stamp' },
      { name: 'assessmentApi', kind: 'client', summary: 'FE wrappers incl. createBot* + boardBot* + boardEditCancel; Theme interview labs' },
      { name: 'assessment.* permissions', kind: 'catalog', summary: 'org_owner/admin write+manage; org_member read' },
    ],
  },
  {
    id: 'validation',
    title: 'Signup validation',
    summary:
      'Shared username/password/email/org rules for preflight before Auth signUp. Companion to user-system + platform services.',
    memoir: 'platform-services.md',
    themeLab: '/theme?section=platform-services',
    feLibs: ['lib/authValidation'],
    hotWire: 'validateSignupLocal → app_signup_validate → authApi.signUp* with username metadata.',
    offerings: [
      { name: 'app_signup_validate', kind: 'rpc', summary: 'Server preflight; returns issues[] envelope' },
      { name: 'app_normalize_username / app_validate_username', kind: 'helper', summary: 'Canonical handle rules' },
      { name: 'app_validate_password', kind: 'helper', summary: 'Password policy helper' },
      { name: 'authValidation policy', kind: 'client', summary: 'FE mirror of length/charset/reserved words' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    summary:
      'Type registry + in-app inbox + per-type prefs + Realtime-ready owner SELECT. Producers call app_emit; clients never insert rows.',
    memoir: 'platform-services.md',
    themeLab: '/theme?section=platform-services',
    feLibs: ['lib/notifyApi'],
    hotWire:
      'Seed notification_types → PERFORM app_emit(owner, type_key, data, idempotency_key, …) from DEFINER code.',
    offerings: [
      { name: 'notification_types', kind: 'catalog', summary: 'Seeded type_key, category, default_channels, priority' },
      { name: 'app_emit', kind: 'helper', summary: 'Internal: inbox + optional mail/digest from channels' },
      { name: 'app_emit_test', kind: 'rpc', summary: 'Self-emit for labs/tests' },
      { name: 'notifications resource', kind: 'resource', summary: 'Owner inbox CRUD for lifecycle fields only' },
      { name: 'app_notification_prefs_get / _set', kind: 'rpc', summary: 'Per-type in_app / email / digest overrides' },
      { name: 'app_notifications_mark_all_read', kind: 'rpc', summary: 'Bulk mark read' },
      { name: 'app_notifications_unread_count', kind: 'rpc', summary: 'Unread badge count' },
      { name: 'app_notifications_retention_purge', kind: 'helper', summary: 'Cron worker: hard-delete soft-deleted rows past retention_days' },
      { name: 'Welcome emit trigger', kind: 'helper', summary: 'account.welcome on profile insert (app_profile_welcome_emit)' },
      { name: 'Anti-spam / idempotency', kind: 'helper', summary: 'idempotency_key + type dedupe windows before insert/mail' },
      { name: 'Realtime publication', kind: 'table', summary: 'Owner SELECT policy so postgres_changes works (FE subscribe v2)' },
    ],
  },
  {
    id: 'mailing',
    title: 'Mailing',
    summary:
      'Queued app email with tag prefs (email ON by default). Auth templates go straight to Mailpit; app mail uses outbox + Edge dispatch.',
    memoir: 'platform-services.md',
    themeLab: '/theme?section=platform-services',
    feLibs: ['lib/notifyApi'],
    hotWire:
      'Seed mail_tags if needed → app_mail_enqueue(owner, to, subject, body, tag, …). Dispatch via mail-dispatch Edge Function.',
    offerings: [
      { name: 'mail_tags', kind: 'catalog', summary: 'Categories: invite, relation, digest, message, … (default email ON)' },
      { name: 'mail_tag_preferences', kind: 'table', summary: 'User ON/OFF per tag' },
      { name: 'app_mail_tag_prefs_get / _set', kind: 'rpc', summary: 'User-facing tag toggles' },
      { name: 'app_mail_enqueue', kind: 'helper', summary: 'Hot-wire enqueue; respects tag prefs + ban' },
      { name: 'mail_outbox', kind: 'table', summary: 'Pending / sent_local / failed queue (RPC list only)' },
      { name: 'app_mail_outbox_list_mine', kind: 'rpc', summary: 'Inspect own outbox' },
      { name: 'app_mail_flush_mine', kind: 'rpc', summary: 'Mark sent_local (no SMTP)' },
      { name: 'app_mail_mark_failed_mine', kind: 'rpc', summary: 'Record dispatch failure' },
      { name: 'mail-dispatch', kind: 'edge', summary: 'Deliver pending rows to Mailpit HTTP API' },
      { name: 'contact-send', kind: 'edge', summary: 'Home contact form → Resend fixture (Contact@)' },
      { name: 'Auth email templates', kind: 'client', summary: 'GoTrue → Mailpit (confirmation, recovery, invite HTML)' },
      { name: 'Mail rate / ban gate', kind: 'helper', summary: 'Banned profiles skip enqueue; tag mute skips row' },
    ],
  },
  {
    id: 'digests',
    title: 'Digests',
    summary:
      'Batch low-priority notifications into mail via digest queue + cron worker. Preference-aware.',
    memoir: 'platform-services.md',
    themeLab: '/theme?section=platform-services',
    feLibs: ['lib/notifyApi', 'lib/cronApi'],
    hotWire:
      'Mark type digest_eligible + default digest channel → app_emit enqueues; enable notifications.digest_flush_due cron or run_now.',
    offerings: [
      { name: 'digest_settings', kind: 'table', summary: 'Per-user cadence / quiet hours' },
      { name: 'app_digest_settings_get / _set', kind: 'rpc', summary: 'User digest preferences' },
      { name: 'digest_queue', kind: 'table', summary: 'Staging rows from app_emit' },
      { name: 'app_digest_preview_mine', kind: 'rpc', summary: 'Preview pending digest items' },
      { name: 'app_digest_flush_mine', kind: 'rpc', summary: 'Flush mine → mail_outbox (tag digest)' },
      { name: 'app_digest_flush_due', kind: 'helper', summary: 'Worker for cron run_now / schedule' },
    ],
  },
  {
    id: 'invites',
    title: 'Invite tokens',
    summary:
      'Hashed org invite tokens + mail/notification side effects. Thin path for existing users stays on members.invite.',
    memoir: 'platform-services.md',
    themeLab: '/theme?section=platform-services',
    feLibs: ['lib/notifyApi', 'lib/userApi'],
    hotWire:
      'app_account_invite_create(account, email) → token once; accept with app_account_invite_accept_by_token.',
    offerings: [
      { name: 'account_invites', kind: 'table', summary: 'token_hash, expiry, status — never pipeline-writable' },
      { name: 'app_account_invite_create', kind: 'rpc', summary: 'Create + emit/mail (invite tag)' },
      { name: 'app_account_invite_list / _revoke', kind: 'rpc', summary: 'Manage pending invites' },
      { name: 'app_account_invite_accept_by_token', kind: 'rpc', summary: 'Accept → membership + role' },
      { name: 'app_account_members_invite', kind: 'rpc', summary: 'Existing-user thin invite + notification' },
      { name: 'Invite resend cooldown', kind: 'helper', summary: 'Anti-spam: 15m before another invite to same email' },
    ],
  },
  {
    id: 'cron',
    title: 'Cron service',
    summary:
      'Standalone job registry + run history. Features register disabled jobs; enable after checks. No raw cron.schedule in feature migrations.',
    memoir: 'cron-service.md',
    themeLab: '/theme?section=platform-services',
    feLibs: ['lib/cronApi'],
    hotWire:
      'Implement worker RPC/helper → app_cron_register_internal(job_key, expr, SELECT …, disabled) → admin enable / run_now in Theme.',
    offerings: [
      { name: 'app_cron_jobs', kind: 'catalog', summary: 'job_key, cron_expr, worker_sql, enabled, feature' },
      { name: 'app_cron_runs', kind: 'table', summary: 'Execution history' },
      { name: 'app_cron_list / app_cron_runs_list', kind: 'rpc', summary: 'Inspect jobs and runs' },
      { name: 'app_cron_register / _unregister', kind: 'rpc', summary: 'Admin register (disabled by default)' },
      { name: 'app_cron_set_enabled / _set_schedule', kind: 'rpc', summary: 'Toggle and reschedule' },
      { name: 'app_cron_run_now', kind: 'rpc', summary: 'Manual local/hosted run' },
      { name: 'app_cron_register_internal', kind: 'helper', summary: 'Migration seed path for feature jobs' },
      { name: 'Seeded digest / retention jobs', kind: 'catalog', summary: 'notifications.digest_flush_due, retention_purge (disabled)' },
    ],
  },
  {
    id: 'file-management',
    title: 'File management',
    summary:
      'Account libraries: folders, Storage binaries, jsonb documents, visibility/shares/links, quotas, lifecycle cron, live FileExplorer adapter.',
    memoir: 'file-management.md',
    themeLab: '/theme?section=file-management',
    feLibs: ['lib/fileApi', 'lib/fileExplorer'],
    hotWire:
      'Seed doc_kinds if needed → DEFINER app_files_* RPCs (not registry) → fileApi + FileExplorer source=live; emit/mail via files tag.',
    offerings: [
      { name: 'files_nodes / files_documents', kind: 'table', summary: 'Tree + jsonb docs (DEFINER-only; deny-all RLS)' },
      { name: 'files_shares / files_link_tokens', kind: 'table', summary: 'Explicit ACL + link tokens' },
      { name: 'files_doc_kinds', kind: 'catalog', summary: 'json/doc/markdown/code/draw/plot/force/flow/grid/result/cv' },
      { name: 'app_files_list / mkdir / move / copy / delete', kind: 'rpc', summary: 'Tree CRUD + soft-delete/restore' },
      { name: 'app_files_upload_init / complete / download_url', kind: 'rpc', summary: 'Signed Storage binary path' },
      { name: 'app_files_document_*', kind: 'rpc', summary: 'Create/update/get jsonb document bodies' },
      { name: 'app_files_share_* / link_* / set_visibility', kind: 'rpc', summary: 'ACL + private/link/public_world' },
      { name: 'app_files_search', kind: 'rpc', summary: 'Name + FTS over document bodies (ACL-filtered)' },
      { name: 'app_files_usage_get', kind: 'rpc', summary: 'Quota bytes/nodes vs limits' },
      { name: 'files-sign / files-interpret', kind: 'edge', summary: 'Signed URLs + document transform stub' },
      { name: 'Cron files.* workers', kind: 'catalog', summary: 'retention, share sweep, orphan storage, account purge' },
      { name: 'FileExplorer live adapter', kind: 'client', summary: 'fileApi + liveSource; fixture docs-files unchanged' },
    ],
  },
  {
    id: 'chat-service',
    title: 'Chat service',
    summary:
      'DM / private group / org-as-group messaging, bot runs, chat-scoped action catalog, LangChain Edge stream, live DmChat/BotChat adapters.',
    memoir: 'chat-service.md',
    themeLab: '/theme?section=chat-messaging',
    feLibs: ['lib/chatApi', 'lib/chat'],
    hotWire:
      'Accepted contact → app_chat_direct_open / group / org ensure → chatApi + DmChat/BotChat source=live; bot replies via chat-bot-run (OPENAI_API_KEY).',
    offerings: [
      { name: 'chat_conversations / chat_members', kind: 'table', summary: 'Threads + inbox denorm (preview/unread/draft)' },
      { name: 'chat_messages / reactions / receipts', kind: 'table', summary: 'parts[] JSONB + seq keyset + hide/delete' },
      { name: 'chat_action_catalog / chat_actions', kind: 'catalog', summary: 'v1 bot/dm actions; pending approve/reject' },
      { name: 'chat_bot_profiles / chat_bot_runs', kind: 'table', summary: 'Model policy + run lineage' },
      {
        name: 'chat_bot_profile_actions',
        kind: 'catalog',
        summary: 'Per-profile allowlist; context/finalize/propose join; empty for cv_intake + assessment; interview_create has interview.create.*',
      },
      { name: 'app_chat_direct_open / conversations_list', kind: 'rpc', summary: 'Contact-gated DM + lean inbox' },
      { name: 'app_chat_send / messages_list / messages_since', kind: 'rpc', summary: 'Idempotent send + keyset + catch-up' },
      { name: 'app_chat_group_* / org_ensure', kind: 'rpc', summary: 'Private groups + account-backed org chat' },
      { name: 'app_chat_bot_*', kind: 'rpc', summary: 'Create + begin/finalize/fail/cancel; create_policy + allowlist tools' },
      {
        name: 'cv_intake / assessment / interview_create profiles',
        kind: 'catalog',
        summary: 'cv_intake_eligible + empty tools; assessment server_only + empty; interview_create server_only + seven interview.create.* tools',
      },
      { name: 'app_interview_create_bot_*', kind: 'rpc', summary: 'Authoring bot open/get/close; decide returns editorPatch for FlowEditor' },
      { name: 'chat-bot-run', kind: 'edge', summary: 'LangChain SSE; actions ∩ ctx.tools; missing_openai_key until secret set' },
      { name: 'Cron chat.* workers', kind: 'catalog', summary: 'Invite expiry + soft-delete retention (disabled)' },
      { name: 'Live DmChat / BotChat', kind: 'client', summary: 'source=live; fixture docs-* unchanged' },
      { name: 'Theme interviewer-plan', kind: 'client', summary: 'Assessment brief + bot hardening diagrams' },
      { name: 'Theme interview-create-bot', kind: 'client', summary: 'Memoir pointer /theme?section=interview-create-bot — create-bot spine' },
    ],
  },
  {
    id: 'assessment',
    title: 'Assessment / interviews',
    summary:
      'Org interview briefs, candidate attempts, invites, and interview_create authoring bot (brief ↔ bot link, approve→canvas patches).',
    memoir: 'assessment.md',
    themeLab: '/theme?section=interview-system',
    feLibs: [
      'lib/assessmentApi',
      'lib/interviewBrief',
      'lib/interviewEnrichApi',
      'lib/interviewEditApi',
      'lib/interviewRunApi',
    ],
    hotWire:
      'assessmentApi brief/attempt/invite/createBot/boardBot RPCs; InterviewCreator Generate → interview-brief-edit (blank-slate) + seed peel chat; Enrich → interview-brief-enrich; peel → interview-brief-edit; createBotOpen for Flow; boardBotOpen for Creator-2 peel; /interview Talk → interview-day-memory (plan) + interview-talk-turn; tool stages → interview-day-memory + interview-stage-assist (Assistant/Coach) or interview-copilot-edit (Copilot write propose + FE Apply); Creator + candidate coding Run → interview-code-run (Judge0; mount.runTests, cases.json off explorer); sitting probe → interview-session-probe; after_tool assessor bots → interview-tool-assess (form/writing/coding grains; human marker UI later).',
    offerings: [
      { name: 'interview_briefs / attempts / invites', kind: 'table', summary: 'LIVE domain (RPC-only)' },
      { name: 'interview_brief_conversations', kind: 'table', summary: 'LIVE authoring link — active unique per brief+purpose (create vs board)' },
      { name: 'app_interview_brief_* / attempt_* / invite_*', kind: 'rpc', summary: 'Brief lifecycle, attempts, invites' },
      { name: 'interview-brief-enrich', kind: 'edge', summary: 'Description enricher; batch for pipelines, stream_text for compose' },
      { name: 'interview-brief-edit', kind: 'edge', summary: 'Compose blank-slate Generate + board peel edits Creator-2 JSON' },
      {
        name: 'interview-talk-turn',
        kind: 'edge',
        summary: 'Candidate Talk compose + after_turn + topic_end; FE owns history; OPENAI_API_KEY',
      },
      {
        name: 'interview-day-memory',
        kind: 'edge',
        summary: 'Retrieval plan only (CV / day transcript / synth / phase); FE retrieveDayMemory executes',
      },
      {
        name: 'interview-stage-assist',
        kind: 'edge',
        summary: 'Candidate Form/Coding/Doc navigate assist; cite stage text; never spoilers; OPENAI_API_KEY',
      },
      {
        name: 'interview-copilot-edit',
        kind: 'edge',
        summary: 'Candidate Copilot peel: plan/dry-run hunks; FE Apply only; no brief persist; OPENAI_API_KEY',
      },
      {
        name: 'interview-code-run',
        kind: 'edge',
        summary: 'Judge0 CE (RapidAPI) hidden_cases_v1 runner — multi-lang harness + compare; JUDGE0_RAPIDAPI_KEY',
      },
      {
        name: 'interview-session-probe',
        kind: 'edge',
        summary: 'Candidate sitting IP / geo / HTTP RTT / VPN heuristic; FE stores samples',
      },
      {
        name: 'interview-tool-assess',
        kind: 'edge',
        summary: 'Assessor bots — form key / writing matrix / coding tests+method grains + AssessorBotPackage',
      },
      { name: 'interviewEnrichApi', kind: 'client', summary: 'Compose Enrich stream (stream_text only)' },
      { name: 'interviewEditApi', kind: 'client', summary: 'Compose blank-slate + board peel plan/continue stream' },
      {
        name: 'interviewRunApi',
        kind: 'client',
        summary: 'Candidate day FE SSOT + talk/assist Edge clients + tool mounts + hard timer',
      },
      { name: 'app_interview_create_bot_*', kind: 'rpc', summary: 'Open/get/close create bot; briefSnapshot in bot context' },
      { name: 'app_interview_board_bot_* / board_edit_cancel', kind: 'rpc', summary: 'Board peel open/get/close + editRun cancel' },
      { name: 'interview_create profile + allowlist', kind: 'catalog', summary: 'Seven interview.create.* catalog actions; server_only create' },
      { name: 'createBotPatches + FlowEditor.invokeAction', kind: 'client', summary: 'Pure graph mutations; editorActionId from decide envelope' },
      { name: 'InterviewCreator / InterviewCreateBotPanel / InterviewCreatorChat', kind: 'client', summary: 'Agency builder + peel chat; Theme interview labs' },
    ],
  },
  {
    id: 'local-stack',
    title: 'Local stack & tooling',
    summary:
      'Supabase local runbook, migration Audience split, resource templates, static checks, and opt-in live tests. Not a product RPC surface.',
    memoir: 'supabase-local.md',
    themeLab: '/theme?section=backend-systems',
    feLibs: ['front_end/.env (VITE_SUPABASE_*)'],
    hotWire:
      'User runs back_end:start / reset; agents write SQL + back_end:check / data-api:check only unless asked to start/reset/test.',
    offerings: [
      { name: 'npm run back_end:*', kind: 'client', summary: 'start / status / reset / stop / functions:serve' },
      { name: 'migrations vs migrations_test', kind: 'catalog', summary: 'Audience prod vs test fixtures' },
      { name: 'supabase/templates', kind: 'catalog', summary: 'New resource schema/RLS/registry starters' },
      { name: 'Auth HTML templates', kind: 'catalog', summary: 'supabase/templates confirmation/invite/recovery' },
      { name: 'npm run back_end:check', kind: 'client', summary: 'Static migration lint' },
      { name: 'npm run data-api:check', kind: 'client', summary: 'FE capabilities ↔ RPC parity' },
      { name: 'Opt-in live suites', kind: 'client', summary: 'back_end:test:data-platform | user-system | platform-services | files (+ :stress)' },
      { name: 'Mailpit / Inbucket', kind: 'client', summary: 'http://127.0.0.1:55544 · SMTP 54325' },
      { name: 'env-bridge', kind: 'client', summary: 'VITE_SUPABASE_URL + ANON_KEY from status' },
    ],
  },
] as const

export function getBackendSystem(id: string): BackendSystem | undefined {
  return BACKEND_SYSTEMS.find((s) => s.id === id)
}
