import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  applyOrbitalRubberBandRotation,
  animateOrbitalSphere,
  buildOrbitalItemsFromImages,
  cancelOrbitalSphereAnimation,
  clearOrbitalTileFocus,
  clearOrbitalTileStackOrder,
  createOrbitalEdgeSpring,
  ORBITAL_DEFAULT_MAX_POLAR_DEG,
  ORBITAL_DEFAULT_SEGMENTS,
  ORBITAL_DEFAULT_EDGE_CLAMP,
  ORBITAL_DRAG_ANIM_MS_FOCUS,
  ORBITAL_EDGE_INERTIA_DAMP,
  ORBITAL_INERTIA_FRICTION,
  ORBITAL_INERTIA_MAX_FRAMES,
  ORBITAL_INERTIA_MIN_VELOCITY,
  ORBITAL_PAN_SENSITIVITY,
  ORBITAL_VELOCITY_SMOOTHING,
  orbitalAnalyticalRotationForItem,
  orbitalContentArcFromItems,
  orbitalItemTransform,
  orbitalPanYawSign,
  orbitalRotationOvershoot,
  orbitalSphereTransform,
  orbitalViewYawOffset,
  resolveOrbitalPanClampConfig,
  resolveOrbitalPolarClampConfig,
  resolveOrbitalRotationToCenterItem,
  resolveOrbitalTapIndex,
  resolveOrbitalYawBounds,
  runOrbitalFocusDuringAnimation,
  smoothOrbitalRotation,
  stepOrbitalEdgeSpring,
  syncOrbitalTileFocus,
  syncOrbitalTileStackOrder,
  type OrbitalEdgeClamp,
  type OrbitalEdgeSpring,
  type OrbitalGalleryBuiltItem,
  type OrbitalGallerySourceItem,
  type OrbitalGrid,
  type OrbitalItemSpan,
  type OrbitalPolarClampConfig,
  type OrbitalRotation,
  type OrbitalYawBounds,
} from '../lib/galleries/orbitalGallery'
import type { GalleryExpandVariant } from '../lib/galleries/galleryExpand'
import { GALLERY_EXPAND_CLICK_MOVE_PX } from '../lib/galleries/galleryExpand'
import { Card, type CardVariant } from './Card'
import { GalleryExpandOverlay } from './GalleryExpandOverlay'

export type { GalleryExpandVariant } from '../lib/galleries/galleryExpand'
export type { OrbitalEdgeClamp, OrbitalPanClamp, OrbitalPolarClamp } from '../lib/galleries/orbitalGallery'

export type OrbitalGalleryGrid = OrbitalGrid

export type OrbitalGalleryItemSize = OrbitalItemSpan

export type OrbitalGalleryItem = OrbitalGalleryBuiltItem

export type OrbitalGalleryProps = {
  items: readonly OrbitalGalleryItem[]
  label?: string
  className?: string
  /** Sphere segment count — ref default 37 */
  segments?: number
  /** Max rotateX in degrees — ref default 3 */
  maxPolarDeg?: number
  /** Card shell on each tile */
  cardVariant?: CardVariant
  /** Off-center tiles grey + shrink; center tile stays full size + color */
  focusThin?: boolean
  /** Same rig as default, centered on the opposite horizontal arc (+180° yaw) */
  concave?: boolean
  /** Pan window as fraction of filled arc (default 0.45) — legacy horizontal shorthand */
  panArcFraction?: number
  /** Horizontal / vertical pan & tilt edge clamps (default tight horizontal + ±3°) */
  edgeClamp?: OrbitalEdgeClamp
  /** Tap-expand layout — shared with ImageDragCarousel (`detail` · `image` · `native`) */
  expandVariant?: GalleryExpandVariant
  /** Tap a tile (no drag) — animate orbit so that tile centers in the stage */
  centerOnClick?: boolean
  debug?: boolean
}

export { buildOrbitalItemsFromImages, type OrbitalGallerySourceItem }

function itemShellStyle(
  grid: OrbitalGalleryGrid,
  span: OrbitalItemSpan,
  segments: number
): CSSProperties {
  return {
    '--offset-x': String(grid.x),
    '--offset-y': String(grid.y),
    '--item-size-x': String(span.w),
    '--item-size-y': String(span.h),
    transform: orbitalItemTransform(grid, span, segments),
  } as CSSProperties
}

