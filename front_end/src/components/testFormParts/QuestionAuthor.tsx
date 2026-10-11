import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  emptyAnswerKeyForQuestion,
  newTestFormId,
  type TestFormAnswerKeyEntry,
  type TestFormQuestion,
  type TestFormQuestionKind,
  type TestFormShortTextFormat,
} from '../../lib/testForm'
import { Card } from '../Card'
import { CheckboxGroup } from '../CheckboxGroup'
import { RadioGroup } from '../RadioGroup'
import { Slider } from '../Slider'
import { VurifyMenuButton } from '../VurifyMenuButton'
import { VurifyCountInput } from '../VurifyCountInput'
import { VurifyDateInput } from '../VurifyDateInput'
import { VurifyInput } from '../VurifyInput'
import { VurifySelect } from '../VurifySelect'
import { AuthorEditable } from './AuthorEditable'
import { AuthorRemoveBtn } from './AuthorRemoveBtn'
import { formQuestionTocId } from './formToc'
import { QuestionBlockChrome } from './QuestionBlockChrome'
import {
  buildQuestionEdgeItems,
  parseQuestionEdgeAction,
} from './questionEdgeMenu'

type QuestionAuthorProps = {
  question: TestFormQuestion
  /** 1-based index across the whole assessment */
  number?: number
  answerKey?: TestFormAnswerKeyEntry
  onChange: (next: TestFormQuestion) => void
  onKeyChange: (next: TestFormAnswerKeyEntry) => void
  onOpenMarking: () => void
  onRemove: () => void
  /** Exclusive Answer preview accordion — start closed; opening one closes others. */
  answerPreviewOpen?: boolean
  onAnswerPreviewOpenChange?: (open: boolean) => void
}

function sharedOptions(question: TestFormQuestion) {
  if (
    question.kind === 'mcq_single' ||
    question.kind === 'mcq_multi' ||
    question.kind === 'dropdown'
  ) {
    return question.options
  }
  return [
    { id: newTestFormId('opt'), label: 'Option A' },
    { id: newTestFormId('opt'), label: 'Option B' },
  ]
}

function coerceKind(question: TestFormQuestion, kind: TestFormQuestionKind): TestFormQuestion {
  if (question.kind === kind) return question
  const base = {
    id: question.id,
    prompt: question.prompt,
    required: question.required,
    points: question.points,
    hint: question.hint,
    description: question.description,
    sectionId: question.sectionId,
  }
  switch (kind) {
    case 'short_text':
      return {
        ...base,
        kind,
        inputFormat:
          question.kind === 'short_text' ? question.inputFormat ?? 'text' : 'text',
      }
    case 'essay':
      return { ...base, kind }
    case 'mcq_single':
    case 'mcq_multi':
    case 'dropdown':
      return {
        ...base,
        kind,
        options: sharedOptions(question),
      }
    case 'fill_blank':
      return question.kind === 'fill_blank'
        ? question
        : {
            ...base,
            kind,
            segments: [
              { type: 'text', text: 'I am ' },
              { type: 'blank', blankId: newTestFormId('blank'), placeholder: '…' },
              { type: 'text', text: ' going to ' },
              { type: 'blank', blankId: newTestFormId('blank'), placeholder: '…' },
              { type: 'text', text: '.' },
            ],
          }
    case 'ordinal':
      return question.kind === 'ordinal'
        ? question
        : {
            ...base,
            kind,
            scale: {
              min: 1,
              max: 5,
              step: 1,
              minLabel: 'Strongly disagree',
              maxLabel: 'Strongly agree',
            },
          }
    case 'ordinal_grid':
      return question.kind === 'ordinal_grid'
        ? question
        : {
            ...base,
            kind,
            rows: [
              { id: newTestFormId('row'), label: 'Statement A' },
              { id: newTestFormId('row'), label: 'Statement B' },
            ],
            columns: [
              { id: newTestFormId('col'), label: '1' },
              { id: newTestFormId('col'), label: '2' },
              { id: newTestFormId('col'), label: '3' },
              { id: newTestFormId('col'), label: '4' },
              { id: newTestFormId('col'), label: '5' },
            ],
          }
  }
}

function QuietAddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="theme-test-form__quiet-btn" onClick={onClick}>
      {label}
    </button>
  )
}

/** Preview shell + Edit marking / Answer preview underline controls (VV quiet adds stay separate). */
function AnswerPreviewCard({
  children,
  wide = false,
  open,
  onOpenChange,
  onEditMarking,
}: {
  children: ReactNode
  wide?: boolean
  /** Exclusive accordion — only one preview open across the form. */
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditMarking: () => void
}) {
  return (
    <div
      className={[
        'theme-test-form__preview-block',
        open ? 'theme-test-form__preview-block--open' : '',
        wide ? 'theme-test-form__preview-block--wide' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-test-form__preview-tools" role="group" aria-label="Preview tools">
        <VurifyMenuButton
          type="button"
          variant="label"
          size="sm"
          activeChrome={false}
          lineTone="muted"
          onClick={onEditMarking}
        >
          Edit marking
        </VurifyMenuButton>
        <span className="theme-test-form__preview-tools-rule" aria-hidden />
        <VurifyMenuButton
          type="button"
          variant="label"
          size="sm"
          activeChrome={false}
          lineTone={open ? 'accent' : 'muted'}
          icon={open ? ChevronUp : ChevronDown}
          iconPosition="right"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          Answer preview
        </VurifyMenuButton>
      </div>
      <div className="theme-test-form__preview-fold" aria-hidden={!open}>
        <div className="theme-test-form__preview-fold-inner">
          <Card
            variant="vurify-outlined"
            className="theme-test-form__answer-preview"
          >
            {children}
          </Card>
        </div>
      </div>
    </div>
  )
}

function OptionListEditor({
  options,
  onChange,
  mark,
}: {
  options: { id: string; label: string }[]
  onChange: (options: { id: string; label: string }[]) => void
  mark: 'radio' | 'check' | 'drop'
}) {
  return (
    <div className="theme-test-form__options-block">
      <ul className="theme-test-form__doc-list" aria-label="Options">
        {options.map((option, index) => (
          <li key={option.id} className="theme-test-form__list-row">
            <span
              className={[
                'theme-test-form__list-mark',
                `theme-test-form__list-mark--${mark}`,
              ].join(' ')}
              aria-hidden
            />
            <AuthorEditable
              className="theme-test-form__list-edit"
              value={option.label}
              placeholder={`Option ${index + 1}`}
              aria-label={`Option ${index + 1}`}
              onChange={(label) => {
                onChange(options.map((o) => (o.id === option.id ? { ...o, label } : o)))
              }}
            />
            {options.length > 2 ? (
              <AuthorRemoveBtn
                label={`Remove option ${index + 1}`}
                onClick={() => onChange(options.filter((o) => o.id !== option.id))}
              />
            ) : (
              <span className="theme-test-form__list-remove-spacer" aria-hidden />
            )}
          </li>
        ))}
      </ul>
      <QuietAddBtn
        label="Add option"
        onClick={() =>
          onChange([...options, { id: newTestFormId('opt'), label: `Option ${options.length + 1}` }])
        }
      />
    </div>
  )
}

function LabelListEditor({
  items,
  onChange,
  onAdd,
  addLabel,
  minCount,
  placeholder,
  ariaLabel,
}: {
  items: { id: string; label: string }[]
  onChange: (items: { id: string; label: string }[]) => void
  onAdd: () => void
  addLabel: string
  minCount: number
  placeholder: (index: number) => string
  ariaLabel: string
}) {
  return (
    <div className="theme-test-form__options-block">
      <ul className="theme-test-form__doc-list" aria-label={ariaLabel}>
        {items.map((item, index) => (
          <li key={item.id} className="theme-test-form__list-row">
            <span className="theme-test-form__list-bullet" aria-hidden>
              •
            </span>
            <AuthorEditable
              className="theme-test-form__list-edit"
              value={item.label}
              placeholder={placeholder(index)}
              aria-label={placeholder(index)}
              onChange={(label) => {
                onChange(items.map((row) => (row.id === item.id ? { ...row, label } : row)))
              }}
            />
            {items.length > minCount ? (
              <AuthorRemoveBtn
                label={`Remove ${placeholder(index)}`}
                onClick={() => onChange(items.filter((row) => row.id !== item.id))}
              />
            ) : (
              <span className="theme-test-form__list-remove-spacer" aria-hidden />
            )}
          </li>
        ))}
      </ul>
      <QuietAddBtn label={addLabel} onClick={onAdd} />
    </div>
  )
}

export function QuestionAuthor({
  question,
  number,
  answerKey: _answerKey,
  onChange,
  onKeyChange,
  onOpenMarking,
  onRemove,
  answerPreviewOpen = false,
  onAnswerPreviewOpenChange,
}: QuestionAuthorProps) {
  const [descriptionOpen, setDescriptionOpen] = useState(
    () => Boolean(question.description?.trim()),
  )
  const [tipOpen, setTipOpen] = useState(() => Boolean(question.hint?.trim()))

  useEffect(() => {
    if (question.description?.trim()) setDescriptionOpen(true)
  }, [question.description])

  useEffect(() => {
    if (question.hint?.trim()) setTipOpen(true)
  }, [question.hint])

  const menuItems = useMemo(
    () =>
      buildQuestionEdgeItems({
        kind: question.kind,
        required: Boolean(question.required),
        descriptionOpen,
        tipOpen,
        inputFormat: question.kind === 'short_text' ? question.inputFormat : undefined,
        points: question.points,
      }),
    [
      question.kind,
      question.required,
      question.points,
      question.kind === 'short_text' ? question.inputFormat : undefined,
      descriptionOpen,
      tipOpen,
    ],
  )

  const onEdgeSelect = (id: string) => {
    const action = parseQuestionEdgeAction(id)
    if (!action) return
    switch (action.type) {
      case 'kind': {
        const next = coerceKind(question, action.kind)
        onChange(next)
        onKeyChange(emptyAnswerKeyForQuestion(next))
        break
      }
      case 'add-description':
        setDescriptionOpen(true)
        break
      case 'add-tip':
        setTipOpen(true)
        break
      case 'open-marking':
        onOpenMarking()
        break
      case 'set-required':
        onChange({ ...question, required: action.required })
        break
      case 'format':
        if (question.kind === 'short_text') {
          onChange({ ...question, inputFormat: action.format as TestFormShortTextFormat })
        }
        break
      case 'points':
        onChange({ ...question, points: action.points })
        break
    }
  }

  const clearDescription = () => {
    setDescriptionOpen(false)
    if (question.description) onChange({ ...question, description: '' })
  }

  const clearTip = () => {
    setTipOpen(false)
    if (question.hint) onChange({ ...question, hint: '' })
  }

  return (
    <article
      className="theme-test-form__question theme-test-form__question--author"
      data-kind={question.kind}
      data-test-form-question={question.id}
      id={formQuestionTocId(question.id)}
    >
      <QuestionBlockChrome menuItems={menuItems} onSelect={onEdgeSelect}>
        <div className="theme-test-form__question-head">
          <div className="theme-test-form__question-lead min-w-0 flex-1 space-y-1">
            <div className="theme-test-form__prompt theme-test-form__prompt--author">
              {typeof number === 'number' ? (
                <span className="theme-test-form__qnum" aria-hidden>
                  {number}.
                </span>
              ) : null}
              <AuthorEditable
                className="theme-test-form__prompt-edit"
                value={question.prompt}
                placeholder="Question"
                allowEmpty={false}
                aria-label="Question"
                onChange={(prompt) => onChange({ ...question, prompt })}
              />
              {question.required ? (
                <span className="theme-test-form__required" aria-hidden>
                  *
                </span>
              ) : null}
              <AuthorRemoveBtn label="Remove question" onClick={onRemove} />
            </div>
            {descriptionOpen ? (
              <div className="theme-test-form__band-row">
                <AuthorEditable
                  className="theme-test-form__description-edit"
                  value={question.description ?? ''}
                  placeholder="Description (optional)"
                  multiline
                  rows={2}
                  aria-label="Description"
                  onChange={(description) => onChange({ ...question, description })}
                />
                <AuthorRemoveBtn label="Remove description" onClick={clearDescription} />
              </div>
            ) : null}
          </div>
          <div className="theme-test-form__question-meta">
            <label className="theme-test-form__points-edit">
              <AuthorEditable
                className="theme-test-form__points-value"
                value={question.points != null ? String(question.points) : '1'}
                placeholder="1"
                aria-label="Points"
                onChange={(raw) => {
                  const trimmed = raw.trim()
                  if (!trimmed) {
                    onChange({ ...question, points: undefined })
                    return
                  }
                  const n = Number(trimmed)
                  if (!Number.isFinite(n)) return
                  onChange({ ...question, points: Math.max(0, Math.min(100, Math.round(n))) })
                }}
              />
              <span className="type-caption type-muted">pts</span>
            </label>
          </div>
        </div>

        {tipOpen ? (
          <div className="theme-test-form__tip-edit theme-test-form__band-row">
            <AuthorEditable
              className="theme-test-form__list-edit"
              value={question.hint ?? ''}
              placeholder="Tip shown in Take (optional)"
              multiline
              rows={2}
              aria-label="Tip"
              onChange={(hint) => onChange({ ...question, hint })}
            />
            <AuthorRemoveBtn label="Remove tip" onClick={clearTip} />
          </div>
        ) : null}

        <div
          className={[
            'theme-test-form__body',
            question.kind === 'ordinal_grid' ? 'theme-test-form__body--wide' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {question.kind === 'mcq_single' ||
          question.kind === 'mcq_multi' ||
          question.kind === 'dropdown' ? (
            <>
              <OptionListEditor
                options={question.options}
                mark={
                  question.kind === 'mcq_multi'
                    ? 'check'
                    : question.kind === 'dropdown'
                      ? 'drop'
                      : 'radio'
                }
                onChange={(options) => onChange({ ...question, options })}
              />
              <AnswerPreviewCard
                onEditMarking={onOpenMarking}
                open={answerPreviewOpen}
                onOpenChange={(next) => onAnswerPreviewOpenChange?.(next)}
              >
                {question.kind === 'mcq_single' ? (
                  <RadioGroup
                    variant="classic"
                    options={question.options.map((o) => ({
                      value: o.id,
                      label: o.label || 'Option',
                    }))}
                    value=""
                    onChange={() => {}}
                    disabled
                  />
                ) : null}
                {question.kind === 'mcq_multi' ? (
                  <CheckboxGroup
                    variant="classic"
                    options={question.options.map((o) => ({
                      value: o.id,
                      label: o.label || 'Option',
                    }))}
                    value={[]}
                    onChange={() => {}}
                    disabled
                    aria-label="Choices preview"
                  />
                ) : null}
                {question.kind === 'dropdown' ? (
                  <VurifySelect
                    label="Select an option"
                    options={question.options.map((o) => ({
                      value: o.id,
                      label: o.label || 'Option',
                    }))}
                    value=""
                    onChange={() => {}}
                    disabled
                    placeholder="Choose…"
                  />
                ) : null}
              </AnswerPreviewCard>
            </>
          ) : null}

          {question.kind === 'fill_blank' ? (
            <div className="theme-test-form__fill-author">
              <ul className="theme-test-form__doc-list" aria-label="Fill-blank segments">
                {(Array.isArray(question.segments) ? question.segments : []).map((seg, index) => (
                  <li
                    key={seg.type === 'blank' ? seg.blankId : `t-${index}`}
                    className="theme-test-form__list-row theme-test-form__list-row--segment"
                  >
                    <span className="theme-test-form__list-seg-kind type-caption type-muted" aria-hidden>
                      {seg.type === 'text' ? 'Text' : 'Blank'}
                    </span>
                    {seg.type === 'text' ? (
                      <AuthorEditable
                        className="theme-test-form__list-edit"
                        value={seg.text}
                        placeholder="Text…"
                        aria-label={`Segment text ${index + 1}`}
                        onChange={(text) => {
                          const segments = question.segments.map((s, i) =>
                            i === index && s.type === 'text' ? { ...s, text } : s,
                          )
                          onChange({ ...question, segments })
                        }}
                      />
                    ) : (
                      <AuthorEditable
                        className="theme-test-form__list-edit"
                        value={seg.placeholder ?? ''}
                        placeholder="Blank label"
                        aria-label={`Blank ${index + 1}`}
                        onChange={(placeholder) => {
                          const segments = question.segments.map((s) =>
                            s.type === 'blank' && s.blankId === seg.blankId
                              ? { ...s, placeholder }
                              : s,
                          )
                          onChange({ ...question, segments })
                        }}
                      />
                    )}
                    {question.segments.length > 1 ? (
                      <AuthorRemoveBtn
                        label={`Remove segment ${index + 1}`}
                        onClick={() => {
                          onChange({
                            ...question,
                            segments: question.segments.filter((_, i) => i !== index),
                          })
                        }}
                      />
                    ) : (
                      <span className="theme-test-form__list-remove-spacer" aria-hidden />
                    )}
                  </li>
                ))}
              </ul>
              <div className="theme-test-form__fill-add-row">
                <QuietAddBtn
                  label="Add text"
                  onClick={() =>
                    onChange({
                      ...question,
                      segments: [...question.segments, { type: 'text', text: ' ' }],
                    })
                  }
                />
                <QuietAddBtn
                  label="Add blank"
                  onClick={() =>
                    onChange({
                      ...question,
                      segments: [
                        ...question.segments,
                        {
                          type: 'blank',
                          blankId: newTestFormId('blank'),
                          placeholder: '…',
                        },
                      ],
                    })
                  }
                />
              </div>
              <AnswerPreviewCard
                onEditMarking={onOpenMarking}
                open={answerPreviewOpen}
                onOpenChange={(next) => onAnswerPreviewOpenChange?.(next)}
              >
                <p className="theme-test-form__fill" aria-hidden>
                  {question.segments.map((seg, index) => {
                    if (seg.type === 'text') {
                      return (
                        <span key={`pv-t-${index}`} className="theme-test-form__fill-text">
                          {seg.text}
                        </span>
                      )
                    }
                    return (
                      <VurifyInput
                        key={`pv-${seg.blankId}`}
                        className="theme-test-form__fill-vurify"
                        label={seg.placeholder || 'Blank'}
                        value=""
                        disabled
                        autoComplete="off"
                      />
                    )
                  })}
                </p>
              </AnswerPreviewCard>
            </div>
          ) : null}

          {question.kind === 'ordinal' ? (
            <div className="theme-test-form__scale-author">
              <div className="theme-test-form__scale-labels">
                <AuthorEditable
                  className="theme-test-form__list-edit"
                  value={question.scale.minLabel ?? ''}
                  placeholder="Low label"
                  aria-label="Low label"
                  onChange={(minLabel) =>
                    onChange({ ...question, scale: { ...question.scale, minLabel } })
                  }
                />
                <AuthorEditable
                  className="theme-test-form__list-edit"
                  value={question.scale.maxLabel ?? ''}
                  placeholder="High label"
                  aria-label="High label"
                  onChange={(maxLabel) =>
                    onChange({ ...question, scale: { ...question.scale, maxLabel } })
                  }
                />
              </div>
              <div className="theme-test-form__scale-range">
                <VurifyCountInput
                  label="Min"
                  value={String(question.scale.min)}
                  onValueChange={(v) =>
                    onChange({
                      ...question,
                      scale: { ...question.scale, min: Number(v) || 0 },
                    })
                  }
                  min={0}
                  max={100}
                />
                <VurifyCountInput
                  label="Max"
                  value={String(question.scale.max)}
                  onValueChange={(v) =>
                    onChange({
                      ...question,
                      scale: { ...question.scale, max: Number(v) || 1 },
                    })
                  }
                  min={1}
                  max={100}
                />
              </div>
              <AnswerPreviewCard
                onEditMarking={onOpenMarking}
                open={answerPreviewOpen}
                onOpenChange={(next) => onAnswerPreviewOpenChange?.(next)}
              >
                <Slider
                  variant="scale"
                  min={question.scale.min}
                  max={question.scale.max}
                  step={question.scale.step ?? 1}
                  value={Math.round((question.scale.min + question.scale.max) / 2)}
                  minLabel={question.scale.minLabel}
                  maxLabel={question.scale.maxLabel}
                  disabled
                  aria-label="Linear scale preview"
                />
              </AnswerPreviewCard>
            </div>
          ) : null}

          {question.kind === 'ordinal_grid' ? (
            <div className="theme-test-form__grid-author">
              <div className="theme-test-form__grid-author-col">
                <p className="type-overline mb-0">Rows</p>
                <LabelListEditor
                  items={question.rows}
                  minCount={1}
                  ariaLabel="Rows"
                  addLabel="Add row"
                  placeholder={(index) => `Statement ${index + 1}`}
                  onChange={(rows) => onChange({ ...question, rows })}
                  onAdd={() =>
                    onChange({
                      ...question,
                      rows: [
                        ...question.rows,
                        {
                          id: newTestFormId('row'),
                          label: `Statement ${question.rows.length + 1}`,
                        },
                      ],
                    })
                  }
                />
              </div>
              <div className="theme-test-form__grid-author-col">
                <p className="type-overline mb-0">Columns</p>
                <LabelListEditor
                  items={question.columns}
                  minCount={2}
                  ariaLabel="Columns"
                  addLabel="Add column"
                  placeholder={(index) => `Col ${index + 1}`}
                  onChange={(columns) => onChange({ ...question, columns })}
                  onAdd={() =>
                    onChange({
                      ...question,
                      columns: [
                        ...question.columns,
                        {
                          id: newTestFormId('col'),
                          label: String(question.columns.length + 1),
                        },
                      ],
                    })
                  }
                />
              </div>
              <AnswerPreviewCard
                wide
                onEditMarking={onOpenMarking}
                open={answerPreviewOpen}
                onOpenChange={(next) => onAnswerPreviewOpenChange?.(next)}
              >
                <div className="theme-test-form__matrix-wrap">
                  <table className="theme-test-form__matrix" aria-label="Grid preview">
                    <colgroup>
                      <col className="theme-test-form__matrix-colgroup-label" />
                      {question.columns.map((col) => (
                        <col key={col.id} className="theme-test-form__matrix-colgroup-choice" />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col" className="theme-test-form__matrix-corner">
                          <span className="sr-only">Statement</span>
                        </th>
                        {question.columns.map((col) => (
                          <th key={col.id} scope="col" className="theme-test-form__matrix-col">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {question.rows.map((row) => (
                        <tr key={row.id}>
                          <th scope="row" className="theme-test-form__matrix-row">
                            {row.label}
                          </th>
                          {question.columns.map((col) => (
                            <td key={col.id} className="theme-test-form__matrix-cell">
                              <label className="theme-test-form__matrix-choice">
                                <input
                                  type="radio"
                                  className="theme-test-form__matrix-input"
                                  name={`preview-${question.id}-${row.id}`}
                                  disabled
                                />
                                <span className="theme-test-form__matrix-radio" aria-hidden />
                              </label>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AnswerPreviewCard>
            </div>
          ) : null}

          {question.kind === 'short_text' ? (
            <AnswerPreviewCard
              onEditMarking={onOpenMarking}
              open={answerPreviewOpen}
              onOpenChange={(next) => onAnswerPreviewOpenChange?.(next)}
            >
              {(question.inputFormat ?? 'text') === 'date' ? (
                <VurifyDateInput label="Your answer" value="" onValueChange={() => {}} disabled />
              ) : (
                <VurifyInput
                  label="Your answer"
                  type={
                    question.inputFormat === 'number'
                      ? 'number'
                      : question.inputFormat === 'email'
                        ? 'email'
                        : question.inputFormat === 'phone'
                          ? 'tel'
                          : 'text'
                  }
                  value=""
                  onChange={() => {}}
                  disabled
                />
              )}
            </AnswerPreviewCard>
          ) : null}

          {question.kind === 'essay' ? (
            <AnswerPreviewCard
              onEditMarking={onOpenMarking}
              open={answerPreviewOpen}
              onOpenChange={(next) => onAnswerPreviewOpenChange?.(next)}
            >
              <VurifyInput
                variant="area"
                label="Your answer"
                rows={4}
                value=""
                onChange={() => {}}
                disabled
              />
            </AnswerPreviewCard>
          ) : null}
        </div>
      </QuestionBlockChrome>
    </article>
  )
}
