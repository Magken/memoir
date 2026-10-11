/**
 * Large Excalidraw scenes for theme DrawCanvas demo-bar fixtures.
 * Uses frames, bound arrow labels, container text, and varied arrowheads.
 */

type Point = [number, number]
type BoundRef = { id: string; type: string }

function el(
  id: string,
  type: string,
  x: number,
  y: number,
  extra: Record<string, unknown>,
) {
  return {
    id,
    type,
    x,
    y,
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    seed: id.split('').reduce((n, c) => n + c.charCodeAt(0), 0),
    version: 1,
    versionNonce: id.length * 17,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    ...extra,
  }
}

function frame(id: string, x: number, y: number, w: number, h: number, name: string) {
  return el(id, 'frame', x, y, {
    width: w,
    height: h,
    name,
    strokeColor: '#868e96',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roundness: null,
  })
}

function rect(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    bg?: string
    stroke?: string
    bound?: BoundRef[]
    frameId?: string | null
    labelText?: string
  } = {},
) {
  const bound = [...(opts.bound ?? [])]
  const labelId = opts.labelText ? `txt-${id}` : null
  if (labelId) {
    bound.push({ id: labelId, type: 'text' })
  }

  const shape = el(id, 'rectangle', x, y, {
    width: w,
    height: h,
    strokeColor: opts.stroke ?? '#1e1e1e',
    backgroundColor: opts.bg ?? '#e7f5ff',
    roundness: { type: 3 },
    boundElements: bound.length ? bound : null,
    frameId: opts.frameId ?? null,
  })

  if (!labelId || !opts.labelText) {
    return [shape]
  }

  const text = containerText(labelId, id, x + 8, y + h / 2 - 10, w - 16, opts.labelText, 14)
  return [shape, text]
}

function ellipse(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    bg?: string
    stroke?: string
    bound?: BoundRef[]
    frameId?: string | null
    labelText?: string
  } = {},
) {
  const bound = [...(opts.bound ?? [])]
  const labelId = opts.labelText ? `txt-${id}` : null
  if (labelId) {
    bound.push({ id: labelId, type: 'text' })
  }

  const shape = el(id, 'ellipse', x, y, {
    width: w,
    height: h,
    strokeColor: opts.stroke ?? '#2f9e44',
    backgroundColor: opts.bg ?? '#d3f9d8',
    roundness: { type: 2 },
    boundElements: bound.length ? bound : null,
    frameId: opts.frameId ?? null,
  })

  if (!labelId || !opts.labelText) {
    return [shape]
  }

  const text = containerText(labelId, id, x + 8, y + h / 2 - 10, w - 16, opts.labelText, 13)
  return [shape, text]
}

function diamond(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { bg?: string; bound?: BoundRef[]; frameId?: string | null; labelText?: string } = {},
) {
  const bound = [...(opts.bound ?? [])]
  const labelId = opts.labelText ? `txt-${id}` : null
  if (labelId) {
    bound.push({ id: labelId, type: 'text' })
  }

  const shape = el(id, 'diamond', x, y, {
    width: w,
    height: h,
    strokeColor: '#e67700',
    backgroundColor: opts.bg ?? '#fff3bf',
    roundness: { type: 2 },
    boundElements: bound.length ? bound : null,
    frameId: opts.frameId ?? null,
  })

  if (!labelId || !opts.labelText) {
    return [shape]
  }

  const text = containerText(labelId, id, x + 12, y + h / 2 - 10, w - 24, opts.labelText, 14)
  return [shape, text]
}

function label(id: string, x: number, y: number, text: string, fontSize = 16, frameId: string | null = null) {
  const w = Math.max(48, text.length * fontSize * 0.55)
  return el(id, 'text', x, y, {
    width: w,
    height: fontSize * 1.35,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 1,
    roundness: null,
    frameId,
    text,
    fontSize,
    fontFamily: 1,
    textAlign: 'left',
    verticalAlign: 'top',
    containerId: null,
    originalText: text,
    lineHeight: 1.25,
  })
}

function containerText(
  id: string,
  containerId: string,
  x: number,
  y: number,
  width: number,
  text: string,
  fontSize: number,
) {
  return el(id, 'text', x, y, {
    width,
    height: fontSize * 1.35,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 1,
    roundness: null,
    text,
    fontSize,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId,
    originalText: text,
    lineHeight: 1.25,
    autoResize: true,
  })
}

type ArrowOpts = {
  dashed?: boolean
  dotted?: boolean
  color?: string
  startArrowhead?: string | null
  endArrowhead?: string | null
  label?: string
  labelX?: number
  labelY?: number
  frameId?: string | null
}

