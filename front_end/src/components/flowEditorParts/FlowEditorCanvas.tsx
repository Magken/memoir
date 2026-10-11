import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  addEdge,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnNodeDrag,
  type OnReconnect,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Network } from 'lucide-react'
import { FLOW_EDGE_DEFAULT_STROKE_WIDTH } from '../../lib/flowEditor/flowChromePresets'
import { FLOW_EDGE_LABEL_CHROME } from '../../lib/flowEditor/flowEdgePresets'
import { createFlowNode, getFlowElementDefinition, isValidFlowConnection } from '../../lib/flowEditor/flowElementRegistry'
import {
  applyDagreLayout,
  flowDocumentToReactFlow,
  reactFlowToFlowDocument,
  resizeFlowGroupFrames,
  type FlowLayoutDirection,
} from '../../lib/flowEditor/reactFlowBridge'
import { FLOW_GROUP_NODE_TYPE } from '../../lib/flowEditor/flowGroups'
import { cancelFlowGroupFitAnimation } from '../../lib/flowEditor/animateFlowGroupFit'
import {
  applyFlowCollisions,
  collectFlowNodeSizes,
} from '../../lib/flowEditor/resolveNodeCollisions'
import type { FlowDocument, FlowElementNodeData } from '../../lib/flowEditor/types'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'
import { CanvasFullscreenModal } from '../rendererParts/CanvasFullscreenModal'
import { CanvasZoomMenu } from '../rendererParts/CanvasZoomMenu'
import type { FlowCanvasInteractionMode } from './FlowEditorToolbar'
import { FLOW_DND_MIME } from './FlowEditorNodePalette'
import { FLOW_TEMPLATE_DND_MIME } from './FlowEditorTemplatePanel'
import { FlowElementNode } from './nodes/FlowElementNode'
import { FlowGroupFrameNode } from './nodes/FlowGroupFrameNode'
import type { FlowTemplateId } from '../../lib/flowEditor/flowTemplateCatalog'

export type FlowEditorCanvasHandle = {
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
  zoomFit: () => void
  autoLayout: (direction?: FlowLayoutDirection) => void
  resolveOverlaps: () => void
  exportPng: () => Promise<Blob>
  getViewportElement: () => HTMLElement | null
}

type FlowEditorCanvasProps = {
  flow: FlowDocument
  editable?: boolean
  /**
   * View-only rearrange: drag nodes, marquee-select, zoom.
   * No add, delete, or reconnect.
   */
  rearrange?: boolean
  /** Select enables marquee; pan drags the viewport. */
  interactionMode?: FlowCanvasInteractionMode
  snapToGrid?: boolean
  showGrid?: boolean
  showMinimap?: boolean
  showZoomOverlay?: boolean
  /** Mermaid/Force parity — Expand opens a fullscreen canvas modal. */
  allowFullscreenExpand?: boolean
  fullscreenTitle?: string
  /** Bump to re-fit after fullscreen open. */
  viewportRevision?: number
  /** Directed layout used for Realign and post-add dagre. */
  layoutDirection?: FlowLayoutDirection
  onFlowChange: (doc: FlowDocument) => void
  onReady?: (handle: FlowEditorCanvasHandle) => void
  onSelectionChange?: (nodes: Node[], edges: Edge[]) => void
  /** Drop a grouped-pipeline template at flow coords (palette-style DnD). */
  onInsertTemplateAt?: (id: FlowTemplateId, position: { x: number; y: number }) => void
  className?: string
}

const DEFAULT_EDGE_OPTIONS = {
  markerEnd: MarkerType.ArrowClosed,
  style: { strokeWidth: FLOW_EDGE_DEFAULT_STROKE_WIDTH },
  ...FLOW_EDGE_LABEL_CHROME,
} as const

const nodeTypes = {
  flowElement: FlowElementNode,
  [FLOW_GROUP_NODE_TYPE]: FlowGroupFrameNode,
}

const SNAP_GRID: [number, number] = [16, 16]

const FIT_VIEW_OPTIONS = { padding: 0.2, maxZoom: 1 } as const

