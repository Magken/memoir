import type {
  TestFormAnswerKey,
  TestFormAnswerKeyEntry,
  TestFormAttempt,
  TestFormDocument,
  TestFormQuestion,
  TestFormQuestionScore,
  TestFormResponseValue,
  TestFormResponses,
} from './types'
import { emptyResponseForQuestion } from './types'

/** Drop answer key for candidate / take payloads. */
export function stripAnswerKey(doc: TestFormDocument): TestFormDocument {
  const { answerKey: _key, ...rest } = doc
  return {
    ...rest,
    attempt: rest.attempt
      ? {
          ...rest.attempt,
          scores: undefined,
          totalEarned: undefined,
          totalMax: undefined,
        }
      : undefined,
  }
}

export function hasAnswerKey(doc: TestFormDocument): boolean {
  return Boolean(doc.answerKey && Object.keys(doc.answerKey).length > 0)
}

function normalizeText(value: string, caseSensitive?: boolean): string {
  const trimmed = value.trim()
  return caseSensitive ? trimmed : trimmed.toLowerCase()
}

function hitsRejectList(actual: string, rejects: string[] | undefined, caseSensitive?: boolean): boolean {
  if (!rejects || rejects.length === 0) return false
  const needle = normalizeText(actual, caseSensitive)
  return rejects.some((r) => {
    const trimmed = r.trim()
    if (!trimmed) return false
    return normalizeText(trimmed, caseSensitive) === needle
  })
}

function scoreShortText(
  key: Extract<TestFormAnswerKeyEntry, { kind: 'short_text' }>,
  response: Extract<TestFormResponseValue, { kind: 'short_text' }>,
  max: number,
): Pick<TestFormQuestionScore, 'earned' | 'correct' | 'notes' | 'auto'> {
  const actual = response.value ?? ''
  const expected = key.value ?? ''
  if (!expected.trim()) {
    return { earned: 0, correct: false, auto: false, notes: 'No answer key' }
  }
  if (hitsRejectList(actual, key.rejects, key.caseSensitive)) {
    return { earned: 0, correct: false, auto: true, notes: 'Matched a reject answer' }
  }
  let ok = false
  try {
    if (key.match === 'exact') {
      ok = normalizeText(actual, key.caseSensitive) === normalizeText(expected, key.caseSensitive)
    } else if (key.match === 'contains') {
      ok = normalizeText(actual, key.caseSensitive).includes(
        normalizeText(expected, key.caseSensitive),
      )
    } else {
      const flags = key.caseSensitive ? '' : 'i'
      ok = new RegExp(expected, flags).test(actual)
    }
  } catch {
    return { earned: 0, correct: false, auto: false, notes: 'Invalid regex in answer key' }
  }
  return { earned: ok ? max : 0, correct: ok, auto: true }
}

function scoreEssay(
  key: Extract<TestFormAnswerKeyEntry, { kind: 'essay' }>,
  response: Extract<TestFormResponseValue, { kind: 'essay' }>,
  max: number,
): Pick<TestFormQuestionScore, 'earned' | 'correct' | 'notes' | 'auto'> {
  const keywords = (key.keywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean)
  if (keywords.length === 0) {
    return {
      earned: 0,
      correct: undefined,
      auto: false,
      notes: key.rubricNotes?.trim() || 'Manual review',
    }
  }
  const body = (response.value ?? '').toLowerCase()
  const hits = keywords.filter((k) => body.includes(k)).length
  const ratio = hits / keywords.length
  const earned = Math.round(ratio * max * 100) / 100
  return {
    earned,
    correct: ratio >= 1,
    auto: true,
    notes: `${hits}/${keywords.length} keywords`,
  }
}

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

