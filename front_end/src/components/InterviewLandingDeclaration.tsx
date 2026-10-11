import { useEffect, useMemo, useState } from 'react'
import { VurifyInput } from './VurifyInput'
import { QuestionTake } from './testFormParts/QuestionTake'
import {
  getInterviewResponse,
  saveInterviewResponse,
} from '../lib/interviewRunApi/interviewResponse'
import {
  DECLARE_FORM_COPY,
  DECLARE_Q_CONDITIONS,
  DECLARE_Q_LOOK,
  DECLARE_Q_MODE,
  DECLARE_Q_NOTES,
  SITTING_CONDITION_OPTIONS,
  SITTING_HELP_OPTIONS,
  emptySittingDeclaration,
  isSittingDeclaration,
  sittingDeclareMode,
  sittingDeclarationReady,
  sittingDeclarationBlockHint,
  stampSittingDeclaration,
  type SittingConditionId,
  type SittingDeclaration,
  type SittingHelpId,
} from '../lib/interviewRunApi/sittingDeclaration'
import type {
  TestFormQuestion,
  TestFormResponseValue,
  TestFormResponses,
} from '../lib/testForm'

type InterviewLandingDeclarationProps = {
  briefId: string
  onReadyChange?: (ready: boolean) => void
  onBlockHintChange?: (hint: string | null) => void
  debug?: boolean
}

const MODE_QUESTION: TestFormQuestion = {
  id: DECLARE_Q_MODE,
  kind: 'mcq_single',
  prompt: DECLARE_FORM_COPY.mode.prompt,
  description: DECLARE_FORM_COPY.mode.description,
  hint: DECLARE_FORM_COPY.mode.hint,
  required: true,
  options: DECLARE_FORM_COPY.mode.options.map((row) => ({
    id: row.id,
    label: row.label,
  })),
}

const CONDITION_QUESTION: TestFormQuestion = {
  id: DECLARE_Q_CONDITIONS,
  kind: 'mcq_multi',
  prompt: DECLARE_FORM_COPY.conditions.prompt,
  description: DECLARE_FORM_COPY.conditions.description,
  hint: DECLARE_FORM_COPY.conditions.hint,
  required: true,
  options: SITTING_CONDITION_OPTIONS.map((row) => ({
    id: row.id,
    label: row.label,
  })),
}

const LOOK_QUESTION: TestFormQuestion = {
  id: DECLARE_Q_LOOK,
  kind: 'mcq_multi',
  prompt: DECLARE_FORM_COPY.look.prompt,
  description: DECLARE_FORM_COPY.look.description,
  hint: DECLARE_FORM_COPY.look.hint,
  options: SITTING_HELP_OPTIONS.map((row) => ({
    id: row.id,
    label: row.label,
  })),
}

const NOTES_QUESTION: TestFormQuestion = {
  id: DECLARE_Q_NOTES,
  kind: 'essay',
  prompt: DECLARE_FORM_COPY.notes.prompt,
  description: DECLARE_FORM_COPY.notes.description,
  hint: DECLARE_FORM_COPY.notes.hint,
}

function persist(briefId: string, prev: SittingDeclaration, patch: Partial<SittingDeclaration>): SittingDeclaration {
  const stamped = stampSittingDeclaration(prev, patch)
  const doc = getInterviewResponse(briefId)
  saveInterviewResponse({ ...doc, sittingDeclaration: stamped })
  return stamped
}

export function sittingDeclarationFormResponses(doc: SittingDeclaration): TestFormResponses {
  const mode = sittingDeclareMode(doc)
  return {
    [DECLARE_Q_MODE]: { kind: 'mcq_single', optionId: mode },
    [DECLARE_Q_CONDITIONS]: {
      kind: 'mcq_multi',
      optionIds: mode === 'named' ? [...doc.conditions] : [],
    },
    [DECLARE_Q_LOOK]: { kind: 'mcq_multi', optionIds: [...doc.helps] },
    [DECLARE_Q_NOTES]: { kind: 'essay', value: doc.notes ?? '' },
  }
}

export function sittingDeclarationFormQuestions(doc: SittingDeclaration): Array<{
  question: TestFormQuestion
  number: number
  show: boolean
}> {
  const mode = sittingDeclareMode(doc)
  const named = mode === 'named'
  return [
    { question: MODE_QUESTION, number: 1, show: true },
    { question: CONDITION_QUESTION, number: 2, show: named },
    { question: { ...LOOK_QUESTION, required: named }, number: named ? 3 : 2, show: true },
    { question: NOTES_QUESTION, number: named ? 4 : 3, show: true },
  ]
}

