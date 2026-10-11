import {
  GitBranch,
  Maximize2,
  Redo2,
  Timer,
  TimerOff,
  Undo2,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useAnimatedFoldMount } from '../hooks/useAnimatedFoldMount'
import { CREATOR2_FAIL_OPTIONS } from '../lib/interviewBrief/creator2OnFail'
import {
  CODING_CASES_PATH,
  ensureSolveFilesForLanguages,
  resolveCodingTestsFromWorkspace,
} from '../lib/interviewBrief/codingWorkspaceFiles'
import { buildCodeRunRequest } from '../lib/interviewBrief/buildCodeRunRequest'
import {
  CODING_LANGUAGE_OPTIONS,
  filterSupportedCodingLanguages,
  resolveCodingDefaultLanguage,
  resolveCodingLanguageForFile,
} from '../lib/interviewBrief/codingLanguages'
import { runInterviewCode } from '../lib/interviewRunApi/codeRunEdgeClient'
import {
  composeCodeRunTerminal,
  type CodeTerminalItem,
  codeRunFailureLine,
  terminalItemsToPlainLines,
} from '../lib/interviewRunApi/formatCodeRunTerminal'
import type {
  InterviewFlowCodingEditorState,
  InterviewFlowFormOnFail,
} from '../lib/interviewBrief/flowTimelineTypes'
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
import type { CodeEditorPayload } from '../lib/editorContext/types'
import { scrollSectionHistoryFocus } from '../lib/interviewBrief/sectionHistoryFocus'
import { useSoftAdoptEditorPayload, useToolSectionHistory } from '../hooks/useToolSectionHistory'
import { CodeEditor, type CodeEditorHandle } from './CodeEditor'
import { IconButton } from './IconButton'
import { InterviewFlowSectionToolbar } from './InterviewFlowSectionToolbar'
import { InterviewFlowSpineRailActions } from './InterviewFlowSpineRailActions'
import { MenuButton } from './MenuButton'
import { Switch } from './Switch'
import { ToggleGroup } from './ToggleGroup'
import { Tooltip } from './Tooltip'
import { VurifyCountInput } from './VurifyCountInput'
import { VurifyInput } from './VurifyInput'
import { VurifySelect } from './VurifySelect'
import { InterviewFlowLockedAnalysisChips } from './InterviewFlowLockedAnalysisChips'
import { InterviewFlowReferencesSelect } from './InterviewFlowReferencesSelect'

type PhaseOption = { id: string; title: string; kind?: string }

type InterviewFlowCodingEditorProps = {
  state: InterviewFlowCodingEditorState
  expanded: boolean
  onToggle: () => void
  onChange: (next: InterviewFlowCodingEditorState) => void
  phaseOptions?: readonly PhaseOption[]
  /** Earlier phases only — reference dropdown. */
  whenPhaseOptions?: readonly PhaseOption[]
  onRemove?: () => void
  onMove?: (direction: 'up' | 'down') => void
  onDuplicate?: () => void
  /**
   * Timeline focus hid this section (`display: none`). Unmount Monaco — keeping it
   * alive under a hidden host throws InstantiationService / domNode errors.
   */
  dormant?: boolean
  className?: string
}

const FAIL_OPTIONS = CREATOR2_FAIL_OPTIONS

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

function withTestsFromWorkspace(
  prev: InterviewFlowCodingEditorState,
  workspace: CodeEditorPayload,
): InterviewFlowCodingEditorState {
  const tests = resolveCodingTestsFromWorkspace(workspace, {
    runner: prev.tests.runner,
    entryPoint: prev.tests.entryPoint,
    cases: prev.tests.cases,
    referenceSolution: prev.tests.referenceSolution ?? null,
  })
  return {
    ...prev,
    workspace,
    tests: {
      runner: tests.runner,
      entryPoint: tests.entryPoint,
      cases: tests.cases,
      referenceSolution: tests.referenceSolution,
    },
  }
}

