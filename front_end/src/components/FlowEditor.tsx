import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type { Edge, Node } from '@xyflow/react'
import { MarkerType } from '@xyflow/react'
import type {
  EditorActionRequest,
  EditorActionResult,
  EditorRuntimeHandle,
} from '../lib/editorContext/types'
import {
  applyCreateBotAction,
  EDITOR_TO_CHAT_ACTION_MAP,
  type CreateBotActionParams,
} from '../lib/interviewBrief/createBotPatches'
import { compileFlowMcpContext } from '../lib/flowEditor/compileFlowMcpContext'
import { createFlowNode, getFlowElementDefinition, resolveNodePorts } from '../lib/flowEditor/flowElementRegistry'
import { FlowEditorUiProvider, type FlowEditorUiContextValue } from '../lib/flowEditor/FlowEditorUiContext'
import {
  canCreateFlowGroup,
  canDisassembleFlowGroups,
  createFlowGroup,
  disassembleFlowGroups,
} from '../lib/flowEditor/flowGroups'
import {
  applyDagreLayout,
  ensureFlowLayout,
  type FlowLayoutDirection,
  type FlowLayoutMode,
} from '../lib/flowEditor/reactFlowBridge'
import { useFlowHistory } from '../lib/flowEditor/useFlowHistory'
import { downloadFlowPng } from '../lib/flowEditor/exportFlow'
import type {
  FlowDocument,
  FlowEditorPayload,
  FlowNodeChrome,
  FlowPortDirection,
  FlowToolkitId,
} from '../lib/flowEditor/types'
import { FLOW_WORKFLOW_MATH } from '../lib/flowEditor/workflowBundles/mathSolver'
import { FLOW_WORKFLOW_QUESTIONNAIRE } from '../lib/flowEditor/workflowBundles/questionnaire'
import {
  getFlowTemplate,
  insertFlowTemplate,
  type FlowTemplateId,
} from '../lib/flowEditor/flowTemplateCatalog'
import { downloadExportedContext } from '../lib/editorContext/importExportManager'
import { FlowEditorCanvas, type FlowEditorCanvasHandle } from './flowEditorParts/FlowEditorCanvas'
import { FlowEditorInspector } from './flowEditorParts/FlowEditorInspector'
import { FlowEditorNodePalette } from './flowEditorParts/FlowEditorNodePalette'
import { FlowEditorTemplatePanel } from './flowEditorParts/FlowEditorTemplatePanel'
import type { FlowEdgeStylePatch } from './flowEditorParts/FlowEditorStyleTray'
import {
  FlowEditorToolbar,
  type FlowCanvasInteractionMode,
  type FlowSidePanel,
} from './flowEditorParts/FlowEditorToolbar'

export type FlowEditorVariant = 'workbench' | 'embed'
export type FlowPrototypeId = 'math-solver' | 'questionnaire'

const SIDE_PANEL_WIDTH = 200

type FlowEditorProps = {
  className?: string
  variant?: FlowEditorVariant
  initialTitle?: string
  flow?: FlowDocument
  prototypeId?: FlowPrototypeId
  /** Palette / template profile. Default keeps math + questionnaire builtins. */
  toolkit?: FlowToolkitId
  /** Fires after semantic document commits (not viewport-only). */
  onDocumentChange?: (flow: FlowDocument) => void
  /** Fires when the titlebar name changes. */
  onTitleChange?: (title: string) => void
  /** Run dagre once after the canvas reports ready (viewer / deck). */
  autoLayoutOnReady?: FlowLayoutDirection
}

export type FlowEditorEmbedProps = {
  className?: string
  flow: FlowDocument
  toolkit?: FlowToolkitId
}

export type FlowEditorHandle = EditorRuntimeHandle

function seedForPrototype(prototypeId: FlowPrototypeId): FlowDocument {
  const base =
    prototypeId === 'questionnaire'
      ? structuredClone(FLOW_WORKFLOW_QUESTIONNAIRE)
      : structuredClone(FLOW_WORKFLOW_MATH)
  // Seeds carry hand-placed coords — always run default LR so first paint matches Realign.
  return applyDagreLayout(base, 'LR')
}

