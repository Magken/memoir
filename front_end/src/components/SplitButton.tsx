import type { LucideIcon } from 'lucide-react'
import type { ButtonSize, ButtonVariant } from '../lib/ui/buttonStyles'
import { menuItemButtonSize, type MenuSize } from '../lib/menus/menuControls'
import type { TypeAnimPreset } from '../lib/animations/typeAnimPresets'
import { Button } from './Button'
import { MenuButton, type MenuItem } from './MenuButton'

type SplitButtonProps = {
  children: string
  items: readonly MenuItem[]
  onClick?: () => void
  onSelect?: (id: string) => void
  selectedId?: string
  menuSize?: MenuSize
  itemLabelAnim?: boolean
  labelAnim?: TypeAnimPreset
  icon?: LucideIcon
  size?: ButtonSize
  variant?: ButtonVariant
  disabled?: boolean
  className?: string
  debug?: boolean
}

export function SplitButton({
  children,
  items,
  onClick,
  onSelect,
  selectedId,
  menuSize,
  itemLabelAnim,
  labelAnim,
  icon,
  size,
  variant = 'accent',
  disabled = false,
  className = '',
  debug = false,
}: SplitButtonProps) {
  const buttonSize = size ?? menuItemButtonSize[menuSize ?? 'md']

  if (debug) {
    console.debug('[SplitButton]', { items: items.length, variant, size: buttonSize })
  }

  return (
    <div className={['theme-split-btn', className].filter(Boolean).join(' ')}>
      <Button
        type="button"
        size={buttonSize}
        variant={variant}
        icon={icon}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </Button>
      <MenuButton
        items={items}
        onSelect={onSelect}
        selectedId={selectedId}
        menuSize={menuSize}
        itemLabelAnim={itemLabelAnim}
        labelAnim={labelAnim}
        label={`${children} options`}
        iconOnly
        size={buttonSize}
        variant={variant}
        disabled={disabled}
      />
    </div>
  )
}
