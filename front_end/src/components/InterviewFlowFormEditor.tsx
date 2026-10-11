import {
  GitBranch,
  Maximize2,
  Shield,
  ShieldOff,
  Timer,
  TimerOff,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useAnimatedFoldMount } from '../hooks/useAnimatedFoldMount'
import { useSoftAdoptEditorPayload } from '../hooks/useToolSectionHistory'
import { CREATOR2_FAIL_OPTIONS } from '../lib/interviewBrief/creator2OnFail'
import type {
  InterviewFlowFormEditorState,
  InterviewFlowFormOnFail,
} from '../lib/interviewBrief/flowTimelineTypes'
import { estimateFormSectionMinutes } from '../lib/interviewBrief/estimateFormSectionMinutes'
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
import type { TestFormDocument, TestFormEditorPayload } from '../lib/testForm/types'
import { IconButton } from './IconButton'
import { MenuButton } from './MenuButton'
import { Switch } from './Switch'
import { ToggleGroup } from './ToggleGroup'
import { TestForm, type TestFormHandle } from './TestForm'
import { ThemeScroll } from './ThemeScroll'
import { InterviewFlowSectionToolbar } from './InterviewFlowSectionToolbar'
import { InterviewFlowSpineRailActions } from './InterviewFlowSpineRailActions'
import { Tooltip } from './Tooltip'
import { VurifyCountInput } from './VurifyCountInput'
import { VurifySelect } from './VurifySelect'
import { InterviewFlowLockedAnalysisChips } from './InterviewFlowLockedAnalysisChips'
import { InterviewFlowReferencesSelect } from './InterviewFlowReferencesSelect'

type PhaseOption = { id: string; title: string; kind?: string }

type InterviewFlowFormEditorProps = {
  state: InterviewFlowFormEditorState
  expanded: boolean
  onToggle: () => void
  onChange: (next: InterviewFlowFormEditorState) => void
  phaseOptions?: readonly PhaseOption[]
  /** Earlier phases only — reference dropdown. */
  whenPhaseOptions?: readonly PhaseOption[]
  onRemove?: () => void
  onMove?: (direction: 'up' | 'down') => void
  onDuplicate?: () => void
  className?: string
}

const FAIL_OPTIONS = CREATOR2_FAIL_OPTIONS

function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="theme-interview-flow-form__settings-row">
      <div className="theme-interview-flow-form__settings-label min-w-0">
        <p className="type-label mb-0">{label}</p>
        {hint ? <p className="type-caption type-faint mb-0">{hint}</p> : null}
      </div>
      <div className="theme-interview-flow-form__settings-control">{children}</div>
    </div>
  )
}

function docsFingerprint(document: TestFormDocument): string {
  return [
    document.id,
    document.title,
    document.questions.length,
    document.questions
      .map((q) => `${q.id}:${q.kind}:${q.required ? 1 : 0}:${q.prompt?.slice(0, 24) ?? ''}`)
      .join(','),
    JSON.stringify(document.answerKey ?? {}),
  ].join('|')
}

