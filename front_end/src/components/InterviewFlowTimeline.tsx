import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Clock,
  Code2,
  FileText,
  LayoutList,
  LayoutTemplate,
  MessageCircle,
  PackageCheck,
  Scan,
  Shield,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import {
  useLayoutEffect,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useState,
  useRef,
  forwardRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { flushSync } from 'react-dom'
import { ArrangementRule } from './cardDisplayLayout'
import { DocArticleShell } from './docArticleParts/DocArticleShell'
import { InterviewFlowFormEditor } from './InterviewFlowFormEditor'
import { InterviewFlowCodingEditor } from './InterviewFlowCodingEditor'
import { InterviewFlowDocEditor } from './InterviewFlowDocEditor'
import { InterviewFlowTalkEditor } from './InterviewFlowTalkEditor'
import { InterviewFlowWrapEditor } from './InterviewFlowWrapEditor'
import {
  InterviewFlowCreatorOverviewSection,
  InterviewFlowCreatorOverviewSectionHead,
  type CreatorOverviewChangePatch,
} from './InterviewFlowCreatorOverviewSection'
import {
  InterviewFlowTemplatesSection,
  InterviewFlowTemplatesSectionHead,
} from './InterviewFlowTemplatesSection'
import {
  InterviewFlowClarityReviewStage,
  InterviewFlowClaritySection,
  InterviewFlowClaritySectionHead,
  InterviewFlowDeclarationReviewStage,
  InterviewFlowOverviewSection,
  InterviewFlowOverviewSectionHead,
  InterviewFlowSecurityReviewStage,
  InterviewFlowSecuritySection,
  InterviewFlowSecuritySectionHead,
  resultOverviewHasClarity,
  resultOverviewHasDeclarations,
  resultOverviewHasSecurity,
  revealInterviewFlowDeferredBodies,
} from './InterviewFlowOverviewSection'
import {
  InterviewFlowResultReviewStage,
  InterviewFlowResultSection,
} from './InterviewFlowResultSection'
import { InterviewFlowSectionAddBar, INTERVIEW_FLOW_SECTION_ADD_KINDS } from './InterviewFlowSectionAddBar'
import { NanoAnchorMenu } from './NanoAnchorMenu'
import { VurifyMenuButton } from './VurifyMenuButton'
import { AuthorEditable } from './testFormParts/AuthorEditable'
import { Tag } from './Tag'
import type { NanoAnchorMenuEntry } from '../lib/menus/nanoAnchorMenu'
import { useGlowTimelineScroll } from '../hooks/useGlowTimelineScroll'
import type { GlowTimelineScrollRange } from '../lib/timeline/glowTimelineTypes'
import type {
  InterviewFlowAnalysisShelfState,
  InterviewFlowCodingEditorState,
  InterviewFlowDocEditorState,
  InterviewFlowFormEditorState,
  InterviewFlowStep,
  InterviewFlowStepKind,
  InterviewFlowSummaryTag,
  InterviewFlowTalkEditorState,
  InterviewFlowWrapEditorState,
  InterviewFlowTimelineBrief,
} from '../lib/interviewBrief/flowTimelineTypes'
import { iconForSummaryTag } from '../lib/interviewBrief/summaryTagIcons'
import { CREATOR_OVERVIEW_SECTION_ID } from '../lib/interviewBrief/creatorOverviewTags'
import { ANALYSIS_TEMPLATES_SECTION_ID as TEMPLATES_SECTION_ID } from '../lib/interviewBrief/housingChrome'
import { TALK_KIND_LABEL } from '../lib/interviewBrief/interviewLandingView'
import { templateAttachHostsFromBrief } from '../lib/interviewBrief/mapCreator2BriefToTimeline'
import { codingLanguageDisplayLabel } from '../lib/interviewBrief/codingLanguages'
import {
  earlierPhaseOptions,
  earlierTopicOptions,
  earlierToolOptions,
  forwardJumpOptions,
} from '../lib/interviewBrief/creator2SpineRules'
import type {
  SpineSectionKind,
  SpineTalkOp,
} from '../lib/interviewBrief/patchCreator2Spine'
import { withSyncedTalkCopy } from '../lib/interviewBrief/syncTalkCopy'
import { INTERVIEW_FLOW_TIMELINE_SCROLL } from '../lib/interviewBrief/flowTimelineFixture'
import type { ResultOverview } from '../lib/interviewRunApi/fixtures/output-cards/outputCardFixture'
import { setPendingReviewJump, type JumpCite } from '../lib/interviewRunApi/jumpCite'
import { resolveAidOpenRef } from '../lib/interviewRunApi/aidPeelAttach'
import {
  defaultResultReviewMode,
  parseResultReviewEditId,
  RESULT_REVIEW_CHAT_SUFFIX,
  RESULT_REVIEW_EDITOR_SUFFIX,
  type ResultReviewPack,
  type ResultSectionReview,
} from '../lib/interviewRunApi/resultSectionReview'
import gsap, { revealSectionIn, ScrollTrigger } from '../lib/gsap'
import { Tooltip } from './Tooltip'

type InterviewFlowTimelineProps = {
  brief: InterviewFlowTimelineBrief
  scroll?: GlowTimelineScrollRange
  scrollerRef?: RefObject<HTMLElement | null>
  /**
   * When set, glow stays off until this epoch is > 0 (parent bumps after panel enter).
   * Omit for Theme lab — glow settles on its own shortly after mount.
   */
  layoutEpoch?: number
  /** Form section editor → parent patches interview_brief JSON. */
  onFormChange?: (phaseId: string, next: InterviewFlowFormEditorState) => void
  onTalkChange?: (phaseId: string, next: InterviewFlowTalkEditorState) => void
  onCodingChange?: (phaseId: string, next: InterviewFlowCodingEditorState) => void
  onDocChange?: (phaseId: string, next: InterviewFlowDocEditorState) => void
  /** Decision package (rollup) editor → parent patches analysis.rollup. */
  onWrapChange?: (next: InterviewFlowWrapEditorState) => void
  /** Persist analysis shelf / template library patches. */
  onAnalysisChange?: (next: InterviewFlowAnalysisShelfState) => void
  /** Remove a library template and scrub it from every host section. */
  onDeleteTemplate?: (templateId: string) => void
  onSpineChange?: (op: SpineTalkOp) => void
  /** Patch Overview housing (title, role, persona, description, window). */
  onBriefMetaChange?: (patch: CreatorOverviewChangePatch) => void
  coverFile?: File | null
  rolePdfFile?: File | null
  onCoverFileChange?: (file: File | null) => void
  onRolePdfFileChange?: (file: File | null) => void
  /** Result review — replace the Templates shelf with Overview from bot-output JSON. */
  overview?: ResultOverview
  /** Result review — per-section radars, Talk chat, and tool Verify panels. */
  reviewPack?: ResultReviewPack | null
  /** Result review — Reports the open review stage so the shell header can host Work / Conversation. */
  onStageChrome?: (chrome: ResultStageChrome | null) => void
  /** Kick a Results home into Assessor Aid as a composer pill. */
  onAskHome?: (attach: import('../lib/interviewRunApi/aidPeelAttach').AidPeelAttach) => void
  onAskAboutCard?: (
    card: import('../lib/interviewRunApi/talkVerifyModal').TalkVerifyMarkingCard,
    home?: { sectionId: string; stage: 'chat' | 'editor' },
  ) => void
  /** Results Conversation flash from Aid / leftover Jump to utterance. */
  highlightMessageId?: string | null
  className?: string
}

/** What the shell header needs to draw the Work / Conversation switch beside Back. */
export type ResultStageChrome = {
  stepId: string
  mode: 'chat' | 'editor'
  canChat: boolean
  canEditor: boolean
  open: (mode: 'chat' | 'editor') => void
}

/** Imperative API for shell Back + Creator-2 action spine. */
export type InterviewFlowTimelineHandle = {
  isEditStage: () => boolean
  exitEditStage: () => Promise<void>
  scrollToSection: (id: string) => void
  openSection: (id: string) => void
  openReview: (id: string, mode?: 'chat' | 'editor') => void
  focusSection: (id: string) => void
}

const OVERVIEW_SECTION_ID = '__result_overview__'
const DECLARATION_SECTION_ID = '__result_declaration__'
const SECURITY_SECTION_ID = '__result_security__'
const SECURITY_DETAIL_SECTION_ID = '__result_security_detail__'
const CLARITY_SECTION_ID = '__result_clarity__'
const CLARITY_DETAIL_SECTION_ID = '__result_clarity_detail__'

function isResultReviewSectionId(id: string): boolean {
  return (
    id === OVERVIEW_SECTION_ID ||
    id === SECURITY_SECTION_ID ||
    id === CLARITY_SECTION_ID
  )
}

function ResultReviewItem({
  id,
  itemRef,
  showRule,
  children,
}: {
  id: string
  itemRef: (node: HTMLLIElement | null) => void
  showRule: boolean
  children: ReactNode
}) {
  return (
    <li
      id={id}
      data-doc-toc={id}
      ref={itemRef}
      className="theme-interview-flow-timeline__item is-overview"
    >
      <div className="theme-interview-flow-timeline__focus-shell">
        <div className="theme-interview-flow-timeline__focus-shell-inner">
          <div className="theme-glow-timeline__item theme-interview-flow-timeline__item-body">
            <span className="theme-glow-timeline__dot" aria-hidden />
            <div className="theme-interview-flow-timeline__copy">
              {children}
              {showRule ? (
                <div className="theme-interview-flow-timeline__rule" aria-hidden>
                  <ArrangementRule />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

const KIND_LABEL: Record<InterviewFlowStepKind, string> = {
  talk: TALK_KIND_LABEL,
  form: 'Form',
  coding: 'Coding',
  doc: 'Writing',
  wrap: 'Wrap-up',
  unknown: 'Unknown type',
}

const KIND_ICON: Record<InterviewFlowStepKind, LucideIcon> = {
  talk: MessageCircle,
  form: ClipboardList,
  coding: Code2,
  doc: FileText,
  wrap: PackageCheck,
  unknown: AlertTriangle,
}

function KindIcon({ kind }: { kind: InterviewFlowStepKind }) {
  const Icon = KIND_ICON[kind]
  return <Icon className="size-3.5 shrink-0" aria-hidden />
}

function SummaryTags({ tags }: { tags: readonly InterviewFlowSummaryTag[] }) {
  if (!tags.length) return null
  return (
    <>
      <div className="theme-interview-flow-timeline__tags theme-tag-group" aria-label="Section summary">
        {tags.map((tag) => {
          const Icon = iconForSummaryTag(tag)
          const chip = (
            <Tag
              size="sm"
              className={
                tag.tone
                  ? `theme-interview-flow-timeline__tag theme-interview-flow-timeline__tag--${tag.tone}`
                  : 'theme-interview-flow-timeline__tag'
              }
            >
              <Icon className="theme-interview-flow-timeline__tag-icon size-3 shrink-0" aria-hidden />
              <span>{tag.label}</span>
            </Tag>
          )
          if (!tag.tooltip) {
            return (
              <span key={tag.id} className="theme-interview-flow-timeline__tag-wrap">
                {chip}
              </span>
            )
          }
          return (
            <Tooltip key={tag.id} content={tag.tooltip} placement="top">
              <span className="theme-interview-flow-timeline__tag-wrap">{chip}</span>
            </Tooltip>
          )
        })}
      </div>
      <div className="theme-interview-flow-timeline__tags-rule" aria-hidden>
        <ArrangementRule />
      </div>
    </>
  )
}

function MetaDivider() {
  return <span className="theme-interview-flow-timeline__meta-rule" aria-hidden />
}

function stepHasDetail(step: InterviewFlowStep): boolean {
  if (step.formEditor || step.talkEditor || step.codingEditor || step.docEditor) return true
  return Boolean(
    step.onlyIf ||
      step.packLabel ||
      step.analysisLines?.length ||
      step.probes?.length ||
      step.targets?.length ||
      step.branches?.length ||
      step.depthLines?.length ||
      step.toolLines?.length ||
      step.formQuestions?.length ||
      step.testCases?.length ||
      step.languages?.length ||
      step.behaviourOverride ||
      step.timing,
  )
}

function DetailBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="theme-interview-flow-timeline__detail-block">
      <p className="theme-interview-flow-timeline__detail-label type-overline type-faint mb-1">
        {label}
      </p>
      {children}
    </div>
  )
}

function LineList({ lines }: { lines: readonly string[] }) {
  return (
    <ul className="theme-interview-flow-timeline__line-list mb-0 list-none p-0">
      {lines.map((line) => (
        <li key={line} className="type-body-sm type-muted">
          {line}
        </li>
      ))}
    </ul>
  )
}

function StepBlock({
  step,
  isLast,
  expanded,
  variant = 'timeline',
  onToggle,
  phaseOptions,
  talkSpine,
  toolSpine,
  templateMeta,
  libraryIds,
  onTemplateMetaChange: _onTemplateMetaChange,
  probeDefaults,
  onFormChange,
  onTalkChange,
  onCodingChange,
  onDocChange,
  onWrapChange,
  onSpineChange,
  onRemoveSection,
  itemRef,
  review = null,
  reviewMode = false,
  onOpenReview,
  onAskHome,
}: {
  step: InterviewFlowStep
  isLast: boolean
  /** Tool editors: true only on the edit stage. Details folds use local state on day. */
  expanded: boolean
  /** `timeline` = day row with glow dot; `stage` = full edit stage (no rail). */
  variant?: 'timeline' | 'stage'
  onToggle: () => void
  phaseOptions: readonly { id: string; title: string; kind?: string }[]
  talkSpine: readonly { id: string; title: string; topicId: string }[]
  toolSpine: readonly { id: string; title: string; toolRef: string }[]
  templateMeta?: InterviewFlowAnalysisShelfState['templateMeta']
  libraryIds?: readonly string[]
  onTemplateMetaChange?: (next: InterviewFlowAnalysisShelfState['templateMeta']) => void
  probeDefaults?: InterviewFlowTimelineBrief['probeDefaults']
  onFormChange?: (phaseId: string, next: InterviewFlowFormEditorState) => void
  onTalkChange?: (phaseId: string, next: InterviewFlowTalkEditorState) => void
  onCodingChange?: (phaseId: string, next: InterviewFlowCodingEditorState) => void
  onDocChange?: (phaseId: string, next: InterviewFlowDocEditorState) => void
  onWrapChange?: (next: InterviewFlowWrapEditorState) => void
  onSpineChange?: (op: SpineTalkOp) => void
  /** Animated remove — preferred over raw spine removeTalk. */
  onRemoveSection?: (phaseId: string) => void
  itemRef?: (el: HTMLLIElement | null) => void
  review?: ResultSectionReview | null
  reviewMode?: boolean
  onOpenReview?: (mode: 'chat' | 'editor') => void
  onAskHome?: (attach: import('../lib/interviewRunApi/aidPeelAttach').AidPeelAttach) => void
}) {
  const panelId = useId()
  const [detailOpen, setDetailOpen] = useState(false)
  const hasDetail = stepHasDetail(step)
  const isFormEditor = Boolean(step.formEditor)
  const isTalkEditor = Boolean(step.talkEditor)
  const isCodingEditor = Boolean(step.codingEditor)
  const isDocEditor = Boolean(step.docEditor)
  const isWrapEditor = Boolean(step.wrapEditor) || step.kind === 'wrap'
  const isToolEditor =
    isFormEditor || isTalkEditor || isCodingEditor || isDocEditor || Boolean(step.wrapEditor)
  const formState = step.formEditor
  const talkState = step.talkEditor
  const codingState = step.codingEditor
  const docState = step.docEditor
  const wrapState = step.wrapEditor
  const jumpPhaseOptions = forwardJumpOptions(phaseOptions, step.id)
  const whenPhaseOptions = earlierPhaseOptions(phaseOptions, step.id)
  const whenTopicOptions = earlierTopicOptions(talkSpine, step.id)
  const whenToolOptions = earlierToolOptions(toolSpine, step.id)
  const minutesLabel = (() => {
    if (step.timing?.mode === 'timed') {
      const lim = step.timing.limitMinutes ?? step.minutes
      return lim != null ? `${lim} min limit` : 'Timed'
    }
    // Talk is soft-depth (not a hard wall-clock) — prefer ~N min over Untimed.
    if (isTalkEditor) {
      const soft =
        step.minutes ?? talkState?.targetMinutes ?? step.timing?.estimatedMinutes ?? null
      return soft != null ? `~${soft} min` : null
    }
    if (step.timing?.mode === 'untimed') return 'Untimed'
    if (step.minutes != null) return `~${step.minutes} min`
    // Tool sections always show timing chrome when collapsed (parity coding/form/doc).
    if (isFormEditor || isCodingEditor || isDocEditor) return 'Untimed'
    return null
  })()
  const showTimedChrome = Boolean(step.timed || step.timing?.mode === 'timed')
  const showExpanded = isToolEditor ? expanded : detailOpen
  const handleToggle = () => {
    if (isToolEditor) onToggle()
    else setDetailOpen((v) => !v)
  }
  const isStage = variant === 'stage'

  const patchFormCopy = (
    partial: Partial<
      Pick<InterviewFlowFormEditorState, 'sectionTitle' | 'summaryBlurb' | 'packLabel'>
    >,
  ) => {
    if (!formState || !onFormChange) return
    const sectionTitle = partial.sectionTitle ?? formState.sectionTitle
    onFormChange(step.id, {
      ...formState,
      ...partial,
      sectionTitle,
      document: {
        ...formState.document,
        title:
          partial.sectionTitle != null
            ? partial.sectionTitle.trim() || formState.document.title
            : formState.document.title,
      },
    })
  }

  const patchTalkCopy = (
    partial: Partial<
      Pick<
        InterviewFlowTalkEditorState,
        'sectionTitle' | 'summaryBlurb' | 'packLabel' | 'topicLabel' | 'purpose'
      >
    >,
  ) => {
    if (!talkState || !onTalkChange) return
    onTalkChange(step.id, withSyncedTalkCopy(talkState, partial))
  }

  const patchCodingCopy = (
    partial: Partial<
      Pick<InterviewFlowCodingEditorState, 'sectionTitle' | 'summaryBlurb' | 'packLabel'>
    >,
  ) => {
    if (!codingState || !onCodingChange) return
    const sectionTitle = partial.sectionTitle ?? codingState.sectionTitle
    onCodingChange(step.id, {
      ...codingState,
      ...partial,
      sectionTitle,
      workspace: {
        ...codingState.workspace,
        title:
          partial.sectionTitle != null
            ? partial.sectionTitle.trim() || codingState.workspace.title
            : codingState.workspace.title,
      },
    })
  }

  const patchDocCopy = (
    partial: Partial<
      Pick<InterviewFlowDocEditorState, 'sectionTitle' | 'summaryBlurb' | 'packLabel'>
    >,
  ) => {
    if (!docState || !onDocChange) return
    const sectionTitle = partial.sectionTitle ?? docState.sectionTitle
    onDocChange(step.id, {
      ...docState,
      ...partial,
      sectionTitle,
      document: {
        ...docState.document,
        title:
          partial.sectionTitle != null
            ? partial.sectionTitle.trim() || docState.document.title
            : docState.document.title,
      },
    })
  }

  return (
    <li
      id={step.id}
      data-doc-toc={isStage ? undefined : step.id}
      ref={itemRef}
      className={[
        'theme-interview-flow-timeline__item',
        `theme-interview-flow-timeline__item--${step.kind}`,
        showExpanded ? 'is-expanded' : '',
        isStage ? 'is-edit-stage' : '',
        hasDetail ? 'has-detail' : '',
        step.offSpine ? 'is-off-spine' : '',
        isFormEditor ? 'is-form-editable' : '',
        isTalkEditor ? 'is-talk-editable' : '',
        isCodingEditor ? 'is-coding-editable' : '',
        isDocEditor ? 'is-doc-editable' : '',
        isWrapEditor ? 'is-wrap-editable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-interview-flow-timeline__focus-shell">
        <div className="theme-interview-flow-timeline__focus-shell-inner">
          <div
            className={
              isStage
                ? 'theme-interview-flow-timeline__item-body theme-interview-flow-timeline__item-body--stage'
                : 'theme-glow-timeline__item theme-interview-flow-timeline__item-body'
            }
          >
      {isStage ? null : <span className="theme-glow-timeline__dot" aria-hidden />}
      <div className="theme-interview-flow-timeline__copy min-w-0">
        <div className="theme-interview-flow-timeline__meta">
          <span className="theme-interview-flow-timeline__kind">
            <KindIcon kind={step.kind} />
            {KIND_LABEL[step.kind]}
            {step.offSpine ? ' · optional' : ''}
          </span>
          {minutesLabel ? (
            <>
              <MetaDivider />
              <span
                className={[
                  'theme-interview-flow-timeline__minutes',
                  showTimedChrome ? 'is-timed' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {showTimedChrome ? (
                  <Timer className="size-3.5 shrink-0" aria-hidden />
                ) : (
                  <Clock className="size-3.5 shrink-0" aria-hidden />
                )}
                <span>{minutesLabel}</span>
              </span>
            </>
          ) : null}
          {isFormEditor && formState ? (
            <>
              <MetaDivider />
              <AuthorEditable
                className="theme-interview-flow-timeline__pack-edit"
                value={formState.packLabel}
                onChange={(value) => patchFormCopy({ packLabel: value })}
                placeholder="Pack label"
                aria-label="Pack label"
              />
            </>
          ) : isTalkEditor && talkState ? (
            <>
              <MetaDivider />
              <Tooltip content="Optional short label next to the title" placement="top">
                <span>
                  <AuthorEditable
                    className="theme-interview-flow-timeline__pack-edit"
                    value={talkState.packLabel}
                    onChange={(value) => patchTalkCopy({ packLabel: value })}
                    placeholder="Label"
                    aria-label="Optional section label"
                  />
                </span>
              </Tooltip>
            </>
          ) : isCodingEditor && codingState ? (
            <>
              <MetaDivider />
              <AuthorEditable
                className="theme-interview-flow-timeline__pack-edit"
                value={codingState.packLabel}
                onChange={(value) => patchCodingCopy({ packLabel: value })}
                placeholder="Pack label"
                aria-label="Pack label"
              />
            </>
          ) : isDocEditor && docState ? (
            <>
              <MetaDivider />
              <AuthorEditable
                className="theme-interview-flow-timeline__pack-edit"
                value={docState.packLabel}
                onChange={(value) => patchDocCopy({ packLabel: value })}
                placeholder="Pack label"
                aria-label="Pack label"
              />
            </>
          ) : step.packLabel ? (
            <>
              <MetaDivider />
              <span className="theme-interview-flow-timeline__pack-chip">{step.packLabel}</span>
            </>
          ) : null}
        </div>

        {reviewMode ? (
          <>
            <h3 className="theme-interview-flow-timeline__title type-h3 type-serif-italic">
              {review?.title ?? step.title}
            </h3>
            {review ? (
              <InterviewFlowResultSection
                review={review}
                onOpenChat={
                  review.canChat && onOpenReview ? () => onOpenReview('chat') : undefined
                }
                onOpenEditor={
                  review.canEditor && onOpenReview ? () => onOpenReview('editor') : undefined
                }
                onAskHome={onAskHome}
              />
            ) : (
              <>
                <p className="theme-interview-flow-timeline__body type-body type-muted">
                  {step.summary || step.purpose}
                </p>
                <SummaryTags tags={step.tags ?? []} />
              </>
            )}
          </>
        ) : isFormEditor && formState ? (
          <>
            <AuthorEditable
              className="theme-interview-flow-timeline__title-edit type-display-md"
              value={formState.sectionTitle}
              onChange={(value) => patchFormCopy({ sectionTitle: value })}
              placeholder="Section title"
              allowEmpty={false}
              aria-label="Section title"
            />
            <AuthorEditable
              className="theme-interview-flow-timeline__body-edit type-body type-muted"
              value={formState.summaryBlurb}
              onChange={(value) => patchFormCopy({ summaryBlurb: value })}
              placeholder="Section summary"
              multiline
              rows={2}
              aria-label="Section summary"
            />
            <SummaryTags tags={step.tags ?? []} />
          </>
        ) : isTalkEditor && talkState ? (
          <>
            <AuthorEditable
              className="theme-interview-flow-timeline__title-edit type-display-md"
              value={talkState.sectionTitle}
              onChange={(value) => patchTalkCopy({ sectionTitle: value })}
              placeholder="Conversation title"
              allowEmpty={false}
              aria-label="Conversation title"
            />
            <AuthorEditable
              className="theme-interview-flow-timeline__body-edit type-body type-muted"
              value={talkState.summaryBlurb}
              onChange={(value) => patchTalkCopy({ summaryBlurb: value })}
              placeholder="What this conversation covers"
              multiline
              rows={2}
              aria-label="Conversation summary"
            />
            <SummaryTags tags={step.tags ?? []} />
          </>
        ) : isCodingEditor && codingState ? (
          <>
            <AuthorEditable
              className="theme-interview-flow-timeline__title-edit type-display-md"
              value={codingState.sectionTitle}
              onChange={(value) => patchCodingCopy({ sectionTitle: value })}
              placeholder="Section title"
              allowEmpty={false}
              aria-label="Section title"
            />
            <AuthorEditable
              className="theme-interview-flow-timeline__body-edit type-body type-muted"
              value={codingState.summaryBlurb}
              onChange={(value) => patchCodingCopy({ summaryBlurb: value })}
              placeholder="Section summary"
              multiline
              rows={2}
              aria-label="Section summary"
            />
            <SummaryTags tags={step.tags ?? []} />
          </>
        ) : isDocEditor && docState ? (
          <>
            <AuthorEditable
              className="theme-interview-flow-timeline__title-edit type-display-md"
              value={docState.sectionTitle}
              onChange={(value) => patchDocCopy({ sectionTitle: value })}
              placeholder="Section title"
              allowEmpty={false}
              aria-label="Section title"
            />
            <AuthorEditable
              className="theme-interview-flow-timeline__body-edit type-body type-muted"
              value={docState.summaryBlurb}
              onChange={(value) => patchDocCopy({ summaryBlurb: value })}
              placeholder="Section summary"
              multiline
              rows={2}
              aria-label="Section summary"
            />
            <SummaryTags tags={step.tags ?? []} />
          </>
        ) : (
          <>
            <h3 className="theme-interview-flow-timeline__title type-display-md">{step.title}</h3>
            <p className="theme-interview-flow-timeline__body type-body type-muted">
              {step.summary || step.purpose}
            </p>
            <SummaryTags tags={step.tags ?? []} />
          </>
        )}

        {reviewMode ? null : isFormEditor && step.formEditor ? (
          <InterviewFlowFormEditor
            state={step.formEditor}
            expanded={showExpanded}
            onToggle={handleToggle}
            phaseOptions={jumpPhaseOptions}
            whenPhaseOptions={whenPhaseOptions}
            onChange={(next) => onFormChange?.(step.id, next)}
            onRemove={onRemoveSection ? () => onRemoveSection(step.id) : undefined}
            onMove={
              onSpineChange
                ? (direction) =>
                    onSpineChange({ type: 'moveTalk', phaseId: step.id, direction })
                : undefined
            }
            onDuplicate={
              onSpineChange
                ? () => onSpineChange({ type: 'duplicateTalk', phaseId: step.id })
                : undefined
            }
          />
        ) : isTalkEditor && step.talkEditor ? (
          <InterviewFlowTalkEditor
            state={step.talkEditor}
            expanded={showExpanded}
            onToggle={handleToggle}
            phaseOptions={jumpPhaseOptions}
            whenPhaseOptions={whenPhaseOptions}
            toolOptions={whenToolOptions}
            topicOptions={whenTopicOptions}
            probeDefaults={probeDefaults}
            templateMeta={templateMeta}
            libraryIds={libraryIds}
            onChange={(next) => onTalkChange?.(step.id, next)}
            onRemove={onRemoveSection ? () => onRemoveSection(step.id) : undefined}
            onMove={
              onSpineChange
                ? (direction) =>
                    onSpineChange({ type: 'moveTalk', phaseId: step.id, direction })
                : undefined
            }
            onDuplicate={
              onSpineChange
                ? () => onSpineChange({ type: 'duplicateTalk', phaseId: step.id })
                : undefined
            }
          />
        ) : isCodingEditor && step.codingEditor ? (
          <InterviewFlowCodingEditor
            state={step.codingEditor}
            expanded={showExpanded}
            onToggle={handleToggle}
            phaseOptions={jumpPhaseOptions}
            whenPhaseOptions={whenPhaseOptions}
            onChange={(next) => onCodingChange?.(step.id, next)}
            onRemove={onRemoveSection ? () => onRemoveSection(step.id) : undefined}
            onMove={
              onSpineChange
                ? (direction) =>
                    onSpineChange({ type: 'moveTalk', phaseId: step.id, direction })
                : undefined
            }
            onDuplicate={
              onSpineChange
                ? () => onSpineChange({ type: 'duplicateTalk', phaseId: step.id })
                : undefined
            }
          />
        ) : isDocEditor && step.docEditor ? (
          <InterviewFlowDocEditor
            state={step.docEditor}
            expanded={showExpanded}
            onToggle={handleToggle}
            phaseOptions={jumpPhaseOptions}
            whenPhaseOptions={whenPhaseOptions}
            onChange={(next) => onDocChange?.(step.id, next)}
            onRemove={onRemoveSection ? () => onRemoveSection(step.id) : undefined}
            onMove={
              onSpineChange
                ? (direction) =>
                    onSpineChange({ type: 'moveTalk', phaseId: step.id, direction })
                : undefined
            }
            onDuplicate={
              onSpineChange
                ? () => onSpineChange({ type: 'duplicateTalk', phaseId: step.id })
                : undefined
            }
          />
        ) : isWrapEditor && wrapState ? (
          <InterviewFlowWrapEditor
            step={step}
            state={wrapState}
            sectionOptions={phaseOptions.map((p) => ({
              id: p.id,
              title: p.title,
            }))}
            expanded={showExpanded}
            onToggle={handleToggle}
            onChange={(next) => onWrapChange?.(next)}
          />
        ) : hasDetail ? (
          <div className="theme-interview-flow-timeline__more">
            <button
              type="button"
              className="theme-interview-flow-timeline__more-btn is-always"
              aria-expanded={showExpanded}
              aria-controls={panelId}
              onClick={handleToggle}
            >
              <span>{showExpanded ? 'Less' : 'Details'}</span>
              <ChevronDown
                className="theme-interview-flow-timeline__more-chevron size-3.5 shrink-0"
                aria-hidden
              />
            </button>
            <div
              id={panelId}
              className={[
                'theme-interview-flow-timeline__detail-fold',
                showExpanded ? 'is-open' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="theme-interview-flow-timeline__detail-fold-inner">
                <div className="theme-interview-flow-timeline__detail">
              {step.purpose && step.purpose !== step.summary ? (
                <DetailBlock label="About this section">
                  <p className="type-body-sm type-muted mb-0">{step.purpose}</p>
                </DetailBlock>
              ) : null}

              {step.timing ? (
                <DetailBlock label="Timing">
                  <LineList
                    lines={[
                      `Mode · ${step.timing.mode}`,
                      step.timing.estimatedMinutes != null
                        ? `Estimated · ${step.timing.estimatedMinutes} min`
                        : null,
                      step.timing.mode === 'timed'
                        ? `Hard limit · ${step.timing.limitMinutes ?? 'unset'} min`
                        : 'No hard wall-clock (discussion uses follow-up / turn budget)',
                    ].filter(Boolean) as string[]}
                  />
                </DetailBlock>
              ) : null}

              {step.onlyIf ? (
                <DetailBlock label="Gate">
                  <p className="theme-interview-flow-timeline__gate type-body-sm mb-0">
                    {step.onlyIf}
                  </p>
                </DetailBlock>
              ) : null}

              {step.probes?.length ? (
                <DetailBlock label="Probes">
                  <ol className="theme-interview-flow-timeline__probe-list mb-0">
                    {step.probes.map((probe) => (
                      <li key={probe.id} className="type-body-sm type-muted">
                        <span className="theme-interview-flow-timeline__analysis-name">
                          {probe.goal}
                        </span>
                        {probe.required ? (
                          <span className="type-faint"> · required</span>
                        ) : null}
                        {probe.hint ? (
                          <span className="type-faint"> — {probe.hint}</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </DetailBlock>
              ) : null}

              {step.targets?.length ? (
                <DetailBlock label="Capture fields (targets)">
                  <ul className="theme-interview-flow-timeline__target-list mb-0 list-none p-0">
                    {step.targets.map((target) => (
                      <li key={target.key} className="type-body-sm type-muted">
                        <span className="theme-interview-flow-timeline__analysis-name">
                          {target.label}
                        </span>
                        {target.datatype ? (
                          <span className="type-faint"> · {target.datatype}</span>
                        ) : null}
                        {target.required ? (
                          <span className="type-faint"> · required</span>
                        ) : null}
                        {target.description ? (
                          <span className="type-faint"> — {target.description}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </DetailBlock>
              ) : null}

              {step.formQuestions?.length ? (
                <DetailBlock label="Form questions">
                  <ol className="theme-interview-flow-timeline__probe-list mb-0">
                    {step.formQuestions.map((q) => (
                      <li key={q.id} className="type-body-sm type-muted">
                        <span className="theme-interview-flow-timeline__analysis-name">
                          {q.prompt}
                        </span>
                        {q.kind ? <span className="type-faint"> · {q.kind}</span> : null}
                        {q.required ? <span className="type-faint"> · required</span> : null}
                        {q.gatesPass ? (
                          <span className="type-faint"> · answer-key / gate</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </DetailBlock>
              ) : null}

              {step.testCases?.length || step.languages?.length || step.defaultLanguage ? (
                <DetailBlock label="Coding assessment">
                  {step.defaultLanguage ? (
                    <p className="type-body-sm type-muted mb-1">
                      Default · {codingLanguageDisplayLabel(step.defaultLanguage)}
                    </p>
                  ) : null}
                  {step.testCases?.length ? (
                    <ul className="theme-interview-flow-timeline__target-list mb-0 list-none p-0">
                      {step.testCases.map((t) => (
                        <li key={t.id} className="type-body-sm type-muted">
                          Hidden test · {t.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </DetailBlock>
              ) : null}

              {step.analysisLines?.length || step.packLabel ? (
                <DetailBlock label="Analysis templates">
                  {step.packId || step.packLabel ? (
                    <p className="type-body-sm mb-1">
                      <span className="type-label">Pack · </span>
                      {step.packLabel}
                      {step.packId ? (
                        <span className="type-faint"> ({step.packId})</span>
                      ) : null}
                    </p>
                  ) : null}
                  {step.analysisLines?.length ? (
                    <ul className="theme-interview-flow-timeline__analysis-list mb-0 list-none p-0">
                      {step.analysisLines.map((line) => (
                        <li key={line.id} className="type-body-sm type-muted">
                          <span className="theme-interview-flow-timeline__analysis-name">
                            {line.label}
                          </span>
                          <span className="type-faint">
                            {' '}
                            · {line.when} · <code className="type-code">{line.templateId}</code>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="type-body-sm type-muted mb-0">
                      No turn templates in this pack (shallow / empty).
                    </p>
                  )}
                </DetailBlock>
              ) : null}

              {step.behaviourOverride ? (
                <DetailBlock label="Behaviour override">
                  <p className="type-body-sm type-muted mb-0">{step.behaviourOverride}</p>
                </DetailBlock>
              ) : null}

              {step.depthLines?.length ? (
                <DetailBlock label="Discussion depth">
                  <LineList lines={step.depthLines} />
                </DetailBlock>
              ) : null}

              {step.toolLines?.length ? (
                <DetailBlock label={step.kind === 'wrap' ? 'Rollup weights' : 'Stage notes'}>
                  <LineList lines={step.toolLines} />
                </DetailBlock>
              ) : null}

              {step.branches?.length ? (
                <DetailBlock label="If / else">
                  <ul className="theme-interview-flow-timeline__branches mb-0 list-none p-0">
                    {step.branches.map((branch) => (
                      <li
                        key={branch.id}
                        className={[
                          'theme-interview-flow-timeline__branch',
                          branch.tone
                            ? `theme-interview-flow-timeline__branch--${branch.tone}`
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span className="theme-interview-flow-timeline__branch-label">
                          {branch.label}
                        </span>
                        <span className="type-muted"> → {branch.next}</span>
                      </li>
                    ))}
                  </ul>
                </DetailBlock>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!isLast && !isStage ? (
          <div className="theme-interview-flow-timeline__rule" aria-hidden>
            <ArrangementRule />
          </div>
        ) : null}
      </div>
          </div>
        </div>
      </div>
    </li>
  )
}

export const InterviewFlowTimeline = forwardRef<
  InterviewFlowTimelineHandle,
  InterviewFlowTimelineProps
>(function InterviewFlowTimeline(
  {
    brief,
    scroll = INTERVIEW_FLOW_TIMELINE_SCROLL,
    scrollerRef,
    layoutEpoch,
    onFormChange,
    onTalkChange,
    onCodingChange,
    onDocChange,
    onWrapChange,
    onAnalysisChange,
    onDeleteTemplate,
    onSpineChange,
    onBriefMetaChange,
    coverFile = null,
    rolePdfFile = null,
    onCoverFileChange,
    onRolePdfFileChange,
    overview,
    reviewPack = null,
    onStageChrome,
    onAskHome,
    onAskAboutCard,
    highlightMessageId = null,
    className = '',
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLOListElement>(null)
  const editStageRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLLIElement>())
  /** Resolved nested scroll host (prop → ThemeScroll viewport → Creator-2 deck). */
  const resolvedScrollerRef = useRef<HTMLElement | null>(null)
  const [scrollHostReady, setScrollHostReady] = useState(0)
  /** Wait for panel enter / layout before measuring the glow rail. */
  const glowGated = layoutEpoch !== undefined
  const [glowReady, setGlowReady] = useState(!glowGated)
  /** After bottom-menu add — leave collapsed and scroll to it. */
  const pendingFocusAddedRef = useRef(false)
  const prevStepIdsRef = useRef<string[]>(brief.steps.map((s) => s.id))
  const removingIdRef = useRef<string | null>(null)
  /** Deck scrollTop when entering edit stage (legacy anchor; collapse pins the section). */
  const deckScrollBeforeEditRef = useRef<number | null>(null)
  const deckScrollTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null)
  const jumpGenRef = useRef(0)
  const pinTimersRef = useRef<number[]>([])
  /** Theme-menu swap: null = day timeline; id = full edit stage for that section. */
  const [editSectionId, setEditSectionId] = useState<string | null>(null)
  const isEditStage = editSectionId != null

  const resolveScrollHost = (): HTMLElement | null => {
    if (scrollerRef?.current) return scrollerRef.current
    const root = rootRef.current
    if (!root) return null
    return (
      root.closest('.theme-scroll__viewport') ??
      root.closest('.theme-interview-creator-2__deck') ??
      null
    )
  }

  useLayoutEffect(() => {
    const host = resolveScrollHost()
    if (resolvedScrollerRef.current !== host) {
      resolvedScrollerRef.current = host
      setScrollHostReady((n) => n + 1)
    } else {
      resolvedScrollerRef.current = host
    }
  }, [scrollerRef, isEditStage, brief.steps.length, layoutEpoch])

  useEffect(() => {
    if (!glowGated) {
      const t = window.setTimeout(() => setGlowReady(true), 48)
      return () => window.clearTimeout(t)
    }
    if ((layoutEpoch ?? 0) <= 0) {
      setGlowReady(false)
      return
    }
    setGlowReady(false)
    const t = window.setTimeout(() => setGlowReady(true), 32)
    return () => window.clearTimeout(t)
  }, [glowGated, layoutEpoch])

  useGlowTimelineScroll({
    scopeRef: rootRef,
    triggerRef,
    timelineRef,
    scroll,
    orientation: 'vertical',
    // Prefer an explicit host; otherwise wait until layout resolves a nested viewport.
    scrollerRef:
      scrollerRef?.current || (scrollHostReady > 0 && resolvedScrollerRef.current)
        ? scrollerRef?.current
          ? scrollerRef
          : resolvedScrollerRef
        : undefined,
    splitRail: true,
    enabled: !isEditStage && glowReady,
  })

  const resolveDeckHost = (): HTMLElement | null =>
    resolvedScrollerRef.current ?? resolveScrollHost()

  const scrollDeckTo = (nextTop: number, smooth: boolean): Promise<void> => {
    const host = resolveDeckHost()
    if (!host) return Promise.resolve()
    const max = Math.max(0, host.scrollHeight - host.clientHeight)
    const top = Math.max(0, Math.min(nextTop, max))
    deckScrollTweenRef.current?.kill()
    gsap.killTweensOf(host)
    if (!smooth) {
      host.scrollTop = top
      deckScrollTweenRef.current = null
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      deckScrollTweenRef.current = gsap.to(host, {
        scrollTop: top,
        duration: 0.52,
        ease: 'power2.inOut',
        overwrite: true,
        onComplete: () => resolve(),
        onInterrupt: () => resolve(),
      })
    })
  }

  const scrollElementIntoDeck = (
    target: HTMLElement,
    smooth: boolean,
    offsetPx = 20,
  ): Promise<void> => {
    const host = resolveDeckHost()
    if (!host) return Promise.resolve()
    const hostRect = host.getBoundingClientRect()
    const elRect = target.getBoundingClientRect()
    const nextTop = host.scrollTop + (elRect.top - hostRect.top - offsetPx)
    return scrollDeckTo(nextTop, smooth)
  }

  const resolveStepEl = (stepId: string): HTMLElement | null =>
    itemRefs.current.get(stepId) ??
    timelineRef.current?.querySelector(`#${CSS.escape(stepId)}`) ??
    null

  const stepDriftPx = (id: string, offsetPx: number): number | null => {
    const host = resolveDeckHost()
    const el = resolveStepEl(id)
    if (!host || !el) return null
    return el.getBoundingClientRect().top - host.getBoundingClientRect().top - offsetPx
  }

  const scrollStepIntoView = (id: string, smooth: boolean) => {
    const gen = ++jumpGenRef.current
    flushSync(() => {
      revealInterviewFlowDeferredBodies()
    })
    const pin = (behavior: boolean) => {
      if (gen !== jumpGenRef.current) return Promise.resolve()
      const el = resolveStepEl(id)
      if (!el) return Promise.resolve()
      return scrollElementIntoDeck(el, behavior, 28)
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void (async () => {
          await pin(smooth)
          if (!smooth || gen !== jumpGenRef.current) return
          const drift = stepDriftPx(id, 28)
          if (drift != null && Math.abs(drift) > 16) await pin(false)
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 360)
          })
          if (gen !== jumpGenRef.current) return
          const late = stepDriftPx(id, 28)
          if (late != null && Math.abs(late) > 16) await pin(false)
        })()
      })
    })
  }

  const rememberDeckAnchor = () => {
    const host = resolveDeckHost()
    if (host) deckScrollBeforeEditRef.current = host.scrollTop
  }

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const enterEditStage = (id: string) => {
    if (id === CREATOR_OVERVIEW_SECTION_ID) {
      scrollStepIntoView(id, true)
      return
    }
    pinTimersRef.current.forEach((t) => window.clearTimeout(t))
    pinTimersRef.current = []
    if (isResultReviewSectionId(id)) {
      scrollStepIntoView(id, true)
      return
    }
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
    rememberDeckAnchor()
    setEditSectionId(id)
  }

  const jumpOverviewCite = (cite: JumpCite, sectionId: string) => {
    if (cite.kind === 'message') {
      setPendingReviewJump({ messageId: cite.ref })
      enterEditStage(`${sectionId}${RESULT_REVIEW_CHAT_SUFFIX}`)
      return
    }
    if (cite.kind === 'tape_action') {
      setPendingReviewJump({ seekT: cite.t })
      enterEditStage(`${sectionId}${RESULT_REVIEW_EDITOR_SUFFIX}`)
      return
    }
    scrollStepIntoView(cite.kind === 'case' && cite.ref ? cite.ref : sectionId, true)
  }

  const exitEditStage = async (pinTo?: string | false) => {
    pinTimersRef.current.forEach((t) => window.clearTimeout(t))
    pinTimersRef.current = []
    const exitedId = editSectionId
    deckScrollBeforeEditRef.current = null
    setEditSectionId(null)
    if (pinTo === false) return
    // Day remounts — pin the collapsed section (instant). Smooth “restore then
    // ScrollTrigger settle” was fighting the glow re-bind and yanking peel to top.
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    await new Promise<void>((r) => requestAnimationFrame(() => r()))

    const pinCollapsed = () => {
      const pinId =
        pinTo ||
        (exitedId === DECLARATION_SECTION_ID
          ? OVERVIEW_SECTION_ID
          : exitedId === SECURITY_DETAIL_SECTION_ID
            ? SECURITY_SECTION_ID
            : exitedId === CLARITY_DETAIL_SECTION_ID
              ? CLARITY_SECTION_ID
              : exitedId
                ? parseResultReviewEditId(exitedId)?.stepId ?? exitedId
                : null)
      if (!pinId) return
      scrollStepIntoView(pinId, false)
    }
    pinCollapsed()
    ScrollTrigger.refresh()
    // Glow ScrollTrigger settle timers (≈64ms / 420ms) can reflow the peel — re-pin.
    pinTimersRef.current.push(window.setTimeout(pinCollapsed, 80))
    pinTimersRef.current.push(window.setTimeout(pinCollapsed, 450))
  }

  useImperativeHandle(
    ref,
    () => ({
      isEditStage: () => editSectionId != null,
      exitEditStage,
      scrollToSection: (id: string) => {
        if (editSectionId != null) {
          void exitEditStage().then(() => scrollStepIntoView(id, true))
          return
        }
        scrollStepIntoView(id, true)
      },
      openSection: (id: string) => {
        if (id === DECLARATION_SECTION_ID) {
          enterEditStage(DECLARATION_SECTION_ID)
          return
        }
        if (id === SECURITY_SECTION_ID || id === SECURITY_DETAIL_SECTION_ID) {
          enterEditStage(SECURITY_DETAIL_SECTION_ID)
          return
        }
        if (id === CLARITY_SECTION_ID || id === CLARITY_DETAIL_SECTION_ID) {
          enterEditStage(CLARITY_DETAIL_SECTION_ID)
          return
        }
        const review = reviewPack?.sections[id]
        if (review) {
          const mode = defaultResultReviewMode(review)
          enterEditStage(
            `${id}${mode === 'chat' ? RESULT_REVIEW_CHAT_SUFFIX : RESULT_REVIEW_EDITOR_SUFFIX}`,
          )
          return
        }
        enterEditStage(id)
      },
      openReview: (id: string, mode?: 'chat' | 'editor') => {
        const target = resolveAidOpenRef({ sectionId: id, stage: mode }, reviewPack?.sections ?? null)
        if (target.action === 'overview') {
          if (editSectionId) void exitEditStage(OVERVIEW_SECTION_ID)
          else scrollStepIntoView(OVERVIEW_SECTION_ID, true)
          return
        }
        if (target.action === 'security') {
          enterEditStage(SECURITY_DETAIL_SECTION_ID)
          return
        }
        if (target.action === 'clarity') {
          enterEditStage(CLARITY_DETAIL_SECTION_ID)
          return
        }
        if (target.action === 'review') {
          enterEditStage(
            `${target.stepId}${
              target.mode === 'chat' ? RESULT_REVIEW_CHAT_SUFFIX : RESULT_REVIEW_EDITOR_SUFFIX
            }`,
          )
        }
      },
      focusSection: (id: string) => {
        if (editSectionId != null && editSectionId !== id) {
          void exitEditStage().then(() => enterEditStage(id))
          return
        }
        enterEditStage(id)
      },
    }),
    [editSectionId, reviewPack],
  )

  const addSection = (kind: SpineSectionKind) => {
    if (!onSpineChange) return
    if (isEditStage) void exitEditStage()
    else setEditSectionId(null)
    pendingFocusAddedRef.current = true
    onSpineChange({ type: 'addSection', kind })
  }

  const removeSection = (phaseId: string) => {
    if (!onSpineChange || removingIdRef.current) return
    const el = itemRefs.current.get(phaseId)
    const reduced = prefersReducedMotion()

    const commit = () => {
      removingIdRef.current = null
      if (editSectionId === phaseId) {
        deckScrollBeforeEditRef.current = null
        setEditSectionId(null)
      }
      onSpineChange({ type: 'removeTalk', phaseId })
    }

    // Edit stage: remove immediately (row isn’t on the day list).
    if (isEditStage || !el || reduced) {
      commit()
      return
    }

    removingIdRef.current = phaseId
    const height = el.getBoundingClientRect().height
    gsap.killTweensOf(el)
    gsap.set(el, {
      height,
      overflow: 'hidden',
      pointerEvents: 'none',
    })
    gsap.to(el, {
      autoAlpha: 0,
      height: 0,
      marginTop: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
      duration: 0.4,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onComplete: commit,
    })
  }

  /** New blank section: stay on day; scroll into view. */
  useLayoutEffect(() => {
    if (isEditStage) return
    const ids = brief.steps.map((s) => s.id)
    if (!pendingFocusAddedRef.current) {
      prevStepIdsRef.current = ids
      return
    }
    const added = ids.find(
      (id) =>
        !prevStepIdsRef.current.includes(id) &&
        id !== 'interview.rollup' &&
        !id.startsWith('offspine.'),
    )
    prevStepIdsRef.current = ids
    pendingFocusAddedRef.current = false
    if (!added) return

    const raf = window.requestAnimationFrame(() => {
      scrollStepIntoView(added, true)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [brief.steps, scrollerRef, isEditStage, scrollHostReady])

  /** Soft reveal when entering edit stage (Theme-section style — no timeline morph). */
  useEffect(() => {
    if (!editSectionId || !editStageRef.current) return
    const reduced = prefersReducedMotion()
    const host = resolveDeckHost()
    if (host) host.scrollTop = 0
    revealSectionIn(editStageRef.current, {
      reducedMotion: reduced,
      duration: reduced ? 0 : 0.4,
      stagger: 0.03,
      fromY: reduced ? 0 : 8,
    })
  }, [editSectionId])

  useEffect(() => {
    return () => {
      deckScrollTweenRef.current?.kill()
    }
  }, [])

  const bindItemRef = (id: string) => (node: HTMLLIElement | null) => {
    if (node) itemRefs.current.set(id, node)
    else itemRefs.current.delete(id)
  }

  const phaseOptions = brief.steps
    .filter((s) => s.kind !== 'wrap')
    .map((s) => ({ id: s.id, title: s.title, kind: s.kind }))
  const talkSpine = brief.steps
    .filter((s) => s.talkEditor)
    .map((s) => ({
      id: s.id,
      title: s.talkEditor!.topicLabel || s.title,
      topicId: s.talkEditor!.topicId,
    }))
  const toolSpine = brief.steps
    .filter((s) => s.kind === 'form' || s.kind === 'coding' || s.kind === 'doc')
    .map((s) => ({
      id: s.id,
      title: s.title,
      toolRef:
        s.formEditor?.toolRef ??
        s.codingEditor?.toolRef ??
        s.docEditor?.toolRef ??
        s.id.replace(/^offspine\./, ''),
    }))
  const shelf = brief.analysisShelf
  const showOverview = Boolean(overview)
  const showCreatorOverview = !showOverview
  const hasDeclarations = Boolean(overview && resultOverviewHasDeclarations(overview))
  const hasSecurity = Boolean(overview && resultOverviewHasSecurity(overview))
  const hasClarity = Boolean(overview && resultOverviewHasClarity(overview))
  const showTemplates = Boolean(!showOverview && shelf && onAnalysisChange)
  const reviewSpine = brief.steps
    .filter((step) => step.kind !== 'wrap')
    .map((step) => ({ id: step.id, title: step.title, kind: step.kind }))
  const visibleSteps = useMemo(
    () => (showOverview ? brief.steps.filter((step) => step.kind !== 'wrap') : brief.steps),
    [brief.steps, showOverview],
  )
  const templateHosts = templateAttachHostsFromBrief(brief)
  const templateUsage: Record<string, number> = {}
  for (const [id, titles] of Object.entries(templateHosts)) {
    templateUsage[id] = titles.length
  }

  const tocEntries = useMemo((): NanoAnchorMenuEntry[] => {
    const entries: NanoAnchorMenuEntry[] = []
    if (showOverview) {
      entries.push({
        id: OVERVIEW_SECTION_ID,
        label: 'Overview',
        level: 2,
        icon: LayoutList,
      })
      if (hasSecurity) {
        entries.push({
          id: SECURITY_SECTION_ID,
          label: 'Security',
          level: 2,
          icon: Shield,
        })
      }
      if (hasClarity) {
        entries.push({
          id: CLARITY_SECTION_ID,
          label: 'Clarity',
          level: 2,
          icon: Scan,
        })
      }
    } else {
      if (showCreatorOverview) {
        entries.push({
          id: CREATOR_OVERVIEW_SECTION_ID,
          label: 'Overview',
          level: 2,
          icon: BookOpen,
        })
      }
      if (showTemplates) {
        entries.push({
          id: TEMPLATES_SECTION_ID,
          label: 'Templates',
          level: 2,
          icon: LayoutTemplate,
        })
      }
    }
    for (const step of visibleSteps) {
      entries.push({
        id: step.id,
        label: step.title,
        level: 2,
        icon: KIND_ICON[step.kind] ?? AlertTriangle,
      })
    }
    return entries
  }, [hasClarity, hasSecurity, showCreatorOverview, showOverview, showTemplates, visibleSteps])

  const tocSortableIds = useMemo(
    () =>
      brief.steps
        .filter((step) => step.kind !== 'wrap' && !step.offSpine)
        .map((step) => step.id),
    [brief.steps],
  )

  const reviewEdit = parseResultReviewEditId(editSectionId)
  const reviewEditStep = reviewEdit
    ? brief.steps.find((s) => s.id === reviewEdit.stepId) ?? null
    : null
  const isDeclarationEdit = editSectionId === DECLARATION_SECTION_ID
  const isSecurityEdit = editSectionId === SECURITY_DETAIL_SECTION_ID
  const isClarityEdit = editSectionId === CLARITY_DETAIL_SECTION_ID

  const reviewEditReview = reviewEdit ? reviewPack?.sections[reviewEdit.stepId] ?? null : null
  const stageChrome: ResultStageChrome | null =
    reviewEdit && reviewEditReview && (reviewEditReview.canChat || reviewEditReview.canEditor)
      ? {
          stepId: reviewEdit.stepId,
          mode: reviewEdit.mode,
          canChat: reviewEditReview.canChat,
          canEditor: reviewEditReview.canEditor,
          open: (mode) =>
            enterEditStage(
              `${reviewEdit.stepId}${
                mode === 'chat' ? RESULT_REVIEW_CHAT_SUFFIX : RESULT_REVIEW_EDITOR_SUFFIX
              }`,
            ),
        }
      : null
  const chromeKey = stageChrome
    ? `${stageChrome.stepId}:${stageChrome.mode}:${stageChrome.canChat}:${stageChrome.canEditor}`
    : ''
  const chromeRef = useRef(stageChrome)
  chromeRef.current = stageChrome
  useEffect(() => {
    onStageChrome?.(chromeRef.current)
    return () => onStageChrome?.(null)
  }, [chromeKey, onStageChrome])
  const editStep =
    !reviewEdit &&
    !isDeclarationEdit &&
    !isSecurityEdit &&
    !isClarityEdit &&
    editSectionId &&
    editSectionId !== TEMPLATES_SECTION_ID &&
    editSectionId !== CREATOR_OVERVIEW_SECTION_ID &&
    !isResultReviewSectionId(editSectionId)
      ? brief.steps.find((s) => s.id === editSectionId) ?? null
      : null
  const editTemplates = editSectionId === TEMPLATES_SECTION_ID && shelf && onAnalysisChange

  const sharedStepProps = {
    phaseOptions,
    talkSpine,
    toolSpine,
    templateMeta: shelf?.templateMeta,
    libraryIds: shelf?.libraryIds,
    onTemplateMetaChange:
      onAnalysisChange && shelf
        ? (templateMeta: InterviewFlowAnalysisShelfState['templateMeta']) =>
            onAnalysisChange({ ...shelf, templateMeta })
        : undefined,
    probeDefaults: brief.probeDefaults,
    onFormChange,
    onTalkChange,
    onCodingChange,
    onDocChange,
    onWrapChange,
    onSpineChange,
    onRemoveSection: onSpineChange ? removeSection : undefined,
    onAskHome,
  }

  /** Contents Add — muted label + four icon-only kinds (scroll via addSection). */
  const contentsToc =
    tocEntries.length > 0 ? (
      <div className="theme-interview-flow-timeline__toc-slot">
        <NanoAnchorMenu
          entries={tocEntries}
          variant="micro"
          scrollSpy
          scrollRootRef={
            resolvedScrollerRef.current ? resolvedScrollerRef : scrollerRef
          }
          sticky={false}
          title="Contents"
          onSelect={(id) => scrollStepIntoView(id, true)}
          label="Interview sections"
          sortableIds={onSpineChange ? tocSortableIds : undefined}
          onReorder={
            onSpineChange
              ? (phaseIds) => onSpineChange({ type: 'reorderPhases', phaseIds })
              : undefined
          }
          footer={
            onSpineChange ? (
              <div className="theme-interview-flow-timeline__toc-add">
                <span className="theme-interview-flow-timeline__toc-add-label type-caption type-muted">
                  Add
                </span>
                {INTERVIEW_FLOW_SECTION_ADD_KINDS.map((row, index) => (
                  <div key={row.kind} className="theme-interview-flow-timeline__add-item">
                    {index > 0 ? (
                      <span
                        className="theme-interview-flow-timeline__add-rule"
                        role="presentation"
                      />
                    ) : null}
                    <Tooltip content={`Add ${row.label}`} placement="top">
                      <span className="theme-interview-flow-timeline__toc-add-hit">
                        <VurifyMenuButton
                          type="button"
                          variant="icon-only"
                          size="sm"
                          lineTone="muted"
                          icon={row.icon}
                          aria-label={`Add ${row.label}`}
                          onClick={() => addSection(row.kind)}
                        >
                          {row.label}
                        </VurifyMenuButton>
                      </span>
                    </Tooltip>
                  </div>
                ))}
              </div>
            ) : undefined
          }
        />
      </div>
    ) : null

  return (
    <div
      ref={rootRef}
      className={[
        'theme-interview-flow-timeline',
        'theme-glow-timeline',
        'theme-glow-timeline--cardless',
        'theme-glow-timeline--vertical',
        isEditStage ? 'is-edit-stage' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={isEditStage ? 'Section editor' : showOverview ? 'Attempt review' : 'Interview outline'}
    >
      {isEditStage ? (
        <div
          ref={editStageRef}
          className="theme-interview-flow-timeline__edit-stage"
          data-creator2-reveal
        >
          {editTemplates && shelf ? (
            <div className="theme-interview-flow-timeline__edit-stage-body">
              <InterviewFlowTemplatesSectionHead
                libraryIds={shelf.libraryIds}
                usageById={templateUsage}
                hostsById={templateHosts}
                templateMeta={shelf.templateMeta}
              />
              <InterviewFlowTemplatesSection
                state={shelf}
                usageById={templateUsage}
                hostsById={templateHosts}
                expanded
                onToggle={() => void exitEditStage()}
                onChange={onAnalysisChange!}
                onDeleteTemplate={(templateId) => onDeleteTemplate?.(templateId)}
              />
            </div>
          ) : isDeclarationEdit && overview ? (
            <InterviewFlowDeclarationReviewStage
              overview={overview}
            />
          ) : isSecurityEdit && overview ? (
            <InterviewFlowSecurityReviewStage
              overview={overview}
              sections={reviewSpine}
              onJumpToSection={(id) => {
                void exitEditStage(id)
              }}
              onJumpCite={(cite, sectionId) => {
                void exitEditStage(false).then(() => jumpOverviewCite(cite, sectionId))
              }}
            />
          ) : isClarityEdit && overview ? (
            <InterviewFlowClarityReviewStage
              overview={overview}
              sections={reviewSpine}
              onJumpToSection={(id) => {
                void exitEditStage(id)
              }}
              onJumpCite={(cite, sectionId) => {
                void exitEditStage(false).then(() => jumpOverviewCite(cite, sectionId))
              }}
            />
          ) : reviewEdit && reviewEditStep && reviewPack ? (
            <InterviewFlowResultReviewStage
              step={reviewEditStep}
              mode={reviewEdit.mode}
              pack={reviewPack}
              highlightMessageId={highlightMessageId}
              onAskAboutCard={onAskAboutCard}
            />
          ) : editStep ? (
            <StepBlock
              key={editStep.id}
              step={editStep}
              isLast
              expanded
              variant="stage"
              {...sharedStepProps}
              onToggle={() => void exitEditStage()}
            />
          ) : null}
        </div>
      ) : (
        <DocArticleShell stickyToc microToc tocScroll={false} toc={contentsToc}>
          <div ref={triggerRef}>
            <div className="theme-glow-timeline__shell theme-interview-flow-timeline__shell">
              <span className="theme-glow-timeline__axis" aria-hidden />
              <span className="theme-glow-timeline__axis-glow" aria-hidden />
              <span className="theme-glow-timeline__marker" aria-hidden />
              <ol
                ref={timelineRef}
                className="theme-glow-timeline__list theme-glow-timeline__list--glow theme-interview-flow-timeline__list mb-0"
              >
                {showOverview && overview ? (
                  <>
                    <ResultReviewItem
                      id={OVERVIEW_SECTION_ID}
                      itemRef={bindItemRef(OVERVIEW_SECTION_ID)}
                      showRule={hasSecurity || hasClarity || Boolean(brief.steps.length)}
                    >
                      <InterviewFlowOverviewSectionHead overview={overview} onAskHome={onAskHome} />
                      <InterviewFlowOverviewSection
                        overview={overview}
                        sections={reviewSpine}
                        onJumpToSection={(id) => scrollStepIntoView(id, true)}
                        onJumpCite={jumpOverviewCite}
                        onOpenDeclarations={
                          hasDeclarations
                            ? () => enterEditStage(DECLARATION_SECTION_ID)
                            : undefined
                        }
                      />
                    </ResultReviewItem>
                    {hasSecurity ? (
                      <ResultReviewItem
                        id={SECURITY_SECTION_ID}
                        itemRef={bindItemRef(SECURITY_SECTION_ID)}
                        showRule={hasClarity || Boolean(brief.steps.length)}
                      >
                        <InterviewFlowSecuritySectionHead overview={overview} onAskHome={onAskHome} />
                        <InterviewFlowSecuritySection
                          overview={overview}
                          sections={reviewSpine}
                          onOpenSecurity={() => enterEditStage(SECURITY_DETAIL_SECTION_ID)}
                        />
                      </ResultReviewItem>
                    ) : null}
                    {hasClarity ? (
                      <ResultReviewItem
                        id={CLARITY_SECTION_ID}
                        itemRef={bindItemRef(CLARITY_SECTION_ID)}
                        showRule={Boolean(brief.steps.length)}
                      >
                        <InterviewFlowClaritySectionHead overview={overview} onAskHome={onAskHome} />
                        <InterviewFlowClaritySection
                          overview={overview}
                          sections={reviewSpine}
                          onJumpToSection={(id) => scrollStepIntoView(id, true)}
                          onJumpCite={jumpOverviewCite}
                          onOpenClarity={() => enterEditStage(CLARITY_DETAIL_SECTION_ID)}
                        />
                      </ResultReviewItem>
                    ) : null}
                  </>
                ) : null}
                {showCreatorOverview ? (
                  <li
                    id={CREATOR_OVERVIEW_SECTION_ID}
                    data-doc-toc={CREATOR_OVERVIEW_SECTION_ID}
                    ref={bindItemRef(CREATOR_OVERVIEW_SECTION_ID)}
                    className="theme-interview-flow-timeline__item is-templates is-talk-editable"
                  >
                    <div className="theme-interview-flow-timeline__focus-shell">
                      <div className="theme-interview-flow-timeline__focus-shell-inner">
                        <div className="theme-glow-timeline__item theme-interview-flow-timeline__item-body">
                          <span className="theme-glow-timeline__dot" aria-hidden />
                          <div className="theme-interview-flow-timeline__copy">
                            <InterviewFlowCreatorOverviewSectionHead />
                            <InterviewFlowCreatorOverviewSection
                              brief={brief}
                              onChange={onBriefMetaChange}
                              coverFile={coverFile}
                              rolePdfFile={rolePdfFile}
                              onCoverFileChange={onCoverFileChange}
                              onRolePdfFileChange={onRolePdfFileChange}
                            />
                            {showTemplates || brief.steps.length ? (
                              <div className="theme-interview-flow-timeline__rule" aria-hidden>
                                <ArrangementRule />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ) : null}
                {showTemplates && shelf ? (
                  <li
                    id={TEMPLATES_SECTION_ID}
                    data-doc-toc={TEMPLATES_SECTION_ID}
                    ref={bindItemRef(TEMPLATES_SECTION_ID)}
                    className="theme-interview-flow-timeline__item is-templates is-talk-editable"
                  >
                    <div className="theme-interview-flow-timeline__focus-shell">
                      <div className="theme-interview-flow-timeline__focus-shell-inner">
                        <div className="theme-glow-timeline__item theme-interview-flow-timeline__item-body">
                          <span className="theme-glow-timeline__dot" aria-hidden />
                          <div className="theme-interview-flow-timeline__copy">
                            <InterviewFlowTemplatesSectionHead
                              libraryIds={shelf.libraryIds}
                              usageById={templateUsage}
                              hostsById={templateHosts}
                              templateMeta={shelf.templateMeta}
                            />
                            <InterviewFlowTemplatesSection
                              state={shelf}
                              usageById={templateUsage}
                              hostsById={templateHosts}
                              expanded={false}
                              onToggle={() => enterEditStage(TEMPLATES_SECTION_ID)}
                              onChange={onAnalysisChange!}
                              onDeleteTemplate={(templateId) => onDeleteTemplate?.(templateId)}
                            />
                            {brief.steps.length ? (
                              <div className="theme-interview-flow-timeline__rule" aria-hidden>
                                <ArrangementRule />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ) : null}
                {visibleSteps.map((step, index) => (
                  <StepBlock
                    key={step.id}
                    step={step}
                    isLast={index === visibleSteps.length - 1}
                    expanded={false}
                    variant="timeline"
                    {...sharedStepProps}
                    reviewMode={Boolean(overview)}
                    review={reviewPack?.sections[step.id] ?? null}
                    onOpenReview={(mode) =>
                      enterEditStage(
                        `${step.id}${
                          mode === 'chat'
                            ? RESULT_REVIEW_CHAT_SUFFIX
                            : RESULT_REVIEW_EDITOR_SUFFIX
                        }`,
                      )
                    }
                    itemRef={bindItemRef(step.id)}
                    onToggle={() => enterEditStage(step.id)}
                  />
                ))}
              </ol>
              {onSpineChange ? (
                <div className="theme-interview-flow-timeline__add">
                  <InterviewFlowSectionAddBar onAdd={addSection} />
                </div>
              ) : null}
            </div>
          </div>
        </DocArticleShell>
      )}
    </div>
  )
})
