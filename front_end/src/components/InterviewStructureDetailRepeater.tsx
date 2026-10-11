import { useEffect, useRef } from 'react'
import { ChevronDown, ClipboardList, Code2, MessageSquare, PenLine } from 'lucide-react'
import { IconButton } from './IconButton'
import { Tag } from './Tag'
import { VurifyIcon } from './VurifyIcon'
import type { InterviewLandingSection } from '../lib/interviewBrief'
import { revealSectionIn, useGsapPageOptional } from '../lib/gsap'

type InterviewStructureDetailRepeaterProps = {
  sections: readonly InterviewLandingSection[]
  /** Optional empty copy when `sections` is empty. */
  emptyLabel?: string
  className?: string
  debug?: boolean
}

function sectionIcon(kindLabel: string) {
  switch (kindLabel) {
    case 'Form':
      return ClipboardList
    case 'Coding':
      return Code2
    case 'Writing':
      return PenLine
    default:
      return MessageSquare
  }
}

/**
 * Full structure list — manager list-row chrome with authored titles, kind,
 * time, and hover-expanded description. For agency / test previews — not the
 * candidate landing (spoilers). Prefer
 * {@link InterviewStructureSummaryRepeater} for takers before start.
 */
export function InterviewStructureDetailRepeater({
  sections,
  emptyLabel = 'No sections yet.',
  className = '',
  debug = false,
}: InterviewStructureDetailRepeaterProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const gsapPage = useGsapPageOptional()
  const sectionKey = sections.map((s) => s.id).join('|')

  useEffect(() => {
    revealSectionIn(listRef.current, {
      reducedMotion: gsapPage?.reducedMotion,
      stagger: 0.045,
      fromY: 14,
      duration: 0.4,
    })
  }, [sectionKey, gsapPage?.reducedMotion])

  if (debug) {
    console.debug('[InterviewStructureDetailRepeater]', { count: sections.length })
  }

  if (sections.length === 0) {
    return <p className="type-caption type-muted mb-0">{emptyLabel}</p>
  }

  return (
    <ul
      ref={listRef}
      className={[
        'theme-interview-creator__list',
        'theme-interview-landing__structure-list',
        'theme-interview-landing__structure-list--detail',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {sections.map((section) => (
        <DetailRow key={section.id} section={section} />
      ))}
    </ul>
  )
}

function DetailRow({ section }: { section: InterviewLandingSection }) {
  const Icon = sectionIcon(section.kindLabel)
  const hasBody = Boolean(section.description)

  return (
    <li
      className="theme-interview-creator__list-item theme-interview-landing__structure-item"
      data-dash-anim
    >
      <article className="theme-interview-creator__list-row">
        <span className="theme-interview-creator__list-mark" aria-hidden>
          <VurifyIcon icon={Icon} variant="plain" tone="muted" size="sm" />
        </span>
        <div className="theme-interview-creator__list-main">
          <div className="theme-interview-creator__list-rest">
            <div className="theme-interview-creator__list-heading">
              <h3 className="mb-0 theme-interview-creator__list-title" title={section.title}>
                {section.title}
              </h3>
              <div className="theme-interview-creator__list-heading-trail">
                <p
                  className={[
                    'type-caption mb-0 theme-interview-creator__list-dates',
                    'theme-interview-landing__structure-time',
                    section.timed ? 'is-timed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {section.timeLabel}
                </p>
                {hasBody ? (
                  <IconButton
                    icon={ChevronDown}
                    size="xs"
                    variant="ghost"
                    aria-label="More details on hover"
                    className="theme-interview-creator__list-expand"
                  />
                ) : null}
              </div>
            </div>
            <div className="theme-interview-creator__list-sub">
              <div className="theme-interview-landing__structure-kind theme-tag-group theme-interview-flow-timeline__tags">
                <Tag
                  size="sm"
                  className="theme-interview-flow-timeline__tag theme-interview-landing__structure-kind-tag"
                >
                  <span>{section.kindLabel}</span>
                </Tag>
              </div>
            </div>
          </div>
          {hasBody ? (
            <div className="theme-interview-creator__list-more">
              <div className="theme-interview-creator__list-more-inner">
                {section.description ? (
                  <p className="type-body-sm mb-0 theme-interview-landing__structure-desc">
                    {section.description}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </li>
  )
}
