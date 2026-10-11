/**
 * Essay Soft Decision Verify — collapsed question overview, stacked marks, read-only DocEditor.
 */
import { useEffect, useRef } from 'react'
import { ListOrdered } from 'lucide-react'
import { DocEditor, type DocEditorHandle } from './DocEditor'
import { InterviewVerifyMarkStrip } from './InterviewVerifyMarkStrip'
import { InterviewVerifyQuestionOverview } from './InterviewVerifyQuestionOverview'
import {
  InterviewEditorTapePlayer,
  extraTapeTagsFromCards,
  extraBucketNotesFromCards,
  extraPasteBurstsFromCards,
  type InterviewEditorTapePlayerHandle,
} from './InterviewEditorTapePlayer'
import { ThemeScroll } from './ThemeScroll'
import { VurifyIcon } from './VurifyIcon'
import { docPayloadFromCheckpoint } from '../lib/interviewRunApi/editorCapture'
import type { Checkpoint } from '../lib/interviewRunApi/editorCapture'
import type { EssayVerifyModal } from '../lib/interviewRunApi/essayVerifyModal'
import type { TalkVerifyMarkingCard } from '../lib/interviewRunApi/talkVerifyModal'
import { jumpFromCard } from '../lib/interviewRunApi/jumpCite'
import { revealEssayRange } from '../lib/docEditor/revealEssayRange'

type InterviewEssayVerifyPanelProps = {
  modal: EssayVerifyModal
  onAskAboutCard?: (card: TalkVerifyMarkingCard) => void
  onPromoteTitle?: (title: string | null) => void
  initialSeekMs?: number
  /** Results Expand — grow with overlay ThemeScroll so sticky asides can pin. */
  inPageScroll?: boolean
  className?: string
  debug?: boolean
}

