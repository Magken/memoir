/**
 * Recruiter-facing report dialect — identity, identifier maps, prose scrub.
 * Hash-sync with front_end/src/lib/interviewRunApi/reportDialect.ts
 */

export const REVIEWER_IDENTITY = `You write a mark for a human reviewer who will open Results next to the transcript and the work. They do not have our JSON, template ids, question ids, test ids, phase ids, bucket ids, or telemetry field names. They do have the workspace. Naming a working file or function (src/solve.ts, twoSum) helps them open the right place. If they cannot understand a sentence without wire ids, the mark has failed.

PLEASE PLEASE PLEASE. This report is for a hiring manager, not a bot. Write complete sentences they can read aloud: capital letter, subject, finite verb, period. One sentence is fine. A clipped one-liner is not.

Claim in ordinary English. Put code and candidate quotes in evidence[] (a chip or a markdown quote). Then say what it means and what to check. Technical words are welcome (TypeError, int(), the program crashed, src/solve.ts, twoSum). Wire keys are not (runtime_error, q.email, t1, dwellRatio, iv.content.v1).

ASCII hyphen-minus, comma, or period. Never Unicode em dashes or en dashes. Straight quotes. Sentence case.

justification is recruiter-facing. It is not a place to dump ids.`

export const REPORT_HARD_BANS = `# !!!!!!!!!! MARKER COPY - HARD BANS (PLEASE PLEASE PLEASE) !!!!!!!!!!

PLEASE PLEASE PLEASE. We are begging. A hiring reviewer never sees our schema. Ids in the prose DESTROY this mark.

FORBIDDEN in boardSummary, boardSummaryDetail, justification, synthesisText, sitting-read intro / strengths / weaknesses / scoreWhy / body, dimension notes, assessorNotes, and chip readings:
- Unicode em dashes (U+2014) or en dashes (U+2013)
- "the board", "the day", "the sitting", "this sitting", "Soft Decision %" / "Soft Decision share" / "gate_only"
- leftover grains, authored spine, in-gate, internal_assist_help, external_dump
- Template ids (iv.*, mark.*, synth.*, custom.foo_bar), phase ids (ph.*), message ids, bucket ids (b1)
- Question ids (q.email), case ids (t1) as words. Name the email question or the first hidden test.
- Snake or camel field names: runtime_error, compile_error, dwellRatio, copy_route, ip_change, owned_decision
- [path:line] cite tags in the sentence. Coding leftover, axis notes, tape captions, and paste accounts MAY name working files and functions (src/solve.ts, twoSum) so a reviewer can pinpoint the work.
- Smash quotes with no gloss. Write what happened, then quote.
- Telegram labels and orders: "Revisit the form items they missed.", "Missed Work email.", "Cleared the keyed items.", "Usable product judgment.", "Named the incidents as hers."
- Sitting-read intro / strengths / weaknesses / scoreWhy, boardSummary, and dimension notes MUST be complete sentences (subject + finite verb + period). Prefer claim, then what it means (so / because / while).
- Summarise, do not enumerate. Never emit a list of parallel findings that differ only in their example ("weak on the first case, weak on the second case, weak on the third"). Read across everything and give the pattern once, in one sentence, naming what it means for the reader. Two findings a side is the maximum, and one is often right.

Ids, question ids, case ids, phase ids, and telemetry keys live ONLY in evidenceRefs[] / JSON keys / citeKeys. NEVER in the prose. Coding leftover MAY name working files and functions.

Good: The program crashed. twoSum in src/solve.ts only throws "not implemented".
Good: They pasted into src/solve.ts, then edited twoSum.
Bad: Coding run ended runtime_error with 0/2 cases. Failing cases: t1, t2.
Bad: run×1 · src/solve.ts

Good: They missed the contact email and the backend-ownership note, so the eligibility screen is not a clean pass. This screen does not change the overall score.
Bad: Form stays gate_only. Missed items: q.email, q.baseline.
Bad: Revisit the form items they missed.

Good: They did not discuss the drill.
> I cry
Bad: The candidate said 'mofongo' and 'I cry' with no other finding.

Each scored axis needs its own notes line naming why that score was chosen. A clipped one-liner for the whole template is not enough. A clipped one-liner for the whole section is worse. PLEASE. We are begging.`

