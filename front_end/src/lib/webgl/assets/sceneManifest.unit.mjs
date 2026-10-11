/**
 * Product scenes list registered ids and point at baked JSON.
 * Run: npx tsx front_end/src/lib/webgl/assets/sceneManifest.unit.mjs
 */
import assert from 'node:assert/strict'
import { WEBGL_SCENES, getWebglScene } from './sceneManifest.ts'

const ids = WEBGL_SCENES.map((scene) => scene.id)
assert.equal(new Set(ids).size, ids.length, `duplicate scene ids: ${ids.join(', ')}`)

const landing = getWebglScene('landing')
assert.ok(landing, 'landing must be registered')
assert.equal(landing.label, 'Landing')
assert.equal(WEBGL_SCENES[0]?.id, 'landing', 'landing is the first product scene')

const about = getWebglScene('about')
assert.ok(about, 'about must be registered')
assert.equal(about.label, 'About')
assert.notEqual(about.id, 'landing', 'negative: About is a second scene, not a landing alias')

const projects = getWebglScene('projects')
assert.ok(projects, 'projects must be registered')
assert.equal(projects.label, 'Projects')
assert.notEqual(projects.id, 'about', 'negative: Projects is a third scene, not an About alias')

const footer = getWebglScene('footer')
assert.ok(footer, 'footer must be registered')
assert.equal(footer.label, 'Footer')
assert.notEqual(footer.id, 'projects', 'negative: Footer is a fourth scene, not a Projects alias')
assert.equal(getWebglScene('lantern'), undefined, 'negative: the scene id is footer, not lantern')

assert.equal(getWebglScene('no-such-scene'), undefined, 'negative: unknown id is undefined')

console.log('sceneManifest: ok')
