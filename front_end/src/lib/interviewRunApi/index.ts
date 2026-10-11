/**
 * Candidate interviewer client — FE InterviewResponse SSOT + Edge OpenAI Talk turns.
 * Persist/load/attempt ids/clock still local adapters until session wire.
 */
export { composeGateIntroMessage } from './composeGateIntro'
export { composeTalkOpenerUtterance, howThisWorksBeat, midSectionOrientation, punctuateAsk, purposeOrientation, toSpokenExpectation, toSpokenProbeAsk } from './composeTalkOpenerUtterance'
export { buildGatePreamble } from './gatePreamble'
export type { GatePreamble, GatePreambleIcon, GatePreambleItem } from './gatePreamble'
export {
  buildTalkContext,
  afterTurnTemplateIds,
  topicEndTemplateIds,
  talkLeaveTemplateIds,
  scheduleTalkTemplates,
  impliedToolTemplateIds,
  lockedToolTemplateIds,
} from './buildTalkContext'
export {
  scheduleMarkTalk,
  scheduleToolFinalTemplateIds,
  scheduleToolProcessTemplateIds,
  isProcessTemplateId,
  isAssistDisplayTemplateId,
} from './markSchedule'
export { assembleAttemptReport, ATTEMPT_REPORT_SCHEMA, downloadAttemptReportJson } from './attemptReport'
export type { AttemptReport } from './attemptReport'
export {
  assembleAttemptPackage,
  ATTEMPT_PACKAGE_SCHEMA,
  attemptPackageStatus,
  downloadAttemptPackageJson,
  exportAttemptPackageJson,
  collectPendingPackageGrains,
} from './attemptPackage'
export type {
  AttemptPackage,
  AttemptPackagePendingGrain,
  AttemptPackageStatus,
} from './attemptPackage'
export { digestEditorTape, digestHasSecretLeak } from './editorCapture/tapeDigest'
export type { TapeDigest } from './editorCapture/tapeDigest'
export {
  FIXTURE_INTERVIEW_BRIEF_ID,
  FIXTURE_INTERVIEW_BRIEF_ID_MOBILE,
  isFixtureInterviewBriefId,
  readInterviewFixtureIsMobile,
  exportInterviewResponseJson,
  getInterviewResponse,
  getProgress,
  peekActiveTalk,
  runHydrateLanding,
  runLeaveToLanding,
  runForfeitAndContinue,
  runOpenAttempt,
  runPassGate,
  runRestartAttempt,
  runStartTalk,
  runTalkDraft,
  runTalkMenu,
  runTalkTurn,
} from './localRunner'
export {
  completeRatioSignal,
  outputMetaTagIcon,
  sittingReadChipHint,
  sittingReadChipIcon,
} from './outputMetaTagIcon'
export {
  loadSampleOutputCards,
  formatOutputCardPercent,
  formGateLabel,
  collapsedMetaTags,
  buildResultOverview,
  buildOverviewScoreRows,
  buildOutputCardFromScored,
  sittingResultHeadlinePending,
  SAMPLE_OUTPUT_CARDS,
} from './fixtures/output-cards/outputCardFixture'
export type {
  InterviewOutputCardFixture,
  InterviewOutputCardBucket,
  InterviewOutputCardPart,
  InterviewOutputCardAxis,
  InterviewOutputMeta,
  InterviewOutputMetaTag,
  OutputMetaSignal,
  ResultOverview,
  OverviewScoreRow,
  OverviewSecurityCheck,
  OverviewSecurityCapture,
  OverviewSecurityDiagrams,
} from './fixtures/output-cards/outputCardFixture'
export {
  normalizeSittingRead,
  parseSittingReadBody,
  sittingReadReport,
  sittingReadScoreReading,
  isSittingReadScoreLabel,
  sittingReadFindingMarkdown,
  cleanSittingReadBrief,
} from './sittingReadMarkup'
export type {
  SittingReadSection,
  SittingReadPiece,
  SittingReadReport,
  SittingReadTag,
  SittingReadBrief,
} from './sittingReadMarkup'
export {
  clearInterviewResponse,
  downloadInterviewResponseJson,
  ensureInterviewResponse,
  appendResponseMessage,
  assembleAttemptRollup,
  mergeToolAssessResult,
  writePendingAfterToolGrains,
  skipPendingToolGrains,
  drainAllPendingToolGrains,
  appendMarkTrace,
  failedMarkStages,
} from './interviewResponse'
export { logMarkingTurnDebug } from './markingTurnDiag'
export type { MarkingDiagInput } from './markingTurnDiag'
export { collectSittingRead, sittingDurationMinutes } from './collectSittingRead'
export { buildLiveOutputCard } from './liveOutputCard'
export type { LiveOutputCardPack } from './liveOutputCard'
export {
  scoreAttempt,
  scoreGrainUnit,
  sittingResultStatus,
  sittingMarkingProgress,
} from './scoreAttempt'
export type {
  AttemptScorePackage,
  AttemptSoftGrade,
  FormGateSummary,
  GrainContribution,
  SittingGrainCounts,
  SittingMarkingProgress,
  SittingResultStatus,
} from './scoreAttempt'
export { resolveTemplateRole, builtinTemplateIds } from './templateRoles'
export type { TemplateInterpretationRole, DecisionSoftBucket } from './templateRoles'
export { ordinalToUnit, ORDINAL_MAPS_VERSION } from './ordinalMaps'
export { enqueueSectionMarks, runCompleteSection } from './completeSection'
export type { CompleteSectionInput, CompleteSectionResult } from './completeSection'
export { remarkAttempt } from './remarkAttempt'
export { formatRemarkRadarDebug, logRemarkRadarDebug } from './remarkRadarDebug'
export {
  awaitMarkJobs,
  bumpMarkJobGeneration,
  currentMarkGeneration,
  enqueueMarkJob,
  markJobsInflightCount,
  subscribeMarkJobs,
  markJobFailures,
  clearMarkJobFailures,
} from './markJobs'
export type { MarkJobFailure } from './markJobs'
export {
  fillSessionSignals,
  fillHostClarity,
  enqueueSessionSignals,
  compileSessionSignalAtlas,
  overviewSignalGrains,
  metaFromSessionSignals,
} from './sessionSignals'
export { compileSessionSeries, sliceSeries, detectIncidents } from './sessionSeries'
export {
  startSittingPolicy,
  stopSittingPolicy,
  sittingPolicyActive,
  setSittingPolicyPhase,
  subscribeSittingPolicy,
  SittingPolicyOverlay,
} from './sittingPolicy'
export {
  digestSittingDeclaration,
  emptySittingDeclaration,
  emptySittingTerms,
  formatSittingDeclareStamp,
  packageIntakeDeclarations,
  sittingDeclarationReady,
  sittingDeclarationBlockHint,
  sittingDeclarationReviewTag,
  stampSittingDeclaration,
  stampSittingTerms,
} from './sittingDeclaration'
export type {
  IntakeDeclarationsPack,
  SittingDeclaration,
  SittingDeclarationDigest,
  SittingDeclarationReviewTag,
  SittingTermsAck,
} from './sittingDeclaration'
export { compileClarityPatterns } from './clarityPatterns'
export {
  chipReadingOk,
  humanCaseLabel,
  humanCopyLabel,
  humanIncidentKind,
  humanRunStatus,
  humanVpnReason,
  stripReportProse,
  toReviewerSentence,
  reportProseLooksFragment,
} from './reportDialect'
export {
  buildToolAssessBody,
  assessToolPhase,
  hashCodingSource,
} from './buildToolAssessBody'
export type { LiveToolArtifact, LastVisibleCodeRun } from './buildToolAssessBody'
export { runInterviewToolAssess } from './toolAssessEdgeClient'
export type { ToolAssessResult } from './toolAssessEdgeClient'
export {
  persistAssistAssistantMessage,
  persistAssistCandidateMessage,
  persistCopilotApplyReceipt,
  persistCopilotEditOutcome,
  assistMessagesForPhase,
  assistTranscriptForPhase,
  assistHistoryForCopilot,
  assistHistoryText,
  isCopilotReceiptPersist,
  peelRuntimeFromPersisted,
} from './assistChatPersist'
export {
  ASSIST_TURN_TEMPLATE_ID,
  enqueueAssistTurnMark,
  fillAssistLeaveDisplay,
  skipPendingAssistTurnGrains,
  writePendingAssistTurnGrains,
} from './assistTurnMarks'
export {
  firstJumpCite,
  cardHasJump,
  setPendingReviewJump,
  takePendingReviewJump,
  sectionIdForCitedUtterance,
} from './jumpCite'
export type {
  GateSpineSection,
  InterviewGateView,
  InterviewResponse,
  InterviewRunMode,
  InterviewRunSnapshot,
  LeaveInput,
  OpenAttemptInput,
  PassGateInput,
  StartTalkInput,
  TalkMenuAction,
  TalkMenuInput,
  TalkRuntimeView,
  TalkTurnInput,
} from './types'
export {
  abandonTalk,
  applyTalkTurn,
  bumpTalkGeneration,
  buildDepthLabel,
  composeCuesFromGrains,
  composeCuesFromDecide,
  alreadyDugOwnershipFromMessages,
  createTalkRuntimeState,
  ensureTopicEndFilled,
  awaitInFlightAfterTurns,
  trackAfterTurnWork,
  finalizeTalkTopic,
  resetTalkPhase,
  setTalkDraft,
  startTalkSession,
  toTalkRuntimeView,
} from './discussionRunner'
export { buildPriorTalkMemory, currentPhaseMessages, priorPhaseMessages } from './buildPriorTalkMemory'
export type { PriorTalkMemory } from './buildPriorTalkMemory'
export { buildCandidateCvNote } from './buildCandidateCvNote'
export type { CandidateCvNote } from './buildCandidateCvNote'
export {
  clearCandidateCvNoteCache,
  resolveCandidateCvNote,
} from './resolveCandidateCvNote'
export { decideTalkTurn } from './discussionDecide'
export { runTalkComposePasses, shouldExpandComposePass1 } from './talkComposePasses'
export type { TalkComposeFn, TalkComposePassTrace } from './talkComposePasses'
export { shouldAcceptTalkSend, stabilizeTalkViewIds } from './talkViewSettle'
export type {
  AnalysisGrainStub,
  CandidateSignal,
  InterviewResponseMessage,
  TalkContext,
  TalkDecision,
  TalkOpenBeat,
  TalkRuntimeState,
  TopicEndStub,
} from './talkTypes'
export {
  createInterviewBotProfile,
  createTalkTurnProfile,
  logSittingInjectMiss,
  sittingInjectPeelMiss,
} from './talkTurnDebug'
export { logSittingTurnDebug } from './sittingTurnDiag'
export type { SittingTurnDiagInput, SittingTurnDiagSurface } from './sittingTurnDiag'
export type {
  InterviewBotPhaseMark,
  InterviewBotProfile,
  InterviewBotSurface,
  TalkTurnPhaseMark,
  TalkTurnProfile,
} from './talkTurnDebug'
export {
  ensureTalkMarkdownEmphasisSpacing,
  ensureTalkMarkdownListBreaks,
  scrubBrokenTalkMarkdown,
  scrubChatDashMarkers,
  stripToFinalAsk,
} from './stripToFinalAsk'

