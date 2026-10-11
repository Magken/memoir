import { Plus, Trash2 } from 'lucide-react'
import {
  defaultTemplateCardMeta,
  labelTemplate,
  resolveTemplateCardMeta,
  type InterviewFlowTemplateCardMeta,
} from '../lib/interviewBrief/analysisLabels'
import { DISCUSSION_TEMPLATE_IDS } from '../lib/interviewBrief/defaultAttachPacks'
import { Card } from './Card'
import { IconButton } from './IconButton'
import { MenuButton } from './MenuButton'
import { ThemeScroll } from './ThemeScroll'
import { AuthorEditable } from './testFormParts/AuthorEditable'

type InterviewFlowTemplatePickerProps = {
  value: readonly string[]
  onChange: (next: string[]) => void
  /** Per-id card copy overrides (create / edit). */
  metaById?: Record<string, InterviewFlowTemplateCardMeta>
  onMetaChange?: (next: Record<string, InterviewFlowTemplateCardMeta>) => void
  /** Allowlist — defaults to discussion templates. */
  allowIds?: readonly string[]
  emptyLabel?: string
  className?: string
}

function shortCustomId(): string {
  return `custom.${Math.random().toString(36).slice(2, 8)}`
}

/** Horizontal scroll of template cards — add from menu or create custom; edit title/subtitle/details. */
export function InterviewFlowTemplatePicker({
  value,
  onChange,
  metaById = {},
  onMetaChange,
  allowIds = DISCUSSION_TEMPLATE_IDS,
  emptyLabel = 'No templates yet — add or create one.',
  className = '',
}: InterviewFlowTemplatePickerProps) {
  const selected = new Set(value)
  const available = allowIds.filter((id) => !selected.has(id))

  const patchMeta = (id: string, patch: Partial<InterviewFlowTemplateCardMeta>) => {
    if (!onMetaChange) return
    const current = resolveTemplateCardMeta(id, metaById[id])
    onMetaChange({
      ...metaById,
      [id]: { ...current, ...patch },
    })
  }

  const remove = (id: string) => {
    onChange(value.filter((x) => x !== id))
    if (onMetaChange && metaById[id]) {
      const next = { ...metaById }
      delete next[id]
      onMetaChange(next)
    }
  }

  const add = (id: string) => {
    if (selected.has(id)) return
    onChange([...value, id])
    if (onMetaChange && !metaById[id]) {
      onMetaChange({ ...metaById, [id]: defaultTemplateCardMeta(id) })
    }
  }

  const createCustom = () => {
    const id = shortCustomId()
    const meta: InterviewFlowTemplateCardMeta = {
      ...defaultTemplateCardMeta(id),
      title: 'New template',
      subtitle: 'Custom · edit details',
      details: 'Describe what this template should judge or produce.',
    }
    onChange([...value, id])
    onMetaChange?.({ ...metaById, [id]: meta })
  }

  return (
    <div
      className={['theme-interview-flow-templates', className].filter(Boolean).join(' ')}
      aria-label="Analysis templates"
    >
      {value.length === 0 ? (
        <p className="type-caption type-faint mb-2">{emptyLabel}</p>
      ) : null}

      <ThemeScroll
        axis="horizontal"
        rail="mini"
        scrollClouds
        className="theme-interview-flow-templates__scroll"
        contentClassName="theme-interview-flow-templates__track"
        tabIndex={-1}
      >
        {value.map((tid) => {
          const meta = resolveTemplateCardMeta(tid, metaById[tid])
          const editable = Boolean(onMetaChange)
          return (
            <Card
              key={tid}
              variant="outline"
              className="theme-interview-flow-templates__card"
            >
              <div className="theme-interview-flow-templates__card-head">
                {editable ? (
                  <AuthorEditable
                    className="theme-interview-flow-templates__title type-title"
                    value={meta.title}
                    onChange={(title) => patchMeta(tid, { title })}
                    placeholder="Title"
                    allowEmpty={false}
                    aria-label="Template title"
                  />
                ) : (
                  <p className="type-title theme-interview-flow-templates__title mb-0">
                    {meta.title}
                  </p>
                )}
                <IconButton
                  icon={Trash2}
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${meta.title}`}
                  onClick={() => remove(tid)}
                />
              </div>
              {editable ? (
                <AuthorEditable
                  className="theme-interview-flow-templates__subtitle type-body-sm type-muted"
                  value={meta.subtitle}
                  onChange={(subtitle) => patchMeta(tid, { subtitle })}
                  placeholder="Subtitle"
                  aria-label="Template subtitle"
                />
              ) : (
                <p className="type-body-sm type-muted mb-0">{meta.subtitle}</p>
              )}
              {editable ? (
                <AuthorEditable
                  className="theme-interview-flow-templates__details type-body-sm"
                  value={meta.details}
                  onChange={(details) => patchMeta(tid, { details })}
                  placeholder="Details"
                  multiline
                  rows={3}
                  aria-label="Template details"
                />
              ) : (
                <p className="type-body-sm mb-0">{meta.details}</p>
              )}
              <p className="type-caption type-faint mb-0">{tid}</p>
            </Card>
          )
        })}

        <div className="theme-interview-flow-templates__add-slot">
          {available.length > 0 ? (
            <MenuButton
              icon={Plus}
              size="sm"
              variant="ghost"
              menuSize="compact"
              scrollRail="hidden"
              portal
              label="Add template"
              items={available.map((id) => ({
                id,
                label: labelTemplate(id),
              }))}
              onSelect={(id) => add(id)}
            />
          ) : null}
          {onMetaChange ? (
            <button
              type="button"
              className="theme-interview-flow-templates__create"
              onClick={createCustom}
            >
              <Plus className="size-3.5 shrink-0" aria-hidden />
              Create template
            </button>
          ) : available.length === 0 && value.length > 0 ? (
            <p className="type-caption type-faint mb-0">All catalog templates added.</p>
          ) : null}
        </div>
      </ThemeScroll>
    </div>
  )
}
