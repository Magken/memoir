import {
  cloneElement,
  isValidElement,
  useCallback,
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { pointerToTunnelAxes, TUNNEL_LAYER_COUNT } from '../lib/animations/tunnelEffects'

type TunnelSceneProps = {
  layerCount?: number
  children: ReactElement<{ className?: string; children?: ReactNode }>
  className?: string
}

function wrapTunnelLayers(children: ReactNode, layerCount: number): ReactNode {
  return (
    <>
      <div className="theme-tunnel-layers" aria-hidden>
        {Array.from({ length: layerCount }, (_, index) => (
          <span
            key={index}
            className={[
              'theme-tunnel-layer',
              index === 0 ? 'theme-tunnel-layer--aperture' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ '--index': index + 1 } as CSSProperties}
          />
        ))}
      </div>
      <div className="theme-tunnel-content">{children}</div>
    </>
  )
}

export function TunnelScene({
  layerCount = TUNNEL_LAYER_COUNT,
  children,
  className = '',
}: TunnelSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const pointerRafRef = useRef<number | null>(null)
  const activeRef = useRef(false)

  const applyPointer = useCallback((clientX: number, clientY: number) => {
    const scene = sceneRef.current
    if (!scene || !activeRef.current) return

    const rect = scene.getBoundingClientRect()
    const { x, y } = pointerToTunnelAxes(clientX, clientY, rect)
    scene.style.setProperty('--x', x.toFixed(3))
    scene.style.setProperty('--y', y.toFixed(3))
  }, [])

  const onPointerEnter = useCallback(() => {
    activeRef.current = true
    sceneRef.current?.classList.add('theme-tunnel-scene--active')
  }, [])

  const onPointerLeave = useCallback(() => {
    activeRef.current = false
    const scene = sceneRef.current
    if (!scene) return

    scene.classList.remove('theme-tunnel-scene--active')
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

  const target = cloneElement(children, {
    className: [children.props.className, 'theme-tunnel-target'].filter(Boolean).join(' '),
    children: wrapTunnelLayers(children.props.children, layerCount),
  })

  return (
    <div
      ref={sceneRef}
      className={['theme-tunnel-scene', className].filter(Boolean).join(' ')}
      style={{ ['--x' as string]: '0', ['--y' as string]: '0' }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
    >
      <div className="theme-tunnel-stage">{target}</div>
    </div>
  )
}
