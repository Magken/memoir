import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import type { Group } from 'three'
import { LivePoseCapture } from '../../lib/webgl/runtime/controls/LivePoseCapture'
import type { ViewPose } from '../../lib/webgl/assets/viewPose'
import { journeyDuration, type OrbitFrameHandle } from '../../lib/webgl/runtime/controls/cameraJourney'
import { WebglStage } from '../../lib/webgl/runtime/core/WebglStage'
import { CameraRig } from '../../lib/webgl/runtime/camera/CameraRig'
import { OrbitRig } from '../../lib/webgl/runtime/controls/OrbitRig'
import { ViewpointFly } from '../../lib/webgl/runtime/controls/ViewpointFly'
import { SceneMotionFly } from '../../lib/webgl/runtime/controls/SceneMotionFly'
import { AcmRig } from '../../lib/webgl/runtime/controls/AcmRig'
import { BOOM_ARC_DURATION, BOOM_ARC_IMPULSE_T, posesFromWaypoints } from '../../lib/webgl/runtime/controls/sceneBoomArc'
import { DarkFogRig } from '../../lib/webgl/runtime/lights/DarkFogRig'
import { WireCageSpring } from '../../lib/webgl/runtime/materials/WireCageSpring'
import { WireCageLights } from '../../lib/webgl/runtime/materials/WireCageLights'
import { AssetBoundary } from '../../lib/webgl/runtime/assets/AssetBoundary'
import { getWebglAsset } from '../../lib/webgl/assets/assetManifest'
import { bakedAnnotationDoc } from '../../lib/webgl/assets/assetDocs'
import {
  bakedSceneDoc,
  sceneLoadMotion,
  sceneMotionBetween,
  sceneMotionById,
  sceneOpeningPose,
  sceneViewPose,
  sceneViewpointMarks,
  SCENE_HOME_VIEW_ID,
  type SceneCameraLook,
  type SceneCameraAcm,
  type SceneCameraMotion,
  type SceneDoc,
} from '../../lib/webgl/assets/sceneDoc'
import { CameraLookRig } from '../../lib/webgl/runtime/camera/CameraLookRig'
import { GltfSubject, PrimitiveBox, SplatSubject } from './WebglSubjects'
import { VolumetricCloud } from '../../lib/webgl/runtime/volume/VolumetricCloud'
import { AboutUsWordmark } from '../../lib/webgl/runtime/text/AboutUsWordmark'
import { ABOUT_US_SCENE_FRONT_YAW } from '../../lib/webgl/runtime/text/aboutUsLetterLayout'
import { ProjectsWordmark } from '../../lib/webgl/runtime/text/ProjectsWordmark'
import { PROJECTS_SCENE_FRONT_YAW } from '../../lib/webgl/runtime/text/projectsLetterLayout'
import { GrasWordmark } from '../../lib/webgl/runtime/text/GrasWordmark'
import { SceneObjectGizmo } from '../../lib/webgl/runtime/helpers/SceneObjectGizmo'
import type { SceneObjectPose } from '../../lib/webgl/runtime/helpers/sceneObjectPose'
import { AnnotationMarkers } from '../../lib/webgl/runtime/interaction/AnnotationMarkers'
import { useRaycastPick, type RaycastHit } from '../../lib/webgl/runtime/interaction/useRaycastPick'
import {
  SCENE_DEPART_S,
  incomingIntroT,
  introTForScene,
  scaleHexRgb,
  sceneClockWaiting,
  sceneFlyRate,
  sceneUsesViewpointFly,
  steeredIntroAtDone,
  visibleSceneTone,
} from '../../lib/webgl/runtime/materials/sceneObjectColor'
import { menuRetreatHex, menuRetreatIntensity } from '../../lib/lcl/menuLcl'
import { setCeramicMeshColor } from '../../lib/webgl/runtime/materials/ceramicScatter'
import { setWireLightColor } from '../../lib/webgl/runtime/materials/wireLights'

