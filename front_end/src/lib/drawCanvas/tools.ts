import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Circle,
  Diamond,
  Eraser,
  Frame,
  Hand,
  Image as ImageIcon,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  StickyNote,
  Type,
} from 'lucide-react'
import type { ToolType } from '@excalidraw/excalidraw/types'

/** Primary ribbon tools (Excalidraw 0.18 ToolType — no lasso in this package). */
export const DRAW_PRIMARY_TOOLS = [
  { id: 'hand', label: 'Hand', icon: Hand, shortcut: 'H' },
  { id: 'selection', label: 'Selection', icon: MousePointer2, shortcut: 'V' },
  { id: 'rectangle', label: 'Rectangle', icon: Square, shortcut: 'R' },
  { id: 'diamond', label: 'Diamond', icon: Diamond, shortcut: 'D' },
  { id: 'ellipse', label: 'Ellipse', icon: Circle, shortcut: 'O' },
  { id: 'arrow', label: 'Arrow', icon: ArrowRight, shortcut: 'A' },
  { id: 'line', label: 'Line', icon: Minus, shortcut: 'L' },
  { id: 'freedraw', label: 'Draw', icon: Pencil, shortcut: 'P' },
  { id: 'text', label: 'Text', icon: Type, shortcut: 'T' },
  { id: 'image', label: 'Image', icon: ImageIcon, shortcut: '9' },
  { id: 'eraser', label: 'Eraser', icon: Eraser, shortcut: 'E' },
] as const satisfies readonly {
  id: ToolType
  label: string
  icon: LucideIcon
  shortcut: string
}[]

export const DRAW_EXTRA_TOOLS = [
  { id: 'frame', label: 'Frame', icon: Frame, shortcut: 'F' },
  { id: 'embeddable', label: 'Embed', icon: StickyNote, shortcut: '' },
] as const satisfies readonly {
  id: ToolType
  label: string
  icon: LucideIcon
  shortcut: string
}[]

export type DrawToolId = (typeof DRAW_PRIMARY_TOOLS)[number]['id'] | (typeof DRAW_EXTRA_TOOLS)[number]['id']

export function isDrawToolId(value: string): value is DrawToolId {
  return (
    DRAW_PRIMARY_TOOLS.some((t) => t.id === value) || DRAW_EXTRA_TOOLS.some((t) => t.id === value)
  )
}

/** Tools that show the property panel even with an empty selection. */
export const DRAW_PROPERTY_TOOLS = new Set<string>([
  'rectangle',
  'diamond',
  'ellipse',
  'arrow',
  'line',
  'freedraw',
  'text',
  'image',
  'frame',
  'embeddable',
])