function scoreQuestion(
  question: TestFormQuestion,
  key: TestFormAnswerKeyEntry | undefined,
  response: TestFormResponseValue | undefined,
): TestFormQuestionScore {
  const max = typeof question.points === 'number' && question.points > 0 ? question.points : 1
  if (!key || key.kind !== question.kind) {
    return {
      questionId: question.id,
      earned: 0,
      max: 0,
      auto: false,
      status: 'ungraded',
      notes: 'Missing or mismatched answer key',
    }
  }
  if (!response || response.kind !== question.kind) {
    return {
      questionId: question.id,
      earned: 0,
      max,
      auto: true,
      correct: false,
      status: 'graded',
      notes: 'No response',
    }
  }

  switch (key.kind) {
    case 'short_text': {
      const scored = scoreShortText(
        key,
        response as Extract<TestFormResponseValue, { kind: 'short_text' }>,
        max,
      )
      if (scored.notes === 'No answer key') {
        return { questionId: question.id, max: 0, earned: 0, auto: false, status: 'ungraded', notes: scored.notes }
      }
      return { questionId: question.id, max, status: 'graded', ...scored }
    }
    case 'essay': {
      const keywords = (key.keywords ?? []).map((k) => k.trim()).filter(Boolean)
      if (keywords.length === 0) {
        return {
          questionId: question.id,
          max: 0,
          earned: 0,
          auto: false,
          status: 'ungraded',
          notes: key.rubricNotes?.trim() || 'Manual review',
        }
      }
      const scored = scoreEssay(
        key,
        response as Extract<TestFormResponseValue, { kind: 'essay' }>,
        max,
      )
      return { questionId: question.id, max, status: 'graded', ...scored }
    }
    case 'mcq_single': {
      if (key.optionId == null || key.optionId === '') {
        return {
          questionId: question.id,
          earned: 0,
          max: 0,
          auto: false,
          status: 'ungraded',
          notes: 'No answer key',
        }
      }
      const optionId = (response as Extract<TestFormResponseValue, { kind: 'mcq_single' }>).optionId
      const ok = optionId != null && optionId === key.optionId
      return {
        questionId: question.id,
        max,
        earned: ok ? max : 0,
        correct: ok,
        auto: true,
        status: 'graded',
      }
    }
    case 'mcq_multi': {
      if (!key.optionIds?.length) {
        return {
          questionId: question.id,
          earned: 0,
          max: 0,
          auto: false,
          status: 'ungraded',
          notes: 'No answer key',
        }
      }
      const optionIds = (response as Extract<TestFormResponseValue, { kind: 'mcq_multi' }>).optionIds
      const ok = sameIdSet(optionIds, key.optionIds)
      return {
        questionId: question.id,
        max,
        earned: ok ? max : 0,
        correct: ok,
        auto: true,
        status: 'graded',
      }
    }
    case 'fill_blank': {
      const blanks = (response as Extract<TestFormResponseValue, { kind: 'fill_blank' }>).blanks
      const ids = Object.keys(key.blanks)
      if (ids.length === 0) {
        return {
          questionId: question.id,
          max: 0,
          earned: 0,
          auto: false,
          status: 'ungraded',
          notes: 'No blank key',
        }
      }
      let hits = 0
      for (const id of ids) {
        const accepted = (key.blanks[id] ?? []).map((v) => v.trim().toLowerCase()).filter(Boolean)
        const rejected = (key.rejects?.[id] ?? []).map((v) => v.trim().toLowerCase()).filter(Boolean)
        const actual = (blanks[id] ?? '').trim().toLowerCase()
        if (rejected.includes(actual)) continue
        if (accepted.length === 0 || accepted.includes(actual)) hits += 1
      }
      const ratio = hits / ids.length
      return {
        questionId: question.id,
        max,
        earned: Math.round(ratio * max * 100) / 100,
        correct: ratio >= 1,
        auto: true,
        status: 'graded',
        notes: `${hits}/${ids.length} blanks`,
      }
    }
    case 'ordinal': {
      const value = (response as Extract<TestFormResponseValue, { kind: 'ordinal' }>).value
      const hasExact = typeof key.exact === 'number'
      const hasRange = typeof key.min === 'number' || typeof key.max === 'number'
      if (!hasExact && !hasRange) {
        return {
          questionId: question.id,
          earned: 0,
          max: 0,
          auto: false,
          status: 'ungraded',
          notes: 'No answer key',
        }
      }
      if (value == null || !Number.isFinite(value)) {
        return {
          questionId: question.id,
          max,
          earned: 0,
          correct: false,
          auto: true,
          status: 'graded',
        }
      }
      if (hasExact) {
        const ok = value === key.exact
        return {
          questionId: question.id,
          max,
          earned: ok ? max : 0,
          correct: ok,
          auto: true,
          status: 'graded',
        }
      }
      const lo = typeof key.min === 'number' ? key.min : -Infinity
      const hi = typeof key.max === 'number' ? key.max : Infinity
      const ok = value >= lo && value <= hi
      return {
        questionId: question.id,
        max,
        earned: ok ? max : 0,
        correct: ok,
        auto: true,
        status: 'graded',
      }
    }
    case 'dropdown': {
      if (key.optionId == null || key.optionId === '') {
        return {
          questionId: question.id,
          earned: 0,
          max: 0,
          auto: false,
          status: 'ungraded',
          notes: 'No answer key',
        }
      }
      const optionId = (response as Extract<TestFormResponseValue, { kind: 'dropdown' }>).optionId
      const ok = optionId != null && optionId === key.optionId
      return {
        questionId: question.id,
        max,
        earned: ok ? max : 0,
        correct: ok,
        auto: true,
        status: 'graded',
      }
    }
    case 'ordinal_grid': {
      const values = (response as Extract<TestFormResponseValue, { kind: 'ordinal_grid' }>).values
      const expected = key.expected ?? {}
      const ids = Object.keys(expected).filter((id) => Boolean(expected[id]))
      if (ids.length === 0) {
        return {
          questionId: question.id,
          max: 0,
          earned: 0,
          auto: false,
          status: 'ungraded',
          notes: key.rubricNotes?.trim() || 'Manual review',
        }
      }
      let hits = 0
      for (const id of ids) {
        if (values[id] === expected[id]) hits += 1
      }
      const ratio = hits / ids.length
      return {
        questionId: question.id,
        max,
        earned: Math.round(ratio * max * 100) / 100,
        correct: ratio >= 1,
        auto: true,
        status: 'graded',
        notes: `${hits}/${ids.length} rows`,
      }
    }
  }
}

