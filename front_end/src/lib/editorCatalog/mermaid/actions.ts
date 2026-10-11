/**
 * MermaidRenderer MCT action catalog — props, UI toggles, interaction notation.
 */
import type { EditorAction } from '../types'

export type MermaidEditorAction = EditorAction

export const MERMAID_EDITOR_ACTIONS: MermaidEditorAction[] = [
  {
    id: 'mermaid.action.zoom-in',
    label: 'Zoom in',
    kind: 'ui',
    target: 'MermaidCanvasViewport zoom overlay',
    notation: 'interaction.zoom.in',
    implemented: true,
    relatedFeatures: ['mermaid.chrome.canvas'],
  },
  {
    id: 'mermaid.action.zoom-out',
    label: 'Zoom out',
    kind: 'ui',
    target: 'MermaidCanvasViewport zoom overlay',
    notation: 'interaction.zoom.out',
    implemented: true,
    relatedFeatures: ['mermaid.chrome.canvas'],
  },
  {
    id: 'mermaid.action.zoom-fit',
    label: 'Zoom to fit',
    kind: 'ui',
    target: 'MermaidCanvasViewport zoom overlay',
    notation: 'interaction.zoom.fit',
    implemented: true,
    relatedFeatures: ['mermaid.chrome.canvas'],
    notes: 'Fits the rendered diagram inside the viewport.',
  },
]

export function mermaidActionById(id: string): MermaidEditorAction | undefined {
  return MERMAID_EDITOR_ACTIONS.find((action) => action.id === id)
}
