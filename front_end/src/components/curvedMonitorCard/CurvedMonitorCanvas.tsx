import { Suspense, useEffect, useState, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { NoToneMapping } from 'three'
import { useR3fCanvasHost } from '../../hooks/useR3fCanvasHost'
import { useVisualActivity } from '../../hooks/useVisualActivity'
import { HOME_WEBGL_WARM_MS, WEBGL_POWER_PREFERENCE } from '../../lib/visualActivity'
import type { CurvedMonitorTilt } from '../../lib/shape3d/curvedMonitor'
import { CurvedMonitorScene } from './CurvedMonitorScene'

type CurvedMonitorCanvasProps = {
  src: string
  incomingSrc?: string | null
  onFxComplete?: () => void
  tiltRef: RefObject<CurvedMonitorTilt>
  curvature: number
  curve: number
}

export function CurvedMonitorCanvas({
  src,
  incomingSrc = null,
  onFxComplete,
  tiltRef,
  curvature,
  curve,
}: CurvedMonitorCanvasProps) {
  const { hostRef, canvasReady, events } = useR3fCanvasHost()
  const visuallyActive = useVisualActivity(hostRef, { observeKey: canvasReady })
  const [warmed, setWarmed] = useState(false)

  useEffect(() => {
    if (!canvasReady || warmed) return
    const timer = window.setTimeout(() => setWarmed(true), HOME_WEBGL_WARM_MS)
    return () => window.clearTimeout(timer)
  }, [canvasReady, warmed])

  const runLoop = canvasReady && (!warmed || visuallyActive)

  return (
    <div ref={hostRef} className="theme-curved-monitor-card__canvas-host">
      {canvasReady ? (
        <Canvas
          className="theme-curved-monitor-card__canvas"
          events={events}
          eventSource={hostRef as RefObject<HTMLElement>}
          frameloop={runLoop ? 'always' : 'never'}
          gl={{ antialias: true, alpha: true, powerPreference: WEBGL_POWER_PREFERENCE }}
          dpr={[1, 2]}
          onCreated={({ gl, invalidate }) => {
            if (!gl.domElement) return
            gl.setClearColor(0x000000, 0)
            gl.toneMapping = NoToneMapping
            gl.domElement.setAttribute('aria-hidden', 'true')
            gl.domElement.addEventListener('webglcontextlost', (event) => {
              event.preventDefault()
            })
            invalidate()
          }}
        >
          <Suspense fallback={null}>
            <CurvedMonitorScene
              src={src}
              incomingSrc={incomingSrc}
              onFxComplete={onFxComplete}
              tiltRef={tiltRef}
              curvature={curvature}
              curve={curve}
            />
          </Suspense>
        </Canvas>
      ) : null}
    </div>
  )
}
