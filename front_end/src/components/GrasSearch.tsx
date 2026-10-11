/**
 * GRAS search field — floating label + GRAS eirene hairline underline (bouncy pill).
 * Resting: icon + label sit on the type line. Only focus/value lifts the label.
 * Leading Search icon; clear when filled. Do not invent a second underline recipe.
 */
import { Search, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
} from 'react'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { IconButton } from './IconButton'
import { ScrollEnterText } from './ScrollEnterText'

type GrasSearchProps = {
  /** Floating label (also aria-label). */
  label?: string
  /**
   * Optional hint shown only while the float label is up.
   * Leave empty for float-label-only fields (Projects search).
   */
  placeholder?: string
  value?: string
  defaultValue?: string
  debounceMs?: number
  disabled?: boolean
  className?: string
  onValueChange?: (value: string) => void
  onDebouncedChange?: (value: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size' | 'type' | 'value' | 'defaultValue'>

export function GrasSearch({
  label = 'Search',
  placeholder = '',
  value: valueProp,
  defaultValue = '',
  debounceMs = 280,
  disabled = false,
  className = '',
  onValueChange,
  onDebouncedChange,
  onFocus,
  onBlur,
  onChange,
  id: idProp,
  ...rest
}: GrasSearchProps) {
  const autoId = useId().replace(/:/g, '')
  const id = idProp ?? `gras-search-${autoId}`
  const [internal, setInternal] = useState(defaultValue)
  const [focused, setFocused] = useState(false)
  const value = valueProp ?? internal
  const hasValue = value.trim().length > 0
  /** Label lifts only when editing or when text is present — not at rest. */
  const labelUp = focused || hasValue
  const debounced = useDebouncedValue(value, debounceMs)

  useEffect(() => {
    onDebouncedChange?.(debounced)
  }, [debounced, onDebouncedChange])

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (valueProp === undefined) setInternal(event.target.value)
      onValueChange?.(event.target.value)
      onChange?.(event)
    },
    [onChange, onValueChange, valueProp],
  )

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setFocused(true)
      onFocus?.(event)
    },
    [onFocus],
  )

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setFocused(false)
      onBlur?.(event)
    },
    [onBlur],
  )

  const clear = () => {
    if (valueProp === undefined) setInternal('')
    onValueChange?.('')
  }

  return (
    <label
      className={[
        'theme-gras-search',
        'theme-hairline-fx',
        'theme-hairline-fx--eirene',
        labelUp ? 'is-label-up' : '',
        focused ? 'is-focused' : '',
        hasValue ? 'is-filled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      htmlFor={id}
    >
      <span className="theme-gras-search__shell">
        <span className="theme-gras-search__icon-slot">
          <ScrollEnterText split="line" bind="none">
            <Search className="theme-gras-search__icon" size={22} strokeWidth={2.6} aria-hidden />
          </ScrollEnterText>
        </span>
        <input
          {...rest}
          id={id}
          type="text"
          className="theme-gras-search__field type-body-lg mb-0"
          value={value}
          disabled={disabled}
          placeholder={labelUp ? placeholder : ' '}
          aria-label={label}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <span className="theme-gras-search__float type-body-lg mb-0" aria-hidden>
          <ScrollEnterText split="line" bind="none">
            {label}
          </ScrollEnterText>
        </span>
        {hasValue ? (
          <IconButton
            type="button"
            size="sm"
            variant="ghost"
            icon={X}
            aria-label="Clear search"
            className="theme-gras-search__clear"
            onClick={clear}
          />
        ) : null}
      </span>
      <span className="theme-hairline-fx__wipe" aria-hidden>
        <span className="theme-hairline-fx__pill" />
      </span>
    </label>
  )
}
