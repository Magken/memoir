import { Suspense, useEffect, type ReactNode, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three'
import { useR3fCanvasHost } from '../../../../hooks/useR3fCanvasHost'
import { WEBGL_POWER_PREFERENCE } from '../../../visualActivity'
import { WEBGL_RENDERER_DEFAULTS } from './rendererDefaults'
import { bindSceneWheelLock } from './sceneWheelLock'
import { useFrameloopGate } from './useFrameloopGate'

type WebglStageProps = {
  children: ReactNode
  className?: string
  shadows?: boolean
  /** Parent still wants the loop (panel open). Default true. */
  active?: boolean
  /** Stop page Lenis / native scroll over the canvas. Off when `/` stacks scenes. */
  lockPageScroll?: boolean
}

export function WebglStage({
  children,
  className = '',
  shadows = WEBGL_RENDERER_DEFAULTS.shadows,
  active = true,
  lockPageScroll = true,
}: WebglStageProps) {
  const { hostRef, canvasReady, events } = useR3fCanvasHost()
  const frameloop = useFrameloopGate(hostRef, { enabled: active && canvasReady })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    return bindSceneWheelLock(host, active && canvasReady && lockPageScroll)
  }, [hostRef, active, canvasReady, lockPageScroll])

  return (
    <div
      ref={hostRef}
      className={['theme-webgl-toolkit__stage', className].filter(Boolean).join(' ')}
      {...(lockPageScroll
        ? {
            'data-lenis-prevent': true,
            'data-lenis-prevent-wheel': true,
            'data-lenis-prevent-touch': true,
          }
        : {})}
    >
      {canvasReady ? (
        <Canvas
          className="theme-webgl-toolkit__canvas"
          events={events}
          eventSource={hostRef as RefObject<HTMLElement>}
          frameloop={frameloop}
          shadows={shadows ? { type: PCFSoftShadowMap } : false}
          gl={{
            antialias: WEBGL_RENDERER_DEFAULTS.antialias,
            alpha: WEBGL_RENDERER_DEFAULTS.alpha,
            powerPreference: WEBGL_POWER_PREFERENCE,
          }}
          dpr={WEBGL_RENDERER_DEFAULTS.dpr}
          onCreated={({ gl }) => {
            if (!gl.domElement) return
            gl.localClippingEnabled = true
            gl.outputColorSpace = SRGBColorSpace
            gl.toneMapping = ACESFilmicToneMapping
            gl.toneMappingExposure = WEBGL_RENDERER_DEFAULTS.toneMappingExposure
            gl.domElement.addEventListener('webglcontextlost', (event) => {
              event.preventDefault()
            })
          }}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      ) : null}
    </div>
  )
}
