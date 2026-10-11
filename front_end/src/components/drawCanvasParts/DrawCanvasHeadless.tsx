import {
  Excalidraw,
} from '@excalidraw/excalidraw'
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseExcalidrawScene } from '../../lib/docEditor/parseExcalidrawScene'
import {
  focusPresentationFrame,
  listPresentationFrameIds,
} from '../../lib/drawCanvas/presentation'
import { isDarkPalette, useThemeColor } from '../../lib/theme'
import { CanvasFullscreenModal } from '../rendererParts/CanvasFullscreenModal'
import { CanvasZoomMenu } from '../rendererParts/CanvasZoomMenu'

type OrderedExcalidrawElement = Record<string, unknown>

type DrawCanvasHeadlessProps = {
  sceneJson: string
  className?: string
  showZoomOverlay?: boolean
  allowFullscreenExpand?: boolean
  fullscreenTitle?: string
  /** When set, focus this frame index instead of zoom-to-fit whole scene. */
  presentationFrameIndex?: number
  /** Bump after host resize so embed refits zoom. */
  viewportRevision?: number
}

const HEADLESS_UI_OPTIONS = {
  canvasActions: {
    changeViewBackgroundColor: false,
    clearCanvas: false,
    export: false as const,
    loadScene: false,
    saveToActiveFile: false,
    toggleTheme: false,
    saveAsImage: false,
  },
}

export function DrawCanvasHeadless({
  sceneJson,
  className = '',
  showZoomOverlay = false,
  allowFullscreenExpand = true,
  fullscreenTitle = 'Excalidraw diagram',
  presentationFrameIndex,
  viewportRevision = 0,
}: DrawCanvasHeadlessProps) {
  const { paletteId } = useThemeColor()
  const excalidrawTheme = isDarkPalette(paletteId) ? 'dark' : 'light'
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const [zoomPercent, setZoomPercent] = useState(100)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [fullscreenRevision, setFullscreenRevision] = useState(0)

  const initialData = useMemo<ExcalidrawInitialDataState>(() => {
    const scene = parseExcalidrawScene(sceneJson)
    if (!scene) {
      return {
        elements: [],
        appState: {
          viewBackgroundColor: '#f8f9fa',
          viewModeEnabled: true,
          zenModeEnabled: true,
        },
      }
    }
    return {
      elements: scene.elements as ExcalidrawInitialDataState['elements'],
      appState: {
        viewBackgroundColor:
          (scene.appState?.viewBackgroundColor as string | undefined) ?? '#f8f9fa',
        viewModeEnabled: true,
        zenModeEnabled: true,
        ...(scene.appState ?? {}),
      } as AppState,
      files: scene.files as BinaryFiles | undefined,
    }
  }, [sceneJson])

  const presentationFrameIds = useMemo(() => listPresentationFrameIds(sceneJson), [sceneJson])

  const withApi = useCallback((fn: (api: ExcalidrawImperativeAPI) => void) => {
    const api = apiRef.current
    if (api) fn(api)
  }, [])

  const handleApi = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api
      setZoomPercent(Math.round(api.getAppState().zoom.value * 100))
    },
    [],
  )

  useEffect(() => {
    if (presentationFrameIndex !== undefined) return
    if (!showZoomOverlay) return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        withApi((api) => {
          api.scrollToContent(undefined, { fitToContent: true, animate: false })
        })
      })
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [initialData, presentationFrameIndex, showZoomOverlay, viewportRevision, withApi])

  useEffect(() => {
    if (presentationFrameIndex === undefined) return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        withApi((api) => {
          const frameId = presentationFrameIds[presentationFrameIndex]
          if (!frameId) return
          const frame = api.getSceneElements().find((el) => el.id === frameId)
          if (!frame || frame.isDeleted || frame.type !== 'frame') return
          focusPresentationFrame(api, frame)
        })
      })
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [presentationFrameIds, presentationFrameIndex, viewportRevision, withApi])

  const handleChange = useCallback(
    (_elements: readonly OrderedExcalidrawElement[], appState: AppState) => {
      const nextZoom = Math.round(appState.zoom.value * 100)
      setZoomPercent((prev) => (prev === nextZoom ? prev : nextZoom))
    },
    [],
  )

  const zoomIn = useCallback(() => {
    withApi((api) => {
      const zoom = api.getAppState().zoom.value
      api.updateScene({ appState: { zoom: { value: (zoom * 1.1) as never } } })
    })
  }, [withApi])

  const zoomOut = useCallback(() => {
    withApi((api) => {
      const zoom = api.getAppState().zoom.value
      api.updateScene({ appState: { zoom: { value: (zoom / 1.1) as never } } })
    })
  }, [withApi])

  const zoomReset = useCallback(() => {
    withApi((api) => {
      api.updateScene({ appState: { zoom: { value: 1 as never } } })
    })
  }, [withApi])

  const zoomFit = useCallback(() => {
    withApi((api) => {
      api.scrollToContent(undefined, { fitToContent: true })
    })
  }, [withApi])

  const openFullscreen = useCallback(() => {
    setFullscreenRevision((value) => value + 1)
    setFullscreenOpen(true)
  }, [])

  if (!sceneJson.trim()) {
    return (
      <div className={['theme-draw-canvas', 'theme-draw-canvas--headless', className].filter(Boolean).join(' ')}>
        <p className="type-caption type-muted p-3">Paste Excalidraw JSON to preview.</p>
      </div>
    )
  }

  if (!parseExcalidrawScene(sceneJson)) {
    return (
      <div
        className={[
          'theme-draw-canvas',
          'theme-draw-canvas--headless',
          'theme-draw-canvas--headless-error',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <p className="type-caption p-3">Invalid Excalidraw JSON — expected an object with an elements array.</p>
      </div>
    )
  }

  return (
    <>
      <div className={['theme-draw-canvas', 'theme-draw-canvas--headless', className].filter(Boolean).join(' ')}>
        <div className="theme-draw-canvas__stage">
          <div className="theme-draw-canvas__excalidraw">
            <Excalidraw
              initialData={initialData}
              viewModeEnabled
              zenModeEnabled
              theme={excalidrawTheme}
              UIOptions={HEADLESS_UI_OPTIONS}
              excalidrawAPI={handleApi}
              onChange={handleChange}
            />
          </div>
          {showZoomOverlay ? (
            <div className="theme-draw-canvas__doc-zoom">
              <CanvasZoomMenu
                zoomLabel={`${zoomPercent}%`}
                onZoomOut={zoomOut}
                onZoomReset={zoomReset}
                onZoomIn={zoomIn}
                onZoomFit={zoomFit}
                onExpandFullscreen={allowFullscreenExpand ? openFullscreen : undefined}
              />
            </div>
          ) : null}
        </div>
      </div>

      <CanvasFullscreenModal
        open={fullscreenOpen}
        title={fullscreenTitle}
        onClose={() => setFullscreenOpen(false)}
      >
        <DrawCanvasHeadless
          sceneJson={sceneJson}
          showZoomOverlay
          allowFullscreenExpand={false}
          fullscreenTitle={fullscreenTitle}
          viewportRevision={fullscreenRevision}
        />
      </CanvasFullscreenModal>
    </>
  )
}
