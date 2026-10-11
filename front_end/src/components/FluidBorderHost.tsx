import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type PointerEvent,
  type ReactNode,
} from 'react'
import {
  FLUID_BORDER_STATIC_CLASS,
  resolveFluidBorderAutoMs,
  resolveFluidBorderPhysics,
  type FluidBorderPhysicsInput,
} from '../lib/animations/fluidBorder'
import {
  FluidBorderEngine,
  parseBorderRadiusPx,
  type FluidBorderTouch,
} from '../lib/animations/fluidBorderEngine'

type FluidBorderHostProps = {
  children: ReactNode
  /** Idle orbit lap period (seconds); `false` = pointer only */
  autoPeriod?: number | false
  /** Per-layer viscosity, mouse force, hover factor — ref.fluid-borders-2 */
  physics?: FluidBorderPhysicsInput
  /** Full-width block host — cards */
  block?: boolean
  className?: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function FluidBorderHost({
  children,
  autoPeriod,
  physics,
  block = false,
  className = '',
}: FluidBorderHostProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const engineRef = useRef<FluidBorderEngine | null>(null)
  const demoRef = useRef(true)
  const touchesRef = useRef<FluidBorderTouch[]>([])
  const rafRef = useRef(0)
  const autoMs = resolveFluidBorderAutoMs(autoPeriod)
  const staticRef = useRef(prefersReducedMotion())
  const resolvedPhysics = useMemo(
    () => resolveFluidBorderPhysics(physics),
    [JSON.stringify(physics ?? {})],
  )
  const physicsRef = useRef(resolvedPhysics)
  physicsRef.current = resolvedPhysics

  const syncGeometry = useCallback(() => {
    const slot = slotRef.current
    const target = slot?.firstElementChild as HTMLElement | null
    if (!target) return
    const width = target.offsetWidth
    const height = target.offsetHeight
    if (width < 1 || height < 1) return
    const radius = parseBorderRadiusPx(
      getComputedStyle(target).borderRadius,
      width,
      height,
    )
    if (!engineRef.current) {
      engineRef.current = new FluidBorderEngine({
        width,
        height,
        radius,
        ...physicsRef.current,
      })
    } else {
      engineRef.current.setSize(width, height, radius)
    }
  }, [])

  useLayoutEffect(() => {
    syncGeometry()
    const slot = slotRef.current
    const target = slot?.firstElementChild
    if (!target || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => syncGeometry())
    ro.observe(target)
    return () => ro.disconnect()
  }, [syncGeometry])

  useEffect(() => {
    engineRef.current?.applyPhysics(resolvedPhysics)
    if (engineRef.current && engineRef.current.layers[0]?.points.length) {
      engineRef.current.initOrigins()
    }
  }, [resolvedPhysics])

  useEffect(() => {
    if (staticRef.current) return
    const tick = () => {
      const engine = engineRef.current
      if (engine) {
        engine.touches = touchesRef.current
        engine.demo = demoRef.current
        engine.update(autoMs)
        const paths = engine.getPathDs()
        paths.forEach((d, index) => {
          pathRefs.current[index]?.setAttribute('d', d)
        })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [autoMs])

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (staticRef.current) return
    demoRef.current = false
    touchesRef.current = [{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, force: 1 }]
  }

  const onPointerLeave = () => {
    if (staticRef.current || demoRef.current) return
    touchesRef.current = []
    if (autoMs !== false) {
      demoRef.current = true
    }
  }

  const hostClass = [
    'theme-fluid-border',
    block ? 'theme-fluid-border--block' : '',
    staticRef.current ? FLUID_BORDER_STATIC_CLASS : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={hostRef}
      className={hostClass}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <svg className="theme-fluid-border__svg" aria-hidden>
        <path
          ref={(node) => {
            pathRefs.current[0] = node
          }}
          className="theme-fluid-border__path theme-fluid-border__path--layer-1"
        />
        <path
          ref={(node) => {
            pathRefs.current[1] = node
          }}
          className="theme-fluid-border__path theme-fluid-border__path--layer-2"
        />
      </svg>
      <div ref={slotRef} className="theme-fluid-border__slot">
        {children}
      </div>
    </div>
  )
}
