import type { Creator2BriefDocument } from './creator2BriefTypes'
import mobileTryTalkDemo from './fixtures/mobileTryTalkDemo.json'
import staffSecurityEngineerFullInterview from './fixtures/staffSecurityEngineerFullInterview.json'
import { stampStructureCopilotAssist } from './toolAssistBundles'
import {
  FIXTURE_INTERVIEW_BRIEF_ID,
  FIXTURE_INTERVIEW_BRIEF_ID_MOBILE,
} from '../interviewRunApi/fixtureBriefId'
import {
  buildInterviewLandingView,
  type InterviewLandingExtras,
  type InterviewLandingView,
} from './interviewLandingView'

/**
 * Desktop / tablet Theme `/interview` (no `?briefId=`) demo body.
 * Source: exported Creator-2 brief (`staff-security-engineer-full-interview`).
 */
export const INTERVIEW_PAGE_BRIEF_FIXTURE = stampStructureCopilotAssist(
  JSON.parse(JSON.stringify(staffSecurityEngineerFullInterview)) as Creator2BriefDocument,
)

/**
 * Narrow-viewport Try Vurify — Talk only (opening · ownership · close).
 * Avoids coding / form / writing tools that need side peels.
 */
export const INTERVIEW_PAGE_BRIEF_FIXTURE_MOBILE =
  mobileTryTalkDemo as unknown as Creator2BriefDocument

/** Fixture-only owner / cover when the route has no live brief id. */
export const INTERVIEW_PAGE_LANDING_EXTRAS: InterviewLandingExtras = {
  ownerLabel: 'Vurify Demo',
  /** Demo cover when no `?briefId=` Drive thumbnail is loaded. */
  coverUrl: 'https://picsum.photos/seed/vurify-interview-security/840/560',
  hasInProgressAttempt: false,
}

export function interviewPageBriefFixture(isMobile: boolean): Creator2BriefDocument {
  return isMobile ? INTERVIEW_PAGE_BRIEF_FIXTURE_MOBILE : INTERVIEW_PAGE_BRIEF_FIXTURE
}

export function interviewPageFixtureBriefId(isMobile: boolean): string {
  return isMobile ? FIXTURE_INTERVIEW_BRIEF_ID_MOBILE : FIXTURE_INTERVIEW_BRIEF_ID
}

export function interviewPageLandingView(
  extras: InterviewLandingExtras = INTERVIEW_PAGE_LANDING_EXTRAS,
  options?: { brief?: Creator2BriefDocument },
): InterviewLandingView {
  const brief = options?.brief ?? INTERVIEW_PAGE_BRIEF_FIXTURE
  return buildInterviewLandingView(brief, {
    ...INTERVIEW_PAGE_LANDING_EXTRAS,
    ...extras,
  })
}
