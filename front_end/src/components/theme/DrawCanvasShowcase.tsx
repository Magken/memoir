import { useRef } from 'react'
import { DrawCanvas, type DrawCanvasHandle } from '../DrawCanvas'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { EditorFeatureTable } from './EditorFeatureTable'

export function DrawCanvasShowcase() {
  const editorRef = useRef<DrawCanvasHandle>(null)

  return (
    <div className="space-y-6">
      <p className="type-body-sm type-muted prose-measure">
        Docked diagram editor built on <code className="type-code">@excalidraw/excalidraw</code> — File
        cascade, tool ModeGroups, property side panel, zoom ControlTray, and themed context menu. Stock
        Excalidraw floating chrome is hidden; collaboration, command palette, library, and AI tools are
        out of scope for this showcase.
      </p>
      <EditorFeatureTable kind="draw" />
      <EditorContextDemoBar targetKind="draw" runtimeRef={editorRef} />
      <DrawCanvas ref={editorRef} initialTitle="Showcase drawing" autoFocus />
    </div>
  )
}
