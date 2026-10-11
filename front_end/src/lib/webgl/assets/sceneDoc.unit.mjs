/**
 * Baked scene JSON matches the scene registry and only uses registered assets.
 * Run: npx tsx front_end/src/lib/webgl/assets/sceneDoc.unit.mjs
 */
import assert from 'node:assert/strict'
import { getWebglAsset } from './assetManifest.ts'
import { lerpPose, lerpTriple, poseDistance } from '../runtime/controls/cameraJourney.ts'
import {
  bakedSceneDoc,
  bakedSceneIds,
  parseSceneDoc,
  parseSceneSession,
  sceneCatalogAligned,
  sceneCopyViews,
  sceneMotionBetween,
  sceneViewPose,
  sceneViewpointMarks,
  sceneInspectMarks,
  serializeSceneSession,
  DEFAULT_SCENE_LOOK,
  VIEWER_SCENE_LOOK,
  SCENE_HOME_VIEW_ID,
  SCENE_MOTION_KINDS,
  SCENE_LOOK_FOCUS_MAX,
  SCENE_LOOK_FOCAL_LENGTH_MAX,
  SCENE_SESSION_KIND,
  sceneLoadMotion,
  sceneOpeningPose,
} from './sceneDoc.ts'
import { WEBGL_SCENES } from './sceneManifest.ts'
import { bakedAnnotationDoc } from './assetDocs.ts'
import { homeViewPose, INSPECT_MIN_POLAR, poseForAnnotation } from './viewPose.ts'
import { lookNeedsComposer } from '../runtime/camera/cameraLook.ts'
import { referencePointerHome } from '../runtime/helpers/referencePointerLayout.ts'

assert.equal(sceneCatalogAligned(), true)

for (const scene of WEBGL_SCENES) {
  const doc = bakedSceneDoc(scene.id)
  assert.ok(!('error' in doc), `${scene.id} baked doc: ${'error' in doc ? doc.error : ''}`)
  if ('error' in doc) continue
  assert.equal(doc.id, scene.id)
  assert.equal(doc.label, scene.label)
  assert.ok(doc.objects.length >= 1)
  for (const object of doc.objects) {
    assert.ok(getWebglAsset(object.assetId), `${scene.id} object ${object.id} must name a registered asset`)
  }
  assert.ok(Array.isArray(doc.viewpoints))
  assert.ok(Array.isArray(doc.transitions))
  assert.ok(Array.isArray(doc.cameraMotions))
}

const landing = bakedSceneDoc('landing')
assert.ok(!('error' in landing))
if (!('error' in landing)) {
  assert.equal(landing.objects[0]?.assetId, 'the-creation-of-adam')
  const gras = landing.objects.find((object) => object.id === 'gras')
  assert.equal(gras?.assetId, 'gras-letters')
  assert.deepEqual(gras?.position, [
    -0.06910566132542367,
    0.32882994149494826,
    -0.020445913613065754,
  ])
  assert.deepEqual(gras?.rotation, [
    0.018640610082839588,
    -0.20466298634758742,
    0.09147313781843466,
  ])
  assert.deepEqual(gras?.scale, [0.1, 0.1, 0.1])
  assert.equal(gras?.lightGain, 0)
  assert.notDeepEqual(
    gras?.position,
    landing.objects[0]?.position,
    'negative: GRAS must start on the scene pointer, not Adam identity',
  )
  assert.notDeepEqual(gras?.scale, [0.05, 0.05, 0.05], 'negative: last scene size was still too small')
  assert.notEqual(gras?.lightGain, landing.view.lightGain, 'negative: scene view gain must not light the GRAS lamps')
  assert.equal(
    landing.objects.some((object) => object.assetId === 'about-us-letters'),
    false,
    'negative: About Us is a viewer asset, not a landing object',
  )
  assert.equal(
    landing.objects.some((object) => object.assetId === 'statue-of-liberty'),
    false,
    'negative: Liberty belongs on the About scene, not landing',
  )
  const pointer = landing.viewpoints.find((view) => view.id === 'scene-pointer')
  assert.equal(pointer?.label, 'Scene pointer')
  assert.deepEqual(pointer?.position, gras?.position)
  assert.deepEqual(pointer?.target, gras?.position)
  assert.notEqual(pointer?.id, SCENE_HOME_VIEW_ID, 'negative: the copied tag must not steal Home')
  assert.equal(sceneCopyViews(landing).length, 0, 'negative: landing has no text-canvas copy shots')
  assert.deepEqual(landing.camera.position, [-0.5054449693328621, 0.20935624209362158, -0.10912691270966193])
  assert.deepEqual(landing.camera.target, [0.07211756881207634, 0.3130456736689876, -0.00020925034262128808])
  assert.deepEqual(landing.camera.look, {
    focus: SCENE_LOOK_FOCUS_MAX,
    focalLength: SCENE_LOOK_FOCAL_LENGTH_MAX,
    focalDistance: 0,
    noise: 'off',
    grain: 0,
  })
  assert.equal(DEFAULT_SCENE_LOOK.focus, SCENE_LOOK_FOCUS_MAX)
  assert.equal(DEFAULT_SCENE_LOOK.focalLength, SCENE_LOOK_FOCAL_LENGTH_MAX)
  assert.equal(landing.camera.acm.intensity, 0.3)
  assert.equal(landing.camera.acm.lock, true)
  assert.equal(landing.transitions.length, 0)
  assert.equal(landing.cameraMotions.length, 1)
  const crane = landing.cameraMotions[0]
  assert.equal(crane?.id, 'back-to-front')
  assert.equal(crane?.kind, 'boom-arc')
  assert.equal(crane?.from, 'back-of-scene')
  assert.equal(crane?.to, SCENE_HOME_VIEW_ID)
  assert.equal(crane?.playOnLoad, true)
  assert.equal(crane?.duration, 4)
  assert.equal(crane?.hold, 0.5)
  assert.notEqual(crane?.duration, 5, 'negative: landing crane must not keep the slower 5 s')
  assert.notEqual(crane?.hold, 0.6, 'negative: landing hold must not keep the slower 0.6 s')
  assert.ok((crane?.hold ?? 0) > 0, 'negative: landing must pause before the crane')
  assert.equal(crane?.waypoints?.length, 5)
  assert.ok((crane?.waypoints?.[2]?.orbit.polar ?? 1) < 0.15, 'third still is nearly overhead')
  assert.equal(crane?.lift, undefined, 'negative: world-Y lift is not a motion field')
  assert.equal(sceneLoadMotion(landing)?.id, 'back-to-front')
  assert.deepEqual(sceneOpeningPose(landing).position, [0.46060052924629785, 0.006298760296870376, 0.06340836206686079])
  assert.notDeepEqual(
    sceneOpeningPose(landing).position,
    landing.camera.position,
    'negative: load must not seat Home before the crane',
  )
  assert.equal(landing.viewpoints[0]?.id, 'back-of-scene')
  const homePose = sceneViewPose(landing, SCENE_HOME_VIEW_ID)
  assert.deepEqual(homePose.position, landing.camera.position)
  const back = sceneViewPose(landing, 'back-of-scene')
  assert.deepEqual(back.position, [0.46060052924629785, 0.006298760296870376, 0.06340836206686079])
  assert.notDeepEqual(back.position, homePose.position, 'scene viewpoints must be scene camera shots, not a copy of Home')
  const marks = sceneViewpointMarks(landing)
  assert.equal(marks[0]?.id, SCENE_HOME_VIEW_ID)
  assert.ok(marks.some((mark) => mark.id === 'back-of-scene'))
  assert.ok(marks.some((mark) => mark.id === 'scene-pointer'), 'copied scene pointer must be a selectable tag')
  const finger = marks.find((mark) => mark.id === 'point-finger-tip')
  assert.equal(finger?.kind, 'point', 'Adam inspect tags stay kind point with normals')
  assert.ok(finger?.normal, 'Scene editor pins use the baked surface normal')
  assert.notDeepEqual(
    sceneViewPose(landing, 'point-finger-tip').position,
    homePose.position,
    'negative: inspect hops look along the normal, not from Home',
  )
  assert.deepEqual(sceneViewPose(landing, 'no-such-view').position, landing.camera.position)
}

