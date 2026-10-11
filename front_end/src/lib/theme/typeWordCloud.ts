/**
 * Flat type word cloud — spiral pack of weighted display words.
 * Presentation (font / color) lives in CSS: `--font-display` · `--theme-accent`.
 */

import {
  ISOMETRIC_WORD_CLOUD_ENTRIES,
  type IsometricWordCloudEntry,
} from '../isometrics/isometricWordCloud'

export const TYPE_WORD_CLOUD_ENTRIES = ISOMETRIC_WORD_CLOUD_ENTRIES

export const TYPE_WORD_CLOUD = {
  heroFontPx: 88,
  minFontPx: 12,
  midFontPx: 32,
  packPadding: 5,
  spiralStep: 0.42,
  spiralGrowth: 6,
} as const

export type TypeWordCloudCell = {
  readonly id: string
  readonly word: string
  readonly weight: number
  readonly fontPx: number
  readonly rotateDeg: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

type PlacedBox = { x: number; y: number; w: number; h: number }

function seededUnit(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

export function typeWordCloudFontPx(weight: number): number {
  const { heroFontPx, minFontPx, midFontPx } = TYPE_WORD_CLOUD
  if (weight >= 100) return heroFontPx
  const t = Math.min(1, Math.max(0, (weight - 8) / (58 - 8)))
  return minFontPx + (midFontPx - minFontPx) * t
}

function rotation(entry: IsometricWordCloudEntry, index: number): number {
  if (entry.word === 'V' || entry.weight >= 28) return 0
  if (entry.weight >= 16) return index % 5 === 0 ? 90 : 0
  return index % 7 === 0 ? -20 : index % 6 === 0 ? 20 : 0
}

function rotatedAabb(width: number, height: number, rotateDeg: number): { w: number; h: number } {
  const rad = (rotateDeg * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  return { w: width * c + height * s, h: width * s + height * c }
}

function boxesOverlap(a: PlacedBox, b: PlacedBox, pad: number): boolean {
  return !(
    a.x + a.w / 2 + pad <= b.x - b.w / 2 ||
    a.x - a.w / 2 - pad >= b.x + b.w / 2 ||
    a.y + a.h / 2 + pad <= b.y - b.h / 2 ||
    a.y - a.h / 2 - pad >= b.y + b.h / 2
  )
}

export type TypeWordCloudBounds = ReadonlyMap<string, { width: number; height: number }>

export function typeWordCloudEstimateBounds(
  word: string,
  fontPx: number,
): { width: number; height: number } {
  return {
    width: Math.max(fontPx * 0.55, word.length * fontPx * 0.56),
    height: fontPx * 1.05,
  }
}

export function typeWordCloudCells(
  entries: readonly IsometricWordCloudEntry[] = TYPE_WORD_CLOUD_ENTRIES,
  measuredBounds?: TypeWordCloudBounds,
): { cells: readonly TypeWordCloudCell[]; bounds: { w: number; h: number } } {
  const { packPadding, spiralStep, spiralGrowth } = TYPE_WORD_CLOUD
  const rand = seededUnit(0x54_59_50_45) // "TYPE"
  const ranked = [...entries].sort((a, b) => b.weight - a.weight)
  const placed: PlacedBox[] = []
  const rawCells: TypeWordCloudCell[] = []

  for (let index = 0; index < ranked.length; index += 1) {
    const entry = ranked[index]!
    const fontPx = typeWordCloudFontPx(entry.weight)
    const raw = measuredBounds?.get(entry.word) ?? typeWordCloudEstimateBounds(entry.word, fontPx)
    const rotateDeg = rotation(entry, index)
    const { w, h } = rotatedAabb(raw.width, raw.height, rotateDeg)

    let x = 0
    let y = 0
    let ok = true

    if (index > 0) {
      ok = false
      const dir = rand() < 0.5 ? 1 : -1
      for (let step = 0; step < 1600; step += 1) {
        const t = step * spiralStep
        const r = 10 + t * spiralGrowth
        const angle = dir * t
        x = Math.cos(angle) * r
        y = Math.sin(angle) * r * 0.78
        if (!placed.some((box) => boxesOverlap({ x, y, w, h }, box, packPadding))) {
          ok = true
          break
        }
      }
    }

    if (!ok) continue
    placed.push({ x, y, w, h })
    rawCells.push({
      id: `${index}-${entry.word}`,
      word: entry.word,
      weight: entry.weight,
      fontPx,
      rotateDeg,
      x,
      y,
      width: raw.width,
      height: raw.height,
    })
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const cell of rawCells) {
    const { w, h } = rotatedAabb(cell.width, cell.height, cell.rotateDeg)
    minX = Math.min(minX, cell.x - w / 2)
    maxX = Math.max(maxX, cell.x + w / 2)
    minY = Math.min(minY, cell.y - h / 2)
    maxY = Math.max(maxY, cell.y + h / 2)
  }

  if (!Number.isFinite(minX)) return { cells: [], bounds: { w: 1, h: 1 } }

  const pad = 28
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  return {
    cells: rawCells.map((cell) => ({
      ...cell,
      x: cell.x - centerX,
      y: cell.y - centerY,
    })),
    bounds: {
      w: Math.max(1, maxX - minX + pad * 2),
      h: Math.max(1, maxY - minY + pad * 2),
    },
  }
}
