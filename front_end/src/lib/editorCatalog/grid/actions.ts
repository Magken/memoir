/**
 * DataGridEditor MCT action catalog — props, UI toggles, interaction notation.
 */
import type { EditorAction } from '../types'

export type GridEditorAction = EditorAction

export const GRID_EDITOR_ACTIONS: GridEditorAction[] = [
  {
    id: 'grid.action.undo',
    label: 'Undo',
    kind: 'command',
    target: 'DataGridEditor toolbar / Ctrl+Z',
    notation: 'command.undo',
    implemented: true,
    relatedFeatures: ['grid.sheet.cells'],
  },
  {
    id: 'grid.action.redo',
    label: 'Redo',
    kind: 'command',
    target: 'DataGridEditor toolbar / Ctrl+Y',
    notation: 'command.redo',
    implemented: true,
    relatedFeatures: ['grid.sheet.cells'],
  },
  {
    id: 'grid.action.import-csv',
    label: 'Import CSV',
    kind: 'command',
    target: 'DataGridEditor file menu',
    notation: 'io.import csv → payload.sheet',
    implemented: true,
    relatedFeatures: ['grid.io.csv', 'grid.sheet.cells', 'grid.sheet.columns'],
  },
  {
    id: 'grid.action.fill-handle',
    label: 'Fill handle drag',
    kind: 'ui',
    target: 'Glide fill handle overlay',
    notation: 'interaction.fill-handle @range',
    implemented: false,
    relatedFeatures: ['grid.interaction.fill-handle'],
  },
]

export function gridActionById(id: string): GridEditorAction | undefined {
  return GRID_EDITOR_ACTIONS.find((action) => action.id === id)
}