const about = bakedSceneDoc('about')
assert.ok(!('error' in about))
if (!('error' in about)) {
  assert.equal(about.id, 'about')
  assert.equal(about.label, 'About')
  assert.equal(about.objects.length, 2)
  assert.equal(about.objects[0]?.id, 'liberty')
  assert.equal(about.objects[0]?.assetId, 'statue-of-liberty')
  assert.deepEqual(about.objects[0]?.position, [0, 0, 0])
  const aboutUs = about.objects.find((object) => object.id === 'about-us')
  assert.equal(aboutUs?.assetId, 'about-us-letters')
  assert.deepEqual(aboutUs?.position, [
    0.018141644917041178,
    0.9648613595731209,
    -0.10058973866037224,
  ])
  assert.deepEqual(aboutUs?.rotation, [
    0,
    0,
    -0.2944309410156071,
  ])
  const gras = landing.objects.find((object) => object.id === 'gras')
  assert.deepEqual(aboutUs?.scale, [0.2, 0.2, 0.2])
  assert.notDeepEqual(
    aboutUs?.position,
    [0.06451440300099343, 0.9762223714835028, -0.09931374244856644],
    'negative: About Us must not stay on the previous pointer',
  )
  assert.notDeepEqual(
    aboutUs?.scale,
    gras?.scale,
    'negative: last About Us size matched GRAS 0.1 and was too small',
  )
  assert.equal(aboutUs?.lightGain, 0)
  assert.notDeepEqual(
    aboutUs?.position,
    referencePointerHome(about.camera.target),
    'negative: About Us must sit on the copied pointer, not the default Home Ref spawn',
  )
  assert.notEqual(
    aboutUs?.rotation?.[2],
    gras?.rotation[2],
    'negative: About Us Z slant is the copied pointer, not the GRAS pointer',
  )
  assert.notDeepEqual(
    aboutUs?.position,
    about.objects[0]?.position,
    'negative: About Us must start on the scene pin, not Liberty identity',
  )
  assert.notDeepEqual(aboutUs?.scale, [1, 1, 1], 'negative: viewer-sized letters flood Liberty')
  const aboutPointer = about.viewpoints.find((view) => view.id === 'scene-pointer')
  assert.equal(aboutPointer?.label, 'Scene pointer')
  assert.deepEqual(aboutPointer?.position, aboutUs?.position)
  assert.deepEqual(aboutPointer?.target, aboutUs?.position)
  assert.notEqual(aboutPointer?.id, SCENE_HOME_VIEW_ID, 'negative: the copied tag must not steal Home')
  assert.equal(about.camera.homeFromAsset, undefined)
  const aboutHome = {
    position: [0.44316723966014343, 0.6005845711566575, -0.03607445487032376],
    target: [0.10067221762804619, 0.9549275591404651, 0.021738758203960394],
    orbit: {
      azimuth: 1.7380201105522828,
      polar: 2.366174158409453,
      radius: 0.49618964202815863,
    },
  }
  assert.deepEqual(about.camera.position, aboutHome.position)
  assert.deepEqual(about.camera.target, aboutHome.target)
  assert.deepEqual(about.camera.orbit, aboutHome.orbit)
  assert.deepEqual(sceneViewPose(about).position, aboutHome.position)
  assert.deepEqual(sceneViewPose(about).target, aboutHome.target)
  assert.notDeepEqual(
    sceneOpeningPose(about).position,
    aboutHome.position,
    'negative: opening seats the torch still, not Home',
  )
  const homePin = sceneViewpointMarks(about)[0]
  assert.deepEqual(homePin?.position, aboutHome.target)
  assert.deepEqual(homePin?.camera, aboutHome.position)
  assert.deepEqual(about.camera.look, DEFAULT_SCENE_LOOK)
  assert.equal(lookNeedsComposer(about.camera.look), true)
  const libertyDoc = bakedAnnotationDoc('statue-of-liberty')
  assert.ok(!('error' in libertyDoc), `liberty annotations: ${'error' in libertyDoc ? libertyDoc.error : ''}`)
  if (!('error' in libertyDoc)) {
    const libertyHome = homeViewPose(libertyDoc.annotations)
    assert.notDeepEqual(
      sceneViewPose(about).position,
      libertyHome.position,
      'negative: About Home is the copied scene session, not Liberty viewer Home',
    )
  }
  assert.equal(about.camera.acm.intensity, 0.3)
  assert.equal(about.camera.acm.lock, true)
  assert.notEqual(
    about.camera.acm.intensity,
    0,
    'negative: About ACM must peek like landing, not sit still',
  )
  assert.equal(about.cameraMotions.length, 3)
  const aboutCrane = about.cameraMotions.find((motion) => motion.id === 'back-to-front')
  assert.equal(aboutCrane?.id, 'back-to-front')
  assert.equal(aboutCrane?.from, 'flame-top')
  assert.equal(aboutCrane?.to, 'home')
  assert.equal(aboutCrane?.playOnLoad, true)
  assert.equal(aboutCrane?.duration, 4)
  assert.equal(aboutCrane?.hold, 0.7)
  assert.notEqual(aboutCrane?.duration, 5, 'negative: About crane must not keep the slower 5 s')
  assert.notEqual(aboutCrane?.hold, 0.9, 'negative: About hold must not keep the slower 0.9 s')
  assert.equal(aboutCrane?.slowMoAt, 0.72)
  assert.equal(aboutCrane?.impulseAt, 0)
  assert.notEqual(aboutCrane?.impulseAt, 0.36, 'negative: torch poke is the hold, not the Adam rise')
  assert.equal(aboutCrane?.waypoints?.length, 2)
  assert.equal(aboutCrane?.waypoints?.[1]?.orbit.azimuth, -2.3422751054280777)
  assert.notEqual(
    aboutCrane?.waypoints?.length,
    3,
    'negative: the near-Home still must not sit in front of Home',
  )
  assert.notDeepEqual(
    sceneOpeningPose(about).position,
    [0.08046821449837159, 1.5413308290692744, 0.2820545639670985],
    'negative: About must not keep the previous torch still',
  )
  assert.notEqual(aboutCrane?.slowMoAt, 0.5, 'negative: About linger is the fourth still, not landing mid-turn')
  assert.ok(sceneLoadMotion(about))
  const flameView = about.viewpoints.find((view) => view.id === 'flame-top')
  assert.deepEqual(sceneOpeningPose(about).position, flameView?.camera)
  assert.notDeepEqual(
    sceneOpeningPose(about).position,
    aboutHome.position,
    'negative: About must not open on Home before the crane',
  )
  const aboutMarks = sceneViewpointMarks(about)
  assert.equal(
    aboutMarks.some((mark) => mark.id === 'point-flame-top'),
    false,
    'negative: Flame top camera shot must not duplicate the inspect pin',
  )
  assert.ok(aboutMarks.some((mark) => mark.id === 'point-side-profile'), 'Liberty inspect tags still list')
  const copies = sceneCopyViews(about)
  assert.equal(copies.length, 2)
  assert.deepEqual(
    copies.map((view) => view.id),
    ['text-canvas', 'text-inset'],
  )
  assert.ok(copies.every((view) => view.role === 'copy'))
  assert.ok(copies.every((view) => view.id !== SCENE_HOME_VIEW_ID))
  assert.ok(copies.every((view) => view.id !== 'flame-top'))
  assert.notEqual(flameView?.role, 'copy', 'negative: Flame top is the crane opening, not a copy shot')
  assert.notEqual(aboutPointer?.role, 'copy', 'negative: the Scene pointer is not a text-canvas shot')
  const canvasPose = sceneViewPose(about, 'text-canvas')
  const insetPose = sceneViewPose(about, 'text-inset')
  const homePoseAbout = sceneViewPose(about)
  assert.deepEqual(canvasPose.position, [0.7167296519745572, 0.7868880096216994, -0.8694405139230431])
  assert.deepEqual(canvasPose.target, [0.7568047092651465, 1.0135431042301608, 0.24605962766185863])
  assert.deepEqual(canvasPose.orbit, {
    azimuth: -3.1056824567583514,
    polar: 1.7711285905151035,
    radius: 1.1389991694486659,
  })
  assert.deepEqual(insetPose.position, [0.5427667358550721, 0.14935737939606236, 0.3281765333534227])
  assert.deepEqual(insetPose.target, [0.5599142145328813, 0.4958234775036662, 0.18274284711028796])
  assert.deepEqual(insetPose.orbit, {
    azimuth: -0.11736396987739227,
    polar: 2.7416965416568555,
    radius: 0.3761432576255757,
  })
  assert.notDeepEqual(canvasPose.position, homePoseAbout.position, 'negative: Text canvas must not be Home')
  assert.notDeepEqual(insetPose.position, homePoseAbout.position, 'negative: Text inset must not be Home')
  assert.notDeepEqual(canvasPose.position, insetPose.position, 'negative: the two copy shots must stay independent')
  assert.notDeepEqual(canvasPose.position, flameView?.camera, 'negative: copy shots are not the torch opening')
  assert.ok(poseDistance(lerpPose(homePoseAbout, canvasPose, 1), canvasPose) < 1e-6)
  assert.ok(poseDistance(lerpPose(homePoseAbout, insetPose, 1), insetPose) < 1e-6)
  assert.ok(poseDistance(lerpPose(canvasPose, insetPose, 1), insetPose) < 1e-6)
  assert.ok(poseDistance(lerpPose(insetPose, canvasPose, 1), canvasPose) < 1e-6)
  const copyMid = lerpPose(canvasPose, insetPose, 0.5)
  const copyChord = lerpTriple(canvasPose.position, insetPose.position, 0.5)
  const copyChordGap = Math.hypot(
    copyMid.position[0] - copyChord[0],
    copyMid.position[1] - copyChord[1],
    copyMid.position[2] - copyChord[2],
  )
  assert.ok(copyChordGap > 0.05, 'negative: copy hops must not chord through the sculpture')
  const copyTargets = new Set(copies.map((view) => view.target.join(',')))
  for (const waypoint of aboutCrane?.waypoints ?? []) {
    assert.equal(
      copyTargets.has(waypoint.target.join(',')),
      false,
      'negative: copy shots must not be extra crane Path waypoints',
    )
  }
  assert.notEqual(aboutCrane?.from, 'text-canvas')
  assert.notEqual(aboutCrane?.from, 'text-inset')
  assert.notEqual(aboutCrane?.to, 'text-canvas')
  assert.notEqual(aboutCrane?.to, 'text-inset')
  const canvasToInset = sceneMotionBetween(about, 'text-canvas', 'text-inset')
  const insetToCanvas = sceneMotionBetween(about, 'text-inset', 'text-canvas')
  assert.equal(canvasToInset?.id, 'canvas-to-inset')
  assert.equal(insetToCanvas?.id, 'inset-to-canvas')
  assert.equal(canvasToInset?.duration, 3.2)
  assert.equal(insetToCanvas?.duration, 3.2)
  assert.notEqual(canvasToInset?.duration, 2, 'negative: the wider last leg must not keep the 2 s clock')
  assert.equal(insetToCanvas?.reverse, true)
  assert.equal(canvasToInset?.reverse, undefined)
  assert.equal(canvasToInset?.playOnLoad, undefined)
  assert.equal(canvasToInset?.waypoints?.length, 2)
  assert.equal(canvasToInset?.waypoints?.[1]?.orbit.azimuth, 2.087710989527672)
  assert.equal(canvasToInset?.waypoints?.[1]?.orbit.polar, 1.643416224442309)
  assert.deepEqual(insetToCanvas?.waypoints, canvasToInset?.waypoints)
  assert.equal(
    sceneMotionBetween(about, 'home', 'text-canvas'),
    undefined,
    'Home → Text canvas must ViewpointFly from the live camera, not a boom-arc',
  )
  assert.equal(
    sceneMotionBetween(about, 'home', 'text-inset'),
    undefined,
    'Home → Text inset must ViewpointFly from the live camera, not a boom-arc',
  )
  assert.equal(
    sceneMotionBetween(about, 'text-canvas', 'home'),
    undefined,
    'Text canvas → Home is already ViewpointFly — do not add a reverse boom-arc',
  )
  assert.equal(
    sceneMotionBetween(about, 'text-inset', 'home'),
    undefined,
    'Text inset → Home is already ViewpointFly — do not add a reverse boom-arc',
  )
  const emptyHomeHop = {
    ...about,
    cameraMotions: [
      {
        id: 'to-text-canvas',
        label: 'To Text canvas',
        kind: 'boom-arc',
        from: 'home',
        to: 'text-canvas',
        duration: 2.8,
      },
      ...about.cameraMotions,
    ],
  }
  assert.equal(
    sceneMotionBetween(emptyHomeHop, 'home', 'text-canvas'),
    undefined,
    'negative: a boom-arc with no Path stills must not steal the Home → copy hop',
  )
  assert.equal(
    about.cameraMotions.some((motion) => motion.id === 'to-text-canvas' || motion.id === 'to-text-inset'),
    false,
    'negative: empty Home → copy boom-arcs must stay out of the About bake',
  )
  assert.equal(
    sceneMotionBetween(about, 'flame-top', 'home')?.id,
    undefined,
    'negative: View hops must not replay the entrance crane',
  )
  assert.notEqual(canvasToInset?.id, aboutCrane?.id, 'negative: the copy arch is not the torch crane')
  assert.equal(
    about.objects.some((object) => object.assetId === 'about-us-letters'),
    true,
  )
  assert.notEqual(about.objects[0]?.assetId, 'the-creation-of-adam', 'negative: About is Liberty, not Adam')
}

