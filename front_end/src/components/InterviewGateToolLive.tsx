import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import {
  ArrowDown,
  Lightbulb,
  ListChecks,
  ListOrdered,
  MessageCircle,
  MessageCircleOff,
  Sparkles,
  TextCursorInput,
  type LucideIcon,
} from 'lucide-react'
import { Chip } from './Chip'
import { TestForm, type TestFormHandle } from './TestForm'
import { CodeEditor, type CodeEditorHandle } from './CodeEditor'
import { DocEditor, type DocEditorHandle } from './DocEditor'
import { VurifyIcon } from './VurifyIcon'
import { VurifyMenuButton } from './VurifyMenuButton'
import type { CodeEditorPayload, DocEditorPayload } from '../lib/editorContext/types'
import { buildCodeRunRequest } from '../lib/interviewBrief/buildCodeRunRequest'
import {
  CODING_LANGUAGE_OPTIONS,
  codingLanguageDisplayLabel,
  codingSolvePath,
  resolveCodingLanguageForFile,
} from '../lib/interviewBrief/codingLanguages'
import { listWorkingSrcFiles, resolveCoverHopPath, rewriteCoverPaths } from '../lib/interviewBrief/codingWorkspaceFiles'
import { runInterviewCode } from '../lib/interviewRunApi/codeRunEdgeClient'
import type { CodeRunResult } from '../lib/interviewRunApi/codeRunEdgeClient'
import { hashCodingSource } from '../lib/interviewRunApi/buildToolAssessBody'
import {
  composeCodeRunTerminal,
  codeRunFailureLine,
  terminalItemsToPlainLines,
  type CodeTerminalItem,
} from '../lib/interviewRunApi/formatCodeRunTerminal'
import {
  formatCompactJson,
  type GateToolMount,
} from '../lib/interviewRunApi/resolveGateToolMount'
import { MarkdownPreview } from '../lib/markdownRenderer/renderMarkdown'
import {
  applyLiveEditorAssist,
  applyCopilotPendingOps,
  type LiveEditorApply,
  type LiveEditorApplyResult,
} from '../lib/interviewRunApi/applyLiveEditorAssist'
import { revealEssayRange } from '../lib/docEditor/revealEssayRange'
import { applyCopilotOps, rewriteCopilotOpPaths, type CopilotLiveDoc, type CopilotOp } from '../lib/interviewRunApi/copilotApply'
import {
  codingDiffIsNoop,
  codingFileText,
  codingPathsFromOps,
  docMarkdownOf,
  firstOpPath,
  locusFromOps,
  opsForPath,
  summaryFromOps,
} from '../lib/interviewRunApi/copilotEditMemory'
import {
  actionableCopilotSteps,
  anyKept,
  copilotSheetRows,
  createCopilotStepQueue,
  discardAllCopilotSteps,
  discardCopilotStep,
  keepAllCopilotSteps,
  keepCopilotStep,
  mergeCopilotStepsByFile,
  pendingCopilotCount,
  stepById,
  unlockedPendingIds,
  type CopilotQueueStep,
} from '../lib/interviewRunApi/copilotStepQueue'
import type { CandidateAssistChrome } from '../lib/interviewBrief/candidateAssistChrome'
import type { TestFormDocument } from '../lib/testForm/types'
import { bindTelemetryHost } from '../lib/interviewRunApi/sessionTelemetry'

export type GateLiveCompositionEvent =
  | { kind: 'form'; document: TestFormDocument }
  | { kind: 'coding'; payload: CodeEditorPayload }
  | { kind: 'doc'; payload: DocEditorPayload }

/** Prep-style chrome for writing / coding live (mirrors InterviewGateScene prep). */
export type GateLiveChrome = {
  stageLabel: string
  title: string
  description: string
  timeLabel: string
  timed: boolean
  assistChrome?: CandidateAssistChrome | null
}

export type ProposeEditResult = {
  status: 'accepted' | 'rejected' | 'applied' | 'miss' | 'replaced'
  reason?: string
  locus?: string
  summary?: string
}

export type GateLiveEditorHandle = {
  apply: (patch: LiveEditorApply) => Promise<LiveEditorApplyResult>
  applyOps?: (ops: CopilotOp[], generation?: number) => Promise<LiveEditorApplyResult>
  proposeEdit?: (
    ops: CopilotOp[],
    generation?: number,
    steps?: unknown[],
  ) => Promise<ProposeEditResult>
  getContext?: () => unknown
  revealQuestion?: (questionId: string) => void
  revealFileRange?: (path: string, startLine?: number, endLine?: number) => void
  revealEssayRange?: (startLine?: number, endLine?: number, search?: string) => void
  revealTerminal?: (item?: { path?: string; line?: number }) => void
  settlePendingEdit?: (path: string, accept: boolean) => void
  settlePendingKeepAll?: () => void
  settlePendingDiscardAll?: () => void
  focusPendingEdit?: (path: string) => boolean
}

/** @deprecated Prefer GateLiveChrome — kept for existing imports. */
export type WritingGateChrome = GateLiveChrome

type InterviewGateToolLiveProps = {
  mount: GateToolMount
  /** Gate prep copy — used for writing / coding brief layout. */
  liveChrome?: GateLiveChrome | null
  /** @deprecated Prefer `liveChrome`. */
  writingChrome?: GateLiveChrome | null
  liveRef?: RefObject<HTMLDivElement | null>
  /** Copilot apply into the live workbench (not GSAP host). */
  editorHandleRef?: RefObject<GateLiveEditorHandle | null>
  /** Page ThemeScroll viewport — editor fit + scroll-to-editor. */
  scrollViewportRef?: RefObject<HTMLElement | null>
  /** Lift live editor state for stage-assist context (sanitized upstream). */
  onLiveCompositionChange?: (event: GateLiveCompositionEvent) => void
  /** Copilot pending Keep/Discard rows in the Assist peel. */
  onPendingEditsChange?: (files: readonly { path: string; id?: string; label?: string; locked?: boolean }[]) => void
  /** Candidate visible-case Run result — used for assess-time hidden-only merge. */
  onVisibleCodeRun?: (input: {
    sourceHash: string
    result: CodeRunResult
  }) => void
  /** Fixture demo brief id — anon guest Edge when unsigned. */
  briefId?: string | null
}

const EDITOR_MIN_PX = 18 * 16
const EDITOR_BOTTOM_PAD_PX = 12