const EM_DASH_RE = /[\u2014\u2013]/g

export const REPORT_PROSE_STALE_RE =
  /[\u2014\u2013]|\bthe (?:board|day|sitting)\b|\bthis sitting\b|\bgate_only\b|\bSoft Decision(?:\s*%|\s+share)?\b|\bdwellRatio\b|\bcopy_route\b|\bip_change\b|\bruntime_error\b|\bcompile_error\b|\bjudge_error\b|\bq\.[a-z0-9_]+\b|\bph\.[a-z0-9_]+\b|\biv\.[a-z0-9.]+\b|\bmark\.[a-z0-9.]+\.v\d+\b|\bsynth\.[a-z0-9.]+\.v\d+\b|\bowned_decision\b|\boutcome_metric\b|\binternal_assist_help\b|\bexternal_dump\b|\bauthored spine\b|\bin-gate\b|\bleftover grains\b/i

const STATUS_MAP: Record<string, string> = {
  ok: 'Finished',
  compile_error: 'Compile error',
  runtime_error: 'the program crashed',
  timeout: 'Timed out',
  judge_error: 'Runner error',
  unsupported_language: 'Unsupported language',
  invalid_request: 'Invalid request',
}

const VPN_REASON_MAP: Record<string, string> = {
  ip_change: 'the visible address changed',
  rtt_spike: 'round-trip time jumped',
  asn_change: 'network provider changed',
  ttl_change: 'route changed',
  hosting_asn: 'hosting ASN',
  cloud_org: 'cloud provider',
  webrtc_mismatch: 'WebRTC address mismatch',
  timezone_mismatch: 'timezone mismatch',
  gps_mismatch: 'GPS mismatch',
  proxy_flag: 'proxy signal',
  hosting_flag: 'hosting signal',
}

const COPY_ROUTE_MAP: Record<string, string> = {
  copy_route: 'copy shortcut',
  copy_blocked: 'copy blocked',
  cut_blocked: 'cut blocked',
}

const INCIDENT_KIND_MAP: Record<string, string> = {
  paste: 'Outside paste',
  paste_internal: 'In-app paste',
  apply: 'Bot edit',
  paste_route: 'Paste',
  leave: 'Tab-hide',
  reconnect: 'Reconnect',
  ip_change: 'Address changed',
  fullscreen_exit: 'Left fullscreen',
  cover_window_closed: 'Cover closed',
  cover_closed: 'Cover closed',
  devtools: 'Inspect',
  duplicate_tab: 'Duplicate tab',
  copy_blocked: 'Copy blocked',
  copy_route: 'Copy shortcut',
  shortcut: 'Shortcut',
  policy_overlay_stripped: 'Policy overlay',
  framed: 'Framed page',
  dictation: 'Dictation',
}

export function humanRunStatus(status: string, chip = false): string {
  const key = String(status ?? '').trim()
  if (key === 'runtime_error') return chip ? 'Runtime error' : 'the program crashed'
  return STATUS_MAP[key] || (key ? key.replace(/_/g, ' ') : 'not observed')
}

export function humanVpnReason(reason: string): string {
  const key = String(reason ?? '').trim()
  return VPN_REASON_MAP[key] || key.replace(/_/g, ' ')
}

export function humanCopyLabel(kind: string): string {
  const key = String(kind ?? '').trim()
  return COPY_ROUTE_MAP[key] || key.replace(/_/g, ' ')
}

export function humanIncidentKind(kind: string): string {
  const key = String(kind ?? '').trim()
  return INCIDENT_KIND_MAP[key] || humanCopyLabel(key)
}