const projects = bakedSceneDoc('projects')
assert.ok(!('error' in projects))
if (!('error' in projects)) {
  assert.equal(projects.id, 'projects')
  assert.equal(projects.label, 'Projects')
  assert.equal(projects.objects[0]?.id, 'owl')
  assert.equal(projects.objects[0]?.assetId, 'statue-of-an-owl')
  assert.deepEqual(projects.objects[0]?.position, [0, 0, 0])
  const letters = projects.objects.find((object) => object.id === 'projects')
  assert.equal(letters?.assetId, 'projects-letters')
  assert.deepEqual(letters?.position, [
    -0.3822649780837591,
    0.6675512542074619,
    0.12646046741447522,
  ])
  assert.deepEqual(letters?.rotation, [
    0.1449574479411339,
    -0.004861937698491539,
    1.5375035708789702,
  ])
  assert.deepEqual(letters?.scale, [0.4, 0.4, 0.4])
  assert.equal(letters?.lightGain, 0)
  assert.notDeepEqual(letters?.position, [0, 0, 0], 'negative: Projects letters must not sit at owl identity')
  assert.notDeepEqual(
    letters?.position,
    [-0.47922544227606373, 0.7253724047744099, 0.1344248620464713],
    'negative: the previous Object pose is stale',
  )
  assert.notDeepEqual(letters?.scale, [0.2, 0.2, 0.2], 'negative: Projects is double the copied 0.2 scale')
  assert.notDeepEqual(letters?.scale, [1, 1, 1], 'negative: viewer-sized letters flood the owl')
  const projectsPin = projects.viewpoints.find((view) => view.id === 'scene-pointer')
  assert.deepEqual(projectsPin?.position, letters?.position)
  assert.equal(
    projects.viewpoints.some((view) => view.id === 'owl-back' || view.id === 'owl-wing-tip'),
    false,
    'negative: owl inspect tags must not be faked as Home-camera viewpoints',
  )
  const owlInspect = sceneInspectMarks(projects)
  const owlBack = owlInspect.find((mark) => mark.id === 'point-owl-back')
  const owlWing = owlInspect.find((mark) => mark.id === 'point-owl-wing-tip')
  assert.equal(owlBack?.kind, 'point')
  assert.equal(owlWing?.kind, 'point')
  assert.equal(owlBack?.label, 'owl back')
  assert.equal(owlWing?.label, 'owl wing tip')
  assert.ok(owlBack?.normal, 'owl back keeps the baked surface normal')
  assert.ok(owlWing?.normal, 'owl wing tip keeps the baked surface normal')
  assert.deepEqual(owlBack?.position, [-0.14357058721848387, 1.2581720471783737, -0.13917638568678203])
  assert.deepEqual(owlWing?.position, [0.2848335277682722, 1.1836090710599918, 0.04105958945399113])
  const wingHop = sceneViewPose(projects, 'point-owl-wing-tip')
  const backHop = sceneViewPose(projects, 'point-owl-back')
  assert.deepEqual(wingHop, poseForAnnotation(owlWing ?? {}))
  assert.deepEqual(backHop, poseForAnnotation(owlBack ?? {}))
  assert.notDeepEqual(
    wingHop.position,
    sceneViewPose(projects).position,
    'negative: wing hop must not reuse Home’s camera',
  )
  const projectMarks = sceneViewpointMarks(projects)
  assert.ok(projectMarks.some((mark) => mark.id === 'point-owl-back'), 'owl back must be a clickable Scene editor tag')
  assert.ok(
    projectMarks.some((mark) => mark.id === 'point-owl-wing-tip'),
    'owl wing tip must be a clickable Scene editor tag',
  )
  assert.equal(
    projectMarks.find((mark) => mark.id === 'point-owl-wing-tip')?.kind,
    'point',
  )
  assert.notEqual(owlBack?.id, 'scene-pointer', 'negative: owl tags are not the Projects letters pin')
  assert.equal(projects.camera.homeFromAsset, 'statue-of-an-owl')
  const owlDoc = bakedAnnotationDoc('statue-of-an-owl')
  assert.ok(!('error' in owlDoc))
  if (!('error' in owlDoc)) {
    const owlHome = homeViewPose(owlDoc.annotations)
    assert.deepEqual(sceneViewPose(projects).position, owlHome.position)
    assert.deepEqual(sceneViewPose(projects).target, owlHome.target)
  }
  const projectsCrane = projects.cameraMotions[0]
  assert.equal(projectsCrane?.id, 'back-to-front')
  assert.equal(projectsCrane?.kind, 'boom-arc')
  assert.equal(projectsCrane?.from, 'entrance-start')
  assert.equal(projectsCrane?.to, SCENE_HOME_VIEW_ID)
  assert.equal(projectsCrane?.playOnLoad, true)
  assert.equal(projectsCrane?.duration, 3.2)
  assert.equal(projectsCrane?.hold, 0.4)
  assert.equal(projectsCrane?.slowMoAt, 0.5)
  assert.equal(projectsCrane?.impulseAt, 0.5)
  assert.notEqual(projectsCrane?.duration, 4, 'negative: Projects crane must not keep the previous 4 s')
  assert.notEqual(projectsCrane?.hold, 0.5, 'negative: Projects hold must not keep the previous 0.5 s')
  assert.equal(projectsCrane?.waypoints?.length, 2)
  assert.equal(projectsCrane?.waypoints?.[1]?.orbit.azimuth, 1.6663534567880078)
  assert.equal(projects.cameraMotions.length, 1)
  assert.equal(
    projects.cameraMotions.some((motion) => motion.id === 'canvas-to-inset' || motion.id === 'inset-to-canvas'),
    false,
    'negative: do not invent canvas↔inset when only a text-canvas session was given',
  )
  const projectCopies = sceneCopyViews(projects)
  assert.equal(projectCopies.length, 1)
  assert.equal(projectCopies[0]?.id, 'text-canvas')
  assert.equal(projectCopies[0]?.role, 'copy')
  assert.equal(
    projects.viewpoints.some((view) => view.id === 'text-inset'),
    false,
    'negative: do not invent Text inset without coordinates',
  )
  const canvasPose = sceneViewPose(projects, 'text-canvas')
  assert.deepEqual(canvasPose.position, [0.9448127627834094, 0.35000190304965967, 1.7060992433488098])
  assert.deepEqual(canvasPose.target, [-0.6954732019277611, 0.7975827511665435, 1.0935596192204107])
  assert.deepEqual(canvasPose.orbit, {
    azimuth: 1.2133987191216105,
    polar: 1.8210622310457314,
    radius: 1.8072275597602105,
  })
  assert.notDeepEqual(
    canvasPose.position,
    sceneViewPose(projects).position,
    'negative: Text canvas must not be Home',
  )
  assert.notDeepEqual(
    canvasPose.position,
    [-0.6290064823287489, 1.9877099976307737, -0.8422816535981716],
    'negative: Text canvas is the copied session, not the entrance Path',
  )
  assert.equal(
    sceneMotionBetween(projects, 'home', 'text-canvas'),
    undefined,
    'Home → Text canvas must ViewpointFly from the live camera, not a boom-arc',
  )
  assert.equal(sceneMotionBetween(projects, 'text-canvas', 'home'), undefined)
  assert.notEqual(projects.viewpoints.find((view) => view.id === 'entrance-start')?.role, 'copy')
  assert.notEqual(projectsPin?.role, 'copy', 'negative: the Scene pointer is not a text-canvas shot')
  assert.notEqual(
    projectsCrane?.waypoints?.length,
    3,
    'negative: Home must not sit in the Path as a third waypoint',
  )
  assert.equal(sceneLoadMotion(projects)?.id, 'back-to-front')
  const entrance = projects.viewpoints.find((view) => view.id === 'entrance-start')
  assert.deepEqual(sceneOpeningPose(projects).position, entrance?.camera)
  assert.notDeepEqual(
    sceneOpeningPose(projects).position,
    sceneViewPose(projects).position,
    'negative: load must not seat Home before the crane',
  )
  assert.equal(
    landing.objects.some((object) => object.assetId === 'statue-of-an-owl'),
    false,
    'negative: the owl is a Projects sculpture, not a landing object',
  )
  assert.equal(
    about.objects.some((object) => object.assetId === 'projects-letters'),
    false,
    'negative: Projects letters stay off the About scene',
  )
}

