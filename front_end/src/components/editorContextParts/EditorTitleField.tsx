import { EditableTitle, type EditableTitleVariant } from '../EditableTitle'

type EditorTitleFieldProps = {
  value: string
  onChange: (value: string) => void
  /** Title chrome — default `borderless` (workbench titlebars). */
  variant?: EditableTitleVariant
  placeholder?: string
  'aria-label'?: string
  disabled?: boolean
}

/**
 * Workbench titlebar rename field — thin wrapper over [EditableTitle]
 * with shared max-width via `theme-editor-titlebar__title-field`.
 */
export function EditorTitleField({
  value,
  onChange,
  variant = 'borderless',
  placeholder = 'Untitled',
  'aria-label': ariaLabel = 'Title',
  disabled = false,
}: EditorTitleFieldProps) {
  return (
    <EditableTitle
      value={value}
      onChange={onChange}
      variant={variant}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={disabled}
      className="theme-editor-titlebar__title-field"
    />
  )
}
