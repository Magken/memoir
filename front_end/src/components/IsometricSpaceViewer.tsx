import { Suspense, useState, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { ISOMETRIC_SPACE, type IsometricVariant } from '../lib/isometrics/isometricEffects'
import { isometricSpreadStateAtProgress, type IsometricCoordinateSample } from '../lib/isometrics/isometricSpace3d'
import { useR3fCanvasHost } from '../hooks/useR3fCanvasHost'
import { Button } from './Button'
import { formatCoordinateSample } from './IsometricSpaceCoordinateLayer'
import { IsometricSpaceScene } from './IsometricSpaceScene'

type IsometricSpaceViewerProps = {
  variant?: IsometricVariant
  className?: string
}

export function IsometricSpaceViewer({
  variant = 'spread',
  className = '',
}: IsometricSpaceViewerProps) {
  const [progress, setProgress] = useState<number>(ISOMETRIC_SPACE.motion.restProgress)
  const [cameraResetToken, setCameraResetToken] = useState(0)
  const [coordinateSample, setCoordinateSample] = useState<IsometricCoordinateSample | null>(null)
  const { hostRef, canvasReady, events } = useR3fCanvasHost()

  const spread = isometricSpreadStateAtProgress(progress, variant)
  const sampleText = coordinateSample ? formatCoordinateSample(coordinateSample) : null

  return (
    <div className={['theme-isometric-space-viewer', className].filter(Boolean).join(' ')}>
      <div className="theme-isometric-space-viewer__head">
        <div>
          <p className="type-caption type-muted mb-1">
            Frame: XY screen (z = 0), −Z toward viewer —{' '}
            <code className="type-code">ISOMETRIC_SPACE.frame</code>
          </p>
          <p className="type-caption type-muted mb-0">
            Default camera on −Z (viewer), head-on at pivot · hover for coordinate readout
          </p>
        </div>
        <div className="theme-isometric-space-viewer__controls type-caption">
          <label className="theme-isometric-space-viewer__scrub">
            <span>scrub</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
            />
            <output>{progress.toFixed(2)}</output>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCameraResetToken((token) => token + 1)}
          >
            Reset camera
          </Button>
        </div>
      </div>

      <div ref={hostRef} className="theme-isometric-space-viewer__canvas">
        {canvasReady ? (
          <Canvas
            events={events}
            eventSource={hostRef as RefObject<HTMLElement>}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 2]}
            onCreated={({ gl }) => {
              if (!gl.domElement) return
              gl.domElement.addEventListener('webglcontextlost', (event) => {
                event.preventDefault()
              })
            }}
          >
            <Suspense fallback={null}>
              <IsometricSpaceScene
                progress={progress}
                variant={variant}
                cameraResetToken={cameraResetToken}
                onCoordinateSample={setCoordinateSample}
              />
            </Suspense>
          </Canvas>
        ) : null}
        <div className="theme-isometric-space-viewer__hud type-caption" aria-live="polite">
          {sampleText ? (
            <>
              <div>
                <span className="theme-isometric-space-viewer__hud-label">frame</span>
                <code>{sampleText.frame}</code>
              </div>
              <div>
                <span className="theme-isometric-space-viewer__hud-label">svg</span>
                <code>{sampleText.svg}</code>
              </div>
              <div>
                <span className="theme-isometric-space-viewer__hud-label">world</span>
                <code>{sampleText.world}</code>
              </div>
            </>
          ) : (
            <span className="type-muted">Move pointer over the graph for coordinate readout</span>
          )}
        </div>
      </div>

      <dl className="theme-isometric-space-viewer__coords type-caption">
        <div>
          <dt>Pointer frame</dt>
          <dd>{sampleText ? sampleText.frame : '—'}</dd>
        </div>
        <div>
          <dt>Pointer svg</dt>
          <dd>{sampleText ? sampleText.svg : '—'}</dd>
        </div>
        <div>
          <dt>Pointer world</dt>
          <dd>{sampleText ? sampleText.world : '—'}</dd>
        </div>
        <div>
          <dt>Seam</dt>
          <dd>SVG x = {ISOMETRIC_SPACE.seam.x} → world x = 0 (plane x = 0)</dd>
        </div>
        <div>
          <dt>Left plane</dt>
          <dd>
            skewY {spread.left.skewY.toFixed(1)}° · scaleX {spread.left.scaleX.toFixed(2)} · x{' '}
            {spread.left.x.toFixed(0)}
          </dd>
        </div>
        <div>
          <dt>Right plane</dt>
          <dd>
            skewY {spread.right.skewY.toFixed(1)}° · scaleX {spread.right.scaleX.toFixed(2)} · x{' '}
            {spread.right.x.toFixed(0)}
          </dd>
        </div>
      </dl>
    </div>
  )
}