const footer = bakedSceneDoc('footer')
assert.ok(!('error' in footer))
if (!('error' in footer)) {
  assert.equal(footer.id, 'footer')
  assert.equal(footer.label, 'Footer')
  assert.equal(footer.objects.length, 1)
  assert.equal(footer.objects[0]?.id, 'lantern')
  assert.equal(footer.objects[0]?.assetId, 'stone-lantern')
  assert.deepEqual(footer.objects[0]?.position, [0, 0, 0])
  assert.deepEqual(footer.objects[0]?.scale, [1, 1, 1])
  assert.equal(
    footer.objects.some((object) => object.assetId === 'statue-of-an-owl'),
    false,
    'negative: the owl stays on Projects, not the Footer scene',
  )
  assert.equal(
    footer.viewpoints.some((view) => view.id === 'text-canvas' || view.id === 'text-inset'),
    false,
    'negative: do not invent copy-role shots on the Footer scene',
  )
  assert.equal(
    footer.viewpoints.some((view) => view.id === 'scene-pointer'),
    false,
    'negative: do not invent a scene-pointer viewpoint on the Footer scene',
  )
  const topView = footer.viewpoints.find((view) => view.id === 'entrance-start')
  assert.equal(topView?.label, 'Top')
  assert.deepEqual(topView?.position, [-0.005590911492065141, 1.3988513618834952, 0.0023428747137600936])
  assert.deepEqual(topView?.camera, [-0.30575304088497085, 2.1749769611489573, 0.17563958629001586])
  assert.ok(
    (topView?.orbit?.polar ?? 0) >= INSPECT_MIN_POLAR,
    'Top polar must stay off the up axis so View cannot lookAt-lock',
  )
  assert.notDeepEqual(
    topView?.camera,
    [-0.14370417947765124, 2.23375641347606, 0.08208169857991938],
    'negative: Top must not keep the zenith look-along-normal camera',
  )
  assert.notDeepEqual(
    topView?.camera,
    footer.camera.position,
    'negative: Top must not reuse Home’s camera',
  )
  assert.equal(
    sceneMotionBetween(footer, 'home', 'entrance-start'),
    undefined,
    'Home → Top must ViewpointFly, not replay a crane',
  )
  assert.equal(
    sceneMotionBetween(footer, 'entrance-start', 'home'),
    undefined,
    'negative: View hops must not replay the Footer entrance crane',
  )
  const footerInspect = sceneInspectMarks(footer)
  assert.equal(
    footerInspect.some((mark) => mark.id === 'point-lantern-top'),
    false,
    'negative: Top inspect must not double-pin when the entrance still reuses that label',
  )
  const lanternDoc = bakedAnnotationDoc('stone-lantern')
  assert.ok(!('error' in lanternDoc))
  if (!('error' in lanternDoc)) {
    const topMark = lanternDoc.annotations.find((mark) => mark.id === 'point-lantern-top')
    assert.equal(topMark?.impulse, true)
    assert.deepEqual(sceneViewPose(footer, 'entrance-start').position, poseForAnnotation(topMark ?? {}).position)
    const lanternHome = homeViewPose(lanternDoc.annotations)
    assert.notDeepEqual(
      sceneViewPose(footer).position,
      lanternHome.position,
      'negative: Footer Home is the copied session, not the lantern asset home',
    )
  }
  assert.equal(footer.camera.homeFromAsset, undefined)
  assert.deepEqual(sceneViewPose(footer).position, [
    1.5316877049712345, 1.1430109414187022, 0.6665590050320024,
  ])
  assert.deepEqual(sceneViewPose(footer).target, [
    0.43490187769045136, 0.9353338880661404, -0.7525480659087648,
  ])
  assert.deepEqual(sceneViewPose(footer).orbit, {
    azimuth: 0.6579782057064556,
    polar: 1.4555183246789034,
    radius: 1.8055286727735116,
  })
  const footerCrane = footer.cameraMotions[0]
  assert.equal(footerCrane?.id, 'top-to-home')
  assert.equal(footerCrane?.label, 'Top to Home')
  assert.notEqual(footerCrane?.id, 'back-to-front', 'negative: Top → Home is not Back to front')
  assert.equal(footerCrane?.kind, 'journey')
  assert.notEqual(footerCrane?.kind, 'boom-arc', 'negative: Footer Top → Home is a straight hop, not a boom-arc')
  assert.equal(footerCrane?.from, 'entrance-start')
  assert.equal(footerCrane?.to, SCENE_HOME_VIEW_ID)
  assert.equal(footerCrane?.playOnLoad, true)
  assert.equal(footerCrane?.duration, 4)
  assert.notEqual(footerCrane?.duration, undefined, 'negative: the hop must not keep the 1.5 s journey cap')
  assert.equal(footerCrane?.hold, 0.4)
  assert.equal(footerCrane?.slowMoAt, undefined)
  assert.notEqual(footerCrane?.hold, undefined, 'negative: the lamp top must pause before the hop')
  assert.equal(footerCrane?.impulseAt, 0)
  assert.equal(footerCrane?.waypoints?.length ?? 0, 0)
  assert.notEqual(footerCrane?.slowMoAt, 0.1, 'negative: an early linger is repaid as a rush')
  assert.notEqual(footerCrane?.slowMoAt, 0.5, 'negative: Footer must not linger mid-shot')
  assert.notEqual(footerCrane?.duration, 3.2, 'negative: Footer must not keep the slow boom-arc clock')
  assert.equal(footer.cameraMotions.length, 1)
  assert.equal(sceneLoadMotion(footer)?.id, 'top-to-home')
  assert.deepEqual(sceneOpeningPose(footer).position, topView?.camera)
  assert.notDeepEqual(
    sceneOpeningPose(footer).position,
    sceneViewPose(footer).position,
    'negative: load must not seat Home before the crane',
  )
}

