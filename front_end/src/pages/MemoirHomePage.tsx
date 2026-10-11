/**
 * MEMOIR app home at `/memoir/home`. The first splat fills the page behind the GRAS
 * loading LCL. The percent is the splat download; it reaches 100 only once the splat
 * is parsed, framed, and drawing, so the loader leaves onto a finished scene.
 */
import {
  Bird,
  Bluetooth,
  Box,
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  Laptop,
  MessageSquare,
  Mountain,
  Send,
  Unplug,
  Usb,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { IconButton } from '../components/IconButton'
import { LandingLoadOverlay } from '../components/LandingLoadOverlay'
import { Tooltip } from '../components/Tooltip'
import type { DotPadBridge, DotPadDevice, DotPadLink } from '../lib/dotpad/dotpadClient'
import type { ObjectStage } from '../lib/dotpad/objectStage'
import { padActionFor, padNudgeFor } from '../lib/dotpad/padKeys'
import {
  borderDots,
  braillePageAt,
  braillePages,
  type BraillePage, DOTPAD_DOT_COLUMNS, DOTPAD_DOT_ROWS, graphicHex, paintDots, sceneDots } from '../lib/dotpad/tactileGraphic'
import { lclScene } from '../lib/lcl/lclScenes'
import { cellsOutside, gridPlacementFromCells, type LclCell } from '../lib/lcl/viewportSections'
import { ThemeProvider } from '../lib/theme'
import type { Object3D } from 'three'
import type { SplatCrop, SplatStage } from '../lib/webgl/splat/splatStage'
import type { SplatView } from '../lib/webgl/splat/splatViews'

export const HOME_SPLAT = '/3d/memoir-site-location1.ply'

export const HOME_SPLAT_VIEW: SplatView = {
  camera: [0.1815, 0.5759, 0.6748],
  target: [0.147, -0.1351, -0.2548],
  fov: 50,
}

export const MEMOIR_SIDE_OBJECT = '/3d/kps/ast_01M4NXV365JT1YZFEZDNEPG5PK/assets/memoir_capture/memoir_capture.glb'

/** Objects the Object viewer can switch between; the first loads with the page. */
const MEMOIR_OBJECTS = [
  { url: MEMOIR_SIDE_OBJECT, label: 'Generated capture', icon: Laptop },
  { url: '/3d/statue_of_an_owl.glb', label: 'Statue of an Owl', icon: Bird },
] as const

/** Dot Pad refresh from the splat: every Nth frame, pins rise above this luminance edge. */
const PAD_SAMPLE_EVERY = 6
const SCENE_EDGE = 0.12
/** Fastest the real pad is refreshed; its pins take longer than a screen frame to settle. */
const PAD_SEND_MS = 500
type PadSource = 'scene' | 'object'

/** Placeholder line the Describe button reads until scene descriptions are generated. */
const SCENE_DESCRIPTION = 'You are looking at the memoir site, framed in the centre of the screen.'

/** Object viewer fold duration; matches `.theme-memoir-frame__fold`. */
const COLLAPSE_MS = 320

/** Part of the download percent that belongs to the side object. */
const SIDE_SHARE = 0.2

type SideObject = { stage: typeof import('../lib/dotpad/objectStage'); model: Object3D; url: string }

/** Pane actions the Dot Pad keys reach; each pane registers its own. */
type PadActions = {
  capture?: () => Promise<void>
  describe?: () => Promise<string | null>
  read?: (text: string) => Promise<void>
  braille?: (text: string) => void
}

/** How long each 20-cell braille page stays up while the description plays. */
const BRAILLE_PAGE_MS = 3000

function downloadFile(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = url.split('/').pop() || 'model.glb'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/** Download fills the percent up to here; parse and first frame finish it. */
const DOWNLOAD_SHARE = 90

function FrameTile({
  id,
  cells,
  className,
  children,
}: {
  id: string
  cells: readonly LclCell[]
  className: string
  children?: ReactNode
}) {
  const place = gridPlacementFromCells(cells)
  if (!place) return null
  return (
    <div
      className={`theme-lcl-layout__tile ${className}`}
      data-id={id}
      data-cs={String(place.columnStart)}
      data-ce={String(place.columnEnd)}
      data-rs={String(place.rowStart)}
      data-re={String(place.rowEnd)}
    >
      {children}
    </div>
  )
}

/** Left column: the object turning, and its Dot Pad X tactile graphic (60×40 pins). */
/** The window crop centred to the Dot Pad's 3:2 graphic area, in canvas fractions. */
function padCrop(frame: SplatCrop): SplatCrop {
  const width = window.innerWidth * frame.w
  const height = window.innerHeight * frame.h
  const want = DOTPAD_DOT_COLUMNS / DOTPAD_DOT_ROWS
  const w = Math.min(width, height * want)
  const h = w / want
  return {
    x: frame.x + (frame.w * (1 - w / width)) / 2,
    y: frame.y + (frame.h * (1 - h / height)) / 2,
    w: frame.w * (w / width),
    h: frame.h * (h / height),
  }
}

/** Left column: the Dot Pad X reads the splat in the clear window; the object viewer starts collapsed. */
function MemoirSidePanes({
  objectCells,
  padCells,
  side,
  crop,
  stageRef,
  onPickObject,
  actionsRef,
}: {
  objectCells: readonly LclCell[]
  padCells: readonly LclCell[]
  side: SideObject | null
  crop: SplatCrop
  stageRef: RefObject<SplatStage | null>
  onPickObject: (url: string) => Promise<void>
  actionsRef: RefObject<PadActions>
}) {
  const objectRef = useRef<HTMLDivElement>(null)
  const padRef = useRef<HTMLCanvasElement>(null)
  const [objectOpen, setObjectOpen] = useState(false)
  const [padSource, setPadSource] = useState<PadSource>('scene')
  const bridgeRef = useRef<DotPadBridge | null>(null)
  const deviceRef = useRef<DotPadDevice | null>(null)
  const objectStageRef = useRef<ObjectStage | null>(null)
  const sentRef = useRef({ hex: '', at: 0 })
  const [padLive, setPadLive] = useState(false)
  const [padBusy, setPadBusy] = useState(false)
  const [padNote, setPadNote] = useState('')
  const [picking, setPicking] = useState(false)

  function readFrom(source: PadSource) {
    setPadSource(source)
    setObjectOpen(source === 'object')
  }

  async function pickObject(url: string) {
    if (picking || side?.url === url) return
    setPicking(true)
    try {
      await onPickObject(url)
    } finally {
      setPicking(false)
    }
  }

  useEffect(() => {
    let live = true
    void import('../lib/dotpad/dotpadClient').then(({ loadDotPadBridge }) =>
      loadDotPadBridge().then((bridge) => {
        if (live) bridgeRef.current = bridge
      }),
    )
    return () => {
      live = false
      const device = deviceRef.current
      if (device) bridgeRef.current?.disconnect(device)
      deviceRef.current = null
    }
  }, [])

  /** Paint the on-screen pins and, when the pad is live, raise the same pins on the device. */
  const showDots = (pad: HTMLCanvasElement, dots: Uint8Array) => {
    paintDots(pad, dots)
    const device = deviceRef.current
    const bridge = bridgeRef.current
    if (!device || !bridge) return
    const hex = graphicHex(dots)
    const now = performance.now()
    if (hex === sentRef.current.hex || now - sentRef.current.at < PAD_SEND_MS) return
    sentRef.current = { hex, at: now }
    bridge.showGraphic(hex, device)
  }

  async function connectPad(link: DotPadLink) {
    const bridge = bridgeRef.current
    if (!bridge || padBusy) return
    setPadBusy(true)
    setPadNote(link === 'usb' ? 'Choose the Dot Pad USB port' : 'Choose the Dot Pad Bluetooth device')
    try {
      const { connectDotPad } = await import('../lib/dotpad/dotpadClient')
      const device = await connectDotPad(bridge, link, (pad, code) => {
        if (code !== 'Disconnected' || deviceRef.current !== pad) return
        deviceRef.current = null
        setPadLive(false)
        setPadNote('Dot Pad disconnected')
      })
      deviceRef.current = device
      sentRef.current = { hex: '', at: 0 }
      setPadLive(true)
      setPadNote('')
    } catch (reason) {
      setPadNote(reason instanceof Error ? reason.message : 'Dot Pad did not connect')
    } finally {
      setPadBusy(false)
    }
  }

  function disconnectPad() {
    const device = deviceRef.current
    if (device) bridgeRef.current?.disconnect(device)
    deviceRef.current = null
    setPadLive(false)
  }

  useEffect(() => {
    const pad = padRef.current
    const stage = stageRef.current
    if (!pad) return
    paintDots(pad, borderDots())
    if (!stage || padSource !== 'scene') return
    const stopSample = stage.sample(padCrop(crop), DOTPAD_DOT_COLUMNS, DOTPAD_DOT_ROWS, PAD_SAMPLE_EVERY, (rgba) => {
      showDots(pad, sceneDots(rgba, SCENE_EDGE))
    })
    const detach = stage.addControlSurface(pad)
    return () => {
      stopSample()
      detach()
    }
  }, [crop, stageRef, padSource])

  useEffect(() => {
    const host = objectRef.current
    const pad = padRef.current
    const padReadsObject = padSource === 'object'
    if (!host || !pad || !side || (!objectOpen && !padReadsObject)) return
    const objectStage = side.stage.createObjectStage(
      host,
      side.model,
      (dots) => {
        if (padReadsObject && dots.includes(1)) showDots(pad, dots)
      },
      padReadsObject ? [pad] : [],
    )
    objectStageRef.current = objectStage
    return () => {
      if (objectStageRef.current === objectStage) objectStageRef.current = null
      window.setTimeout(objectStage.dispose, COLLAPSE_MS)
    }
  }, [side, objectOpen, padSource])

  useEffect(() => {
    const bridge = bridgeRef.current
    if (!bridge || !padLive) return
    bridge.onKey((_device, key) => {
      const action = padActionFor(key)
      if (action === 'capture') {
        void actionsRef.current.capture?.()
        return
      }
      if (action === 'describe') {
        void (async () => {
          const text = await actionsRef.current.describe?.()
          if (text) await actionsRef.current.read?.(text)
        })()
        return
      }
      const move = padNudgeFor(key)
      if (!move) return
      if (padSource === 'object') objectStageRef.current?.nudge(move)
      else stageRef.current?.nudge(move)
    })
    return () => bridge.onKey(() => {})
  }, [padLive, padSource, stageRef, actionsRef])

  useEffect(() => {
    actionsRef.current.braille = (line) => {
      const bridge = bridgeRef.current
      const device = deviceRef.current
      if (bridge && device && line) void bridge.showText(line, device).catch(() => undefined)
    }
    return () => {
      actionsRef.current.braille = undefined
    }
  }, [actionsRef])

  return (
    <>
      <FrameTile id="object" cells={objectCells} className="theme-memoir-frame__pane">
        <div className="theme-memoir-frame__bar">
          <span className="flex items-center gap-1">
            <Tooltip content={objectOpen ? 'Collapse the object viewer' : 'Show the object viewer'}>
              <IconButton
                icon={objectOpen ? ChevronUp : ChevronDown}
                aria-label={objectOpen ? 'Collapse object viewer' : 'Expand object viewer'}
                aria-pressed={objectOpen}
                size="sm"
                variant="ghost"
                onClick={() => setObjectOpen((open) => !open)}
              />
            </Tooltip>
            <span className="theme-memoir-frame__label font-mono">Object</span>
          </span>
          <span className="flex items-center gap-1">
          {MEMOIR_OBJECTS.map((option) => (
            <Tooltip key={option.url} content={`Show the ${option.label}`}>
              <IconButton
                icon={option.icon}
                aria-label={`Show ${option.label}`}
                size="sm"
                variant="ghost"
                active={side?.url === option.url}
                aria-pressed={side?.url === option.url}
                disabled={picking}
                onClick={() => void pickObject(option.url)}
              />
            </Tooltip>
          ))}
          <Tooltip content="Download the 3D model (GLB)">
            <IconButton
              icon={Download}
              aria-label="Download 3D model"
              size="sm"
              variant="ghost"
              disabled={!side}
              onClick={() => side && downloadFile(side.url)}
            />
          </Tooltip>
          </span>
        </div>
        <div
          ref={objectRef}
          data-open={objectOpen ? 'true' : 'false'}
          className="theme-memoir-frame__pane-body theme-memoir-frame__pane-body--tagged theme-memoir-frame__fold"
        />
      </FrameTile>
      <FrameTile id="dotpad" cells={padCells} className="theme-memoir-frame__pane">
        <div className="theme-memoir-frame__bar">
          <span className="theme-memoir-frame__label flex items-center gap-[0.4rem] font-mono">
            <span className="theme-memoir-frame__status-dot" data-active={padLive ? 'true' : 'false'} />
            Dot Pad X
          </span>
          <span className="flex items-center gap-1">
            {padLive ? (
              <Tooltip content="Disconnect the Dot Pad X">
                <IconButton icon={Unplug} aria-label="Disconnect Dot Pad" size="sm" variant="ghost" onClick={disconnectPad} />
              </Tooltip>
            ) : (
              <>
                <Tooltip content="Connect the Dot Pad X over USB">
                  <IconButton
                    icon={Usb}
                    aria-label="Connect Dot Pad over USB"
                    size="sm"
                    variant="ghost"
                    disabled={padBusy}
                    onClick={() => void connectPad('usb')}
                  />
                </Tooltip>
                <Tooltip content="Connect the Dot Pad X over Bluetooth">
                  <IconButton
                    icon={Bluetooth}
                    aria-label="Connect Dot Pad over Bluetooth"
                    size="sm"
                    variant="ghost"
                    disabled={padBusy}
                    onClick={() => void connectPad('ble')}
                  />
                </Tooltip>
              </>
            )}
            <Tooltip content="Dot Pad reads the scene — drag here to orbit it">
              <IconButton
                icon={Mountain}
                aria-label="Dot Pad shows the scene"
                size="sm"
                variant="ghost"
                active={padSource === 'scene'}
                aria-pressed={padSource === 'scene'}
                onClick={() => readFrom('scene')}
              />
            </Tooltip>
            <Tooltip content="Dot Pad reads the object — drag here to turn it">
              <IconButton
                icon={Box}
                aria-label="Dot Pad shows the object"
                size="sm"
                variant="ghost"
                active={padSource === 'object'}
                aria-pressed={padSource === 'object'}
                disabled={!side}
                onClick={() => readFrom('object')}
              />
            </Tooltip>
          </span>
        </div>
        <canvas ref={padRef} className="theme-memoir-frame__pane-body theme-memoir-frame__pane-body--tagged" />
        {padNote ? <p className="theme-memoir-frame__notice m-0 font-mono text-[0.6rem]">{padNote}</p> : null}
      </FrameTile>
    </>
  )
}

/** Right column: capture the clear window's splat view, then send it to ProjectSim for a 3D object. */
function MemoirShotPane({
  cells,
  crop,
  stageRef,
  onGenerated,
  onDescription,
  actionsRef,
}: {
  cells: readonly LclCell[]
  crop: SplatCrop
  stageRef: RefObject<SplatStage | null>
  onGenerated: (glbUrl: string) => Promise<void>
  onDescription: (text: string, pending: boolean) => void
  actionsRef: RefObject<PadActions>
}) {
  const [shot, setShot] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const [describing, setDescribing] = useState(false)
  const shotRef = useRef('')
  const describedRef = useRef({ shot: '', text: '' })
  const describingRef = useRef(false)

  useEffect(() => () => abortRef.current?.abort(), [])

  /** Describes the current photo once; asking again for the same photo returns the same text. */
  async function sendToChat(): Promise<string | null> {
    const current = shotRef.current
    if (!current || describingRef.current) return null
    if (describedRef.current.shot === current) return describedRef.current.text
    describingRef.current = true
    setDescribing(true)
    onDescription('Describing the scene…', true)
    try {
      const reply = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: current }),
      })
      const body = (await reply.json()) as { text?: string; error?: string }
      onDescription(body.text ?? body.error ?? 'No description came back', false)
      if (!body.text) return null
      describedRef.current = { shot: current, text: body.text }
      return body.text
    } catch (reason) {
      onDescription(reason instanceof Error ? reason.message : 'Describe failed', false)
      return null
    } finally {
      describingRef.current = false
      setDescribing(false)
    }
  }

  async function takePhoto() {
    const stage = stageRef.current
    if (!stage) return
    const next = await stage.capture(crop)
    shotRef.current = next
    setShot(next)
    if (!busy) setNotice('')
  }

  useEffect(() => {
    const actions = actionsRef.current
    actions.capture = takePhoto
    actions.describe = sendToChat
  })

  async function sendPhoto() {
    if (!shot || busy) return
    const abort = new AbortController()
    abortRef.current = abort
    setBusy(true)
    setNotice('Sending…')
    try {
      const { sendKpsPhoto, waitForKpsJob, saveKpsGlb } = await import('../lib/kps/sendKpsPhoto')
      const job = await sendKpsPhoto(shot)
      setNotice('Queued')
      await waitForKpsJob(
        job.jobId,
        ({ status, stage }) => setNotice(stage ? `${status} · ${stage}` : status),
        abort.signal,
      )
      setNotice('Saving model…')
      const glb = await saveKpsGlb(job.assetId)
      await onGenerated(glb)
      setNotice('Generated · shown in Object')
    } catch (reason) {
      if (!abort.signal.aborted) setNotice(reason instanceof Error ? reason.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FrameTile id="screenshot" cells={cells} className="theme-memoir-frame__pane">
      <div className="theme-memoir-frame__bar">
        <span className="theme-memoir-frame__label font-mono">Capture</span>
        <span className="flex items-center gap-1">
        <Tooltip content="Take a photo of the scene in the frame">
          <IconButton icon={Camera} aria-label="Take photo" size="sm" variant="ghost" onClick={() => void takePhoto()} />
        </Tooltip>
        <Tooltip content="Send the photo to chat for a scene description">
          <IconButton
            icon={MessageSquare}
            aria-label="Send photo to chat"
            size="sm"
            variant="ghost"
            disabled={!shot || describing}
            onClick={() => void sendToChat()}
          />
        </Tooltip>
        <Tooltip content="Send the photo to ProjectSim to generate a 3D object">
          <IconButton icon={Send} aria-label="Send photo" size="sm" variant="ghost" disabled={!shot || busy} onClick={() => void sendPhoto()} />
        </Tooltip>
        </span>
      </div>
      <div className="theme-memoir-frame__pane-body theme-memoir-frame__pane-body--menu">
        {shot ? (
          <img src={shot} alt="Captured scene" className="theme-memoir-frame__shot" />
        ) : (
          <>
            <canvas
              width={Math.round(window.innerWidth * crop.w)}
              height={Math.round(window.innerHeight * crop.h)}
              className="theme-memoir-frame__shot"
            />
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[0.65rem] text-white/50">
              No photo yet
            </span>
          </>
        )}
      </div>
      {notice ? <p className="theme-memoir-frame__notice m-0 font-mono text-[0.6rem]">{notice}</p> : null}
    </FrameTile>
  )
}

/** Right column, bottom: the chat's scene description, scrollable, with read-aloud. */
function MemoirDescPane({
  cells,
  text,
  pending,
  actionsRef,
}: {
  cells: readonly LclCell[]
  text: string
  pending: boolean
  actionsRef: RefObject<PadActions>
}) {
  const [speaking, setSpeaking] = useState(false)
  const speakingRef = useRef(false)
  const [reading, setReading] = useState<BraillePage | null>(null)
  const markRef = useRef<HTMLElement>(null)

  useEffect(() => () => void import('../lib/voice/speak').then(({ stopSpeaking }) => stopSpeaking()), [])

  useEffect(() => {
    if (reading) markRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [reading])

  /**
   * Plays the description in voice and on the Dot Pad braille line, 20 cells at a time, and marks
   * the same words on screen. Follows the voice's word events; voices without them step on a timer.
   */
  async function readAloud(copy = text) {
    const { speak, stopSpeaking } = await import('../lib/voice/speak')
    if (speakingRef.current) {
      stopSpeaking()
      return
    }
    const line = (copy || SCENE_DESCRIPTION).trim()
    const pages = braillePages(line)
    if (!pages.length) return
    let page = -1
    let heardWord = false
    const show = (next: number) => {
      if (next === page || next >= pages.length) return
      page = next
      setReading(pages[next])
      actionsRef.current.braille?.(pages[next].line)
    }
    speakingRef.current = true
    setSpeaking(true)
    show(0)
    const timer = window.setInterval(() => {
      if (!heardWord) show(page + 1)
    }, BRAILLE_PAGE_MS)
    try {
      await speak(line, {
        onWord: (charIndex) => {
          heardWord = true
          show(braillePageAt(pages, charIndex))
        },
      })
    } finally {
      window.clearInterval(timer)
      speakingRef.current = false
      setSpeaking(false)
      setReading(null)
    }
  }

  useEffect(() => {
    actionsRef.current.read = readAloud
  })

  return (
    <FrameTile id="description" cells={cells} className="theme-memoir-frame__pane">
      <div className="theme-memoir-frame__bar">
        <span className="theme-memoir-frame__label font-mono">Description</span>
        <Tooltip content={speaking ? 'Stop reading' : 'Read the description out loud'}>
          <IconButton
            icon={speaking ? VolumeX : Volume2}
            aria-label={speaking ? 'Stop reading' : 'Read description'}
            aria-pressed={speaking}
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => void readAloud()}
          />
        </Tooltip>
      </div>
      <div className="theme-memoir-frame__pane-body theme-memoir-frame__pane-body--tagged theme-memoir-frame__desc">
        <p className="m-0 whitespace-pre-wrap font-mono text-[0.7rem] leading-relaxed text-white/80">
          {reading && text ? (
            <>
              {text.slice(0, reading.start)}
              <mark ref={markRef} className="theme-memoir-frame__reading">
                {text.slice(reading.start, reading.end)}
              </mark>
              {text.slice(reading.end)}
            </>
          ) : (
            text || 'Take a photo, then send it to chat to describe the scene.'
          )}
        </p>
      </div>
    </FrameTile>
  )
}

/** The `memoirFrame` LCL: a clear window over the scene, tinted glass everywhere outside it. */
function MemoirFrame({
  side,
  stageRef,
  onGenerated,
}: {
  side: SideObject | null
  stageRef: RefObject<SplatStage | null>
  onGenerated: (glbUrl: string) => Promise<void>
}) {
  const [frame, objectPane, padPane, shotPane, descPane] = lclScene('memoirFrame').sections
  const [description, setDescription] = useState({ text: '', pending: false })
  const actionsRef = useRef<PadActions>({})
  return (
    <div className="theme-lcl-layout theme-memoir-frame" aria-hidden>
      {cellsOutside(frame.cells).map((strip) => (
        <FrameTile key={strip.id} id={`glass-${strip.id}`} cells={strip.cells} className="theme-memoir-frame__glass" />
      ))}
      <FrameTile id={frame.id} cells={frame.cells} className="theme-memoir-frame__window" />
      <MemoirSidePanes
        objectCells={objectPane.cells}
        padCells={padPane.cells}
        side={side}
        crop={frame.bounds}
        stageRef={stageRef}
        onPickObject={onGenerated}
        actionsRef={actionsRef}
      />
      <MemoirShotPane
        cells={shotPane.cells}
        crop={frame.bounds}
        stageRef={stageRef}
        onGenerated={onGenerated}
        onDescription={(text, pending) => setDescription({ text, pending })}
        actionsRef={actionsRef}
      />
      <MemoirDescPane
        cells={descPane.cells}
        text={description.text}
        pending={description.pending}
        actionsRef={actionsRef}
      />
    </div>
  )
}

function nextFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)))
    step(count)
  })
}

