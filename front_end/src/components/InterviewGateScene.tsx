/**
 * Gate page — prep (title / preamble / Start) then live tool editor or in-page Talk chat.
 * Tool Start: prep-out → editor-in. Talk Start: prep extras out → in-page chat (peel stays closed).
 */
import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  Ban,
  ClipboardList,
  Droplets,
  Focus,
  FormInput,
  Keyboard,
  Laptop,
  Lightbulb,
  MessageCircle,
  MessageCircleOff,
  Mic,
  NotebookPen,
  Pause,
  Play,
  Sparkles,
  Timer,
  VolumeX,
  type LucideIcon,
} from 'lucide-react'
import { VurifyIcon } from './VurifyIcon'
import { VurifyMenuButton } from './VurifyMenuButton'
import { InterviewGateToolLive, type GateLiveCompositionEvent, type GateLiveEditorHandle } from './InterviewGateToolLive'
import { InterviewTalkPageChat } from './InterviewTalkPageChat'
import type { GatePreambleIcon, InterviewGateView, TalkMenuAction, TalkRuntimeView } from '../lib/interviewRunApi'
import type { GateToolMount } from '../lib/interviewRunApi/resolveGateToolMount'
import { revealSectionIn, revealSectionOut, useGsapPageOptional } from '../lib/gsap'

type InterviewGateSceneProps = {
  gate: InterviewGateView
  /** True after the candidate presses Start on this gate. */
  stageStarted?: boolean
  /** Parent already plays landing→gate enter — skip prep stagger. */
  skipMountReveal?: boolean
  onStartStage?: () => void
  /**
   * Active Talk runtime (after Start). Conversation UI mounts in-page;
   * peel stays closed for Talk.
   */
  talk?: TalkRuntimeView | null
  onTalkSend?: (text: string) => void
  onTalkDraftChange?: (draft: string) => void
  onTalkMenu?: (action: TalkMenuAction) => void
  /** Page ThemeScroll viewport — Talk stick-to-bottom. */
  scrollViewportRef?: RefObject<HTMLElement | null>
  /** Candidate-safe Form / Coding / Doc mount (null for Talk or missing tool). */
  toolMount?: GateToolMount | null
  /** Parent reads this to animate live out before Next / leave. */
  liveHostRef?: RefObject<HTMLDivElement | null>
  /** Copilot apply — live editor handle, not the GSAP host. */
  editorHandleRef?: RefObject<GateLiveEditorHandle | null>
  /** Live Form/Coding/Doc composition for stage assist. */
  onLiveCompositionChange?: (event: GateLiveCompositionEvent) => void
  onPendingEditsChange?: (files: readonly { path: string; id?: string; label?: string; locked?: boolean }[]) => void
  onVisibleCodeRun?: (input: {
    sourceHash: string
    result: import('../lib/interviewRunApi').CodeRunResult
  }) => void
  /** Fixture demo brief id — anon guest Edge when unsigned. */
  briefId?: string | null
  debug?: boolean
}

const PREAMBLE_ICONS: Record<GatePreambleIcon, LucideIcon> = {
  timer: Timer,
  pause: Pause,
  water: Droplets,
  focus: Focus,
  quiet: VolumeX,
  device: Laptop,
  note: NotebookPen,
  noLeave: Ban,
  mic: Mic,
  keyboard: Keyboard,
  form: FormInput,
  doc: ClipboardList,
  assist: MessageCircle,
  assistOff: MessageCircleOff,
  assistCoach: Lightbulb,
  assistCopilot: Sparkles,
}

/**
 * Gate page — prep then live tool editor or in-page Talk discussion.
 */
