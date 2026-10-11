import {
  Check,
  ClipboardList,
  Code2,
  MessageSquare,
  MinusCircle,
  PenLine,
  type LucideIcon,
} from 'lucide-react'
import { Tag } from './Tag'
import { VurifyIcon } from './VurifyIcon'
import type { InterviewLandingSection } from '../lib/interviewBrief'

type InterviewStructureSummaryRepeaterProps = {
  sections: readonly InterviewLandingSection[]
  /** Phase ids already passed (done and dusted). */
  completedPhaseIds?: readonly string[]
  /** Timed stages left mid-flight (forfeited). */
  skippedPhaseIds?: readonly string[]
  /** Optional empty copy when `sections` is empty. */
  emptyLabel?: string
  className?: string
  debug?: boolean
}

type SummaryRow = {
  id: string
  label: string
  kindLabel: string
  timeLabel: string
  timed: boolean
  done: boolean
  skipped: boolean
  icon: LucideIcon
}

function kindIcon(kindLabel: string): LucideIcon {
  switch (kindLabel) {
    case 'Form':
      return ClipboardList
    case 'Coding':
      return Code2
    case 'Writing':
      return PenLine
    default:
      return MessageSquare
  }
}

/** Spoiler-safe stage name — kind (+ ordinal when that kind repeats). */
function safeStageLabel(kindLabel: string, indexAmongKind: number, kindCount: number): string {
  const base = kindLabel === 'Coding' ? 'Coding challenge' : kindLabel
  if (kindCount <= 1) return base
  return `${base} ${indexAmongKind}`
}

function buildSummaryRows(
  sections: readonly InterviewLandingSection[],
  completedPhaseIds: readonly string[],
  skippedPhaseIds: readonly string[],
): SummaryRow[] {
  const done = new Set(completedPhaseIds)
  const skipped = new Set(skippedPhaseIds)
  const kindTotals = new Map<string, number>()
  for (const section of sections) {
    kindTotals.set(section.kindLabel, (kindTotals.get(section.kindLabel) ?? 0) + 1)
  }
  const kindSeen = new Map<string, number>()
  return sections.map((section) => {
    const seen = (kindSeen.get(section.kindLabel) ?? 0) + 1
    kindSeen.set(section.kindLabel, seen)
    const total = kindTotals.get(section.kindLabel) ?? 1
    const isDone = done.has(section.id)
    const isSkipped = !isDone && skipped.has(section.id)
    return {
      id: section.id,
      label: safeStageLabel(section.kindLabel, seen, total),
      kindLabel: section.kindLabel,
      timeLabel: section.timeLabel,
      timed: section.timed,
      done: isDone,
      skipped: isSkipped,
      icon: kindIcon(section.kindLabel),
    }
  })
}

/**
 * Compact candidate structure list — kind label (+ ordinal) and time only.
 * No authored titles, blurbs, or probes (anti-spoiler before Start).
 */
export function InterviewStructureSummaryRepeater({
  sections,
  completedPhaseIds = [],
  skippedPhaseIds = [],
  emptyLabel = 'No sections yet.',
  className = '',
  debug = false,
}: InterviewStructureSummaryRepeaterProps) {
  const rows = buildSummaryRows(sections, completedPhaseIds, skippedPhaseIds)

  if (debug) {
    console.debug('[InterviewStructureSummaryRepeater]', { count: rows.length, rows })
  }

  if (rows.length === 0) {
    return <p className="type-caption type-muted mb-0">{emptyLabel}</p>
  }

  return (
    <ul
      className={['theme-interview-landing__summary-list', className].filter(Boolean).join(' ')}
      aria-label="Interview stages"
    >
      {rows.map((row) => {
        return (
        <li
          key={row.id}
          className={[
            'theme-interview-landing__summary-item',
            row.done ? 'is-done' : '',
            row.skipped ? 'is-skipped' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="theme-interview-landing__summary-row">
            <span className="theme-interview-landing__summary-mark" aria-hidden>
              <VurifyIcon
                icon={row.done ? Check : row.skipped ? MinusCircle : row.icon}
                variant="plain"
                tone={row.done ? 'accent' : 'muted'}
                size="sm"
              />
            </span>
            <div className="theme-interview-landing__summary-label-wrap theme-tag-group theme-interview-flow-timeline__tags">
              <Tag
                size="sm"
                className="theme-interview-flow-timeline__tag theme-interview-landing__summary-kind-tag"
              >
                <span className="theme-interview-landing__summary-label">{row.label}</span>
              </Tag>
            </div>
            <p
              className={[
                'type-caption mb-0 theme-interview-landing__summary-time',
                row.timed && !row.done && !row.skipped ? 'is-timed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {row.done ? 'Done' : row.skipped ? 'Forfeited' : row.timeLabel}
            </p>
          </div>
        </li>
        )
      })}
    </ul>
  )
}
