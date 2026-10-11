import { useUpdateNodeInternals, useReactFlow, type NodeProps } from '@xyflow/react'
import { memo, useEffect, useRef } from 'react'
import { Card } from '../../Card'
import { Tag } from '../../Tag'
import { useFlowEditorUi } from '../../../lib/flowEditor/FlowEditorUiContext'
import { getFlowElementDefinition } from '../../../lib/flowEditor/flowElementRegistry'
import { animateFlowGroupFit } from '../../../lib/flowEditor/animateFlowGroupFit'
import {
  flowGroupFitNeedsEdgeAnimation,
  resizeFlowGroupFrames,
} from '../../../lib/flowEditor/reactFlowBridge'
import {
  applyFlowCollisions,
  collectFlowNodeSizes,
  measureFlowNodeSize,
} from '../../../lib/flowEditor/resolveNodeCollisions'
import type { FlowElementNodeData, FlowNodeSize } from '../../../lib/flowEditor/types'
import { FlowNodeContent } from './FlowNodeContent'
import { FlowNodeHeader } from './FlowNodeHeader'
import { FlowNodePortRail } from './FlowNodePortRail'

const CATEGORY_CLASS: Record<string, string> = {
  display: 'theme-flow-editor__node--display',
  action: 'theme-flow-editor__node--action',
  io: 'theme-flow-editor__node--io',
  flow: 'theme-flow-editor__node--flow',
}

function resolveSizeClass(data: FlowElementNodeData, defaultSize: FlowNodeSize | undefined): FlowNodeSize {
  if (data.kind === 'display.note') return 'lg'
  const base = defaultSize ?? 'md'
  if (data.ports.length >= 5) return 'lg'
  if (data.ports.length >= 3 && base === 'sm') return 'md'
  return base
}

function findRfNodeElement(nodeId: string): HTMLElement | null {
  return document.querySelector(`.react-flow__node[data-id="${CSS.escape(nodeId)}"]`) as HTMLElement | null
}

