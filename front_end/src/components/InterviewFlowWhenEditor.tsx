import { Plus, Trash2 } from 'lucide-react'
import type { Creator2Condition, Creator2When } from '../lib/interviewBrief/creator2BriefTypes'
import { IconButton } from './IconButton'
import { VurifySelect } from './VurifySelect'
import { AuthorEditable } from './testFormParts/AuthorEditable'

type RefOption = { id: string; title: string }

type InterviewFlowWhenEditorProps = {
  value: Creator2When
  onChange: (next: Creator2When) => void
  toolOptions?: readonly RefOption[]
  phaseOptions?: readonly RefOption[]
  topicOptions?: readonly RefOption[]
  className?: string
}

type WhenMode = 'always' | 'all' | 'any'

function readMode(value: Creator2When): WhenMode {
  if (!value) return 'always'
  if (value.all?.length) return 'all'
  if (value.any?.length) return 'any'
  return 'always'
}

function emptyCondition(
  toolOptions: readonly RefOption[],
  phaseOptions: readonly RefOption[],
): Creator2Condition {
  if (toolOptions[0]?.id) return { toolPassed: toolOptions[0].id }
  if (phaseOptions[0]?.id) return { phaseCompleted: phaseOptions[0].id }
  return { toolPassed: '' }
}

export function InterviewFlowWhenEditor({
  value,
  onChange,
  toolOptions = [],
  phaseOptions = [],
  topicOptions = [],
  className = '',
}: InterviewFlowWhenEditorProps) {
  const mode = readMode(value)
  const conditions =
    mode === 'all' ? (value?.all ?? []) : mode === 'any' ? (value?.any ?? []) : []

  const setMode = (next: WhenMode) => {
    if (next === 'always') {
      onChange(null)
      return
    }
    const seed = conditions.length
      ? conditions
      : [emptyCondition(toolOptions, phaseOptions)]
    onChange(next === 'all' ? { all: seed } : { any: seed })
  }

  const writeConditions = (next: Creator2Condition[]) => {
    if (mode === 'always') return
    onChange(mode === 'all' ? { all: next } : { any: next })
  }

  const updateAt = (index: number, patch: Creator2Condition) => {
    writeConditions(conditions.map((c, i) => (i === index ? patch : c)))
  }

  const kindOf = (c: Creator2Condition): 'toolPassed' | 'phaseCompleted' | 'targetEquals' => {
    if (c.targetEquals) return 'targetEquals'
    if (c.phaseCompleted) return 'phaseCompleted'
    return 'toolPassed'
  }

  return (
    <div
      className={['theme-interview-flow-when', className].filter(Boolean).join(' ')}
      aria-label="When this section runs"
    >
      <VurifySelect
        label="When mode"
        variant="dropdown"
        scrollRail="hidden"
        options={[
          {
            value: 'always',
            label: 'Always',
            description: 'Always run this section',
          },
          {
            value: 'all',
            label: 'All of…',
            description: 'Only run if every rule below is true',
          },
          {
            value: 'any',
            label: 'Any of…',
            description: 'Run if at least one rule below is true',
          },
        ]}
        value={mode}
        onChange={(v) => setMode(v as WhenMode)}
        placeholder="Choose…"
      />

      {mode !== 'always' ? (
        <>
          <div
            className="theme-interview-flow-form__guide-rule theme-interview-flow-when__mode-rule"
            role="presentation"
          />
          <ul className="theme-interview-flow-when__list">
            {conditions.map((c, index) => {
              const kind = kindOf(c)
              return (
                <li key={index} className="theme-interview-flow-when__row">
                  <div className="theme-interview-flow-when__row-head">
                    <p className="type-caption type-faint mb-0">
                      Rule {index + 1}
                    </p>
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove rule ${index + 1}`}
                      onClick={() =>
                        writeConditions(conditions.filter((_, i) => i !== index))
                      }
                    />
                  </div>
                  <div className="theme-interview-flow-when__row-fields">
                    <VurifySelect
                      label="Condition"
                      variant="dropdown"
                      scrollRail="hidden"
                      options={[
                        {
                          value: 'toolPassed',
                          label: 'Earlier assessment passed',
                          description:
                            'A previous form, coding, or written section was passed',
                        },
                        {
                          value: 'phaseCompleted',
                          label: 'Earlier section finished',
                          description: 'A previous section was completed normally',
                        },
                        ...(topicOptions.length
                          ? [
                              {
                                value: 'targetEquals',
                                label: 'Earlier answer matches',
                                description:
                                  'Something captured in a previous conversation matches a value',
                              },
                            ]
                          : []),
                      ]}
                      value={kind}
                      onChange={(v) => {
                        if (v === 'toolPassed') {
                          updateAt(index, {
                            toolPassed: toolOptions[0]?.id ?? '',
                          })
                        } else if (v === 'phaseCompleted') {
                          updateAt(index, {
                            phaseCompleted: phaseOptions[0]?.id ?? '',
                          })
                        } else {
                          updateAt(index, {
                            targetEquals: {
                              topicId: topicOptions[0]?.id ?? '',
                              key: '',
                              value: '',
                            },
                          })
                        }
                      }}
                      placeholder="Kind…"
                    />
                    {kind === 'toolPassed' ? (
                      <VurifySelect
                        label="Assessment"
                        variant="dropdown"
                        scrollRail="hidden"
                        options={toolOptions.map((t) => ({
                          value: t.id,
                          label: t.title,
                        }))}
                        value={c.toolPassed ?? ''}
                        onChange={(v) => updateAt(index, { toolPassed: v })}
                        placeholder={
                          toolOptions.length ? 'Choose…' : 'No earlier assessments'
                        }
                      />
                    ) : null}
                    {kind === 'phaseCompleted' ? (
                      <VurifySelect
                        label="Section"
                        variant="dropdown"
                        scrollRail="hidden"
                        options={phaseOptions.map((p) => ({
                          value: p.id,
                          label: p.title,
                        }))}
                        value={c.phaseCompleted ?? ''}
                        onChange={(v) => updateAt(index, { phaseCompleted: v })}
                        placeholder={
                          phaseOptions.length ? 'Choose…' : 'No earlier sections'
                        }
                      />
                    ) : null}
                    {kind === 'targetEquals' && c.targetEquals ? (
                      <>
                        <VurifySelect
                          label="Conversation"
                          variant="dropdown"
                          scrollRail="hidden"
                          options={topicOptions.map((t) => ({
                            value: t.id,
                            label: t.title,
                          }))}
                          value={c.targetEquals.topicId}
                          onChange={(v) =>
                            updateAt(index, {
                              targetEquals: { ...c.targetEquals!, topicId: v },
                            })
                          }
                          placeholder="Choose…"
                        />
                        <AuthorEditable
                          value={c.targetEquals.key}
                          onChange={(key) =>
                            updateAt(index, {
                              targetEquals: { ...c.targetEquals!, key },
                            })
                          }
                          placeholder="Field key"
                          aria-label="Field key"
                        />
                        <AuthorEditable
                          value={c.targetEquals.value}
                          onChange={(val) =>
                            updateAt(index, {
                              targetEquals: { ...c.targetEquals!, value: val },
                            })
                          }
                          placeholder="Expected value"
                          aria-label="Expected value"
                        />
                      </>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            className="theme-interview-flow-talk__add-btn"
            onClick={() =>
              writeConditions([
                ...conditions,
                emptyCondition(toolOptions, phaseOptions),
              ])
            }
          >
            <Plus className="size-3.5" aria-hidden />
            Add condition
          </button>
        </>
      ) : null}
    </div>
  )
}
