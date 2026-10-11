import {
  ArrowUpRight,
  ChevronDown,
  ClipboardList,
  Code2,
  Command,
  Keyboard,
  LayoutList,
  MessageSquare,
  Mic,
  PenLine,
  Shield,
  Scan,
  TextCursorInput,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { QuestionTake } from './testFormParts/QuestionTake'
import { VurifyInput } from './VurifyInput'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifySelect } from './VurifySelect'
import { sittingDeclarationFormQuestions, sittingDeclarationFormResponses } from './InterviewLandingDeclaration'
import {
  DocArticleDivider,
  DocArticleHeading,
  DocArticleLayout,
  DocArticleParagraph,
  DocArticleSection,
} from './DocArticle'
import { EChart } from './EChart'
import { ChartCard } from './ChartCard'
import { ChartEmbed } from './ChartEmbed'
import { OpenStreetMapCanvas } from './OpenStreetMapCanvas'
import {
  BeatTagRow,
  OverviewBeat,
  OverviewBeatStack,
  OverviewSnapshot,
  ReportShell,
  featureTags,
  type OverviewBeatLink,
  type OverviewBeatTag,
  type OverviewSnapshotRow,
} from './InterviewFlowReportBeats'

export { OverviewBeatStack }
import { AskAidLink } from './InterviewFlowResultSection'
import { Tag } from './Tag'
import { buildScoreDonutOption } from './InterviewOutputCardRepeater'
import {
  buildOverviewScoreRows,
  formGateLabel,
  sittingResultHeadlinePending,
  sittingResultNeedsReview,
  splitOverviewParagraphs,
  type InterviewOutputCardFixture,
  type OverviewClarityDiagrams,
  type OverviewScoreRow,
  type ResultOverview,
} from '../lib/interviewRunApi/fixtures/output-cards/outputCardFixture'
import {
  completeRatioSignal,
  outputMetaTagIcon,
  sittingReadChipHint,
} from '../lib/interviewRunApi/outputMetaTagIcon'
import { sittingReadReport, isSittingReadScoreLabel, sittingReadFindingMarkdown, type SittingReadSection } from '../lib/interviewRunApi/sittingReadMarkup'
import { humanIncidentKind } from '../lib/interviewRunApi/reportDialect'
import {
  insertMarksFromIncidents,
  insertSourceLabel,
  type InsertSource,
} from '../lib/interviewRunApi/insertSource'
import type { InterviewFlowStepKind } from '../lib/interviewBrief'
import { useChartTheme, echartsAxisLabel, echartsAxisLine, echartsSplitLine } from '../lib/charts/chartTheme'
import type { EChartsOption } from 'echarts'
import type { SessionSeries, SessionSeriesPhase } from '../lib/interviewRunApi/sessionSeries'
import { firstJumpCite, type JumpCite } from '../lib/interviewRunApi/jumpCite'
import { formatTapeClock } from '../lib/interviewRunApi/editorCapture/timelineIndex'
import {
  DECLARE_FORM_COPY,
  DECLARE_Q_CONDITIONS,
  DECLARE_Q_FIELD,
  DECLARE_Q_LOOK,
  formatSittingDeclareStamp,
  sittingDeclarationReviewTag,
  type IntakeDeclarationsPack,
} from '../lib/interviewRunApi/sittingDeclaration'

type OverviewSpineSection = {
  id: string
  title: string
  kind?: InterviewFlowStepKind
}

type InterviewFlowOverviewSectionProps = {
  overview: ResultOverview
  sections?: readonly OverviewSpineSection[]
  onJumpToSection?: (id: string) => void
  onJumpCite?: (cite: JumpCite, sectionId: string) => void
  /** Result review — open the landing declaration as a Form-style edit stage. */
  onOpenDeclarations?: () => void
  /** Result review — open Security as a Conversation/Work-style edit stage. */
  onOpenSecurity?: () => void
  /** Result review — open Clarity as a Conversation/Work-style edit stage. */
  onOpenClarity?: () => void
  onAskHome?: (attach: import('../lib/interviewRunApi/aidPeelAttach').AidPeelAttach) => void
  className?: string
}

const SNAPSHOT_ICONS: Record<string, LucideIcon> = {
  form: ClipboardList,
  coding: Code2,
  doc: PenLine,
  talk: MessageSquare,
}

const CHECK_ICONS: Record<string, LucideIcon> = {
  cursor: TextCursorInput,
  typing: Keyboard,
  dictation: Mic,
  vpn: Shield,
  paste: ClipboardList,
  hotkeys: Command,
  recordings: Video,
}

const CHECK_HINTS: Record<string, string> = {
  cursor: 'Cursor',
  typing: 'Typing',
  dictation: 'Dictation',
  vpn: 'Network',
  paste: 'Paste',
  hotkeys: 'Shortcuts',
  recordings: 'Tapes',
}

const interviewFlowDeferredRevealers = new Set<() => void>()

/** Mount Security / Clarity report bodies before measuring a jump past them. */
export function revealInterviewFlowDeferredBodies() {
  for (const reveal of interviewFlowDeferredRevealers) reveal()
}