function FlowElementNodeInner({ id, data, selected }: NodeProps) {
  const nodeData = data as FlowElementNodeData
  const definition = getFlowElementDefinition(nodeData.kind)
  const updateNodeInternals = useUpdateNodeInternals()
  const { setNodes, getViewport } = useReactFlow()
  const { isContentExpanded, setContentExpanded } = useFlowEditorUi()
  const bodySlotRef = useRef<HTMLDivElement>(null)
  const lastPushSizeRef = useRef<{ w: number; h: number } | null>(null)

  const hasContent = Boolean(definition.contentRenderer && definition.contentRenderer !== 'none')
  const canCollapse = Boolean(definition.collapsible && hasContent)
  const expanded = Boolean(hasContent && isContentExpanded(id))
  const size = resolveSizeClass(nodeData, definition.defaultSize)
  const categoryClass = CATEGORY_CLASS[nodeData.category] ?? ''
  const chrome = nodeData.chrome
  const chromeStyle = {
    ...(chrome?.fill ? { ['--flow-node-fill' as string]: chrome.fill } : {}),
    ...(chrome?.borderColor ? { ['--flow-node-border-color' as string]: chrome.borderColor } : {}),
    ...(chrome?.borderStyle ? { ['--flow-node-border-style' as string]: chrome.borderStyle } : {}),
    ...(chrome?.borderWidth != null
      ? { ['--flow-node-border-width' as string]: `${chrome.borderWidth}px` }
      : {}),
  }

  useEffect(() => {
    updateNodeInternals(id)
  }, [id, expanded, size, nodeData.ports.length, updateNodeInternals])

  /**
   * Live push while this card’s rendered size changes (expand/collapse animation).
   * Instant fit so the group frame tracks the card; left/up use --snap (no CSS fight).
   * Only live-measures this node — siblings use RF measured boxes.
   */
  useEffect(() => {
    let cancelled = false
    let raf = 0
    let ro: ResizeObserver | null = null
    const pinned = new Set([id])
    const liveIds = new Set([id])

    const pushNeighbors = () => {
      raf = 0
      if (cancelled) return
      const zoom = getViewport().zoom
      const measured = measureFlowNodeSize(id, zoom)
      if (!measured) return

      const prev = lastPushSizeRef.current
      if (
        prev &&
        Math.abs(prev.w - measured.width) < 0.5 &&
        Math.abs(prev.h - measured.height) < 0.5
      ) {
        return
      }
      let axes: { x: boolean; y: boolean } | undefined
      if (prev) {
        const growX = Math.abs(measured.width - prev.w) >= 0.5
        const growY = Math.abs(measured.height - prev.h) >= 0.5
        if (growX || growY) {
          // Only push along axes that actually changed size (expand down ≠ shift left).
          axes = { x: growX, y: growY }
        }
      }
      lastPushSizeRef.current = { w: measured.width, h: measured.height }

      setNodes((nds) => {
        const overrides = collectFlowNodeSizes(nds, zoom, { liveIds })
        overrides.set(id, measured)
        const collided = applyFlowCollisions(nds, {
          pinnedIds: pinned,
          sizeOverrides: overrides,
          margin: 16,
          maxIterations: 16,
          axes,
        })
        return resizeFlowGroupFrames(collided, overrides)
      })
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(pushNeighbors)
    }

    let tries = 0
    const attach = () => {
      if (cancelled) return
      const el = findRfNodeElement(id)
      if (!el) {
        if (tries++ < 30) requestAnimationFrame(attach)
        return
      }
      ro = new ResizeObserver(schedule)
      ro.observe(el)
      schedule()
    }
    attach()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [getViewport, id, setNodes])

  useEffect(() => {
    const el = bodySlotRef.current
    if (!el) return
    const onEnd = () => {
      updateNodeInternals(id)
      requestAnimationFrame(() => {
        const zoom = getViewport().zoom
        const measured = measureFlowNodeSize(id, zoom)
        if (!measured) return
        lastPushSizeRef.current = { w: measured.width, h: measured.height }
        const liveIds = new Set([id])
        setNodes((nds) => {
          const overrides = collectFlowNodeSizes(nds, zoom, { liveIds })
          overrides.set(id, measured)
          // Transition end: sizes already settled — full axes OK for residual cleanup.
          const collided = applyFlowCollisions(nds, {
            pinnedIds: new Set([id]),
            sizeOverrides: overrides,
            margin: 16,
            maxIterations: 24,
          })
          const target = resizeFlowGroupFrames(collided, overrides)
          // Animate only frame pad-shift — start from already-separated siblings so
          // left/up fit never lerps neighbors *through* the expander.
          if (flowGroupFitNeedsEdgeAnimation(collided, target)) {
            animateFlowGroupFit(setNodes, collided, target)
            return collided
          }
          return target
        })
      })
    }
    el.addEventListener('transitionend', onEnd)
    return () => el.removeEventListener('transitionend', onEnd)
  }, [getViewport, id, setNodes, updateNodeInternals])

  return (
    <div className="theme-flow-editor__node-shell" style={chromeStyle}>
      <Card
        variant="raised"
        shadowVariant="none"
        className={[
          'theme-flow-editor__node',
          `theme-flow-editor__node--${size}`,
          data.kind === 'display.note' ? 'theme-flow-editor__node--note' : '',
          categoryClass,
          selected ? 'theme-flow-editor__node--selected' : '',
          expanded ? 'theme-flow-editor__node--expanded' : 'theme-flow-editor__node--compact',
          definition.previewWhenCollapsed ? 'theme-flow-editor__node--preview' : '',
          chrome?.fill || chrome?.borderColor || chrome?.borderStyle || chrome?.borderWidth
            ? 'theme-flow-editor__node--chrome'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <FlowNodeHeader
          nodeId={id}
          data={nodeData}
          definition={definition}
          expanded={expanded}
          canCollapse={canCollapse}
          onExpand={() => {
            if (!canCollapse) return
            setNodes((nds) =>
              nds.map((n) => ({
                ...n,
                selected: n.id === id,
              })),
            )
            setContentExpanded(id, true)
          }}
          onCollapse={() => setContentExpanded(id, false)}
        />

        {definition.previewWhenCollapsed ? (
          <div className="theme-flow-editor__node-preview nodrag nopan">
            <FlowNodeContent nodeId={id} data={nodeData} definition={definition} expanded={false} />
          </div>
        ) : null}

        <div
          ref={bodySlotRef}
          className={[
            'theme-flow-editor__node-body-slot',
            expanded ? 'theme-flow-editor__node-body-slot--open' : 'theme-flow-editor__node-body-slot--closed',
          ].join(' ')}
          aria-hidden={!expanded}
        >
          <div className="theme-flow-editor__node-body-clip">
            <div className="theme-flow-editor__node-body">
              <div className="theme-flow-editor__node-kind">
                <Tag size="xs">{definition.label}</Tag>
              </div>
              <FlowNodeContent nodeId={id} data={nodeData} definition={definition} expanded />
            </div>
          </div>
        </div>

        <FlowNodePortRail
          nodeId={id}
          data={nodeData}
          definition={definition}
          selected={Boolean(selected)}
          showChrome={expanded}
        />
      </Card>
    </div>
  )
}

/** Memo keeps planner / field bodies from re-rendering on every sibling drag tick. */
export const FlowElementNode = memo(FlowElementNodeInner)
