/**
 * Coding Soft Decision Verify — collapsed question overview, stacked marks, read-only
 * CodeEditor (Run allowed).
 */
import { useCallback, useEffect, useRef } from 'react'
import { Chip } from './Chip'
import { CodeEditor, type CodeEditorHandle } from './CodeEditor'
import { InterviewVerifyMarkStrip } from './InterviewVerifyMarkStrip'
import { InterviewVerifyQuestionOverview } from './InterviewVerifyQuestionOverview'
import {
  InterviewEditorTapePlayer,
  extraTapeTagsFromCards,
  extraBucketNotesFromCards,
  extraPasteBurstsFromCards,
  type InterviewEditorTapePlayerHandle,
} from './InterviewEditorTapePlayer'
import { MarkdownPreview } from '../lib/markdownRenderer/renderMarkdown'
import { ThemeScroll } from './ThemeScroll'
import { VurifyIcon } from './VurifyIcon'
import { ListOrdered } from 'lucide-react'
import { buildCodeRunRequest } from '../lib/interviewBrief/buildCodeRunRequest'
import {
  CODING_LANGUAGE_OPTIONS,
  codingLanguageDisplayLabel,
  codingSolvePath,
  resolveCodingLanguageForFile,
} from '../lib/interviewBrief/codingLanguages'
import { listWorkingSrcFiles, resolveCoverHopPath } from '../lib/interviewBrief/codingWorkspaceFiles'
import { formatCompactJson } from '../lib/interviewRunApi/resolveGateToolMount'
import type { CodingVerifyModal } from '../lib/interviewRunApi/codingVerifyModal'
import type { TalkVerifyMarkingCard } from '../lib/interviewRunApi/talkVerifyModal'
import { jumpFromCard } from '../lib/interviewRunApi/jumpCite'
import { runInterviewCode } from '../lib/interviewRunApi/codeRunEdgeClient'
import { codingPayloadFromCheckpoint } from '../lib/interviewRunApi/editorCapture'
import type { Checkpoint } from '../lib/interviewRunApi/editorCapture'
import {
  composeCodeRunTerminal,
  terminalItemsToPlainLines,
  type CodeTerminalItem,
} from '../lib/interviewRunApi/formatCodeRunTerminal'
import type { CodeEditorPayload } from '../lib/editorContext/types'

type InterviewCodingVerifyPanelProps = {
  modal: CodingVerifyModal
  onAskAboutCard?: (card: TalkVerifyMarkingCard) => void
  onPromoteTitle?: (title: string | null) => void
  initialSeekMs?: number
  /** Results Expand — grow with overlay ThemeScroll so sticky asides can pin. */
  inPageScroll?: boolean
  className?: string
  debug?: boolean
}

