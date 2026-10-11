import { useId, useState } from 'react'
import { X } from 'lucide-react'
import { fieldMenuSize } from '../lib/menus/fieldMenu'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import type { ScrollRailType } from '../lib/scroll/scrollRail'
import { DEFAULT_SCROLL_RAIL } from '../lib/scroll/scrollRail'
import { Field } from './Field'
import { IconButton } from './IconButton'
import { MenuButton, type MenuItem } from './MenuButton'

export type SelectOption = {
  value: string
  label: string
  /** Optional secondary line under the label (dropdown / search list). */
  description?: string
  disabled?: boolean
}

type SelectProps = {
  options: readonly SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  variant?: FieldVariant
  size?: FieldSize
  placeholder?: string
  /** Show a clear (×) control when a value is selected */
  clearable?: boolean
  name?: string
  disabled?: boolean
  required?: boolean
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  id?: string
  className?: string
  /** Options list scroll rail — `curved` (default) · `straight` · `hidden`. Verify defaults to `hidden`. */
  scrollRail?: ScrollRailType
  /** Soft edge fade when list overflows — default `true` */
  scrollClouds?: boolean
  /** Portaled options list (escapes overflow hosts — use inside scroll panels / filter popovers) */
  portal?: boolean
  /** Z-index when `portal` — default `520`; raise above host popover if needed */
  portalZIndex?: number
  debug?: boolean
}

export function Select({
  options,
  value: valueProp,
  defaultValue = '',
  onChange,
  label,
  hint,
  error: errorProp,
  success,
  warning,
  variant = 'flat',
  size = 'md',
  placeholder = 'Choose…',
  clearable = false,
  name,
  disabled = false,
  required,
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  className = '',
  scrollRail,
  scrollClouds = true,
  portal = false,
  portalZIndex = 520,
  debug = false,
  id: idProp,
}: SelectProps) {
  const autoId = useId()
  const id = idProp ?? autoId.replace(/:/g, '')
  const [internalValue, setInternalValue] = useState(defaultValue)
  const value = valueProp ?? internalValue
  const selected = options.find((option) => option.value === value)
  const items: MenuItem[] = options.map((option) => ({
    id: option.value,
    label: option.label,
    disabled: option.disabled,
  }))
  const triggerLabel = selected?.label ?? placeholder
  const resolvedScrollRail =
    scrollRail ?? (variant === 'verify' ? 'hidden' : DEFAULT_SCROLL_RAIL)

  const { error, success: resolvedSuccess, warning: resolvedWarning, onBlur, notifyChange } =
    useFormFieldValidation({
      value,
      rules,
      validateOn,
      error: errorProp,
      success,
      warning,
      successMessage,
      showSuccessWhenValid,
      debug,
    })

  if (debug) {
    console.debug('[Select]', { id, size, variant, value, count: options.length })
  }

  const setValue = (next: string) => {
    notifyChange()
    if (valueProp === undefined) {
      setInternalValue(next)
    }
    onChange?.(next)
  }

  const showClear = clearable && Boolean(value) && !disabled

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
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <div onBlur={onBlur}>
        <MenuButton
          id={id}
          label={triggerLabel}
          items={items}
          selectedId={value || undefined}
          onSelect={setValue}
          menuSize={fieldMenuSize[size]}
          scrollRail={resolvedScrollRail}
          scrollClouds={scrollClouds}
          portal={portal}
          portalZIndex={portalZIndex}
          disabled={disabled}
          variant="ghost"
          fieldShell
          fieldShellTrailing={
            showClear ? (
              <span className="theme-field__control-trailing-slot">
                <IconButton
                  icon={X}
                  aria-label="Clear selection"
                  variant="ghost"
                  size="xs"
                  disabled={disabled}
                  onClick={() => setValue('')}
                />
              </span>
            ) : undefined
          }
          triggerClassName={[
            'theme-field__control',
            selected ? '' : 'theme-field__menu-trigger--placeholder',
          ]
            .filter(Boolean)
            .join(' ')}
          className={['theme-field__menu', disabled ? 'theme-field__menu--disabled' : '']
            .filter(Boolean)
            .join(' ')}
        />
      </div>
    </Field>
  )
}

export type { ValidateOn, ValidationRule }
