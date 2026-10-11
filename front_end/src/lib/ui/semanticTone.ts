export const SEMANTIC_TONES = ['success', 'error', 'warning', 'info'] as const

export type SemanticTone = (typeof SEMANTIC_TONES)[number]

export const semanticBadgeClass: Record<SemanticTone, string> = {
  success: 'theme-badge--success',
  error: 'theme-badge--error',
  warning: 'theme-badge--warning',
  info: 'theme-badge--info',
}

export const semanticTextClass: Record<SemanticTone, string> = {
  success: 'type-success',
  error: 'type-error',
  warning: 'type-warning',
  info: 'type-info',
}

export const semanticDotClass: Record<SemanticTone, string> = {
  success: 'theme-data-table__cell-dot--success',
  error: 'theme-data-table__cell-dot--error',
  warning: 'theme-data-table__cell-dot--warning',
  info: 'theme-data-table__cell-dot--info',
}

export const semanticButtonVariant: Record<SemanticTone, 'success' | 'error' | 'warning' | 'default'> =
  {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'default',
  }