const shiftedOwl = parseSceneDoc({
  id: 'projects-shift',
  label: 'Shift',
  objects: [{ id: 'owl', assetId: 'statue-of-an-owl', position: [1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: {
    homeFromAsset: 'statue-of-an-owl',
    position: [9, 9, 9],
    target: [0, 0, 0],
    look: { ...VIEWER_SCENE_LOOK },
  },
})
assert.ok(!('error' in shiftedOwl), `shifted owl should parse, got ${'error' in shiftedOwl ? shiftedOwl.error : ''}`)
if (!('error' in shiftedOwl)) {
  const localWing = bakedAnnotationDoc('statue-of-an-owl')
  const worldWing = sceneInspectMarks(shiftedOwl).find((mark) => mark.id === 'point-owl-wing-tip')
  assert.ok(!('error' in localWing))
  if (!('error' in localWing)) {
    const bakedWing = localWing.annotations.find((mark) => mark.id === 'point-owl-wing-tip')
    assert.ok(worldWing)
    assert.ok(bakedWing)
    assert.equal(worldWing?.position[0], (bakedWing?.position[0] ?? 0) + 1)
    assert.equal(worldWing?.position[1], bakedWing?.position[1])
    assert.notDeepEqual(
      worldWing?.position,
      bakedWing?.position,
      'negative: a moved sculpture must not keep asset-local pins',
    )
  }
}

const aliasHome = parseSceneDoc({
  id: 'about-alias',
  label: 'Alias',
  objects: [{ id: 'liberty', assetId: 'statue-of-liberty', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: {
    homeFromAsset: 'statue-of-liberty',
    position: [9, 9, 9],
    target: [0, 0, 0],
    look: { ...VIEWER_SCENE_LOOK },
  },
})
assert.ok(!('error' in aliasHome), `alias Home should parse, got ${'error' in aliasHome ? aliasHome.error : ''}`)
if (!('error' in aliasHome)) {
  const libertyDoc = bakedAnnotationDoc('statue-of-liberty')
  assert.ok(!('error' in libertyDoc))
  if (!('error' in libertyDoc)) {
    const libertyHome = homeViewPose(libertyDoc.annotations)
    assert.deepEqual(sceneViewPose(aliasHome).position, libertyHome.position)
    assert.notDeepEqual(
      sceneViewPose(aliasHome).position,
      [9, 9, 9],
      'negative: stored xyz must not win over Liberty viewer Home',
    )
  }
}

const missingHomeAsset = parseSceneDoc({
  id: 'home-missing',
  label: 'Missing Home',
  objects: [{ id: 'box', assetId: 'builtin-box', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: {
    homeFromAsset: 'builtin-box',
    position: [1, 1, 1],
    target: [0, 0, 0],
  },
})
assert.ok('error' in missingHomeAsset, 'negative: homeFromAsset needs a baked viewpoint-home')
assert.match('error' in missingHomeAsset ? missingHomeAsset.error : '', /viewpoint-home/)

assert.equal(lookNeedsComposer(DEFAULT_SCENE_LOOK), true)
assert.equal(lookNeedsComposer(VIEWER_SCENE_LOOK), false)

assert.deepEqual(
  [...bakedSceneIds()].sort(),
  [...WEBGL_SCENES.map((scene) => scene.id)].sort(),
)

const missing = bakedSceneDoc('no-such-scene')
assert.ok('error' in missing, 'negative: unknown scene must fail')
assert.match(missing.error, /no baked scene/)

const orphan = parseSceneDoc({
  id: 'orphan',
  label: 'Orphan',
  objects: [{ id: 'ghost', assetId: 'not-a-registered-asset' }],
  camera: { position: [0, 1, 2], target: [0, 0, 0] },
})
assert.ok('error' in orphan, 'negative: a scene must not name an unknown asset')
assert.match('error' in orphan ? orphan.error : '', /unknown asset/)

const homeId = parseSceneDoc({
  id: 'home-clash',
  label: 'Home clash',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: { position: [0, 1, 2], target: [0, 0, 0] },
  viewpoints: [{ id: 'home', label: 'Home', position: [0, 0, 0], camera: [0, 1, 2], target: [0, 0, 0] }],
})
assert.ok('error' in homeId, 'negative: a viewpoint must not steal the Home id')
assert.match('error' in homeId ? homeId.error : '', /Home id/)

const badRole = parseSceneDoc({
  id: 'role-bad',
  label: 'Role',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: { position: [0, 1, 2], target: [0, 0, 0] },
  viewpoints: [
    {
      id: 'crane-shot',
      label: 'Crane',
      role: 'crane',
      position: [0, 0, 0],
      camera: [0, 1, 2],
      target: [0, 0, 0],
    },
  ],
})
assert.ok('error' in badRole, 'negative: viewpoint role must be copy')
assert.match('error' in badRole ? badRole.error : '', /role must be copy/)

const badReverse = parseSceneDoc({
  id: 'reverse-bad',
  label: 'Reverse',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: { position: [0, 1, 2], target: [0, 0, 0] },
  viewpoints: [{ id: 'side', label: 'Side', position: [0, 0, 0], camera: [1, 1, 1], target: [0, 0, 0] }],
  cameraMotions: [
    { id: 'hop', label: 'Hop', kind: 'boom-arc', from: 'home', to: 'side', reverse: 'yes' },
  ],
})
assert.ok('error' in badReverse, 'negative: reverse must be a boolean')
assert.match('error' in badReverse ? badReverse.error : '', /reverse must be a boolean/)

const badNoise = parseSceneDoc({
  id: 'noise-bad',
  label: 'Noise',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: { position: [0, 1, 2], target: [0, 0, 0], look: { noise: 'perlin' } },
})
assert.ok('error' in badNoise, 'negative: unknown noise kind must fail')
assert.match('error' in badNoise ? badNoise.error : '', /noise/)

const withLook = parseSceneDoc({
  id: 'look',
  label: 'Look',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: {
    position: [0, 1, 2],
    target: [0, 0, 0],
    look: { focus: 0.4, focalLength: 85, focalDistance: 0.6, noise: 'simplex', grain: 0.12 },
  },
})
assert.ok(!('error' in withLook))
if (!('error' in withLook)) {
  assert.equal(withLook.camera.look.noise, 'simplex')
  assert.equal(withLook.camera.look.focus, 0.4)
  assert.equal(withLook.camera.acm.intensity, 0, 'negative: missing ACM is still')
  assert.equal(withLook.camera.acm.lock, false, 'negative: missing ACM lock is off')
}

const badAcm = parseSceneDoc({
  id: 'acm-bad',
  label: 'ACM',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: { position: [0, 1, 2], target: [0, 0, 0], acm: 1 },
})
assert.ok('error' in badAcm, 'negative: ACM intensity is not a bare number')
assert.match('error' in badAcm ? badAcm.error : '', /camera\.acm must be an object/)

const badLock = parseSceneDoc({
  id: 'acm-lock-bad',
  label: 'ACM',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: { position: [0, 1, 2], target: [0, 0, 0], acm: { intensity: 0.05, lock: 1 } },
})
assert.ok('error' in badLock, 'negative: camera.acm.lock must be a boolean')

const session = serializeSceneSession({
  kind: SCENE_SESSION_KIND,
  sceneId: 'landing',
  camera: {
    position: [1, 2, 3],
    target: [0, 0.5, 0],
    orbit: { azimuth: 0.2, polar: 1.1, radius: 2.4 },
  },
  look: { ...DEFAULT_SCENE_LOOK },
})
assert.match(session, /"kind": "webgl-scene-session"/)
assert.match(session, /"position": \[\s*1,\s*2,\s*3\s*\]/)
const parsedSession = parseSceneSession(JSON.parse(session))
assert.ok(!('error' in parsedSession))
if (!('error' in parsedSession)) {
  assert.deepEqual(parsedSession.camera.position, [1, 2, 3])
  assert.deepEqual(parsedSession.camera.target, [0, 0.5, 0])
  assert.equal(parsedSession.acm.intensity, 0, 'sessions without ACM stay still')
}
const lookOnly = parseSceneSession({ sceneId: 'landing', look: { ...DEFAULT_SCENE_LOOK } })
assert.ok('error' in lookOnly, 'negative: look sliders without a live camera are not a scene session')
assert.match('error' in lookOnly ? lookOnly.error : '', /kind must be webgl-scene-session/)

const badFrom = parseSceneDoc({
  id: 'motion-bad',
  label: 'Motion',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: { position: [0, 1, 2], target: [0, 0, 0] },
  cameraMotions: [{ id: 'spin', label: 'Spin', kind: 'boom-arc', from: 'missing', to: 'home' }],
})
assert.ok('error' in badFrom, 'negative: a motion must name a real viewpoint')
assert.match('error' in badFrom ? badFrom.error : '', /from must be Home/)

const lerpKind = parseSceneDoc({
  id: 'lerp-kind',
  label: 'Lerp',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: { position: [0, 1, 2], target: [0, 0, 0] },
  cameraMotions: [{ id: 'hop', label: 'Hop', kind: 'orbit-lerp', from: 'home', to: 'home' }],
})
assert.ok('error' in lerpKind, 'negative: orbit-lerp is not a scene camera motion kind')
assert.match('error' in lerpKind ? lerpKind.error : '', /boom-arc or journey/)

assert.deepEqual([...SCENE_MOTION_KINDS], ['boom-arc', 'journey'])

const badWaypoint = parseSceneDoc({
  id: 'bad-waypoint',
  label: 'Bad waypoint',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: { position: [0, 1, 2], target: [0, 0, 0] },
  viewpoints: [
    {
      id: 'back',
      label: 'Back',
      position: [0, 0, 0],
      camera: [1, 0, 0],
      target: [0, 0, 0],
    },
  ],
  cameraMotions: [
    {
      id: 'arc',
      label: 'Arc',
      kind: 'boom-arc',
      from: 'back',
      to: 'home',
      waypoints: [{ target: [0, 0, 0] }],
    },
  ],
})
assert.ok('error' in badWaypoint, 'negative: a still without orbit is not a crane key')
assert.match('error' in badWaypoint ? badWaypoint.error : '', /waypoints\[0\]\.orbit/)

const badHold = parseSceneDoc({
  id: 'bad-hold',
  label: 'Bad hold',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: { position: [0, 1, 2], target: [0, 0, 0] },
  viewpoints: [
    { id: 'back', label: 'Back', position: [0, 0, 0], camera: [1, 0, 0], target: [0, 0, 0] },
  ],
  cameraMotions: [{ id: 'arc', label: 'Arc', kind: 'boom-arc', from: 'back', to: 'home', hold: -1 }],
})
assert.ok('error' in badHold, 'negative: a hold cannot run backward')
assert.match('error' in badHold ? badHold.error : '', /hold must be >= 0/)

const badSlow = parseSceneDoc({
  id: 'bad-slow',
  label: 'Bad slow',
  objects: [{ id: 'adam', assetId: 'the-creation-of-adam', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  camera: { position: [0, 1, 2], target: [0, 0, 0] },
  viewpoints: [
    { id: 'back', label: 'Back', position: [0, 0, 0], camera: [1, 0, 0], target: [0, 0, 0] },
  ],
  cameraMotions: [{ id: 'arc', label: 'Arc', kind: 'boom-arc', from: 'back', to: 'home', slowMoAt: 1.5 }],
})
assert.ok('error' in badSlow, 'negative: linger must sit inside the shot')
assert.match('error' in badSlow ? badSlow.error : '', /slowMoAt must be between 0 and 1/)

const brightGras = parseSceneDoc({
  id: 'bright',
  label: 'Bright',
  objects: [
    {
      id: 'gras',
      assetId: 'gras-letters',
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [0.25, 0.25, 0.25],
      lightGain: -1,
    },
  ],
  camera: { position: [0, 1, 2], target: [0, 0, 0] },
})
assert.ok('error' in brightGras, 'negative: object lightGain below 0 must fail')
assert.match('error' in brightGras ? brightGras.error : '', /lightGain/)

console.log('sceneDoc: ok')
