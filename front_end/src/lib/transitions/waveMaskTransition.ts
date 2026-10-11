/** SVG wave mask polygons — ref.gsap-transition-7 (pulse) · ref.gsap-transition-8 (scroll). */

export type WaveMaskVariant = 'pulse' | 'scroll'

export type WaveMaskWaveConfig = {
  waveCount: number
  amplitude: number
  detail: number
  speed: number
}

export const WAVE_MASK_PULSE_CONFIG: WaveMaskWaveConfig = {
  waveCount: 8,
  amplitude: 12,
  detail: 5,
  speed: 1,
}

export const WAVE_MASK_SCROLL_CONFIG: WaveMaskWaveConfig = {
  waveCount: 5,
  amplitude: 10,
  detail: 30,
  speed: 0.4,
}

export function waveMaskConfigForVariant(variant: WaveMaskVariant): WaveMaskWaveConfig {
  return variant === 'pulse' ? WAVE_MASK_PULSE_CONFIG : WAVE_MASK_SCROLL_CONFIG
}

/** Closed polygon `points` for one wave band inside an SVG mask. */
export function waveMaskPolygonPoints(
  width: number,
  height: number,
  waveIndex: number,
  config: WaveMaskWaveConfig,
  time: number,
  waveYOffset: number,
  variant: WaveMaskVariant,
): string {
  const { waveCount, amplitude, detail, speed } = config
  const offset = (1 - waveIndex / waveCount) * (waveCount / (variant === 'pulse' ? 4 : 6))
  let pts = ''

  const start = variant === 'pulse' ? 0 : -1
  for (let i = start; i < width + detail; i += detail) {
    let y = variant === 'pulse' ? height / 2 : height - waveYOffset

    if (variant === 'pulse') {
      y += Math.sin(i * 0.01 - time + offset) * amplitude
      y += Math.sin(i * 0.02 - time + offset) * amplitude
      y += Math.sin(i * 0.04 - time + 10 + offset) * amplitude
    } else {
      y += Math.sin(i * 0.003 - time / speed + offset) * amplitude
      y += Math.sin(i * 0.004 - time / speed + offset) * amplitude
      y += Math.sin(i * -0.011 - time / speed + 20 + offset) * amplitude
    }

    pts += `${i.toFixed(2)},${y.toFixed(2)} `
  }

  if (variant === 'pulse') {
    return `0,0 0,${height / 2} ${pts}${width},0`
  }

  return `-20,-20 -20,${height / 2} ${pts}${width},-20`
}

export function waveMaskRevealDistance(height: number, variant: WaveMaskVariant): number {
  return variant === 'pulse' ? height * 0.52 : height / 2
}

export const WAVE_MASK_REVEAL_DURATION = 1.15
