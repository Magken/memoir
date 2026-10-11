import type { ReactNode } from 'react'
import { semanticTextClass, type SemanticTone } from '../lib/ui/semanticTone'

type StatusTextProps = {
  children: ReactNode
  tone: SemanticTone
  className?: string
}

export function StatusText({ children, tone, className = '' }: StatusTextProps) {
  return (
    <span className={[semanticTextClass[tone], 'type-body-sm', className].filter(Boolean).join(' ')}>
      {children}
    </span>
  )
}
