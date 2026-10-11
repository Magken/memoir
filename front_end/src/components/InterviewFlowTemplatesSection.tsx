import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Package,
  Plus,
  Redo2,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useAnimatedFoldMount } from '../hooks/useAnimatedFoldMount'
import {
  JUSTIFICATION_LABELS,
  OUTPUT_KIND_LABELS,
  EVIDENCE_MODEL_LABELS,
  POLARITY_LABELS,
  TEMPLATE_CREATE_STARTERS,
  defaultTemplateCardMeta,
  describeTemplateShape,
  resolveTemplateCardMeta,
  sanitizeAxisPolarity,
  shapeFromStarter,
  slugKey,
  starterById,
  type InterviewFlowEvidenceModel,
  type InterviewFlowPolarity,
  type InterviewFlowTemplateCardMeta,
  type InterviewFlowTemplateDimension,
  type InterviewFlowTemplateJustification,
  type InterviewFlowTemplateOutputKind,
  type TemplateCreateStarterId,
} from '../lib/interviewBrief/analysisLabels'
import { discussionTemplateIdsFromCatalog } from '../lib/interviewBrief/analysisTemplateCatalog'
import type { InterviewFlowAnalysisShelfState } from '../lib/interviewBrief/flowTimelineTypes'
import { criterionLineForTemplate } from '../../../back_end/supabase/functions/interview-brief-edit/templateRoster.ts'
import { iconForSummaryGlyph } from '../lib/interviewBrief/summaryTagIcons'
import { scrollSectionHistoryFocus } from '../lib/interviewBrief/sectionHistoryFocus'
import { useTemplateLibraryHistory } from '../hooks/useTemplateLibraryHistory'
import { Chip } from './Chip'
import { IconButton } from './IconButton'
import { InterviewFlowSectionToolbar } from './InterviewFlowSectionToolbar'
import { Tag } from './Tag'
import { Tooltip } from './Tooltip'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifyCountInput } from './VurifyCountInput'
import { VurifyInput } from './VurifyInput'
import { VurifySelect } from './VurifySelect'

type InterviewFlowTemplatesSectionProps = {
  state: InterviewFlowAnalysisShelfState
  usageById: Record<string, number>
  /** Section titles that attach each template (hover). */
  hostsById?: Record<string, string[]>
  expanded: boolean
  onToggle: () => void
  onChange: (next: InterviewFlowAnalysisShelfState) => void
  onDeleteTemplate: (templateId: string) => void
  className?: string
}

function attachHostsTooltip(hosts: readonly string[] | undefined): string {
  if (!hosts?.length) return 'Not attached to any section'
  return `Attached to: ${hosts.join(' · ')}`
}

const OUTPUT_KIND_OPTIONS = (
  Object.keys(OUTPUT_KIND_LABELS) as InterviewFlowTemplateOutputKind[]
).map((value) => ({ value, label: OUTPUT_KIND_LABELS[value] }))

const JUSTIFICATION_OPTIONS = (
  Object.keys(JUSTIFICATION_LABELS) as InterviewFlowTemplateJustification[]
).map((value) => ({ value, label: JUSTIFICATION_LABELS[value] }))

const EVIDENCE_MODEL_OPTIONS = (
  Object.keys(EVIDENCE_MODEL_LABELS) as InterviewFlowEvidenceModel[]
).map((value) => ({ value, label: EVIDENCE_MODEL_LABELS[value] }))

const POLARITY_OPTIONS = (
  Object.keys(POLARITY_LABELS) as InterviewFlowPolarity[]
).map((value) => ({ value, label: POLARITY_LABELS[value] }))

const STARTER_OPTIONS = TEMPLATE_CREATE_STARTERS.map((s) => ({
  value: s.id,
  label: s.label,
  description: s.hint,
}))

