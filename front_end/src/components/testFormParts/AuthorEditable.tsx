import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'

type AuthorEditableProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowEmpty?: boolean
  multiline?: boolean
  rows?: number
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * Document-style editable — idle shows plain text; click focuses a quiet field.
 * Mirrors VurifyViewer’s ViewerEditable interaction without format marks.
 */
export function AuthorEditable({
  value,
  onChange,
  placeholder = '',
  allowEmpty = true,
  multiline = false,
  rows = 2,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}: AuthorEditableProps) {
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
      const el = multiline ? areaRef.current : inputRef.current
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
    if (blurTimerRef.current != null) window.clearTimeout(blurTimerRef.current)
    blurTimerRef.current = window.setTimeout(() => {
      blurTimerRef.current = null
      const active = document.activeElement
      if (active === inputRef.current || active === areaRef.current) return
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
  const rootClass = ['theme-test-form__editable', className].filter(Boolean).join(' ')

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
            'theme-test-form__editable-display',
            empty ? 'is-placeholder' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={ariaLabel ?? placeholder}
        >
          {empty ? placeholder : value}
        </div>
      </div>
    )
  }

  if (multiline) {
    return (
      <div className={rootClass}>
        <textarea
          ref={areaRef}
          id={`tf-edit-${autoId}`}
          className="theme-test-form__editable-input is-multiline"
          rows={rows}
          value={draft}
          aria-label={ariaLabel ?? placeholder}
          disabled={disabled}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </div>
    )
  }

  return (
    <div className={rootClass}>
      <input
        ref={inputRef}
        id={`tf-edit-${autoId}`}
        type="text"
        className="theme-test-form__editable-input is-singleline"
        value={draft}
        aria-label={ariaLabel ?? placeholder}
        disabled={disabled}
        onChange={(e) => onDraftChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}
