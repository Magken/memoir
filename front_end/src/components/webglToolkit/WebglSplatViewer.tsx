/**
 * Splat viewer — three r186's GaussianSplat with a managed library: every .spz / .ply
 * under public/3d, imports saved to public/3d/splats, and per-splat Home and viewpoints
 * kept in public/3d/splats/views.json through the dev route.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Bookmark, Camera, ClipboardCopy, ClipboardPaste, FlipVertical2, House, Maximize2, Sparkles, Upload } from 'lucide-react'
import { IconButton } from '../IconButton'
import { MenuButton, type MenuItem } from '../MenuButton'
import { Slider } from '../Slider'
import { ThemeScroll } from '../ThemeScroll'
import { ToolbarControlTray } from '../ToolbarControlTray'
import { Tooltip } from '../Tooltip'
import type { SplatStage } from '../../lib/webgl/splat/splatStage'
import {
  entryFor,
  flipFor,
  parseSplatView,
  readViewsDoc,
  serializeSplatSession,
  withEntry,
  type SplatFile,
  type SplatView,
  type SplatViewsDoc,
  type SplatViewsEntry,
} from '../../lib/webgl/splat/splatViews'

type WebglSplatViewerProps = {
  open?: boolean
}

const FIRST_SPLAT = '/3d/memoir-site-location1.ply'

type Loaded = {
  path: string
  count: number
}

function RibbonCol({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="theme-webgl-toolkit__ribbon-col">
      <span className="theme-webgl-toolkit__ribbon-col-label type-caption type-muted">{label}</span>
      <div className="theme-webgl-toolkit__ribbon-col-row">{children}</div>
    </div>
  )
}

function megabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

function vec(values: readonly number[]): string {
  return `[${values.map((value) => value.toFixed(3)).join(', ')}]`
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { detail?: string }
  if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : `Request failed (${response.status})`)
  return body
}

export function WebglSplatViewer({ open = true }: WebglSplatViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<SplatStage | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [ready, setReady] = useState(false)
  const [files, setFiles] = useState<SplatFile[]>([])
  const [doc, setDoc] = useState<SplatViewsDoc>({})
  const docRef = useRef<SplatViewsDoc>({})
  const [path, setPath] = useState('')
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [view, setLiveView] = useState<SplatView | null>(null)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const bytesRef = useRef(new Map<string, Promise<ArrayBuffer>>())
  const filesRef = useRef<SplatFile[]>([])
  filesRef.current = files

  const fetchBytes = useCallback((url: string) => {
    let pending = bytesRef.current.get(url)
    if (!pending) {
      pending = fetch(url).then((response) => {
        if (!response.ok) throw new Error(`Could not fetch ${url} (${response.status})`)
        return response.arrayBuffer()
      })
      pending.catch(() => bytesRef.current.delete(url))
      bytesRef.current.set(url, pending)
    }
    return pending
  }, [])

  const file = files.find((item) => item.path === path)
  const format = file?.format
  const entry = entryFor(doc, path)
  const flipped = format ? flipFor(entry, format) : false

  useEffect(() => {
    if (!open) return
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let created: SplatStage | null = null
    void import('../../lib/webgl/splat/splatStage')
      .then(({ createSplatStage }) => createSplatStage(host, setLiveView))
      .then((stage) => {
        if (disposed) {
          stage.dispose()
          return
        }
        created = stage
        stageRef.current = stage
        setReady(true)
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'The renderer did not start'))
    return () => {
      disposed = true
      created?.dispose()
      stageRef.current = null
      setReady(false)
    }
  }, [open])

  const refreshLibrary = useCallback(async (select?: string) => {
    const body = await readJson<{ splats: SplatFile[]; views: unknown }>(await fetch('/api/splats'))
    const views = readViewsDoc(body.views)
    docRef.current = views
    setDoc(views)
    setFiles(body.splats)
    setPath((current) => {
      if (select) return select
      if (current && body.splats.some((item) => item.path === current)) return current
      return body.splats.find((item) => item.path === FIRST_SPLAT)?.path ?? body.splats[0]?.path ?? ''
    })
  }, [])

  useEffect(() => {
    if (!open) return
    refreshLibrary().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : 'Could not list the splats. Is the dev server running?'),
    )
  }, [open, refreshLibrary])

  useEffect(() => {
    const stage = stageRef.current
    if (!ready || !stage || !path || !format) return
    let cancelled = false
    const name = path.split('/').pop() ?? path
    setError('')
    setNotice('')
    setLoaded(null)
    if (!stage.has(path)) setBusy(bytesRef.current.has(path) ? `Parsing ${name}…` : `Loading ${name}…`)
    void (async () => {
      const saved = entryFor(docRef.current, path)
      stage.setFlip(flipFor(saved, format))
      const result = await stage.show(path, () => fetchBytes(path), format)
      bytesRef.current.delete(path)
      if (cancelled) return
      if (saved.home) stage.setView(saved.home)
      else stage.fit()
      setLoaded({ path, count: result.count })
      setBusy('')
      for (const other of filesRef.current) {
        if (other.path !== path && !stage.has(other.path)) void fetchBytes(other.path).catch(() => undefined)
      }
    })().catch((reason: unknown) => {
      if (cancelled) return
      setBusy('')
      setError(reason instanceof Error ? reason.message : `Could not load ${name}`)
    })
    return () => {
      cancelled = true
    }
  }, [ready, path, format, fetchBytes])

  const saveEntry = useCallback(
    async (next: SplatViewsEntry, message: string) => {
      if (!path) return
      const nextDoc = withEntry(docRef.current, path, next)
      docRef.current = nextDoc
      setDoc(nextDoc)
      try {
        const body = await readJson<{ views: unknown }>(
          await fetch('/api/splats/views', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextDoc),
          }),
        )
        const clean = readViewsDoc(body.views)
        docRef.current = clean
        setDoc(clean)
        setNotice(message)
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not save the views')
      }
    },
    [path],
  )

  const captureHome = () => {
    const stage = stageRef.current
    if (!stage) return
    void saveEntry({ ...entry, home: stage.getView() }, 'Home saved for this splat.')
  }

  const goHome = () => {
    const stage = stageRef.current
    if (!stage) return
    if (entry.home) stage.setView(entry.home)
    else stage.fit()
  }

  const saveViewpoint = () => {
    const stage = stageRef.current
    if (!stage) return
    const id = `view-${Date.now().toString(36)}`
    const label = `View ${entry.views.length + 1}`
    void saveEntry({ ...entry, views: [...entry.views, { ...stage.getView(), id, label }] }, `${label} saved.`)
  }

  const goToViewpoint = (id: string) => {
    const found = entry.views.find((item) => item.id === id)
    if (found) stageRef.current?.setView(found)
  }

  const deleteViewpoint = (id: string) => {
    void saveEntry({ ...entry, views: entry.views.filter((item) => item.id !== id) }, 'Viewpoint removed.')
  }

  const toggleFlip = () => {
    const flip = !flipped
    stageRef.current?.setFlip(flip)
    void saveEntry({ ...entry, flip }, flip ? 'Turned 180° on X for this splat.' : 'Turn removed.')
  }

  const copyView = () => {
    const stage = stageRef.current
    if (!stage || !file || !loaded) return
    const payload = serializeSplatSession({
      ...stage.getSession(),
      splat: { ...file, count: loaded.count, flip: flipped },
      home: entry.home ?? null,
      views: entry.views,
    })
    void navigator.clipboard
      .writeText(payload)
      .then(() => setNotice('Session copied — camera, model, splat, bounds, Home, and viewpoints.'))
      .catch(() => setError('The clipboard is not available here.'))
  }

  const pasteView = () => {
    void navigator.clipboard
      .readText()
      .then((text) => {
        const pasted = parseSplatView(text)
        if (!pasted) {
          setError('The clipboard does not hold a view with camera, target, and fov.')
          return
        }
        stageRef.current?.setView(pasted)
        setNotice('View pasted. Capture camera keeps it as Home.')
      })
      .catch(() => setError('The clipboard is not available here.'))
  }

  const importFile = async (picked: File) => {
    setError('')
    setBusy(`Importing ${picked.name}…`)
    try {
      const saved = await readJson<SplatFile>(
        await fetch(`/api/splats/import?name=${encodeURIComponent(picked.name)}`, { method: 'POST', body: picked }),
      )
      await refreshLibrary(saved.path)
      setNotice(`${saved.name} imported to public${saved.path}.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Import failed')
    } finally {
      setBusy('')
    }
  }

  const splatItems: MenuItem[] = useMemo(
    () => files.map((item) => ({ id: item.path, label: item.name, detail: `${megabytes(item.bytes)} · ${item.path}` })),
    [files],
  )
  const viewItems: MenuItem[] = useMemo(
    () =>
      entry.views.map((item) => ({ id: item.id, label: item.label, detail: `camera ${vec(item.camera)}`, deletable: true })),
    [entry.views],
  )

  const status = busy
    ? busy
    : loaded && file
      ? `${file.name} · ${loaded.count.toLocaleString()} splats${view ? ` · camera ${vec(view.camera)} · target ${vec(view.target)} · fov ${view.fov}` : ''}`
      : ''

  if (!open) return null

  return (
    <section className="theme-webgl-toolkit__panel theme-webgl-toolkit__panel--open" aria-labelledby="webgl-splat-viewer-title">
      <div className="theme-webgl-toolkit__chrome">
        <header className="theme-webgl-toolkit__titlebar">
          <h2 id="webgl-splat-viewer-title" className="theme-webgl-toolkit__title">
            Splat viewer
          </h2>
          <div className="theme-webgl-toolkit__title-spacer" aria-hidden />
        </header>
        <div className="theme-webgl-toolkit__ribbon">
          <ThemeScroll axis="horizontal" rail="nano" className="theme-webgl-toolkit__ribbon-scroll">
            <div className="theme-webgl-toolkit__ribbon-inner" role="toolbar" aria-label="Splat tools">
              <RibbonCol label="Splat">
                <Tooltip content="Choose a splat. Every .spz and .ply in public/3d and public/3d/splats is listed.">
                  <MenuButton
                    label={file?.name ?? 'Splat'}
                    icon={Sparkles}
                    iconDropdown
                    items={splatItems}
                    selectedId={path}
                    onSelect={setPath}
                    size="xs"
                    menuSize="compact"
                    portal
                    variant="tray"
                    triggerLabelAnim={false}
                  />
                </Tooltip>
                <ToolbarControlTray density="compact">
                  <Tooltip content="Import a .spz or .ply. It is saved to public/3d/splats and added to the list.">
                    <IconButton
                      icon={Upload}
                      aria-label="Import splat"
                      size="xs"
                      variant="ghost"
                      disabled={Boolean(busy)}
                      onClick={() => fileInputRef.current?.click()}
                    />
                  </Tooltip>
                  <Tooltip content="Turn 180° on X. Raw .ply opens turned and .spz does not. A change is saved per splat.">
                    <IconButton
                      icon={FlipVertical2}
                      aria-label="Turn 180 degrees on X"
                      size="xs"
                      variant="ghost"
                      active={flipped}
                      disabled={!path}
                      onClick={toggleFlip}
                    />
                  </Tooltip>
                </ToolbarControlTray>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".spz,.ply"
                  className="hidden"
                  onChange={(event) => {
                    const picked = event.target.files?.[0]
                    event.target.value = ''
                    if (picked) void importFile(picked)
                  }}
                />
              </RibbonCol>
              <span className="theme-webgl-toolkit__toolbar-divider" role="separator" aria-hidden />
              <RibbonCol label="Camera">
                <ToolbarControlTray density="compact">
                  <Tooltip content={entry.home ? 'Home — the saved view for this splat.' : 'Home — no view saved yet, so this frames the whole splat.'}>
                    <IconButton icon={House} aria-label="Home view" size="xs" variant="ghost" disabled={!loaded} onClick={goHome} />
                  </Tooltip>
                  <Tooltip content="Fit — frame the whole splat from outside, like the reference page.">
                    <IconButton
                      icon={Maximize2}
                      aria-label="Fit splat"
                      size="xs"
                      variant="ghost"
                      disabled={!loaded}
                      onClick={() => stageRef.current?.fit()}
                    />
                  </Tooltip>
                  <Tooltip content="Capture camera — save this view as Home. The splat opens here next time.">
                    <IconButton icon={Camera} aria-label="Capture camera as Home" size="xs" variant="ghost" disabled={!loaded} onClick={captureHome} />
                  </Tooltip>
                </ToolbarControlTray>
                <Tooltip content="Field of view in degrees.">
                  <Slider
                    className="theme-webgl-toolkit__poly"
                    label="FOV"
                    min={20}
                    max={100}
                    step={1}
                    value={view?.fov ?? 50}
                    onChange={(fov) => stageRef.current?.setFov(fov)}
                    disabled={!loaded}
                  />
                </Tooltip>
              </RibbonCol>
              <span className="theme-webgl-toolkit__toolbar-divider" role="separator" aria-hidden />
              <RibbonCol label="Viewpoints">
                <Tooltip content="Saved viewpoints for this splat. Pick one to move the camera there.">
                  <MenuButton
                    label={`${entry.views.length} saved`}
                    icon={Bookmark}
                    iconDropdown
                    items={viewItems}
                    onSelect={goToViewpoint}
                    onDelete={deleteViewpoint}
                    disabled={entry.views.length === 0}
                    size="xs"
                    menuSize="compact"
                    portal
                    variant="tray"
                    triggerLabelAnim={false}
                  />
                </Tooltip>
                <ToolbarControlTray density="compact">
                  <Tooltip content="Save viewpoint — add this camera to the list.">
                    <IconButton icon={Bookmark} aria-label="Save viewpoint" size="xs" variant="ghost" disabled={!loaded} onClick={saveViewpoint} />
                  </Tooltip>
                  <Tooltip content="Copy session — camera, model transform, splat file, bounds, turn, Home, and viewpoints (webgl-splat-session).">
                    <IconButton icon={ClipboardCopy} aria-label="Copy session" size="xs" variant="ghost" disabled={!loaded} onClick={copyView} />
                  </Tooltip>
                  <Tooltip content="Paste view — move the camera to a copied view, including one from the reference page.">
                    <IconButton icon={ClipboardPaste} aria-label="Paste view" size="xs" variant="ghost" disabled={!loaded} onClick={pasteView} />
                  </Tooltip>
                </ToolbarControlTray>
              </RibbonCol>
            </div>
          </ThemeScroll>
        </div>
        <p className="theme-webgl-toolkit__hint type-caption type-muted mb-0">
          {notice || 'Left-drag orbits. Right-drag pans. Wheel zooms. Capture camera saves the view as this splat’s Home.'}
        </p>
        {error ? (
          <p className="type-body-sm theme-webgl-toolkit__error mb-0" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="theme-webgl-toolkit__viewport">
        <div ref={hostRef} className="theme-webgl-toolkit__stage" />
        <p className="theme-webgl-toolkit__status font-mono text-[0.65rem] mb-0">{status}</p>
      </div>
    </section>
  )
}
