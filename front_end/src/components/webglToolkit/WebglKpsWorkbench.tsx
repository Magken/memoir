/**
 * ProjectSim generation workbench. Prepare shows the body. Generate is a second click.
 */
import { useEffect, useState } from 'react'
import { Box } from 'lucide-react'
import { Button } from '../Button'
import { ThemeScroll } from '../ThemeScroll'
import {
  buildKpsCreate,
  payloadFingerprint,
  readAccountAssets,
  type KpsAccountAsset,
  type KpsCreate,
  type KpsDraft,
  type KpsRoute,
} from '../../lib/kps/payload'
import { AssetBoundary } from '../../lib/webgl/runtime/assets/AssetBoundary'
import { CameraRig } from '../../lib/webgl/runtime/camera/CameraRig'
import { WebglStage } from '../../lib/webgl/runtime/core/WebglStage'
import { OrbitRig } from '../../lib/webgl/runtime/controls/OrbitRig'
import { GltfSubject } from './WebglSubjects'

const JOB_KEY = 'kps-active-job'
const VIEW_KEY = 'kps-view'
const VIEW_POSE = {
  position: [1.8, 1.2, 1.8] as [number, number, number],
  target: [0, 0.45, 0] as [number, number, number],
}

type WebglKpsWorkbenchProps = {
  open?: boolean
}

type Prepared = {
  create: KpsCreate
  draft: KpsDraft
  fingerprint: string
  idempotencyKey: string
}

type JobView = {
  assetId: string
  jobId: string
  status: string
  stage: string | null
}

type LocalPackage = {
  assetId: string
  glbPublicPath: string
  files: { publicPath: string }[]
}

const fieldClass = 'w-full rounded-md border border-current/20 bg-transparent px-2 py-1 text-sm'

function idempotencyKeyFor(fingerprint: string): string {
  const storageKey = `kps-idem:${fingerprint}`
  const existing = sessionStorage.getItem(storageKey)
  if (existing) return existing
  const key = crypto.randomUUID()
  sessionStorage.setItem(storageKey, key)
  return key
}

function previewBody(create: KpsCreate): string {
  const json = JSON.stringify(
    create.body,
    (key, value: unknown) => {
      if ((key === 'data' || key === 'url') && typeof value === 'string' && value.length > 80) {
        return `${value.slice(0, 24)}… (${value.length} chars)`
      }
      return value
    },
    2,
  )
  return json
}

function fileName(publicPath: string): string {
  const parts = publicPath.split('/')
  return parts[parts.length - 1] || publicPath
}

function rememberView(assetId: string, glbPath: string) {
  sessionStorage.setItem(VIEW_KEY, JSON.stringify({ assetId, glbPath }))
}

function KpsGlbView({ assetId, url }: { assetId: string; url: string }) {
  return (
    <div className="relative h-80 w-full overflow-hidden">
      <WebglStage active lockPageScroll>
        <color attach="background" args={['#07080f']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 2]} intensity={1.4} />
        <CameraRig position={VIEW_POSE.position} lookAt={VIEW_POSE.target} />
        <OrbitRig enabled target={VIEW_POSE.target} cameraPosition={VIEW_POSE.position} />
        <AssetBoundary fallback={null}>
          <GltfSubject url={url} assetId={assetId} upAxis="y" />
        </AssetBoundary>
      </WebglStage>
    </div>
  )
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