export type SceneSteer = {
  ticket: number
  /** `1` forward, `-1` reverse, `0` hold. */
  rate: number
  /** Progress applied when `ticket` changes. */
  origin: number
  motionId?: string
  fromView?: string
  toView?: string
  duration?: number
  /** Object color follows this crane. Off for the copy hops. */
  tint?: boolean
}

type WebglScenePlayerProps = {
  sceneId: string
  /** Stop page scroll over the canvas. `/` locks it and uses the wheel to swap scenes. */
  lockPageScroll?: boolean
  /** Scene Home or a viewpoint id. Product text UI hops with `flyTicket`. */
  viewId?: string
  flyTicket?: number
  /** Take this scene's object color to black, then `onDeparted` swaps `sceneId` on the same canvas. */
  depart?: boolean
  onDeparted?: () => void
  /** Skip the opening crane. Ramp object color from black at the shot already seated. */
  riseAtHome?: boolean
  /** Steered crane or hop. `rate` -1 reverses from the current frame. */
  steer?: SceneSteer
  onSteerDone?: () => void
  /** Move fraction 0–1 while a steer is on the clock. */
  onSteerMove?: (t: number) => void
  /** Product scroll owns the crane. Do not also play `playOnLoad`. */
  suppressLoad?: boolean
  /**
   * Menu LCL open 0–1. Eases lamp `intensity` to 0 and dims object RGB by 150.
   * Aligns with the Menu / Quick access chrome on `/`.
   */
  menuRetreat?: number
}

export type SceneWorldProps = {
  doc: SceneDoc
  look?: SceneCameraLook
  acm?: SceneCameraAcm
  viewId?: string
  flyTicket?: number
  showViews?: boolean
  showCursor?: boolean
  onSelectView?: (id: string) => void
  poseRef?: MutableRefObject<ViewPose>
  orbitHandleRef?: MutableRefObject<OrbitFrameHandle | null>
  orbitEnabled?: boolean
  replayMotion?: { id: string; ticket: number }
  objectEdits?: Record<string, SceneObjectPose>
  selectedObjectId?: string | null
  objectGizmoKey?: string
  onObjectPose?: (id: string, pose: SceneObjectPose) => void
  onObjectDragging?: (dragging: boolean) => void
  /** Take this scene's object color to black, then `onDeparted` swaps `sceneId` on the same canvas. */
  depart?: boolean
  onDeparted?: () => void
  /** Skip the opening crane. Ramp object color from black at the shot already seated. */
  riseAtHome?: boolean
  steer?: SceneSteer
  onSteerDone?: () => void
  /** Move fraction 0–1 while a steer is on the clock. */
  onSteerMove?: (t: number) => void
  /** Product scroll owns the crane. Do not also play `playOnLoad`. */
  suppressLoad?: boolean
  /** Menu LCL open 0–1 — lamp intensity + object RGB dim. */
  menuRetreat?: number
}

function ignorePlace(_hit: RaycastHit | null) {}

function SceneAssets({ onReady, children }: { onReady: () => void; children: ReactNode }) {
  useLayoutEffect(() => {
    onReady()
  }, [onReady])
  return children
}

function steerMotion(doc: SceneDoc, steer: SceneSteer | undefined): SceneCameraMotion | undefined {
  if (!steer) return undefined
  if (steer.motionId) return sceneMotionById(doc, steer.motionId)
  if (!steer.fromView || !steer.toView) return undefined
  return {
    id: `${steer.fromView}-to-${steer.toView}`,
    label: 'Scroll',
    kind: 'journey',
    from: steer.fromView,
    to: steer.toView,
    duration: steer.duration ?? 2,
  }
}

function sceneImpulseMarks(doc: SceneDoc) {
  const marks = []
  for (const object of doc.objects) {
    const baked = bakedAnnotationDoc(object.assetId)
    if ('error' in baked) continue
    for (const mark of baked.annotations) {
      if (mark.impulse) marks.push(mark)
    }
  }
  return marks
}

