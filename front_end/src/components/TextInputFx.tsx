import {
  useCallback,
  useId,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
} from 'react'

export const TEXT_INPUT_FX_EFFECTS = [
  'haruki',
  'hoshi',
  'kuro',
  'jiro',
  'minoru',
  'yoko',
  'akira',
  'ichiro',
  'juro',
  'madoka',
  'kaede',
  'nao',
  'shoko',
  'chisato',
  'makiko',
  'nariko',
  'fumi',
  'manami',
] as const

export type TextInputFxEffect = (typeof TEXT_INPUT_FX_EFFECTS)[number]

export const TEXT_INPUT_FX_EFFECT_LABELS: Record<TextInputFxEffect, string> = {
  haruki: 'Haruki',
  hoshi: 'Hoshi',
  kuro: 'Kuro',
  jiro: 'Jiro',
  minoru: 'Minoru',
  yoko: 'Yoko',
  akira: 'Akira',
  ichiro: 'Ichiro',
  juro: 'Juro',
  madoka: 'Madoka',
  kaede: 'Kaede',
  nao: 'Nao',
  shoko: 'Shoko',
  chisato: 'Chisato',
  makiko: 'Makiko',
  nariko: 'Nariko',
  fumi: 'Fumi',
  manami: 'Manami',
}

type TextInputFxProps = {
  effect: TextInputFxEffect
  label: string
  className?: string
  debug?: boolean
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size' | 'prefix'>

/**
 * Codrops Text Input Effects port — floating-label input shells with filled/focus motion.
 * Theme tokens in `text-input-effects.css` · study: `ref.text-input-effects`.
 */
export function TextInputFx({
  effect,
  label,
  className,
  debug = false,
  id: idProp,
  value: valueProp,
  defaultValue,
  onChange: onChangeProp,
  onBlur: onBlurProp,
  onFocus: onFocusProp,
  ...rest
}: TextInputFxProps) {
  const autoId = useId().replace(/:/g, '')
  const id = idProp ?? `text-input-fx-${effect}-${autoId}`
  const [internalValue, setInternalValue] = useState(defaultValue?.toString() ?? '')
  const [focused, setFocused] = useState(false)
  const displayValue = valueProp !== undefined ? String(valueProp) : internalValue
  const filled = focused || displayValue.trim().length > 0

  if (debug) {
    console.debug('[TextInputFx]', { effect, id, filled, focused })
  }

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (valueProp === undefined) setInternalValue(event.target.value)
      onChangeProp?.(event)
    },
    [onChangeProp, valueProp],
  )

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setFocused(true)
      onFocusProp?.(event)
    },
    [onFocusProp],
  )

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setFocused(false)
      onBlurProp?.(event)
    },
    [onBlurProp],
  )

  const classes = [
    'theme-text-input-fx',
    `theme-text-input-fx--${effect}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} data-effect={effect} data-filled={filled ? 'true' : 'false'}>
      {effect === 'madoka' ? (
        <svg
          className="theme-text-input-fx__graphic theme-text-input-fx__graphic--madoka"
          width="100%"
          height="100%"
          viewBox="0 0 404 77"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="m0,0l404,0l0,77l-404,0l0,-77z" />
        </svg>
      ) : null}
      {effect === 'nao' ? (
        <svg
          className="theme-text-input-fx__graphic theme-text-input-fx__graphic--nao"
          width="300%"
          height="100%"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,56.5c0,0,298.666,0,399.333,0C448.336,56.5,513.994,46,597,46c77.327,0,135,10.5,200.999,10.5c95.996,0,402.001,0,402.001,0" />
        </svg>
      ) : null}
      {effect === 'shoko' ? (
        <svg
          className="theme-text-input-fx__graphic theme-text-input-fx__graphic--shoko"
          width="300%"
          height="100%"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,56.5c0,0,298.666,0,399.333,0C448.336,56.5,513.994,46,597,46c77.327,0,135,10.5,200.999,10.5c95.996,0,402.001,0,402.001,0" />
          <path d="M0,2.5c0,0,298.666,0,399.333,0C448.336,2.5,513.994,13,597,13c77.327,0,135-10.5,200.999-10.5c95.996,0,402.001,0,402.001,0" />
        </svg>
      ) : null}
      {effect === 'makiko' || effect === 'fumi' ? (
        <span className="theme-text-input-fx__icon" aria-hidden="true" />
      ) : null}
      <input
        id={id}
        className="theme-text-input-fx__field"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
      />
      <label className="theme-text-input-fx__label" htmlFor={id}>
        <span className="theme-text-input-fx__label-content">{label}</span>
      </label>
    </span>
  )
}