function resolveScrollViewport(
  shell: HTMLElement,
  scrollViewportRef?: RefObject<HTMLElement | null>,
): HTMLElement | null {
  return (
    scrollViewportRef?.current ??
    (shell.closest('.theme-scroll__viewport') as HTMLElement | null)
  )
}

function chromeClearancePx(host: HTMLElement): number {
  const raw = getComputedStyle(host).getPropertyValue('--interview-writing-chrome-h').trim()
    || getComputedStyle(host).getPropertyValue('--interview-coding-chrome-h').trim()
    || getComputedStyle(host).getPropertyValue('--interview-chrome-h').trim()
  if (raw.endsWith('rem')) {
    const n = Number.parseFloat(raw)
    if (Number.isFinite(n)) return n * 16
  }
  if (raw.endsWith('px')) {
    const n = Number.parseFloat(raw)
    if (Number.isFinite(n)) return n
  }
  return 3.75 * 16
}

function StickyScrollToEditor({
  onScrollToEditor,
  editorRef,
  hostRef,
  scrollViewportRef,
}: {
  onScrollToEditor: () => void
  editorRef: RefObject<HTMLDivElement | null>
  hostRef: RefObject<HTMLDivElement | null>
  scrollViewportRef?: RefObject<HTMLElement | null>
}) {
  const [away, setAway] = useState(false)
  const railRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const viewport = resolveScrollViewport(editor, scrollViewportRef)
    if (!viewport) return

    const sync = () => {
      const vp = viewport.getBoundingClientRect()
      const host = hostRef.current ?? editor
      const stickyTop = vp.top + chromeClearancePx(host) + 2
      const railH = railRef.current?.offsetHeight ?? 32
      const header =
        editor.querySelector('.theme-interview-gate-live__editor-label') ?? editor
      setAway(header.getBoundingClientRect().top <= stickyTop + railH + 4)
    }

    sync()
    viewport.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    const ro = new ResizeObserver(sync)
    ro.observe(viewport)
    ro.observe(editor)
    return () => {
      viewport.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      ro.disconnect()
    }
  }, [editorRef, hostRef, scrollViewportRef])

  return (
    <div
      ref={railRef}
      className={[
        'theme-interview-gate-live__actions',
        'theme-interview-gate-live__actions--sticky',
        away ? 'is-away' : 'is-present',
      ].join(' ')}
      aria-hidden={away ? true : undefined}
    >
      <VurifyMenuButton
        type="button"
        size="sm"
        variant="label"
        lineTone="accent"
        icon={ArrowDown}
        iconPosition="left"
        tabIndex={away ? -1 : undefined}
        onClick={onScrollToEditor}
      >
        To editor
      </VurifyMenuButton>
    </div>
  )
}

const ASSIST_NOTICE_ICONS: Record<CandidateAssistChrome['bundleId'], LucideIcon> = {
  none: MessageCircleOff,
  assistant: MessageCircle,
  coach: Lightbulb,
  copilot: Sparkles,
  custom: MessageCircle,
}

