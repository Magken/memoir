import type { ReactNode } from 'react'
import {
  fieldShapeClass,
  fieldSizeClass,
  fieldStatusClass,
  fieldVariantClass,
  normalizeFieldMessages,
  resolveFieldStatus,
  type FieldShape,
  type FieldSize,
  type FieldVariant,
} from '../lib/forms/formControls'

export type FieldCounter = {
  value: number
  max: number
}

type FieldProps = {
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  required?: boolean
  optional?: boolean
  counter?: FieldCounter
  variant?: FieldVariant
  size?: FieldSize
  /** `pill` — full-radius control shell (search bars). Default `rect`. */
  shape?: FieldShape
  /** Strip card brutal shadow + focus lift from the control shell. */
  shadowless?: boolean
  htmlFor?: string
  className?: string
  children: ReactNode
}

function fieldFeedbackKey(
  errorMessages: readonly string[],
  success?: string,
  warning?: string,
  hint?: string,
  counter?: FieldCounter,
): string | null {
  if (errorMessages.length > 0) {
    return `error:${errorMessages.join('|')}`
  }
  if (success) {
    return `success:${success}`
  }
  if (warning) {
    return `warning:${warning}`
  }
  if (hint || counter) {
    return `meta:${hint ?? ''}:${counter ? `${counter.value}/${counter.max}` : ''}`
  }
  return null
}

export function Field({
  label,
  hint,
  error,
  success,
  warning,
  required = false,
  optional = false,
  counter,
  variant = 'flat',
  size = 'md',
  shape = 'rect',
  shadowless = false,
  htmlFor,
  className = '',
  children,
}: FieldProps) {
  const errorMessages = normalizeFieldMessages(error)
  const status = resolveFieldStatus({ error: errorMessages, warning, success })
  const hasErrors = errorMessages.length > 0
  const feedbackKey = fieldFeedbackKey(errorMessages, success, warning, hint, counter)
  const showFeedback = feedbackKey !== null

  let feedbackContent: ReactNode = null
  let feedbackKind = 'hint'

  if (hasErrors) {
    feedbackKind = 'error'
    feedbackContent = (
      <ul className="theme-field__message-list theme-field__message-list--error" role="alert">
        {errorMessages.map((message, index) => (
          <li
            key={`${index}-${message}`}
            className="theme-field__message theme-field__message--error type-caption"
          >
            {message}
          </li>
        ))}
      </ul>
    )
  } else if (success) {
    feedbackKind = 'success'
    feedbackContent = (
      <span className="theme-field__message theme-field__message--success type-caption" role="status">
        {success}
      </span>
    )
  } else if (warning) {
    feedbackKind = 'warning'
    feedbackContent = (
      <span className="theme-field__message theme-field__message--warning type-caption" role="status">
        {warning}
      </span>
    )
  } else if (hint || counter) {
    feedbackContent = (
      <div className="theme-field__meta">
        {hint ? <span className="theme-field__hint type-caption">{hint}</span> : <span />}
        {counter ? (
          <span
            className={[
              'theme-field__counter type-caption',
              counter.value > counter.max ? 'theme-field__counter--over' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-live="polite"
          >
            {counter.value} / {counter.max}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={[
        'theme-field',
        fieldSizeClass[size],
        fieldVariantClass[variant],
        fieldShapeClass[shape],
        shadowless ? 'theme-field--shadowless' : '',
        status ? fieldStatusClass[status] : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label ? (
        <label htmlFor={htmlFor} className="theme-field__label type-label">
          {label}
          {required ? (
            <span className="theme-field__label-required" aria-hidden>
              {' '}
              *
            </span>
          ) : null}
          {optional ? <span className="theme-field__label-optional type-caption"> (optional)</span> : null}
        </label>
      ) : null}
      {children}
      <div
        className={[
          'theme-field__feedback',
          showFeedback ? 'theme-field__feedback--open' : '',
          showFeedback ? `theme-field__feedback--${feedbackKind}` : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-live="polite"
      >
        <div className="theme-field__feedback-inner">
          {showFeedback ? (
            <div key={feedbackKey} className="theme-field__feedback-body">
              {feedbackContent}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