const COLLISION_OPTS = { margin: SNAP_GRID[0], maxIterations: 12 } as const
/** Lighter mid-drag resolve — full settle runs on drag-stop. */
const DRAG_COLLISION_OPTS = { margin: SNAP_GRID[0], maxIterations: 4 } as const

function withViewDrag(nodes: Node[], rearrange: boolean, editable: boolean): Node[] {
  if (!rearrange || editable) return nodes
  return nodes.map((node) => ({ ...node, dragHandle: undefined }))
}

function ancestorFrameIds(nodes: Node[], nodeId: string): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const ids = new Set<string>()
  let parentId = byId.get(nodeId)?.parentId
  while (parentId) {
    ids.add(parentId)
    parentId = byId.get(parentId)?.parentId
  }
  return ids
}

function FlowEditorCanvasInner({
  flow,
  editable = true,
  rearrange = false,
  interactionMode = 'pan',
  snapToGrid = false,
  showGrid = false,
  showMinimap = true,
  showZoomOverlay = true,
  allowFullscreenExpand = true,
  fullscreenTitle = 'Flow',
  viewportRevision = 0,
  layoutDirection = 'LR',
  onFlowChange,
  onReady,
  onSelectionChange,
  onInsertTemplateAt,
  className = '',
}: FlowEditorCanvasProps) {
  const initial = useMemo(() => {
    const next = flowDocumentToReactFlow(flow)
    return { ...next, nodes: withViewDrag(next.nodes, rearrange, editable) }
  }, [])
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const reactFlow = useReactFlow()
  const viewportRef = useRef<HTMLDivElement>(null)
  const metaRef = useRef(flow.meta)
  const groupsRef = useRef(flow.groups)
  const viewportPersistRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const edgesRef = useRef(edges)
  edgesRef.current = edges
  const layoutDirectionRef = useRef(layoutDirection)
  layoutDirectionRef.current = layoutDirection
  const dragPinnedRef = useRef<Set<string> | null>(null)
  const dragRafRef = useRef(0)
  const pendingDragNodeRef = useRef<Node | null>(null)
  const nodeIdsKeyRef = useRef(flow.nodes.map((n) => n.id).join('|'))
  const groupKeyRef = useRef((flow.groups ?? []).map((g) => g.id).join('|'))
  const canRearrange = editable || rearrange
  const selectMode = canRearrange && interactionMode === 'select'
  const [zoomPercent, setZoomPercent] = useState(() =>
    flow.viewport?.zoom ? Math.round(Math.min(flow.viewport.zoom, 1) * 100) : 100,
  )
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [fullscreenRevision, setFullscreenRevision] = useState(0)

  const syncZoomLabel = useCallback(() => {
    setZoomPercent(Math.round(reactFlow.getViewport().zoom * 100))
  }, [reactFlow])

  useEffect(() => {
    if (!viewportRevision) return
    requestAnimationFrame(() => {
      void reactFlow.fitView(FIT_VIEW_OPTIONS).then(() => syncZoomLabel())
    })
  }, [viewportRevision, reactFlow, syncZoomLabel])

  useEffect(() => {
    metaRef.current = flow.meta
    groupsRef.current = flow.groups
  }, [flow.meta, flow.groups])

  useEffect(() => {
    const zoom = reactFlow.getViewport().zoom
    // Prefer live measured sizes so new group frames wrap real Card dimensions.
    const sizeById = collectFlowNodeSizes(reactFlow.getNodes(), zoom)
    const next = flowDocumentToReactFlow(flow, { sizeById })
    const nextGroupKey = (flow.groups ?? []).map((g) => g.id).join('|')
    const groupsChanged = groupKeyRef.current !== nextGroupKey

    setNodes((prev) => {
      const selectedIds = new Set(prev.filter((n) => n.selected).map((n) => n.id))
      return withViewDrag(
        next.nodes.map((n) => (selectedIds.has(n.id) ? { ...n, selected: true } : n)),
        rearrange,
        editable,
      )
    })
    setEdges((prev) => {
      const selectedIds = new Set(prev.filter((e) => e.selected).map((e) => e.id))
      return next.edges.map((e) => (selectedIds.has(e.id) ? { ...e, selected: true } : e))
    })

    // Fit when the node set changes (load / refresh / prototype).
    const nodeIdsKey = flow.nodes.map((n) => n.id).join('|')
    if (nodeIdsKeyRef.current !== nodeIdsKey) {
      nodeIdsKeyRef.current = nodeIdsKey
      requestAnimationFrame(() => {
        void reactFlow.fitView(FIT_VIEW_OPTIONS).then(() => syncZoomLabel())
      })
    }
    groupKeyRef.current = nextGroupKey

    // After group create/disassemble, remount frames then size from live DOM (2 frames).
    if (groupsChanged) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const z = reactFlow.getViewport().zoom
          setNodes((nds) => {
            const sizes = collectFlowNodeSizes(nds, z)
            return resizeFlowGroupFrames(nds, sizes)
          })
        })
      })
    }
  }, [editable, flow, reactFlow, rearrange, setEdges, setNodes, syncZoomLabel])

  const emitChange = useCallback(
    (nextNodes: Node[], nextEdges: Edge[], viewport?: Viewport) => {
      onFlowChange(
        reactFlowToFlowDocument(
          nextNodes,
          nextEdges,
          viewport ?? reactFlow.getViewport(),
          groupsRef.current,
          metaRef.current,
        ),
      )
    },
    [onFlowChange, reactFlow],
  )

  /** Never call emitChange inside setNodes/setEdges updaters — that updates FlowEditor mid-render. */
  const emitChangeDeferred = useCallback(
    (nextNodes: Node[], nextEdges: Edge[], viewport?: Viewport) => {
      queueMicrotask(() => emitChange(nextNodes, nextEdges, viewport))
    },
    [emitChange],
  )

  const handleRealign = useCallback(() => {
    const zoom = reactFlow.getViewport().zoom
    const sizeById = collectFlowNodeSizes(nodes, zoom)
    const doc = reactFlowToFlowDocument(
      nodes,
      edges,
      reactFlow.getViewport(),
      groupsRef.current,
      metaRef.current,
    )
    const laid = applyDagreLayout(doc, layoutDirectionRef.current, { sizeById })
    const rf = flowDocumentToReactFlow(laid, { sizeById })
    const collided = applyFlowCollisions(rf.nodes, {
      ...COLLISION_OPTS,
      margin: 24,
      maxIterations: 32,
      sizeOverrides: sizeById,
    })
    const framed = resizeFlowGroupFrames(collided, sizeById)
    setNodes(framed)
    setEdges(rf.edges)
    emitChange(framed, rf.edges)
    requestAnimationFrame(() => {
      void reactFlow.fitView(FIT_VIEW_OPTIONS).then(() => syncZoomLabel())
    })
  }, [edges, emitChange, nodes, reactFlow, setEdges, setNodes, syncZoomLabel])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = editable ? changes : changes.filter((change) => change.type !== 'remove')
      onNodesChange(next)
    },
    [editable, onNodesChange],
  )

  const handleNodeDragStart: OnNodeDrag = useCallback((_event, node) => {
    cancelFlowGroupFitAnimation()
    dragPinnedRef.current = new Set([node.id])
  }, [])

  const handleNodeDrag: OnNodeDrag = useCallback(
    (_event, node) => {
      pendingDragNodeRef.current = node
      if (dragRafRef.current) return
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = 0
        const dragged = pendingDragNodeRef.current
        if (!dragged) return
        const pinned = dragPinnedRef.current ?? new Set([dragged.id])
        dragPinnedRef.current = pinned
        const zoom = reactFlow.getViewport().zoom
        // Prefer RF measured sizes; live-measure only the dragged card.
        const liveIds = new Set([dragged.id])
        setNodes((nds) => {
          const merged = nds.map((n) =>
            n.id === dragged.id ? { ...n, position: { ...dragged.position } } : n,
          )
          const sizes = collectFlowNodeSizes(merged, zoom, { liveIds })
          const collided = applyFlowCollisions(merged, {
            ...DRAG_COLLISION_OPTS,
            pinnedIds: pinned,
            sizeOverrides: sizes,
          })
          const onlyParentIds = ancestorFrameIds(collided, dragged.id)
          return onlyParentIds.size
            ? resizeFlowGroupFrames(collided, sizes, { onlyParentIds })
            : collided
        })
      })
    },
    [reactFlow, setNodes],
  )

  const handleNodeDragStop = useCallback(() => {
    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current)
      dragRafRef.current = 0
    }
    pendingDragNodeRef.current = null
    dragPinnedRef.current = null
    const zoom = reactFlow.getViewport().zoom
    setNodes((nds) => {
      // Settle: live-measure once for accurate expanded cards.
      const overrides = collectFlowNodeSizes(nds, zoom)
      const collided = applyFlowCollisions(nds, {
        ...COLLISION_OPTS,
        maxIterations: 24,
        sizeOverrides: overrides,
      })
      const next = resizeFlowGroupFrames(collided, overrides)
      emitChangeDeferred(next, edgesRef.current)
      return next
    })
  }, [emitChangeDeferred, reactFlow, setNodes])

  useEffect(() => {
    return () => {
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current)
    }
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            id: `edge-${crypto.randomUUID().slice(0, 8)}`,
            ...DEFAULT_EDGE_OPTIONS,
          },
          eds,
        )
        emitChangeDeferred(nodes, next)
        return next
      })
    },
    [emitChangeDeferred, nodes, setEdges],
  )

  const handleSelectionChange = useCallback(
    (selNodes: Node[], selEdges: Edge[]) => {
      // Defer — RF SelectionListener can fire during Canvas render.
      queueMicrotask(() => onSelectionChange?.(selNodes, selEdges))
    },
    [onSelectionChange],
  )

  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      setEdges((eds) => {
        const next = reconnectEdge(oldEdge, newConnection, eds)
        emitChangeDeferred(nodes, next)
        return next
      })
    },
    [emitChangeDeferred, nodes, setEdges],
  )

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const currentNodes = reactFlow.getNodes()
      const currentEdges = edgesRef.current
      const sourceNode = currentNodes.find((n) => n.id === connection.source)
      const targetNode = currentNodes.find((n) => n.id === connection.target)
      if (!sourceNode || !targetNode) return false
      return isValidFlowConnection({
        sourceKind: (sourceNode.data as FlowElementNodeData).kind,
        targetKind: (targetNode.data as FlowElementNodeData).kind,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        sourceId: connection.source,
        targetId: connection.target,
        doc: reactFlowToFlowDocument(
          currentNodes,
          currentEdges,
          reactFlow.getViewport(),
          groupsRef.current,
          metaRef.current,
        ),
      })
    },
    [reactFlow],
  )

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const templateId = event.dataTransfer.getData(FLOW_TEMPLATE_DND_MIME) as FlowTemplateId
      if (templateId && onInsertTemplateAt) {
        onInsertTemplateAt(templateId, position)
        return
      }

      const kind = event.dataTransfer.getData(FLOW_DND_MIME)
      if (!kind) return
      const id = `node-${crypto.randomUUID().slice(0, 8)}`
      const flowNode = createFlowNode(kind, id, { x: position.x, y: position.y })
      const def = getFlowElementDefinition(kind)
      const newNode: Node<FlowElementNodeData> = {
        id,
        type: def.nodeComponent ?? 'flowElement',
        position,
        dragHandle: '.theme-flow-editor__node-header',
        data: {
          kind: flowNode.kind,
          label: flowNode.label,
          config: flowNode.config,
          ports: flowNode.ports ?? [],
          category: def.category,
        },
      }
      setNodes((nds) => {
        const next = nds.concat(newNode)
        // Drop collision: applyFlowCollisions (siblings + free/frames) — not resolveNodeCollisions alone.
        const zoom = reactFlow.getViewport().zoom
        const overrides = collectFlowNodeSizes(next, zoom)
        const collided = applyFlowCollisions(next, {
          ...COLLISION_OPTS,
          maxIterations: 16,
          pinnedIds: new Set([id]),
          sizeOverrides: overrides,
        })
        emitChangeDeferred(collided, edges)
        return collided
      })
    },
    [edges, emitChangeDeferred, onInsertTemplateAt, reactFlow, setNodes],
  )

  const handleMoveEnd = useCallback(() => {
    syncZoomLabel()
    if (viewportPersistRef.current) clearTimeout(viewportPersistRef.current)
    viewportPersistRef.current = setTimeout(() => {
      emitChange(nodes, edges, reactFlow.getViewport())
    }, 200)
  }, [edges, emitChange, nodes, reactFlow, syncZoomLabel])

  useEffect(() => {
    return () => {
      if (viewportPersistRef.current) clearTimeout(viewportPersistRef.current)
    }
  }, [])

  useEffect(() => {
    if (!onReady) return
    onReady({
      zoomIn: () => {
        reactFlow.zoomIn()
        syncZoomLabel()
      },
      zoomOut: () => {
        reactFlow.zoomOut()
        syncZoomLabel()
      },
      zoomReset: () => {
        reactFlow.setViewport({ x: 0, y: 0, zoom: 1 })
        syncZoomLabel()
      },
      zoomFit: () => {
        void reactFlow.fitView(FIT_VIEW_OPTIONS).then(() => syncZoomLabel())
      },
      autoLayout: (direction) => {
        const dir = direction ?? layoutDirectionRef.current
        const zoom = reactFlow.getViewport().zoom
        const sizeById = collectFlowNodeSizes(nodes, zoom)
        const doc = reactFlowToFlowDocument(nodes, edges, reactFlow.getViewport(), groupsRef.current, metaRef.current)
        const laid = applyDagreLayout(doc, dir, { sizeById })
        const rf = flowDocumentToReactFlow(laid, { sizeById })
        const collided = applyFlowCollisions(rf.nodes, {
          ...COLLISION_OPTS,
          margin: 24,
          maxIterations: 32,
          sizeOverrides: sizeById,
        })
        const framed = resizeFlowGroupFrames(collided, sizeById)
        setNodes(framed)
        setEdges(rf.edges)
        emitChange(framed, rf.edges)
        requestAnimationFrame(() => {
          void reactFlow.fitView(FIT_VIEW_OPTIONS).then(() => syncZoomLabel())
        })
      },
      resolveOverlaps: () => {
        const zoom = reactFlow.getViewport().zoom
        setNodes((nds) => {
          const overrides = collectFlowNodeSizes(nds, zoom)
          const collided = applyFlowCollisions(nds, {
            ...COLLISION_OPTS,
            maxIterations: 32,
            sizeOverrides: overrides,
          })
          const next = resizeFlowGroupFrames(collided, overrides)
          emitChangeDeferred(next, edgesRef.current)
          return next
        })
      },
      exportPng: async () => {
        const stage = viewportRef.current
        if (!stage) throw new Error('Stage not ready')
        const viewport = stage.querySelector('.react-flow__viewport') as HTMLElement | null
        if (!viewport) throw new Error('Viewport not ready')
        await reactFlow.fitView(FIT_VIEW_OPTIONS)
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        )
        const { exportFlowDiagramPng } = await import('../../lib/flowEditor/exportFlow')
        return exportFlowDiagramPng({
          stage,
          viewport,
          nodes: reactFlow.getNodes(),
          getViewport: () => reactFlow.getViewport(),
          setViewport: (vp) => {
            reactFlow.setViewport(vp)
          },
        })
      },
      getViewportElement: () => viewportRef.current?.querySelector('.react-flow__viewport') as HTMLElement | null,
    })
  }, [edges, emitChange, emitChangeDeferred, nodes, onReady, reactFlow, setEdges, setNodes, syncZoomLabel])

  return (
    <>
      <div ref={viewportRef} className={['theme-flow-editor__stage', className].filter(Boolean).join(' ')}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        nodesDraggable={canRearrange}
        nodesConnectable={editable}
        elementsSelectable={canRearrange}
        onSelectionChange={
          canRearrange && onSelectionChange
            ? ({ nodes: selNodes, edges: selEdges }) => {
                handleSelectionChange(selNodes, selEdges)
              }
            : undefined
        }
        onNodesChange={canRearrange ? handleNodesChange : undefined}
        onEdgesChange={editable ? onEdgesChange : undefined}
        onConnect={editable ? onConnect : undefined}
        onReconnect={editable ? onReconnect : undefined}
        edgesReconnectable={editable}
        isValidConnection={editable ? isValidConnection : undefined}
        onDrop={editable ? onDrop : undefined}
        onDragOver={editable ? onDragOver : undefined}
        onNodeDragStart={canRearrange ? handleNodeDragStart : undefined}
        onNodeDrag={canRearrange ? handleNodeDrag : undefined}
        onNodeDragStop={canRearrange ? handleNodeDragStop : undefined}
        onMoveEnd={handleMoveEnd}
        snapToGrid={editable && snapToGrid}
        snapGrid={SNAP_GRID}
        selectionOnDrag={selectMode}
        selectionMode={SelectionMode.Partial}
        panOnDrag={selectMode ? [1, 2] : true}
        multiSelectionKeyCode="Shift"
        deleteKeyCode={editable ? ['Backspace', 'Delete'] : null}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        onlyRenderVisibleElements
        minZoom={0.25}
        maxZoom={2}
        onInit={(instance) => {
          // Two frames after mount: custom Card nodes finish measuring before fit.
          const fit = () => {
            void instance.fitView(FIT_VIEW_OPTIONS).then(() => {
              setZoomPercent(Math.round(instance.getViewport().zoom * 100))
            })
          }
          requestAnimationFrame(() => {
            requestAnimationFrame(fit)
          })
        }}
        proOptions={{ hideAttribution: true }}
        className={[
          'theme-flow-editor__react-flow',
          selectMode
            ? 'theme-flow-editor__react-flow--select'
            : 'theme-flow-editor__react-flow--pan',
        ].join(' ')}
      >
        {showGrid ? (
          <Background
            variant={BackgroundVariant.Dots}
            gap={SNAP_GRID[0]}
            size={1.5}
            color="var(--theme-border)"
            className="theme-flow-editor__background"
          />
        ) : null}
        {showMinimap ? (
          <MiniMap
            className="theme-flow-editor__minimap"
            position="bottom-left"
            style={{ width: 100, height: 72 }}
            nodeColor={(node) => {
              const cat = (node.data as FlowElementNodeData)?.category
              if (cat === 'action') return 'var(--theme-accent)'
              if (cat === 'io') return 'var(--theme-success, #22c55e)'
              if (cat === 'flow') return 'var(--theme-warning, #f59e0b)'
              return 'var(--theme-border)'
            }}
            pannable
            zoomable
          />
        ) : null}
      </ReactFlow>
      {showZoomOverlay ? (
        <div className="theme-flow-editor__canvas-zoom">
          <CanvasZoomMenu
            zoomLabel={`${zoomPercent}%`}
            onZoomOut={() => {
              reactFlow.zoomOut()
              syncZoomLabel()
            }}
            onZoomReset={() => {
              reactFlow.setViewport({ x: 0, y: 0, zoom: 1 })
              syncZoomLabel()
            }}
            onZoomIn={() => {
              reactFlow.zoomIn()
              syncZoomLabel()
            }}
            onZoomFit={() => {
              void reactFlow.fitView(FIT_VIEW_OPTIONS).then(() => syncZoomLabel())
            }}
            onExpandFullscreen={
              allowFullscreenExpand
                ? () => {
                    setFullscreenRevision((v) => v + 1)
                    setFullscreenOpen(true)
                  }
                : undefined
            }
            trailing={
              <Tooltip content="Organise">
                <IconButton
                  icon={Network}
                  aria-label="Organise"
                  size="xs"
                  variant="ghost"
                  onClick={handleRealign}
                />
              </Tooltip>
            }
          />
        </div>
      ) : null}
      </div>

      {allowFullscreenExpand ? (
        <CanvasFullscreenModal
          open={fullscreenOpen}
          title={fullscreenTitle}
          onClose={() => setFullscreenOpen(false)}
        >
          <FlowEditorCanvas
            flow={flow}
            editable={false}
            showMinimap={false}
            showZoomOverlay
            allowFullscreenExpand={false}
            fullscreenTitle={fullscreenTitle}
            viewportRevision={fullscreenRevision}
            layoutDirection={layoutDirection}
            onFlowChange={onFlowChange}
            className="theme-flow-editor__stage--fullscreen"
          />
        </CanvasFullscreenModal>
      ) : null}
    </>
  )
}

export function FlowEditorCanvas(props: FlowEditorCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowEditorCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
