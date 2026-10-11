import { FolderPlus } from 'lucide-react'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'
import { KIND_EDGE_OPTIONS } from './questionEdgeMenu'
import type { TestFormQuestionKind } from '../../lib/testForm'

type FormAddBarProps = {
  onAddQuestion?: (kind: TestFormQuestionKind) => void
  onAddSection?: () => void
  className?: string
  /** When false, hide the section chip (section headers). */
  showSection?: boolean
  /** When false, hide question-kind chips (document foot). */
  showQuestions?: boolean
}

/** Footer / header tray chips — append section / question kinds. */
export function FormAddBar({
  onAddQuestion,
  onAddSection,
  className = '',
  showSection = true,
  showQuestions = true,
}: FormAddBarProps) {
  return (
    <div
      className={['theme-test-form__footer-tools', className].filter(Boolean).join(' ')}
      role="group"
      aria-label="Add to form"
    >
      {showSection && onAddSection ? (
        <Tooltip content="Add section" placement="top">
          <IconButton
            icon={FolderPlus}
            size="xs"
            variant="tray"
            aria-label="Add section"
            className="theme-test-form__edge-btn"
            onClick={onAddSection}
          />
        </Tooltip>
      ) : null}
      {showQuestions && onAddQuestion
        ? KIND_EDGE_OPTIONS.map((row) => (
            <Tooltip key={row.kind} content={row.label} placement="top">
              <IconButton
                icon={row.icon}
                size="xs"
                variant="tray"
                aria-label={row.label}
                className="theme-test-form__edge-btn"
                onClick={() => onAddQuestion(row.kind)}
              />
            </Tooltip>
          ))
        : null}
    </div>
  )
}