export function InterviewFlowFormEditor({
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
}: InterviewFlowFormEditorProps) {
  const panelId = useId()
  const previewPanelId = useId()
  const guideTitleId = useId()
  const formRef = useRef<TestFormHandle>(null)
  const stateRef = useRef(state)
  const onChangeRef = useRef(onChange)
  const [previewOpen, setPreviewOpen] = useState(true)
  stateRef.current = state
  onChangeRef.current = onChange
  const formDocFp = docsFingerprint(state.document)
  const { skipOutboundRef, markLocal } = useSoftAdoptEditorPayload(formDocFp, () => {
    formRef.current?.loadContext({
      document: stateRef.current.document,
      mode: expanded ? 'author' : 'take',
    })
  })
  const showPreview = !expanded && previewOpen
  const previewFold = useAnimatedFoldMount(expanded || showPreview)
  const formMountKey = expanded
    ? `${state.toolRef}:edit`
    : `${state.toolRef}:${docsFingerprint(state.document)}`

  const publish = (partial: Partial<InterviewFlowFormEditorState> = {}) => {
    const prev = stateRef.current
    const ctx = formRef.current?.getContext() as TestFormEditorPayload | undefined
    // Prefer live author doc; never use take-mode stripped answer keys while editing.
    const fromForm =
      ctx?.mode === 'author' || expanded ? ctx?.document : undefined
    let document = partial.document ?? fromForm ?? prev.document
    if (partial.sectionTitle != null) {
      document = {
        ...document,
        title: partial.sectionTitle.trim() || document.title,
      }
    }
    const next: InterviewFlowFormEditorState = {
      ...prev,
      ...partial,
      document,
      estimatedMinutes: estimateFormSectionMinutes(document),
      assist: resolveToolAssistCaps(partial.assist ?? prev.assist),
    }
    const unchanged =
      docsFingerprint(next.document) === docsFingerprint(prev.document) &&
      next.sectionTitle === prev.sectionTitle &&
      next.summaryBlurb === prev.summaryBlurb &&
      next.packLabel === prev.packLabel &&
      next.isGate === prev.isGate &&
      next.onFail === prev.onFail &&
      next.onFailPhaseId === prev.onFailPhaseId &&
      next.referencesPhaseId === prev.referencesPhaseId &&
      (next.referencesPhaseIds ?? []).join(',') === (prev.referencesPhaseIds ?? []).join(',') &&
      next.estimatedMinutes === prev.estimatedMinutes &&
      next.timed === prev.timed &&
      next.limitMinutes === prev.limitMinutes &&
      next.assist.chat === prev.assist.chat &&
      next.assist.spoilers === prev.assist.spoilers &&
      next.assist.write === prev.assist.write
    if (unchanged) return next
    onChangeRef.current(next)
    return next
  }

  useEffect(() => {
    void formRef.current?.invokeAction?.({
      kind: 'testform',
      actionId: 'testform.action.set-mode',
      value: expanded ? 'author' : 'take',
    })
  }, [expanded])

  /** Fallback poll while authoring — primary path is onDocumentChange. */
  useEffect(() => {
    if (!expanded) return
    const id = window.setInterval(() => {
      if (skipOutboundRef.current) return
      publish()
    }, 600)
    return () => window.clearInterval(id)
  }, [expanded])

  const handleToggle = () => {
    if (expanded) publish()
    onToggle()
  }

  const patchMeta = (partial: Partial<InterviewFlowFormEditorState>) => {
    publish(partial)
  }

  const handleDocumentChange = (document: TestFormDocument) => {
    if (skipOutboundRef.current) return
    markLocal(docsFingerprint(document))
    publish({ document })
  }

  const jumpOptions = phaseOptions
    .filter((p) => p.id)
    .map((p) => ({ value: p.id, label: p.title }))
  const assist = resolveToolAssistCaps(state.assist)
  const assistBundle = matchToolAssistBundle(assist)
  const assistCaps = toolAssistCapRows('form')
  const assistHint =
    assistBundle === 'custom'
      ? 'Mix chat, answers, and write caps'
      : (TOOL_ASSIST_BUNDLES.find((b) => b.id === assistBundle)?.summary ??
        'No candidate chat or editor help')

  return (
    <div
      className={[
        'theme-interview-flow-form',
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
                  label="Pass gate"
                  hint="Required answers can stop the candidate from moving on"
                >
                  <Switch
                    checked={state.isGate}
                    onChange={(checked) => patchMeta({ isGate: checked })}
                    label={state.isGate ? 'On' : 'Off'}
                    size="sm"
                  />
                </SettingsRow>
                <SettingsRow
                  label="Hard timer"
                  hint="Time limit while the candidate is working on this form"
                >
                  <Switch
                    checked={state.timed}
                    onChange={(checked) =>
                      patchMeta({
                        timed: checked,
                        limitMinutes: checked
                          ? state.limitMinutes ?? state.estimatedMinutes ?? 5
                          : null,
                      })
                    }
                    label={state.timed ? 'On' : 'Off'}
                    size="sm"
                  />
                </SettingsRow>
                {state.timed ? (
                  <SettingsRow label="Time limit" hint="Minutes before the section times out">
                    <VurifyCountInput
                      label="Minutes"
                      min={1}
                      max={180}
                      value={String(state.limitMinutes ?? state.estimatedMinutes ?? 5)}
                      onValueChange={(value) => {
                        const n = Number.parseInt(value, 10)
                        patchMeta({
                          timed: true,
                          limitMinutes: Number.isFinite(n) ? n : 5,
                        })
                      }}
                    />
                  </SettingsRow>
                ) : null}
                <SettingsRow label="Assist" hint={assistHint}>
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
                  <SettingsRow key={cap.id} label={cap.label} hint={cap.does}>
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
                >
                  <VurifySelect
                    label="Fail policy"
                    variant="dropdown"
                    options={FAIL_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
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
                  <SettingsRow label="Jump target" hint="Pick a later section to jump to — not an earlier one">
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
                >
                  <InterviewFlowReferencesSelect
                    earlier={whenPhaseOptions}
                    value={state.referencesPhaseIds ?? state.referencesPhaseId}
                    onChange={(referencesPhaseIds) =>
                      patchMeta({
                        referencesPhaseIds,
                        referencesPhaseId: referencesPhaseIds[0] ?? null,
                      })
                    }
                  />
                </SettingsRow>
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
                Form
              </h4>
              <div className="theme-interview-flow-form__guide-rule" role="presentation" />
              <p className="theme-interview-flow-form__guide-lead type-body-sm type-muted mb-0">
                You can edit the form directly in this section:
              </p>
              <ul className="theme-interview-flow-form__guide-list type-body-sm type-muted">
                <li>Click titles, prompts, and options to edit in place</li>
                <li>Add questions from the kind chips in each section header</li>
                <li>Add sections from the tray at the bottom</li>
                <li>Set answer keys and scoring on each question</li>
              </ul>
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
                    expanded ? 'is-edit' : 'is-mini',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={expanded ? 'Form editor' : 'Form preview'}
                >
                  {expanded ? (
                    <div className="theme-interview-flow-form__preview-scale">
                      <TestForm
                        key={formMountKey}
                        ref={formRef}
                        embed
                        className="theme-interview-flow-form__test-form"
                        initialDocument={state.document}
                        initialMode="author"
                        onDocumentChange={handleDocumentChange}
                      />
                    </div>
                  ) : (
                    <ThemeScroll
                      rail="nano"
                      scrollClouds
                      className="theme-interview-flow-form__preview-scroll"
                      tabIndex={-1}
                    >
                      <div className="theme-interview-flow-form__preview-scale">
                        <TestForm
                          key={formMountKey}
                          ref={formRef}
                          embed
                          className="theme-interview-flow-form__test-form"
                          initialDocument={state.document}
                          initialMode="take"
                          onDocumentChange={handleDocumentChange}
                        />
                      </div>
                    </ThemeScroll>
                  )}
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
              <Tooltip
                content={state.isGate ? 'Pass gate on — click to turn off' : 'Pass gate off — click to turn on'}
                placement="left"
              >
                <IconButton
                  icon={state.isGate ? Shield : ShieldOff}
                  size="sm"
                  variant="ghost"
                  active={state.isGate}
                  aria-label={state.isGate ? 'Disable pass gate' : 'Enable pass gate'}
                  onClick={() => patchMeta({ isGate: !state.isGate })}
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
                        ? state.limitMinutes ?? state.estimatedMinutes ?? 5
                        : null,
                    })
                  }
                />
              </Tooltip>
              <Tooltip
                content="On fail — if this section’s When is false at entry"
                placement="left"
              >
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
                  sectionLabel="form"
                  onRemove={onRemove}
                  onMove={onMove}
                  onDuplicate={onDuplicate}
                />
              ) : null}
            </>
          ) : (
            <InterviewFlowSpineRailActions
              sectionLabel="form"
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
