import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type {
  InterviewFlowProbe,
  InterviewFlowTalkTarget,
} from '../lib/interviewBrief/flowTimelineTypes'
import { IconButton } from './IconButton'
import { Switch } from './Switch'
import { VurifyInput } from './VurifyInput'
import { VurifySelect } from './VurifySelect'

type InterviewFlowDiscussionEditorProps = {
  probes: InterviewFlowProbe[]
  targets: InterviewFlowTalkTarget[]
  onProbesChange: (next: InterviewFlowProbe[]) => void
  onTargetsChange: (next: InterviewFlowTalkTarget[]) => void
  /**
   * `preview` — collapsed day teaser.
   * `probes` / `targets` — author lists inside talk major subsections.
   */
  variant: 'preview' | 'probes' | 'targets'
  className?: string
}

function shortId(prefix: string): string {
  return `${prefix}.${Math.random().toString(36).slice(2, 8)}`
}

function datatypeLabel(value: string | undefined): string {
  switch (value) {
    case 'boolean':
      return 'Boolean'
    case 'number':
      return 'Number'
    case 'enum':
      return 'Enum'
    default:
      return 'String'
  }
}

/** Discussion content — preview, probes list, or targets list. */
export function InterviewFlowDiscussionEditor({
  probes,
  targets,
  onProbesChange,
  onTargetsChange,
  variant,
  className = '',
}: InterviewFlowDiscussionEditorProps) {
  const [exitingProbe, setExitingProbe] = useState<string | null>(null)
  const [exitingTarget, setExitingTarget] = useState<string | null>(null)

  const removeProbe = (id: string) => {
    setExitingProbe(id)
    window.setTimeout(() => {
      onProbesChange(probes.filter((p) => p.id !== id))
      setExitingProbe(null)
    }, 200)
  }

  const removeTarget = (key: string) => {
    setExitingTarget(key)
    window.setTimeout(() => {
      onTargetsChange(targets.filter((t) => t.key !== key))
      setExitingTarget(null)
    }, 200)
  }

  const moveProbe = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= probes.length) return
    const next = [...probes]
    ;[next[index], next[j]] = [next[j], next[index]]
    onProbesChange(next)
  }

  const updateProbe = (id: string, patch: Partial<InterviewFlowProbe>) => {
    onProbesChange(probes.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const updateTarget = (key: string, patch: Partial<InterviewFlowTalkTarget>) => {
    onTargetsChange(targets.map((t) => (t.key === key ? { ...t, ...patch } : t)))
  }

  if (variant === 'preview') {
    const previewProbes = probes.slice(0, 3)
    const previewTargets = targets.slice(0, 2)
    const moreProbes = Math.max(0, probes.length - previewProbes.length)
    const moreTargets = Math.max(0, targets.length - previewTargets.length)
    const empty = probes.length === 0 && targets.length === 0

    return (
      <div
        className={[
          'theme-interview-flow-talk__workspace',
          'theme-interview-flow-discussion',
          'is-mini',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Discussion preview"
      >
        <div className="theme-interview-flow-discussion__preview">
          <div className="theme-interview-flow-discussion__preview-head">
            <span className="type-caption type-faint">
              {empty
                ? 'Empty'
                : [
                    probes.length
                      ? `${probes.length} probe${probes.length === 1 ? '' : 's'}`
                      : null,
                    targets.length
                      ? `${targets.length} target${targets.length === 1 ? '' : 's'}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </span>
          </div>

          {empty ? (
            <p className="theme-interview-flow-discussion__preview-empty type-caption type-faint mb-0">
              No probes or targets yet — expand to author this conversation.
            </p>
          ) : (
            <div className="theme-interview-flow-discussion__preview-body">
              {previewProbes.length ? (
                <div className="theme-interview-flow-discussion__preview-group">
                  <p className="theme-interview-flow-discussion__preview-kicker type-caption type-faint mb-0">
                    Probes
                  </p>
                  <ol className="theme-interview-flow-discussion__preview-list">
                    {previewProbes.map((p, index) => (
                      <li key={p.id} className="theme-interview-flow-discussion__preview-item">
                        <span className="theme-interview-flow-discussion__preview-index type-caption type-faint">
                          {index + 1}
                        </span>
                        <div className="theme-interview-flow-discussion__preview-copy">
                          <span className="type-body-sm">{p.goal || 'Untitled probe'}</span>
                          <span className="type-caption type-faint">
                            {p.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {moreProbes > 0 ? (
                    <p className="type-caption type-faint mb-0">+{moreProbes} more</p>
                  ) : null}
                </div>
              ) : null}

              {previewTargets.length ? (
                <div className="theme-interview-flow-discussion__preview-group">
                  <p className="theme-interview-flow-discussion__preview-kicker type-caption type-faint mb-0">
                    Targets
                  </p>
                  <ul className="theme-interview-flow-discussion__preview-list">
                    {previewTargets.map((t) => (
                      <li key={t.key} className="theme-interview-flow-discussion__preview-item">
                        <div className="theme-interview-flow-discussion__preview-copy">
                          <span className="type-body-sm">{t.label || 'Untitled target'}</span>
                          <span className="type-caption type-faint">
                            {[
                              datatypeLabel(t.datatype),
                              t.required ? 'Required' : 'Optional',
                            ].join(' · ')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {moreTargets > 0 ? (
                    <p className="type-caption type-faint mb-0">+{moreTargets} more</p>
                  ) : null}
                </div>
              ) : null}

              {probes.length === 0 && targets.length > 0 ? (
                <p className="type-caption type-faint mb-0">No probes yet</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'probes') {
    return (
      <div
        className={['theme-interview-flow-discussion', 'theme-interview-flow-discussion--panel', className]
          .filter(Boolean)
          .join(' ')}
        aria-label="Probes editor"
      >
        <ul className="theme-interview-flow-talk__probe-list">
          {probes.map((probe, index) => (
            <li
              key={probe.id}
              className={[
                'theme-interview-flow-talk__probe',
                exitingProbe === probe.id ? 'is-exiting' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="theme-interview-flow-talk__probe-head">
                <p className="type-caption type-faint mb-0">Probe {index + 1}</p>
                <div className="theme-interview-flow-talk__probe-meta">
                  <Switch
                    checked={Boolean(probe.required)}
                    onChange={(required) => updateProbe(probe.id, { required })}
                    label="Required"
                    size="sm"
                  />
                  <IconButton
                    icon={ArrowUp}
                    size="sm"
                    variant="ghost"
                    aria-label="Move probe up"
                    disabled={index === 0}
                    onClick={() => moveProbe(index, -1)}
                  />
                  <IconButton
                    icon={ArrowDown}
                    size="sm"
                    variant="ghost"
                    aria-label="Move probe down"
                    disabled={index === probes.length - 1}
                    onClick={() => moveProbe(index, 1)}
                  />
                  <IconButton
                    icon={Trash2}
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove probe ${index + 1}`}
                    onClick={() => removeProbe(probe.id)}
                  />
                </div>
              </div>
              <div className="theme-interview-flow-talk__probe-fields">
                <VurifyInput
                  label="Goal"
                  value={probe.goal}
                  onChange={(e) => updateProbe(probe.id, { goal: e.target.value })}
                />
                {probe.hint != null ? (
                  <VurifyInput
                    label="Hint"
                    value={probe.hint}
                    onChange={(e) => updateProbe(probe.id, { hint: e.target.value })}
                  />
                ) : (
                  <button
                    type="button"
                    className="theme-interview-flow-talk__add-btn theme-interview-flow-talk__add-btn--inline"
                    onClick={() => updateProbe(probe.id, { hint: '' })}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Add hint
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {probes.length === 0 ? (
          <p className="type-caption type-faint mb-0">
            No probes yet — add the main questions for this conversation.
          </p>
        ) : null}
        <button
          type="button"
          className="theme-interview-flow-talk__add-btn"
          onClick={() =>
            onProbesChange([
              ...probes,
              {
                id: shortId('p'),
                goal: 'New probe goal',
                required: true,
                hint: null,
              },
            ])
          }
        >
          <Plus className="size-3.5" aria-hidden />
          Add probe
        </button>
      </div>
    )
  }

  return (
    <div
      className={['theme-interview-flow-discussion', 'theme-interview-flow-discussion--panel', className]
        .filter(Boolean)
        .join(' ')}
      aria-label="Targets editor"
    >
      <ul className="theme-interview-flow-talk__target-list">
        {targets.map((target, index) => (
          <li
            key={target.key}
            className={[
              'theme-interview-flow-talk__target',
              exitingTarget === target.key ? 'is-exiting' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="theme-interview-flow-talk__target-head">
              <p className="type-caption type-faint mb-0">Target {index + 1}</p>
              <div className="theme-interview-flow-talk__target-meta">
                <Switch
                  checked={Boolean(target.required)}
                  onChange={(required) => updateTarget(target.key, { required })}
                  label="Required"
                  size="sm"
                />
                <IconButton
                  icon={Trash2}
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove target ${index + 1}`}
                  onClick={() => removeTarget(target.key)}
                />
              </div>
            </div>
            <div className="theme-interview-flow-talk__target-fields">
              <div className="theme-interview-flow-talk__field-row">
                <VurifyInput
                  label="Label"
                  value={target.label}
                  onChange={(e) => updateTarget(target.key, { label: e.target.value })}
                />
                <VurifySelect
                  label="Datatype"
                  variant="dropdown"
                  scrollRail="hidden"
                  options={[
                    { value: 'string', label: 'String' },
                    { value: 'boolean', label: 'Boolean' },
                    { value: 'number', label: 'Number' },
                    { value: 'enum', label: 'Enum' },
                  ]}
                  value={target.datatype ?? 'string'}
                  onChange={(datatype) => updateTarget(target.key, { datatype })}
                  placeholder="Type…"
                />
              </div>
              <VurifyInput
                label="Description"
                variant="area"
                rows={2}
                value={target.description ?? ''}
                onChange={(e) =>
                  updateTarget(target.key, {
                    description: e.target.value || undefined,
                  })
                }
              />
              {target.datatype === 'enum' ? (
                <VurifyInput
                  label="Enum values"
                  value={(target.enumValues ?? []).join(', ')}
                  onChange={(e) =>
                    updateTarget(target.key, {
                      enumValues: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {targets.length === 0 ? (
        <p className="type-caption type-faint mb-0">
          No targets yet — optional fields to capture from this conversation.
        </p>
      ) : null}
      <button
        type="button"
        className="theme-interview-flow-talk__add-btn"
        onClick={() =>
          onTargetsChange([
            ...targets,
            {
              key: shortId('t'),
              label: 'New target',
              required: false,
              datatype: 'string',
            },
          ])
        }
      >
        <Plus className="size-3.5" aria-hidden />
        Add target
      </button>
    </div>
  )
}
