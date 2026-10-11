import type { ReactNode } from 'react'
import type { FieldSize } from '../lib/forms/formControls'

type TagProps = {
  children: ReactNode
  size?: FieldSize
  className?: string
}

const sizeClass: Record<FieldSize, string> = {
  xs: 'theme-tag--sm',
  sm: 'theme-tag--sm',
  md: 'theme-tag--md',
  lg: 'theme-tag--lg',
}

export function Tag({ children, size = 'md', className = '' }: TagProps) {
  return (
    <span
      className={['theme-tag', sizeClass[size], 'type-caption', className].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  )
}
