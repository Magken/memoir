/**
 * Dot Pad X tactile graphic: the 30×10-cell graphic area is 60×40 pins (2×4 per cell).
 * An object's alpha mask becomes raised pins along its outline, and the pins pack into
 * the SDK graphic hex (one byte per cell, row-major).
 */
import { DOTPAD_GRAPHIC_COLUMNS, DOTPAD_GRAPHIC_ROWS, DOTPAD_TEXT_CELLS } from './dotpadClient'

export const DOTPAD_DOT_COLUMNS = DOTPAD_GRAPHIC_COLUMNS * 2
export const DOTPAD_DOT_ROWS = DOTPAD_GRAPHIC_ROWS * 4

export type BraillePage = { start: number; end: number; line: string }

/**
 * Splits copy into braille-line pages of at most `cells` characters, breaking between words.
 * `start`/`end` index the original text so the screen can mark the page being read.
 * Lowercased: grade 1 spends an extra cell on every capital.
 */
export function braillePages(text: string, cells = DOTPAD_TEXT_CELLS): BraillePage[] {
  const pages: BraillePage[] = []
  let page: { start: number; end: number; words: string[] } | null = null
  for (const match of text.matchAll(/\S+/g)) {
    const word = match[0].toLowerCase()
    const start = match.index
    const end = start + match[0].length
    const length = page ? page.words.join(' ').length + 1 + word.length : word.length
    if (page && length <= cells) {
      page.words.push(word)
      page.end = end
      continue
    }
    if (page) pages.push({ start: page.start, end: page.end, line: page.words.join(' ').slice(0, cells) })
    page = { start, end, words: [word] }
  }
  if (page) pages.push({ start: page.start, end: page.end, line: page.words.join(' ').slice(0, cells) })
  return pages
}

/** Index of the page that holds `charIndex`. */
export function braillePageAt(pages: readonly BraillePage[], charIndex: number): number {
  const index = pages.findIndex((page) => charIndex < page.end)
  return index < 0 ? pages.length - 1 : index
}

/** 1 where a pin is raised. `rgba` is a DOTPAD_DOT_COLUMNS × DOTPAD_DOT_ROWS image. */
export function outlineDots(
  rgba: ArrayLike<number>,
  columns = DOTPAD_DOT_COLUMNS,
  rows = DOTPAD_DOT_ROWS,
  threshold = 32,
): Uint8Array {
  if (rgba.length !== columns * rows * 4) throw new Error('Bad image size')
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < columns && y < rows && rgba[(y * columns + x) * 4 + 3] > threshold
  const dots = new Uint8Array(columns * rows)
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (!inside(x, y)) continue
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)
      if (edge) dots[y * columns + x] = 1
    }
  }
  return dots
}

/**
 * Outline plus internal relief: inside the object, pins rise where shading changes sharply
 * (folds, eyes, carved lines). `edge` is the luminance gradient (0–1) a pin needs; lower
 * shows more detail, so zooming in can lower it.
 */
export function detailDots(
  rgba: ArrayLike<number>,
  edge: number,
  columns = DOTPAD_DOT_COLUMNS,
  rows = DOTPAD_DOT_ROWS,
  threshold = 32,
): Uint8Array {
  const dots = outlineDots(rgba, columns, rows, threshold)
  const lum = new Float32Array(columns * rows)
  for (let i = 0; i < columns * rows; i += 1) {
    lum[i] = rgba[i * 4 + 3] > threshold ? (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255 : -1
  }
  const at = (x: number, y: number) => lum[y * columns + x]
  for (let y = 1; y < rows - 1; y += 1) {
    for (let x = 1; x < columns - 1; x += 1) {
      if (at(x, y) < 0) continue
      let inside = true
      for (let dy = -1; dy <= 1 && inside; dy += 1) for (let dx = -1; dx <= 1; dx += 1) if (at(x + dx, y + dy) < 0) inside = false
      if (!inside) continue
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
      if (Math.hypot(gx, gy) / 4 > edge) dots[y * columns + x] = 1
    }
  }
  return dots
}

/** Scene relief for an opaque image (the splat): pins rise where luminance changes sharply. */
export function sceneDots(rgba: ArrayLike<number>, edge: number, columns = DOTPAD_DOT_COLUMNS, rows = DOTPAD_DOT_ROWS): Uint8Array {
  if (rgba.length !== columns * rows * 4) throw new Error('Bad image size')
  const lum = new Float32Array(columns * rows)
  for (let i = 0; i < columns * rows; i += 1) {
    lum[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255
  }
  const at = (x: number, y: number) => lum[Math.min(rows - 1, Math.max(0, y)) * columns + Math.min(columns - 1, Math.max(0, x))]
  const dots = new Uint8Array(columns * rows)
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
      if (Math.hypot(gx, gy) / 4 > edge) dots[y * columns + x] = 1
    }
  }
  return dots
}

/** A raised one-pin frame round the whole graphic area — shown until the object renders. */
export function borderDots(columns = DOTPAD_DOT_COLUMNS, rows = DOTPAD_DOT_ROWS): Uint8Array {
  const dots = new Uint8Array(columns * rows)
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (x === 0 || y === 0 || x === columns - 1 || y === rows - 1) dots[y * columns + x] = 1
    }
  }
  return dots
}

/** Cell byte: bits 0–3 are the left pin column top to bottom, bits 4–7 the right column. */
export function graphicHex(dots: ArrayLike<number>, columns = DOTPAD_DOT_COLUMNS, rows = DOTPAD_DOT_ROWS): string {
  if (dots.length !== columns * rows || columns % 2 || rows % 4) throw new Error('Bad graphic size')
  let hex = ''
  for (let cy = 0; cy < rows; cy += 4) {
    for (let cx = 0; cx < columns; cx += 2) {
      let byte = 0
      for (let i = 0; i < 4; i += 1) {
        if (dots[(cy + i) * columns + cx]) byte |= 1 << i
        if (dots[(cy + i) * columns + cx + 1]) byte |= 1 << (i + 4)
      }
      hex += byte.toString(16).padStart(2, '0')
    }
  }
  return hex
}

/** Paints every pin of the pad into `canvas`, raised pins bright, lowered pins dim. */
export function paintDots(canvas: HTMLCanvasElement, dots: ArrayLike<number>, columns = DOTPAD_DOT_COLUMNS, rows = DOTPAD_DOT_ROWS) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const ratio = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const pitch = Math.min(width / columns, height / rows)
  const left = (width - pitch * columns) / 2
  const top = (height - pitch * rows) / 2
  const radius = Math.max(0.6, pitch * 0.32)
  const pass = (raised: boolean) => {
    ctx.fillStyle = raised ? '#ffffff' : 'rgb(255 255 255 / 0.1)'
    ctx.shadowColor = raised ? 'rgb(255 255 255 / 0.9)' : 'transparent'
    ctx.shadowBlur = raised ? pitch * 0.6 : 0
    ctx.beginPath()
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        if (Boolean(dots[y * columns + x]) !== raised) continue
        const cx = left + (x + 0.5) * pitch
        const cy = top + (y + 0.5) * pitch
        ctx.moveTo(cx + radius, cy)
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      }
    }
    ctx.fill()
  }
  pass(false)
  pass(true)
}
