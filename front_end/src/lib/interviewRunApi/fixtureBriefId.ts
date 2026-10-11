/**
 * Demo / Try Vurify brief ids — local progress only; Edge may allow anon guest.
 * Keep in sync with Edge `_shared/interviewFixtureBrief.ts`.
 */
export const FIXTURE_INTERVIEW_BRIEF_ID = 'fixture:staff-security-engineer-80m'

/** Narrow-viewport Try Vurify — Talk-only (no coding / form / doc tools). */
export const FIXTURE_INTERVIEW_BRIEF_ID_MOBILE = 'fixture:mobile-try-talk'

/** Home Try kits — `tryInterviewBriefs.ts` (`fixture:try-talk` / `try-coding` / `try-full`). */

/** Same cutoff as home header menu / footer compact layout. */
export const INTERVIEW_FIXTURE_MOBILE_MQ = '(max-width: 48rem)'

export function isFixtureInterviewBriefId(briefId: string | null | undefined): boolean {
  const id = briefId?.trim() || ''
  if (!id) return true
  return (
    id === FIXTURE_INTERVIEW_BRIEF_ID ||
    id === FIXTURE_INTERVIEW_BRIEF_ID_MOBILE ||
    id.startsWith('fixture:')
  )
}

/** Snapshot once for a session so resize mid-attempt does not swap briefs. */
export function readInterviewFixtureIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(INTERVIEW_FIXTURE_MOBILE_MQ).matches
}
