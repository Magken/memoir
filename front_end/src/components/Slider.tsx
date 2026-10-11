import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

type SliderProps = {
  value?: number | null
  defaultValue?: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  minLabel?: string
  maxLabel?: string
  /** `scale` = Google Forms–style numbered tick points (preferred for Likert). */
  variant?: 'range' | 'scale'
  showValue?: boolean
  /** Tick marks under the track (`range`) or as selectable points (`scale`). */
  showTicks?: boolean
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
  debug?: boolean
}

function buildTicks(min: number, max: number, step: number): number[] {
  const ticks: number[] = []
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return ticks
  const s = step > 0 ? step : 1
  for (let v = min; v <= max + 1e-9; v += s) {
    ticks.push(Math.round(v * 1000) / 1000)
    if (ticks.length > 32) break
  }
  return ticks
}

/**
 * Theme range / linear-scale control.
 * Prefer `variant="scale"` for discrete Likert / NPS; `range` for continuous values.
 */
export function Slider({
  value: valueProp,
  defaultValue,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  minLabel,
  maxLabel,
  variant = 'range',
  showValue = true,
  showTicks,
  disabled = false,
  className = '',
  id: idProp,
  'aria-label': ariaLabel,
  debug = false,
}: SliderProps) {
  const autoId = useId()
  const id = idProp ?? autoId.replace(/:/g, '')
  const fallback =
    typeof defaultValue === 'number' && Number.isFinite(defaultValue)
      ? defaultValue
      : min
  const [internal, setInternal] = useState(fallback)
  const controlled = valueProp !== undefined
  const hasValue = valueProp !== undefined && valueProp !== null
  const value = hasValue ? valueProp : controlled ? min : internal
  const displayValue = hasValue ? valueProp : controlled ? null : internal
  const span = Math.max(max - min, 1)
  const pct = Math.min(100, Math.max(0, ((value - min) / span) * 100))
  const trackRef = useRef<HTMLDivElement>(null)
  const ticks = useMemo(() => buildTicks(min, max, step), [min, max, step])
  const ticksEnabled = showTicks ?? variant === 'scale'

  useEffect(() => {
    trackRef.current?.style.setProperty('--theme-slider-pct', `${pct}%`)
  }, [pct])

  const setValue = useCallback(
    (next: number) => {
      if (!controlled) setInternal(next)
      onChange?.(next)
    },
    [onChange, controlled],
  )

  if (debug) {
    console.debug('[Slider]', { value, min, max, step, variant, disabled })
  }

  if (variant === 'scale') {
    return (
      <div
        className={[
          'theme-slider',
          'theme-slider--scale',
          disabled ? 'theme-slider--disabled' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {(label || showValue) && (
          <div className="theme-slider__head">
            {label ? (
              <span className="theme-slider__label type-caption" id={`${id}-label`}>
                {label}
              </span>
            ) : (
              <span />
            )}
            {showValue && displayValue != null ? (
              <span className="theme-slider__value theme-slider__value--hero type-label" aria-live="polite">
                {displayValue}
              </span>
            ) : showValue ? (
              <span className="theme-slider__value theme-slider__value--empty type-caption type-muted">
                —
              </span>
            ) : null}
          </div>
        )}
        <div
          className="theme-slider__scale"
          role="radiogroup"
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-label={label ? undefined : ariaLabel ?? 'Scale'}
        >
          {ticks.map((tick) => {
            const selected = displayValue != null && tick === displayValue
            return (
              <button
                key={tick}
                type="button"
                role="radio"
                className={[
                  'theme-slider__tick-btn',
                  selected ? 'theme-slider__tick-btn--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-checked={selected}
                disabled={disabled}
                onClick={() => setValue(tick)}
              >
                <span className="theme-slider__tick-dot" aria-hidden />
                <span className="theme-slider__tick-num type-caption">{tick}</span>
              </button>
            )
          })}
        </div>
        {(minLabel || maxLabel) && (
          <div className="theme-slider__ends theme-slider__ends--scale">
            <span className="type-caption type-muted">{minLabel ?? min}</span>
            <span className="type-caption type-muted">{maxLabel ?? max}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={['theme-slider', disabled ? 'theme-slider--disabled' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {(label || showValue) && (
        <div className="theme-slider__head">
          {label ? (
            <label className="theme-slider__label type-caption" htmlFor={id}>
              {label}
            </label>
          ) : (
            <span />
          )}
          {showValue ? (
            <span className="theme-slider__value type-label" aria-live="polite">
              {value}
            </span>
          ) : null}
        </div>
      )}
      <div className="theme-slider__track-wrap" ref={trackRef}>
        <input
          id={id}
          type="range"
          className="theme-slider__input"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label ? undefined : ariaLabel ?? 'Slider'}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onChange={(e) => setValue(Number(e.target.value))}
        />
        {ticksEnabled && ticks.length > 1 ? (
          <div className="theme-slider__ticks" aria-hidden>
            {ticks.map((tick) => (
              <span
                key={tick}
                className={[
                  'theme-slider__tick',
                  tick === value ? 'theme-slider__tick--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </div>
        ) : null}
      </div>
      {(minLabel || maxLabel) && (
        <div className="theme-slider__ends">
          <span className="type-caption type-muted">{minLabel ?? min}</span>
          <span className="type-caption type-muted">{maxLabel ?? max}</span>
        </div>
      )}
    </div>
  )
}
