/**
 * Editable interviewer persona — name / voice / behaviour always reflect the live brief
 * (bot or user). Optional template select only applies presets into those fields.
 */
import { useMemo, type ReactNode } from 'react'
import { VurifyInput } from './VurifyInput'
import { VurifySelect } from './VurifySelect'
import {
  findInterviewPersonaTemplate,
  interviewPersonaTemplateOptions,
  matchInterviewPersonaTemplateId,
} from '../lib/interviewBrief/personaTemplates'

export type InterviewPersonaValue = {
  name: string
  voice: string
  behaviourPrompt: string
}

type InterviewPersonaEditorProps = {
  value: InterviewPersonaValue
  onChange: (next: InterviewPersonaValue) => void
  disabled?: boolean
  /** Compact builder chrome vs compose form. */
  size?: 'sm' | 'md'
  /**
   * `stack` — floating fields (stashed compose).
   * `settings` — SettingsRow (label left, control right).
   * `compact` — Creator Overview pairs (field labels only).
   */
  layout?: 'stack' | 'settings' | 'compact'
  className?: string
  /** Field name prefix for a11y uniqueness (compose vs builder). */
  namePrefix?: string
}

function SettingsRow({
  label,
  hint,
  children,
}: {
  label?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="theme-interview-flow-form__settings-row">
      <div className="theme-interview-flow-form__settings-label min-w-0">
        {label ? <p className="type-label mb-0">{label}</p> : null}
        {hint ? <p className="type-caption type-faint mb-0">{hint}</p> : null}
      </div>
      <div className="theme-interview-flow-form__settings-control">{children}</div>
    </div>
  )
}

export function InterviewPersonaEditor({
  value,
  onChange,
  disabled,
  size = 'md',
  layout = 'stack',
  className,
  namePrefix = 'persona',
}: InterviewPersonaEditorProps) {
  const templateId = useMemo(
    () => matchInterviewPersonaTemplateId(value) ?? '',
    [value],
  )
  const options = useMemo(() => interviewPersonaTemplateOptions(), [])
  const settings = layout === 'settings'
  const compact = layout === 'compact'
  const fieldSize = size === 'sm' ? 'sm' : undefined

  const patch = (partial: Partial<InterviewPersonaValue>) => {
    onChange({
      name: partial.name ?? value.name,
      voice: partial.voice ?? value.voice,
      behaviourPrompt: partial.behaviourPrompt ?? value.behaviourPrompt,
    })
  }

  const templateField = (
    <VurifySelect
      label="Persona template"
      name={`${namePrefix}-template`}
      options={options}
      value={templateId}
      disabled={disabled}
      onChange={(id) => {
        const t = findInterviewPersonaTemplate(id)
        if (!t) return
        onChange({
          name: t.name,
          voice: t.voice,
          behaviourPrompt: t.behaviourPrompt,
        })
      }}
      placeholder="Optional preset…"
      className="theme-interview-persona-editor__select"
    />
  )
  const nameField = (
    <VurifyInput
      label="Interviewer name"
      name={`${namePrefix}-name`}
      size={fieldSize}
      value={value.name}
      disabled={disabled}
      onChange={(e) => patch({ name: e.target.value })}
      placeholder="e.g. Alex"
    />
  )
  const voiceField = (
    <VurifyInput
      label="Voice"
      name={`${namePrefix}-voice`}
      size={fieldSize}
      value={value.voice}
      disabled={disabled}
      onChange={(e) => patch({ voice: e.target.value })}
      placeholder="e.g. calm, curious, warm"
    />
  )
  const behaviourField = (
    <VurifyInput
      label="Behaviour"
      name={`${namePrefix}-behaviour`}
      variant="area"
      size={fieldSize}
      rows={size === 'sm' ? 3 : 4}
      value={value.behaviourPrompt}
      disabled={disabled}
      onChange={(e) => patch({ behaviourPrompt: e.target.value })}
      placeholder="How the interviewer should run the conversation…"
    />
  )

  if (compact) {
    return (
      <div
        className={[
          'theme-interview-persona-editor',
          'theme-interview-persona-editor--compact',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="theme-interview-creator__compose-pair">
          {templateField}
          {nameField}
        </div>
        <div className="theme-interview-creator__compose-pair">{voiceField}</div>
        {behaviourField}
      </div>
    )
  }

  if (settings) {
    return (
      <div
        className={[
          'theme-interview-persona-editor',
          'theme-interview-persona-editor--settings',
          'theme-interview-flow-form__settings',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <SettingsRow
          label="Persona template"
          hint="Optional preset. Name, voice, and behaviour stay editable."
        >
          {templateField}
        </SettingsRow>
        <SettingsRow label="Interviewer name">{nameField}</SettingsRow>
        <SettingsRow label="Voice">{voiceField}</SettingsRow>
        <SettingsRow label="Behaviour">{behaviourField}</SettingsRow>
      </div>
    )
  }

  return (
    <div
      className={['theme-interview-persona-editor', className].filter(Boolean).join(' ')}
    >
      <div className="theme-interview-persona-editor__template">{templateField}</div>
      <div className="theme-interview-persona-editor__fields">
        {nameField}
        {voiceField}
        {behaviourField}
      </div>
    </div>
  )
}
