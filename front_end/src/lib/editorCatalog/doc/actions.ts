/**
 * DocEditor MCT action catalog — props, UI toggles, interaction notation.
 */
import type { EditorAction, EditorActionKind } from '../types'

export type DocEditorAction = EditorAction

/** MCT protocol catalog — how to turn editor affordances on/off without spelunking the codebase. */
export const DOC_EDITOR_ACTIONS: DocEditorAction[] = [
  {
    id: 'doc.action.prop.show-diagram-view-options',
    label: 'Show diagram code/preview toggle',
    kind: 'prop',
    target: 'DocEditor.showDiagramViewOptions',
    notation: '<DocEditor showDiagramViewOptions={true|false} />',
    defaultValue: true,
    implemented: true,
    relatedFeatures: ['doc.chrome.diagram-view-options', 'doc.interaction.diagram-view-toggle'],
    notes: 'When false, mermaid/excalidraw blocks stay in viewer mode and chrome is hidden.',
  },
  {
    id: 'doc.action.prop.diagram-block-height',
    label: 'Diagram block viewport height',
    kind: 'prop',
    target: 'DocEditor.diagramBlockHeight',
    notation: '<DocEditor diagramBlockHeight="min(28rem, 56vh)" />',
    defaultValue: 'min(28rem, 56vh)',
    implemented: true,
    relatedFeatures: ['doc.chrome.diagram-block-height', 'doc.embed.mermaid', 'doc.embed.excalidraw'],
    notes: 'Sets --editor-diagram-block-height on the editor shell. Source + preview share this height.',
  },
  {
    id: 'doc.action.diagram.view-code',
    label: 'Diagram block → source view',
    kind: 'ui',
    target: 'DocEditorDiagramPreviewPlugin / per nodeKey',
    notation: 'diagram.view=code @nodeKey',
    defaultValue: 'render',
    implemented: true,
    relatedFeatures: ['doc.embed.mermaid', 'doc.embed.excalidraw', 'doc.interaction.diagram-view-toggle'],
    notes: 'Ghost Code button in diagram chrome. State is per code block, not global.',
  },
  {
    id: 'doc.action.diagram.view-render',
    label: 'Diagram block → viewer mode',
    kind: 'ui',
    target: 'DocEditorDiagramPreviewPlugin / per nodeKey',
    notation: 'diagram.view=render @nodeKey',
    defaultValue: 'render',
    implemented: true,
    relatedFeatures: ['doc.embed.mermaid', 'doc.embed.excalidraw', 'doc.interaction.diagram-view-toggle'],
    notes: 'Default mode. Ghost Eye button in diagram chrome.',
  },
  {
    id: 'doc.action.diagram.mermaid.zoom-in',
    label: 'Mermaid preview zoom in',
    kind: 'ui',
    target: 'MermaidCanvasViewport showZoomOverlay',
    notation: 'diagram.mermaid.zoom.in @nodeKey',
    implemented: true,
    relatedFeatures: ['doc.embed.mermaid', 'doc.interaction.diagram-zoom'],
  },
  {
    id: 'doc.action.diagram.mermaid.zoom-out',
    label: 'Mermaid preview zoom out',
    kind: 'ui',
    target: 'MermaidCanvasViewport showZoomOverlay',
    notation: 'diagram.mermaid.zoom.out @nodeKey',
    implemented: true,
    relatedFeatures: ['doc.embed.mermaid', 'doc.interaction.diagram-zoom'],
  },
  {
    id: 'doc.action.diagram.mermaid.zoom-reset',
    label: 'Mermaid preview zoom reset',
    kind: 'ui',
    target: 'MermaidCanvasViewport',
    notation: 'diagram.mermaid.zoom.reset @nodeKey',
    implemented: true,
    relatedFeatures: ['doc.embed.mermaid', 'doc.interaction.diagram-zoom'],
  },
  {
    id: 'doc.action.diagram.mermaid.zoom-fit',
    label: 'Mermaid preview zoom to fit',
    kind: 'ui',
    target: 'MermaidCanvasViewport',
    notation: 'diagram.mermaid.zoom.fit @nodeKey',
    implemented: true,
    relatedFeatures: ['doc.embed.mermaid', 'doc.interaction.diagram-zoom'],
  },
  {
    id: 'doc.action.diagram.excalidraw.zoom-in',
    label: 'Excalidraw preview zoom in',
    kind: 'ui',
    target: 'DrawCanvasHeadless doc zoom overlay',
    notation: 'diagram.excalidraw.zoom.in @nodeKey',
    implemented: true,
    relatedFeatures: ['doc.embed.excalidraw', 'doc.interaction.diagram-zoom'],
  },
  {
    id: 'doc.action.diagram.excalidraw.zoom-out',
    label: 'Excalidraw preview zoom out',
    kind: 'ui',
    target: 'DrawCanvasHeadless doc zoom overlay',
    notation: 'diagram.excalidraw.zoom.out @nodeKey',
    implemented: true,
    relatedFeatures: ['doc.embed.excalidraw', 'doc.interaction.diagram-zoom'],
  },
  {
    id: 'doc.action.diagram.excalidraw.zoom-reset',
    label: 'Excalidraw preview zoom reset',
    kind: 'ui',
    target: 'DrawCanvasHeadless doc zoom overlay',
    notation: 'diagram.excalidraw.zoom.reset @nodeKey',
    implemented: true,
    relatedFeatures: ['doc.embed.excalidraw', 'doc.interaction.diagram-zoom'],
  },
  {
    id: 'doc.action.diagram.excalidraw.zoom-fit',
    label: 'Excalidraw preview zoom to fit',
    kind: 'ui',
    target: 'DrawCanvasHeadless doc zoom overlay',
    notation: 'diagram.excalidraw.zoom.fit @nodeKey',
    implemented: true,
    relatedFeatures: ['doc.embed.excalidraw', 'doc.interaction.diagram-zoom'],
  },
  {
    id: 'doc.action.interaction.drag-block-reorder',
    label: 'Reorder top-level blocks',
    kind: 'ui',
    target: 'DocEditorDraggableBlockPlugin',
    notation: 'interaction.drag-block @nodeKey → before|after @targetNodeKey',
    implemented: true,
    relatedFeatures: ['doc.interaction.draggable-blocks'],
    notes: 'Left gutter grip. Diagram viewer cards use pointer-events passthrough so drop targets match block flow.',
  },
  {
    id: 'doc.action.chrome.tree-view-toggle',
    label: 'Toggle TreeView debug panel',
    kind: 'ui',
    target: 'DocEditorToolbar View column',
    notation: 'chrome.treeView={true|false}',
    implemented: true,
    relatedFeatures: ['doc.interaction.tree-view'],
  },
]

export const DOC_EDITOR_ACTION_KIND_LABELS: Record<EditorActionKind, string> = {
  prop: 'Prop',
  ui: 'UI',
  command: 'Command',
  runtime: 'Runtime',
}

export function docActionById(id: string): DocEditorAction | undefined {
  return DOC_EDITOR_ACTIONS.find((action) => action.id === id)
}
