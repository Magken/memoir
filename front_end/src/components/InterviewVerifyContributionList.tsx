import type { TalkVerifyMarkingCard } from '../lib/interviewRunApi/talkVerifyModal'
import type { GrainContribution } from '../lib/interviewRunApi/scoreAttempt'

export type InterviewVerifyContributionItem = {
  id: string
  label: string
  towardOverall: number | null
  unit?: number | null
  status?: string
  bucket?: string
  summary?: string
}

type InterviewVerifyContributionListProps = {
  items: ReadonlyArray<InterviewVerifyContributionItem>
  heading?: string
  className?: string
  debug?: boolean
  onJumpItem?: (id: string) => void
}

function pct(n: number): string {
  return `${Math.round(n * 1000) / 10}%`
}

export function contributionItemsFromCards(
  cards: readonly TalkVerifyMarkingCard[],
): InterviewVerifyContributionItem[] {
  return cards.map((card) => ({
    id: card.id,
    label: card.title,
    towardOverall: card.towardOverall ?? null,
    unit: card.unit ?? null,
    status: card.status,
    summary: card.boardSummary,
  }))
}

export function contributionItemsFromScored(
  contributions: readonly GrainContribution[],
  labelFor: (templateId: string) => string,
): InterviewVerifyContributionItem[] {
  return contributions.map((c) => ({
    id: `${c.templateId}:${c.hostRef}`,
    label: labelFor(c.templateId),
    towardOverall: c.towardOverall,
    unit: c.unit,
    status: 'filled',
    bucket: c.bucket,
  }))
}

/**
 * In-depth Soft Decision contribution list — Verify + Finished.
 */
export function InterviewVerifyContributionList({
  items,
  heading = 'How each mark counts',
  className = '',
  debug = false,
  onJumpItem,
}: InterviewVerifyContributionListProps) {
  if (debug) {
    console.debug('[InterviewVerifyContributionList]', { count: items.length })
  }
  const rows = items.filter((item) => item.status !== 'skipped')
  if (!rows.length) return null

  return (
    <section
      className={[
        'flex flex-col gap-2 theme-interview-landing__verify-contrib',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={heading}
    >
      <h3 className="type-label mb-0">{heading}</h3>
      <ul className="mb-0 flex flex-col gap-1 theme-interview-landing__verify-contrib-list">
        {rows.map((item) => (
          <li key={item.id} className="type-caption mb-0">
            {onJumpItem ? (
              <button
                type="button"
                className="type-link type-caption"
                onClick={() => onJumpItem(item.id)}
              >
                {item.label}
              </button>
            ) : (
              <span>{item.label}</span>
            )}
            {item.status === 'pending' ? (
              <span className="type-muted"> — pending</span>
            ) : item.towardOverall != null ? (
              <span className="type-muted">
                {' '}
                — {pct(item.towardOverall)} of the attempt
                {item.unit != null ? ` (${Math.round(item.unit * 100)}% on its mark)` : ''}
                {item.summary ? ` · ${item.summary}` : ''}
              </span>
            ) : (
              <span className="type-muted">
                {' '}
                — narrative / not in overall
                {item.summary ? ` · ${item.summary}` : ''}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
