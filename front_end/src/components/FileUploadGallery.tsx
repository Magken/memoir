import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatFileSize } from '../lib/forms/fileUpload'
import type { AnimatedFileEntry } from '../hooks/useAnimatedFileEntries'
import { fileEntryMotionClass } from '../hooks/useAnimatedFileEntries'
import { FileUploadPreview } from './FileUploadPreview'
import { FileUploadRemoveButton } from './FileUploadRemoveButton'
import { IconButton } from './IconButton'

type FileUploadGalleryProps = {
  entries: readonly AnimatedFileEntry[]
  disabled?: boolean
  onRemove: (id: string) => void
}

type ScrollNavState = {
  overflow: boolean
  canPrev: boolean
  canNext: boolean
}

export function FileUploadGallery({ entries, disabled = false, onRemove }: FileUploadGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [focusIndex, setFocusIndex] = useState(0)
  const [scrollNav, setScrollNav] = useState<ScrollNavState>({
    overflow: false,
    canPrev: false,
    canNext: false,
  })

  const refreshScrollNav = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const overflow = el.scrollWidth > el.clientWidth + 1
    setScrollNav({
      overflow,
      canPrev: el.scrollLeft > 1,
      canNext: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    })
  }, [])

  useEffect(() => {
    refreshScrollNav()
    const el = scrollRef.current
    if (!el) return

    el.addEventListener('scroll', refreshScrollNav, { passive: true })
    const observer = new ResizeObserver(refreshScrollNav)
    observer.observe(el)
    const list = el.querySelector('.theme-field__file-gallery__list')
    if (list) observer.observe(list)

    return () => {
      el.removeEventListener('scroll', refreshScrollNav)
      observer.disconnect()
    }
  }, [entries, refreshScrollNav])

  useEffect(() => {
    if (focusIndex >= entries.length) {
      setFocusIndex(Math.max(0, entries.length - 1))
    }
  }, [entries.length, focusIndex])

  const scrollStep = (direction: 'prev' | 'next') => {
    const el = scrollRef.current
    if (!el) return
    const step = Math.max(88, el.clientWidth * 0.55)
    el.scrollBy({ left: direction === 'prev' ? -step : step, behavior: 'smooth' })
  }

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current
    if (!el) return
    const item = el.querySelectorAll('.theme-field__file-gallery__item')[index]
    if (item instanceof HTMLElement) {
      item.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
    }
    setFocusIndex(index)
  }

  if (entries.length === 0) return null

  return (
    <div className="theme-field__file-gallery" aria-label="Uploaded files">
      {scrollNav.overflow ? (
        <IconButton
          type="button"
          icon={ChevronLeft}
          aria-label="Scroll uploads left"
          variant="ghost"
          size="xs"
          className="theme-field__file-gallery__nav theme-field__file-gallery__nav--prev"
          disabled={disabled || !scrollNav.canPrev}
          onClick={() => scrollStep('prev')}
        />
      ) : null}
      <div ref={scrollRef} className="theme-field__file-gallery__scroll">
        <ul className="theme-field__file-gallery__list">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className={[
                'theme-field__file-motion-wrap',
                'theme-field__file-gallery__item-wrap',
                fileEntryMotionClass(entry.motion),
                index === focusIndex ? 'theme-field__file-gallery__item-wrap--focus' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="theme-field__file-motion-inner">
                <div className="theme-field__file-gallery__shell">
                  <button
                    type="button"
                    className={[
                      'theme-field__file-gallery__item',
                      index === focusIndex ? 'theme-field__file-gallery__item--focus' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={disabled}
                    aria-label={`${entry.file.name}, ${formatFileSize(entry.file.size)}`}
                    aria-pressed={index === focusIndex}
                    onClick={() => scrollToIndex(index)}
                  >
                    <FileUploadPreview
                      file={entry.file}
                      tone="tile"
                      className="theme-field__file-gallery__preview"
                      mediaClassName="theme-field__file-gallery__preview-media"
                      iconClassName="theme-field__file-gallery__preview-icon"
                    />
                    <span className="theme-field__file-gallery__caption theme-wireframe__micro-label">
                      {entry.file.name}
                    </span>
                  </button>
                  <FileUploadRemoveButton
                    label={`Remove ${entry.file.name}`}
                    disabled={disabled}
                    nano
                    className="theme-field__file-gallery__remove"
                    onClick={(event) => {
                      event.stopPropagation()
                      onRemove(entry.id)
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {scrollNav.overflow ? (
        <IconButton
          type="button"
          icon={ChevronRight}
          aria-label="Scroll uploads right"
          variant="ghost"
          size="xs"
          className="theme-field__file-gallery__nav theme-field__file-gallery__nav--next"
          disabled={disabled || !scrollNav.canNext}
          onClick={() => scrollStep('next')}
        />
      ) : null}
    </div>
  )
}
