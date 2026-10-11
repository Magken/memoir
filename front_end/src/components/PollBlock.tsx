import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { RadioGroup } from './RadioGroup'
import { IconButton } from './IconButton'

type PollBlockProps = {
  question: string
  options: string[]
  editable?: boolean
  onQuestionChange?: (question: string) => void
  onOptionsChange?: (options: string[]) => void
  className?: string
}

export function PollBlock({
  question,
  options,
  editable = false,
  onQuestionChange,
  onOptionsChange,
  className = '',
}: PollBlockProps) {
  const [draftQuestion, setDraftQuestion] = useState(question)
  const [draftOptions, setDraftOptions] = useState(options)

  useEffect(() => {
    setDraftQuestion(question)
    setDraftOptions(options)
  }, [question, options])

  const radioOptions = draftOptions.map((label, index) => ({
    value: String(index),
    label,
  }))

  if (editable) {
    return (
      <div className={['theme-poll-block', className].filter(Boolean).join(' ')}>
        <input
          type="text"
          className="theme-poll-block__question-input"
          value={draftQuestion}
          aria-label="Poll question"
          onChange={(e) => {
            setDraftQuestion(e.target.value)
            onQuestionChange?.(e.target.value)
          }}
        />
        <div className="theme-poll-block__options-edit">
          {draftOptions.map((opt, index) => (
            <div key={index} className="theme-poll-block__option-row">
              <input
                type="text"
                className="theme-poll-block__option-input"
                value={opt}
                aria-label={`Poll option ${index + 1}`}
                onChange={(e) => {
                  const next = [...draftOptions]
                  next[index] = e.target.value
                  setDraftOptions(next)
                  onOptionsChange?.(next)
                }}
              />
              <IconButton
                icon={Trash2}
                aria-label={`Remove option ${index + 1}`}
                size="xs"
                variant="ghost"
                disabled={draftOptions.length <= 2}
                onClick={() => {
                  if (draftOptions.length <= 2) return
                  const next = draftOptions.filter((_, i) => i !== index)
                  setDraftOptions(next)
                  onOptionsChange?.(next)
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="theme-poll-block__add type-body-sm"
            disabled={draftOptions.length >= 6}
            onClick={() => {
              const next = [...draftOptions, `Option ${draftOptions.length + 1}`]
              setDraftOptions(next)
              onOptionsChange?.(next)
            }}
          >
            <Plus size={14} aria-hidden="true" />
            Add choice
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={['theme-poll-block', className].filter(Boolean).join(' ')}>
      <p className="theme-poll-block__question type-body-sm">{question}</p>
      <RadioGroup
        options={radioOptions}
        name={`poll-${question}`}
        size="sm"
        aria-label={question}
      />
    </div>
  )
}