function arrow(
  id: string,
  x: number,
  y: number,
  points: Point[],
  startId?: string,
  endId?: string,
  opts: ArrowOpts = {},
) {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const width = Math.max(...xs) - Math.min(...xs) || 1
  const height = Math.max(...ys) - Math.min(...ys) || 1
  const labelId = opts.label ? `lbl-${id}` : null
  const bound: BoundRef[] = labelId ? [{ id: labelId, type: 'text' }] : []

  const arrowEl = el(id, 'arrow', x, y, {
    width,
    height,
    strokeColor: opts.color ?? '#495057',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeStyle: opts.dotted ? 'dotted' : opts.dashed ? 'dashed' : 'solid',
    roundness: { type: 2 },
    frameId: opts.frameId ?? null,
    startBinding: startId ? { elementId: startId, focus: 0, gap: 4 } : null,
    endBinding: endId ? { elementId: endId, focus: 0, gap: 4 } : null,
    lastCommittedPoint: null,
    startArrowhead: opts.startArrowhead ?? null,
    endArrowhead: opts.endArrowhead ?? 'arrow',
    boundElements: bound.length ? bound : null,
    points,
  })

  if (!labelId || !opts.label) {
    return { elements: [arrowEl], bindings: arrowBindings(id, startId, endId) }
  }

  const mid = opts.labelX ?? x + width / 2 - opts.label.length * 3
  const midY = opts.labelY ?? y + height / 2 - 8
  const textEl = containerText(labelId, id, mid, midY, Math.max(56, opts.label.length * 8), opts.label, 13)

  return { elements: [arrowEl, textEl], bindings: arrowBindings(id, startId, endId) }
}

function arrowBindings(arrowId: string, startId?: string, endId?: string) {
  const map = new Map<string, BoundRef[]>()
  const add = (targetId: string) => {
    const list = map.get(targetId) ?? []
    list.push({ id: arrowId, type: 'arrow' })
    map.set(targetId, list)
  }
  if (startId) add(startId)
  if (endId) add(endId)
  return map
}

function mergeBindings(
  elements: Record<string, unknown>[],
  bindingMaps: Map<string, BoundRef[]>[],
) {
  const merged = new Map<string, BoundRef[]>()
  for (const map of bindingMaps) {
    for (const [id, refs] of map) {
      const list = merged.get(id) ?? []
      merged.set(id, [...list, ...refs])
    }
  }

  return elements.map((item) => {
    const extra = merged.get(item.id as string)
    if (!extra?.length) return item
    const existing = (item.boundElements as BoundRef[] | null) ?? []
    return { ...item, boundElements: [...existing, ...extra] }
  })
}

function flatten(parts: Record<string, unknown>[][]) {
  return parts.flat()
}

const APP_STATE = {
  viewBackgroundColor: '#f8f9fa',
  gridSize: 20,
  exportBackground: true,
  exportScale: 1,
  currentItemStrokeColor: '#1e1e1e',
  currentItemBackgroundColor: 'transparent',
}

