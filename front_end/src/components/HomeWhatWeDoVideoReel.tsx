import { useEffect, useRef } from 'react'
import { HOME_ASSETS } from '../lib/homeAssets/catalog'

/** Fast preview — 1.5× wall-clock through the merged reel. */
const PLAYBACK_RATE = 1.5

const REEL = HOME_ASSETS.whatWeDoReel

type HomeWhatWeDoVideoReelProps = {
  className?: string
  /** When false, pause; when true, play the muted loop. */
  playing: boolean
}

/**
 * Scene 02 product-demo compilation — one merged HOME_ASSETS reel mp4.
 * Cover-fits the shell; muted / playsInline for scroll autoplay.
 */
export function HomeWhatWeDoVideoReel({ className = '', playing }: HomeWhatWeDoVideoReelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.playbackRate = PLAYBACK_RATE
    if (playing) {
      void el.play().catch(() => undefined)
    } else {
      el.pause()
    }
  }, [playing])

  return (
    <div
      className={['theme-video-embed-block theme-video-embed-block--chrome-less theme-video-embed-block--fill', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-video-embed-block__frame">
        <video
          ref={videoRef}
          className="theme-video-embed-block__video page-scene--home-what-we-do__reel-video"
          src={REEL.src}
          poster={REEL.poster}
          muted
          playsInline
          loop
          preload="auto"
          aria-label={REEL.alt}
        >
          <track kind="captions" />
        </video>
      </div>
    </div>
  )
}