function pointerVelocityToOrbital(vx: number, vy: number, concave: boolean): OrbitalRotation {
  const yawSign = orbitalPanYawSign(concave)
  return { x: -vy * 0.55, y: yawSign * vx * 0.55 }
}

export function OrbitalGallery({
  items,
  label = 'Orbital gallery',
  className = '',
  segments = ORBITAL_DEFAULT_SEGMENTS,
  maxPolarDeg = ORBITAL_DEFAULT_MAX_POLAR_DEG,
  cardVariant = 'flat',
  focusThin = false,
  concave = false,
  panArcFraction,
  edgeClamp = ORBITAL_DEFAULT_EDGE_CLAMP,
  expandVariant = 'detail',
  centerOnClick = false,
  debug = false,
}: OrbitalGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const sphereRef = useRef<HTMLDivElement>(null)
  const yawBoundsRef = useRef<OrbitalYawBounds | null>(null)
  const polarClampRef = useRef<OrbitalPolarClampConfig>({ min: -maxPolarDeg, max: maxPolarDeg })
  const viewYawOffsetRef = useRef(0)
  const concaveRef = useRef(concave)
  const centerOnClickRef = useRef(centerOnClick)
  const rotationRef = useRef<OrbitalRotation>({ x: 0, y: 0 })
  const panStartRef = useRef({ x: 0, y: 0 })
  const startRotationRef = useRef<OrbitalRotation>({ x: 0, y: 0 })
  const activePointerRef = useRef<number | null>(null)
  const lastVelocityRef = useRef({ x: 0, y: 0 })
  const movedBeyondClickRef = useRef(false)
  const tapItemIndexRef = useRef<number | null>(null)
  const inertiaFrameRef = useRef<number | null>(null)
  const springRef = useRef<OrbitalEdgeSpring | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isCoasting, setIsCoasting] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [yawBounds, setYawBounds] = useState<OrbitalYawBounds | null>(null)

  const contentArc = useMemo(
    () => orbitalContentArcFromItems(items, segments),
    [items, segments]
  )

  const panClampConfig = useMemo(
    () => resolveOrbitalPanClampConfig(panArcFraction, edgeClamp),
    [edgeClamp, panArcFraction]
  )

  const polarClampConfig = useMemo(
    () => resolveOrbitalPolarClampConfig(maxPolarDeg, edgeClamp),
    [edgeClamp, maxPolarDeg]
  )

  const viewYawOffset = useMemo(() => orbitalViewYawOffset(concave), [concave])

  polarClampRef.current = polarClampConfig
  viewYawOffsetRef.current = viewYawOffset
  concaveRef.current = concave
  centerOnClickRef.current = centerOnClick
  yawBoundsRef.current = yawBounds

  const expandedItem = expandedIndex !== null ? items[expandedIndex] : null

  const closeExpanded = useCallback(() => {
    setExpandedIndex(null)
  }, [])

  const toggleExpanded = useCallback((index: number) => {
    setExpandedIndex((current) => (current === index ? null : index))
  }, [])

  const syncFocus = useCallback(() => {
    if (!focusThin) return
    const root = rootRef.current
    if (root) syncOrbitalTileFocus(root, debug)
  }, [debug, focusThin])

  const applyRotation = useCallback(
    (rotation: OrbitalRotation) => {
      rotationRef.current = rotation
      const root = rootRef.current
      const sphere = sphereRef.current
      if (!sphere) return
      cancelOrbitalSphereAnimation(sphere)
      sphere.style.transform = orbitalSphereTransform(
        rotation,
        undefined,
        viewYawOffsetRef.current
      )
      if (root) syncOrbitalTileStackOrder(root)
      syncFocus()
    },
    [syncFocus]
  )

  const stopMotion = useCallback(() => {
    if (inertiaFrameRef.current != null) {
      cancelAnimationFrame(inertiaFrameRef.current)
      inertiaFrameRef.current = null
    }
    springRef.current = null
    setIsCoasting(false)
  }, [])

  const centerOnItem = useCallback(
    (index: number) => {
      const root = rootRef.current
      const sphere = sphereRef.current
      const bounds = yawBoundsRef.current
      const item = items[index]
      if (!root || !sphere || !bounds || !item) return

      const itemEl = root.querySelectorAll<HTMLElement>('.theme-orbital-gallery__item')[index]
      if (!itemEl) return

      stopMotion()
      const current = { ...rotationRef.current }
      const guess = orbitalAnalyticalRotationForItem(item, segments)
      const target = resolveOrbitalRotationToCenterItem(
        root,
        sphere,
        itemEl,
        bounds,
        polarClampRef.current,
        guess,
        viewYawOffsetRef.current
      )

      sphere.style.transform = orbitalSphereTransform(
        current,
        undefined,
        viewYawOffsetRef.current
      )

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const duration = reducedMotion ? 0 : ORBITAL_DRAG_ANIM_MS_FOCUS

      if (focusThin) {
        runOrbitalFocusDuringAnimation(root, duration, debug)
      }

      animateOrbitalSphere(
        sphere,
        target,
        ORBITAL_DRAG_ANIM_MS_FOCUS,
        viewYawOffsetRef.current,
        () => {
          rotationRef.current = target
          syncOrbitalTileStackOrder(root)
          syncFocus()
        }
      )
    },
    [debug, focusThin, items, segments, stopMotion, syncFocus]
  )

  useLayoutEffect(() => {
    const root = rootRef.current
    const sphere = sphereRef.current
    if (!root || !sphere || !contentArc) return undefined

    const resolveAndApply = () => {
      stopMotion()
      const resolved = resolveOrbitalYawBounds(
        root,
        sphere,
        contentArc,
        maxPolarDeg,
        panArcFraction,
        panClampConfig,
        viewYawOffset
      )
      setYawBounds(resolved)
      rotationRef.current = { x: 0, y: resolved.initialSphereY }
      cancelOrbitalSphereAnimation(sphere)
      sphere.style.transform = orbitalSphereTransform(
        rotationRef.current,
        undefined,
        viewYawOffset
      )
      syncOrbitalTileStackOrder(root)
      if (focusThin) syncOrbitalTileFocus(root, debug)
    }

    resolveAndApply()
    window.addEventListener('resize', resolveAndApply)
    return () => window.removeEventListener('resize', resolveAndApply)
  }, [
    concave,
    contentArc,
    debug,
    focusThin,
    items.length,
    maxPolarDeg,
    panArcFraction,
    panClampConfig,
    viewYawOffset,
    stopMotion,
  ])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    if (!focusThin) {
      clearOrbitalTileFocus(root)
      syncOrbitalTileStackOrder(root)
      return undefined
    }

    if (yawBounds) syncOrbitalTileFocus(root, debug)

    const onResize = () => {
      const sphere = sphereRef.current
      if (!sphere || !contentArc) return
      const resolved = resolveOrbitalYawBounds(
        root,
        sphere,
        contentArc,
        maxPolarDeg,
        panArcFraction,
        panClampConfig,
        viewYawOffset
      )
      setYawBounds(resolved)
      applyRotation({ x: rotationRef.current.x, y: resolved.initialSphereY })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [
    applyRotation,
    concave,
    contentArc,
    debug,
    focusThin,
    maxPolarDeg,
    panArcFraction,
    panClampConfig,
    viewYawOffset,
    yawBounds,
  ])

  useEffect(() => {
    return () => {
      const root = rootRef.current
      if (root) clearOrbitalTileStackOrder(root)
    }
  }, [])

  useEffect(() => {
    return () => {
      cancelOrbitalSphereAnimation(sphereRef.current)
      if (inertiaFrameRef.current != null) {
        cancelAnimationFrame(inertiaFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (expandedIndex === null) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeExpanded()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeExpanded, expandedIndex])

  const startEdgeSpring = useCallback(
    (releaseVelocity?: OrbitalRotation) => {
      const bounds = yawBoundsRef.current
      if (!bounds) return false

      const spring = createOrbitalEdgeSpring(
        rotationRef.current,
        bounds,
        polarClampRef.current,
        releaseVelocity
      )

      if (
        !orbitalRotationOvershoot(spring.position, bounds, polarClampRef.current) &&
        Math.hypot(spring.velocity.x, spring.velocity.y) < 0.02
      ) {
        return false
      }

      springRef.current = spring
      setIsCoasting(true)

      const step = () => {
        const active = springRef.current
        if (!active) return

        const { spring: next, settled } = stepOrbitalEdgeSpring(active)
        springRef.current = next
        applyRotation(next.position)

        if (settled) {
          springRef.current = null
          inertiaFrameRef.current = null
          setIsCoasting(false)
          return
        }

        inertiaFrameRef.current = requestAnimationFrame(step)
      }

      if (inertiaFrameRef.current != null) {
        cancelAnimationFrame(inertiaFrameRef.current)
      }
      inertiaFrameRef.current = requestAnimationFrame(step)
      return true
    },
    [applyRotation]
  )

  const startInertia = useCallback(
    (velocityX: number, velocityY: number) => {
      const bounds = yawBoundsRef.current
      if (!bounds) return

      let vx = velocityX * 100
      let vy = velocityY * 100
      let frameCount = 0
      const polar = polarClampRef.current

      setIsCoasting(true)

      const step = () => {
        vx *= ORBITAL_INERTIA_FRICTION
        vy *= ORBITAL_INERTIA_FRICTION

        if (Math.abs(vx) < ORBITAL_INERTIA_MIN_VELOCITY && Math.abs(vy) < ORBITAL_INERTIA_MIN_VELOCITY) {
          inertiaFrameRef.current = null
          setIsCoasting(false)
          if (orbitalRotationOvershoot(rotationRef.current, bounds, polar)) {
            startEdgeSpring()
          }
          return
        }

        const yawSign = orbitalPanYawSign(concaveRef.current)
        const proposed: OrbitalRotation = {
          x: rotationRef.current.x - vy / 200,
          y: rotationRef.current.y + (yawSign * vx) / 200,
        }
        const display = applyOrbitalRubberBandRotation(proposed, bounds, polar)

        if (Math.abs(display.y - proposed.y) > 0.01) vx *= ORBITAL_EDGE_INERTIA_DAMP
        if (Math.abs(display.x - proposed.x) > 0.01) vy *= ORBITAL_EDGE_INERTIA_DAMP

        applyRotation(display)

        frameCount += 1
        if (frameCount > ORBITAL_INERTIA_MAX_FRAMES) {
          inertiaFrameRef.current = null
          setIsCoasting(false)
          if (orbitalRotationOvershoot(rotationRef.current, bounds, polar)) {
            startEdgeSpring()
          }
          return
        }

        inertiaFrameRef.current = requestAnimationFrame(step)
      }

      stopMotion()
      setIsCoasting(true)
      inertiaFrameRef.current = requestAnimationFrame(step)
    },
    [applyRotation, startEdgeSpring, stopMotion]
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      activePointerRef.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      movedBeyondClickRef.current = false
      const tile = (event.target as Element).closest('[data-orbital-index]')
      tapItemIndexRef.current = tile
        ? Number.parseInt(tile.getAttribute('data-orbital-index') ?? '', 10)
        : null
      if (tile && Number.isNaN(tapItemIndexRef.current)) {
        tapItemIndexRef.current = null
      }
      stopMotion()
      setIsDragging(true)
      panStartRef.current = { x: event.clientX, y: event.clientY }
      startRotationRef.current = { ...rotationRef.current }
      lastVelocityRef.current = { x: 0, y: 0 }
    },
    [stopMotion]
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        activePointerRef.current !== event.pointerId ||
        !event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        return
      }

      const bounds = yawBoundsRef.current
      if (!bounds) return

      const sampleX = event.movementX / 16
      const sampleY = event.movementY / 16
      const blend = ORBITAL_VELOCITY_SMOOTHING
      lastVelocityRef.current = {
        x: lastVelocityRef.current.x * (1 - blend) + sampleX * blend,
        y: lastVelocityRef.current.y * (1 - blend) + sampleY * blend,
      }

      const deltaX = event.clientX - panStartRef.current.x
      const deltaY = event.clientY - panStartRef.current.y
      if (Math.hypot(deltaX, deltaY) > GALLERY_EXPAND_CLICK_MOVE_PX) {
        if (!movedBeyondClickRef.current) {
          movedBeyondClickRef.current = true
          closeExpanded()
        }
      }

      const yawSign = orbitalPanYawSign(concaveRef.current)
      const raw: OrbitalRotation = {
        y: startRotationRef.current.y + (yawSign * deltaX) / ORBITAL_PAN_SENSITIVITY,
        x: startRotationRef.current.x - deltaY / ORBITAL_PAN_SENSITIVITY,
      }
      const banded = applyOrbitalRubberBandRotation(raw, bounds, polarClampRef.current)
      const smoothed = smoothOrbitalRotation(rotationRef.current, banded)
      applyRotation(smoothed)
    },
    [applyRotation, closeExpanded]
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current !== event.pointerId) return
      activePointerRef.current = null
      setIsDragging(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      if (!movedBeyondClickRef.current) {
        const root = rootRef.current
        const tapIndex =
          root !== null
            ? resolveOrbitalTapIndex(root, event.clientX, event.clientY)
            : tapItemIndexRef.current
        if (tapIndex !== null && !Number.isNaN(tapIndex)) {
          if (centerOnClickRef.current) {
            centerOnItem(tapIndex)
          } else {
            toggleExpanded(tapIndex)
          }
        }
      }
      tapItemIndexRef.current = null

      const bounds = yawBoundsRef.current
      const releaseOrbital = pointerVelocityToOrbital(
        lastVelocityRef.current.x,
        lastVelocityRef.current.y,
        concaveRef.current
      )

      if (
        bounds &&
        orbitalRotationOvershoot(rotationRef.current, bounds, polarClampRef.current)
      ) {
        startEdgeSpring(releaseOrbital)
        return
      }

      startInertia(lastVelocityRef.current.x, lastVelocityRef.current.y)
    },
    [centerOnItem, startEdgeSpring, startInertia, toggleExpanded]
  )

  if (items.length === 0 || !contentArc) return null

  const rootClass = [
    'theme-orbital-gallery',
    expandedIndex !== null ? 'theme-orbital-gallery--expanded-open' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const expandOverlay =
    expandedItem !== null ? (
      <GalleryExpandOverlay
        key={expandedIndex}
        item={expandedItem}
        variant={expandVariant}
        onClose={closeExpanded}
      />
    ) : null

  return (
    <div className={rootClass}>
      <div className="theme-gallery__stage-wrap">
        <div
          ref={rootRef}
          className={[
            'theme-orbital-gallery__root',
            concave ? 'theme-orbital-gallery__root--concave' : '',
            focusThin ? 'theme-orbital-gallery__root--focus-thin' : '',
            isDragging ? 'theme-orbital-gallery__root--dragging' : '',
            isCoasting ? 'theme-orbital-gallery__root--coasting' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={label}
          role="region"
          data-lenis-prevent
          data-lenis-prevent-touch
          data-lenis-prevent-wheel
          style={
            {
              '--orbital-segments-x': segments,
              '--orbital-segments-y': segments,
            } as CSSProperties
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="theme-orbital-gallery__stage">
            <div className="theme-orbital-gallery__rig">
              <div ref={sphereRef} className="theme-orbital-gallery__sphere">
                {items.map((item, index) => {
                  const span: OrbitalItemSpan = {
                    w: item.size?.w ?? 2,
                    h: item.size?.h ?? 2,
                  }
                  return (
                    <div
                      key={`${item.grid.x},${item.grid.y}-${index}`}
                      className="theme-orbital-gallery__item"
                      style={itemShellStyle(item.grid, span, segments)}
                    >
                      <button
                        type="button"
                        className="theme-orbital-gallery__tile-btn"
                        data-orbital-index={index}
                        aria-label={item.title ?? item.alt}
                        aria-expanded={expandedIndex === index}
                      >
                        <div className="theme-orbital-gallery__tile">
                          <Card
                            variant={cardVariant}
                            shape="rect"
                            image={{ src: item.src, alt: item.alt }}
                            className="theme-orbital-gallery__card"
                          >
                            {null}
                          </Card>
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="theme-orbital-gallery__overlay" aria-hidden />
          <div
            className="theme-orbital-gallery__overlay theme-orbital-gallery__overlay--blur"
            aria-hidden
          />
        </div>
        {expandOverlay}
      </div>
    </div>
  )
}
