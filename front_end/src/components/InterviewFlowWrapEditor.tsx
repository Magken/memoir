import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  PackageCheck,
  Plus,
  Trash2,
} from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useAnimatedFoldMount } from '../hooks/useAnimatedFoldMount'
import {
  labelTemplate,
  grainHintForTemplate,
} from '../lib/interviewBrief/analysisLabels'
import { rollupTemplateIdsFromCatalog } from '../lib/interviewBrief/analysisTemplateCatalog'
import { uniqueRollupSlug } from '../lib/interviewBrief/rollupFolders'
import { rebalanceSoftWeights } from '../lib/interviewBrief/rollupWeights'
import type {
  InterviewFlowStep,
  InterviewFlowWrapEditorState,
  InterviewFlowWrapSectionOption,
  InterviewFlowWrapWeightRow,
} from '../lib/interviewBrief/flowTimelineTypes'
import { Chip } from './Chip'
import { IconButton } from './IconButton'
import { InterviewFlowSectionToolbar } from './InterviewFlowSectionToolbar'
import { Tooltip } from './Tooltip'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifyCountInput } from './VurifyCountInput'
import { VurifyInput } from './VurifyInput'
import { VurifySelect } from './VurifySelect'

type InterviewFlowWrapEditorProps = {
  step: InterviewFlowStep
  state: InterviewFlowWrapEditorState
  /** Spine sections eligible for weight → section mapping. */
  sectionOptions?: readonly InterviewFlowWrapSectionOption[]
  expanded: boolean
  onToggle: () => void
  onChange: (next: InterviewFlowWrapEditorState) => void
  className?: string
}

const FORM_MARK_OPTIONS = [
  { value: 'gate_only', label: 'Gate only (not blended)' },
  { value: '0', label: '0 — exclude from soft blend' },
]

