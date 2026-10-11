import type { ReactNode } from 'react'

type FieldsetProps = {
  legend?: string
  children: ReactNode
  disabled?: boolean
  className?: string
}

export function Fieldset({ legend, children, disabled = false, className = '' }: FieldsetProps) {
  return (
    <fieldset
      disabled={disabled}
      className={['theme-fieldset', disabled ? 'theme-fieldset--disabled' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {legend ? <legend className="theme-fieldset__legend type-label">{legend}</legend> : null}
      <div className="theme-fieldset__body">{children}</div>
    </fieldset>
  )
}
