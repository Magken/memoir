import {
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  EXTRUDED_TYPE_DEFAULT_ORIENTATION_FROM,
  EXTRUDED_TYPE_DEFAULT_ORIENTATION_TO,
  extrudedTypeOrientationVarsFromId,
  extrudedTypePointerOrientationVars,
  normalizeExtrudedTypeDepth,
  normalizeExtrudedTypeLayers,
  normalizeExtrudedTypePointerStrength,
  type ExtrudedTypePointer,
} from '../lib/animations/extrudedType'
import {
  isometricPlaneOrientation,
  isometricPlaneStagePerspective,
  type IsometricPlaneOrientationId,
} from '../lib/isometrics/isometricPlanes'
import { pointerToTiltAxes } from '../lib/animations/tiltEffects'

type ExtrudedTypeProps = {
  children: string
  /** Layer count — ref uses 20 */
  layers?: number
  /** Z step per layer (px) — ref ~1.5 */
  depthStep?: number
  /** CSS wobble when pointer is `none` */
  animate?: boolean
  /** Wobble / pointer rest pose — [isometricPlanes](../../lib/isometrics/isometricPlanes.ts) id */
  orientationFrom?: IsometricPlaneOrientationId
  /** Wobble peak / pointer target pose */
  orientationTo?: IsometricPlaneOrientationId
  /** `none` auto wobble · `follow` / `repulse` pointer tilt */
  pointer?: ExtrudedTypePointer
  pointerStrength?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ExtrudedType({
  children,
  layers: layersProp,
  depthStep: depthStepProp,
  animate = true,
  orientationFrom = EXTRUDED_TYPE_DEFAULT_ORIENTATION_FROM,
  orientationTo = EXTRUDED_TYPE_DEFAULT_ORIENTATION_TO,
  pointer = 'none',
  pointerStrength,
  size = 'md',
  className = '',
}: ExtrudedTypeProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const pointerRafRef = useRef<number | null>(null)
  const activeRef = useRef(false)

  const layerCount = normalizeExtrudedTypeLayers(layersProp)
  const depthStep = normalizeExtrudedTypeDepth(depthStepProp)
  const strength = normalizeExtrudedTypePointerStrength(pointerStrength)
  const reducedMotion = prefersReducedMotion()
  const usePointer = pointer !== 'none' && !reducedMotion
  const useAnimate = animate && pointer === 'none' && !reducedMotion

  const fromPlane = useMemo(() => isometricPlaneOrientation(orientationFrom), [orientationFrom])
  const toPlane = useMemo(() => isometricPlaneOrientation(orientationTo), [orientationTo])

  const layerIndexes = useMemo(
    () => Array.from({ length: layerCount }, (_, index) => index),
    [layerCount],
  )

  const orientationVars = useMemo(
    () => ({
      ...extrudedTypeOrientationVarsFromId(orientationFrom),
      ...extrudedTypeOrientationVarsFromId(orientationTo, 'to'),
    }),
    [orientationFrom, orientationTo],
  )

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const root = rootRef.current
      if (!root || !activeRef.current || !usePointer) return

      const rect = root.getBoundingClientRect()
      const axes = pointerToTiltAxes(clientX, clientY, rect)
      const vars = extrudedTypePointerOrientationVars(
        fromPlane,
        toPlane,
        axes.x,
        axes.y,
        pointer,
        strength,
      )

      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, String(value))
      })
    },
    [fromPlane, toPlane, pointer, strength, usePointer],
  )

  const resetPointerVars = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    Object.entries(extrudedTypeOrientationVarsFromId(orientationFrom)).forEach(([key, value]) => {
      root.style.setProperty(key, String(value))
    })
  }, [orientationFrom])

  const onPointerEnter = useCallback(() => {
    activeRef.current = true
  }, [])

  const onPointerLeave = useCallback(() => {
    activeRef.current = false
    resetPointerVars()

    if (pointerRafRef.current !== null) {
      cancelAnimationFrame(pointerRafRef.current)
      pointerRafRef.current = null
    }
  }, [resetPointerVars])

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!usePointer || !activeRef.current) return
      if (pointerRafRef.current !== null) return

      const { clientX, clientY } = event
      pointerRafRef.current = requestAnimationFrame(() => {
        applyPointer(clientX, clientY)
        pointerRafRef.current = null
      })
    },
    [applyPointer, usePointer],
  )

  const rootClass = [
    'theme-extruded-type',
    `theme-extruded-type--${size}`,
    `theme-extruded-type--${fromPlane.category}`,
    usePointer ? `theme-extruded-type--pointer theme-extruded-type--${pointer}` : '',
    useAnimate ? 'theme-extruded-type--animate' : '',
    reducedMotion ? 'theme-extruded-type--reduced' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const stackStyle = {
    ['--extruded-depth-step' as string]: String(depthStep),
    ...orientationVars,
  } satisfies CSSProperties

  const stageStyle = {
    ['--extruded-perspective' as string]: `${isometricPlaneStagePerspective(fromPlane.category)}px`,
  } satisfies CSSProperties

  return (
    <div
      ref={rootRef}
      className={rootClass}
      style={stackStyle}
      data-extruded-from={orientationFrom}
      data-extruded-to={orientationTo}
      onPointerEnter={usePointer ? onPointerEnter : undefined}
      onPointerLeave={usePointer ? onPointerLeave : undefined}
      onPointerMove={usePointer ? onPointerMove : undefined}
      aria-label={children.replace(/\s+/g, ' ').trim()}
    >
      <div className="theme-extruded-type__stage" style={stageStyle}>
        <div className="theme-extruded-type__stack">
          {layerIndexes.map((layerIndex) => (
            <div
              key={layerIndex}
              className="theme-extruded-type__layer"
              style={{ ['--layer-index' as string]: String(layerIndex) }}
              aria-hidden={layerIndex > 0}
            >
              <span className="theme-extruded-type__text">{children}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export type { ExtrudedTypePointer, IsometricPlaneOrientationId }
