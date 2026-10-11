/** OpenStreetMap tile math for the recruiter location canvas. */

export const OSM_TILE_SIZE = 256
export const OSM_MIN_ZOOM = 3
export const OSM_MAX_ZOOM = 18
/** One pin: city view, not a building. Drag and scroll to look closer. */
export const OSM_CITY_ZOOM = 12

export type OsmLonLat = {
  lat: number
  lon: number
}

export function clampOsmZoom(z: number): number {
  return Math.min(OSM_MAX_ZOOM, Math.max(OSM_MIN_ZOOM, Math.round(z)))
}

export function lonLatToWorld(lon: number, lat: number, zoom: number): { x: number; y: number } {
  const z = clampOsmZoom(zoom)
  const n = 2 ** z
  const wrappedLon = ((((lon + 180) % 360) + 360) % 360) - 180
  const clampedLat = Math.min(85.05112878, Math.max(-85.05112878, lat))
  const latRad = (clampedLat * Math.PI) / 180
  return {
    x: ((wrappedLon + 180) / 360) * n * OSM_TILE_SIZE,
    y:
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      n *
      OSM_TILE_SIZE,
  }
}

export function wrapTileX(x: number, zoom: number): number {
  const n = 2 ** clampOsmZoom(zoom)
  return ((x % n) + n) % n
}

export function osmTileUrl(zoom: number, x: number, y: number): string {
  const z = clampOsmZoom(zoom)
  const n = 2 ** z
  if (y < 0 || y >= n) return ''
  return `https://tile.openstreetmap.org/${z}/${wrapTileX(x, z)}/${y}.png`
}

export function fitOsmView(
  pins: readonly OsmLonLat[],
  width: number,
  height: number,
): { zoom: number; centerX: number; centerY: number } {
  const fallback = lonLatToWorld(0, 20, 3)
  if (!pins.length) {
    return { zoom: 3, centerX: fallback.x, centerY: fallback.y }
  }
  if (pins.length === 1) {
    const only = pins[0]!
    const center = lonLatToWorld(only.lon, only.lat, OSM_CITY_ZOOM)
    return { zoom: OSM_CITY_ZOOM, centerX: center.x, centerY: center.y }
  }
  const mean = {
    lat: pins.reduce((s, p) => s + p.lat, 0) / pins.length,
    lon: pins.reduce((s, p) => s + p.lon, 0) / pins.length,
  }
  let zoom = OSM_MAX_ZOOM
  for (let z = OSM_MAX_ZOOM; z >= OSM_MIN_ZOOM; z -= 1) {
    const pts = pins.map((p) => lonLatToWorld(p.lon, p.lat, z))
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const spanX = Math.max(...xs) - Math.min(...xs)
    const spanY = Math.max(...ys) - Math.min(...ys)
    if (spanX <= Math.max(OSM_TILE_SIZE, width * 0.7) && spanY <= Math.max(OSM_TILE_SIZE, height * 0.7)) {
      zoom = z
      break
    }
    zoom = z
  }
  const center = lonLatToWorld(mean.lon, mean.lat, zoom)
  return { zoom, centerX: center.x, centerY: center.y }
}

export function visibleOsmTiles(input: {
  zoom: number
  centerX: number
  centerY: number
  width: number
  height: number
}): Array<{ x: number; y: number; left: number; top: number }> {
  const z = clampOsmZoom(input.zoom)
  const n = 2 ** z
  const originX = input.centerX - input.width / 2
  const originY = input.centerY - input.height / 2
  const minX = Math.floor(originX / OSM_TILE_SIZE) - 1
  const maxX = Math.floor((originX + input.width) / OSM_TILE_SIZE) + 1
  const minY = Math.max(0, Math.floor(originY / OSM_TILE_SIZE) - 1)
  const maxY = Math.min(n - 1, Math.floor((originY + input.height) / OSM_TILE_SIZE) + 1)
  const out: Array<{ x: number; y: number; left: number; top: number }> = []
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      out.push({
        x,
        y,
        left: x * OSM_TILE_SIZE - originX,
        top: y * OSM_TILE_SIZE - originY,
      })
    }
  }
  return out
}