export function InterviewFlowCodingEditor({
  state,
  expanded,
  onToggle,
  onChange,
  phaseOptions = [],
  whenPhaseOptions = [],
  onRemove,
  onMove,
  onDuplicate,
  dormant = false,
  className = '',
}: InterviewFlowCodingEditorProps) {
  const panelId = useId()
  const previewPanelId = useId()
  const guideTitleId = useId()
  const codeRef = useRef<CodeEditorHandle>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [previewOpen, setPreviewOpen] = useState(true)
  const showPreview = !expanded && previewOpen
  /** Keep Monaco through the fold transition; unmount when fully closed / dormant. */
  const workspaceFold = useAnimatedFoldMount(!dormant && (expanded || showPreview))
  const scrollToFocus = (focus?: string | null) => {
    if (!focus) return
    if (focus === 'workspace' || focus.startsWith('workspace.') || focus.startsWith('tests')) {
      return
    }
    scrollSectionHistoryFocus(sectionRef.current, focus)
  }
  const { commit, sync, undo, redo, canUndo, canRedo } = useToolSectionHistory(
    state,
    onChange,
    state.toolRef,
    scrollToFocus,
    { editorKeys: ['workspace', 'tests'] },
  )
  const stateRef = useRef(state)
  stateRef.current = state
  const workspaceFp = JSON.stringify(state.workspace)
  const { skipOutboundRef, markLocal } = useSoftAdoptEditorPayload(workspaceFp, () => {
    codeRef.current?.loadContext(stateRef.current.workspace)
  })

  const publish = (
    partial: Partial<InterviewFlowCodingEditorState> = {},
    focusHint?: string | null,
  ) => {
    const fromEditor = codeRef.current?.getContext() as CodeEditorPayload | undefined
    const workspace = partial.workspace ?? fromEditor ?? stateRef.current.workspace
    let next: InterviewFlowCodingEditorState = {
      ...stateRef.current,
      ...partial,
      workspace,
      assist: resolveToolAssistCaps(partial.assist ?? stateRef.current.assist),
    }
    if (partial.sectionTitle != null) {
      next = {
        ...next,
        workspace: {
          ...next.workspace,
          title: partial.sectionTitle.trim() || next.workspace.title,
        },
      }
    }
    if (partial.languages != null || partial.defaultLanguage !== undefined) {
      const languages = filterSupportedCodingLanguages(next.languages)
      const defaultLanguage = resolveCodingDefaultLanguage(languages, next.defaultLanguage)
      const workspace = ensureSolveFilesForLanguages(next.workspace, languages, {
        entryPoint: next.tests.entryPoint,
        activateDefault: true,
        defaultLanguage,
      })
      next = {
        ...next,
        languages,
        defaultLanguage,
        workspace,
      }
    }
    next = withTestsFromWorkspace(next, next.workspace)
    commit(next, focusHint)
  }

  useEffect(() => {
    if (!expanded) return
    const id = window.setInterval(() => {
      if (skipOutboundRef.current) return
      const ctx = codeRef.current?.getContext() as CodeEditorPayload | undefined
      if (!ctx) return
      const current = stateRef.current
      if (JSON.stringify(ctx) === JSON.stringify(current.workspace)) return
      markLocal(JSON.stringify(ctx))
      sync(withTestsFromWorkspace(current, ctx))
    }, 600)
    return () => window.clearInterval(id)
  }, [expanded, sync])

  const handleToggle = () => {
    if (expanded) publish()
    onToggle()
  }

  const patchMeta = (
    partial: Partial<InterviewFlowCodingEditorState>,
    focusHint?: string | null,
  ) => {
    const key = Object.keys(partial)[0]
    publish(partial, focusHint ?? key ?? null)
  }

  const jumpOptions = phaseOptions
    .filter((p) => p.id)
    .map((p) => ({ value: p.id, label: p.title }))

  const assist = resolveToolAssistCaps(state.assist)
  const assistBundle = matchToolAssistBundle(assist)
  const assistCaps = toolAssistCapRows('coding')
  const assistHint =
    assistBundle === 'custom'
      ? 'Mix chat, answers, and write caps'
      : (TOOL_ASSIST_BUNDLES.find((b) => b.id === assistBundle)?.summary ??
        'No candidate chat or editor help')
  const languages = filterSupportedCodingLanguages(state.languages)
  const defaultLanguage = resolveCodingDefaultLanguage(languages, state.defaultLanguage)
  const codingMountKey = expanded
    ? `${state.toolRef}:edit`
    : `${state.toolRef}:${JSON.stringify(state.workspace)}`
  const languageOptions = CODING_LANGUAGE_OPTIONS.map((opt) => ({
    value: opt.id,
    label: opt.label,
    description: opt.tag,
  }))

  const handleCreatorRun = async (api: {
    appendTerminal: (lines: string[] | CodeTerminalItem[]) => void
    getPayload: () => CodeEditorPayload
    activeLanguage?: string | null
  }) => {
    const workspace = api.getPayload()
    const current = withTestsFromWorkspace(stateRef.current, workspace)
    const activePath =
      typeof workspace.activeId === 'string'
        ? workspace.files?.find((f) => f.path === workspace.activeId)?.path ||
          workspace.files?.find((f) => (f as { id?: string }).id === workspace.activeId)
            ?.path ||
          workspace.activeId
        : null
    const activeFilePath =
      (activePath && workspace.files?.some((f) => f.path === activePath)
        ? activePath
        : workspace.files?.find((f) => f.path.startsWith('src/solve.'))?.path) || null
    const runLangs = languages.length
      ? languages
      : filterSupportedCodingLanguages(current.languages)
    const runDefault =
      defaultLanguage ||
      resolveCodingDefaultLanguage(runLangs, current.defaultLanguage)
    const activeLanguage =
      api.activeLanguage ||
      (activeFilePath &&
        resolveCodingLanguageForFile(
          activeFilePath,
          workspace.files?.find((f) => f.path === activeFilePath)?.language ?? '',
          runLangs.length ? runLangs : CODING_LANGUAGE_OPTIONS.map((o) => o.id),
        )) ||
      runDefault
    const built = buildCodeRunRequest({
      workspace,
      languages: runLangs,
      defaultLanguage: runDefault,
      activeLanguage,
      activeFilePath,
      tests: current.tests,
    })
    if (!built.ok) {
      api.appendTerminal([built.detail])
      return
    }
    try {
      const result = await runInterviewCode({ body: built.body })
      const sourceLineCount = built.body.source.replace(/\r\n/g, '\n').split('\n').length
      const items = composeCodeRunTerminal(result, {
        sourcePath: built.body.sourcePath,
        sourceLineCount,
        language: built.body.language,
        entryPoint: built.body.entryPoint,
        ranAt: new Date(),
      })
      api.appendTerminal(items.length ? items : terminalItemsToPlainLines(items))
    } catch (err) {
      api.appendTerminal([codeRunFailureLine(err)])
    }
  }

  return (
    <div
      ref={sectionRef}
      className={[
        'theme-interview-flow-form',
        'theme-interview-flow-coding',
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
                  hint="Time limit while the candidate works on this challenge"
                  historyFocus="timed"
                >
                  <Switch
                    checked={state.timed}
                    onChange={(checked) =>
                      patchMeta({
                        timed: checked,
                        limitMinutes: checked
                          ? state.limitMinutes ?? state.estimatedMinutes ?? 20
                          : null,
                      })
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
                      value={String(state.limitMinutes ?? state.estimatedMinutes ?? 20)}
                      onValueChange={(value) => {
                        const n = Number.parseInt(value, 10)
                        patchMeta({
                          timed: true,
                          limitMinutes: Number.isFinite(n) ? n : 20,
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
                  label="Language"
                  hint="Sets the language shown in the editor. Other-language src files stay in the workspace."
                  historyFocus="languages"
                >
                  <VurifySelect
                    label="Language"
                    variant="dropdown"
                    scrollRail="hidden"
                    options={languageOptions}
                    value={defaultLanguage ?? languages[0] ?? ''}
                    onChange={(value) => {
                      if (!value) return
                      const nextLangs = filterSupportedCodingLanguages([
                        ...(state.languages ?? []),
                        value,
                      ])
                      patchMeta({
                        languages: nextLangs.length ? nextLangs : [value],
                        defaultLanguage: value,
                      })
                    }}
                    placeholder="Choose…"
                  />
                </SettingsRow>
                <SettingsRow
                  label="Candidate notes"
                  hint="Short coaching blurb — problem detail lives in README.md"
                  historyFocus="instructions"
                >
                  <VurifyInput
                    label="Candidate notes"
                    variant="area"
                    rows={2}
                    value={state.instructions}
                    onChange={(e) => patchMeta({ instructions: e.target.value })}
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
                Coding challenge
              </h4>
              <div className="theme-interview-flow-form__guide-rule" role="presentation" />
              <p className="theme-interview-flow-form__guide-lead type-body-sm type-muted mb-0">
                Workspace files feed the runner: <code className="type-code">README.md</code>,
                starters, <code className="type-code">{CODING_CASES_PATH}</code>{' '}
                (<code className="type-code">entryPoint(...args)</code> →{' '}
                <code className="type-code">expected</code>), and{' '}
                <code className="type-code">tests/reference.ts</code>. Cases are language-agnostic
                — allowed languages appear as section tags above.
              </p>
            </div>
          ) : null}

          <div
            id={previewPanelId}
            className={[
              'theme-interview-flow-section__fold',
              'theme-interview-flow-section__fold--preview',
              'theme-interview-flow-form__preview-fold',
              workspaceFold.shown ? 'is-open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={!workspaceFold.shown ? true : undefined}
          >
            <div className="theme-interview-flow-section__fold-inner">
              {workspaceFold.mounted ? (
                <div
                  className={[
                    'theme-interview-flow-form__preview',
                    'theme-interview-flow-form__preview--lite',
                    'theme-interview-flow-form__preview--code-editor',
                    expanded ? 'is-edit' : 'is-mini',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={expanded ? 'Code editor' : 'Code workspace preview'}
                >
                  <CodeEditor
                    key={codingMountKey}
                    ref={codeRef}
                    embed
                    chrome="section"
                    allowedLanguages={languages}
                    initialPayload={state.workspace}
                    onRun={handleCreatorRun}
                    onPayloadChange={(workspace) => {
                      if (skipOutboundRef.current) return
                      if (JSON.stringify(workspace) === JSON.stringify(state.workspace)) return
                      markLocal(JSON.stringify(workspace))
                      sync(withTestsFromWorkspace(stateRef.current, workspace))
                    }}
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
                        ? state.limitMinutes ?? state.estimatedMinutes ?? 20
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
                  sectionLabel="coding"
                  onRemove={onRemove}
                  onMove={onMove}
                  onDuplicate={onDuplicate}
                />
              ) : null}
            </>
          ) : (
            <InterviewFlowSpineRailActions
              sectionLabel="coding"
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
