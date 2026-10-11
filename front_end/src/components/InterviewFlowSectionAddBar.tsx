import {
  ClipboardList,
  Code2,
  FileText,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import { TALK_KIND_LABEL } from '../lib/interviewBrief/interviewLandingView'
import type { SpineSectionKind } from '../lib/interviewBrief/patchCreator2Spine'
import { VurifyMenuButton } from './VurifyMenuButton'

type InterviewFlowSectionAddBarProps = {
  onAdd: (kind: SpineSectionKind) => void
  className?: string
}

export const INTERVIEW_FLOW_SECTION_ADD_KINDS: readonly {
  kind: SpineSectionKind
  label: string
  icon: LucideIcon
}[] = [
  { kind: 'form', label: 'Form', icon: ClipboardList },
  { kind: 'talk', label: TALK_KIND_LABEL, icon: MessageCircle },
  { kind: 'coding', label: 'Coding', icon: Code2 },
  { kind: 'doc', label: 'Writing', icon: FileText },
]

/**
 * Footer add chrome — VurifyMenuButton row with hairline separators
 * (same dialect as Edit section | Preview).
 */
export function InterviewFlowSectionAddBar({
  onAdd,
  className = '',
}: InterviewFlowSectionAddBarProps) {
  return (
    <div
      className={[
        'theme-interview-flow-timeline__add-tools',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label="Add section"
    >
      <span className="theme-interview-flow-timeline__add-label type-label type-muted">
        Add:
      </span>
      {INTERVIEW_FLOW_SECTION_ADD_KINDS.map((row, index) => (
        <div key={row.kind} className="theme-interview-flow-timeline__add-item">
          {index > 0 ? (
            <span
              className="theme-interview-flow-timeline__add-rule"
              role="presentation"
            />
          ) : null}
          <VurifyMenuButton
            type="button"
            variant="label"
            size="md"
            housing
            activeChrome={false}
            lineTone="muted"
            icon={row.icon}
            iconPosition="left"
            aria-label={`Add ${row.label} section`}
            onClick={() => onAdd(row.kind)}
          >
            {row.label}
          </VurifyMenuButton>
        </div>
      ))}
    </div>
  )
}