/** Platform architecture — Native JSON→Draw showcase. */
export function buildDrawPlatformArchitectureScene() {
  const frameClients = 'frame-clients'
  const frameSpine = 'frame-spine'
  const frameEditors = 'frame-editors'
  const frameArtifacts = 'frame-artifacts'

  const bindings: Map<string, BoundRef[]>[] = []
  const parts: Record<string, unknown>[][] = []

  parts.push([
    label('title-platform', 240, 12, 'Editor platform — frames · arrow labels · arrowheads', 24),
    frame(frameClients, 24, 72, 440, 100, 'Clients'),
    frame(frameSpine, 24, 188, 580, 108, 'Context spine'),
    frame(frameEditors, 24, 312, 680, 96, 'Workbenches'),
    frame(frameArtifacts, 24, 424, 640, 100, 'Artifacts'),
    label('note-tools', 24, 548, 'Try Frame tool (F) · arrowheads on format ribbon · double-click arrows to edit labels', 14),
  ])

  parts.push(flatten([
    rect('client-web', 48, 100, 116, 56, {
      frameId: frameClients,
      bg: '#d0ebff',
      stroke: '#1971c2',
      labelText: 'Theme UI',
    }),
    rect('client-mcp', 176, 100, 116, 56, {
      frameId: frameClients,
      bg: '#d0ebff',
      stroke: '#1971c2',
      labelText: 'MCP bot',
    }),
    rect('client-export', 304, 100, 116, 56, {
      frameId: frameClients,
      bg: '#d0ebff',
      stroke: '#1971c2',
      labelText: 'Export tray',
    }),
  ]))

  parts.push(flatten([
    rect('gw-envelope', 48, 216, 132, 60, {
      frameId: frameSpine,
      bg: '#e7f5ff',
      stroke: '#1864ab',
      labelText: 'envelope.json',
    }),
    diamond('gw-route', 248, 210, 104, 72, { frameId: frameSpine, labelText: 'route?' }),
    rect('gw-convert', 420, 216, 132, 60, {
      frameId: frameSpine,
      bg: '#e7f5ff',
      stroke: '#1864ab',
      labelText: 'converters',
    }),
  ]))

  parts.push(flatten([
    rect('ed-doc', 40, 332, 92, 52, { frameId: frameEditors, bg: '#ffe8cc', stroke: '#e67700', labelText: 'Doc' }),
    rect('ed-grid', 144, 332, 92, 52, { frameId: frameEditors, bg: '#d8f5a2', stroke: '#5c940d', labelText: 'Grid' }),
    rect('ed-draw', 248, 332, 92, 52, { frameId: frameEditors, bg: '#eebefa', stroke: '#9c36b5', labelText: 'Draw' }),
    rect('ed-code', 352, 332, 92, 52, { frameId: frameEditors, bg: '#c5f6fa', stroke: '#0b7285', labelText: 'Code' }),
    rect('ed-md', 456, 332, 92, 52, { frameId: frameEditors, bg: '#ffd8a8', stroke: '#d9480f', labelText: 'MD' }),
    rect('ed-mmd', 560, 332, 92, 52, { frameId: frameEditors, bg: '#ffc9c9', stroke: '#c92a2a', labelText: 'Mermaid' }),
  ]))

  parts.push(flatten([
    ellipse('store-json', 56, 448, 116, 60, {
      frameId: frameArtifacts,
      bg: '#e9ecef',
      stroke: '#495057',
      labelText: 'native JSON',
    }),
    ellipse('store-zip', 260, 448, 116, 60, {
      frameId: frameArtifacts,
      bg: '#e9ecef',
      stroke: '#495057',
      labelText: 'ZIP / CSV',
    }),
    ellipse('store-scene', 464, 448, 116, 60, {
      frameId: frameArtifacts,
      bg: '#e9ecef',
      stroke: '#495057',
      labelText: '.excalidraw',
    }),
  ]))

  const arrowDefs = [
    arrow('a-web-env', 104, 156, [[0, 0], [0, 52]], 'client-web', 'gw-envelope', {
      endArrowhead: 'arrow',
      startArrowhead: 'dot',
      label: 'POST import',
      labelX: 72,
      labelY: 168,
    }),
    arrow('a-mcp-route', 236, 128, [[0, 0], [52, 88]], 'client-mcp', 'gw-route', {
      endArrowhead: 'triangle',
      startArrowhead: 'bar',
      color: '#1971c2',
      label: 'MCP call',
      labelX: 248,
      labelY: 168,
    }),
    arrow('a-export-conv', 364, 128, [[0, 0], [108, 84]], 'client-export', 'gw-convert', {
      endArrowhead: 'arrow',
      startArrowhead: 'circle',
      label: 'export fmt',
      labelX: 388,
      labelY: 168,
    }),
    arrow('a-env-route', 184, 248, [[0, 0], [56, 0]], 'gw-envelope', 'gw-route', {
      endArrowhead: 'arrow',
      startArrowhead: null,
      label: 'validate',
      labelX: 198,
      labelY: 228,
    }),
    arrow('a-route-conv', 356, 248, [[0, 0], [56, 0]], 'gw-route', 'gw-convert', {
      endArrowhead: 'diamond',
      startArrowhead: 'diamond',
      color: '#e67700',
      label: 'convert',
      labelX: 368,
      labelY: 228,
    }),
    arrow('a-conv-doc', 472, 280, [[0, 0], [-308, 44]], 'gw-convert', 'ed-doc', {
      endArrowhead: 'arrow',
      label: 'doc payload',
      labelX: 340,
      labelY: 292,
    }),
    arrow('a-conv-draw', 512, 280, [[0, 0], [-208, 44]], 'gw-convert', 'ed-draw', {
      endArrowhead: 'arrow',
      label: 'scene',
      labelX: 420,
      labelY: 292,
    }),
    arrow('a-doc-json', 88, 388, [[0, 0], [40, 52]], 'ed-doc', 'store-json', {
      endArrowhead: 'dot',
      startArrowhead: null,
      dotted: true,
      color: '#868e96',
      label: 'serialize',
      labelX: 52,
      labelY: 408,
    }),
    arrow('a-draw-scene', 296, 388, [[0, 0], [224, 52]], 'ed-draw', 'store-scene', {
      endArrowhead: 'triangle',
      label: '.excalidraw',
      labelX: 360,
      labelY: 408,
    }),
    arrow('a-md-mmd', 512, 358, [[0, 0], [88, 0]], 'ed-md', 'ed-mmd', {
      dashed: true,
      startArrowhead: 'arrow',
      endArrowhead: 'arrow',
      color: '#868e96',
      label: 'embed fence',
      labelX: 520,
      labelY: 338,
    }),
  ]

  for (const def of arrowDefs) {
    parts.push(def.elements)
    bindings.push(def.bindings)
  }

  const elements = mergeBindings(parts.flat(), bindings)

  return {
    type: 'excalidraw' as const,
    version: 2,
    source: 'vurify/editor-context/complex-platform',
    elements,
    appState: APP_STATE,
    files: {},
  }
}

