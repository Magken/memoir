/**
 * Candidate-visible view of a bound earlier section (full artifact, not RAG digest).
 * No answerKey / hidden cases / reference solutions.
 */
import type { CodeEditorPayload, DocEditorPayload } from '../editorContext/types'
import { CODING_LANGUAGE_IDS } from '../interviewBrief/codingLanguages'
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { stripAnswerKey } from '../testForm/scoring'
import type { TestFormDocument } from '../testForm/types'
import { loadEditorTape } from './editorCapture/store'
import {
  codingPayloadFromCheckpoint,
  overlayCodingMount,
  overlayDocMount,
  overlayFormDocument,
} from './editorCapture/overlay'
import type { EditorTape } from './editorCapture/types'
import { getInterviewResponse } from './interviewResponse'
import {
  indexReferencedStages,
  referencedPhaseIdsFromBrief,
  type ReferencedStageIndex,
} from './referencedEvidence'
import { resolveGateToolMount, type GateToolMount } from './resolveGateToolMount'
import type { InterviewResponse } from './talkTypes'

export type ReferencedCodingRunTests = Extract<
  GateToolMount,
  { kind: 'coding' }
>['runTests']

export type ReferencedWorkKind = ReferencedStageIndex['kind']

export type ReferencedTalkTurn = {
  role: 'assistant' | 'candidate'
  text: string
}

export type ReferencedWorkView = {
  phaseId: string
  title: string
  kind: ReferencedWorkKind
  empty: boolean
  talkTurns: ReferencedTalkTurn[]
  formDocument: TestFormDocument | null
  codingWorkspace: CodeEditorPayload | null
  codingLanguages: string[]
  codingRunTests: ReferencedCodingRunTests | null
  codingTape: EditorTape | null
  docDocument: DocEditorPayload | null
}

function formHasResponses(doc: TestFormDocument | null): boolean {
  const responses = doc?.attempt?.responses
  if (!responses || typeof responses !== 'object') return false
  return Object.values(responses).some((value) => {
    if (value == null) return false
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.length > 0
      return Object.keys(value).length > 0
    }
    return true
  })
}

function codingHasFiles(workspace: CodeEditorPayload | null): boolean {
  return Boolean(workspace?.files?.some((f) => String(f.path ?? '').trim()))
}

function docHasBody(document: DocEditorPayload | null): boolean {
  return Boolean(document?.markdown?.trim())
}

export function buildReferencedWorkViews(input: {
  brief: Creator2BriefDocument
  briefId: string
  consumingPhaseId: string
  response?: InterviewResponse | null
  loadTape?: (briefId: string, phaseId: string) => EditorTape | null
}): ReferencedWorkView[] {
  const phaseIds = referencedPhaseIdsFromBrief(input.brief, input.consumingPhaseId)
  if (!phaseIds.length) return []
  const response = input.response ?? getInterviewResponse(input.briefId)
  const index = indexReferencedStages(input.brief, phaseIds, response)
  const loadTape = input.loadTape ?? loadEditorTape
  const out: ReferencedWorkView[] = []

  for (const row of index) {
    const tape = loadTape(input.briefId, row.phaseId)
    const talkTurns: ReferencedTalkTurn[] = response.messages
      .filter(
        (m) =>
          m.phaseId === row.phaseId &&
          (m.role === 'assistant' || m.role === 'candidate') &&
          m.text.trim(),
      )
      .map((m) => ({
        role: m.role as 'assistant' | 'candidate',
        text: m.text.trim(),
      }))

    let formDocument: TestFormDocument | null = null
    let codingWorkspace: CodeEditorPayload | null = null
    let codingLanguages: string[] = []
    let codingRunTests: ReferencedCodingRunTests | null = null
    let codingTape: EditorTape | null = null
    let docDocument: DocEditorPayload | null = null

    if (row.kind === 'form' || row.kind === 'coding' || row.kind === 'doc') {
      let mount = null as ReturnType<typeof resolveGateToolMount>
      try {
        mount = resolveGateToolMount({ brief: input.brief, phaseId: row.phaseId })
      } catch {
        mount = null
      }
      if (mount?.kind === 'form') {
        formDocument = stripAnswerKey(overlayFormDocument(mount.document, tape))
      } else if (mount?.kind === 'coding') {
        const next = overlayCodingMount(mount, tape)
        codingWorkspace = next.workspace
        codingLanguages = next.languages.length
          ? next.languages
          : [...CODING_LANGUAGE_IDS]
        codingRunTests = next.runTests
        codingTape = tape?.kind === 'coding' ? tape : null
      } else if (tape?.kind === 'coding') {
        const fromTape = codingPayloadFromCheckpoint(tape.final)
        if (fromTape.files.length) {
          codingWorkspace = fromTape
          codingLanguages = [...CODING_LANGUAGE_IDS]
          codingRunTests = {
            runner: 'hidden_cases_v1',
            entryPoint: 'solve',
            cases: [],
          }
          codingTape = tape
        }
      } else if (mount?.kind === 'doc') {
        const next = overlayDocMount(mount, tape)
        docDocument = next.document
      }
    }

    const empty =
      row.kind === 'talk'
        ? talkTurns.length === 0
        : row.kind === 'form'
          ? !formHasResponses(formDocument)
          : row.kind === 'coding'
            ? !tape || !codingHasFiles(codingWorkspace)
            : row.kind === 'doc'
              ? !tape || !docHasBody(docDocument)
              : true

    out.push({
      phaseId: row.phaseId,
      title: row.title,
      kind: row.kind,
      empty,
      talkTurns,
      formDocument,
      codingWorkspace,
      codingLanguages,
      codingRunTests,
      codingTape,
      docDocument,
    })
  }

  return out
}