export function humanCaseLabel(input: {
  id?: string
  name?: string
  hidden?: boolean
  index?: number
}): string {
  const name = String(input.name ?? '').trim()
  if (name && !/^t\d+$/i.test(name)) return name
  const n = (input.index ?? 0) + 1
  return input.hidden ? `hidden test ${n}` : `visible test ${n}`
}

export function stripReportProse(raw: unknown, max = 0): string {
  let text = String(raw ?? '')
    .replace(EM_DASH_RE, ' - ')
    .replace(/\bthe (?:board|day|sitting)\b/gi, 'the interview')
    .replace(/\bthis sitting\b/gi, 'this interview')
    .replace(/\bboard treats\b/gi, 'this is treated as')
    .replace(/\bgate_only\b/gi, 'a pass or fail screen')
    .replace(/\bSoft Decision(?:\s*%|\s+share)?\b/gi, 'the overall score')
    .replace(/\bruntime_error\b/gi, 'the program crashed')
    .replace(/\bcompile_error\b/gi, 'a compile error')
    .replace(/\bdwellRatio\b/g, 'on-stage share')
    .replace(/\bcopy_route\b/g, 'copy shortcut')
    .replace(/\bip_change\b/g, 'address changed')
    .replace(/\binternal_assist_help\b/g, 'Assist paste')
    .replace(/\bexternal_dump\b/g, 'paste from outside')
    .replace(/\bauthored spine\b/gi, 'the order they were given')
    .replace(/\bin-gate\b/gi, 'on this interview')
    .replace(/\bleftover grains\b/gi, 'leftover notes')
    .replace(/\s+/g, ' ')
    .trim()
  if (max > 0 && text.length > max) text = `${text.slice(0, max - 1).trim()}.`
  return text
}

export function reportProseLooksStale(text: string): boolean {
  return REPORT_PROSE_STALE_RE.test(String(text ?? ''))
}

const IMPERATIVE_OPEN =
  /^(Revisit|Check|Probe|See|Open|Review|Note|Remember)\b/i
const TELEGRAM_OPEN =
  /^(Missed|Failed|Cleared|Named|Stayed|Held|Wrapped|Passed|Finished|Usable|Not the)\b/
const BARE_PAST =
  /^(Cleared|Named|Stayed|Held|Wrapped|Passed|Finished|Opened|Owned|Missed|Failed)\b/

