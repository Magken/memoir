/**
 * Creator board page-tab composer — mic + live transcription wave + Send/Stop.
 * Shared by InterviewCreatorChat (Vurex) and InterviewTalkPageChat (persona name).
 * Talk surface never mounts Stop (hard variant — not a toggle).
 */
import { Ban, Mic, SendHorizontal } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { LiveTranscribeWave, type LiveTranscribeWaveHandle } from './LiveTranscribeWave'
import { VurifyMenuButton } from './VurifyMenuButton'
import { useAnimatedFoldMount } from '../hooks/useAnimatedFoldMount'
import { shouldSendOnEnter } from '../lib/chat/composer'
import type { ComposerSendPayload } from '../lib/chat/types'
import { toUserMessage } from '../lib/dataApi'
import {
  startLiveTranscription,
  type LiveTranscribeHandle,
} from '../lib/liveTranscribeApi'
import { recordDictationSession } from '../lib/interviewRunApi/sessionTelemetry'
import { recordTypedInsert } from '../lib/interviewRunApi/sessionTelemetry'

export type InterviewBoardComposerProps = {
  draft: string
  onDraftChange: (value: string) => void
  onSend: (payload: ComposerSendPayload) => void | Promise<void>
  onStop?: () => void
  /** Idle hint — e.g. `Ask Vurex…` or `Chat with Morgan…`. */
  placeholder?: string
  /** Locked-field hint (questionnaire / Talk ready for Next). */
  lockedHint?: string
  busy?: boolean
  /** Lock typing/send so another surface owns the turn. */
  locked?: boolean
  /**
   * `creator` — Send↔Stop while generating.
   * `talk` — Stop is never mounted (candidate Talk; not re-enableable via a boolean).
   */
  variant?: 'creator' | 'talk'
  /** Gate telemetry surface for dictation clocks. Never stores audio. */
  telemetrySurface?: 'talk' | 'assist'
  /** Tags inside the field, above the textarea (Assist file chips). */
  leading?: ReactNode
}

const COMPOSER_MIN_PX = 40
const COMPOSER_MAX_PX = 112
/** Mic wave ↔ Send chrome swap (enter + exit). */
const COMPOSER_CHROME_SWAP_MS = 240
/** Auto-stop live dictation after this much silence (token burn guard). */
const DICTATION_SILENCE_MS = 120_000
/** Mic energy floor that counts as “speaking” for the silence timer. */
const DICTATION_SPEECH_ENERGY = 0.08

function joinComposerText(left: string, right: string): string {
  const a = left.trimEnd()
  const b = right.trim()
  if (!a) return b
  if (!b) return a
  return `${a}${/\s$/.test(left) ? '' : ' '}${b}`
}

function prefersComposerReduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function InterviewBoardComposer({
  draft,
  onDraftChange,
  onSend,
  onStop,
  placeholder = 'Ask Vurex…',
  lockedHint = 'Answer the questions above…',
  busy = false,
  locked = false,
  variant = 'creator',
  telemetrySurface,
  leading,
}: InterviewBoardComposerProps) {
  const isTalk = variant === 'talk'
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [focused, setFocused] = useState(false)
  const [listening, setListening] = useState(false)
  /** True only after WebRTC reports `listening` — wave loading until then. */
  const [dictationReady, setDictationReady] = useState(false)
  const [dictationError, setDictationError] = useState<string | null>(null)
  const heightPrimed = useRef(false)
  const liveHandleRef = useRef<LiveTranscribeHandle | null>(null)
  const waveHandleRef = useRef<LiveTranscribeWaveHandle | null>(null)
  const dictationSessionRef = useRef(0)
  /** Sync gate — React `listening` can lag a click and start a second WebRTC session. */
  const dictationActiveRef = useRef(false)
  const dictationReadyRef = useRef(false)
  const dictationBaseRef = useRef('')
  const dictationCommittedRef = useRef('')
  const silenceTimerRef = useRef<number | null>(null)
  const draftRef = useRef(draft)
  const telemetrySurfaceRef = useRef(telemetrySurface)
  const waveChrome = useAnimatedFoldMount(listening && !busy, COMPOSER_CHROME_SWAP_MS)
  // Talk: Send stays (disabled while busy). Creator: Send↔Stop while generating.
  const sendChrome = useAnimatedFoldMount(
    isTalk ? !listening : !busy && !listening,
    COMPOSER_CHROME_SWAP_MS,
  )
  const stopChrome = useAnimatedFoldMount(!isTalk && busy, COMPOSER_CHROME_SWAP_MS)

  draftRef.current = draft
  telemetrySurfaceRef.current = telemetrySurface

  const idleWave = useCallback(() => {
    waveHandleRef.current?.reset()
  }, [])

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current == null) return
    window.clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = null
  }, [])

  const scrollComposerToEnd = useCallback(() => {
    const el = textRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [])

  const resize = useCallback(() => {
    const el = textRef.current
    if (!el) return
    const from = el.getBoundingClientRect().height
    el.style.height = 'auto'
    const next = Math.min(Math.max(el.scrollHeight, COMPOSER_MIN_PX), COMPOSER_MAX_PX)
    if (!heightPrimed.current || prefersComposerReduceMotion()) {
      heightPrimed.current = true
      el.style.transition = 'none'
      el.style.height = `${next}px`
      return
    }
    el.style.height = `${from}px`
    void el.offsetHeight
    el.style.transition = 'height 0.22s ease'
    el.style.height = `${next}px`
  }, [])

  const stopDictation = useCallback(() => {
    if (dictationActiveRef.current && telemetrySurfaceRef.current) {
      recordDictationSession('dictation_stop', {
        surface: telemetrySurfaceRef.current,
        charCount: dictationCommittedRef.current.length,
      })
    }
    dictationSessionRef.current += 1
    dictationActiveRef.current = false
    dictationReadyRef.current = false
    clearSilenceTimer()
    liveHandleRef.current?.stop()
    liveHandleRef.current = null
    setListening(false)
    setDictationReady(false)
    idleWave()
  }, [clearSilenceTimer, idleWave])

  useEffect(() => {
    resize()
    if (!listening) return
    const id = window.requestAnimationFrame(() => {
      scrollComposerToEnd()
      window.requestAnimationFrame(scrollComposerToEnd)
    })
    return () => window.cancelAnimationFrame(id)
  }, [draft, listening, resize, scrollComposerToEnd])

  useEffect(() => {
    if (!locked) return
    textRef.current?.blur()
    setFocused(false)
  }, [locked])

  useEffect(() => {
    if (!busy && !locked) return
    stopDictation()
  }, [busy, locked, stopDictation])

  useEffect(() => {
    return () => {
      stopDictation()
    }
  }, [stopDictation])

  const applyDictationDraft = useCallback(
    (partial: string) => {
      const base = dictationBaseRef.current
      const committed = dictationCommittedRef.current
      const spoken = [committed, partial].filter((s) => s.trim()).join(' ')
      onDraftChange(joinComposerText(base, spoken))
    },
    [onDraftChange],
  )

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer()
    silenceTimerRef.current = window.setTimeout(() => {
      silenceTimerRef.current = null
      if (!dictationActiveRef.current || !dictationReadyRef.current) return
      stopDictation()
      setDictationError('Dictation stopped after two minutes of silence')
    }, DICTATION_SILENCE_MS)
  }, [clearSilenceTimer, stopDictation])

  const toggleDictation = useCallback(async () => {
    if (busy || locked) return
    // Use the sync ref — not React `listening` — so a second click while connecting
    // stops instead of opening another OpenAI/mic session.
    if (dictationActiveRef.current) {
      stopDictation()
      return
    }

    setDictationError(null)
    dictationBaseRef.current = draftRef.current
    dictationCommittedRef.current = ''
    const session = dictationSessionRef.current + 1
    dictationSessionRef.current = session
    dictationActiveRef.current = true
    dictationReadyRef.current = false
    setListening(true)
    setDictationReady(false)
    idleWave()
    if (telemetrySurfaceRef.current) {
      recordDictationSession('dictation_start', { surface: telemetrySurfaceRef.current })
    }

    try {
      const handle = await startLiveTranscription({
        delay: 'low',
        onPartial: (text) => {
          if (dictationSessionRef.current !== session) return
          if (text.trim()) armSilenceTimer()
          applyDictationDraft(text)
        },
        onFinal: (text) => {
          if (dictationSessionRef.current !== session) return
          if (text.trim()) armSilenceTimer()
          dictationCommittedRef.current = joinComposerText(dictationCommittedRef.current, text)
          applyDictationDraft('')
        },
        onEnergy: (energy) => {
          if (dictationSessionRef.current !== session) return
          if (!dictationReadyRef.current) return
          if (energy >= DICTATION_SPEECH_ENERGY) armSilenceTimer()
          waveHandleRef.current?.setEnergy(energy)
        },
        onStatus: (status) => {
          if (dictationSessionRef.current !== session) return
          if (status === 'listening') {
            dictationReadyRef.current = true
            setDictationReady(true)
            idleWave()
            armSilenceTimer()
            return
          }
          if (status === 'stopped') {
            stopDictation()
          }
        },
        onError: (err) => {
          if (dictationSessionRef.current !== session) return
          setDictationError(toUserMessage(err, 'Live transcription failed'))
          stopDictation()
        },
      })
      if (dictationSessionRef.current !== session) {
        handle.stop()
        return
      }
      liveHandleRef.current = handle
    } catch (err) {
      if (dictationSessionRef.current !== session) return
      setDictationError(toUserMessage(err, 'Live transcription failed'))
      stopDictation()
    }
  }, [applyDictationDraft, armSilenceTimer, busy, locked, stopDictation])

  const canSend = !busy && !locked && draft.trim().length > 0
  const filled = draft.trim().length > 0
  const dictationConnecting = listening && !dictationReady
  const hintActive = !locked && (focused || filled || listening || busy)
  const composerHint = locked
    ? lockedHint
    : busy
      ? 'Thinking…'
      : dictationConnecting
        ? 'Getting ready…'
        : listening
          ? 'Listening…'
          : placeholder

  const submit = async () => {
    if (!canSend) return
    stopDictation()
    await onSend({ text: draft, attachments: [] })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (locked) {
      event.preventDefault()
      return
    }
    if (shouldSendOnEnter(event)) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form
      className="theme-interview-creator-chat__composer"
      data-busy={busy ? 'true' : 'false'}
      data-locked={locked ? 'true' : 'false'}
      data-filled={filled ? 'true' : 'false'}
      data-listening={listening ? 'true' : 'false'}
      data-dictation-ready={dictationReady ? 'true' : 'false'}
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        void submit()
      }}
    >
      <div
        className="theme-interview-creator-chat__composer-field"
        data-focused={focused ? 'true' : 'false'}
        data-filled={filled ? 'true' : 'false'}
        data-active={hintActive ? 'true' : 'false'}
        data-locked={locked ? 'true' : 'false'}
      >
        {leading ? (
          <div className="theme-interview-creator-chat__composer-leading">{leading}</div>
        ) : null}
        <div className="theme-interview-creator-chat__composer-input-wrap">
        <span
          className="theme-interview-creator-chat__composer-hint type-body-sm"
          aria-hidden={hintActive}
        >
          {composerHint}
        </span>
        <textarea
          ref={textRef}
          className="theme-interview-creator-chat__composer-input type-body-sm"
          value={draft}
          rows={1}
          aria-label={locked ? 'Composer locked' : placeholder}
          disabled={locked}
          readOnly={locked}
          onChange={(e) => {
            if (locked) return
            if (listening) stopDictation()
            onDraftChange(e.target.value)
          }}
          onBeforeInput={(e) => {
            if (!telemetrySurface || locked) return
            const type = e.nativeEvent.inputType || ''
            if (type === 'insertFromPaste' || type === 'insertFromDrop' || type === 'insertFromYank') {
              return
            }
            if (type === 'insertText' || type === 'insertCompositionText') {
              recordTypedInsert('', telemetrySurface, e.nativeEvent.data ?? '')
              return
            }
            if (type === 'insertLineBreak' || type === 'insertParagraph') {
              recordTypedInsert('', telemetrySurface, ' ')
            }
          }}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (locked) {
              textRef.current?.blur()
              return
            }
            setFocused(true)
          }}
          onBlur={() => setFocused(false)}
        />
        </div>
      </div>
      <div className="theme-interview-creator-chat__composer-actions">
        <div className="theme-interview-creator-chat__composer-dictation">
          <VurifyMenuButton
            type="button"
            variant="icon-only"
            size="sm"
            icon={Mic}
            lineTone="accent"
            disabled={busy || locked}
            aria-label={
              dictationConnecting
                ? 'Connecting microphone…'
                : listening
                  ? 'Stop dictation'
                  : 'Dictate with live transcription'
            }
            aria-pressed={listening}
            className={[
              'theme-interview-creator-chat__composer-mic',
              listening ? 'is-selected' : '',
              dictationConnecting ? 'is-connecting' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              void toggleDictation()
            }}
          >
            Dictate
          </VurifyMenuButton>
          {waveChrome.mounted ? (
            <span
              className="theme-interview-creator-chat__composer-wave"
              data-shown={waveChrome.shown ? 'true' : 'false'}
            data-connecting={dictationConnecting ? 'true' : 'false'}
            data-live={dictationReady ? 'true' : 'false'}
            aria-hidden={dictationConnecting ? undefined : true}
            >
              {dictationConnecting ? (
                <span className="theme-interview-creator-chat__composer-wave-load-host">
                  <span className="theme-interview-creator-chat__composer-wave-load-label">
                    Loading
                  </span>
                  <span
                    className="theme-interview-creator-chat__composer-wave-load"
                    aria-hidden
                  />
                </span>
              ) : (
                <LiveTranscribeWave
                  ref={waveHandleRef}
                  active={dictationReady}
                  shown={waveChrome.shown}
                />
              )}
            </span>
          ) : null}
        </div>
        {stopChrome.mounted ? (
          <div
            className="theme-interview-creator-chat__composer-action-slot"
            data-shown={stopChrome.shown ? 'true' : 'false'}
          >
            <VurifyMenuButton
              type="button"
              variant="label"
              size="sm"
              lineTone="accent"
              icon={Ban}
              iconPosition="right"
              busyChrome
              aria-label="Stop generation"
              className="theme-interview-creator-chat__composer-stop"
              tabIndex={stopChrome.shown ? undefined : -1}
              onClick={() => onStop?.()}
            >
              Stop
            </VurifyMenuButton>
          </div>
        ) : null}
        {sendChrome.mounted ? (
          <div
            className="theme-interview-creator-chat__composer-action-slot"
            data-shown={sendChrome.shown ? 'true' : 'false'}
          >
            <VurifyMenuButton
              type="button"
              variant="label"
              size="sm"
              icon={SendHorizontal}
              iconPosition="right"
              lineTone="accent"
              disabled={!canSend || !sendChrome.shown || busy}
              className="theme-interview-creator-chat__composer-send"
              tabIndex={sendChrome.shown ? undefined : -1}
              onClick={() => {
                void submit()
              }}
            >
              Send
            </VurifyMenuButton>
          </div>
        ) : null}
      </div>
      {dictationError ? (
        <p className="theme-interview-creator-chat__composer-dictation-error type-caption" role="status">
          {dictationError}
        </p>
      ) : null}
    </form>
  )
}
