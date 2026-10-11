import type { EditorAction } from '../types'

export type ForceEditorAction = EditorAction

export const FORCE_EDITOR_ACTIONS: ForceEditorAction[] = [
  {
    id: 'force.action.zoom-in',
    label: 'Zoom in',
    kind: 'ui',
    target: 'ForceGraphCanvasViewport zoom overlay',
    notation: 'interaction.zoom.in',
    implemented: true,
    relatedFeatures: ['force.chrome.canvas'],
  },
  {
    id: 'force.action.zoom-out',
    label: 'Zoom out',
    kind: 'ui',
    target: 'ForceGraphCanvasViewport zoom overlay',
    notation: 'interaction.zoom.out',
    implemented: true,
    relatedFeatures: ['force.chrome.canvas'],
  },
  {
    id: 'force.action.zoom-fit',
    label: 'Zoom to fit',
    kind: 'ui',
    target: 'ForceGraphCanvasViewport zoom overlay',
    notation: 'interaction.zoom.fit',
    implemented: true,
    relatedFeatures: ['force.chrome.canvas'],
    notes: 'Fits the force layout inside the viewport.',
  },
]

export function forceActionById(id: string): ForceEditorAction | undefined {
  return FORCE_EDITOR_ACTIONS.find((action) => action.id === id)
}
