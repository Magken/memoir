import type { ReactNode } from 'react'
import { semanticBadgeClass, type SemanticTone } from '../lib/ui/semanticTone'

type BadgeProps = {
  children: ReactNode
  tone: SemanticTone
  className?: string
}

export function Badge({ children, tone, className = '' }: BadgeProps) {
  return (
    <span
      className={['theme-badge', semanticBadgeClass[tone], 'type-caption', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
