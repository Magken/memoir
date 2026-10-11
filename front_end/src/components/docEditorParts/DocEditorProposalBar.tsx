/**
 * Slim Keep/Discard chrome for a Copilot essay proposal already loaded into Lexical.
 */
import { Check, X } from 'lucide-react'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'

type DocEditorProposalBarProps = {
  onAccept: () => void
  onReject: () => void
}

export function DocEditorProposalBar({ onAccept, onReject }: DocEditorProposalBarProps) {
  return (
    <div className="theme-doc-editor__proposal-bar">
      <p className="theme-doc-editor__proposal-label type-caption type-muted">Proposed change</p>
      <span className="theme-doc-editor__proposal-actions">
        <Tooltip content="Keep change" placement="bottom">
          <IconButton
            icon={Check}
            aria-label="Keep change"
            size="xs"
            variant="tray"
            onClick={onAccept}
          />
        </Tooltip>
        <Tooltip content="Discard change" placement="bottom">
          <IconButton
            icon={X}
            aria-label="Discard change"
            size="xs"
            variant="tray"
            onClick={onReject}
          />
        </Tooltip>
      </span>
    </div>
  )
}
