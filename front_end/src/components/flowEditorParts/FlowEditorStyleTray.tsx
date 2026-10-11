import { Activity, Group, PaintBucket, Palette, Ungroup } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Edge, Node } from '@xyflow/react'
import {
  ArrowTypeCurvedIcon,
  ArrowTypeElbowIcon,
  ArrowTypeStraightIcon,
  ArrowheadArrowIcon,
  ArrowheadClosedIcon,
  ArrowheadNoneIcon,
  StrokeStyleDashedIcon,
  StrokeStyleDottedIcon,
  StrokeStyleSolidIcon,
  StrokeWidthBoldIcon,
  StrokeWidthExtraBoldIcon,
  StrokeWidthThinIcon,
} from '../../lib/drawCanvas/drawIcons'
import {
  FLOW_EDGE_DEFAULT_STROKE_WIDTH,
  FLOW_EDGE_STROKE_OPTIONS,
  FLOW_EDGE_STROKE_WIDTH_OPTIONS,
  FLOW_NODE_BORDER_COLOR_OPTIONS,
  FLOW_NODE_BORDER_STYLE_OPTIONS,
  FLOW_NODE_BORDER_WIDTH_OPTIONS,
  FLOW_NODE_FILL_OPTIONS,
} from '../../lib/flowEditor/flowChromePresets'
import { FLOW_EDGE_MARKER_OPTIONS, FLOW_EDGE_TYPE_OPTIONS } from '../../lib/flowEditor/flowEdgePresets'
import type {
  FlowDocument,
  FlowEdgeStyleType,
  FlowElementNodeData,
  FlowNodeBorderStyle,
  FlowNodeChrome,
} from '../../lib/flowEditor/types'
import { isFlowGroupRfNode } from '../../lib/flowEditor/reactFlowBridge'
import { IconButton } from '../IconButton'
import { MenuButton, type MenuItem } from '../MenuButton'
import { ToolbarModeGroup } from '../ToolbarModeGroup'
import { Tooltip } from '../Tooltip'

export type FlowEdgeStylePatch = {
  label?: string
  type?: FlowEdgeStyleType
  animated?: boolean
  markerEnd?: string
  markerStart?: string
  stroke?: string
  strokeWidth?: number
}

type FlowEditorStyleTrayProps = {
  flow: FlowDocument
  selectedNodes: Node[]
  selectedEdges: Edge[]
  canGroup: boolean
  canUngroup: boolean
  onPatchNodeChrome: (nodeIds: string[], patch: Partial<FlowNodeChrome>) => void
  onPatchEdges: (edgeIds: string[], patch: FlowEdgeStylePatch) => void
  onGroup: () => void
  onUngroup: () => void
}

const BORDER_STYLE_ITEMS: MenuItem[] = FLOW_NODE_BORDER_STYLE_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
  icon:
    o.id === 'dashed'
      ? StrokeStyleDashedIcon
      : o.id === 'dotted'
        ? StrokeStyleDottedIcon
        : StrokeStyleSolidIcon,
}))

const WIDTH_ICON_BY_ID: Record<string, NonNullable<MenuItem['icon']>> = {
  '2': StrokeWidthThinIcon,
  '3': StrokeWidthBoldIcon,
  '4': StrokeWidthExtraBoldIcon,
}

const BORDER_WIDTH_ITEMS: MenuItem[] = FLOW_NODE_BORDER_WIDTH_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
  icon: WIDTH_ICON_BY_ID[o.id] ?? StrokeWidthBoldIcon,
}))

const STROKE_WIDTH_ITEMS: MenuItem[] = FLOW_EDGE_STROKE_WIDTH_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
  icon: WIDTH_ICON_BY_ID[o.id] ?? StrokeWidthBoldIcon,
}))

const EDGE_TYPE_ICON: Record<FlowEdgeStyleType, NonNullable<MenuItem['icon']>> = {
  default: ArrowTypeCurvedIcon,
  simplebezier: ArrowTypeCurvedIcon,
  straight: ArrowTypeStraightIcon,
  step: ArrowTypeElbowIcon,
  smoothstep: ArrowTypeElbowIcon,
}

const EDGE_TYPE_ITEMS: MenuItem[] = FLOW_EDGE_TYPE_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
  icon: EDGE_TYPE_ICON[o.id],
}))

const MARKER_ITEMS: MenuItem[] = FLOW_EDGE_MARKER_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
  icon:
    o.id === 'arrow'
      ? ArrowheadArrowIcon
      : o.id === 'arrowclosed'
        ? ArrowheadClosedIcon
        : ArrowheadNoneIcon,
}))

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>
}

function CompactMenu({
  label,
  items,
  selectedId,
  onSelect,
  icon,
  disabled = false,
}: {
  label: string
  items: readonly MenuItem[]
  selectedId: string
  onSelect: (id: string) => void
  icon?: MenuItem['icon']
  disabled?: boolean
}) {
  return (
    <MenuButton
      size="xs"
      variant="tray"
      menuSize="compact"
      portal
      portalZIndex={1200}
      scrollRail="hidden"
      triggerLabelAnim={false}
      disabled={disabled}
      label={label}
      icon={icon}
      iconDropdown={Boolean(icon)}
      items={[...items]}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  )
}

