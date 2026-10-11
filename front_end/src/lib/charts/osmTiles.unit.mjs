import assert from 'node:assert/strict'
import {
  OSM_TILE_SIZE,
  clampOsmZoom,
  fitOsmView,
  lonLatToWorld,
  osmTileUrl,
  wrapTileX,
} from './osmTiles.ts'

assert.equal(clampOsmZoom(1), 3)
assert.equal(clampOsmZoom(40), 18)
assert.equal(wrapTileX(-1, 3), 7)
assert.match(osmTileUrl(10, 523, 380), /tile\.openstreetmap\.org\/10\/523\/380\.png/)
assert.equal(osmTileUrl(10, 0, -1), '')

const lagos = lonLatToWorld(3.3792, 6.5244, 10)
assert.ok(lagos.x > 0 && lagos.y > 0)
assert.ok(lagos.x < 2 ** 10 * OSM_TILE_SIZE)

const fitted = fitOsmView([{ lat: 6.5244, lon: 3.3792 }], 480, 280)
assert.equal(fitted.zoom, 12)
assert.ok(fitted.centerX > 0)

console.log('osmTiles.unit.mjs: ok')
