import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { flushSync } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, Download } from 'lucide-react'
import {
  InterviewFinishedScene,
  InterviewFinishedVerifyPanel,
} from '../components/InterviewFinishedScene'
import { ScaleCoverModal } from '../components/ScaleCoverModal'
import { DashboardChatPeelResize } from '../components/DashboardChatPeelResize'
import { InterviewGateScene } from '../components/InterviewGateScene'
import type { InterviewFlowTimelineHandle } from '../components/InterviewFlowTimeline'
import type { GateLiveCompositionEvent, GateLiveEditorHandle } from '../components/InterviewGateToolLive'
import { InterviewHardTimer } from '../components/InterviewHardTimer'
import { InterviewReferencedWorkModal } from '../components/InterviewReferencedWorkModal'
import {
  InterviewLanding,
  INTERVIEW_INTAKE_STEPS,
  type InterviewIntakeStep,
  type InterviewLandingVerifySection,
} from '../components/InterviewLanding'
import { StepLoader } from '../components/StepLoader'
import {
  InterviewTalkChatSpace,
  type AssessorAidRuntimeView,
  type AssistRuntimeView,
} from '../components/InterviewTalkChatSpace'
import { runCopilotEditContinue, runCopilotEditPlan, runCopilotEditRepair } from '../lib/interviewRunApi/copilotEditEdgeClient'
import { buildCopilotLiveDoc, diagnosticsFromCodeRun } from '../lib/interviewRunApi/buildCopilotLiveDoc'
import { keepCopilotQuestionnaireSheet, mapCopilotReplyParts } from '../lib/interviewRunApi/mapCopilotReplyParts'
import { hardTimerRemainingMs } from '../lib/interviewRunApi/hardTimerMath'
import {
  capEditMemory,
  memoryEntryFromOps,
  type CopilotEditMemoryEntry,
} from '../lib/interviewRunApi/copilotEditMemory'
import type { CopilotOp } from '../lib/interviewRunApi/copilotApply'
import type { InterviewEditMessagePart } from '../lib/interviewEditApi'
import { Modal } from '../components/Modal'
import { ThemeScroll } from '../components/ThemeScroll'
import { VurifyMenuButton } from '../components/VurifyMenuButton'
import { useAppStage } from '../lib/appStage/appStageContext'
import { DataApiError, toUserMessage } from '../lib/dataApi'
import { downloadJson } from '../lib/editorContext/download'
import { GsapPageProvider, gsap, revealSectionOut } from '../lib/gsap'
import { readThemeScrollTop, writeThemeScrollTop } from '../lib/scroll/themeScrollLenis'
import {
  consumeInterviewLandingPrefetch,
  isCoverUrlWarmed,
  peekInterviewBriefDocument,
  peekInterviewLandingPrefetch,
  peekLastPrefetchedBriefId,
  prefetchInterviewLanding,
  type Creator2BriefDocument,
  type InterviewLandingView,
  foldersForTemplate,
  isPackedCodingPath,
} from '../lib/interviewBrief'
import {
  checkSuiteBlocksTake,
  collectCheckSuite,
} from '../../../back_end/supabase/functions/interview-brief-edit/checkSuite.ts'
import { resolveCodingLanguageForFile } from '../lib/interviewBrief/codingLanguages'
import {
  interviewPageBriefFixture,
  interviewPageFixtureBriefId,
  interviewPageLandingView,
} from '../lib/interviewBrief/interviewPageFixture'
import {
  peekPendingTryInterviewKit,
  resolveTryInterviewKit,
  tryInterviewBriefForKit,
  tryInterviewBriefIdForKit,
} from '../lib/tryInterview/tryInterviewBriefs'
import { tryInterviewLandingView } from '../lib/tryInterview/tryInterviewScenarios'
import {
  readInterviewFixtureIsMobile,
  appendResponseMessage,
  ensureInterviewResponse,
  inferAssistSituation,
  previousGateTitle,
  buildAssistDayContinuity,
  runAssistMemoryCompose,
  retrieveCopilotDayMemory,
  runAssistSectionOpen,
  buildAssistSectionContract,
  resolveGateToolMount,
  referencedPhaseIdsFromBrief,
  runHydrateLanding,
  runLeaveToLanding,
  runOpenAttempt,
  enqueueSectionMarks,
  runCompleteSection,
  runPassGate,
  runRestartAttempt,
  runStartTalk,
  runTalkDraft,
  runTalkMenu,
  runTalkTurn,
  buildAssistTimerPack,
  sanitizeCodingLiveComposition,
  sanitizeDocLiveComposition,
  sanitizeFormLiveComposition,
  persistAssistAssistantMessage,
  persistAssistCandidateMessage,
  persistCopilotEditOutcome,
  peelRuntimeFromPersisted,
  shouldAcceptTalkSend,
  stabilizeTalkViewIds,
  assistHistoryForCopilot,
  copilotApplyMissReason,
  logSittingInjectMiss,
  sittingInjectPeelMiss,
  logSittingTurnDebug,
  enqueueAssistTurnMark,
  type AssistLiveComposition,
  type InterviewGateView,
  type InterviewRunMode,
  type LastVisibleCodeRun,
  type LiveToolArtifact,
  type TalkRuntimeView,
  type TalkVerifyMarkingCard,
  type TalkVerifyModal,
  buildTalkVerifyModal,
  buildCodingVerifyModal,
  buildEssayVerifyModal,
  buildFormVerifyModal,
  isTalkVerifySectionKey,
  isResultReviewSectionKey,
  resolveToolVerifyKind,
  talkVerifyBriefSections,
  buildAssessorAidContext,
  inferAssessorAidSituation,
  formatAidPackDiag,
  attachFromMarkCard,
  mergeAidTrailRefs,
  aidErrorCodeFromCatch,
  composeAssessorAid,
  runAssessorAidOpen,
  waitForAidReport,
  peelForAidCompose,
  aidUtteranceIsTranscriptEcho,
  setPendingReviewJump,
  sectionIdForCitedUtterance,
  saveAssessorAidConversation,
  loadAssessorAidConversation,
  clearAssessorAidConversation,
  aidConversationNeedsOpen,
  getInterviewResponse,
  scoreAttempt,
  talkSectionsMetaFromBrief,
  Capture,
  flushAndPersistCapture,
  tapesPackFromStore,
  type AssessorAidModalLike,
  type AssessorAidReport,
  type AidPeelAttach,
  type AidOpenRef,
  type CodingVerifyModal,
  type EssayVerifyModal,
  type FormVerifyModal,
  type TalkMenuAction,
} from '../lib/interviewRunApi'
import {
  flushSessionTelemetry,
  pauseSessionTelemetry,
  peekTelemetrySession,
  resumeSessionTelemetry,
  startSessionTelemetry,
} from '../lib/interviewRunApi/sessionTelemetry'
import { startSessionProbeHeartbeat } from '../lib/interviewRunApi/sessionProbe'
import {
  SittingPolicyOverlay,
  registerSittingPolicyLeaveHandler,
  setSittingPolicyPhase,
  startSittingPolicy,
  stopSittingPolicy,
  subscribeSittingPolicy,
} from '../lib/interviewRunApi/sittingPolicy'
import { stampChatSendAt } from '../lib/interviewRunApi/chatSendAt'
import { nowIso } from '../lib/chat/utils'
import { isRepeatOfLastCandidate } from '../lib/chat/errorBubble'
import { ThemeProvider } from '../lib/theme'
import { VURIFY_REF_PATHS } from '../lib/vurifyRef/paths'

const INTERVIEW_PATH = VURIFY_REF_PATHS.interview
const TRY_INTERVIEW_PATH = VURIFY_REF_PATHS.tryInterview
/** Same beat as SceneStackMenu mode-layer (nav ↔ login). */
const INTERVIEW_SWAP_MS = 520

/**
 * Budget an untimed sitting hands the Copilot Edge. It caps the turn there
 * (`min(PIPELINE_BUDGET_MS.total, remainingMs - 3s)`), so this must stay at or above the
 * Edge total or the Edge constant does nothing. A hard-deadline stage still wins.
 */
const UNTIMED_COPILOT_BUDGET_MS = 155_000

/**
 * Times a refused proposal may go back to the Edge before the candidate is told to retype.
 * A miss that survives three writings is not one more prompt away from landing.
 */
const COPILOT_REPAIR_ROUNDS = 2

type InterviewPageProps = {
  /**
   * Home Try / public demo at `/try-interview` — fixture only; chrome Back → home.
   * Live Test stays on `/interview` (dashboard `?briefId=`).
   */
  tryDemo?: boolean
}

function interviewFixtureLandingView(
  tryDemo: boolean,
  brief: Creator2BriefDocument,
): InterviewLandingView {
  return tryDemo
    ? tryInterviewLandingView(brief)
    : interviewPageLandingView(undefined, { brief })
}

function toolRefForPhase(brief: Creator2BriefDocument, phaseId: string): string | null {
  const phase = brief.phases.find((p) => p.id === phaseId)
  return phase && 'toolRef' in phase && typeof phase.toolRef === 'string' ? phase.toolRef : null
}

function copilotPersonaPayload(brief: Creator2BriefDocument | null | undefined) {
  const p = brief?.definition?.persona
  return {
    name: p?.name?.trim() || 'Interviewer',
    ...(p?.voice?.trim() ? { voice: p.voice.trim() } : {}),
    ...(p?.behaviourPrompt?.trim() ? { behaviourPrompt: p.behaviourPrompt.trim() } : {}),
  }
}

function assistErrorCode(e: unknown): string {
  console.error('[interview-peel]', e)
  if (e instanceof DataApiError) {
    if (e.code === 'not_authenticated') return 'not_authenticated'
    if (e.code === 'missing_openai_key' || e.message === 'missing_openai_key') {
      return 'missing_openai_key'
    }
    const token = [e.detail, e.message, e.code].find(
      (t): t is string => typeof t === 'string' && t.startsWith('interview_copilot_edit_'),
    )
    if (token === 'interview_copilot_edit_empty') {
      return 'Copilot did not return a reply. Try again.'
    }
    if (token === 'interview_copilot_edit_unreachable' || /interview_copilot_edit_\d+$/.test(token ?? '')) {
      return 'Could not reach Copilot. Try again.'
    }
    const detail = typeof e.detail === 'string' ? e.detail.trim() : ''
    if (detail && (e.code === 'unknown' || e.code === 'validation_failed') && detail.includes(' ')) {
      return detail
    }
    return toUserMessage(e, 'Could not get an assist reply. Try again.')
  }
  if (e instanceof Error && /openai|missing_openai/i.test(e.message)) return 'missing_openai_key'
  if (e instanceof Error && /Failed to fetch|NetworkError|Load failed/i.test(e.message)) {
    return 'Could not reach Copilot. Try again.'
  }
  return toUserMessage(e, 'Could not get an assist reply. Try again.')
}

function isCopilotWritePeel(chrome: { bundleId?: string; caps?: { write?: boolean } } | null | undefined): boolean {
  return Boolean(chrome?.caps?.write) || chrome?.bundleId === 'copilot'
}

/** Results overlay seeds Aid without a Talk/tool modal — still need a compose pack. */
function fallbackAssessorAidModal(input: {
  section: InterviewLandingVerifySection
  fixtureId: string
  brief: Creator2BriefDocument
}): AssessorAidModalLike {
  const stub: AssessorAidModalLike = {
    fixtureId: input.fixtureId,
    sectionKey: input.section.sectionKey,
    sectionLabel: input.section.label,
    title: input.section.label || 'Results',
    description:
      [input.section.summary, input.section.summaryDetail].filter((s) => s?.trim()).join('\n') ||
      'Walk this attempt with the marker. Do not invent scores.',
    depthLabel: 'Results',
    personaName: 'Assessor Aid',
    softBucket: null,
    messages: [],
    cards: [],
  }
  try {
    const response = getInterviewResponse(input.fixtureId)
    const scored = scoreAttempt({ brief: input.brief, response })
    const modal = buildTalkVerifyModal({
      fixtureId: input.fixtureId,
      sectionKey:
        foldersForTemplate('iv.delivery.v1', input.brief.analysis?.rollup)[0] ?? 'interviewDelivery',
      sectionLabel: input.section.label,
      response,
      scored,
      briefTalkSections: talkVerifyBriefSections(input.brief),
      talkSectionsMeta: talkSectionsMetaFromBrief(input.brief),
    })
    return {
      fixtureId: modal.fixtureId,
      sectionKey: input.section.sectionKey,
      sectionLabel: input.section.label,
      title: modal.title || stub.title,
      description: modal.description || stub.description,
      depthLabel: modal.depthLabel || stub.depthLabel,
      personaName: modal.personaName,
      softBucket: modal.softBucket,
      messages: modal.messages,
      cards: modal.cards,
    }
  } catch {
    return stub
  }
}

function copilotReplyText(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  return parts
    .filter((p) => p && typeof p === 'object' && (p as { type?: string }).type === 'markdown')
    .map((p) => {
      const row = p as { markdown?: string; text?: string }
      return String(row.markdown ?? row.text ?? '')
    })
    .join('\n')
}

type InterviewSwapPhase = 'idle' | 'out' | 'in'

type DashScrollEdge = 'top' | 'mid' | 'bottom' | 'both'

function readScrollEdge(viewport: HTMLElement): DashScrollEdge {
  const top = readThemeScrollTop(viewport) <= 2
  const bottom =
    readThemeScrollTop(viewport) + viewport.clientHeight >= viewport.scrollHeight - 2
  if (top && bottom) return 'both'
  if (top) return 'top'
  if (bottom) return 'bottom'
  return 'mid'
}

type ChromeTitleSlot = {
  /** Always-on stage count, e.g. Stage 1 of 5. */
  stageText: string
  /** Section title — empty at rest; when set, stage shrinks in front. */
  nameText: string
  morphKey: string
}

function chromeTitleAria(slot: Pick<ChromeTitleSlot, 'stageText' | 'nameText'>): string {
  return slot.nameText ? `${slot.stageText} · ${slot.nameText}` : slot.stageText
}

function ChromeTitleLine({ stageText, nameText }: { stageText: string; nameText: string }) {
  if (!nameText) {
    return <span className="page-scene--interview__chrome-title-line">{stageText}</span>
  }
  return (
    <>
      <span className="page-scene--interview__chrome-title-stage">{stageText}</span>
      <span className="page-scene--interview__chrome-title-line">{nameText}</span>
    </>
  )
}

