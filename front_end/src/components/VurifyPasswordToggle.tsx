import { Eye, EyeOff } from 'lucide-react'

type VurifyPasswordToggleProps = {
  revealed: boolean
  onToggle: () => void
  className?: string
  /** When false, trailing control is inert (e.g. confirm password before password is set). */
  disabled?: boolean
}

/**
 * Project password reveal control for `VurifyInput` trailing — Eye ↔ EyeOff (plain / borderless).
 */
export function VurifyPasswordToggle({
  revealed,
  onToggle,
  className = '',
  disabled = false,
}: VurifyPasswordToggleProps) {
  return (
    <button
      type="button"
      className={['theme-vurify-input__trailing-btn', 'theme-vurify-input__password-toggle', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={revealed ? 'Hide password' : 'Show password'}
      aria-pressed={revealed}
      disabled={disabled}
      onClick={onToggle}
    >
      <span
        className="theme-vurify-icon theme-vurify-icon--plain theme-vurify-icon--muted theme-vurify-icon--sm"
        aria-hidden
      >
        <span
          className="theme-vurify-input__visibility"
          data-revealed={revealed ? 'true' : 'false'}
        >
          <Eye
            className="theme-vurify-input__visibility-icon theme-vurify-input__visibility-icon--show"
            strokeWidth={1.75}
            aria-hidden
          />
          <EyeOff
            className="theme-vurify-input__visibility-icon theme-vurify-input__visibility-icon--hide"
            strokeWidth={1.75}
            aria-hidden
          />
        </span>
      </span>
    </button>
  )
}
