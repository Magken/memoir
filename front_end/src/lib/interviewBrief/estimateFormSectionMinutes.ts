import type { TestFormDocument, TestFormQuestionKind } from '../testForm/types'

/** Soft minutes contributed by each form question kind (auto section estimate). */
const FORM_QUESTION_MINUTE_WEIGHTS: Record<TestFormQuestionKind, number> = {
  short_text: 1,
  essay: 3,
  mcq_single: 1,
  mcq_multi: 1.25,
  dropdown: 0.75,
  fill_blank: 1,
  ordinal: 1,
  ordinal_grid: 1.5,
}

/** Derive section minutes from the form’s questions (ceil, min 1). */
export function estimateFormSectionMinutes(document: TestFormDocument): number {
  if (!document.questions.length) return 1
  const raw = document.questions.reduce((sum, q) => {
    return sum + (FORM_QUESTION_MINUTE_WEIGHTS[q.kind] ?? 1)
  }, 0)
  return Math.max(1, Math.ceil(raw))
}
