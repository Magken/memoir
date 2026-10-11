import type { LucideIcon } from 'lucide-react'
import { GraduationCap } from 'lucide-react'
import { useRef } from 'react'
import { useGlowTimelineScroll } from '../hooks/useGlowTimelineScroll'
import type {
  GlowTimelineDegree,
  GlowTimelineOrientation,
  GlowTimelineScrollRange,
  GlowTimelineShell,
} from '../lib/timeline/glowTimelineTypes'
import { ArrangementRule } from './cardDisplayLayout'
import { Card } from './Card'

type GlowTimelineProps = {
  shell: GlowTimelineShell
  degrees: readonly GlowTimelineDegree[]
  scroll: GlowTimelineScrollRange
  headerIcon?: LucideIcon
  headerLabel?: string
  orientation?: GlowTimelineOrientation
  className?: string
}

export function GlowTimeline({
  shell,
  degrees,
  scroll,
  headerIcon: HeaderIcon = GraduationCap,
  headerLabel = 'Education',
  orientation = 'vertical',
  className = '',
}: GlowTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLOListElement>(null)

  useGlowTimelineScroll({
    scopeRef: rootRef,
    triggerRef,
    timelineRef,
    scroll,
    orientation,
  })

  const timelineList = (
    <div className="theme-glow-timeline__shell">
      <span className="theme-glow-timeline__axis" aria-hidden />
      <span className="theme-glow-timeline__axis-glow" aria-hidden />
      <span className="theme-glow-timeline__marker" aria-hidden />
      <ol
        ref={timelineRef}
        className="theme-glow-timeline__list theme-glow-timeline__list--glow mb-0"
      >
        {degrees.map((degree, index) => (
          <li key={degree.id} className="theme-glow-timeline__item">
            <span className="theme-glow-timeline__dot" aria-hidden />
            <div className="theme-glow-timeline__copy min-w-0">
              <div className="theme-glow-timeline__head">
                <h3 className="type-h5 mb-0">{degree.title}</h3>
                <span className="type-caption type-tabular type-muted">{degree.date}</span>
              </div>
              {degree.gpa ? <p className="type-body-sm type-accent mb-1">{degree.gpa}</p> : null}
              <p className="type-body-sm mb-1">{degree.school}</p>
              {degree.meta ? <p className="type-caption type-muted mb-2">{degree.meta}</p> : null}
              {degree.coursework?.length ? (
                <div className="theme-glow-timeline__coursework">
                  <p className="type-overline type-faint mb-2">Coursework</p>
                  <p className="type-caption type-muted mb-0">{degree.coursework.join(' · ')}</p>
                </div>
              ) : null}
              {index < degrees.length - 1 ? (
                <div className="theme-glow-timeline__rule">
                  <ArrangementRule accent />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )

  return (
    <div
      ref={rootRef}
      className={[
        'theme-glow-timeline',
        orientation === 'horizontal' ? 'theme-glow-timeline--horizontal' : 'theme-glow-timeline--vertical',
        shell === 'carded' ? 'theme-glow-timeline--carded' : 'theme-glow-timeline--cardless',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {shell === 'carded' ? (
        <div ref={triggerRef}>
          <Card variant="raised" className="theme-glow-timeline__card">
            <div className="theme-glow-timeline__card-head">
              <HeaderIcon className="size-6 type-accent shrink-0" aria-hidden />
              <p className="type-overline type-faint mb-0">{headerLabel}</p>
            </div>
            {timelineList}
          </Card>
        </div>
      ) : (
        <div ref={triggerRef}>{timelineList}</div>
      )}
    </div>
  )
}
