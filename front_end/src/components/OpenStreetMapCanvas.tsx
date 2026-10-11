import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import {
  OSM_MAX_ZOOM,
  OSM_MIN_ZOOM,
  OSM_TILE_SIZE,
  fitOsmView,
  lonLatToWorld,
  osmTileUrl,
  visibleOsmTiles,
} from '../lib/charts/osmTiles'

export type OpenStreetMapPin = {
  lat: number
  lon: number
  kind?: 'ip' | 'gps'
  label?: string
}

type OpenStreetMapCanvasProps = {
  pins: readonly OpenStreetMapPin[]
  className?: string
  debug?: boolean
}

const OSM_DRAG_PX = 10
const OSM_WHEEL_STEP = 120

/**
 * Draggable OpenStreetMap tile canvas. Tiles load only while this element is
 * mounted (Security stage). Attribution stays on the map.
 */
export function OpenStreetMapCanvas({
  pins,
  className = '',
  debug = false,
}: OpenStreetMapCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    x: number
    y: number
    cx: number
    cy: number
    armed: boolean
  } | null>(null)
  const zoomAccRef = useRef(0)
  const [size, setSize] = useState({ width: 480, height: 288 })
  const [dragging, setDragging] = useState(false)
  const fitted = useMemo(
    () => fitOsmView(pins, size.width, size.height),
    [pins, size.height, size.width],
  )
  const [view, setView] = useState(fitted)

  useEffect(() => {
    setView(fitted)
  }, [fitted])

  useEffect(() => {
    const host = hostRef.current
    if (!host || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const rect = host.getBoundingClientRect()
      if (rect.width < 8 || rect.height < 8) return
      setSize({ width: rect.width, height: rect.height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const tiles = useMemo(
    () =>
      visibleOsmTiles({
        zoom: view.zoom,
        centerX: view.centerX,
        centerY: view.centerY,
        width: size.width,
        height: size.height,
      }),
    [size.height, size.width, view.centerX, view.centerY, view.zoom],
  )

  const markers = useMemo(() => {
    const originX = view.centerX - size.width / 2
    const originY = view.centerY - size.height / 2
    return pins.map((pin, index) => {
      const world = lonLatToWorld(pin.lon, pin.lat, view.zoom)
      return {
        id: `${pin.kind ?? 'ip'}-${index}`,
        kind: pin.kind ?? 'ip',
        label: pin.label ?? '',
        left: world.x - originX,
        top: world.y - originY,
      }
    })
  }, [pins, size.height, size.width, view.centerX, view.centerY, view.zoom])

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      cx: view.centerX,
      cy: view.centerY,
      armed: false,
    }
  }, [view.centerX, view.centerY])

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.armed) {
      if (dx * dx + dy * dy < OSM_DRAG_PX * OSM_DRAG_PX) return
      drag.armed = true
      setDragging(true)
    }
    setView((current) => ({
      ...current,
      centerX: drag.cx - dx,
      centerY: drag.cy - dy,
    }))
  }, [])

  const endDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null
      setDragging(false)
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const onWheel = (event: WheelEvent) => {
      const pinch = event.ctrlKey || event.metaKey
      if (!pinch) return
      event.preventDefault()
      zoomAccRef.current += event.deltaY
      if (Math.abs(zoomAccRef.current) < OSM_WHEEL_STEP) return
      const dir = zoomAccRef.current > 0 ? -1 : 1
      zoomAccRef.current = 0
      const rect = host.getBoundingClientRect()
      setView((current) => {
        const nextZoom = Math.min(
          OSM_MAX_ZOOM,
          Math.max(OSM_MIN_ZOOM, current.zoom + dir),
        )
        if (nextZoom === current.zoom) return current
        const focalX = event.clientX - rect.left
        const focalY = event.clientY - rect.top
        const worldX = current.centerX - size.width / 2 + focalX
        const worldY = current.centerY - size.height / 2 + focalY
        const scale = 2 ** (nextZoom - current.zoom)
        return {
          zoom: nextZoom,
          centerX: worldX * scale - focalX + size.width / 2,
          centerY: worldY * scale - focalY + size.height / 2,
        }
      })
    }
    host.addEventListener('wheel', onWheel, { passive: false })
    return () => host.removeEventListener('wheel', onWheel)
  }, [size.height, size.width])

  if (debug) {
    console.debug('[OpenStreetMapCanvas]', { zoom: view.zoom, tiles: tiles.length, pins: pins.length })
  }

  return (
    <div
      ref={hostRef}
      className={[
        'theme-osm-canvas',
        dragging ? 'is-dragging' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="application"
      aria-label="Street map. Drag to move. Hold Control and scroll to zoom."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {tiles.map((tile) => {
        const src = osmTileUrl(view.zoom, tile.x, tile.y)
        if (!src) return null
        return (
          <img
            key={`${view.zoom}-${tile.x}-${tile.y}`}
            className="theme-osm-canvas__tile"
            alt=""
            draggable={false}
            src={src}
            width={OSM_TILE_SIZE}
            height={OSM_TILE_SIZE}
            style={{ left: `${tile.left}px`, top: `${tile.top}px` }}
          />
        )
      })}
      {markers.map((pin) => (
        <span
          key={pin.id}
          className={['theme-osm-canvas__pin', pin.kind === 'gps' ? 'is-gps' : '']
            .filter(Boolean)
            .join(' ')}
          title={pin.label}
          style={{ left: `${pin.left}px`, top: `${pin.top}px` }}
        />
      ))}
      <p className="theme-osm-canvas__credit type-caption type-faint">
        © OpenStreetMap
      </p>
    </div>
  )
}