function SceneObject({
  assetId,
  position,
  rotation,
  scale,
  pick,
  lightColor,
  lightGain,
  hoverEnabled = true,
  onHoverChange,
}: {
  assetId: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  pick: ReturnType<typeof useRaycastPick>
  lightColor: string
  lightGain: number
  hoverEnabled?: boolean
  onHoverChange?: (hovered: boolean) => void
}) {
  const asset = getWebglAsset(assetId)
  const modelRef = useRef<Group | null>(null)
  if (!asset) return null
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {asset.kind === 'gltf' && asset.path ? (
        <GltfSubject
          ref={modelRef}
          url={asset.path}
          assetId={asset.id}
          upAxis={asset.upAxis}
          onPointerDown={pick.onPointerDown}
          onPointerMove={pick.onPointerMove}
          onPointerLeave={pick.onPointerLeave}
          onPointerUp={pick.onPointerUp}
        />
      ) : null}
      {asset.kind === 'splat' && asset.path ? (
        <SplatSubject
          ref={modelRef}
          url={asset.path}
          upAxis={asset.upAxis}
          onPointerDown={pick.onPointerDown}
          onPointerMove={pick.onPointerMove}
          onPointerLeave={pick.onPointerLeave}
          onPointerUp={pick.onPointerUp}
        />
      ) : null}
      {asset.kind === 'primitive' ? (
        <PrimitiveBox
          ref={modelRef}
          onPointerDown={pick.onPointerDown}
          onPointerMove={pick.onPointerMove}
          onPointerLeave={pick.onPointerLeave}
          onPointerUp={pick.onPointerUp}
        />
      ) : null}
      {asset.kind === 'volume' ? (
        <VolumetricCloud
          onPointerDown={pick.onPointerDown}
          onPointerMove={pick.onPointerMove}
          onPointerLeave={pick.onPointerLeave}
          onPointerUp={pick.onPointerUp}
        />
      ) : null}
      {asset.kind === 'text' && asset.id === 'about-us-letters' ? (
        <AboutUsWordmark
          ref={modelRef}
          color={lightColor}
          intensity={lightGain}
          anchor="left"
          frontYaw={ABOUT_US_SCENE_FRONT_YAW}
          hoverEnabled={hoverEnabled}
          onHoverChange={onHoverChange}
        />
      ) : asset.kind === 'text' && asset.id === 'projects-letters' ? (
        <ProjectsWordmark
          ref={modelRef}
          color={lightColor}
          intensity={lightGain}
          anchor="left"
          frontYaw={PROJECTS_SCENE_FRONT_YAW}
          hoverEnabled={hoverEnabled}
          onHoverChange={onHoverChange}
        />
      ) : asset.kind === 'text' ? (
        <GrasWordmark
          ref={modelRef}
          color={lightColor}
          intensity={lightGain}
          anchor="top"
          hoverEnabled={hoverEnabled}
          onHoverChange={onHoverChange}
        />
      ) : null}
    </group>
  )
}

