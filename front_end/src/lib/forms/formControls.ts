export const FIELD_SIZES = ['xs', 'sm', 'md', 'lg'] as const

export type FieldSize = (typeof FIELD_SIZES)[number]

/** Visual shell — mirrors [Card](../components/Card.tsx) variants (+ Verify housing · Vurify line). */
export const FIELD_VARIANTS = [
  'flat',
  'raised',
  'inset',
  'outline',
  'ghost',
  'verify',
  'vurify',
] as const

export type FieldVariant = (typeof FIELD_VARIANTS)[number]

/** Control shell corner — `pill` matches ExpandableSearchBar field chrome. */
export const FIELD_SHAPES = ['rect', 'pill'] as const

export type FieldShape = (typeof FIELD_SHAPES)[number]

export type FieldStatus = 'success' | 'error' | 'warning'

export const fieldSizeClass: Record<FieldSize, string> = {
  xs: 'theme-field--xs',
  sm: 'theme-field--sm',
  md: 'theme-field--md',
  lg: 'theme-field--lg',
}

export const fieldVariantClass: Record<FieldVariant, string> = {
  flat: 'theme-field--flat',
  raised: 'theme-field--raised',
  inset: 'theme-field--inset',
  outline: 'theme-field--outline',
  ghost: 'theme-field--ghost',
  verify: 'theme-field--verify',
  vurify: 'theme-field--vurify',
}

export const fieldShapeClass: Record<FieldShape, string> = {
  rect: '',
  pill: 'theme-field--pill',
}

export const fieldStatusClass: Record<FieldStatus, string> = {
  success: 'theme-field--success',
  error: 'theme-field--error',
  warning: 'theme-field--warning',
}

export function resolveFieldStatus(props: {
  error?: string | readonly string[]
  warning?: string
  success?: string
}): FieldStatus | undefined {
  if (normalizeFieldMessages(props.error).length > 0) {
    return 'error'
  }
  if (props.warning) {
    return 'warning'
  }
  if (props.success) {
    return 'success'
  }
  return undefined
}

export function normalizeFieldMessages(
  messages?: string | readonly string[],
): readonly string[] {
  if (!messages) {
    return []
  }
  if (typeof messages === 'string') {
    return messages ? [messages] : []
  }
  return messages.filter(Boolean)
}
