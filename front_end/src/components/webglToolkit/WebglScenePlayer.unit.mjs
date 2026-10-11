/**
 * Scene player mounts a baked scene, not a free asset picker.
 * Run: node front_end/src/components/webglToolkit/WebglScenePlayer.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./WebglScenePlayer.tsx', import.meta.url)), 'utf8')

assert.match(src, /export function SceneWorld/)
assert.match(src, /CameraLookRig/)
assert.match(src, /useRaycastPick/)
assert.match(src, /onSurface: onCageSurface/)
assert.match(src, /onPointerMove=\{pick.onPointerMove\}/)
assert.match(src, /cursorHit=\{showCursor \? cursorHit : null\}/)
assert.match(src, /showCursor/)
assert.match(src, /onHover: showCursor \? setCursorHit : undefined/)
assert.doesNotMatch(src, /showCursor = true/, 'negative: / must not show the pointer helper')
assert.match(src, /bakedSceneDoc\(sceneId\)/)
assert.match(src, /GltfSubject/)
assert.match(src, /<GrasWordmark/)
assert.match(src, /<AboutUsWordmark/)
assert.match(src, /<ProjectsWordmark/)
assert.match(src, /asset\.id === 'about-us-letters'/)
assert.match(src, /asset\.id === 'projects-letters'/)
assert.match(src, /<SceneObjectGizmo/)
assert.match(src, /objectEdits/)
assert.doesNotMatch(
  src,
  /<WebglScenePlayer[\s\S]{0,240}objectEdits/,
  'negative: `/` playback must not mount the object gizmo',
)
assert.match(src, /onHoverChange=\{onHoverChange\}/)
assert.match(src, /onHoverChange=\{setGrasHover\}/)
assert.doesNotMatch(
  src,
  /<GrasWordmark[\s\S]{0,200}onHoverChange=\{setGrasHover\}/,
  'negative: SceneObject cannot close over setGrasHover',
)
assert.match(src, /<AboutUsWordmark[\s\S]{0,280}onHoverChange=\{onHoverChange\}/)
assert.doesNotMatch(
  src,
  /<AboutUsWordmark[\s\S]{0,280}onHoverChange=\{setGrasHover\}/,
  'negative: About Us must dim through SceneObject onHoverChange, not close over setGrasHover',
)
assert.match(src, /<AboutUsWordmark[\s\S]{0,220}hoverEnabled=\{hoverEnabled\}/)
assert.match(src, /<ProjectsWordmark[\s\S]{0,280}anchor="left"/)
assert.match(src, /frontYaw=\{PROJECTS_SCENE_FRONT_YAW\}/)
assert.doesNotMatch(
  src,
  /<ProjectsWordmark[\s\S]{0,280}anchor="top"/,
  'negative: Projects pin is the left of P, not the top of the letters',
)
assert.match(src, /dim=\{grasHover && !playing && !depart && !returning && !menuPulling\}/)
assert.doesNotMatch(
  src,
  /dim=\{grasHover\}/,
  'negative: GRAS hover must not dim Adam during the back-to-front crane or Menu LCL open',
)
assert.match(src, /hoverEnabled=\{!playing && !depart && !returning\}/)
assert.doesNotMatch(
  src,
  /hoverEnabled=\{!playing\}/,
  'negative: a wheel depart must keep letter hover locked',
)
assert.doesNotMatch(
  src,
  /<GrasWordmark[\s\S]{0,400}pick\.onPointerMove/,
  'negative: GRAS hover must not feed the Adam cage spring',
)
assert.doesNotMatch(src, /text\/GrasLetters/, 'negative: stale GrasLetters.ts URL has no component export')
assert.doesNotMatch(src, /text\/AboutUs['"]/, 'negative: stale AboutUs.ts URL has no component export')
assert.doesNotMatch(src, /text\/Projects['"]/, 'negative: stale Projects.ts URL has no component export')
assert.match(src, /kind === 'text'/)
assert.match(src, /<AboutUsWordmark[\s\S]{0,280}anchor="left"/)
assert.match(src, /frontYaw=\{ABOUT_US_SCENE_FRONT_YAW\}/)
assert.match(src, /<GrasWordmark[\s\S]{0,220}anchor="top"/)
assert.doesNotMatch(
  src,
  /<AboutUsWordmark[\s\S]{0,280}anchor="top"/,
  'negative: About Us pin is the left of A, not the top of the letters',
)
assert.doesNotMatch(src, /anchor="ground"/, 'negative: scene GRAS must start at the pointer, not sit S on it')
assert.match(src, /object\.lightGain \?\? doc\.view\.lightGain/)
assert.match(src, /menuRetreatIntensity\(/)
assert.match(src, /intensity=\{lampIntensity\}/)
assert.doesNotMatch(src, /menuRetreatFocalDistance/, 'negative: Menu LCL dims lamp intensity, not focal Distance')
assert.doesNotMatch(
  src,
  /lightGain=\{doc\.view\.lightGain\}/,
  'negative: scene view gain must not force GRAS lamps on',
)
assert.match(src, /ViewpointFly/)
assert.match(src, /SceneMotionFly/)
assert.match(src, /from '\.\.\/\.\.\/lib\/webgl\/runtime\/controls\/SceneMotionFly'/)
assert.match(src, /AcmRig/)
assert.match(src, /posesFromWaypoints/)
assert.match(src, /waypoints=\{posesFromWaypoints/)
assert.match(src, /kind=\{motion\.kind\}/)
assert.match(src, /motion\.kind === 'journey'/)
assert.match(src, /journeyDuration/)
assert.doesNotMatch(
  src,
  /duration=\{motion\.duration \?\? BOOM_ARC_DURATION\}/,
  'negative: a journey must not inherit the 4 s boom clock',
)
assert.match(src, /hold=\{motion\.hold \?\? 0\}/)
assert.match(src, /slowMoAt=\{motion\.slowMoAt\}/)
assert.match(src, /impulseAt=\{motion\.impulseAt \?\? \(motion\.playOnLoad \? BOOM_ARC_IMPULSE_T : undefined\)\}/)
assert.match(src, /sceneOpeningPose/)
assert.match(src, /sceneLoadMotion/)
assert.doesNotMatch(
  src,
  /<CameraRig position=\{doc\.camera\.position\}/,
  'negative: load must not seat Home before the back-to-front crane',
)
assert.match(src, /sceneViewPose/)
assert.match(src, /showViews/)
assert.match(src, /SCENE_HOME_VIEW_ID/)
assert.match(src, /onPeak/)
assert.match(src, /impulseMarks/)
assert.match(src, /peakTicket/)
assert.match(src, /sceneImpulseMarks/)
assert.doesNotMatch(
  src,
  /peakTicket=\{1\}/,
  'negative: the cage impulse must wait for the crane peak, not fire on mount',
)
assert.match(src, /poseRef/)
assert.match(src, /orbitEnabled = true/)
assert.match(src, /const locked = peek\.lock/)
assert.match(src, /restPose=\{locked \? pose : undefined\}/)
assert.match(src, /enabled=\{!playing && !hopping && !returning && \(locked \|\| peek\.intensity > 0\)\}/)
assert.match(src, /const hopping = flyTicket > 0 && hopFinishedTicket !== flyTicket && !playing/)
assert.match(src, /setHopFinishedTicket\(flyTicket\)/)
assert.match(src, /onTrip=\{/)
assert.doesNotMatch(
  src,
  /enabled=\{!playing && !hopping && locked\}/,
  'negative: lock off must not kill ACM so a View hop snaps it back at 0.3',
)
assert.doesNotMatch(
  src,
  /setHopping\(true\)/,
  'negative: hopping must last the whole label hop, not a layout pulse',
)
assert.doesNotMatch(
  src,
  /setHopping\(active\)/,
  'negative: onTrip false from a new callback must not re-enable ACM mid-hop',
)
assert.match(src, /seatedView/)
assert.match(src, /sceneMotionBetween/)
assert.match(src, /reverse=\{motion\.reverse === true\}/)
assert.doesNotMatch(
  src,
  /onTrip=\{setHopping\}/,
  'negative: a View copy hop must remember the seated shot so the next Play can arc',
)
assert.doesNotMatch(
  src,
  /enabled=\{!playing && locked\}/,
  'negative: ACM must not keep peeking while a viewpoint hop is in flight',
)
assert.match(src, /enabled=\{!locked && orbitEnabled && !playing && !hopping\}/)
assert.match(
  src,
  /<SceneWorld\s+doc=\{doc\}\s+viewId=\{viewId\}\s+flyTicket=\{flyTicket\}\s+depart=\{depart\}\s+onDeparted=\{onDeparted\}\s+riseAtHome=\{riseAtHome\}\s+steer=\{steer\}\s+onSteerDone=\{onSteerDone\}\s+onSteerMove=\{onSteerMove\}\s+suppressLoad=\{suppressLoad\}\s+menuRetreat=\{menuRetreat\}\s+\/>/,
)
assert.doesNotMatch(
  src,
  /enabled=\{!locked && orbitEnabled && !playing\}/,
  'negative: free orbit must not fight a copy-role hop',
)
assert.match(src, /steeredMotion \|\| riseAtHome \|\| suppressLoad/)
assert.match(src, /<ViewpointFly\s+key=\{doc\.id\}/)
assert.doesNotMatch(
  src,
  /riseAtHome[\s\S]{0,80}SceneMotionFly/,
  'negative: a return must not replay the opening crane',
)
assert.match(src, /lockPageScroll=\{lockPageScroll\}/)
assert.doesNotMatch(src, /freeOrbit/, 'negative: lock lives on camera.acm.lock, not a second orbit flag')
assert.doesNotMatch(
  src,
  /enabled=\{orbitEnabled && !playing\}/,
  'negative: locked ACM must not re-enable free orbit after the crane',
)
assert.doesNotMatch(src, /<SceneWorld doc=\{doc\} poseRef/, 'negative: landing playback must not copy a live orbit')
assert.doesNotMatch(src, /<ReferencePointer/, 'negative: landing playback must not mount the workbench locator')
assert.doesNotMatch(src, /SeatCamera/, 'negative: scene Home must reuse ViewpointFly, not a one-shot seat')
assert.doesNotMatch(src, /WEBGL_ASSETS\[0\]/, 'negative: a scene player must not boot the asset picker list')
assert.doesNotMatch(src, /WebglAssetLoader/, 'negative: landing must not mount the inspect workbench')
assert.doesNotMatch(src, /setMarks/, 'negative: scene playback must not open the mark editor')
assert.doesNotMatch(src, /showViews = true/, 'negative: / must not show scene viewpoint pins')
assert.doesNotMatch(src, /WEBGL_ASSETS\[0\]/, 'negative: a scene player must not boot the asset picker list')
assert.doesNotMatch(src, /WebglAssetLoader/, 'negative: landing must not mount the inspect workbench')
assert.doesNotMatch(src, /setMarks/, 'negative: scene playback must not open the mark editor')

console.log('WebglScenePlayer: ok')