/** Score attempt responses against the answer key; returns a new document with attempt.scores. */
export function scoreAttempt(doc: TestFormDocument): TestFormDocument {
  const key: TestFormAnswerKey = doc.answerKey ?? {}
  const responses: TestFormResponses = doc.attempt?.responses ?? {}
  const scores = doc.questions.map((q) =>
    scoreQuestion(q, key[q.id], responses[q.id] ?? emptyResponseForQuestion(q)),
  )
  const graded = scores.filter((s) => s.status !== 'ungraded')
  const totalEarned = graded.reduce((sum, s) => sum + s.earned, 0)
  const totalMax = graded.reduce((sum, s) => sum + s.max, 0)
  const attempt: TestFormAttempt = {
    ...(doc.attempt ?? { responses }),
    responses,
    submittedAt: doc.attempt?.submittedAt ?? new Date().toISOString(),
    scores,
    totalEarned,
    totalMax,
  }
  return { ...doc, attempt }
}

export function mergeAttemptResponses(
  doc: TestFormDocument,
  responses: TestFormResponses,
): TestFormDocument {
  return {
    ...doc,
    attempt: {
      ...(doc.attempt ?? {}),
      responses,
      startedAt: doc.attempt?.startedAt ?? new Date().toISOString(),
      scores: undefined,
      totalEarned: undefined,
      totalMax: undefined,
    },
  }
}

export function clearAttempt(doc: TestFormDocument): TestFormDocument {
  const { attempt: _a, ...rest } = doc
  return rest
}
