import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Aperture, Box, Camera, ChevronDown, ChevronUp, Clapperboard, ClipboardCopy, Crosshair, Eye, Maximize2, Minimize2, Play, RefreshCw, Tag, X } from 'lucide-react'
import { IconButton } from '../IconButton'
import { MenuButton, type MenuItem } from '../MenuButton'
import { Slider } from '../Slider'
import { ThemeScroll } from '../ThemeScroll'
import { ToolbarControlTray } from '../ToolbarControlTray'
import { Tooltip } from '../Tooltip'
import { WebglStage } from '../../lib/webgl/runtime/core/WebglStage'
import { SceneHelpers } from '../../lib/webgl/runtime/helpers/SceneHelpers'
import { ReferencePointer } from '../../lib/webgl/runtime/helpers/ReferencePointer'
import {
  REFERENCE_POINTER_ROTATION,
  referencePointerHome,
  serializeReferencePointer,
} from '../../lib/webgl/runtime/helpers/referencePointerLayout'
import {
  serializeSceneObjectPose,
  type SceneObjectPose,
} from '../../lib/webgl/runtime/helpers/sceneObjectPose'
import {
  ShadowAlignGizmos,
  SpaceAlignMarker,
  SpaceProbe,
  type SpaceSample,
} from '../../lib/webgl/runtime/space/SpaceDebug'
import { WEBGL_SPACE } from '../../lib/webgl/runtime/space/webglSpace'
import { WEBGL_SCENES, getWebglScene } from '../../lib/webgl/assets/sceneManifest'
import {
  DEFAULT_SCENE_LOOK,
  DEFAULT_SCENE_ACM,
  SCENE_HOME_VIEW_ID,
  SCENE_LOOK_FOCUS_MAX,
  SCENE_LOOK_FOCAL_LENGTH_MAX,
  SCENE_ACM_INTENSITY_MAX,
  SCENE_NOISE_KINDS,
  bakedSceneDoc,
  sceneViewPose,
  sceneViewpointMarks,
  serializeSceneSession,
  type SceneCameraLook,
  type SceneCameraAcm,
  type SceneNoiseKind,
} from '../../lib/webgl/assets/sceneDoc'
import { liveViewPose } from '../../lib/webgl/runtime/controls/LivePoseCapture'
import {
  CAMERA_PATH_KIND,
  serializeCameraPath,
  stillFromViewPose,
  type CameraPathStill,
} from '../../lib/webgl/runtime/controls/cameraPath'
import type { OrbitFrameHandle } from '../../lib/webgl/runtime/controls/cameraJourney'
import type { ViewPose } from '../../lib/webgl/assets/viewPose'
import { SCENE_NOISE_LABELS, lookNeedsComposer } from '../../lib/webgl/runtime/camera/cameraLook'
import { SceneWorld } from './WebglScenePlayer'

type WebglSceneEditorProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type EditorToggles = {
  helpers: boolean
  space: boolean
  cursor: boolean
}

const ALIGN_PCT = [75, 50] as const

