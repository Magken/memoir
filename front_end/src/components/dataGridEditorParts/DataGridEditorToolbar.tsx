import { Columns3, FoldHorizontal, Rows3, Search, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { DataGridEditorMode } from '../../lib/dataGridEditor/mode'
import { isDataGridEditable } from '../../lib/dataGridEditor/mode'
import { IconButton } from '../IconButton'
import { ThemeScroll } from '../ThemeScroll'
import { Tooltip } from '../Tooltip'
import { EditorExportMenu } from '../editorContextParts/EditorExportMenu'
import { EditorHistoryTray } from '../editorContextParts/EditorHistoryTray'
import { EditorSaveTray } from '../editorContextParts/EditorSaveTray'
import { EditorTitlebar } from '../editorContextParts/EditorTitlebar'
import { EditorTitleField } from '../editorContextParts/EditorTitleField'
import { EditorTitleRefresh } from '../editorContextParts/EditorTitleRefresh'
import { DataGridEditorFileMenu, type DataGridEditorFileAction } from './DataGridEditorFileMenu'

export type { DataGridEditorFileAction }

type DataGridEditorToolbarProps = {
  mode: DataGridEditorMode
  title: string
  onTitleChange: (value: string) => void
  canUndo: boolean
  canRedo: boolean
  canFit: boolean
  searchOpen: boolean
  onToggleSearch: () => void
  onUndo: () => void
  onRedo: () => void
  onAddRow: () => void
  onAddColumn: () => void
  onFitSelection: () => void
  onDeleteSelection: () => void
  onFileAction: (id: DataGridEditorFileAction) => void
  onSave: () => void
  onExport: (formatId: string) => void
  onRefresh: () => void
}

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>
}

export function DataGridEditorToolbar({
  mode,
  title,
  onTitleChange,
  canUndo,
  canRedo,
  canFit,
  searchOpen,
  onToggleSearch,
  onUndo,
  onRedo,
  onAddRow,
  onAddColumn,
  onFitSelection,
  onDeleteSelection,
  onFileAction,
  onSave,
  onExport,
  onRefresh,
}: DataGridEditorToolbarProps) {
  const editable = isDataGridEditable(mode)

  return (
    <div className="theme-data-grid-editor__chrome">
      <EditorTitlebar
        className="theme-data-grid-editor__titlebar"
        fileMenu={<DataGridEditorFileMenu mode={mode} onAction={onFileAction} />}
        historyTray={
          editable ? (
            <EditorHistoryTray
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={onUndo}
              onRedo={onRedo}
            />
          ) : null
        }
        titleBlock={
          <EditorTitleField
            value={title}
            onChange={onTitleChange}
            placeholder="Untitled sheet"
            aria-label="Sheet title"
            disabled={!editable}
          />
        }
        titleRefresh={<EditorTitleRefresh onRefresh={onRefresh} label="Reload sample" />}
        saveTray={<EditorSaveTray onSave={onSave} label="Save sheet" />}
        exportMenu={<EditorExportMenu kind="grid" onExport={onExport} />}
      />

      <div className="theme-data-grid-editor__tools">
        <ThemeScroll axis="horizontal" rail="nano" className="theme-data-grid-editor__tools-scroll">
          <div className="theme-data-grid-editor__tools-inner" role="toolbar" aria-label="Grid tools">
            {editable ? (
              <>
                <Tip label="Add row">
                  <IconButton
                    icon={Rows3}
                    aria-label="Add row"
                    size="xs"
                    variant="tray"
                    onClick={onAddRow}
                  />
                </Tip>
                <Tip label="Add column">
                  <IconButton
                    icon={Columns3}
                    aria-label="Add column"
                    size="xs"
                    variant="tray"
                    onClick={onAddColumn}
                  />
                </Tip>
              </>
            ) : null}
            <Tip label="Fit column to selection">
              <IconButton
                icon={FoldHorizontal}
                aria-label="Fit column to selection"
                size="xs"
                variant="tray"
                disabled={!canFit}
                onClick={onFitSelection}
              />
            </Tip>
            <span className="theme-data-grid-editor__toolbar-divider" role="separator" aria-hidden />
            <Tip label="Search">
              <IconButton
                icon={Search}
                aria-label="Search"
                size="xs"
                variant="tray"
                active={searchOpen}
                onClick={onToggleSearch}
              />
            </Tip>
            {editable ? (
              <Tip label="Clear selection">
                <IconButton
                  icon={Trash2}
                  aria-label="Clear selection"
                  size="xs"
                  variant="tray"
                  onClick={onDeleteSelection}
                />
              </Tip>
            ) : null}
          </div>
        </ThemeScroll>
      </div>
    </div>
  )
}
