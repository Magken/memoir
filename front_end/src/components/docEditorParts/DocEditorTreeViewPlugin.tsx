import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { TreeView } from '@lexical/react/LexicalTreeView'

export function DocEditorTreeViewPlugin() {
  const [editor] = useLexicalComposerContext()

  return (
    <div className="theme-doc-editor__treeview">
      <TreeView
        viewClassName="theme-doc-editor__treeview-content"
        treeTypeButtonClassName="theme-doc-editor__treeview-btn"
        timeTravelButtonClassName="theme-doc-editor__treeview-btn"
        timeTravelPanelClassName="theme-doc-editor__treeview-panel"
        timeTravelPanelSliderClassName="theme-doc-editor__treeview-slider"
        timeTravelPanelButtonClassName="theme-doc-editor__treeview-btn"
        editor={editor}
      />
    </div>
  )
}