function formatVec(v: readonly number[] | null): string {
  if (!v) return '—'
  return v.map((n) => n.toFixed(2)).join(', ')
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

function isNoiseKind(id: string): id is SceneNoiseKind {
  return SCENE_NOISE_KINDS.includes(id as SceneNoiseKind)
}

export function WebglSceneEditor({ open = true, onOpenChange }: WebglSceneEditorProps) {
  const initialId = WEBGL_SCENES[0]?.id ?? 'landing'
  const [sceneId, setSceneId] = useState(initialId)
  const [viewId, setViewId] = useState(SCENE_HOME_VIEW_ID)
  const [flyTicket, setFlyTicket] = useState(0)
  const [replayMotion, setReplayMotion] = useState({ id: '', ticket: 0 })
  const [look, setLook] = useState<SceneCameraLook>(DEFAULT_SCENE_LOOK)
  const [acm, setAcm] = useState<SceneCameraAcm>(DEFAULT_SCENE_ACM)
  const [toggles, setToggles] = useState<EditorToggles>({
    helpers: false,
    space: false,
    cursor: false,
  })
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
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
  const [objectId, setObjectId] = useState<string | null>(null)
  const [objectEdits, setObjectEdits] = useState<Record<string, SceneObjectPose>>({})
  const [objectCopied, setObjectCopied] = useState(false)
  const [objectDragging, setObjectDragging] = useState(false)
  const [gizmoTicket, setGizmoTicket] = useState(0)
  const [sceneTicket, setSceneTicket] = useState(0)
  const liveObjectPose = useRef<SceneObjectPose | null>(null)
  const [pathStills, setPathStills] = useState<CameraPathStill[]>([])
  const [space, setSpace] = useState<SpaceSample | null>(null)
  const poseRef = useRef<ViewPose>({
    position: [0, 1, 2],
    target: [0, 0, 0],
  })
  const orbitHandleRef = useRef<OrbitFrameHandle | null>(null)
  const onSpaceSample = useCallback((sample: SpaceSample) => {
    setSpace(sample)
  }, [])

  const scene = getWebglScene(sceneId) ?? WEBGL_SCENES[0]
  const doc = bakedSceneDoc(sceneId)
  const sceneItems: MenuItem[] = useMemo(
    () => WEBGL_SCENES.map((row) => ({ id: row.id, label: row.label })),
    [],
  )
  const noiseItems: MenuItem[] = useMemo(
    () => SCENE_NOISE_KINDS.map((id) => ({ id, label: SCENE_NOISE_LABELS[id] })),
    [],
  )

  const viewItems: MenuItem[] = useMemo(() => {
    if ('error' in doc) return [{ id: SCENE_HOME_VIEW_ID, label: 'Home' }]
    return sceneViewpointMarks(doc).map((mark) => ({ id: mark.id, label: mark.label }))
  }, [doc])
  const viewLabel = viewItems.find((item) => item.id === viewId)?.label ?? 'Home'
  const motionItems: MenuItem[] = useMemo(() => {
    if ('error' in doc) return []
    return doc.cameraMotions.map((motion) => ({ id: motion.id, label: motion.label }))
  }, [doc])
  const motionLabel = motionItems.find((item) => item.id === replayMotion.id)?.label ?? motionItems[0]?.label ?? 'Play'
  const objectItems: MenuItem[] = useMemo(() => {
    if ('error' in doc) return []
    return doc.objects.map((object) => ({ id: object.id, label: object.id }))
  }, [doc])
  const objectLabel = objectItems.find((item) => item.id === objectId)?.label ?? 'Object'

  const resetLiveScene = useCallback((id: string) => {
    const next = bakedSceneDoc(id)
    setViewId(SCENE_HOME_VIEW_ID)
    setFlyTicket(0)
    setReplayMotion({ id: '', ticket: 0 })
    setCopied(false)
    setCopiedPath(false)
    setPointerCopied(false)
    setObjectCopied(false)
    setLocatorOn(false)
    setLocatorOrigin(null)
    setLocatorPos(null)
    setLocatorRot(REFERENCE_POINTER_ROTATION)
    setLocatorDragging(false)
    setObjectId(null)
    setObjectEdits({})
    setObjectDragging(false)
    liveObjectPose.current = null
    setGizmoTicket(0)
    setPathStills([])
    if ('error' in next) {
      setLook(DEFAULT_SCENE_LOOK)
      setAcm(DEFAULT_SCENE_ACM)
      return
    }
    setLook(next.camera.look)
    setAcm(next.camera.acm)
    poseRef.current = sceneViewPose(next)
    orbitHandleRef.current = null
  }, [])

  useEffect(() => {
    resetLiveScene(sceneId)
  }, [resetLiveScene, sceneId])

  function refreshScene() {
    resetLiveScene(sceneId)
    setSceneTicket((n) => n + 1)
  }

  const featureIds = useMemo(() => {
    const ids = ['webgl-stage', 'camera-rig', 'orbit-rig', `scene:${sceneId}`]
    if (lookNeedsComposer(look)) ids.push('camera-look')
    if (acm.intensity > 0) ids.push('ambient-camera-motion')
    if (toggles.helpers) ids.push('scene-helpers')
    if (locatorOn) ids.push('reference-pointer')
    if (objectId) ids.push('scene-object-gizmo')
    if (toggles.space) ids.push('webgl-space', 'screen-map', 'space-debug', 'shadow-align')
    return ids
  }, [acm.intensity, look, locatorOn, objectId, sceneId, toggles])

  function copySession() {
    const live = liveViewPose(poseRef, orbitHandleRef)
    const json = serializeSceneSession({
      kind: 'webgl-scene-session',
      sceneId,
      camera: {
        position: live.position,
        target: live.target,
        orbit: live.orbit,
        up: live.up,
        quaternion: live.quaternion,
      },
      look,
      acm,
    })
    void navigator.clipboard?.writeText(json)
    setCopied(true)
    setPointerCopied(false)
    setCopiedPath(false)
    setObjectCopied(false)
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
      sceneId,
      stills: pathStills,
    })
    void navigator.clipboard?.writeText(json)
    setCopiedPath(true)
    setCopied(false)
    setPointerCopied(false)
    setObjectCopied(false)
  }

  function toggleLocator() {
    if (locatorOn || 'error' in doc) {
      setLocatorOn(false)
      setLocatorOrigin(null)
      setLocatorPos(null)
      setLocatorRot(REFERENCE_POINTER_ROTATION)
      setLocatorDragging(false)
      return
    }
    const home = referencePointerHome(sceneViewPose(doc).target)
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
      serializeReferencePointer({ position: locatorPos, rotation: locatorRot }, 'scene'),
    )
    setPointerCopied(true)
    setCopied(false)
    setCopiedPath(false)
    setObjectCopied(false)
  }

  function bakedObjectPose(id: string): SceneObjectPose | null {
    if ('error' in doc) return null
    const object = doc.objects.find((row) => row.id === id)
    if (!object) return null
    return {
      position: [...object.position],
      rotation: [...object.rotation],
      scale: [...object.scale],
    }
  }

  function selectObject(id: string) {
    setObjectId(id)
    const pose = objectEdits[id] ?? bakedObjectPose(id)
    liveObjectPose.current = pose
    setObjectCopied(false)
  }

  function copyObject() {
    if (!objectId) return
    const pose = liveObjectPose.current ?? objectEdits[objectId] ?? bakedObjectPose(objectId)
    if (!pose) return
    void navigator.clipboard?.writeText(serializeSceneObjectPose(sceneId, objectId, pose))
    setObjectCopied(true)
    setCopied(false)
    setCopiedPath(false)
    setPointerCopied(false)
  }

  function goToView(id: string) {
    setViewId(id)
    setFlyTicket((n) => n + 1)
    setReplayMotion({ id: '', ticket: 0 })
  }

  function playMotion(id: string) {
    if (!('error' in doc)) {
      const motion = doc.cameraMotions.find((row) => row.id === id)
      if (motion) setViewId(motion.to)
    }
    setReplayMotion((prev) => ({ id, ticket: prev.ticket + 1 }))
  }

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === panelRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggleFullscreen() {
    const node = panelRef.current
    if (!node) return
    if (document.fullscreenElement === node) void document.exitFullscreen()
    else void node.requestFullscreen()
  }

  function setToggle(key: keyof EditorToggles, value: boolean) {
    setToggles((prev) => ({ ...prev, [key]: value }))
  }

  function patchLook<K extends keyof SceneCameraLook>(key: K, value: SceneCameraLook[K]) {
    setLook((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <section
      ref={panelRef}
      className={[
        'theme-webgl-toolkit__panel',
        open ? 'theme-webgl-toolkit__panel--open' : '',
        fullscreen ? 'theme-webgl-toolkit__panel--fullscreen' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="webgl-scene-editor-title"
    >
      <div className="theme-webgl-toolkit__chrome">
        <header className="theme-webgl-toolkit__titlebar">
          <h2 id="webgl-scene-editor-title" className="theme-webgl-toolkit__title">
            Scene editor
          </h2>
          <div className="theme-webgl-toolkit__title-spacer" aria-hidden />
          <IconButton
            icon={fullscreen ? Minimize2 : Maximize2}
            aria-label={fullscreen ? 'Leave full screen' : 'Full screen'}
            size="xs"
            variant="ghost"
            onClick={() => toggleFullscreen()}
          />
          {onOpenChange ? (
            <IconButton
              icon={open ? ChevronUp : ChevronDown}
              aria-label={open ? 'Collapse scene editor' : 'Expand scene editor'}
              size="xs"
              variant="ghost"
              onClick={() => onOpenChange(!open)}
            />
          ) : null}
        </header>
        {open ? (
          <div className="theme-webgl-toolkit__ribbon">
            <ThemeScroll axis="horizontal" rail="nano" className="theme-webgl-toolkit__ribbon-scroll">
              <div className="theme-webgl-toolkit__ribbon-inner" role="toolbar" aria-label="Scene tools">
                <RibbonCol label="Scene">
                  <MenuButton
                    label={scene?.label ?? 'Scene'}
                    icon={Clapperboard}
                    iconDropdown
                    items={sceneItems}
                    selectedId={sceneId}
                    onSelect={setSceneId}
                    size="xs"
                    menuSize="compact"
                    portal
                    variant="tray"
                  />
                  <ToolbarTip content="Refresh scene — remount from the bake, replay the opening crane, drop live object edits. Does not reload the page.">
                    <IconButton
                      icon={RefreshCw}
                      aria-label="Refresh scene"
                      size="xs"
                      variant="ghost"
                      onClick={() => refreshScene()}
                    />
                  </ToolbarTip>
                </RibbonCol>
                <RibbonCol label="View">
                  <ToolbarTip content="Jump to the scene Home camera or a baked scene position. Pins in the viewport are the same shots.">
                    <MenuButton
                      label={viewLabel}
                      icon={Eye}
                      iconDropdown
                      items={viewItems}
                      selectedId={viewId}
                      onSelect={goToView}
                      size="xs"
                      menuSize="compact"
                      portal
                      variant="tray"
                      triggerLabelAnim={false}
                    />
                  </ToolbarTip>
                </RibbonCol>
                {motionItems.length ? (
                  <RibbonCol label="Play">
                    <ToolbarTip content="Play a baked scene camera animation. Seats the start, then cranes to the end.">
                      <MenuButton
                        label={motionLabel}
                        icon={Play}
                        iconDropdown
                        items={motionItems}
                        selectedId={replayMotion.id || motionItems[0]?.id}
                        onSelect={playMotion}
                        size="xs"
                        menuSize="compact"
                        portal
                        variant="tray"
                        triggerLabelAnim={false}
                      />
                    </ToolbarTip>
                  </RibbonCol>
                ) : null}
                <RibbonCol label="Camera">
                  <ToolbarTip content="How hard the sharp plane drops off. 0 is razor, 1 is miniature bokeh that dampens the edges.">
                    <Slider
                      className="theme-webgl-toolkit__look"
                      label="Focus"
                      min={0}
                      max={SCENE_LOOK_FOCUS_MAX}
                      step={0.01}
                      value={look.focus}
                      minLabel="Sharp"
                      maxLabel="Soft"
                      aria-label="Focus falloff"
                      onChange={(value) => patchLook('focus', value)}
                    />
                  </ToolbarTip>
                  <ToolbarTip content="35mm-equivalent millimetres. A longer lens keeps a thinner slice in focus.">
                    <Slider
                      className="theme-webgl-toolkit__look"
                      label="Lens"
                      min={18}
                      max={SCENE_LOOK_FOCAL_LENGTH_MAX}
                      step={1}
                      value={look.focalLength}
                      minLabel="Wide"
                      maxLabel="Tele"
                      aria-label="Focal length millimetres"
                      onChange={(value) => patchLook('focalLength', value)}
                    />
                  </ToolbarTip>
                  <ToolbarTip content="Metres to the sharp plane. 0 tracks the orbit look-at.">
                    <Slider
                      className="theme-webgl-toolkit__look"
                      label="Distance"
                      min={0}
                      max={8}
                      step={0.01}
                      value={look.focalDistance}
                      minLabel="Look-at"
                      maxLabel="Far"
                      aria-label="Focal distance metres"
                      onChange={(value) => patchLook('focalDistance', value)}
                    />
                  </ToolbarTip>
                </RibbonCol>
                <RibbonCol label="ACM">
                  <ToolbarTip content="Ambient camera motion. The view pans and tilts toward the pointer. 0 is still.">
                    <Slider
                      className="theme-webgl-toolkit__look"
                      label="Intensity"
                      min={0}
                      max={SCENE_ACM_INTENSITY_MAX}
                      step={0.01}
                      value={acm.intensity}
                      minLabel="Still"
                      maxLabel="Wide"
                      aria-label="Ambient camera motion intensity"
                      onChange={(value) => setAcm({ ...acm, intensity: value })}
                    />
                  </ToolbarTip>
                  <ToolbarTip content="Camera lock. On: ACM around Home, to a max rotate and pan. Off: free orbit and zoom; ACM still peeks, easing in after a hop.">
                    <label className="theme-webgl-toolkit__check type-caption">
                      <input
                        type="checkbox"
                        checked={acm.lock}
                        onChange={(event) => setAcm({ ...acm, lock: event.target.checked })}
                      />
                      Lock
                    </label>
                  </ToolbarTip>
                </RibbonCol>
                <RibbonCol label="Grain">
                  <ToolbarTip content="Grain texture. Film is luminance-weighted, white is hash, simplex is smooth blended noise.">
                    <MenuButton
                      label={SCENE_NOISE_LABELS[look.noise]}
                      icon={Aperture}
                      iconDropdown
                      items={noiseItems}
                      selectedId={look.noise}
                      onSelect={(id) => {
                        if (isNoiseKind(id)) patchLook('noise', id)
                      }}
                      size="xs"
                      menuSize="compact"
                      portal
                      variant="tray"
                    />
                  </ToolbarTip>
                  <ToolbarTip content="How visible the grain is. Off noise ignores this.">
                    <Slider
                      className="theme-webgl-toolkit__look"
                      label="Amount"
                      min={0}
                      max={1}
                      step={0.01}
                      value={look.grain}
                      disabled={look.noise === 'off'}
                      minLabel="None"
                      maxLabel="Heavy"
                      aria-label="Grain amount"
                      onChange={(value) => patchLook('grain', value)}
                    />
                  </ToolbarTip>
                </RibbonCol>
                {(
                  [
                    ['helpers', 'Helpers'],
                    ['space', 'Space'],
                    ['cursor', 'Pointer'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="theme-webgl-toolkit__check type-caption">
                    <input
                      type="checkbox"
                      checked={toggles[key]}
                      onChange={(event) => setToggle(key, event.target.checked)}
                    />
                    {label}
                  </label>
                ))}
                <RibbonCol label="Object">
                  <ToolbarTip content="Choose a scene object. Pivot gizmo in 3D: move, rotate, and resize. Copy writes world metres, Euler, and scale.">
                    <MenuButton
                      label={objectLabel}
                      icon={Box}
                      iconDropdown
                      items={objectItems}
                      selectedId={objectId ?? undefined}
                      onSelect={selectObject}
                      size="xs"
                      menuSize="compact"
                      portal
                      variant="tray"
                      triggerLabelAnim={false}
                    />
                  </ToolbarTip>
                  {objectId ? (
                    <ToolbarTip content="Copy object — world XYZ, Euler rotation, and scale. Paste to chat to update the baked scene JSON.">
                      <IconButton
                        icon={ClipboardCopy}
                        aria-label={objectCopied ? 'Copied object' : 'Copy object'}
                        size="xs"
                        variant="ghost"
                        onClick={() => copyObject()}
                      />
                    </ToolbarTip>
                  ) : null}
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
                      <ToolbarTip content="Show tag — Scene tag label on the pin. Labels never capture the pointer.">
                        <IconButton
                          icon={Tag}
                          aria-label="Show pointer tag"
                          aria-pressed={locatorShowTag}
                          active={locatorShowTag}
                          size="xs"
                          onClick={() => setLocatorShowTag((prev) => !prev)}
                        />
                      </ToolbarTip>
                      <ToolbarTip content="Copy pointer — world XYZ and Euler rotation in radians. Paste to chat as a scene place reference.">
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
                        aria-label={copiedPath ? 'Copied path' : 'Copy path'}
                        size="xs"
                        variant="ghost"
                        disabled={pathStills.length < 2}
                        onClick={() => copyPath()}
                      />
                    </ToolbarTip>
                  </ToolbarControlTray>
                </RibbonCol>
                <ToolbarControlTray density="compact">
                  <ToolbarTip content="Copy session — live camera position, look-at, and orbit. Paste to chat as a scene reference.">
                    <IconButton
                      icon={ClipboardCopy}
                      aria-label={copied ? 'Copied session' : 'Copy session'}
                      size="xs"
                      variant="ghost"
                      onClick={() => copySession()}
                    />
                  </ToolbarTip>
                </ToolbarControlTray>
              </div>
            </ThemeScroll>
          </div>
        ) : null}
      </div>
      {open ? (
        <div
          className={[
            'theme-webgl-toolkit__viewport',
            toggles.space ? 'theme-webgl-toolkit__viewport--space' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <WebglStage active={open}>
            {'error' in doc ? null : (
              <SceneWorld
                key={`${sceneId}:${sceneTicket}`}
                doc={doc}
                look={look}
                acm={acm}
                viewId={viewId}
                flyTicket={flyTicket}
                showViews
                showCursor={toggles.cursor}
                onSelectView={goToView}
                poseRef={poseRef}
                orbitHandleRef={orbitHandleRef}
                orbitEnabled={!locatorDragging && !objectDragging}
                replayMotion={replayMotion.ticket > 0 ? replayMotion : undefined}
                objectEdits={objectEdits}
                selectedObjectId={objectId}
                objectGizmoKey={`${objectId ?? ''}-${gizmoTicket}`}
                onObjectPose={(_id, pose) => {
                  liveObjectPose.current = pose
                }}
                onObjectDragging={(dragging) => {
                  setObjectDragging(dragging)
                  if (!dragging && objectId && liveObjectPose.current) {
                    const pose = liveObjectPose.current
                    setObjectEdits((prev) => ({ ...prev, [objectId]: pose }))
                    setGizmoTicket((n) => n + 1)
                  }
                }}
              />
            )}
            {locatorOn && locatorOrigin ? (
              <ReferencePointer
                key={`${sceneId}-${locatorTicket}`}
                origin={locatorOrigin}
                selected={locatorSelected}
                showTag={locatorShowTag}
                tag="scene"
                onSelect={() => setLocatorSelected((prev) => !prev)}
                onPose={(pose) => {
                  setLocatorPos(pose.position)
                  setLocatorRot(pose.rotation)
                }}
                onDragging={setLocatorDragging}
              />
            ) : null}
            {toggles.helpers ? <SceneHelpers /> : null}
            {toggles.space ? (
              <>
                <SpaceProbe onSample={onSpaceSample} alignPct={ALIGN_PCT} />
                <SpaceAlignMarker point={space?.align ?? null} />
                <ShadowAlignGizmos />
              </>
            ) : null}
          </WebglStage>
          {'error' in doc ? (
            <p className="type-body-sm theme-webgl-toolkit__error mb-0" role="alert">
              {doc.error}
            </p>
          ) : null}
          {toggles.space ? (
            <>
              <div className="theme-webgl-toolkit__space-guide theme-webgl-toolkit__space-guide--x75" />
              <div className="theme-webgl-toolkit__space-guide theme-webgl-toolkit__space-guide--y50" />
              <p className="theme-webgl-toolkit__space font-mono text-[0.65rem] mb-0">
                {WEBGL_SPACE.up}-up · 1 u = 1 {WEBGL_SPACE.unit} · ground y={WEBGL_SPACE.groundY}
                {space ? (
                  <>
                    <br />
                    cam {space.distance.toFixed(2)} m from ({formatVec(space.lookAt)})
                    <br />
                    frustum {space.frustum.width.toFixed(2)} × {space.frustum.height.toFixed(2)} m at look-at
                    <br />
                    pointer {(space.pointer.x * 100).toFixed(0)}% × {(space.pointer.y * 100).toFixed(0)}% → (
                    {formatVec(space.pointerWorld)})
                    <br />
                    {ALIGN_PCT[0]}% × {ALIGN_PCT[1]}% → ({formatVec(space.align)})
                  </>
                ) : null}
              </p>
            </>
          ) : null}
          <p className="theme-webgl-toolkit__ids font-mono text-[0.65rem] mb-0">
            {featureIds.join(' · ')}
            {locatorOn && locatorPos
              ? ` · pointer ${formatVec(locatorPos)} · rot ${formatVec(locatorRot)}`
              : ''}
          </p>
        </div>
      ) : null}
    </section>
  )
}
