import {
  FolderOpen,
  HelpCircle,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react'
import { CascadeMenuButton } from '../CascadeMenuButton'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'

export type DrawCanvasFileAction =
  | 'load'
  | 'save'
  | 'export-json'
  | 'export-image'
  | 'find'
  | 'help'
  | 'clear'
  | 'canvas-bg'
  | 'pref-box-contain'
  | 'pref-box-overlap'
  | 'pref-tool-lock'
  | 'pref-snap'
  | 'pref-grid'
  | 'pref-zen'
  | 'pref-view'
  | 'pref-stats'
  | 'pref-binding'
  | 'pref-midpoint'

type DrawCanvasFileMenuProps = {
  onAction: (id: DrawCanvasFileAction) => void
  prefs: {
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
}

const FILE_ITEMS = (prefs: DrawCanvasFileMenuProps['prefs']): CascadeMenuItem[] => [
  { id: 'load', label: 'Load scene', icon: FolderOpen },
  { id: 'find', label: 'Find on canvas', icon: Search },
  { id: 'help', label: 'Help', icon: HelpCircle },
  { id: 'clear', label: 'Clear canvas', icon: Trash2 },
  { id: 'sep-1', label: '—', disabled: true },
  { id: 'canvas-bg', label: 'Canvas background' },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: Settings2,
    children: [
      {
        id: 'pref-box-contain',
        label: 'Box: contain',
        checked: prefs.boxSelectionMode === 'contain',
      },
      {
        id: 'pref-box-overlap',
        label: 'Box: overlap',
        checked: prefs.boxSelectionMode === 'overlap',
      },
      { id: 'pref-tool-lock', label: 'Tool lock', checked: prefs.toolLocked },
      { id: 'pref-snap', label: 'Snap to objects', checked: prefs.objectsSnapModeEnabled },
      { id: 'pref-grid', label: 'Grid', checked: prefs.gridModeEnabled },
      { id: 'pref-zen', label: 'Zen mode', checked: prefs.zenModeEnabled },
      { id: 'pref-view', label: 'View mode', checked: prefs.viewModeEnabled },
      { id: 'pref-stats', label: 'Element properties', checked: prefs.statsOpen },
      { id: 'pref-binding', label: 'Arrow binding', checked: prefs.isBindingEnabled },
      { id: 'pref-midpoint', label: 'Midpoint snapping', checked: prefs.objectsSnapMidpoints },
    ],
  },
]

export function DrawCanvasFileMenu({ onAction, prefs }: DrawCanvasFileMenuProps) {
  return (
    <CascadeMenuButton
      items={FILE_ITEMS(prefs)}
      onSelect={(id) => {
        if (id === 'sep-1' || id === 'preferences') return
        onAction(id as DrawCanvasFileAction)
      }}
      label="File"
      size="xs"
      variant="tray"
      menuSize="compact"
      scrollRail="hidden"
      scrollClouds
      triggerLabelAnim={false}
    />
  )
}
