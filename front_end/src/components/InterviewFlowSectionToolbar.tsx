import { ChevronDown, ChevronUp } from 'lucide-react'
import { VurifyMenuButton } from './VurifyMenuButton'

type InterviewFlowSectionToolbarProps = {
  expanded: boolean
  previewOpen: boolean
  editPanelId: string
  previewPanelId: string
  onToggleEdit: () => void
  onTogglePreview: () => void
  className?: string
}

/**
 * Shared Creator-2 section chrome: **Edit section** and **Preview** / **Hide preview**
 * as paired `VurifyMenuButton`s with a short vertical hairline between them.
 * Omitted on the edit stage — shell Back leaves the expansion.
 */
export function InterviewFlowSectionToolbar({
  expanded,
  previewOpen,
  editPanelId,
  previewPanelId,
  onToggleEdit,
  onTogglePreview,
  className = '',
}: InterviewFlowSectionToolbarProps) {
  if (expanded) return null
  return (
    <div
      className={[
        'theme-interview-flow-section__toolbar-actions',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <VurifyMenuButton
        type="button"
        variant="label"
        size="sm"
        housing
        activeChrome={false}
        lineTone="muted"
        icon={ChevronDown}
        iconPosition="right"
        aria-expanded={false}
        aria-controls={editPanelId}
        onClick={onToggleEdit}
      >
        Edit section
      </VurifyMenuButton>
      <span
        className="theme-interview-flow-section__toolbar-rule"
        role="presentation"
      />
      <VurifyMenuButton
        type="button"
        variant="label"
        size="sm"
        housing
        activeChrome={false}
        lineTone={previewOpen ? 'accent' : 'muted'}
        icon={previewOpen ? ChevronUp : ChevronDown}
        iconPosition="right"
        aria-expanded={previewOpen}
        aria-controls={previewPanelId}
        onClick={onTogglePreview}
      >
        {previewOpen ? 'Hide preview' : 'Preview'}
      </VurifyMenuButton>
    </div>
  )
}