function peelReportSentence(text: string): string {
  return String(text ?? '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^\*\*[^*]+\*\*:\s*/, '')
    .replace(/^(Strength|Weakness):\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Telegram labels, orders, and subject-less clips a hiring manager cannot read aloud. */
export function reportProseLooksFragment(text: string): boolean {
  const sentence = peelReportSentence(text)
  if (!sentence) return true
  if (IMPERATIVE_OPEN.test(sentence)) return true
  if (TELEGRAM_OPEN.test(sentence)) return true
  if (!/[.!?]$/.test(sentence)) return true
  if (!/^[A-Z]/.test(sentence)) return true
  return false
}

/** Lift a glance or grain note into one complete reviewer sentence. */
export function toReviewerSentence(raw: string): string {
  let t = peelReportSentence(stripReportProse(raw))
  if (!t) return ''
  const m = t.match(/^(.+?[.!?])(?:\s|$)/)
  t = (m?.[1] ?? t).trim()
  if (t.length > 240) t = t.slice(0, 240).replace(/\s+\S*$/, '')
  t = t.replace(/^(Revisit|Check|Probe|Review)\s+/i, 'They still need to cover ')
  if (/^(See|Open)\s+/i.test(t)) t = t.replace(/^(See|Open)\s+/i, 'The reviewer should open ')
  if (BARE_PAST.test(t)) t = `They ${t.charAt(0).toLowerCase()}${t.slice(1)}`
  if (/^Usable\b/i.test(t)) t = `This leftover reads as ${t.charAt(0).toLowerCase()}${t.slice(1)}`
  if (/^Not the\b/i.test(t)) t = `This leftover is ${t.charAt(0).toLowerCase()}${t.slice(1)}`
  if (/^No plan\b/i.test(t)) t = `They had ${t.charAt(0).toLowerCase()}${t.slice(1)}`
  if (!/^[A-Z]/.test(t)) t = t.charAt(0).toUpperCase() + t.slice(1)
  if (!/[.!?]$/.test(t)) t += '.'
  return t
}

export type ReviewerAtlasTemplate = {
  id: string
  title: string
  axes?: Array<{ key: string; label: string }>
}

export type ReviewerAtlas = {
  sectionTitle?: string
  templates?: ReviewerAtlasTemplate[]
  questions?: Array<{ name: string; citeKey: string }>
  tests?: Array<{ name: string; citeKey: string; hidden?: boolean }>
  run?: { whatHappened: string; passedCount?: number; total?: number; failedTestNames?: string[] }
}

export function formatReviewerAtlas(atlas: ReviewerAtlas): string {
  return `# Reviewer atlas (speak these names. Do not print cite keys.)
${JSON.stringify(atlas, null, 2)}`
}

export function formatCiteKeys(keys: Record<string, unknown>): string {
  return `# Cite keys (evidenceRefs only. NEVER in prose.)
${JSON.stringify(keys, null, 2)}`
}

export function runForReviewer(run: {
  status?: string
  passedCount?: number
  total?: number
  cases?: Array<{ id?: string; name?: string; passed?: boolean; hidden?: boolean }>
} | null | undefined): {
  whatHappened: string
  passedCount: number
  total: number
  failedTestNames: string[]
} {
  if (!run) {
    return { whatHappened: 'No run observed', passedCount: 0, total: 0, failedTestNames: [] }
  }
  const cases = Array.isArray(run.cases) ? run.cases : []
  const failed = cases
    .map((c, index) => ({ ...c, index }))
    .filter((c) => c.passed === false)
  return {
    whatHappened: humanRunStatus(String(run.status ?? '')),
    passedCount: Number(run.passedCount ?? 0),
    total: Number(run.total ?? cases.length),
    failedTestNames: failed.map((c) => humanCaseLabel(c)),
  }
}

export const CHIP_SLANG = new Set([
  'none',
  'spread',
  'even',
  'even enough',
  'uneven',
  'uneven gaps',
  'split by stage',
  'long gaps',
  'thin stages',
  'in order',
  'ordered',
  'aligned',
  'leftover without dwell',
  'dwell without leftover',
  'time tracks leftover',
  'burst-pause',
  'same channel',
  'open stages',
  'split',
  'scattered',
  'bursts',
  'mix differs',
  'same mix',
  'spoken-heavy',
  'typed-heavy',
  'thin',
  'open',
  'stall',
])

export function chipReadingOk(reading: string): boolean {
  const t = String(reading ?? '').trim()
  if (!t) return false
  if (t.length > 40) return false
  if (CHIP_SLANG.has(t.toLowerCase())) return false
  if (/^\d+(\.\d+)?x\s+tail$/i.test(t)) return false
  if (reportProseLooksStale(t)) return false
  return true
}

export function presentReviewerAtlas(input: {
  reviewer?: ReviewerAtlas
  citeKeys?: Record<string, unknown>
}): string {
  return `${formatReviewerAtlas(input.reviewer ?? {})}\n${formatCiteKeys(input.citeKeys ?? {})}`
}

export function skipCopyForTemplate(templateId: string): string {
  const id = String(templateId ?? '')
  if (id === 'mark.code.method.v1') return 'The approach mark could not run.'
  if (id === 'mark.code.structure.v1') return 'The structure mark could not run.'
  if (id === 'mark.doc.essay.v1') return 'The essay mark could not run.'
  if (id === 'mark.form.reasoning.v1') return 'The form notes mark could not run.'
  if (id === 'mark.assist.use.v1') return 'The Assist mark could not run.'
  if (id === 'synth.tool.v1') return 'The stage synthesis could not run.'
  return 'This mark could not run.'
}