export function InterviewGateScene({
  gate,
  stageStarted = false,
  skipMountReveal = false,
  onStartStage,
  talk = null,
  onTalkSend,
  onTalkDraftChange,
  onTalkMenu,
  scrollViewportRef,
  toolMount = null,
  liveHostRef,
  editorHandleRef,
  onLiveCompositionChange,
  onPendingEditsChange,
  onVisibleCodeRun,
  briefId = null,
  debug = false,
}: InterviewGateSceneProps) {
  const prepRef = useRef<HTMLElement>(null)
  const prepExtrasRef = useRef<HTMLDivElement>(null)
  const talkChatRef = useRef<HTMLDivElement>(null)
  const startActionsRef = useRef<HTMLDivElement>(null)
  const internalLiveRef = useRef<HTMLDivElement>(null)
  const liveRef = liveHostRef ?? internalLiveRef
  const gsapPage = useGsapPageOptional()
  const [streamedIntro, setStreamedIntro] = useState('')
  const [introReady, setIntroReady] = useState(false)
  const [starting, setStarting] = useState(false)
  const prevStarted = useRef(false)
  const talkEntered = useRef(false)

  useEffect(() => {
    if (stageStarted || skipMountReveal) return
    revealSectionIn(prepRef.current, {
      reducedMotion: gsapPage?.reducedMotion,
      stagger: 0.045,
      fromY: 12,
      duration: 0.36,
    })
  }, [gate.phaseId, gate.startPromptId, gsapPage?.reducedMotion, stageStarted, skipMountReveal])

  useEffect(() => {
    const full = gate.introMessage.trim()
    if (!full) {
      setStreamedIntro('')
      setIntroReady(true)
      return
    }
    if (gsapPage?.reducedMotion) {
      setStreamedIntro(full)
      setIntroReady(true)
      return
    }
    setStreamedIntro('')
    setIntroReady(false)
    let i = 0
    let timeout = 0
    const tick = () => {
      i += 1
      setStreamedIntro(full.slice(0, i))
      if (i >= full.length) {
        setIntroReady(true)
        return
      }
      const ch = full[i - 1] ?? ''
      const pause = /[.!?…]/.test(ch) ? 70 : /[,;:]/.test(ch) ? 28 : 0
      timeout = window.setTimeout(tick, 16 + pause)
    }
    timeout = window.setTimeout(tick, 90)
    return () => window.clearTimeout(timeout)
  }, [gate.phaseId, gate.introMessage, gsapPage?.reducedMotion])

  // Live editor enter after Start (tool stages).
  useEffect(() => {
    if (!stageStarted || gate.isTalk || !toolMount) {
      prevStarted.current = stageStarted
      return
    }
    if (!prevStarted.current && stageStarted) {
      revealSectionIn(liveRef.current, {
        reducedMotion: gsapPage?.reducedMotion,
        stagger: 0.04,
        fromY: 14,
        duration: 0.4,
        onComplete: () => {
          const viewport = scrollViewportRef?.current
          if (viewport) viewport.scrollTop = 0
        },
      })
    }
    prevStarted.current = stageStarted
  }, [stageStarted, gate.isTalk, toolMount, gsapPage?.reducedMotion, liveRef, scrollViewportRef])

  // In-page Talk chat enter after Start + runtime ready.
  useEffect(() => {
    if (!stageStarted || !gate.isTalk || !talk) {
      if (!stageStarted) talkEntered.current = false
      return
    }
    if (talkEntered.current) return
    talkEntered.current = true
    revealSectionIn(talkChatRef.current, {
      reducedMotion: gsapPage?.reducedMotion,
      stagger: 0.04,
      fromY: 14,
      duration: 0.4,
      onComplete: () => {
        const viewport = scrollViewportRef?.current
        if (!viewport) return
        const reduced = Boolean(gsapPage?.reducedMotion)
        const top = Math.max(0, viewport.scrollHeight - viewport.clientHeight + 28)
        viewport.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
      },
    })
  }, [stageStarted, gate.isTalk, talk, gsapPage?.reducedMotion, scrollViewportRef])

  if (debug) {
    console.debug('[InterviewGateScene]', gate, { stageStarted, introReady, talk, toolMount })
  }

  const canStart = introReady && !stageStarted && !starting
  const introChars = streamedIntro.split('')
  const talkLive = Boolean(stageStarted && gate.isTalk && talk)
  const talkPending = Boolean(stageStarted && gate.isTalk && !talk)
  const toolLive = Boolean(stageStarted && !gate.isTalk && toolMount)

  const finishTalkStart = () => {
    onStartStage?.()
    setStarting(false)
  }

  const handleStartClick = () => {
    if (!canStart) return
    if (gate.isTalk) {
      setStarting(true)
      const targets = [prepExtrasRef.current, startActionsRef.current].filter(Boolean)
      if (targets.length === 0 || gsapPage?.reducedMotion) {
        finishTalkStart()
        return
      }
      let remaining = targets.length
      const onOneDone = () => {
        remaining -= 1
        if (remaining <= 0) finishTalkStart()
      }
      for (const el of targets) {
        revealSectionOut(el as HTMLElement, {
          reducedMotion: gsapPage?.reducedMotion,
          onComplete: onOneDone,
        })
      }
      return
    }
    setStarting(true)
    revealSectionOut(prepRef.current, {
      reducedMotion: gsapPage?.reducedMotion,
      onComplete: () => {
        onStartStage?.()
        setStarting(false)
      },
    })
  }

  const footerHint = (() => {
    if (!stageStarted) {
      return gate.timed ? 'Clock starts when you press Start.' : 'Start when you are ready for this section.'
    }
    if (gate.isTalk) {
      return 'Reply below. Use Next anytime to continue (harness free-pass).'
    }
    if (toolLive) {
      return ''
    }
    return gate.timed
      ? 'Use Next when ready. Forfeit (in Leave) skips scoring this stage.'
      : 'Use Next to continue to the next section.'
  })()

  return (
    <div
      className="theme-interview-gate-shell"
      data-talk-live={stageStarted && gate.isTalk ? 'true' : 'false'}
    >
      {!toolLive ? (
        <article
          ref={prepRef}
          className="theme-interview-gate"
          aria-label={gate.title}
        >
          <p className="type-label mb-0 theme-interview-gate__stage" data-dash-anim>
            {gate.stageLabel}
            {gate.timeLabel ? ` · ${gate.timeLabel}` : ''}
            {gate.timed ? ' · Timed' : ''}
          </p>
          <h2
            className="type-display-md mb-0 theme-interview-gate__title"
            data-dash-anim
            data-interview-gate-title
            data-interview-gate-title-text={gate.title}
          >
            {gate.title}
          </h2>
          {gate.description ? (
            <p className="type-body mb-0 theme-interview-gate__description" data-dash-anim>
              {gate.description}
            </p>
          ) : null}

          {!stageStarted && gate.introMessage.trim() ? (
            <p
              className="type-body mb-0 theme-interview-gate__intro"
              data-dash-anim
              data-ready={introReady ? 'true' : 'false'}
              data-streaming={!introReady && streamedIntro.length > 0 ? 'true' : 'false'}
              aria-live="polite"
              aria-label={gate.introMessage}
            >
              {gsapPage?.reducedMotion ? (
                gate.introMessage
              ) : (
                <span className="theme-interview-gate__intro-stream" aria-hidden>
                  {introChars.map((ch, index) => (
                    <span key={`${gate.phaseId}-${index}`} className="theme-interview-gate__intro-ch">
                      {ch === ' ' ? '\u00a0' : ch}
                    </span>
                  ))}
                </span>
              )}
            </p>
          ) : null}

          {!stageStarted && introReady ? (
            <div ref={prepExtrasRef} className="theme-interview-gate__prep-extras">
              <section
                className="theme-interview-gate__preamble"
                aria-labelledby="interview-gate-preamble-heading"
                data-dash-anim
              >
                <h3
                  id="interview-gate-preamble-heading"
                  className="type-label mb-0 theme-interview-landing__structure-label"
                >
                  {gate.preamble.eyebrow}
                </h3>
                <ul
                  className="theme-interview-landing__summary-list theme-interview-gate__preamble-list"
                  aria-label={gate.preamble.eyebrow}
                >
                  {gate.preamble.items.map((item) => {
                    const Icon = PREAMBLE_ICONS[item.icon] ?? NotebookPen
                    return (
                      <li key={item.id} className="theme-interview-landing__summary-item">
                        <div className="theme-interview-landing__summary-row">
                          <span className="theme-interview-landing__summary-mark" aria-hidden>
                            <VurifyIcon icon={Icon} variant="plain" tone="muted" size="sm" />
                          </span>
                          <p className="type-body-sm mb-0 theme-interview-landing__summary-label">
                            {item.label}
                          </p>
                          {item.meta ? (
                            <p className="type-caption mb-0 theme-interview-landing__summary-time">
                              {item.meta}
                            </p>
                          ) : (
                            <span className="theme-interview-landing__summary-time" aria-hidden />
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            </div>
          ) : null}

          {talkPending ? (
            <p className="type-caption type-muted mb-0" role="status" data-dash-anim>
              Opening discussion…
            </p>
          ) : null}

          {talkLive && talk ? (
            <div ref={talkChatRef} className="theme-interview-gate__talk-live">
              <InterviewTalkPageChat
                talk={talk}
                introLead={gate.introMessage}
                scrollViewportRef={scrollViewportRef}
                onSend={onTalkSend}
                onDraftChange={onTalkDraftChange}
                onMenu={onTalkMenu}
              />
            </div>
          ) : null}
        </article>
      ) : null}

      {toolLive && toolMount ? (
        <InterviewGateToolLive
          mount={toolMount}
          liveChrome={{
            stageLabel: gate.stageLabel,
            title: gate.title,
            description: gate.description,
            timeLabel: gate.timeLabel,
            timed: gate.timed,
            assistChrome: gate.assistChrome ?? null,
          }}
          liveRef={liveRef}
          editorHandleRef={editorHandleRef}
          scrollViewportRef={scrollViewportRef}
          onLiveCompositionChange={onLiveCompositionChange}
          onPendingEditsChange={onPendingEditsChange}
          onVisibleCodeRun={onVisibleCodeRun}
          briefId={briefId}
        />
      ) : null}

      {!(stageStarted && gate.isTalk) && !toolLive ? (
        <footer className="theme-interview-gate__footer theme-interview-creator__compose-footer">
          <div className="theme-interview-creator__compose-footer-primary">
            {footerHint ? (
              <p className="type-caption type-muted mb-0 theme-interview-creator__compose-footer-hint">
                {footerHint}
              </p>
            ) : null}
            {!stageStarted ? (
              <div
                ref={startActionsRef}
                className="theme-interview-creator__compose-footer-actions"
              >
                <VurifyMenuButton
                  type="button"
                  variant="label"
                  size="md"
                  housing
                  activeChrome={false}
                  lineTone="accent"
                  icon={Play}
                  iconPosition="left"
                  disabled={!canStart}
                  onClick={handleStartClick}
                >
                  Start
                </VurifyMenuButton>
              </div>
            ) : null}
          </div>
        </footer>
      ) : null}
    </div>
  )
}
