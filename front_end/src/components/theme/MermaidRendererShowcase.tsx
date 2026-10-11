import { useRef } from 'react'
import { MermaidRenderer, MermaidRendererEmbed, type MermaidRendererHandle } from '../MermaidRenderer'
import { SEED_MERMAID } from '../../lib/mermaidRenderer/seedContent'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { EditorFeatureTable } from './EditorFeatureTable'

export function MermaidRendererShowcase() {
  const editorRef = useRef<MermaidRendererHandle>(null)

  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure">
        Split-pane Mermaid workbench with pan (drag) and zoom (wheel / toolbar). Use{' '}
        <code className="type-code">MermaidRendererEmbed</code> for inline diagram hosts with a
        floating zoom tray.
      </p>
      <EditorFeatureTable kind="mermaid" />
      <EditorContextDemoBar targetKind="mermaid" runtimeRef={editorRef} />
      <MermaidRenderer ref={editorRef} initialTitle="Showcase diagram" className="theme-mermaid-renderer--showcase" />
      <div className="space-y-3">
        <p className="type-label">Embed preview only</p>
        <MermaidRendererEmbed source={SEED_MERMAID} className="theme-mermaid-renderer--showcase-embed" />
      </div>
    </div>
  )
}
