import {
  ArrowDownUp,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowUpDown,
  Grid3x3,
  Hand,
  LayoutTemplate,
  Magnet,
  Map,
  MousePointer2,
  Move,
  PanelLeft,
  Workflow,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { Edge, Node } from '@xyflow/react'
import type { FlowLayoutMode } from '../../lib/flowEditor/reactFlowBridge'
import type { FlowDocument, FlowNodeChrome } from '../../lib/flowEditor/types'
import { IconButton } from '../IconButton'
import { MenuButton } from '../MenuButton'
import { ThemeScroll } from '../ThemeScroll'
import { ToolbarModeGroup } from '../ToolbarModeGroup'
import { Tooltip } from '../Tooltip'
import { EditorExportMenu } from '../editorContextParts/EditorExportMenu'
import { EditorHistoryTray } from '../editorContextParts/EditorHistoryTray'
import { EditorSaveTray } from '../editorContextParts/EditorSaveTray'
import { EditorTitlebar } from '../editorContextParts/EditorTitlebar'
import { EditorTitleField } from '../editorContextParts/EditorTitleField'
import { EditorTitleRefresh } from '../editorContextParts/EditorTitleRefresh'
import { FlowEditorStyleTray, type FlowEdgeStylePatch } from './FlowEditorStyleTray'

export type FlowCanvasInteractionMode = 'select' | 'pan'
export type FlowSidePanel = 'palette' | 'templates' | 'closed'

export const FLOW_LAYOUT_OPTIONS = [
  { id: 'free' as const, label: 'Freeform', icon: Move },
  { id: 'LR' as const, label: 'Left → right', icon: ArrowRightLeft },
  { id: 'RL' as const, label: 'Right → left', icon: ArrowLeftRight },
  { id: 'TB' as const, label: 'Top → bottom', icon: ArrowDownUp },
  { id: 'BT' as const, label: 'Bottom → top', icon: ArrowUpDown },
]

type FlowEditorToolbarProps = {
  title: string
  onTitleChange: (value: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onSave: () => void
  onExport: (formatId: string) => void
  onRefresh: () => void
  layoutMode: FlowLayoutMode
  onLayoutModeChange: (mode: FlowLayoutMode) => void
  interactionMode: FlowCanvasInteractionMode
  onInteractionModeChange: (mode: FlowCanvasInteractionMode) => void
  snapToGrid: boolean
  onSnapToggle: () => void
  showGrid: boolean
  onGridToggle: () => void
  showMinimap: boolean
  onMinimapToggle: () => void
  sidePanel: FlowSidePanel
  onSidePanelChange: (panel: FlowSidePanel) => void
  selectedNodes: Node[]
  selectedEdges: Edge[]
  canGroup: boolean
  canUngroup: boolean
  flow: FlowDocument
  onPatchNodeChrome: (nodeIds: string[], patch: Partial<FlowNodeChrome>) => void
  onPatchEdges: (edgeIds: string[], patch: FlowEdgeStylePatch) => void
  onGroup: () => void
  onUngroup: () => void
}

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>
}

export function FlowEditorToolbar({
  title,
  onTitleChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  onExport,
  onRefresh,
  layoutMode,
  onLayoutModeChange,
  interactionMode,
  onInteractionModeChange,
  snapToGrid,
  onSnapToggle,
  showGrid,
  onGridToggle,
  showMinimap,
  onMinimapToggle,
  sidePanel,
  onSidePanelChange,
  selectedNodes,
  selectedEdges,
  canGroup,
  canUngroup,
  flow,
  onPatchNodeChrome,
  onPatchEdges,
  onGroup,
  onUngroup,
}: FlowEditorToolbarProps) {
  const layoutOption = FLOW_LAYOUT_OPTIONS.find((o) => o.id === layoutMode) ?? FLOW_LAYOUT_OPTIONS[0]
  const toggleSide = (panel: Exclude<FlowSidePanel, 'closed'>) => {
    onSidePanelChange(sidePanel === panel ? 'closed' : panel)
  }

  return (
    <div className="theme-flow-editor__chrome">
      <EditorTitlebar
        className="theme-flow-editor__titlebar"
        historyTray={
          <EditorHistoryTray canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
        }
        titleBlock={
          <EditorTitleField
            value={title}
            onChange={onTitleChange}
            placeholder="Untitled flow"
            aria-label="Flow title"
          />
        }
        titleRefresh={<EditorTitleRefresh onRefresh={onRefresh} label="Reset flow" />}
        saveTray={<EditorSaveTray onSave={onSave} label="Save flow" />}
        exportMenu={<EditorExportMenu kind="flow" onExport={onExport} />}
      />

      <div className="theme-flow-editor__tools">
        <ThemeScroll axis="horizontal" rail="nano" className="theme-flow-editor__tools-scroll">
          <div className="theme-flow-editor__tools-inner" role="toolbar" aria-label="Flow tools">
            <ToolbarModeGroup aria-label="Library">
              <Tip label={sidePanel === 'palette' ? 'Hide palette' : 'Show palette'}>
                <IconButton
                  icon={PanelLeft}
                  aria-label={sidePanel === 'palette' ? 'Hide palette' : 'Show palette'}
                  aria-pressed={sidePanel === 'palette'}
                  size="xs"
                  variant="tray"
                  active={sidePanel === 'palette'}
                  onClick={() => toggleSide('palette')}
                />
              </Tip>
              <Tip label={sidePanel === 'templates' ? 'Hide templates' : 'Show templates'}>
                <IconButton
                  icon={LayoutTemplate}
                  aria-label={sidePanel === 'templates' ? 'Hide templates' : 'Show templates'}
                  aria-pressed={sidePanel === 'templates'}
                  size="xs"
                  variant="tray"
                  active={sidePanel === 'templates'}
                  onClick={() => toggleSide('templates')}
                />
              </Tip>
            </ToolbarModeGroup>
            <span className="theme-flow-editor__toolbar-divider" role="separator" aria-hidden="true" />
            <ToolbarModeGroup aria-label="Pointer">
              <Tip label="Select — drag on empty canvas to marquee">
                <IconButton
                  icon={MousePointer2}
                  aria-label="Select tool"
                  aria-pressed={interactionMode === 'select'}
                  size="xs"
                  variant="tray"
                  active={interactionMode === 'select'}
                  onClick={() => onInteractionModeChange('select')}
                />
              </Tip>
              <Tip label="Pan — drag to move the canvas">
                <IconButton
                  icon={Hand}
                  aria-label="Pan tool"
                  aria-pressed={interactionMode === 'pan'}
                  size="xs"
                  variant="tray"
                  active={interactionMode === 'pan'}
                  onClick={() => onInteractionModeChange('pan')}
                />
              </Tip>
            </ToolbarModeGroup>
            <span className="theme-flow-editor__toolbar-divider" role="separator" aria-hidden="true" />
            <Tip label={`Layout: ${layoutOption.label}`}>
              <MenuButton
                size="xs"
                variant="tray"
                menuSize="compact"
                portal
                portalZIndex={1200}
                scrollRail="hidden"
                triggerLabelAnim={false}
                iconDropdown
                icon={layoutOption.icon ?? Workflow}
                label="Layout"
                items={FLOW_LAYOUT_OPTIONS.map((o) => ({ id: o.id, label: o.label, icon: o.icon }))}
                selectedId={layoutMode}
                onSelect={(id) => onLayoutModeChange(id as FlowLayoutMode)}
                className="theme-flow-editor__layout-menu"
              />
            </Tip>
            <span className="theme-flow-editor__toolbar-divider" role="separator" aria-hidden="true" />
            <ToolbarModeGroup aria-label="Canvas options">
              <Tip label={snapToGrid ? 'Snap on' : 'Snap off'}>
                <IconButton
                  icon={Magnet}
                  aria-label="Toggle snap to grid"
                  aria-pressed={snapToGrid}
                  size="xs"
                  variant="tray"
                  active={snapToGrid}
                  onClick={onSnapToggle}
                />
              </Tip>
              <Tip label={showGrid ? 'Grid on' : 'Grid off'}>
                <IconButton
                  icon={Grid3x3}
                  aria-label="Toggle background grid"
                  aria-pressed={showGrid}
                  size="xs"
                  variant="tray"
                  active={showGrid}
                  onClick={onGridToggle}
                />
              </Tip>
              <Tip label={showMinimap ? 'Hide minimap' : 'Show minimap'}>
                <IconButton
                  icon={Map}
                  aria-label="Toggle minimap"
                  aria-pressed={showMinimap}
                  size="xs"
                  variant="tray"
                  active={showMinimap}
                  onClick={onMinimapToggle}
                />
              </Tip>
            </ToolbarModeGroup>
            <FlowEditorStyleTray
              flow={flow}
              selectedNodes={selectedNodes}
              selectedEdges={selectedEdges}
              canGroup={canGroup}
              canUngroup={canUngroup}
              onPatchNodeChrome={onPatchNodeChrome}
              onPatchEdges={onPatchEdges}
              onGroup={onGroup}
              onUngroup={onUngroup}
            />
          </div>
        </ThemeScroll>
      </div>
    </div>
  )
}
