import {
  emptyAnswerKeyForQuestion,
  type TestFormAnswerKeyEntry,
  type TestFormQuestion,
} from '../../lib/testForm'
import { CheckboxGroup } from '../CheckboxGroup'
import { Modal } from '../Modal'
import { RadioGroup } from '../RadioGroup'
import { Slider } from '../Slider'
import { ToggleGroup } from '../ToggleGroup'
import { VurifyInput } from '../VurifyInput'

type AnswerKeyModalProps = {
  open: boolean
  question: TestFormQuestion | null
  answerKey?: TestFormAnswerKeyEntry
  onKeyChange: (next: TestFormAnswerKeyEntry) => void
  onClose: () => void
}

function AnswerKeyEditor({
  question,
  answerKey,
  onKeyChange,
}: {
  question: TestFormQuestion
  answerKey?: TestFormAnswerKeyEntry
  onKeyChange: (next: TestFormAnswerKeyEntry) => void
}) {
  const key =
    answerKey && answerKey.kind === question.kind
      ? answerKey
      : emptyAnswerKeyForQuestion(question)

  return (
    <div className="theme-test-form__key-body">
      {key.kind === 'short_text' ? (
        <div className="theme-test-form__author-grid">
          <div className="theme-test-form__author-grid--full">
            <ToggleGroup
              mode="single"
              variant="vurify"
              size="sm"
              options={[
                { value: 'exact', label: 'Exact' },
                { value: 'contains', label: 'Contains' },
                { value: 'regex', label: 'Regex' },
              ]}
              value={key.match}
              onChange={(next) => {
                const match = typeof next === 'string' ? next : next[0]
                if (match !== 'exact' && match !== 'contains' && match !== 'regex') return
                onKeyChange({ ...key, match })
              }}
              aria-label="Match mode"
            />
          </div>
          <VurifyInput
            label="Expected"
            value={key.value}
            onChange={(e) => onKeyChange({ ...key, value: e.target.value })}
          />
          <div className="theme-test-form__author-grid--full">
            <VurifyInput
              label="Rejects (comma-separated — auto-fail if matched)"
              value={(key.rejects ?? []).join(', ')}
              onChange={(e) =>
                onKeyChange({
                  ...key,
                  rejects: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>
      ) : null}
      {key.kind === 'essay' ? (
        <div className="theme-test-form__author-grid">
          <VurifyInput
            label="Keywords (comma-separated)"
            value={(key.keywords ?? []).join(', ')}
            onChange={(e) =>
              onKeyChange({
                ...key,
                keywords: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <VurifyInput
            label="Rubric notes"
            value={key.rubricNotes ?? ''}
            onChange={(e) => onKeyChange({ ...key, rubricNotes: e.target.value })}
          />
        </div>
      ) : null}
      {key.kind === 'mcq_single' && question.kind === 'mcq_single' ? (
        <RadioGroup
          variant="classic"
          options={question.options.map((o) => ({ value: o.id, label: o.label || o.id }))}
          value={key.optionId || question.options[0]?.id || ''}
          onChange={(optionId) => onKeyChange({ kind: 'mcq_single', optionId })}
          aria-label="Correct option"
        />
      ) : null}
      {key.kind === 'dropdown' && question.kind === 'dropdown' ? (
        <RadioGroup
          variant="classic"
          options={question.options.map((o) => ({ value: o.id, label: o.label || o.id }))}
          value={key.optionId || question.options[0]?.id || ''}
          onChange={(optionId) => onKeyChange({ kind: 'dropdown', optionId })}
          aria-label="Correct option"
        />
      ) : null}
      {key.kind === 'mcq_multi' && question.kind === 'mcq_multi' ? (
        <CheckboxGroup
          variant="classic"
          options={question.options.map((o) => ({ value: o.id, label: o.label || o.id }))}
          value={key.optionIds}
          onChange={(optionIds) => onKeyChange({ kind: 'mcq_multi', optionIds })}
          aria-label="Correct options"
        />
      ) : null}
      {key.kind === 'fill_blank' && question.kind === 'fill_blank' ? (
        <div className="theme-test-form__options">
          {question.segments
            .filter((s): s is Extract<typeof s, { type: 'blank' }> => s.type === 'blank')
            .map((blank, index) => (
              <div key={blank.blankId} className="theme-test-form__blank-key">
                <VurifyInput
                  label={`Blank ${index + 1} accepted (comma-separated)`}
                  value={(key.blanks[blank.blankId] ?? []).join(', ')}
                  onChange={(e) =>
                    onKeyChange({
                      kind: 'fill_blank',
                      blanks: {
                        ...key.blanks,
                        [blank.blankId]: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                      rejects: key.rejects,
                    })
                  }
                />
                <VurifyInput
                  label={`Blank ${index + 1} rejects (comma-separated)`}
                  value={(key.rejects?.[blank.blankId] ?? []).join(', ')}
                  onChange={(e) =>
                    onKeyChange({
                      kind: 'fill_blank',
                      blanks: key.blanks,
                      rejects: {
                        ...(key.rejects ?? {}),
                        [blank.blankId]: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                />
              </div>
            ))}
        </div>
      ) : null}
      {key.kind === 'ordinal' && question.kind === 'ordinal' ? (
        <div className="theme-test-form__scale">
          <p className="type-caption type-muted mb-0">Accepted band (min → max)</p>
          <Slider
            variant="scale"
            label="Min accepted"
            min={question.scale.min}
            max={question.scale.max}
            step={question.scale.step ?? 1}
            value={key.min ?? question.scale.min}
            onChange={(min) =>
              onKeyChange({
                ...key,
                min,
                max: Math.max(min, key.max ?? question.scale.max),
              })
            }
            minLabel={question.scale.minLabel}
            maxLabel={question.scale.maxLabel}
          />
          <Slider
            variant="scale"
            label="Max accepted"
            min={question.scale.min}
            max={question.scale.max}
            step={question.scale.step ?? 1}
            value={key.max ?? question.scale.max}
            onChange={(max) =>
              onKeyChange({
                ...key,
                max,
                min: Math.min(max, key.min ?? question.scale.min),
              })
            }
            minLabel={question.scale.minLabel}
            maxLabel={question.scale.maxLabel}
          />
        </div>
      ) : null}
      {key.kind === 'ordinal_grid' && question.kind === 'ordinal_grid' ? (
        <div className="theme-test-form__options">
          <p className="type-caption type-muted mb-0">
            Optional expected column per row (leave Any for manual review).
          </p>
          {question.rows.map((row) => (
            <div key={row.id} className="theme-test-form__grid-key-row">
              <p className="type-caption mb-0">{row.label || 'Row'}</p>
              <ToggleGroup
                mode="single"
                variant="vurify"
                size="sm"
                options={[
                  { value: '', label: 'Any' },
                  ...question.columns.map((c) => ({ value: c.id, label: c.label || c.id })),
                ]}
                value={(key.expected ?? {})[row.id] ?? ''}
                onChange={(next) => {
                  const colId = typeof next === 'string' ? next : (next[0] ?? '')
                  const expected = { ...(key.expected ?? {}) }
                  if (!colId) delete expected[row.id]
                  else expected[row.id] = colId
                  onKeyChange({ ...key, expected })
                }}
                aria-label={`Expected for ${row.label}`}
              />
            </div>
          ))}
          <VurifyInput
            label="Rubric notes"
            value={key.rubricNotes ?? ''}
            onChange={(e) => onKeyChange({ ...key, rubricNotes: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Container-scoped marking dialog — same pattern as CodeEditor / FileExplorer / DocEditor
 * (`Modal placement="container"` on the `position: relative` workbench root).
 */
export function AnswerKeyModal({
  open,
  question,
  answerKey,
  onKeyChange,
  onClose,
}: AnswerKeyModalProps) {
  return (
    <Modal
      open={open && Boolean(question)}
      title="Answer key"
      onClose={onClose}
      cancelLabel="Done"
      size="md"
      placement="container"
      cardVariant="vurify-outlined"
      footerStyle="vurify"
      className="theme-test-form__key-dialog"
    >
      {question ? (
        <div className="theme-test-form__key-modal">
          <p className="type-caption type-muted mb-0">
            Scoring key for this question — edits apply immediately.
          </p>
          <AnswerKeyEditor
            question={question}
            answerKey={answerKey}
            onKeyChange={onKeyChange}
          />
        </div>
      ) : null}
    </Modal>
  )
}
