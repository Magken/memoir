/**
 * Result-spine collapsed review (glance finding + chips + radars) and expand stage
 * (Talk chat / tool editor verify panels).
 */
import { useMemo } from 'react'
import { ArrowUpRight, Maximize2, Sparkles } from 'lucide-react'
import { DocArticleDivider } from './DocArticle'
import { OverviewBeatStack, ResultRadar, ResultRadarNotes } from './InterviewFlowReportBeats'
import { MarkdownRendererEmbed } from './MarkdownRenderer'
import { Tag } from './Tag'
import { Tooltip } from './Tooltip'
import { VurifyMenuButton } from './VurifyMenuButton'
import { InterviewTalkVerifyPanel } from './InterviewTalkVerifyPanel'
import { InterviewCodingVerifyPanel } from './InterviewCodingVerifyPanel'
import { InterviewEssayVerifyPanel } from './InterviewEssayVerifyPanel'
import { InterviewFormVerifyPanel } from './InterviewFormVerifyPanel'
import {
  completeRatioSignal,
  sittingReadChipHint,
  sittingReadChipIcon,
} from '../lib/interviewRunApi/outputMetaTagIcon'
import { takePendingReviewJump } from '../lib/interviewRunApi/jumpCite'
import type { SittingReadTag } from '../lib/interviewRunApi/sittingReadMarkup'
import {
  fillResultReviewStage,
  type ResultReviewPack,
  type ResultSectionReview,
  defaultResultReviewMode,
} from '../lib/interviewRunApi/resultSectionReview'
import type { InterviewFlowStep } from '../lib/interviewBrief/flowTimelineTypes'
import type { TalkVerifyMarkingCard } from '../lib/interviewRunApi/talkVerifyModal'
import type { AidPeelAttach } from '../lib/interviewRunApi/aidPeelAttach'
import type {
  ResultEnumHome,
  ResultPassFailHome,
  ResultScalarHome,
  ResultTaxonomyHome,
} from '../lib/interviewRunApi/resultHomes'

type InterviewFlowResultSectionProps = {
  review: ResultSectionReview
  onOpenChat?: () => void
  onOpenEditor?: () => void
  onAskHome?: (attach: AidPeelAttach) => void
  className?: string
}

type InterviewFlowResultReviewStageProps = {
  step: InterviewFlowStep
  mode: 'chat' | 'editor'
  pack: ResultReviewPack
  highlightMessageId?: string | null
  onAskAboutCard?: (
    card: TalkVerifyMarkingCard,
    home?: { sectionId: string; stage: 'chat' | 'editor' },
  ) => void
  className?: string
}

