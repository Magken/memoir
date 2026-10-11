import { useEffect, useRef } from 'react'
import { labelTemplate } from '../lib/interviewBrief/analysisLabels'
import type { AttemptPackagePendingGrain } from '../lib/interviewRunApi/attemptPackage'
import type { SittingMarkingProgress } from '../lib/interviewRunApi/scoreAttempt'

type InterviewMarkingProgressProps = {
  progress: SittingMarkingProgress
  /** Outstanding grains, newest first — the head names the stage in flight. */
  pending?: readonly AttemptPackagePendingGrain[]
  /** Compact form for the donut caption; the default suits a panel. */
  size?: 'sm' | 'md'
  className?: string
}

function inFlightLabel(pending: readonly AttemptPackagePendingGrain[]): string {
  const head = pending[0]
  if (!head) return ''
  return labelTemplate(head.templateId)
}

/**
 * Marked-vs-total bar. Named so a stuck run tells you which stage it is stuck on, which a
 * bare "Marking" caption never did.
 */
export function InterviewMarkingProgress({
  progress,
  pending = [],
  size = 'md',
  className = '',
}: InterviewMarkingProgressProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const stage = inFlightLabel(pending)
  const done = progress.percent >= 100

  useEffect(() => {
    trackRef.current?.style.setProperty(
      '--theme-marking-progress-fill',
      `${Math.min(100, Math.max(0, progress.percent))}%`,
    )
  }, [progress.percent])

  return (
    <div
      className={['theme-interview-marking-progress', className].filter(Boolean).join(' ')}
      data-size={size}
      role="status"
      aria-live="polite"
    >
      <div className="theme-interview-marking-progress__head">
        <span className="theme-interview-marking-progress__label">
          {done ? 'Marked' : 'Marking'}
        </span>
        <span className="theme-interview-marking-progress__count">
          {progress.settled} of {progress.total} · {progress.percent}%
        </span>
      </div>
      <div
        ref={trackRef}
        className="theme-interview-marking-progress__track"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Marking progress"
      >
        <span className="theme-interview-marking-progress__fill" />
      </div>
      {stage && !done ? (
        <p className="theme-interview-marking-progress__stage type-caption type-muted mb-0">
          Waiting on {stage}
        </p>
      ) : null}
      {progress.skipped > 0 ? (
        <p className="theme-interview-marking-progress__stage type-caption type-muted mb-0">
          {progress.skipped} {progress.skipped === 1 ? 'stage' : 'stages'} did not return and were
          left unmarked.
        </p>
      ) : null}
    </div>
  )
}
