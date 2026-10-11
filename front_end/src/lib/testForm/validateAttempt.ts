import {
  firstValidationMessage,
  summarizeValidationIssues,
  validateValue,
  validators,
  type ValidationRule,
} from '../forms/formValidation'
import type {
  TestFormDocument,
  TestFormQuestion,
  TestFormResponseValue,
  TestFormResponses,
  TestFormShortTextFormat,
} from './types'
import { emptyResponseForQuestion } from './types'

export type TestFormFieldIssue = {
  questionId: string
  message: string
}

export type TestFormAttemptValidation = {
  valid: boolean
  issues: TestFormFieldIssue[]
  /** Header banner copy */
  summary: string
}

/** Map short-text `inputFormat` → formValidation rules (non-empty values only). */
export function rulesForShortTextFormat(format?: TestFormShortTextFormat): ValidationRule[] {
  switch (format) {
    case 'number':
      return [
        validators.custom(
          (value) => /^-?\d+(\.\d+)?$/.test(value.trim()),
          'Enter a number only',
          'number',
        ),
      ]
    case 'email':
      return [validators.email()]
    case 'phone':
      return [validators.phone()]
    case 'date':
      return [validators.date()]
    case 'text':
    default:
      return []
  }
}

function isResponseEmpty(question: TestFormQuestion, response: TestFormResponseValue | undefined): boolean {
  const r = response && response.kind === question.kind ? response : emptyResponseForQuestion(question)
  switch (r.kind) {
    case 'short_text':
    case 'essay':
      return !r.value.trim()
    case 'mcq_single':
    case 'dropdown':
      return r.optionId == null || r.optionId === ''
    case 'mcq_multi':
      return r.optionIds.length === 0
    case 'fill_blank': {
      if (question.kind !== 'fill_blank') return true
      const blankIds = question.segments
        .filter((s): s is Extract<typeof s, { type: 'blank' }> => s.type === 'blank')
        .map((s) => s.blankId)
      if (blankIds.length === 0) return true
      return blankIds.some((id) => !(r.blanks[id] ?? '').trim())
    }
    case 'ordinal':
      return r.value == null || !Number.isFinite(r.value)
    case 'ordinal_grid': {
      if (question.kind !== 'ordinal_grid') return true
      return question.rows.some((row) => !r.values[row.id])
    }
    default:
      return true
  }
}

function formatIssueForQuestion(
  question: TestFormQuestion,
  response: TestFormResponseValue | undefined,
): string | null {
  if (question.required && isResponseEmpty(question, response)) {
    return 'This question is required'
  }

  if (question.kind === 'short_text' && response?.kind === 'short_text') {
    const value = response.value.trim()
    if (!value) return null
    const rules = rulesForShortTextFormat(question.inputFormat)
    if (rules.length === 0) return null
    const result = validateValue(value, rules)
    if (!result.valid) return firstValidationMessage(result) ?? 'Invalid answer'
  }

  if (question.kind === 'fill_blank' && response?.kind === 'fill_blank' && question.required) {
    // emptiness already covered; optional per-blank format later
  }

  return null
}

/** Gate Submit — required + short-text inputFormat via formValidation. */
export function validateAttempt(
  doc: TestFormDocument,
  responses?: TestFormResponses,
): TestFormAttemptValidation {
  const current = responses ?? doc.attempt?.responses ?? {}
  const issues: TestFormFieldIssue[] = []

  for (const question of doc.questions) {
    const response = current[question.id]
    const message = formatIssueForQuestion(question, response)
    if (message) issues.push({ questionId: question.id, message })
  }

  if (issues.length === 0) {
    return { valid: true, issues: [], summary: '' }
  }

  const requiredCount = issues.filter((i) => i.message.includes('required')).length
  const formatCount = issues.length - requiredCount
  const parts: string[] = []
  if (requiredCount > 0) {
    parts.push(
      requiredCount === 1
        ? '1 required question is empty'
        : `${requiredCount} required questions are empty`,
    )
  }
  if (formatCount > 0) {
    parts.push(
      formatCount === 1
        ? '1 answer does not match the field format'
        : `${formatCount} answers do not match the field format`,
    )
  }

  return {
    valid: false,
    issues,
    summary: summarizeValidationIssues(
      parts.map((message, index) => ({ id: `summary-${index}`, message })),
    ) || 'Check the highlighted questions before submitting',
  }
}
