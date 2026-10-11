import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ButtonSize } from '../lib/ui/buttonStyles'
import { IconButton } from './IconButton'
import { Tooltip, type TooltipPlacement, type TooltipTrigger } from './Tooltip'

type InfoTooltipProps = {
  content: ReactNode
  trigger?: TooltipTrigger
  placement?: TooltipPlacement
  interactive?: boolean
  'aria-label'?: string
  size?: ButtonSize
  className?: string
  debug?: boolean
}

export function InfoTooltip({
  content,
  trigger = 'hover',
  placement = 'top',
  interactive = false,
  'aria-label': ariaLabel = 'More information',
  size = 'sm',
  className = '',
  debug = false,
}: InfoTooltipProps) {
  return (
    <Tooltip
      content={content}
      trigger={trigger}
      placement={placement}
      interactive={interactive}
      className={className}
      debug={debug}
    >
      <IconButton icon={Info} aria-label={ariaLabel} variant="ghost" size={size} />
    </Tooltip>
  )
}