export function WebglKpsWorkbench({ open = true }: WebglKpsWorkbenchProps) {
  const [route, setRoute] = useState<KpsRoute>('standard')
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageData, setImageData] = useState('')
  const [captureUrl, setCaptureUrl] = useState('')
  const [captureData, setCaptureData] = useState('')
  const [multiSubject, setMultiSubject] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [notice, setNotice] = useState('')
  const [job, setJob] = useState<JobView | null>(null)
  const [glbPath, setGlbPath] = useState('')
  const [viewAssetId, setViewAssetId] = useState('')
  const [packages, setPackages] = useState<LocalPackage[]>([])
  const [account, setAccount] = useState<KpsAccountAsset[]>([])
  const [busy, setBusy] = useState(false)

  function draftFromForm(): KpsDraft {
    const image = imageData ? { data: imageData } : imageUrl ? { url: imageUrl } : undefined
    const capture = captureData ? { data: captureData } : captureUrl ? { url: captureUrl } : undefined
    return {
      route,
      name,
      text: route === 'standard' && !image ? text : undefined,
      image,
      capture: route === 'measured' ? capture : undefined,
      multiSubject: route === 'standard' ? multiSubject : false,
      subjectName: route === 'standard' && multiSubject ? subjectName : undefined,
    }
  }

  function prepare() {
    setJob(null)
    try {
      const draft = draftFromForm()
      const create = buildKpsCreate(draft)
      const fingerprint = payloadFingerprint(create)
      setPrepared({
        create,
        draft,
        fingerprint,
        idempotencyKey: idempotencyKeyFor(fingerprint),
      })
      setNotice('')
    } catch (error) {
      setPrepared(null)
      setNotice(error instanceof Error ? error.message : 'The request is not valid')
    }
  }

  async function readJson(response: Response): Promise<Record<string, unknown>> {
    const body = (await response.json()) as Record<string, unknown>
    if (!response.ok) {
      throw new Error(typeof body.detail === 'string' ? body.detail : `Request failed (${response.status})`)
    }
    return body
  }

  async function generate() {
    if (!prepared || busy) return
    setBusy(true)
    setNotice('')
    try {
      const endpoint = prepared.create.path.endsWith('measured') ? 'measured' : 'standard'
      const response = await fetch(`/api/kps/assets/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: true,
          idempotencyKey: prepared.idempotencyKey,
          draft: prepared.draft,
        }),
      })
      const created = await readJson(response)
      const next = {
        assetId: String(created.id),
        jobId: String(created.job_id),
        status: 'queued',
        stage: null as string | null,
      }
      setJob(next)
      await refreshJob(next)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Generate failed')
    } finally {
      setBusy(false)
    }
  }

  async function refreshJob(current: JobView) {
    const response = await fetch(`/api/kps/jobs/${current.jobId}`)
    const body = await readJson(response)
    const status = String(body.status)
    setJob({
      ...current,
      status,
      stage: typeof body.current_stage === 'string' ? body.current_stage : null,
    })
    if (status === 'complete') await saveFiles(current.assetId)
    if (status === 'failed') {
      setNotice('The job failed. A failed asset still uses one attempt.')
    }
  }

  function showGlb(assetId: string, publicPath: string) {
    setViewAssetId(assetId)
    setGlbPath(publicPath)
    rememberView(assetId, publicPath)
  }

  async function loadLocal(): Promise<LocalPackage[]> {
    const response = await fetch('/api/kps/local')
    const body = await readJson(response)
    const listed = Array.isArray(body.packages) ? (body.packages as LocalPackage[]) : []
    setPackages(listed)
    return listed
  }

  async function saveFiles(assetId: string) {
    const response = await fetch(`/api/kps/assets/${assetId}/files`, { method: 'POST' })
    const body = await readJson(response)
    const publicPath = typeof body.glbPublicPath === 'string' ? body.glbPublicPath : ''
    if (publicPath) showGlb(assetId, publicPath)
    else setNotice('The package saved, but it has no GLB to open in the viewer.')
    await loadLocal()
  }

  function selectPackage(pkg: LocalPackage) {
    showGlb(pkg.assetId, pkg.glbPublicPath)
    setNotice('')
  }

  async function cancelJob() {
    if (!job || job.status !== 'queued') return
    setBusy(true)
    try {
      const response = await fetch(`/api/kps/jobs/${job.jobId}/cancel`, { method: 'POST' })
      const body = await readJson(response)
      setJob({ ...job, status: String(body.status ?? 'canceled') })
      setNotice('Canceled before generation started. This attempt was not used.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Cancel failed')
    } finally {
      setBusy(false)
    }
  }

  async function register() {
    if (!viewAssetId || !glbPath) return
    const response = await fetch('/api/kps/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `${(name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kps')}-${viewAssetId.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(-8)}`,
        label: name.trim() || 'KPS asset',
        path: glbPath,
      }),
    })
    const body = await readJson(response)
    setNotice(body.registered === false ? 'That viewer id is already registered.' : 'Added to the viewer list.')
  }

  async function listAssets() {
    setBusy(true)
    try {
      const response = await fetch('/api/kps/assets')
      const body = await readJson(response)
      const assets = readAccountAssets(body)
      setAccount(assets)
      setNotice(`${assets.length} asset${assets.length === 1 ? '' : 's'} on this account. Listing and saving a copy do not spend an attempt.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'List failed')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (job) sessionStorage.setItem(JOB_KEY, JSON.stringify(job))
  }, [job])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      const listed = await loadLocal()
      if (cancelled) return
      const rawView = sessionStorage.getItem(VIEW_KEY)
      if (rawView) {
        try {
          const saved = JSON.parse(rawView) as { assetId?: string; glbPath?: string }
          const match = listed.find((pkg) => pkg.glbPublicPath === saved.glbPath)
          if (match) showGlb(match.assetId, match.glbPublicPath)
        } catch {
          sessionStorage.removeItem(VIEW_KEY)
        }
      }
      const rawJob = sessionStorage.getItem(JOB_KEY)
      if (!rawJob) return
      try {
        const saved = JSON.parse(rawJob) as JobView
        if (!saved.assetId || !saved.jobId) return
        if (saved.status === 'complete') {
          setJob(saved)
          if (!listed.some((pkg) => pkg.assetId === saved.assetId)) await saveFiles(saved.assetId)
          return
        }
        if (saved.status === 'failed' || saved.status === 'canceled') {
          setJob(saved)
          return
        }
        await refreshJob(saved)
      } catch {
        sessionStorage.removeItem(JOB_KEY)
      }
    })().catch((error: unknown) => {
      if (!cancelled) setNotice(error instanceof Error ? error.message : 'Could not restore the saved asset')
    })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!job || job.status === 'complete' || job.status === 'failed' || job.status === 'canceled') return
    const timer = window.setInterval(() => {
      void refreshJob(job).catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : 'Poll failed')
      })
    }, 4000)
    return () => window.clearInterval(timer)
  }, [job])

  if (!open) return null

  return (
    <ThemeScroll className="h-[calc(100svh-4.25rem)]" contentClassName="px-4 py-4">
      <section className="mx-auto flex max-w-3xl flex-col gap-3" aria-label="KPS generation">
        <header className="flex items-center gap-2">
          <Box className="size-4" aria-hidden />
          <h1 className="text-sm">KPS generation</h1>
        </header>
        <p className="type-caption type-muted">
          One object, one attempt. Prepare checks the body. Generate is the click that sends it. A finished GLB is saved under public/3d/kps, shown here, and can be downloaded. Reloading this page keeps that copy. A room video is not an input. Audio is not sent. Measured video must show the object beside a printed ChArUco board, and a failed job still uses an attempt.
        </p>
        {glbPath ? (
          <>
            <KpsGlbView assetId={viewAssetId || 'kps'} url={glbPath} />
            <div className="flex flex-wrap gap-3">
              {(packages.find((pkg) => pkg.glbPublicPath === glbPath)?.files ?? [{ publicPath: glbPath }]).map((file) => (
                <a key={file.publicPath} className="text-sm underline" href={file.publicPath} download={fileName(file.publicPath)}>
                  Download {fileName(file.publicPath)}
                </a>
              ))}
            </div>
          </>
        ) : null}
        {packages.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">Saved on this machine</p>
            {packages.map((pkg) => (
              <div key={pkg.assetId} className="flex flex-wrap items-center gap-2">
                <span className="text-sm">{pkg.assetId}</span>
                <Button type="button" size="xs" active={pkg.glbPublicPath === glbPath} onClick={() => selectPackage(pkg)}>
                  View
                </Button>
                <a className="text-sm underline" href={pkg.glbPublicPath} download={fileName(pkg.glbPublicPath)}>
                  Download
                </a>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button type="button" size="xs" active={route === 'standard'} onClick={() => { setRoute('standard'); setPrepared(null) }}>
            Standard
          </Button>
          <Button type="button" size="xs" active={route === 'measured'} onClick={() => { setRoute('measured'); setPrepared(null) }}>
            Measured
          </Button>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input className={fieldClass} value={name} onChange={(event) => { setName(event.target.value); setPrepared(null) }} />
        </label>
        {route === 'standard' && !imageUrl && !imageData ? (
          <label className="flex flex-col gap-1 text-sm">
            Text
            <textarea className={fieldClass} rows={3} value={text} onChange={(event) => { setText(event.target.value); setPrepared(null) }} />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          Image URL
          <input
            className={fieldClass}
            value={imageUrl}
            placeholder="https://"
            onChange={(event) => {
              setImageUrl(event.target.value)
              setImageData('')
              setPrepared(null)
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Image file
          <input
            className={fieldClass}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void fileToBase64(file).then((data) => {
                setImageData(data)
                setImageUrl('')
                setPrepared(null)
              })
            }}
          />
        </label>
        {route === 'standard' ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={multiSubject}
              onChange={(event) => { setMultiSubject(event.target.checked); setPrepared(null) }}
            />
            Isolate one subject from the image
          </label>
        ) : null}
        {route === 'standard' && multiSubject ? (
          <label className="flex flex-col gap-1 text-sm">
            Subject name
            <input className={fieldClass} value={subjectName} onChange={(event) => { setSubjectName(event.target.value); setPrepared(null) }} />
          </label>
        ) : null}
        {route === 'measured' ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Capture URL
              <input
                className={fieldClass}
                value={captureUrl}
                placeholder="https://… .mp4 or .mov"
                onChange={(event) => {
                  setCaptureUrl(event.target.value)
                  setCaptureData('')
                  setPrepared(null)
                }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Capture file
              <input
                className={fieldClass}
                type="file"
                accept="video/mp4,video/quicktime"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  void fileToBase64(file).then((data) => {
                    setCaptureData(data)
                    setCaptureUrl('')
                    setPrepared(null)
                  })
                }}
              />
            </label>
          </>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="xs" onClick={prepare}>Prepare</Button>
          <Button type="button" size="xs" disabled={!prepared || busy} onClick={() => void generate()}>
            Generate
          </Button>
          <Button type="button" size="xs" disabled={!job || job.status !== 'queued' || busy} onClick={() => void cancelJob()}>
            Cancel
          </Button>
          <Button type="button" size="xs" disabled={busy} onClick={() => void listAssets()}>
            List assets
          </Button>
          <Button type="button" size="xs" disabled={!glbPath || busy} onClick={() => void register()}>
            Add to viewer
          </Button>
        </div>
        {prepared ? (
          <pre className="overflow-x-auto text-xs">{previewBody(prepared.create)}</pre>
        ) : null}
        {job ? (
          <p className="text-sm">
            {job.status}
            {job.stage ? ` · ${job.stage}` : ''} · {job.assetId}
          </p>
        ) : null}
        {glbPath ? <p className="text-sm">{glbPath}</p> : null}
        {account.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">On this account. Saving a copy does not spend an attempt.</p>
            {account.map((asset) => (
              <div key={asset.id} className="flex flex-wrap items-center gap-2">
                <span className="text-sm">{asset.name || asset.id}</span>
                <Button type="button" size="xs" disabled={busy} onClick={() => void saveFiles(asset.id)}>
                  Save copy
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        {notice ? <p className="text-sm">{notice}</p> : null}
      </section>
    </ThemeScroll>
  )
}
