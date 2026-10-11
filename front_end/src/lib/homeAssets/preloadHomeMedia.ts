import { preloadCurvedMonitorStills } from '../../components/curvedMonitorCard/preloadStills'
import { decodeImageSrcs } from '../shape3d/curvedMonitor'
import { homeMediaSrcs } from './homeMediaSrcs'

const DECODE_VIDEO_SRC_TIMEOUT_MS = 8000

/** Word-cloud chase cap until Home media is warm — same 94 as the `%` glyph. */
export const HOME_LOAD_HOLD_CAP = 94

let homeMediaWarm: Promise<void> | null = null

export { homeMediaSrcs }

/**
 * Display % during Home bootstrap. Chunk progress can hit 100 while stills and
 * reels are still decoding — hold the glyph at 94 until that work finishes.
 */
export function homeBootstrapDisplayProgress(
  stageProgress: number,
  mediaReady: boolean,
): number {
  const stage = Math.max(0, Math.min(100, stageProgress))
  if (!mediaReady) return Math.min(stage, HOME_LOAD_HOLD_CAP)
  return stage
}

function decodeVideoSrc(src: string): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  return new Promise((resolve) => {
    const el = document.createElement('video')
    el.preload = 'auto'
    el.muted = true
    el.playsInline = true
    const done = () => resolve()
    el.addEventListener('canplaythrough', done, { once: true })
    el.addEventListener('error', done, { once: true })
    el.src = src
    el.load()
    window.setTimeout(done, DECODE_VIDEO_SRC_TIMEOUT_MS)
  })
}

/**
 * Warm Home stills + offer/reel bytes during `%`→V so scenes can pause instead of fetch.
 */
export function preloadHomeMedia(): Promise<void> {
  if (homeMediaWarm) return homeMediaWarm
  const srcs = homeMediaSrcs()
  const videos = srcs.filter((src) => src.endsWith('.mp4'))
  const images = srcs.filter((src) => !src.endsWith('.mp4'))
  homeMediaWarm = Promise.all([
    preloadCurvedMonitorStills(),
    decodeImageSrcs(images),
    ...videos.map(decodeVideoSrc),
  ]).then(() => undefined)
  return homeMediaWarm
}