export function SceneWorld({
  doc,
  look,
  acm,
  viewId = SCENE_HOME_VIEW_ID,
  flyTicket = 0,
  showViews = false,
  showCursor = false,
  onSelectView,
  poseRef,
  orbitHandleRef,
  orbitEnabled = true,
  replayMotion,
  objectEdits,
  selectedObjectId,
  objectGizmoKey,
  onObjectPose,
  onObjectDragging,
  depart = false,
  onDeparted,
  riseAtHome = false,
  steer,
  onSteerDone,
  onSteerMove,
  suppressLoad = false,
  menuRetreat = 0,
}: SceneWorldProps) {
  const hover = useRef<RaycastHit | null>(null)
  const [cursorHit, setCursorHit] = useState<RaycastHit | null>(null)
  const [grasHover, setGrasHover] = useState(false)
  const [finishedKey, setFinishedKey] = useState('')
  const [peakTicket, setPeakTicket] = useState(0)
  const [hopFinishedTicket, setHopFinishedTicket] = useState(-1)
  const seatedView = useRef(SCENE_HOME_VIEW_ID)
  const impulseMarks = useMemo(() => sceneImpulseMarks(doc), [doc])
  const onCageSurface = useCallback((hit: RaycastHit | null) => {
    hover.current = hit
  }, [])
  const pick = useRaycastPick(ignorePlace, {
    enabled: true,
    toolActive: true,
    onSurface: onCageSurface,
    onHover: showCursor ? setCursorHit : undefined,
  })
  const lens = look ?? doc.camera.look
  const peek = acm ?? doc.camera.acm
  const locked = peek.lock
  const steeredMotion = steerMotion(doc, steer)
  const loadMotion = steeredMotion || riseAtHome || suppressLoad ? undefined : sceneLoadMotion(doc)
  const replaying = Boolean(replayMotion && replayMotion.ticket > 0)
  const incoming = incomingIntroT({
    riseAtHome,
    tint: Boolean(steer?.tint),
    hasLoadMotion: Boolean(sceneLoadMotion(doc)),
  })
  const [intro, setIntro] = useState(() => ({
    scene: doc.id,
    t: sceneLoadMotion(doc) ? 0 : 1,
  }))
  const [departT, setDepartT] = useState(1)
  const departed = useRef(false)
  const departLive = useRef(false)
  const riseLive = useRef(false)
  const introScene = useRef(doc.id)
  const [readySceneId, setReadySceneId] = useState('')
  const markAssetsReady = useCallback(() => setReadySceneId(doc.id), [doc.id])
  const onDepartedRef = useRef(onDeparted)
  onDepartedRef.current = onDeparted
  if (intro.scene !== doc.id) {
    introScene.current = doc.id
    riseLive.current = false
    setIntro({ scene: doc.id, t: incoming })
    setDepartT(1)
    setFinishedKey('')
  }
  const introT = introTForScene(intro.scene, intro.t, doc.id, incoming)
  useGSAP(
    () => {
      if (!depart) {
        departed.current = false
        departLive.current = false
        return
      }
      if (departed.current) return
      departLive.current = true
      const proxy = { t: 1 }
      const tween = gsap.to(proxy, {
        t: 0,
        duration: SCENE_DEPART_S,
        ease: 'power2.in',
        onUpdate: () => {
          if (departLive.current) setDepartT(proxy.t)
        },
        onComplete: () => {
          if (!departLive.current) return
          departLive.current = false
          departed.current = true
          setDepartT(0)
          onDepartedRef.current?.()
        },
      })
      return () => {
        departLive.current = false
        tween.kill()
      }
    },
    { dependencies: [depart] },
  )
  useGSAP(
    () => {
      if (!riseAtHome) return
      const sceneId = doc.id
      introScene.current = sceneId
      riseLive.current = true
      const proxy = { t: 0 }
      const tween = gsap.to(proxy, {
        t: 1,
        duration: SCENE_DEPART_S,
        ease: 'power2.out',
        onUpdate: () => {
          if (!riseLive.current || introScene.current !== sceneId) return
          setIntro((prev) => (prev.scene === sceneId ? { scene: sceneId, t: proxy.t } : prev))
        },
        onComplete: () => {
          if (!riseLive.current || introScene.current !== sceneId) return
          riseLive.current = false
          setIntro((prev) => (prev.scene === sceneId ? { scene: sceneId, t: 1 } : prev))
        },
      })
      return () => {
        riseLive.current = false
        tween.kill()
        setIntro((prev) => (prev.scene === sceneId ? { scene: sceneId, t: 1 } : prev))
      }
    },
    { dependencies: [riseAtHome, doc.id] },
  )
  const viewHop = !replaying && flyTicket > 0 ? sceneMotionBetween(doc, seatedView.current, viewId) : undefined
  const intended = steeredMotion
    ? steeredMotion
    : replaying && replayMotion
      ? sceneMotionById(doc, replayMotion.id)
      : viewHop
        ? viewHop
        : flyTicket > 0
          ? undefined
          : loadMotion
  // A first visit suspends on the model or the typeface. Keep the crane mounted at
  // rate 0 so the opening pose is seated; a live rate ramps the light before the mesh exists.
  const waitingAssets = sceneClockWaiting(Boolean(intended), readySceneId, doc.id)
  const motion = intended
  const flyRate = sceneFlyRate(waitingAssets, steeredMotion ? steer?.rate : undefined)
  const playKey = motion
    ? `${doc.id}:${motion.id}:${replayMotion?.ticket ?? 0}:${flyTicket}`
    : ''
  const playing = waitingAssets || Boolean(steeredMotion) || (Boolean(motion) && finishedKey !== playKey)
  const hopping = flyTicket > 0 && hopFinishedTicket !== flyTicket && !playing
  const returning = riseAtHome && introT < 1
  const tone = visibleSceneTone(introT, departT, depart)
  const baseLight = tone < 1 ? scaleHexRgb(doc.view.lightColor, tone) : doc.view.lightColor
  const baseMesh = tone < 1 ? scaleHexRgb(doc.view.meshColor, tone) : doc.view.meshColor
  const lightHex = menuRetreat > 0 ? menuRetreatHex(baseLight, menuRetreat) : baseLight
  const meshHex = menuRetreat > 0 ? menuRetreatHex(baseMesh, menuRetreat) : baseMesh
  const menuPulling = menuRetreat > 0
  const lampIntensity = menuRetreatIntensity(doc.view.lightGain, menuRetreat)
  // Only while the ramp is actually moving. Flash-hunt flags (tint/wait/rising) kept
  // publishing after steered sections settled when introT never snapped to 1 — that
  // wiped the hover dim ease on About / Projects / Footer.
  const toneDriving = tone < 1 || depart || menuPulling
  if (toneDriving) {
    setWireLightColor(lightHex)
    setCeramicMeshColor(meshHex)
  }
  const opening = sceneOpeningPose(doc)
  const pose = sceneViewPose(doc, viewId)
  const marks = showViews ? sceneViewpointMarks(doc) : []
  useEffect(() => {
    seatedView.current = SCENE_HOME_VIEW_ID
    setHopFinishedTicket(-1)
    setGrasHover(false)
  }, [doc.id])
  return (
    <>
      <CameraRig position={opening.position} lookAt={opening.target} />
      <OrbitRig
        enabled={!locked && orbitEnabled && !playing && !hopping}
        target={opening.target}
        cameraPosition={opening.position}
      />
      {motion && playing ? (
        <SceneMotionFly
          key={doc.id}
          from={sceneViewPose(doc, motion.from)}
          to={sceneViewPose(doc, motion.to)}
          ticket={steeredMotion ? (steer?.ticket ?? 0) : replaying && replayMotion ? replayMotion.ticket : flyTicket}
          kind={motion.kind}
          duration={
            motion.kind === 'journey'
              ? (motion.duration ??
                  journeyDuration(sceneViewPose(doc, motion.from), sceneViewPose(doc, motion.to)))
              : (motion.duration ?? BOOM_ARC_DURATION)
          }
          hold={motion.hold ?? 0}
          slowMoAt={motion.slowMoAt}
          impulseAt={motion.impulseAt ?? (motion.playOnLoad ? BOOM_ARC_IMPULSE_T : undefined)}
          reverse={motion.reverse === true}
          rate={flyRate}
          origin={steer?.origin ?? 0}
          waypoints={posesFromWaypoints(motion.waypoints ?? [])}
          onDone={() => {
            if (introScene.current !== doc.id) return
            if (steeredMotion) {
              setIntro((prev) =>
                prev.scene === doc.id ? { scene: doc.id, t: steeredIntroAtDone(steer?.rate, steer?.tint) } : prev,
              )
              onSteerDone?.()
              return
            }
            seatedView.current = motion.to
            setIntro((prev) => (prev.scene === doc.id ? { scene: doc.id, t: 1 } : prev))
            setFinishedKey(playKey)
            setHopFinishedTicket(flyTicket)
          }}
          onProgress={
            steeredMotion
              ? steer?.tint
                ? (t) => {
                    if (introScene.current !== doc.id) return
                    setIntro((prev) => (prev.scene === doc.id ? { scene: doc.id, t } : prev))
                  }
                : undefined
              : motion.playOnLoad
                ? (t) => {
                    if (introScene.current !== doc.id) return
                    setIntro((prev) => (prev.scene === doc.id ? { scene: doc.id, t } : prev))
                  }
                : undefined
          }
          onPeak={() => setPeakTicket((n) => n + 1)}
          onMove={steeredMotion ? onSteerMove : undefined}
        />
      ) : sceneUsesViewpointFly(waitingAssets, Boolean(motion), playing) ? (
        <ViewpointFly
          key={doc.id}
          pose={pose}
          ticket={flyTicket}
          onTrip={(active) => {
            if (!active) {
              seatedView.current = viewId
              setHopFinishedTicket(flyTicket)
            }
          }}
        />
      ) : null}
      <AcmRig
        intensity={peek.intensity}
        enabled={!playing && !hopping && !returning && (locked || peek.intensity > 0)}
        restPose={locked ? pose : undefined}
      />
      {poseRef && orbitHandleRef ? (
        <LivePoseCapture poseRef={poseRef} orbitHandleRef={orbitHandleRef} />
      ) : null}
      <DarkFogRig />
      <WireCageSpring hitRef={hover} impulseMarks={impulseMarks} peakTicket={peakTicket} />
      <WireCageLights
        color={lightHex}
        meshColor={meshHex}
        intensity={lampIntensity}
        scatter={doc.view.scatter}
        dim={grasHover && !playing && !depart && !returning && !menuPulling}
        immediate={tone < 1 || depart || returning || menuPulling}
      />
      <AssetBoundary fallback={null}>
        <Suspense fallback={null}>
          <SceneAssets key={doc.id} onReady={markAssetsReady}>
            {doc.objects.map((object) => {
          const pose = objectEdits?.[object.id] ?? {
            position: object.position,
            rotation: object.rotation,
            scale: object.scale,
          }
          const selected = selectedObjectId === object.id
          return (
            <group key={object.id} position={pose.position} rotation={pose.rotation} scale={pose.scale}>
              <SceneObjectGizmo
                key={selected ? objectGizmoKey : object.id}
                enabled={selected}
                label={object.id}
                onPose={(next) => onObjectPose?.(object.id, next)}
                onDragging={onObjectDragging}
              >
                <SceneObject
                  assetId={object.assetId}
                  position={[0, 0, 0]}
                  rotation={[0, 0, 0]}
                  scale={[1, 1, 1]}
                  pick={pick}
                  lightColor={lightHex}
                  lightGain={menuRetreatIntensity(object.lightGain ?? doc.view.lightGain, menuRetreat)}
                  hoverEnabled={!playing && !depart && !returning}
                  onHoverChange={setGrasHover}
                />
              </SceneObjectGizmo>
            </group>
          )
            })}
          </SceneAssets>
        </Suspense>
      </AssetBoundary>
      <AnnotationMarkers
        annotations={marks}
        cursorHit={showCursor ? cursorHit : null}
        selectedId={viewId}
        showPoints={showViews}
        showLabels={showViews}
        onSelect={onSelectView}
      />
      <CameraLookRig look={lens} />
    </>
  )
}

export function WebglScenePlayer({
  sceneId,
  lockPageScroll = true,
  viewId,
  flyTicket,
  depart = false,
  onDeparted,
  riseAtHome = false,
  steer,
  onSteerDone,
  onSteerMove,
  suppressLoad = false,
  menuRetreat = 0,
}: WebglScenePlayerProps) {
  const doc = bakedSceneDoc(sceneId)
  if ('error' in doc) {
    return (
      <p className="type-body-sm m-0 p-4" role="alert">
        {doc.error}
      </p>
    )
  }
  return (
    <div className="theme-webgl-toolkit__viewport absolute inset-0">
      <WebglStage lockPageScroll={lockPageScroll}>
        <SceneWorld
          doc={doc}
          viewId={viewId}
          flyTicket={flyTicket}
          depart={depart}
          onDeparted={onDeparted}
          riseAtHome={riseAtHome}
          steer={steer}
          onSteerDone={onSteerDone}
          onSteerMove={onSteerMove}
          suppressLoad={suppressLoad}
          menuRetreat={menuRetreat}
        />
      </WebglStage>
    </div>
  )
}
