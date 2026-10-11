import { useCallback, useId, useMemo, useState } from 'react'
import { fieldMenuSize, serializeMultiSelectValue } from '../lib/menus/fieldMenu'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Chip } from './Chip'
import type { SelectOption } from './Select'
import { Field } from './Field'
import { MenuButton, type MenuItem } from './MenuButton'

type MultiSelectProps = {
  options: readonly SelectOption[]
  value?: string[]
  defaultValue?: string[]
  onChange?: (value: string[]) => void
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  variant?: FieldVariant
  size?: FieldSize
  placeholder?: string
  name?: string
  disabled?: boolean
  required?: boolean
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  className?: string
  debug?: boolean
}

export function MultiSelect({
  options,
  value: valueProp,
  defaultValue = [],
  onChange,
  label,
  hint,
  error: errorProp,
  success,
  warning,
  variant = 'flat',
  size = 'md',
  placeholder = 'Add…',
  name,
  disabled = false,
  required,
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  className = '',
  debug = false,
}: MultiSelectProps) {
  const autoId = useId()
  const id = autoId.replace(/:/g, '')
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue)
  const selected = valueProp ?? internalValue
  const serialized = serializeMultiSelectValue(selected)

  const { error, success: resolvedSuccess, warning: resolvedWarning, onBlur, notifyChange } =
    useFormFieldValidation({
      value: serialized,
      rules,
      validateOn,
      error: errorProp,
      success,
      warning,
      successMessage,
      showSuccessWhenValid,
      debug,
    })

  const setSelected = useCallback(
    (next: string[]) => {
      if (valueProp === undefined) {
        setInternalValue(next)
      }
      onChange?.(next)
    },
    [onChange, valueProp],
  )

  const addValue = useCallback(
    (next: string) => {
      if (disabled || selected.includes(next)) return
      notifyChange()
      setSelected([...selected, next])
    },
    [disabled, notifyChange, selected, setSelected],
  )

  const removeValue = useCallback(
    (next: string) => {
      if (disabled) return
      notifyChange()
      setSelected(selected.filter((value) => value !== next))
    },
    [disabled, notifyChange, selected, setSelected],
  )

  const availableItems: MenuItem[] = useMemo(
    () =>
      options
        .filter((option) => !selected.includes(option.value))
        .map((option) => ({
          id: option.value,
          label: option.label,
          disabled: option.disabled,
        })),
    [options, selected],
  )

  const labelByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  )

  if (debug) {
    console.debug('[MultiSelect]', { selectedCount: selected.length, available: availableItems.length })
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
      {name
        ? selected.map((item) => <input key={item} type="hidden" name={name} value={item} />)
        : null}
      <div className="theme-field__multiselect" onBlur={onBlur}>
        {selected.length > 0 ? (
          <div className="theme-chip-group theme-field__multiselect-chips">
            {selected.map((item) => (
              <Chip
                key={item}
                selected
                size={size}
                disabled={disabled}
                onDismiss={disabled ? undefined : () => removeValue(item)}
              >
                {labelByValue.get(item) ?? item}
              </Chip>
            ))}
          </div>
        ) : null}
        <div className="theme-field__multiselect-add">
          <MenuButton
            label={placeholder}
            items={availableItems}
            onSelect={addValue}
            menuSize={fieldMenuSize[size]}
            disabled={disabled || availableItems.length === 0}
            variant="ghost"
            fieldShell
            triggerClassName="theme-field__control theme-field__menu-trigger--placeholder"
            className="theme-field__menu theme-field__multiselect-menu"
          />
        </div>
      </div>
    </Field>
  )
}

export type { SelectOption, ValidateOn, ValidationRule }