/** Same label | control grid as Talk / Form / Templates. */
function SettingsRow({
  label,
  hint,
  children,
}: {
  label?: string
  hint?: ReactNode
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

/** Same VurifyMenuButton major chrome as Talk / Templates — optional trailing (Plus / Trash). */
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

function formatWeightChip(
  row: InterviewFlowWrapWeightRow,
  sectionTitleById: Map<string, string>,
): string {
  const secs = (row.sectionIds ?? [])
    .map((id) => sectionTitleById.get(id) ?? id)
    .filter(Boolean)
  const secBit =
    secs.length === 0
      ? ''
      : secs.length === 1
        ? ` · ${String(secs[0]).slice(0, 28)}`
        : ` · ${secs.length} sections`
  if (row.value === 'gate_only') return `${row.label} · gate${secBit}`
  return `${row.label} · ${row.value}${secBit}`
}

function isNumericWeight(value: number | string): boolean {
  return typeof value === 'number' || (typeof value === 'string' && value !== 'gate_only')
}

/**
 * Decision package (rollup) — same Creator-2 section dialect as Talk / Templates.
 * See `InterviewFlowSectionDialect.md`.
 */
export function InterviewFlowWrapEditor({
  step: _step,
  state,
  sectionOptions = [],
  expanded,
  onToggle,
  onChange,
  className = '',
}: InterviewFlowWrapEditorProps) {
  const editPanelId = useId()
  const previewPanelId = useId()
  const weightsFoldId = useId()
  const [previewOpen, setPreviewOpen] = useState(true)
  const [weightsOpen, setWeightsOpen] = useState(true)
  const [addName, setAddName] = useState('')
  const showPreview = !expanded && previewOpen
  const previewFold = useAnimatedFoldMount(showPreview)

  const catalogIds = rollupTemplateIdsFromCatalog()
  const templateOptions = Array.from(
    new Set([state.templateId, ...catalogIds].filter(Boolean)),
  ).map((id) => ({
    value: id,
    label: labelTemplate(id),
    description: grainHintForTemplate(id),
  }))

  const sectionTitleById = new Map(sectionOptions.map((s) => [s.id, s.title]))
  const usedKeys = new Set(state.weights.map((w) => w.key))
  const addSlug = uniqueRollupSlug(addName, usedKeys)

  const publish = (partial: Partial<InterviewFlowWrapEditorState>) => {
    onChange({ ...state, ...partial })
  }

  const patchWeight = (key: string, next: Partial<InterviewFlowWrapWeightRow>) => {
    if (next.value !== undefined && key !== 'formMark' && isNumericWeight(next.value)) {
      const asRecord: Record<string, number | string> = {}
      for (const row of state.weights) asRecord[row.key] = row.value
      const rebalanced = rebalanceSoftWeights(asRecord, key, next.value)
      publish({
        weights: state.weights.map((row) => {
          if (row.key === key) {
            return {
              ...row,
              ...next,
              value: rebalanced[key] ?? next.value,
            }
          }
          if (Object.prototype.hasOwnProperty.call(rebalanced, row.key)) {
            return { ...row, value: rebalanced[row.key]! }
          }
          return row
        }),
      })
      return
    }
    publish({
      weights: state.weights.map((row) =>
        row.key === key ? { ...row, ...next } : row,
      ),
    })
  }

  const toggleSection = (weightKey: string, sectionId: string) => {
    const row = state.weights.find((w) => w.key === weightKey)
    if (!row) return
    const cur = new Set(row.sectionIds ?? [])
    if (cur.has(sectionId)) cur.delete(sectionId)
    else cur.add(sectionId)
    patchWeight(weightKey, { sectionIds: [...cur] })
  }

  const removeWeight = (key: string) => {
    const remaining = state.weights.filter((row) => row.key !== key)
    // Rebalance soft pool after removing a numeric lens.
    const soft = remaining.filter((r) => r.key !== 'formMark' && isNumericWeight(r.value))
    if (soft.length) {
      const asRecord: Record<string, number | string> = {}
      for (const row of remaining) asRecord[row.key] = row.value
      const first = soft[0]!
      const rebalanced = rebalanceSoftWeights(asRecord, first.key, first.value)
      publish({
        weights: remaining.map((row) =>
          Object.prototype.hasOwnProperty.call(rebalanced, row.key)
            ? { ...row, value: rebalanced[row.key]! }
            : row,
        ),
      })
      return
    }
    publish({ weights: remaining })
  }

  const addWeight = () => {
    const key = addSlug
    const label = addName.trim()
    if (!key || !label || usedKeys.has(key)) return
    publish({
      weights: [
        ...state.weights,
        {
          key,
          label,
          value: 0.1,
          sectionIds: [],
        },
      ],
    })
    setAddName('')
    setWeightsOpen(true)
  }

  const packLabel = labelTemplate(state.templateId)
  const weightChips = state.weights.map((row) => ({
    id: row.key,
    label: formatWeightChip(row, sectionTitleById),
  }))

  return (
    <div
      className={[
        'theme-interview-flow-wrap',
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
              editPanelId={editPanelId}
              previewPanelId={previewPanelId}
              onToggleEdit={onToggle}
              onTogglePreview={() => setPreviewOpen((v) => !v)}
            />
          </div>

          <div
            id={editPanelId}
            className={[
              'theme-interview-flow-section__fold',
              expanded ? 'is-open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="theme-interview-flow-section__fold-inner">
              {expanded ? (
              <ul className="theme-interview-flow-talk__groups" aria-label="Decision package">
                <li className="theme-interview-flow-talk__group theme-interview-flow-talk__group--flat">
                  <div className="theme-interview-flow-form__settings">
                    <SettingsRow
                      label="Rollup template"
                      hint="Runs at interview end — packages the attempt for the reviewer"
                    >
                      <VurifySelect
                        label="Rollup template"
                        variant="dropdown"
                        scrollRail="hidden"
                        options={templateOptions}
                        value={state.templateId}
                        onChange={(value) => publish({ templateId: value })}
                      />
                    </SettingsRow>
                  </div>
                </li>

                <li
                  className={[
                    'theme-interview-flow-talk__group',
                    weightsOpen ? 'is-open' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <MajorSectionHead
                    title="Soft weights"
                    open={weightsOpen}
                    onToggle={() => setWeightsOpen((v) => !v)}
                    controlsId={weightsFoldId}
                  />
                  {!weightsOpen && weightChips.length > 0 ? (
                    <div className="theme-interview-flow-talk__major-tags">
                      <div
                        className="theme-chip-group theme-interview-flow-talk__attach-chips"
                        aria-label="Soft weight preview"
                      >
                        {weightChips.slice(0, 6).map((chip) => (
                          <Chip key={chip.id} size="sm">
                            {chip.label}
                          </Chip>
                        ))}
                        {weightChips.length > 6 ? (
                          <Chip size="sm">+{weightChips.length - 6}</Chip>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div
                    id={weightsFoldId}
                    className={[
                      'theme-interview-flow-section__fold',
                      weightsOpen ? 'is-open' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="theme-interview-flow-section__fold-inner">
                      {state.weights.length === 0 ? (
                        <p className="type-caption type-faint mb-0">
                          No folders yet — type a name below to add one.
                        </p>
                      ) : (
                        <div className="theme-interview-flow-form__settings">
                          <p className="type-caption type-faint mb-0">
                            Soft lenses always sum to 1 (form gate excluded). Raising one shrinks the others.
                          </p>
                          {state.weights.map((row) => (
                            <SettingsRow
                              key={row.key}
                              label={row.label}
                              hint={
                                sectionOptions.length
                                  ? 'Name the folder, then chip the sections that feed it'
                                  : 'Name the folder and set its share of the soft score'
                              }
                            >
                              <div className="flex min-w-0 flex-col gap-2">
                                <VurifyInput
                                  label="Folder name"
                                  value={row.label}
                                  onChange={(e) =>
                                    patchWeight(row.key, { label: e.target.value })
                                  }
                                />
                                <div className="theme-interview-flow-wrap__weight-control">
                                  {row.value === 'gate_only' || row.key === 'formMark' ? (
                                    <VurifySelect
                                      label="Form weight"
                                      variant="dropdown"
                                      scrollRail="hidden"
                                      options={FORM_MARK_OPTIONS}
                                      value={
                                        row.value === 'gate_only'
                                          ? 'gate_only'
                                          : String(row.value)
                                      }
                                      onChange={(value) =>
                                        patchWeight(row.key, {
                                          value:
                                            value === 'gate_only'
                                              ? 'gate_only'
                                              : Number(value) || 0,
                                        })
                                      }
                                    />
                                  ) : isNumericWeight(row.value) ? (
                                    <VurifyCountInput
                                      label="Weight"
                                      min={0}
                                      max={1}
                                      step={0.05}
                                      allowDecimal
                                      value={String(
                                        typeof row.value === 'number'
                                          ? row.value
                                          : Number.parseFloat(String(row.value)) || 0,
                                      )}
                                      onValueChange={(value) => {
                                        const n = Number.parseFloat(value)
                                        patchWeight(row.key, {
                                          value: Number.isFinite(n) ? n : 0,
                                        })
                                      }}
                                    />
                                  ) : (
                                    <VurifyInput
                                      label="Value"
                                      value={String(row.value)}
                                      onChange={(e) =>
                                        patchWeight(row.key, { value: e.target.value })
                                      }
                                    />
                                  )}
                                  <IconButton
                                    icon={Trash2}
                                    size="sm"
                                    variant="ghost"
                                    aria-label={`Remove ${row.label}`}
                                    onClick={() => removeWeight(row.key)}
                                  />
                                </div>
                                {sectionOptions.length > 0 ? (
                                  <div
                                    className="theme-chip-group theme-interview-flow-talk__attach-chips"
                                    aria-label={`${row.label} sections`}
                                  >
                                    {sectionOptions.map((sec) => {
                                      const on = (row.sectionIds ?? []).includes(sec.id)
                                      return (
                                        <Chip
                                          key={`${row.key}.${sec.id}`}
                                          size="sm"
                                          selected={on}
                                          onClick={() => toggleSection(row.key, sec.id)}
                                        >
                                          {sec.title.slice(0, 36)}
                                        </Chip>
                                      )
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            </SettingsRow>
                          ))}
                        </div>
                      )}

                      <div className="theme-interview-flow-form__settings">
                        <SettingsRow
                          label="Add folder"
                          hint="Type a name and add. Unlimited folders."
                        >
                          <div className="theme-interview-flow-wrap__weight-control">
                            <VurifyInput
                              label="Folder name"
                              value={addName}
                              placeholder="e.g. Coding output"
                              onChange={(e) => setAddName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addWeight()
                                }
                              }}
                            />
                            <IconButton
                              icon={Plus}
                              size="sm"
                              variant="ghost"
                              aria-label="Add weight"
                              disabled={!addSlug}
                              onClick={addWeight}
                            />
                          </div>
                        </SettingsRow>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
              ) : null}
            </div>
          </div>

          <div
            id={previewPanelId}
            className={[
              'theme-interview-flow-section__fold',
              'theme-interview-flow-section__fold--preview',
              'theme-interview-flow-wrap__preview-fold',
              previewFold.shown ? 'is-open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={!previewFold.shown ? true : undefined}
          >
            <div className="theme-interview-flow-section__fold-inner">
              {previewFold.mounted ? (
              <div
                className="theme-interview-flow-discussion__preview theme-interview-flow-wrap__preview"
                aria-label="Decision package preview"
              >
                <div className="theme-interview-flow-wrap__preview-head">
                  <PackageCheck
                    className="size-3.5 shrink-0 type-faint"
                    aria-hidden
                  />
                  <span className="type-body-sm mb-0">{packLabel}</span>
                </div>
                {weightChips.length > 0 ? (
                  <div
                    className="theme-chip-group theme-interview-flow-talk__attach-chips theme-interview-flow-wrap__preview-chips"
                    aria-label="Soft weights"
                  >
                    {weightChips.map((chip) => (
                      <Chip key={chip.id} size="sm">
                        {chip.label}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <p className="theme-interview-flow-discussion__preview-empty type-caption type-faint mb-0">
                    Soft weights appear here once you add folders.
                  </p>
                )}
              </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside
          className="theme-interview-flow-section__rail"
          aria-label="Section actions"
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
        </aside>
      </div>
    </div>
  )
}