function nextNodeId() {
  return `node-${crypto.randomUUID().slice(0, 8)}`
}

export function FlowEditorEmbed({
  className = '',
  flow,
  toolkit = 'default',
}: FlowEditorEmbedProps) {
  return (
    <FlowEditor
      variant="embed"
      className={className}
      flow={ensureFlowLayout(flow)}
      toolkit={toolkit}
    />
  )
}

export const FlowEditor = forwardRef<FlowEditorHandle, FlowEditorProps>(function FlowEditor(
  {
    className = '',
    variant = 'workbench',
    initialTitle = 'Untitled flow',
    flow: flowProp,
    prototypeId = 'math-solver',
    toolkit = 'default',
    onDocumentChange,
    onTitleChange,
    autoLayoutOnReady,
  },
  ref,
) {
  const [title, setTitle] = useState(initialTitle)
  const didAutoLayoutRef = useRef(false)
  const history = useFlowHistory(ensureFlowLayout(flowProp ?? seedForPrototype(prototypeId)))
  const { flow } = history
  const [snapToGrid, setSnapToGrid] = useState(false)

  useEffect(() => {
    onDocumentChange?.(flow)
  }, [flow, onDocumentChange])

  const handleTitleChange = useCallback(
    (next: string) => {
      setTitle(next)
      onTitleChange?.(next)
    },
    [onTitleChange],
  )
  const [showGrid, setShowGrid] = useState(false)
  const [showMinimap, setShowMinimap] = useState(true)
  const [sidePanel, setSidePanel] = useState<FlowSidePanel>('palette')
  const [interactionMode, setInteractionMode] = useState<FlowCanvasInteractionMode>('pan')
  const [layoutMode, setLayoutMode] = useState<FlowLayoutMode>('LR')
  const [lastDirectedLayout, setLastDirectedLayout] =
    useState<Exclude<FlowLayoutMode, 'free'>>('LR')
  const [contentExpandedById, setContentExpandedById] = useState<Record<string, boolean>>({})
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([])
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([])
  const canvasHandleRef = useRef<FlowEditorCanvasHandle | null>(null)

  const selectedIdsForGroupOps = useMemo(
    () => selectedNodes.map((n) => n.id),
    [selectedNodes],
  )
  const canGroup = canCreateFlowGroup(flow, selectedIdsForGroupOps)
  const canUngroup = canDisassembleFlowGroups(flow, selectedIdsForGroupOps)

  const buildPayload = useCallback((): FlowEditorPayload => {
    return {
      title,
      flow,
      mcpContext: compileFlowMcpContext(flow),
    }
  }, [flow, title])

  const parseCreateBotParams = useCallback((request: EditorActionRequest): CreateBotActionParams => {
    const fromPayload =
      request.payload && typeof request.payload === 'object' && !Array.isArray(request.payload)
        ? (request.payload as CreateBotActionParams)
        : {}
    if (request.value?.trim()) {
      try {
        const parsed = JSON.parse(request.value) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...fromPayload, ...(parsed as CreateBotActionParams) }
        }
      } catch {
        /* value is not JSON — ignore */
      }
    }
    return fromPayload
  }, [])

  const invokeAction = useCallback(
    (request: EditorActionRequest): EditorActionResult => {
      const { actionId } = request

      switch (actionId) {
        case 'flow.action.zoom-in':
          canvasHandleRef.current?.zoomIn()
          return { ok: true, actionId }
        case 'flow.action.zoom-out':
          canvasHandleRef.current?.zoomOut()
          return { ok: true, actionId }
        case 'flow.action.zoom-fit':
          canvasHandleRef.current?.zoomFit()
          return { ok: true, actionId }
        case 'flow.action.auto-layout': {
          history.mutateFlow((draft) => {
            const laid = applyDagreLayout(draft, lastDirectedLayout)
            draft.nodes = laid.nodes
            draft.edges = laid.edges
          })
          requestAnimationFrame(() => canvasHandleRef.current?.zoomFit())
          return { ok: true, actionId }
        }
        case 'flow.action.toggle-minimap':
          setShowMinimap((v) => !v)
          return { ok: true, actionId }
        default:
          break
      }

      if (!(actionId in EDITOR_TO_CHAT_ACTION_MAP) && !actionId.startsWith('interview.create.')) {
        return { ok: false, actionId, error: `Unknown flow action: ${actionId}` }
      }

      const params = parseCreateBotParams(request)
      const result = applyCreateBotAction(flow, actionId, params)
      if (!result.ok) return { ok: false, actionId, error: result.error }

      const next = ensureFlowLayout(result.flow)
      if (actionId === 'flow.action.interview-replace-flow' || actionId === 'interview.create.replace_flow') {
        history.replaceFlow(next)
      } else {
        history.commitFlow(next, { force: true })
      }
      requestAnimationFrame(() => canvasHandleRef.current?.zoomFit())
      return { ok: true, actionId, data: { nodeCount: next.nodes.length } }
    },
    [flow, history, lastDirectedLayout, parseCreateBotParams],
  )

  const runtimeHandle = useMemo<EditorRuntimeHandle>(
    () => ({
      getContext: () => buildPayload(),
      loadContext: (payload) => {
        const next = payload as FlowEditorPayload
        if (next.title) setTitle(next.title)
        if (next.flow) history.replaceFlow(ensureFlowLayout(structuredClone(next.flow)))
      },
      invokeAction,
    }),
    [buildPayload, history, invokeAction],
  )

  useImperativeHandle(ref, () => runtimeHandle, [runtimeHandle])

  const handleSave = useCallback(() => {
    downloadExportedContext('flow', runtimeHandle, 'envelope-json', title)
  }, [runtimeHandle, title])

  const handleExport = useCallback(
    (formatId: string) => {
      if (formatId === 'png') {
        void canvasHandleRef.current
          ?.exportPng()
          .then((blob) => {
            if (!(blob instanceof Blob)) throw new Error('Flow PNG export returned no image')
            downloadFlowPng(blob, `${title.trim() || 'flow'}.png`)
          })
          .catch((err) => {
            console.error('[FlowEditor] PNG export failed', err)
          })
        return
      }
      downloadExportedContext('flow', runtimeHandle, formatId as 'native-json', title)
    },
    [runtimeHandle, title],
  )

  const handleRefresh = useCallback(() => {
    history.replaceFlow(
      flowProp ? ensureFlowLayout(structuredClone(flowProp)) : seedForPrototype(prototypeId),
    )
    setTitle(initialTitle)
    setSelectedNodes([])
    setSelectedEdges([])
    requestAnimationFrame(() => canvasHandleRef.current?.zoomFit())
  }, [flowProp, history, initialTitle, prototypeId])

  const handleFlowChange = useCallback(
    (next: FlowDocument) => {
      history.commitFlow(next)
      // Selection stays with RF `onSelectionChange` — do not setState here.
      // (Calling setSelected* from canvas setNodes updaters → "setState while rendering".)
    },
    [history],
  )

  const directedLayout: FlowLayoutDirection =
    layoutMode === 'free' ? lastDirectedLayout : layoutMode

  const realignDraft = useCallback(
    (draft: FlowDocument, direction: FlowLayoutDirection = directedLayout) => {
      const laid = applyDagreLayout(draft, direction)
      draft.nodes = laid.nodes
      draft.edges = laid.edges
    },
    [directedLayout],
  )

  const handleAddKind = useCallback(
    (kind: string) => {
      const id = nextNodeId()
      history.mutateFlow((draft) => {
        draft.nodes.push(createFlowNode(kind, id, { x: 0, y: 0 }))
        realignDraft(draft)
      })
      requestAnimationFrame(() => canvasHandleRef.current?.zoomFit())
    },
    [history, realignDraft],
  )

  const handleInsertTemplate = useCallback(
    (id: FlowTemplateId) => {
      const def = getFlowTemplate(id)
      if (!def) return
      history.mutateFlow((draft) => {
        const laid = applyDagreLayout(structuredClone(def.document), directedLayout)
        const next = insertFlowTemplate(draft, laid)
        draft.nodes = next.nodes
        draft.edges = next.edges
        draft.groups = next.groups
      })
      requestAnimationFrame(() => canvasHandleRef.current?.zoomFit())
    },
    [directedLayout, history],
  )

  const handleInsertTemplateAt = useCallback(
    (id: FlowTemplateId, position: { x: number; y: number }) => {
      const def = getFlowTemplate(id)
      if (!def) return
      history.mutateFlow((draft) => {
        const laid = applyDagreLayout(structuredClone(def.document), directedLayout)
        const next = insertFlowTemplate(draft, laid, { at: position })
        draft.nodes = next.nodes
        draft.edges = next.edges
        draft.groups = next.groups
      })
    },
    [directedLayout, history],
  )

  const handlePatchNodeChrome = useCallback(
    (nodeIds: string[], patch: Partial<FlowNodeChrome>) => {
      const idSet = new Set(nodeIds)
      history.mutateFlow((draft) => {
        for (const node of draft.nodes) {
          if (!idSet.has(node.id)) continue
          node.chrome = { ...node.chrome, ...patch }
        }
      })
      setSelectedNodes((prev) =>
        prev.map((n) =>
          idSet.has(n.id)
            ? {
                ...n,
                data: {
                  ...(n.data as object),
                  chrome: { ...((n.data as { chrome?: FlowNodeChrome }).chrome ?? {}), ...patch },
                },
              }
            : n,
        ),
      )
    },
    [history],
  )

  const handlePatchEdges = useCallback(
    (edgeIds: string[], patch: FlowEdgeStylePatch) => {
      const idSet = new Set(edgeIds)
      history.mutateFlow((draft) => {
        for (const edge of draft.edges) {
          if (!idSet.has(edge.id)) continue
          const style = { ...edge.style }
          if (patch.type) style.type = patch.type
          if (patch.animated != null) {
            if (patch.animated) style.animated = true
            else delete style.animated
          }
          if (patch.markerEnd !== undefined) style.markerEnd = patch.markerEnd
          if (patch.markerStart !== undefined) style.markerStart = patch.markerStart
          if (patch.stroke !== undefined) style.stroke = patch.stroke || undefined
          if (patch.strokeWidth !== undefined) style.strokeWidth = patch.strokeWidth
          if (patch.label !== undefined) edge.label = patch.label
          edge.style = Object.keys(style).length ? style : undefined
        }
      })
      setSelectedEdges((prev) =>
        prev.map((edge) => {
          if (!idSet.has(edge.id)) return edge
          return {
            ...edge,
            label: patch.label ?? edge.label,
            type: patch.type ?? edge.type,
            animated: patch.animated !== undefined ? patch.animated : edge.animated,
            style: {
              ...edge.style,
              ...(patch.stroke !== undefined ? { stroke: patch.stroke || undefined } : {}),
              ...(patch.strokeWidth !== undefined ? { strokeWidth: patch.strokeWidth } : {}),
            },
            data: {
              ...(typeof edge.data === 'object' && edge.data ? edge.data : {}),
              ...(patch.stroke !== undefined ? { stroke: patch.stroke || undefined } : {}),
              ...(patch.strokeWidth !== undefined ? { strokeWidth: patch.strokeWidth } : {}),
            },
            markerStart:
              patch.markerStart === undefined
                ? edge.markerStart
                : patch.markerStart === 'arrow'
                  ? MarkerType.Arrow
                  : patch.markerStart === 'arrowclosed'
                    ? MarkerType.ArrowClosed
                    : undefined,
            markerEnd:
              patch.markerEnd === undefined
                ? edge.markerEnd
                : patch.markerEnd === 'arrow'
                  ? MarkerType.Arrow
                  : patch.markerEnd === 'arrowclosed'
                    ? MarkerType.ArrowClosed
                    : undefined,
          }
        }),
      )
    },
    [history],
  )

  const handleUpdateEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      handlePatchEdges([edgeId], { label })
    },
    [handlePatchEdges],
  )

  const handleGroup = useCallback(() => {
    if (!canCreateFlowGroup(flow, selectedIdsForGroupOps)) return
    let groupId = ''
    history.mutateFlow((draft) => {
      const next = createFlowGroup(draft, selectedIdsForGroupOps)
      draft.nodes = next.nodes
      draft.groups = next.groups
      groupId = next.groups[next.groups.length - 1]?.id ?? ''
    })
    if (!groupId) return
    setSelectedNodes([
      {
        id: groupId,
        type: 'flowGroup',
        position: { x: 0, y: 0 },
        data: { label: 'Group' },
      },
    ])
  }, [flow, history, selectedIdsForGroupOps])

  const handleUngroup = useCallback(() => {
    if (!canDisassembleFlowGroups(flow, selectedIdsForGroupOps)) return
    history.mutateFlow((draft) => {
      const next = disassembleFlowGroups(draft, selectedIdsForGroupOps)
      draft.nodes = next.nodes
      draft.groups = next.groups
    })
    setSelectedNodes([])
  }, [flow, history, selectedIdsForGroupOps])

  const handleLayoutModeChange = useCallback(
    (mode: FlowLayoutMode) => {
      setLayoutMode(mode)
      if (mode === 'free') return
      setLastDirectedLayout(mode)
      requestAnimationFrame(() => canvasHandleRef.current?.autoLayout(mode))
    },
    [],
  )

  const setContentExpanded = useCallback((nodeId: string, expanded: boolean) => {
    setContentExpandedById((prev) => {
      if (prev[nodeId] === expanded) return prev
      return { ...prev, [nodeId]: expanded }
    })
  }, [])

  const isContentExpanded = useCallback(
    (nodeId: string) => contentExpandedById[nodeId] === true,
    [contentExpandedById],
  )

  const uiValue = useMemo<FlowEditorUiContextValue>(
    () => ({
      toolkit,
      layoutMode,
      lastDirectedLayout,
      isContentExpanded,
      setContentExpanded,
      updateNodeLabel: (nodeId, label) => {
        history.mutateFlow((draft) => {
          const node = draft.nodes.find((n) => n.id === nodeId)
          if (node) node.label = label
        })
      },
      updateGroupLabel: (groupId, label) => {
        history.mutateFlow((draft) => {
          const group = draft.groups?.find((g) => g.id === groupId)
          if (group) group.label = label
        })
      },
      updateNodeNotes: (nodeId, notes) => {
        history.mutateFlow((draft) => {
          const node = draft.nodes.find((n) => n.id === nodeId)
          if (node) node.notes = notes
        })
      },
      updateGroupNotes: (groupId, notes) => {
        history.mutateFlow((draft) => {
          const group = draft.groups?.find((g) => g.id === groupId)
          if (group) group.notes = notes
        })
      },
      updateDocumentNotes: (notes) => {
        history.mutateFlow((draft) => {
          draft.meta = { ...draft.meta, notes }
        })
      },
      updateNodeConfig: (nodeId, config) => {
        history.mutateFlow((draft) => {
          const node = draft.nodes.find((n) => n.id === nodeId)
          if (node) node.config = config
        })
      },
      updatePortLabel: (nodeId, portId, label) => {
        history.mutateFlow((draft) => {
          const node = draft.nodes.find((n) => n.id === nodeId)
          if (!node) return
          const ports = resolveNodePorts(node).map((p) =>
            p.id === portId ? { ...p, label } : p,
          )
          node.ports = ports
        })
      },
      addPort: (nodeId, direction: FlowPortDirection) => {
        history.mutateFlow((draft) => {
          const node = draft.nodes.find((n) => n.id === nodeId)
          if (!node) return
          const ports = [...resolveNodePorts(node)]
          const id = `${direction}-${crypto.randomUUID().slice(0, 4)}`
          ports.push({
            id,
            direction,
            label:
              direction === 'in'
                ? `in ${ports.filter((p) => p.direction === 'in').length + 1}`
                : `out ${ports.filter((p) => p.direction === 'out').length + 1}`,
          })
          node.ports = ports
        })
      },
      removePort: (nodeId, portId) => {
        history.mutateFlow((draft) => {
          const node = draft.nodes.find((n) => n.id === nodeId)
          if (!node) return
          const ports = resolveNodePorts(node)
          if (ports.length <= 1) return
          const hasEdge = draft.edges.some(
            (e) =>
              (e.source === nodeId && e.sourceHandle === portId) ||
              (e.target === nodeId && e.targetHandle === portId),
          )
          if (hasEdge) return
          node.ports = ports.filter((p) => p.id !== portId)
        })
      },
      runQuickAction: (nodeId, actionId) => {
        history.mutateFlow((draft) => {
          const parent = draft.nodes.find((n) => n.id === nodeId)
          if (!parent) return
          const parentDef = getFlowElementDefinition(parent.kind)
          const action = parentDef.quickActions?.find((a) => a.id === actionId)
          if (!action) return
          const childId = nextNodeId()
          const child = createFlowNode(action.childKind, childId, { x: 0, y: 0 })
          draft.nodes.push(child)
          const parentOut = resolveNodePorts(parent).find((p) => p.direction === 'out')
          const childIn = resolveNodePorts(child).find((p) => p.direction === 'in')
          if (parentOut && childIn) {
            draft.edges.push({
              id: `edge-${crypto.randomUUID().slice(0, 8)}`,
              source: parent.id,
              target: child.id,
              sourceHandle: parentOut.id,
              targetHandle: childIn.id,
            })
          }
          realignDraft(draft)
        })
        requestAnimationFrame(() => canvasHandleRef.current?.zoomFit())
      },
      duplicateNode: (nodeId) => {
        history.mutateFlow((draft) => {
          const node = draft.nodes.find((n) => n.id === nodeId)
          if (!node) return
          const copy = structuredClone(node)
          copy.id = nextNodeId()
          copy.label = `${node.label} copy`
          copy.x = (node.x ?? 0) + 32
          copy.y = (node.y ?? 0) + 32
          draft.nodes.push(copy)
        })
      },
      deleteNode: (nodeId) => {
        history.mutateFlow((draft) => {
          draft.nodes = draft.nodes.filter((n) => n.id !== nodeId)
          draft.edges = draft.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
        })
        setContentExpandedById((prev) => {
          if (!(nodeId in prev)) return prev
          const next = { ...prev }
          delete next[nodeId]
          return next
        })
        setSelectedNodes((prev) => prev.filter((n) => n.id !== nodeId))
      },
      portHasEdges: (nodeId, portId) =>
        flow.edges.some(
          (e) =>
            (e.source === nodeId && e.sourceHandle === portId) ||
            (e.target === nodeId && e.targetHandle === portId),
        ),
      connectedTargetLabel: (nodeId, sourceHandle) => {
        const edge = flow.edges.find(
          (e) => e.source === nodeId && (e.sourceHandle ?? 'out') === sourceHandle,
        )
        if (!edge) return null
        return flow.nodes.find((n) => n.id === edge.target)?.label ?? null
      },
    }),
    [
      flow.edges,
      flow.nodes,
      history.mutateFlow,
      isContentExpanded,
      lastDirectedLayout,
      layoutMode,
      realignDraft,
      setContentExpanded,
      toolkit,
    ],
  )

  const shellStyle = {
    '--theme-flow-palette-width': `${SIDE_PANEL_WIDTH}px`,
  } as CSSProperties

  if (variant === 'embed') {
    return (
      <FlowEditorUiProvider value={uiValue}>
        <div className={['theme-flow-editor', 'theme-flow-editor--embed', className].filter(Boolean).join(' ')}>
          <FlowEditorCanvas
            flow={flow}
            editable={false}
            rearrange
            interactionMode="select"
            showMinimap={false}
            showZoomOverlay
            allowFullscreenExpand
            fullscreenTitle={title.trim() || 'Flow'}
            layoutDirection={directedLayout}
            onFlowChange={history.commitFlow}
            onReady={(handle) => {
              canvasHandleRef.current = handle
              if (!autoLayoutOnReady || didAutoLayoutRef.current) return
              didAutoLayoutRef.current = true
              requestAnimationFrame(() => handle.autoLayout(autoLayoutOnReady))
            }}
          />
        </div>
      </FlowEditorUiProvider>
    )
  }

  return (
    <FlowEditorUiProvider value={uiValue}>
      <div className={['theme-flow-editor', className].filter(Boolean).join(' ')} style={shellStyle}>
        <FlowEditorToolbar
          title={title}
          onTitleChange={handleTitleChange}
          onUndo={history.undo}
          onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onSave={handleSave}
          onExport={handleExport}
          onRefresh={handleRefresh}
          layoutMode={layoutMode}
          onLayoutModeChange={handleLayoutModeChange}
          interactionMode={interactionMode}
          onInteractionModeChange={setInteractionMode}
          snapToGrid={snapToGrid}
          onSnapToggle={() => setSnapToGrid((v) => !v)}
          showGrid={showGrid}
          onGridToggle={() => setShowGrid((v) => !v)}
          showMinimap={showMinimap}
          onMinimapToggle={() => setShowMinimap((v) => !v)}
          sidePanel={sidePanel}
          onSidePanelChange={setSidePanel}
          selectedNodes={selectedNodes}
          selectedEdges={selectedEdges}
          canGroup={canGroup}
          canUngroup={canUngroup}
          flow={flow}
          onPatchNodeChrome={handlePatchNodeChrome}
          onPatchEdges={handlePatchEdges}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
        />

        <div
            className={[
              'theme-flow-editor__body',
              sidePanel === 'closed' ? 'theme-flow-editor__body--palette-closed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
          <div
            className={[
              'theme-flow-editor__palette-host',
              sidePanel === 'closed' ? 'theme-flow-editor__palette-host--closed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={sidePanel === 'closed'}
          >
            <div className="theme-flow-editor__palette-inner">
              {sidePanel === 'templates' ? (
                <FlowEditorTemplatePanel
                  onInsertTemplate={handleInsertTemplate}
                  onClose={() => setSidePanel('closed')}
                />
              ) : (
                <FlowEditorNodePalette
                  onAddKind={handleAddKind}
                  onClose={() => setSidePanel('closed')}
                />
              )}
            </div>
          </div>
          <FlowEditorCanvas
            flow={flow}
            editable
            interactionMode={interactionMode}
            snapToGrid={snapToGrid}
            showGrid={showGrid}
            showMinimap={showMinimap}
            showZoomOverlay
            allowFullscreenExpand
            fullscreenTitle={title.trim() || 'Flow'}
            layoutDirection={directedLayout}
            onFlowChange={handleFlowChange}
            onInsertTemplateAt={handleInsertTemplateAt}
            onSelectionChange={(nodes, edges) => {
              setSelectedNodes(nodes)
              setSelectedEdges(edges)
            }}
            onReady={(handle) => {
              canvasHandleRef.current = handle
            }}
            className="theme-flow-editor__canvas"
          />
          <FlowEditorInspector
            flow={flow}
            selectedNodes={selectedNodes}
            selectedEdges={selectedEdges}
            onUpdateEdgeLabel={handleUpdateEdgeLabel}
          />
        </div>
      </div>
    </FlowEditorUiProvider>
  )
})
