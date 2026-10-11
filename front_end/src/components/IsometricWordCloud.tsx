import { Suspense, useEffect, useState, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { NoToneMapping } from 'three'
import {
  isometricWordCloudCameraPose,
  isometricWordCloudResolvedCamera,
  isometricWordCloudTypefaceUrl,
  type IsometricWordCloudCameraView,
  type IsometricWordCloudFocus,
  type IsometricWordCloudFraming,
  type IsometricWordCloudMode,
} from '../lib/isometrics/isometricWordCloud'
import { isDarkPalette, useThemeColor, useThemeFont } from '../lib/theme'
import { useR3fCanvasHost } from '../hooks/useR3fCanvasHost'
import { useVisualActivity } from '../hooks/useVisualActivity'
import { resolveR3fFrameloop, WEBGL_POWER_PREFERENCE } from '../lib/visualActivity'
import { IsometricWordCloudScene } from './IsometricWordCloudScene'

export type IsometricWordCloudProps = {
  mouseFollow?: boolean
  className?: string
  wordColor?: string
  emissiveColor?: string
  coolLightColor?: string
  warmLightColor?: string
  fogColor?: string
  cameraView?: IsometricWordCloudCameraView
  /** Desktop off-center stage vs mobile top-half hero framing. */
  framing?: IsometricWordCloudFraming
  /** Continuously run the soft depth wave; false stops and restores idle depth. */
  waveEnabled?: boolean
  /** Optional restart token while the wave is enabled. */
  waveTriggerKey?: number
  /** `all` shows every word; `hire` / `apply` keep shared words plus that audience lane. */
  focus?: IsometricWordCloudFocus
  /**
   * Soft radial WebGL shade/blur from V toward the edges (0–1).
   * Higher values blend peripheral words into the fog/stage.
   */
  edgeShade?: number
  /** `loading` runs 1→100% count, then exits into the V word cloud. */
  mode?: IsometricWordCloudMode
  /** Increment to replay the loading sequence while `mode="loading"`. */
  loadingKey?: number
  /**
   * External 0–100 feed (API / loader). When set, drives the `%` counter;
   * at 100 the counter exits past fog and the V cloud reveals.
   * Omit for the built-in auto count demo.
   */
  progress?: number
  onLoadingComplete?: () => void
  /**
   * Requested R3F loop. Home parked App Stage uses `never`.
   * Off-screen / hidden-tab / CSS-hidden hosts still resolve to `never`.
   * Visible but idle (no wave / loading) resolves to `demand`.
   */
  frameloop?: 'always' | 'demand' | 'never'
  /** ThemeScroll viewport so pause/resume tracks the scene scroller, not the window. */
  visibilityRootRef?: RefObject<Element | null>
  /**
   * False parks glyphs behind fog (Home App Stage while not live).
   * Rising false→true in `cloud` mode replays the satellite stagger.
   */
  active?: boolean
  /** Fires after a return-to-Home park frame, before the stagger — lift the page-bg veil. */
  onEntranceStart?: () => void
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Literal white for glyphs / lights — stays fixed across light and dark palettes. */
const WORD_CLOUD_WHITE = '#FFFFFF'

/**
 * Ref isometric4 mechanics unchanged.
 * Defaults: Text/Cool/Warm = White, Glow = black (light) / white (dark),
 * Fog/stage = White (pageBg on dark so the stage matches the shell).
 */
export function IsometricWordCloud({
  mouseFollow = true,
  className = '',
  wordColor,
  emissiveColor,
  coolLightColor,
  warmLightColor,
  fogColor,
  cameraView = 'front',
  framing = 'default',
  waveEnabled = false,
  waveTriggerKey = 0,
  focus = 'all',
  edgeShade,
  mode = 'cloud',
  loadingKey = 0,
  progress,
  onLoadingComplete,
  frameloop = 'always',
  visibilityRootRef,
  active = true,
  onEntranceStart,
}: IsometricWordCloudProps) {
  const { palette, paletteId } = useThemeColor()
  const { stackId } = useThemeFont()
  const { hostRef, canvasReady, events } = useR3fCanvasHost()
  const visuallyActive = useVisualActivity(hostRef, {
    enabled: frameloop !== 'never',
    observeKey: canvasReady,
    rootRef: visibilityRootRef,
  })
  const needsFrames = mode === 'loading' || waveEnabled
  const resolvedFrameloop = resolveR3fFrameloop(frameloop, visuallyActive, needsFrames)
  const [reduced, setReduced] = useState(prefersReducedMotion)
  const defaultGlow = isDarkPalette(paletteId) ? '#FFFFFF' : '#000000'

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  // Block browser pinch / ctrl+wheel zoom over the canvas so it cannot fight page zoom.
  useEffect(() => {
    const stage = hostRef.current
    if (!stage) return

    const blockZoom = (event: Event) => {
      event.preventDefault()
    }
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('gesturestart', blockZoom, { passive: false })
    stage.addEventListener('gesturechange', blockZoom, { passive: false })
    stage.addEventListener('gestureend', blockZoom, { passive: false })
    return () => {
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('gesturestart', blockZoom)
      stage.removeEventListener('gesturechange', blockZoom)
      stage.removeEventListener('gestureend', blockZoom)
    }
  }, [hostRef, canvasReady])

  const loading = mode === 'loading'
  const stageClass = ['theme-isometric-word-cloud', className].filter(Boolean).join(' ')
  const resolved = isometricWordCloudResolvedCamera(framing)
  const { zoom, near, lookAt } = resolved
  const pose = isometricWordCloudCameraPose(cameraView, framing)
  const initialCameraPosition = pose.position
  const initialCameraFov = pose.fov
  const typefaceUrl = isometricWordCloudTypefaceUrl(stackId)
  // Fog "White" follows the stage shell (brand white on light, pageBg on dark).
  const stagePaint = palette.pageBg

  return (
    <div
      ref={hostRef}
      className={stageClass}
      data-loading={loading ? 'true' : undefined}
      data-framing={framing === 'default' ? undefined : framing}
      aria-busy={loading || undefined}
      aria-label={`3D word cloud — ${focus === 'all' ? 'all hiring and applying words' : `${focus} words`} visible. Move the pointer; nearby words rise from depth.`}
    >
      {canvasReady ? (
      <Canvas
        key={typefaceUrl}
        events={events}
        eventSource={hostRef as RefObject<HTMLElement>}
        frameloop={resolvedFrameloop}
        flat
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
        camera={{
          fov: initialCameraFov,
          zoom,
          position: initialCameraPosition,
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
          camera.position.set(
            initialCameraPosition[0],
            initialCameraPosition[1],
            initialCameraPosition[2],
          )
          camera.lookAt(lookAt[0], lookAt[1], lookAt[2])
        }}
      >
        <Suspense fallback={null}>
          <IsometricWordCloudScene
            typefaceUrl={typefaceUrl}
            wordColor={wordColor ?? WORD_CLOUD_WHITE}
            emissiveColor={emissiveColor ?? defaultGlow}
            accentEmissiveColor={palette.accent}
            coolLightColor={coolLightColor ?? WORD_CLOUD_WHITE}
            warmLightColor={warmLightColor ?? WORD_CLOUD_WHITE}
            fogColor={fogColor ?? stagePaint}
            mouseFollow={mouseFollow && !reduced}
            reducedMotion={reduced}
            cameraView={cameraView}
            framing={framing}
            waveEnabled={waveEnabled}
            waveTriggerKey={waveTriggerKey}
            focus={focus}
            edgeShade={edgeShade}
            mode={mode}
            loadingKey={loadingKey}
            progress={progress}
            onLoadingComplete={onLoadingComplete}
            active={active}
            onEntranceStart={onEntranceStart}
          />
        </Suspense>
      </Canvas>
      ) : null}
    </div>
  )
}
