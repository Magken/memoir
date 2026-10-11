import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import { loadPdfDocumentTask, type PdfSource } from '../lib/docs/pdfDocument'
import {
  collectPdfDocumentInfo,
  type PdfDocumentInfo,
} from '../lib/docs/pdfDocumentInfo'
import { PdfTextLayerController } from '../lib/docs/pdfTextLayer'
import { PdfFindBridge } from '../lib/docs/pdfFindBridge'

type OptionalContentConfig = Awaited<
  ReturnType<PDFDocumentProxy['getOptionalContentConfig']>
>

export type PdfFitMode = 'width' | 'page' | 'custom'

const MIN_SCALE = 0.15
const MAX_SCALE = 5
const ZOOM_STEP = 1.25
const STAGE_PAD_X = 24
const STAGE_PAD_Y = 20
const MAX_OUTPUT_PIXEL_RATIO = 3

function outputPixelRatio(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(Math.max(1, window.devicePixelRatio || 1), MAX_OUTPUT_PIXEL_RATIO)
}

function applyCanvasLayoutSize(canvas: HTMLCanvasElement, width: number, height: number) {
  const layoutW = Math.floor(width)
  const layoutH = Math.floor(height)
  canvas.style.width = `${layoutW}px`
  canvas.style.height = `${layoutH}px`
}

type UsePdfViewerOptions = {
  initialPage?: number
  scrollRootRef?: RefObject<HTMLElement | null>
  layerRevision?: number
  getOptionalContentConfig?: () => OptionalContentConfig | null
}

function getScrollViewport(root: HTMLElement | null | undefined): HTMLElement | null {
  return root?.querySelector('.theme-pdf-viewer__scroll-card .theme-scroll__viewport') ?? null
}

function isRenderCancelled(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return message.includes('cancel') || message.includes('abort')
}

function resolveRenderScale(
  pdfPage: PDFPageProxy,
  fitMode: PdfFitMode,
  customScale: number,
  viewportEl: HTMLElement | null,
  stageEl: HTMLElement | null,
): number {
  const base = pdfPage.getViewport({ scale: 1 })
  const measureW = Math.max(1, (viewportEl ?? stageEl)?.clientWidth ?? 1)
  const measureH = Math.max(1, viewportEl?.clientHeight ?? stageEl?.clientHeight ?? 1)
  const availW = Math.max(1, measureW - STAGE_PAD_X)
  const availH = Math.max(1, measureH - STAGE_PAD_Y)

  if (fitMode === 'width') {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, availW / base.width))
  }
  if (fitMode === 'page') {
    const widthScale = availW / base.width
    const heightScale = availH / base.height
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(widthScale, heightScale)))
  }
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, customScale))
}

