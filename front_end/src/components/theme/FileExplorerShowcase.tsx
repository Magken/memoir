import { FileExplorer } from '../FileExplorer'
import { EditorFeatureTable } from './EditorFeatureTable'

export function FileExplorerShowcase() {
  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure">
        Drive/Explorer-style file workbench over an in-memory fixture library — sidebar Quick access,
        list/grid/details, search/filter/sort, upload, clipboard, context menus, command palette
        (Ctrl/Cmd+K), and type-aware previews. No backend; File → Reset library restores the seed.
      </p>
      <EditorFeatureTable kind="files" />
      <FileExplorer variant="showcase" initialTitle="Showcase library" />
      <div className="space-y-3">
        <p className="type-label">Embed</p>
        <FileExplorer variant="embed" initialTitle="Embed library" className="max-w-none" />
      </div>
    </div>
  )
}
