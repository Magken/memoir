/**
 * Kind-agnostic Editor History Capture timeline — skip-idle history play, bucket rail, tags.
 * Feeds reconstructed checkpoints into Verify and the sitting referenced-section playground.
 * Not mounted on the live candidate gate editor.
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Chip } from './Chip'
import { IconButton } from './IconButton'
import {
  buildTimelineIndex,
  llmTagsFromMarkingCards,
  mergeLlmTags,
  nextHistoryPlayStep,
  replayTape,
  tapeDurationMs,
  type Checkpoint,
  type EditorTape,
  type TimelineLlmTag,
} from '../lib/interviewRunApi/editorCapture'
import type { InterviewResponseMessage } from '../lib/interviewRunApi/talkTypes'
import { formatHardTimerMmSs } from '../lib/interviewRunApi/hardTimerMath'
import { bucketCaption, type RecruiterBucketNote, type RecruiterPasteBurst } from '../lib/interviewRunApi/recruiterProcess'
import { pasteBurstAccount } from '../lib/interviewRunApi/resultHomes'

export type InterviewEditorTapePlayerHandle = {
  seek: (t: number) => void
}

type InterviewEditorTapePlayerProps = {
  tape: EditorTape
  onFrame: (checkpoint: Checkpoint, t: number) => void
  messages?: readonly InterviewResponseMessage[]
  extraTags?: TimelineLlmTag[]
  tapeTags?: TimelineLlmTag[]
  bucketNotes?: RecruiterBucketNote[]
  pasteBursts?: RecruiterPasteBurst[]
  className?: string
  debug?: boolean
}

const HISTORY_PAUSE_MS = 380

function bucketSpan(startMs: number, endMs: number, duration: number): number {
  const share = (endMs - startMs) / Math.max(1, duration)
  return Math.max(1, Math.min(12, Math.round(share * 12)))
}

export const InterviewEditorTapePlayer = forwardRef<
  InterviewEditorTapePlayerHandle,
  InterviewEditorTapePlayerProps
>(function InterviewEditorTapePlayer(
  {
    tape,
    onFrame,
    messages,
    extraTags,
    tapeTags,
    bucketNotes,
    pasteBursts,
    className = '',
    debug = false,
  },
  ref,
) {
  const duration = Math.max(1, tapeDurationMs(tape))
  const [t, setT] = useState(duration)
  const [playing, setPlaying] = useState(false)
  const playingRef = useRef(false)
  const tRef = useRef(duration)
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame
  playingRef.current = playing
  tRef.current = t

  const index = useMemo(() => {
    const built = buildTimelineIndex({
      tape,
      messages,
      phaseId: tape.phaseId,
    })
    return mergeLlmTags(built, [...(extraTags ?? []), ...(tapeTags ?? [])])
  }, [tape, messages, extraTags, tapeTags])

  const applySeek = (ms: number, stopPlay: boolean) => {
    const next = Math.max(0, Math.min(duration, ms))
    if (stopPlay) setPlaying(false)
    tRef.current = next
    setT(next)
    onFrameRef.current(replayTape(tape, next), next)
  }

  useImperativeHandle(
    ref,
    () => ({
      seek: (ms: number) => applySeek(ms, true),
    }),
    [tape, duration],
  )

  useEffect(() => {
    setT(duration)
    tRef.current = duration
    setPlaying(false)
    onFrameRef.current(tape.final, duration)
  }, [tape, duration])

  useEffect(() => {
    if (!playing) return
    let timer = 0
    const step = () => {
      if (!playingRef.current) return
      const next = nextHistoryPlayStep(index, tRef.current)
      if (next == null) {
        applySeek(duration, true)
        return
      }
      applySeek(next, false)
      timer = window.setTimeout(step, HISTORY_PAUSE_MS)
    }
    timer = window.setTimeout(step, HISTORY_PAUSE_MS)
    return () => window.clearTimeout(timer)
  }, [playing, tape, duration, index])

  const seek = (ms: number) => applySeek(ms, true)

  const currentBucket = useMemo(
    () => index.buckets.find((b) => t >= b.startMs && t <= b.endMs) ?? null,
    [index.buckets, t],
  )
  const bucketTags = useMemo(() => {
    if (!currentBucket) return index.tags
    return index.tags.filter((tag) => tag.t >= currentBucket.startMs && tag.t <= currentBucket.endMs)
  }, [index.tags, currentBucket])
  const currentCaption = currentBucket
    ? bucketCaption(currentBucket, bucketNotes?.find((n) => n.id === currentBucket.id))
    : ''
  const pasteAccounts = useMemo(() => {
    const inBucket = (burst: RecruiterPasteBurst) =>
      currentBucket
        ? burst.t >= currentBucket.startMs && burst.t <= currentBucket.endMs
        : true
    return (pasteBursts ?? [])
      .filter(inBucket)
      .map((burst) => pasteBurstAccount(burst))
      .filter(Boolean)
  }, [currentBucket, pasteBursts])

  if (debug) {
    console.debug('[InterviewEditorTapePlayer]', {
      kind: tape.kind,
      events: tape.events.length,
      buckets: index.buckets.length,
      tags: index.tags.length,
      t,
      duration,
    })
  }

  return (
    <div
      className={['theme-interview-landing__tape-player', className].filter(Boolean).join(' ')}
      data-dash-anim
    >
      <div className="theme-interview-landing__tape-player-row">
        <IconButton
          size="sm"
          variant="ghost"
          icon={playing ? Pause : Play}
          aria-label={playing ? 'Pause editor history' : 'Play editor history'}
          onClick={() => {
            if (!playing && t >= duration) seek(0)
            setPlaying((prev) => !prev)
          }}
        />
        <input
          type="range"
          className="theme-interview-landing__tape-player-track"
          min={0}
          max={duration}
          step={50}
          value={Math.round(t)}
          aria-label="Editor session time"
          onChange={(e) => seek(Number(e.target.value))}
        />
        <p className="type-caption type-muted mb-0 theme-interview-landing__tape-player-clock">
          {formatHardTimerMmSs(t)} / {formatHardTimerMmSs(duration)}
        </p>
      </div>
      {index.buckets.length > 0 ? (
        <div className="theme-interview-landing__tape-player-rail" role="list">
          {index.buckets.map((bucket) => {
            const current = t >= bucket.startMs && t <= bucket.endMs
            const note = bucketNotes?.find((n) => n.id === bucket.id)
            const caption = bucketCaption(bucket, note)
            return (
              <button
                key={bucket.id}
                type="button"
                role="listitem"
                title={caption}
                data-span={bucketSpan(bucket.startMs, bucket.endMs, duration)}
                className={[
                  'theme-interview-landing__tape-player-bucket',
                  bucket.kind === 'idle' ? 'is-idle' : 'is-active',
                  current ? 'is-current' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={caption}
                onClick={() => seek(bucket.startMs)}
              />
            )
          })}
        </div>
      ) : null}
      {currentCaption ? (
        <p className="type-caption type-muted mb-0 theme-interview-landing__tape-player-caption">
          {currentCaption}
        </p>
      ) : null}
      {bucketTags.length > 0 ? (
        <div className="theme-interview-landing__tape-player-ticks" role="list">
          {bucketTags.map((tag, i) => (
            <Chip
              key={`${tag.kind}-${tag.t}-${tag.label}-${i}`}
              size="xs"
              selected={Math.abs(t - tag.t) < 400}
              onClick={() => seek(tag.t)}
            >
              {tag.label}
            </Chip>
          ))}
        </div>
      ) : null}
      {pasteAccounts.length > 0 ? (
        <div className="theme-interview-landing__tape-player-paste" data-home="paste-account">
          {pasteAccounts.map((line, i) => (
            <p key={`${line}-${i}`} className="type-body-sm mb-0">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
})

InterviewEditorTapePlayer.displayName = 'InterviewEditorTapePlayer'

export function extraTapeTagsFromCards(
  cards: Parameters<typeof llmTagsFromMarkingCards>[0],
): TimelineLlmTag[] {
  return llmTagsFromMarkingCards(cards)
}

export function extraPasteBurstsFromCards(
  cards: ReadonlyArray<{ pasteBursts?: RecruiterPasteBurst[] }>,
): RecruiterPasteBurst[] {
  const out: RecruiterPasteBurst[] = []
  const seen = new Set<string>()
  for (const card of cards) {
    for (const burst of card.pasteBursts ?? []) {
      const key = `${burst.t}:${burst.file ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(burst)
    }
  }
  return out
}

export function extraBucketNotesFromCards(
  cards: ReadonlyArray<{ bucketNotes?: RecruiterBucketNote[] }>,
): RecruiterBucketNote[] {
  const out: RecruiterBucketNote[] = []
  const seen = new Set<string>()
  for (const card of cards) {
    for (const note of card.bucketNotes ?? []) {
      if (!note.id || seen.has(note.id)) continue
      seen.add(note.id)
      out.push(note)
    }
  }
  return out
}
