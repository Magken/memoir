import type { GlowTimelineScrollRange } from '../timeline/glowTimelineTypes'
import type { Creator2BriefDocument } from './creator2BriefTypes'
import { mapCreator2BriefToTimeline } from './mapCreator2BriefToTimeline'
import creator2ComprehensiveBrief from './fixtures/creator2ComprehensiveBrief.json'
import tieredDecisionSample from './fixtures/tieredDecisionSample.json'

/** Theme / Creator-2 scroll range — page-scrub the interview spine. */
export const INTERVIEW_FLOW_TIMELINE_SCROLL: GlowTimelineScrollRange = {
  start: 'top 70%',
  end: 'bottom 30%',
}

/**
 * Plan-shaped comprehensive interview_brief (canonical sample from interviewer-engine).
 * Source of truth for Creator 2 rendering — named Decision folders from live spine,
 * not six catalog keys. Form stays a hard gate unless chipped into a folder.
 */
export const CREATOR2_COMPREHENSIVE_BRIEF =
  creator2ComprehensiveBrief as unknown as Creator2BriefDocument

/** Timeline view model derived from {@link CREATOR2_COMPREHENSIVE_BRIEF}. */
export const INTERVIEW_FLOW_TIMELINE_SAMPLE = mapCreator2BriefToTimeline(
  CREATOR2_COMPREHENSIVE_BRIEF,
)

/**
 * Compact named-folder Decision sample: section chips + per-template weights.
 * Theme Creator lab stays on {@link CREATOR2_COMPREHENSIVE_BRIEF} (Form + Coding + Writing).
 */
export const TIERED_DECISION_SAMPLE_BRIEF =
  tieredDecisionSample as unknown as Creator2BriefDocument

/** Timeline view model derived from {@link TIERED_DECISION_SAMPLE_BRIEF}. */
export const TIERED_DECISION_SAMPLE_TIMELINE = mapCreator2BriefToTimeline(
  TIERED_DECISION_SAMPLE_BRIEF,
)