function markerPresetId(
  marker: Edge['markerStart'] | Edge['markerEnd'] | string | undefined,
): string {
  if (marker === 'arrow' || marker === 'arrowclosed') return marker
  if (typeof marker === 'object' && marker && 'type' in marker) {
    const t = (marker as { type?: string }).type
    if (t === 'arrow' || t === 'arrowclosed') return t
  }
  return 'none'
}

function widthMenuId(value: number, options: { id: string; value: number }[]): string {
  const exact = options.find((o) => o.value === value)
  if (exact) return exact.id
  let best = options[0]
  let bestDist = Math.abs(best.value - value)
  for (const o of options) {
    const d = Math.abs(o.value - value)
    if (d < bestDist) {
      best = o
      bestDist = d
    }
  }
  return best.id
}

/** Header Style + Group tray — animates open when a selection exists. */
export function FlowEditorStyleTray({
  flow,
  selectedNodes,
  selectedEdges,
  canGroup,
  canUngroup,
  onPatchNodeChrome,
  onPatchEdges,
  onGroup,
  onUngroup,
}: FlowEditorStyleTrayProps) {
  const elementNodes = selectedNodes.filter(
    (n): n is Node<FlowElementNodeData> => !isFlowGroupRfNode(n),
  )
  const nodeIds = elementNodes.map((n) => n.id)
  const edgeIds = selectedEdges.map((e) => e.id)
  const primaryNode = elementNodes[0]
  const primaryEdge = selectedEdges[0]
  const liveDocEdge = primaryEdge
    ? flow.edges.find((e) => e.id === primaryEdge.id)
    : undefined
  const styleNodes = elementNodes.length > 0
  const styleEdges = !styleNodes && selectedEdges.length > 0
  const styleOpen = styleNodes || styleEdges || selectedNodes.some(isFlowGroupRfNode)

  const chrome = primaryNode?.data.chrome ?? {}
  const fillId =
    FLOW_NODE_FILL_OPTIONS.find((o) => o.value === (chrome.fill ?? ''))?.id ?? 'default'
  const borderColorId =
    FLOW_NODE_BORDER_COLOR_OPTIONS.find((o) => o.value === (chrome.borderColor ?? ''))?.id ??
    'default'
  const borderStyle = chrome.borderStyle ?? 'solid'
  const borderWidthId = widthMenuId(chrome.borderWidth ?? 2, FLOW_NODE_BORDER_WIDTH_OPTIONS)

  const liveStyle = liveDocEdge?.style
  const edgeType = (liveStyle?.type ?? primaryEdge?.type ?? 'default') as FlowEdgeStyleType
  const edgeData = primaryEdge?.data as { stroke?: string; strokeWidth?: number } | undefined
  const stroke =
    liveStyle?.stroke ??
    (primaryEdge?.style?.stroke as string | undefined) ??
    edgeData?.stroke ??
    ''
  const strokeWidthValue =
    liveStyle?.strokeWidth ??
    (primaryEdge?.style?.strokeWidth as number | undefined) ??
    edgeData?.strokeWidth ??
    FLOW_EDGE_DEFAULT_STROKE_WIDTH
  const strokeWidthId = widthMenuId(strokeWidthValue, FLOW_EDGE_STROKE_WIDTH_OPTIONS)
  const strokeId = FLOW_EDGE_STROKE_OPTIONS.find((o) => o.value === stroke)?.id ?? 'default'
  const markerId = markerPresetId(
    liveStyle?.markerEnd != null
      ? liveStyle.markerEnd
      : primaryEdge?.markerEnd,
  )
  const edgeAnimated = Boolean(liveStyle?.animated ?? primaryEdge?.animated)

  return (
    <div
      className={[
        'theme-flow-editor__style-lane',
        styleOpen ? 'theme-flow-editor__style-lane--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!styleOpen}
    >
      <div className="theme-flow-editor__style-lane-clip">
        <div className="theme-flow-editor__style-lane-inner">
          {styleNodes || styleEdges ? (
            <>
              {/* Draw format ribbon: CompactMenus sit free — not inside ModeGroup shells */}
              <div className="theme-flow-editor__style-menus" role="group" aria-label="Style">
                {styleNodes ? (
                  <>
                    <Tip label="Fill">
                      <CompactMenu
                        label="Fill"
                        icon={PaintBucket}
                        selectedId={fillId}
                        items={FLOW_NODE_FILL_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                        onSelect={(id) => {
                          const next = FLOW_NODE_FILL_OPTIONS.find((o) => o.id === id)?.value ?? ''
                          onPatchNodeChrome(nodeIds, { fill: next || undefined })
                        }}
                      />
                    </Tip>
                    <Tip label="Border color">
                      <CompactMenu
                        label="Border"
                        icon={Palette}
                        selectedId={borderColorId}
                        items={FLOW_NODE_BORDER_COLOR_OPTIONS.map((o) => ({
                          id: o.id,
                          label: o.label,
                        }))}
                        onSelect={(id) => {
                          const next =
                            FLOW_NODE_BORDER_COLOR_OPTIONS.find((o) => o.id === id)?.value ?? ''
                          onPatchNodeChrome(nodeIds, { borderColor: next || undefined })
                        }}
                      />
                    </Tip>
                    <Tip label="Border style">
                      <CompactMenu
                        label="Border style"
                        icon={
                          borderStyle === 'dashed'
                            ? StrokeStyleDashedIcon
                            : borderStyle === 'dotted'
                              ? StrokeStyleDottedIcon
                              : StrokeStyleSolidIcon
                        }
                        selectedId={borderStyle}
                        items={BORDER_STYLE_ITEMS}
                        onSelect={(id) =>
                          onPatchNodeChrome(nodeIds, { borderStyle: id as FlowNodeBorderStyle })
                        }
                      />
                    </Tip>
                    <Tip label="Border width">
                      <CompactMenu
                        label="Width"
                        icon={WIDTH_ICON_BY_ID[borderWidthId] ?? StrokeWidthBoldIcon}
                        selectedId={borderWidthId}
                        items={BORDER_WIDTH_ITEMS}
                        onSelect={(id) => {
                          const next =
                            FLOW_NODE_BORDER_WIDTH_OPTIONS.find((o) => o.id === id)?.value ?? 2
                          onPatchNodeChrome(nodeIds, { borderWidth: next })
                        }}
                      />
                    </Tip>
                  </>
                ) : (
                  <>
                    <Tip label="Path type">
                      <CompactMenu
                        label="Path"
                        icon={EDGE_TYPE_ICON[edgeType] ?? ArrowTypeCurvedIcon}
                        selectedId={edgeType}
                        items={EDGE_TYPE_ITEMS}
                        onSelect={(id) => onPatchEdges(edgeIds, { type: id as FlowEdgeStyleType })}
                      />
                    </Tip>
                    <Tip label="Stroke color">
                      <CompactMenu
                        label="Stroke"
                        icon={Palette}
                        selectedId={strokeId}
                        items={FLOW_EDGE_STROKE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                        onSelect={(id) => {
                          const next = FLOW_EDGE_STROKE_OPTIONS.find((o) => o.id === id)?.value ?? ''
                          onPatchEdges(edgeIds, { stroke: next || undefined })
                        }}
                      />
                    </Tip>
                    <Tip label="Stroke width">
                      <CompactMenu
                        label="Width"
                        icon={WIDTH_ICON_BY_ID[strokeWidthId] ?? StrokeWidthBoldIcon}
                        selectedId={strokeWidthId}
                        items={STROKE_WIDTH_ITEMS}
                        onSelect={(id) => {
                          const next =
                            FLOW_EDGE_STROKE_WIDTH_OPTIONS.find((o) => o.id === id)?.value ?? 3
                          onPatchEdges(edgeIds, { strokeWidth: next })
                        }}
                      />
                    </Tip>
                    <Tip label="End marker">
                      <CompactMenu
                        label="Marker"
                        icon={
                          markerId === 'arrow'
                            ? ArrowheadArrowIcon
                            : markerId === 'arrowclosed'
                              ? ArrowheadClosedIcon
                              : ArrowheadNoneIcon
                        }
                        selectedId={markerId}
                        items={MARKER_ITEMS}
                        onSelect={(id) => {
                          const preset = FLOW_EDGE_MARKER_OPTIONS.find((o) => o.id === id)
                          onPatchEdges(edgeIds, { markerEnd: preset?.marker ?? 'none' })
                        }}
                      />
                    </Tip>
                    <Tip label={edgeAnimated ? 'Animated on' : 'Animated off'}>
                      <IconButton
                        icon={Activity}
                        aria-label="Toggle animated edge"
                        aria-pressed={edgeAnimated}
                        size="xs"
                        variant="tray"
                        active={edgeAnimated}
                        onClick={() => onPatchEdges(edgeIds, { animated: !edgeAnimated })}
                      />
                    </Tip>
                  </>
                )}
              </div>
              <span className="theme-flow-editor__toolbar-divider" role="separator" aria-hidden="true" />
            </>
          ) : null}
          <ToolbarModeGroup aria-label="Groups">
            <Tip label="Group selection (marquee or Shift+click)">
              <IconButton
                icon={Group}
                aria-label="Group selection"
                size="xs"
                variant="tray"
                disabled={!canGroup}
                onClick={onGroup}
              />
            </Tip>
            <Tip label="Ungroup">
              <IconButton
                icon={Ungroup}
                aria-label="Ungroup selection"
                size="xs"
                variant="tray"
                disabled={!canUngroup}
                onClick={onUngroup}
              />
            </Tip>
          </ToolbarModeGroup>
        </div>
      </div>
    </div>
  )
}
