import { useId, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import type {
  TestFormAnswerKeyEntry,
  TestFormMode,
  TestFormQuestion,
  TestFormQuestionScore,
  TestFormResponseValue,
  TestFormShortTextFormat,
} from '../../lib/testForm'
import { CheckboxGroup } from '../CheckboxGroup'
import { RadioGroup } from '../RadioGroup'
import { Slider } from '../Slider'
import { VurifyDateInput } from '../VurifyDateInput'
import { VurifyInput } from '../VurifyInput'
import { VurifySelect } from '../VurifySelect'

type QuestionTakeProps = {
  question: TestFormQuestion
  mode: Exclude<TestFormMode, 'author'>
  response: TestFormResponseValue
  onChange: (next: TestFormResponseValue) => void
  showHint?: boolean
  /** 1-based index across the whole assessment */
  number?: number
  score?: TestFormQuestionScore
  answerKey?: TestFormAnswerKeyEntry
  /** Submit validation message for this question */
  fieldError?: string
}

function ReviewFlag({ score }: { score?: TestFormQuestionScore }) {
  if (!score) return null
  if (!score.auto) {
    return (
      <span className="theme-test-form__review-flag theme-test-form__review-flag--manual">
        Manual · {score.earned}/{score.max}
      </span>
    )
  }
  if (score.correct) {
    return (
      <span className="theme-test-form__review-flag theme-test-form__review-flag--ok">
        Correct · {score.earned}/{score.max}
      </span>
    )
  }
  return (
    <span className="theme-test-form__review-flag theme-test-form__review-flag--bad">
      Incorrect · {score.earned}/{score.max}
    </span>
  )
}

/** Expand/collapse tip — lightbulb + Show tip, panel under the question head. */
function QuestionTip({ hint }: { hint: string }) {
  const [open, setOpen] = useState(false)
  const panelId = useId().replace(/:/g, '')

  return (
    <div
      className={['theme-test-form__tip', open ? 'theme-test-form__tip--open' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="theme-test-form__tip-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Lightbulb className="theme-test-form__tip-icon" aria-hidden strokeWidth={1.75} />
        <span className="theme-test-form__tip-toggle-label">{open ? 'Hide tip' : 'Show tip'}</span>
      </button>
      <div
        id={panelId}
        className="theme-test-form__tip-panel"
        role="region"
        aria-label="Tip"
        aria-hidden={!open}
      >
        <div className="theme-test-form__tip-panel-inner">
          <p className="theme-test-form__tip-body type-body-sm mb-0">
            <span className="theme-test-form__tip-label type-overline">Tip</span>
            {hint}
          </p>
        </div>
      </div>
    </div>
  )
}

function shortTextInputType(format: TestFormShortTextFormat | undefined): string {
  switch (format) {
    case 'number':
      return 'number'
    case 'email':
      return 'email'
    case 'phone':
      return 'tel'
    default:
      return 'text'
  }
}

function shortTextInputMode(
  format: TestFormShortTextFormat | undefined,
): 'decimal' | 'email' | 'tel' | 'text' | undefined {
  switch (format) {
    case 'number':
      return 'decimal'
    case 'email':
      return 'email'
    case 'phone':
      return 'tel'
    default:
      return undefined
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="theme-test-form__field-error type-caption type-error" role="alert">
      {message}
    </p>
  )
}

export function QuestionTake({
  question,
  mode,
  response,
  onChange,
  showHint = false,
  number,
  score,
  fieldError,
}: QuestionTakeProps) {
  const readOnly = mode === 'review'
  const ordinalUnset =
    question.kind === 'ordinal' && response.kind === 'ordinal' && response.value == null
  const hint = question.hint?.trim() ?? ''
  const format = question.kind === 'short_text' ? question.inputFormat ?? 'text' : 'text'
  const invalid = Boolean(fieldError)

  return (
    <article
      className={[
        'theme-test-form__question',
        invalid ? 'theme-test-form__question--invalid' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-kind={question.kind}
      data-test-form-question={question.id}
    >
      <div className="theme-test-form__question-head">
        <div className="theme-test-form__question-lead min-w-0 flex-1 space-y-1">
          <h4 className="theme-test-form__prompt">
            {typeof number === 'number' ? (
              <span className="theme-test-form__qnum" aria-hidden>
                {number}.
              </span>
            ) : null}
            <span className="theme-test-form__prompt-text">{question.prompt}</span>
            {question.required ? (
              <span className="theme-test-form__required" aria-hidden>
                *
              </span>
            ) : null}
          </h4>
          {question.description?.trim() ? (
            <p className="theme-test-form__description type-body-sm mb-0">{question.description}</p>
          ) : null}
        </div>
        <div className="theme-test-form__question-meta">
          {typeof question.points === 'number' ? (
            <span className="type-caption type-muted">{question.points} pts</span>
          ) : null}
          {mode === 'review' ? <ReviewFlag score={score} /> : null}
        </div>
      </div>
      {showHint && hint ? <QuestionTip hint={hint} /> : null}
      <div
        className={[
          'theme-test-form__body',
          question.kind === 'ordinal_grid' ? 'theme-test-form__body--wide' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {question.kind === 'short_text' && response.kind === 'short_text' ? (
          format === 'date' ? (
            <VurifyDateInput
              label="Your answer"
              value={response.value}
              onValueChange={(value) => onChange({ kind: 'short_text', value })}
              disabled={readOnly}
              required={question.required}
              aria-invalid={invalid}
            />
          ) : (
            <VurifyInput
              label="Your answer"
              type={shortTextInputType(format)}
              inputMode={shortTextInputMode(format)}
              value={response.value}
              onChange={(e) => onChange({ kind: 'short_text', value: e.target.value })}
              disabled={readOnly}
              required={question.required}
              aria-invalid={invalid}
              autoComplete={format === 'email' ? 'email' : format === 'phone' ? 'tel' : 'off'}
            />
          )
        ) : null}
        {question.kind === 'essay' && response.kind === 'essay' ? (
          <VurifyInput
            variant="area"
            label="Your answer"
            rows={5}
            value={response.value}
            onChange={(e) => onChange({ kind: 'essay', value: e.target.value })}
            disabled={readOnly}
            required={question.required}
            aria-invalid={invalid}
          />
        ) : null}
        {question.kind === 'mcq_single' && response.kind === 'mcq_single' ? (
          <RadioGroup
            variant="classic"
            options={question.options.map((o) => ({ value: o.id, label: o.label }))}
            value={response.optionId ?? ''}
            onChange={(optionId) => onChange({ kind: 'mcq_single', optionId })}
            disabled={readOnly}
          />
        ) : null}
        {question.kind === 'mcq_multi' && response.kind === 'mcq_multi' ? (
          <CheckboxGroup
            variant="classic"
            options={question.options.map((o) => ({ value: o.id, label: o.label }))}
            value={response.optionIds}
            onChange={(optionIds) => onChange({ kind: 'mcq_multi', optionIds })}
            disabled={readOnly}
            aria-label="Choices"
          />
        ) : null}
        {question.kind === 'dropdown' && response.kind === 'dropdown' ? (
          <VurifySelect
            label="Select an option"
            options={question.options.map((o) => ({ value: o.id, label: o.label }))}
            value={response.optionId ?? ''}
            onChange={(optionId) => onChange({ kind: 'dropdown', optionId })}
            disabled={readOnly}
            placeholder="Choose…"
          />
        ) : null}
        {question.kind === 'fill_blank' && response.kind === 'fill_blank' ? (
          <p className="theme-test-form__fill" aria-label="Fill in the blanks">
            {(Array.isArray(question.segments) ? question.segments : []).map((seg, index) => {
              if (seg.type === 'text') {
                return (
                  <span key={`t-${index}`} className="theme-test-form__fill-text">
                    {seg.text}
                  </span>
                )
              }
              return (
                <VurifyInput
                  key={seg.blankId}
                  className="theme-test-form__fill-vurify"
                  label={seg.placeholder || `Blank ${index + 1}`}
                  value={response.blanks[seg.blankId] ?? ''}
                  disabled={readOnly}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={invalid}
                  onChange={(e) =>
                    onChange({
                      kind: 'fill_blank',
                      blanks: { ...response.blanks, [seg.blankId]: e.target.value },
                    })
                  }
                />
              )
            })}
          </p>
        ) : null}
        {question.kind === 'ordinal' && response.kind === 'ordinal' ? (
          <div className="theme-test-form__scale">
            <Slider
              variant="scale"
              min={question.scale.min}
              max={question.scale.max}
              step={question.scale.step ?? 1}
              value={response.value}
              onChange={(value) => onChange({ kind: 'ordinal', value })}
              minLabel={question.scale.minLabel}
              maxLabel={question.scale.maxLabel}
              disabled={readOnly}
              aria-label={question.prompt}
            />
            {ordinalUnset && !readOnly ? (
              <p className="type-caption type-muted mb-0">Select a value on the scale.</p>
            ) : null}
          </div>
        ) : null}
        {question.kind === 'ordinal_grid' && response.kind === 'ordinal_grid' ? (
          <div className="theme-test-form__matrix-wrap">
            <table className="theme-test-form__matrix">
              <colgroup>
                <col className="theme-test-form__matrix-colgroup-label" />
                {question.columns.map((col, colIndex) => (
                  <col
                    key={col.id || `col-${colIndex}`}
                    className="theme-test-form__matrix-colgroup-choice"
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="theme-test-form__matrix-corner">
                    <span className="sr-only">Statement</span>
                  </th>
                  {question.columns.map((col, colIndex) => (
                    <th key={col.id || `col-${colIndex}`} scope="col" className="theme-test-form__matrix-col">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {question.rows.map((row, rowIndex) => (
                  <tr key={row.id || `row-${rowIndex}`}>
                    <th scope="row" className="theme-test-form__matrix-row">
                      {row.label}
                    </th>
                    {question.columns.map((col, colIndex) => {
                      const selected = response.values[row.id] === col.id
                      return (
                        <td
                          key={col.id || `cell-${rowIndex}-${colIndex}`}
                          className="theme-test-form__matrix-cell"
                        >
                          <label className="theme-test-form__matrix-choice">
                            <input
                              type="radio"
                              className="theme-test-form__matrix-input"
                              name={`${question.id}-${row.id || rowIndex}`}
                              checked={selected}
                              disabled={readOnly}
                              onChange={() =>
                                onChange({
                                  kind: 'ordinal_grid',
                                  values: { ...response.values, [row.id]: col.id },
                                })
                              }
                            />
                            <span className="theme-test-form__matrix-radio" aria-hidden />
                            <span className="sr-only">
                              {row.label}: {col.label}
                            </span>
                          </label>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <FieldError message={fieldError} />
        {mode === 'review' && score?.notes ? (
          <p className="type-caption type-muted mb-0">{score.notes}</p>
        ) : null}
      </div>
    </article>
  )
}
