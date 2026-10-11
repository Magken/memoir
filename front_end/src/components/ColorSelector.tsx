import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Card } from './Card'
import { Counter } from './Counter'
import { Input } from './Input'

type ColorSelectorProps = {
  value?: string
  onChange?: (color: string) => void
  swatches?: readonly string[]
  className?: string
}

type RgbChannels = { r: string; g: string; b: string }

const MAIN_SWATCHES = [
  '#000000',
  '#ffffff',
  '#666666',
  '#ff0000',
  '#ff9900',
  '#ffff00',
  '#4a86e8',
  '#9900ff',
] as const

function normalizeHex(color?: string): string {
  if (!color) return '#000000'
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const [, r, g, b] = color
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return '#000000'
}

/** Normalize `#hex` or `rgb()` / `rgba()` to lowercase `#rrggbb`. */
export function cssColorToHex(color?: string): string {
  if (!color) return '#000000'
  const trimmed = color.trim()
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return normalizeHex(trimmed)
  const rgb = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/)
  if (rgb) return rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]))
  return normalizeHex(trimmed)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex)
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)))
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`
}

function hexToHsva(hex: string): { h: number; s: number; v: number } {
  const { r, g, b } = hexToRgb(hex)
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const delta = max - min
  let h = 0

  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6
    } else if (max === gNorm) {
      h = ((bNorm - rNorm) / delta + 2) / 6
    } else {
      h = ((rNorm - gNorm) / delta + 4) / 6
    }
  }

  return {
    h: h * 360,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  }
}

function hsvaToHex(h: number, s: number, v: number): string {
  const saturation = s / 100
  const value = v / 100
  const chroma = value * saturation
  const intermediate = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const match = value - chroma
  let r = 0
  let g = 0
  let b = 0

  if (h < 60) {
    r = chroma
    g = intermediate
  } else if (h < 120) {
    r = intermediate
    g = chroma
  } else if (h < 180) {
    g = chroma
    b = intermediate
  } else if (h < 240) {
    g = intermediate
    b = chroma
  } else if (h < 300) {
    r = intermediate
    b = chroma
  } else {
    r = chroma
    b = intermediate
  }

  return rgbToHex((r + match) * 255, (g + match) * 255, (b + match) * 255)
}

function stepHexBrightness(hex: string, direction: 1 | -1): string {
  const hsva = hexToHsva(hex)
  const nextV = Math.max(0, Math.min(100, hsva.v + direction))
  return hsvaToHex(hsva.h, hsva.s, nextV)
}

function rgbToInput(hex: string): RgbChannels {
  const { r, g, b } = hexToRgb(hex)
  return { r: String(r), g: String(g), b: String(b) }
}

function parseRgbChannel(value: string): number | null {
  if (!/^\d{1,3}$/.test(value)) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 255) return null
  return parsed
}

export function ColorSelector({
  value,
  onChange,
  swatches = MAIN_SWATCHES,
  className = '',
}: ColorSelectorProps) {
  const externalHex = cssColorToHex(value)
  const [pickerHex, setPickerHex] = useState(externalHex)
  const [hexInput, setHexInput] = useState(externalHex)
  const [rgbInput, setRgbInput] = useState<RgbChannels>(() => rgbToInput(externalHex))
  const isInteractingRef = useRef(false)
  const pendingHexRef = useRef<string | null>(null)
  const hsva = useMemo(() => hexToHsva(pickerHex), [pickerHex])

  const flushPending = useCallback(() => {
    const pending = pendingHexRef.current
    pendingHexRef.current = null
    if (pending) {
      onChange?.(pending)
    }
  }, [onChange])

  const endInteraction = useCallback(() => {
    if (!isInteractingRef.current) return
    isInteractingRef.current = false
    flushPending()
  }, [flushPending])

  const startInteraction = useCallback(() => {
    if (isInteractingRef.current) return
    isInteractingRef.current = true
    pendingHexRef.current = null

    const onPointerEnd = () => {
      document.removeEventListener('pointerup', onPointerEnd)
      document.removeEventListener('pointercancel', onPointerEnd)
      endInteraction()
    }

    document.addEventListener('pointerup', onPointerEnd)
    document.addEventListener('pointercancel', onPointerEnd)
  }, [endInteraction])

  useEffect(() => {
    if (isInteractingRef.current || pendingHexRef.current) return
    setPickerHex(externalHex)
    setHexInput(externalHex)
    setRgbInput(rgbToInput(externalHex))
  }, [externalHex])

  const applyLocalColor = useCallback((color: string) => {
    const next = cssColorToHex(color)
    setPickerHex(next)
    setHexInput(next)
    setRgbInput(rgbToInput(next))
    return next
  }, [])

  const commitColor = useCallback(
    (color: string) => {
      const next = applyLocalColor(color)
      pendingHexRef.current = null
      if (next !== externalHex) {
        onChange?.(next)
      }
    },
    [applyLocalColor, externalHex, onChange],
  )

  const handlePickerChange = useCallback(
    (color: string) => {
      const next = applyLocalColor(color)
      if (isInteractingRef.current) {
        pendingHexRef.current = next
        return
      }
      if (next !== externalHex) {
        onChange?.(next)
      }
    },
    [applyLocalColor, externalHex, onChange],
  )

  const handleHexChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setHexInput(event.target.value)
  }, [])

  const handleHexBlur = useCallback(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(hexInput)) {
      commitColor(hexInput)
      return
    }
    setHexInput(externalHex)
  }, [commitColor, externalHex, hexInput])

  const handleHexKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && /^#[0-9a-fA-F]{6}$/.test(hexInput)) {
        commitColor(hexInput)
      }
    },
    [commitColor, hexInput],
  )

  const handleRgbChange = useCallback(
    (channel: keyof RgbChannels) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setRgbInput((current) => ({ ...current, [channel]: event.target.value }))
    },
    [],
  )

  const commitRgb = useCallback(
    (channels: RgbChannels) => {
      const r = parseRgbChannel(channels.r)
      const g = parseRgbChannel(channels.g)
      const b = parseRgbChannel(channels.b)
      if (r === null || g === null || b === null) {
        setRgbInput(rgbToInput(externalHex))
        return
      }
      commitColor(rgbToHex(r, g, b))
    },
    [commitColor, externalHex],
  )

  const handleRgbBlur = useCallback(() => {
    commitRgb(rgbInput)
  }, [commitRgb, rgbInput])

  const handleRgbKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        commitRgb(rgbInput)
      }
    },
    [commitRgb, rgbInput],
  )

  return (
    <Card
      variant="flat"
      className={['theme-color-selector-card', className].filter(Boolean).join(' ')}
    >
      <div className="theme-color-selector">
        <div className="theme-color-selector__body">
          <div
            className="theme-color-selector__picker"
            onPointerDown={startInteraction}
          >
            <HexColorPicker color={pickerHex} onChange={handlePickerChange} />
          </div>
          <div className="theme-color-selector__swatches" role="listbox" aria-label="Main colors">
            {swatches.map((color) => {
              const normalized = color.toLowerCase()
              return (
                <button
                  key={color}
                  type="button"
                  role="option"
                  aria-selected={pickerHex === normalized}
                  aria-label={color}
                  className={[
                    'theme-color-selector__swatch',
                    pickerHex === normalized ? 'theme-color-selector__swatch--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ backgroundColor: color }}
                  onClick={() => commitColor(color)}
                />
              )
            })}
          </div>
        </div>
        <div className="theme-color-selector__fields">
          <div className="theme-color-selector__hex">
            <Counter
              size="xs"
              shell
              variant="flat"
              aria-label="Hex color"
              className="theme-color-selector__hex-counter"
              value={0}
              onValueChange={() => {}}
              onStepUp={() => commitColor(stepHexBrightness(pickerHex, 1))}
              onStepDown={() => commitColor(stepHexBrightness(pickerHex, -1))}
              disableStepUp={hsva.v >= 100}
              disableStepDown={hsva.v <= 0}
              valueSlot={
                <span className="theme-counter__value theme-counter__value-row">
                  <span
                    className="theme-color-selector__preview"
                    style={{ backgroundColor: pickerHex }}
                    aria-hidden
                  />
                  <input
                    type="text"
                    className="theme-counter__input font-mono"
                    value={hexInput}
                    onChange={handleHexChange}
                    onBlur={handleHexBlur}
                    onKeyDown={handleHexKeyDown}
                    maxLength={7}
                    spellCheck={false}
                    autoComplete="off"
                    aria-label="Hex color"
                  />
                </span>
              }
            />
          </div>
          <div className="theme-color-selector__rgb">
            <Input
              size="xs"
              variant="flat"
              aria-label="Red"
              inputMode="numeric"
              value={rgbInput.r}
              onChange={handleRgbChange('r')}
              onBlur={handleRgbBlur}
              onKeyDown={handleRgbKeyDown}
              maxLength={3}
              spellCheck={false}
              autoComplete="off"
              className="theme-color-selector__rgb-field"
              controlClassName="font-mono tabular-nums"
              prefix={<span className="type-caption type-muted">R</span>}
            />
            <Input
              size="xs"
              variant="flat"
              aria-label="Green"
              inputMode="numeric"
              value={rgbInput.g}
              onChange={handleRgbChange('g')}
              onBlur={handleRgbBlur}
              onKeyDown={handleRgbKeyDown}
              maxLength={3}
              spellCheck={false}
              autoComplete="off"
              className="theme-color-selector__rgb-field"
              controlClassName="font-mono tabular-nums"
              prefix={<span className="type-caption type-muted">G</span>}
            />
            <Input
              size="xs"
              variant="flat"
              aria-label="Blue"
              inputMode="numeric"
              value={rgbInput.b}
              onChange={handleRgbChange('b')}
              onBlur={handleRgbBlur}
              onKeyDown={handleRgbKeyDown}
              maxLength={3}
              spellCheck={false}
              autoComplete="off"
              className="theme-color-selector__rgb-field"
              controlClassName="font-mono tabular-nums"
              prefix={<span className="type-caption type-muted">B</span>}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
