/**
 * Browser calls for the DataFeel buzz page. The dev plugin forwards these to the local kit API.
 */

export type HapticDot = {
  address: number
  skinTemperature: number
}

export type HapticDots = {
  port: string
  dots: HapticDot[]
}

export function parseHapticDots(body: unknown): HapticDots {
  if (!body || typeof body !== 'object') throw new Error('Bad dots response')
  const record = body as { port?: unknown; dots?: unknown; error?: unknown }
  if (typeof record.error === 'string') throw new Error(record.error)
  if (typeof record.port !== 'string' || !Array.isArray(record.dots)) throw new Error('Bad dots response')
  const dots = record.dots.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Bad dots response')
    const dot = item as { address?: unknown; skinTemperature?: unknown }
    if (typeof dot.address !== 'number' || typeof dot.skinTemperature !== 'number') {
      throw new Error('Bad dots response')
    }
    return { address: dot.address, skinTemperature: dot.skinTemperature }
  })
  return { port: record.port, dots }
}

/** One button press. Omit address to buzz every Dot that answers. */
export function buzzBody(address?: number) {
  return {
    ...(address === undefined ? {} : { address }),
    milliseconds: 500,
    intensity: 1,
    frequency: 170,
  }
}
