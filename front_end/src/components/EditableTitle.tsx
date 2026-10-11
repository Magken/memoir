import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

export type EditableTitleVariant = 'bordered' | 'borderless' | 'underline'

type EditableTitleProps = {
  value: string
  onChange: (value: string) => void
  /** Visual chrome — default `borderless` (Flow node title). */
  variant?: EditableTitleVariant
  /** Empty display / commit fallback when trimmed value is empty. */
  placeholder?: string
  /** Keep empty value when committing (default false → restore previous or placeholder). */
  allowEmpty?: boolean
  /** Text size class on label + input — default `type-label`. */
  textClassName?: string
  className?: string
  /** Extra classes for the input (e.g. `nodrag nopan` on canvas). */
  controlClassName?: string
  /**
   * Stop pointer bubbling so pan/drag hosts (e.g. RF dragHandle) don’t steal focus.
   * Pair with `onActivate` to still select the host node after the field focuses.
   */
  isolatePointer?: boolean
  /** Fired after edit focus is claimed (e.g. select RF node). */
  onActivate?: () => void
  'aria-label'?: string
  disabled?: boolean
  debug?: boolean
}

/**
 * Click-to-rename title — persistent `<input>` (no button↔input swap).
 * Swapping controls steals focus when React Flow re-renders selection mid-click.
 */
export function EditableTitle({
  value,
  onChange,
  variant = 'borderless',
  placeholder = 'Untitled',
  allowEmpty = false,
  textClassName = 'type-label',
  className = '',
  controlClassName = '',
  isolatePointer = false,
  onActivate,
  'aria-label': ariaLabel,
  disabled = false,
  debug = false,
}: EditableTitleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [settling, setSettling] = useState(false)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editingRef = useRef(false)
  const draftRef = useRef(value)
  /** Ignore blur from RF/selection remounts right after focus. */
  const ignoreBlurUntilRef = useRef(0)
  const autoId = useId().replace(/:/g, '')

  draftRef.current = draft

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [editing, value])

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    }
  }, [])

  const playSettle = () => {
    if (variant !== 'underline') return
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    setSettling(true)
    settleTimerRef.current = setTimeout(() => setSettling(false), 420)
  }

  const beginEdit = () => {
    if (disabled || editingRef.current) return
    editingRef.current = true
    setDraft(value)
    setEditing(true)
    ignoreBlurUntilRef.current = performance.now() + 320

    // 1) Claim focus first  2) Then select the RF node (setNodes). Reverse order blurs.
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el || !editingRef.current) return
      el.focus({ preventScroll: true })
      el.select()
      requestAnimationFrame(() => {
        if (!editingRef.current) return
        onActivate?.()
        // Selection setNodes can blur — re-claim once
        ignoreBlurUntilRef.current = performance.now() + 200
        requestAnimationFrame(() => {
          if (editingRef.current && document.activeElement !== inputRef.current) {
            inputRef.current?.focus({ preventScroll: true })
          }
        })
      })
    })
  }

  const commit = () => {
    if (!editingRef.current) return
    editingRef.current = false
    const trimmed = draftRef.current.trim()
    if (!trimmed) {
      if (allowEmpty) {
        if (value !== '') onChange('')
      } else {
        setDraft(value || placeholder)
      }
    } else if (trimmed !== value) {
      onChange(trimmed)
    }
    setEditing(false)
    playSettle()
  }

  const cancel = () => {
    editingRef.current = false
    setDraft(value)
    setEditing(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      commit()
      event.currentTarget.blur()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancel()
      event.currentTarget.blur()
    }
  }

  const onBlur = (_event: FocusEvent<HTMLInputElement>) => {
    if (performance.now() < ignoreBlurUntilRef.current) {
      requestAnimationFrame(() => {
        if (editingRef.current) inputRef.current?.focus({ preventScroll: true })
      })
      return
    }
    commit()
  }

  const onPointerDown = (event: PointerEvent<HTMLInputElement>) => {
    if (isolatePointer) event.stopPropagation()
    if (!editingRef.current && !disabled) beginEdit()
  }

  const display = value.trim() || placeholder
  const shown = editing ? draft : display

  const rootClass = [
    'theme-editable-title',
    `theme-editable-title--${variant}`,
    editing ? 'theme-editable-title--editing' : '',
    settling ? 'theme-editable-title--settling' : '',
    disabled ? 'theme-editable-title--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (debug) {
    console.debug('[EditableTitle]', { value, draft, editing, variant, settling })
  }

  return (
    <div className={rootClass}>
      <input
        ref={inputRef}
        id={autoId}
        type="text"
        className={[
          'theme-editable-title__input',
          editing ? '' : 'theme-editable-title__input--idle',
          textClassName,
          controlClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        value={shown}
        readOnly={!editing || disabled}
        disabled={disabled}
        aria-label={ariaLabel ?? (editing ? 'Edit title' : `Rename ${display}`)}
        title={editing ? undefined : 'Click to rename'}
        spellCheck={false}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => {
          if (!editingRef.current) beginEdit()
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onClick={(event) => {
          if (isolatePointer) event.stopPropagation()
        }}
      />
    </div>
  )
}