export function MemoirHomePage() {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<SplatStage | null>(null)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [side, setSide] = useState<SideObject | null>(null)
  const modelsRef = useRef(new Map<string, Object3D>())

  async function showObject(url: string) {
    const objectStage = await import('../lib/dotpad/objectStage')
    const model = modelsRef.current.get(url) ?? (await objectStage.loadObjectScene(url, () => {}))
    modelsRef.current.set(url, model)
    setSide({ stage: objectStage, model, url })
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let live = true
    let stage: SplatStage | null = null
    let splatShare = 0
    let sideShare = 0
    const report = () => {
      if (live) setProgress(Math.floor((splatShare * (1 - SIDE_SHARE) + sideShare * SIDE_SHARE) * DOWNLOAD_SHARE))
    }
    const sideReady = import('../lib/dotpad/objectStage')
      .then(async (objectStage) => {
        const model = await objectStage.loadObjectScene(MEMOIR_SIDE_OBJECT, (fraction) => {
          sideShare = fraction
          report()
        })
        modelsRef.current.set(MEMOIR_SIDE_OBJECT, model)
        if (live) setSide({ stage: objectStage, model, url: MEMOIR_SIDE_OBJECT })
      })
      .catch(() => undefined)
    void (async () => {
      const { createSplatStage, fetchSplatBytes } = await import('../lib/webgl/splat/splatStage')
      const bytes = fetchSplatBytes(HOME_SPLAT, (fraction) => {
        splatShare = fraction
        report()
      })
      bytes.catch(() => undefined)
      const created = await createSplatStage(host, () => {})
      if (!live) {
        created.dispose()
        return
      }
      stage = created
      stageRef.current = created
      created.setFlip(false)
      await created.show(HOME_SPLAT, () => bytes, 'ply')
      if (!live) return
      created.setView(HOME_SPLAT_VIEW)
      await sideReady
      await nextFrames(2)
      if (live) setProgress(100)
    })().catch((reason: unknown) => {
      if (!live) return
      setError(reason instanceof Error ? reason.message : 'The scene did not load')
      setProgress(100)
    })
    return () => {
      live = false
      stageRef.current = null
      stage?.dispose()
    }
  }, [])

  return (
    <ThemeProvider forcedPaletteId="grassDark">
      <main className="theme-webgl-scene-host" aria-label="Memoir home">
        <div ref={hostRef} className="theme-webgl-toolkit__stage" />
        {loading ? null : <MemoirFrame side={side} stageRef={stageRef} onGenerated={showObject} />}
        {loading ? (
          <div className="theme-lcl-scale-host">
            <LandingLoadOverlay progress={progress} onComplete={() => setLoading(false)} />
          </div>
        ) : null}
        {error && !loading ? (
          <p className="theme-webgl-toolkit__status font-mono text-[0.65rem] mb-0" role="alert">
            {error}
          </p>
        ) : null}
      </main>
    </ThemeProvider>
  )
}
