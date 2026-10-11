/**
 * Headless compose blank-slate: run interview-brief-edit plan (+ auto-skip questionnaire).
 * Does not change Edge pipeline mechanics.
 */
import * as assessmentApi from '../assessmentApi'
import {
  runBoardEditContinue,
  runBoardEditPlan,
  type InterviewEditPhase,
  type InterviewEditResult,
  type InterviewEditStreamHandlers,
  type InterviewEditTagMeta,
} from '../interviewEditApi'
import {
  composeGenerateDebug,
  composeGenerateError,
  composeGenerateVerbose,
  composeGenerateWarn,
  logComposePlannerAndTimers,
  replyMarkdownFromEditResult,
  summarizeEditResult,
  summarizePlanSnapshotCompact,
} from './composeGenerateDebug'
import { logBoardTurnDebug } from './vurexBoardTurnDiag'

export type ComposeBlankSlateProgress = {
  onPhase?: (phase: InterviewEditPhase) => void
  onTag?: (label: string, meta?: InterviewEditTagMeta) => void
  onEditRunId?: (editRunId: string) => void
}

function dumpComposeGenerateDiag(
  userMessage: string,
  result: InterviewEditResult | null,
  error?: unknown,
): void {
  try {
    if (result && composeGenerateVerbose()) {
      logComposePlannerAndTimers('edit:planner+timers', result)
    }
    logBoardTurnDebug({
      source: 'compose-generate',
      userMessage,
      replyMarkdown: replyMarkdownFromEditResult(result) || (error ? '(error — see PART 1 ERROR)' : '(no reply)'),
      thinkText: '',
      result,
      error,
    })
  } catch (diagErr) {
    composeGenerateWarn('edit:diag-dump-failed', diagErr)
  }
}

/**
 * Plan turn; if the Edge asks a questionnaire, continue with skipped=true once.
 */
