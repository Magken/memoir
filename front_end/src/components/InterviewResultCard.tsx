import { useCallback, useEffect, useMemo, useState, forwardRef, type RefObject } from 'react'
import {
  InterviewFlowTimeline,
  type InterviewFlowTimelineHandle,
  type ResultStageChrome,
} from './InterviewFlowTimeline'
import type { Creator2BriefDocument } from '../lib/interviewBrief/creator2BriefTypes'
import {
  CREATOR2_COMPREHENSIVE_BRIEF,
  INTERVIEW_FLOW_TIMELINE_SCROLL,
} from '../lib/interviewBrief/flowTimelineFixture'
import { mapCreator2BriefToTimeline } from '../lib/interviewBrief/mapCreator2BriefToTimeline'
import {
  buildResultOverview,
  SAMPLE_OUTPUT_CARDS,
} from '../lib/interviewRunApi/fixtures/output-cards/outputCardFixture'
import {
  loadAttemptResponseFixture,
  TALK_VERIFY_ATTEMPT_FIXTURE_ID,
} from '../lib/interviewRunApi/fixtures/attempt-responses/loadAttemptResponseFixture'
import { buildLiveOutputCard } from '../lib/interviewRunApi/liveOutputCard'
import {
  buildResultReviewPack,
  liveResultReviewAttempt,
  type ResultReviewPack,
} from '../lib/interviewRunApi/resultSectionReview'
import { subscribeMarkJobs } from '../lib/interviewRunApi/markJobs'
import {
  buildAssessorAidReport,
  type AssessorAidReport,
} from '../lib/interviewRunApi/buildAssessorAidReport'
import { InterviewResultBoundary } from './InterviewResultBoundary'

type InterviewResultCardProps = {
  /** Live attempt — when set, Overview / Conversation / Work read this interview. */
  briefId?: string | null
  brief?: Creator2BriefDocument | null
  /** When set, glow waits until epoch > 0 (parent bumps after Verify cover settle). */
  layoutEpoch?: number
  /** Overlay / page scroll host — same as Creator-2 `scrollRootRef`. */
  scrollerRef?: RefObject<HTMLElement | null>
  /** Lets the overlay header host Work / Conversation beside its own Back. */
  onStageChrome?: (chrome: ResultStageChrome | null) => void
  /** Hands Assessor Aid the card being read, so it can answer questions about it. */
  onReport?: (report: AssessorAidReport | null) => void
  onAskHome?: (attach: import('../lib/interviewRunApi/aidPeelAttach').AidPeelAttach) => void
  onAskAboutCard?: (
    card: import('../lib/interviewRunApi/talkVerifyModal').TalkVerifyMarkingCard,
    home?: { sectionId: string; stage: 'chat' | 'editor' },
  ) => void
  highlightMessageId?: string | null
  className?: string
  debug?: boolean
}

/**
 * Participant result review — same Creator-2 timeline spine as the interview
 * editor. Mounts in the Verify overlay body (no Theme-lab deck chrome).
 * Ref is the timeline handle so overlay Back can collapse an edit stage first.
 */
export const InterviewResultCard = forwardRef<
  InterviewFlowTimelineHandle,
  InterviewResultCardProps
>(function InterviewResultCard(
  {
    briefId = null,
    brief = null,
    layoutEpoch,
    scrollerRef,
    onStageChrome,
    onReport,
    onAskHome,
    onAskAboutCard,
    highlightMessageId = null,
    className = '',
    debug = false,
  },
  ref,
) {
  const doc = useMemo(
    () => (brief ? brief : structuredClone(CREATOR2_COMPREHENSIVE_BRIEF)) as Creator2BriefDocument,
    [brief],
  )
  const timeline = useMemo(() => mapCreator2BriefToTimeline(doc), [doc])
  const [markRev, setMarkRev] = useState(0)
  useEffect(() => subscribeMarkJobs(() => setMarkRev((n) => n + 1)), [])

  const livePack = useMemo(() => {
    if (!briefId) return null
    return buildLiveOutputCard({ briefId, brief: doc })
  }, [briefId, doc, markRev])
  const overview = useMemo(() => {
    if (livePack) return livePack.overview
    const card = SAMPLE_OUTPUT_CARDS[0]
    return card ? buildResultOverview(card) : undefined
  }, [livePack])
  const [reviewPack, setReviewPack] = useState<ResultReviewPack | null>(null)

  useEffect(() => {
    if (!overview) return
    let cancel = false
    if (briefId) {
      setReviewPack(
        buildResultReviewPack({
          overview,
          steps: timeline.steps,
          brief: doc,
          attempt: liveResultReviewAttempt({
            briefId,
            brief: doc,
            scored: livePack?.scored,
          }),
        }),
      )
      return () => {
        cancel = true
      }
    }
    setReviewPack(
      buildResultReviewPack({
        overview,
        steps: timeline.steps,
        brief: doc,
      }),
    )
    void loadAttemptResponseFixture()
      .then((attempt) => {
        if (cancel) return
        setReviewPack(
          buildResultReviewPack({
            overview,
            steps: timeline.steps,
            brief: doc,
            attempt: {
              fixtureId: TALK_VERIFY_ATTEMPT_FIXTURE_ID,
              response: attempt.response,
              scored: attempt.scored,
              talkSectionsMeta: attempt.talkSectionsMeta,
              editorTapes: attempt.editorTapes,
            },
          }),
        )
      })
      .catch(() => {
        /* Sitting radars still work without the attempt dump. */
      })
    return () => {
      cancel = true
    }
  }, [timeline.steps, doc, overview, briefId, markRev, livePack])

  // Which stage the reader has expanded, so Assessor Aid can resolve "this section".
  const [stage, setStage] = useState<ResultStageChrome | null>(null)
  const handleStageChrome = useCallback(
    (chrome: ResultStageChrome | null) => {
      setStage(chrome)
      onStageChrome?.(chrome)
    },
    [onStageChrome],
  )

  const report = useMemo(() => {
    if (!overview) return null
    const section = stage ? reviewPack?.sections[stage.stepId] : null
    return buildAssessorAidReport({
      overview,
      review: reviewPack,
      locus: stage
        ? {
            view: 'section',
            sectionId: stage.stepId,
            sectionTitle: section?.title ?? stage.stepId,
            stage: stage.mode,
          }
        : { view: 'overview' },
    })
  }, [overview, reviewPack, stage])

  useEffect(() => {
    onReport?.(report)
  }, [report, onReport])

  if (debug) {
    console.debug('[InterviewResultCard]', {
      title: timeline.title,
      steps: timeline.steps.length,
      overviewSections: overview?.sittingSections.length ?? 0,
      reviewSections: reviewPack ? Object.keys(reviewPack.sections).length : 0,
      layoutEpoch,
    })
  }

  return (
    <div
      className={[
        'theme-interview-creator__creator2',
        'theme-interview-result-card',
        'min-w-0 w-full max-w-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <InterviewResultBoundary surface="This report" detail={livePack?.scored ?? null}>
        <InterviewFlowTimeline
          ref={ref}
          brief={timeline}
          scroll={INTERVIEW_FLOW_TIMELINE_SCROLL}
          scrollerRef={scrollerRef}
          layoutEpoch={layoutEpoch}
          overview={overview}
          reviewPack={reviewPack}
          onStageChrome={handleStageChrome}
          onAskHome={onAskHome}
          onAskAboutCard={onAskAboutCard}
          highlightMessageId={highlightMessageId}
        />
      </InterviewResultBoundary>
    </div>
  )
})