export { resolveGateToolMount, toolKindFromGateLabel } from './resolveGateToolMount'
export type { GateToolKind, GateToolMount } from './resolveGateToolMount'
export {
  applyCopilotPendingOps,
  applyLiveEditorAssist,
  copilotApplyMissReason,
  isDeniedCodingAssistPath,
  mergeCodingLiveAssist,
  mergeDocLiveAssist,
  mergeFormLiveAssist,
  parseLiveEditorApply,
} from './applyLiveEditorAssist'
export type {
  CopilotPendingApplyInput,
  LiveEditorApply,
  LiveEditorApplyInput,
  LiveEditorApplyResult,
} from './applyLiveEditorAssist'
export { buildStageAssistContext } from './buildStageAssistContext'
export {
  buildAssistSectionContract,
  buildTalkSectionContract,
  formatSectionContractBlock,
} from './sectionContract'
export type { SectionContract } from './sectionContract'
export type {
  StageAssistChromeRegion,
  StageAssistContext,
  StageAssistReference,
} from './buildStageAssistContext'
export { buildAssistDayContinuity } from './buildAssistDayContinuity'
export type { AssistDayContinuity } from './buildAssistDayContinuity'
export {
  MEMORY_BUDGETS,
  MEMORY_SOURCE_CATALOG,
  emptyMemoryPlan,
  emptyRetrievedMemoryPack,
  formatMemorySourceCatalogForPlan,
  planDayMemory,
  retrieveDayMemory,
  runAssistMemoryCompose,
  bindPriorSectionNeeds,
  broaderContextPlan,
  coerceNeedRetrievalNeeds,
  coercePersistNotes,
  mergeMemoryNeeds,
  mergeRetrievedPacks,
  retrieveCopilotDayMemory,
  resolvePreviousPhaseId,
  sectionIndexFromLanding,
  unionDayHistoryTail,
} from './dayMemory'
export type {
  AssistMemoryTurnResult,
  CopilotDayPack,
  DayHistoryTurn,
  DayMemoryMeta,
  DayMemoryPlanResult,
  MemoryHit,
  MemoryRetrievalNeed,
  MemoryRetrievalPlan,
  MemorySourceId,
  RetrievedMemoryPack,
  TopicSynthHit,
} from './dayMemory'
export { composeStageAssist } from './stageAssistEdgeClient'
export type { StageAssistComposeResult } from './stageAssistEdgeClient'
export { runInterviewCode } from './codeRunEdgeClient'
export type { CodeRunResult, CodeRunCaseResult } from './codeRunEdgeClient'
export { composeAssistOpenerUtterance, previousGateTitle, assistOpenerBundleId } from './composeAssistOpenerUtterance'
export {
  referencedPhaseIdsFromBrief,
  buildReferencedEvidence,
  indexReferencedStages,
  emptyReferencedEvidence,
} from './referencedEvidence'
export { buildReferencedWorkViews } from './referencedWorkView'
export type {
  ReferencedWorkView,
  ReferencedWorkKind,
  ReferencedTalkTurn,
  ReferencedCodingRunTests,
} from './referencedWorkView'
export { runAssistSectionOpen } from './runAssistSectionOpen'
export { inferAssistSituation } from './inferAssistSituation'
export { formatHardTimerMmSs, hardTimerRemainingMs } from './hardTimerMath'
export {
  buildAssistTimerPack,
  sanitizeCodingLiveComposition,
  sanitizeDocLiveComposition,
  sanitizeFormLiveComposition,
} from './sanitizeLiveComposition'
export type {
  AssistLiveComposition,
  AssistLiveCompositionKind,
  AssistTimerPack,
  CodingAttachHint,
} from './sanitizeLiveComposition'
export {
  buildTalkVerifyModal,
  sliceTalkVerifyModal,
  isTalkVerifySectionKey,
  isResultReviewSectionKey,
  RESULT_REVIEW_SECTION_KEY,
  isCodingVerifySectionKey,
  isEssayVerifySectionKey,
  isFormVerifySectionKey,
  resolveToolVerifyKind,
} from './talkVerifyModal'
export type {
  TalkVerifyMarkingCard,
  TalkVerifyModal,
  ToolVerifyKind,
} from './talkVerifyModal'
export {
  cardsFromGrain,
  applyContributionsToCards,
  cardsFromPackageNotes,
  findTimelinePhaseId,
  findToolGrain,
  findToolPackage,
  phaseToolRef,
  attemptHostRef,
  resolveVerifyPhaseId,
} from './toolVerifyShared'
export type { ToolVerifyPackage } from './toolVerifyShared'
export { buildCodingVerifyModal } from './codingVerifyModal'
export type { CodingVerifyModal } from './codingVerifyModal'
export { buildEssayVerifyModal } from './essayVerifyModal'
export type { EssayVerifyModal } from './essayVerifyModal'
export { buildFormVerifyModal } from './formVerifyModal'
export type { FormVerifyModal } from './formVerifyModal'
export { buildAssistVerifyModal } from './assistVerifyModal'
export {
  markBeatFromCard,
  markBeatHeading,
  markGroupsForKind,
  workGroups,
  conversationGroups,
  synthesisBeat,
} from './markBeats'
export type { MarkBeat, MarkGroup } from './markBeats'
export {
  leftoverSectionProse,
  mixWhyFromSoftGrade,
  mixWhyForPhase,
  blendSectionLeftover,
  includedScoreDonutBuckets,
  contributingScoreDonutBuckets,
  sessionMixAccount,
  sessionMixTags,
  sectionCollapsedSummary,
  axisDisplayReading,
  axisDisplayWhy,
  axisDisplayShown,
  stageMixForPhase,
  pasteBurstAccount,
  humanFileRef,
  buildCatalogRadars,
  applyPasteBurstsToIncidents,
} from './resultHomes'
export type { MixWhyLine, ResultHomeRadar } from './resultHomes'
export {
  buildResultReviewPack,
  fillResultReviewStage,
  liveResultReviewAttempt,
  parseResultReviewEditId,
  defaultResultReviewMode,
} from './resultSectionReview'
export type {
  ResultReviewPack,
  ResultSectionReview,
} from './resultSectionReview'
export {
  talkVerifyBriefSections,
  talkSectionsMetaFromBrief,
  formatTalkVerifyDepthLabel,
} from './talkVerifyFromBrief'
export type { TalkVerifyBriefSection } from './talkVerifyFromBrief'
export {
  buildAssessorAidContext,
  inferAssessorAidSituation,
  formatAidPackDiag,
} from './buildAssessorAidContext'
export type { AssessorAidContext, AssessorAidModalLike } from './buildAssessorAidContext'
export {
  attachFromMarkCard,
  attachFromHome,
  mergeAidTrailRefs,
  trailRefsFromAttach,
  resolveAidOpenRef,
  aidPeelErrorCopy,
  aidErrorCodeFromCatch,
} from './aidPeelAttach'
export type { AidPeelAttach, AidOpenRef, AidMarkSnapshot, AidOpenTarget } from './aidPeelAttach'
export { buildAssessorAidReport, describeAidLocus } from './buildAssessorAidReport'
export type {
  AssessorAidReport,
  AssessorAidReportLocus,
  AssessorAidReportSection,
} from './buildAssessorAidReport'
export { composeAssessorAid } from './assessorAidEdgeClient'
export type { AssessorAidComposeResult } from './assessorAidEdgeClient'
export { composeAssessorAidOpenerUtterance, aidReportIsReady } from './composeAssessorAidOpenerUtterance'
export {
  runAssessorAidOpen,
  waitForAidReport,
  composeAidPackFallback,
  aidUtteranceIsTranscriptEcho,
  peelForAidCompose,
} from './runAssessorAidOpen'
export {
  clearAssessorAidConversation,
  loadAssessorAidConversation,
  saveAssessorAidConversation,
  seedAssessorAidOpener,
  isCannedAidOpener,
  aidConversationNeedsOpen,
} from './assessorAidConversationFixture'
export type {
  AssessorAidConversationFixture,
  AssessorAidFixtureMessage,
} from './assessorAidConversationFixture'
export {
  Capture,
  downloadEditorTapesJson,
  flushAndPersistCapture,
  tapesPackFromStore,
  replayTape,
} from './editorCapture'
export type { EditorTape, EditorTapesPack, Checkpoint } from './editorCapture'
export {
  loadAttemptResponseFixture,
  TALK_VERIFY_ATTEMPT_FIXTURE_ID,
} from './fixtures/attempt-responses/loadAttemptResponseFixture'

