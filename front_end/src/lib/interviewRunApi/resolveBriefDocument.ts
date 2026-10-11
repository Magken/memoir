import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { peekInterviewBriefDocument } from '../interviewBrief/interviewLandingPrefetch'
import {
  INTERVIEW_PAGE_BRIEF_FIXTURE,
  INTERVIEW_PAGE_BRIEF_FIXTURE_MOBILE,
} from '../interviewBrief/interviewPageFixture'
import {
  FIXTURE_INTERVIEW_BRIEF_ID,
  FIXTURE_INTERVIEW_BRIEF_ID_MOBILE,
} from './fixtureBriefId'

/**
 * Resolve Creator-2 body for local Talk / tool mounts.
 * Live `?briefId=` uses the prefetch cache from `briefGet` — never the page sample.
 * Fixture only when the route has no brief id (Theme / `/interview` demo).
 */
export function resolveBriefDocument(input: {
  briefId: string
  brief?: Creator2BriefDocument | null
}): Creator2BriefDocument | null {
  if (input.brief) return input.brief
  const id = input.briefId.trim()
  if (!id || id === FIXTURE_INTERVIEW_BRIEF_ID) return INTERVIEW_PAGE_BRIEF_FIXTURE
  if (id === FIXTURE_INTERVIEW_BRIEF_ID_MOBILE) return INTERVIEW_PAGE_BRIEF_FIXTURE_MOBILE
  return peekInterviewBriefDocument(id)
}
