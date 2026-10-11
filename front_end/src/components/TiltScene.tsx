import {
  cloneElement,
  isValidElement,
  useCallback,
  useRef,
  type ReactElement,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  normalizeMouseTiltStrength,
  pointerToTiltAxes,
  type MouseTiltEffect,
} from '../lib/animations/tiltEffects'

type TiltSceneProps = {
  effect: MouseTiltEffect
  /** Scales follow/away tilt angle (`--ma`); `1` default · does not change text `--dz` */
  strength?: number
  /** `card` default · `btn` tighter angle / perspective */
  kind?: 'card' | 'btn'
  children: ReactElement<{ className?: string; children?: ReactNode }>
  className?: string
}

/** Reference `.text` — Z pop on active; no ::before shine */
function wrapTiltLayers(children: ReactNode): ReactNode {
  return <div className="theme-tilt-text">{children}</div>
}

export function TiltScene({
  effect,
  strength,
  kind = 'card',
  children,
  className = '',
}: TiltSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const pointerRafRef = useRef<number | null>(null)
  const activeRef = useRef(false)

  const applyPointer = useCallback((clientX: number, clientY: number) => {
    const scene = sceneRef.current
    if (!scene || !activeRef.current) return

    const rect = scene.getBoundingClientRect()
    const { x, y } = pointerToTiltAxes(clientX, clientY, rect)
    scene.style.setProperty('--x', x.toFixed(3))
    scene.style.setProperty('--y', y.toFixed(3))
  }, [])

  const onPointerEnter = useCallback(() => {
    activeRef.current = true
    sceneRef.current?.classList.add('theme-tilt-scene--active')
  }, [])

  const onPointerLeave = useCallback(() => {
    activeRef.current = false
    const scene = sceneRef.current
    if (!scene) return

    scene.classList.remove('theme-tilt-scene--active')
    scene.style.setProperty('--x', '0')
    scene.style.setProperty('--y', '0')

    if (pointerRafRef.current !== null) {
      cancelAnimationFrame(pointerRafRef.current)
      pointerRafRef.current = null
    }
  }, [])

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!activeRef.current) return
      if (pointerRafRef.current !== null) return

      const { clientX, clientY } = event
      pointerRafRef.current = requestAnimationFrame(() => {
        applyPointer(clientX, clientY)
        pointerRafRef.current = null
      })
    },
    [applyPointer],
  )

  if (!isValidElement(children)) {
    return children as ReactNode
  }

  const tiltStrength = normalizeMouseTiltStrength(strength)

  const target = cloneElement(children, {
    className: [
      children.props.className,
      'theme-tilt-target',
      kind === 'btn' ? 'theme-tilt-target--btn' : 'theme-tilt-target--card',
    ]
      .filter(Boolean)
      .join(' '),
    children: wrapTiltLayers(children.props.children),
  })

  return (
    <div
      ref={sceneRef}
      className={[
        'theme-tilt-scene',
        effect === 'away' ? 'theme-tilt-scene--away' : '',
        kind === 'btn' ? 'theme-tilt-scene--btn' : 'theme-tilt-scene--card',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ['--theme-tilt-strength' as string]: String(tiltStrength),
        ['--x' as string]: '0',
        ['--y' as string]: '0',
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
    >
      <div className="theme-tilt-stage">{target}</div>
    </div>
  )
}
