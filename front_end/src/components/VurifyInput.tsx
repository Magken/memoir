import {
  useCallback,
  useId,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'

export type VurifyInputVariant = 'line' | 'area'
export type VurifyInputSize = 'md' | 'sm'

type VurifyInputSharedProps = {
  /** Floating label — sits in the field at rest, rises above when focused or filled. */
  label: string
  /** `line` single-line · `area` long-form message textarea. */
  variant?: VurifyInputVariant
  /** `md` default · `sm` tighter pad/type for dense hosts (chat, sheets). */
  size?: VurifyInputSize
  className?: string
  debug?: boolean
}

type VurifyInputLineProps = VurifyInputSharedProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size' | 'prefix'> & {
    variant?: 'line'
    /** End control inside the shell (e.g. password show/hide). */
    trailing?: ReactNode
  }

type VurifyInputAreaProps = VurifyInputSharedProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'size'> & {
    variant: 'area'
    /** Bottom footer strip inside the housing (e.g. Enrich) — does not overlay the textarea. */
    trailing?: ReactNode
  }

export type VurifyInputProps = VurifyInputLineProps | VurifyInputAreaProps

/**
 * Product Vurify field — floating label.
 * `line` — hairline underline that thickens on focus · `area` — housing frame for long text.
 * Not a Codrops TextInputFx sample.
 */
export function VurifyInput(props: VurifyInputProps) {
  const variant = props.variant ?? 'line'
  const size = props.size ?? 'md'
  const { label, className = '', debug = false } = props
  const autoId = useId().replace(/:/g, '')
  const id = props.id ?? `vurify-input-${variant}-${autoId}`

  const valueProp = props.value
  const defaultValue = props.defaultValue
  const [internalValue, setInternalValue] = useState(
    defaultValue !== undefined ? String(defaultValue) : '',
  )
  const [focused, setFocused] = useState(false)
  const displayValue = valueProp !== undefined ? String(valueProp) : internalValue
  const filled = focused || displayValue.trim().length > 0
  const trailing =
    variant === 'line'
      ? (props as VurifyInputLineProps).trailing
      : (props as VurifyInputAreaProps).trailing

  if (debug) {
    console.debug('[VurifyInput]', { variant, size, id, filled, focused, trailing: Boolean(trailing) })
  }

  const handleLineChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (valueProp === undefined) setInternalValue(event.target.value)
      if (variant === 'line') {
        ;(props as VurifyInputLineProps).onChange?.(event)
      }
    },
    [props, valueProp, variant],
  )

  const handleAreaChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      if (valueProp === undefined) setInternalValue(event.target.value)
      if (variant === 'area') {
        ;(props as VurifyInputAreaProps).onChange?.(event)
      }
    },
    [props, valueProp, variant],
  )

  const handleLineFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setFocused(true)
      if (variant === 'line') {
        ;(props as VurifyInputLineProps).onFocus?.(event)
      }
    },
    [props, variant],
  )

  const handleAreaFocus = useCallback(
    (event: FocusEvent<HTMLTextAreaElement>) => {
      setFocused(true)
      if (variant === 'area') {
        ;(props as VurifyInputAreaProps).onFocus?.(event)
      }
    },
    [props, variant],
  )

  const handleLineBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setFocused(false)
      if (variant === 'line') {
        ;(props as VurifyInputLineProps).onBlur?.(event)
      }
    },
    [props, variant],
  )

  const handleAreaBlur = useCallback(
    (event: FocusEvent<HTMLTextAreaElement>) => {
      setFocused(false)
      if (variant === 'area') {
        ;(props as VurifyInputAreaProps).onBlur?.(event)
      }
    },
    [props, variant],
  )

  const classes = [
    'theme-vurify-input',
    `theme-vurify-input--${variant}`,
    size === 'sm' ? 'theme-vurify-input--sm' : '',
    trailing ? 'theme-vurify-input--trailing' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (variant === 'area') {
    const {
      label: _label,
      variant: _variant,
      size: _size,
      className: _className,
      debug: _debug,
      id: _id,
      value: _value,
      defaultValue: _defaultValue,
      onChange: _onChange,
      onFocus: _onFocus,
      onBlur: _onBlur,
      rows = 4,
      trailing: _trailing,
      ...areaRest
    } = props as VurifyInputAreaProps

    return (
      <span
        className={classes}
        data-variant="area"
        data-size={size}
        data-filled={filled ? 'true' : 'false'}
        data-focused={focused ? 'true' : 'false'}
        data-trailing={trailing ? 'true' : 'false'}
      >
        <span className="theme-vurify-input__shell">
          <span className="theme-vurify-input__area-body">
            <textarea
              id={id}
              className="theme-vurify-input__field theme-vurify-input__field--area type-body"
              value={displayValue}
              rows={rows}
              onChange={handleAreaChange}
              onFocus={handleAreaFocus}
              onBlur={handleAreaBlur}
              {...areaRest}
            />
            <label className="theme-vurify-input__label type-body" htmlFor={id}>
              <span className="theme-vurify-input__label-text">{label}</span>
            </label>
          </span>
          {trailing ? (
            <span className="theme-vurify-input__area-footer">{trailing}</span>
          ) : null}
        </span>
      </span>
    )
  }

  const {
    label: _label,
    variant: _variant,
    size: _size,
    className: _className,
    debug: _debug,
    id: _id,
    value: _value,
    defaultValue: _defaultValue,
    onChange: _onChange,
    onFocus: _onFocus,
    onBlur: _onBlur,
    trailing: _trailing,
    ...lineRest
  } = props as VurifyInputLineProps

  return (
    <span
      className={classes}
      data-variant="line"
      data-size={size}
      data-filled={filled ? 'true' : 'false'}
      data-focused={focused ? 'true' : 'false'}
      data-trailing={trailing ? 'true' : 'false'}
    >
      <span className="theme-vurify-input__shell">
        <input
          id={id}
          className="theme-vurify-input__field theme-vurify-input__field--line type-body"
          value={displayValue}
          onChange={handleLineChange}
          onFocus={handleLineFocus}
          onBlur={handleLineBlur}
          {...lineRest}
        />
        <label className="theme-vurify-input__label type-body" htmlFor={id}>
          <span className="theme-vurify-input__label-text">{label}</span>
        </label>
        {trailing ? <span className="theme-vurify-input__trailing">{trailing}</span> : null}
        <span className="theme-vurify-input__underline" aria-hidden="true" />
      </span>
    </span>
  )
}
