import { useRef } from 'react'
import { DocField } from './DocField'
import { formatMarksToReact } from './formatMarks'
import { newId } from './types'
import { ViewerEditable } from './ViewerEditable'
import { useLeaveThen, useMountEnterClass } from './ViewerMotion'
import { ViewerRemoveBtn } from './ViewerRemoveBtn'

type StringListRowsProps = {
  values: string[]
  onChange: (next: string[]) => void
  editable?: boolean
  placeholder?: string
  className?: string
  fieldPrefix?: string
  'aria-label'?: string
}

function ListRow({
  id,
  value,
  index,
  editable,
  placeholder,
  fieldPrefix,
  onChangeValue,
  onRemove,
}: {
  id: string
  value: string
  index: number
  editable: boolean
  placeholder: string
  fieldPrefix: string
  onChangeValue: (next: string) => void
  onRemove: () => void
}) {
  const enterClass = useMountEnterClass()
  const { run, leaveClass } = useLeaveThen(onRemove)

  return (
    <li
      className={[
        'theme-vurify-viewer__list-row',
        'theme-vurify-viewer__motion',
        enterClass,
        leaveClass,
      ]
        .filter(Boolean)
        .join(' ')}
      data-row-id={id}
    >
      <span className="theme-vurify-viewer__list-bullet" aria-hidden>
        •
      </span>
      {editable ? (
        <>
          <DocField id={`${fieldPrefix}.${index}`} role="list">
            <ViewerEditable
              value={value}
              onChange={onChangeValue}
              placeholder={placeholder}
              allowEmpty
            />
          </DocField>
          <ViewerRemoveBtn label={`Remove item ${index + 1}`} onClick={run} />
        </>
      ) : (
        <DocField id={`${fieldPrefix}.${index}`} role="list">
          <div className="theme-vurify-viewer__editable">
            <div className="theme-vurify-viewer__editable-display theme-vurify-viewer__type">
              {value.trim() ? formatMarksToReact(value) : null}
            </div>
          </div>
        </DocField>
      )}
    </li>
  )
}

/**
 * Hanging bullet list — mark rendering + chip-style enter/leave on add/remove.
 * Empty `values` hides Add (parent nulls the list so the fold unmounts).
 */
export function StringListRows({
  values,
  onChange,
  editable = true,
  placeholder = 'List item',
  className = '',
  fieldPrefix = 'list',
  'aria-label': ariaLabel = 'List',
}: StringListRowsProps) {
  const display = values.length > 0 ? values : []
  const idsRef = useRef<string[]>([])

  if (idsRef.current.length < display.length) {
    const add = display.length - idsRef.current.length
    for (let i = 0; i < add; i += 1) idsRef.current.push(newId())
  } else if (idsRef.current.length > display.length) {
    idsRef.current = idsRef.current.slice(0, display.length)
  }

  const commit = (next: string[]) => {
    onChange(next)
  }

  return (
    <ul
      className={['theme-vurify-viewer__list', className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
    >
      {display.map((value, index) => {
        const id = idsRef.current[index] ?? `${fieldPrefix}-${index}`
        return (
          <ListRow
            key={id}
            id={id}
            value={value}
            index={index}
            editable={editable}
            placeholder={placeholder}
            fieldPrefix={fieldPrefix}
            onChangeValue={(next) => {
              const copy = [...display]
              copy[index] = next
              commit(copy)
            }}
            onRemove={() => {
              const copy = display.filter((_, i) => i !== index)
              idsRef.current = idsRef.current.filter((_, i) => i !== index)
              commit(copy)
            }}
          />
        )
      })}
      {editable && values.length > 0 ? (
        <li className="theme-vurify-viewer__list-add">
          <button
            type="button"
            className="theme-vurify-viewer__quiet-btn"
            onClick={() => {
              idsRef.current = [...idsRef.current, newId()]
              commit([...display, ''])
            }}
          >
            Add item
          </button>
        </li>
      ) : null}
    </ul>
  )
}
