import { createElement, useEffect, useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { EChartsOption } from 'echarts'
import {
  ChevronDown,
  ClipboardList,
  Code2,
  GitBranch,
  Layers,
  MessageCircle,
  Mic,
  Package,
  PenLine,
  type LucideIcon,
} from 'lucide-react'
import { ArrangementRule } from './cardDisplayLayout'
import { EChart } from './EChart'
import { Tag } from './Tag'
import { Tooltip } from './Tooltip'
import { VurifyAvatar } from './VurifyAvatar'
import {
  collapsedMetaTags,
  formGateLabel,
  formatOutputCardPercent,
  loadSampleOutputCards,
  sittingResultHeadlinePending,
  sittingResultNeedsReview,
  sittingResultUnmarked,
  unmarkedStagesLabel,
  type InterviewOutputCardBucket,
  type InterviewOutputCardFixture,
} from '../lib/interviewRunApi/fixtures/output-cards/outputCardFixture'
import { completeRatioSignal, outputMetaTagIcon } from '../lib/interviewRunApi/outputMetaTagIcon'
import { contributingScoreDonutBuckets, RESULT_REVIEW_SECTION_KEY } from '../lib/interviewRunApi'
import { formatInterviewManagerDateShort } from '../lib/interviewBrief/managerFixtures'
import { useChartTheme, type ChartTheme } from '../lib/charts/chartTheme'
import { revealSectionIn, useGsapPageOptional } from '../lib/gsap'

type InterviewOutputCardRepeaterProps = {
  /** Defaults to sample fixture cards. */
  cards?: readonly InterviewOutputCardFixture[]
  emptyLabel?: string
  className?: string
  /** Opens Verify overlay (Assessor Aid + result spine). */
  onSeeMoreSection?: (input: {
    sectionKey: string
    label: string
    summary?: string
    summaryDetail?: string
  }) => void
  /** Parent workspace swap already plays enter — skip list stagger. */
  skipMountReveal?: boolean
  debug?: boolean
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function softBucketEntries(
  byWeight: InterviewOutputCardFixture['softGrade']['byWeight'],
): Array<[string, InterviewOutputCardBucket]> {
  return Object.entries(byWeight)
}

function shortSectionLabel(label: string): string {
  return label.replace(/ \/ .*$/, '')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function softBucketIcon(key: string): LucideIcon {
  if (key === 'codingTests') return Code2
  if (key === 'codingMethod') return GitBranch
  if (key === 'essay') return PenLine
  if (key === 'interviewDelivery') return Mic
  if (key === 'interviewContent') return MessageCircle
  if (key === 'formMark') return ClipboardList
  return Package
}

function partKindIcon(kind: string | undefined): LucideIcon {
  if (kind === 'coding') return Code2
  if (kind === 'talk' || kind === 'discussion') return MessageCircle
  if (kind === 'doc' || kind === 'writing') return PenLine
  if (kind === 'form') return ClipboardList
  return Layers
}

function lucideToSvg(Icon: LucideIcon, color: string, size = 12): string {
  return renderToStaticMarkup(
    createElement(Icon, {
      size,
      color,
      strokeWidth: 2,
      'aria-hidden': true,
    }),
  )
}

function sectionScoreTooltip(card: InterviewOutputCardFixture): ReactNode {
  const rows = softBucketEntries(card.softGrade.byWeight).filter(([, b]) => b.included)
  if (!rows.length) return null
  return (
    <ul className="theme-interview-landing__output-section-scores">
      {rows.map(([key, bucket]) => {
        const Icon = softBucketIcon(key)
        return (
          <li
            key={key}
            className="theme-interview-landing__output-section-scores-row"
          >
            <Icon
              className="theme-interview-landing__output-section-scores-icon size-3 shrink-0"
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              {shortSectionLabel(bucket.label)}
            </span>
            <span className="theme-interview-landing__output-section-scores-pct">
              {formatOutputCardPercent(bucket.unit)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function parseCssRgb(input: string): [number, number, number] | null {
  let value = input.trim()
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#000'
      ctx.fillStyle = value
      value = String(ctx.fillStyle)
    }
  }
  const hex = value
  const short = /^#([0-9a-f]{3})$/i.exec(hex)
  if (short) {
    const [r, g, b] = short[1].split('').map((c) => Number.parseInt(c + c, 16))
    return [r, g, b]
  }
  const long = /^#([0-9a-f]{6})$/i.exec(hex)
  if (long) {
    const n = Number.parseInt(long[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const rgb = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i.exec(hex)
  if (rgb) {
    return [
      Math.round(Number(rgb[1])),
      Math.round(Number(rgb[2])),
      Math.round(Number(rgb[3])),
    ]
  }
  return null
}

/** High section unit → theme success (green); low → theme error (red). */
function sectionScoreColor(unit: number, good: string, bad: string): string {
  const t = Math.min(1, Math.max(0, unit))
  const a = parseCssRgb(good)
  const b = parseCssRgb(bad)
  if (!a || !b) return t >= 0.5 ? good : bad
  const r = Math.round(b[0] + (a[0] - b[0]) * t)
  const g = Math.round(b[1] + (a[1] - b[1]) * t)
  const bl = Math.round(b[2] + (a[2] - b[2]) * t)
  return `rgb(${r}, ${g}, ${bl})`
}

function floatingTooltipCss(t: ChartTheme): string {
  return [
    'border: none !important',
    `background: color-mix(in srgb, ${t.surfaceRaised} 72%, transparent) !important`,
    'backdrop-filter: blur(10px)',
    '-webkit-backdrop-filter: blur(10px)',
    `box-shadow: 0 0.35rem 1.1rem color-mix(in srgb, ${t.text} 16%, transparent)`,
    'border-radius: 0.45rem',
    'padding: 0.4rem 0.55rem',
    'pointer-events: none',
    'min-width: 12.5rem',
  ].join(';')
}

type DonutPart = {
  label: string
  unitPct: string
  iconSvg: string
}

type DonutSlice = {
  name: string
  value: number
  contribPct: number
  weightPct: number
  unitPct: number
  iconSvg: string
  parts: DonutPart[]
  itemStyle: { color: string; borderColor: string; borderWidth: number }
}

/** Collapsed score donut — slices by Decision contribution; hover lists feeding stages. */
export function buildScoreDonutOption(
  card: InterviewOutputCardFixture,
  t: ChartTheme,
  reduceMotion: boolean,
): EChartsOption {
  const good = t.palette[2] // success
  const bad = t.palette[4] // error
  const muted = t.textMuted
  const slices: DonutSlice[] = contributingScoreDonutBuckets(card.softGrade.byWeight).map(([key, b]) => {
      const unit = b.unit ?? 0
      const contrib = Math.max(0, unit * b.weight)
      const color = sectionScoreColor(unit, good, bad)
      const parts: DonutPart[] = (b.parts ?? []).map((part) => ({
        label: part.label,
        unitPct: formatOutputCardPercent(part.unit),
        iconSvg: lucideToSvg(partKindIcon(part.kind), muted),
      }))
      return {
        name: shortSectionLabel(b.label),
        value: contrib,
        contribPct: Math.round(contrib * 100),
        weightPct: Math.round(b.weight * 100),
        unitPct: Math.round(unit * 100),
        iconSvg: lucideToSvg(softBucketIcon(key), color),
        parts,
        itemStyle: {
          color,
          borderColor: t.surface,
          borderWidth: 2,
        },
      }
    })

  return {
    animation: !reduceMotion,
    animationDuration: reduceMotion ? 0 : 480,
    animationDurationUpdate: 0,
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      confine: false,
      borderWidth: 0,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      padding: 0,
      textStyle: { color: t.text, fontSize: 12 },
      extraCssText: floatingTooltipCss(t),
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params
        const data = (p?.data ?? {}) as Partial<DonutSlice>
        const name = escapeHtml(
          typeof p?.name === 'string' ? p.name : data.name ?? 'Section',
        )
        const contribPct =
          typeof data.contribPct === 'number'
            ? data.contribPct
            : Math.round(Number(p?.percent ?? 0))
        const icon = typeof data.iconSvg === 'string' ? data.iconSvg : ''
        const head = `<div style="display:flex;align-items:center;gap:0.4rem;font-weight:600"><span style="display:inline-flex;flex-shrink:0;width:0.75rem;height:0.75rem">${icon}</span><span style="flex:1;min-width:0">${name}</span><span style="font-variant-numeric:tabular-nums;letter-spacing:-0.02em">${contribPct}%</span></div>`
        const parts = Array.isArray(data.parts) ? data.parts : []
        if (!parts.length) {
          const unitPct = typeof data.unitPct === 'number' ? data.unitPct : null
          const weightPct = typeof data.weightPct === 'number' ? data.weightPct : null
          const detail =
            unitPct != null && weightPct != null
              ? `<div style="margin-top:0.2rem;padding-inline-start:1.1rem;opacity:0.72;font-size:0.6875rem">Scored ${unitPct}% · ${weightPct}% of package</div>`
              : ''
          return `<div style="min-width:11.75rem;line-height:1.25">${head}${detail}</div>`
        }
        const partRows = parts
          .map((part) => {
            const partName = escapeHtml(part.label)
            return `<div style="display:flex;align-items:center;gap:0.4rem;opacity:0.88"><span style="display:inline-flex;flex-shrink:0;width:0.75rem;height:0.75rem">${part.iconSvg}</span><span style="flex:1;min-width:0">${partName}</span><span style="font-variant-numeric:tabular-nums;letter-spacing:-0.02em">${escapeHtml(part.unitPct)}</span></div>`
          })
          .join('')
        return `<div style="display:flex;flex-direction:column;gap:0.32rem;min-width:12.5rem;line-height:1.25">${head}<div style="display:flex;flex-direction:column;gap:0.22rem;padding-inline-start:0.15rem">${partRows}</div></div>`
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '82%'],
        center: ['50%', '50%'],
        silent: false,
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 4,
          label: { show: false },
          itemStyle: {
            shadowBlur: 8,
            shadowColor: `color-mix(in srgb, ${t.text} 22%, transparent)`,
          },
        },
        data: slices,
      },
    ] as EChartsOption['series'],
  }
}

/**
 * Sample Interview Output Card repeater — manager list chrome. Row click opens
 * Verify overlay (Assessor Aid + result spine). Fixture-first preview.
 */
export function InterviewOutputCardRepeater({
  cards: cardsProp,
  emptyLabel = 'No attempt results yet.',
  className = '',
  onSeeMoreSection,
  skipMountReveal = false,
  debug = false,
}: InterviewOutputCardRepeaterProps) {
  const cards = cardsProp ?? loadSampleOutputCards()
  const listRef = useRef<HTMLUListElement>(null)
  const gsapPage = useGsapPageOptional()
  const sectionKey = cards.map((c) => c.id).join('|')

  useEffect(() => {
    if (skipMountReveal) return
    revealSectionIn(listRef.current, {
      reducedMotion: gsapPage?.reducedMotion,
      stagger: 0.05,
      fromY: 14,
      duration: 0.4,
    })
  }, [sectionKey, gsapPage?.reducedMotion, skipMountReveal])

  if (debug) {
    console.debug('[InterviewOutputCardRepeater]', { count: cards.length })
  }

  if (cards.length === 0) {
    return <p className="type-caption type-muted mb-0">{emptyLabel}</p>
  }

  return (
    <ul
      ref={listRef}
      className={[
        'theme-interview-creator__list',
        'theme-interview-landing__output-cards',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {cards.map((card) => (
        <OutputCardRow
          key={card.id}
          card={card}
          onOpen={() =>
            onSeeMoreSection?.({
              sectionKey: RESULT_REVIEW_SECTION_KEY,
              label: card.candidate.displayName,
            })
          }
          debug={debug}
        />
      ))}
    </ul>
  )
}

function OutputCardRow({
  card,
  onOpen,
  debug,
}: {
  card: InterviewOutputCardFixture
  onOpen: () => void
  debug?: boolean
}) {
  const t = useChartTheme()
  const reduceMotion = prefersReducedMotion()
  const overallPct = formatOutputCardPercent(card.softGrade.overall)
  const overallValue = Math.round(card.softGrade.overall * 100)
  const markingOverall = sittingResultHeadlinePending(card.resultStatus)
  const unmarked = sittingResultUnmarked(card.resultStatus)
  const needsReview = sittingResultNeedsReview(card.resultStatus)
  const completedLabel = card.completedAt
    ? formatInterviewManagerDateShort(card.completedAt)
    : ''
  const gateLabel = formGateLabel(card.formGate)
  // A gate pass cannot present as clean while part of the score is our marking defect.
  const scoreToneClass =
    gateLabel === 'Fail'
      ? 'is-fail'
      : needsReview
        ? 'is-review'
        : gateLabel === 'Pass'
          ? 'is-pass'
          : 'is-review'

  const metaTags = collapsedMetaTags(card)
  const scoreDonut = useMemo(
    () => buildScoreDonutOption(card, t, reduceMotion),
    [card, t, reduceMotion],
  )

  const onHeaderKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  if (debug) {
    console.debug('[OutputCardRow]', { id: card.id })
  }

  return (
    <li
      className="theme-interview-creator__list-item theme-interview-landing__output-item"
      data-open="false"
      data-gate={gateLabel?.toLowerCase() ?? 'none'}
      data-dash-anim
    >
      <article className="theme-interview-creator__list-row theme-interview-landing__output-row">
        <span
          className={[
            'theme-interview-creator__list-mark',
            'theme-interview-landing__output-mark',
            'theme-interview-landing__output-mark--avatar',
          ].join(' ')}
          aria-hidden
        >
          <VurifyAvatar
            src={card.candidate.photoUrl}
            name={card.candidate.displayName}
            size="md"
          />
        </span>
        <div className="theme-interview-creator__list-main">
          <div className="theme-interview-creator__list-rest">
            <button
              type="button"
              className="theme-interview-landing__output-header"
              id={`output-card-header-${card.id}`}
              onClick={onOpen}
              onKeyDown={onHeaderKeyDown}
            >
              <div className="theme-interview-creator__list-heading">
                <div className="theme-interview-landing__output-lead">
                  <h3
                    className="mb-0 theme-interview-creator__list-title"
                    title={card.candidate.displayName}
                  >
                    {card.candidate.displayName}
                  </h3>
                  <div
                    className="theme-interview-landing__output-lead-rule"
                    aria-hidden
                  >
                    <ArrangementRule />
                  </div>
                  {card.summary ? (
                    <p className="type-caption type-muted mb-0 theme-interview-landing__output-headline">
                      {card.summary}
                    </p>
                  ) : null}
                  {metaTags.length > 0 ? (
                    <div
                      className="theme-interview-landing__output-meta-tags theme-tag-group"
                      aria-label="Interview meta"
                    >
                      {metaTags.map((tag) => {
                        const signal = completeRatioSignal(tag.label) ?? tag.signal
                        const Icon = outputMetaTagIcon({ ...tag, signal })
                        const chip = (
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
                        )
                        if (tag.id !== 'sections') {
                          return <span key={tag.id}>{chip}</span>
                        }
                        const scores = sectionScoreTooltip(card)
                        if (!scores) {
                          return <span key={tag.id}>{chip}</span>
                        }
                        return (
                          <Tooltip key={tag.id} content={scores} placement="top">
                            {chip}
                          </Tooltip>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="theme-interview-creator__list-heading-trail theme-interview-landing__output-trail">
                  <div className="theme-interview-landing__output-trail-top">
                    {card.completedAt ? (
                      <p
                        className="type-caption mb-0 theme-interview-creator__list-dates"
                        aria-label={`Completed ${completedLabel}`}
                      >
                        <time
                          className="theme-interview-creator__list-date"
                          data-tone="muted"
                          dateTime={card.completedAt}
                        >
                          {completedLabel}
                        </time>
                      </p>
                    ) : null}
                    <ChevronDown
                      aria-hidden
                      className="theme-interview-landing__output-chevron size-4 shrink-0"
                      strokeWidth={2}
                    />
                  </div>
                  <div
                    className="theme-interview-landing__output-overall-donut"
                    role="img"
                    aria-label={
                      unmarked
                        ? unmarkedStagesLabel(card.grainCounts)
                        : markingOverall
                          ? 'Soft Decision marking'
                          : `Soft Decision ${overallPct}${gateLabel ? ` · ${gateLabel}` : ''}`
                    }
                  >
                    <div className="theme-interview-landing__output-overall-donut-plot">
                      <EChart
                        option={scoreDonut}
                        height={96}
                        className="theme-interview-landing__output-overall-donut-chart"
                      />
                    </div>
                    <span
                      className={[
                        'theme-interview-landing__output-overall-donut-score',
                        markingOverall ? 'is-review' : scoreToneClass,
                      ].join(' ')}
                      aria-hidden
                    >
                      <span className="theme-interview-landing__output-overall-donut-score-inner">
                        {markingOverall ? (
                          '—'
                        ) : (
                          <>
                            {overallValue}
                            <span className="theme-interview-landing__output-overall-donut-unit">
                              %
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </article>
    </li>
  )
}
