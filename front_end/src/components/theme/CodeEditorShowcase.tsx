import { useRef } from 'react'
import { CodeEditor, type CodeEditorHandle } from '../CodeEditor'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { EditorFeatureTable } from './EditorFeatureTable'

export function CodeEditorShowcase() {
  const editorRef = useRef<CodeEditorHandle>(null)

  return (
    <div className="space-y-6">
      <p className="type-body-sm type-muted prose-measure">
        Browser code workbench on <code className="type-code">@monaco-editor/react</code> — file
        explorer, multi-tab Monaco editing, workspace envelope export, and ZIP download. Load the bot
        starter fixture from the demo bar below.
      </p>
      <EditorFeatureTable kind="code" />
      <EditorContextDemoBar targetKind="code" runtimeRef={editorRef} />
      <CodeEditor ref={editorRef} initialTitle="Showcase workspace" />
    </div>
  )
}
