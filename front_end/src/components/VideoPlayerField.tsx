import { useCallback, useId, useMemo, useState, type ChangeEvent, type FocusEvent } from 'react'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { parseYoutubeVideoId } from '../lib/docEditor/embeds/youtubeUrl'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Field } from './Field'
import { FieldControlShell } from './FieldControlShell'
import { VideoEmbedBlock } from './VideoEmbedBlock'

type VideoPlayerFieldProps = {
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  variant?: FieldVariant
  size?: FieldSize
  className?: string
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  placeholder?: string
  value?: string
  defaultValue?: string
  onChange?: (url: string) => void
  required?: boolean
  debug?: boolean
}

export function VideoPlayerField({
  label = 'YouTube video',
  hint = 'Paste a watch, embed, or youtu.be URL.',
  error: errorProp,
  success,
  warning,
  variant = 'flat',
  size = 'md',
  className = '',
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  placeholder = 'https://www.youtube.com/watch?v=…',
  value: valueProp,
  defaultValue = '',
  onChange,
  required,
  debug = false,
}: VideoPlayerFieldProps) {
  const autoId = useId()
  const id = autoId.replace(/:/g, '')
  const [internalValue, setInternalValue] = useState(defaultValue)
  const displayValue = valueProp !== undefined ? valueProp : internalValue

  const { error, success: resolvedSuccess, warning: resolvedWarning, onBlur, notifyChange } =
    useFormFieldValidation({
      value: displayValue,
      rules,
      validateOn,
      error: errorProp,
      success,
      warning,
      successMessage,
      showSuccessWhenValid,
      debug,
    })

  const videoId = useMemo(() => parseYoutubeVideoId(displayValue), [displayValue])

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      notifyChange()
      const next = event.target.value
      if (valueProp === undefined) setInternalValue(next)
      onChange?.(next)
    },
    [notifyChange, onChange, valueProp],
  )

  const handleBlur = useCallback(
    (_event: FocusEvent<HTMLInputElement>) => {
      onBlur()
    },
    [onBlur],
  )

  if (debug) {
    console.debug('[VideoPlayerField]', { id, size, variant, error: Boolean(error) })
  }

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      success={resolvedSuccess}
      warning={resolvedWarning}
      required={required}
      variant={variant}
      size={size}
      htmlFor={id}
      className={className}
    >
      <FieldControlShell>
        <input
          id={id}
          type="url"
          required={required}
          className="theme-field__control"
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </FieldControlShell>
      {videoId ? (
        <div className="theme-video-player-field__preview">
          <VideoEmbedBlock videoId={videoId} title="Video preview" />
        </div>
      ) : null}
    </Field>
  )
}

export type { ValidateOn, ValidationRule }
