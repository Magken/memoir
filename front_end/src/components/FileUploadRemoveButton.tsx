import { X } from 'lucide-react'
import type { MouseEvent } from 'react'
import { VurifyIcon } from './VurifyIcon'

type FileUploadRemoveButtonProps = {
  label: string
  disabled?: boolean
  compact?: boolean
  micro?: boolean
  nano?: boolean
  className?: string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}

/**
 * Remove control for file upload rows — bordered Vurify icon (text tone → accent on hover).
 */
export function FileUploadRemoveButton({
  label,
  disabled = false,
  compact = false,
  micro = false,
  nano = false,
  className = '',
  onClick,
}: FileUploadRemoveButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={[
        'theme-field__file-remove',
        compact ? 'theme-field__file-remove--compact' : '',
        micro ? 'theme-field__file-remove--micro' : '',
        nano ? 'theme-field__file-remove--nano' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      <VurifyIcon icon={X} variant="bordered" tone="text" size="sm" aria-hidden />
    </button>
  )
}
