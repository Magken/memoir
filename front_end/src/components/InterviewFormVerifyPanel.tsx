/**
 * Form Soft Decision Verify — formGate lead + stacked marks + TestForm review (answerKey).
 * The questions live inside the form itself, so there is no separate overview to collapse.
 */
import { useEffect, useRef } from 'react'
import { TestForm, type TestFormHandle } from './TestForm'
import { InterviewVerifyMarkStrip } from './InterviewVerifyMarkStrip'
import {
  InterviewEditorTapePlayer,
  extraTapeTagsFromCards,
  extraBucketNotesFromCards,
  extraPasteBurstsFromCards,
  type InterviewEditorTapePlayerHandle,
} from './InterviewEditorTapePlayer'
import { ThemeScroll } from './ThemeScroll'
import { formResponsesFromCheckpoint } from '../lib/interviewRunApi/editorCapture'
import type { Checkpoint } from '../lib/interviewRunApi/editorCapture'
import type { FormVerifyModal } from '../lib/interviewRunApi/formVerifyModal'
import type { TalkVerifyMarkingCard } from '../lib/interviewRunApi/talkVerifyModal'
import { jumpFromCard } from '../lib/interviewRunApi/jumpCite'

type InterviewFormVerifyPanelProps = {
  modal: FormVerifyModal
  onAskAboutCard?: (card: TalkVerifyMarkingCard) => void
  onPromoteTitle?: (title: string | null) => void
  initialSeekMs?: number
  /** Results Expand — grow with overlay ThemeScroll so sticky asides can pin. */
  inPageScroll?: boolean
  className?: string
  debug?: boolean
}

export function InterviewFormVerifyPanel({
  modal,
  onAskAboutCard,
  onPromoteTitle,
  initialSeekMs,
  inPageScroll = false,
  className = '',
  debug = false,
}: InterviewFormVerifyPanelProps) {
  const formRef = useRef<TestFormHandle>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const tapeRef = useRef<InterviewEditorTapePlayerHandle>(null)
  useEffect(() => {
    if (initialSeekMs == null) return
    const id = window.setTimeout(() => tapeRef.current?.seek(initialSeekMs), 80)
    return () => window.clearTimeout(id)
  }, [initialSeekMs])

  const flashQuestion = (questionId: string) => {
    const el = hostRef.current?.querySelector<HTMLElement>(
      `[data-test-form-question="${questionId}"]`,
    )
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    if (!reduce) {
      el.classList.add('is-cite-flash')
      window.setTimeout(() => el.classList.remove('is-cite-flash'), 1200)
    }
  }

  const jumpCard = (card: TalkVerifyMarkingCard) => {
    jumpFromCard(card, {
      seekTape: (ms) => tapeRef.current?.seek(ms),
      revealQuestion: flashQuestion,
      revealMessage: (id) => {
        const el = hostRef.current?.querySelector<HTMLElement>(`[data-assist-message="${id}"]`)
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      },
    })
  }

  const handleTapeFrame = (frame: Checkpoint) => {
    formRef.current?.loadContext?.({
      document: {
        ...modal.document,
        attempt: {
          ...(modal.document.attempt ?? {}),
          responses: formResponsesFromCheckpoint(frame)?.responses ?? {},
        },
      },
      mode: 'review',
    })
  }

  if (debug) {
    console.debug('[InterviewFormVerifyPanel]', {
      sectionKey: modal.sectionKey,
      cards: modal.cards.length,
      questions: modal.document.questions?.length ?? 0,
      hasAnswerKey: Boolean(
        modal.document.answerKey && Object.keys(modal.document.answerKey).length > 0,
      ),
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
            className="theme-interview-landing__verify-tool-body theme-interview-landing__verify-tool-body--form"
            data-dash-anim
          >
            <p className="type-label mb-0 theme-interview-gate-live__editor-label">
              Review responses
            </p>
            <TestForm ref={formRef} embed initialMode="review" initialDocument={modal.document} />
          </div>
    </div>
  )

  return (
    <div
      ref={hostRef}
      className={['theme-interview-landing__verify-tool', className].filter(Boolean).join(' ')}
      data-verify-kind="form"
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
