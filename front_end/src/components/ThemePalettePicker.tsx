import { Flame, Flower2, Sparkles, Sun } from 'lucide-react'
import {
  colorPalettes,
  resolveThemePaletteId,
  themePaletteFamily,
  themePaletteIsSwap,
  themePaletteMode,
  useThemeColor,
  type ThemePaletteFamily,
} from '../lib/theme'
import { Button } from './Button'

const familyOptions: {
  id: ThemePaletteFamily
  icon: typeof Sun
  label: string
}[] = [
  { id: 'brand', icon: Sun, label: 'Brand' },
  { id: 'eugenia', icon: Flower2, label: 'Eugenia' },
  { id: 'ember', icon: Flame, label: 'Ember' },
  { id: 'grass', icon: Sparkles, label: 'Grass' },
]

export function ThemePalettePicker({ compact = false }: { compact?: boolean }) {
  const { paletteId, setPaletteId } = useThemeColor()
  const family = themePaletteFamily(paletteId)
  const mode = themePaletteMode(paletteId)
  const swap = themePaletteIsSwap(paletteId)

  return (
    <div className={compact ? 'flex flex-col gap-2' : 'space-y-3'}>
      {!compact ? <p className="type-overline">Palette</p> : null}
      <div className="flex flex-wrap gap-2">
        {familyOptions.map(({ id, icon, label }) => (
          <Button
            key={id}
            size={compact ? 'sm' : 'md'}
            variant={family === id ? 'accent' : 'outline'}
            icon={icon}
            active={family === id}
            onClick={() => setPaletteId(resolveThemePaletteId(id, mode, id === 'ember' ? swap : false))}
          >
            {label}
          </Button>
        ))}
      </div>
      {family === 'ember' ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!swap ? 'accent' : 'outline'}
            active={!swap}
            onClick={() => setPaletteId(resolveThemePaletteId('ember', mode, false))}
          >
            Crimson lead
          </Button>
          <Button
            size="sm"
            variant={swap ? 'accent' : 'outline'}
            active={swap}
            onClick={() => setPaletteId(resolveThemePaletteId('ember', mode, true))}
          >
            Navy lead
          </Button>
        </div>
      ) : null}
      {!compact ? (
        <p className="type-caption mb-0">
          Active: {colorPalettes[paletteId].name}. Light/dark follows the mode toggle; Ember can
          swap crimson ↔ navy; Grass is the GRAS product dark (scene yellows + orange). Persisted to{' '}
          <code className="type-code">theme_palette</code>.
        </p>
      ) : null}
    </div>
  )
}