export function usePdfViewer(source: PdfSource, options: UsePdfViewerOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pageSheetRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<PDFDocumentProxy | null>(null)
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const textLayerRef = useRef(new PdfTextLayerController())
  const findBridgeRef = useRef(new PdfFindBridge())
  const renderGenerationRef = useRef(0)
  const renderScaleRef = useRef(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(options.initialPage ?? 1)
  const [pageCount, setPageCount] = useState(0)
  const [customScale, setCustomScale] = useState(1)
  const [fitMode, setFitMode] = useState<PdfFitMode>('width')
  const [rendering, setRendering] = useState(false)
  const [documentInfo, setDocumentInfo] = useState<PdfDocumentInfo | null>(null)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [renderScale, setRenderScale] = useState(1)
  const [textLayerGeneration, setTextLayerGeneration] = useState(0)

  useEffect(() => {
    textLayerRef.current.setFindBridge(findBridgeRef.current)
  }, [])

  const cancelRenderTask = useCallback(() => {
    renderTaskRef.current?.cancel()
    renderTaskRef.current = null
  }, [])

  const destroyLoadingTask = useCallback(() => {
    const task = loadingTaskRef.current
    loadingTaskRef.current = null
    if (task) {
      void task.destroy()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setPage(1)
    setFitMode('width')
    setCustomScale(1)
    setDocumentInfo(null)
    setPdfDocument(null)
    cancelRenderTask()
    textLayerRef.current.cancel()
    renderGenerationRef.current += 1
    destroyLoadingTask()
    docRef.current = null

    loadPdfDocumentTask(source)
      .then(async ({ doc, task }) => {
        if (cancelled) {
          void task.destroy()
          return
        }
        loadingTaskRef.current = task
        docRef.current = doc
        setPdfDocument(doc)
        setPageCount(doc.numPages)
        const info = await collectPdfDocumentInfo(source, doc)
        if (!cancelled) {
          setDocumentInfo(info)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF')
          setPageCount(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      cancelRenderTask()
      textLayerRef.current.cancel()
      renderGenerationRef.current += 1
      docRef.current = null
      setDocumentInfo(null)
      setPdfDocument(null)
      destroyLoadingTask()
    }
  }, [cancelRenderTask, destroyLoadingTask, source])

  const renderPage = useCallback(async () => {
    const pdf = docRef.current
    const canvas = canvasRef.current
    const pageSheet = pageSheetRef.current
    const stage = stageRef.current
    if (!pdf || !canvas || !pageSheet || !stage || pageCount === 0) return

    const generation = ++renderGenerationRef.current
    cancelRenderTask()
    setRendering(true)

    try {
      const pdfPage = await pdf.getPage(page)
      if (generation !== renderGenerationRef.current) return

      const viewportEl = getScrollViewport(options.scrollRootRef?.current)
      const scale = resolveRenderScale(pdfPage, fitMode, customScale, viewportEl, stage)
      renderScaleRef.current = scale
      setRenderScale(scale)

      const viewport = pdfPage.getViewport({ scale })
      const pixelRatio = outputPixelRatio()

      canvas.width = Math.floor(viewport.width * pixelRatio)
      canvas.height = Math.floor(viewport.height * pixelRatio)
      applyCanvasLayoutSize(canvas, viewport.width, viewport.height)

      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) return

      const optionalContentConfig = options.getOptionalContentConfig?.() ?? null
      const task = pdfPage.render({
        canvasContext: ctx,
        viewport,
        canvas,
        transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
        ...(optionalContentConfig
          ? { optionalContentConfigPromise: Promise.resolve(optionalContentConfig) }
          : {}),
      })
      renderTaskRef.current = task
      await task.promise

      if (generation !== renderGenerationRef.current) return

      await textLayerRef.current.render(pdfPage, page, viewport, pageSheet)
      setTextLayerGeneration((value) => value + 1)

      viewportEl?.scrollTo({ top: 0, left: 0 })
    } catch (err: unknown) {
      if (generation !== renderGenerationRef.current || isRenderCancelled(err)) return
      setError(err instanceof Error ? err.message : 'Failed to render PDF page')
    } finally {
      if (generation === renderGenerationRef.current) {
        renderTaskRef.current = null
        setRendering(false)
      }
    }
  }, [
    cancelRenderTask,
    customScale,
    fitMode,
    options.getOptionalContentConfig,
    options.layerRevision,
    options.scrollRootRef,
    page,
    pageCount,
  ])

  useEffect(() => {
    if (loading || pageCount === 0) return
    void renderPage()
  }, [loading, pageCount, renderPage])

  useEffect(() => {
    const viewportEl = getScrollViewport(options.scrollRootRef?.current)
    const observeTarget = viewportEl ?? stageRef.current
    if (!observeTarget || fitMode === 'custom' || loading || pageCount === 0) return

    let timeoutId = 0
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        void renderPage()
      }, 80)
    })
    observer.observe(observeTarget)
    return () => {
      observer.disconnect()
      window.clearTimeout(timeoutId)
    }
  }, [fitMode, loading, options.scrollRootRef, pageCount, renderPage])

  useEffect(() => {
    return () => {
      cancelRenderTask()
      textLayerRef.current.cancel()
      renderGenerationRef.current += 1
    }
  }, [cancelRenderTask])

  const zoomIn = useCallback(() => {
    const current = fitMode === 'custom' ? customScale : renderScaleRef.current
    setCustomScale(Math.min(MAX_SCALE, current * ZOOM_STEP))
    setFitMode('custom')
  }, [customScale, fitMode])

  const zoomOut = useCallback(() => {
    const current = fitMode === 'custom' ? customScale : renderScaleRef.current
    setCustomScale(Math.max(MIN_SCALE, current / ZOOM_STEP))
    setFitMode('custom')
  }, [customScale, fitMode])

  const fitWidth = useCallback(() => setFitMode('width'), [])
  const fitPage = useCallback(() => setFitMode('page'), [])

  return {
    canvasRef,
    pageSheetRef,
    stageRef,
    loading,
    error,
    page,
    pageCount,
    customScale,
    fitMode,
    rendering,
    documentInfo,
    pdfDocument,
    renderScale,
    textLayerGeneration,
    textLayerController: textLayerRef.current,
    findBridge: findBridgeRef.current,
    setPage,
    zoomIn,
    zoomOut,
    fitWidth,
    fitPage,
  }
}

export function pdfZoomLabel(fitMode: PdfFitMode, customScale: number): string {
  if (fitMode === 'width') return 'Fit width'
  if (fitMode === 'page') return 'Fit page'
  return `${Math.round(customScale * 100)}%`
}
