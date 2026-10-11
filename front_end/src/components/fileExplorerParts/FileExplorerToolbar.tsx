import {
  ArrowDownAZ,
  Files,
  Filter,
  LayoutGrid,
  List,
  PanelRight,
  PanelRightClose,
  Search,
  TableProperties,
  Upload,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { DriveMimeGroup, DriveSortDir, DriveSortKey, DriveViewMode } from '../../lib/fileExplorer'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'
import { CascadeMenuButton } from '../CascadeMenuButton'
import { EditorHistoryTray } from '../editorContextParts/EditorHistoryTray'
import { EditorTitlebar } from '../editorContextParts/EditorTitlebar'
import { EditorTitleField } from '../editorContextParts/EditorTitleField'
import { IconButton } from '../IconButton'
import { MenuButton } from '../MenuButton'
import { ToolbarModeGroup } from '../ToolbarModeGroup'
import { Tooltip } from '../Tooltip'

export type FileExplorerSidebarView = 'files' | 'search'

type FileExplorerToolbarProps = {
  title: string
  onTitleChange: (value: string) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  fileItems: readonly CascadeMenuItem[]
  onFileSelect: (id: string) => void
  viewMode: DriveViewMode
  onViewMode: (mode: DriveViewMode) => void
  sortKey: DriveSortKey
  sortDir: DriveSortDir
  onSort: (key: DriveSortKey, dir?: DriveSortDir) => void
  mimeFilters: readonly DriveMimeGroup[]
  starredOnly: boolean
  onToggleMime: (group: DriveMimeGroup) => void
  onToggleStarredOnly: () => void
  onClearFilters: () => void
  sidebarOpen: boolean
  sidebarView: FileExplorerSidebarView
  onSelectSidebarView: (view: FileExplorerSidebarView) => void
  previewOpen: boolean
  onTogglePreview: () => void
  onUpload: () => void
}

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>
}

const FILTER_GROUPS: { id: DriveMimeGroup; label: string }[] = [
  { id: 'image', label: 'Images' },
  { id: 'pdf', label: 'PDF' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'code', label: 'Code' },
  { id: 'csv', label: 'CSV' },
  { id: 'mermaid', label: 'Mermaid' },
  { id: 'force', label: 'Force' },
  { id: 'draw', label: 'Draw' },
]

export function FileExplorerToolbar({
  title,
  onTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  fileItems,
  onFileSelect,
  viewMode,
  onViewMode,
  sortKey,
  sortDir,
  onSort,
  mimeFilters,
  starredOnly,
  onToggleMime,
  onToggleStarredOnly,
  onClearFilters,
  sidebarOpen,
  sidebarView,
  onSelectSidebarView,
  previewOpen,
  onTogglePreview,
  onUpload,
}: FileExplorerToolbarProps) {
  const sortItems = [
    { id: 'name-asc', label: 'Name A–Z' },
    { id: 'name-desc', label: 'Name Z–A' },
    { id: 'modified-desc', label: 'Newest first' },
    { id: 'modified-asc', label: 'Oldest first' },
    { id: 'size-desc', label: 'Largest' },
    { id: 'type-asc', label: 'Type' },
  ]

  const sortSelectedId = `${sortKey}-${sortDir}`

  const filterItems: CascadeMenuItem[] = [
    ...FILTER_GROUPS.map((g) => ({
      id: `mime-${g.id}`,
      label: g.label,
      checked: mimeFilters.includes(g.id),
    })),
    { id: 'starred-only', label: 'Starred only', checked: starredOnly },
    { id: 'clear-filters', label: 'Clear filters' },
  ]

  return (
    <div className="theme-file-explorer__chrome">
      <EditorTitlebar
        className="theme-file-explorer__titlebar"
        fileMenu={
          <CascadeMenuButton
            label="File"
            items={fileItems}
            onSelect={onFileSelect}
            size="xs"
            variant="tray"
            menuSize="compact"
            scrollRail="hidden"
            scrollClouds
            triggerLabelAnim={false}
          />
        }
        historyTray={
          <EditorHistoryTray canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
        }
        titleBlock={
          <EditorTitleField
            value={title}
            onChange={onTitleChange}
            placeholder="File explorer"
            aria-label="Explorer title"
          />
        }
      />

      <div className="theme-file-explorer__tools">
        <div className="theme-file-explorer__tools-inner" role="toolbar" aria-label="Explorer tools">
          <ToolbarModeGroup aria-label="Side panel">
            <Tip label="Files">
              <IconButton
                icon={Files}
                aria-label="Files panel"
                size="xs"
                variant="tray"
                active={sidebarOpen && sidebarView === 'files'}
                onClick={() => onSelectSidebarView('files')}
              />
            </Tip>
            <Tip label="Search">
              <IconButton
                icon={Search}
                aria-label="Search panel"
                size="xs"
                variant="tray"
                active={sidebarOpen && sidebarView === 'search'}
                onClick={() => onSelectSidebarView('search')}
              />
            </Tip>
          </ToolbarModeGroup>

          <ToolbarModeGroup aria-label="View mode">
            <Tip label="List">
              <IconButton
                icon={List}
                aria-label="List view"
                size="xs"
                variant="tray"
                active={viewMode === 'list'}
                onClick={() => onViewMode('list')}
              />
            </Tip>
            <Tip label="Grid">
              <IconButton
                icon={LayoutGrid}
                aria-label="Grid view"
                size="xs"
                variant="tray"
                active={viewMode === 'grid'}
                onClick={() => onViewMode('grid')}
              />
            </Tip>
            <Tip label="Details">
              <IconButton
                icon={TableProperties}
                aria-label="Details view"
                size="xs"
                variant="tray"
                active={viewMode === 'details'}
                onClick={() => onViewMode('details')}
              />
            </Tip>
          </ToolbarModeGroup>

          <MenuButton
            label="Sort"
            icon={ArrowDownAZ}
            iconDropdown
            size="xs"
            variant="tray"
            menuSize="compact"
            portal
            portalZIndex={1200}
            scrollRail="hidden"
            triggerLabelAnim={false}
            items={sortItems}
            selectedId={sortSelectedId}
            onSelect={(id) => {
              const [key, dir] = id.split('-') as [DriveSortKey, DriveSortDir]
              onSort(key, dir)
            }}
          />

          <CascadeMenuButton
            label="Filter"
            icon={Filter}
            iconOnly
            size="xs"
            variant="tray"
            menuSize="compact"
            scrollRail="hidden"
            scrollClouds
            triggerLabelAnim={false}
            items={filterItems}
            onSelect={(id) => {
              if (id === 'clear-filters') onClearFilters()
              else if (id === 'starred-only') onToggleStarredOnly()
              else if (id.startsWith('mime-')) onToggleMime(id.slice(5) as DriveMimeGroup)
            }}
          />

          <span className="theme-file-explorer__tools-spacer" />

          <Tip label="Upload">
            <IconButton icon={Upload} aria-label="Upload" size="xs" variant="ghost" onClick={onUpload} />
          </Tip>
          <Tip label={previewOpen ? 'Hide preview' : 'Show preview'}>
            <IconButton
              icon={previewOpen ? PanelRightClose : PanelRight}
              aria-label={previewOpen ? 'Hide preview' : 'Show preview'}
              size="xs"
              variant="ghost"
              active={previewOpen}
              onClick={onTogglePreview}
            />
          </Tip>
        </div>
      </div>
    </div>
  )
}
