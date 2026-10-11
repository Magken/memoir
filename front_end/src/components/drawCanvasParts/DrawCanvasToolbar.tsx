import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconButton } from '../IconButton'
import { ThemeScroll } from '../ThemeScroll'
import { ToolbarModeGroup } from '../ToolbarModeGroup'
import { Tooltip } from '../Tooltip'
import { EditorExportMenu } from '../editorContextParts/EditorExportMenu'
import { EditorHistoryTray } from '../editorContextParts/EditorHistoryTray'
import { EditorSaveTray } from '../editorContextParts/EditorSaveTray'
import { EditorTitlebar } from '../editorContextParts/EditorTitlebar'
import { EditorTitleField } from '../editorContextParts/EditorTitleField'
import { EditorTitleRefresh } from '../editorContextParts/EditorTitleRefresh'
import { DRAW_EXTRA_TOOLS, DRAW_PRIMARY_TOOLS, type DrawToolId } from '../../lib/drawCanvas/tools'
import { DrawCanvasFileMenu, type DrawCanvasFileAction } from './DrawCanvasFileMenu'
import type { DrawCanvasPrefs } from '../../lib/drawCanvas/prefs'
import {
  DrawCanvasFormatRibbon,
  type DrawCanvasFormatRibbonProps,
} from './DrawCanvasFormatRibbon'

type DrawCanvasToolbarProps = {
  title: string
  onTitleChange: (value: string) => void
  activeTool: string
  onToolSelect: (id: DrawToolId) => void
  onUndo: () => void
  onRedo: () => void
  toolLocked: boolean
  onToggleToolLock: () => void
  onFileAction: (id: DrawCanvasFileAction) => void
  onSave: () => void
  onExport: (formatId: string) => void
  onRefresh: () => void
  prefs: DrawCanvasPrefs
  hint: string
  formatOpen: boolean
  formatProps: Omit<DrawCanvasFormatRibbonProps, 'open'>
}

function ToolbarTip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>
}

export function DrawCanvasToolbar({
  title,
  onTitleChange,
  activeTool,
  onToolSelect,
  onUndo,
  onRedo,
  toolLocked,
  onToggleToolLock,
  onFileAction,
  onSave,
  onExport,
  onRefresh,
  prefs,
  hint,
  formatOpen,
  formatProps,
}: DrawCanvasToolbarProps) {
  const navigateCluster = DRAW_PRIMARY_TOOLS.slice(0, 2)
  const shapeCluster = DRAW_PRIMARY_TOOLS.slice(2, 7)
  const inkCluster = DRAW_PRIMARY_TOOLS.slice(7)

  return (
    <div className="theme-draw-canvas__chrome">
      {/* Layer 1 — titlebar */}
      <EditorTitlebar
        className="theme-draw-canvas__titlebar"
        fileMenu={<DrawCanvasFileMenu onAction={onFileAction} prefs={prefs} />}
        historyTray={
          <EditorHistoryTray canUndo canRedo onUndo={onUndo} onRedo={onRedo} />
        }
        titleBlock={
          <EditorTitleField
            value={title}
            onChange={onTitleChange}
            placeholder="Untitled drawing"
            aria-label="Drawing title"
          />
        }
        titleRefresh={<EditorTitleRefresh onRefresh={onRefresh} label="Clear scene" />}
        saveTray={<EditorSaveTray onSave={onSave} label="Save drawing" />}
        exportMenu={<EditorExportMenu kind="draw" onExport={onExport} />}
      />

      {/* Layer 2 — single-row tools */}
      <div className="theme-draw-canvas__ribbon theme-draw-canvas__ribbon--tools">
        <ThemeScroll axis="horizontal" rail="nano" className="theme-draw-canvas__ribbon-scroll">
          <div className="theme-draw-canvas__ribbon-inner" role="toolbar" aria-label="Drawing tools">
            <ToolbarModeGroup aria-label="Navigate tools">
              {navigateCluster.map((tool) => (
                <ToolbarTip key={tool.id} label={`${tool.label} (${tool.shortcut})`}>
                  <IconButton
                    icon={tool.icon}
                    aria-label={tool.label}
                    aria-pressed={activeTool === tool.id}
                    active={activeTool === tool.id}
                    size="xs"
                    onClick={() => onToolSelect(tool.id)}
                  />
                </ToolbarTip>
              ))}
            </ToolbarModeGroup>

            <span className="theme-draw-canvas__toolbar-divider" role="separator" aria-hidden />

            <ToolbarModeGroup aria-label="Shape tools">
              {shapeCluster.map((tool) => (
                <ToolbarTip key={tool.id} label={`${tool.label} (${tool.shortcut})`}>
                  <IconButton
                    icon={tool.icon}
                    aria-label={tool.label}
                    aria-pressed={activeTool === tool.id}
                    active={activeTool === tool.id}
                    size="xs"
                    onClick={() => onToolSelect(tool.id)}
                  />
                </ToolbarTip>
              ))}
            </ToolbarModeGroup>

            <span className="theme-draw-canvas__toolbar-divider" role="separator" aria-hidden />

            <ToolbarModeGroup aria-label="Ink and media tools">
              {inkCluster.map((tool) => (
                <ToolbarTip
                  key={tool.id}
                  label={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                >
                  <IconButton
                    icon={tool.icon}
                    aria-label={tool.label}
                    aria-pressed={activeTool === tool.id}
                    active={activeTool === tool.id}
                    size="xs"
                    onClick={() => onToolSelect(tool.id)}
                  />
                </ToolbarTip>
              ))}
            </ToolbarModeGroup>

            <span className="theme-draw-canvas__toolbar-divider" role="separator" aria-hidden />

            <ToolbarModeGroup aria-label="Frame and embed">
              {DRAW_EXTRA_TOOLS.map((tool) => (
                <ToolbarTip
                  key={tool.id}
                  label={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                >
                  <IconButton
                    icon={tool.icon}
                    aria-label={tool.label}
                    aria-pressed={activeTool === tool.id}
                    active={activeTool === tool.id}
                    size="xs"
                    onClick={() => onToolSelect(tool.id)}
                  />
                </ToolbarTip>
              ))}
            </ToolbarModeGroup>

            <ToolbarTip label="Tool lock (Q)">
              <IconButton
                icon={Lock}
                aria-label="Tool lock"
                aria-pressed={toolLocked}
                active={toolLocked}
                size="xs"
                variant="ghost"
                onClick={onToggleToolLock}
              />
            </ToolbarTip>
          </div>
        </ThemeScroll>
      </div>

      {/* Tip sits under layer 2 */}
      {hint ? <div className="theme-draw-canvas__hint">{hint}</div> : null}

      {/* Layer 3 — single-row format ribbon */}
      <DrawCanvasFormatRibbon open={formatOpen} {...formatProps} />
    </div>
  )
}
