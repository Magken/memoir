import { useMemo, useRef, useState } from 'react'
import { InterviewFlowTimeline } from '../InterviewFlowTimeline'
import { InterviewCreator2CatalogTable } from './InterviewCreator2CatalogTable'
import type { Creator2BriefDocument } from '../../lib/interviewBrief/creator2BriefTypes'
import type {
  InterviewFlowAnalysisShelfState,
  InterviewFlowCodingEditorState,
  InterviewFlowDocEditorState,
  InterviewFlowFormEditorState,
  InterviewFlowTalkEditorState,
  InterviewFlowWrapEditorState,
} from '../../lib/interviewBrief/flowTimelineTypes'
import {
  CREATOR2_COMPREHENSIVE_BRIEF,
  INTERVIEW_FLOW_TIMELINE_SCROLL,
} from '../../lib/interviewBrief/flowTimelineFixture'
import { mapCreator2BriefToTimeline } from '../../lib/interviewBrief/mapCreator2BriefToTimeline'
import { patchCreator2FormStep } from '../../lib/interviewBrief/patchCreator2FormStep'
import { patchCreator2CodingStep } from '../../lib/interviewBrief/patchCreator2CodingStep'
import { patchCreator2DocStep } from '../../lib/interviewBrief/patchCreator2DocStep'
import { patchCreator2TalkStep } from '../../lib/interviewBrief/patchCreator2TalkStep'
import { patchCreator2AnalysisShelf } from '../../lib/interviewBrief/patchCreator2AnalysisShelf'
import { patchCreator2Rollup } from '../../lib/interviewBrief/patchCreator2Rollup'
import { deleteCreator2Template } from '../../lib/interviewBrief/patchCreator2TemplateLibrary'
import {
  patchCreator2Spine,
  type SpineTalkOp,
} from '../../lib/interviewBrief/patchCreator2Spine'

type InterviewCreator2ShowcaseProps = {
  className?: string
}

/**
 * Theme lab — Interview Creator 2: vertical interview timeline from plan-shaped
 * interview_brief JSON. Form, talk, coding, writing, and Decision package
 * sections are editable.
 */
export function InterviewCreator2Showcase({ className = '' }: InterviewCreator2ShowcaseProps) {
  const deckRef = useRef<HTMLDivElement>(null)
  const [showJson, setShowJson] = useState(false)
  const [doc, setDoc] = useState<Creator2BriefDocument>(() =>
    structuredClone(CREATOR2_COMPREHENSIVE_BRIEF),
  )
  const brief = useMemo(() => mapCreator2BriefToTimeline(doc), [doc])

  const handleFormChange = (phaseId: string, next: InterviewFlowFormEditorState) => {
    setDoc((prev) => patchCreator2FormStep(prev, phaseId, next))
  }

  const handleTalkChange = (phaseId: string, next: InterviewFlowTalkEditorState) => {
    setDoc((prev) => patchCreator2TalkStep(prev, phaseId, next))
  }

  const handleCodingChange = (phaseId: string, next: InterviewFlowCodingEditorState) => {
    setDoc((prev) => patchCreator2CodingStep(prev, phaseId, next))
  }

  const handleDocChange = (phaseId: string, next: InterviewFlowDocEditorState) => {
    setDoc((prev) => patchCreator2DocStep(prev, phaseId, next))
  }

  const handleWrapChange = (next: InterviewFlowWrapEditorState) => {
    setDoc((prev) => patchCreator2Rollup(prev, next))
  }

  const handleAnalysisChange = (next: InterviewFlowAnalysisShelfState) => {
    setDoc((prev) => patchCreator2AnalysisShelf(prev, next).doc)
  }

  const handleDeleteTemplate = (templateId: string) => {
    setDoc((prev) => {
      const shelf = mapCreator2BriefToTimeline(prev).analysisShelf
      if (!shelf) return prev
      return deleteCreator2Template(prev, templateId, {
        libraryIds: shelf.libraryIds,
        templateMeta: shelf.templateMeta,
      }).doc
    })
  }

  const handleSpineChange = (op: SpineTalkOp) => {
    setDoc((prev) => patchCreator2Spine(prev, op))
  }

  return (
    <article
      className={[
        'theme-interview-creator-2-showcase w-full max-w-none space-y-10',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="space-y-3 prose-measure max-w-3xl">
        <p className="type-overline type-faint mb-0">Interview creator 2</p>
        <h1 className="type-display mb-0">Day as a timeline</h1>
        <p className="type-body type-muted mb-0">
          Creator 2 is a timeline port of the brief — not a second place to invent title,
          role, or description. In product, those fields inherit from the prior Dashboard
          Interview Creator stage (compose → builder), the same way{' '}
          <code className="type-code">applyComposeMetaToFlow</code> stamps meta onto the
          flow. This lab uses fixture JSON so you can still expand Form, Talk, Coding, and
          Writing; Templates stay discussion analysis only.
        </p>
        <p className="type-body-sm type-muted mb-0">
          Lab deck below mirrors the product stage: full-height scroll host. Day view keeps
          the timeline + Contents; Edit swaps to an internal editor stage (Theme-menu style);
          Collapse returns to the interview at the saved scroll anchor. Spec:{' '}
          <code className="type-code">planned/interviewer-engine.md</code>.
        </p>
      </header>

      <InterviewCreator2CatalogTable />

      <section className="w-full max-w-none space-y-3">
        <p className="type-caption type-accent mb-0">Live timeline</p>
        <p className="type-body-sm type-muted mb-0 prose-measure max-w-3xl">
          Same document the tables describe — edits patch the brief; Show JSON below stays in sync.
          Open / close sections inside the deck (not the Theme page scroll).
        </p>
        <div ref={deckRef} className="theme-interview-creator-2__deck min-w-0 w-full max-w-none">
          <InterviewFlowTimeline
            brief={brief}
            scroll={INTERVIEW_FLOW_TIMELINE_SCROLL}
            scrollerRef={deckRef}
            onFormChange={handleFormChange}
            onTalkChange={handleTalkChange}
            onCodingChange={handleCodingChange}
            onDocChange={handleDocChange}
            onWrapChange={handleWrapChange}
            onAnalysisChange={handleAnalysisChange}
            onDeleteTemplate={handleDeleteTemplate}
            onSpineChange={handleSpineChange}
          />
        </div>
      </section>

      <section className="space-y-3 max-w-3xl">
        <p className="type-caption type-accent mb-0">Source JSON</p>
        <p className="type-body-sm type-muted mb-0">
          Live brief document — form, talk, coding, and writing edits update tools / topics /
          phases here.
        </p>
        <button
          type="button"
          className="type-body-sm type-accent underline bg-transparent border-0 p-0 cursor-pointer"
          onClick={() => setShowJson((v) => !v)}
        >
          {showJson ? 'Hide JSON' : 'Show JSON'}
        </button>
        {showJson ? (
          <pre className="theme-interview-creator-2__json type-code overflow-auto max-h-[28rem] text-xs">
            {JSON.stringify(doc, null, 2)}
          </pre>
        ) : null}
      </section>
    </article>
  )
}
