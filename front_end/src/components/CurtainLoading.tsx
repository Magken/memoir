import { Suspense, useEffect, useState, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { NoToneMapping } from 'three'
import { isometricWordCloudTypefaceUrl } from '../lib/isometrics/isometricWordCloud'
import { isDarkPalette, useThemeColor, useThemeFont } from '../lib/theme'
import { useR3fCanvasHost } from '../hooks/useR3fCanvasHost'
import { WEBGL_POWER_PREFERENCE } from '../lib/visualActivity'
import { CurtainLoadingScene, CURTAIN_LOADING_CAMERA } from './CurtainLoadingScene'

export type CurtainLoadingProps = {
  className?: string
  /** External 0–100 App Stage bootstrap feed. */
  progress: number
  /** Increment to replay the loading session. */
  loadingKey?: number
  onComplete?: () => void
  wordColor?: string
  emissiveColor?: string
  coolLightColor?: string
  warmLightColor?: string
  fogColor?: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const WORD_CLOUD_WHITE = '#FFFFFF'

/**
 * App Stage Curtain Scene — same WebGL stage recipe as Home IsometricWordCloud
 * (fog, lights, front camera, group), with V + % only.
 */
export function CurtainLoading({
  className = '',
  progress,
  loadingKey = 0,
  onComplete,
  wordColor,
  emissiveColor,
  coolLightColor,
  warmLightColor,
  fogColor,
}: CurtainLoadingProps) {
  const { palette, paletteId } = useThemeColor()
  const { stackId } = useThemeFont()
  const { hostRef, canvasReady, events } = useR3fCanvasHost()
  const [reduced, setReduced] = useState(prefersReducedMotion)
  const defaultGlow = isDarkPalette(paletteId) ? '#FFFFFF' : '#000000'
  const typefaceUrl = isometricWordCloudTypefaceUrl(stackId)
  const stagePaint = palette.pageBg
  const { zoom, near, lookAt, position, fov } = CURTAIN_LOADING_CAMERA

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const stageClass = ['theme-isometric-word-cloud', 'theme-curtain-loading', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={hostRef}
      className={stageClass}
      data-loading="true"
      aria-busy="true"
      aria-label="Loading"
    >
      {canvasReady ? (
        <Canvas
          key={typefaceUrl}
          events={events}
          eventSource={hostRef as RefObject<HTMLElement>}
          flat
          resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
          camera={{
            fov,
            zoom,
            position,
            near,
            far: 2000,
          }}
          dpr={typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio, 2)}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: NoToneMapping,
            powerPreference: WEBGL_POWER_PREFERENCE,
          }}
          onCreated={({ gl, camera }) => {
            if (!gl.domElement) return
            gl.domElement.addEventListener('webglcontextlost', (event) => event.preventDefault())
            gl.shadowMap.enabled = false
            camera.position.set(position[0], position[1], position[2])
            camera.lookAt(lookAt[0], lookAt[1], lookAt[2])
          }}
        >
          <Suspense fallback={null}>
            <CurtainLoadingScene
              typefaceUrl={typefaceUrl}
              wordColor={wordColor ?? WORD_CLOUD_WHITE}
              emissiveColor={emissiveColor ?? defaultGlow}
              accentEmissiveColor={palette.accent}
              coolLightColor={coolLightColor ?? WORD_CLOUD_WHITE}
              warmLightColor={warmLightColor ?? WORD_CLOUD_WHITE}
              fogColor={fogColor ?? stagePaint}
              reducedMotion={reduced}
              progress={progress}
              loadingKey={loadingKey}
              onComplete={onComplete}
            />
          </Suspense>
        </Canvas>
      ) : null}
    </div>
  )
}
