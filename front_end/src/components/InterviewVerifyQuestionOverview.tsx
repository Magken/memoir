/**
 * Auto-collapsed "Overview of the question" for an expanded Work panel.
 *
 * The brief, its rendered markdown and the sample cases are context a reviewer occasionally
 * wants and never wants first — open, they pushed the actual work below the fold.
 */
import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

type InterviewVerifyQuestionOverviewProps = {
  /** Named per surface, e.g. "Overview of the question". */
  label?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function InterviewVerifyQuestionOverview({
  label = 'Overview of the question',
  defaultOpen = false,
  children,
}: InterviewVerifyQuestionOverviewProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="theme-interview-landing__verify-question" aria-label={label}>
      <button
        type="button"
        className="theme-interview-landing__verify-question-toggle"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <ChevronDown
          className="theme-interview-landing__verify-question-chevron size-4 shrink-0"
          aria-hidden
        />
        <span className="type-body-lg">{label}</span>
      </button>
      {open ? (
        <div className="theme-interview-landing__verify-question-body">{children}</div>
      ) : null}
    </section>
  )
}
