import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { formatLinkToReact, formatMarksToReact } from './formatMarks'

type ViewerEditableProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowEmpty?: boolean
  multiline?: boolean
  rows?: number
  disabled?: boolean
  className?: string
  /** Idle display as a single clickable link (URL fields). */
  asLink?: boolean
  'aria-label'?: string
}

/**
 * Viewer editable — idle renders marks/links; edit uses a controlled textarea/input
 * so blur cannot double the stored value.
 *
 * Draft is local while editing so parent/history/presence re-renders cannot wipe keystrokes.
 */
export function ViewerEditable({
  value,
  onChange,
  placeholder = '',
  allowEmpty = true,
  multiline = false,
  rows = 3,
  disabled = false,
  className = '',
  asLink = false,
  'aria-label': ariaLabel,
}: ViewerEditableProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const editingRef = useRef(false)
  const commitLockRef = useRef(false)
  const draftRef = useRef(value)
  const valueAtEditRef = useRef(value)
  const blurTimerRef = useRef<number | null>(null)
  const autoId = useId().replace(/:/g, '')

  useEffect(() => {
    // Never clobber in-progress typing from parent value / history / presence snapshots.
    if (editingRef.current) return
    setDraft(value)
    draftRef.current = value
    commitLockRef.current = false
  }, [value])

  useEffect(() => {
    return () => {
      if (blurTimerRef.current != null) window.clearTimeout(blurTimerRef.current)
    }
  }, [])

  const beginEdit = () => {
    if (disabled || editingRef.current) return
    if (blurTimerRef.current != null) {
      window.clearTimeout(blurTimerRef.current)
      blurTimerRef.current = null
    }
    editingRef.current = true
    commitLockRef.current = false
    valueAtEditRef.current = value
    draftRef.current = value
    setDraft(value)
    setEditing(true)
    requestAnimationFrame(() => {
      const el = asLink ? inputRef.current : areaRef.current
      if (!el || !editingRef.current) return
      el.focus({ preventScroll: true })
      const len = el.value.length
      el.setSelectionRange(len, len)
    })
  }

  const commit = () => {
    if (!editingRef.current || commitLockRef.current) return
    commitLockRef.current = true
    editingRef.current = false
    const next = draftRef.current
    const trimmed = next.trim()
    if (!trimmed && !allowEmpty) {
      setDraft(valueAtEditRef.current)
      draftRef.current = valueAtEditRef.current
      setEditing(false)
      return
    }
    const baseline = valueAtEditRef.current
    if (next !== baseline) onChange(allowEmpty ? next : trimmed)
    setEditing(false)
  }

  const onBlur = (_e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Defer so focus moves within the field (or format tray mousedown) don't abort the draft.
    if (blurTimerRef.current != null) window.clearTimeout(blurTimerRef.current)
    blurTimerRef.current = window.setTimeout(() => {
      blurTimerRef.current = null
      const active = document.activeElement
      if (active === inputRef.current || active === areaRef.current) return
      if (active instanceof HTMLElement && active.closest('.theme-vurify-viewer__format-tray')) {
        return
      }
      commit()
    }, 0)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (blurTimerRef.current != null) {
        window.clearTimeout(blurTimerRef.current)
        blurTimerRef.current = null
      }
      editingRef.current = false
      commitLockRef.current = true
      setDraft(valueAtEditRef.current)
      draftRef.current = valueAtEditRef.current
      setEditing(false)
      return
    }
    if (!multiline && e.key === 'Enter') {
      e.preventDefault()
      if (blurTimerRef.current != null) {
        window.clearTimeout(blurTimerRef.current)
        blurTimerRef.current = null
      }
      commit()
    }
  }

  const onDraftChange = (next: string) => {
    draftRef.current = next
    setDraft(next)
  }

  const empty = !value.trim()
  const rootClass = ['theme-vurify-viewer__editable', className].filter(Boolean).join(' ')

  if (!editing) {
    return (
      <div
        className={rootClass}
        onPointerDown={(e) => {
          if (disabled) return
          e.preventDefault()
          beginEdit()
        }}
      >
        <div
          className={[
            'theme-vurify-viewer__editable-display',
            'theme-vurify-viewer__type',
            empty ? 'is-placeholder' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={ariaLabel ?? placeholder}
        >
          {empty
            ? placeholder
            : asLink
              ? formatLinkToReact(value)
              : formatMarksToReact(value)}
        </div>
      </div>
    )
  }

  if (asLink) {
    return (
      <div className={rootClass}>
        <input
          ref={inputRef}
          id={`vv-edit-${autoId}`}
          type="text"
          className="theme-vurify-viewer__editable-input theme-vurify-viewer__type"
          value={draft}
          aria-label={ariaLabel ?? placeholder}
          disabled={disabled}
          spellCheck={false}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </div>
    )
  }

  return (
    <div className={rootClass}>
      <textarea
        ref={areaRef}
        id={`vv-edit-${autoId}`}
        className={[
          'theme-vurify-viewer__editable-input',
          'theme-vurify-viewer__type',
          multiline ? 'is-multiline' : 'is-singleline',
        ]
          .filter(Boolean)
          .join(' ')}
        value={draft}
        rows={multiline ? rows : 1}
        aria-label={ariaLabel ?? placeholder}
        disabled={disabled}
        spellCheck={!asLink}
        onChange={(e) => onDraftChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}