function asConditionId(id: string): SittingConditionId | null {
  return SITTING_CONDITION_OPTIONS.some((row) => row.id === id)
    ? (id as SittingConditionId)
    : null
}

function asHelpId(id: string): SittingHelpId | null {
  return SITTING_HELP_OPTIONS.some((row) => row.id === id) ? (id as SittingHelpId) : null
}

/**
 * Optional landing support note — self-report for staff Clarity, never a diagnosis.
 * Take chrome is the shared TestForm question field (Radio / Checkbox / area).
 */
export function InterviewLandingDeclaration({
  briefId,
  onReadyChange,
  onBlockHintChange,
  debug = false,
}: InterviewLandingDeclarationProps) {
  const [doc, setDoc] = useState<SittingDeclaration>(() => emptySittingDeclaration())

  useEffect(() => {
    const existing = getInterviewResponse(briefId).sittingDeclaration
    if (isSittingDeclaration(existing)) setDoc(existing)
  }, [briefId])

  useEffect(() => {
    onReadyChange?.(sittingDeclarationReady(doc))
    onBlockHintChange?.(sittingDeclarationBlockHint(doc))
  }, [doc, onBlockHintChange, onReadyChange])

  const write = (patch: Partial<SittingDeclaration>) => {
    setDoc((prev) => persist(briefId, prev, patch))
  }

  const responses = useMemo(() => sittingDeclarationFormResponses(doc), [doc])
  const mode = sittingDeclareMode(doc)
  const named = mode === 'named'

  const patchResponse = (questionId: string, next: TestFormResponseValue) => {
    if (questionId === DECLARE_Q_MODE && next.kind === 'mcq_single') {
      const picked = next.optionId
      write({
        declareMode: picked === 'none' || picked === 'quiet' || picked === 'named' ? picked : undefined,
        nothingToDeclare: picked === 'none',
        preferNotToSay: picked === 'quiet',
        conditions: picked === 'named' ? doc.conditions : [],
        otherCondition: picked === 'named' ? doc.otherCondition : '',
      })
      return
    }
    if (questionId === DECLARE_Q_CONDITIONS && next.kind === 'mcq_multi') {
      const conditions = next.optionIds
        .map(asConditionId)
        .filter((id): id is SittingConditionId => Boolean(id))
      write({
        declareMode: 'named',
        conditions,
        nothingToDeclare: false,
        preferNotToSay: false,
        ...(conditions.includes('other') ? {} : { otherCondition: '' }),
      })
      return
    }
    if (questionId === DECLARE_Q_LOOK && next.kind === 'mcq_multi') {
      const helps = next.optionIds
        .map(asHelpId)
        .filter((id): id is SittingHelpId => Boolean(id))
      write({
        helps,
        ...(helps.includes('other') ? {} : { otherHelp: '' }),
      })
      return
    }
    if (questionId === DECLARE_Q_NOTES && next.kind === 'essay') {
      write({ notes: next.value })
    }
  }

  if (debug) {
    console.debug('[InterviewLandingDeclaration]', { briefId, doc })
  }

  const questions = sittingDeclarationFormQuestions(doc)

  return (
    <section className="theme-interview-landing__requirements" aria-label="Support note">
      <div className="theme-test-form theme-test-form--embed theme-interview-landing__declare-form">
        {questions.map((row) => {
          if (!row.show) return null
          const response = responses[row.question.id]
          if (!response) return null
          return (
            <div key={row.question.id}>
              <QuestionTake
                question={row.question}
                mode="take"
                response={response}
                onChange={(next) => patchResponse(row.question.id, next)}
                showHint
                number={row.number}
              />
              {row.question.id === DECLARE_Q_CONDITIONS &&
              doc.conditions.includes('other') &&
              named ? (
                <VurifyInput
                  size="sm"
                  label={DECLARE_FORM_COPY.otherConditionLabel}
                  value={doc.otherCondition ?? ''}
                  onChange={(e) => write({ otherCondition: e.target.value })}
                />
              ) : null}
              {row.question.id === DECLARE_Q_LOOK && doc.helps.includes('other') ? (
                <VurifyInput
                  size="sm"
                  label={DECLARE_FORM_COPY.otherHelpLabel}
                  value={doc.otherHelp ?? ''}
                  onChange={(e) => write({ otherHelp: e.target.value })}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
