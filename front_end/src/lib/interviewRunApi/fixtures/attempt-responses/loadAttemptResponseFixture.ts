/**
 * Load captured InterviewResponse attempt fixtures for Soft Decision / Verify plug-in.
 */
import type { InterviewResponse } from '../../talkTypes'
import { scoreAttempt, type AttemptScorePackage } from '../../scoreAttempt'
import type { TalkVerifyTalkSectionsFile } from '../../talkVerifyModal'
import type { EditorTapesPack } from '../../editorCapture/types'

export const TALK_VERIFY_ATTEMPT_FIXTURE_ID = '2026-08-12-42f8ea34'

type FixtureModule = {
  default: Omit<InterviewResponse, 'schemaVersion'> & { schemaVersion: number }
}
type SectionsModule = { default: TalkVerifyTalkSectionsFile }
type TapesModule = { default: EditorTapesPack }

const FIXTURE_LOADERS: Record<string, () => Promise<FixtureModule>> = {
  [TALK_VERIFY_ATTEMPT_FIXTURE_ID]: () =>
    import('./2026-08-12-42f8ea34/interview-response.json') as unknown as Promise<FixtureModule>,
}

const SECTION_LOADERS: Record<string, () => Promise<SectionsModule>> = {
  [TALK_VERIFY_ATTEMPT_FIXTURE_ID]: () =>
    import('./2026-08-12-42f8ea34/talk-sections.json'),
}

const TAPE_LOADERS: Record<string, () => Promise<TapesModule>> = {
  [TALK_VERIFY_ATTEMPT_FIXTURE_ID]: () =>
    import('./2026-08-12-42f8ea34/editor-tapes.json') as unknown as Promise<TapesModule>,
}

export async function loadAttemptResponseFixture(
  fixtureId: string = TALK_VERIFY_ATTEMPT_FIXTURE_ID,
): Promise<{
  response: InterviewResponse
  scored: AttemptScorePackage
  talkSectionsMeta: TalkVerifyTalkSectionsFile | null
  editorTapes: EditorTapesPack | null
}> {
  const load = FIXTURE_LOADERS[fixtureId]
  if (!load) throw new Error(`unknown_attempt_fixture:${fixtureId}`)
  const mod = await load()
  const response = mod.default as InterviewResponse
  const scored = scoreAttempt({
    brief: {
      phases: [],
      analysis: {
        rollup: {
          weights: {
            formMark: 'gate_only',
            codingTests: 0.25,
            codingMethod: 0.1,
            essay: 0.15,
            interviewDelivery: 0.2,
            interviewContent: 0.3,
          },
        },
      },
    },
    response,
  })

  let talkSectionsMeta: TalkVerifyTalkSectionsFile | null = null
  const loadSections = SECTION_LOADERS[fixtureId]
  if (loadSections) {
    try {
      const sectionsMod = await loadSections()
      talkSectionsMeta = sectionsMod.default
    } catch {
      talkSectionsMeta = null
    }
  }

  let editorTapes: EditorTapesPack | null = null
  const loadTapes = TAPE_LOADERS[fixtureId]
  if (loadTapes) {
    try {
      const tapesMod = await loadTapes()
      editorTapes = tapesMod.default
    } catch {
      editorTapes = null
    }
  }

  return { response, scored, talkSectionsMeta, editorTapes }
}
