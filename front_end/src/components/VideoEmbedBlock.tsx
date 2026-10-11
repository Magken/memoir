import { useEffect, useRef } from 'react'
import { youtubeEmbedSrc } from '../lib/docEditor/embeds/youtubeUrl'
import { resolveVideoEmbedMode } from '../lib/docEditor/embeds/videoSource'

type VideoEmbedBlockProps = {
  videoId: string
  title?: string
  className?: string
  /** Native video only — ignored for YouTube embeds. Default `false`. */
  autoPlay?: boolean
  /** Native video only. Default `false`. */
  loop?: boolean
  /** Native video only. Default `false` (required for autoplay in most browsers). */
  muted?: boolean
  /**
   * Native video only. When set, syncs `play()` / `pause()` to this flag
   * (e.g. play only once a scroll stage is fully expanded).
   */
  playing?: boolean
  /** Native video only. Default `true`. */
  controls?: boolean
  /** Native video poster frame. */
  poster?: string
  /** Native video preload hint. Default `metadata`. */
  preload?: 'none' | 'metadata' | 'auto'
}

export function VideoEmbedBlock({
  videoId,
  title = 'Video',
  className = '',
  autoPlay = false,
  loop = false,
  muted = false,
  playing,
  controls = true,
  poster,
  preload = 'metadata',
}: VideoEmbedBlockProps) {
  const mode = resolveVideoEmbedMode(videoId)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (playing === undefined) return
    const el = videoRef.current
    if (!el) return
    if (playing) {
      void el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [playing])

  if (mode === 'empty') {
    return (
      <div
        className={['theme-video-embed-block theme-video-embed-block--empty', className]
          .filter(Boolean)
          .join(' ')}
      >
        <p className="type-caption type-muted">No video</p>
      </div>
    )
  }

  if (mode === 'file') {
    return (
      <div className={['theme-video-embed-block', className].filter(Boolean).join(' ')}>
        <div className="theme-video-embed-block__frame">
          <video
            ref={videoRef}
            className="theme-video-embed-block__video"
            src={videoId}
            controls={controls}
            playsInline
            autoPlay={playing === undefined ? autoPlay : false}
            loop={loop}
            muted={muted || autoPlay || playing === true}
            poster={poster}
            preload={preload}
          >
            <track kind="captions" />
          </video>
        </div>
      </div>
    )
  }

  return (
    <div className={['theme-video-embed-block', className].filter(Boolean).join(' ')}>
      <div className="theme-video-embed-block__frame">
        <iframe
          src={youtubeEmbedSrc(videoId)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  )
}
