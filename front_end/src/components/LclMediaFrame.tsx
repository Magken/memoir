/**
 * LCL media frame. Image leaves before a new src enters. Video mounts after the poster.
 */
type LclMediaFrameProps = {
  src: string
  alt: string
  caption?: string
  videoSrc?: string
  showVideo?: boolean
  frameRef?: (node: HTMLElement | null) => void
  captionRef?: (node: HTMLElement | null) => void
}

export function LclMediaFrame({
  src,
  alt,
  caption,
  videoSrc,
  showVideo = false,
  frameRef,
  captionRef,
}: LclMediaFrameProps) {
  return (
    <figure className="theme-lcl-media">
      <div ref={frameRef} className="theme-lcl-media__shell theme-hairline-fx">
        <div className="theme-lcl-media__frame">
          <img className="theme-lcl-media__img" src={src} alt={alt} />
          {showVideo && videoSrc ? (
            <video className="theme-lcl-media__video" src={videoSrc} muted loop playsInline />
          ) : null}
        </div>
        <span className="theme-hairline-fx__wipe" aria-hidden>
          <span className="theme-hairline-fx__rule" />
        </span>
      </div>
      {caption ? (
        <figcaption ref={captionRef} className="theme-lcl-media__caption type-caption">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