export function InterviewEssayVerifyPanel({
  modal,
  onAskAboutCard,
  onPromoteTitle,
  initialSeekMs,
  inPageScroll = false,
  className = '',
  debug = false,
}: InterviewEssayVerifyPanelProps) {
  const mount = modal.mount
  const docRef = useRef<DocEditorHandle>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const essayShellRef = useRef<HTMLDivElement>(null)
  const tapeRef = useRef<InterviewEditorTapePlayerHandle>(null)
  useEffect(() => {
    if (initialSeekMs == null) return
    const id = window.setTimeout(() => tapeRef.current?.seek(initialSeekMs), 80)
    return () => window.clearTimeout(id)
  }, [initialSeekMs])
  const brief =
    mount.prompt.brief.trim() ||
    mount.instructions.trim() ||
    modal.description.trim() ||
    ''
  const structure = mount.prompt.structure
  const requirements = mount.prompt.requirements
  const wordBits = [
    mount.minWords != null ? `Min ${mount.minWords} words` : null,
    mount.maxWords != null ? `Max ${mount.maxWords} words` : null,
  ].filter(Boolean) as string[]

  const handleTapeFrame = (frame: Checkpoint) => {
    docRef.current?.loadContext?.(docPayloadFromCheckpoint(frame))
  }

  const jumpCard = (card: TalkVerifyMarkingCard) => {
    jumpFromCard(card, {
      seekTape: (ms) => tapeRef.current?.seek(ms),
      revealEssayRange: (start, end, search) => {
        revealEssayRange(essayShellRef.current, {
          startLine: start,
          endLine: end,
          search,
        })
      },
      revealMessage: (id) => {
        const el = hostRef.current?.querySelector<HTMLElement>(`[data-assist-message="${id}"]`)
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      },
    })
  }

  if (debug) {
    console.debug('[InterviewEssayVerifyPanel]', {
      sectionKey: modal.sectionKey,
      cards: modal.cards.length,
    })
  }

  const inner = (
    <div className="theme-interview-landing__verify-tool-inner">
          <header className="theme-interview-landing__verify-lead">
            <h2
              className="type-h3 type-serif-italic mb-0 theme-interview-gate__title"
              data-interview-verify-title-text={modal.title}
              onMouseEnter={() => onPromoteTitle?.(modal.title)}
            >
              {modal.title}
            </h2>
            {(brief || structure.length > 0 || requirements.length > 0 || wordBits.length > 0) ? (
            <InterviewVerifyQuestionOverview>
            <article
              className="theme-interview-gate theme-interview-gate--writing-brief"
              aria-label="Writing prompt"
            >
              <div className="theme-interview-gate__prep-extras">
                {brief ? (
                  <section className="theme-interview-gate__preamble" aria-label="Prompt">
                    <h3 className="type-label mb-0 theme-interview-landing__structure-label">
                      Prompt
                    </h3>
                    <p className="type-body mb-0">{brief}</p>
                  </section>
                ) : null}
                {structure.length > 0 ? (
                  <section className="theme-interview-gate__preamble" aria-label="Cover">
                    <h3 className="type-label mb-0 theme-interview-landing__structure-label">
                      Cover
                    </h3>
                    <ul className="theme-interview-landing__summary-list theme-interview-gate__preamble-list">
                      {structure.map((row) => (
                        <li key={row.id} className="theme-interview-landing__summary-item">
                          <div className="theme-interview-landing__summary-row">
                            <span className="theme-interview-landing__summary-mark" aria-hidden>
                              <VurifyIcon
                                icon={ListOrdered}
                                variant="plain"
                                tone="muted"
                                size="sm"
                              />
                            </span>
                            <p className="type-body-sm mb-0 theme-interview-landing__summary-label">
                              {row.label}
                              {row.hint?.trim() ? (
                                <span className="theme-interview-gate-live__brief-hint">
                                  {' '}
                                  — {row.hint.trim()}
                                </span>
                              ) : null}
                            </p>
                            <span className="theme-interview-landing__summary-time" aria-hidden />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {requirements.length > 0 ? (
                  <section className="theme-interview-gate__preamble" aria-label="Requirements">
                    <h3 className="type-label mb-0 theme-interview-landing__structure-label">
                      Requirements
                    </h3>
                    <ul className="theme-interview-landing__summary-list theme-interview-gate__preamble-list">
                      {requirements.map((req, i) => (
                        <li key={`${i}-${req.slice(0, 24)}`} className="theme-interview-landing__summary-item">
                          <div className="theme-interview-landing__summary-row">
                            <span className="theme-interview-landing__summary-mark" aria-hidden>
                              <VurifyIcon
                                icon={ListOrdered}
                                variant="plain"
                                tone="muted"
                                size="sm"
                              />
                            </span>
                            <p className="type-body-sm mb-0 theme-interview-landing__summary-label">
                              {req}
                            </p>
                            <span className="theme-interview-landing__summary-time" aria-hidden />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {wordBits.length > 0 ? (
                  <section className="theme-interview-gate__preamble" aria-label="Length">
                    <h3 className="type-label mb-0 theme-interview-landing__structure-label">
                      Length
                    </h3>
                    <p className="type-body-sm mb-0">{wordBits.join(' · ')}</p>
                  </section>
                ) : null}
              </div>
            </article>
            </InterviewVerifyQuestionOverview>
            ) : null}
          </header>

          <InterviewVerifyMarkStrip
            cards={modal.cards}
            onAskAboutCard={onAskAboutCard}
            onJumpCard={jumpCard}
          />

          {modal.tape ? (
            <InterviewEditorTapePlayer
              ref={tapeRef}
              tape={modal.tape}
              onFrame={handleTapeFrame}
              messages={modal.assistMessages}
              extraTags={extraTapeTagsFromCards(modal.cards)}
              bucketNotes={extraBucketNotesFromCards(modal.cards)}
              pasteBursts={extraPasteBurstsFromCards(modal.cards)}
              debug={debug}
            />
          ) : null}

          <div
            ref={essayShellRef}
            className="theme-interview-gate-live__editor theme-interview-gate-live__editor--doc theme-interview-landing__verify-tool-body"
            data-dash-anim
          >
            <p className="type-label mb-0 theme-interview-gate-live__editor-label">
              Attempt response
            </p>
            <DocEditor
              ref={docRef}
              embed
              chrome="section"
              readOnly
              placeholder="No writing captured for this attempt."
              initialPayload={mount.document}
              minWords={mount.minWords}
              maxWords={mount.maxWords}
            />
          </div>
    </div>
  )

  return (
    <div
      ref={hostRef}
      className={['theme-interview-landing__verify-tool', className].filter(Boolean).join(' ')}
      data-verify-kind="essay"
      data-page-flow={inPageScroll ? 'true' : undefined}
    >
      {inPageScroll ? (
        inner
      ) : (
        <ThemeScroll
          className="theme-interview-landing__verify-tool-scroll"
          rail="mini"
          scrollClouds
        >
          {inner}
        </ThemeScroll>
      )}
    </div>
  )
}
