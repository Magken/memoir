import { SITTING_COVER_CHANNEL, type CoverMessage } from './types'

const COVER_NAME = typeof window !== 'undefined' ? window.name || 'vurify-cover' : 'vurify-cover'

/**
 * Runs inside `/assessment-cover` popups. Sends heartbeats to the sitting tab.
 */
export function bootAssessmentCoverClient(): () => void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => undefined
  }
  const ch = new BroadcastChannel(SITTING_COVER_CHANNEL)
  const post = (msg: CoverMessage) => {
    try {
      ch.postMessage(msg)
    } catch {
      /* ignore */
    }
  }
  post({ type: 'hello', name: COVER_NAME })
  const beat = window.setInterval(() => {
    post({ type: 'heartbeat', name: COVER_NAME })
  }, 1000)
  const onVis = () => {
    if (document.visibilityState === 'hidden') {
      post({ type: 'hidden', name: COVER_NAME })
    }
  }
  const onHide = () => post({ type: 'closed', name: COVER_NAME })
  const onFs = () => {
    if (!document.fullscreenElement) post({ type: 'fullscreen_exit', name: COVER_NAME })
  }
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener('pagehide', onHide)
  document.addEventListener('fullscreenchange', onFs)
  ch.onmessage = (ev: MessageEvent<CoverMessage>) => {
    if (ev.data?.type === 'shutdown') {
      window.close()
    }
  }
  void document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined)

  return () => {
    window.clearInterval(beat)
    document.removeEventListener('visibilitychange', onVis)
    window.removeEventListener('pagehide', onHide)
    document.removeEventListener('fullscreenchange', onFs)
    post({ type: 'closed', name: COVER_NAME })
    ch.close()
  }
}
