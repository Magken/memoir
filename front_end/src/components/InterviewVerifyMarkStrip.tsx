/**
 * Soft Decision Verify marks — Work tab.
 *
 * Grouped Clarity-style beats (lead, reading chip, per-axis Why). Each beat keeps
 * its own sticky radar; Overview hairlines divide beats inside a family.
 * Assist chat belongs on Conversation, not here.
 */
import { InterviewMarkBoardView } from './InterviewFlowReportBeats'
import type { TalkVerifyMarkingCard } from '../lib/interviewRunApi/talkVerifyModal'
import { cardHasJump } from '../lib/interviewRunApi/jumpCite'
import { synthesisBeat, workGroups, type MarkBeat } from '../lib/interviewRunApi/markBeats'

type InterviewVerifyMarkStripProps = {
  cards: TalkVerifyMarkingCard[]
  onAskAboutCard?: (card: TalkVerifyMarkingCard) => void
  onJumpCard?: (card: TalkVerifyMarkingCard) => void
  className?: string
  debug?: boolean
}

export function InterviewVerifyMarkStrip({
  cards,
  onAskAboutCard,
  onJumpCard,
  className = '',
  debug = false,
}: InterviewVerifyMarkStripProps) {
  const groups = workGroups(cards)
  const synth = synthesisBeat(cards)
  const byId = new Map(cards.map((card) => [card.id, card]))

  if (debug) {
    console.debug('[InterviewVerifyMarkStrip]', { count: cards.length, groups: groups.length })
  }

  if (!groups.length) {
    return (
      <p className="type-body type-muted mb-0 theme-interview-landing__verify-tool-marks-empty">
        No Soft Decision marks for this section yet.
      </p>
    )
  }

  const handleJump = (beat: MarkBeat) => {
    const card = byId.get(beat.id)
    if (card && onJumpCard && cardHasJump(card)) onJumpCard(card)
  }

  return (
    <div
      className={['theme-interview-landing__verify-tool-marks-host', className]
        .filter(Boolean)
        .join(' ')}
      role="region"
      aria-label="How this section was marked"
    >
      {groups.length ? (
        <InterviewMarkBoardView
          groups={groups}
          onJumpBeat={onJumpCard ? handleJump : undefined}
          onAskBeat={
            onAskAboutCard
              ? (beat) => {
                  const card = byId.get(beat.id)
                  if (card) onAskAboutCard(card)
                }
              : undefined
          }
          footer={
            synth ? (
              <div className="theme-interview-result-review__mark-copy">
                <div className="theme-interview-flow-templates-section__subhead">
                  <p className="type-label mb-0">In short</p>
                  <div className="theme-interview-flow-form__guide-rule" role="presentation" />
                </div>
                <p className="type-body mb-0">{synth}</p>
              </div>
            ) : null
          }
        />
      ) : null}
    </div>
  )
}
