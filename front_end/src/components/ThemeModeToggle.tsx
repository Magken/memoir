import { Moon, Sun } from 'lucide-motion'
import type { ButtonSize } from '../lib/ui/buttonStyles'
import { isDarkPalette, toggleThemePaletteMode, useThemeColor } from '../lib/theme'
import { ICON_SVG_GLOW_CLASS } from '../lib/animations/borderGlow'
import { AnimatedIcon } from './AnimatedIcon'
import { Button } from './Button'

type ThemeModeToggleProps = {
  size?: ButtonSize
  className?: string
  debug?: boolean
}

export function ThemeModeToggle({
  size = 'md',
  className = '',
  debug = false,
}: ThemeModeToggleProps) {
  const { paletteId, setPaletteId } = useThemeColor()
  const isLight = !isDarkPalette(paletteId)

  const ariaLabel = isLight ? 'Switch to dark mode' : 'Switch to light mode'
  const showGlow = !isLight

  return (
    <Button
      variant="cardless"
      size={size}
      borderGlow={showGlow ? 'icon' : false}
      aria-label={ariaLabel}
      aria-pressed={!isLight}
      className={['theme-mode-toggle', className].filter(Boolean).join(' ')}
      debug={debug}
      iconNode={
        <span className="theme-mode-toggle__stack" aria-hidden>
          <span className="theme-mode-toggle__icon" data-active={isLight || undefined}>
            <AnimatedIcon icon={Moon} size={size} trigger="hover" className="theme-btn__icon" />
          </span>
          <span className="theme-mode-toggle__icon" data-active={!isLight || undefined}>
            <AnimatedIcon
              icon={Sun}
              size={size}
              trigger="hover"
              className={['theme-btn__icon', showGlow ? ICON_SVG_GLOW_CLASS : ''].filter(Boolean).join(' ')}
            />
          </span>
        </span>
      }
      onClick={() => setPaletteId(toggleThemePaletteMode(paletteId))}
    />
  )
}
