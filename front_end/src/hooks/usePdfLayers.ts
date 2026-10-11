import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdfLayers, type PdfLayerEntry } from '../lib/docs/pdfLayers'

type OptionalContentConfig = Awaited<
  ReturnType<PDFDocumentProxy['getOptionalContentConfig']>
>

export function usePdfLayers(pdfDocument: PDFDocumentProxy | null) {
  const configRef = useRef<OptionalContentConfig | null>(null)
  const [entries, setEntries] = useState<PdfLayerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!pdfDocument) {
      configRef.current = null
      setEntries([])
      setLoading(false)
      setRevision(0)
      return
    }

    let cancelled = false
    setLoading(true)

    void loadPdfLayers(pdfDocument)
      .then(({ config, entries: layers }) => {
        if (cancelled) return
        configRef.current = config as unknown as OptionalContentConfig
        setEntries(layers)
        setRevision((value) => value + 1)
      })
      .catch(() => {
        if (!cancelled) {
          configRef.current = null
          setEntries([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [pdfDocument])

  const toggleLayer = useCallback((id: string, visible: boolean) => {
    const config = configRef.current
    if (!config) return
    config.setVisibility(id, visible)
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, visible } : entry)),
    )
    setRevision((value) => value + 1)
  }, [])

  const getOptionalContentConfig = useCallback(() => configRef.current, [])

  return { entries, loading, revision, toggleLayer, getOptionalContentConfig }
}
