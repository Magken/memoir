import { Copy, PanelLeft, PanelLeftClose } from 'lucide-react'
import type { ReactNode } from 'react'
import { mermaidZoomPercent } from '../../lib/mermaidRenderer/canvasViewport'
import { IconButton } from '../IconButton'
import { ThemeScroll } from '../ThemeScroll'
import { Tooltip } from '../Tooltip'
import { CanvasZoomMenu } from '../rendererParts/CanvasZoomMenu'
import { EditorExportMenu } from '../editorContextParts/EditorExportMenu'
import { EditorHistoryTray } from '../editorContextParts/EditorHistoryTray'
import { EditorSaveTray } from '../editorContextParts/EditorSaveTray'
import { EditorTitlebar } from '../editorContextParts/EditorTitlebar'
import { EditorTitleField } from '../editorContextParts/EditorTitleField'
import { EditorTitleRefresh } from '../editorContextParts/EditorTitleRefresh'

type MermaidRendererToolbarProps = {
  title: string
  onTitleChange: (value: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onCopy: () => void
  onSave: () => void
  onExport: (formatId: string) => void
  onRefresh: () => void
  sourceOpen: boolean
  onToggleSource: () => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onZoomFit: () => void
  onExpandFullscreen: () => void
}

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>
}

export function MermaidRendererToolbar({
  title,
  onTitleChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onCopy,
  onSave,
  onExport,
  onRefresh,
  sourceOpen,
  onToggleSource,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
  onExpandFullscreen,
}: MermaidRendererToolbarProps) {
  return (
    <div className="theme-mermaid-renderer__chrome">
      <EditorTitlebar
        className="theme-mermaid-renderer__titlebar"
        historyTray={
          <EditorHistoryTray
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
          />
        }
        titleBlock={
          <EditorTitleField
            value={title}
            onChange={onTitleChange}
            placeholder="Untitled diagram"
            aria-label="Diagram title"
          />
        }
        titleRefresh={<EditorTitleRefresh onRefresh={onRefresh} label="Reset diagram" />}
        saveTray={<EditorSaveTray onSave={onSave} label="Save source" />}
        exportMenu={<EditorExportMenu kind="mermaid" onExport={onExport} />}
      />

      <div className="theme-mermaid-renderer__tools">
        <ThemeScroll axis="horizontal" rail="nano" className="theme-mermaid-renderer__tools-scroll">
          <div className="theme-mermaid-renderer__tools-inner" role="toolbar" aria-label="Mermaid tools">
            <Tip label={sourceOpen ? 'Hide source' : 'Show source'}>
              <IconButton
                icon={sourceOpen ? PanelLeftClose : PanelLeft}
                aria-label={sourceOpen ? 'Hide source' : 'Show source'}
                aria-pressed={sourceOpen}
                size="xs"
                variant="tray"
                active={sourceOpen}
                onClick={onToggleSource}
              />
            </Tip>
            <span className="theme-mermaid-renderer__toolbar-divider" role="separator" aria-hidden />
            <CanvasZoomMenu
              zoomLabel={`${mermaidZoomPercent(zoom)}%`}
              onZoomOut={onZoomOut}
              onZoomReset={onZoomReset}
              onZoomIn={onZoomIn}
              onZoomFit={onZoomFit}
              onExpandFullscreen={onExpandFullscreen}
            />
            <span className="theme-mermaid-renderer__toolbar-divider" role="separator" aria-hidden />
            <Tip label="Copy source">
              <IconButton icon={Copy} aria-label="Copy source" size="xs" variant="ghost" onClick={onCopy} />
            </Tip>
          </div>
        </ThemeScroll>
      </div>
    </div>
  )
}
