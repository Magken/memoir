import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react'
import { IconButton } from './IconButton'
import { Tooltip } from './Tooltip'

type InterviewFlowSpineRailActionsProps = {
  onRemove?: () => void
  onMove?: (direction: 'up' | 'down') => void
  onDuplicate?: () => void
  /** Noun for aria labels — e.g. form · talk · coding · writing */
  sectionLabel?: string
  className?: string
}

/** Collapsed-section rail: move / duplicate / remove (Talk dialect). */
export function InterviewFlowSpineRailActions({
  onRemove,
  onMove,
  onDuplicate,
  sectionLabel = 'section',
  className = '',
}: InterviewFlowSpineRailActionsProps) {
  if (!onMove && !onDuplicate && !onRemove) return null

  return (
    <>
      <div className="theme-interview-flow-section__rail-rule" role="presentation" />
      <div
        className={[
          'theme-interview-flow-talk__rail-meta',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {onMove ? (
          <>
            <Tooltip content="Move up" placement="left">
              <IconButton
                icon={ArrowUp}
                size="sm"
                variant="ghost"
                aria-label={`Move ${sectionLabel} up`}
                onClick={() => onMove('up')}
              />
            </Tooltip>
            <Tooltip content="Move down" placement="left">
              <IconButton
                icon={ArrowDown}
                size="sm"
                variant="ghost"
                aria-label={`Move ${sectionLabel} down`}
                onClick={() => onMove('down')}
              />
            </Tooltip>
          </>
        ) : null}
        {onDuplicate ? (
          <Tooltip content="Duplicate" placement="left">
            <IconButton
              icon={Copy}
              size="sm"
              variant="ghost"
              aria-label={`Duplicate ${sectionLabel}`}
              onClick={onDuplicate}
            />
          </Tooltip>
        ) : null}
        {onRemove ? (
          <Tooltip content={`Remove ${sectionLabel}`} placement="left">
            <IconButton
              icon={Trash2}
              size="sm"
              variant="ghost"
              aria-label={`Remove ${sectionLabel}`}
              onClick={onRemove}
            />
          </Tooltip>
        ) : null}
      </div>
    </>
  )
}
