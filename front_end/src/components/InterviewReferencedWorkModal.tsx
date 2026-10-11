/**
 * Sitting-day view of a bound earlier coding / form / writing / Talk section.
 * Deferred until the modal is open; not a leave. Coding is a local playground
 * (run, language files, tape history) — edits do not persist to the original stage.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Chip } from './Chip'
import { CodeEditor, type CodeEditorHandle } from './CodeEditor'
import { DocEditor } from './DocEditor'
import {
  InterviewEditorTapePlayer,
  type InterviewEditorTapePlayerHandle,
} from './InterviewEditorTapePlayer'
import { Modal } from './Modal'
import { TestForm } from './TestForm'
import { ThemeScroll } from './ThemeScroll'
import { VurifyMenuButton } from './VurifyMenuButton'
import type { Creator2BriefDocument } from '../lib/interviewBrief/creator2BriefTypes'
import { buildCodeRunRequest } from '../lib/interviewBrief/buildCodeRunRequest'
import {
  CODING_LANGUAGE_OPTIONS,
  resolveCodingLanguageForFile,
} from '../lib/interviewBrief/codingLanguages'
import { MarkdownPreview } from '../lib/markdownRenderer/renderMarkdown'
import { codingPayloadFromCheckpoint } from '../lib/interviewRunApi/editorCapture'
import type { Checkpoint } from '../lib/interviewRunApi/editorCapture'
import { bindTelemetryHost } from '../lib/interviewRunApi/sessionTelemetry'
import { runInterviewCode } from '../lib/interviewRunApi/codeRunEdgeClient'
import {
  composeCodeRunTerminal,
  terminalItemsToPlainLines,
  type CodeTerminalItem,
} from '../lib/interviewRunApi/formatCodeRunTerminal'
import {
  buildReferencedWorkViews,
  type ReferencedWorkKind,
  type ReferencedWorkView,
} from '../lib/interviewRunApi/referencedWorkView'
import type { CodeEditorPayload } from '../lib/editorContext/types'

type InterviewReferencedWorkModalProps = {
  open: boolean
  onClose: () => void
  brief: Creator2BriefDocument
  briefId: string
  consumingPhaseId: string
  className?: string
  debug?: boolean
}

function copySurfaceFor(kind: ReferencedWorkKind): string {
  if (kind === 'coding') return 'editor'
  if (kind === 'form') return 'form'
  if (kind === 'doc') return 'doc'
  return 'chat'
}

function kindLabel(kind: ReferencedWorkKind): string {
  if (kind === 'form') return 'Form'
  if (kind === 'coding') return 'Coding'
  if (kind === 'doc') return 'Writing'
  if (kind === 'talk') return 'Discussion'
  return 'Section'
}

function ReferencedCodingBody({ view }: { view: ReferencedWorkView }) {
  const codeRef = useRef<CodeEditorHandle>(null)
  const tapeRef = useRef<InterviewEditorTapePlayerHandle>(null)
  const languages = view.codingLanguages
  const tests = view.codingRunTests

  const handleTapeFrame = (frame: Checkpoint) => {
    codeRef.current?.loadContext?.(codingPayloadFromCheckpoint(frame))
  }

  const handleCodingRun = useCallback(
    async (api: {
      appendTerminal: (lines: string[] | CodeTerminalItem[]) => void
      getPayload: () => CodeEditorPayload
      activeLanguage?: string | null
    }) => {
      if (!tests) {
        api.appendTerminal(['Run is not connected for this referenced section.'])
        return
      }
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
          runner: tests.runner,
          entryPoint: tests.entryPoint,
          cases: tests.cases,
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
    [languages, tests],
  )

  return (
    <div className="page-scene--interview__reference-coding">
      {view.codingTape ? (
        <>
          <InterviewEditorTapePlayer
            ref={tapeRef}
            tape={view.codingTape}
            onFrame={handleTapeFrame}
          />
          <div
            className="theme-interview-gate-live__divider theme-interview-landing__verify-tool-divider"
            role="separator"
            aria-hidden
          />
        </>
      ) : null}
      <div className="theme-interview-gate-live__editor theme-interview-gate-live__editor--coding theme-interview-landing__verify-tool-body">
        <CodeEditor
          key={view.phaseId}
          ref={codeRef}
          embed
          chrome="section"
          allowedLanguages={languages}
          initialPayload={view.codingWorkspace ?? undefined}
          onRun={handleCodingRun}
        />
      </div>
    </div>
  )
}

function ReferencedWorkBody({ view }: { view: ReferencedWorkView }) {
  if (view.empty) {
    return (
      <p className="type-body-sm type-muted mb-0">
        Nothing saved from {view.title} yet.
      </p>
    )
  }

  if (view.kind === 'talk') {
    return (
      <ThemeScroll className="page-scene--interview__reference-talk" rail="mini">
        <div className="page-scene--interview__reference-talk-inner">
          {view.talkTurns.map((turn, i) => (
            <article
              key={`${turn.role}-${i}`}
              className="page-scene--interview__reference-turn"
            >
              <p className="type-label mb-0">
                {turn.role === 'assistant' ? 'Interviewer' : 'You'}
              </p>
              <MarkdownPreview source={turn.text} density="chat" />
            </article>
          ))}
        </div>
      </ThemeScroll>
    )
  }

  if (view.kind === 'form' && view.formDocument) {
    return (
      <div className="theme-interview-landing__verify-tool-body theme-interview-landing__verify-tool-body--form">
        <TestForm embed initialMode="review" initialDocument={view.formDocument} />
      </div>
    )
  }

  if (view.kind === 'coding' && view.codingWorkspace) {
    return <ReferencedCodingBody view={view} />
  }

  if (view.kind === 'doc' && view.docDocument) {
    return (
      <div className="theme-interview-gate-live__editor theme-interview-gate-live__editor--doc theme-interview-landing__verify-tool-body">
        <DocEditor
          key={view.phaseId}
          embed
          chrome="section"
          readOnly
          placeholder="No writing captured for this section."
          initialPayload={view.docDocument}
        />
      </div>
    )
  }

  return (
    <p className="type-body-sm type-muted mb-0">
      Nothing saved from {view.title} yet.
    </p>
  )
}

export function InterviewReferencedWorkModal({
  open,
  onClose,
  brief,
  briefId,
  consumingPhaseId,
  className = '',
  debug = false,
}: InterviewReferencedWorkModalProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const views = useMemo(
    () =>
      open
        ? buildReferencedWorkViews({
            brief,
            briefId,
            consumingPhaseId,
          })
        : [],
    [open, brief, briefId, consumingPhaseId],
  )
  const [activeId, setActiveId] = useState('')
  useEffect(() => {
    if (!open) {
      setActiveId('')
      return
    }
    setActiveId((prev) =>
      views.some((v) => v.phaseId === prev) ? prev : views[0]?.phaseId ?? '',
    )
  }, [open, views])

  const active = views.find((v) => v.phaseId === activeId) ?? views[0] ?? null

  useLayoutEffect(() => {
    if (!open) return
    return bindTelemetryHost(hostRef.current, 'assist')
  }, [open, active?.phaseId])

  if (debug) {
    console.debug('[InterviewReferencedWorkModal]', {
      open,
      consumingPhaseId,
      views: views.map((v) => v.phaseId),
    })
  }

  const title =
    views.length === 1 ? views[0]!.title : active?.title || 'Referenced work'

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      showCancel={false}
      showHeaderClose={false}
      headerEnd={
        <VurifyMenuButton
          type="button"
          variant="label"
          size="md"
          housing
          activeChrome={false}
          lineTone="accent"
          onClick={onClose}
        >
          Close
        </VurifyMenuButton>
      }
      closeOnEscape
      size="xl"
      placement="viewport"
      cardVariant="vurify-outlined"
      footerStyle="vurify"
      scrollRail="mini"
      closeOnBackdrop
      className={['page-scene--interview__reference-dialog', className]
        .filter(Boolean)
        .join(' ')}
    >
      {active ? (
        <div
          ref={hostRef}
          className="page-scene--interview__reference-body"
          data-reference-kind={active.kind}
          data-sitting-reference-view="true"
          data-sitting-copy-ok=""
          data-copy-surface={copySurfaceFor(active.kind)}
        >
          {views.length > 1 ? (
            <div
              className="theme-chip-group page-scene--interview__reference-chips"
              role="tablist"
              aria-label="Referenced sections"
            >
              {views.map((row) => (
                <Chip
                  key={row.phaseId}
                  size="sm"
                  selected={row.phaseId === active.phaseId}
                  onClick={() => setActiveId(row.phaseId)}
                >
                  {row.title || kindLabel(row.kind)}
                </Chip>
              ))}
            </div>
          ) : null}
          <ReferencedWorkBody view={active} />
        </div>
      ) : (
        <p className="type-body-sm type-muted mb-0">No referenced section to show.</p>
      )}
    </Modal>
  )
}
