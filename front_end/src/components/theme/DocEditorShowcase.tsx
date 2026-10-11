import { useRef } from 'react'
import { DocEditor, type DocEditorHandle } from '../DocEditor'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { DocEditorFeatureTable } from './DocEditorFeatureTable'

export function DocEditorShowcase() {
  const editorRef = useRef<DocEditorHandle>(null)

  return (
    <div className="space-y-6">
      <p className="type-body-sm type-muted prose-measure">
        Full-featured Lexical editor — click <strong>Native JSON→Doc</strong> to load the 4-page
        feature-regression fixture (columns, embeds, tables, alignment, page breaks). See the feature
        table below for the full catalog. Uses the project's{' '}
        <code className="type-code">IconButton</code> and{' '}
        <code className="type-code">ColorSelector</code> primitives.
      </p>
      <DocEditorFeatureTable />
      <EditorContextDemoBar targetKind="doc" runtimeRef={editorRef} />
      <DocEditor
        ref={editorRef}
        namespace="showcase-doc-editor"
        placeholder="Start writing your document…"
        autoFocus
      />
    </div>
  )
}
