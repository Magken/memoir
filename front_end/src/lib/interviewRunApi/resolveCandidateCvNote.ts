/**
 * Resolve candidate CV for Talk: live Drive body when signed in, else sample fixture.
 * Dynamic-import cvApi so Node Talk units do not load pdfjs at module init.
 */
import { buildCandidateCvNote, type CandidateCvNote } from './buildCandidateCvNote'

let cached: CandidateCvNote | null = null
let cachedBriefId: string | null = null

/**
 * Load once per brief attempt. Prefer live `cvGet`; fall back to Talk sample CV
 * so the harness interview is never CV-blind.
 */
export async function resolveCandidateCvNote(briefId: string): Promise<CandidateCvNote> {
  const key = briefId.trim() || 'default'
  if (cached && cachedBriefId === key) return cached

  try {
    const { cvGet } = await import('../cvApi')
    const { body } = await cvGet()
    const live = buildCandidateCvNote({
      cv: body as never,
      useSampleFallback: false,
    })
    if (live.hasCv && live.source === 'live') {
      cached = live
      cachedBriefId = key
      return live
    }
  } catch {
    /* not signed in / no CV / Node without pdfjs — sample */
  }

  const sample = buildCandidateCvNote({ useSampleFallback: true })
  cached = sample
  cachedBriefId = key
  return sample
}

/** Test / restart helper. */
export function clearCandidateCvNoteCache(): void {
  cached = null
  cachedBriefId = null
}
