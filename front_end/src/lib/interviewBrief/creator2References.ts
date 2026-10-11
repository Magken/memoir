/**
 * Creator-2 section references — earlier-only RAG bind on the consuming phase.
 * Off = omit/null. UI and schema allow up to REFERENCES_MAX earlier phases.
 */
import type { Creator2References } from './creator2BriefTypes'
import { priorSpineSets } from './creator2SpineRules'
import { TALK_KIND_LABEL } from './interviewLandingView'

export const REFERENCES_MAX = 3

export function readReferencesPhaseIds(
  references: Creator2References | undefined,
): string[] {
  return (references?.phaseIds ?? []).map((id) => String(id ?? '').trim()).filter(Boolean)
}

export function readReferencesPhaseId(
  references: Creator2References | undefined,
): string | null {
  return readReferencesPhaseIds(references)[0] ?? null
}

export function writeReferences(
  phaseId: string | readonly string[] | null | undefined,
): Creator2References {
  const ids = (Array.isArray(phaseId) ? phaseId : [phaseId])
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter(Boolean)
    .slice(0, REFERENCES_MAX)
  const unique = [...new Set(ids)]
  return unique.length ? { phaseIds: unique } : null
}

/** Persist editor dropdown: earlier-only, omit when None. */
export function patchPhaseReferences(
  consumingPhaseId: string,
  nextPhaseId: string | readonly string[] | null | undefined,
  phases: readonly { id: string }[],
): Creator2References {
  return scrubReferencesToEarlier(
    writeReferences(nextPhaseId),
    priorSpineSets(phases, consumingPhaseId).phaseIds,
  )
}

/** Keep only earlier live ids; drop self/future/missing. Empty → null (omit). */
export function scrubReferencesToEarlier(
  references: Creator2References | undefined,
  earlierPhaseIds: ReadonlySet<string>,
): Creator2References {
  const ids = (references?.phaseIds ?? [])
    .map((id) => String(id ?? '').trim())
    .filter((id) => id && earlierPhaseIds.has(id))
    .slice(0, REFERENCES_MAX)
  const unique = [...new Set(ids)]
  return unique.length ? { phaseIds: unique } : null
}

export function referencesSelectOptions(
  earlier: ReadonlyArray<{ id: string; title: string; kind?: string }>,
): Array<{ value: string; label: string }> {
  return earlier.map((p) => ({
    value: p.id,
    label: formatReferenceOption(p),
  }))
}

export function formatReferenceOption(p: {
  id: string
  title: string
  kind?: string
}): string {
  const title = p.title.trim() || p.id
  const kind = kindLabel(p.kind)
  return kind ? `${kind} · ${title}` : title
}

function kindLabel(kind: string | undefined): string {
  const k = String(kind ?? '').trim().toLowerCase()
  if (k === 'talk' || k === 'discussion') return TALK_KIND_LABEL
  if (k === 'form') return 'Form'
  if (k === 'coding' || k === 'code') return 'Coding'
  if (k === 'doc' || k === 'writing') return 'Writing'
  return ''
}
