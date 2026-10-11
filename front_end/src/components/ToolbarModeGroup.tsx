import type { ReactNode } from 'react'
import { ButtonGroup } from './ButtonGroup'

type ToolbarModeGroupProps = {
  children: ReactNode
  className?: string
  'aria-label': string
  debug?: boolean
}

/** Compact icon mode switcher — toolbar outline, `tray` icon slots (PDF side panel pattern). */
export function ToolbarModeGroup({
  children,
  className = '',
  'aria-label': ariaLabel,
  debug = false,
}: ToolbarModeGroupProps) {
  return (
    <ButtonGroup
      variant="toggle"
      groupOutline="toolbar"
      className={['theme-toolbar-mode-group', className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      debug={debug}
    >
      {children}
    </ButtonGroup>
  )
}
