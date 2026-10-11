/**
 * DrawCanvas MCT action catalog — props, UI toggles, interaction notation.
 */
import type { EditorAction } from '../types'

export type DrawEditorAction = EditorAction

export const DRAW_EDITOR_ACTIONS: DrawEditorAction[] = [
  {
    id: 'draw.action.export-png',
    label: 'Export PNG',
    kind: 'command',
    target: 'DrawCanvas file menu / toolbar',
    notation: 'io.export png',
    implemented: true,
    relatedFeatures: ['draw.io.png'],
    notes: 'Rasterizes the live canvas to a downloadable PNG.',
  },
  {
    id: 'draw.action.export-svg',
    label: 'Export SVG',
    kind: 'command',
    target: 'DrawCanvas file menu / toolbar',
    notation: 'io.export svg',
    implemented: true,
    relatedFeatures: ['draw.io.svg'],
    notes: 'Serializes the live canvas to a downloadable SVG.',
  },
  {
    id: 'draw.action.zoom-fit',
    label: 'Zoom to fit',
    kind: 'ui',
    target: 'DrawCanvas toolbar zoom overlay',
    notation: 'interaction.zoom.fit',
    implemented: true,
    relatedFeatures: ['draw.io.excalidraw', 'draw.io.native-json'],
    notes: 'Fits the scene bounding box inside the viewport.',
  },
]

export function drawActionById(id: string): DrawEditorAction | undefined {
  return DRAW_EDITOR_ACTIONS.find((action) => action.id === id)
}
