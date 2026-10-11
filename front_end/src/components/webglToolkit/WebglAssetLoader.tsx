import { Fragment, useCallback, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import {
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardCopy,
  Copy,
  Crosshair,
  Cuboid,
  Eraser,
  Grid3x3,
  Highlighter,
  MapPin,
  MousePointer2,
  Palette,
  Spline,
  Sun,
  Tag,
  Type,
  Video,
  X,
} from 'lucide-react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group } from 'three'
import { IconButton } from '../IconButton'
import { MenuButton, type MenuItem } from '../MenuButton'
import { Slider } from '../Slider'
import { ThemeScroll } from '../ThemeScroll'
import { ToolbarControlTray } from '../ToolbarControlTray'
import { ToolbarModeGroup } from '../ToolbarModeGroup'
import { Tooltip } from '../Tooltip'
import { WEBGL_ASSETS, getWebglAsset, type AssetKind } from '../../lib/webgl/assets/assetManifest'
import { GRAS_LIGHT_GAIN_MAX } from '../../lib/webgl/runtime/text/grasLetterLayout'
import { bakedAnnotationDoc } from '../../lib/webgl/assets/assetDocs'
import {
  MODEL_POINT_KIND,
  MODEL_SESSION_KIND,
  serializeModelPoint,
  serializeSessionPayload,
  type AssetAnnotation,
  type AssetAnnotationKind,
  type HitPayload,
} from '../../lib/webgl/assets/assetAnnotations'
import {
  VIEW_HOME_ID,
  VIEW_HOME_MARK_ID,
  homeViewPose,
  poseForAnnotation,
  regionFromRing,
  type ViewPose,
} from '../../lib/webgl/assets/viewPose'
import { AssetBoundary } from '../../lib/webgl/runtime/assets/AssetBoundary'
import { WebglStage } from '../../lib/webgl/runtime/core/WebglStage'
import { CameraRig } from '../../lib/webgl/runtime/camera/CameraRig'
import { OrbitRig } from '../../lib/webgl/runtime/controls/OrbitRig'
import { isOrbitFrameHandle, orbitFromPose, poseFromLiveOrbit, type OrbitFrameHandle } from '../../lib/webgl/runtime/controls/cameraJourney'
import {
  CAMERA_PATH_KIND,
  serializeCameraPath,
  stillFromViewPose,
  type CameraPathStill,
} from '../../lib/webgl/runtime/controls/cameraPath'
import { ViewpointFly } from '../../lib/webgl/runtime/controls/ViewpointFly'
import { DarkFogRig } from '../../lib/webgl/runtime/lights/DarkFogRig'
import { ShadowGround } from '../../lib/webgl/runtime/shadow/ShadowGround'
import { SceneHelpers } from '../../lib/webgl/runtime/helpers/SceneHelpers'
import { CameraGizmos } from '../../lib/webgl/runtime/helpers/CameraGizmos'
import { ReferencePointer } from '../../lib/webgl/runtime/helpers/ReferencePointer'
import {
  REFERENCE_POINTER_ROTATION,
  referencePointerHome,
  serializeReferencePointer,
} from '../../lib/webgl/runtime/helpers/referencePointerLayout'
import {
  AnnotationMarkers,
  type DraftHighlight,
} from '../../lib/webgl/runtime/interaction/AnnotationMarkers'
import { clampHighlightRadius, clampPoly, HIGHLIGHT_MIN, POLY_DEFAULT, POLY_MAX, POLY_MIN, shouldAppendStroke, simplifyForPoly, simplifyStroke, strokeGapForPoly, SURFACE_LIFT, stemTip, worldDistance } from '../../lib/webgl/runtime/interaction/markStem'
import { useRaycastPick, type RaycastHit } from '../../lib/webgl/runtime/interaction/useRaycastPick'
import { WireCageSpring } from '../../lib/webgl/runtime/materials/WireCageSpring'
import { WireCageLights } from '../../lib/webgl/runtime/materials/WireCageLights'
import { GltfSubject, PrimitiveBox, SplatSubject } from './WebglSubjects'
import { AboutUsWordmark } from '../../lib/webgl/runtime/text/AboutUsWordmark'
import { ProjectsWordmark } from '../../lib/webgl/runtime/text/ProjectsWordmark'
import { GrasWordmark } from '../../lib/webgl/runtime/text/GrasWordmark'
import { VolumetricCloud } from '../../lib/webgl/runtime/volume/VolumetricCloud'

type WebglAssetLoaderProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type PlaceKind = 'point' | 'highlight' | 'region' | 'viewpoint' | 'color'
type ToolId = 'select' | PlaceKind

const TOOLS: readonly { id: ToolId; label: string; icon: typeof MapPin; tip: string }[] = [
  {
    id: 'select',
    label: 'Select',
    icon: MousePointer2,
    tip: 'Select — left-drag to orbit. Right-drag pans. Click does not place a mark.',
  },
  { id: 'point', label: 'Point', icon: MapPin, tip: 'Point — left-click the surface. Right-drag pans.' },
  {
    id: 'highlight',
    label: 'Highlight',
    icon: Highlighter,
    tip: 'Highlight — left press-drag to expand a thin ring. Right-drag pans.',
  },
  {
    id: 'region',
    label: 'Region',
    icon: Spline,
    tip: 'Region — left press-drag a freehand loop. Right-drag pans.',
  },
  {
    id: 'viewpoint',
    label: 'Viewpoint',
    icon: Camera,
    tip: 'Viewpoint — frame the shot, then left-click the look-at. Right-drag pans.',
  },
  {
    id: 'color',
    label: 'Color',
    icon: Palette,
    tip: 'Color — pick a hex, then left-click. Right-drag pans.',
  },
]

const MARK_GROUPS: readonly { kind: AssetAnnotationKind; heading: string }[] = [
  { kind: 'viewpoint', heading: 'Viewpoints' },
  { kind: 'highlight', heading: 'Highlights' },
  { kind: 'region', heading: 'Regions' },
  { kind: 'color', heading: 'Colors' },
  { kind: 'point', heading: 'Points' },
  { kind: 'named', heading: 'Named' },
  { kind: 'front', heading: 'Front' },
  { kind: 'back', heading: 'Back' },
  { kind: 'midpoint', heading: 'Midpoint' },
  { kind: 'face', heading: 'Faces' },
]

function loadMarks(assetId: string): { marks: AssetAnnotation[]; error: string | null } {
  const doc = bakedAnnotationDoc(assetId)
  if ('error' in doc) return { marks: [], error: doc.error }
  return { marks: doc.annotations, error: null }
}

function makeId(prefix: string): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}`
}

function RibbonCol({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="theme-webgl-toolkit__ribbon-col">
      <span className="theme-webgl-toolkit__ribbon-col-label type-caption type-muted">{label}</span>
      <div className="theme-webgl-toolkit__ribbon-col-row">{children}</div>
    </div>
  )
}

function ToolbarTip({ content, children }: { content: string; children: ReactNode }) {
  return <Tooltip content={content}>{children}</Tooltip>
}

function PoseCapture({
  poseRef,
  modelRef,
  orbitHandleRef,
}: {
  poseRef: MutableRefObject<ViewPose>
  modelRef: MutableRefObject<Group | null>
  orbitHandleRef: MutableRefObject<OrbitFrameHandle | null>
}) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  useFrame(() => {
    const handle = isOrbitFrameHandle(controls) ? controls : null
    orbitHandleRef.current = handle
    const framed = poseFromLiveOrbit(handle, poseRef.current)
    const pose = framed.pose
    const orbit = framed.orbit
    const model = modelRef.current
    const cam = camera
    poseRef.current = {
      ...pose,
      orbit: { azimuth: orbit.azimuth, polar: orbit.polar, radius: orbit.radius },
      up: [cam.up.x, cam.up.y, cam.up.z],
      quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
      model: model
        ? {
            position: [model.position.x, model.position.y, model.position.z],
            rotation: [model.rotation.x, model.rotation.y, model.rotation.z],
            quaternion: [model.quaternion.x, model.quaternion.y, model.quaternion.z, model.quaternion.w],
            scale: [model.scale.x, model.scale.y, model.scale.z],
          }
        : undefined,
    }
  })
  return null
}

function liveViewPose(
  poseRef: MutableRefObject<ViewPose>,
  orbitHandleRef: MutableRefObject<OrbitFrameHandle | null>,
): ViewPose {
  const last = poseRef.current
  const framed = poseFromLiveOrbit(orbitHandleRef.current, last)
  return {
    ...last,
    position: framed.pose.position,
    target: framed.pose.target,
    orbit: framed.orbit,
  }
}

function toolHint(tool: ToolId): string {
  const row = TOOLS.find((item) => item.id === tool)
  return `${row?.tip ?? 'Select — drag to orbit.'}`
}

function AssetScene({
  url,
  kind,
  assetId,
  upAxis,
  annotations,
  draftRing,
  draftHighlight,
  draftColor,
  toolActive,
  dragExpand,
  orbitEnabled,
  shadows,
  helpers,
  cameraGizmos,
  showPoints,
  showLabels,
  poly,
  lightColor,
  meshColor,
  lightGain,
  scatter,
  flyPose,
  flyTicket,
  openingPose,
  poseRef,
  orbitHandleRef,
  selectedId,
  onSelectMark,
  onHit,
  onDrag,
  onDragEnd,
  onDrawingChange,
  onError,
}: {
  url?: string
  kind: AssetKind
  assetId: string
  upAxis: 'y' | 'z'
  annotations: readonly AssetAnnotation[]
  draftRing: readonly [number, number, number][]
  draftHighlight: DraftHighlight | null
  draftColor: string
  toolActive: boolean
  dragExpand: boolean
  orbitEnabled: boolean
  shadows: boolean
  helpers: boolean
  cameraGizmos: boolean
  showPoints: boolean
  showLabels: boolean
  poly: number
  lightColor: string
  meshColor: string
  lightGain: number
  scatter: number
  flyPose: ViewPose | null
  flyTicket: number
  openingPose: ViewPose
  poseRef: MutableRefObject<ViewPose>
  orbitHandleRef: MutableRefObject<OrbitFrameHandle | null>
  selectedId?: string | null
  onSelectMark?: (id: string) => void
  onHit: (hit: RaycastHit | null) => void
  onDrag: (hit: RaycastHit) => void
  onDragEnd: (hit: RaycastHit | null) => void
  onDrawingChange: (drawing: boolean) => void
  onError?: (message: string) => void
}) {
  const [cursorHit, setCursorHit] = useState<RaycastHit | null>(null)
  const cageHover = useRef<RaycastHit | null>(null)
  const onCageSurface = useCallback((hit: RaycastHit | null) => {
    cageHover.current = hit
  }, [])
  const pick = useRaycastPick(onHit, {
    enabled: true,
    toolActive,
    dragExpand,
    onDrag,
    onDragEnd,
    onDrawingChange,
    onSurface: onCageSurface,
    onHover: setCursorHit,
  })
  const modelRef = useRef<Group | null>(null)
  const viewpointPoses = annotations
    .filter((mark) => mark.kind === 'viewpoint' && mark.camera && mark.id !== VIEW_HOME_MARK_ID)
    .map((mark) => ({
      id: mark.id,
      position: mark.camera ?? mark.position,
      target: mark.target ?? mark.position,
    }))
  return (
    <>
      <Fragment key={`${assetId}-camera`}>
        <CameraRig position={openingPose.position} lookAt={openingPose.target} />
        <OrbitRig
          enabled={orbitEnabled}
          target={openingPose.target}
          cameraPosition={openingPose.position}
          maxDistance={kind === 'splat' ? 800 : undefined}
        />
      </Fragment>
      <PoseCapture poseRef={poseRef} modelRef={modelRef} orbitHandleRef={orbitHandleRef} />
      {kind === 'splat' ? (
        <color attach="background" args={['#07080f']} />
      ) : (
        <>
          <WireCageSpring hitRef={cageHover} />
          <WireCageLights color={lightColor} meshColor={meshColor} intensity={lightGain} scatter={scatter} />
          <DarkFogRig />
          {shadows ? <ShadowGround /> : null}
        </>
      )}
      <ViewpointFly key={`${assetId}-fly`} pose={flyPose} ticket={flyTicket} />
      {helpers ? <SceneHelpers /> : null}
      {cameraGizmos ? <CameraGizmos home={homeViewPose(annotations)} poses={viewpointPoses} /> : null}
      <AssetBoundary fallback={null} onError={onError}>
        {kind === 'gltf' && url ? (
          <GltfSubject
            key={`${assetId}-gltf`}
            ref={modelRef}
            url={url}
            assetId={assetId}
            upAxis={upAxis}
            poly={poly}
            onPointerDown={pick.onPointerDown}
            onPointerMove={pick.onPointerMove}
            onPointerLeave={pick.onPointerLeave}
            onPointerUp={pick.onPointerUp}
          />
        ) : kind === 'splat' && url ? (
          <SplatSubject
            key={`${assetId}-splat`}
            ref={modelRef}
            url={url}
            upAxis={upAxis}
            onPointerDown={pick.onPointerDown}
            onPointerMove={pick.onPointerMove}
            onPointerLeave={pick.onPointerLeave}
            onPointerUp={pick.onPointerUp}
          />
        ) : kind === 'splat' ? null : kind === 'volume' ? (
          <VolumetricCloud
            poly={poly}
            onPointerDown={pick.onPointerDown}
            onPointerMove={pick.onPointerMove}
            onPointerLeave={pick.onPointerLeave}
            onPointerUp={pick.onPointerUp}
          />
        ) : kind === 'text' && assetId === 'about-us-letters' ? (
          <AboutUsWordmark
            ref={modelRef}
            color={lightColor}
            intensity={lightGain}
            onPointerDown={pick.onPointerDown}
            onPointerMove={pick.onPointerMove}
            onPointerLeave={pick.onPointerLeave}
            onPointerUp={pick.onPointerUp}
          />
        ) : kind === 'text' && assetId === 'projects-letters' ? (
          <ProjectsWordmark
            ref={modelRef}
            color={lightColor}
            intensity={lightGain}
            onPointerDown={pick.onPointerDown}
            onPointerMove={pick.onPointerMove}
            onPointerLeave={pick.onPointerLeave}
            onPointerUp={pick.onPointerUp}
          />
        ) : kind === 'text' ? (
          <GrasWordmark
            ref={modelRef}
            color={lightColor}
            intensity={lightGain}
            onPointerDown={pick.onPointerDown}
            onPointerMove={pick.onPointerMove}
            onPointerLeave={pick.onPointerLeave}
            onPointerUp={pick.onPointerUp}
          />
        ) : (
          <PrimitiveBox
            ref={modelRef}
            onPointerDown={pick.onPointerDown}
            onPointerMove={pick.onPointerMove}
            onPointerLeave={pick.onPointerLeave}
            onPointerUp={pick.onPointerUp}
          />
        )}
      </AssetBoundary>
      <AnnotationMarkers
        annotations={kind === 'splat' ? annotations.filter((mark) => mark.kind !== 'viewpoint') : annotations}
        draftRing={draftRing}
        draftHighlight={draftHighlight}
        cursorHit={toolActive && orbitEnabled ? cursorHit : null}
        draftColor={draftColor}
        showPoints={showPoints}
        showLabels={showLabels}
        selectedId={selectedId}
        onSelect={toolActive ? undefined : onSelectMark}
      />
    </>
  )
}

export function WebglAssetLoader({ open = true, onOpenChange }: WebglAssetLoaderProps) {
  const initialId = WEBGL_ASSETS[0]?.id ?? 'builtin-box'
  const [assetId, setAssetId] = useState(initialId)
  const [tool, setTool] = useState<ToolId>('select')
  const [draftLabel, setDraftLabel] = useState('')
  const [color, setColor] = useState('#c45c4a')
  const [lightColor, setLightColor] = useState('#f2c48a')
  const [meshColor, setMeshColor] = useState('#000000')
  const [lightGain, setLightGain] = useState(0.05)
  const [scatter, setScatter] = useState(1.5)
  const [marks, setMarks] = useState<AssetAnnotation[]>(() => loadMarks(initialId).marks)
  const [draftRing, setDraftRing] = useState<[number, number, number][]>([])
  const [draftHighlight, setDraftHighlight] = useState<DraftHighlight | null>(null)
  const [viewId, setViewId] = useState(VIEW_HOME_ID)
  const [flyPose, setFlyPose] = useState<ViewPose | null>(() => homeViewPose(loadMarks(initialId).marks))
  const [flyTicket, setFlyTicket] = useState(0)
  const [openingPose, setOpeningPose] = useState<ViewPose>(() => homeViewPose(loadMarks(initialId).marks))
  const [copied, setCopied] = useState(false)
  const [copiedPoint, setCopiedPoint] = useState(false)
  const [copiedPath, setCopiedPath] = useState(false)
  const [pointerCopied, setPointerCopied] = useState(false)
  const [locatorOn, setLocatorOn] = useState(false)
  const [locatorOrigin, setLocatorOrigin] = useState<[number, number, number] | null>(null)
  const [locatorPos, setLocatorPos] = useState<[number, number, number] | null>(null)
  const [locatorRot, setLocatorRot] = useState<[number, number, number]>(REFERENCE_POINTER_ROTATION)
  const [locatorSelected, setLocatorSelected] = useState(true)
  const [locatorShowTag, setLocatorShowTag] = useState(true)
  const [locatorTicket, setLocatorTicket] = useState(0)
  const [locatorDragging, setLocatorDragging] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastHit, setLastHit] = useState<RaycastHit | null>(null)
  const [orbitEnabled, setOrbitEnabled] = useState(true)
  const [shadows, setShadows] = useState(false)
  const [helpers, setHelpers] = useState(false)
  const [cameraGizmos, setCameraGizmos] = useState(false)
  const [showPoints, setShowPoints] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [regionPoly, setRegionPoly] = useState(POLY_DEFAULT)
  const [pathStills, setPathStills] = useState<CameraPathStill[]>([])
  const poseRef = useRef<ViewPose>(homeViewPose(loadMarks(initialId).marks))
  const orbitHandleRef = useRef<OrbitFrameHandle | null>(null)
  const assetIdRef = useRef(assetId)
  assetIdRef.current = assetId
  const draftRef = useRef<[number, number, number][]>([])
  const highlightOriginRef = useRef<RaycastHit | null>(null)
  const regionStrokeRef = useRef(false)
  const labelRef = useRef<HTMLInputElement>(null)
  draftRef.current = draftRing
  const asset = getWebglAsset(assetId) ?? WEBGL_ASSETS[0]
  const selectedMark = marks.find((mark) => mark.id === viewId) ?? null
  const labelValue = selectedMark ? selectedMark.label : draftLabel
  const placeKind: PlaceKind = tool === 'select' ? 'point' : tool

  const modelItems: MenuItem[] = useMemo(
    () => WEBGL_ASSETS.map((row) => ({ id: row.id, label: row.label })),
    [],
  )

  const markItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [{ id: VIEW_HOME_ID, label: 'Home' }]
    for (const group of MARK_GROUPS) {
      const rows = marks.filter((mark) => mark.kind === group.kind && mark.id !== VIEW_HOME_MARK_ID)
      if (!rows.length) continue
      items.push({ id: `hdr-${group.kind}`, label: group.heading, disabled: true })
      for (const mark of rows) {
        items.push({ id: mark.id, label: mark.label, deletable: true })
      }
    }
    return items
  }, [marks])

  const selectAsset = useCallback((nextId: string) => {
    if (assetIdRef.current === nextId) return
    const loaded = loadMarks(nextId)
    const home = homeViewPose(loaded.marks)
    setAssetId(nextId)
    setMarks(loaded.marks)
    setDraftRing([])
    setDraftHighlight(null)
    setLastHit(null)
    setViewId(VIEW_HOME_ID)
    setFlyPose(home)
    setFlyTicket((n) => n + 1)
    setOpeningPose(home)
    setCopied(false)
    setCopiedPoint(false)
    setCopiedPath(false)
    setPointerCopied(false)
    setPathStills([])
    setLocatorOn(false)
    setLocatorOrigin(null)
    setLocatorPos(null)
    setLocatorRot(REFERENCE_POINTER_ROTATION)
    setLocatorDragging(false)
    setDraftLabel('')
    setLoadError(loaded.error)
    setLightGain(getWebglAsset(nextId)?.kind === 'text' ? GRAS_LIGHT_GAIN_MAX : 0.05)
    poseRef.current = home
  }, [])

  const closeRegion = useCallback(
    (ring: [number, number, number][], hit?: RaycastHit | null) => {
      const trimmed = simplifyStroke(ring, simplifyForPoly(regionPoly))
      if (trimmed.length < 3) return
      const { position, radius } = regionFromRing(trimmed)
      const id = makeId('region')
      const nextLabel = (selectedMark ? draftLabel : labelValue).trim() || `region ${marks.length + 1}`
      setMarks((prev) => [
        ...prev,
        {
          id,
          kind: 'region',
          label: nextLabel,
          position,
          radius,
          ring: trimmed,
          color,
          poly: regionPoly,
          objectName: hit?.objectName,
          faceIndex: hit?.faceIndex ?? undefined,
          normal: hit?.normal ?? undefined,
        },
      ])
      setViewId(id)
      setDraftRing([])
      setDraftLabel('')
      queueMicrotask(() => labelRef.current?.focus())
    },
    [color, draftLabel, labelValue, marks.length, regionPoly, selectedMark],
  )

  const commitMark = useCallback(
    (kind: PlaceKind, hit: RaycastHit, extra: Partial<AssetAnnotation> = {}) => {
      const id = makeId(kind)
      const pose = liveViewPose(poseRef, orbitHandleRef)
      const nextLabel = (selectedMark ? '' : labelValue).trim() || `${kind} ${marks.length + 1}`
      setMarks((prev) => [
        ...prev,
        {
          id,
          kind,
          label: nextLabel,
          position: hit.point,
          normal: hit.normal ?? undefined,
          faceIndex: hit.faceIndex ?? undefined,
          objectName: hit.objectName,
          camera: kind === 'viewpoint' ? pose.position : undefined,
          target: kind === 'viewpoint' ? pose.target : undefined,
          orbit:
            kind === 'viewpoint'
              ? (pose.orbit ?? orbitFromPose(pose))
              : undefined,
          up: kind === 'viewpoint' ? (pose.up ?? [0, 1, 0]) : undefined,
          quaternion: kind === 'viewpoint' ? pose.quaternion : undefined,
          color: kind === 'color' || kind === 'highlight' ? color : undefined,
          ...extra,
        },
      ])
      setViewId(id)
      setDraftLabel('')
      queueMicrotask(() => labelRef.current?.focus())
    },
    [color, labelValue, marks.length, selectedMark],
  )

  const onHit = useCallback(
    (hit: RaycastHit | null) => {
      if (!hit || tool === 'select' || tool === 'highlight' || tool === 'region') return
      setLastHit(hit)
      commitMark(tool, hit)
    },
    [commitMark, tool],
  )

  const onHighlightDrag = useCallback((hit: RaycastHit) => {
    if (!highlightOriginRef.current) highlightOriginRef.current = hit
    const origin = highlightOriginRef.current
    setDraftHighlight({
      position: origin.point,
      normal: origin.normal,
      radius: clampHighlightRadius(worldDistance(origin.point, hit.point)),
    })
  }, [])

  const onHighlightEnd = useCallback(
    (hit: RaycastHit | null) => {
      const origin = highlightOriginRef.current
      highlightOriginRef.current = null
      setDraftHighlight(null)
      if (!origin || tool !== 'highlight') return
      const radius = hit
        ? clampHighlightRadius(worldDistance(origin.point, hit.point))
        : HIGHLIGHT_MIN
      setLastHit(origin)
      commitMark('highlight', origin, { radius, color })
    },
    [color, commitMark, tool],
  )

  const onRegionDrag = useCallback(
    (hit: RaycastHit) => {
      const lifted = stemTip(hit.point, hit.normal, SURFACE_LIFT)
      if (!regionStrokeRef.current) {
        regionStrokeRef.current = true
        setLastHit(hit)
        setDraftRing([lifted])
        return
      }
      const prev = draftRef.current
      if (!prev.length) return
      if (!shouldAppendStroke(prev[prev.length - 1], lifted, strokeGapForPoly(regionPoly))) return
      setLastHit(hit)
      setDraftRing([...prev, lifted])
    },
    [regionPoly],
  )

  const onRegionEnd = useCallback(
    (hit: RaycastHit | null) => {
      regionStrokeRef.current = false
      const ring = draftRef.current
      if (ring.length >= 3) {
        closeRegion(ring, hit)
        return
      }
      setDraftRing([])
    },
    [closeRegion],
  )

  const onDrawDrag = useCallback(
    (hit: RaycastHit) => {
      if (tool === 'highlight') onHighlightDrag(hit)
      else if (tool === 'region') onRegionDrag(hit)
    },
    [onHighlightDrag, onRegionDrag, tool],
  )

  const onDrawEnd = useCallback(
    (hit: RaycastHit | null) => {
      if (tool === 'highlight') onHighlightEnd(hit)
      else if (tool === 'region') onRegionEnd(hit)
    },
    [onHighlightEnd, onRegionEnd, tool],
  )

  function chooseTool(id: ToolId) {
    setTool(id)
    setDraftRing([])
    setDraftHighlight(null)
    highlightOriginRef.current = null
    setOrbitEnabled(true)
  }

  const goToView = useCallback(
    (id: string) => {
      if (id.startsWith('hdr-')) return
      const markId = id === VIEW_HOME_MARK_ID ? VIEW_HOME_ID : id
      setViewId(markId)
      if (markId === VIEW_HOME_ID) {
        setFlyPose(homeViewPose(marks))
        setFlyTicket((n) => n + 1)
        return
      }
      const mark = marks.find((row) => row.id === markId)
      if (!mark) return
      setFlyPose(poseForAnnotation(mark))
      setFlyTicket((n) => n + 1)
    },
    [marks],
  )

  const deleteMark = useCallback(
    (id: string) => {
      setMarks((prev) => prev.filter((mark) => mark.id !== id))
      if (viewId === id) setViewId(VIEW_HOME_ID)
    },
    [viewId],
  )

  function onLabelChange(value: string) {
    if (selectedMark) {
      setMarks((prev) => prev.map((mark) => (mark.id === selectedMark.id ? { ...mark, label: value } : mark)))
      return
    }
    setDraftLabel(value)
  }

  const lastHitPayload: HitPayload | undefined = lastHit
    ? {
        assetId: asset?.id ?? 'builtin-box',
        tool: tool === 'select' ? 'point' : tool,
        label: labelValue.trim() || placeKind,
        point: lastHit.point,
        normal: lastHit.normal,
        faceIndex: lastHit.faceIndex,
        objectName: lastHit.objectName,
        color: placeKind === 'color' || placeKind === 'region' || placeKind === 'highlight' ? color : undefined,
      }
    : undefined

  function copySession() {
    const live = liveViewPose(poseRef, orbitHandleRef)
    const json = serializeSessionPayload({
      kind: MODEL_SESSION_KIND,
      assetId: asset?.id ?? 'builtin-box',
      camera: {
        position: live.position,
        target: live.target,
        orbit: live.orbit,
        up: live.up,
        quaternion: live.quaternion,
      },
      view: { wireframe: false, shadows, helpers, cameraGizmos, showPoints, showLabels, regionPoly, lightColor, meshColor, lightGain, scatter },
      annotations: marks,
      selectedId: viewId === VIEW_HOME_ID ? null : viewId,
      lastHit: lastHitPayload,
      model: live.model,
    })
    void navigator.clipboard?.writeText(json)
    setCopied(true)
    setCopiedPoint(false)
    setCopiedPath(false)
    setPointerCopied(false)
  }

  function copyPoint() {
    if (!selectedMark) return
    const json = serializeModelPoint({
      kind: MODEL_POINT_KIND,
      assetId: asset?.id ?? 'builtin-box',
      annotation: selectedMark,
    })
    void navigator.clipboard?.writeText(json)
    setCopiedPoint(true)
    setCopied(false)
    setCopiedPath(false)
    setPointerCopied(false)
  }

  function capturePathStill() {
    setPathStills((prev) => [...prev, stillFromViewPose(liveViewPose(poseRef, orbitHandleRef))])
    setCopiedPath(false)
  }

  function clearPath() {
    setPathStills([])
    setCopiedPath(false)
  }

  function copyPath() {
    if (pathStills.length < 2) return
    const json = serializeCameraPath({
      kind: CAMERA_PATH_KIND,
      assetId: asset?.id ?? 'builtin-box',
      stills: pathStills,
    })
    void navigator.clipboard?.writeText(json)
    setCopiedPath(true)
    setCopied(false)
    setCopiedPoint(false)
    setPointerCopied(false)
  }

  function toggleLocator() {
    if (locatorOn) {
      setLocatorOn(false)
      setLocatorOrigin(null)
      setLocatorPos(null)
      setLocatorRot(REFERENCE_POINTER_ROTATION)
      setLocatorDragging(false)
      return
    }
    const home = referencePointerHome(homeViewPose(marks).target)
    setLocatorOrigin(home)
    setLocatorPos(home)
    setLocatorRot(REFERENCE_POINTER_ROTATION)
    setLocatorSelected(true)
    setLocatorOn(true)
    setLocatorTicket((n) => n + 1)
  }

  function copyPointer() {
    if (!locatorPos) return
    void navigator.clipboard?.writeText(
      serializeReferencePointer({ position: locatorPos, rotation: locatorRot }, 'item'),
    )
    setPointerCopied(true)
    setCopied(false)
    setCopiedPoint(false)
    setCopiedPath(false)
  }

  const hint = toolHint(tool)

  const status = [
    lastHit ? `${lastHit.objectName} · ${lastHit.point.map((n) => n.toFixed(3)).join(', ')}` : 'Inspect',
    locatorOn && locatorPos
      ? `pointer ${locatorPos.map((n) => n.toFixed(3)).join(', ')} · rot ${locatorRot.map((n) => n.toFixed(3)).join(', ')}`
      : null,
    draftRing.length ? `region ${draftRing.length}` : null,
    pointerCopied
      ? 'copied pointer'
      : copiedPath
        ? 'copied path'
        : copiedPoint
          ? 'copied point'
          : copied
            ? 'copied session'
            : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section
      className={['theme-webgl-toolkit__panel', open ? 'theme-webgl-toolkit__panel--open' : '']
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="webgl-asset-loader-title"
    >
      <div className="theme-webgl-toolkit__chrome">
        <header className="theme-webgl-toolkit__titlebar">
          <h2 id="webgl-asset-loader-title" className="theme-webgl-toolkit__title">
            Model viewer
          </h2>
          <div className="theme-webgl-toolkit__title-spacer" aria-hidden />
          {onOpenChange ? (
            <IconButton
              icon={open ? ChevronUp : ChevronDown}
              aria-label={open ? 'Collapse model viewer' : 'Expand model viewer'}
              size="xs"
              variant="ghost"
              onClick={() => onOpenChange(!open)}
            />
          ) : null}
        </header>
        {open ? (
          <>
            <div className="theme-webgl-toolkit__ribbon">
              <ThemeScroll axis="horizontal" rail="nano" className="theme-webgl-toolkit__ribbon-scroll">
                <div className="theme-webgl-toolkit__ribbon-inner" role="toolbar" aria-label="Model tools">
                  <RibbonCol label="Model">
                    <ToolbarTip content="Choose a registered /3d/ asset. The Creation of Adam is the primary model.">
                      <MenuButton
                        label={asset?.label ?? 'Model'}
                        icon={Cuboid}
                        iconDropdown
                        items={modelItems}
                        selectedId={assetId}
                        onSelect={selectAsset}
                        size="xs"
                        menuSize="compact"
                        portal
                        variant="tray"
                        triggerLabelAnim={false}
                      />
                    </ToolbarTip>
                    <ToolbarTip
                      content={
                        asset?.kind === 'volume'
                          ? 'Raymarch quality of the cloud. Higher Poly takes more steps and FBM octaves.'
                          : 'Polygon count of the imported mesh. 5 is the original. Lower uses SimplifyModifier; higher tessellates.'
                      }
                    >
                      <Slider
                        className="theme-webgl-toolkit__poly"
                        label="Poly"
                        min={POLY_MIN}
                        max={POLY_MAX}
                        step={1}
                        value={regionPoly}
                        minLabel="Fewer"
                        maxLabel="More"
                        aria-label="Model poly"
                        onChange={(value) => setRegionPoly(clampPoly(value))}
                      />
                    </ToolbarTip>
                  </RibbonCol>
                  <RibbonCol label="Marks">
                    <ToolbarTip content="Jump to Home, a viewpoint, or a named mark. The bin on a row deletes that mark.">
                      <MenuButton
                        label={selectedMark ? selectedMark.label : 'Home'}
                        icon={Bookmark}
                        iconDropdown
                        items={markItems}
                        selectedId={viewId}
                        onSelect={goToView}
                        onDelete={deleteMark}
                        size="xs"
                        menuSize="compact"
                        portal
                        variant="tray"
                        triggerLabelAnim={false}
                      />
                    </ToolbarTip>
                  </RibbonCol>
                  <span className="theme-webgl-toolkit__toolbar-divider" role="separator" aria-hidden />
                  <RibbonCol label="View">
                    <ToolbarTip content="Mesh color — ceramic host glaze, independent of the pulse lamps.">
                      <input
                        type="color"
                        className="theme-webgl-toolkit__swatch"
                        value={meshColor}
                        onChange={(event) => setMeshColor(event.target.value)}
                        aria-label="Mesh color"
                      />
                    </ToolbarTip>
                    <ToolbarTip content="Object color — tint of the cage pulse lights.">
                      <input
                        type="color"
                        className="theme-webgl-toolkit__swatch"
                        value={lightColor}
                        onChange={(event) => setLightColor(event.target.value)}
                        aria-label="Object color"
                      />
                    </ToolbarTip>
                    <ToolbarTip content="Light intensity — how hard the pulse lamps hit the ceramic.">
                      <Slider
                        className="theme-webgl-toolkit__poly"
                        label="Intensity"
                        min={0}
                        max={2}
                        step={0.05}
                        value={lightGain}
                        showValue
                        minLabel="Dim"
                        maxLabel="Bright"
                        aria-label="Light intensity"
                        onChange={setLightGain}
                      />
                    </ToolbarTip>
                    <ToolbarTip content="Scatter — viewer scale. The mesh uses triple this so the host still reads.">
                      <Slider
                        className="theme-webgl-toolkit__poly"
                        label="Scatter"
                        min={0}
                        max={16}
                        step={0.5}
                        value={scatter}
                        showValue
                        minLabel="Thin"
                        maxLabel="Deep"
                        aria-label="Ceramic scatter"
                        onChange={setScatter}
                      />
                    </ToolbarTip>
                    <ToolbarTip content="Shadows — ground catcher on/off. Toggle to compare lighting.">
                      <IconButton
                        icon={Sun}
                        aria-label="Shadows"
                        aria-pressed={shadows}
                        active={shadows}
                        size="xs"
                        onClick={() => setShadows((prev) => !prev)}
                      />
                    </ToolbarTip>
                    <ToolbarTip content="Helpers — grid, axes, and a 1 m box. Off by default so the sculpture stays clear.">
                      <IconButton
                        icon={Grid3x3}
                        aria-label="Helpers"
                        aria-pressed={helpers}
                        active={helpers}
                        size="xs"
                        onClick={() => setHelpers((prev) => !prev)}
                      />
                    </ToolbarTip>
                    <ToolbarTip content="Camera — frustum gizmos at Home and saved viewpoints.">
                      <IconButton
                        icon={Video}
                        aria-label="Camera gizmos"
                        aria-pressed={cameraGizmos}
                        active={cameraGizmos}
                        size="xs"
                        onClick={() => setCameraGizmos((prev) => !prev)}
                      />
                    </ToolbarTip>
                    <ToolbarTip content="Points — hide or show placed pins. The hover cursor still follows the mesh.">
                      <IconButton
                        icon={Circle}
                        aria-label="Show points"
                        aria-pressed={showPoints}
                        active={showPoints}
                        size="xs"
                        onClick={() => setShowPoints((prev) => !prev)}
                      />
                    </ToolbarTip>
                    <ToolbarTip content="Labels — hide or show names. Names never capture the pointer.">
                      <IconButton
                        icon={Type}
                        aria-label="Show labels"
                        aria-pressed={showLabels}
                        active={showLabels}
                        size="xs"
                        onClick={() => setShowLabels((prev) => !prev)}
                      />
                    </ToolbarTip>
                  </RibbonCol>
                  <RibbonCol label="Ref">
                    <ToolbarTip content="Reference pointer — spawn a locator beside Home. Click it for XYZ move and rotate; copy world metres and Euler orientation.">
                      <IconButton
                        icon={Crosshair}
                        aria-label="Reference pointer"
                        aria-pressed={locatorOn}
                        active={locatorOn}
                        size="xs"
                        onClick={() => toggleLocator()}
                      />
                    </ToolbarTip>
                    {locatorOn ? (
                      <>
                        <ToolbarTip content="Show tag — Item tag label on the pin. Labels never capture the pointer.">
                          <IconButton
                            icon={Tag}
                            aria-label="Show pointer tag"
                            aria-pressed={locatorShowTag}
                            active={locatorShowTag}
                            size="xs"
                            onClick={() => setLocatorShowTag((prev) => !prev)}
                          />
                        </ToolbarTip>
                        <ToolbarTip content="Copy pointer — world XYZ and Euler rotation in radians. Paste to chat as an item place reference.">
                          <IconButton
                            icon={ClipboardCopy}
                            aria-label={pointerCopied ? 'Copied pointer' : 'Copy pointer'}
                            size="xs"
                            variant="ghost"
                            onClick={() => copyPointer()}
                          />
                        </ToolbarTip>
                      </>
                    ) : null}
                  </RibbonCol>
                  <span className="theme-webgl-toolkit__toolbar-divider" role="separator" aria-hidden />
                  <RibbonCol label="Place">
                    <ToolbarModeGroup aria-label="Place kind">
                      {TOOLS.map((row) => (
                        <ToolbarTip key={row.id} content={row.tip}>
                          <IconButton
                            icon={row.icon}
                            aria-label={row.label}
                            aria-pressed={tool === row.id}
                            active={tool === row.id}
                            size="xs"
                            onClick={() => chooseTool(row.id)}
                          />
                        </ToolbarTip>
                      ))}
                    </ToolbarModeGroup>
                    {tool === 'region' ? (
                      <ToolbarTip content="Close region — commit the loop (needs 3 points).">
                        <IconButton
                          icon={Check}
                          aria-label="Close region"
                          size="xs"
                          variant="ghost"
                          disabled={draftRing.length < 3}
                          onClick={() => closeRegion(draftRing, lastHit)}
                        />
                      </ToolbarTip>
                    ) : null}
                    {tool === 'color' || tool === 'region' || tool === 'highlight' ? (
                      <ToolbarTip content="Mark color — stored on the annotation as #hex for the indexer.">
                        <input
                          type="color"
                          className="theme-webgl-toolkit__swatch"
                          value={color}
                          onChange={(event) => setColor(event.target.value)}
                          aria-label="Mark color"
                        />
                      </ToolbarTip>
                    ) : null}
                  </RibbonCol>
                  <RibbonCol label="Label">
                    <ToolbarTip content="Name the selected mark. After a click the new mark is selected here.">
                      <input
                        ref={labelRef}
                        className="theme-webgl-toolkit__label-input"
                        value={labelValue}
                        onChange={(event) => onLabelChange(event.target.value)}
                        placeholder={selectedMark ? 'Name this mark' : 'Name the next mark'}
                        aria-label="Mark label"
                      />
                    </ToolbarTip>
                  </RibbonCol>
                  <span className="theme-webgl-toolkit__toolbar-divider" role="separator" aria-hidden />
                  <RibbonCol label="Path">
                    <ToolbarControlTray density="compact">
                      <ToolbarTip content="Capture camera — add this orbit still to the path. Copy the set when you have two or more; first and last are from/to, middles shape the boom peak.">
                        <IconButton
                          icon={Camera}
                          aria-label="Capture camera"
                          size="xs"
                          variant="ghost"
                          onClick={() => capturePathStill()}
                        />
                      </ToolbarTip>
                      <span className="type-caption type-muted min-w-[1.25rem] text-center tabular-nums" aria-live="polite">
                        {pathStills.length}
                      </span>
                      <ToolbarTip content="Clear path — drop every captured still.">
                        <IconButton
                          icon={X}
                          aria-label="Clear path"
                          size="xs"
                          variant="ghost"
                          disabled={pathStills.length === 0}
                          onClick={() => clearPath()}
                        />
                      </ToolbarTip>
                      <ToolbarTip content="Copy path — compact stills only (webgl-camera-path). Paste to chat to smooth into a boom-arc crane.">
                        <IconButton
                          icon={ClipboardCopy}
                          aria-label="Copy path"
                          size="xs"
                          variant="ghost"
                          disabled={pathStills.length < 2}
                          onClick={() => copyPath()}
                        />
                      </ToolbarTip>
                    </ToolbarControlTray>
                  </RibbonCol>
                  <RibbonCol label="Session">
                    <ToolbarControlTray density="compact">
                      <ToolbarTip content="Copy session — camera pose, view toggles, mesh and object color, intensity, scatter, and all marks. Paste to chat or annotations JSON.">
                        <IconButton
                          icon={ClipboardCopy}
                          aria-label="Copy session"
                          size="xs"
                          variant="ghost"
                          onClick={() => copySession()}
                        />
                      </ToolbarTip>
                      <ToolbarTip content="Copy point — the selected mark only (webgl-model-point). Needs a mark selected, not Home.">
                        <IconButton
                          icon={Copy}
                          aria-label="Copy point"
                          size="xs"
                          variant="ghost"
                          disabled={!selectedMark}
                          onClick={() => copyPoint()}
                        />
                      </ToolbarTip>
                      <ToolbarTip content="Reset marks — restore the baked JSON for this model.">
                        <IconButton
                          icon={Eraser}
                          aria-label="Reset marks"
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            const loaded = loadMarks(assetId)
                            setMarks(loaded.marks)
                            setDraftRing([])
                            setDraftHighlight(null)
                            setViewId(VIEW_HOME_ID)
                            setFlyPose(homeViewPose(loaded.marks))
                            setFlyTicket((n) => n + 1)
                            setOpeningPose(homeViewPose(loaded.marks))
                            setDraftLabel('')
                          }}
                        />
                      </ToolbarTip>
                    </ToolbarControlTray>
                  </RibbonCol>
                </div>
              </ThemeScroll>
            </div>
            <p className="theme-webgl-toolkit__hint type-caption type-muted mb-0">{hint}</p>
            {loadError ? (
              <p className="type-body-sm theme-webgl-toolkit__error mb-0" role="alert">
                {loadError}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      {open ? (
        <div className="theme-webgl-toolkit__viewport">
          <WebglStage active={open} shadows={shadows}>
            <AssetScene
              url={asset?.kind === 'gltf' || asset?.kind === 'splat' ? asset.path : undefined}
              kind={asset?.kind ?? 'primitive'}
              assetId={asset?.id ?? 'builtin-box'}
              upAxis={asset?.upAxis ?? 'y'}
              annotations={marks}
              draftRing={draftRing}
              draftHighlight={draftHighlight}
              draftColor={color}
              toolActive={tool !== 'select'}
              dragExpand={tool === 'highlight' || tool === 'region'}
              orbitEnabled={orbitEnabled && !locatorDragging}
              shadows={shadows}
              helpers={helpers}
              cameraGizmos={cameraGizmos}
              showPoints={showPoints}
              showLabels={showLabels}
              poly={regionPoly}
              lightColor={lightColor}
              meshColor={meshColor}
              lightGain={lightGain}
              scatter={scatter}
              flyPose={flyPose}
              flyTicket={flyTicket}
              openingPose={openingPose}
              poseRef={poseRef}
              orbitHandleRef={orbitHandleRef}
              selectedId={viewId}
              onSelectMark={goToView}
              onHit={onHit}
              onDrag={onDrawDrag}
              onDragEnd={onDrawEnd}
              onDrawingChange={(drawing) => setOrbitEnabled(!drawing)}
              onError={setLoadError}
            />
            {locatorOn && locatorOrigin ? (
              <ReferencePointer
                key={`${asset?.id ?? 'asset'}-${locatorTicket}`}
                origin={locatorOrigin}
                selected={locatorSelected}
                showTag={locatorShowTag}
                tag="item"
                onSelect={() => setLocatorSelected((prev) => !prev)}
                onPose={(pose) => {
                  setLocatorPos(pose.position)
                  setLocatorRot(pose.rotation)
                }}
                onDragging={setLocatorDragging}
              />
            ) : null}
          </WebglStage>
          <p className="theme-webgl-toolkit__status font-mono text-[0.65rem] mb-0">{status}</p>
        </div>
      ) : null}
    </section>
  )
}
