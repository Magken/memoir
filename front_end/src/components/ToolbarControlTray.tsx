import type { ReactNode } from 'react'
import { Card, type CardBorder } from './Card'

type ToolbarControlTrayProps = {
  children: ReactNode
  className?: string
  density?: 'default' | 'compact'
  /** Tooltip popover chrome on the tray shell — border + shadow only. */
  border?: CardBorder
}

/** Flat card shell for clustered toolbar controls (PDF zoom tray pattern). */
export function ToolbarControlTray({
  children,
  className = '',
  density = 'default',
  border,
}: ToolbarControlTrayProps) {
  return (
    <Card
      variant="flat"
      shadowVariant={border === 'tooltip' ? undefined : 'none'}
      border={border}
      className={['theme-toolbar-control-tray', className].filter(Boolean).join(' ')}
    >
      <span
        className={[
          'theme-toolbar-control-tray__inner',
          density === 'compact' ? 'theme-toolbar-control-tray__inner--compact' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </span>
    </Card>
  )
}
