import { Copy, FileText, PanelLeft, PanelLeftClose, Sigma } from 'lucide-react'
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

export type MarkdownSourceMode = 'markdown' | 'latex'

type MarkdownRendererToolbarProps = {
  title: string
  onTitleChange: (value: string) => void
  mode: MarkdownSourceMode
  onModeChange: (mode: MarkdownSourceMode) => void
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
}

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>
}

export function MarkdownRendererToolbar({
  title,
  onTitleChange,
  mode,
  onModeChange,
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
}: MarkdownRendererToolbarProps) {
  return (
    <div className="theme-markdown-renderer__chrome">
      <EditorTitlebar
        className="theme-markdown-renderer__titlebar"
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
            placeholder="Untitled document"
            aria-label="Document title"
          />
        }
        titleRefresh={<EditorTitleRefresh onRefresh={onRefresh} label="Reset sample" />}
        saveTray={<EditorSaveTray onSave={onSave} label="Save source" />}
        exportMenu={<EditorExportMenu kind="markdown" onExport={onExport} />}
      />

      <div className="theme-markdown-renderer__tools">
        <ThemeScroll axis="horizontal" rail="nano" className="theme-markdown-renderer__tools-scroll">
          <div className="theme-markdown-renderer__tools-inner" role="toolbar" aria-label="Markdown tools">
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
            <span className="theme-markdown-renderer__toolbar-divider" role="separator" aria-hidden />
            <ToolbarModeGroup aria-label="Source mode">
              <Tip label="Markdown">
                <IconButton
                  icon={FileText}
                  aria-label="Markdown"
                  aria-pressed={mode === 'markdown'}
                  size="xs"
                  variant="tray"
                  active={mode === 'markdown'}
                  onClick={() => onModeChange('markdown')}
                />
              </Tip>
              <Tip label="LaTeX">
                <IconButton
                  icon={Sigma}
                  aria-label="LaTeX"
                  aria-pressed={mode === 'latex'}
                  size="xs"
                  variant="tray"
                  active={mode === 'latex'}
                  onClick={() => onModeChange('latex')}
                />
              </Tip>
            </ToolbarModeGroup>
            <span className="theme-markdown-renderer__toolbar-divider" role="separator" aria-hidden />
            <Tip label="Copy source">
              <IconButton icon={Copy} aria-label="Copy source" size="xs" variant="ghost" onClick={onCopy} />
            </Tip>
          </div>
        </ThemeScroll>
      </div>
    </div>
  )
}
