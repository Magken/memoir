import type { ReactNode } from 'react'

type FieldControlRowModifiers = {
  leading?: boolean
  leadingWide?: boolean
  trailing?: boolean
  trailingSteppers?: boolean
}

export function fieldControlRowClass(modifiers: FieldControlRowModifiers = {}): string {
  return [
    'theme-field__control-row',
    modifiers.leading ? 'theme-field__control-row--has-leading' : '',
    modifiers.leadingWide ? 'theme-field__control-row--leading-wide' : '',
    modifiers.trailing ? 'theme-field__control-row--has-trailing' : '',
    modifiers.trailingSteppers ? 'theme-field__control-row--trailing-steppers' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

type FieldControlShellProps = {
  children: ReactNode
  className?: string
  /** Flex row for input + addons — default. Use `block` for textarea. */
  layout?: 'row' | 'block'
  rowClassName?: string
  /** Absolute / chrome layers after the control row (e.g. Vurify float label). */
  overlay?: ReactNode
  'data-filled'?: 'true' | 'false'
  'data-focused'?: 'true' | 'false'
}

/** Card shell for form controls — hover/focus raise moves the whole control including addons. */
export function FieldControlShell({
  children,
  className = '',
  layout = 'row',
  rowClassName = 'theme-field__control-row',
  overlay,
  'data-filled': dataFilled,
  'data-focused': dataFocused,
}: FieldControlShellProps) {
  const dataAttrs = {
    ...(dataFilled !== undefined ? { 'data-filled': dataFilled } : {}),
    ...(dataFocused !== undefined ? { 'data-focused': dataFocused } : {}),
  }

  if (layout === 'block') {
    return (
      <div
        className={['theme-field__control-shell', 'theme-field__control-shell--block', className]
          .filter(Boolean)
          .join(' ')}
        {...dataAttrs}
      >
        {children}
        {overlay}
      </div>
    )
  }

  return (
    <div
      className={['theme-field__control-shell', className].filter(Boolean).join(' ')}
      {...dataAttrs}
    >
      <div className={rowClassName}>{children}</div>
      {overlay}
    </div>
  )
}
