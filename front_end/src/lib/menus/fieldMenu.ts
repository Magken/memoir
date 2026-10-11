import type { FieldSize } from '../forms/formControls'
import type { MenuSize } from './menuControls'

export const fieldMenuSize: Record<FieldSize, MenuSize> = {
  xs: 'compact',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}

/** Serializes multi-select values for [useFormFieldValidation](../hooks/useFormFieldValidation.ts). */
export const MULTI_SELECT_SEP = '\0'

export function serializeMultiSelectValue(values: readonly string[]): string {
  return values.join(MULTI_SELECT_SEP)
}
