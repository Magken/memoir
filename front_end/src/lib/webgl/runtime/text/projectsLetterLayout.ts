/** One-row Megrim Projects — ceramic glyphs, play-in expand, no leave reverse. */

import { GRAS_LETTER_SIZE, GRAS_LETTER_TRACKING } from './grasLetterLayout'
import {
  aboutUsVisibleWidth,
  expandRowLayout,
  type AboutUsPackAlign,
  type AboutUsRowLayout,
} from './aboutUsLetterLayout'

export const PROJECTS_STEM = 'P'

/** Remainder that clip-slides in to the right of P on play-in. */
export const PROJECTS_EXPAND = { prefix: '', suffix: 'rojects' } as const

export function projectsRowLayout(
  widthOf: (ch: string) => number,
  tracking = GRAS_LETTER_TRACKING,
): AboutUsRowLayout {
  return expandRowLayout(PROJECTS_STEM, PROJECTS_EXPAND.prefix, PROJECTS_EXPAND.suffix, widthOf, tracking)
}

export type ProjectsPack = {
  x: number
  y: number
  totalWidth: number
  totalHeight: number
}

/** One-row pack. `left` keeps the left of P on the origin so a scene pin is the start of Projects. */
export function projectsPackX(
  layout: AboutUsRowLayout,
  progress: number,
  align: AboutUsPackAlign = 'center',
  rowHeight = GRAS_LETTER_SIZE,
): ProjectsPack {
  const width = aboutUsVisibleWidth(layout, progress)
  const left = align === 'left' ? 0 : -width / 2
  return {
    x: left + width / 2,
    y: 0,
    totalWidth: width,
    totalHeight: rowHeight,
  }
}

/** Glyph fronts face +Z — Projects Home looks from that side. Viewer keeps `GRAS_FRONT_YAW`. */
export const PROJECTS_SCENE_FRONT_YAW = 0

/** Local P and last-letter centres as the row expands. */
export function projectsIdleCenters(
  layout: AboutUsRowLayout,
  progress: number,
  align: AboutUsPackAlign = 'center',
  rowHeight = GRAS_LETTER_SIZE,
): { x: [number, number]; y: [number, number] } {
  const t = Math.min(1, Math.max(0, progress))
  const pack = projectsPackX(layout, progress, align, rowHeight)
  const lastX = layout.centersX[layout.centersX.length - 1] ?? 0
  return {
    x: [pack.x + layout.stemCenterX * t, pack.x + lastX * t],
    y: [pack.y, pack.y],
  }
}
