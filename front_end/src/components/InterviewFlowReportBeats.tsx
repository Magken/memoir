/**
 * Shared Clarity-style report primitives — beats, snapshot rows, radar + Why.
 * Overview, Security, Clarity, collapsed Results, and expanded mark panels all render through these.
 */
import { ArrowUpRight, ClipboardList, type LucideIcon } from 'lucide-react'
import {
  Children,
  Fragment,
  isValidElement,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { EChartsOption } from 'echarts'
import { DocArticleDivider, DocArticleLayout } from './DocArticle'
import { EChart } from './EChart'
import { MarkdownRendererEmbed } from './MarkdownRenderer'
import { Tag } from './Tag'
import { Tooltip } from './Tooltip'
import { VurifyIcon } from './VurifyIcon'
import { echartsTooltip, useChartTheme } from '../lib/charts/chartTheme'
import {
  completeRatioSignal,
  sittingReadChipIcon,
} from '../lib/interviewRunApi/outputMetaTagIcon'
import type { OverviewSecurityCheck } from '../lib/interviewRunApi/fixtures/output-cards/outputCardFixture'
import {
  AXIS_NOTE_NOT_RECORDED,
  axisDisplayReading,
  axisDisplayShown,
  axisDisplayWhy,
  axisReadingSignal,
} from '../lib/interviewRunApi/resultHomes'
import type { ResultReviewRadar } from '../lib/interviewRunApi/resultSectionReview'
import { radarFromMarkBeat, markBeatHeading, type MarkBeat, type MarkGroup } from '../lib/interviewRunApi/markBeats'

export type OverviewBeatTag = {
  label: string
  signal?: 'good' | 'watch' | 'bad'
  hint?: string
  kind?: boolean
  icon?: LucideIcon
}

export type OverviewBeatLink = {
  id: string
  label: string
  onClick: () => void
}

export type OverviewBeatProps = {
  title?: string
  prose?: string
  tags: readonly OverviewBeatTag[]
  tagsAfter?: boolean
  onJump?: () => void
  jumpLabel?: string
  links?: readonly OverviewBeatLink[]
  children?: ReactNode
}

export type BeatTagRowProps = {
  tags: readonly OverviewBeatTag[]
  className?: string
  ariaLabel?: string
  /** Cap the row to this many chips with a `+N` reveal. Keeps table rows one line high. */
  max?: number
}

export type OverviewSnapshotRow = {
  id: string
  measure: string
  reading: string
  icon: LucideIcon
  signal?: 'good' | 'watch' | 'bad'
  hint?: string
  /** Several observed chips (Clarity by section). Single `reading` stays for Checks. */
  tags?: readonly OverviewBeatTag[]
}

export type OverviewSnapshotProps = {
  title?: string
  listLabel: string
  rows: readonly OverviewSnapshotRow[]
  className?: string
  hints?: Record<string, string>
}

export type ReportShellProps = {
  className?: string
  children: ReactNode
}

export type ResultRadarProps = {
  radar: ResultReviewRadar
}

function prefersReduce(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function featureTags(
  rows: OverviewSecurityCheck[],
  hints: Record<string, string>,
): OverviewBeatTag[] {
  const tags: OverviewBeatTag[] = []
  for (const row of rows) {
    const hint = hints[row.id] ?? row.check
    tags.push({
      label: row.reading,
      signal: completeRatioSignal(row.reading) ?? row.signal ?? 'good',
      hint,
    })
  }
  return tags
}

export function BeatTagRow({
  tags,
  className = 'theme-interview-flow-overview__beat-tags theme-tag-group',
  ariaLabel,
  max,
}: BeatTagRowProps) {
  const [expanded, setExpanded] = useState(false)
  if (!tags.length) return null
  const hidden = max && !expanded ? Math.max(0, tags.length - max) : 0
  const shown = hidden ? tags.slice(0, max) : tags
  return (
    <div className={className} aria-label={ariaLabel}>
      {shown.map((tag, index) => {
        if (tag.kind) {
          const KindIcon = tag.icon ?? ClipboardList
          return (
            <Tag
              key={`kind-${tag.label}-${index}`}
              size="sm"
              className="theme-interview-flow-timeline__tag theme-interview-flow-timeline__tag--kind"
            >
              <KindIcon
                className="theme-interview-landing__output-meta-tag-icon size-3 shrink-0"
                aria-hidden
              />
              <span>{tag.label}</span>
            </Tag>
          )
        }
        const signal = completeRatioSignal(tag.label) ?? tag.signal ?? 'good'
        const hint = tag.hint ?? tag.label
        const Icon = tag.icon ?? sittingReadChipIcon(tag.label, signal, tag.hint)
        return (
          <Tooltip key={`${signal}-${tag.label}-${index}`} content={hint} placement="top">
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
      {hidden ? (
        <Tooltip content={tags.slice(max).map((tag) => tag.label).join(' · ')} placement="top">
          <button
            type="button"
            className="theme-interview-flow-overview__tag-more"
            onClick={() => setExpanded(true)}
            aria-label={`Show ${hidden} more`}
          >
            +{hidden}
          </button>
        </Tooltip>
      ) : null}
    </div>
  )
}

/** Stack of Overview beats with the Summary hairline (`DocArticleDivider`) between them. */
export function OverviewBeatStack({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter((child) => {
    if (child == null || typeof child === 'boolean') return false
    if (typeof child === 'string' && !child.trim()) return false
    return true
  })
  if (!items.length) return null
  return (
    <div className="theme-interview-flow-overview__beats">
      {items.map((child, index) => (
        <Fragment key={isValidElement(child) && child.key != null ? String(child.key) : index}>
          {index > 0 ? <DocArticleDivider /> : null}
          {child}
        </Fragment>
      ))}
    </div>
  )
}

export function OverviewBeat({
  title,
  prose = '',
  tags,
  tagsAfter = false,
  onJump,
  jumpLabel,
  links,
  children,
}: OverviewBeatProps) {
  const tagRow = <BeatTagRow tags={tags} />
  return (
    <article className="theme-interview-flow-overview__beat">
      {title ? (
        <h4 className="theme-interview-flow-overview__beat-title type-body-lg mb-0">{title}</h4>
      ) : null}
      {tagsAfter ? null : tagRow}
      {prose ? (
        <div className="theme-interview-flow-overview__beat-md">
          <MarkdownRendererEmbed source={prose} density="chat" />
        </div>
      ) : null}
      {tagsAfter ? tagRow : null}
      {children}
      {links?.length ? (
        <div className="theme-interview-flow-overview__jumps">
          {links.map((link) => (
            <button
              key={link.id}
              type="button"
              className="type-link type-body-sm theme-interview-landing__terms-link theme-interview-flow-overview__jump"
              onClick={link.onClick}
            >
              {link.label}
              <ArrowUpRight
                className="theme-interview-landing__terms-link-icon"
                aria-hidden
                strokeWidth={2}
              />
            </button>
          ))}
        </div>
      ) : onJump ? (
        <button
          type="button"
          className="type-link type-body-sm theme-interview-landing__terms-link theme-interview-flow-overview__jump"
          onClick={onJump}
        >
          {jumpLabel ?? title}
          <ArrowUpRight
            className="theme-interview-landing__terms-link-icon"
            aria-hidden
            strokeWidth={2}
          />
        </button>
      ) : null}
    </article>
  )
}

export function OverviewSnapshot({
  title,
  listLabel,
  rows,
  className = '',
  hints = {},
}: OverviewSnapshotProps) {
  if (!rows.length) return null
  const headingId = `${listLabel.replace(/\s+/g, '-').toLowerCase()}-heading`
  return (
    <section
      className={['theme-interview-flow-overview__snapshot', className].filter(Boolean).join(' ')}
      aria-labelledby={title ? headingId : undefined}
      aria-label={title ? undefined : listLabel}
    >
      {title ? (
        <h3 id={headingId} className="type-label mb-0 theme-interview-flow-overview__snapshot-label">
          {title}
        </h3>
      ) : null}
      <ul className="theme-interview-landing__summary-list" aria-label={listLabel}>
        {rows.map((row) => {
          const Icon = row.icon
          const reading = row.reading
          const signal = completeRatioSignal(reading) ?? row.signal
          const hint = row.hint ?? hints[row.id] ?? row.measure
          const TagIcon = sittingReadChipIcon(reading, signal ?? 'good', hint)
          const tagGroup = row.tags
          return (
            <li key={row.id} className="theme-interview-landing__summary-item">
              <div className="theme-interview-landing__summary-row">
                <span className="theme-interview-landing__summary-mark" aria-hidden>
                  <VurifyIcon icon={Icon} variant="plain" tone="muted" size="sm" />
                </span>
                <div className="theme-interview-landing__summary-label-wrap">
                  <p className="type-body-sm mb-0 theme-interview-landing__summary-label">
                    {row.measure}
                  </p>
                </div>
                {tagGroup ? (
                  tagGroup.length ? (
                    <div className="theme-interview-flow-overview__snapshot-tag">
                      <BeatTagRow tags={tagGroup} max={2} />
                    </div>
                  ) : null
                ) : signal ? (
                  <div className="theme-interview-flow-overview__snapshot-tag">
                    <Tooltip content={hint} placement="top">
                      <Tag
                        size="sm"
                        className={[
                          'theme-interview-landing__output-meta-tag',
                          `theme-interview-landing__output-meta-tag--${signal}`,
                        ].join(' ')}
                      >
                        <TagIcon
                          className="theme-interview-landing__output-meta-tag-icon size-3 shrink-0"
                          aria-hidden
                        />
                        <span>{row.reading}</span>
                      </Tag>
                    </Tooltip>
                  </div>
                ) : (
                  <p className="type-caption mb-0 theme-interview-landing__summary-time">
                    {row.reading}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function ReportShell({ className = '', children }: ReportShellProps) {
  return (
    <div
      className={['theme-doc-article', 'theme-interview-flow-overview', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-doc-article__body">{children}</div>
    </div>
  )
}

export function ResultRadar({ radar }: ResultRadarProps) {
  const t = useChartTheme()
  const reduceMotion = prefersReduce()
  const option = useMemo<EChartsOption>(
    () => ({
      animation: !reduceMotion,
      animationDuration: reduceMotion ? 0 : 420,
      tooltip: echartsTooltip(t),
      radar: {
        indicator: radar.axes.map((axis) => ({ name: axis.label, max: 100 })),
        /*
         * Geometry is explicit because the defaults size the web to the container and let
         * axis names run off the edge — "Structure and naming" arrived as "Structure and na".
         * The web sits low enough that the top spoke label stays inside the canvas instead
         * of painting onto the beat divider.
         */
        radius: '48%',
        center: ['50%', '62%'],
        nameGap: 10,
        axisName: {
          color: t.textMuted,
          fontSize: 11,
          fontWeight: 600,
          overflow: 'break',
          width: 84,
          lineHeight: 13,
        },
        splitLine: { lineStyle: { color: t.grid } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: t.border } },
      },
      series: [
        {
          type: 'radar',
          symbol: 'circle',
          symbolSize: 4,
          areaStyle: { opacity: 0.16, color: t.palette[2] },
          lineStyle: { width: 1.5, color: t.palette[2] },
          itemStyle: { color: t.palette[2] },
          data: [
            {
              name: radar.label,
              value: radar.axes.map((axis) => Math.round(axis.unit * 100)),
            },
          ],
        },
      ],
    }),
    [radar, reduceMotion, t],
  )
  return (
    <figure
      className="theme-interview-result-review__radar"
      data-axes={String(radar.axes.length)}
      aria-label={radar.label}
    >
      <EChart
        option={option}
        height={radar.axes.length <= 3 ? 248 : 280}
        renderer="svg"
        deferUntilVisible
        className="theme-interview-result-review__radar-chart"
      />
    </figure>
  )
}

/**
 * Per-axis reasons beside the web.
 *
 * Axis / Reading / Shown are chips so Why keeps the width. Essay criterion
 * lives on the Axis tooltip only — never in Why and never in Reading.
 */
export function ResultRadarNotes({ radar }: ResultRadarProps) {
  return (
    <div className="theme-interview-result-review__radar-notes" data-home="radar-why">
      <ul className="theme-interview-result-review__axis-list" aria-label={`${radar.label} axes`}>
        {radar.axes.map((axis) => {
          const reading = axisDisplayReading(axis)
          const shown = axisDisplayShown(axis)
          const why = axisDisplayWhy(axis)
          const signal = axisReadingSignal(reading)
          return (
            <li key={axis.key} className="theme-interview-result-review__axis-row">
              <div
                className="theme-interview-result-review__axis-tags theme-tag-group"
                aria-label={`${axis.label} reading`}
              >
                <Tooltip content={axis.criterion?.trim() || axis.label} placement="top">
                  <Tag size="sm" className="theme-interview-landing__output-meta-tag">
                    {axis.label}
                  </Tag>
                </Tooltip>
                <Tag
                  size="sm"
                  className={[
                    'theme-interview-landing__output-meta-tag',
                    `theme-interview-landing__output-meta-tag--${signal}`,
                  ].join(' ')}
                >
                  {reading}
                </Tag>
                {shown ? (
                  <Tag size="sm" className="theme-interview-landing__output-meta-tag">
                    {shown}
                  </Tag>
                ) : null}
              </div>
              {why ? (
                <p className="type-body mb-0 theme-interview-result-review__axis-why">
                  {why === AXIS_NOTE_NOT_RECORDED ? (
                    <span className="type-muted">{why}</span>
                  ) : (
                    why
                  )}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Criterion → reading only — same assignment list as the Overview donut facts. */
export function ResultRadarKey({ radar }: ResultRadarProps) {
  return (
    <OverviewSnapshot
      className="theme-interview-flow-overview__snapshot--fit"
      listLabel={`${radar.label} scores`}
      rows={radar.axes.map((axis) => {
        const reading = axisDisplayReading(axis)
        return {
          id: axis.key,
          measure: axis.label,
          reading,
          icon: ClipboardList,
          signal: axisReadingSignal(reading),
          hint: axis.label,
        }
      })}
    />
  )
}

export type InterviewMarkBeatRowProps = {
  beat: MarkBeat
  onJump?: () => void
  jumpLabel?: string
  links?: OverviewBeatLink[]
  /** False when Work owns the radar in an Overview sidebar. Conversation stays stacked. */
  rail?: boolean
}

function plottableRadar(beat: MarkBeat) {
  const radar = radarFromMarkBeat(beat)
  return radar && radar.axes.length >= 3 ? radar : null
}

function MarkBeatCopy({
  beat,
  onJump,
  jumpLabel,
  links,
}: Omit<InterviewMarkBeatRowProps, 'rail'>) {
  const radar = radarFromMarkBeat(beat)
  const tags: OverviewBeatTag[] = []
  if (beat.reading) {
    tags.push({
      label: beat.reading,
      signal: axisReadingSignal(beat.reading),
      hint: beat.title,
    })
  }
  const jumpLinks: OverviewBeatLink[] = onJump
    ? [{ id: `jump:${beat.id}`, label: jumpLabel || 'Open evidence', onClick: onJump }]
    : []
  const allLinks = [...jumpLinks, ...(links ?? [])]
  return (
    <OverviewBeat
      title={beat.title}
      prose={beat.lead}
      tags={tags}
      links={allLinks.length ? allLinks : undefined}
    >
      {beat.detail ? (
        <p className="type-body mb-0 theme-interview-flow-overview__beat-score">{beat.detail}</p>
      ) : null}
      {radar ? <ResultRadarNotes radar={radar} /> : null}
    </OverviewBeat>
  )
}

/** One mark: lead + Why in copy. Conversation may stack a radar under the lead. */
export function InterviewMarkBeatRow({
  beat,
  onJump,
  jumpLabel,
  links,
  rail = true,
}: InterviewMarkBeatRowProps) {
  const whyRadar = rail ? plottableRadar(beat) : null
  return (
    <div className="theme-interview-result-review__mark-host" data-mark-beat={beat.id}>
      <div className="theme-interview-result-review__mark-row">
        <MarkBeatCopy beat={beat} onJump={onJump} jumpLabel={jumpLabel} links={links} />
        {whyRadar ? (
          <div className="theme-interview-result-review__mark-rail">
            <ResultRadar radar={whyRadar} />
            <ResultRadarKey radar={whyRadar} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export type InterviewMarkGroupViewProps = {
  group: MarkGroup
  onJumpBeat?: (beat: MarkBeat) => void
  onAskBeat?: (beat: MarkBeat) => void
  jumpLabel?: string
}

function MarkWorkAxes({ radar }: ResultRadarProps) {
  return (
    <ul className="theme-interview-result-review__mark-axes" aria-label={`${radar.label} axes`}>
      {radar.axes.map((axis) => {
        const reading = axisDisplayReading(axis)
        const shown = axisDisplayShown(axis)
        const why = axisDisplayWhy(axis)
        const signal = axisReadingSignal(reading)
        const axisTags: OverviewBeatTag[] = [
          { label: reading, signal, hint: axis.label },
        ]
        if (shown) axisTags.push({ label: shown, hint: axis.label })
        return (
          <li key={axis.key} className="theme-interview-result-review__mark-axis">
            <p className="type-label mb-0">{axis.label}</p>
            <BeatTagRow tags={axisTags} />
            {why ? (
              <p className="type-body mb-0 theme-interview-result-review__axis-why">
                {why === AXIS_NOTE_NOT_RECORDED ? (
                  <span className="type-muted">{why}</span>
                ) : (
                  why
                )}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function InterviewMarkWorkCopy({
  beat,
  heading,
  onJump,
  jumpLabel,
  links,
}: Omit<InterviewMarkBeatRowProps, 'rail'> & { heading: string | null }) {
  const radar = radarFromMarkBeat(beat)
  const tags: OverviewBeatTag[] = []
  if (beat.reading) {
    tags.push({
      label: beat.reading,
      signal: axisReadingSignal(beat.reading),
      hint: beat.title,
    })
  }
  const jumpLinks: OverviewBeatLink[] = onJump
    ? [{ id: `jump:${beat.id}`, label: jumpLabel || 'Open evidence', onClick: onJump }]
    : []
  const allLinks = [...jumpLinks, ...(links ?? [])]
  return (
    <article className="theme-interview-result-review__mark-copy">
      {heading ? (
        <h4 className="theme-interview-flow-overview__beat-title type-body-lg mb-0">{heading}</h4>
      ) : null}
      {tags.length ? <BeatTagRow tags={tags} /> : null}
      {beat.lead ? <p className="type-body mb-0">{beat.lead}</p> : null}
      {beat.detail ? (
        <p className="type-body mb-0 theme-interview-flow-overview__beat-score">{beat.detail}</p>
      ) : null}
      {radar ? <MarkWorkAxes radar={radar} /> : null}
      {allLinks.length ? (
        <div className="theme-interview-flow-overview__jumps">
          {allLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              className="type-link type-body-sm theme-interview-landing__terms-link theme-interview-flow-overview__jump"
              onClick={link.onClick}
            >
              {link.label}
              <ArrowUpRight
                className="theme-interview-landing__terms-link-icon"
                aria-hidden
                strokeWidth={2}
              />
            </button>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function InterviewMarkWorkBeat({
  beat,
  heading,
  onJump,
  jumpLabel,
  links,
}: Omit<InterviewMarkBeatRowProps, 'rail'> & { heading: string | null }) {
  const radar = plottableRadar(beat)
  const copy = (
    <InterviewMarkWorkCopy
      beat={beat}
      heading={heading}
      onJump={onJump}
      jumpLabel={jumpLabel}
      links={links}
    />
  )
  const inner = radar ? (
    <DocArticleLayout
      variant="sidebar"
      label={beat.title}
      aside={
        <div className="theme-interview-flow-overview__aside">
          <ResultRadar radar={radar} />
          <ResultRadarKey radar={radar} />
        </div>
      }
    >
      {copy}
    </DocArticleLayout>
  ) : (
    copy
  )
  return <div className="theme-interview-flow-overview__beat">{inner}</div>
}

export function InterviewMarkGroupView({
  group,
  onJumpBeat,
  onAskBeat,
  jumpLabel = 'Open evidence',
}: InterviewMarkGroupViewProps) {
  return (
    <section
      className="theme-interview-result-review__mark-group"
      aria-label={group.title}
      data-mark-group={group.id}
    >
      <h3 className="theme-interview-flow-timeline__title type-h3 type-serif-italic mb-0">
        {group.title}
      </h3>
      <OverviewBeatStack>
        {group.beats.map((beat) => (
          <InterviewMarkWorkBeat
            key={beat.id}
            beat={beat}
            heading={markBeatHeading(beat.title, group.title)}
            onJump={onJumpBeat && beat.cite ? () => onJumpBeat(beat) : undefined}
            jumpLabel={jumpLabel}
            links={
              onAskBeat
                ? [{ id: `ask:${beat.id}`, label: 'Ask Aid', onClick: () => onAskBeat(beat) }]
                : undefined
            }
          />
        ))}
      </OverviewBeatStack>
    </section>
  )
}

export type InterviewMarkBoardViewProps = {
  groups: readonly MarkGroup[]
  footer?: ReactNode
  onJumpBeat?: (beat: MarkBeat) => void
  onAskBeat?: (beat: MarkBeat) => void
  jumpLabel?: string
}

/** Work marks: Overview sidebar per beat so one radar unsticks and the next stays. */
export function InterviewMarkBoardView({
  groups,
  footer,
  onJumpBeat,
  onAskBeat,
  jumpLabel = 'Open evidence',
}: InterviewMarkBoardViewProps) {
  return (
    <ReportShell className="theme-interview-result-review__mark-shell">
      <div className="theme-interview-result-review__mark-board">
        <OverviewBeatStack>
          {groups.map((group) => (
            <InterviewMarkGroupView
              key={group.id}
              group={group}
              onJumpBeat={onJumpBeat}
              onAskBeat={onAskBeat}
              jumpLabel={jumpLabel}
            />
          ))}
          {footer}
        </OverviewBeatStack>
      </div>
    </ReportShell>
  )
}
