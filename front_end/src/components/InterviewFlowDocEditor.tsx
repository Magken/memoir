import {
  ChevronDown,
  ChevronUp,
  GitBranch,
  Maximize2,
  Plus,
  Redo2,
  Timer,
  TimerOff,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useAnimatedFoldMount } from '../hooks/useAnimatedFoldMount'
import { CREATOR2_FAIL_OPTIONS } from '../lib/interviewBrief/creator2OnFail'
import {
  buildWritingMarkingMatrixPreview,
  persistWritingDocument,
  syncWritingDocumentLengthTime,
  WRITING_RUBRIC_DEFAULT_BANDS,
  WRITING_RUBRIC_DIMENSION_PRESETS,
} from '../lib/interviewBrief/writingDocCompose'
import type {
  InterviewFlowDocAssessment,
  InterviewFlowDocEditorState,
  InterviewFlowDocPromptStructure,
  InterviewFlowDocRubricBand,
  InterviewFlowFormOnFail,
} from '../lib/interviewBrief/flowTimelineTypes'
import type { DocEditorPayload } from '../lib/editorContext/types'
import {
  matchToolAssistBundle,
  TOOL_ASSIST_BUNDLES,
  toolAssistPatchFromBundle,
  resolveToolAssistCaps,
  type ToolAssistBundleId,
} from '../lib/interviewBrief/toolAssistBundles'
import {
  applyToolAssistCapChange,
  toolAssistCapRows,
} from '../lib/interviewBrief/toolAssistCatalog'
import { scrollSectionHistoryFocus } from '../lib/interviewBrief/sectionHistoryFocus'
import { useSoftAdoptEditorPayload, useToolSectionHistory } from '../hooks/useToolSectionHistory'
import { Chip } from './Chip'
import { DocEditor, type DocEditorHandle } from './DocEditor'
import { IconButton } from './IconButton'
import { InterviewFlowSectionToolbar } from './InterviewFlowSectionToolbar'
import { InterviewFlowSpineRailActions } from './InterviewFlowSpineRailActions'
import { MenuButton } from './MenuButton'
import { Switch } from './Switch'
import { ToggleGroup } from './ToggleGroup'
import { Tooltip } from './Tooltip'
import { VurifyCountInput } from './VurifyCountInput'
import { VurifyInput } from './VurifyInput'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifySelect } from './VurifySelect'
import { InterviewFlowLockedAnalysisChips } from './InterviewFlowLockedAnalysisChips'
import { InterviewFlowReferencesSelect } from './InterviewFlowReferencesSelect'

type PhaseOption = { id: string; title: string; kind?: string }

type InterviewFlowDocEditorProps = {
  state: InterviewFlowDocEditorState
  expanded: boolean
  onToggle: () => void
  onChange: (next: InterviewFlowDocEditorState) => void
  phaseOptions?: readonly PhaseOption[]
  /** Earlier phases only — reference dropdown. */
  whenPhaseOptions?: readonly PhaseOption[]
  onRemove?: () => void
  onMove?: (direction: 'up' | 'down') => void
  onDuplicate?: () => void
  className?: string
}

const FAIL_OPTIONS = CREATOR2_FAIL_OPTIONS

const ASSESSMENT_KIND_OPTIONS = [
  {
    value: 'rubric',
    label: 'Rubric',
    description: 'Analytic criteria with band descriptors (IELTS / TOEFL style)',
  },
  { value: 'format', label: 'Format', description: 'Structure / format notes for grading' },
]

function SettingsRow({
  label,
  hint,
  historyFocus,
  children,
}: {
  label: string
  hint?: string
  historyFocus?: string
  children: ReactNode
}) {
  return (
    <div
      className="theme-interview-flow-form__settings-row"
      {...(historyFocus ? { 'data-history-focus': historyFocus } : {})}
    >
      <div className="theme-interview-flow-form__settings-label min-w-0">
        <p className="type-label mb-0">{label}</p>
        {hint ? <p className="type-caption type-faint mb-0">{hint}</p> : null}
      </div>
      <div className="theme-interview-flow-form__settings-control">{children}</div>
    </div>
  )
}

function MajorSectionHead({
  title,
  open,
  onToggle,
  controlsId,
}: {
  title: string
  open: boolean
  onToggle: () => void
  controlsId: string
}) {
  return (
    <div className="theme-interview-flow-talk__major theme-interview-flow-talk__sticky-head">
      <div className="theme-interview-flow-talk__major-head">
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
      </div>
      <div className="theme-interview-flow-form__guide-rule" role="presentation" />
    </div>
  )
}