function shortCustomId(): string {
  return `custom.${Math.random().toString(36).slice(2, 8)}`
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

function SubSectionHead({ title }: { title: string }) {
  return (
    <div className="theme-interview-flow-templates-section__subhead">
      <p className="type-label mb-0">{title}</p>
      <div className="theme-interview-flow-form__guide-rule" role="presentation" />
    </div>
  )
}

/** Same VurifyMenuButton major chrome as talk Conversation / Analysis groups. */
function MajorSectionHead({
  title,
  open,
  onToggle,
  controlsId,
  trailing,
}: {
  title: string
  open: boolean
  onToggle: () => void
  controlsId: string
  trailing?: ReactNode
}) {
  return (
    <div className="theme-interview-flow-talk__major theme-interview-flow-talk__sticky-head">
      <div className="theme-interview-flow-talk__major-head theme-interview-flow-templates-section__major-head">
        <VurifyMenuButton
          type="button"
          variant="label"
          size="sm"
          housing
          activeChrome={false}
          lineTone={open ? 'accent' : 'muted'}
          icon={open ? ChevronUp : ChevronDown}
          iconPosition="right"
          aria-expanded={open}
          aria-controls={controlsId}
          onClick={onToggle}
        >
          {title}
        </VurifyMenuButton>
        {trailing}
      </div>
      <div className="theme-interview-flow-form__guide-rule" role="presentation" />
    </div>
  )
}

/** Removable values via Chip × — same dismiss pattern as talk attach chips. */
function TagListEditor({
  values,
  onChange,
  addPlaceholder = 'Add…',
  emptyHint,
}: {
  values: string[]
  onChange: (next: string[]) => void
  addPlaceholder?: string
  emptyHint?: string
}) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const next = draft.trim()
    if (!next) return
    if (values.some((v) => v.toLowerCase() === next.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...values, next])
    setDraft('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    }
    if (event.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div className="theme-interview-flow-templates-section__tag-edit">
      <div
        className="theme-chip-group theme-interview-flow-talk__attach-chips"
        aria-label={addPlaceholder}
      >
        {values.map((value, index) => (
          <Chip
            key={`${value}-${index}`}
            size="sm"
            selected
            onDismiss={() => onChange(values.filter((_, i) => i !== index))}
          >
            {value}
          </Chip>
        ))}
        <input
          className="theme-interview-flow-templates-section__tag-input"
          value={draft}
          placeholder={values.length === 0 ? addPlaceholder : '+'}
          aria-label={addPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
      </div>
      {values.length === 0 && emptyHint ? (
        <p className="type-caption type-faint mb-0">{emptyHint}</p>
      ) : null}
    </div>
  )
}

/** Rubric axes — 2-column square cards; options as dismissible Chips. */
function AxisCardsEditor({
  dimensions,
  onChange,
}: {
  dimensions: InterviewFlowTemplateDimension[]
  onChange: (next: InterviewFlowTemplateDimension[]) => void
}) {
  const patch = (index: number, next: Partial<InterviewFlowTemplateDimension>) => {
    onChange(
      dimensions.map((d, i) => {
        if (i !== index) return d
        const merged = { ...d, ...next }
        if (next.label != null && (d.key.startsWith('axis') || !d.key)) {
          merged.key = slugKey(next.label) || d.key
        }
        return merged
      }),
    )
  }

  return (
    <div className="theme-interview-flow-templates-section__dims">
      <ul className="theme-interview-flow-templates-section__axis-grid">
        {dimensions.map((dim, index) => (
          <li
            key={`${dim.key}-${index}`}
            className="theme-interview-flow-templates-section__axis-card"
          >
            <div className="theme-interview-flow-talk__probe-head">
              <p className="type-caption type-faint mb-0">Axis {index + 1}</p>
              <IconButton
                icon={Trash2}
                size="sm"
                variant="ghost"
                aria-label={`Remove ${dim.label || `axis ${index + 1}`}`}
                onClick={() => onChange(dimensions.filter((_, i) => i !== index))}
              />
            </div>
            <VurifyInput
              label="Name"
              value={dim.label}
              onChange={(e) => patch(index, { label: e.target.value })}
            />
            <TagListEditor
              values={dim.options}
              addPlaceholder="Add option"
              onChange={(options) => {
                const optionNotes = dim.optionNotes
                  ? options.map((_, i) => dim.optionNotes?.[i] ?? '')
                  : undefined
                patch(index, { options, optionNotes })
              }}
            />
            {dim.options.map((opt, oi) => (
              <VurifyInput
                key={`${dim.key}-note-${oi}`}
                label={`${opt} note`}
                value={dim.optionNotes?.[oi] ?? ''}
                onChange={(e) => {
                  const optionNotes = dim.options.map((_, i) =>
                    i === oi ? e.target.value : dim.optionNotes?.[i] ?? '',
                  )
                  patch(index, { optionNotes })
                }}
              />
            ))}
            <VurifySelect
              label="Evidence"
              variant="dropdown"
              scrollRail="hidden"
              value={dim.evidenceModel ?? 'accumulative'}
              options={EVIDENCE_MODEL_OPTIONS}
              onChange={(value) => {
                const evidenceModel = value as InterviewFlowEvidenceModel
                patch(index, {
                  evidenceModel,
                  polarity: sanitizeAxisPolarity(evidenceModel, dim.polarity),
                })
              }}
            />
            <VurifySelect
              label="Polarity"
              variant="dropdown"
              scrollRail="hidden"
              value={sanitizeAxisPolarity(dim.evidenceModel, dim.polarity) ?? 'positive'}
              options={POLARITY_OPTIONS}
              onChange={(value) =>
                patch(index, {
                  polarity: sanitizeAxisPolarity(
                    dim.evidenceModel,
                    value as InterviewFlowPolarity,
                  ),
                })
              }
            />
          </li>
        ))}
      </ul>
      {dimensions.length === 0 ? (
        <p className="type-caption type-faint mb-0">No axes yet.</p>
      ) : null}
      <button
        type="button"
        className="theme-interview-flow-talk__add-btn"
        onClick={() => {
          const n = dimensions.length + 1
          onChange([
            ...dimensions,
            {
              key: `axis${n}`,
              label: `Axis ${n}`,
              options: ['weak', 'mixed', 'strong'],
              defaultOption: 'mixed',
            },
          ])
        }}
      >
        <Plus className="size-3.5" aria-hidden />
        Add axis
      </button>
    </div>
  )
}

function shapePreviewTags(meta: InterviewFlowTemplateCardMeta): string[] {
  if (meta.outputKind === 'dimensions') {
    return meta.dimensions.map((d) => d.label).filter(Boolean).slice(0, 6)
  }
  if (meta.outputKind === 'taxonomy') return meta.taxonomy.slice(0, 6)
  if (meta.outputKind === 'enum') return meta.enumValues.slice(0, 6)
  return []
}

function TemplateShapeBody({
  meta,
  onPatch,
}: {
  meta: InterviewFlowTemplateCardMeta
  onPatch: (patch: Partial<InterviewFlowTemplateCardMeta>) => void
}) {
  const setOutputKind = (outputKind: InterviewFlowTemplateOutputKind) => {
    const patch: Partial<InterviewFlowTemplateCardMeta> = { outputKind }
    if (outputKind === 'taxonomy' && meta.taxonomy.length === 0) {
      patch.taxonomy = ['curious', 'confident', 'uncertain']
    }
    if (outputKind === 'enum' && meta.enumValues.length === 0) {
      patch.enumValues = ['low', 'med', 'high']
    }
    if (outputKind === 'dimensions' && meta.dimensions.length === 0) {
      patch.dimensions = [
        {
          key: 'axis1',
          label: 'Axis 1',
          options: ['weak', 'mixed', 'strong'],
          defaultOption: 'mixed',
        },
      ]
    }
    onPatch(patch)
  }

  return (
    <div className="theme-interview-flow-templates-section__shape">
      <SubSectionHead title="Type" />
      <div className="theme-interview-flow-form__settings">
        <SettingsRow label="Representation" hint="How this template returns results">
          <VurifySelect
            label="Representation"
            variant="dropdown"
            scrollRail="hidden"
            value={meta.outputKind}
            options={OUTPUT_KIND_OPTIONS}
            onChange={(value) =>
              setOutputKind(value as InterviewFlowTemplateOutputKind)
            }
          />
        </SettingsRow>
        <SettingsRow label="Justification" hint="Whether a written why is required">
          <VurifySelect
            label="Justification"
            variant="dropdown"
            scrollRail="hidden"
            value={meta.justificationPolicy}
            options={JUSTIFICATION_OPTIONS}
            onChange={(value) =>
              onPatch({
                justificationPolicy: value as InterviewFlowTemplateJustification,
              })
            }
          />
        </SettingsRow>
      </div>

      {meta.outputKind === 'dimensions' ? (
        <>
          <SubSectionHead title="Axes" />
          <AxisCardsEditor
            dimensions={meta.dimensions}
            onChange={(dimensions) => onPatch({ dimensions })}
          />
        </>
      ) : null}

      {meta.outputKind === 'taxonomy' ? (
        <>
          <SubSectionHead title="Labels" />
          <div className="theme-interview-flow-templates-section__panel">
            <TagListEditor
              values={meta.taxonomy}
              addPlaceholder="Add label"
              emptyHint="Add the labels this template can return."
              onChange={(taxonomy) => onPatch({ taxonomy })}
            />
            <div className="theme-interview-flow-templates-section__panel-side">
              <VurifyCountInput
                label="Max / turn"
                value={String(meta.maxPerTurn)}
                min={1}
                max={12}
                onValueChange={(raw) => {
                  const n = Number.parseInt(raw, 10)
                  if (Number.isFinite(n)) onPatch({ maxPerTurn: n })
                }}
              />
            </div>
          </div>
        </>
      ) : null}

      {meta.outputKind === 'enum' ? (
        <>
          <SubSectionHead title="Choices" />
          <div className="theme-interview-flow-templates-section__panel">
            <TagListEditor
              values={meta.enumValues}
              addPlaceholder="Add choice"
              emptyHint="Add the allowed outcomes."
              onChange={(enumValues) => onPatch({ enumValues })}
            />
          </div>
        </>
      ) : null}

      {meta.outputKind === 'scalar' ? (
        <>
          <SubSectionHead title="What it measures" />
          <div className="theme-interview-flow-form__settings">
            <SettingsRow
              label="Criterion"
              hint="What the number counts — named incidents, not vibes."
            >
              <VurifyInput
                label="Criterion"
                size="sm"
                value={meta.criterion ?? ''}
                onChange={(e) =>
                  onPatch({ criterion: e.target.value.trim() ? e.target.value : undefined })
                }
              />
            </SettingsRow>
          </div>
        </>
      ) : meta.outputKind === 'passFail' || meta.outputKind === 'paragraph' ? (
        <p className="type-caption type-faint mb-0">
          {meta.outputKind === 'passFail'
            ? 'Returns pass or fail for this check.'
            : 'Returns a short reviewer paragraph.'}
        </p>
      ) : null}
    </div>
  )
}

/**
 * First timeline block — define analysis templates for this brief, then attach
 * them on conversation sections below. Shared meta means renames update chips.
 */
export function InterviewFlowTemplatesSection({
  state,
  usageById,
  hostsById = {},
  expanded,
  onToggle,
  onChange,
  onDeleteTemplate,
  className = '',
}: InterviewFlowTemplatesSectionProps) {
  const panelId = useId()
  const previewPanelId = useId()
  const sectionRef = useRef<HTMLDivElement>(null)
  const [addCatalogValue, setAddCatalogValue] = useState('')
  const [starterId, setStarterId] = useState<TemplateCreateStarterId>('rubric')
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})
  const [previewOpen, setPreviewOpen] = useState(true)
  const showPreview = !expanded && previewOpen
  const previewFold = useAnimatedFoldMount(showPreview)
  const libraryIds = state.libraryIds
  const rosterById = new Map((state.roster ?? []).map((r) => [r.templateId, r]))
  const displayIds = [
    ...libraryIds,
    ...(state.roster ?? [])
      .map((r) => r.templateId)
      .filter((id) => !libraryIds.includes(id)),
  ]
  const scrollToFocus = (focus?: string | null) => {
    if (focus?.startsWith('templateMeta.')) {
      const rest = focus.slice('templateMeta.'.length)
      const matchId = libraryIds.find((id) => rest === id || rest.startsWith(`${id}.`))
      if (matchId) setOpenIds((cur) => ({ ...cur, [matchId]: true }))
    }
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        scrollSectionHistoryFocus(sectionRef.current, focus)
      }, 40)
    })
  }
  const { commit, checkpoint, undo, redo, canUndo, canRedo } = useTemplateLibraryHistory(
    state,
    onChange,
    scrollToFocus,
  )
  const customCount = libraryIds.filter((id) => id.startsWith('custom.')).length
  const inUseCount = libraryIds.filter((id) => (usageById[id] ?? 0) > 0).length
  const catalogAvailable = discussionTemplateIdsFromCatalog().filter(
    (id) => !libraryIds.includes(id),
  )

  useEffect(() => {
    setOpenIds((cur) => {
      let changed = false
      const next = { ...cur }
      for (const id of Object.keys(next)) {
        if (!libraryIds.includes(id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : cur
    })
  }, [libraryIds])

  const publishLibrary = (
    libraryIdsNext: string[],
    templateMetaNext: Record<string, InterviewFlowTemplateCardMeta>,
  ) => {
    commit({
      ...state,
      libraryIds: libraryIdsNext,
      templateMeta: templateMetaNext,
    })
  }

  const patchMeta = (id: string, patch: Partial<InterviewFlowTemplateCardMeta>) => {
    const current = resolveTemplateCardMeta(id, state.templateMeta[id])
    publishLibrary(libraryIds, {
      ...state.templateMeta,
      [id]: { ...current, ...patch },
    })
  }

  const addFromCatalog = (id: string) => {
    if (!id || libraryIds.includes(id)) return
    publishLibrary([id, ...libraryIds], {
      ...state.templateMeta,
      [id]: defaultTemplateCardMeta(id),
    })
    setAddCatalogValue('')
    setOpenIds((cur) => ({ ...cur, [id]: true }))
  }

  const createFromStarter = (nextStarter: TemplateCreateStarterId = starterId) => {
    const id = shortCustomId()
    const starter = starterById(nextStarter)
    publishLibrary([id, ...libraryIds], {
      ...state.templateMeta,
      [id]: {
        ...defaultTemplateCardMeta(id),
        ...shapeFromStarter(nextStarter, id),
        title: starter.title,
        subtitle: starter.label,
        details: starter.details,
      },
    })
    setOpenIds((cur) => ({ ...cur, [id]: true }))
  }

  const removeTemplate = (templateId: string) => {
    checkpoint()
    onDeleteTemplate(templateId)
  }

  const toggleOpen = (id: string) => {
    setOpenIds((cur) => ({ ...cur, [id]: !cur[id] }))
  }

  const previewIds = libraryIds.slice(0, 4)
  const moreCount = Math.max(0, libraryIds.length - previewIds.length)
  const activeStarter = starterById(starterId)

  return (
    <div
      ref={sectionRef}
      className={[
        'theme-interview-flow-templates-section',
        'theme-interview-flow-section',
        expanded ? 'is-expanded' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-interview-flow-section__layout">
        <div className="theme-interview-flow-section__main min-w-0">
          <div className="theme-interview-flow-section__toolbar">
            <InterviewFlowSectionToolbar
              expanded={expanded}
              previewOpen={previewOpen}
              editPanelId={panelId}
              previewPanelId={previewPanelId}
              onToggleEdit={onToggle}
              onTogglePreview={() => setPreviewOpen((v) => !v)}
            />
          </div>

          <div
            id={panelId}
            className={[
              'theme-interview-flow-section__fold',
              expanded ? 'is-open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="theme-interview-flow-section__fold-inner">
              {expanded ? (
              <>
              <div className="theme-interview-flow-form__settings" aria-label="Template library">
                <SettingsRow
                  label="Add from catalog"
                  hint="Built-in templates — axes and types come from the catalog"
                >
                  <VurifySelect
                    label="Catalog"
                    variant="dropdown"
                    scrollRail="hidden"
                    options={catalogAvailable.map((id) => {
                      const meta = defaultTemplateCardMeta(id)
                      return {
                        value: id,
                        label: meta.title,
                        description: describeTemplateShape(meta),
                      }
                    })}
                    value={addCatalogValue}
                    onChange={addFromCatalog}
                    placeholder={
                      catalogAvailable.length ? 'Choose template…' : 'All catalog templates added'
                    }
                  />
                </SettingsRow>
                <SettingsRow label="Create" hint={activeStarter.hint}>
                  <VurifySelect
                    label="Form"
                    variant="dropdown"
                    scrollRail="hidden"
                    options={STARTER_OPTIONS}
                    value={starterId}
                    onChange={(value) =>
                      setStarterId(value as TemplateCreateStarterId)
                    }
                  />
                </SettingsRow>
              </div>
              <div className="theme-interview-flow-templates-section__create-action">
                <VurifyMenuButton
                  type="button"
                  variant="label"
                  size="sm"
                  housing
                  activeChrome={false}
                  icon={Plus}
                  iconPosition="left"
                  lineTone="accent"
                  onClick={() => createFromStarter()}
                >
                  {`Create ${activeStarter.label.toLowerCase()}`}
                </VurifyMenuButton>
              </div>

              <div className="theme-interview-flow-templates-section__library-split">
                <SubSectionHead title="Templates" />
              </div>

              <ul className="theme-interview-flow-talk__groups theme-interview-flow-templates-section__list">
                {displayIds.map((id, index) => {
                  const meta = resolveTemplateCardMeta(id, state.templateMeta[id])
                  const used = usageById[id] ?? 0
                  const hosts = hostsById[id] ?? rosterById.get(id)?.assignedSectionIds ?? []
                  const isOpen = Boolean(openIds[id])
                  const previewTags = shapePreviewTags(meta)
                  const foldId = `${panelId}-tpl-${index}`
                  const row = rosterById.get(id)
                  const deletable = row ? row.deletable : true
                  const roleLine = criterionLineForTemplate(id)
                  return (
                    <li
                      key={id}
                      className={[
                        'theme-interview-flow-talk__group',
                        'theme-interview-flow-templates-section__row',
                        isOpen ? 'is-open' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-history-focus={`templateMeta.${id}`}
                    >
                      <MajorSectionHead
                        title={meta.title || `Template ${index + 1}`}
                        open={isOpen}
                        onToggle={() => toggleOpen(id)}
                        controlsId={foldId}
                        trailing={
                          deletable ? (
                          <IconButton
                            icon={Trash2}
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${meta.title}`}
                            onClick={() => removeTemplate(id)}
                          />
                          ) : (
                            <Chip size="sm">Locked</Chip>
                          )
                        }
                      />
                      {!isOpen ? (
                        <div className="theme-interview-flow-talk__major-tags">
                          <div
                            className="theme-chip-group theme-interview-flow-talk__attach-chips"
                            aria-label="Template shape preview"
                          >
                            <Chip size="sm" selected>
                              {describeTemplateShape(meta)}
                            </Chip>
                            {previewTags.map((label) => (
                              <Chip key={label} size="sm">
                                {label}
                              </Chip>
                            ))}
                            <Tooltip content={attachHostsTooltip(hosts)} placement="top">
                              <Chip size="sm">
                                {used > 0
                                  ? `${used} section${used === 1 ? '' : 's'}`
                                  : 'Unattached'}
                              </Chip>
                            </Tooltip>
                          </div>
                        </div>
                      ) : null}
                      <div
                        id={foldId}
                        className={[
                          'theme-interview-flow-section__fold',
                          isOpen ? 'is-open' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <div className="theme-interview-flow-section__fold-inner">
                          <p className="type-caption type-faint mb-0">
                            {roleLine}{' '}
                            {used > 0 || hosts.length
                              ? `Used on ${hosts.length || used} section${(hosts.length || used) === 1 ? '' : 's'}: ${hosts.join(', ')}`
                              : 'Not attached yet'}
                          </p>
                          <SubSectionHead title="Basics" />
                          <div className="theme-interview-flow-form__settings">
                            <SettingsRow label="Title">
                              <VurifyInput
                                label="Title"
                                value={meta.title}
                                onChange={(e) =>
                                  patchMeta(id, { title: e.target.value })
                                }
                              />
                            </SettingsRow>
                            <SettingsRow label="Summary">
                              <VurifyInput
                                label="Summary"
                                variant="area"
                                rows={2}
                                value={meta.details}
                                onChange={(e) =>
                                  patchMeta(id, { details: e.target.value })
                                }
                              />
                            </SettingsRow>
                          </div>
                          <TemplateShapeBody
                            meta={meta}
                            onPatch={(patch) => patchMeta(id, patch)}
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {displayIds.length === 0 ? (
                <p className="type-caption type-faint mb-0">
                  No templates yet — add from the catalog or create one.
                </p>
              ) : null}
              </>
              ) : null}
            </div>
          </div>

          <div
            id={previewPanelId}
            className={[
              'theme-interview-flow-section__fold',
              'theme-interview-flow-section__fold--preview',
              previewFold.shown ? 'is-open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={!previewFold.shown ? true : undefined}
          >
            <div className="theme-interview-flow-section__fold-inner">
              {previewFold.mounted ? (
              <div
                className="theme-interview-flow-discussion__preview"
                aria-label="Templates preview"
              >
                <div className="theme-interview-flow-discussion__preview-head">
                  <span className="type-caption type-faint">
                    {libraryIds.length === 0
                      ? 'Empty'
                      : `${libraryIds.length} template${libraryIds.length === 1 ? '' : 's'}${
                          inUseCount
                            ? ` · ${inUseCount} in use`
                            : ''
                        }${
                          customCount
                            ? ` · ${customCount} custom`
                            : ''
                        }`}
                  </span>
                </div>
                {libraryIds.length === 0 ? (
                  <p className="theme-interview-flow-discussion__preview-empty type-caption type-faint mb-0">
                    Define templates here before attaching them on conversations.
                  </p>
                ) : (
                  <ul className="theme-interview-flow-discussion__preview-list">
                    {previewIds.map((id) => {
                      const meta = resolveTemplateCardMeta(id, state.templateMeta[id])
                      const used = usageById[id] ?? 0
                      const hosts = hostsById[id] ?? []
                      return (
                        <li
                          key={id}
                          className="theme-interview-flow-discussion__preview-item"
                        >
                          <div className="theme-interview-flow-discussion__preview-copy">
                            <span className="type-body-sm">{meta.title}</span>
                            <Tooltip content={attachHostsTooltip(hosts)} placement="top">
                              <span className="type-caption type-faint">
                                {describeTemplateShape(meta)}
                                {used > 0
                                  ? ` · ${used} section${used === 1 ? '' : 's'}`
                                  : ' · unattached'}
                              </span>
                            </Tooltip>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {moreCount > 0 ? (
                  <p className="type-caption type-faint mb-0">+{moreCount} more</p>
                ) : null}
              </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside
          className="theme-interview-flow-section__rail"
          aria-label="Templates section actions"
        >
          {!expanded ? (
            <Tooltip content="Edit section" placement="left">
              <IconButton
                icon={Maximize2}
                size="sm"
                variant="ghost"
                aria-label="Edit section"
                onClick={onToggle}
              />
            </Tooltip>
          ) : null}
          {expanded ? (
            <>
              <div
                className="theme-interview-flow-section__rail-rule"
                role="presentation"
              />
              <div className="theme-interview-flow-talk__rail-meta">
                <Tooltip content="Undo library edit" placement="left">
                  <IconButton
                    icon={Undo2}
                    size="sm"
                    variant="ghost"
                    disabled={!canUndo}
                    aria-label="Undo library edit"
                    onClick={undo}
                  />
                </Tooltip>
                <Tooltip content="Redo library edit" placement="left">
                  <IconButton
                    icon={Redo2}
                    size="sm"
                    variant="ghost"
                    disabled={!canRedo}
                    aria-label="Redo library edit"
                    onClick={redo}
                  />
                </Tooltip>
                <Tooltip content={`Create ${activeStarter.label.toLowerCase()}`} placement="left">
                  <IconButton
                    icon={Plus}
                    size="sm"
                    variant="ghost"
                    aria-label={`Create ${activeStarter.label}`}
                    onClick={() => createFromStarter()}
                  />
                </Tooltip>
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

/** Title / tags chrome for the templates timeline item (matches form/talk step head). */
export function InterviewFlowTemplatesSectionHead({
  libraryIds,
  usageById,
  hostsById = {},
  templateMeta,
}: {
  libraryIds: readonly string[]
  usageById: Record<string, number>
  hostsById?: Record<string, string[]>
  templateMeta: InterviewFlowAnalysisShelfState['templateMeta']
}) {
  const PackIcon = iconForSummaryGlyph('pack')
  const inUse = libraryIds.filter((id) => (usageById[id] ?? 0) > 0).length
  const custom = libraryIds.filter((id) => id.startsWith('custom.')).length
  const names = libraryIds
    .slice(0, 6)
    .map((id) => resolveTemplateCardMeta(id, templateMeta[id]).title)
    .join(' · ')

  return (
    <>
      <div className="theme-interview-flow-timeline__meta type-caption type-muted">
        <Package className="size-3.5 shrink-0" aria-hidden />
        <span>Analysis</span>
      </div>
      <h3 className="theme-interview-flow-timeline__title type-display-md">
        Analysis templates
      </h3>
      <p className="theme-interview-flow-timeline__body type-body type-muted">
        Build scoring and summary templates here — rubrics, label lists, choices — then
        attach them on conversations below. Edits update every section that uses them.
      </p>
      <div
        className="theme-interview-flow-timeline__tags theme-tag-group"
        aria-label="Templates summary"
      >
        <Tag size="sm" className="theme-interview-flow-timeline__tag theme-interview-flow-timeline__tag--pack">
          <PackIcon className="theme-interview-flow-timeline__tag-icon size-3 shrink-0" aria-hidden />
          <span>
            {libraryIds.length === 0
              ? 'No templates'
              : `${libraryIds.length} template${libraryIds.length === 1 ? '' : 's'}`}
          </span>
        </Tag>
        {inUse > 0 ? (
          <Tooltip
            content={libraryIds
              .filter((id) => (usageById[id] ?? 0) > 0)
              .map((id) => {
                const title = resolveTemplateCardMeta(id, templateMeta[id]).title
                const hosts = hostsById[id] ?? []
                return hosts.length ? `${title} → ${hosts.join(', ')}` : title
              })
              .join(' · ')}
            placement="top"
          >
            <Tag size="sm" className="theme-interview-flow-timeline__tag theme-interview-flow-timeline__tag--count">
              <span>{inUse} in use</span>
            </Tag>
          </Tooltip>
        ) : null}
        {custom > 0 ? (
          <Tag size="sm" className="theme-interview-flow-timeline__tag theme-interview-flow-timeline__tag--meta">
            <span>
              {custom} custom
            </span>
          </Tag>
        ) : null}
      </div>
      {names ? (
        <p className="type-caption type-faint mb-0 mt-2" title={names}>
          {names}
          {libraryIds.length > 6 ? '…' : ''}
        </p>
      ) : null}
    </>
  )
}
