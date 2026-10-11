import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { fieldValueToLinkUrl, linkUrlToFieldValue } from '../../lib/docEditor/linkUrl'

type ViewerLinkFieldProps = {
  label: string
  url: string
  onChange: (next: { label: string; url: string }) => void
  onRemove?: () => void
  editable?: boolean
  placeholderLabel?: string
  'aria-label'?: string
}

/**
 * Linked word — idle keeps label + open icon on one inline row;
 * edit stacks label / hairline / URL with X top-right.
 */
export function ViewerLinkField({
  label,
  url,
  onChange,
  onRemove,
  editable = true,
  placeholderLabel = 'Link',
  'aria-label': ariaLabel,
}: ViewerLinkFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(label)
  const [draftUrl, setDraftUrl] = useState(linkUrlToFieldValue(url))
  const labelRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const editingRef = useRef(false)
  const draftLabelRef = useRef(label)
  const draftUrlRef = useRef(linkUrlToFieldValue(url))
  const autoId = useId().replace(/:/g, '')

  draftLabelRef.current = draftLabel
  draftUrlRef.current = draftUrl

  useEffect(() => {
    if (!editing) {
      setDraftLabel(label)
      setDraftUrl(linkUrlToFieldValue(url))
    }
  }, [editing, label, url])

  const beginEdit = () => {
    if (!editable || editingRef.current) return
    editingRef.current = true
    setDraftLabel(label)
    setDraftUrl(linkUrlToFieldValue(url))
    setEditing(true)
    requestAnimationFrame(() => {
      labelRef.current?.focus({ preventScroll: true })
      const len = labelRef.current?.value.length ?? 0
      labelRef.current?.setSelectionRange(len, len)
    })
  }

  const commit = () => {
    if (!editingRef.current) return
    editingRef.current = false
    const nextLabel = draftLabelRef.current.trim()
    const nextUrlRaw = draftUrlRef.current.trim()
    const nextUrl = nextUrlRaw ? fieldValueToLinkUrl(nextUrlRaw) : ''
    if (!nextLabel && !nextUrl) {
      setEditing(false)
      onRemove?.()
      return
    }
    if (nextLabel !== label || nextUrl !== url) {
      onChange({ label: nextLabel, url: nextUrl })
    }
    setEditing(false)
  }

  const cancel = () => {
    editingRef.current = false
    setDraftLabel(label)
    setDraftUrl(linkUrlToFieldValue(url))
    setEditing(false)
  }

  const onBlur = (e: FocusEvent<HTMLInputElement>) => {
    const next = e.relatedTarget
    if (next instanceof Node && rootRef.current?.contains(next)) return
    commit()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
  }

  const empty = !label.trim() && !url.trim()
  const displayLabel = label.trim() || placeholderLabel
  const href = url.trim() ? fieldValueToLinkUrl(url) : ''

  if (!editing) {
    return (
      <span className="theme-vurify-viewer__link-field">
        <span
          className={[
            'theme-vurify-viewer__editable',
            'theme-vurify-viewer__link-field__word',
            empty ? 'is-placeholder' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onPointerDown={(e) => {
            if (!editable) return
            e.preventDefault()
            beginEdit()
          }}
        >
          <span
            className={[
              'theme-vurify-viewer__editable-display',
              'theme-vurify-viewer__type',
              empty || !label.trim() ? 'is-placeholder' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={ariaLabel ?? placeholderLabel}
          >
            {empty || !label.trim() ? (
              displayLabel
            ) : (
              <span className="theme-vurify-viewer__link">{displayLabel}</span>
            )}
          </span>
        </span>
        {href && !empty ? (
          <a
            className="theme-vurify-viewer__link-field__open"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${displayLabel}`}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ExternalLink aria-hidden className="size-3" strokeWidth={1.75} />
          </a>
        ) : null}
        {editable && empty ? (
          <button
            type="button"
            className="theme-vurify-viewer__link-field__remove"
            aria-label="Remove link"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove?.()}
          >
            <X aria-hidden className="size-3" strokeWidth={1.75} />
          </button>
        ) : null}
      </span>
    )
  }

  return (
    <div ref={rootRef} className="theme-vurify-viewer__link-field is-editing">
      <button
        type="button"
        className="theme-vurify-viewer__link-field__remove"
        aria-label="Remove link"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          editingRef.current = false
          setEditing(false)
          onRemove?.()
        }}
      >
        <X aria-hidden className="size-3" strokeWidth={1.75} />
      </button>
      <input
        ref={labelRef}
        id={`vv-link-label-${autoId}`}
        type="text"
        className="theme-vurify-viewer__editable-input theme-vurify-viewer__type theme-vurify-viewer__link-field__label-input"
        value={draftLabel}
        placeholder={placeholderLabel}
        aria-label="Link text"
        disabled={!editable}
        spellCheck={false}
        onChange={(e) => setDraftLabel(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      <div className="theme-vurify-viewer__link-field__rule" aria-hidden />
      <input
        type="text"
        className="theme-vurify-viewer__editable-input theme-vurify-viewer__type theme-vurify-viewer__link-field__url-input"
        value={draftUrl}
        placeholder="example.com"
        aria-label="Link URL"
        disabled={!editable}
        spellCheck={false}
        onChange={(e) => setDraftUrl(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}
