import { Suspense, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import type { Shape3dViewRotation } from '../../lib/shape3d/shape3dFrame'
import type { CssShape3dKind } from '../../lib/shape3d/cssShape3dTypes'
import { useR3fCanvasHost } from '../../hooks/useR3fCanvasHost'
import { WEBGL_POWER_PREFERENCE } from '../../lib/visualActivity'
import { R3fShape3dSceneInner } from './R3fShape3dSceneInner'

type R3fShape3dCanvasProps = {
  kind: CssShape3dKind
  viewRef: RefObject<Shape3dViewRotation>
  edges?: boolean
  frameloop?: 'always' | 'demand' | 'never'
}

export function R3fShape3dCanvas({
  kind,
  viewRef,
  edges = false,
  frameloop = 'demand',
}: R3fShape3dCanvasProps) {
  const { hostRef, canvasReady, events } = useR3fCanvasHost()

  return (
    <div ref={hostRef} className="theme-r3f-shape3d__canvas-host">
      {canvasReady ? (
        <Canvas
          className="theme-r3f-shape3d__canvas"
          events={events}
          eventSource={hostRef as RefObject<HTMLElement>}
          frameloop={frameloop}
          gl={{ antialias: true, alpha: true, powerPreference: WEBGL_POWER_PREFERENCE }}
          dpr={[1, 2]}
          onCreated={({ gl }) => {
            if (!gl.domElement) return
            gl.setClearColor(0x000000, 0)
            gl.toneMapping = ACESFilmicToneMapping
            gl.toneMappingExposure = 1.08
            gl.domElement.addEventListener('webglcontextlost', (event) => {
              event.preventDefault()
            })
          }}
        >
          <Suspense fallback={null}>
            <R3fShape3dSceneInner kind={kind} viewRef={viewRef} edges={edges} />
          </Suspense>
        </Canvas>
      ) : null}
    </div>
  )
}
