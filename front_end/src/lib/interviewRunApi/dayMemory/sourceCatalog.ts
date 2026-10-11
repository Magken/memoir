/**
 * Planner-visible source catalog for interview-day-memory plan mode.
 */
import type { MemorySourceId } from './types'

export type MemorySourceCatalogEntry = {
  sourceId: MemorySourceId
  label: string
  description: string
}

/** Retrievable sources only — always-on packs are not listed for fetch. */
export const MEMORY_SOURCE_CATALOG: readonly MemorySourceCatalogEntry[] = [
  {
    sourceId: 'candidate_cv',
    label: 'Candidate CV',
    description:
      'Preferred/display name and compact CV profile note. Use for identity, name checks, org/role rapport — not for form navigation.',
  },
  {
    sourceId: 'day_transcript',
    label: 'Earlier interview transcript',
    description:
      'Cross-section assessor+candidate turns from earlier in this interview. Pass a query when recalling a topic the candidate mentioned before.',
  },
  {
    sourceId: 'topic_synthesis',
    label: 'Topic synthesises',
    description:
      'Filled topic_end synthesises from prior Talk topics. Use when they ask what was covered earlier at a summary level.',
  },
  {
    sourceId: 'phase_transcript',
    label: 'Named phase transcript',
    description:
      'Turns for a prior section (phaseId or title from sectionIds / previousSection). Prefer when they name or imply a specific earlier gate; better than dumping the whole interview.',
  },
  {
    sourceId: 'bot_notes',
    label: 'Standing assessor notes',
    description:
      'Durable prefs the assessor must keep: preferred name/how to address them, language, working style, explicit remember-this facts. Prefer when standingNotes is empty but identity/preference is needed. Do not use for one-off probe answers (those are transcripts).',
  },
  {
    sourceId: 'stage_artifact',
    label: 'Referenced stage work',
    description:
      'Candidate-visible digest of a referenced Form/Coding/Writing stage (answers/files/essay excerpt — never answer keys). Use when referencedStages names a tool stage.',
  },
  {
    sourceId: 'tool_run',
    label: 'Referenced coding run',
    description:
      'Pass/fail counts and failing case ids from a referenced coding stage (hidden expected values already redacted). Use when referencedStages includes a coding phase.',
  },
  {
    sourceId: 'tool_synthesis',
    label: 'Referenced tool summary',
    description:
      'Candidate-safe summary from a referenced tool assessor package. Use for a one-line recap of how that stage went — not hidden keys.',
  },
] as const

const BOUND_ONLY = new Set<MemorySourceId>([
  'stage_artifact',
  'tool_run',
  'tool_synthesis',
])

export function formatMemorySourceCatalogForPlan(referenced = false): string {
  return MEMORY_SOURCE_CATALOG.filter((e) => referenced || !BOUND_ONLY.has(e.sourceId))
    .map((e) => `- ${e.sourceId}: ${e.description}`)
    .join('\n')
}
