import { Type } from 'lucide-react'
import {
  fontStacks,
  useThemeFont,
  THEME_FONT_STACK_STORAGE_KEY,
  type FontStackId,
} from '../lib/theme'
import { Button } from './Button'

const stackOptions = (Object.keys(fontStacks) as FontStackId[]).map((id) => ({
  id,
  label: fontStacks[id].name,
}))

type ThemeFontPickerProps = {
  compact?: boolean
}

export function ThemeFontPicker({ compact = false }: ThemeFontPickerProps) {
  const { stackId, stack, setStackId } = useThemeFont()

  return (
    <div className={compact ? 'flex flex-col gap-2' : 'space-y-3'}>
      {!compact ? <p className="type-overline">Font stack</p> : null}
      <div className="flex flex-wrap gap-2">
        {stackOptions.map(({ id, label }) => (
          <Button
            key={id}
            size={compact ? 'sm' : 'md'}
            variant={stackId === id ? 'accent' : 'outline'}
            icon={Type}
            active={stackId === id}
            onClick={() => setStackId(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      {!compact ? (
        <p className="type-caption type-muted mb-0">
          Active: <span className="type-semibold">{stack.name}</span>. Sets display ·
          display-sans · sans · mono via <code className="type-code">useThemeFont()</code>;
          persisted to <code className="type-code">{THEME_FONT_STACK_STORAGE_KEY}</code>.
          Also clears any Display Faces page override.
        </p>
      ) : null}
    </div>
  )
}