function AssistInGateNotice({
  chrome,
  lead = false,
}: {
  chrome: CandidateAssistChrome
  /** First block under a header (Form) — skip the extra top hairline. */
  lead?: boolean
}) {
  const Icon = ASSIST_NOTICE_ICONS[chrome.bundleId] ?? MessageCircle
  return (
    <section
      className={[
        'theme-interview-gate__preamble',
        'theme-interview-gate__assist-notice',
        lead ? 'theme-interview-gate__assist-notice--lead' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="interview-assist-notice-heading"
      data-lead={lead ? 'true' : 'false'}
      data-assist-bundle={chrome.bundleId}
    >
      <div className="theme-interview-gate__assist-notice-row">
        <span className="theme-interview-landing__summary-mark" aria-hidden>
          <VurifyIcon icon={Icon} variant="plain" tone="muted" size="sm" />
        </span>
        <div className="theme-interview-gate__assist-notice-copy">
          <h3
            id="interview-assist-notice-heading"
            className="type-label mb-0 theme-interview-landing__structure-label"
          >
            {chrome.label}
          </h3>
          <p className="type-body-sm mb-0 theme-interview-gate__assist-notice-body">
            {chrome.candidateNotice}
          </p>
        </div>
      </div>
    </section>
  )
}

function WritingBrief({
  mount,
  chrome,
}: {
  mount: Extract<GateToolMount, { kind: 'doc' }>
  chrome?: GateLiveChrome | null
}) {
  const title = chrome?.title?.trim() || mount.title
  const stageLabel = chrome?.stageLabel?.trim() || 'Writing'
  const timeLabel = chrome?.timeLabel?.trim() || ''
  const timed = Boolean(chrome?.timed)
  const brief =
    mount.prompt.brief.trim() ||
    mount.instructions.trim() ||
    chrome?.description?.trim() ||
    ''
  const structure = mount.prompt.structure
  const requirements = mount.prompt.requirements
  const wordBits = [
    mount.minWords != null ? `Min ${mount.minWords} words` : null,
    mount.maxWords != null ? `Max ${mount.maxWords} words` : null,
  ].filter(Boolean) as string[]

  return (
    <article
      className="theme-interview-gate theme-interview-gate--writing-brief"
      aria-label="Writing prompt"
      data-dash-anim
      data-sitting-copy-ok=""
      data-copy-surface="brief"
    >
      <p className="type-label mb-0 theme-interview-gate__stage">
        {stageLabel}
        {timeLabel ? ` · ${timeLabel}` : ''}
        {timed ? ' · Timed' : ''}
      </p>
      <h2
        className="type-display-md mb-0 theme-interview-gate__title"
        data-interview-gate-title
        data-interview-gate-title-text={title}
      >
        {title}
      </h2>
      {brief ? (
        <p className="type-body mb-0 theme-interview-gate__description">{brief}</p>
      ) : null}

      {structure.length > 0 || requirements.length > 0 || wordBits.length > 0 ? (
        <div className="theme-interview-gate__prep-extras">
          {structure.length > 0 ? (
            <section
              className="theme-interview-gate__preamble"
              aria-labelledby="interview-writing-structure-heading"
            >
              <h3
                id="interview-writing-structure-heading"
                className="type-label mb-0 theme-interview-landing__structure-label"
              >
                Cover
              </h3>
              <ul
                className="theme-interview-landing__summary-list theme-interview-gate__preamble-list"
                aria-label="Expected structure"
              >
                {structure.map((row) => (
                  <li key={row.id} className="theme-interview-landing__summary-item">
                    <div className="theme-interview-landing__summary-row">
                      <span className="theme-interview-landing__summary-mark" aria-hidden>
                        <VurifyIcon icon={ListOrdered} variant="plain" tone="muted" size="sm" />
                      </span>
                      <p className="type-body-sm mb-0 theme-interview-landing__summary-label">
                        {row.label}
                        {row.hint?.trim() ? (
                          <span className="theme-interview-gate-live__brief-hint">
                            {'. '}
                            {row.hint.trim()}
                          </span>
                        ) : null}
                      </p>
                      <span className="theme-interview-landing__summary-time" aria-hidden />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {requirements.length > 0 ? (
            <section
              className="theme-interview-gate__preamble"
              aria-labelledby="interview-writing-requirements-heading"
            >
              <h3
                id="interview-writing-requirements-heading"
                className="type-label mb-0 theme-interview-landing__structure-label"
              >
                Requirements
              </h3>
              <ul
                className="theme-interview-landing__summary-list theme-interview-gate__preamble-list"
                aria-label="Requirements"
              >
                {requirements.map((req) => (
                  <li key={req} className="theme-interview-landing__summary-item">
                    <div className="theme-interview-landing__summary-row">
                      <span className="theme-interview-landing__summary-mark" aria-hidden>
                        <VurifyIcon icon={ListChecks} variant="plain" tone="muted" size="sm" />
                      </span>
                      <p className="type-body-sm mb-0 theme-interview-landing__summary-label">{req}</p>
                      <span className="theme-interview-landing__summary-time" aria-hidden />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {wordBits.length > 0 ? (
            <section
              className="theme-interview-gate__preamble"
              aria-labelledby="interview-writing-limits-heading"
            >
              <h3
                id="interview-writing-limits-heading"
                className="type-label mb-0 theme-interview-landing__structure-label"
              >
                Length
              </h3>
              <ul
                className="theme-interview-landing__summary-list theme-interview-gate__preamble-list"
                aria-label="Word limits"
              >
                <li className="theme-interview-landing__summary-item">
                  <div className="theme-interview-landing__summary-row">
                    <span className="theme-interview-landing__summary-mark" aria-hidden>
                      <VurifyIcon icon={TextCursorInput} variant="plain" tone="muted" size="sm" />
                    </span>
                    <p className="type-body-sm mb-0 theme-interview-landing__summary-label">
                      {wordBits.join(' · ')}
                    </p>
                    <span className="theme-interview-landing__summary-time" aria-hidden />
                  </div>
                </li>
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
      {chrome?.assistChrome ? <AssistInGateNotice chrome={chrome.assistChrome} /> : null}
    </article>
  )
}

const CODING_HOWTO_STEPS = [
  {
    id: 'file',
    label: 'Open your solve file',
    hint: 'In the editor tree, open src/solve.* for the language you want.',
  },
  {
    id: 'file-project',
    label: 'Open the file a sample names, or start at the Entry file',
    hint: 'Use the Files chips or a visible case to jump. Helpers and the entry file all count.',
  },
  {
    id: 'implement',
    label: 'Implement the entry point',
    hint: 'Fill in the function the exercise names (usually solve).',
  },
  {
    id: 'run',
    label: 'Press Run',
    hint: 'Check visible cases in the terminal, then refine.',
  },
] as const

function fileLabel(path: string): string {
  return path.split('/').pop() || path
}

function CodingBrief({
  mount,
  chrome,
  workspace,
  onOpenPath,
}: {
  mount: Extract<GateToolMount, { kind: 'coding' }>
  chrome?: GateLiveChrome | null
  workspace: CodeEditorPayload
  onOpenPath: (path: string) => void
}) {
  const title = chrome?.title?.trim() || mount.title
  const stageLabel = chrome?.stageLabel?.trim() || 'Coding'
  const timeLabel = chrome?.timeLabel?.trim() || ''
  const timed = Boolean(chrome?.timed)
  const languages = mount.languages.map((l) => l.trim()).filter(Boolean)
  const exerciseMd = mount.readmeMarkdown.trim() || mount.briefMarkdown.trim()
  const cases = mount.visibleSampleCases
  const activePath =
    typeof workspace.activeId === 'string'
      ? workspace.files?.find((f) => f.path === workspace.activeId)?.path || workspace.activeId
      : null
  const activeLanguage =
    (activePath &&
      resolveCodingLanguageForFile(
        activePath,
        workspace.files?.find((f) => f.path === activePath)?.language ?? '',
        languages.length ? languages : CODING_LANGUAGE_OPTIONS.map((o) => o.id),
      )) ||
    languages[0] ||
    'typescript'
  const workingFiles = listWorkingSrcFiles(workspace, activeLanguage)
  const showFiles = workingFiles.length > 0
  const entryPath = codingSolvePath(activeLanguage) || workingFiles[0] || null
  const coverPaths = [
    ...new Set(cases.flatMap((c) => rewriteCoverPaths(c.covers, activeLanguage))),
  ]
  const showCoverFilter = coverPaths.length > 0
  const openHop = (covers?: readonly string[]) => {
    const path = resolveCoverHopPath(covers, activeLanguage, workspace) || entryPath
    if (path) onOpenPath(path)
  }
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [coverFilter, setCoverFilter] = useState<string | null>(null)
  const visibleCases = coverFilter
    ? cases.filter((c) => rewriteCoverPaths(c.covers, activeLanguage).includes(coverFilter))
    : cases
  const howTo = [
    showFiles ? CODING_HOWTO_STEPS[1] : CODING_HOWTO_STEPS[0],
    CODING_HOWTO_STEPS[2],
    CODING_HOWTO_STEPS[3],
    ...(mount.hasHiddenTests
      ? [
          {
            id: 'hidden',
            label: 'Hidden cases score later',
            hint: 'Run checks the visible samples; hidden cases are for marking after you submit.',
          },
        ]
      : []),
  ]

  return (
    <article
      className="theme-interview-gate theme-interview-gate--writing-brief theme-interview-gate--coding-brief"
      aria-label="Coding challenge"
      data-dash-anim
      data-sitting-copy-ok=""
      data-copy-surface="brief"
    >
      <p className="type-label mb-0 theme-interview-gate__stage">
        {stageLabel}
        {timeLabel ? ` · ${timeLabel}` : ''}
        {timed ? ' · Timed' : ''}
      </p>
      <h2
        className="type-display-md mb-0 theme-interview-gate__title"
        data-interview-gate-title
        data-interview-gate-title-text={title}
      >
        {title}
      </h2>

      {languages.length > 0 ? (
        <div
          className="theme-chip-group theme-interview-gate-live__lang-tags"
          role="list"
          aria-label="Allowed languages"
        >
          {languages.map((lang) => (
            <Chip key={lang} size="sm" selected className="theme-interview-gate-live__lang-tag">
              {codingLanguageDisplayLabel(lang)}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="theme-interview-gate__prep-extras">
        {exerciseMd ? (
          <section
            className="theme-interview-gate__preamble theme-interview-gate-live__readme-block"
            aria-labelledby="interview-coding-exercise-heading"
          >
            <h3
              id="interview-coding-exercise-heading"
              className="type-label mb-0 theme-interview-landing__structure-label"
            >
              Exercise
            </h3>
            <MarkdownPreview
              source={exerciseMd}
              density="chat"
              className="theme-interview-gate-live__readme"
            />
          </section>
        ) : null}

        {showFiles ? (
          <section
            className="theme-interview-gate__preamble"
            aria-labelledby="interview-coding-files-heading"
          >
            <h3
              id="interview-coding-files-heading"
              className="type-label mb-0 theme-interview-landing__structure-label"
            >
              Files
            </h3>
            <div className="theme-chip-group theme-interview-gate-live__file-tags" role="list">
              {workingFiles.map((path) => (
                <Chip
                  key={path}
                  size="sm"
                  selected={activePath === path}
                  onClick={() => onOpenPath(path)}
                  className="theme-interview-gate-live__file-tag"
                >
                  {fileLabel(path)}
                  {path === entryPath ? ' · Entry' : ''}
                </Chip>
              ))}
            </div>
          </section>
        ) : null}

        {cases.length > 0 ? (
          <section
            className="theme-interview-gate__preamble theme-interview-gate-live__cases"
            aria-labelledby="interview-coding-cases-heading"
          >
            <h3
              id="interview-coding-cases-heading"
              className="type-label mb-0 theme-interview-landing__structure-label"
            >
              Visible test cases
            </h3>
            {showCoverFilter ? (
              <div className="theme-chip-group theme-interview-gate-live__cover-tags" role="list">
                <Chip
                  size="sm"
                  selected={!coverFilter}
                  onClick={() => setCoverFilter(null)}
                >
                  All
                </Chip>
                {coverPaths.map((path) => (
                  <Chip
                    key={path}
                    size="sm"
                    selected={coverFilter === path}
                    onClick={() => {
                      setCoverFilter(path)
                      openHop([path])
                    }}
                  >
                    {fileLabel(path)}
                  </Chip>
                ))}
              </div>
            ) : null}
            <ul className="theme-interview-gate-live__case-list">
              {visibleCases.map((c) => {
                const name = c.name.trim() || c.id || 'Sample'
                const desc = c.description?.trim()
                const hops = rewriteCoverPaths(c.covers, activeLanguage)
                const selected = selectedCaseId === c.id
                return (
                  <li key={c.id}>
                    <div
                      className={[
                        'theme-interview-gate-live__case',
                        selected ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      role="group"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedCaseId(c.id)
                        openHop(c.covers)
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return
                        e.preventDefault()
                        setSelectedCaseId(c.id)
                        openHop(c.covers)
                      }}
                    >
                    <div className="theme-interview-gate-live__case-head">
                      <p className="type-label mb-0 theme-interview-gate-live__case-name">{name}</p>
                      {desc ? (
                        <p className="type-caption mb-0 theme-interview-gate-live__case-desc">{desc}</p>
                      ) : null}
                      {hops.length > 0 ? (
                        <div
                          className="theme-chip-group theme-interview-gate-live__case-covers"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {hops.map((path) => (
                            <Chip
                              key={path}
                              size="sm"
                              onClick={() => {
                                setSelectedCaseId(c.id)
                                openHop([path])
                              }}
                            >
                              {fileLabel(path)}
                            </Chip>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="theme-interview-gate-live__case-pair">
                      <div className="theme-interview-gate-live__case-cell">
                        <p className="type-caption mb-0 theme-interview-gate-live__case-kicker">
                          Input
                        </p>
                        <pre className="theme-interview-gate-live__case-pre">
                          <code>{formatCompactJson(c.args ?? [])}</code>
                        </pre>
                      </div>
                      <div className="theme-interview-gate-live__case-cell">
                        <p className="type-caption mb-0 theme-interview-gate-live__case-kicker">
                          Expected
                        </p>
                        <pre className="theme-interview-gate-live__case-pre">
                          <code>{formatCompactJson(c.expected ?? null)}</code>
                        </pre>
                      </div>
                    </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        <section
          className="theme-interview-gate__preamble"
          aria-labelledby="interview-coding-howto-heading"
        >
          <h3
            id="interview-coding-howto-heading"
            className="type-label mb-0 theme-interview-landing__structure-label"
          >
            How to solve
          </h3>
          <ol
            className="theme-interview-landing__summary-list theme-interview-gate__preamble-list theme-interview-gate-live__howto-list"
            aria-label="How to use the coding editor"
          >
            {howTo.map((row, index) => (
              <li key={row.id} className="theme-interview-landing__summary-item">
                <div className="theme-interview-landing__summary-row">
                  <span className="theme-interview-landing__summary-mark" aria-hidden>
                    <span className="type-label mb-0 theme-interview-gate-live__howto-index">
                      {index + 1}
                    </span>
                  </span>
                  <p className="type-body-sm mb-0 theme-interview-landing__summary-label">
                    {row.label}
                    {row.hint ? (
                      <span className="theme-interview-gate-live__brief-hint">
                        {'. '}
                        {row.hint}
                      </span>
                    ) : null}
                  </p>
                  <span className="theme-interview-landing__summary-time" aria-hidden />
                </div>
              </li>
            ))}
          </ol>
        </section>
        {chrome?.assistChrome ? <AssistInGateNotice chrome={chrome.assistChrome} /> : null}
      </div>
    </article>
  )
}

/**
 * Live tool body after Start — Form / Coding / Doc mount (timer lives in page chrome).
 * Writing / Coding: prep-style brief on the main page, then editor below.
 */
export function InterviewGateToolLive({
  mount,
  liveChrome = null,
  writingChrome = null,
  liveRef,
  editorHandleRef,
  scrollViewportRef,
  onLiveCompositionChange,
  onPendingEditsChange,
  onVisibleCodeRun,
  briefId = null,
}: InterviewGateToolLiveProps) {
  const chrome = liveChrome ?? writingChrome
  const isDoc = mount.kind === 'doc'
  const isCoding = mount.kind === 'coding'
  const briefed = isDoc || isCoding
  const editorShellRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const formRef = useRef<TestFormHandle>(null)
  const codeRef = useRef<CodeEditorHandle>(null)
  const docRef = useRef<DocEditorHandle>(null)
  const stepQueueRef = useRef<CopilotQueueStep[] | null>(null)
  const skipStepDecisionRef = useRef(false)
  const formStepWaitRef = useRef<(() => void) | null>(null)
  const [codingLive, setCodingLive] = useState<CodeEditorPayload | null>(
    mount.kind === 'coding' ? mount.workspace : null,
  )
  const onLiveRef = useRef(onLiveCompositionChange)
  onLiveRef.current = onLiveCompositionChange

  const setHostRef = useCallback(
    (node: HTMLDivElement | null) => {
      hostRef.current = node
      if (liveRef) {
        ;(liveRef as { current: HTMLDivElement | null }).current = node
      }
    },
    [liveRef],
  )

  useEffect(() => {
    if (mount.kind === 'form') {
      onLiveRef.current?.({ kind: 'form', document: mount.document })
    } else if (mount.kind === 'coding') {
      onLiveRef.current?.({ kind: 'coding', payload: mount.workspace })
    } else {
      onLiveRef.current?.({ kind: 'doc', payload: mount.document })
    }
  }, [mount.kind])

  useEffect(() => {
    const el = hostRef.current
    if (!el || !briefId) return
    return bindTelemetryHost(el, 'editor')
  }, [briefId, mount.kind])

  const unusedHandleRef = useRef<GateLiveEditorHandle | null>(null)
  useImperativeHandle(
    editorHandleRef ?? unusedHandleRef,
    () => ({
      apply: async (patch: LiveEditorApply) => {
        const handle =
          mount.kind === 'form'
            ? formRef.current
            : mount.kind === 'coding'
              ? codeRef.current
              : docRef.current
        if (!handle) return { ok: false, reason: 'no_handle' }
        return applyLiveEditorAssist({
          kind: mount.kind,
          apply: patch,
          write: true,
          getContext: handle.getContext,
          loadContext: handle.loadContext,
        })
      },
      getContext: () => {
        const handle =
          mount.kind === 'form'
            ? formRef.current
            : mount.kind === 'coding'
              ? codeRef.current
              : docRef.current
        return handle?.getContext() ?? null
      },
      settlePendingEdit: (path: string, accept: boolean) => {
        const queue = stepQueueRef.current
        if (queue && pendingCopilotCount(queue) > 0) {
          const step = stepById(queue, path)
          if (mount.kind === 'form') {
            if (!step) return
            if (accept) {
              void applyCopilotPendingOps({
                kind: 'form',
                ops: step.ops,
                write: true,
                getContext: () => formRef.current?.getContext() ?? null,
                loadContext: (ctx) => formRef.current?.loadContext(ctx) ?? Promise.resolve(),
              }).then((applied) => {
                if (applied.ok) {
                  const el = hostRef.current?.querySelector<HTMLElement>(
                    `[data-test-form-question="${step.locus}"]`,
                  )
                  el?.classList.add('is-cite-flash')
                  el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                  window.setTimeout(() => el?.classList.remove('is-cite-flash'), 1200)
                }
              })
              stepQueueRef.current = keepCopilotStep(queue, step.packageId)
            } else {
              stepQueueRef.current = discardCopilotStep(queue, step.packageId)
            }
            onPendingEditsChange?.(copilotSheetRows(stepQueueRef.current))
            if (pendingCopilotCount(stepQueueRef.current) === 0) {
              formStepWaitRef.current?.()
              formStepWaitRef.current = null
            }
            return
          }
          if (mount.kind === 'coding') {
            codeRef.current?.settlePendingFile(step?.packageId || path, accept)
            return
          }
          if (mount.kind === 'doc') {
            docRef.current?.settlePendingFile(path, accept)
            return
          }
        }
        if (mount.kind === 'coding') codeRef.current?.settlePendingFile(path, accept)
        else if (mount.kind === 'doc') docRef.current?.settlePendingFile(path, accept)
      },
      settlePendingKeepAll: () => {
        const queue = stepQueueRef.current
        if (!queue) return
        skipStepDecisionRef.current = true
        const { steps, order } = keepAllCopilotSteps(queue)
        const handle =
          mount.kind === 'form'
            ? formRef.current
            : mount.kind === 'coding'
              ? codeRef.current
              : docRef.current
        void (async () => {
          for (const id of order) {
            const step = stepById(queue, id)
            if (!step || !handle) continue
            await applyCopilotPendingOps({
              kind: mount.kind,
              ops: step.ops,
              write: true,
              getContext: handle.getContext,
              loadContext: handle.loadContext,
            })
            if (mount.kind === 'coding') codeRef.current?.settlePendingFile(id, true)
            else if (mount.kind === 'doc') docRef.current?.settlePendingFile(id, true)
          }
          stepQueueRef.current = steps
          onPendingEditsChange?.(copilotSheetRows(steps))
          skipStepDecisionRef.current = false
          if (mount.kind === 'form' && pendingCopilotCount(steps) === 0) {
            formStepWaitRef.current?.()
            formStepWaitRef.current = null
          }
        })()
      },
      settlePendingDiscardAll: () => {
        const queue = stepQueueRef.current
        if (!queue) return
        skipStepDecisionRef.current = true
        const next = discardAllCopilotSteps(queue)
        stepQueueRef.current = next
        onPendingEditsChange?.([])
        for (const row of copilotSheetRows(queue)) {
          if (mount.kind === 'coding') codeRef.current?.settlePendingFile(row.id, false)
          else if (mount.kind === 'doc') docRef.current?.settlePendingFile(row.id, false)
        }
        skipStepDecisionRef.current = false
        if (mount.kind === 'form') {
          formStepWaitRef.current?.()
          formStepWaitRef.current = null
        }
      },
      focusPendingEdit: (path: string) => {
        if (mount.kind === 'coding') return Boolean(codeRef.current?.focusPendingFile(path))
        if (mount.kind === 'doc') return Boolean(docRef.current?.focusPendingFile(path))
        return false
      },
      applyOps: async (ops: CopilotOp[], generation?: number) => {
        const handle =
          mount.kind === 'form'
            ? formRef.current
            : mount.kind === 'coding'
              ? codeRef.current
              : docRef.current
        if (!handle) return { ok: false, reason: 'no_handle' }
        const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const result = await applyCopilotPendingOps({
          kind: mount.kind,
          ops,
          write: true,
          expectedGeneration: generation,
          generation,
          getContext: handle.getContext,
          loadContext: handle.loadContext,
        })
        if (result.ok) {
          const first = ops[0]
          if (mount.kind === 'coding') {
            const path = ops.find((op) => 'path' in op && typeof op.path === 'string' && op.path.trim())
            const filePath = path && 'path' in path ? path.path : undefined
            if (filePath) codeRef.current?.highlightWorkspaceRange(filePath)
          }
          if (!reduce) {
            if (first && (first.op === 'set_response' || first.op === 'clear_response')) {
              const el = hostRef.current?.querySelector<HTMLElement>(
                `[data-test-form-question="${first.questionId}"]`,
              )
              el?.classList.add('is-cite-flash')
              el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
              window.setTimeout(() => el?.classList.remove('is-cite-flash'), 1200)
            }
            if (mount.kind === 'doc') {
              const root = editorShellRef.current
              revealEssayRange(root, { reduceMotion: reduce })
            }
          }
        }
        return result
      },
      proposeEdit: async (
        rawOps: CopilotOp[],
        generation?: number,
        rawSteps?: unknown[],
      ): Promise<ProposeEditResult> => {
        const ops = rewriteCopilotOpPaths(rawOps)
        const handle =
          mount.kind === 'form'
            ? formRef.current
            : mount.kind === 'coding'
              ? codeRef.current
              : docRef.current
        if (!handle) return { status: 'miss', reason: 'no_handle' }
        if (!ops.length) return { status: 'miss', reason: 'no_ops' }
        const locus = locusFromOps(mount.kind, ops)
        const summary = summaryFromOps(ops)
        const ctx = handle.getContext()
        const liveDoc =
          mount.kind === 'form'
            ? {
                kind: 'form' as const,
                generation: generation ?? 0,
                snapshotHash: '',
                form:
                  ctx && typeof ctx === 'object' && 'document' in ctx
                    ? ((ctx as { document: TestFormDocument }).document as unknown as Record<string, unknown>)
                    : (ctx as Record<string, unknown>),
              }
            : mount.kind === 'coding'
              ? {
                  kind: 'coding' as const,
                  generation: generation ?? 0,
                  snapshotHash: '',
                  coding: ctx as Record<string, unknown>,
                }
              : {
                  kind: 'doc' as const,
                  generation: generation ?? 0,
                  snapshotHash: '',
                  doc: ctx as Record<string, unknown>,
                }
        const dry = applyCopilotOps(liveDoc, ops, { expectedGeneration: generation })
        if (!dry.ok) {
          return { status: 'miss', reason: dry.failed[0]?.code ?? 'apply_failed', locus, summary }
        }
        const queued = createCopilotStepQueue(
          (Array.isArray(rawSteps) ? rawSteps : []) as Array<{
            packageId?: string
            locus?: string
            summary?: string
            dependsOn?: string[]
            ops?: CopilotOp[]
            status?: string
          }>,
        )
        // Failed rows ride along so the sheet can say what was attempted, but only the
        // packages the candidate can act on decide whether this is a multi-step turn.
        const multi = mergeCopilotStepsByFile(
          queued.filter((s) => s.status === 'failed' || s.ops.length),
        )
        if (actionableCopilotSteps(multi).length >= 2) {
          stepQueueRef.current = multi
          onPendingEditsChange?.(copilotSheetRows(multi))
          const publish = () => {
            const q = stepQueueRef.current
            onPendingEditsChange?.(q ? copilotSheetRows(q) : [])
          }
          const previewFiles = (queue: CopilotQueueStep[]) => {
            const ids = unlockedPendingIds(queue)
            const files: { id: string; path: string; original: string; next: string }[] = []
            let accum: CopilotLiveDoc = liveDoc
            const keptOps = queue.filter((s) => s.status === 'kept').flatMap((s) => s.ops)
            if (keptOps.length) {
              const keptDry = applyCopilotOps(liveDoc, keptOps, { expectedGeneration: generation })
              if (keptDry.ok) accum = keptDry.doc
            }
            for (const id of ids) {
              const step = stepById(queue, id)
              if (!step) continue
              const nextDry = applyCopilotOps(accum, step.ops, { expectedGeneration: generation })
              const path = step.locus || codingPathsFromOps(step.ops)[0] || 'file'
              files.push({
                id: step.packageId,
                path,
                original: mount.kind === 'doc' ? docMarkdownOf(accum) : codingFileText(accum, path),
                next: nextDry.ok
                  ? mount.kind === 'doc'
                    ? docMarkdownOf(nextDry.doc)
                    : codingFileText(nextDry.doc, path)
                  : mount.kind === 'doc'
                    ? docMarkdownOf(accum)
                    : codingFileText(accum, path),
              })
            }
            return files
          }
          if (mount.kind === 'form') {
            await new Promise<void>((resolve) => {
              formStepWaitRef.current = resolve
            })
            const q = stepQueueRef.current ?? multi
            stepQueueRef.current = null
            onPendingEditsChange?.([])
            return {
              status: anyKept(q) ? 'accepted' : 'rejected',
              locus,
              summary,
            }
          }
          let last: ProposeEditResult['status'] = 'rejected'
          while (stepQueueRef.current && pendingCopilotCount(stepQueueRef.current) > 0) {
            const queue = stepQueueRef.current
            const ids = unlockedPendingIds(queue)
            if (!ids.length) {
              stepQueueRef.current = discardAllCopilotSteps(queue)
              break
            }
            if (mount.kind === 'coding') {
              const files = previewFiles(queue)
              if (codingDiffIsNoop(files)) {
                stepQueueRef.current = keepAllCopilotSteps(queue).steps
                break
              }
              const decision = await codeRef.current?.proposeDiff({
                files,
                onFileDecision: async (path, fileDecision) => {
                  if (skipStepDecisionRef.current) return
                  const qNow = stepQueueRef.current
                  if (!qNow) return
                  const step = stepById(qNow, path)
                  if (!step) return
                  if (fileDecision === 'accepted') {
                    await applyCopilotPendingOps({
                      kind: 'coding',
                      ops: step.ops,
                      write: true,
                      expectedGeneration: generation,
                      generation,
                      getContext: handle.getContext,
                      loadContext: handle.loadContext,
                    })
                    codeRef.current?.highlightWorkspaceRange(step.locus)
                    stepQueueRef.current = keepCopilotStep(qNow, step.packageId)
                  } else {
                    stepQueueRef.current = discardCopilotStep(qNow, step.packageId)
                  }
                  publish()
                },
              })
              if (decision === 'replaced') return { status: 'replaced', locus, summary }
              last = decision === 'accepted' || anyKept(stepQueueRef.current ?? []) ? 'accepted' : 'rejected'
            } else {
              const files = previewFiles(queue)
              const focused = files[0]
              if (!focused || focused.original === focused.next) {
                stepQueueRef.current = keepCopilotStep(queue, ids[0]!)
                publish()
                continue
              }
              const decision = await docRef.current?.proposeDiff({
                original: focused.original,
                next: focused.next,
              })
              if (decision === 'replaced') return { status: 'replaced', locus, summary }
              const qNow = stepQueueRef.current ?? queue
              if (decision === 'accepted') {
                stepQueueRef.current = keepCopilotStep(qNow, ids[0]!)
                last = 'accepted'
              } else if (decision === 'rejected') {
                stepQueueRef.current = discardCopilotStep(qNow, ids[0]!)
                last = anyKept(stepQueueRef.current) ? 'accepted' : 'rejected'
              } else {
                last = 'miss'
                break
              }
              publish()
            }
          }
          const q = stepQueueRef.current
          stepQueueRef.current = null
          onPendingEditsChange?.([])
          return { status: anyKept(q ?? []) ? 'accepted' : last, locus, summary }
        }
        if (mount.kind === 'form') {
          const applied = await applyCopilotPendingOps({
            kind: 'form',
            ops,
            write: true,
            expectedGeneration: generation,
            generation,
            getContext: handle.getContext,
            loadContext: handle.loadContext,
          })
          if (!applied.ok) return { status: 'miss', reason: applied.reason, locus, summary }
          const first = ops[0]
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          if (!reduce && first && (first.op === 'set_response' || first.op === 'clear_response')) {
            const el = hostRef.current?.querySelector<HTMLElement>(
              `[data-test-form-question="${first.questionId}"]`,
            )
            el?.classList.add('is-cite-flash')
            el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
            window.setTimeout(() => el?.classList.remove('is-cite-flash'), 1200)
          }
          return { status: 'applied', locus, summary }
        }
        if (mount.kind === 'coding') {
          const paths = codingPathsFromOps(ops)
          if (!paths.length) {
            const fallback = firstOpPath(ops) || String(liveDoc.coding && (liveDoc.coding as { activeId?: string }).activeId || '')
            if (!fallback) return { status: 'miss', reason: 'no_ops', locus, summary }
            paths.push(fallback)
          }
          const files = paths.map((path) => ({
            path,
            original: codingFileText(liveDoc, path),
            next: codingFileText(dry.doc, path),
          }))
          if (codingDiffIsNoop(files)) {
            return { status: 'miss', reason: 'no_change', locus, summary }
          }
          const decision = await codeRef.current?.proposeDiff({
            files,
            onFileDecision: async (path, fileDecision) => {
              if (fileDecision !== 'accepted') return
              const slice = opsForPath(ops, path)
              if (!slice.length) return
              const applied = await applyCopilotPendingOps({
                kind: 'coding',
                ops: slice,
                write: true,
                expectedGeneration: generation,
                generation,
                getContext: handle.getContext,
                loadContext: handle.loadContext,
              })
              if (applied.ok) codeRef.current?.highlightWorkspaceRange(path)
            },
          })
          if (decision === 'accepted') return { status: 'accepted', locus, summary }
          if (decision === 'rejected') return { status: 'rejected', locus, summary }
          if (decision === 'replaced') return { status: 'replaced', locus, summary }
          return { status: 'miss', reason: 'no_handle', locus, summary }
        }
        const original = docMarkdownOf(liveDoc)
        const next = docMarkdownOf(dry.doc)
        if (original === next) return { status: 'miss', reason: 'no_change', locus, summary }
        const decision = await docRef.current?.proposeDiff({ original, next })
        if (decision === 'accepted') {
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          revealEssayRange(editorShellRef.current, { reduceMotion: reduce })
          return { status: 'accepted', locus, summary }
        }
        if (decision === 'rejected') return { status: 'rejected', locus, summary }
        if (decision === 'replaced') return { status: 'replaced', locus, summary }
        return { status: 'miss', reason: 'no_handle', locus, summary }
      },
      revealQuestion: (questionId: string) => {
        const el = hostRef.current?.querySelector<HTMLElement>(
          `[data-test-form-question="${questionId}"]`,
        )
        if (!el) return
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
        if (!reduce) {
          el.classList.add('is-cite-flash')
          window.setTimeout(() => el.classList.remove('is-cite-flash'), 1200)
        }
      },
      revealFileRange: (path: string, startLine?: number, endLine?: number) => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        editorShellRef.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
        const opened = codeRef.current?.highlightWorkspaceRange(path, startLine, endLine)
        if (opened) return
        const safe =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(path) : path
        const tab = hostRef.current?.querySelector<HTMLElement>(`[data-code-path="${safe}"]`)
        tab?.click()
      },
      revealEssayRange: (startLine?: number, endLine?: number, search?: string) => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        revealEssayRange(editorShellRef.current, { startLine, endLine, search, reduceMotion: reduce })
      },
      revealTerminal: () => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const term = hostRef.current?.querySelector<HTMLElement>('[data-code-terminal]')
        term?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
      },
    }),
    [mount.kind],
  )

  useLayoutEffect(() => {
    if (!briefed) return
    const shell = editorShellRef.current
    if (!shell) return

    const apply = () => {
      const viewport = resolveScrollViewport(shell, scrollViewportRef)
      const clearance = chromeClearancePx(hostRef.current ?? shell)
      const vpH = viewport?.clientHeight ?? window.innerHeight
      // Fill under sticky gate chrome → viewport bottom so the workbench is fully usable.
      const h = Math.max(EDITOR_MIN_PX, Math.floor(vpH - clearance - EDITOR_BOTTOM_PAD_PX))
      shell.style.setProperty('--interview-gate-editor-h', `${h}px`)
    }

    apply()
    const ro = new ResizeObserver(() => apply())
    const viewport = resolveScrollViewport(shell, scrollViewportRef)
    if (viewport) ro.observe(viewport)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [briefed, mount.kind, scrollViewportRef])

  // Monaco / Lexical focus scrolls the tall editor into view — keep stage start at the brief top.
  useLayoutEffect(() => {
    if (!briefed) return
    const shell = editorShellRef.current
    if (!shell) return
    const pinUntil = Date.now() + 1400
    const pinTop = () => {
      if (Date.now() > pinUntil) return
      const viewport = resolveScrollViewport(shell, scrollViewportRef)
      if (viewport && viewport.scrollTop !== 0) viewport.scrollTop = 0
    }
    pinTop()
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(pinTop)
    })
    const timers = [50, 200, 500, 900, 1300].map((ms) => window.setTimeout(pinTop, ms))
    shell.addEventListener('focusin', pinTop, true)
    return () => {
      window.cancelAnimationFrame(raf)
      for (const id of timers) window.clearTimeout(id)
      shell.removeEventListener('focusin', pinTop, true)
    }
  }, [briefed, mount.kind, scrollViewportRef])

  const scrollToEditor = useCallback(() => {
    const shell = editorShellRef.current
    if (!shell) return
    const viewport = resolveScrollViewport(shell, scrollViewportRef)
    if (!viewport) {
      shell.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    const clearance = chromeClearancePx(hostRef.current ?? shell)
    const delta =
      shell.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top -
      clearance -
      8
    viewport.scrollTo({
      top: Math.max(0, viewport.scrollTop + delta),
      behavior: 'smooth',
    })
  }, [scrollViewportRef])

  const handleCodingRun = useCallback(
    async (api: {
      appendTerminal: (lines: string[] | CodeTerminalItem[]) => void
      getPayload: () => CodeEditorPayload
      activeLanguage?: string | null
    }) => {
      if (mount.kind !== 'coding') return
      const workspace = api.getPayload()
      const languages = mount.languages
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
      const activeLanguage =
        api.activeLanguage ||
        (activeFilePath &&
          resolveCodingLanguageForFile(
            activeFilePath,
            workspace.files?.find((f) => f.path === activeFilePath)?.language ?? '',
            languages.length ? languages : CODING_LANGUAGE_OPTIONS.map((o) => o.id),
          )) ||
        languages[0] ||
        'typescript'
      const built = buildCodeRunRequest({
        workspace,
        languages,
        defaultLanguage: languages[0] ?? 'typescript',
        activeLanguage,
        activeFilePath,
        tests: {
          runner: mount.runTests.runner,
          entryPoint: mount.runTests.entryPoint,
          cases: mount.runTests.cases,
        },
      })
      if (!built.ok) {
        api.appendTerminal([built.detail])
        return
      }
      try {
        const result = await runInterviewCode({ body: built.body, briefId })
        onVisibleCodeRun?.({
          sourceHash: hashCodingSource(
            `${activeLanguage}\n${JSON.stringify(workspace.files ?? [])}`,
          ),
          result,
        })
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
    },
    [mount, onVisibleCodeRun],
  )

  return (
    <div
      ref={setHostRef}
      className={[
        'theme-interview-gate-live',
        mount.kind === 'form' ? 'theme-interview-gate-live--form' : '',
        isDoc ? 'theme-interview-gate-live--writing' : '',
        isCoding ? 'theme-interview-gate-live--coding' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-kind={mount.kind}
      data-dash-anim
    >
      {briefed ? (
        <StickyScrollToEditor
          onScrollToEditor={scrollToEditor}
          editorRef={editorShellRef}
          hostRef={hostRef}
          scrollViewportRef={scrollViewportRef}
        />
      ) : null}
      {isDoc ? <WritingBrief mount={mount} chrome={chrome} /> : null}
      {isCoding ? (
        <CodingBrief
          mount={mount}
          chrome={chrome}
          workspace={codingLive ?? mount.workspace}
          onOpenPath={(path) => {
            if (!path) return
            codeRef.current?.openWorkspacePath(path)
            scrollToEditor()
          }}
        />
      ) : null}
      {briefed ? (
        <div className="theme-interview-gate-live__divider" role="separator" aria-hidden />
      ) : null}
      <div
        ref={editorShellRef}
        className={[
          'theme-interview-gate-live__editor',
          isDoc ? 'theme-interview-gate-live__editor--doc' : '',
          isCoding ? 'theme-interview-gate-live__editor--coding' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-dash-anim
      >
        {isDoc ? (
          <p className="type-label mb-0 theme-interview-gate-live__editor-label">Your response</p>
        ) : null}
        {isCoding ? (
          <p className="type-label mb-0 theme-interview-gate-live__editor-label">Your solution</p>
        ) : null}
        {mount.kind === 'form' ? (
          <>
            {chrome?.assistChrome ? (
              <AssistInGateNotice chrome={chrome.assistChrome} lead />
            ) : null}
            <TestForm
              ref={formRef}
              embed
              initialMode="take"
              initialDocument={mount.document}
              onDocumentChange={(document) =>
                onLiveCompositionChange?.({ kind: 'form', document })
              }
            />
          </>
        ) : null}
        {isCoding ? (
          <CodeEditor
            ref={codeRef}
            embed
            chrome="section"
            allowedLanguages={mount.languages}
            initialPayload={mount.workspace}
            onPayloadChange={(payload) => {
              setCodingLive(payload)
              onLiveCompositionChange?.({ kind: 'coding', payload })
            }}
            onPendingDiffChange={onPendingEditsChange}
            onRun={handleCodingRun}
          />
        ) : null}
        {isDoc ? (
          <DocEditor
            ref={docRef}
            embed
            chrome="section"
            placeholder="Start writing your response…"
            initialPayload={mount.document}
            minWords={mount.minWords}
            maxWords={mount.maxWords}
            onPayloadChange={(payload) =>
              onLiveCompositionChange?.({ kind: 'doc', payload })
            }
            onPendingDiffChange={onPendingEditsChange}
          />
        ) : null}
      </div>
    </div>
  )
}
