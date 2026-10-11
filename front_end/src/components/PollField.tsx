import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import { Field } from './Field'
import { FieldControlShell } from './FieldControlShell'
import { IconButton } from './IconButton'
import { PollBlock } from './PollBlock'

type PollFieldProps = {
  label?: string
  hint?: string
  variant?: FieldVariant
  size?: FieldSize
  className?: string
  question?: string
  defaultQuestion?: string
  options?: string[]
  defaultOptions?: string[]
  onQuestionChange?: (question: string) => void
  onOptionsChange?: (options: string[]) => void
  minOptions?: number
  maxOptions?: number
  debug?: boolean
}

export function PollField({
  label = 'Poll',
  hint = 'Configure question and choices — preview shows voter UI.',
  variant = 'flat',
  size = 'md',
  className = '',
  question: questionProp,
  defaultQuestion = 'Preferred notification channel?',
  options: optionsProp,
  defaultOptions = ['Email', 'SMS'],
  onQuestionChange,
  onOptionsChange,
  minOptions = 2,
  maxOptions = 6,
  debug = false,
}: PollFieldProps) {
  const autoId = useId()
  const questionId = `${autoId.replace(/:/g, '')}-question`
  const [internalQuestion, setInternalQuestion] = useState(defaultQuestion)
  const [internalOptions, setInternalOptions] = useState(defaultOptions)

  const question = questionProp ?? internalQuestion
  const options = optionsProp ?? internalOptions

  const setQuestion = useCallback(
    (next: string) => {
      if (questionProp === undefined) setInternalQuestion(next)
      onQuestionChange?.(next)
    },
    [onQuestionChange, questionProp],
  )

  const setOptions = useCallback(
    (next: string[]) => {
      if (optionsProp === undefined) setInternalOptions(next)
      onOptionsChange?.(next)
    },
    [onOptionsChange, optionsProp],
  )

  const updateOption = (index: number, value: string) => {
    const next = [...options]
    next[index] = value
    setOptions(next)
  }

  const addOption = () => {
    if (options.length >= maxOptions) return
    setOptions([...options, `Option ${options.length + 1}`])
  }

  const removeOption = (index: number) => {
    if (options.length <= minOptions) return
    setOptions(options.filter((_, i) => i !== index))
  }

  if (debug) {
    console.debug('[PollField]', { questionId, optionCount: options.length })
  }

  return (
    <Field
      label={label}
      hint={hint}
      variant={variant}
      size={size}
      htmlFor={questionId}
      className={className}
    >
      <div className="theme-poll-field">
        <FieldControlShell>
          <input
            id={questionId}
            type="text"
            className="theme-field__control"
            value={question}
            aria-label="Poll question"
            onChange={(e) => setQuestion(e.target.value)}
          />
        </FieldControlShell>

        <div className="theme-poll-field__options">
          <p className="theme-poll-field__options-label type-caption type-faint">Choices</p>
          {options.map((opt, index) => (
            <div key={index} className="theme-poll-field__option-row">
              <FieldControlShell className="theme-poll-field__option-shell">
                <input
                  type="text"
                  className="theme-field__control"
                  value={opt}
                  aria-label={`Poll option ${index + 1}`}
                  onChange={(e) => updateOption(index, e.target.value)}
                />
              </FieldControlShell>
              <IconButton
                icon={Trash2}
                aria-label={`Remove option ${index + 1}`}
                size="xs"
                variant="ghost"
                disabled={options.length <= minOptions}
                onClick={() => removeOption(index)}
              />
            </div>
          ))}
          <button
            type="button"
            className="theme-poll-field__add type-body-sm"
            disabled={options.length >= maxOptions}
            onClick={addOption}
          >
            <Plus size={14} aria-hidden="true" />
            Add choice
          </button>
        </div>

        <div className="theme-poll-field__preview">
          <p className="type-caption type-faint">Preview</p>
          <PollBlock question={question} options={options} />
        </div>
      </div>
    </Field>
  )
}
