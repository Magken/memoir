import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'
import { SECTION_ADD_KIND_BUTTONS, type SectionAddPick } from './sectionAddMenu'

type SectionAddBarProps = {
  onAdd: (pick: SectionAddPick) => void
  className?: string
}

/** Footer add chrome — tray kind chips that append sections (reorder via TOC). */
export function SectionAddBar({ onAdd, className = '' }: SectionAddBarProps) {
  return (
    <div
      className={['theme-vurify-viewer__footer-tools', className].filter(Boolean).join(' ')}
      role="group"
      aria-label="Add section"
    >
      {SECTION_ADD_KIND_BUTTONS.map((row) => (
        <Tooltip key={row.kind} content={row.tooltip} placement="top">
          <IconButton
            icon={row.icon}
            size="xs"
            variant="tray"
            aria-label={row.tooltip}
            className="theme-vurify-viewer__edge-btn"
            onClick={() =>
              onAdd({
                placement: 'after',
                kind: row.kind,
              })
            }
          />
        </Tooltip>
      ))}
    </div>
  )
}