/** Cross-functional org chart — Cross org→Draw showcase. */
export function buildDrawOrgChartScene() {
  const frameLeadership = 'frame-leadership'
  const frameEng = 'frame-eng'
  const frameProduct = 'frame-product'
  const frameDesign = 'frame-design'
  const frameOps = 'frame-ops'
  const frameGate = 'frame-gate'

  const bindings: Map<string, BoundRef[]>[] = []
  const parts: Record<string, unknown>[][] = []

  parts.push([
    label('org-title', 220, 8, 'Org chart — frames · labeled arrows · mixed arrowheads', 24),
    frame(frameLeadership, 24, 44, 720, 210, 'Leadership'),
    frame(frameEng, 24, 268, 260, 200, 'Engineering'),
    frame(frameProduct, 296, 268, 200, 200, 'Product'),
    frame(frameDesign, 508, 268, 240, 200, 'Design'),
    frame(frameOps, 24, 480, 260, 120, 'Operations'),
    frame(frameGate, 296, 480, 452, 200, 'Release gate'),
    label('org-legend', 24, 700, 'Solid + arrow = reports · dashed + dots = matrix · labels editable on canvas', 14),
  ])

  parts.push(flatten([
    ellipse('ceo', 320, 72, 128, 72, {
      frameId: frameLeadership,
      bg: '#ffe066',
      stroke: '#e67700',
      labelText: 'Alex (CEO)',
    }),
    rect('vp-eng', 48, 168, 128, 56, {
      frameId: frameLeadership,
      bg: '#d0ebff',
      stroke: '#1971c2',
      labelText: 'VP Engineering',
    }),
    rect('vp-product', 200, 168, 128, 56, {
      frameId: frameLeadership,
      bg: '#d8f5a2',
      stroke: '#5c940d',
      labelText: 'VP Product',
    }),
    rect('vp-design', 352, 168, 128, 56, {
      frameId: frameLeadership,
      bg: '#eebefa',
      stroke: '#9c36b5',
      labelText: 'VP Design',
    }),
    rect('vp-ops', 504, 168, 128, 56, {
      frameId: frameLeadership,
      bg: '#ffd8a8',
      stroke: '#d9480f',
      labelText: 'VP Ops',
    }),
  ]))

  parts.push(flatten([
    ellipse('ic-fe', 40, 300, 100, 48, { frameId: frameEng, bg: '#e7f5ff', labelText: 'FE platform' }),
    ellipse('ic-be', 152, 300, 100, 48, { frameId: frameEng, bg: '#e7f5ff', labelText: 'Spine / MCP' }),
    ellipse('ic-qa', 96, 380, 100, 48, { frameId: frameEng, bg: '#e7f5ff', labelText: 'QA automation' }),
  ]))

  parts.push(flatten([
    ellipse('ic-pm', 312, 300, 100, 48, { frameId: frameProduct, bg: '#ebfbee', labelText: 'PM editor' }),
    ellipse('ic-analytics', 312, 380, 100, 48, { frameId: frameProduct, bg: '#ebfbee', labelText: 'Analytics' }),
  ]))

  parts.push(flatten([
    ellipse('ic-ux', 524, 300, 100, 48, { frameId: frameDesign, bg: '#f3d9fa', labelText: 'UX systems' }),
    ellipse('ic-brand', 636, 300, 100, 48, { frameId: frameDesign, bg: '#f3d9fa', labelText: 'Brand' }),
    ellipse('ic-docs', 580, 380, 100, 48, { frameId: frameDesign, bg: '#f3d9fa', labelText: 'Docs / theme' }),
  ]))

  parts.push(flatten([
    ellipse('ic-sre', 96, 520, 100, 48, { frameId: frameOps, bg: '#fff4e6', labelText: 'SRE' }),
    ellipse('ic-support', 152, 580, 100, 48, { frameId: frameOps, bg: '#fff4e6', labelText: 'Support' }),
  ]))

  parts.push(flatten([
    diamond('gate-ship', 460, 520, 108, 72, { frameId: frameGate, labelText: 'Ship?' }),
    rect('milestone', 360, 620, 220, 48, {
      frameId: frameGate,
      bg: '#c3fae8',
      stroke: '#087f5b',
      labelText: 'Theme showcase GA',
    }),
  ]))

  const arrowDefs = [
    arrow('a-ceo-eng', 368, 144, [[0, 0], [-200, 40]], 'ceo', 'vp-eng', {
      label: 'owns',
      labelX: 248,
      labelY: 148,
      startArrowhead: null,
      endArrowhead: 'arrow',
    }),
    arrow('a-ceo-product', 388, 144, [[0, 0], [-100, 40]], 'ceo', 'vp-product', {
      label: 'staffs',
      labelX: 300,
      labelY: 148,
      endArrowhead: 'triangle',
    }),
    arrow('a-ceo-design', 400, 144, [[0, 0], [40, 40]], 'ceo', 'vp-design', {
      label: 'partners',
      labelX: 388,
      labelY: 148,
      startArrowhead: 'bar',
      endArrowhead: 'arrow',
    }),
    arrow('a-ceo-ops', 412, 144, [[0, 0], [168, 40]], 'ceo', 'vp-ops', {
      label: 'escalates',
      labelX: 468,
      labelY: 148,
      endArrowhead: 'dot',
    }),
    arrow('a-eng-fe', 112, 224, [[0, 0], [-8, 68]], 'vp-eng', 'ic-fe', {
      label: 'team',
      labelX: 72,
      labelY: 252,
    }),
    arrow('a-eng-be', 128, 224, [[0, 0], [48, 68]], 'vp-eng', 'ic-be', {
      label: 'team',
      labelX: 148,
      labelY: 252,
    }),
    arrow('a-prod-pm', 264, 224, [[0, 0], [88, 68]], 'vp-product', 'ic-pm', {
      label: 'roadmap',
      labelX: 288,
      labelY: 252,
    }),
    arrow('a-fe-pm', 140, 324, [[0, 0], [220, 0]], 'ic-fe', 'ic-pm', {
      dashed: true,
      startArrowhead: 'dot',
      endArrowhead: 'dot',
      color: '#868e96',
      label: 'matrix',
      labelX: 220,
      labelY: 308,
    }),
    arrow('a-ux-docs', 572, 324, [[0, 0], [36, 48]], 'ic-ux', 'ic-docs', {
      dashed: true,
      dotted: true,
      startArrowhead: 'circle',
      endArrowhead: 'circle',
      color: '#9c36b5',
      label: 'handoff',
      labelX: 548,
      labelY: 348,
    }),
    arrow('a-be-sre', 202, 324, [[0, 0], [-40, 188]], 'ic-be', 'ic-sre', {
      dashed: true,
      startArrowhead: 'arrow',
      endArrowhead: 'arrow',
      color: '#868e96',
      label: 'on-call',
      labelX: 120,
      labelY: 420,
    }),
    arrow('a-pm-gate', 360, 348, [[0, 0], [140, 164]], 'ic-pm', 'gate-ship', {
      label: 'approves',
      labelX: 400,
      labelY: 440,
      endArrowhead: 'diamond',
    }),
    arrow('a-qa-gate', 146, 428, [[0, 0], [360, 88]], 'ic-qa', 'gate-ship', {
      label: 'sign-off',
      labelX: 280,
      labelY: 460,
      startArrowhead: 'triangle',
      endArrowhead: 'arrow',
    }),
    arrow('a-gate-milestone', 514, 592, [[0, 0], [0, 24]], 'gate-ship', 'milestone', {
      label: 'yes',
      labelX: 520,
      labelY: 600,
      endArrowhead: 'arrow',
      color: '#087f5b',
    }),
  ]

  for (const def of arrowDefs) {
    parts.push(def.elements)
    bindings.push(def.bindings)
  }

  const elements = mergeBindings(parts.flat(), bindings)

  return {
    type: 'excalidraw' as const,
    version: 2,
    source: 'vurify/editor-context/complex-org',
    elements,
    appState: APP_STATE,
    files: {},
  }
}
