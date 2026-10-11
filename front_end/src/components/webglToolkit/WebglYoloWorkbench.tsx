/**
 * YOLO workbench on `/WGLTOOLKIT?page=yolo`.
 * Loads a test image, posts it through `/api/yolo`, and draws the 2D boxes.
 */
import { useEffect, useRef, useState } from 'react'
import { Button } from '../Button'
import { buildYoloPredictRequest, bytesToBase64, parseYoloPredict, type YoloBox } from '../../lib/yolo/predict'

type WebglYoloWorkbenchProps = {
  open?: boolean
}

type Shot = {
  url: string
  base64: string
  width: number
  height: number
}

async function shotFromResponse(response: Response): Promise<Shot> {
  const bytes = new Uint8Array(await response.arrayBuffer())
  const type = response.headers.get('content-type') ?? 'image/jpeg'
  const blob = new Blob([bytes], { type })
  const bitmap = await createImageBitmap(blob)
  const shot = {
    url: URL.createObjectURL(blob),
    base64: bytesToBase64(bytes),
    width: bitmap.width,
    height: bitmap.height,
  }
  bitmap.close()
  return shot
}

export function WebglYoloWorkbench({ open = true }: WebglYoloWorkbenchProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const shotRef = useRef<Shot | null>(null)
  const runRef = useRef<AbortController | null>(null)
  const [shot, setShot] = useState<Shot | null>(null)
  const [detections, setDetections] = useState<YoloBox[]>([])
  const [note, setNote] = useState('YOLO')
  const [busy, setBusy] = useState(false)

  function replaceShot(next: Shot | null) {
    if (shotRef.current) URL.revokeObjectURL(shotRef.current.url)
    shotRef.current = next
    setShot(next)
  }

  function beginRun() {
    runRef.current?.abort()
    const ac = new AbortController()
    runRef.current = ac
    return ac
  }

  useEffect(() => {
    return () => {
      runRef.current?.abort()
      if (shotRef.current) URL.revokeObjectURL(shotRef.current.url)
    }
  }, [])

  async function detectShot(current: Shot, signal: AbortSignal) {
    setNote('Detecting')
    const response = await fetch('/api/yolo/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildYoloPredictRequest(current.base64)),
      signal,
    })
    const body = (await response.json()) as unknown
    if (!response.ok) {
      const message =
        body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Detect failed'
      throw new Error(message)
    }
    const parsed = parseYoloPredict(body)
    if (signal.aborted) return
    setDetections(parsed.detections)
    const timing = parsed.totalMs === null ? '' : ` · ${Math.round(parsed.totalMs)} ms`
    setNote(`${parsed.detections.length} detections${timing}`)
  }

  async function loadSample(signal: AbortSignal) {
    setBusy(true)
    setDetections([])
    setNote('Checking YOLO')
    try {
      const health = await fetch('/api/yolo/health', { signal })
      const healthBody = (await health.json()) as { error?: string; model?: string }
      if (!health.ok) throw new Error(healthBody.error ?? 'YOLO is not ready')
      setNote(healthBody.model ? `${healthBody.model} ready` : 'YOLO ready')
      const image = await fetch(`/api/yolo/sample?seed=${Date.now()}`, { signal })
      if (!image.ok) throw new Error('Test image failed')
      const next = await shotFromResponse(image)
      if (signal.aborted) {
        URL.revokeObjectURL(next.url)
        return
      }
      replaceShot(next)
      await detectShot(next, signal)
    } catch (error) {
      if (signal.aborted) return
      setNote(error instanceof Error ? error.message : 'YOLO request failed')
    } finally {
      if (!signal.aborted) setBusy(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const ac = beginRun()
    void loadSample(ac.signal)
  }, [open])

  async function onFile(file: File) {
    const ac = beginRun()
    setBusy(true)
    setDetections([])
    try {
      const next = await shotFromResponse(new Response(file, { headers: { 'Content-Type': file.type || 'image/jpeg' } }))
      replaceShot(next)
      await detectShot(next, ac.signal)
    } catch (error) {
      if (ac.signal.aborted) return
      setNote(error instanceof Error ? error.message : 'YOLO request failed')
    } finally {
      if (!ac.signal.aborted) setBusy(false)
    }
  }

  return (
    <section
      className={['theme-webgl-toolkit__panel theme-yolo-view', open ? 'theme-webgl-toolkit__panel--open' : '']
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="yolo-title"
      aria-label="YOLO"
    >
      <div className="theme-webgl-toolkit__chrome">
        <header className="theme-webgl-toolkit__titlebar">
          <h2 id="yolo-title" className="theme-webgl-toolkit__title">
            YOLO
          </h2>
          <p className="theme-yolo-view__note type-caption type-muted">{note}</p>
          <div className="theme-webgl-toolkit__title-spacer" aria-hidden />
          <Button type="button" size="xs" variant="ghost" labelAnim={false} disabled={busy} onClick={() => void loadSample(beginRun().signal)}>
            Random
          </Button>
          <Button type="button" size="xs" variant="ghost" labelAnim={false} disabled={busy} onClick={() => fileRef.current?.click()}>
            Open
          </Button>
          <input
            ref={fileRef}
            className="theme-yolo-view__file"
            type="file"
            accept="image/*"
            aria-label="Open a test image"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void onFile(file)
            }}
          />
        </header>
      </div>
      {open ? (
        <div className="theme-yolo-view__body">
          <div className="theme-yolo-view__stage">
            {shot ? (
              <img className="theme-yolo-view__media" src={shot.url} alt="Test image" width={shot.width} height={shot.height} />
            ) : null}
            {shot ? (
              <svg
                className="theme-yolo-view__boxes"
                viewBox={`0 0 ${shot.width} ${shot.height}`}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden
              >
                {detections.map((detection, index) => (
                  <rect
                    key={`${detection.label}-${index}`}
                    className="theme-yolo-view__box"
                    x={detection.box[0]}
                    y={detection.box[1]}
                    width={Math.max(0, detection.box[2] - detection.box[0])}
                    height={Math.max(0, detection.box[3] - detection.box[1])}
                  />
                ))}
              </svg>
            ) : null}
          </div>
          <ul className="theme-yolo-view__list" aria-label="Detections">
            {detections.map((detection, index) => (
              <li key={`${detection.label}-${index}`} className="theme-yolo-view__row">
                <span>{detection.label}</span>
                <span className="type-muted">{detection.score.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
