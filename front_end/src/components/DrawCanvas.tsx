import { CaptureUpdateAction, Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types'
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import {
  clearDrawScene,
  dispatchDrawShortcut,
  exportDrawPng,
  redoDrawScene,
  undoDrawScene,
  exportDrawSvg,
  loadDrawSceneFromFile,
  loadDrawSceneJson,
  saveDrawSceneJson,
  serializeDrawScene,
} from '../lib/drawCanvas/fileActions'
import { listPresentationFrameIds } from '../lib/drawCanvas/presentation'
import { showDrawPropsPanel } from '../lib/drawCanvas/showPropsPanel'
import { type DrawToolId } from '../lib/drawCanvas/tools'
import { isDarkPalette, useThemeColor } from '../lib/theme'
import { Button } from './Button'
import { ColorSelector, cssColorToHex } from './ColorSelector'
import { Modal } from './Modal'
import { DrawCanvasContextMenu, type DrawContextItem } from './drawCanvasParts/DrawCanvasContextMenu'
import { DrawCanvasExportModals } from './drawCanvasParts/DrawCanvasExportModals'
import type { DrawCanvasFileAction } from './drawCanvasParts/DrawCanvasFileMenu'
import { DrawCanvasFooter } from './drawCanvasParts/DrawCanvasFooter'
import { DrawCanvasHelpModal } from './drawCanvasParts/DrawCanvasHelpModal'
import type {
  DrawArrowhead,
  DrawArrowType,
  DrawPropsSnapshot,
} from './drawCanvasParts/DrawCanvasFormatRibbon'
import { DrawCanvasLinkEditor } from './drawCanvasParts/DrawCanvasLinkEditor'
import { DrawCanvasSearch } from './drawCanvasParts/DrawCanvasSearch'
import { DrawCanvasToolbar } from './drawCanvasParts/DrawCanvasToolbar'
import { DrawCanvasHeadless } from './drawCanvasParts/DrawCanvasHeadless'
import { DrawCanvasPresentationNav } from './drawCanvasParts/DrawCanvasPresentationTray'
import { DEFAULT_DRAW_PREFS, type DrawCanvasPrefs } from '../lib/drawCanvas/prefs'
import { CanvasFullscreenModal } from './rendererParts/CanvasFullscreenModal'
import { downloadExportedContext } from '../lib/editorContext/importExportManager'
import type { DrawEditorPayload, EditorRuntimeHandle } from '../lib/editorContext/types'

type DrawCanvasProps = {
  className?: string
  initialTitle?: string
  autoFocus?: boolean
  /** Read-only scene preview — no docked chrome (DocEditor embeds). */
  headless?: boolean
  sceneJson?: string
  /** PNG and SVG leave the background clear. */
  clearExport?: boolean
}

export type DrawCanvasHandle = EditorRuntimeHandle & {
  exportClear: (format: 'png' | 'svg') => void
}

type ModalKind =
  | 'help'
  | 'search'
  | 'export-image'
  | 'export-json'
  | 'clear'
  | 'canvas-bg'
  | 'link'
  | null

const DEFAULT_SNAPSHOT: DrawPropsSnapshot = {
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'hachure',
  strokeWidth: 1,
  strokeStyle: 'solid',
  roughness: 1,
  opacity: 100,
  fontSize: 20,
  textAlign: 'left',
  arrowType: 'sharp',
  endArrowhead: 'arrow',
  activeTool: 'selection',
  selectedCount: 0,
  hasText: false,
  hasArrow: false,
  hasFreedraw: false,
  hasImage: false,
  hasLinear: false,
}

function resolveArrowType(
  el: OrderedExcalidrawElement | undefined,
  appState: AppState,
): DrawArrowType {
  if (el && el.type === 'arrow') {
    if ('elbowed' in el && el.elbowed) return 'elbow'
    if (el.roundness) return 'round'
    return 'sharp'
  }
  const fromApp = appState.currentItemArrowType
  if (fromApp === 'round' || fromApp === 'elbow' || fromApp === 'sharp') return fromApp
  return 'sharp'
}

function resolveEndArrowhead(
  el: OrderedExcalidrawElement | undefined,
  appState: AppState,
): DrawArrowhead {
  if (el && (el.type === 'arrow' || el.type === 'line') && 'endArrowhead' in el) {
    return el.endArrowhead ? 'arrow' : 'none'
  }
  return appState.currentItemEndArrowhead ? 'arrow' : 'none'
}

function selectedElements(
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
): OrderedExcalidrawElement[] {
  return elements.filter((el) => !el.isDeleted && appState.selectedElementIds[el.id])
}

function buildSnapshot(
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
): DrawPropsSnapshot {
  const selected = selectedElements(elements, appState)
  const first = selected[0]
  return {
    strokeColor: first && 'strokeColor' in first ? String(first.strokeColor) : appState.currentItemStrokeColor,
    backgroundColor:
      first && 'backgroundColor' in first
        ? String(first.backgroundColor)
        : appState.currentItemBackgroundColor,
    fillStyle: first && 'fillStyle' in first ? String(first.fillStyle) : appState.currentItemFillStyle,
    strokeWidth: first && 'strokeWidth' in first ? Number(first.strokeWidth) : appState.currentItemStrokeWidth,
    strokeStyle:
      first && 'strokeStyle' in first ? String(first.strokeStyle) : appState.currentItemStrokeStyle,
    roughness: first && 'roughness' in first ? Number(first.roughness) : appState.currentItemRoughness,
    opacity: first && 'opacity' in first ? Number(first.opacity) : appState.currentItemOpacity,
    fontSize: first && 'fontSize' in first ? Number(first.fontSize) : appState.currentItemFontSize,
    textAlign: first && 'textAlign' in first ? String(first.textAlign) : appState.currentItemTextAlign,
    arrowType: resolveArrowType(first, appState),
    endArrowhead: resolveEndArrowhead(first, appState),
    activeTool: appState.activeTool.type,
    selectedCount: selected.length,
    hasText: selected.some((el) => el.type === 'text'),
    hasArrow: selected.some((el) => el.type === 'arrow'),
    hasFreedraw: selected.some((el) => el.type === 'freedraw'),
    hasImage: selected.some((el) => el.type === 'image'),
    hasLinear: selected.some((el) => el.type === 'line' || el.type === 'arrow'),
  }
}

function toolHint(tool: string): string {
  switch (tool) {
    case 'selection':
      return 'Drag to select · arrow keys nudge · bind arrows to boxes for auto flowcharts'
    case 'freedraw':
      return 'Draw freely · hold Alt while erasing to restore'
    case 'text':
      return 'Click to place text · Ctrl+K for hyperlink'
    case 'hand':
      return 'Pan the canvas · Space+drag also pans'
    case 'eraser':
      return 'Erase strokes · Alt reverts'
    case 'arrow':
      return 'Drag from a shape edge to bind · elbow arrows for flowcharts · Ctrl+Arrow to nudge'
    case 'line':
      return 'Click-drag a line · bind ends to shapes for diagrams'
    case 'rectangle':
    case 'diamond':
    case 'ellipse':
      return 'Click-drag to draw · connect with arrows for flowcharts · hold Shift for constraints'
    case 'frame':
      return 'Frame groups a region · useful for slides and export crops'
    case 'embeddable':
      return 'Place an embed frame · paste a URL when prompted'
    case 'image':
      return 'Insert an image · drag to reposition · crop from the format ribbon when selected'
    default:
      return 'Click and drag on the canvas to create · tips update per tool'
  }
}

function snapshotsEqual(a: DrawPropsSnapshot, b: DrawPropsSnapshot): boolean {
  return (
    a.strokeColor === b.strokeColor &&
    a.backgroundColor === b.backgroundColor &&
    a.fillStyle === b.fillStyle &&
    a.strokeWidth === b.strokeWidth &&
    a.strokeStyle === b.strokeStyle &&
    a.roughness === b.roughness &&
    a.opacity === b.opacity &&
    a.fontSize === b.fontSize &&
    a.textAlign === b.textAlign &&
    a.arrowType === b.arrowType &&
    a.endArrowhead === b.endArrowhead &&
    a.activeTool === b.activeTool &&
    a.selectedCount === b.selectedCount &&
    a.hasText === b.hasText &&
    a.hasArrow === b.hasArrow &&
    a.hasFreedraw === b.hasFreedraw &&
    a.hasImage === b.hasImage &&
    a.hasLinear === b.hasLinear
  )
}

const DRAW_UI_OPTIONS = {
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

/** Thin stroke (1) for pen / shapes — Excalidraw default is often bold. */
const DRAW_INITIAL_DATA = {
  appState: {
    currentItemStrokeWidth: 1,
  },
} as const

export const DrawCanvas = forwardRef<DrawCanvasHandle, DrawCanvasProps>(function DrawCanvas(
  {
    className = '',
    initialTitle = 'Untitled drawing',
    autoFocus = false,
    headless = false,
    sceneJson = '',
    clearExport = false,
  },
  ref,
) {
  if (headless) {
    return <DrawCanvasHeadless sceneJson={sceneJson} className={className} />
  }

  return (
    <DrawCanvasWorkbench
      ref={ref}
      className={className}
      initialTitle={initialTitle}
      autoFocus={autoFocus}
      clearExport={clearExport}
    />
  )
})

const DrawCanvasWorkbench = forwardRef<DrawCanvasHandle, Omit<DrawCanvasProps, 'headless' | 'sceneJson'>>(
  function DrawCanvasWorkbench(
  {
    className = '',
    initialTitle = 'Untitled drawing',
    autoFocus = false,
    clearExport = false,
  },
  ref,
) {
  const { paletteId } = useThemeColor()
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(initialTitle)
  const [prefs, setPrefs] = useState<DrawCanvasPrefs>(DEFAULT_DRAW_PREFS)
  const [activeTool, setActiveTool] = useState('selection')
  const [snapshot, setSnapshot] = useState<DrawPropsSnapshot>(DEFAULT_SNAPSHOT)
  const [zoomPercent, setZoomPercent] = useState(100)
  const [scrolledOutside, setScrolledOutside] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalKind>(null)
  const [canvasBg, setCanvasBg] = useState('#ffffff')
  const [linkUrl, setLinkUrl] = useState('')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [fullscreenScene, setFullscreenScene] = useState('')
  const [fullscreenRevision, setFullscreenRevision] = useState(0)
  const [presentationFrameIndex, setPresentationFrameIndex] = useState(0)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    items: DrawContextItem[]
  } | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const withApi = useCallback((fn: (api: ExcalidrawImperativeAPI) => void) => {
    const api = apiRef.current
    if (api) fn(api)
  }, [])

  const runtimeHandle = useMemo<DrawCanvasHandle>(
    () => ({
      getContext: () => {
        const api = apiRef.current
        if (!api) return { scene: null } satisfies DrawEditorPayload
        return { scene: JSON.parse(serializeDrawScene(api)) }
      },
      loadContext: async (payload) => {
        const api = apiRef.current
        if (!api) return
        const drawPayload = payload as DrawEditorPayload & { mermaid?: string; meta?: Record<string, unknown> }
        if (drawPayload.mermaid) {
          await loadDrawSceneJson(api, drawPayload)
          return
        }
        await loadDrawSceneJson(api, drawPayload.scene ?? payload)
      },
      exportClear: (format: 'png' | 'svg') => {
        const api = apiRef.current
        if (!api) return
        if (format === 'png') void exportDrawPng(api, { withBackground: false })
        else void exportDrawSvg(api, { withBackground: false })
      },
    }),
    [],
  )

  useImperativeHandle(ref, () => runtimeHandle, [runtimeHandle])

  const handleSave = useCallback(() => {
    withApi((api) => saveDrawSceneJson(api, title || 'drawing'))
    showToast('Saved .excalidraw')
  }, [title, withApi, showToast])

  const handleExport = useCallback(
    (formatId: string) => {
      if (formatId === 'png') {
        withApi((api) => void exportDrawPng(api, { withBackground: !clearExport }))
        return
      }
      if (formatId === 'svg') {
        withApi((api) => void exportDrawSvg(api, { withBackground: !clearExport }))
        return
      }
      if (formatId === 'export-image') {
        setModal('export-image')
        return
      }
      downloadExportedContext('draw', runtimeHandle, formatId as 'excalidraw', title)
    },
    [runtimeHandle, title, withApi, clearExport],
  )

  const handleRefresh = useCallback(() => {
    withApi((api) => clearDrawScene(api))
    setTitle(initialTitle)
  }, [initialTitle, withApi])

  const handleExpandFullscreen = useCallback(() => {
    const api = apiRef.current
    if (!api) return
    setFullscreenScene(serializeDrawScene(api))
    setFullscreenRevision((value) => value + 1)
    setPresentationFrameIndex(0)
    setFullscreenOpen(true)
  }, [])

  const presentationFrameCount = useMemo(
    () => listPresentationFrameIds(fullscreenScene).length,
    [fullscreenScene],
  )

  const closeFullscreen = useCallback(() => {
    setFullscreenOpen(false)
    setPresentationFrameIndex(0)
  }, [])

  useEffect(() => {
    if (!fullscreenOpen || presentationFrameCount === 0) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        setPresentationFrameIndex((value) => Math.min(presentationFrameCount - 1, value + 1))
        return
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        setPresentationFrameIndex((value) => Math.max(0, value - 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreenOpen, presentationFrameCount])

  const excalidrawTheme = isDarkPalette(paletteId) ? 'dark' : 'light'

  const formatOpen = showDrawPropsPanel(
    snapshot.activeTool,
    snapshot.selectedCount,
    prefs.viewModeEnabled,
  )

  const focusHost = useCallback(() => {
    const host = stageRef.current?.querySelector('.excalidraw') as HTMLElement | null
    host?.focus()
    return host
  }, [])

  const runShortcut = useCallback(
    (key: string, mods?: { ctrl?: boolean; shift?: boolean; alt?: boolean }) => {
      dispatchDrawShortcut(focusHost(), key, mods)
    },
    [focusHost],
  )

  const patchSelected = useCallback(
    (patch: Record<string, unknown>, appStatePatch?: Record<string, unknown>) => {
      withApi((api) => {
        const appState = api.getAppState()
        const elements = api.getSceneElements()
        const next = elements.map((el) => {
          if (!appState.selectedElementIds[el.id] || el.isDeleted) return el
          return { ...el, ...patch }
        })
        api.updateScene({
          elements: next,
          appState: appStatePatch as AppState | undefined,
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        })
      })
    },
    [withApi],
  )

  const handleExcalidrawApi = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api
  }, [])

  const renderTopRightUI = useCallback(() => null, [])

  const onChange = useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState, _files: BinaryFiles) => {
      const nextTool = appState.activeTool.type
      setActiveTool((prev) => (prev === nextTool ? prev : nextTool))

      const nextSnapshot = buildSnapshot(elements, appState)
      setSnapshot((prev) => (snapshotsEqual(prev, nextSnapshot) ? prev : nextSnapshot))

      const nextZoom = Math.round(appState.zoom.value * 100)
      setZoomPercent((prev) => (prev === nextZoom ? prev : nextZoom))

      const nextOutside = Boolean(appState.scrolledOutside)
      setScrolledOutside((prev) => (prev === nextOutside ? prev : nextOutside))

      const nextBg = appState.viewBackgroundColor || '#ffffff'
      setCanvasBg((prev) => (prev === nextBg ? prev : nextBg))

      const selected = elements.filter((el) => !el.isDeleted && appState.selectedElementIds[el.id])
      const firstLink =
        selected[0] && 'link' in selected[0]
          ? String((selected[0] as { link?: string | null }).link ?? '')
          : ''
      setLinkUrl((prev) => (prev === firstLink ? prev : firstLink))

      // Mirror Excalidraw appState into chrome only — do NOT feed these back as
      // controlled Excalidraw props (that loops through zustand → onChange → setState).
      setPrefs((prev) => {
        const next = {
          ...prev,
          toolLocked: appState.activeTool.locked,
          objectsSnapModeEnabled: appState.objectsSnapModeEnabled,
          gridModeEnabled: appState.gridSize != null,
          zenModeEnabled: appState.zenModeEnabled,
          viewModeEnabled: appState.viewModeEnabled,
          isBindingEnabled: appState.isBindingEnabled,
        }
        if (
          next.toolLocked === prev.toolLocked &&
          next.objectsSnapModeEnabled === prev.objectsSnapModeEnabled &&
          next.gridModeEnabled === prev.gridModeEnabled &&
          next.zenModeEnabled === prev.zenModeEnabled &&
          next.viewModeEnabled === prev.viewModeEnabled &&
          next.isBindingEnabled === prev.isBindingEnabled
        ) {
          return prev
        }
        return next
      })
    },
    [],
  )

  const handleToolSelect = useCallback(
    (id: DrawToolId) => {
      withApi((api) => {
        api.setActiveTool({ type: id })
      })
      setActiveTool(id)
    },
    [withApi],
  )

  const handleFileAction = useCallback(
    (id: DrawCanvasFileAction) => {
      switch (id) {
        case 'load':
          fileInputRef.current?.click()
          break
        case 'save':
          handleSave()
          break
        case 'export-json':
          handleExport('excalidraw')
          break
        case 'export-image':
          handleExport('export-image')
          break
        case 'find':
          setModal('search')
          break
        case 'help':
          setModal('help')
          break
        case 'clear':
          setModal('clear')
          break
        case 'canvas-bg':
          setModal('canvas-bg')
          break
        case 'pref-box-contain':
          setPrefs((p) => ({ ...p, boxSelectionMode: 'contain' }))
          break
        case 'pref-box-overlap':
          setPrefs((p) => ({ ...p, boxSelectionMode: 'overlap' }))
          break
        case 'pref-tool-lock':
          withApi((api) => {
            const state = api.getAppState()
            const locked = !state.activeTool.locked
            api.setActiveTool({ ...state.activeTool, locked })
          })
          break
        case 'pref-snap':
          setPrefs((p) => {
            const next = !p.objectsSnapModeEnabled
            withApi((api) => api.updateScene({ appState: { objectsSnapModeEnabled: next } }))
            return { ...p, objectsSnapModeEnabled: next }
          })
          break
        case 'pref-grid':
          setPrefs((p) => {
            const next = !p.gridModeEnabled
            withApi((api) =>
              api.updateScene({
                appState: { gridSize: next ? 20 : null } as AppState,
              }),
            )
            return { ...p, gridModeEnabled: next }
          })
          break
        case 'pref-zen':
          setPrefs((p) => {
            const next = !p.zenModeEnabled
            withApi((api) => api.updateScene({ appState: { zenModeEnabled: next } }))
            return { ...p, zenModeEnabled: next }
          })
          break
        case 'pref-view':
          setPrefs((p) => {
            const next = !p.viewModeEnabled
            withApi((api) => api.updateScene({ appState: { viewModeEnabled: next } }))
            return { ...p, viewModeEnabled: next }
          })
          break
        case 'pref-stats':
          setPrefs((p) => ({ ...p, statsOpen: !p.statsOpen }))
          showToast('Stats panel deferred — toggle stored')
          break
        case 'pref-binding':
          setPrefs((p) => {
            const next = !p.isBindingEnabled
            withApi((api) => api.updateScene({ appState: { isBindingEnabled: next } }))
            return { ...p, isBindingEnabled: next }
          })
          break
        case 'pref-midpoint':
          setPrefs((p) => ({ ...p, objectsSnapMidpoints: !p.objectsSnapMidpoints }))
          break
        default:
          break
      }
    },
    [handleExport, handleSave, showToast, withApi],
  )

  const contextItems = useMemo((): DrawContextItem[] => {
    if (snapshot.selectedCount > 0) {
      return [
        { type: 'item', id: 'cut', label: 'Cut' },
        { type: 'item', id: 'copy', label: 'Copy' },
        { type: 'item', id: 'paste', label: 'Paste' },
        { type: 'sep' },
        { type: 'item', id: 'duplicate', label: 'Duplicate' },
        { type: 'item', id: 'delete', label: 'Delete' },
        { type: 'sep' },
        { type: 'item', id: 'group', label: 'Group' },
        { type: 'item', id: 'ungroup', label: 'Ungroup' },
        { type: 'item', id: 'flip-h', label: 'Flip horizontal' },
        { type: 'item', id: 'flip-v', label: 'Flip vertical' },
        { type: 'item', id: 'lock', label: 'Lock' },
        { type: 'item', id: 'link', label: 'Hyperlink' },
        { type: 'sep' },
        { type: 'item', id: 'bring-front', label: 'Bring to front' },
        { type: 'item', id: 'send-back', label: 'Send to back' },
        { type: 'item', id: 'copy-png', label: 'Copy as PNG' },
        { type: 'item', id: 'copy-svg', label: 'Copy as SVG' },
      ]
    }
    return [
      { type: 'item', id: 'paste', label: 'Paste' },
      { type: 'item', id: 'select-all', label: 'Select all' },
      { type: 'sep' },
      { type: 'item', id: 'grid', label: prefs.gridModeEnabled ? 'Hide grid' : 'Show grid' },
      { type: 'item', id: 'snap', label: prefs.objectsSnapModeEnabled ? 'Disable snap' : 'Enable snap' },
      { type: 'item', id: 'zen', label: prefs.zenModeEnabled ? 'Exit zen' : 'Zen mode' },
      { type: 'item', id: 'view', label: prefs.viewModeEnabled ? 'Exit view mode' : 'View mode' },
      { type: 'item', id: 'unlock-all', label: 'Unlock all' },
    ]
  }, [prefs, snapshot.selectedCount])

  const handleContextSelect = useCallback(
    (id: string) => {
      switch (id) {
        case 'cut':
          runShortcut('x', { ctrl: true })
          break
        case 'copy':
          runShortcut('c', { ctrl: true })
          break
        case 'paste':
          runShortcut('v', { ctrl: true })
          break
        case 'duplicate':
          runShortcut('d', { ctrl: true })
          break
        case 'delete':
          runShortcut('Delete')
          break
        case 'select-all':
          runShortcut('a', { ctrl: true })
          break
        case 'group':
          runShortcut('g', { ctrl: true })
          break
        case 'ungroup':
          runShortcut('g', { ctrl: true, shift: true })
          break
        case 'flip-h':
          runShortcut('h', { shift: true })
          break
        case 'flip-v':
          runShortcut('v', { shift: true })
          break
        case 'lock':
          runShortcut('l', { ctrl: true, shift: true })
          break
        case 'link':
          setModal('link')
          break
        case 'bring-front':
          runShortcut(']', { ctrl: true, alt: true })
          break
        case 'send-back':
          runShortcut('[', { ctrl: true, alt: true })
          break
        case 'copy-png':
        case 'copy-svg':
          showToast('Use Export image for PNG/SVG download')
          break
        case 'grid':
          handleFileAction('pref-grid')
          break
        case 'snap':
          handleFileAction('pref-snap')
          break
        case 'zen':
          handleFileAction('pref-zen')
          break
        case 'view':
          handleFileAction('pref-view')
          break
        case 'unlock-all':
          runShortcut('l', { ctrl: true, shift: true })
          break
        default:
          break
      }
    },
    [handleFileAction, runShortcut, showToast],
  )

  useEffect(() => {
    if (!autoFocus) return
    window.requestAnimationFrame(() => focusHost())
  }, [autoFocus, focusHost])

  return (
    <div className={['theme-draw-canvas', className].filter(Boolean).join(' ')}>
      <DrawCanvasToolbar
        title={title}
        onTitleChange={setTitle}
        activeTool={activeTool}
        onToolSelect={handleToolSelect}
        onUndo={() => undoDrawScene(focusHost())}
        onRedo={() => redoDrawScene(focusHost())}
        toolLocked={prefs.toolLocked}
        onToggleToolLock={() => handleFileAction('pref-tool-lock')}
        onFileAction={handleFileAction}
        onSave={handleSave}
        onExport={handleExport}
        onRefresh={handleRefresh}
        prefs={prefs}
        hint={toolHint(activeTool)}
        formatOpen={formatOpen}
        formatProps={{
          snapshot,
          onStrokeColor: (hex) => {
            patchSelected({ strokeColor: hex }, { currentItemStrokeColor: hex })
          },
          onBackgroundColor: (hex) => {
            patchSelected({ backgroundColor: hex }, { currentItemBackgroundColor: hex })
          },
          onFillStyle: (style) => {
            patchSelected({ fillStyle: style }, { currentItemFillStyle: style })
          },
          onStrokeWidth: (width) => {
            patchSelected({ strokeWidth: width }, { currentItemStrokeWidth: width })
          },
          onStrokeStyle: (style) => {
            patchSelected({ strokeStyle: style }, { currentItemStrokeStyle: style })
          },
          onRoughness: (value) => {
            patchSelected({ roughness: value }, { currentItemRoughness: value })
          },
          onOpacity: (value) => {
            patchSelected({ opacity: value }, { currentItemOpacity: value })
          },
          onFontSize: (size) => {
            patchSelected({ fontSize: size }, { currentItemFontSize: size })
          },
          onTextAlign: (align) => {
            patchSelected({ textAlign: align }, { currentItemTextAlign: align })
          },
          onArrowType: (type: DrawArrowType) => {
            withApi((api) => {
              const appState = api.getAppState()
              const elements = api.getSceneElements()
              const next = elements.map((el) => {
                if (!appState.selectedElementIds[el.id] || el.isDeleted || el.type !== 'arrow') {
                  return el
                }
                if (type === 'elbow') {
                  return { ...el, elbowed: true, roundness: null }
                }
                if (type === 'round') {
                  return {
                    ...el,
                    elbowed: false,
                    roundness: { type: 3 },
                  }
                }
                return { ...el, elbowed: false, roundness: null }
              })
              api.updateScene({
                elements: next as readonly OrderedExcalidrawElement[],
                appState: { currentItemArrowType: type },
                captureUpdate: CaptureUpdateAction.IMMEDIATELY,
              })
            })
          },
          onArrowhead: (head: DrawArrowhead) => {
            const value = head === 'none' ? null : 'arrow'
            patchSelected(
              { endArrowhead: value },
              { currentItemEndArrowhead: value },
            )
          },
          onDuplicate: () => runShortcut('d', { ctrl: true }),
          onDelete: () => runShortcut('Delete'),
          onGroup: () => runShortcut('g', { ctrl: true }),
          onUngroup: () => runShortcut('g', { ctrl: true, shift: true }),
          onBringForward: () => runShortcut(']', { ctrl: true }),
          onSendBackward: () => runShortcut('[', { ctrl: true }),
          onBringToFront: () => runShortcut(']', { ctrl: true, alt: true }),
          onSendToBack: () => runShortcut('[', { ctrl: true, alt: true }),
          onHyperlink: () => setModal('link'),
          onAlign: () => showToast('Align via Excalidraw shortcuts (Ctrl+Shift+arrows)'),
        }}
      />

      <div className="theme-draw-canvas__body">
        <div
          ref={stageRef}
          className="theme-draw-canvas__stage"
          onContextMenu={(e) => {
            e.preventDefault()
            setContextMenu({ x: e.clientX, y: e.clientY, items: contextItems })
          }}
        >
          <div className="theme-draw-canvas__excalidraw">
            <Excalidraw
              excalidrawAPI={handleExcalidrawApi}
              onChange={onChange}
              theme={excalidrawTheme}
              name={title}
              aiEnabled={false}
              handleKeyboardGlobally
              UIOptions={DRAW_UI_OPTIONS}
              renderTopRightUI={renderTopRightUI}
              initialData={DRAW_INITIAL_DATA}
            />
          </div>

          {scrolledOutside ? (
            <div className="theme-draw-canvas__scroll-back">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => withApi((api) => api.scrollToContent(undefined, { fitToContent: true }))}
              >
                Scroll back to content
              </Button>
            </div>
          ) : null}

          {toast ? <div className="theme-draw-canvas__toast">{toast}</div> : null}

          <DrawCanvasHelpModal open={modal === 'help'} onClose={() => setModal(null)} />
          <DrawCanvasSearch
            open={modal === 'search'}
            onClose={() => setModal(null)}
            api={apiRef.current}
          />
          <DrawCanvasExportModals
            imageOpen={modal === 'export-image'}
            jsonOpen={modal === 'export-json'}
            clearExport={clearExport}
            onCloseImage={() => setModal(null)}
            onCloseJson={() => setModal(null)}
            onExportPng={(opts) =>
              withApi(async (api) => {
                await exportDrawPng(api, opts)
                showToast('PNG downloaded')
              })
            }
            onExportSvg={(opts) =>
              withApi(async (api) => {
                await exportDrawSvg(api, opts)
                showToast('SVG downloaded')
              })
            }
            onExportJson={() =>
              withApi((api) => {
                saveDrawSceneJson(api, title || 'drawing')
                showToast('Scene exported')
              })
            }
          />
          <Modal
            open={modal === 'clear'}
            title="Clear canvas"
            onClose={() => setModal(null)}
            placement="container"
            size="sm"
            onConfirm={() => {
              withApi(clearDrawScene)
              setModal(null)
              showToast('Canvas cleared')
            }}
            confirmLabel="Clear"
          >
            <p className="type-body-sm type-muted">This removes all elements from the scene.</p>
          </Modal>
          <Modal
            open={modal === 'canvas-bg'}
            title="Canvas background"
            onClose={() => setModal(null)}
            placement="container"
            size="sm"
            onConfirm={() => {
              withApi((api) =>
                api.updateScene({
                  appState: { viewBackgroundColor: canvasBg },
                  captureUpdate: CaptureUpdateAction.IMMEDIATELY,
                }),
              )
              setModal(null)
            }}
            confirmLabel="Apply"
          >
            <ColorSelector
              className="theme-color-selector--popover"
              value={cssColorToHex(canvasBg === 'transparent' ? '#ffffff' : canvasBg)}
              onChange={setCanvasBg}
            />
          </Modal>
          <DrawCanvasLinkEditor
            open={modal === 'link'}
            initialUrl={linkUrl}
            onClose={() => setModal(null)}
            onApply={(url) => {
              patchSelected({ link: url || null })
              showToast(url ? 'Link applied' : 'Link cleared')
            }}
          />
        </div>
      </div>

      <DrawCanvasFooter
        zoomPercent={zoomPercent}
        onZoomIn={() => runShortcut('=', { ctrl: true })}
        onZoomOut={() => runShortcut('-', { ctrl: true })}
        onZoomReset={() => runShortcut('0', { ctrl: true })}
        onZoomFit={() => withApi((api) => api.scrollToContent(undefined, { fitToContent: true }))}
        onExpandFullscreen={handleExpandFullscreen}
        onHelp={() => setModal('help')}
        zenModeEnabled={prefs.zenModeEnabled}
        viewModeEnabled={prefs.viewModeEnabled}
        onExitZen={() => handleFileAction('pref-zen')}
        onExitView={() => handleFileAction('pref-view')}
      />

      <DrawCanvasContextMenu
        open={Boolean(contextMenu)}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        items={contextMenu?.items ?? []}
        onSelect={handleContextSelect}
        onClose={() => setContextMenu(null)}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".excalidraw,application/json"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          try {
            await loadDrawSceneFromFile(apiRef.current!, file)
            showToast('Scene loaded')
          } catch {
            showToast('Failed to load scene')
          }
        }}
      />
      <CanvasFullscreenModal
        open={fullscreenOpen}
        title={title}
        onClose={closeFullscreen}
        headerActions={
          presentationFrameCount > 0 ? (
            <DrawCanvasPresentationNav
              frameIndex={presentationFrameIndex}
              frameCount={presentationFrameCount}
              onPrev={() => setPresentationFrameIndex((value) => Math.max(0, value - 1))}
              onNext={() =>
                setPresentationFrameIndex((value) =>
                  Math.min(presentationFrameCount - 1, value + 1),
                )
              }
            />
          ) : undefined
        }
      >
        <DrawCanvasHeadless
          sceneJson={fullscreenScene}
          showZoomOverlay
          presentationFrameIndex={
            presentationFrameCount > 0 ? presentationFrameIndex : undefined
          }
          allowFullscreenExpand={false}
          fullscreenTitle={title}
          viewportRevision={fullscreenRevision}
        />
      </CanvasFullscreenModal>
    </div>
  )
})
