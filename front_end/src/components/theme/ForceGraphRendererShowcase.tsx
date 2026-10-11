import { useRef } from 'react'
import {
  ForceGraphRenderer,
  ForceGraphRendererEmbed,
  type ForceGraphRendererHandle,
} from '../ForceGraphRenderer'
import { SEED_FORCE_GRAPH } from '../../lib/forceGraph/seedContent'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { EditorFeatureTable } from './EditorFeatureTable'

export function ForceGraphRendererShowcase() {
  const editorRef = useRef<ForceGraphRendererHandle>(null)

  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure">
        Split-pane d3-force graph workbench — edit JSON on the left, live SVG force layout on the
        right. Drag nodes to pin them; drag the canvas to pan; wheel to zoom. Use{' '}
        <code className="type-code">ForceGraphRendererEmbed</code> for chromeless hosts with a
        floating zoom tray.
      </p>
      <EditorFeatureTable kind="force" />
      <EditorContextDemoBar targetKind="force" runtimeRef={editorRef} />
      <ForceGraphRenderer
        ref={editorRef}
        initialTitle="Showcase graph"
        className="theme-force-graph-renderer--showcase"
      />
      <div className="space-y-3">
        <p className="type-label">Embed preview only</p>
        <ForceGraphRendererEmbed
          source={SEED_FORCE_GRAPH}
          className="theme-force-graph-renderer--showcase-embed"
        />
      </div>
    </div>
  )
}
