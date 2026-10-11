import { REFERENCES_MAX, referencesSelectOptions } from '../lib/interviewBrief/creator2References'
import { MultiSelect } from './MultiSelect'

type RefOption = { id: string; title: string; kind?: string }

type InterviewFlowReferencesSelectProps = {
  earlier: readonly RefOption[]
  value: readonly string[] | string | null | undefined
  onChange: (phaseIds: string[]) => void
}

function asIds(value: InterviewFlowReferencesSelectProps['value']): string[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

/** Authoring picker: earlier spine phases, up to REFERENCES_MAX. Empty = None. */
export function InterviewFlowReferencesSelect({
  earlier,
  value,
  onChange,
}: InterviewFlowReferencesSelectProps) {
  const none = earlier.length === 0
  const selected = asIds(value).slice(0, REFERENCES_MAX)
  return (
    <MultiSelect
      variant="vurify"
      size="sm"
      options={referencesSelectOptions(earlier)}
      value={selected}
      onChange={(next) => onChange(next.slice(0, REFERENCES_MAX))}
      placeholder={none ? 'None' : selected.length ? 'Add…' : 'None'}
      disabled={none}
    />
  )
}