export function InterviewCodingVerifyPanel({
  modal,
  onAskAboutCard,
  onPromoteTitle,
  initialSeekMs,
  inPageScroll = false,
  className = '',
  debug = false,
}: InterviewCodingVerifyPanelProps) {
  const mount = modal.mount
  const languages = mount.languages.map((l) => l.trim()).filter(Boolean)
  const exerciseMd = mount.readmeMarkdown.trim() || mount.briefMarkdown.trim()
  const cases = mount.visibleSampleCases
  const codeRef = useRef<CodeEditorHandle>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const tapeRef = useRef<InterviewEditorTapePlayerHandle>(null)
  useEffect(() => {
    if (initialSeekMs == null) return
    const id = window.setTimeout(() => tapeRef.current?.seek(initialSeekMs), 80)
    return () => window.clearTimeout(id)
  }, [initialSeekMs])
  const workingFiles = listWorkingSrcFiles(mount.workspace, languages[0] || 'typescript')
  const showFiles = workingFiles.length > 1
  const hasQuestionOverview = Boolean(exerciseMd || showFiles || cases.length)
  const entryPath = codingSolvePath(languages[0] || 'typescript') || workingFiles[0] || null
  const jumpCard = (card: TalkVerifyMarkingCard) => {
    jumpFromCard(card, {
      seekTape: (ms) => tapeRef.current?.seek(ms),
      revealFileRange: (path, start, end) => {
        codeRef.current?.highlightWorkspaceRange(path, start, end)
      },
      revealMessage: (id) => {
        const el = hostRef.current?.querySelector<HTMLElement>(`[data-assist-message="${id}"]`)
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      },
    })
  }
  const openPath = (path: string) => {
    if (!path) return
    codeRef.current?.openWorkspacePath(path)
  }

  const handleTapeFrame = (frame: Checkpoint) => {
    codeRef.current?.loadContext?.(codingPayloadFromCheckpoint(frame))
  }

  if (debug) {
    console.debug('[InterviewCodingVerifyPanel]', {
      sectionKey: modal.sectionKey,
      cards: modal.cards.length,
      assessCases: modal.assessRunTests.cases.length,
    })
  }

  const handleCodingRun = useCallback(
    async (api: {
      appendTerminal: (lines: string[] | CodeTerminalItem[]) => void
      getPayload: () => CodeEditorPayload
      activeLanguage?: string | null
    }) => {
      const workspace = api.getPayload()
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
          runner: modal.assessRunTests.runner,
          entryPoint: modal.assessRunTests.entryPoint,
          cases: modal.assessRunTests.cases,
        },
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
        api.appendTerminal([
          err instanceof Error ? err.message : 'Code run failed. Try again.',
        ])
      }
    },
    [languages, modal.assessRunTests],
  )

  const inner = (
    <div className="theme-interview-landing__verify-tool-inner">
          <header className="theme-interview-landing__verify-lead">
            <h2
              className="type-h3 type-serif-italic mb-0 theme-interview-gate__title"
              data-interview-verify-title-text={modal.title}
              onMouseEnter={() => onPromoteTitle?.(modal.title)}
            >
              {modal.title}
            </h2>
            {hasQuestionOverview ? (
            <InterviewVerifyQuestionOverview>
          <article
            className="theme-interview-gate theme-interview-gate--writing-brief theme-interview-gate--coding-brief"
            aria-label="Coding challenge brief"
          >
            {languages.length > 0 ? (
              <div
                className="theme-chip-group theme-interview-gate-live__lang-tags"
                role="list"
                aria-label="Allowed languages"
              >
                {languages.map((lang) => (
                  <Chip
                    key={lang}
                    size="sm"
                    selected
                    className="theme-interview-gate-live__lang-tag"
                  >
                    {codingLanguageDisplayLabel(lang)}
                  </Chip>
                ))}
              </div>
            ) : null}

            <div className="theme-interview-gate__prep-extras">
              {exerciseMd ? (
                <section
                  className="theme-interview-gate__preamble theme-interview-gate-live__readme-block"
                  aria-label="Exercise"
                >
                  <h3 className="type-label mb-0 theme-interview-landing__structure-label">
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
                <section className="theme-interview-gate__preamble" aria-label="Files">
                  <h3 className="type-label mb-0 theme-interview-landing__structure-label">
                    Files
                  </h3>
                  <div className="theme-chip-group theme-interview-gate-live__file-tags" role="list">
                    {workingFiles.map((path) => (
                      <Chip
                        key={path}
                        size="sm"
                        onClick={() => openPath(path)}
                      >
                        {path.split('/').pop()}
                        {path === entryPath ? ' · Entry' : ''}
                      </Chip>
                    ))}
                  </div>
                </section>
              ) : null}

              {cases.length > 0 ? (
                <section
                  className="theme-interview-gate__preamble"
                  aria-label="Visible sample cases"
                >
                  <h3 className="type-label mb-0 theme-interview-landing__structure-label">
                    Visible cases
                  </h3>
                  <ul className="theme-interview-landing__summary-list theme-interview-gate__preamble-list">
                    {cases.map((c) => (
                      <li
                        key={c.id}
                        className="theme-interview-landing__summary-item"
                        onClick={() =>
                          openPath(
                            resolveCoverHopPath(
                              c.covers,
                              languages[0] || 'typescript',
                              mount.workspace,
                            ) ||
                              entryPath ||
                              '',
                          )
                        }
                      >
                        <div className="theme-interview-landing__summary-row">
                          <span className="theme-interview-landing__summary-mark" aria-hidden>
                            <VurifyIcon
                              icon={ListOrdered}
                              variant="plain"
                              tone="muted"
                              size="sm"
                            />
                          </span>
                          <p className="type-body-sm mb-0 theme-interview-landing__summary-label">
                            {c.name.trim() || c.id}
                            {c.description?.trim() ? (
                              <span className="theme-interview-gate-live__brief-hint">
                                {' '}
                                — {c.description.trim()}
                              </span>
                            ) : null}
                            <span className="theme-interview-gate-live__brief-hint">
                              {' '}
                              · In `{formatCompactJson(c.args ?? [])}` · Out `
                              {formatCompactJson(c.expected ?? null)}`
                            </span>
                          </p>
                          <span className="theme-interview-landing__summary-time" aria-hidden />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </article>
          </InterviewVerifyQuestionOverview>
            ) : null}
          </header>

          <InterviewVerifyMarkStrip
            cards={modal.cards}
            onAskAboutCard={onAskAboutCard}
            onJumpCard={jumpCard}
          />

          {modal.tape ? (
            <InterviewEditorTapePlayer
              ref={tapeRef}
              tape={modal.tape}
              onFrame={handleTapeFrame}
              messages={modal.assistMessages}
              extraTags={extraTapeTagsFromCards(modal.cards)}
              bucketNotes={extraBucketNotesFromCards(modal.cards)}
              pasteBursts={extraPasteBurstsFromCards(modal.cards)}
              debug={debug}
            />
          ) : null}

          <div
            className="theme-interview-gate-live__editor theme-interview-gate-live__editor--coding theme-interview-landing__verify-tool-body"
            data-dash-anim
          >
            <p className="type-label mb-0 theme-interview-gate-live__editor-label">
              Attempt solution
            </p>
            <CodeEditor
              ref={codeRef}
              embed
              chrome="section"
              readOnly
              allowedLanguages={mount.languages}
              initialPayload={mount.workspace}
              onRun={handleCodingRun}
            />
          </div>
    </div>
  )

  return (
    <div
      ref={hostRef}
      className={['theme-interview-landing__verify-tool', className].filter(Boolean).join(' ')}
      data-verify-kind="coding"
      data-page-flow={inPageScroll ? 'true' : undefined}
    >
      {inPageScroll ? (
        inner
      ) : (
        <ThemeScroll
          className="theme-interview-landing__verify-tool-scroll"
          rail="mini"
          scrollClouds
        >
          {inner}
        </ThemeScroll>
      )}
    </div>
  )
}