/** Sticky chrome center — Stage N, then small Stage N + big section title (ellipsis). */
function InterviewChromeTitle({
  stageText,
  nameText,
  morphKey,
  /** When this changes (new gate / mode), snap with no morph — avoids double-swap on Next. */
  snapToken,
}: ChromeTitleSlot & { snapToken: string }) {
  const [shown, setShown] = useState({ stageText, nameText, morphKey })
  const [outgoing, setOutgoing] = useState<(ChromeTitleSlot & { gen: number }) | null>(null)
  const animatingRef = useRef(false)
  const morphGenRef = useRef(0)
  const shownRef = useRef(shown)
  const pendingRef = useRef<ChromeTitleSlot | null>(null)
  const snapTokenRef = useRef(snapToken)
  const skipMorphOnceRef = useRef(false)
  shownRef.current = shown

  const startMorph = (next: ChromeTitleSlot) => {
    const current = shownRef.current
    if (next.morphKey === current.morphKey) {
      setShown(next)
      return
    }
    animatingRef.current = true
    const gen = ++morphGenRef.current
    setOutgoing({ ...current, gen })
    setShown(next)
  }

  // Gate / mode change — hard snap to Stage N (no exit/enter from previous long title).
  useEffect(() => {
    if (snapToken === snapTokenRef.current) return
    snapTokenRef.current = snapToken
    skipMorphOnceRef.current = true
    animatingRef.current = false
    pendingRef.current = null
    morphGenRef.current += 1
    setOutgoing(null)
    setShown({ stageText, nameText, morphKey })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snap only on token; copy applied below
  }, [snapToken])

  useEffect(() => {
    // Same commit as a snap — apply latest copy without a second enter/exit.
    if (skipMorphOnceRef.current) {
      skipMorphOnceRef.current = false
      animatingRef.current = false
      pendingRef.current = null
      setOutgoing(null)
      setShown({ stageText, nameText, morphKey })
      return
    }
    if (morphKey === shown.morphKey) {
      if (stageText === shown.stageText && nameText === shown.nameText) return
      setShown({ stageText, nameText, morphKey })
      return
    }
    const next = { stageText, nameText, morphKey }
    if (animatingRef.current) {
      pendingRef.current = next
      return
    }
    startMorph(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- morph on slot/copy only
  }, [stageText, nameText, morphKey, snapToken])

  const clearOutgoing = (event?: { animationName?: string }, gen?: number) => {
    if (event?.animationName && event.animationName !== 'page-scene-interview-chrome-title-exit') {
      return
    }
    if (gen != null && gen !== morphGenRef.current) return
    setOutgoing(null)
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending && pending.morphKey !== shownRef.current.morphKey) {
      startMorph(pending)
      return
    }
    animatingRef.current = false
  }

  useEffect(() => {
    if (!outgoing) return
    const gen = outgoing.gen
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => clearOutgoing(undefined, gen), reduced ? 0 : 480)
    return () => window.clearTimeout(t)
  }, [outgoing])

  return (
    <div
      className="page-scene--interview__chrome-title-slot"
      aria-label={chromeTitleAria(shown)}
    >
      {outgoing ? (
        <div
          key={`out-${outgoing.morphKey}-${outgoing.gen}`}
          className="page-scene--interview__chrome-title-block is-exit"
          aria-hidden
          onAnimationEnd={(e) => clearOutgoing(e, outgoing.gen)}
        >
          <ChromeTitleLine stageText={outgoing.stageText} nameText={outgoing.nameText} />
        </div>
      ) : null}
      <div
        key={`in-${shown.morphKey}`}
        className={[
          'page-scene--interview__chrome-title-block',
          outgoing ? 'is-enter' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <ChromeTitleLine stageText={shown.stageText} nameText={shown.nameText} />
      </div>
    </div>
  )
}

function resetSectionChrome(root: HTMLElement | null): void {
  if (!root) return
  gsap.killTweensOf(root)
  gsap.set(root, { autoAlpha: 1, y: 0, clearProps: 'opacity,visibility,transform' })
}

function interviewBriefDownloadFilename(title: string, briefId: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return `${slug || 'interview-brief'}-${briefId.slice(0, 8)}.json`
}

/** Flip to `true` to expose landing “Download JSON” (brief fixture export). */
const SHOW_BRIEF_JSON_DOWNLOAD = false

function InterviewStageSwap({
  mode,
  landing,
  intakeStep,
  onIntakeStepChange,
  gate,
  completedPhaseIds,
  skippedPhaseIds,
  stageStarted,
  talk,
  toolMount,
  liveHostRef,
  editorHandleRef,
  scrollViewportRef,
  briefId,
  brief,
  assessError,
  onStart,
  onContinue,
  onStartStage,
  onTalkSend,
  onTalkDraftChange,
  onTalkMenu,
  leaveOpen,
  onLeaveClose,
  onLeaveConfirm,
  onLeaveForfeit,
  timerUpOpen,
  onTimerUpKeepEditing,
  onTimerUpLeave,
  onTimerUpContinue,
  onLiveCompositionChange,
  onPendingEditsChange,
  onVisibleCodeRun,
  verifySection,
  onVerifySectionChange,
  verifyModal,
  verifyCodingModal,
  verifyEssayModal,
  verifyFormModal,
  verifyBusy,
  verifyRevealMessageCount,
  verifyShowMarkingRail,
  verifyHighlightMessageId,
  onVerifyCiteMessage,
  onVerifyAskAbout,
  checkWarnings = [],
  tryDemo = false,
}: {
  mode: InterviewRunMode
  landing: InterviewLandingView
  intakeStep: InterviewIntakeStep
  onIntakeStepChange: (step: InterviewIntakeStep) => void
  gate: InterviewGateView | null
  completedPhaseIds: readonly string[]
  skippedPhaseIds: readonly string[]
  stageStarted: boolean
  talk: TalkRuntimeView | null
  toolMount: ReturnType<typeof resolveGateToolMount>
  liveHostRef: RefObject<HTMLDivElement | null>
  editorHandleRef?: RefObject<GateLiveEditorHandle | null>
  scrollViewportRef: RefObject<HTMLElement | null>
  briefId: string
  brief?: Creator2BriefDocument | null
  assessError?: string | null
  onStart: () => void
  onContinue: () => void
  onStartStage: () => void
  onTalkSend: (text: string) => void
  onTalkDraftChange: (draft: string) => void
  onTalkMenu: (action: TalkMenuAction) => void
  leaveOpen: boolean
  onLeaveClose: () => void
  onLeaveConfirm: () => void
  onLeaveForfeit: () => void
  timerUpOpen: boolean
  onTimerUpKeepEditing: () => void
  onTimerUpLeave: () => void
  onTimerUpContinue: () => void
  onLiveCompositionChange?: (event: import('../components/InterviewGateToolLive').GateLiveCompositionEvent) => void
  onPendingEditsChange?: (files: readonly { path: string }[]) => void
  onVisibleCodeRun?: (run: LastVisibleCodeRun) => void
  verifySection?: InterviewLandingVerifySection | null
  onVerifySectionChange?: (next: InterviewLandingVerifySection | null) => void
  verifyModal?: TalkVerifyModal | null
  verifyCodingModal?: CodingVerifyModal | null
  verifyEssayModal?: EssayVerifyModal | null
  verifyFormModal?: FormVerifyModal | null
  verifyBusy?: boolean
  verifyRevealMessageCount?: number
  verifyShowMarkingRail?: boolean
  verifyHighlightMessageId?: string | null
  onVerifyCiteMessage?: (messageId: string) => void
  onVerifyAskAbout?: (card: TalkVerifyMarkingCard) => void
  checkWarnings?: readonly { id: string; short: string }[]
  tryDemo?: boolean
}) {
  const timedLeave = Boolean(gate?.timed)

  return (
    <div className="page-scene--interview__stage-host">
      <Modal
        open={leaveOpen}
        title={timedLeave ? 'Leave this timed stage?' : 'Leave this stage?'}
        onClose={onLeaveClose}
        onConfirm={onLeaveConfirm}
        confirmLabel="Leave"
        cancelLabel="Stay"
        showCancel
        showHeaderClose={false}
        closeOnEscape
        size="md"
        placement="viewport"
        cardVariant="vurify-outlined"
        footerStyle="vurify"
        footerDivider
        scrollRail="hidden"
        closeOnBackdrop={false}
        className="page-scene--interview__leave-dialog"
      >
        <div className="page-scene--interview__leave-body">
          <p className="type-caption type-muted mb-0">
            Returns you to the interview overview, not a previous stage.
          </p>
          <p className="type-body-sm mb-0">
            Leave to overview keeps this stage open so you can resume with Continue. Only Forfeit
            marks the stage skipped (no score).
          </p>
          {timedLeave ? (
            <p className="type-body-sm mb-0">
              <button
                type="button"
                className="theme-interview-gate__text-action type-body-sm"
                onClick={onLeaveForfeit}
              >
                Forfeit this stage
              </button>
              {'. '}
              skip without scoring and continue later from the next open stage.
            </p>
          ) : (
            <p className="type-body-sm mb-0">
              <button
                type="button"
                className="theme-interview-gate__text-action type-body-sm"
                onClick={onLeaveForfeit}
              >
                Forfeit this stage
              </button>
              {'. '}
              skip without scoring (optional).
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={timerUpOpen}
        title="Time's up"
        onClose={onTimerUpKeepEditing}
        onConfirm={onTimerUpContinue}
        confirmLabel="Continue to next"
        cancelLabel="Keep editing"
        size="md"
        placement="viewport"
        cardVariant="vurify-outlined"
        footerStyle="vurify"
        footerDivider
        scrollRail="hidden"
        closeOnBackdrop={false}
        className="page-scene--interview__leave-dialog page-scene--interview__timer-up-dialog"
      >
        <div className="page-scene--interview__leave-body">
          <p className="type-caption type-muted mb-0">
            The hard timer for this stage has ended.
          </p>
          <p className="type-body-sm mb-0">
            You can keep editing and submit with Next (or Continue to next here). Your work will be
            marked. Leaving to overview keeps the stage open. Only Forfeit skips scoring.
          </p>
          <p className="type-body-sm mb-0">
            <button
              type="button"
              className="theme-interview-gate__text-action type-body-sm"
              onClick={onTimerUpLeave}
            >
              Leave to overview
            </button>
          </p>
        </div>
      </Modal>

      <div className="page-scene--interview__stage-inner">
        {mode === 'landing' ? (
          <InterviewLanding
            landing={landing}
            briefId={briefId}
            completedPhaseIds={completedPhaseIds}
            skippedPhaseIds={skippedPhaseIds}
            onStart={onStart}
            onContinue={onContinue}
            intakeStep={intakeStep}
            onIntakeStepChange={onIntakeStepChange}
            verifySection={verifySection}
            onVerifySectionChange={onVerifySectionChange}
            verifyModal={verifyModal}
            verifyCodingModal={verifyCodingModal}
            verifyEssayModal={verifyEssayModal}
            verifyFormModal={verifyFormModal}
            verifyBusy={verifyBusy}
            verifyRevealMessageCount={verifyRevealMessageCount}
            verifyShowMarkingRail={verifyShowMarkingRail}
            verifyHighlightMessageId={verifyHighlightMessageId}
            onVerifyCiteMessage={onVerifyCiteMessage}
            onVerifyAskAbout={onVerifyAskAbout}
            checkWarnings={checkWarnings}
          />
        ) : null}
        {mode === 'gate' && gate ? (
          <InterviewGateScene
            gate={gate}
            stageStarted={stageStarted}
            skipMountReveal
            onStartStage={onStartStage}
            talk={talk}
            onTalkSend={onTalkSend}
            onTalkDraftChange={onTalkDraftChange}
            onTalkMenu={onTalkMenu}
            scrollViewportRef={scrollViewportRef}
            toolMount={toolMount}
            liveHostRef={liveHostRef}
            editorHandleRef={editorHandleRef}
            onLiveCompositionChange={onLiveCompositionChange}
            onPendingEditsChange={onPendingEditsChange}
            onVisibleCodeRun={onVisibleCodeRun}
            briefId={briefId}
          />
        ) : null}
        {mode === 'finished' ? (
          <InterviewFinishedScene
            briefId={briefId}
            brief={brief}
            skipMountReveal
            assessError={assessError}
            onVerifySectionChange={onVerifySectionChange}
            tryDemo={tryDemo}
          />
        ) : null}
      </div>
    </div>
  )
}

function FinishedWorkspaceCover({
  enabled,
  open,
  onClose,
  onExitComplete,
  panel,
  children,
}: {
  enabled: boolean
  open: boolean
  onClose: () => void
  onExitComplete?: () => void
  panel: ReactNode
  children: ReactNode
}) {
  if (!enabled) return children
  return (
    <ScaleCoverModal
      className="theme-interview-landing-shell theme-interview-landing__verify-cover theme-interview-landing__verify-cover--page"
      open={open}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title="Review"
      hideChrome
      roundStage={false}
      panel={panel}
    >
      {children}
    </ScaleCoverModal>
  )
}

/**
 * Candidate interview App Stage Page Scene.
 * `/interview` — live Test from dashboard · `/try-interview` — Home Try fixture demo.
 */
export function InterviewPage({ tryDemo = false }: InterviewPageProps) {
  const pagePath = tryDemo ? TRY_INTERVIEW_PATH : INTERVIEW_PATH
  const { goDashboard, goHome, registerLeavePrep, activePath } = useAppStage()
  const [searchParams] = useSearchParams()
  const briefIdParam = tryDemo
    ? null
    : searchParams.get('briefId')?.trim() || null
  const pendingBriefId =
    !tryDemo && activePath === pagePath ? peekLastPrefetchedBriefId() : null
  const liveBriefId = briefIdParam || pendingBriefId
  /** Snapshot once — resize mid-demo must not swap desktop ↔ mobile default kits. */
  const [fixtureIsMobile] = useState(() => readInterviewFixtureIsMobile())
  const tryKit = resolveTryInterviewKit(
    tryDemo ? searchParams.get('kit') ?? peekPendingTryInterviewKit() : null,
  )
  const pageFixtureBriefId = tryDemo
    ? tryInterviewBriefIdForKit(tryKit)
    : interviewPageFixtureBriefId(fixtureIsMobile)
  const pageFixtureBrief = useMemo(
    () => (tryDemo ? tryInterviewBriefForKit(tryKit) : interviewPageBriefFixture(fixtureIsMobile)),
    [fixtureIsMobile, tryDemo, tryKit],
  )
  const runBriefId = liveBriefId || pageFixtureBriefId
  const surfaceRef = useRef<HTMLDivElement>(null)
  const viewportNodeRef = useRef<HTMLDivElement | null>(null)
  const stageHostRef = useRef<HTMLDivElement>(null)
  const liveHostRef = useRef<HTMLDivElement>(null)
  const liveEditorHandleRef = useRef<GateLiveEditorHandle | null>(null)
  const assistAbortRef = useRef<AbortController | null>(null)
  const assistOpenPhaseRef = useRef<string | null>(null)
  /** Blocks a second Enter before `talk.busy` paints. */
  const talkSendingRef = useRef(false)
  const copilotGenerationRef = useRef(0)
  const copilotPendingRef = useRef<{
    editRunId: string
    ops: CopilotOp[]
    steps?: unknown[]
    snapshotHash: string
    generation: number
    messageId: string
  } | null>(null)
  const copilotPendingPlanRef = useRef<Record<string, unknown> | null>(null)
  const copilotEditMemoryRef = useRef<CopilotEditMemoryEntry[]>([])
  /** Repair round-trips spent on the current ask. Reset on every candidate send. */
  const copilotRepairCountRef = useRef(0)
  const [viewportNode, setViewportNode] = useState<HTMLDivElement | null>(null)
  const [scrollEdge, setScrollEdge] = useState<DashScrollEdge>('top')
  const [landing, setLanding] = useState<InterviewLandingView | null>(null)
  const [landingBriefId, setLandingBriefId] = useState<string | null>(briefIdParam)
  const [, setLandingReady] = useState(false)
  const [landingError, setLandingError] = useState<string | null>(null)
  const [intakeStep, setIntakeStep] = useState<InterviewIntakeStep>(1)
  const [mode, setMode] = useState<InterviewRunMode>('landing')
  const [gate, setGate] = useState<InterviewGateView | null>(null)
  const [completedPhaseIds, setCompletedPhaseIds] = useState<readonly string[]>([])
  const [skippedPhaseIds, setSkippedPhaseIds] = useState<readonly string[]>([])
  const [stageStarted, setStageStarted] = useState(false)
  const [talk, setTalk] = useState<TalkRuntimeView | null>(null)
  const [assist, setAssist] = useState<AssistRuntimeView | null>(null)
  const [assessorAid, setAssessorAid] = useState<AssessorAidRuntimeView | null>(null)
  const [verifySection, setVerifySection] = useState<InterviewLandingVerifySection | null>(null)
  const [verifyModal, setVerifyModal] = useState<TalkVerifyModal | null>(null)
  const [verifyCodingModal, setVerifyCodingModal] = useState<CodingVerifyModal | null>(null)
  const [verifyEssayModal, setVerifyEssayModal] = useState<EssayVerifyModal | null>(null)
  const [verifyFormModal, setVerifyFormModal] = useState<FormVerifyModal | null>(null)
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyRevealMessageCount, setVerifyRevealMessageCount] = useState(0)
  const [verifyShowMarkingRail, setVerifyShowMarkingRail] = useState(false)
  const [verifyHighlightMessageId, setVerifyHighlightMessageId] = useState<string | null>(null)
  const verifyModalRef = useRef<TalkVerifyModal | null>(null)
  const verifyCodingModalRef = useRef<CodingVerifyModal | null>(null)
  const verifyEssayModalRef = useRef<EssayVerifyModal | null>(null)
  const verifyFormModalRef = useRef<FormVerifyModal | null>(null)
  const assessorAidRef = useRef<AssessorAidRuntimeView | null>(null)
  const assessorAidReportRef = useRef<AssessorAidReport | null>(null)
  const assessorAidFocusRef = useRef<{
    focusCardId: string | null
    focusMessageId: string | null
    focusPrompt: string | null
  }>({ focusCardId: null, focusMessageId: null, focusPrompt: null })
  const assessorAidAttachRef = useRef<AidPeelAttach | null>(null)
  const [assessorAidAttach, setAssessorAidAttach] = useState<AidPeelAttach | null>(null)
  const resultTimelineRef = useRef<InterviewFlowTimelineHandle | null>(null)
  const verifySeqRef = useRef(0)
  const [finishedCoverHeld, setFinishedCoverHeld] = useState(false)
  const heldFinishedVerifyRef = useRef<InterviewLandingVerifySection | null>(null)
  const resultClosingRef = useRef(false)
  const peelCloseTimerRef = useRef<number | null>(null)
  const [liveStageComposition, setLiveStageComposition] =
    useState<AssistLiveComposition | null>(null)
  const liveStageCompositionRef = useRef<AssistLiveComposition | null>(null)
  const [codingExtraAttach, setCodingExtraAttach] = useState<string[]>([])
  const [pendingEdits, setPendingEdits] = useState<
    readonly { path: string; id?: string; label?: string; locked?: boolean }[]
  >([])
  const codingExtraAttachRef = useRef<string[]>([])
  const codingFocusPathRef = useRef<string | null>(null)
  const [hardDeadlineAt, setHardDeadlineAt] = useState<string | null>(null)
  const [hardTimeoutMs, setHardTimeoutMs] = useState(0)
  /** Same as DashboardPage — drives `data-chat-closed` for the right peel. */
  const [chatClosed, setChatClosed] = useState(true)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [referenceOpen, setReferenceOpen] = useState(false)
  const [policyHold, setPolicyHold] = useState(false)
  const [timerUpOpen, setTimerUpOpen] = useState(false)
  const [assessBusy, setAssessBusy] = useState(false)
  const [assessError, setAssessError] = useState<string | null>(null)
  const liveArtifactRef = useRef<LiveToolArtifact | null>(null)
  const lastVisibleCodeRunRef = useRef<LastVisibleCodeRun | null>(null)
  const assessAbortRef = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [swapPhase, setSwapPhase] = useState<InterviewSwapPhase>('idle')
  const [chromeStageText, setChromeStageText] = useState('Interview')
  const [chromeNameText, setChromeNameText] = useState('')
  const [chromeMorphKey, setChromeMorphKey] = useState('landing')
  const [briefDoc, setBriefDoc] = useState<Creator2BriefDocument | null>(() =>
    liveBriefId
      ? peekInterviewBriefDocument(liveBriefId)
      : pageFixtureBrief,
  )
  const chromeRef = useRef<HTMLElement | null>(null)
  const swapTimerRef = useRef<number | null>(null)
  /** After a gate swap, ignore title promotion until settled at the top. */
  const chromePromoteArmedRef = useRef(false)
  const chromeSnapToken =
    mode === 'gate' && gate
      ? `gate:${gate.phaseId}`
      : mode === 'finished'
        ? 'finished'
        : 'landing'
  /** Creator-2 body for Talk / tools — live Test cache, or page fixture when no `?briefId=`. */
  const runBrief =
    briefDoc ??
    (liveBriefId ? peekInterviewBriefDocument(liveBriefId) : null) ??
    pageFixtureBrief

  const liveCheckWarnings = useMemo(() => {
    if (tryDemo || !liveBriefId || !runBrief) return []
    return collectCheckSuite(runBrief as unknown as Record<string, unknown>)
  }, [liveBriefId, runBrief, tryDemo])

  const toolMount = useMemo(() => {
    if (!gate || gate.isTalk) return null
    // Resolve from brief phase — do not require gate.toolKind (label mapping can drift).
    return resolveGateToolMount({ brief: runBrief, phaseId: gate.phaseId })
  }, [gate, runBrief])

  const referencedPhaseIds = useMemo(
    () => (gate ? referencedPhaseIdsFromBrief(runBrief, gate.phaseId) : []),
    [gate, runBrief],
  )

  useEffect(() => {
    setReferenceOpen(false)
  }, [gate?.phaseId, leaveOpen, timerUpOpen, policyHold, mode])

  const codingChipPaths = useMemo(() => {
    if (!liveStageComposition || liveStageComposition.kind !== 'coding') return [] as string[]
    const tree = Array.isArray(liveStageComposition.snapshot.tree)
      ? (liveStageComposition.snapshot.tree as string[])
      : []
    const src = tree.filter((p) => p.startsWith('src/'))
    const langs =
      toolMount?.kind === 'coding' && toolMount.languages.length
        ? toolMount.languages
        : ['typescript']
    const focus = String(liveStageComposition.snapshot.activeId ?? '')
    const lang =
      (focus && resolveCodingLanguageForFile(focus, '', langs)) || langs[0] || 'typescript'
    return src.filter((p) => isPackedCodingPath(p, lang))
  }, [liveStageComposition, toolMount])

  const codingFocusPath =
    liveStageComposition?.kind === 'coding'
      ? String(liveStageComposition.snapshot.activeId ?? '') || codingChipPaths[0] || null
      : null

  codingExtraAttachRef.current = codingExtraAttach
  codingFocusPathRef.current = codingFocusPath

  const assistAttachFiles = useMemo(
    () =>
      codingChipPaths.map((path) => ({
        path,
        pinned: path === codingFocusPath,
        selected: path === codingFocusPath || codingExtraAttach.includes(path),
      })),
    [codingChipPaths, codingExtraAttach, codingFocusPath],
  )

  const compositionForAssistSend = (): AssistLiveComposition | null => {
    const artifact = liveArtifactRef.current
    const extras = codingExtraAttachRef.current
    if (artifact?.kind === 'coding') {
      const next = sanitizeCodingLiveComposition(artifact.payload, {
        focusPath: String(artifact.payload.activeId ?? '') || codingFocusPathRef.current,
        attachedPaths: extras.filter((p) =>
          (artifact.payload.files ?? []).some((f) => f.path === p),
        ),
      })
      liveStageCompositionRef.current = next
      return next
    }
    if (artifact?.kind === 'form') {
      const next = sanitizeFormLiveComposition(artifact.document)
      liveStageCompositionRef.current = next
      return next
    }
    if (artifact?.kind === 'doc') {
      const ctx = liveEditorHandleRef.current?.getContext?.() as
        | { markdown?: string; title?: string; lexical?: unknown; pageSetup?: unknown }
        | null
        const payload = (ctx ?? artifact.payload) as typeof artifact.payload
        const minWords = toolMount?.kind === 'doc' ? toolMount.minWords : null
        const maxWords = toolMount?.kind === 'doc' ? toolMount.maxWords : null
        const next = sanitizeDocLiveComposition(payload, { minWords, maxWords })
      liveStageCompositionRef.current = next
      return next
    }
    return liveStageCompositionRef.current
  }

  /**
   * Ask the Edge to write the same edit again after our own dry-run refused it.
   *
   * The Edge dry-run can pass while this one misses — the live document has moved on, or
   * the FE apply reads a span differently. Two round-trips, then the terminal message: a
   * miss that survives three writings is not one more prompt away from landing.
   */
  const runCopilotRepair = async (
    reason: string,
    rejectedOps: CopilotOp[],
    messageId: string,
  ): Promise<boolean> => {
    const phaseId = gate?.phaseId
    const kind = toolMount?.kind
    if (!phaseId || !kind || !runBriefId) return false
    copilotGenerationRef.current += 1
    const generation = copilotGenerationRef.current
    const liveDoc = buildCopilotLiveDoc({
      kind,
      generation,
      context: contextForCopilotSend(),
      selection: kind === 'coding' ? { path: codingFocusPathRef.current || undefined } : undefined,
      diagnostics: kind === 'coding' ? diagnosticsFromCodeRun(lastVisibleCodeRunRef.current) : undefined,
    })
    const messages = assist?.messages ?? []
    const userMessage = [...messages].reverse().find((m) => m.role === 'candidate')?.text ?? ''
    const result = await runCopilotEditRepair({
      briefId: runBriefId,
      liveDoc,
      history: assistHistoryForCopilot(messages),
      persona: copilotPersonaPayload(runBrief),
      privileges: {
        caps: { write: true, chat: true, spoilers: Boolean(gate?.assistChrome?.caps.spoilers) },
      },
      remainingMs: hardDeadlineAt ? hardTimerRemainingMs(hardDeadlineAt) : UNTIMED_COPILOT_BUDGET_MS,
      userMessage,
      repair: { reason, rejectedOps },
      editMemory: copilotEditMemoryRef.current,
      sectionContract: buildAssistSectionContract({
        phaseId,
        title: gate?.title || toolMount?.title || '',
        kind,
        purpose: toolMount?.instructions ?? '',
        bundleId: gate?.assistChrome?.bundleId,
        caps: gate?.assistChrome?.caps,
      }),
    })
    const meta = (result.meta ?? {}) as Record<string, unknown>
    const nextOps = Array.isArray(meta.ops) ? (meta.ops as CopilotOp[]) : []
    if (!nextOps.length) return false
    runCopilotPropose(
      nextOps,
      Number(meta.generation ?? generation),
      messageId,
      Array.isArray(meta.steps) ? meta.steps : undefined,
    )
    return true
  }

  const runCopilotPropose = (
    ops: CopilotOp[],
    generation: number,
    messageId: string,
    steps?: unknown[],
  ) => {
    const handle = liveEditorHandleRef.current
    const phaseId = gate?.phaseId
    const kind = toolMount?.kind
    if (!phaseId || !kind) return
    if (!handle?.proposeEdit) {
      setAssist((prev) =>
        prev
          ? {
              ...prev,
              error: copilotApplyMissReason('no_handle'),
              pendingEditRunId: null,
              messages: prev.messages.map((m) =>
                m.id === messageId ? { ...m, pendingStatus: 'miss' as const } : m,
              ),
            }
          : prev,
      )
      return
    }
    void handle
      .proposeEdit(ops, generation, Array.isArray(steps) ? steps : undefined)
      .then((res) => {
        if (res.status === 'replaced') {
          setAssist((prev) =>
            prev
              ? {
                  ...prev,
                  messages: prev.messages.map((m) =>
                    m.id === messageId ? { ...m, pendingStatus: 'expired' as const } : m,
                  ),
                }
              : prev,
          )
          return
        }
        if (res.status === 'miss') {
          const reason = res.reason || 'apply_failed'
          const giveUp = () => {
            setAssist((prev) =>
              prev
                ? {
                    ...prev,
                    error: copilotApplyMissReason(reason),
                    pendingEditRunId: null,
                    messages: prev.messages.map((m) =>
                      m.id === messageId ? { ...m, pendingStatus: 'miss' as const } : m,
                    ),
                  }
                : prev,
            )
            copilotPendingRef.current = null
          }
          if (copilotRepairCountRef.current >= COPILOT_REPAIR_ROUNDS) {
            giveUp()
            return
          }
          copilotRepairCountRef.current += 1
          setAssist((prev) =>
            prev
              ? {
                  ...prev,
                  error: null,
                  messages: prev.messages.map((m) =>
                    m.id === messageId ? { ...m, pendingStatus: 'retrying' as const } : m,
                  ),
                }
              : prev,
          )
          void runCopilotRepair(reason, ops, messageId)
            .then((sent) => {
              if (!sent) giveUp()
            })
            .catch(giveUp)
          return
        }
        const memStatus = res.status === 'rejected' ? 'rejected' : res.status === 'applied' ? 'applied' : 'accepted'
        const entry = {
          ...memoryEntryFromOps({ status: memStatus, kind, ops }),
          locus: res.locus || memoryEntryFromOps({ status: memStatus, kind, ops }).locus,
          summary: res.summary || memoryEntryFromOps({ status: memStatus, kind, ops }).summary,
        }
        copilotEditMemoryRef.current = capEditMemory(copilotEditMemoryRef.current, entry)
        copilotPendingRef.current = null
        setAssist((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            error: null,
            pendingEditRunId: null,
            messages: prev.messages.map((m) =>
              m.id === messageId
                ? { ...m, pendingStatus: res.status === 'rejected' ? ('expired' as const) : ('applied' as const) }
                : m,
            ),
          }
        })
        persistCopilotEditOutcome({
          briefId: runBriefId,
          phaseId,
          status: entry.status,
          locus: entry.locus,
          summary: entry.summary,
          id: `assist-propose-${entry.at.toString(36)}`,
        })
      })
      .catch(() => {
        setAssist((prev) =>
          prev
            ? {
                ...prev,
                error: copilotApplyMissReason('apply_failed'),
                pendingEditRunId: null,
                messages: prev.messages.map((m) =>
                  m.id === messageId ? { ...m, pendingStatus: 'miss' as const } : m,
                ),
              }
            : prev,
        )
        copilotPendingRef.current = null
      })
  }

  const contextForCopilotSend = (): unknown => {
    const ctx = liveEditorHandleRef.current?.getContext?.() ?? null
    const artifact = liveArtifactRef.current
    const live = compositionForAssistSend()
    if (artifact?.kind === 'coding') return ctx ?? artifact.payload
    if (artifact?.kind === 'form') return ctx ?? artifact.document
    if (artifact?.kind === 'doc') {
      const payload = (ctx ?? artifact.payload) as { markdown?: string; title?: string }
      if (!String(payload.markdown ?? '').trim() && live?.kind === 'doc') {
        return { ...payload, markdown: String(live.snapshot.body ?? '') }
      }
      return payload
    }
    return ctx
  }

  const shownLanding = (() => {
    if (liveBriefId) {
      if (landingBriefId === liveBriefId && landing) {
        if (isCoverUrlWarmed(landing.coverUrl)) return landing
        if (mode === 'gate' || mode === 'landing' || mode === 'finished') return landing
      }
      const peek = peekInterviewLandingPrefetch(liveBriefId)
      if (peek && isCoverUrlWarmed(peek.coverUrl)) return peek
      if (landing && (mode === 'gate' || mode === 'landing' || mode === 'finished')) {
        return landing
      }
      return null
    }
    if (activePath !== pagePath) return null
    return landing ?? interviewFixtureLandingView(tryDemo, pageFixtureBrief)
  })()
  const showStage = shownLanding != null

  const gsapTiming = useMemo(() => ({ layout: { pageLengthVph: 1 as const } }), [])

  const viewportRef = {
    get current() {
      return viewportNodeRef.current
    },
    set current(node: HTMLDivElement | null) {
      viewportNodeRef.current = node
      setViewportNode(node)
    },
  }

  useEffect(() => {
    registerLeavePrep(pagePath, null)
    return () => registerLeavePrep(pagePath, null)
  }, [registerLeavePrep, pagePath])

  useEffect(() => subscribeSittingPolicy((s) => setPolicyHold(s.hold)), [])

  useEffect(() => {
    setCodingExtraAttach([])
    copilotEditMemoryRef.current = []
  }, [gate?.phaseId])

  const prevLiveBriefIdRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const prev = prevLiveBriefIdRef.current
    prevLiveBriefIdRef.current = liveBriefId
    if (prev === undefined || prev === liveBriefId || !liveBriefId) return
    setMode('landing')
    setGate(null)
    setBusy(false)
    setSwapPhase('idle')
    setStageStarted(false)
    setTalk(null)
    setChatClosed(true)
    resetSectionChrome(stageHostRef.current)
    resetSectionChrome(chromeRef.current)
  }, [liveBriefId])

  const prevTryBriefIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!tryDemo) return
    const prev = prevTryBriefIdRef.current
    prevTryBriefIdRef.current = pageFixtureBriefId
    if (prev === undefined || prev === pageFixtureBriefId) return
    setMode('landing')
    setGate(null)
    setBusy(false)
    setSwapPhase('idle')
    setStageStarted(false)
    setTalk(null)
    setChatClosed(true)
    resetSectionChrome(stageHostRef.current)
    resetSectionChrome(chromeRef.current)
  }, [tryDemo, pageFixtureBriefId])

  useEffect(() => {
    return () => {
      if (swapTimerRef.current != null) window.clearTimeout(swapTimerRef.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!liveBriefId) {
      setLandingError(null)
      if (activePath !== pagePath) {
        setLanding(null)
        setLandingBriefId(null)
        setBriefDoc(null)
        setLandingReady(false)
        return () => {
          cancelled = true
        }
      }
      setBriefDoc(pageFixtureBrief)
      const view = interviewFixtureLandingView(tryDemo, pageFixtureBrief)
      setLanding(view)
      setLandingBriefId(null)
      setLandingReady(true)
      const snap = runHydrateLanding({ briefId: runBriefId, landing: view })
      setCompletedPhaseIds(snap.completedPhaseIds)
      setSkippedPhaseIds(snap.skippedPhaseIds)
      setLanding(snap.landing)
      return () => {
        cancelled = true
      }
    }

    setLandingError(null)
    const cachedBody = peekInterviewBriefDocument(liveBriefId)
    if (cachedBody) setBriefDoc(cachedBody)

    const prefetched = consumeInterviewLandingPrefetch(liveBriefId)
    if (prefetched) {
      setLanding(prefetched)
      setLandingBriefId(liveBriefId)
      setLandingReady(true)
      const snap = runHydrateLanding({ briefId: runBriefId, landing: prefetched })
      setCompletedPhaseIds(snap.completedPhaseIds)
      setSkippedPhaseIds(snap.skippedPhaseIds)
      setLanding(snap.landing)
      setBriefDoc(peekInterviewBriefDocument(liveBriefId))
      return () => {
        cancelled = true
      }
    }

    setLandingReady(false)
    setLanding(null)
    void (async () => {
      try {
        const view = await prefetchInterviewLanding(liveBriefId)
        if (cancelled) return
        const snap = runHydrateLanding({ briefId: runBriefId, landing: view })
        setLanding(snap.landing)
        setLandingBriefId(liveBriefId)
        setCompletedPhaseIds(snap.completedPhaseIds)
        setSkippedPhaseIds(snap.skippedPhaseIds)
        setBriefDoc(peekInterviewBriefDocument(liveBriefId))
        setLandingError(null)
        setLandingReady(true)
      } catch (e) {
        if (!cancelled) {
          setLanding(null)
          setLandingBriefId(null)
          setBriefDoc(null)
          setLandingError(toUserMessage(e, 'Could not load this interview.'))
          setLandingReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [liveBriefId, runBriefId, activePath, pagePath, pageFixtureBrief, tryDemo])

  useEffect(() => {
    const viewport = viewportNode
    if (!viewport) return

    const syncEdge = () => {
      setScrollEdge(readScrollEdge(viewport))
    }
    syncEdge()
    viewport.addEventListener('scroll', syncEdge, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncEdge) : null
    ro?.observe(viewport)
    if (surfaceRef.current) ro?.observe(surfaceRef.current)
    return () => {
      viewport.removeEventListener('scroll', syncEdge)
      ro?.disconnect()
    }
  }, [viewportNode])

  useEffect(() => {
    setStageStarted(false)
    setTalk(null)
    setChatClosed(true)
    setTimerUpOpen(false)
  }, [gate?.phaseId])

  // Default chrome center copy when mode / gate changes (scroll may promote section title).
  useEffect(() => {
    chromePromoteArmedRef.current = false
    if (mode === 'landing') {
      setChromeStageText('Interview')
      setChromeNameText('')
      setChromeMorphKey('landing')
      return
    }
    setIntakeStep(1)
    if (mode === 'finished') {
      setChromeStageText('Complete')
      setChromeNameText('')
      setChromeMorphKey('finished')
      return
    }
    if (mode === 'gate' && gate) {
      setChromeStageText(`Stage ${gate.index} of ${gate.total}`)
      setChromeNameText('')
      setChromeMorphKey(`stage:${gate.phaseId}`)
    }
  }, [mode, gate?.phaseId, gate?.index, gate?.total])

  // Jump scroll to top on gate change so leftover offset cannot promote the new title.
  useEffect(() => {
    if (mode !== 'gate' || !gate || !viewportNode) return
    writeThemeScrollTop(viewportNode, 0)
    setScrollEdge(readScrollEdge(viewportNode))
    // Arm promotion only after layout at top — user scroll can promote later.
    let cancelled = false
    const arm = () => {
      if (cancelled) return
      writeThemeScrollTop(viewportNode, 0)
      chromePromoteArmedRef.current = true
    }
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(arm)
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(id)
    }
  }, [mode, gate?.phaseId, viewportNode])

  // When the in-page gate title crosses under the sticky header, keep Stage N small + big title.
  // Re-run when Start swaps prep ↔ writing brief (both use [data-interview-gate-title]).
  useEffect(() => {
    if (mode !== 'gate' || !gate || !viewportNode) return

    const stageText = `Stage ${gate.index} of ${gate.total}`
    let raf = 0
    const syncChromeTitle = () => {
      const heading = viewportNode.querySelector<HTMLElement>('[data-interview-gate-title]')
      const chrome = chromeRef.current
      if (!heading || !chrome) return
      setChromeStageText((prev) => (prev === stageText ? prev : stageText))

      // While settling a new gate, stay on Stage N only (no promote → demote double morph).
      if (!chromePromoteArmedRef.current || readThemeScrollTop(viewportNode) <= 2) {
        setChromeNameText((prev) => (prev === '' ? prev : ''))
        setChromeMorphKey((prev) => {
          const next = `stage:${gate.phaseId}`
          return prev === next ? prev : next
        })
        return
      }

      const threshold = chrome.getBoundingClientRect().bottom + 4
      const titleTop = heading.getBoundingClientRect().top
      if (titleTop <= threshold) {
        const nextName =
          heading.dataset.interviewGateTitleText?.trim() || gate.title
        setChromeNameText((prev) => (prev === nextName ? prev : nextName))
        setChromeMorphKey((prev) => {
          const next = `title:${gate.phaseId}`
          return prev === next ? prev : next
        })
      } else {
        setChromeNameText((prev) => (prev === '' ? prev : ''))
        setChromeMorphKey((prev) => {
          const next = `stage:${gate.phaseId}`
          return prev === next ? prev : next
        })
      }
    }

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        syncChromeTitle()
      })
    }

    syncChromeTitle()
    viewportNode.addEventListener('scroll', onScroll, { passive: true })
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null
    ro?.observe(viewportNode)
    if (chromeRef.current) ro?.observe(chromeRef.current)
    return () => {
      viewportNode.removeEventListener('scroll', onScroll)
      ro?.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [mode, gate, viewportNode, stageStarted, toolMount?.kind])

  const applySnapshot = (snap: ReturnType<typeof runOpenAttempt>) => {
    // Reset scroll before paint of the next gate so chrome sync never sees a mid-page offset.
    const viewport = viewportNodeRef.current
    if (viewport) {
      writeThemeScrollTop(viewport, 0)
      setScrollEdge(readScrollEdge(viewport))
    }
    chromePromoteArmedRef.current = false
    setLanding(snap.landing)
    setCompletedPhaseIds(snap.completedPhaseIds)
    setSkippedPhaseIds(snap.skippedPhaseIds)
    setMode(snap.mode)
    setGate(snap.gate)
    setTalk(snap.talk)
    setStageStarted(false)
    setChatClosed(true)
    setAssist(null)
    setHardDeadlineAt(null)
    setHardTimeoutMs(0)
    setLiveStageComposition(null)
    liveStageCompositionRef.current = null
    liveArtifactRef.current = null
    lastVisibleCodeRunRef.current = null
    setAssessError(null)
    pauseSessionTelemetry()
    if (snap.mode === 'landing') {
      setIntakeStep(1)
      stopSittingPolicy()
    } else if (snap.mode === 'finished') {
      stopSittingPolicy()
    } else if (snap.gate?.phaseId) {
      setSittingPolicyPhase(snap.gate.phaseId)
    }
    if (snap.mode !== 'gate') {
      setTalk(null)
    }
  }

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const runWorkspaceSwap = (apply: () => void) => {
    resetSectionChrome(stageHostRef.current)
    resetSectionChrome(chromeRef.current)
    if (swapTimerRef.current != null) {
      window.clearTimeout(swapTimerRef.current)
      swapTimerRef.current = null
    }
    if (prefersReducedMotion()) {
      apply()
      setSwapPhase('idle')
      setBusy(false)
      return
    }
    setSwapPhase('out')
    swapTimerRef.current = window.setTimeout(() => {
      apply()
      setSwapPhase('in')
      swapTimerRef.current = window.setTimeout(() => {
        setSwapPhase('idle')
        setBusy(false)
        swapTimerRef.current = null
      }, INTERVIEW_SWAP_MS)
    }, INTERVIEW_SWAP_MS)
  }

  const swapMode = (
    run: () => ReturnType<typeof runOpenAttempt>,
    options?: { force?: boolean },
  ) => {
    if (!shownLanding) return
    if (busy && !options?.force) return
    setBusy(true)
    runWorkspaceSwap(() => applySnapshot(run()))
  }

  /** Tool live: animate editor out, then section swap. */
  const swapModeAfterLiveOut = (
    run: () => ReturnType<typeof runOpenAttempt>,
    options?: { force?: boolean; skipLiveOut?: boolean },
  ) => {
    if (!shownLanding) return
    if (busy && !options?.force) return
    const reducedMotion = prefersReducedMotion()
    const toolLive =
      !options?.skipLiveOut &&
      !policyHold &&
      stageStarted &&
      gate &&
      !gate.isTalk &&
      Boolean(toolMount) &&
      Boolean(liveHostRef.current)
    setBusy(true)
    const finish = () => {
      runWorkspaceSwap(() => applySnapshot(run()))
    }
    if (toolLive) {
      revealSectionOut(liveHostRef.current, {
        reducedMotion,
        onComplete: finish,
      })
      return
    }
    finish()
  }

  /** Start always clears local progress and opens gate 0. */
  const handleStart = () => {
    if (!shownLanding) return
    if (checkSuiteBlocksTake(liveCheckWarnings)) return
    stopSittingPolicy()
    Capture.reset()
    swapMode(() => {
      runRestartAttempt({ briefId: runBriefId, landing: shownLanding, brief: runBrief })
      return runOpenAttempt({ briefId: runBriefId, landing: shownLanding, brief: runBrief })
    })
  }

  /** Continue resumes the next pending gate. */
  const handleContinue = () => {
    if (!shownLanding) return
    if (checkSuiteBlocksTake(liveCheckWarnings)) return
    swapMode(() =>
      runOpenAttempt({ briefId: runBriefId, landing: shownLanding, brief: runBrief }),
    )
  }

  const handleStartStage = () => {
    if (!shownLanding || !gate || !runBrief) return
    const talkGate = Boolean(gate.isTalk)
    setStageStarted(true)
    // Talk discussion lives in the gate column — keep the right peel closed.
    // Tool peel opens only when catalog caps.chat (None stays closed).
    const openPeel = Boolean(!talkGate && gate.assistChrome?.openPeel)
    if (openPeel) setChatClosed(false)
    else setAssist(null)
    liveStageCompositionRef.current = null
    setLiveStageComposition(null)

    if (talkGate) {
      const response = ensureInterviewResponse(runBriefId)
      if (peekTelemetrySession()) resumeSessionTelemetry(gate.phaseId)
      else {
        startSessionTelemetry({
          briefId: runBriefId,
          attemptId: response.attemptId,
          phaseId: gate.phaseId,
        })
      }
      startSessionProbeHeartbeat({
        briefId: runBriefId,
        attemptId: response.attemptId,
        phaseId: gate.phaseId,
      })
      startSittingPolicy({
        briefId: runBriefId,
        attemptId: response.attemptId,
        phaseId: gate.phaseId,
      })
      void runStartTalk({
        briefId: runBriefId,
        landing: shownLanding,
        phaseId: gate.phaseId,
        brief: runBrief,
        onProgress: (view) => {
          setTalk(view)
        },
        onComposeDelta: (full) => {
          setTalk((prev) => {
            if (!prev) return prev
            const msgs = [...prev.state.messages]
            const last = msgs[msgs.length - 1]
            if (last?.role === 'assistant') {
              msgs[msgs.length - 1] = { ...last, text: full }
            } else {
              msgs.push({
                id: `stream_open_${Date.now().toString(36)}`,
                role: 'assistant',
                text: full,
                at: Date.now(),
                probeId: prev.context.opener.probeId,
                kind: 'opener',
              })
            }
            return {
              ...prev,
              busy: true,
              error: null,
              state: { ...prev.state, messages: msgs },
            }
          })
        },
      }).then((snap) => {
        setTalk((prev) => stabilizeTalkViewIds(prev, snap.talk))
      })
      return
    }

    const personaName =
      runBrief.definition?.persona?.name?.trim() || 'Interviewer'
    const mount = resolveGateToolMount({ brief: runBrief, phaseId: gate.phaseId })
    if (mount) {
      const response = ensureInterviewResponse(runBriefId)
      Capture.start({
        briefId: runBriefId,
        attemptId: response.attemptId,
        phaseId: gate.phaseId,
        kind: mount.kind,
        live:
          mount.kind === 'form'
            ? mount.document
            : mount.kind === 'coding'
              ? mount.workspace
              : mount.document,
      })
      if (peekTelemetrySession()) resumeSessionTelemetry(gate.phaseId)
      else {
        startSessionTelemetry({
          briefId: runBriefId,
          attemptId: response.attemptId,
          phaseId: gate.phaseId,
        })
      }
      startSessionProbeHeartbeat({
        briefId: runBriefId,
        attemptId: response.attemptId,
        phaseId: gate.phaseId,
      })
      startSittingPolicy({
        briefId: runBriefId,
        attemptId: response.attemptId,
        phaseId: gate.phaseId,
      })
    }

    if (gate.timed && gate.limitMinutes && gate.limitMinutes > 0) {
      const ms = Math.round(gate.limitMinutes * 60_000)
      setHardTimeoutMs(ms)
      setHardDeadlineAt(new Date(Date.now() + ms).toISOString())
    } else {
      setHardTimeoutMs(0)
      setHardDeadlineAt(null)
    }

    // Match Creator: open peel first; seed assist after width settles (~--dash-peel-duration).
    if (!openPeel) return
    const CHAT_PEEL_MS = 560
    const phaseId = gate.phaseId
    const gateTimed = gate.timed
    const gateLimit = gate.limitMinutes
    const gateTitle = gate.title
    const gateDescription = gate.description
    const assistBundleId = gate.assistChrome?.bundleId
    const assistCaps = gate.assistChrome?.caps
    const assistWrite = Boolean(assistCaps?.write)
    if (assistOpenPhaseRef.current && assistOpenPhaseRef.current !== phaseId) {
      assistOpenPhaseRef.current = null
    }
    if (assistOpenPhaseRef.current === phaseId) {
      const persistedPeel = peelRuntimeFromPersisted(
        ensureInterviewResponse(runBriefId).messages,
        phaseId,
      )
      if (persistedPeel.length > 0) {
        setAssist({
          personaName,
          draft: '',
          busy: false,
          error: null,
          messages: persistedPeel,
          write: assistWrite,
          bundleId: assistBundleId,
        })
      }
      return
    }
    assistOpenPhaseRef.current = phaseId
    window.setTimeout(() => {
      const persistedPeel = peelRuntimeFromPersisted(
        ensureInterviewResponse(runBriefId).messages,
        phaseId,
      )
      if (persistedPeel.length > 0) {
        setAssist({
          personaName,
          draft: '',
          busy: false,
          error: null,
          messages: persistedPeel,
          write: assistWrite,
          bundleId: assistBundleId,
        })
        return
      }
      setAssist({
        personaName,
        draft: '',
        busy: true,
        error: null,
        messages: [],
        write: assistWrite,
        bundleId: assistBundleId,
      })
      const previousTitle = shownLanding
        ? previousGateTitle({
            sections: shownLanding.sections,
            currentPhaseId: phaseId,
            completedPhaseIds,
            skippedPhaseIds,
          })
        : null
      const sectionIds = (shownLanding?.sections ?? []).map((s) => ({
        phaseId: s.id,
        title: s.title,
      }))
      const streamId = `assist-open-${phaseId}`
      void runAssistSectionOpen({
        briefId: runBriefId,
        brief: runBrief,
        phaseId,
        timed: gateTimed,
        limitMinutes: gateLimit,
        mount,
        gateTitle,
        gateDescription,
        personaName,
        previousTitle,
        bundleId: assistBundleId,
        caps: assistCaps,
        sectionIds,
        onComposeDelta: (full) => {
          const spoken = full.replace(/\s+/g, ' ').trim()
          if (!spoken) return
          setAssist((prev) => {
            if (!prev) return prev
            const msgs = [...prev.messages]
            const idx = msgs.findIndex((m) => m.id === streamId)
            const row = { id: streamId, role: 'assistant' as const, text: spoken }
            if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
            else msgs.push(row)
            return { ...prev, busy: true, messages: msgs }
          })
        },
      }).then((open) => {
        const persistedAt =
          ensureInterviewResponse(runBriefId).messages.find((m) => m.id === streamId)?.at ??
          nowIso()
        setAssist((prev) => {
          const row = {
            id: streamId,
            role: 'assistant' as const,
            text: open.utterance,
            at: persistedAt,
          }
          const msgs = [...(prev?.messages ?? [])]
          const idx = msgs.findIndex((m) => m.id === streamId)
          if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
          else if (!msgs.length) msgs.push(row)
          return {
            personaName,
            draft: prev?.draft ?? '',
            busy: false,
            error: null,
            write: assistWrite,
            bundleId: assistBundleId,
            messages: msgs,
          }
        })
      })
    }, CHAT_PEEL_MS)
    return
  }

  const handleTalkSend = (text: string) => {
    if (policyHold) return
    if (!shownLanding || !talk) return
    const trimmed = text.trim()
    if (
      !shouldAcceptTalkSend({
        busy: Boolean(talk.busy),
        sending: talkSendingRef.current,
        text: trimmed,
      })
    ) {
      return
    }
    talkSendingRef.current = true
    const probeId =
      talk.context.topic.probes[talk.state.activeProbeIndex]?.id ?? null
    const optimisticId = `opt_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
    const streamId = `stream_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
    const retrying = isRepeatOfLastCandidate(talk.state.messages, trimmed)
    // Show the candidate bubble immediately — do not wait for Edge.
    setTalk({
      ...talk,
      busy: true,
      error: null,
      state: {
        ...talk.state,
        draft: '',
        messages: retrying
          ? talk.state.messages
          : [
              ...talk.state.messages,
              {
                id: optimisticId,
                role: 'candidate',
                text: trimmed,
                at: Date.now(),
                probeId,
                kind: 'answer',
              },
            ],
      },
    })
    void runTalkTurn({
      briefId: runBriefId,
      landing: shownLanding,
      text: trimmed,
      brief: runBrief,
      onComposeDelta: (full) => {
        setTalk((prev) => {
          if (!prev) return prev
          const msgs = [...prev.state.messages]
          const streamIdx = msgs.findIndex((m) => m.id === streamId)
          if (streamIdx >= 0) {
            msgs[streamIdx] = { ...msgs[streamIdx]!, text: full }
          } else {
            msgs.push({
              id: streamId,
              role: 'assistant',
              text: full,
              at: 0,
              probeId,
              kind: 'follow_up',
            })
          }
          return {
            ...prev,
            busy: true,
            error: null,
            state: { ...prev.state, messages: msgs },
          }
        })
      },
    })
      .then((snap) => {
        setTalk((prev) => stabilizeTalkViewIds(prev, snap.talk))
      })
      .finally(() => {
        talkSendingRef.current = false
      })
  }

  const handleTalkDraftChange = (draft: string) => {
    const view = runTalkDraft({ briefId: runBriefId, draft })
    if (view) setTalk(view)
  }

  const handleTalkMenu = (action: TalkMenuAction) => {
    if (!shownLanding) return
    void runTalkMenu({
      briefId: runBriefId,
      landing: shownLanding,
      action,
      brief: runBrief,
    }).then((snap) => {
      setTalk(snap.talk)
      if (action === 'reset_talk') {
        setStageStarted(true)
        setChatClosed(true)
      }
    })
  }

  const handleAssistDraftChange = (draft: string) => {
    setAssist((prev) => (prev ? { ...prev, draft } : prev))
  }

  const persistOpenCapture = () => {
    const artifact = liveArtifactRef.current
    flushAndPersistCapture(
      artifact
        ? {
            kind: artifact.kind,
            live: artifact.kind === 'form' ? artifact.document : artifact.payload,
          }
        : null,
    )
    flushSessionTelemetry()
  }

  const handleLiveCompositionChange = (event: GateLiveCompositionEvent) => {
    let next: AssistLiveComposition | null = null
    if (event.kind === 'form') {
      liveArtifactRef.current = { kind: 'form', document: event.document }
      next = sanitizeFormLiveComposition(event.document)
    } else if (event.kind === 'coding') {
      liveArtifactRef.current = { kind: 'coding', payload: event.payload }
      next = sanitizeCodingLiveComposition(event.payload, {
        focusPath: String(event.payload.activeId ?? '') || null,
        attachedPaths: codingExtraAttachRef.current,
      })
    } else {
      liveArtifactRef.current = { kind: 'doc', payload: event.payload }
      const minWords =
        toolMount?.kind === 'doc' ? toolMount.minWords : null
      const maxWords =
        toolMount?.kind === 'doc' ? toolMount.maxWords : null
      next = sanitizeDocLiveComposition(event.payload, { minWords, maxWords })
    }
    liveStageCompositionRef.current = next
    setLiveStageComposition(next)
    Capture.tick({
      kind: event.kind,
      live: event.kind === 'form' ? event.document : event.payload,
    })
  }

  const handleAssistSend = (text: string) => {
    if (policyHold) return
    if (!gate || !assist || !toolMount || !runBrief) return
    if (pendingEdits.length > 0) return
    const trimmed = text.trim()
    if (!trimmed || assist.busy) return
    const retrying = isRepeatOfLastCandidate(assist.messages, trimmed)
    const candidateMsg = {
      id: `assist-c-${Date.now()}`,
      role: 'candidate' as const,
      text: trimmed,
      at: nowIso(),
    }
    const expired = assist.messages.map((m) =>
      m.pendingStatus === 'pending' ? { ...m, pendingStatus: 'expired' as const } : m,
    )
    const nextMessages = retrying ? expired : [...expired, candidateMsg]
    copilotPendingRef.current = null
    copilotPendingPlanRef.current = null
    copilotRepairCountRef.current = 0
    setAssist({
      ...assist,
      messages: nextMessages,
      draft: '',
      busy: true,
      error: null,
      pendingEditRunId: null,
    })

    if (isCopilotWritePeel(gate.assistChrome)) {
      const persisted = persistAssistCandidateMessage({
        briefId: runBriefId,
        phaseId: gate.phaseId,
        text: trimmed,
        id: candidateMsg.id,
      })
      candidateMsg.at = persisted.message.at
      const hostRef = toolRefForPhase(runBrief, gate.phaseId)
      if (hostRef && (toolMount.kind === 'coding' || toolMount.kind === 'doc')) {
        enqueueAssistTurnMark({
          briefId: runBriefId,
          hostRef,
          phaseId: gate.phaseId,
          messageId: persisted.message.id,
          message: persisted.message,
          liveComposition: compositionForAssistSend(),
        })
      }
      assistAbortRef.current?.abort()
      const ac = new AbortController()
      assistAbortRef.current = ac
      const streamId = `assist-a-${Date.now().toString(36)}`
      copilotGenerationRef.current += 1
      const generation = copilotGenerationRef.current
      void (async () => {
        const liveCtx = contextForCopilotSend()
        const liveDoc = buildCopilotLiveDoc({
          kind: toolMount.kind,
          generation,
          context: liveCtx,
          selection:
            toolMount.kind === 'coding'
              ? { path: codingFocusPathRef.current || undefined }
              : undefined,
          diagnostics:
            toolMount.kind === 'coding'
              ? diagnosticsFromCodeRun(lastVisibleCodeRunRef.current)
              : undefined,
        })
        const remainingMs = hardDeadlineAt ? hardTimerRemainingMs(hardDeadlineAt) : UNTIMED_COPILOT_BUDGET_MS
        const previousTitle = shownLanding
          ? previousGateTitle({
              sections: shownLanding.sections,
              currentPhaseId: gate.phaseId,
              completedPhaseIds,
              skippedPhaseIds,
            })
          : null
        const dayPack = buildAssistDayContinuity({
          response: ensureInterviewResponse(runBriefId),
          currentPhaseId: gate.phaseId,
          previousSectionTitle: previousTitle,
        })
        const lastAssistant =
          [...nextMessages].reverse().find((m) => m.role === 'assistant')?.text ?? null
        const copilotDay = await retrieveCopilotDayMemory({
          briefId: runBriefId,
          brief: runBrief,
          phaseId: gate.phaseId,
          candidateText: trimmed,
          lastAssistantText: lastAssistant,
          leanDay: dayPack,
          sectionIds: (shownLanding?.sections ?? []).map((s) => ({
            phaseId: s.id,
            title: s.title,
          })),
          gateTitle: gate.title,
          response: ensureInterviewResponse(runBriefId),
        })
        let questionnaireShown = false
        await runCopilotEditPlan(
          {
            briefId: runBriefId,
            liveDoc,
            history: assistHistoryForCopilot(nextMessages),
            persona: copilotPersonaPayload(runBrief),
            privileges: {
              caps: {
                write: true,
                chat: true,
                spoilers: Boolean(gate.assistChrome?.caps.spoilers),
              },
            },
            remainingMs,
            userMessage: trimmed,
            day: copilotDay,
            editMemory: copilotEditMemoryRef.current,
            sectionContract: buildAssistSectionContract({
              phaseId: gate.phaseId,
              title: gate.title || toolMount.title,
              kind: toolMount.kind,
              purpose: toolMount.instructions,
              bundleId: gate.assistChrome?.bundleId,
              caps: gate.assistChrome?.caps,
            }),
          },
          {
            signal: ac.signal,
            handlers: {
              onReplyDelta: (full) => {
                setAssist((prev) => {
                  if (!prev) return prev
                  const msgs = [...prev.messages]
                  const idx = msgs.findIndex((m) => m.id === streamId)
                  const row = { id: streamId, role: 'assistant' as const, text: full }
                  if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
                  else msgs.push(row)
                  return { ...prev, busy: true, messages: msgs }
                })
              },
              onReplyParts: (parts) => {
                const mapped = mapCopilotReplyParts(parts as InterviewEditMessagePart[])
                const textOut = copilotReplyText(mapped)
                setAssist((prev) => {
                  if (!prev) return prev
                  const msgs = [...prev.messages]
                  const idx = msgs.findIndex((m) => m.id === streamId)
                  const existing = idx >= 0 ? msgs[idx]?.parts : undefined
                  const row = {
                    id: streamId,
                    role: 'assistant' as const,
                    text: questionnaireShown ? (idx >= 0 ? msgs[idx]!.text : '') : textOut,
                    parts: questionnaireShown ? keepCopilotQuestionnaireSheet(existing) : mapped,
                  }
                  if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
                  else msgs.push(row)
                  return { ...prev, busy: true, messages: msgs }
                })
              },
              onQuestionnaire: (q) => {
                questionnaireShown = true
                setAssist((prev) => {
                  if (!prev) return prev
                  const msgs = [...prev.messages]
                  const idx = msgs.findIndex((m) => m.id === streamId)
                  const planning = {
                    type: 'planning' as const,
                    title: q.title,
                    questions: q.questions,
                    editRunId: q.editRunId,
                    timeoutMs: q.timeoutMs,
                    deadlineAt: q.deadlineAt,
                    summary: 'Answer questionnaire',
                  }
                  const row = {
                    id: streamId,
                    role: 'assistant' as const,
                    text: '',
                    parts: [planning],
                    editRunId: q.editRunId,
                  }
                  if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
                  else msgs.push(row)
                  return { ...prev, busy: false, pendingEditRunId: q.editRunId, messages: msgs }
                })
              },
              onDone: (result) => {
                if (ac.signal.aborted) return
                const meta = result.meta ?? {}
                const injectDrops = Array.isArray(meta.guardDrops) ? meta.guardDrops : []
                logSittingInjectMiss('copilot', injectDrops)
                const diagReply = copilotReplyText(result.replyParts)
                logSittingTurnDebug({
                  surface: 'copilot',
                  userMessage: trimmed,
                  replyMarkdown: diagReply,
                  meta,
                  editMemory: copilotEditMemoryRef.current,
                })
                const peelMiss = sittingInjectPeelMiss(injectDrops)
                const peelMissError = peelMiss ? copilotApplyMissReason('inject_miss_peel') : null
                if (questionnaireShown) {
                  const pendingPlan = meta.pendingPlan
                  if (pendingPlan && typeof pendingPlan === 'object') {
                    copilotPendingPlanRef.current = pendingPlan as Record<string, unknown>
                  }
                  setAssist((prev) => {
                    if (!prev) return prev
                    const msgs = [...prev.messages]
                    const idx = msgs.findIndex((m) => m.id === streamId)
                    const existing = idx >= 0 ? msgs[idx]?.parts : undefined
                    const row = {
                      id: streamId,
                      role: 'assistant' as const,
                      text: idx >= 0 ? msgs[idx]!.text : '',
                      parts: keepCopilotQuestionnaireSheet(existing),
                      editRunId: result.editRunId,
                    }
                    if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
                    else msgs.push(row)
                    return {
                      ...prev,
                      busy: false,
                      error: peelMissError,
                      write: true,
                      pendingEditRunId: result.editRunId ?? prev.pendingEditRunId,
                      messages: msgs,
                    }
                  })
                  return
                }
                const pending = Boolean(meta.pending)
                const ops = Array.isArray(meta.ops) ? (meta.ops as CopilotOp[]) : []
                const steps = Array.isArray(meta.steps) ? meta.steps : []
                const mapped = mapCopilotReplyParts((result.replyParts ?? []) as InterviewEditMessagePart[])
                const textOut = copilotReplyText(mapped) || 'Proposed a change.'
                if (pending && result.editRunId) {
                  copilotPendingRef.current = {
                    editRunId: result.editRunId,
                    ops,
                    steps,
                    snapshotHash: String(meta.snapshotHash ?? liveDoc.snapshotHash),
                    generation: Number(meta.generation ?? generation),
                    messageId: streamId,
                  }
                }
                const sentAt = stampChatSendAt()
                const saved = persistAssistAssistantMessage({
                  briefId: runBriefId,
                  phaseId: gate.phaseId,
                  text: textOut,
                  id: streamId,
                })
                setAssist((prev) => {
                  if (!prev) return prev
                  const msgs = [...prev.messages]
                  const idx = msgs.findIndex((m) => m.id === streamId)
                  const row = {
                    id: streamId,
                    role: 'assistant' as const,
                    text: textOut,
                    parts: mapped,
                    pendingStatus: pending ? ('pending' as const) : undefined,
                    editRunId: result.editRunId,
                    at: saved?.message.at ?? sentAt,
                  }
                  if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
                  else msgs.push(row)
                  return {
                    ...prev,
                    busy: false,
                    error: peelMissError,
                    write: true,
                    pendingEditRunId: pending ? result.editRunId ?? null : null,
                    messages: msgs,
                  }
                })
                if (pending && ops.length) {
                  runCopilotPropose(ops, Number(meta.generation ?? generation), streamId, steps)
                }
              },
            },
          },
        )
      })()
        .catch((e: unknown) => {
          if (ac.signal.aborted) return
          logSittingTurnDebug({
            surface: 'copilot',
            userMessage: trimmed,
            replyMarkdown: '',
            error: e,
            editMemory: copilotEditMemoryRef.current,
          })
          setAssist((prev) => (prev ? { ...prev, busy: false, error: assistErrorCode(e), write: true } : prev))
        })
      return
    }

    ensureInterviewResponse(runBriefId)
    const candidatePersisted = appendResponseMessage(ensureInterviewResponse(runBriefId), {
      id: candidateMsg.id,
      at: candidateMsg.at,
      phaseId: gate.phaseId,
      topicId: null,
      role: 'candidate',
      text: trimmed,
      probeId: null,
      kind: 'answer',
    })
    candidateMsg.at = candidatePersisted.message.at
    const coachHost = toolRefForPhase(runBrief, gate.phaseId)
    if (coachHost && (toolMount.kind === 'coding' || toolMount.kind === 'doc')) {
      enqueueAssistTurnMark({
        briefId: runBriefId,
        hostRef: coachHost,
        phaseId: gate.phaseId,
        messageId: candidatePersisted.message.id,
        message: candidatePersisted.message,
        liveComposition: compositionForAssistSend(),
      })
    }

    const situation = inferAssistSituation(trimmed, gate.assistChrome?.caps)
    const previousTitle = shownLanding
      ? previousGateTitle({
          sections: shownLanding.sections,
          currentPhaseId: gate.phaseId,
          completedPhaseIds,
          skippedPhaseIds,
        })
      : null
    const response = ensureInterviewResponse(runBriefId)
    const dayPack = buildAssistDayContinuity({
      response,
      currentPhaseId: gate.phaseId,
      previousSectionTitle: previousTitle,
    })
    const leanDay = {
      continuing: dayPack.continuing,
      previousSectionTitle: dayPack.previousSectionTitle,
      priorNote: dayPack.priorNote,
      standingNotes: dayPack.standingNotes,
      dayHistoryTail: dayPack.dayHistoryTail,
    }
    const lastAssistant =
      [...nextMessages].reverse().find((m) => m.role === 'assistant')?.text ?? null
    const sectionIds = (shownLanding?.sections ?? []).map((s) => ({
      phaseId: s.id,
      title: s.title,
    }))

    const streamId = `assist-a-${Date.now().toString(36)}`
    const timer = buildAssistTimerPack({
      timed: gate.timed,
      limitMinutes: gate.limitMinutes,
      deadlineAt: hardDeadlineAt,
    })

    void runAssistMemoryCompose({
      briefId: runBriefId,
      brief: runBrief,
      phaseId: gate.phaseId,
      timed: gate.timed,
      limitMinutes: gate.limitMinutes,
      mount: toolMount,
      candidateText: trimmed,
      lastAssistantText: lastAssistant,
      situation,
      leanDay,
      historyTail: nextMessages.map((m) => ({
        role: m.role,
        text: m.text,
        ...(m.at?.trim() ? { at: m.at.trim() } : {}),
      })),
      response,
      sectionIds,
      gateTitle: gate.title,
      liveComposition: compositionForAssistSend() ?? liveStageComposition,
      timer,
      onComposeDelta: (full) => {
        setAssist((prev) => {
          if (!prev) return prev
          const msgs = [...prev.messages]
          const idx = msgs.findIndex((m) => m.id === streamId)
          if (idx >= 0) {
            msgs[idx] = { ...msgs[idx]!, text: full }
          } else {
            msgs.push({
              id: streamId,
              role: 'assistant',
              text: full,
            })
          }
          return {
            ...prev,
            busy: true,
            error: null,
            messages: msgs,
          }
        })
      },
    })
      .then((payload) => {
        const { utterance, composeMeta, planResult, expanded } = payload
        logSittingInjectMiss('assist', composeMeta.injectMiss)
        logSittingTurnDebug({
          surface: 'assist',
          userMessage: trimmed,
          replyMarkdown: utterance,
          meta: composeMeta as unknown as Record<string, unknown>,
          editMemory: copilotEditMemoryRef.current,
        })
        const peelMissError = sittingInjectPeelMiss(composeMeta.injectMiss)
          ? copilotApplyMissReason('inject_miss_peel')
          : null
        if (!utterance.trim()) {
          setAssist((prev) =>
            prev
              ? {
                  ...prev,
                  busy: false,
                  error: 'unknown',
                }
              : prev,
          )
          return
        }
        const sentAt = stampChatSendAt()
        const assistantMsg = {
          id: streamId,
          role: 'assistant' as const,
          text: utterance,
          at: sentAt,
        }
        const saved = appendResponseMessage(ensureInterviewResponse(runBriefId), {
          id: streamId,
          at: sentAt,
          phaseId: gate.phaseId,
          topicId: null,
          role: 'assistant',
          text: utterance,
          probeId: null,
          kind: 'assist',
          compose: {
            situation: composeMeta.situation,
            missingGaps: [],
            sampleIdsUsed: [
              ...composeMeta.sampleIdsUsed,
              ...planResult.composeMeta.sampleIdsUsed,
            ],
            model: composeMeta.model,
            memoryPlan: {
              needs: planResult.plan.needs.map((n) => n.sourceId),
              sampleIdsUsed: planResult.composeMeta.sampleIdsUsed,
              model: planResult.composeMeta.model,
              skipped: Boolean(planResult.composeMeta.skipped) || expanded,
            },
          },
        })
        assistantMsg.at = saved.message.at
        setAssist((prev) => {
          if (!prev) return prev
          const msgs = [...prev.messages]
          const idx = msgs.findIndex((m) => m.id === streamId)
          if (idx >= 0) {
            msgs[idx] = assistantMsg
          } else {
            msgs.push(assistantMsg)
          }
          return {
            ...prev,
            messages: msgs,
            busy: false,
            error: peelMissError,
          }
        })
      })
      .catch((e: unknown) => {
        logSittingTurnDebug({
          surface: 'assist',
          userMessage: trimmed,
          replyMarkdown: '',
          error: e,
        })
        setAssist((prev) => (prev ? { ...prev, busy: false, error: assistErrorCode(e) } : prev))
      })
  }

  const handleAssistCardAction = (actionId: string, value?: string) => {
    const handle = liveEditorHandleRef.current
    if (actionId === 'copilot.action.apply-pending') {
      const pending = copilotPendingRef.current
      const markMiss = (reason: string, messageId?: string) => {
        setAssist((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            pendingEditRunId: null,
            error: copilotApplyMissReason(reason),
            messages: prev.messages.map((m) =>
              messageId
                ? m.id === messageId
                  ? { ...m, pendingStatus: 'miss' as const }
                  : m
                : m.pendingStatus === 'pending'
                  ? { ...m, pendingStatus: 'miss' as const }
                  : m,
            ),
          }
        })
      }
      if (!pending || pending.editRunId !== assist?.pendingEditRunId) {
        markMiss('stale_pending', pending?.messageId)
        return
      }
      if (!pending.ops.length) {
        markMiss('no_ops', pending.messageId)
        return
      }
      runCopilotPropose(pending.ops, pending.generation, pending.messageId, pending.steps)
      return
    }
    if (actionId === 'copilot.action.go-to-question' && value) handle?.revealQuestion?.(value)
    if (actionId === 'copilot.action.go-to-file' && value) handle?.revealFileRange?.(value)
    if (actionId === 'copilot.action.go-to-essay') handle?.revealEssayRange?.(undefined, undefined, value)
    if (actionId === 'copilot.action.go-to-terminal') handle?.revealTerminal?.()
    if (actionId === 'copilot.action.go-to-edit') handle?.revealEssayRange?.()
  }

  const handleAssistQuestionnaire = (answers: Record<string, string | string[]>, skipped?: boolean) => {
    if (!gate || !assist || !toolMount) return
    if (!isCopilotWritePeel(gate.assistChrome)) return
    assistAbortRef.current?.abort()
    const ac = new AbortController()
    assistAbortRef.current = ac
    copilotGenerationRef.current += 1
    const generation = copilotGenerationRef.current
    const streamId = `assist-a-${Date.now().toString(36)}`
    setAssist((prev) =>
      prev
        ? {
            ...prev,
            busy: true,
            error: null,
            messages: prev.messages.map((m) =>
              m.parts?.some((p) => p.type === 'planning' && !('answered' in p && p.answered))
                ? {
                    ...m,
                    parts: m.parts?.map((p) =>
                      p.type === 'planning' ? { ...p, answered: true, collapsed: true, answers } : p,
                    ),
                  }
                : m,
            ),
          }
        : prev,
    )
    const liveCtx = contextForCopilotSend()
    const liveDoc = buildCopilotLiveDoc({
      kind: toolMount.kind,
      generation,
      context: liveCtx,
      selection:
        toolMount.kind === 'coding'
          ? { path: codingFocusPathRef.current || undefined }
          : undefined,
      diagnostics:
        toolMount.kind === 'coding'
          ? diagnosticsFromCodeRun(lastVisibleCodeRunRef.current)
          : undefined,
    })
    const remainingMs = hardDeadlineAt ? hardTimerRemainingMs(hardDeadlineAt) : UNTIMED_COPILOT_BUDGET_MS
    const previousTitle = shownLanding
      ? previousGateTitle({
          sections: shownLanding.sections,
          currentPhaseId: gate.phaseId,
          completedPhaseIds,
          skippedPhaseIds,
        })
      : null
    const dayPack = buildAssistDayContinuity({
      response: ensureInterviewResponse(runBriefId),
      currentPhaseId: gate.phaseId,
      previousSectionTitle: previousTitle,
    })
    const lastAssistant =
      [...assist.messages].reverse().find((m) => m.role === 'assistant')?.text ?? null
    const continueAsk = skipped ? '(skipped)' : JSON.stringify(answers)
    let questionnaireShown = false
    void (async () => {
      const copilotDay = await retrieveCopilotDayMemory({
        briefId: runBriefId,
        brief: runBrief,
        phaseId: gate.phaseId,
        candidateText: continueAsk,
        lastAssistantText: lastAssistant,
        leanDay: dayPack,
        sectionIds: (shownLanding?.sections ?? []).map((s) => ({
          phaseId: s.id,
          title: s.title,
        })),
        gateTitle: gate.title,
        response: ensureInterviewResponse(runBriefId),
      })
      await runCopilotEditContinue(
      {
        briefId: runBriefId,
        liveDoc,
        history: assistHistoryForCopilot(assist.messages),
        persona: copilotPersonaPayload(runBrief),
        privileges: {
          caps: {
            write: true,
            chat: true,
            spoilers: Boolean(gate.assistChrome?.caps.spoilers),
          },
        },
        remainingMs,
        editRunId: assist.pendingEditRunId ?? undefined,
        answers,
        skipped: Boolean(skipped),
        pendingPlan: copilotPendingPlanRef.current ?? undefined,
        day: copilotDay,
        editMemory: copilotEditMemoryRef.current,
        sectionContract: buildAssistSectionContract({
          phaseId: gate.phaseId,
          title: gate.title || toolMount.title,
          kind: toolMount.kind,
          purpose: toolMount.instructions,
          bundleId: gate.assistChrome?.bundleId,
          caps: gate.assistChrome?.caps,
        }),
      },
      {
        signal: ac.signal,
        handlers: {
          onReplyParts: (parts) => {
            const mapped = mapCopilotReplyParts(parts as InterviewEditMessagePart[])
            const textOut = copilotReplyText(mapped)
            setAssist((prev) => {
              if (!prev) return prev
              const msgs = [...prev.messages]
              const idx = msgs.findIndex((m) => m.id === streamId)
              const existing = idx >= 0 ? msgs[idx]?.parts : undefined
              const row = {
                id: streamId,
                role: 'assistant' as const,
                text: questionnaireShown ? (idx >= 0 ? msgs[idx]!.text : '') : textOut,
                parts: questionnaireShown ? keepCopilotQuestionnaireSheet(existing) : mapped,
              }
              if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
              else msgs.push(row)
              return { ...prev, busy: true, messages: msgs }
            })
          },
          onQuestionnaire: (q) => {
            questionnaireShown = true
            setAssist((prev) => {
              if (!prev) return prev
              const msgs = [...prev.messages]
              const idx = msgs.findIndex((m) => m.id === streamId)
              const planning = {
                type: 'planning' as const,
                title: q.title,
                questions: q.questions,
                editRunId: q.editRunId,
                timeoutMs: q.timeoutMs,
                deadlineAt: q.deadlineAt,
                summary: 'Answer questionnaire',
              }
              const row = {
                id: streamId,
                role: 'assistant' as const,
                text: '',
                parts: [planning],
                editRunId: q.editRunId,
              }
              if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
              else msgs.push(row)
              return { ...prev, busy: false, pendingEditRunId: q.editRunId, messages: msgs }
            })
          },
          onDone: (result) => {
            if (ac.signal.aborted) return
            const meta = result.meta ?? {}
            const injectDrops = Array.isArray(meta.guardDrops) ? meta.guardDrops : []
            logSittingInjectMiss('copilot', injectDrops)
            const diagReply = copilotReplyText(result.replyParts)
            logSittingTurnDebug({
              surface: 'copilot',
              userMessage: continueAsk,
              replyMarkdown: diagReply,
              meta,
              editMemory: copilotEditMemoryRef.current,
            })
            const peelMissError = sittingInjectPeelMiss(injectDrops)
              ? copilotApplyMissReason('inject_miss_peel')
              : null
            if (questionnaireShown) {
              const pendingPlan = meta.pendingPlan
              if (pendingPlan && typeof pendingPlan === 'object') {
                copilotPendingPlanRef.current = pendingPlan as Record<string, unknown>
              }
              setAssist((prev) => {
                if (!prev) return prev
                const msgs = [...prev.messages]
                const idx = msgs.findIndex((m) => m.id === streamId)
                const existing = idx >= 0 ? msgs[idx]?.parts : undefined
                const row = {
                  id: streamId,
                  role: 'assistant' as const,
                  text: idx >= 0 ? msgs[idx]!.text : '',
                  parts: keepCopilotQuestionnaireSheet(existing),
                  editRunId: result.editRunId,
                }
                if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
                else msgs.push(row)
                return {
                  ...prev,
                  busy: false,
                  error: peelMissError,
                  write: true,
                  pendingEditRunId: result.editRunId ?? prev.pendingEditRunId,
                  messages: msgs,
                }
              })
              return
            }
            const mapped = mapCopilotReplyParts((result.replyParts ?? []) as InterviewEditMessagePart[])
            const textOut = copilotReplyText(mapped)
            const pending = Boolean(meta.pending)
            const ops = Array.isArray(meta.ops) ? (meta.ops as CopilotOp[]) : []
            const steps = Array.isArray(meta.steps) ? meta.steps : []
            if (pending && result.editRunId) {
              copilotPendingRef.current = {
                editRunId: result.editRunId,
                ops,
                steps,
                snapshotHash: String(meta.snapshotHash ?? liveDoc.snapshotHash),
                generation: Number(meta.generation ?? generation),
                messageId: streamId,
              }
            }
            const sentAt = stampChatSendAt()
            const saved = persistAssistAssistantMessage({
              briefId: runBriefId,
              phaseId: gate.phaseId,
              text: textOut,
              id: streamId,
            })
            setAssist((prev) => {
              if (!prev) return prev
              const msgs = [...prev.messages]
              const idx = msgs.findIndex((m) => m.id === streamId)
              const row = {
                id: streamId,
                role: 'assistant' as const,
                text: textOut,
                parts: mapped,
                pendingStatus: pending ? ('pending' as const) : undefined,
                editRunId: result.editRunId,
                at: saved?.message.at ?? sentAt,
              }
              if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
              else msgs.push(row)
              return {
                ...prev,
                busy: false,
                error: peelMissError,
                write: true,
                pendingEditRunId: pending ? result.editRunId ?? null : null,
                messages: msgs,
              }
            })
            if (pending && ops.length) {
              runCopilotPropose(ops, Number(meta.generation ?? generation), streamId, steps)
            }
          },
        },
      },
    ).catch((e: unknown) => {
      if (ac.signal.aborted) return
      logSittingTurnDebug({
        surface: 'copilot',
        userMessage: continueAsk,
        replyMarkdown: '',
        error: e,
        editMemory: copilotEditMemoryRef.current,
      })
      setAssist((prev) => (prev ? { ...prev, busy: false, error: assistErrorCode(e), write: true } : prev))
    })
    })()
  }

  useEffect(() => {
    verifyModalRef.current = verifyModal
  }, [verifyModal])

  useEffect(() => {
    verifyCodingModalRef.current = verifyCodingModal
  }, [verifyCodingModal])

  useEffect(() => {
    verifyEssayModalRef.current = verifyEssayModal
  }, [verifyEssayModal])

  useEffect(() => {
    verifyFormModalRef.current = verifyFormModal
  }, [verifyFormModal])

  useEffect(() => {
    assessorAidRef.current = assessorAid
  }, [assessorAid])

  useEffect(() => {
    const key = verifySection?.sectionKey
    const rollup = runBrief?.analysis?.rollup
    const isTalk = Boolean(key && isTalkVerifySectionKey(key, rollup))
    const isResultReview = Boolean(key && isResultReviewSectionKey(key))
    const toolKind = key ? resolveToolVerifyKind(key, rollup) : null

    if (!verifySection || (!isTalk && !toolKind && !isResultReview)) {
      setVerifyModal(null)
      setVerifyCodingModal(null)
      setVerifyEssayModal(null)
      setVerifyFormModal(null)
      setVerifyBusy(false)
      setVerifyRevealMessageCount(0)
      setVerifyShowMarkingRail(false)
      return
    }

    const seq = ++verifySeqRef.current
    let cancelled = false
    const timers: number[] = []
    const schedule = (ms: number, fn: () => void) => {
      if (cancelled || verifySeqRef.current !== seq) return
      const id = window.setTimeout(() => {
        if (cancelled || verifySeqRef.current !== seq) return
        fn()
      }, ms)
      timers.push(id)
    }

    // Keep Verify shell empty while ScaleCover rises — do not mount chat/rail mid-flight.
    setVerifyBusy(true)
    setVerifyModal(null)
    setVerifyCodingModal(null)
    setVerifyEssayModal(null)
    setVerifyFormModal(null)
    setVerifyRevealMessageCount(0)
    setVerifyShowMarkingRail(false)
    setAssessorAid(null)
    // Stale card from the last overlay would answer for the wrong section.
    assessorAidReportRef.current = null
    setChatClosed(true)

    /** ScaleCover page duration (1.25s) + cover offset + settle buffer. */
    const COVER_SETTLE_MS = 1400
    /** Dashboard peel width transition (`--dash-peel-duration` = 0.56s). */
    const PEEL_SETTLE_MS = 580
    const BATCH = 4
    const BATCH_MS = 40

    const brief = runBrief ?? pageFixtureBrief
    const attemptKey = runBriefId
    const livePromise = Promise.resolve().then(() => {
      if (isResultReview) {
        return { kind: 'resultReview' as const }
      }
      const response = getInterviewResponse(attemptKey)
      const scored = scoreAttempt({ brief, response })
      const tapePacks = {
        live: tapesPackFromStore(attemptKey),
        fixture: null,
      }
      const talkSectionsMeta = talkSectionsMetaFromBrief(brief)
      if (isTalk) {
        const briefTalkSections = talkVerifyBriefSections(brief)
        return {
          kind: 'talk' as const,
          modal: buildTalkVerifyModal({
            fixtureId: attemptKey,
            sectionKey: verifySection.sectionKey,
            sectionLabel: verifySection.label,
            response,
            scored,
            briefTalkSections,
            talkSectionsMeta,
          }),
        }
      }
      if (toolKind === 'coding') {
        return {
          kind: 'coding' as const,
          modal: buildCodingVerifyModal({
            fixtureId: attemptKey,
            sectionKey: verifySection.sectionKey,
            sectionLabel: verifySection.label,
            response,
            scored,
            brief,
            tapePacks,
          }),
        }
      }
      if (toolKind === 'essay') {
        return {
          kind: 'essay' as const,
          modal: buildEssayVerifyModal({
            fixtureId: attemptKey,
            sectionKey: verifySection.sectionKey,
            sectionLabel: verifySection.label,
            response,
            scored,
            brief,
            tapePacks,
          }),
        }
      }
      return {
        kind: 'form' as const,
        modal: buildFormVerifyModal({
          fixtureId: attemptKey,
          sectionKey: verifySection.sectionKey,
          sectionLabel: verifySection.label,
          response,
          scored,
          brief,
          tapePacks,
        }),
      }
    })

    let resolveCover: (() => void) | null = null
    const coverReady = new Promise<void>((resolve) => {
      resolveCover = resolve
      schedule(COVER_SETTLE_MS, () => resolve())
    })

    const startAidOpen = (modal: AssessorAidModalLike) => {
      schedule(100, () => {
        const existing = loadAssessorAidConversation(attemptKey, verifySection.sectionKey)
        const needsOpen = aidConversationNeedsOpen(existing.messages)
        setAssessorAid({
          messages: needsOpen ? [] : existing.messages,
          draft: existing.draft,
          busy: needsOpen,
          error: null,
          personaName: 'Assessor Aid',
        })
        setChatClosed(false)
        schedule(PEEL_SETTLE_MS, () => {
          if (isTalk) setVerifyShowMarkingRail(true)
          if (!needsOpen) return
          schedule(120, () => {
            const streamId = `aid-open-${Date.now().toString(36)}`
            void runAssessorAidOpen({
              fixtureKey: attemptKey,
              sectionKey: verifySection.sectionKey,
              briefId: runBriefId,
              modal,
              report: assessorAidReportRef.current,
              onComposeDelta: (full) => {
                if (cancelled || verifySeqRef.current !== seq) return
                setAssessorAid((prev) => {
                  if (!prev) return prev
                  const msgs = [...prev.messages]
                  const idx = msgs.findIndex((m) => m.id === streamId)
                  const row = { id: streamId, role: 'assistant' as const, text: full }
                  if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
                  else msgs.push(row)
                  return { ...prev, messages: msgs, busy: true, error: null }
                })
              },
            })
              .then((open) => {
                if (cancelled || verifySeqRef.current !== seq) return
                logSittingTurnDebug({
                  surface: 'aid',
                  userMessage: '(open)',
                  replyMarkdown: open.utterance,
                  meta: {
                    situation: 'open',
                    from: open.from,
                    packDiag: formatAidPackDiag(
                      buildAssessorAidContext({
                        modal,
                        report: assessorAidReportRef.current,
                      }),
                    ),
                  },
                })
                const sentAt = stampChatSendAt()
                setAssessorAid((prev) => {
                  const row = {
                    id: streamId,
                    role: 'assistant' as const,
                    text: open.utterance,
                    at: sentAt,
                  }
                  const msgs = [...(prev?.messages ?? [])]
                  const idx = msgs.findIndex((m) => m.id === streamId)
                  if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
                  else msgs.push(row)
                  return {
                    messages: msgs,
                    draft: prev?.draft ?? '',
                    busy: false,
                    error: null,
                    personaName: 'Assessor Aid',
                  }
                })
              })
              .catch((e: unknown) => {
                if (cancelled || verifySeqRef.current !== seq) return
                logSittingTurnDebug({
                  surface: 'aid',
                  userMessage: '(open)',
                  replyMarkdown: '',
                  error: e,
                  meta: {
                    situation: 'open',
                    packDiag: formatAidPackDiag(
                      buildAssessorAidContext({
                        modal,
                        report: assessorAidReportRef.current,
                      }),
                    ),
                  },
                })
                const code =
                  e instanceof DataApiError
                    ? e.code
                    : e instanceof Error && /openai|missing_openai/i.test(e.message)
                      ? 'missing_openai_key'
                      : 'unknown'
                setAssessorAid((prev) => (prev ? { ...prev, busy: false, error: code } : prev))
              })
          })
        })
      })
    }

    void Promise.all([livePromise, coverReady])
      .then(([built]) => {
        if (cancelled || verifySeqRef.current !== seq) return
        setVerifyBusy(false)
        setVerifyRevealMessageCount(0)
        setVerifyShowMarkingRail(false)

        if (built.kind === 'resultReview') {
          return
        }

        if (built.kind === 'talk') {
          setVerifyModal(built.modal)
          const total = built.modal.messages.length
          let painted = 0
          const paintNext = () => {
            if (cancelled || verifySeqRef.current !== seq) return
            painted = Math.min(total, painted + BATCH)
            setVerifyRevealMessageCount(painted)
            if (painted < total) {
              schedule(BATCH_MS, paintNext)
              return
            }
            startAidOpen(built.modal)
          }
          schedule(60, paintNext)
          return
        }

        if (built.kind === 'coding') {
          setVerifyCodingModal(built.modal)
          startAidOpen(built.modal)
          return
        }
        if (built.kind === 'essay') {
          setVerifyEssayModal(built.modal)
          startAidOpen(built.modal)
          return
        }
        setVerifyFormModal(built.modal)
        startAidOpen(built.modal)
      })
      .catch((err) => {
        if (cancelled || verifySeqRef.current !== seq) return
        console.error('[InterviewPage] verify live pack failed', err)
        setVerifyBusy(false)
        setVerifyModal(null)
        setVerifyCodingModal(null)
        setVerifyEssayModal(null)
        setVerifyFormModal(null)
      })

    return () => {
      cancelled = true
      resolveCover?.()
      for (const id of timers) window.clearTimeout(id)
    }
  }, [verifySection, runBrief, runBriefId])

  const isAnyVerifySectionKey = (key: string) =>
    isTalkVerifySectionKey(key, runBrief?.analysis?.rollup) ||
    isResultReviewSectionKey(key) ||
    resolveToolVerifyKind(key, runBrief?.analysis?.rollup) != null

  const closeTalkVerify = () => {
    verifySeqRef.current += 1
    if (peelCloseTimerRef.current != null) {
      window.clearTimeout(peelCloseTimerRef.current)
      peelCloseTimerRef.current = null
    }
    const section = verifySection ?? heldFinishedVerifyRef.current
    setVerifySection(null)
    setVerifyHighlightMessageId(null)
    setVerifyModal(null)
    setVerifyCodingModal(null)
    setVerifyEssayModal(null)
    setVerifyFormModal(null)
    setVerifyBusy(false)
    setVerifyRevealMessageCount(0)
    setVerifyShowMarkingRail(false)
    setAssessorAid(null)
    assessorAidReportRef.current = null
    setChatClosed(true)
    resultClosingRef.current = false
    if (section && isAnyVerifySectionKey(section.sectionKey)) {
      clearAssessorAidConversation(runBriefId, section.sectionKey)
    }
  }

  const handleVerifySectionChange = (next: InterviewLandingVerifySection | null) => {
    if (!next) {
      closeTalkVerify()
      return
    }
    verifySeqRef.current += 1
    setVerifySection(next)
    setVerifyHighlightMessageId(null)
    resultClosingRef.current = false
  }

  const requestFinishedVerifyClose = () => {
    if (mode !== 'finished' || (!verifySection && !finishedCoverHeld)) {
      closeTalkVerify()
      return
    }
    if (resultClosingRef.current) return
    resultClosingRef.current = true
    verifySeqRef.current += 1
    const waitPeel = !chatClosed && !verifyBusy
    setChatClosed(true)
    const reverseCover = () => {
      peelCloseTimerRef.current = null
      setVerifySection(null)
    }
    if (peelCloseTimerRef.current != null) {
      window.clearTimeout(peelCloseTimerRef.current)
    }
    if (waitPeel) {
      peelCloseTimerRef.current = window.setTimeout(reverseCover, 580)
      return
    }
    reverseCover()
  }

  const handleResultSpineEntered = () => {
    if (resultClosingRef.current) return
    const section = verifySection
    if (!section || !isResultReviewSectionKey(section.sectionKey)) return
    const seq = verifySeqRef.current
    window.setTimeout(() => {
      if (resultClosingRef.current || verifySeqRef.current !== seq) return
      const existing = loadAssessorAidConversation(runBriefId, section.sectionKey)
      const needsOpen = aidConversationNeedsOpen(existing.messages)
      setAssessorAid({
        messages: needsOpen ? [] : existing.messages,
        draft: existing.draft,
        busy: needsOpen,
        error: null,
        personaName: 'Assessor Aid',
      })
      setChatClosed(false)
      window.setTimeout(() => {
        void (async () => {
          if (resultClosingRef.current || verifySeqRef.current !== seq) return
          if (!needsOpen) return
          const report = await waitForAidReport(() => assessorAidReportRef.current, {
            isStale: () => resultClosingRef.current || verifySeqRef.current !== seq,
          })
          if (resultClosingRef.current || verifySeqRef.current !== seq) return
          const model = activeAssessorAidModal()
          if (!model) return
          const streamId = `aid-open-${Date.now().toString(36)}`
          void runAssessorAidOpen({
          fixtureKey: runBriefId,
          sectionKey: section.sectionKey,
          briefId: runBriefId,
          modal: model,
          report,
          onComposeDelta: (full) => {
            if (resultClosingRef.current || verifySeqRef.current !== seq) return
            setAssessorAid((prev) => {
              if (!prev) return prev
              const msgs = [...prev.messages]
              const idx = msgs.findIndex((m) => m.id === streamId)
              const row = { id: streamId, role: 'assistant' as const, text: full }
              if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
              else msgs.push(row)
              return { ...prev, messages: msgs, busy: true, error: null }
            })
          },
        })
          .then((open) => {
            if (resultClosingRef.current || verifySeqRef.current !== seq) return
            logSittingTurnDebug({
              surface: 'aid',
              userMessage: '(open)',
              replyMarkdown: open.utterance,
              meta: {
                situation: 'open',
                from: open.from,
                packDiag: formatAidPackDiag(
                  buildAssessorAidContext({
                    modal: model,
                    report,
                  }),
                ),
              },
            })
            const sentAt = stampChatSendAt()
            setAssessorAid((prev) => {
              const row = {
                id: streamId,
                role: 'assistant' as const,
                text: open.utterance,
                at: sentAt,
              }
              const msgs = [...(prev?.messages ?? [])]
              const idx = msgs.findIndex((m) => m.id === streamId)
              if (idx >= 0) msgs[idx] = { ...msgs[idx]!, ...row }
              else msgs.push(row)
              return {
                messages: msgs,
                draft: prev?.draft ?? '',
                busy: false,
                error: null,
                personaName: 'Assessor Aid',
              }
            })
          })
          .catch((e: unknown) => {
            if (resultClosingRef.current || verifySeqRef.current !== seq) return
            logSittingTurnDebug({
              surface: 'aid',
              userMessage: '(open)',
              replyMarkdown: '',
              error: e,
              meta: {
                situation: 'open',
                packDiag: formatAidPackDiag(
                  buildAssessorAidContext({
                    modal: model,
                    report,
                  }),
                ),
              },
            })
            const code =
              e instanceof DataApiError
                ? e.code
                : e instanceof Error && /openai|missing_openai/i.test(e.message)
                  ? 'missing_openai_key'
                  : 'unknown'
            setAssessorAid((prev) => (prev ? { ...prev, busy: false, error: code } : prev))
          })
        })()
      }, 580)
    }, 100)
  }

  useEffect(() => {
    if (mode === 'finished' && verifySection) {
      heldFinishedVerifyRef.current = verifySection
      setFinishedCoverHeld(true)
    }
  }, [mode, verifySection])

  useEffect(() => {
    if (mode !== 'finished') {
      setFinishedCoverHeld(false)
      heldFinishedVerifyRef.current = null
      resultClosingRef.current = false
    }
  }, [mode])

  useEffect(() => {
    assessorAidFocusRef.current = { focusCardId: null, focusMessageId: null, focusPrompt: null }
    assessorAidAttachRef.current = null
    setAssessorAidAttach(null)
  }, [verifySection?.sectionKey])

  /**
   * The results card tells us what it is showing and which section the reader has open.
   * Held in a ref so a scroll or expand does not re-render the peel mid-stream.
   */
  const handleAssessorAidReport = useCallback((report: AssessorAidReport | null) => {
    assessorAidReportRef.current = report
  }, [])

  const handleVerifyCiteMessage = (messageId: string) => {
    setVerifyHighlightMessageId(messageId)
    window.setTimeout(() => setVerifyHighlightMessageId(null), 1400)
  }

  const handleAssessorAidCite = (messageId: string) => {
    const id = String(messageId ?? '').trim()
    if (!id) return
    setPendingReviewJump({ messageId: id })
    const response = getInterviewResponse(runBriefId)
    const lastAid = assessorAidRef.current?.messages
      .slice()
      .reverse()
      .find((row) => row.role === 'assistant')
    const fromTrail = lastAid?.openRefs?.find((ref) => String(ref.sectionId ?? '').trim())?.sectionId
    const sectionId = sectionIdForCitedUtterance(id, {
      messages: response.messages,
      cards: activeAssessorAidModal()?.cards,
      fallbackSectionId:
        String(fromTrail ?? '').trim() ||
        String(assessorAidReportRef.current?.locus?.sectionId ?? '').trim(),
    })
    if (sectionId) resultTimelineRef.current?.openReview(sectionId, 'chat')
    handleVerifyCiteMessage(id)
  }

  const handleAssessorAidAttach = (attach: AidPeelAttach) => {
    assessorAidAttachRef.current = attach
    setAssessorAidAttach(attach)
    setAssessorAid((prev) => {
      if (!prev) {
        return {
          messages: [],
          draft: '',
          busy: false,
          error: null,
          personaName: 'Assessor Aid',
        }
      }
      return { ...prev, error: null }
    })
    setChatClosed(false)
  }

  const handleVerifyAskAbout = (
    card: TalkVerifyMarkingCard,
    home?: { sectionId: string; stage: 'chat' | 'editor' },
  ) => {
    const attach = attachFromMarkCard(card, home)
    assessorAidFocusRef.current = {
      focusCardId: card.id,
      focusMessageId: card.anchorMessageId ?? null,
      focusPrompt: null,
    }
    handleAssessorAidAttach(attach)
    if (card.anchorMessageId) handleVerifyCiteMessage(card.anchorMessageId)
  }

  const handleAssessorAidDraftChange = (draft: string) => {
    setAssessorAid((prev) => {
      if (!prev || !verifySection) return prev
      const next = { ...prev, draft }
      saveAssessorAidConversation({
        conversationId: `aid:${runBriefId}:${verifySection.sectionKey}`,
        fixtureKey: runBriefId,
        sectionKey: verifySection.sectionKey,
        messages: next.messages,
        draft,
        updatedAt: new Date().toISOString(),
      })
      return next
    })
  }

  const activeAssessorAidModal = (): AssessorAidModalLike | null => {
    const talk = verifyModalRef.current
    if (talk) return talk
    const coding = verifyCodingModalRef.current
    if (coding) {
      const softBucket =
        coding.sectionKey === 'codingMethod'
          ? coding.softBuckets.codingMethod
          : coding.softBuckets.codingTests
      return {
        fixtureId: coding.fixtureId,
        sectionKey: coding.sectionKey,
        sectionLabel: coding.sectionLabel,
        title: coding.title,
        description: coding.description,
        depthLabel: coding.depthLabel,
        softBucket,
        messages: [],
        cards: coding.cards,
      }
    }
    const essay = verifyEssayModalRef.current
    if (essay) {
      return {
        fixtureId: essay.fixtureId,
        sectionKey: essay.sectionKey,
        sectionLabel: essay.sectionLabel,
        title: essay.title,
        description: essay.description,
        depthLabel: essay.depthLabel,
        softBucket: essay.softBucket,
        messages: [],
        cards: essay.cards,
      }
    }
    const form = verifyFormModalRef.current
    if (form) {
      return {
        fixtureId: form.fixtureId,
        sectionKey: form.sectionKey,
        sectionLabel: form.sectionLabel,
        title: form.title,
        description: form.description,
        depthLabel: form.depthLabel,
        softBucket: null,
        messages: [],
        cards: form.cards,
      }
    }
    const section = verifySection
    if (section) {
      return fallbackAssessorAidModal({
        section,
        fixtureId: runBriefId,
        brief: runBrief ?? pageFixtureBrief,
      })
    }
    return null
  }

  const handleAssessorAidSend = (text: string) => {
    const aid = assessorAidRef.current
    const section = verifySection
    if (!aid || !section) return
    const model = activeAssessorAidModal()
    if (!model) return
    const trimmed = text.trim()
    if (!trimmed || aid.busy) return
    const retrying = isRepeatOfLastCandidate(aid.messages, trimmed)
    const sentAttach = assessorAidAttachRef.current
    const attachTrail = mergeAidTrailRefs(undefined, sentAttach)
    const candidateMsg = {
      id: `aid-c-${Date.now().toString(36)}`,
      role: 'candidate' as const,
      text: trimmed,
      at: nowIso(),
      ...(attachTrail.length ? { openRefs: attachTrail } : {}),
    }
    const nextMessages = retrying ? aid.messages : [...aid.messages, candidateMsg]
    const streamId = `aid-a-${Date.now().toString(36)}`
    setAssessorAid({
      ...aid,
      messages: nextMessages,
      draft: '',
      busy: true,
      error: null,
    })
    saveAssessorAidConversation({
      conversationId: `aid:${runBriefId}:${section.sectionKey}`,
      fixtureKey: runBriefId,
      sectionKey: section.sectionKey,
      messages: nextMessages,
      draft: '',
      updatedAt: new Date().toISOString(),
    })

    const situation = inferAssessorAidSituation(trimmed)
    const focus = assessorAidFocusRef.current
    const ctx = buildAssessorAidContext({
      modal: model,
      report: assessorAidReportRef.current,
      focusCardId: focus.focusCardId,
      focusMessageId: focus.focusMessageId,
      focusPrompt: focus.focusPrompt,
      attach: sentAttach,
    })
    assessorAidAttachRef.current = null
    setAssessorAidAttach(null)
    const peel = peelForAidCompose(nextMessages, ctx.messages)
    let streamed = ''
    void composeAssessorAid({
      assessorAidContext: ctx,
      messages: peel.map((m) => ({
        role: m.role,
        text: m.text,
        ...(m.at?.trim() ? { at: m.at.trim() } : {}),
      })),
      situation,
      briefId: runBriefId,
      onUtteranceDelta: (_delta, full) => {
        streamed = String(full ?? '')
        if (aidUtteranceIsTranscriptEcho(full, ctx.messages)) return
        setAssessorAid((prev) => {
          if (!prev) return prev
          const msgs = [...prev.messages]
          const idx = msgs.findIndex((m) => m.id === streamId)
          const streamingMsg = {
            id: streamId,
            role: 'assistant' as const,
            text: full,
          }
          if (idx >= 0) msgs[idx] = streamingMsg
          else msgs.push(streamingMsg)
          return { ...prev, messages: msgs, busy: true, error: null }
        })
      },
    })
      .then((result) => {
        if (aidUtteranceIsTranscriptEcho(result.utterance, ctx.messages)) {
          throw new DataApiError('compose_empty', 'compose_empty')
        }
        const spoken = result.utterance
        if (!spoken.trim()) throw new DataApiError('compose_empty', 'compose_empty')
        logSittingTurnDebug({
          surface: 'aid',
          userMessage: trimmed,
          replyMarkdown: spoken,
          meta: {
            ...(result.composeMeta as unknown as Record<string, unknown>),
            from: result.composeMeta.from ?? 'edge',
            packDiag: formatAidPackDiag(ctx),
          },
        })
        const citeMessageIds = result.composeMeta.citeMessageIds ?? []
        const openRefs = mergeAidTrailRefs(
          result.composeMeta.openRefs,
          sentAttach,
        )
        const sentAt = stampChatSendAt()
        const assistantMsg = {
          id: streamId,
          role: 'assistant' as const,
          text: spoken,
          citeMessageIds,
          citeTopicId: result.composeMeta.citeTopicId,
          openRefs,
          at: sentAt,
        }
        setAssessorAid((prev) => {
          if (!prev) return prev
          const msgs = [...prev.messages]
          const idx = msgs.findIndex((m) => m.id === streamId)
          if (idx >= 0) msgs[idx] = assistantMsg
          else msgs.push(assistantMsg)
          const next = { ...prev, messages: msgs, busy: false, error: null }
          saveAssessorAidConversation({
            conversationId: `aid:${runBriefId}:${section.sectionKey}`,
            fixtureKey: runBriefId,
            sectionKey: section.sectionKey,
            messages: next.messages,
            draft: next.draft,
            updatedAt: new Date().toISOString(),
          })
          return next
        })
        if (citeMessageIds[0]) handleVerifyCiteMessage(citeMessageIds[0])
      })
      .catch((e: unknown) => {
        logSittingTurnDebug({
          surface: 'aid',
          userMessage: trimmed,
          replyMarkdown: streamed,
          error: e,
          meta: { situation, from: 'error', packDiag: formatAidPackDiag(ctx) },
        })
        const code = aidErrorCodeFromCatch(
          e instanceof DataApiError
            ? { code: e.code, message: e.message }
            : e instanceof Error
              ? { message: e.message }
              : null,
        )
        setAssessorAid((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            messages: prev.messages.filter((m) => m.id !== streamId),
            busy: false,
            error: code,
          }
        })
      })
  }

  const expireCopilotPending = () => {
    copilotPendingRef.current = null
    copilotPendingPlanRef.current = null
    setAssist((prev) =>
      prev
        ? {
            ...prev,
            pendingEditRunId: null,
            messages: prev.messages.map((m) =>
              m.pendingStatus === 'pending' ? { ...m, pendingStatus: 'expired' as const } : m,
            ),
          }
        : prev,
    )
  }

  const handleNext = () => {
    if (!shownLanding || !gate || assessBusy) return
    if (policyHold) return
    if (talk?.busy) return
    if (assist?.busy) return
    assistAbortRef.current?.abort()
    expireCopilotPending()
    setAssessError(null)
    setAssessBusy(true)
    assessAbortRef.current?.abort()
    const ac = new AbortController()
    assessAbortRef.current = ac
    persistOpenCapture()
    void runCompleteSection({
      briefId: runBriefId,
      landing: shownLanding,
      phaseId: gate.phaseId,
      brief: runBrief,
      stageStarted,
      isTalk: Boolean(gate.isTalk),
      artifact: liveArtifactRef.current,
      lastVisibleCodeRun: lastVisibleCodeRunRef.current,
      signal: ac.signal,
    })
      .then(({ snapshot, assessError: err }) => {
        if (err === 'aborted' || !snapshot) return
        if (err) setAssessError(err)
        swapModeAfterLiveOut(() => snapshot)
      })
      .catch((e: unknown) => {
        setAssessError(e instanceof Error ? e.message : 'assess_failed')
        if (!shownLanding || !gate) return
        swapModeAfterLiveOut(() =>
          runPassGate({
            briefId: runBriefId,
            landing: shownLanding,
            phaseId: gate.phaseId,
            brief: runBrief,
          }),
        )
      })
      .finally(() => {
        setAssessBusy(false)
        assessAbortRef.current = null
      })
  }

  const handleDownloadBriefJson = () => {
    const title =
      runBrief.definition?.meta?.title?.trim() ||
      runBrief.definition?.meta?.roleTitle?.trim() ||
      'interview-brief'
    downloadJson(interviewBriefDownloadFilename(title, runBriefId), runBrief)
  }

  const resolveLandingForLeave = (): InterviewLandingView =>
    landing ??
    shownLanding ??
    (liveBriefId ? peekInterviewLandingPrefetch(liveBriefId) : null) ??
    interviewFixtureLandingView(tryDemo, pageFixtureBrief)

  /** Policy overlay Leave — always lands on intake step 1, not gate. */
  const handlePolicyLeaveToLanding = () => {
    const landingView = resolveLandingForLeave()
    const phaseId = gate?.phaseId ?? null
    assessAbortRef.current?.abort()
    persistOpenCapture()
    if (stageStarted && phaseId) {
      void enqueueSectionMarks({
        briefId: runBriefId,
        landing: landingView,
        phaseId,
        brief: runBrief,
        stageStarted: true,
        isTalk: Boolean(gate?.isTalk),
        artifact: liveArtifactRef.current,
        lastVisibleCodeRun: lastVisibleCodeRunRef.current,
      })
    }
    if (swapTimerRef.current != null) {
      window.clearTimeout(swapTimerRef.current)
      swapTimerRef.current = null
    }
    resetSectionChrome(stageHostRef.current)
    resetSectionChrome(chromeRef.current)
    setBusy(false)
    setSwapPhase('idle')
    setLeaveOpen(false)
    flushSync(() => {
      applySnapshot(
        runLeaveToLanding({
          briefId: runBriefId,
          landing: landingView,
          phaseId,
          forfeit: false,
          brief: runBrief,
        }),
      )
    })
  }

  const policyLeaveRef = useRef(handlePolicyLeaveToLanding)
  policyLeaveRef.current = handlePolicyLeaveToLanding

  useEffect(() => {
    registerSittingPolicyLeaveHandler(() => policyLeaveRef.current())
    return () => registerSittingPolicyLeaveHandler(null)
  }, [])

  const leaveToOverviewNow = (forfeit: boolean) => {
    stopSittingPolicy()
    const landingView = resolveLandingForLeave()
    const phaseId = gate?.phaseId ?? null
    assessAbortRef.current?.abort()
    persistOpenCapture()
    if (!forfeit && stageStarted && phaseId) {
      void enqueueSectionMarks({
        briefId: runBriefId,
        landing: landingView,
        phaseId,
        brief: runBrief,
        stageStarted: true,
        isTalk: Boolean(gate?.isTalk),
        artifact: liveArtifactRef.current,
        lastVisibleCodeRun: lastVisibleCodeRunRef.current,
      })
    }
    if (swapTimerRef.current != null) {
      window.clearTimeout(swapTimerRef.current)
      swapTimerRef.current = null
    }
    resetSectionChrome(stageHostRef.current)
    resetSectionChrome(chromeRef.current)
    setBusy(false)
    setSwapPhase('idle')
    applySnapshot(
      runLeaveToLanding({
        briefId: runBriefId,
        landing: landingView,
        phaseId,
        forfeit,
        brief: runBrief,
      }),
    )
  }

  const handleLeaveConfirm = () => {
    setLeaveOpen(false)
    leaveToOverviewNow(false)
  }

  const handleLeaveForfeit = () => {
    setLeaveOpen(false)
    leaveToOverviewNow(true)
  }

  const handleChromeBack = () => {
    if (mode === 'landing') {
      if (tryDemo) goHome()
      else goDashboard()
      return
    }
    if (!shownLanding) return
    if (policyHold) {
      policyLeaveRef.current()
      return
    }
    setLeaveOpen(true)
  }

  const handleHardExpire = () => {
    if (!shownLanding || !gate || busy || assessBusy) return
    assistAbortRef.current?.abort()
    expireCopilotPending()
    setLeaveOpen(false)
    setTimerUpOpen(true)
  }

  const handleTimerUpKeepEditing = () => {
    setTimerUpOpen(false)
  }

  const handleTimerUpLeave = () => {
    setTimerUpOpen(false)
    leaveToOverviewNow(false)
  }

  const handleTimerUpContinue = () => {
    setTimerUpOpen(false)
    if (!shownLanding || !gate || assessBusy) return
    // Same as Next — assess + complete (not forfeit).
    handleNext()
  }

  const inGateFlow = mode === 'gate' || mode === 'finished'

  return (
    <GsapPageProvider timing={gsapTiming}>
      <ThemeProvider>
        {/* Fill the absolute App Stage layer — same outer box Dashboard uses for peels. */}
        <div className="page-scene--interview-root">
          <main
            className="page-scene page-scene--dashboard page-scene--interview"
            aria-label="Interview"
            data-menu-closed="true"
            data-menu-collapsed="true"
            data-chat-closed={chatClosed ? 'true' : 'false'}
            data-talk-live={
              mode === 'gate' && stageStarted && Boolean(gate?.isTalk) ? 'true' : 'false'
            }
            data-form-live={
              mode === 'gate' &&
              stageStarted &&
              Boolean(gate) &&
              !gate?.isTalk &&
              toolMount?.kind === 'form'
                ? 'true'
                : 'false'
            }
            data-writing-live={
              mode === 'gate' &&
              stageStarted &&
              Boolean(gate) &&
              toolMount?.kind === 'doc'
                ? 'true'
                : 'false'
            }
            data-coding-live={
              mode === 'gate' &&
              stageStarted &&
              Boolean(gate) &&
              toolMount?.kind === 'coding'
                ? 'true'
                : 'false'
            }
          >
          <div className="page-scene--dashboard__peel" data-scroll-edge={scrollEdge}>
            <FinishedWorkspaceCover
              enabled={mode === 'finished'}
              open={verifySection != null}
              onClose={requestFinishedVerifyClose}
              onExitComplete={() => {
                closeTalkVerify()
                setFinishedCoverHeld(false)
              }}
              panel={
                finishedCoverHeld ? (
                  <InterviewFinishedVerifyPanel
                    verifySection={verifySection ?? heldFinishedVerifyRef.current}
                    briefId={runBriefId}
                    brief={runBrief}
                    verifyBusy={verifyBusy}
                    showSpine={finishedCoverHeld && !verifyBusy}
                    onClose={requestFinishedVerifyClose}
                    onEntered={handleResultSpineEntered}
                    onReport={handleAssessorAidReport}
                    onAskHome={handleAssessorAidAttach}
                    onAskAboutCard={handleVerifyAskAbout}
                    timelineRef={resultTimelineRef}
                    highlightMessageId={verifyHighlightMessageId}
                  />
                ) : (
                  <div className="theme-interview-landing__verify-blank" />
                )
              }
            >
            <ThemeScroll
              rail="mini"
              smooth
              scrollClouds={false}
              className="page-scene--dashboard__scroller"
              viewportRef={viewportRef}
              tabIndex={-1}
            >
              <div ref={surfaceRef} className="page-scene--dashboard__main">
                <section
                  className="page-scene--dashboard__section page-scene--interview__workspace"
                  aria-label="Interview workspace"
                  data-swap-phase={swapPhase}
                >
                  <header
                    ref={chromeRef}
                    className={[
                      'theme-interview-creator__manage-header',
                      'page-scene--interview__chrome',
                      'page-scene--interview__swap-chrome',
                      mode !== 'landing' ? 'page-scene--interview__chrome--gate' : 'page-scene--interview__chrome--landing',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {mode === 'landing' ? (
                      <>
                        <h1 className="sr-only">Interview</h1>
                        <div
                          className="page-scene--interview__chrome-steps"
                          aria-label="Intake steps"
                        >
                          <StepLoader
                            steps={INTERVIEW_INTAKE_STEPS.length}
                            value={(intakeStep / INTERVIEW_INTAKE_STEPS.length) * 100}
                            variant="vurify"
                            tone="accent"
                            size="sm"
                            label={`Step ${intakeStep} · ${INTERVIEW_INTAKE_STEPS[intakeStep - 1]?.label ?? 'Outline'}`}
                            showValue={false}
                          />
                        </div>
                        <div
                          className={[
                            'theme-interview-creator__manage-divider',
                            intakeStep !== 1 ? 'page-scene--interview__chrome-back-hold' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          aria-hidden
                        />
                        <div className="theme-interview-creator__manage-create">
                          <VurifyMenuButton
                            type="button"
                            variant="label"
                            size="md"
                            housing
                            activeChrome={false}
                            lineTone="muted"
                            icon={ArrowLeft}
                            iconPosition="left"
                            className={
                              intakeStep !== 1 ? 'page-scene--interview__chrome-back-hold' : undefined
                            }
                            disabled={intakeStep !== 1}
                            aria-hidden={intakeStep !== 1}
                            tabIndex={intakeStep !== 1 ? -1 : undefined}
                            onClick={handleChromeBack}
                          >
                            Back
                          </VurifyMenuButton>
                          {SHOW_BRIEF_JSON_DOWNLOAD ? (
                            <VurifyMenuButton
                              type="button"
                              variant="label"
                              size="md"
                              housing
                              activeChrome={false}
                              lineTone="muted"
                              icon={Download}
                              iconPosition="left"
                              onClick={handleDownloadBriefJson}
                            >
                              Download JSON
                            </VurifyMenuButton>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="theme-interview-creator__manage-create">
                          <VurifyMenuButton
                            type="button"
                            variant="label"
                            size="md"
                            housing
                            activeChrome={false}
                            lineTone="muted"
                            icon={ArrowLeft}
                            iconPosition="left"
                            onClick={handleChromeBack}
                          >
                            Back
                          </VurifyMenuButton>
                        </div>
                        <div
                          className="theme-interview-creator__manage-divider"
                          aria-hidden
                        />
                        {mode === 'gate' &&
                        stageStarted &&
                        hardDeadlineAt &&
                        gate?.timed &&
                        !gate.isTalk ? (
                          <>
                            <div className="page-scene--interview__chrome-timer">
                              <InterviewHardTimer
                                variant="ring"
                                deadlineAt={hardDeadlineAt}
                                timeoutMs={hardTimeoutMs || 60_000}
                                onExpire={handleHardExpire}
                              />
                            </div>
                            <div
                              className="theme-interview-creator__manage-divider"
                              aria-hidden
                            />
                          </>
                        ) : null}
                        <div className="theme-interview-creator__manage-title page-scene--interview__chrome-count">
                          <InterviewChromeTitle
                            stageText={chromeStageText}
                            nameText={chromeNameText}
                            morphKey={chromeMorphKey}
                            snapToken={chromeSnapToken}
                          />
                        </div>
                        <div
                          className="theme-interview-creator__manage-divider"
                          aria-hidden
                        />
                        {mode === 'gate' &&
                        !policyHold &&
                        referencedPhaseIds.length > 0 ? (
                          <>
                            <div className="theme-interview-creator__manage-create">
                              <VurifyMenuButton
                                type="button"
                                variant="label"
                                size="md"
                                housing
                                activeChrome={referenceOpen}
                                lineTone="muted"
                                icon={BookOpen}
                                iconPosition="left"
                                aria-label="Reference"
                                onClick={() => setReferenceOpen(true)}
                              >
                                Reference
                              </VurifyMenuButton>
                            </div>
                            <div
                              className="theme-interview-creator__manage-divider"
                              aria-hidden
                            />
                          </>
                        ) : null}
                        <div className="theme-interview-creator__manage-create">
                          {mode === 'gate' && !policyHold ? (
                            <div className="flex flex-col items-end gap-1">
                              <VurifyMenuButton
                                type="button"
                                variant="label"
                                size="md"
                                housing
                                activeChrome={false}
                                lineTone="accent"
                                icon={ArrowRight}
                                iconPosition="right"
                                disabled={
                                  busy ||
                                  assessBusy ||
                                  Boolean(talk?.busy) ||
                                  Boolean(assist?.busy) ||
                                  !gate
                                }
                                onClick={handleNext}
                              >
                                {assessBusy ? 'Scoring…' : 'Next'}
                              </VurifyMenuButton>
                              {assessError ? (
                                <p
                                  className="type-caption type-muted mb-0 max-w-[14rem] text-right"
                                  role="status"
                                >
                                  Advanced with scoring note: {assessError.slice(0, 120)}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="page-scene--interview__chrome-end-slot" aria-hidden />
                          )}
                        </div>
                      </>
                    )}
                  </header>
                  <div
                    ref={stageHostRef}
                    className="page-scene--interview__stage page-scene--interview__swap-layer page-scene--interview__live"
                    data-policy-hold={policyHold ? 'true' : 'false'}
                    {...(policyHold ? { inert: true } : {})}
                  >
                    {showStage && shownLanding ? (
                      <InterviewStageSwap
                        key={runBriefId}
                        mode={mode}
                        landing={shownLanding}
                        intakeStep={intakeStep}
                        onIntakeStepChange={setIntakeStep}
                        gate={gate}
                        completedPhaseIds={completedPhaseIds}
                        skippedPhaseIds={skippedPhaseIds}
                        stageStarted={stageStarted}
                        talk={talk}
                        toolMount={toolMount}
                        liveHostRef={liveHostRef}
                        editorHandleRef={liveEditorHandleRef}
                        scrollViewportRef={viewportNodeRef}
                        briefId={runBriefId}
                        brief={runBrief}
                        assessError={assessError}
                        checkWarnings={liveCheckWarnings}
                        tryDemo={tryDemo}
                        onStart={handleStart}
                        onContinue={handleContinue}
                        onStartStage={handleStartStage}
                        onTalkSend={handleTalkSend}
                        onTalkDraftChange={handleTalkDraftChange}
                        onTalkMenu={handleTalkMenu}
                        leaveOpen={leaveOpen && inGateFlow}
                        onLeaveClose={() => setLeaveOpen(false)}
                        onLeaveConfirm={handleLeaveConfirm}
                        onLeaveForfeit={handleLeaveForfeit}
                        timerUpOpen={timerUpOpen && inGateFlow}
                        onTimerUpKeepEditing={handleTimerUpKeepEditing}
                        onTimerUpLeave={handleTimerUpLeave}
                        onTimerUpContinue={handleTimerUpContinue}
                        onLiveCompositionChange={handleLiveCompositionChange}
                        onPendingEditsChange={setPendingEdits}
                        onVisibleCodeRun={(run) => {
                          lastVisibleCodeRunRef.current = run
                          Capture.action('run')
                        }}
                        verifySection={verifySection}
                        onVerifySectionChange={handleVerifySectionChange}
                        verifyModal={verifyModal}
                        verifyCodingModal={verifyCodingModal}
                        verifyEssayModal={verifyEssayModal}
                        verifyFormModal={verifyFormModal}
                        verifyBusy={verifyBusy}
                        verifyRevealMessageCount={verifyRevealMessageCount}
                        verifyShowMarkingRail={verifyShowMarkingRail}
                        verifyHighlightMessageId={verifyHighlightMessageId}
                        onVerifyCiteMessage={handleVerifyCiteMessage}
                        onVerifyAskAbout={handleVerifyAskAbout}
                      />
                    ) : landingError ? (
                      <p className="type-caption type-muted mb-0" role="alert">
                        {landingError}
                      </p>
                    ) : (
                      <div
                        className="theme-interview-creator__list-loading theme-interview-creator__list-loading--initial"
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        <span className="type-display-sm type-accent theme-interview-creator__list-loading-label">
                          Loading
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </ThemeScroll>
            </FinishedWorkspaceCover>
          </div>

          <aside
            className="page-scene--dashboard__chat"
            aria-label="Interview chat space"
            aria-hidden={chatClosed ? true : undefined}
            {...(policyHold ? { inert: true } : {})}
          >
            <DashboardChatPeelResize active={!chatClosed} />
            <InterviewTalkChatSpace
              active={!chatClosed}
              talk={null}
              assist={assessorAid ? null : assist}
              assessorAid={assessorAid}
              gate={gate}
              onAssistSend={handleAssistSend}
              onAssistDraftChange={handleAssistDraftChange}
              onAssistCardAction={handleAssistCardAction}
              onAssistCitePath={(path) => liveEditorHandleRef.current?.revealFileRange?.(path)}
              onAssistQuestionnaire={handleAssistQuestionnaire}
              attachFiles={toolMount?.kind === 'coding' ? assistAttachFiles : undefined}
              onToggleAttach={(path) => {
                setCodingExtraAttach((prev) =>
                  prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
                )
              }}
              pendingEdits={pendingEdits}
              onPendingAccept={(path) => liveEditorHandleRef.current?.settlePendingEdit?.(path, true)}
              onPendingReject={(path) => liveEditorHandleRef.current?.settlePendingEdit?.(path, false)}
              onPendingKeepAll={() => liveEditorHandleRef.current?.settlePendingKeepAll?.()}
              onPendingDiscardAll={() => liveEditorHandleRef.current?.settlePendingDiscardAll?.()}
              onPendingFocus={(path) => {
                liveEditorHandleRef.current?.focusPendingEdit?.(path)
                const row = pendingEdits.find((e) => e.id === path || e.path === path)
                liveEditorHandleRef.current?.revealFileRange?.(row?.path || path)
              }}
              onAssessorAidSend={handleAssessorAidSend}
              onAssessorAidDraftChange={handleAssessorAidDraftChange}
              onAssessorAidCite={handleAssessorAidCite}
              assessorAidAttach={assessorAidAttach}
              onAssessorAidDismissAttach={() => {
                assessorAidAttachRef.current = null
                setAssessorAidAttach(null)
              }}
              onAssessorAidOpenRef={(ref: AidOpenRef) => {
                resultTimelineRef.current?.openReview(ref.sectionId, ref.stage)
              }}
            />
          </aside>
          </main>
          {mode === 'gate' && gate && referencedPhaseIds.length > 0 ? (
            <InterviewReferencedWorkModal
              open={referenceOpen}
              onClose={() => setReferenceOpen(false)}
              brief={runBrief}
              briefId={runBriefId}
              consumingPhaseId={gate.phaseId}
            />
          ) : null}
          <SittingPolicyOverlay timed={Boolean(gate?.timed && stageStarted)} />
        </div>
      </ThemeProvider>
    </GsapPageProvider>
  )
}

/** Home Try / public fixture demo — App Stage `/try-interview`. */
export function TryInterviewPage() {
  return <InterviewPage tryDemo />
}
