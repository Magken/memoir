import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Plus,
  Redo2,
  Undo2,
} from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useAnimatedFoldMount } from '../hooks/useAnimatedFoldMount'
import { scrollSectionHistoryFocus } from '../lib/interviewBrief/sectionHistoryFocus'
import { useTalkSectionHistory } from '../hooks/useTalkSectionHistory'
import {
  labelTemplate,
  summarizeTemplate,
} from '../lib/interviewBrief/analysisLabels'
import type { InterviewFlowTemplateCardMeta } from '../lib/interviewBrief/analysisLabels'
import { CREATOR2_FAIL_OPTIONS } from '../lib/interviewBrief/creator2OnFail'
import { attachOverlapWarnings } from '../lib/interviewBrief/defaultAttachPacks'
import {
  attachableTemplateIds,
  resolveTalkSectionTypes,
  templatesConflict,
} from '../lib/interviewBrief/analysisTemplateCatalog'
import { withSyncedTalkCopy } from '../lib/interviewBrief/syncTalkCopy'
import {
  ensureSectionTemplateWeights,
  rebalanceSectionTemplateWeights,
} from '../lib/interviewBrief/rollupWeights'
import type {
  InterviewFlowFormOnFail,
  InterviewFlowProbeDefaults,
  InterviewFlowSummaryGlyph,
  InterviewFlowSummaryTagTone,
  InterviewFlowTalkEditorState,
} from '../lib/interviewBrief/flowTimelineTypes'
import {
  iconForSummaryGlyph,
} from '../lib/interviewBrief/summaryTagIcons'
import {
  matchTalkDepthBundle,
  resolveTalkDepthValues,
  talkDepthBundleById,
  talkDepthPatchFromBundle,
  TALK_DEPTH_BUNDLES,
  type TalkDepthBundleId,
} from '../lib/interviewBrief/talkDepthBundles'
import { Chip } from './Chip'
import { TemplateChipWeight } from './InterviewFlowLockedAnalysisChips'
import { IconButton } from './IconButton'
import { InterviewFlowDiscussionEditor } from './InterviewFlowDiscussionEditor'
import { InterviewFlowWhenEditor } from './InterviewFlowWhenEditor'
import { InterviewFlowReferencesSelect } from './InterviewFlowReferencesSelect'
import { Switch } from './Switch'
import { Tag } from './Tag'
import { ToggleGroup } from './ToggleGroup'
import { InterviewFlowSectionToolbar } from './InterviewFlowSectionToolbar'
import { InterviewFlowSpineRailActions } from './InterviewFlowSpineRailActions'
import { Tooltip } from './Tooltip'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifyCountInput } from './VurifyCountInput'
import { VurifyInput } from './VurifyInput'
import { VurifySelect } from './VurifySelect'

type RefOption = { id: string; title: string; kind?: string }

type TalkSettingsGroupId = 'conversation' | 'analysis' | 'flow' | 'probes' | 'targets'

type MetaChip = {
  id: string
  glyph: InterviewFlowSummaryGlyph
  label: string
  tone?: InterviewFlowSummaryTagTone
  tooltip?: string
}

type InterviewFlowTalkEditorProps = {
  state: InterviewFlowTalkEditorState
  expanded: boolean
  onToggle: () => void
  onChange: (next: InterviewFlowTalkEditorState) => void
  probeDefaults?: InterviewFlowProbeDefaults
  /** Brief template library — attach menu prefers these ids. */
  libraryIds?: readonly string[]
  /** Shared card meta — titles update when the library section edits them. */
  templateMeta?: Record<string, InterviewFlowTemplateCardMeta>
  /** Forward-only phases for onFail jump. */
  phaseOptions?: readonly RefOption[]
  /** Earlier phases only — for when.phaseCompleted. */
  whenPhaseOptions?: readonly RefOption[]
  /** Earlier tools only — for when.toolPassed. */
  toolOptions?: readonly RefOption[]
  /** Earlier topics only — for when.targetEquals. */
  topicOptions?: readonly RefOption[]
  onRemove?: () => void
  onMove?: (direction: 'up' | 'down') => void
  onDuplicate?: () => void
  className?: string
}

