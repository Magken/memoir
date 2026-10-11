import { ChevronDown, ChevronUp } from 'lucide-react'
import { TypeAnimText } from './TypeAnimText'

type SearchMatchMetaProps = {
  hasQuery: boolean
  matchCount?: number
  activeMatchIndex?: number
  onPrevMatch?: () => void
  onNextMatch?: () => void
  disabled?: boolean
  className?: string
}

function formatMatchSummary(activeIndex: number, total: number): string {
  if (total <= 0) return '0'
  return `${activeIndex + 1} / ${total}`
}

export function SearchMatchMeta({
  hasQuery,
  matchCount = 0,
  activeMatchIndex = 0,
  onPrevMatch,
  onNextMatch,
  disabled = false,
  className = '',
}: SearchMatchMetaProps) {
  const canNavigate = hasQuery && matchCount > 0 && !disabled
  const showMeta = hasQuery
  const showStepper = showMeta && matchCount > 0
  const activeLabel = matchCount > 0 ? String(activeMatchIndex + 1) : '0'
  const totalLabel = String(matchCount)
  const liveSummary = formatMatchSummary(activeMatchIndex, matchCount)

  if (!showMeta) return null

  return (
    <span
      className={[
        'theme-expandable-search__meta-slot',
        'theme-expandable-search__meta-slot--open',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!showMeta}
    >
      <span className="theme-expandable-search__meta">
        <span
          className={[
            'theme-expandable-search__count type-caption',
            matchCount <= 0 && hasQuery ? 'theme-expandable-search__count--empty' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {liveSummary}
          </span>
          {matchCount > 0 ? (
            <>
              <TypeAnimText
                key={`match-active-${activeMatchIndex}`}
                anim="flip"
                trigger="enter"
                split="chars"
                className="theme-expandable-search__count-active"
              >
                {activeLabel}
              </TypeAnimText>
              <span className="theme-expandable-search__count-sep" aria-hidden>
                /
              </span>
              <TypeAnimText
                key={`match-total-${matchCount}`}
                anim="flip"
                trigger="enter"
                split="chars"
                className="theme-expandable-search__count-total"
              >
                {totalLabel}
              </TypeAnimText>
            </>
          ) : (
            <span aria-hidden>0</span>
          )}
        </span>
        {showStepper ? (
          <span className="theme-expandable-search__stepper">
            <button
              type="button"
              className="theme-expandable-search__step"
              aria-label="Previous match"
              disabled={!canNavigate}
              onClick={onPrevMatch}
            >
              <ChevronUp strokeWidth={2.5} aria-hidden />
            </button>
            <button
              type="button"
              className="theme-expandable-search__step"
              aria-label="Next match"
              disabled={!canNavigate}
              onClick={onNextMatch}
            >
              <ChevronDown strokeWidth={2.5} aria-hidden />
            </button>
          </span>
        ) : null}
      </span>
    </span>
  )
}