/** Keep the section head in the DOM for TOC glow; mount the body when it nears the viewport. */
function WhenVisible({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const reveal = () => setVisible(true)
    interviewFlowDeferredRevealers.add(reveal)
    return () => {
      interviewFlowDeferredRevealers.delete(reveal)
    }
  }, [])

  useEffect(() => {
    const el = hostRef.current
    if (!el || visible) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const root =
      el.closest('.theme-scroll__viewport') ??
      el.closest('.theme-interview-creator-2__deck') ??
      null
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { root, rootMargin: '240px 0px', threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  return (
    <div ref={hostRef} className={className}>
      {visible ? children : null}
    </div>
  )
}

function captureIcon(capture: string): LucideIcon {
  const key = capture.trim().toLowerCase()
  if (key === 'talk' || key.includes('talk')) return Video
  if (key.includes('form')) return ClipboardList
  if (key.includes('editor') || key.includes('coding')) return Code2
  if (key.includes('writing')) return PenLine
  return Video
}

function percentLabel(unit: number): string {
  return `${Math.round(unit * 100)}%`
}

function snapshotReading(row: {
  id: string
  reading: string
  unit?: number
}): string {
  if (typeof row.unit !== 'number') return row.reading
  const pct = percentLabel(row.unit)
  if (pct === row.reading) return row.reading
  return `${row.reading} · ${pct}`
}

function clarityFindingTagHint(tag: { label: string; hint?: string }): string {
  const named = tag.hint?.trim() ?? ''
  if (named.split(/\s+/).length >= 4) return named
  const label = tag.label.trim()
  if (/between keys|median gap/i.test(label) || /spacing/i.test(named)) {
    return 'Typical pause between keystrokes on this recording'
  }
  if (/%\s*idle/i.test(label) || /^idle$/i.test(named)) {
    return 'Share of this recording with no typing'
  }
  if (/idle stretch|stall/i.test(label)) {
    return 'A stretch with no typing on this recording'
  }
  if (/reconnect/i.test(label) || /reconnect/i.test(named) || /^attack$/i.test(label)) {
    return 'The browser lost the connection and came back'
  }
  if (/\d+\s*files?/i.test(label) || /file hop/i.test(named) || /^file$/i.test(named)) {
    return 'How often they switched files on this stage'
  }
  if (/keystroke/i.test(named)) {
    return 'Whether typing was even or stop-start on this stage'
  }
  if (/^focus$/i.test(named)) {
    return 'Whether they stayed on one stage or moved between several'
  }
  if (/^pace$/i.test(named)) {
    return 'How even the replies or keystrokes were on this stage'
  }
  if (/^talk$/i.test(named)) {
    return 'Conversation replies on this stage'
  }
  if (/^speak$/i.test(named)) {
    return 'Voice typing sessions on this stage'
  }
  return named || 'Observed on this stage'
}

function uniqueLabels(labels: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const label of labels) {
    if (seen.has(label)) continue
    seen.add(label)
    out.push(label)
  }
  return out
}

function chipKind(
  kind: InterviewFlowStepKind | undefined,
): 'talk' | 'coding' | 'doc' | 'form' | undefined {
  if (kind === 'form' || kind === 'coding' || kind === 'doc' || kind === 'talk') return kind
  return undefined
}

function isTalkCapture(
  capture: string,
  kind?: InterviewFlowStepKind,
): boolean {
  if (kind === 'talk') return true
  const key = capture.trim().toLowerCase()
  return key === 'talk' || key.includes('talk')
}

/** The sitting introduction. Produced all along by `stitchSittingThesis` and carried on
 * `overview.summary`, but nothing on this surface ever read it.
 */
function OverviewIntroBeat({ summary }: { summary?: string }) {
  const paragraphs = splitOverviewParagraphs(summary)
  if (!paragraphs.length) return null
  return (
    <article className="theme-interview-flow-overview__beat">
      <h4 className="theme-interview-flow-overview__beat-title type-body-lg mb-0">
        This interview
      </h4>
      {paragraphs.map((text) => (
        <p key={text.slice(0, 48)} className="type-body mb-0">
          {text}
        </p>
      ))}
    </article>
  )
}

function OverviewFinding({
  section,
  title,
  kind,
  onJump,
}: {
  section: SittingReadSection
  title: string | null
  kind?: InterviewFlowStepKind
  onJump?: () => void
}) {
  const { prose, tags } = sittingReadReport(section)
  const scoreTags = tags.filter((tag) => isSittingReadScoreLabel(tag.label, tag.hint))
  const chipTags = scoreTags.length ? scoreTags : tags.filter((tag) => tag.hint !== 'Time')
  const beatTags: OverviewBeatTag[] = chipTags.map((tag, index) => ({
      label: tag.label,
      signal: tag.signal,
      hint: sittingReadChipHint(tag.label, {
        hint: tag.hint,
        kind: chipKind(kind),
      tags: chipTags,
        index,
      }),
  }))
  const md = sittingReadFindingMarkdown(section.brief, prose)
  const scoreWhy = section.brief?.scoreWhy?.trim() ?? ''
  if (!title && !md && !scoreWhy && !beatTags.length) return null
  return (
    <OverviewBeat
      title={title || 'Section'}
      prose={md}
      tags={beatTags}
      tagsAfter
      onJump={title ? onJump : undefined}
      jumpLabel={title || undefined}
    >
      {scoreWhy ? (
        <p className="type-body mb-0 theme-interview-flow-overview__beat-score">{scoreWhy}</p>
      ) : null}
    </OverviewBeat>
  )
}

function OverviewFacts({ rows }: { rows: readonly OverviewScoreRow[] }) {
  return (
    <OverviewSnapshot
      listLabel="Section scores"
      rows={rows.map((row) => ({
        id: row.id,
        measure: row.measure,
        reading: row.reading,
        icon: (row.kind && SNAPSHOT_ICONS[row.kind]) || ClipboardList,
      }))}
    />
  )
}

function prefersReduce(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Title / tags chrome for the result Overview timeline item (matches templates head). */
export function InterviewFlowOverviewSectionHead({
  overview,
  onAskHome,
}: {
  overview: ResultOverview
  onAskHome?: (attach: import('../lib/interviewRunApi/aidPeelAttach').AidPeelAttach) => void
}) {
  return (
    <>
      <div className="theme-interview-flow-timeline__meta type-caption type-muted">
        <LayoutList className="size-3.5 shrink-0" aria-hidden />
        <span>Review</span>
      </div>
      <h3 className="theme-interview-flow-timeline__title type-h3 type-serif-italic">Overview</h3>
      {onAskHome ? (
        <AskAidLink
          onClick={() => onAskHome({ kind: 'overall', label: 'Overall' })}
        />
      ) : null}
      {overview.tags.length ? (
        <div
          className="theme-interview-landing__output-meta-tags theme-interview-flow-timeline__tags theme-tag-group"
          aria-label="Attempt tags"
        >
          {overview.tags.map((tag) => {
            const signal = completeRatioSignal(tag.label) ?? tag.signal
            const Icon = outputMetaTagIcon({ ...tag, signal })
            return (
              <Tag
                key={tag.id}
                size="sm"
                className={[
                  'theme-interview-landing__output-meta-tag',
                  `theme-interview-landing__output-meta-tag--${signal}`,
                ].join(' ')}
              >
                <Icon
                  className="theme-interview-landing__output-meta-tag-icon size-3 shrink-0"
                  aria-hidden
                />
                <span>{tag.label}</span>
              </Tag>
            )
          })}
        </div>
      ) : null}
    </>
  )
}

function OverviewDonut({ overview }: { overview: ResultOverview }) {
  const t = useChartTheme()
  const reduceMotion = prefersReduce()
  const option = useMemo(
    () =>
      buildScoreDonutOption(
        {
          id: 'overview-donut',
          candidate: { displayName: '' },
          softGrade: overview.softGrade,
          formGate: overview.formGate,
        } as InterviewOutputCardFixture,
        t,
        reduceMotion,
      ),
    [overview.formGate, overview.softGrade, reduceMotion, t],
  )
  const overallValue = Math.round(overview.overall * 100)
  const markingOverall = sittingResultHeadlinePending(overview.resultStatus)
  const needsReview = sittingResultNeedsReview(overview.resultStatus)
  const gateLabel = formGateLabel(overview.formGate)
  // A gate pass cannot present as clean while part of the score is our marking defect.
  const scoreTone =
    gateLabel === 'Fail'
      ? 'is-fail'
      : needsReview
        ? 'is-review'
        : gateLabel === 'Pass'
          ? 'is-pass'
          : 'is-review'

  return (
    <figure
      className="theme-interview-flow-overview__donut"
      aria-label={
        markingOverall
          ? 'Soft Decision marking'
          : `Soft Decision ${overallValue}%${gateLabel ? ` · ${gateLabel}` : ''}${
              needsReview ? ' · needs review' : ''
            }`
      }
    >
      <div className="theme-interview-flow-overview__donut-plot">
        <EChart
          option={option}
          height={176}
          className="theme-interview-flow-overview__donut-chart"
        />
        <span
          className={['theme-interview-flow-overview__donut-score', scoreTone].join(' ')}
          aria-hidden
        >
          <span className="theme-interview-flow-overview__donut-score-inner">
            {markingOverall ? (
              '—'
            ) : (
              <>
            {overallValue}
            <span className="theme-interview-flow-overview__donut-unit">%</span>
              </>
            )}
          </span>
        </span>
      </div>
      <figcaption className="theme-interview-flow-overview__donut-caption">
        <p className="theme-interview-flow-overview__donut-title type-overline mb-0">
          {markingOverall ? 'Marking' : 'Soft Decision'}
        </p>
        <DocArticleDivider />
      </figcaption>
    </figure>
  )
}

function SignalSectionHead({
  icon: Icon,
  title,
  tags,
  onAsk,
}: {
  icon: LucideIcon
  title: string
  tags: readonly OverviewBeatTag[]
  onAsk?: () => void
}) {
  return (
    <>
      <div className="theme-interview-flow-timeline__meta type-caption type-muted">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span>Review</span>
      </div>
      <h3 className="theme-interview-flow-timeline__title type-h3 type-serif-italic">{title}</h3>
      {onAsk ? <AskAidLink onClick={onAsk} /> : null}
      <BeatTagRow
        tags={tags}
        className="theme-interview-landing__output-meta-tags theme-interview-flow-timeline__tags theme-tag-group"
        ariaLabel={`${title} tags`}
      />
    </>
  )
}

export function resultOverviewHasSecurity(overview: ResultOverview): boolean {
  return Boolean(
    overview.securityChecks.length ||
      overview.securityCaptures.length ||
      overview.securityParagraphs.length ||
      overview.securityPoints.length ||
      overview.securityIncidents.length,
  )
}

export function resultOverviewHasClarity(overview: ResultOverview): boolean {
  return Boolean(
    overview.clarityFindings.length ||
    overview.clarityChecks.length ||
      overview.clarityParagraphs.length ||
      overview.clarityPoints.length ||
      overview.sessionSeries,
  )
}

export function resultOverviewHasDeclarations(overview: ResultOverview): boolean {
  return overview.intakeDeclarations != null
}

function declareStamp(iso: string | null | undefined): string | null {
  const text = formatSittingDeclareStamp(iso)
  return text || null
}

function declarationNoteText(pack: IntakeDeclarationsPack | undefined): string | null {
  const raw = pack?.supportNote?.notes?.trim() || pack?.supportNoteDigest.notes?.trim() || ''
  return raw || null
}

function DeclarationTerms({ pack }: { pack: IntakeDeclarationsPack }) {
  const terms = pack.terms
  if (!terms) return null
  const when = declareStamp(terms.agreedAt ?? terms.updatedAt)
  return (
    <p className="type-caption type-muted mb-0">
      {terms.agreed ? terms.statement : 'Terms not agreed'}
      {when ? ` · ${when}` : ''}
    </p>
  )
}

/**
 * The candidate's own words, quoted.
 *
 * This used to be a chat bubble, which read as a message in a conversation the recruiter
 * was part of. It is a quotation in a document, so it is set as one.
 */
function DeclarationQuote({ note }: { note: string }) {
  return (
    <blockquote className="theme-interview-flow-overview__quote">
      <p className="type-body mb-0 whitespace-pre-line">{note}</p>
    </blockquote>
  )
}

function DeclarationFormReview({ pack }: { pack: IntakeDeclarationsPack }) {
  const note = pack.supportNote
  if (!note) {
    return (
      <>
        <p className="type-body type-muted mb-0">No support note on this attempt.</p>
        <DeclarationTerms pack={pack} />
      </>
    )
  }
  const responses = sittingDeclarationFormResponses(note)
  const questions = sittingDeclarationFormQuestions(note)
  return (
    <>
      <div className="theme-test-form theme-test-form--embed">
        {questions.map((row) => {
          if (!row.show) return null
          const response = responses[row.question.id]
          if (!response) return null
          const field = DECLARE_Q_FIELD[row.question.id]
          const stamp = declareStamp(note.fieldAt?.[field])
          return (
            <div key={row.question.id}>
              <QuestionTake
                question={row.question}
                mode="review"
                response={response}
                onChange={() => undefined}
                number={row.number}
              />
              {stamp ? (
                <p className="type-caption type-muted mb-0 mt-1">Saved {stamp}</p>
              ) : null}
              {row.question.id === DECLARE_Q_CONDITIONS && note.conditions.includes('other') ? (
                <>
                  <VurifyInput
                    size="sm"
                    label={DECLARE_FORM_COPY.otherConditionLabel}
                    value={note.otherCondition ?? ''}
                    readOnly
                    onChange={() => undefined}
                  />
                  {declareStamp(note.fieldAt?.otherCondition) ? (
                    <p className="type-caption type-muted mb-0 mt-1">
                      Saved {declareStamp(note.fieldAt?.otherCondition)}
                    </p>
                  ) : null}
                </>
              ) : null}
              {row.question.id === DECLARE_Q_LOOK && note.helps.includes('other') ? (
                <>
                  <VurifyInput
                    size="sm"
                    label={DECLARE_FORM_COPY.otherHelpLabel}
                    value={note.otherHelp ?? ''}
                    readOnly
                    onChange={() => undefined}
                  />
                  {declareStamp(note.fieldAt?.otherHelp) ? (
                    <p className="type-caption type-muted mb-0 mt-1">
                      Saved {declareStamp(note.fieldAt?.otherHelp)}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          )
        })}
      </div>
      {declareStamp(note.updatedAt) ? (
        <p className="type-caption type-muted mb-0">Last saved {declareStamp(note.updatedAt)}</p>
      ) : null}
      <DeclarationTerms pack={pack} />
    </>
  )
}

function OverviewDeclarationsBeat({
  overview,
  onOpen,
}: {
  overview: ResultOverview
  onOpen?: () => void
}) {
  const pack = overview.intakeDeclarations
  if (!pack) return null
  const tag = sittingDeclarationReviewTag(pack)
  const note = declarationNoteText(pack)
  return (
    <OverviewBeat
      title="Declarations"
      tags={[{ label: tag.label, signal: tag.signal, hint: tag.hint }]}
      onJump={onOpen}
      jumpLabel="Declarations"
    >
      <p className="type-body mb-0">
        {note
          ? 'Before starting, the candidate declared the following in their own words. A declaration is context for reading the rest of the report — it does not change any score or the time allowed.'
          : 'The candidate did not declare anything before starting, so there is no extra context to weigh when reading the sections below.'}
      </p>
      {note ? <DeclarationQuote note={note} /> : null}
    </OverviewBeat>
  )
}

/** Theme-menu stage: landing declaration form, same swap as Form / Coding Work. */
export function InterviewFlowDeclarationReviewStage({
  overview,
  className = '',
}: {
  overview: ResultOverview
  className?: string
}) {
  const pack = overview.intakeDeclarations
  return (
    <div
      className={[
        'theme-interview-flow-timeline__edit-stage-body',
        'theme-interview-result-review-stage',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <h3 className="theme-interview-flow-timeline__title type-h3 type-serif-italic mb-0">Declarations</h3>
      {pack ? (
        <DeclarationFormReview pack={pack} />
      ) : (
        <p className="type-body type-muted mb-0">No landing declaration on this attempt.</p>
      )}
    </div>
  )
}

/** Theme-menu stage: Security maps, tapes, and incidents — same swap as Conversation / Work. */
export function InterviewFlowSecurityReviewStage({
  overview,
  sections = [],
  onJumpToSection,
  onJumpCite,
  className = '',
}: InterviewFlowOverviewSectionProps) {
  return (
    <div
      className={[
        'theme-interview-flow-timeline__edit-stage-body',
        'theme-interview-result-review-stage',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <h3 className="theme-interview-flow-timeline__title type-h3 type-serif-italic mb-0">Security</h3>
      <ReportShell>
        <SecurityDetailBeats
          overview={overview}
          sections={sections}
          onJumpToSection={onJumpToSection}
          onJumpCite={onJumpCite}
        />
      </ReportShell>
    </div>
  )
}

/** Theme-menu stage: Clarity summary, section findings, and cadence charts. */
export function InterviewFlowClarityReviewStage({
  overview,
  sections = [],
  onJumpToSection,
  onJumpCite,
  className = '',
}: InterviewFlowOverviewSectionProps) {
  return (
    <div
      className={[
        'theme-interview-flow-timeline__edit-stage-body',
        'theme-interview-result-review-stage',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <h3 className="theme-interview-flow-timeline__title type-h3 type-serif-italic mb-0">Clarity</h3>
      <ReportShell>
        <ClarityDetailBeats
          overview={overview}
          sections={sections}
          onJumpToSection={onJumpToSection}
          onJumpCite={onJumpCite}
        />
      </ReportShell>
    </div>
  )
}

function SecurityDetailBeats({
  overview,
  sections,
  onJumpToSection,
  onJumpCite,
}: {
  overview: ResultOverview
  sections: readonly OverviewSpineSection[]
  onJumpToSection?: (id: string) => void
  onJumpCite?: (cite: JumpCite, sectionId: string) => void
}) {
  const spineById = new Map(sections.map((row) => [row.id, row]))
  const tapeCaptures = overview.securityCaptures.filter((row) => {
    const spine = spineById.get(row.sectionId)
    return !isTalkCapture(row.capture, spine?.kind)
  })
  const recordingsCheck = overview.securityChecks.find((row) => row.id === 'recordings')
  const captureKinds = uniqueLabels(tapeCaptures.map((row) => row.capture))
  const recordingLinks = tapeCaptures.flatMap((row) => {
    if (!onJumpToSection) return []
    const spine = spineById.get(row.sectionId)
    return [
      {
        id: row.sectionId,
        label: spine?.title ?? row.capture,
        onClick: () => onJumpToSection(row.sectionId),
      } satisfies OverviewBeatLink,
    ]
  })
  const recordingNote =
    recordingsCheck?.note ||
    tapeCaptures
      .map((row) => row.note)
      .filter(Boolean)
      .join(' ') ||
    'Form, coding, and writing keep an editor recording you can replay. Conversation does not.'
  const tapeDenom =
    sections.filter((row) => row.kind && row.kind !== 'talk').length || tapeCaptures.length
  const incidentPhase = useIncidentPhase(overview)
  const hasSeries = Boolean(asSeries(overview.sessionSeries))
  const phaseIncidents = overview.securityIncidents.filter(
    (inc) => inc.sectionId === incidentPhase.phaseId,
  )
  const pickedPhaseTitle =
    spineById.get(incidentPhase.phaseId)?.title ??
    incidentPhase.phases.find((p) => p.phaseId === incidentPhase.phaseId)?.title ??
    ''

  return (
    <OverviewBeatStack>
      {overview.securityParagraphs.map((paragraph) => (
        <DocArticleParagraph key={paragraph.slice(0, 48)} variant="prose">
          {paragraph}
        </DocArticleParagraph>
      ))}
      {tapeCaptures.length ? (
        <OverviewBeat
          title="Recordings"
          prose={recordingNote}
          tags={[
            {
              label: `${tapeCaptures.length} / ${tapeDenom}`,
              signal: completeRatioSignal(`${tapeCaptures.length} / ${tapeDenom}`) ?? 'good',
              hint: 'Tapes',
            },
            ...captureKinds.map((label) => ({
              label,
              kind: true,
              icon: captureIcon(label),
            })),
          ]}
          links={recordingLinks}
        />
      ) : null}
      {overview.securityFlags.length ? (
        <OverviewBeat
          title="Flags"
          prose={overview.securityFlags
            .map((f) => f.why)
            .filter(Boolean)
            .map((why) => `- ${why}`)
            .join('\n')}
          tags={overview.securityFlags.map((flag) => ({
            label: flag.label,
            signal: flag.signal,
            hint: flag.why,
          }))}
        />
      ) : null}
      {hasSeries ? (
        <DiagramBeat
          title="Where they were"
          caption="Each pin is a place the connection appeared to come from during the interview. Two distant pins in one interview is worth a look; one pin is the ordinary case."
        >
          <OverviewLocationMap overview={overview} />
        </DiagramBeat>
      ) : null}
      {hasSeries ? (
        <DiagramBeat
          title="Where the pointer went"
          caption="The line traces the mouse across the interview page from the first sample to the last. Long straight jumps to the edge of the frame usually mean attention left the page."
        >
          <OverviewPointerTrail overview={overview} />
        </DiagramBeat>
      ) : null}
      {hasSeries ? (
        <DiagramBeat
          title="What happened on the clock"
          caption="Typing volume over the length of one stage, with each paste marked on the timeline. Choose a stage to change both this diagram and the incidents listed below it."
        >
          <OverviewIncidentGraph
            overview={overview}
            phaseId={incidentPhase.phaseId}
            phases={incidentPhase.phases}
            onPickPhase={incidentPhase.setPickedId}
          />
        </DiagramBeat>
      ) : null}
      <IncidentListBeat
        incidents={phaseIncidents}
        totalCount={overview.securityIncidents.length}
        phaseTitle={pickedPhaseTitle}
        sections={sections}
        onJumpToSection={onJumpToSection}
        onJumpCite={onJumpCite}
      />
    </OverviewBeatStack>
  )
}

/** A diagram gets a heading, the figure, then a caption saying how to read it. */
function DiagramBeat({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: ReactNode
}) {
  return (
    <article className="theme-interview-flow-overview__beat">
      <h4 className="theme-interview-flow-overview__beat-title type-body-lg mb-0">{title}</h4>
      <div className="theme-interview-flow-overview__diagram-figure">{children}</div>
      <p className="type-body type-muted mb-0">{caption}</p>
    </article>
  )
}

/**
 * Incidents for the stage the graph is showing.
 *
 * The kind is a chip rather than the title, because "Paste" is a category, not an account
 * of what happened. The account is the assessor's pre and post narrative.
 */
function IncidentListBeat({
  incidents,
  totalCount,
  phaseTitle,
  sections,
  onJumpToSection,
  onJumpCite,
}: {
  incidents: ResultOverview['securityIncidents']
  totalCount: number
  phaseTitle: string
  sections: readonly OverviewSpineSection[]
  onJumpToSection?: (id: string) => void
  onJumpCite?: (cite: JumpCite, sectionId: string) => void
}) {
  const where = phaseTitle || 'this stage'
  if (!incidents.length) {
    return (
      <article className="theme-interview-flow-overview__beat">
        <h4 className="theme-interview-flow-overview__beat-title type-body-lg mb-0">Incidents</h4>
        <p className="type-body mb-0">
          {totalCount
            ? `Nothing was flagged during ${where}. The ${totalCount === 1 ? 'one incident' : `${totalCount} incidents`} in this interview happened in other stages — switch the stage above to read them.`
            : 'Nothing was flagged at any point in this interview.'}
        </p>
      </article>
    )
  }
  return (
    <article className="theme-interview-flow-overview__beat">
      <h4 className="theme-interview-flow-overview__beat-title type-body-lg mb-0">Incidents</h4>
      <p className="type-body type-muted mb-0">
        {incidents.length === 1
          ? `One incident during ${where}, out of ${totalCount} in this interview.`
          : `${incidents.length} incidents during ${where}, out of ${totalCount} in this interview.`}
      </p>
      {incidents.map((inc) => {
        const spine = sections.find((s) => s.id === inc.sectionId)
        const cite = firstJumpCite(inc.evidenceRefs)
        const jump =
          onJumpToSection || onJumpCite
            ? () => {
                if (cite && onJumpCite) onJumpCite(cite, inc.sectionId)
                else onJumpToSection?.(inc.sectionId)
              }
            : undefined
        return (
          <div key={inc.id} className="theme-interview-flow-overview__incident">
            <BeatTagRow
              tags={[
                { label: humanIncidentKind(inc.kind), signal: incidentChipSignal(inc.kind), hint: 'Incident' },
                ...(inc.tags ?? []).map((tag) => ({
                  label: tag.label,
                  signal: tag.signal,
                  hint: tag.hint,
                })),
              ]}
            />
            {inc.pre?.body ? <p className="type-body mb-0">{inc.pre.body}</p> : null}
            {inc.post?.body ? <p className="type-body mb-0">{inc.post.body}</p> : null}
            {jump ? (
              <button
                type="button"
                className="type-link type-body-sm theme-interview-landing__terms-link theme-interview-flow-overview__jump"
                onClick={jump}
              >
                {spine?.title ?? 'Open section'}
                <ArrowUpRight
                  className="theme-interview-landing__terms-link-icon"
                  aria-hidden
                  strokeWidth={2}
                />
              </button>
            ) : null}
          </div>
        )
      })}
    </article>
  )
}

function OverviewSecurity({
  overview,
  onOpen,
}: {
  overview: ResultOverview
  onOpen?: () => void
}) {
  const checkRows: OverviewSnapshotRow[] = overview.securityChecks.map((row) => ({
    id: row.id,
    measure: row.check,
    reading: snapshotReading(row),
    icon: CHECK_ICONS[row.id] ?? Shield,
    signal: row.signal ?? 'good',
    hint: CHECK_HINTS[row.id] ?? row.check,
  }))
  const hasMore = Boolean(onOpen)
  const intro = overview.securityParagraphs[0]?.trim() ?? ''

  return (
    <>
      <DocArticleSection
        id="overview-security-lead"
        kind="layout"
        label="Security"
        className="theme-interview-flow-overview__security-lead"
      >
        {intro ? (
          <DocArticleParagraph variant="prose">{intro}</DocArticleParagraph>
        ) : null}
        <OverviewSnapshot
          listLabel="Security checks"
          className="theme-interview-flow-overview__snapshot--fit"
          rows={checkRows}
          hints={CHECK_HINTS}
        />
      </DocArticleSection>
      {hasMore ? (
        <>
          <DocArticleDivider />
          <div className="theme-interview-flow-section__toolbar-actions">
            <VurifyMenuButton
              type="button"
              variant="label"
              size="sm"
              housing
              activeChrome={false}
              lineTone="muted"
              icon={ChevronDown}
              iconPosition="right"
              onClick={onOpen}
            >
              See more
            </VurifyMenuButton>
          </div>
        </>
      ) : null}
    </>
  )
}

function claritySectionRows(
  overview: ResultOverview,
  sections: readonly OverviewSpineSection[],
): OverviewSnapshotRow[] {
  const spineById = new Map(sections.map((row) => [row.id, row]))
  const findings = overview.clarityFindings
  const findingById = new Map(findings.map((row) => [row.sectionId, row]))
  const ids = findings.length
    ? findings.map((row) => row.sectionId)
    : overview.sittingSections.map((row) => row.sectionId)
  return ids.map((sectionId) => {
    const spine = spineById.get(sectionId)
    const finding = findingById.get(sectionId)
    const tags = finding ? sittingReadReport(finding).tags : []
    const kind = chipKind(spine?.kind)
    return {
      id: sectionId,
      measure: spine?.title?.trim() || sectionId,
      reading: tags.map((tag) => tag.label).join(' · ') || '—',
      icon: (kind && SNAPSHOT_ICONS[kind]) || Scan,
      tags: tags.map((tag) => ({
        label: tag.label,
        signal: tag.signal,
        hint: clarityFindingTagHint(tag),
      })),
    }
  })
}

function OverviewClarity({
  overview,
  sections = [],
  onOpen,
}: {
  overview: ResultOverview
  sections?: readonly OverviewSpineSection[]
  onOpen?: () => void
}) {
  const sectionRows = claritySectionRows(overview, sections)
  const hasMore = Boolean(onOpen)
  const intro = sittingWideClarityParas(
    overview.clarityParagraphs,
    sections,
    overview.clarityChecks,
  )[0] ?? ''

  return (
    <>
      <DocArticleSection
        id="overview-clarity-lead"
        kind="layout"
        label="Clarity"
        className="theme-interview-flow-overview__clarity-lead"
      >
        {intro ? (
          <DocArticleParagraph variant="prose">{intro}</DocArticleParagraph>
        ) : null}
        <OverviewSnapshot
          listLabel="Clarity by section"
          className="theme-interview-flow-overview__snapshot--fit"
          rows={sectionRows}
        />
      </DocArticleSection>
      {hasMore ? (
        <>
          <DocArticleDivider />
          <div className="theme-interview-flow-section__toolbar-actions">
            <VurifyMenuButton
              type="button"
              variant="label"
              size="sm"
              housing
              activeChrome={false}
              lineTone="muted"
              icon={ChevronDown}
              iconPosition="right"
              onClick={onOpen}
            >
              See more
            </VurifyMenuButton>
          </div>
        </>
      ) : null}
    </>
  )
}

/**
 * Result-spine Overview block: Summary findings + Soft Decision aside.
 */
export function InterviewFlowOverviewSection({
  overview,
  sections = [],
  onJumpToSection,
  onOpenDeclarations,
  className = '',
}: InterviewFlowOverviewSectionProps) {
  const spineById = new Map(sections.map((row) => [row.id, row]))
  const scoreRows = useMemo(
    () =>
      buildOverviewScoreRows(
        overview.sittingSections,
        sections.map((row) => ({
          id: row.id,
          title: row.title,
          kind: chipKind(row.kind),
        })),
        { formGate: overview.formGate, softGrade: overview.softGrade },
      ),
    [overview.formGate, overview.sittingSections, overview.softGrade, sections],
  )

  return (
    <ReportShell className={className}>
      {overview.sittingSections.length || resultOverviewHasDeclarations(overview) ? (
        <DocArticleSection id="overview-summary" kind="layout" label="Summary">
          <DocArticleHeading level={2} anchor={false}>
            Summary
          </DocArticleHeading>
          <DocArticleLayout
            variant="sidebar"
            label="Soft Decision mix"
            aside={
              <div className="theme-interview-flow-overview__aside">
                <OverviewDonut overview={overview} />
                <OverviewFacts rows={scoreRows} />
              </div>
            }
          >
            <OverviewBeatStack>
              <OverviewIntroBeat summary={overview.summary} />
              <OverviewDeclarationsBeat overview={overview} onOpen={onOpenDeclarations} />
              {overview.sittingSections.map((row) => {
                const spine = spineById.get(row.sectionId)
                return (
                  <OverviewFinding
                    key={row.sectionId}
                    section={row}
                    title={spine?.title ?? null}
                    kind={spine?.kind}
                    onJump={
                      row.sectionId && onJumpToSection
                        ? () => onJumpToSection(row.sectionId)
                        : undefined
                    }
                  />
                )
              })}
            </OverviewBeatStack>
          </DocArticleLayout>
        </DocArticleSection>
      ) : null}
    </ReportShell>
  )
}

export function InterviewFlowSecuritySectionHead({
  onAskHome,
}: {
  overview?: ResultOverview
  onAskHome?: (attach: import('../lib/interviewRunApi/aidPeelAttach').AidPeelAttach) => void
}) {
  return (
    <SignalSectionHead
      icon={Shield}
      title="Security"
      tags={[]}
      onAsk={onAskHome ? () => onAskHome({ kind: 'security', label: 'Security' }) : undefined}
    />
  )
}

export function InterviewFlowSecuritySection({
  overview,
  onOpenSecurity,
  className = '',
}: InterviewFlowOverviewSectionProps) {
  return (
    <WhenVisible className="theme-interview-flow-overview__deferred">
      <div
        className={['theme-interview-result-review', 'theme-interview-flow-overview', className]
          .filter(Boolean)
          .join(' ')}
      >
        <OverviewSecurity overview={overview} onOpen={onOpenSecurity} />
      </div>
    </WhenVisible>
  )
}

export function InterviewFlowClaritySectionHead({
  onAskHome,
}: {
  overview?: ResultOverview
  onAskHome?: (attach: import('../lib/interviewRunApi/aidPeelAttach').AidPeelAttach) => void
}) {
  return (
    <SignalSectionHead
      icon={Scan}
      title="Clarity"
      tags={[]}
      onAsk={onAskHome ? () => onAskHome({ kind: 'clarity', label: 'Clarity' }) : undefined}
    />
  )
}

export function InterviewFlowClaritySection({
  overview,
  sections = [],
  onOpenClarity,
  className = '',
}: InterviewFlowOverviewSectionProps) {
  return (
    <WhenVisible className="theme-interview-flow-overview__deferred">
      <div
        className={['theme-interview-result-review', 'theme-interview-flow-overview', className]
          .filter(Boolean)
          .join(' ')}
      >
        <OverviewClarity overview={overview} sections={sections} onOpen={onOpenClarity} />
      </div>
    </WhenVisible>
  )
}

function sittingWideClarityParas(
  paragraphs: readonly string[],
  sections: readonly OverviewSpineSection[],
  checks: ResultOverview['clarityChecks'],
): string[] {
  const titles = sections.map((row) => row.title.trim()).filter(Boolean)
  const checkNames = checks.map((row) => row.check.trim()).filter(Boolean)
  const wide = paragraphs.filter((raw) => {
    const p = raw.trim()
    if (!p) return false
    if (titles.some((t) => p.startsWith(`${t}:`) || p.startsWith(`${t} left notes`))) return false
    if (checkNames.some((c) => p === c || p.startsWith(`${c}.`) || p.startsWith(`${c} `))) return false
    return true
  })
  return wide.slice(0, 2)
}

function checkNote(row: ResultOverview['clarityChecks'][number]): string {
  const note = String(row.note ?? '').trim()
  if (!note || note === 'undefined') return ''
  return note
}

function stripRepeatedSectionTitle(body: string, title: string): string {
  const t = title.trim()
  let next = body.trim()
  if (!t) return next
  const colon = `${t}:`
  if (next.toLowerCase().startsWith(colon.toLowerCase())) {
    next = next.slice(colon.length).trim()
  }
  const leftoverLead = `${t} left notes a marker can read:`
  if (next.toLowerCase().startsWith(leftoverLead.toLowerCase())) {
    next = next.slice(leftoverLead.length).trim()
  }
  const lines = next.split('\n')
  if (lines[0]?.trim() === t) next = lines.slice(1).join('\n').trim()
  return next
}

function ClarityDetailBeats({
  overview,
  sections,
  onJumpToSection,
  onJumpCite,
}: {
  overview: ResultOverview
  sections: readonly OverviewSpineSection[]
  onJumpToSection?: (id: string) => void
  onJumpCite?: (cite: JumpCite, sectionId: string) => void
}) {
  const findings = overview.clarityFindings
  const intro = sittingWideClarityParas(
    overview.clarityParagraphs,
    sections,
    overview.clarityChecks,
  )
  const clockChecks = overview.clarityChecks.filter((row) => {
    if (!checkNote(row)) return false
    if (row.id === 'support') return true
    return row.reading !== 'not observed'
  })
  const support = clockChecks.filter((row) => row.id === 'support')
  const sittingClocks = clockChecks.filter((row) => row.id !== 'support')

  return (
    <OverviewBeatStack>
      {intro.map((paragraph) => (
        <DocArticleParagraph key={paragraph.slice(0, 48)} variant="prose">
          {paragraph}
        </DocArticleParagraph>
      ))}
      {support.map((row) => (
        <OverviewBeat
          key={row.id}
          title={row.check}
          prose={checkNote(row)}
          tags={featureTags([row], {})}
        />
      ))}
      {findings.map((row) => {
        const spine = sections.find((s) => s.id === row.sectionId)
        const title = spine?.title ?? row.sectionId
        const report = sittingReadReport(row)
        const cite = firstJumpCite(row.evidenceRefs)
        return (
          <OverviewBeat
            key={row.sectionId}
            title={title}
            prose={stripRepeatedSectionTitle(report.prose || row.body, title)}
            tags={report.tags.map((tag) => ({
              label: tag.label,
              signal: tag.signal,
              hint: clarityFindingTagHint(tag),
            }))}
            onJump={
              onJumpToSection || onJumpCite
                ? () => {
                    if (cite && onJumpCite) onJumpCite(cite, row.sectionId)
                    else onJumpToSection?.(row.sectionId)
                  }
                : undefined
            }
            jumpLabel="Open section"
          />
        )
      })}
      {sittingClocks.map((row) => (
        <OverviewBeat
          key={row.id}
          title={row.check}
          prose={checkNote(row)}
          tags={featureTags([row], {})}
        />
      ))}
      {overview.clarityFlags.length ? (
        <OverviewBeat
          title="Flags"
          prose={overview.clarityFlags
            .map((f) => f.why)
            .filter(Boolean)
            .map((why) => `- ${why}`)
            .join('\n')}
          tags={overview.clarityFlags.map((flag) => ({
            label: flag.label,
            signal: flag.signal,
            hint: flag.why,
          }))}
        />
      ) : null}
      {asSeries(overview.sessionSeries) ? (
        <div className="theme-interview-flow-overview__diagrams">
          <OverviewCadenceCharts overview={overview} />
        </div>
      ) : null}
    </OverviewBeatStack>
  )
}

function asSeries(raw: unknown): SessionSeries | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as SessionSeries
  if (!Array.isArray(rec.byPhase)) return null
  return rec
}

function diagramCaption(
  overview: ResultOverview,
  key: 'location' | 'pointer' | 'incidents',
): string | null {
  const live = overview.securityDiagrams?.[key]?.trim()
  return live || null
}

function DiagramNote({ overview, k }: { overview: ResultOverview; k: 'location' | 'pointer' | 'incidents' }) {
  const caption = diagramCaption(overview, k)
  if (!caption) return null
  return <p className="type-body mt-3 mb-0">{caption}</p>
}

function ClarityDiagramNote({
  overview,
  k,
}: {
  overview: ResultOverview
  k: keyof OverviewClarityDiagrams
}) {
  const caption = overview.clarityDiagrams?.[k]?.trim()
  if (!caption) return null
  return <p className="type-body mt-3 mb-0">{caption}</p>
}

function shortAxisLabel(name: string): string {
  const text = name.trim()
  if (text.length <= 14) return text
  return `${text.slice(0, 12)}…`
}

function OverviewLocationMap({ overview }: { overview: ResultOverview }) {
  const data = asSeries(overview.sessionSeries)
  const pins = data?.network?.pins ?? []
  return (
    <figure className="theme-interview-flow-overview__diagram">
      {pins.length ? (
        <OpenStreetMapCanvas
          pins={pins.map((pin) => ({
            lat: pin.lat,
            lon: pin.lon,
            kind: pin.kind,
            label: pin.label,
          }))}
        />
      ) : (
        <p className="type-body type-muted mb-0">No pin to place on the map.</p>
      )}
      <DiagramNote overview={overview} k="location" />
    </figure>
  )
}

function OverviewPointerTrail({ overview }: { overview: ResultOverview }) {
  const data = asSeries(overview.sessionSeries)
  const pts = data?.pointerTrail ?? []
  const d = pts
    .map((p, i) => {
      const x = p.x * 320
      const y = p.y * 180
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <figure className="theme-interview-flow-overview__diagram">
      {pts.length >= 2 ? (
        <div className="theme-interview-flow-overview__work-surface">
          <div className="theme-interview-flow-overview__work-page" aria-hidden="true">
            <div className="theme-interview-flow-overview__work-skel is-header">
              <span className="theme-interview-flow-overview__work-skel-label type-caption">Header</span>
            </div>
            <div className="theme-interview-flow-overview__work-skel is-editor">
              <span className="theme-interview-flow-overview__work-skel-label type-caption">Editor</span>
            </div>
            <div className="theme-interview-flow-overview__work-skel is-coach">
              <span className="theme-interview-flow-overview__work-skel-label type-caption">Coach</span>
            </div>
          </div>
          <svg viewBox="0 0 320 180" role="img" aria-label="Pointer path on the live interview page">
            <defs>
              <marker
                id="theme-interview-pointer-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            <path
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#theme-interview-pointer-arrow)"
            />
            <circle cx={pts[0]!.x * 320} cy={pts[0]!.y * 180} r="4" fill="currentColor" />
          </svg>
        </div>
      ) : (
        <p className="type-body type-muted mb-0">
          {pts.length ? 'Only one pointer sample was kept, so there is no path to draw.' : 'No pointer path yet.'}
        </p>
      )}
      <DiagramNote overview={overview} k="pointer" />
    </figure>
  )
}

const CLOCK_EVENT_KINDS = new Set([
  'paste',
  'paste_internal',
  'apply',
  'leave',
  'reconnect',
  'ip_change',
  'fullscreen_exit',
  'cover_window_closed',
  'devtools',
  'duplicate_tab',
  'copy_blocked',
  'copy_route',
  'shortcut',
  'policy_overlay_stripped',
  'framed',
])

function incidentChipSignal(kind: string): 'good' | 'watch' | 'bad' {
  if (kind === 'apply' || kind === 'paste_internal') return 'good'
  return 'watch'
}

function insertSwatchClass(source: InsertSource): string {
  if (source === 'bot_edit') return 'is-bot-edit'
  if (source === 'internal_paste') return 'is-paste-internal'
  return 'is-paste'
}

function insertSeriesColor(
  source: InsertSource,
  palette: readonly string[],
): string {
  if (source === 'bot_edit') return palette[1] ?? palette[0] ?? ''
  if (source === 'internal_paste') return palette[2] ?? palette[0] ?? ''
  return palette[3] ?? palette[0] ?? ''
}

type ClockEvent = { kind: string; t: number; sectionId: string }

function phaseClock(
  phase: SessionSeriesPhase | undefined,
  eventRows: ClockEvent[],
): {
  line: Array<[number, number]>
  inserts: ReturnType<typeof insertMarksFromIncidents>
  durationMs: number
} | null {
  if (!phase) return null
  const inserts = insertMarksFromIncidents(
    eventRows.filter((row) => row.sectionId === phase.phaseId),
  )
  const lastBucket = phase.cadence.buckets.at(-1)?.t1 ?? 0
  const lastInsert = inserts.reduce((m, row) => Math.max(m, row.t), 0)
  const durationMs = Math.max(phase.durationMs, lastBucket, lastInsert, 1)
  return {
    line: phase.cadence.buckets.map((bucket) => [bucket.t0, bucket.tickCount]),
    inserts,
    durationMs,
  }
}

/**
 * Which stage the incident graph is showing.
 *
 * Lifted out of the chart so the incident list below can follow the same choice — the
 * dropdown used to move the graph while the list stayed on every incident in the sitting.
 */
export function useIncidentPhase(overview: ResultOverview): {
  phaseId: string
  setPickedId: (id: string | null) => void
  phases: SessionSeriesPhase[]
} {
  const data = asSeries(overview.sessionSeries)
  const phases = data?.byPhase ?? []
  const incidents = overview.securityIncidents ?? []
  const pastePhaseId = incidents.find((inc) =>
    inc.kind === 'paste' || inc.kind === 'paste_internal' || inc.kind === 'apply',
  )?.sectionId
  const fallbackId =
    (pastePhaseId && phases.some((p) => p.phaseId === pastePhaseId) ? pastePhaseId : null) ??
    phases.find((p) => p.cadence.buckets.length)?.phaseId ??
    phases[0]?.phaseId ??
    ''
  const [pickedId, setPickedId] = useState<string | null>(null)
  const phaseId = pickedId && phases.some((p) => p.phaseId === pickedId) ? pickedId : fallbackId
  return { phaseId, setPickedId, phases }
}

function OverviewIncidentGraph({
  overview,
  phaseId,
  phases,
  onPickPhase,
}: {
  overview: ResultOverview
  phaseId: string
  phases: readonly SessionSeriesPhase[]
  onPickPhase: (id: string | null) => void
}) {
  const t = useChartTheme()
  const incidents = overview.securityIncidents ?? []
  const eventRows: ClockEvent[] = incidents
    .filter((inc) => CLOCK_EVENT_KINDS.has(inc.kind))
    .map((inc) => ({ kind: inc.kind, t: inc.t, sectionId: inc.sectionId }))
  const phase = phases.find((p) => p.phaseId === phaseId)
  const clock = phaseClock(phase, eventRows)
  if (!clock) {
    return (
      <figure className="theme-interview-flow-overview__diagram">
        <p className="type-body type-muted mb-0">No stage clock was recorded.</p>
      </figure>
    )
  }
  const option: EChartsOption = {
    grid: { left: 8, right: 16, top: 10, bottom: 12 },
    tooltip: {
      trigger: 'axis',
      formatter: (raw) => {
        const list = Array.isArray(raw) ? raw : [raw]
        const first = list[0] as { data?: [number, number]; axisValue?: number }
        const pair = Array.isArray(first?.data) ? first.data : null
        const tMs = pair ? pair[0] : Number(first?.axisValue ?? 0)
        const ticks = pair ? pair[1] : 0
        const lines = [`At ${formatTapeClock(tMs)}`, `Keystrokes in that window: ${ticks}`]
        for (const inc of clock.inserts) {
          if (Math.abs(inc.t - tMs) < 2500) lines.push(insertSourceLabel(inc.source))
        }
        return lines.join('<br/>')
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: clock.durationMs,
      axisLabel: {
        ...echartsAxisLabel(t),
        hideOverlap: true,
        formatter: (ms: number) => formatTapeClock(ms),
      },
      axisLine: echartsAxisLine(t),
      splitLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: echartsAxisLabel(t),
      axisLine: echartsAxisLine(t),
      splitLine: echartsSplitLine(t),
    },
    series: [
      {
        name: 'Keystrokes',
        type: 'line',
        smooth: true,
        showSymbol: false,
        symbolSize: 6,
        lineStyle: { width: 1.5, color: t.palette[0] },
        itemStyle: { color: t.palette[0] },
        data: clock.line,
        markLine: clock.inserts.length
          ? {
              symbol: ['none', 'arrow'],
              symbolSize: 7,
              label: { show: false },
              data: clock.inserts.map((inc) => ({
                name: insertSourceLabel(inc.source),
                xAxis: inc.t,
                lineStyle: {
                  color: insertSeriesColor(inc.source, t.palette),
                  width: 1,
                  type: 'solid',
                  opacity: 0.45,
                },
                label: { show: false },
              })),
            }
          : undefined,
      },
      ...(['bot_edit', 'internal_paste', 'external_paste'] as const).map((source) => ({
        name: insertSourceLabel(source),
        type: 'scatter' as const,
        symbolSize: 10,
        itemStyle: { color: insertSeriesColor(source, t.palette), opacity: 0.7 },
        data: clock.inserts
          .filter((inc) => inc.source === source)
          .map((inc) => ({
            value: [inc.t, 0],
            name: insertSourceLabel(source),
          })),
      })),
    ],
  }
  return (
    <figure className="theme-interview-flow-overview__diagram">
      {phases.length ? (
        <VurifySelect
          label="Section"
          variant="dropdown"
          options={phases.map((row) => ({ value: row.phaseId, label: row.title }))}
          value={phaseId}
          onChange={onPickPhase}
          placeholder="Choose…"
          className="theme-interview-flow-overview__clock-nav"
        />
      ) : null}
      <ChartEmbed
        option={option}
        height={240}
        legend={false}
        showLegendControl={false}
        deferUntilVisible
      />
      <ul className="theme-interview-flow-overview__clock-key" aria-label="Key">
        <li className="theme-interview-flow-overview__clock-key-item">
          <span className="theme-interview-flow-overview__clock-key-line" />
          <span className="type-caption">Keystrokes</span>
            </li>
        <li className="theme-interview-flow-overview__clock-key-item">
          <span className={`theme-interview-flow-overview__clock-key-swatch ${insertSwatchClass('bot_edit')}`} />
          <span className="type-caption">Bot edit</span>
        </li>
        <li className="theme-interview-flow-overview__clock-key-item">
          <span className={`theme-interview-flow-overview__clock-key-swatch ${insertSwatchClass('internal_paste')}`} />
          <span className="type-caption">In-app paste</span>
        </li>
        <li className="theme-interview-flow-overview__clock-key-item">
          <span className={`theme-interview-flow-overview__clock-key-swatch ${insertSwatchClass('external_paste')}`} />
          <span className="type-caption">Outside paste</span>
        </li>
      </ul>
    </figure>
  )
}

function OverviewCadenceCharts({ overview }: { overview: ResultOverview }) {
  const t = useChartTheme()
  const data = asSeries(overview.sessionSeries)
  const phases = data?.byPhase.filter((p) => p.cadence.tickCount || p.talk.sendCount) ?? []
  const stripPhases = phases.filter((p) => p.cadence.buckets.length)
  const fallbackStripId = stripPhases[0]?.phaseId ?? phases[0]?.phaseId ?? ''
  const [pickedId, setPickedId] = useState<string | null>(null)
  const stripId =
    pickedId && stripPhases.some((p) => p.phaseId === pickedId) ? pickedId : fallbackStripId
  const stripPhase = stripPhases.find((p) => p.phaseId === stripId) ?? stripPhases[0]
  const buckets = stripPhase?.cadence.buckets ?? []
  const idleColor = t.palette[3] ?? t.palette[1]
  const typingColor = t.palette[0]
  const pauseColor = t.palette[0]

  const cadenceOption: EChartsOption = {
    grid: { left: 8, right: 12, top: 10, bottom: 8 },
    tooltip: {
      trigger: 'axis',
      formatter: (raw) => {
        const list = Array.isArray(raw) ? raw : [raw]
        const first = list[0] as { name?: string; value?: number }
        const secs = typeof first?.value === 'number' ? first.value : 0
        return `${first?.name ?? ''}<br/>Typical pause: ${secs}s`
      },
    },
    xAxis: {
      type: 'category',
      data: phases.map((p) => p.title),
      axisLabel: {
        ...echartsAxisLabel(t),
        hideOverlap: true,
        formatter: (name: string) => shortAxisLabel(name),
      },
      axisLine: echartsAxisLine(t),
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        ...echartsAxisLabel(t),
        formatter: (v: number) => `${v}s`,
      },
      axisLine: echartsAxisLine(t),
      splitLine: echartsSplitLine(t),
    },
    series: [
      {
        name: 'Typical pause',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { color: pauseColor },
        data: phases.map((p) => Math.round((p.cadence.medianGapMs || p.talk.medianGapMs) / 100) / 10),
      },
    ],
  }

  const stripOption: EChartsOption = {
    grid: { left: 8, right: 12, top: 10, bottom: 8 },
    tooltip: {
      trigger: 'axis',
      formatter: (raw) => {
        const list = Array.isArray(raw) ? raw : [raw]
        const idle = list.find((row) => (row as { seriesName?: string }).seriesName === 'Idle') as
          | { value?: number; axisValue?: string }
          | undefined
        const typing = list.find((row) => (row as { seriesName?: string }).seriesName === 'Typing') as
          | { value?: number }
          | undefined
        const at = idle?.axisValue ?? (list[0] as { axisValue?: string })?.axisValue ?? ''
        return [
          at,
          `Idle: ${idle?.value ?? 0}s`,
          `Typing: ${typing?.value ?? 0}s`,
        ].join('<br/>')
      },
    },
    xAxis: {
      type: 'category',
      data: buckets.map((b) => formatTapeClock(b.t0)),
      axisLabel: {
        ...echartsAxisLabel(t),
        hideOverlap: true,
      },
      axisLine: echartsAxisLine(t),
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        ...echartsAxisLabel(t),
        formatter: (v: number) => `${v}s`,
      },
      axisLine: echartsAxisLine(t),
      splitLine: echartsSplitLine(t),
    },
    series: [
      {
        name: 'Idle',
        type: 'bar',
        stack: 'pace',
        barMaxWidth: 28,
        itemStyle: { color: idleColor },
        data: buckets.map((b) => Math.round(b.idleMs / 100) / 10),
      },
      {
        name: 'Typing',
        type: 'bar',
        stack: 'pace',
        barMaxWidth: 28,
        itemStyle: { color: typingColor },
        data: buckets.map((b) => Math.round(Math.max(0, b.t1 - b.t0 - b.idleMs) / 100) / 10),
      },
    ],
  }

  if (!phases.length) {
    return (
      <>
        <ChartCard
          title="Typical pause between keystrokes"
          className="theme-interview-flow-overview__diagram"
        >
          <p className="type-body type-muted mb-0">No keystroke pauses were recorded.</p>
          <ClarityDiagramNote overview={overview} k="cadence" />
        </ChartCard>
        <ChartCard title="Idle versus typing" className="theme-interview-flow-overview__diagram">
          <p className="type-body type-muted mb-0">No section clock was recorded.</p>
          <ClarityDiagramNote overview={overview} k="pace" />
        </ChartCard>
      </>
    )
  }

  return (
    <>
      <ChartCard
        title="Typical pause between keystrokes"
        subtitle="Taller means they waited longer between keys"
        className="theme-interview-flow-overview__diagram"
      >
        <ChartEmbed
          option={cadenceOption}
          height={240}
          legend={false}
          showLegendControl={false}
          xAxisLabelRotate={32}
          deferUntilVisible
        />
        <ul className="theme-interview-flow-overview__clock-key" aria-label="Key">
          <li className="theme-interview-flow-overview__clock-key-item">
            <span className="theme-interview-flow-overview__clock-key-swatch is-typing" />
            <span className="type-caption">Typical pause</span>
          </li>
        </ul>
        <ClarityDiagramNote overview={overview} k="cadence" />
      </ChartCard>
      <ChartCard
        title="Idle versus typing"
        subtitle="Idle is a pause with no keys, not coded work"
        className="theme-interview-flow-overview__diagram"
      >
        {stripPhases.length ? (
          <VurifySelect
            label="Section"
            variant="dropdown"
            options={stripPhases.map((row) => ({ value: row.phaseId, label: row.title }))}
            value={stripId}
            onChange={setPickedId}
            placeholder="Choose…"
            className="theme-interview-flow-overview__clock-nav"
          />
      ) : null}
        {buckets.length ? (
          <ChartEmbed
            option={stripOption}
            height={240}
            legend={false}
            showLegendControl={false}
            deferUntilVisible
          />
        ) : (
          <p className="type-body type-muted mb-0">No section clock was recorded.</p>
        )}
        {buckets.length ? (
          <ul className="theme-interview-flow-overview__clock-key" aria-label="Key">
            <li className="theme-interview-flow-overview__clock-key-item">
              <span className="theme-interview-flow-overview__clock-key-swatch is-idle" />
              <span className="type-caption">Idle</span>
            </li>
            <li className="theme-interview-flow-overview__clock-key-item">
              <span className="theme-interview-flow-overview__clock-key-swatch is-typing" />
              <span className="type-caption">Typing</span>
            </li>
          </ul>
        ) : null}
        <ClarityDiagramNote overview={overview} k="pace" />
      </ChartCard>
    </>
  )
}

