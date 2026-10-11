import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from 'react'
import {
  fitGalleryNativeExpandSize,
  type GalleryExpandItem,
  type GalleryExpandVariant,
} from '../lib/galleries/galleryExpand'
import { TypeAnimText } from './TypeAnimText'

export type { GalleryExpandItem, GalleryExpandVariant } from '../lib/galleries/galleryExpand'

export type GalleryExpandOverlayProps = {
  item: GalleryExpandItem
  variant: GalleryExpandVariant
  onClose: () => void
  /** Dialog aria-label override */
  label?: string
}

function GalleryExpandNative({ item, onClose, label }: GalleryExpandOverlayProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLImageElement>(null)
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null)

  const measureMedia = useCallback((img: HTMLImageElement) => {
    const shell = shellRef.current
    const pad = 32
    const maxWidth = shell ? shell.clientWidth - pad : Math.min(window.innerWidth * 0.96, 1400)
    const maxHeight = shell ? shell.clientHeight - pad : Math.min(window.innerHeight * 0.9, 1000)
    setCardSize(fitGalleryNativeExpandSize(img.naturalWidth, img.naturalHeight, maxWidth, maxHeight))
  }, [])

  const handleMediaLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      measureMedia(event.currentTarget)
    },
    [measureMedia]
  )

  useLayoutEffect(() => {
    setCardSize(null)
    const img = mediaRef.current
    if (img?.complete && img.naturalWidth > 0) {
      measureMedia(img)
    }
  }, [item.src, measureMedia])

  const cardStyle = cardSize
    ? ({
        '--theme-gallery-expand-native-w': `${cardSize.width}px`,
        '--theme-gallery-expand-native-h': `${cardSize.height}px`,
      } as CSSProperties)
    : undefined

  return (
    <div
      ref={shellRef}
      className="theme-gallery-expand theme-gallery-expand--native"
      role="dialog"
      aria-modal="true"
      aria-label={label ?? item.title ?? item.alt}
    >
      <button
        type="button"
        className="theme-gallery-expand__backdrop"
        aria-label="Close expanded image"
        onClick={onClose}
      />
      <article
        className={[
          'theme-gallery-expand__card',
          cardSize ? 'theme-gallery-expand__card--sized' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={cardStyle}
      >
        <img
          ref={mediaRef}
          className="theme-gallery-expand__media"
          src={item.src}
          alt={item.alt}
          loading="lazy"
          onLoad={handleMediaLoad}
        />
      </article>
    </div>
  )
}

export function GalleryExpandOverlay({
  item,
  variant,
  onClose,
  label,
}: GalleryExpandOverlayProps) {
  const dialogLabel = label ?? item.title ?? item.alt

  if (variant === 'detail') {
    return (
      <div
        className="theme-gallery-expand theme-gallery-expand--detail"
        role="dialog"
        aria-modal="true"
        aria-label={dialogLabel}
      >
        <button
          type="button"
          className="theme-gallery-expand__backdrop"
          aria-label="Close expanded image"
          onClick={onClose}
        />
        <div className="theme-gallery-expand__panel theme-accordion theme-accordion--panels">
          <article
            className="theme-gallery-expand__card theme-accordion__column theme-accordion__column--open"
            data-active="true"
          >
            <div className="theme-accordion__column-article">
              <img
                className="theme-accordion__column-media"
                src={item.src}
                alt={item.alt}
                loading="lazy"
              />
              {item.title ? (
                <h3 className="theme-accordion__column-heading type-overline type-tracking-wide type-invert">
                  <TypeAnimText
                    anim="slide-up"
                    trigger="enter"
                    className="theme-accordion__column-heading-text"
                  >
                    {item.title}
                  </TypeAnimText>
                </h3>
              ) : null}
              <div className="theme-gallery-expand__copy">
                {item.text ? (
                  <div className="theme-gallery-expand__text-well">
                    <div className="theme-gallery-expand__text-well-inner">
                      <p className="theme-accordion__column-text type-body-sm type-muted">{item.text}</p>
                    </div>
                  </div>
                ) : null}
                {item.num !== undefined ? (
                  <p className="theme-gallery-expand__num type-overline type-tracking-wide type-mono">
                    {item.num}
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      </div>
    )
  }

  if (variant === 'native') {
    return <GalleryExpandNative item={item} variant={variant} onClose={onClose} label={label} />
  }

  return (
    <div
      className="theme-gallery-expand theme-gallery-expand--image"
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
    >
      <button
        type="button"
        className="theme-gallery-expand__backdrop"
        aria-label="Close expanded image"
        onClick={onClose}
      />
      <article className="theme-gallery-expand__card">
        <img
          className="theme-gallery-expand__media"
          src={item.src}
          alt={item.alt}
          loading="lazy"
        />
      </article>
    </div>
  )
}