/** Read-only table compiled from assessment + outline — not DocEditor content. */
function MarkingMatrixPreviewTable({
  structure,
  assessment,
}: {
  structure: InterviewFlowDocPromptStructure[]
  assessment: InterviewFlowDocAssessment
}) {
  if (assessment.kind === 'format') {
    return (
      <p className="type-body-sm type-muted mb-0">
        {assessment.formatNotes?.trim() ||
          'Format assessment — grade structure / format compliance against the outline.'}
      </p>
    )
  }
  const rows = buildWritingMarkingMatrixPreview({ structure, assessment })
  if (rows.length === 0) {
    return (
      <p className="type-caption type-faint mb-0">
        No criteria yet — add criteria above; this table updates automatically.
      </p>
    )
  }
  return (
    <div className="theme-interview-flow-doc__matrix-preview-wrap">
      <table className="theme-interview-flow-doc__matrix-preview">
        <caption className="type-caption type-faint mb-0">
          Compiled from criteria · weights are within this essay (not Decision rollup)
        </caption>
        <thead>
          <tr>
            <th scope="col">Criterion</th>
            <th scope="col">Weight</th>
            <th scope="col">Covers</th>
            <th scope="col">Looking for</th>
            <th scope="col">Bands</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{row.weight}</td>
              <td>{row.covers}</td>
              <td>{row.lookingFor}</td>
              <td>
                {row.bands.length ? (
                  <ul className="theme-interview-flow-doc__matrix-bands">
                    {row.bands.map((band) => (
                      <li key={band.label}>
                        <span className="theme-interview-flow-doc__matrix-band-name">
                          {band.label}
                        </span>
                        {band.descriptor ? (
                          <span className="type-muted"> {band.descriptor}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Dismissible chips + free-text add — same pattern as talk attach / coding languages. */
function ChipListEditor({
  values,
  onChange,
  addLabel,
  addPlaceholder,
}: {
  values: string[]
  onChange: (next: string[]) => void
  addLabel: string
  addPlaceholder: string
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

  return (
    <div className="theme-interview-flow-doc__chip-block">
      {values.length ? (
        <div className="theme-chip-group theme-interview-flow-talk__attach-chips" aria-label={addLabel}>
          {values.map((value) => (
            <Chip
              key={value}
              size="sm"
              selected
              onDismiss={() => onChange(values.filter((v) => v !== value))}
            >
              {value}
            </Chip>
          ))}
        </div>
      ) : null}
      <VurifyInput
        label={addPlaceholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
        }}
        onBlur={commit}
      />
    </div>
  )
}

function cloneDefaultBands(): InterviewFlowDocRubricBand[] {
  return WRITING_RUBRIC_DEFAULT_BANDS.map((b) => ({ ...b }))
}

/** Analytic marking rubric — criterion gloss + labeled bands with descriptors. */
function RubricDimensionsEditor({
  dimensions,
  structureOptions,
  onChange,
}: {
  dimensions: InterviewFlowDocAssessment['dimensions']
  structureOptions: InterviewFlowDocPromptStructure[]
  onChange: (next: InterviewFlowDocAssessment['dimensions']) => void
}) {
  const patch = (
    index: number,
    partial: Partial<InterviewFlowDocAssessment['dimensions'][number]>,
  ) => {
    onChange(
      dimensions.map((d, i) => {
        if (i !== index) return d
        const merged = { ...d, ...partial }
        if (partial.label != null) {
          const slug = partial.label
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
          merged.key = slug || d.key
        }
        return merged
      }),
    )
  }

  const patchBand = (
    dimIndex: number,
    bandIndex: number,
    partial: Partial<InterviewFlowDocRubricBand>,
  ) => {
    const dim = dimensions[dimIndex]
    if (!dim) return
    patch(dimIndex, {
      bands: dim.bands.map((b, i) => (i === bandIndex ? { ...b, ...partial } : b)),
    })
  }

  const toggleStructureId = (dimIndex: number, structureId: string) => {
    const dim = dimensions[dimIndex]
    if (!dim) return
    const cur = dim.structureIds ?? []
    const next = cur.includes(structureId)
      ? cur.filter((id) => id !== structureId)
      : [...cur, structureId]
    patch(dimIndex, { structureIds: next })
  }

  return (
    <div className="theme-interview-flow-doc__rubric" data-history-focus="assessment.dimensions">
      <ul className="theme-interview-flow-doc__rubric-stack mb-0 list-none p-0">
        {dimensions.map((dim, index) => (
          <li
            key={`${dim.key}-${index}`}
            className="theme-interview-flow-doc__rubric-card"
            data-history-focus={`assessment.dimensions.${index}`}
          >
            <div className="theme-interview-flow-talk__probe-head">
              <p className="type-caption type-faint mb-0">Criterion {index + 1}</p>
              <IconButton
                icon={Trash2}
                size="sm"
                variant="ghost"
                aria-label={`Remove ${dim.label || `criterion ${index + 1}`}`}
                onClick={() => onChange(dimensions.filter((_, i) => i !== index))}
              />
            </div>
            <VurifyInput
              label="Criterion name"
              value={dim.label}
              onChange={(e) => patch(index, { label: e.target.value })}
            />
            <VurifyInput
              label="Measures"
              value={dim.criterion ?? ''}
              onChange={(e) =>
                patch(index, { criterion: e.target.value || undefined })
              }
            />
            <VurifyInput
              label="Weight 0–1 (essay share)"
              value={dim.weight != null ? String(dim.weight) : ''}
              onChange={(e) => {
                const raw = e.target.value.trim()
                if (!raw) {
                  patch(index, { weight: undefined })
                  return
                }
                const n = Number(raw)
                if (!Number.isFinite(n) || n < 0) return
                patch(index, { weight: n })
              }}
            />
            <div className="theme-interview-flow-doc__rubric-covers">
              <p className="type-caption type-faint mb-0">
                Covers outline sections
                {(dim.structureIds?.length ?? 0) === 0 ? ' · holistic (whole response)' : ''}
              </p>
              {structureOptions.length === 0 ? (
                <p className="type-caption type-faint mb-0">
                  Add outline structure above to pin criteria to sections
                </p>
              ) : (
                <div className="theme-chip-group theme-interview-flow-talk__attach-chips flex flex-wrap gap-1.5">
                  {structureOptions.map((row) => {
                    const on = (dim.structureIds ?? []).includes(row.id)
                    return (
                      <Chip
                        key={row.id}
                        size="sm"
                        selected={on}
                        onClick={() => toggleStructureId(index, row.id)}
                      >
                        {row.label}
                      </Chip>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="theme-interview-flow-doc__rubric-bands">
              <p className="type-caption type-faint mb-0">Score bands</p>
              <ul className="theme-interview-flow-doc__rubric-band-list mb-0 list-none p-0">
                {dim.bands.map((band, bandIndex) => (
                  <li
                    key={`${band.id}-${bandIndex}`}
                    className="theme-interview-flow-doc__rubric-band"
                    data-history-focus={`assessment.dimensions.${index}.bands.${bandIndex}`}
                  >
                    <div className="theme-interview-flow-doc__rubric-band-row">
                      <VurifyInput
                        label="Level"
                        value={band.label}
                        onChange={(e) =>
                          patchBand(index, bandIndex, { label: e.target.value })
                        }
                      />
                      <VurifyInput
                        label="Descriptor"
                        value={band.descriptor}
                        onChange={(e) =>
                          patchBand(index, bandIndex, { descriptor: e.target.value })
                        }
                      />
                      <IconButton
                        icon={Trash2}
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove band ${band.label || bandIndex + 1}`}
                        disabled={dim.bands.length <= 1}
                        onClick={() =>
                          patch(index, {
                            bands: dim.bands.filter((_, i) => i !== bandIndex),
                          })
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="theme-interview-flow-talk__add-btn"
                onClick={() => {
                  const n = dim.bands.length + 1
                  patch(index, {
                    bands: [
                      ...dim.bands,
                      {
                        id: `band.${n}`,
                        label: `${n} — New level`,
                        descriptor: '',
                      },
                    ],
                  })
                }}
              >
                <Plus className="size-3.5" aria-hidden />
                Add band
              </button>
            </div>
          </li>
        ))}
      </ul>
      {dimensions.length === 0 ? (
        <p className="type-caption type-faint mb-0">
          No criteria yet — add Task response, Coherence, Lexical resource…
        </p>
      ) : null}
      <button
        type="button"
        className="theme-interview-flow-talk__add-btn"
        onClick={() => {
          const n = dimensions.length + 1
          onChange([
            ...dimensions,
            {
              key: `criterion${n}`,
              label: `Criterion ${n}`,
              criterion: '',
              structureIds: [],
              bands: cloneDefaultBands(),
            },
          ])
        }}
      >
        <Plus className="size-3.5" aria-hidden />
        Add criterion
      </button>
    </div>
  )
}

export function InterviewFlowDocEditor({
  state,
  expanded,
  onToggle,
  onChange,
  phaseOptions = [],
  whenPhaseOptions = [],
  onRemove,
  onMove,
  onDuplicate,
  className = '',
}: InterviewFlowDocEditorProps) {
  const panelId = useId()
  const previewPanelId = useId()
  const guideTitleId = useId()
  const criteriaFoldId = useId()
  const matrixPreviewFoldId = useId()
  const docRef = useRef<DocEditorHandle>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [criteriaOpen, setCriteriaOpen] = useState(false)
  const [matrixPreviewOpen, setMatrixPreviewOpen] = useState(true)
  const showPreview = !expanded && previewOpen
  const previewFold = useAnimatedFoldMount(expanded || showPreview)
  const docMountKey = expanded
    ? `${state.toolRef}:edit`
    : `${state.toolRef}:${JSON.stringify(state.document)}`
  const scrollToFocus = (focus?: string | null) => {
    if (!focus) return
    // Section settings live in the fold — ignore stray editor paths.
    if (focus === 'document' || focus.startsWith('document.')) return
    if (focus.startsWith('assessment')) {
      setCriteriaOpen(true)
      if (focus === 'assessment' || focus.includes('matrix')) setMatrixPreviewOpen(true)
    }
    scrollSectionHistoryFocus(sectionRef.current, focus)
  }
  const { commit, sync, undo, redo, canUndo, canRedo } = useToolSectionHistory(
    state,
    onChange,
    state.toolRef,
    scrollToFocus,
    { editorKeys: ['document'] },
  )
  const [addDimensionValue, setAddDimensionValue] = useState('')
  const [structureDraft, setStructureDraft] = useState('')
  const stateRef = useRef(state)
  stateRef.current = state
  const documentFp = JSON.stringify(state.document)
  const { skipOutboundRef, markLocal } = useSoftAdoptEditorPayload(documentFp, () => {
    docRef.current?.loadContext(stateRef.current.document)
  })

  const publish = (
    partial: Partial<InterviewFlowDocEditorState> = {},
    focusHint?: string | null,
  ) => {
    const fromEditor = docRef.current?.getContext() as DocEditorPayload | undefined
    const document = persistWritingDocument(partial.document ?? fromEditor ?? stateRef.current.document)
    let next: InterviewFlowDocEditorState = {
      ...stateRef.current,
      ...partial,
      document,
      assist: resolveToolAssistCaps(partial.assist ?? stateRef.current.assist),
    }
    if (partial.sectionTitle != null) {
      next = {
        ...next,
        document: {
          ...next.document,
          title: partial.sectionTitle.trim() || next.document.title,
        },
      }
    }
    commit(next, focusHint)
  }

  useEffect(() => {
    if (!expanded) return
    const id = window.setInterval(() => {
      if (skipOutboundRef.current) return
      const ctx = docRef.current?.getContext() as DocEditorPayload | undefined
      if (!ctx) return
      const current = stateRef.current
      if (JSON.stringify(ctx) === JSON.stringify(current.document)) return
      const document = persistWritingDocument(ctx)
      markLocal(JSON.stringify(document))
      sync({ ...current, document })
    }, 600)
    return () => window.clearInterval(id)
  }, [expanded, sync])

  const handleToggle = () => {
    if (expanded) publish()
    onToggle()
  }

  const patchMeta = (
    partial: Partial<InterviewFlowDocEditorState>,
    focusHint?: string | null,
  ) => {
    const touchesLengthTime =
      partial.timed !== undefined ||
      partial.limitMinutes !== undefined ||
      partial.minWords !== undefined ||
      partial.maxWords !== undefined
    if (!touchesLengthTime) {
      publish(partial, focusHint)
      return
    }
    const current = stateRef.current
    const merged = { ...current, ...partial }
    const fromEditor = docRef.current?.getContext() as DocEditorPayload | undefined
    const baseDoc: DocEditorPayload = {
      ...current.document,
      ...(fromEditor ?? {}),
      // Prefer stored markdown scaffold so Length & time can rewrite (getContext is lexical-only).
      markdown: current.document.markdown ?? fromEditor?.markdown,
      lexical: fromEditor?.lexical ?? current.document.lexical,
      title: fromEditor?.title ?? current.document.title,
      pageSetup: fromEditor?.pageSetup ?? current.document.pageSetup,
    }
    const document = syncWritingDocumentLengthTime(baseDoc, {
      minWords: merged.minWords,
      maxWords: merged.maxWords,
      timed: merged.timed,
      limitMinutes: merged.limitMinutes,
    })
    if (document.markdown) {
      void docRef.current?.loadContext?.({ ...document, lexical: null })
    }
    publish({ ...partial, document }, focusHint)
  }

  const patchPrompt = (
    partial: Partial<InterviewFlowDocEditorState['prompt']>,
    focusHint?: string | null,
  ) => {
    publish(
      { prompt: { ...stateRef.current.prompt, ...partial } },
      focusHint ?? `prompt.${Object.keys(partial)[0] ?? 'structure'}`,
    )
  }

  const patchAssessment = (
    partial: Partial<InterviewFlowDocAssessment>,
    focusHint?: string | null,
  ) => {
    publish(
      { assessment: { ...stateRef.current.assessment, ...partial } },
      focusHint ??
        (partial.dimensions
          ? 'assessment.dimensions'
          : partial.kind
            ? 'assessment.kind'
            : 'assessment'),
    )
  }

  const jumpOptions = phaseOptions
    .filter((p) => p.id)
    .map((p) => ({ value: p.id, label: p.title }))
  const assist = resolveToolAssistCaps(state.assist)
  const assistBundle = matchToolAssistBundle(assist)
  const assistCaps = toolAssistCapRows('doc')
  const assistHint =
    assistBundle === 'custom'
      ? 'Mix chat, answers, and write caps'
      : (TOOL_ASSIST_BUNDLES.find((b) => b.id === assistBundle)?.summary ??
        'No candidate chat or editor help')

  const dimensionKeys = new Set(state.assessment.dimensions.map((d) => d.key))
  const availableDimensions = WRITING_RUBRIC_DIMENSION_PRESETS.filter(
    (p) => !dimensionKeys.has(p.key),
  )

  const addDimension = (key: string) => {
    if (!key || dimensionKeys.has(key)) return
    const preset = WRITING_RUBRIC_DIMENSION_PRESETS.find((p) => p.key === key)
    const next = preset
      ? {
          key: preset.key,
          label: preset.label,
          criterion: preset.criterion,
          structureIds: [] as string[],
          bands: preset.bands.map((b) => ({ ...b })),
        }
      : {
          key,
          label: key,
          criterion: '',
          structureIds: [] as string[],
          bands: cloneDefaultBands(),
        }
    patchAssessment({ dimensions: [...state.assessment.dimensions, next] })
    setAddDimensionValue('')
  }

  const addStructure = () => {
    const label = structureDraft.trim()
    if (!label) return
    if (state.prompt.structure.some((s) => s.label.toLowerCase() === label.toLowerCase())) {
      setStructureDraft('')
      return
    }
    const id = `struct.${Date.now().toString(36)}`
    const row: InterviewFlowDocPromptStructure = { id, label }
    patchPrompt({ structure: [...state.prompt.structure, row] })
    setStructureDraft('')
  }

  return (
    <div
      ref={sectionRef}
      className={[
        'theme-interview-flow-form',
        'theme-interview-flow-doc',
        expanded ? 'is-expanded' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-interview-flow-form__layout">
        <div className="theme-interview-flow-form__main min-w-0">
          <div className="theme-interview-flow-form__toolbar">
            <InterviewFlowSectionToolbar
              expanded={expanded}
              previewOpen={previewOpen}
              editPanelId={panelId}
              previewPanelId={previewPanelId}
              onToggleEdit={handleToggle}
              onTogglePreview={() => setPreviewOpen((v) => !v)}
            />
          </div>

          <div
            id={panelId}
            className={[
              'theme-interview-flow-form__fold',
              expanded ? 'is-open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="theme-interview-flow-form__fold-inner">
              {expanded ? (
              <div
                className="theme-interview-flow-form__settings"
                aria-label="Section settings"
              >
                <SettingsRow
                  label="Hard timer"
                  hint="Time limit while the candidate writes"
                  historyFocus="timed"
                >
                  <Switch
                    checked={state.timed}
                    onChange={(checked) =>
                      patchMeta(
                        {
                          timed: checked,
                          limitMinutes: checked
                            ? state.limitMinutes ?? state.estimatedMinutes ?? 15
                            : null,
                        },
                        'timed',
                      )
                    }
                    label={state.timed ? 'On' : 'Off'}
                    size="sm"
                  />
                </SettingsRow>
                {state.timed ? (
                  <SettingsRow
                    label="Time limit"
                    hint="Minutes before the section times out"
                    historyFocus="limitMinutes"
                  >
                    <VurifyCountInput
                      label="Minutes"
                      min={1}
                      max={180}
                      value={String(state.limitMinutes ?? state.estimatedMinutes ?? 15)}
                      onValueChange={(value) => {
                        const n = Number.parseInt(value, 10)
                        patchMeta({
                          timed: true,
                          limitMinutes: Number.isFinite(n) ? n : 15,
                        })
                      }}
                    />
                  </SettingsRow>
                ) : null}
                <SettingsRow label="Assist" hint={assistHint} historyFocus="assist">
                  <ToggleGroup
                    variant="vurify"
                    size="sm"
                    aria-label="Candidate assist"
                    options={[
                      ...TOOL_ASSIST_BUNDLES.map((b) => ({
                        value: b.id,
                        label: b.label,
                      })),
                      ...(assistBundle === 'custom'
                        ? [{ value: 'custom', label: 'Custom' }]
                        : []),
                    ]}
                    value={assistBundle}
                    onChange={(value) => {
                      const id = String(Array.isArray(value) ? value[0] : value)
                      if (id === 'custom') return
                      patchMeta({
                        assist: toolAssistPatchFromBundle(id as ToolAssistBundleId),
                      })
                    }}
                  />
                </SettingsRow>
                {assistCaps.map((cap) => (
                  <SettingsRow
                    key={cap.id}
                    label={cap.label}
                    hint={cap.does}
                    historyFocus="assist"
                  >
                    <Switch
                      checked={assist[cap.id]}
                      onChange={(checked) =>
                        patchMeta({
                          assist: applyToolAssistCapChange(assist, cap.id, checked),
                        })
                      }
                      label={assist[cap.id] ? 'On' : 'Off'}
                      size="sm"
                    />
                  </SettingsRow>
                ))}
                <SettingsRow
                  label="Analysis"
                  hint="Locked marks for this tool — weights sum to 1. 0 = graded, not in overall"
                >
                  <InterviewFlowLockedAnalysisChips
                    templateIds={state.analysisTemplateIds ?? []}
                    weights={state.templateWeights}
                    onWeightsChange={(templateWeights) => patchMeta({ templateWeights })}
                  />
                </SettingsRow>
                <SettingsRow
                  label="On fail"
                  hint="What happens if this section shouldn’t run"
                  historyFocus="onFail"
                >
                  <VurifySelect
                    label="Fail policy"
                    variant="dropdown"
                    scrollRail="hidden"
                    options={FAIL_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                      description: o.description,
                    }))}
                    value={state.onFail}
                    onChange={(value) =>
                      patchMeta({
                        onFail: value as InterviewFlowFormOnFail,
                        onFailPhaseId:
                          value === 'goToPhase'
                            ? state.onFailPhaseId ?? jumpOptions[0]?.value ?? null
                            : null,
                      })
                    }
                    placeholder="Choose…"
                  />
                </SettingsRow>
                {state.onFail === 'goToPhase' ? (
                  <SettingsRow
                    label="Jump target"
                    hint="Pick a later section to jump to"
                    historyFocus="onFailPhaseId"
                  >
                    <VurifySelect
                      label="Phase"
                      variant="dropdown"
                      scrollRail="hidden"
                      options={jumpOptions}
                      value={state.onFailPhaseId ?? ''}
                      onChange={(value) => patchMeta({ onFailPhaseId: value })}
                      placeholder="Choose…"
                    />
                  </SettingsRow>
                ) : null}
                <SettingsRow
                  label="Reference section"
                  hint="Optional. Taking and scoring bias RAG toward this earlier stage. Off keeps memory of earlier sections."
                  historyFocus="references"
                >
                  <InterviewFlowReferencesSelect
                    earlier={whenPhaseOptions}
                    value={state.referencesPhaseIds ?? state.referencesPhaseId}
                    onChange={(referencesPhaseIds) =>
                      patchMeta(
                        {
                          referencesPhaseIds,
                          referencesPhaseId: referencesPhaseIds[0] ?? null,
                        },
                        'references',
                      )
                    }
                  />
                </SettingsRow>
                <SettingsRow
                  label="Min words"
                  hint="Soft floor for the written answer"
                  historyFocus="minWords"
                >
                  <VurifyCountInput
                    label="Min"
                    min={0}
                    max={5000}
                    value={String(state.minWords ?? 0)}
                    onValueChange={(value) => {
                      const n = Number.parseInt(value, 10)
                      patchMeta({ minWords: Number.isFinite(n) ? n : 0 })
                    }}
                  />
                </SettingsRow>
                <SettingsRow
                  label="Max words"
                  hint="Soft ceiling — leave high for no real cap"
                  historyFocus="maxWords"
                >
                  <VurifyCountInput
                    label="Max"
                    min={0}
                    max={10000}
                    value={String(state.maxWords ?? 0)}
                    onValueChange={(value) => {
                      const n = Number.parseInt(value, 10)
                      patchMeta({ maxWords: Number.isFinite(n) ? n : undefined })
                    }}
                  />
                </SettingsRow>

                <SettingsRow
                  label="Add structure"
                  hint="Expected sections in the written response — dismiss chips to remove"
                  historyFocus="prompt.structure"
                >
                  <div className="theme-interview-flow-doc__chip-block">
                    {state.prompt.structure.length ? (
                      <div
                        className="theme-chip-group theme-interview-flow-talk__attach-chips"
                        aria-label="Structure sections"
                      >
                        {state.prompt.structure.map((row) => (
                          <Chip
                            key={row.id}
                            size="sm"
                            selected
                            onDismiss={() =>
                              patchPrompt({
                                structure: state.prompt.structure.filter((s) => s.id !== row.id),
                              })
                            }
                          >
                            {row.label}
                          </Chip>
                        ))}
                      </div>
                    ) : null}
                    <VurifyInput
                      label="Add section…"
                      value={structureDraft}
                      onChange={(e) => setStructureDraft(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addStructure()
                        }
                      }}
                      onBlur={addStructure}
                    />
                  </div>
                </SettingsRow>

                <SettingsRow
                  label="Requirements"
                  hint="Must-hit checks — same chip pattern as talk templates"
                  historyFocus="prompt.requirements"
                >
                  <ChipListEditor
                    values={state.prompt.requirements}
                    onChange={(requirements) => patchPrompt({ requirements })}
                    addLabel="Requirements"
                    addPlaceholder="Add requirement…"
                  />
                </SettingsRow>

                <SettingsRow
                  label="Assessment"
                  hint="Analytic rubric with band descriptors, or format notes"
                  historyFocus="assessment.kind"
                >
                  <VurifySelect
                    label="Assessment kind"
                    variant="dropdown"
                    scrollRail="hidden"
                    options={ASSESSMENT_KIND_OPTIONS}
                    value={state.assessment.kind}
                    onChange={(value) =>
                      patchAssessment({
                        kind: value === 'format' ? 'format' : 'rubric',
                      })
                    }
                    placeholder="Choose…"
                  />
                </SettingsRow>

                {state.assessment.kind === 'rubric' ? (
                  <>
                    <SettingsRow
                      label="Add criterion"
                      hint="IELTS / TOEFL-style axes — Task response, Coherence, Lexical…"
                      historyFocus="assessment.dimensions"
                    >
                      <VurifySelect
                        label="Criterion"
                        variant="dropdown"
                        scrollRail="hidden"
                        options={availableDimensions.map((d) => ({
                          value: d.key,
                          label: d.label,
                          description: d.criterion,
                        }))}
                        value={addDimensionValue}
                        onChange={addDimension}
                        placeholder={
                          availableDimensions.length
                            ? 'Choose criterion…'
                            : 'All presets added — remove a card to free one'
                        }
                      />
                    </SettingsRow>

                    <div
                      className={[
                        'theme-interview-flow-talk__group',
                        'theme-interview-flow-doc__matrix-group',
                        criteriaOpen ? 'is-open' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <MajorSectionHead
                        title="Criteria"
                        open={criteriaOpen}
                        onToggle={() => setCriteriaOpen((v) => !v)}
                        controlsId={criteriaFoldId}
                      />
                      {!criteriaOpen && state.assessment.dimensions.length > 0 ? (
                        <div className="theme-interview-flow-talk__major-tags">
                          <div
                            className="theme-chip-group theme-interview-flow-talk__attach-chips"
                            aria-label="Criteria preview"
                          >
                            {state.assessment.dimensions.slice(0, 6).map((dim) => (
                              <Chip key={dim.key} size="sm">
                                {dim.label}
                                {typeof dim.weight === 'number' ? ` · ${dim.weight}` : ''}
                              </Chip>
                            ))}
                            {state.assessment.dimensions.length > 6 ? (
                              <Chip size="sm">+{state.assessment.dimensions.length - 6}</Chip>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <div
                        id={criteriaFoldId}
                        className={[
                          'theme-interview-flow-section__fold',
                          criteriaOpen ? 'is-open' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <div className="theme-interview-flow-section__fold-inner">
                          <RubricDimensionsEditor
                            dimensions={state.assessment.dimensions}
                            structureOptions={state.prompt.structure}
                            onChange={(dimensions) =>
                              patchAssessment({ dimensions }, 'assessment.dimensions')
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div
                      className={[
                        'theme-interview-flow-talk__group',
                        'theme-interview-flow-doc__matrix-group',
                        'theme-interview-flow-doc__matrix-group--preview',
                        matrixPreviewOpen ? 'is-open' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-history-focus="assessment"
                    >
                      <MajorSectionHead
                        title="Marking matrix preview"
                        open={matrixPreviewOpen}
                        onToggle={() => setMatrixPreviewOpen((v) => !v)}
                        controlsId={matrixPreviewFoldId}
                      />
                      {!matrixPreviewOpen && state.assessment.dimensions.length > 0 ? (
                        <p className="type-caption type-faint mb-0 theme-interview-flow-doc__matrix-preview-hint">
                          Expand to see the full compiled table ({state.assessment.dimensions.length}{' '}
                          {state.assessment.dimensions.length === 1 ? 'criterion' : 'criteria'})
                        </p>
                      ) : null}
                      <div
                        id={matrixPreviewFoldId}
                        className={[
                          'theme-interview-flow-section__fold',
                          matrixPreviewOpen ? 'is-open' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <div className="theme-interview-flow-section__fold-inner">
                          <MarkingMatrixPreviewTable
                            structure={state.prompt.structure}
                            assessment={state.assessment}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <SettingsRow
                    label="Format notes"
                    hint="How format grading should work for this essay"
                    historyFocus="assessment.formatNotes"
                  >
                    <VurifyInput
                      label="Format notes"
                      variant="area"
                      rows={3}
                      value={state.assessment.formatNotes ?? ''}
                      onChange={(e) =>
                        patchAssessment({ formatNotes: e.target.value || undefined })
                      }
                    />
                  </SettingsRow>
                )}
              </div>
              ) : null}
            </div>
          </div>

          {expanded ? (
            <div
              className="theme-interview-flow-form__guide theme-interview-flow-form__guide--major"
              aria-labelledby={guideTitleId}
            >
              <h4 id={guideTitleId} className="theme-interview-flow-form__guide-title mb-0">
                Writing challenge
              </h4>
              <div className="theme-interview-flow-form__guide-rule" role="presentation" />
              <p className="theme-interview-flow-form__guide-lead type-body-sm type-muted mb-0">
                Author the essay prompt and candidate notes in the document editor (like coding’s
                README). Edit criteria in section settings; expand Marking matrix preview for the
                compiled table — it is not part of the document.
              </p>
            </div>
          ) : null}

          <div
            id={previewPanelId}
            className={[
              'theme-interview-flow-section__fold',
              'theme-interview-flow-section__fold--preview',
              'theme-interview-flow-form__preview-fold',
              previewFold.shown ? 'is-open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={!previewFold.shown ? true : undefined}
          >
            <div className="theme-interview-flow-section__fold-inner">
              {previewFold.mounted ? (
              <div
                className={[
                  'theme-interview-flow-form__preview',
                  'theme-interview-flow-form__preview--lite',
                  'theme-interview-flow-form__preview--doc-editor',
                  expanded ? 'is-edit' : 'is-mini',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={expanded ? 'Document editor' : 'Document preview'}
              >
                <DocEditor
                  key={docMountKey}
                  ref={docRef}
                  embed
                  chrome={expanded ? 'section' : 'preview'}
                  initialPayload={state.document}
                  onPayloadChange={
                    expanded
                      ? (document) => {
                          if (skipOutboundRef.current) return
                          const next = persistWritingDocument(document)
                          if (JSON.stringify(next) === JSON.stringify(state.document)) return
                          markLocal(JSON.stringify(next))
                          sync({ ...stateRef.current, document: next })
                        }
                      : undefined
                  }
                />
              </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="theme-interview-flow-form__rail" aria-label="Section actions">
          {!expanded ? (
            <Tooltip content="Edit section" placement="left">
              <IconButton
                icon={Maximize2}
                size="sm"
                variant="ghost"
                aria-label="Edit section"
                onClick={handleToggle}
              />
            </Tooltip>
          ) : null}
          {expanded ? (
            <>
              <div
                className="theme-interview-flow-form__rail-rule"
                role="presentation"
              />
              <Tooltip content="Undo section edit" placement="left">
                <IconButton
                  icon={Undo2}
                  size="sm"
                  variant="ghost"
                  disabled={!canUndo}
                  aria-label="Undo section edit"
                  onClick={undo}
                />
              </Tooltip>
              <Tooltip content="Redo section edit" placement="left">
                <IconButton
                  icon={Redo2}
                  size="sm"
                  variant="ghost"
                  disabled={!canRedo}
                  aria-label="Redo section edit"
                  onClick={redo}
                />
              </Tooltip>
              <Tooltip
                content={
                  state.timed
                    ? 'Hard timer on — set minutes in settings'
                    : 'Hard timer off — turn on to set a limit'
                }
                placement="left"
              >
                <IconButton
                  icon={state.timed ? Timer : TimerOff}
                  size="sm"
                  variant="ghost"
                  active={state.timed}
                  aria-label={state.timed ? 'Disable hard timer' : 'Enable hard timer'}
                  onClick={() =>
                    patchMeta({
                      timed: !state.timed,
                      limitMinutes: !state.timed
                        ? state.limitMinutes ?? state.estimatedMinutes ?? 15
                        : null,
                    })
                  }
                />
              </Tooltip>
              <Tooltip content="On fail — if this section’s When is false at entry" placement="left">
                <span className="theme-interview-flow-form__rail-menu">
                  <MenuButton
                    iconOnly
                    icon={GitBranch}
                    size="sm"
                    variant="ghost"
                    menuSize="compact"
                    scrollRail="hidden"
                    portal
                    label="On fail"
                    selectedId={state.onFail}
                    items={FAIL_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
                    onSelect={(id) =>
                      patchMeta({
                        onFail: id as InterviewFlowFormOnFail,
                        onFailPhaseId:
                          id === 'goToPhase'
                            ? state.onFailPhaseId ?? jumpOptions[0]?.value ?? null
                            : null,
                      })
                    }
                  />
                </span>
              </Tooltip>
              {onRemove || onMove || onDuplicate ? (
                <InterviewFlowSpineRailActions
                  sectionLabel="writing"
                  onRemove={onRemove}
                  onMove={onMove}
                  onDuplicate={onDuplicate}
                />
              ) : null}
            </>
          ) : (
            <InterviewFlowSpineRailActions
              sectionLabel="writing"
              onRemove={onRemove}
              onMove={onMove}
              onDuplicate={onDuplicate}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
