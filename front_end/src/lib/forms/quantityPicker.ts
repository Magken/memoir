export function buildQuantitySteps(min: number, max: number, step: number): number[] {
  if (step <= 0) return [min]
  const steps: number[] = []
  for (let value = min; value <= max; value += step) {
    steps.push(value)
  }
  return steps
}

export function clampQuantity(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value))
  if (step <= 0) return clamped
  const stepsFromMin = Math.round((clamped - min) / step)
  return min + stepsFromMin * step
}

export function quantityTrackOffset(value: number, min: number, step: number): number {
  if (step <= 0) return min - value
  const index = Math.round((value - min) / step)
  return -index
}

export function parseQuantityInput(raw: string): number | null {
  if (raw.trim() === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/** Skip animated track when the step list would be too heavy. */
export function shouldUseQuantityTrack(min: number, max: number, step: number, limit = 320): boolean {
  if (step <= 0) return true
  return Math.floor((max - min) / step) + 1 <= limit
}
