/**
 * Scene object-color dim: subtract RGB, never lamp gain.
 * Run: npx tsx front_end/src/lib/webgl/runtime/materials/sceneObjectColor.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  dimHexRgb,
  formatHexRgb,
  parseHexRgb,
  incomingIntroT,
  introColorMix,
  introTForScene,
  scaleHexRgb,
  sceneClockWaiting,
  sceneFlyRate,
  sceneTone,
  craneClock,
  ageAtProgress,
  steerColorMix,
  steerReverseDone,
  steeredIntroAtDone,
  sceneUsesViewpointFly,
  visibleSceneTone,
  SCENE_DEPART_S,
  SCENE_OBJECT_COLOR_DIM,
  SCENE_OBJECT_COLOR_DIM_DURATION,
} from './sceneObjectColor.ts'

assert.equal(SCENE_OBJECT_COLOR_DIM, 160)
assert.ok(SCENE_OBJECT_COLOR_DIM_DURATION > 0.5 && SCENE_OBJECT_COLOR_DIM_DURATION < 0.8)
assert.deepEqual(parseHexRgb('#f2c48a'), { r: 242, g: 196, b: 138 })
assert.equal(formatHexRgb({ r: 122, g: 76, b: 18 }), '#7a4c12')
assert.equal(dimHexRgb('#f2c48a'), '#522400')
assert.notEqual(dimHexRgb('#f2c48a'), '#663800', 'negative: 140 per channel is still too bright')
assert.equal(dimHexRgb('#000000'), '#000000', 'negative: black cannot go below zero')
assert.equal(dimHexRgb('nope'), 'nope', 'negative: invalid hex is left alone')
assert.notEqual(dimHexRgb('#f2c48a'), '#f2c48a', 'negative: hover must actually darken the object color')
assert.equal(scaleHexRgb('#f2c48a', 0), '#000000')
assert.equal(scaleHexRgb('#f2c48a', 1), '#f2c48a')
assert.equal(scaleHexRgb('#ffffff', 0.5), '#808080')
assert.notEqual(scaleHexRgb('#f2c48a', 0), '#f2c48a', 'negative: intro must start from black')
assert.equal(introColorMix(0, 0.5, 2), 0)
assert.equal(introColorMix(2.5, 0.5, 2), 1)
assert.equal(introColorMix(1.25, 0.5, 2), 0.5)
assert.notEqual(introColorMix(0, 0.5, 2), 1, 'negative: the intro must not open at full color')
assert.equal(sceneTone(0, 1), 0)
assert.equal(sceneTone(1, 0), 0)
assert.equal(sceneTone(1, 1), 1)
assert.equal(sceneTone(0.5, 1), 0.5)
assert.notEqual(sceneTone(1, 0), 1, 'negative: a depart must reach black')
assert.equal(visibleSceneTone(1, 0, true), 0)
assert.equal(visibleSceneTone(1, 0, false), 1)
assert.equal(visibleSceneTone(0, 1, false), 0)
assert.notEqual(visibleSceneTone(1, 0, false), 0, 'negative: a finished fade must not leave the next scene black')
assert.equal(ageAtProgress(0, 0.5, 2), 0)
assert.equal(ageAtProgress(1, 0.5, 2), 2.5)
assert.deepEqual(craneClock(0, 0, 2), { mix: 0, t: 0 })
assert.deepEqual(craneClock(1, 0, 2), { mix: 0.5, t: 0.5 })
assert.deepEqual(craneClock(2, 0, 2), { mix: 1, t: 1 })
assert.equal(craneClock(0.4, 0.5, 2).t, 0, 'the camera stays on the opening pose through the hold')
assert.ok(craneClock(1.5, 0.5, 2).t > 0, 'negative: after the hold the crane must be moving')
const parked = craneClock(0.7, 0.7, 4)
assert.equal(parked.t, 0)
assert.ok(parked.mix > 0)
assert.equal(steerColorMix(parked, -1), 0)
assert.equal(steerReverseDone(parked, -1), true)
assert.equal(steerReverseDone(craneClock(2.7, 0.7, 4), -1), false)
assert.equal(steerColorMix(parked, 1), parked.mix)
assert.equal(steerReverseDone(parked, 1), false, 'negative: playing forward must not finish during the opening hold')
assert.notEqual(steerColorMix(parked, -1), parked.mix, 'negative: a reverse must not keep the hold brightness after the camera has arrived')
assert.equal(incomingIntroT({ riseAtHome: true, tint: false, hasLoadMotion: false }), 0)
assert.equal(incomingIntroT({ riseAtHome: false, tint: true, hasLoadMotion: false }), 0)
assert.equal(incomingIntroT({ riseAtHome: false, tint: false, hasLoadMotion: true }), 0)
assert.equal(incomingIntroT({ riseAtHome: false, tint: false, hasLoadMotion: false }), 1)
assert.equal(introTForScene('about', 0.4, 'about', 0), 0.4)
assert.equal(introTForScene('landing', 1, 'about', 0), 0)
assert.notEqual(
  introTForScene('landing', 1, 'about', 0),
  1,
  'negative: leftover landing rise must not paint About',
)
assert.equal(sceneClockWaiting(true, 'landing', 'about'), true)
assert.equal(sceneClockWaiting(true, 'about', 'about'), false)
assert.equal(sceneClockWaiting(false, 'landing', 'about'), false, 'negative: no motion does not wait on assets')
assert.equal(sceneFlyRate(true, 1), 0)
assert.equal(sceneFlyRate(false, 1), 1)
assert.equal(sceneFlyRate(false, undefined), undefined)
assert.notEqual(
  sceneFlyRate(true, 1),
  1,
  'negative: the first About load must not ramp light before Liberty exists',
)
assert.equal(steeredIntroAtDone(-1, true), 0)
assert.equal(steeredIntroAtDone(-1, false), 1)
assert.equal(steeredIntroAtDone(-1), 1)
assert.equal(steeredIntroAtDone(1, true), 1)
assert.equal(steeredIntroAtDone(undefined), 1)
assert.notEqual(
  steeredIntroAtDone(-1, false),
  0,
  'negative: Text inset back to Text canvas must not black the About scene',
)
assert.notEqual(steeredIntroAtDone(-1, true), 1, 'negative: reverse of a tinted entrance still settles at black')
assert.equal(sceneUsesViewpointFly(true, false, true), false)
assert.equal(sceneUsesViewpointFly(false, true, true), false)
assert.equal(sceneUsesViewpointFly(false, false, false), true)
assert.notEqual(
  sceneUsesViewpointFly(true, false, true),
  true,
  'negative: a first About load must not snap Home before the torch crane',
)
assert.ok(SCENE_DEPART_S >= 0.4 && SCENE_DEPART_S <= 1.2)

const lights = fs.readFileSync(fileURLToPath(new URL('./WireCageLights.tsx', import.meta.url)), 'utf8')
assert.match(lights, /dim \? dimHexRgb\(color\) : color/)
assert.match(lights, /SCENE_OBJECT_COLOR_DIM_DURATION/)
assert.match(lights, /setWireLightColor/)
assert.doesNotMatch(lights, /setWireLightGain\(0/, 'negative: GRAS hover must not dim by lamp gain')

const player = fs.readFileSync(
  fileURLToPath(new URL('../../../../components/webglToolkit/WebglScenePlayer.tsx', import.meta.url)),
  'utf8',
)
assert.match(player, /onHoverChange/)
assert.match(player, /scaleHexRgb/)
assert.match(player, /introTForScene/)
assert.match(player, /sceneClockWaiting/)
assert.match(player, /sceneFlyRate\(waitingAssets/)
assert.match(player, /const motion = intended/)
assert.doesNotMatch(
  player,
  /const motion = waitingAssets \? undefined : intended/,
  'negative: waiting for Liberty must still seat the torch, not leave the landing camera',
)
assert.match(player, /sceneUsesViewpointFly\(waitingAssets, Boolean\(motion\), playing\)/)
assert.doesNotMatch(
  player,
  /waitingAssets = Boolean\(intended\) && !assetsReady/,
  'negative: the previous scene ready flag must not start this scene crane',
)
assert.doesNotMatch(
  player,
  /motion && playing \? \([\s\S]*?<SceneMotionFly[\s\S]*?\) : \(\s*<ViewpointFly/,
  'negative: waiting for About must not seat Home through ViewpointFly',
)
assert.match(player, /setIntro\(\(prev\) => \(prev\.scene === sceneId/)
assert.doesNotMatch(
  player,
  /waitingAssets = Boolean\(intended\) && !assetsReady/,
  'negative: the previous scene ready flag must not start this scene crane',
)
assert.doesNotMatch(
  player,
  /setIntroT\(1\)/,
  'negative: untagged intro writes can paint the next section',
)
assert.match(player, /introScene\.current !== doc\.id/)
assert.match(player, /introScene\.current !== sceneId/)
assert.match(player, /visibleSceneTone\(introT, departT, depart\)/)
assert.match(player, /incomingIntroT/)
assert.match(player, /waitingAssets/)
assert.match(player, /<Suspense fallback=\{null\}>/)
assert.match(player, /SceneAssets key=\{doc\.id\}/)
const flyAt = player.indexOf('<SceneMotionFly')
const suspenseAt = player.indexOf('<Suspense fallback={null}>')
assert.ok(flyAt > 0 && suspenseAt > flyAt, 'a model suspend must not unmount the light clock')
assert.match(player, /toneDriving/)
assert.match(player, /tone < 1 \|\| depart/)
assert.match(player, /if \(toneDriving\) \{[\s\S]*?setWireLightColor\(lightHex\)/)
assert.match(player, /setCeramicMeshColor\(meshHex\)/)
assert.match(
  player,
  /if \(steeredMotion\) \{[\s\S]*?steeredIntroAtDone\(steer\?\.rate, steer\?\.tint\)[\s\S]*?onSteerDone/,
  'steered reverse of a copy hop keeps color; tinted reverse still settles at black',
)
assert.doesNotMatch(
  player,
  /toneDriving = tone < 1 \|\| rising \|\| depart \|\| returning \|\| tinting \|\| waitingAssets/,
  'negative: flash-hunt toneDriving must not keep publishing after steered sections settle',
)
assert.doesNotMatch(
  player,
  /Publish the incoming color first/,
  'negative: publishing full lightHex every render snaps hover dim in and out',
)
assert.doesNotMatch(
  player,
  /visibleSceneTone\(introShown/,
  'negative: a scene change must not paint the previous scene at full color',
)
assert.match(lights, /duration: SCENE_OBJECT_COLOR_DIM_DURATION/)
assert.doesNotMatch(
  lights,
  /duration:\s*0/,
  'negative: hover dim must not snap with a zero duration',
)
assert.match(player, /if \(intro\.scene !== doc\.id\) \{[\s\S]*?setFinishedKey\(''\)/)
assert.match(player, /if \(!departLive\.current\) return/)
const fly = fs.readFileSync(
  fileURLToPath(new URL('../controls/SceneMotionFly.tsx', import.meta.url)),
  'utf8',
)
assert.match(fly, /wasHeld && step !== 0 \? 0 : Math\.min\(delta, 0\.05\)/)
assert.match(fly, /clock\.mix >= 0\.08/)
assert.doesNotMatch(
  fly,
  /current\.age \+= delta \* step/,
  'negative: a load hitch must not fast-forward the crane color',
)
const reverseAt = fly.indexOf('if (steerReverseDone(clock, step))')
const holdAt = fly.indexOf('if (current.age < wait)')
assert.ok(reverseAt > 0 && holdAt > reverseAt, 'a reverse finishes when the camera arrives, before the opening hold')
assert.match(player, /duration: SCENE_DEPART_S/)
assert.match(player, /key=\{doc\.id\}/)
assert.match(player, /hoverEnabled=\{!playing && !depart && !returning\}/)
assert.doesNotMatch(player, /holdMotion|SCENE_TURN_ON/, 'negative: the camera must not wait, then jump to the intro')
assert.doesNotMatch(player, /setWireLightGain\(0/, 'negative: intro darkness must not fake it with lamp gain')
assert.doesNotMatch(
  player,
  /<WebglStage[^>]*>[\s\S]*<WebglStage/,
  'negative: a scene swap must not stack a second canvas',
)
assert.doesNotMatch(
  player,
  /dim=\{grasHover\}/,
  'negative: GRAS hover must not dim Adam while the back-to-front crane is playing',
)
assert.doesNotMatch(
  player,
  /intensity=\{grasHover/,
  'negative: Adam darkness is object color, not intensity',
)

console.log('sceneObjectColor: ok')
