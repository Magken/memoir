/**
 * Form take-mode capture adapter — responses only, never answerKey / scores.
 */
import type { TestFormDocument, TestFormResponses } from '../../../testForm/types'
import { looksLikePaste, pasteActionDetails, spliceDiff } from '../splice'
import { routeSittingPaste } from '../../sittingPolicy/clipboardRoute'
import type { Checkpoint, EditorCaptureAdapter, EditorTapeActionName, EditorTapePatch } from '../types'

export type FormCheckpoint = {
  title: string
  responses: TestFormResponses
}

function asResponses(value: unknown): TestFormResponses {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as TestFormResponses
}

function cloneResponses(responses: TestFormResponses): TestFormResponses {
  return JSON.parse(JSON.stringify(responses)) as TestFormResponses
}

function responsePlainText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.map((v) => responsePlainText(v)).filter(Boolean).join('\n')
  }
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>
    if (typeof rec.value === 'string') return rec.value
    if (typeof rec.text === 'string') return rec.text
    if (rec.blanks && typeof rec.blanks === 'object') return responsePlainText(rec.blanks)
    if (rec.values && typeof rec.values === 'object') return responsePlainText(rec.values)
    return Object.values(rec)
      .map((v) => responsePlainText(v))
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

export const formCaptureAdapter: EditorCaptureAdapter<TestFormDocument> = {
  kind: 'form',
  sanitize(live) {
    const title = typeof live?.title === 'string' ? live.title : ''
    const responses = cloneResponses(live?.attempt?.responses ?? {})
    return { title, responses } satisfies FormCheckpoint
  },
  diff(prev, next) {
    const before = asResponses(prev.responses)
    const after = asResponses(next.responses)
    const patches: EditorTapePatch[] = []
    const ids = new Set([...Object.keys(before), ...Object.keys(after)])
    for (const questionId of ids) {
      const a = JSON.stringify(before[questionId] ?? null)
      const b = JSON.stringify(after[questionId] ?? null)
      if (a === b) continue
      patches.push({
        op: 'set_response',
        questionId,
        value: after[questionId] ?? null,
      })
    }
    if (String(prev.title ?? '') !== String(next.title ?? '')) {
      patches.push({ op: 'set_title', title: String(next.title ?? '') })
    }
    return patches
  },
  inferActions(prev, next) {
    const actions: Array<{ action: EditorTapeActionName; detail?: Record<string, unknown> }> = []
    const before = asResponses(prev.responses)
    const after = asResponses(next.responses)
    for (const questionId of Object.keys(after)) {
      const splice = spliceDiff(responsePlainText(before[questionId]), responsePlainText(after[questionId]))
      if (splice && looksLikePaste(splice)) {
        const detail = pasteActionDetails(splice, responsePlainText(after[questionId]).length, {
          questionId,
        })
        actions.push({ action: 'paste', detail })
        const route = routeSittingPaste(splice.text, 'form')
        actions.push({
          action: 'paste_route',
          detail: {
            ...detail,
            from: route.from,
            srcSurface: route.srcSurface,
            destSurface: route.destSurface,
            label: route.label,
          },
        })
      }
    }
    return actions
  },
  apply(checkpoint, patch) {
    const next: Checkpoint = {
      title: String(checkpoint.title ?? ''),
      responses: cloneResponses(asResponses(checkpoint.responses)),
    }
    if (patch.op === 'set_title') {
      next.title = String(patch.title ?? '')
      return next
    }
    if (patch.op === 'set_response') {
      const questionId = String(patch.questionId ?? '')
      const responses = asResponses(next.responses)
      if (!questionId) return next
      if (patch.value == null) delete responses[questionId]
      else responses[questionId] = patch.value as TestFormResponses[string]
      next.responses = responses
    }
    return next
  },
}
