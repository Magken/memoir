export type DrawCanvasPrefs = {
  boxSelectionMode: 'contain' | 'overlap'
  toolLocked: boolean
  objectsSnapModeEnabled: boolean
  gridModeEnabled: boolean
  zenModeEnabled: boolean
  viewModeEnabled: boolean
  statsOpen: boolean
  isBindingEnabled: boolean
  objectsSnapMidpoints: boolean
}

export const DEFAULT_DRAW_PREFS: DrawCanvasPrefs = {
  boxSelectionMode: 'overlap',
  toolLocked: false,
  objectsSnapModeEnabled: false,
  gridModeEnabled: false,
  zenModeEnabled: false,
  viewModeEnabled: false,
  statsOpen: false,
  isBindingEnabled: true,
  objectsSnapMidpoints: true,
}

export const DRAW_PREF_LABELS: Record<keyof DrawCanvasPrefs, string> = {
  boxSelectionMode: 'Box selection mode',
  toolLocked: 'Tool lock',
  objectsSnapModeEnabled: 'Snap to objects',
  gridModeEnabled: 'Grid',
  zenModeEnabled: 'Zen mode',
  viewModeEnabled: 'View mode',
  statsOpen: 'Element properties',
  isBindingEnabled: 'Arrow binding',
  objectsSnapMidpoints: 'Midpoint snapping',
}