export async function runComposeBlankSlateEdit(input: {
  accountId: string
  briefId: string
  userMessage: string
  signal?: AbortSignal
  progress?: ComposeBlankSlateProgress
}): Promise<InterviewEditResult> {
  let capturedEditRunId: string | null = null

  composeGenerateDebug('edit:start', {
    accountId: input.accountId,
    briefId: input.briefId,
    messageChars: input.userMessage.length,
    ...(composeGenerateVerbose()
      ? { messagePreview: input.userMessage.slice(0, 240) }
      : {}),
  })

  const handlers: InterviewEditStreamHandlers = {
    onPhase: (phase) => {
      composeGenerateDebug('edit:phase', phase)
      input.progress?.onPhase?.(phase)
    },
    onTag: (label, meta) => {
      if (composeGenerateVerbose()) composeGenerateDebug('edit:tag', { label, ...meta })
      input.progress?.onTag?.(label, meta)
    },
    onPlanSnapshot: (snapshot) => {
      if (!composeGenerateVerbose()) return
      composeGenerateDebug('edit:plan_snapshot', summarizePlanSnapshotCompact(snapshot as Record<string, unknown>))
      if (Array.isArray(snapshot.packages)) {
        for (const row of snapshot.packages as Array<Record<string, unknown>>) {
          composeGenerateDebug(
            'edit:planner:pkg',
            `${row.packageId} [${row.kind}] limitMinutes=${row.limitMinutes ?? '—'} ${
              row.titleHint ? `“${String(row.titleHint).slice(0, 40)}”` : ''
            }\n  ${String(row.briefPreview ?? '').slice(0, 280)}`,
          )
        }
      }
      if (snapshot.planningNotes) {
        composeGenerateDebug('edit:planningNotes', snapshot.planningNotes)
      }
      if (Array.isArray(snapshot.guardDrops) && snapshot.guardDrops.length) {
        composeGenerateDebug('edit:guardDrops', snapshot.guardDrops.slice(0, 24))
      }
      if (Array.isArray(snapshot.timerFacts) && snapshot.timerFacts.length) {
        composeGenerateDebug('edit:timerFacts', snapshot.timerFacts)
      }
    },
    onQuestionnaire: (q) => {
      composeGenerateDebug('edit:questionnaire', {
        title: q.title,
        questionCount: q.questions?.length ?? 0,
        editRunId: q.editRunId,
        deadlineAt: q.deadlineAt,
      })
      if (q.editRunId) {
        capturedEditRunId = q.editRunId
        input.progress?.onEditRunId?.(q.editRunId)
      }
    },
    onError: (err) => {
      composeGenerateError('edit:stream-error', err)
    },
    onDone: (result) => {
      composeGenerateDebug('edit:done-event', summarizeEditResult(result))
      if (result.editRunId) {
        capturedEditRunId = result.editRunId
        input.progress?.onEditRunId?.(result.editRunId)
      }
    },
  }

  let first: InterviewEditResult
  try {
    first = await runBoardEditPlan({
      accountId: input.accountId,
      briefId: input.briefId,
      userMessage: input.userMessage,
      signal: input.signal,
      handlers,
    })
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      ((err as { name?: string }).name === 'AbortError' ||
        (err as { code?: number }).code === 20)
    ) {
      composeGenerateWarn('edit:plan-aborted', {
        name: (err as { name?: string }).name,
        message: (err as { message?: string }).message,
      })
    } else {
      composeGenerateError('edit:plan-failed', err)
      dumpComposeGenerateDiag(input.userMessage, null, err)
    }
    throw err
  }

  composeGenerateDebug('edit:plan-result', summarizeEditResult(first))

  const awaiting =
    Boolean(first.meta && (first.meta as { await?: unknown }).await) ||
    (Boolean(first.editRunId) && !first.body)

  if (!awaiting) {
    dumpComposeGenerateDiag(input.userMessage, first)
    return first
  }

  const editRunId = first.editRunId ?? capturedEditRunId
  if (!editRunId) {
    composeGenerateWarn('edit:awaiting-but-no-editRunId', summarizeEditResult(first))
    dumpComposeGenerateDiag(input.userMessage, first)
    return first
  }

  composeGenerateDebug('edit:continue-skip-questionnaire', { editRunId })
  input.progress?.onEditRunId?.(editRunId)

  try {
    const continued = await runBoardEditContinue({
      accountId: input.accountId,
      briefId: input.briefId,
      editRunId,
      skipped: true,
      signal: input.signal,
      handlers: {
        onPhase: (phase) => {
          composeGenerateDebug('edit:continue-phase', phase)
          input.progress?.onPhase?.(phase)
        },
        onTag: (label, meta) => {
          if (composeGenerateVerbose()) composeGenerateDebug('edit:continue-tag', { label, ...meta })
          input.progress?.onTag?.(label, meta)
        },
        onError: (err) => {
          composeGenerateError('edit:continue-stream-error', err)
        },
        onDone: (result) => {
          composeGenerateDebug('edit:continue-done-event', summarizeEditResult(result))
          if (result.editRunId) input.progress?.onEditRunId?.(result.editRunId)
        },
      },
    })
    composeGenerateDebug('edit:continue-result', summarizeEditResult(continued))
    dumpComposeGenerateDiag(input.userMessage, continued)
    return continued
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      ((err as { name?: string }).name === 'AbortError' ||
        (err as { code?: number }).code === 20)
    ) {
      composeGenerateWarn('edit:continue-aborted', {
        name: (err as { name?: string }).name,
        message: (err as { message?: string }).message,
      })
    } else {
      composeGenerateError('edit:continue-failed', err)
      dumpComposeGenerateDiag(input.userMessage, null, err)
    }
    throw err
  }
}

/** Best-effort cooperative cancel for an in-flight board edit run. */
export async function cancelComposeBlankSlateEdit(
  briefId: string,
  editRunId?: string | null,
): Promise<void> {
  composeGenerateDebug('edit:cancel', { briefId, editRunId: editRunId ?? null })
  try {
    await assessmentApi.boardEditCancel(briefId, editRunId ?? undefined)
  } catch (err) {
    composeGenerateWarn('edit:cancel-rpc-failed', err)
    /* abort already kills the fetch */
  }
}