export function AskAidLink({
  label = 'Ask',
  onClick,
  className = '',
}: {
  label?: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={['theme-interview-ask-aid-link', 'type-link', 'type-body-sm', className]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      <Sparkles
        className="theme-interview-landing__verify-mark-link-lead"
        size={14}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="theme-chat-part__card-link-label">{label}</span>
      <ArrowUpRight className="theme-chat-part__card-link-icon" size={12} strokeWidth={1.75} aria-hidden />
    </button>
  )
}

function ResultSittingTags({
  tags,
  kind,
}: {
  tags: readonly SittingReadTag[]
  kind: ResultSectionReview['kind']
}) {
  if (!tags.length) return null
  const chipKind = kind === 'talk' || kind === 'coding' || kind === 'doc' || kind === 'form' ? kind : undefined
  return (
    <div
      className="theme-interview-flow-overview__beat-tags theme-tag-group"
      aria-label="Section readings"
    >
      {tags.map((tag, index) => {
        const hint = sittingReadChipHint(tag.label, {
          hint: tag.hint,
          kind: chipKind,
          tags,
          index,
        })
        const signal = completeRatioSignal(tag.label) ?? tag.signal
        const Icon = sittingReadChipIcon(tag.label, signal, hint)
        return (
          <Tooltip key={`${tag.hint ?? tag.label}-${index}`} content={hint} placement="top">
            <Tag
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
          </Tooltip>
        )
      })}
    </div>
  )
}

type ResultTaxonomyChipsProps = { home: ResultTaxonomyHome }
function ResultTaxonomyChips({ home }: ResultTaxonomyChipsProps) {
  return (
    <div className="flex flex-wrap gap-1" data-home="taxonomy">
      <p className="type-caption type-faint mb-0 w-full">{home.label}</p>
      {home.labels.map((label) => {
        const count = home.counts[label] ?? 1
        return (
          <Tag key={`${home.id}:${label}`} size="sm">
            {count > 1 ? `${label} ${count}` : label}
          </Tag>
        )
      })}
    </div>
  )
}

type ResultEnumChoiceProps = { home: ResultEnumHome }
/**
 * The picked rung used to differ from the rest by text colour alone, so the verdict
 * was unreadable to anyone who cannot separate the two greys — on a mark, that is the
 * whole content. Weight and `aria-current` carry it without relying on colour.
 */
function ResultEnumChoice({ home }: ResultEnumChoiceProps) {
  const ladder = home.enumValues.length ? home.enumValues : [home.value]
  return (
    <div data-home="enum">
      <p className="type-caption type-faint mb-0">{home.label}</p>
      <ol className="m-0 flex flex-wrap gap-2 p-0">
        {ladder.map((value) => {
          const chosen = value === home.value
          return (
            <li
              key={value}
              className={chosen ? 'type-body-sm font-semibold' : 'type-body-sm type-muted'}
              aria-current={chosen ? 'true' : undefined}
            >
              {chosen ? <span className="sr-only">Marked: </span> : null}
              {value}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

type ResultScalarReadoutProps = { home: ResultScalarHome }
function ResultScalarReadout({ home }: ResultScalarReadoutProps) {
  const max = home.max != null ? ` of ${home.max}` : ''
  return (
    <p className="type-body mb-0" data-home="scalar">
      {home.label}: {home.score}
      {max}.
      {home.criterion ? ` ${home.criterion}` : ''}
    </p>
  )
}

type ResultPassFailBadgeProps = { home: ResultPassFailHome }
function ResultPassFailBadge({ home }: ResultPassFailBadgeProps) {
  const reading =
    home.passed === true ? 'Passed' : home.passed === false ? 'Did not pass' : 'Not graded'
  return (
    <p className="type-body mb-0" data-home="passFail">
      {home.label}: {reading}.
      {home.reason ? ` ${home.reason}` : ''}
    </p>
  )
}

/**
 * Collapsed result-spine body: Overview-style finding (intro + bullets + chips +
 * score why), then pass/fail homes, then one radar per bucket with hairlines.
 */
export function InterviewFlowResultSection({
  review,
  onOpenChat,
  onOpenEditor,
  onAskHome,
  className = '',
}: InterviewFlowResultSectionProps) {
  const sittingBeat =
    review.summary || review.scoreWhy || review.tags.length ? (
      <article key="sitting" className="theme-interview-flow-overview__beat">
        {review.summary ? (
          <div className="theme-interview-flow-overview__beat-md" data-home="glance">
            <MarkdownRendererEmbed source={review.summary} density="chat" />
          </div>
        ) : null}
        <ResultSittingTags tags={review.tags} kind={review.kind} />
        {review.scoreWhy ? (
          <p className="type-body mb-0 theme-interview-flow-overview__beat-score">
            {review.scoreWhy}
          </p>
        ) : null}
      </article>
    ) : null
  const extraBeats = [
    ...(review.passFails ?? []).map((home) => (
      <article key={home.id} className="theme-interview-flow-overview__beat">
        <ResultPassFailBadge home={home} />
      </article>
    )),
    ...(review.taxonomies ?? []).map((home) => (
      <article key={home.id} className="theme-interview-flow-overview__beat">
        <ResultTaxonomyChips home={home} />
      </article>
    )),
    ...(review.enums ?? []).map((home) => (
      <article key={home.id} className="theme-interview-flow-overview__beat">
        <ResultEnumChoice home={home} />
      </article>
    )),
    ...(review.scalars ?? []).map((home) => (
      <article key={home.id} className="theme-interview-flow-overview__beat">
        <ResultScalarReadout home={home} />
      </article>
    )),
  ]
  const radarArticle = (radar: ResultSectionReview['radars'][number]) => (
    <article key={radar.id} className="theme-interview-result-review__radar-beat">
      <div className="theme-interview-result-review__radar-col">
        <h4 className="theme-interview-flow-overview__beat-title type-body mb-0">{radar.label}</h4>
        {radar.axes.length >= 3 ? <ResultRadar radar={radar} /> : null}
      </div>
      <ResultRadarNotes radar={radar} />
    </article>
  )
  const workRadars = review.radars.filter((radar) => radar.face !== 'conversation')
  const chatRadars = review.radars.filter((radar) => radar.face === 'conversation')
  const showFaceHeads = workRadars.length > 0 && chatRadars.length > 0
  const radarBeats = [
    ...(showFaceHeads
      ? [
          <h4
            key="face-work"
            className="theme-interview-flow-overview__beat-title type-body mb-0"
          >
            Work
          </h4>,
        ]
      : []),
    ...workRadars.map(radarArticle),
    ...(showFaceHeads
      ? [
          <h4
            key="face-chat"
            className="theme-interview-flow-overview__beat-title type-body mb-0"
          >
            Conversation
          </h4>,
        ]
      : []),
    ...chatRadars.map(radarArticle),
  ]
  const hasBeats = Boolean(sittingBeat || radarBeats.length || extraBeats.length)
  const hasToolbar = review.canChat || review.canEditor
  const expand =
    defaultResultReviewMode(review) === 'chat' ? onOpenChat : onOpenEditor

  return (
    <div
      className={['theme-interview-result-review', 'theme-interview-flow-overview', className]
        .filter(Boolean)
        .join(' ')}
    >
      <OverviewBeatStack>
        {sittingBeat}
        {extraBeats}
        {radarBeats}
      </OverviewBeatStack>
      {hasBeats && hasToolbar ? <DocArticleDivider /> : null}
      {hasToolbar ? (
        <div className="theme-interview-flow-section__toolbar-actions">
          <VurifyMenuButton
            type="button"
            variant="label"
            size="sm"
            housing
            activeChrome={false}
            lineTone="muted"
            icon={Maximize2}
            iconPosition="left"
            onClick={expand}
          >
            Expand section
          </VurifyMenuButton>
          {onAskHome ? (
            <AskAidLink
              onClick={() =>
                onAskHome({
                  kind: defaultResultReviewMode(review) === 'editor' ? 'section_work' : 'section_chat',
                  id: review.stepId,
                  label: `${review.title} · ${defaultResultReviewMode(review) === 'editor' ? 'Work' : 'Conversation'}`,
                })
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Theme-menu stage: Talk utterances + side marks, or the tool editor + tape + marks.
 */
export function InterviewFlowResultReviewStage({
  step,
  mode,
  pack,
  highlightMessageId = null,
  onAskAboutCard,
  className = '',
}: InterviewFlowResultReviewStageProps) {
  const filled = useMemo(
    () => fillResultReviewStage(pack, step.id, mode),
    [pack, step.id, mode],
  )
  const review = filled.sections[step.id]
  const talk = mode === 'chat' ? filled.talk[step.id] : undefined
  const coding = mode === 'editor' ? filled.coding[step.id] : undefined
  const essay = mode === 'editor' ? filled.essay[step.id] : undefined
  const form = mode === 'editor' ? filled.form[step.id] : undefined
  const pending = useMemo(() => takePendingReviewJump(), [])
  const flashMessageId = highlightMessageId ?? pending?.messageId ?? null

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
      {mode === 'chat' && talk ? (
        <InterviewTalkVerifyPanel
          modal={talk}
          highlightMessageId={flashMessageId}
          hideStageMeta
          onAskAboutCard={
            onAskAboutCard
              ? (card) => onAskAboutCard(card, { sectionId: step.id, stage: mode })
              : undefined
          }
        />
      ) : mode === 'editor' && coding ? (
        <InterviewCodingVerifyPanel
          modal={coding}
          initialSeekMs={pending?.seekT}
          inPageScroll
          onAskAboutCard={
            onAskAboutCard
              ? (card) => onAskAboutCard(card, { sectionId: step.id, stage: mode })
              : undefined
          }
        />
      ) : mode === 'editor' && essay ? (
        <InterviewEssayVerifyPanel
          modal={essay}
          initialSeekMs={pending?.seekT}
          inPageScroll
          onAskAboutCard={
            onAskAboutCard
              ? (card) => onAskAboutCard(card, { sectionId: step.id, stage: mode })
              : undefined
          }
        />
      ) : mode === 'editor' && form ? (
        <InterviewFormVerifyPanel
          modal={form}
          initialSeekMs={pending?.seekT}
          inPageScroll
          onAskAboutCard={
            onAskAboutCard
              ? (card) => onAskAboutCard(card, { sectionId: step.id, stage: mode })
              : undefined
          }
        />
      ) : (
        <p className="type-body type-muted mb-0">
          {review?.summary || 'No review for this section yet.'}
        </p>
      )}
    </div>
  )
}