/** Same label | control grid as the assessment form section. */
function SettingsRow({
  label,
  hint,
  historyFocus,
  children,
}: {
  label?: string
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
        {label ? <p className="type-label mb-0">{label}</p> : null}
        {hint ? <p className="type-caption type-faint mb-0">{hint}</p> : null}
      </div>
      <div className="theme-interview-flow-form__settings-control">{children}</div>
    </div>
  )
}

function MetaTags({ chips, label }: { chips: readonly MetaChip[]; label: string }) {
  if (!chips.length) return null
  return (
    <div
      className="theme-interview-flow-talk__group-tags theme-interview-flow-timeline__tags theme-tag-group"
      aria-label={label}
    >
      {chips.map((chip) => {
        const Icon = iconForSummaryGlyph(chip.glyph)
        const tag = (
          <Tag
            size="sm"
            className={[
              'theme-interview-flow-timeline__tag',
              chip.tone ? `theme-interview-flow-timeline__tag--${chip.tone}` : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Icon className="theme-interview-flow-timeline__tag-icon size-3 shrink-0" aria-hidden />
            <span>{chip.label}</span>
          </Tag>
        )
        if (!chip.tooltip) {
          return (
            <span key={chip.id} className="theme-interview-flow-talk__tag-wrap">
              {tag}
            </span>
          )
        }
        return (
          <Tooltip key={chip.id} content={chip.tooltip} placement="top">
            <span className="theme-interview-flow-talk__tag-wrap">{tag}</span>
          </Tooltip>
        )
      })}
    </div>
  )
}

/** Same VurifyMenuButton as Edit section — label is the major title. */
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

function shortId(prefix: string): string {
  return `${prefix}.${Math.random().toString(36).slice(2, 8)}`
}

export function InterviewFlowTalkEditor({
  state,
  expanded,
  onToggle,
  onChange,
  probeDefaults = {},
  libraryIds = [],
  templateMeta = {},
  phaseOptions = [],
  whenPhaseOptions = [],
  toolOptions = [],
  topicOptions = [],
  onRemove,
  onMove,
  onDuplicate,
  className = '',
}: InterviewFlowTalkEditorProps) {
  const panelId = useId()
  const previewPanelId = useId()
  const conversationFoldId = useId()
  const analysisFoldId = useId()
  const flowFoldId = useId()
  const probesFoldId = useId()
  const targetsFoldId = useId()
  const probesGroupRef = useRef<HTMLLIElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [openGroups, setOpenGroups] = useState<Partial<Record<TalkSettingsGroupId, boolean>>>({})
  const [addTemplateValue, setAddTemplateValue] = useState('')
  const [previewOpen, setPreviewOpen] = useState(true)
  const showPreview = !expanded && previewOpen
  const previewFold = useAnimatedFoldMount(showPreview)
  const scrollToFocus = (focus?: string | null) => {
    if (!focus) return
    if (focus.startsWith('probes')) {
      setOpenGroups((cur) => ({ ...cur, probes: true }))
    } else if (focus.startsWith('targets') || focus.startsWith('templateIds')) {
      setOpenGroups((cur) => ({ ...cur, analysis: true, targets: true }))
    } else if (
      focus.startsWith('purpose') ||
      focus.startsWith('topicLabel') ||
      focus.startsWith('maxFollowUps') ||
      focus.startsWith('maxProbes') ||
      focus.startsWith('minCandidateTurns') ||
      focus.startsWith('behaviourPrompt') ||
      focus.startsWith('targetMinutes')
    ) {
      setOpenGroups((cur) => ({ ...cur, conversation: true }))
    } else if (
      focus.startsWith('onFail') ||
      focus.startsWith('required') ||
      focus.startsWith('when')
    ) {
      setOpenGroups((cur) => ({ ...cur, flow: true }))
    }
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        scrollSectionHistoryFocus(sectionRef.current, focus)
      }, 120)
    })
  }

  const { commit, undo, redo, canUndo, canRedo } = useTalkSectionHistory(
    state,
    onChange,
    scrollToFocus,
  )

  const publish = (
    partial: Partial<InterviewFlowTalkEditorState>,
    focusHint?: string | null,
  ) => {
    const key = Object.keys(partial)[0]
    commit(withSyncedTalkCopy(state, partial), focusHint ?? key ?? null)
  }

  const focusProbesGroup = () => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        probesGroupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    })
  }

  const addProbe = () => {
    setOpenGroups((cur) => ({ ...cur, probes: true }))
    publish({
      probes: [
        ...state.probes,
        {
          id: shortId('p'),
          goal: 'New probe goal',
          required: true,
          hint: null,
        },
      ],
    })
    focusProbesGroup()
  }

  const templateIds = state.templateIds
  const overlap = attachOverlapWarnings(templateIds)
  const availableTemplates = attachableTemplateIds({
    host: 'discussion',
    attached: templateIds,
    sectionTypes: resolveTalkSectionTypes({
      isOpening: state.isOpening,
      isClosing: state.isClosing,
    }),
    libraryIds,
  })

  const displayLabel = (id: string) => labelTemplate(id, templateMeta[id])
  const displaySummary = (id: string) => summarizeTemplate(id, templateMeta[id])

  const addTemplate = (id: string) => {
    if (!id || templateIds.includes(id)) return
    if (templateIds.some((cur) => templatesConflict(cur, id))) return
    const nextIds = [...templateIds, id]
    publish({
      templateIds: nextIds,
      templateWeights: ensureSectionTemplateWeights(nextIds, state.templateWeights),
    })
    setAddTemplateValue('')
  }

  const removeTemplate = (id: string) => {
    const nextIds = templateIds.filter((x) => x !== id)
    const nextWeights = { ...(state.templateWeights ?? {}) }
    delete nextWeights[id]
    publish({
      templateIds: nextIds,
      templateWeights: ensureSectionTemplateWeights(nextIds, nextWeights),
    })
  }

  const setTemplateWeight = (id: string, weight: number) => {
    const current = ensureSectionTemplateWeights(templateIds, state.templateWeights)
    publish({
      templateWeights: rebalanceSectionTemplateWeights(templateIds, current, id, weight),
    })
  }

  const displayTemplateWeights = ensureSectionTemplateWeights(templateIds, state.templateWeights)

  const depth = resolveTalkDepthValues(state, probeDefaults)
  const depthBundle = matchTalkDepthBundle(depth)

  const conversationChips: MetaChip[] = [
    { id: 'min', glyph: 'time', label: `${depth.targetMinutes}m`, tone: 'time' },
    {
      id: 'turns',
      glyph: 'turns',
      label: `${depth.minCandidateTurns} turn${depth.minCandidateTurns === 1 ? '' : 's'}`,
      tone: 'count',
    },
    {
      id: 'replies',
      glyph: 'replies',
      label: `${depth.maxFollowUps} repl${depth.maxFollowUps === 1 ? 'y' : 'ies'}`,
      tone: 'count',
    },
    {
      id: 'probes',
      glyph: 'probeCap',
      label: `${depth.maxProbes} probe${depth.maxProbes === 1 ? '' : 's'}`,
      tone: 'count',
      tooltip: 'Soft cap on how many main questions this section can have',
    },
  ]

  const analysisChips: MetaChip[] = [
    {
      id: 'attach',
      glyph: 'pack',
      label: templateIds.length
        ? `${templateIds.length} template${templateIds.length === 1 ? '' : 's'}`
        : 'No templates',
      tone: 'pack',
      tooltip: templateIds.length
        ? templateIds.map((id) => displayLabel(id)).join(' · ')
        : 'No analysis templates attached',
    },
  ]

  const requiredProbeCount = state.probes.filter((p) => p.required).length
  const probeChips: MetaChip[] = [
    {
      id: 'probe-count',
      glyph: 'probes',
      label:
        state.probes.length === 0
          ? 'No probes'
          : `${state.probes.length} probe${state.probes.length === 1 ? '' : 's'}`,
      tone: 'count',
    },
    ...(requiredProbeCount
      ? [
          {
            id: 'probe-required',
            glyph: 'required',
            label: `${requiredProbeCount} required`,
            tone: 'accent' as const,
          } satisfies MetaChip,
        ]
      : []),
  ]

  const requiredTargetCount = state.targets.filter((t) => t.required).length
  const targetChips: MetaChip[] = [
    {
      id: 'target-count',
      glyph: 'targets',
      label:
        state.targets.length === 0
          ? 'No targets'
          : `${state.targets.length} target${state.targets.length === 1 ? '' : 's'}`,
      tone: 'count',
    },
    ...(requiredTargetCount
      ? [
          {
            id: 'target-required',
            glyph: 'required',
            label: `${requiredTargetCount} required`,
            tone: 'accent' as const,
          } satisfies MetaChip,
        ]
      : []),
  ]

  const flowChips: MetaChip[] = [
    {
      id: 'fail',
      glyph: 'fail',
      label: CREATOR2_FAIL_OPTIONS.find((o) => o.value === state.onFail)?.label ?? state.onFail,
      tone: 'gate',
      tooltip: CREATOR2_FAIL_OPTIONS.find((o) => o.value === state.onFail)?.description,
    },
    ...(state.isOpening
      ? [{ id: 'open', glyph: 'opening', label: 'Opening', tone: 'accent' } satisfies MetaChip]
      : []),
    ...(state.isClosing
      ? [{ id: 'close', glyph: 'closing', label: 'Closing', tone: 'accent' } satisfies MetaChip]
      : []),
    ...(state.required
      ? [
          {
            id: 'req',
            glyph: 'required',
            label: 'Required',
            tone: 'meta',
            tooltip: 'Candidate must finish this section once it starts',
          } satisfies MetaChip,
        ]
      : []),
    ...(state.when
      ? [
          {
            id: 'when',
            glyph: 'when',
            label: 'When set',
            tone: 'meta',
            tooltip: 'This section only runs when its conditions are met',
          } satisfies MetaChip,
        ]
      : []),
  ]

  const lengthHint =
    depthBundle === 'custom'
      ? 'Adjust the timing and depth below'
      : talkDepthBundleById(depthBundle).summary

  const failHint =
    CREATOR2_FAIL_OPTIONS.find((o) => o.value === state.onFail)?.description ??
    'What happens if this section shouldn’t run'

  const effectiveMaxProbes = state.maxProbes ?? probeDefaults.maxProbes ?? 4
  const warnings: string[] = []
  if (state.probes.length === 0) warnings.push('Add at least one probe.')
  if (state.probes.length > effectiveMaxProbes) {
    warnings.push(`Probe count (${state.probes.length}) is over the soft cap (${effectiveMaxProbes}).`)
  }
  warnings.push(...overlap)

  const jumpOptions = phaseOptions.map((p) => ({ value: p.id, label: p.title }))

  const toggleGroup = (id: TalkSettingsGroupId) => {
    setOpenGroups((cur) => ({ ...cur, [id]: !cur[id] }))
  }

  const isGroupOpen = (id: TalkSettingsGroupId) => Boolean(openGroups[id])

  const applyBundle = (id: TalkDepthBundleId) => {
    publish(talkDepthPatchFromBundle(id))
  }

  return (
    <div
      ref={sectionRef}
      className={[
        'theme-interview-flow-talk',
        'theme-interview-flow-section',
        expanded ? 'is-expanded' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-interview-flow-section__layout theme-interview-flow-talk__layout">
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
              {warnings.length ? (
                <ul className="theme-interview-flow-talk__warnings">
                  {warnings.map((w) => (
                    <li key={w} className="type-body-sm">
                      {w}
                    </li>
                  ))}
                </ul>
              ) : null}

              <ul className="theme-interview-flow-talk__groups" aria-label="Talk settings">
                <li className="theme-interview-flow-talk__group theme-interview-flow-talk__group--flat">
                  <div className="theme-interview-flow-form__settings">
                    <SettingsRow
                      label="Topic"
                      hint="Name of this conversation — shown at the top of the section"
                      historyFocus="sectionTitle"
                    >
                      <VurifyInput
                        label="Topic"
                        value={state.sectionTitle}
                        onChange={(e) => publish({ sectionTitle: e.target.value }, 'sectionTitle')}
                      />
                    </SettingsRow>
                    <SettingsRow
                      label="Purpose"
                      hint="What you want to cover or learn in this conversation"
                      historyFocus="summaryBlurb"
                    >
                      <VurifyInput
                        label="Purpose"
                        value={state.summaryBlurb}
                        onChange={(e) => publish({ summaryBlurb: e.target.value }, 'summaryBlurb')}
                      />
                    </SettingsRow>
                  </div>
                </li>

                <li
                  className={[
                    'theme-interview-flow-talk__group',
                    isGroupOpen('conversation') ? 'is-open' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-history-focus="targetMinutes"
                >
                  <MajorSectionHead
                    title="Conversation"
                    open={isGroupOpen('conversation')}
                    onToggle={() => toggleGroup('conversation')}
                    controlsId={conversationFoldId}
                  />
                  {conversationChips.length ? (
                    <div className="theme-interview-flow-talk__major-tags">
                      <MetaTags chips={conversationChips} label="Conversation depth" />
                    </div>
                  ) : null}
                  <div
                    id={conversationFoldId}
                    className={[
                      'theme-interview-flow-section__fold',
                      isGroupOpen('conversation') ? 'is-open' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="theme-interview-flow-section__fold-inner">
                      <div className="theme-interview-flow-form__settings">
                        <SettingsRow
                          label="Length"
                          hint={lengthHint}
                          historyFocus="targetMinutes"
                        >
                          <ToggleGroup
                            variant="vurify"
                            size="sm"
                            aria-label="Conversation length"
                            options={[
                              ...TALK_DEPTH_BUNDLES.map((b) => ({
                                value: b.id,
                                label: b.label,
                              })),
                              { value: 'custom', label: 'Custom' },
                            ]}
                            value={depthBundle}
                            onChange={(value) => {
                              const id = String(Array.isArray(value) ? value[0] : value)
                              if (id === 'custom') {
                                setOpenGroups((cur) => ({ ...cur, conversation: true }))
                                return
                              }
                              applyBundle(id as TalkDepthBundleId)
                            }}
                          />
                        </SettingsRow>
                        <SettingsRow
                          label="Target minutes"
                          hint="About how long this conversation should take"
                          historyFocus="targetMinutes"
                        >
                          <VurifyCountInput
                            label="Minutes"
                            min={1}
                            max={180}
                            value={String(depth.targetMinutes)}
                            onValueChange={(v) => {
                              const n = Number.parseInt(v, 10)
                              publish({ targetMinutes: Number.isFinite(n) ? n : 5 })
                            }}
                          />
                        </SettingsRow>
                        <SettingsRow
                          label="Min candidate turns"
                          hint="How many answers the candidate should give before moving on"
                          historyFocus="minCandidateTurns"
                        >
                          <VurifyCountInput
                            label="Turns"
                            min={0}
                            max={20}
                            value={String(depth.minCandidateTurns)}
                            onValueChange={(v) => {
                              const n = Number.parseInt(v, 10)
                              publish({
                                minCandidateTurns: Number.isFinite(n) ? n : 1,
                              })
                            }}
                          />
                        </SettingsRow>
                        <SettingsRow
                          label="Max follow-ups"
                          hint="How many follow-up questions after each main question"
                          historyFocus="maxFollowUps"
                        >
                          <VurifyCountInput
                            label="Replies"
                            min={0}
                            max={20}
                            value={String(depth.maxFollowUps)}
                            onValueChange={(v) => {
                              const n = Number.parseInt(v, 10)
                              publish({ maxFollowUps: Number.isFinite(n) ? n : 0 })
                            }}
                          />
                        </SettingsRow>
                        <SettingsRow
                          label="Max probes"
                          hint="Soft limit on how many main questions this section can have"
                          historyFocus="maxProbes"
                        >
                          <VurifyCountInput
                            label="Probes"
                            min={1}
                            max={20}
                            value={String(depth.maxProbes)}
                            onValueChange={(v) => {
                              const n = Number.parseInt(v, 10)
                              publish({ maxProbes: Number.isFinite(n) ? n : 4 })
                            }}
                          />
                        </SettingsRow>
                      </div>
                    </div>
                  </div>
                </li>

                <li
                  className={[
                    'theme-interview-flow-talk__group',
                    isGroupOpen('analysis') ? 'is-open' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-history-focus="templateIds"
                >
                  <MajorSectionHead
                    title="Analysis"
                    open={isGroupOpen('analysis')}
                    onToggle={() => toggleGroup('analysis')}
                    controlsId={analysisFoldId}
                  />
                  <div className="theme-interview-flow-talk__major-tags">
                    <MetaTags chips={analysisChips} label="Analysis attach" />
                  </div>
                  <div
                    id={analysisFoldId}
                    className={[
                      'theme-interview-flow-section__fold',
                      isGroupOpen('analysis') ? 'is-open' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="theme-interview-flow-section__fold-inner">
                      <div className="theme-interview-flow-form__settings">
                        <SettingsRow
                          label="Add template"
                          hint="Choose what to score or summarize in this conversation"
                          historyFocus="templateIds"
                        >
                          <VurifySelect
                            label="Template"
                            variant="dropdown"
                            scrollRail="hidden"
                            options={availableTemplates.map((id) => ({
                              value: id,
                              label: displayLabel(id),
                              description: displaySummary(id),
                            }))}
                            value={addTemplateValue}
                            onChange={(id) => addTemplate(id)}
                            placeholder={
                              availableTemplates.length
                                ? 'Choose template…'
                                : libraryIds.length
                                  ? 'All library templates added'
                                  : 'Add templates in Analysis templates first'
                            }
                          />
                        </SettingsRow>
                        {templateIds.length ? (
                          <SettingsRow
                            label="Attached"
                            hint="Weights always sum to 1. Raising one shrinks the others. 0 = graded, not in overall"
                            historyFocus="templateIds"
                          >
                            <div
                              className="theme-chip-group theme-interview-flow-talk__attach-chips theme-interview-flow-talk__attach-weights"
                              aria-label="Attached templates"
                            >
                              {templateIds.map((id) => (
                                <div key={id} className="theme-interview-flow-talk__template-weight">
                                  <Tooltip
                                    content={displaySummary(id)}
                                    placement="top"
                                  >
                                    <Chip
                                      size="sm"
                                      selected
                                      onDismiss={() => removeTemplate(id)}
                                    >
                                      <span>{displayLabel(id)}</span>
                                    </Chip>
                                  </Tooltip>
                                  <TemplateChipWeight
                                    templateId={id}
                                    value={displayTemplateWeights[id] ?? 0}
                                    onChange={(weight) => setTemplateWeight(id, weight)}
                                  />
                                </div>
                              ))}
                            </div>
                          </SettingsRow>
                        ) : (
                          <p className="type-caption type-faint mb-0">No templates attached yet</p>
                        )}
                        {overlap.length ? (
                          <ul className="theme-interview-flow-talk__warnings">
                            {overlap.map((w) => (
                              <li key={w} className="type-body-sm">
                                {w}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>

                <li
                  className={[
                    'theme-interview-flow-talk__group',
                    isGroupOpen('flow') ? 'is-open' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-history-focus="onFail"
                >
                  <MajorSectionHead
                    title="Flow"
                    open={isGroupOpen('flow')}
                    onToggle={() => toggleGroup('flow')}
                    controlsId={flowFoldId}
                  />
                  {flowChips.length ? (
                    <div className="theme-interview-flow-talk__major-tags">
                      <MetaTags chips={flowChips} label="Flow flags" />
                    </div>
                  ) : null}
                  <div
                    id={flowFoldId}
                    className={[
                      'theme-interview-flow-section__fold',
                      isGroupOpen('flow') ? 'is-open' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="theme-interview-flow-section__fold-inner">
                      <div className="theme-interview-flow-form__settings">
                        <SettingsRow label="On fail" hint={failHint} historyFocus="onFail">
                            <VurifySelect
                            label="On fail"
                            variant="dropdown"
                            options={CREATOR2_FAIL_OPTIONS.map((o) => ({
                              value: o.value,
                              label: o.label,
                            }))}
                            value={state.onFail}
                            onChange={(value) =>
                              publish(
                                {
                                  onFail: value as InterviewFlowFormOnFail,
                                  onFailPhaseId:
                                    value === 'goToPhase'
                                      ? state.onFailPhaseId ?? jumpOptions[0]?.value ?? null
                                      : null,
                                },
                                'onFail',
                              )
                            }
                            placeholder="Choose…"
                          />
                        </SettingsRow>
                        {state.onFail === 'goToPhase' ? (
                          <SettingsRow
                            label="Jump target"
                            hint="Pick a later section to jump to — not an earlier one"
                            historyFocus="onFailPhaseId"
                          >
                            <VurifySelect
                              label="Phase"
                              variant="dropdown"
                              scrollRail="hidden"
                              options={jumpOptions}
                              value={state.onFailPhaseId ?? ''}
                              onChange={(onFailPhaseId) =>
                                publish({ onFailPhaseId }, 'onFailPhaseId')
                              }
                              placeholder="Choose…"
                            />
                          </SettingsRow>
                        ) : null}
                        <SettingsRow
                          label="Required phase"
                          hint="Once this section starts, the candidate must finish it"
                        >
                          <Switch
                            checked={state.required}
                            onChange={(required) => publish({ required })}
                            label={state.required ? 'On' : 'Off'}
                            size="sm"
                          />
                        </SettingsRow>
                        <SettingsRow
                          label="Behaviour override"
                          hint="Extra instructions for the interviewer only in this section"
                        >
                          <VurifyInput
                            label="Behaviour override"
                            variant="area"
                            rows={2}
                            value={state.behaviourPromptOverride ?? ''}
                            onChange={(e) =>
                              publish({
                                behaviourPromptOverride: e.target.value || null,
                              })
                            }
                          />
                        </SettingsRow>
                        <SettingsRow
                          label="Notes"
                          hint="Private notes for you — candidates never see these"
                        >
                          <VurifyInput
                            label="Notes"
                            variant="area"
                            rows={2}
                            value={state.notes ?? ''}
                            onChange={(e) => publish({ notes: e.target.value || null })}
                          />
                        </SettingsRow>
                        <SettingsRow
                          label="When"
                          hint="Optional rules for when this section should run"
                        >
                          <div className="theme-interview-flow-talk__when-control">
                            <InterviewFlowWhenEditor
                              value={state.when}
                              onChange={(when) => publish({ when })}
                              toolOptions={toolOptions}
                              phaseOptions={whenPhaseOptions}
                              topicOptions={topicOptions}
                            />
                          </div>
                        </SettingsRow>
                        <SettingsRow
                          label="Reference section"
                          hint="Optional. Taking and scoring bias RAG toward this earlier stage. Off keeps memory of earlier sections."
                          historyFocus="references"
                        >
                          <InterviewFlowReferencesSelect
                            earlier={whenPhaseOptions}
                            value={state.referencesPhaseIds ?? state.referencesPhaseId}
                            onChange={(referencesPhaseIds) =>
                              publish(
                                {
                                  referencesPhaseIds,
                                  referencesPhaseId: referencesPhaseIds[0] ?? null,
                                },
                                'references',
                              )
                            }
                          />
                        </SettingsRow>
                      </div>
                    </div>
                  </div>
                </li>

                <li
                  ref={probesGroupRef}
                  className={[
                    'theme-interview-flow-talk__group',
                    isGroupOpen('probes') ? 'is-open' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-history-focus="probes"
                >
                  <MajorSectionHead
                    title="Probes"
                    open={isGroupOpen('probes')}
                    onToggle={() => toggleGroup('probes')}
                    controlsId={probesFoldId}
                  />
                  <div className="theme-interview-flow-talk__major-tags">
                    <MetaTags chips={probeChips} label="Probes summary" />
                  </div>
                  <div
                    id={probesFoldId}
                    className={[
                      'theme-interview-flow-section__fold',
                      isGroupOpen('probes') ? 'is-open' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="theme-interview-flow-section__fold-inner">
                      <InterviewFlowDiscussionEditor
                        variant="probes"
                        probes={state.probes}
                        targets={state.targets}
                        onProbesChange={(probes) => publish({ probes })}
                        onTargetsChange={(targets) => publish({ targets })}
                      />
                    </div>
                  </div>
                </li>

                <li
                  className={[
                    'theme-interview-flow-talk__group',
                    isGroupOpen('targets') ? 'is-open' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <MajorSectionHead
                    title="Targets"
                    open={isGroupOpen('targets')}
                    onToggle={() => toggleGroup('targets')}
                    controlsId={targetsFoldId}
                  />
                  <div className="theme-interview-flow-talk__major-tags">
                    <MetaTags chips={targetChips} label="Targets summary" />
                  </div>
                  <div
                    id={targetsFoldId}
                    className={[
                      'theme-interview-flow-section__fold',
                      isGroupOpen('targets') ? 'is-open' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="theme-interview-flow-section__fold-inner">
                      <InterviewFlowDiscussionEditor
                        variant="targets"
                        probes={state.probes}
                        targets={state.targets}
                        onProbesChange={(probes) => publish({ probes })}
                        onTargetsChange={(targets) => publish({ targets })}
                      />
                    </div>
                  </div>
                </li>
              </ul>
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
                <InterviewFlowDiscussionEditor
                  variant="preview"
                  probes={state.probes}
                  targets={state.targets}
                  onProbesChange={(probes) => publish({ probes })}
                  onTargetsChange={(targets) => publish({ targets })}
                />
              ) : null}
            </div>
          </div>
        </div>

        <aside
          className="theme-interview-flow-section__rail theme-interview-flow-talk__rail"
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
          {expanded ? (
            <>
              <div
                className="theme-interview-flow-section__rail-rule"
                role="presentation"
              />
              <div className="theme-interview-flow-talk__rail-meta">
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
              <Tooltip content="Required phase" placement="left">
                <IconButton
                  icon={iconForSummaryGlyph('required')}
                  size="sm"
                  variant="ghost"
                  active={state.required}
                  aria-label="Toggle required"
                  onClick={() => publish({ required: !state.required })}
                />
              </Tooltip>
              <Tooltip content="When conditions" placement="left">
                <IconButton
                  icon={iconForSummaryGlyph('when')}
                  size="sm"
                  variant="ghost"
                  active={Boolean(state.when)}
                  aria-label="Edit when conditions"
                  onClick={() => setOpenGroups((cur) => ({ ...cur, flow: true }))}
                />
              </Tooltip>
              <Tooltip content="Add probe" placement="left">
                <IconButton
                  icon={Plus}
                  size="sm"
                  variant="ghost"
                  aria-label="Add probe"
                  onClick={addProbe}
                />
              </Tooltip>
              {onRemove || onMove || onDuplicate ? (
                <InterviewFlowSpineRailActions
                  sectionLabel="talk"
                  onRemove={onRemove}
                  onMove={onMove}
                  onDuplicate={onDuplicate}
                />
              ) : null}
            </div>
            </>
          ) : (
            <InterviewFlowSpineRailActions
              sectionLabel="talk"
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
