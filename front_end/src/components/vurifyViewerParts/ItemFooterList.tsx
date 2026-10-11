import { useRef } from 'react'
import { DocField } from './DocField'
import { formatMarksToReact } from './formatMarks'
import { newId } from './types'
import { ViewerEditable } from './ViewerEditable'
import { useLeaveThen, useMountEnterClass } from './ViewerMotion'
import { ViewerRemoveBtn } from './ViewerRemoveBtn'

type ItemFooterListProps = {
  values: string[]
  onChange: (next: string[]) => void
  editable?: boolean
  placeholder?: string
  fieldPrefix?: string
  'aria-label'?: string
}

function FooterChip({
  id,
  value,
  index,
  editable,
  placeholder,
  fieldPrefix,
  onChangeValue,
  onRemove,
  showSep,
}: {
  id: string
  value: string
  index: number
  editable: boolean
  placeholder: string
  fieldPrefix: string
  onChangeValue: (next: string) => void
  onRemove: () => void
  showSep: boolean
}) {
  const enterClass = useMountEnterClass()
  const { run, leaveClass } = useLeaveThen(onRemove)

  return (
    <li
      className={[
        'theme-vurify-viewer__item-footer-chip',
        'theme-vurify-viewer__motion',
        enterClass,
        leaveClass,
      ]
        .filter(Boolean)
        .join(' ')}
      data-row-id={id}
    >
      {showSep ? (
        <span className="theme-vurify-viewer__item-footer-sep" aria-hidden>
          ·
        </span>
      ) : null}
      {editable ? (
        <span className="theme-vurify-viewer__item-footer-edit">
          <DocField id={`${fieldPrefix}.${index}`} role="list">
            <ViewerEditable
              value={value}
              onChange={onChangeValue}
              placeholder={placeholder}
              allowEmpty
            />
          </DocField>
          <ViewerRemoveBtn label={`Remove ${placeholder} ${index + 1}`} onClick={run} />
        </span>
      ) : (
        <DocField id={`${fieldPrefix}.${index}`} role="list">
          <span className="theme-vurify-viewer__item-footer-text theme-vurify-viewer__type">
            {value.trim() ? formatMarksToReact(value) : null}
          </span>
        </DocField>
      )}
    </li>
  )
}

/**
 * Horizontal italic footer for experience technologies / project stack / notes.
 * Not a vertical bullet list — tools and footer notes live here.
 */
export function ItemFooterList({
  values,
  onChange,
  editable = false,
  placeholder = 'Item',
  fieldPrefix = 'footer',
  'aria-label': ariaLabel = 'Footer',
}: ItemFooterListProps) {
  const idsRef = useRef<string[]>([])
  if (idsRef.current.length < values.length) {
    const add = values.length - idsRef.current.length
    idsRef.current = [
      ...idsRef.current,
      ...Array.from({ length: add }, () => newId()),
    ]
  } else if (idsRef.current.length > values.length) {
    // Keep leading ids only when parent already removed the matching row id.
    idsRef.current = idsRef.current.slice(0, values.length)
  }

  const commit = (next: string[], nextIds?: string[]) => {
    if (nextIds) idsRef.current = nextIds
    onChange(next)
  }

  return (
    <div className="theme-vurify-viewer__item-footer">
      <ul className="theme-vurify-viewer__item-footer-list" aria-label={ariaLabel}>
        {values.map((value, index) => (
          <FooterChip
            key={idsRef.current[index]}
            id={idsRef.current[index]!}
            value={value}
            index={index}
            editable={editable}
            placeholder={placeholder}
            fieldPrefix={fieldPrefix}
            showSep={index > 0}
            onChangeValue={(next) => {
              const copy = [...values]
              copy[index] = next
              commit(copy)
            }}
            onRemove={() => {
              commit(
                values.filter((_, i) => i !== index),
                idsRef.current.filter((_, i) => i !== index),
              )
            }}
          />
        ))}
      </ul>
      {editable && values.length > 0 ? (
        <button
          type="button"
          className="theme-vurify-viewer__item-footer-add type-caption"
          onClick={() => {
            idsRef.current = [...idsRef.current, newId()]
            commit([...values, ''])
          }}
        >
          Add
        </button>
      ) : null}
    </div>
  )
}
