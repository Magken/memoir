import { LayoutList, Wand2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { extractPdfText } from '../lib/cvApi'
import { CREATOR_OVERVIEW_SECTION_ID } from '../lib/interviewBrief/creatorOverviewTags'
import type { InterviewFlowTimelineBrief } from '../lib/interviewBrief/flowTimelineTypes'
import { INTERVIEW_ROLE_CATEGORY_OPTIONS } from '../lib/interviewBrief/roleCategories'
import { enrichInterviewDescriptionStream } from '../lib/interviewEnrichApi'
import { DataUpload } from './DataUpload'
import { InterviewPersonaEditor } from './InterviewPersonaEditor'
import { VurifyCountInput } from './VurifyCountInput'
import { VurifyDateInput } from './VurifyDateInput'
import { VurifyInput } from './VurifyInput'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifySelect } from './VurifySelect'

const ROLE_PDF_MAX_BYTES = 15 * 1024 * 1024
const COVER_MAX_BYTES = 5 * 1024 * 1024
const DESCRIPTION_MIN_CHARS = 40

export type CreatorOverviewChangePatch = {
  title?: string
  roleTitle?: string
  roleDescription?: string
  candidateDescription?: string
  persona?: { name: string; voice: string; behaviourPrompt?: string }
  category?: string
  proposedMinutes?: string
  maxInterviews?: string
  opensAt?: string
  closesAt?: string
}

type InterviewFlowCreatorOverviewSectionProps = {
  brief: InterviewFlowTimelineBrief
  onChange?: (patch: CreatorOverviewChangePatch) => void
  coverFile?: File | null
  rolePdfFile?: File | null
  onCoverFileChange?: (file: File | null) => void
  onRolePdfFileChange?: (file: File | null) => void
  className?: string
}

function SubSectionHead({ title }: { title: string }) {
  return (
    <div className="theme-interview-flow-templates-section__subhead">
      <p className="type-label mb-0">{title}</p>
      <div className="theme-interview-flow-form__guide-rule" role="presentation" />
    </div>
  )
}

function Pair({ children }: { children: ReactNode }) {
  return <div className="theme-interview-creator__compose-pair">{children}</div>
}

function AreaField({
  hint,
  children,
}: {
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="theme-interview-creator__compose-area">
      {hint ? <p className="type-caption type-faint mb-0">{hint}</p> : null}
      {children}
    </div>
  )
}

/**
 * Creator-2 housing Overview — compose identity, window, candidate intro,
 * interview description + uploads. Always visible on the day row (not an
 * edit-stage). One column of paired fields. Not result Overview.
 */
export function InterviewFlowCreatorOverviewSection({
  brief,
  onChange,
  coverFile = null,
  rolePdfFile = null,
  onCoverFileChange,
  onRolePdfFileChange,
  className = '',
}: InterviewFlowCreatorOverviewSectionProps) {
  const [enriching, setEnriching] = useState(false)
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const enrichAbortRef = useRef<AbortController | null>(null)
  const editable = Boolean(onChange)
  const description = brief.roleDescription ?? ''
  const canEnrich = editable && description.trim().length >= DESCRIPTION_MIN_CHARS

  useEffect(() => {
    return () => {
      enrichAbortRef.current?.abort()
    }
  }, [])

  const runEnrich = useCallback(async () => {
    if (!onChange || enriching) return
    const skeletal = (brief.roleDescription ?? '').trim()
    if (skeletal.length < DESCRIPTION_MIN_CHARS) return
    enrichAbortRef.current?.abort()
    const abort = new AbortController()
    enrichAbortRef.current = abort
    const snapshot = brief.roleDescription ?? ''
    setEnrichError(null)
    setEnriching(true)
    onChange({ roleDescription: '' })
    let accumulated = ''
    try {
      let pdfText: string | null = null
      if (rolePdfFile) {
        try {
          const extracted = await extractPdfText(rolePdfFile)
          if (extracted.text.trim()) pdfText = extracted.text.trim()
        } catch {
          /* description alone may still be enough */
        }
      }
      const result = await enrichInterviewDescriptionStream({
        skeletalText: skeletal,
        meta: {
          title: brief.title,
          roleTitle: brief.roleTitle,
          category: brief.category ?? '',
          proposedMinutes:
            brief.proposedMinutes && brief.proposedMinutes > 0
              ? String(brief.proposedMinutes)
              : '',
          description: skeletal,
        },
        rolePdfText: pdfText,
        signal: abort.signal,
        handlers: {
          onTextDelta: (text) => {
            accumulated += text
            onChange({ roleDescription: accumulated })
          },
        },
      })
      onChange({ roleDescription: result.enrichedText || accumulated || snapshot })
    } catch (e) {
      if (abort.signal.aborted) return
      onChange({ roleDescription: snapshot })
      setEnrichError(e instanceof Error ? e.message : 'Enrich failed')
    } finally {
      if (enrichAbortRef.current === abort) enrichAbortRef.current = null
      setEnriching(false)
    }
  }, [
    brief.category,
    brief.proposedMinutes,
    brief.roleDescription,
    brief.roleTitle,
    brief.title,
    enriching,
    onChange,
    rolePdfFile,
  ])

  return (
    <div
      className={[
        'theme-interview-flow-creator-overview',
        'theme-interview-flow-section',
        'is-expanded',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-section-id={CREATOR_OVERVIEW_SECTION_ID}
    >
      <div className="theme-interview-flow-section__main min-w-0">
        <div className="theme-interview-creator__compose-brief-row">
          <div className="theme-interview-creator__compose-brief-main">
            <Pair>
              <div data-history-focus="title">
                <VurifyInput
                  label="Interview title"
                  value={brief.title}
                  disabled={!editable || enriching}
                  onChange={(e) => onChange?.({ title: e.target.value })}
                />
              </div>
              <div data-history-focus="roleTitle">
                <VurifyInput
                  label="Role"
                  value={brief.roleTitle}
                  disabled={!editable || enriching}
                  onChange={(e) => onChange?.({ roleTitle: e.target.value })}
                />
              </div>
            </Pair>
            <Pair>
              <div data-history-focus="category">
                <VurifySelect
                  label="Category"
                  variant="search"
                  disabled={!editable || enriching}
                  value={brief.category ?? ''}
                  options={[...INTERVIEW_ROLE_CATEGORY_OPTIONS]}
                  onChange={(category) => onChange?.({ category })}
                />
              </div>
            </Pair>

            <SubSectionHead title="Persona" />
            {editable ? (
              <InterviewPersonaEditor
                namePrefix="overview-persona"
                size="sm"
                layout="compact"
                disabled={enriching}
                value={{
                  name: brief.personaName ?? '',
                  voice: brief.personaVoice ?? '',
                  behaviourPrompt: brief.behaviourPrompt ?? '',
                }}
                onChange={(persona) =>
                  onChange?.({
                    persona: {
                      name: persona.name,
                      voice: persona.voice,
                      behaviourPrompt: persona.behaviourPrompt,
                    },
                  })
                }
              />
            ) : brief.personaName ? (
              <p className="type-body-sm type-muted mb-0">
                Interviewer <span className="type-label">{brief.personaName}</span>
                {brief.personaVoice ? (
                  <span className="type-faint"> · {brief.personaVoice}</span>
                ) : null}
              </p>
            ) : null}

            <SubSectionHead title="Window" />
            <Pair>
              <VurifyCountInput
                label="Proposed minutes"
                min={1}
                disabled={!editable || enriching}
                value={
                  brief.proposedMinutes > 0 ? String(brief.proposedMinutes) : ''
                }
                onValueChange={(proposedMinutes) =>
                  onChange?.({ proposedMinutes })
                }
              />
              <VurifyCountInput
                label="Max interviews"
                min={1}
                disabled={!editable || enriching}
                value={
                  brief.maxInterviews != null && brief.maxInterviews > 0
                    ? String(brief.maxInterviews)
                    : ''
                }
                onValueChange={(maxInterviews) => onChange?.({ maxInterviews })}
              />
            </Pair>
            <Pair>
              <div data-history-focus="opensAt">
                <VurifyDateInput
                  label="Opens"
                  disabled={!editable || enriching}
                  value={brief.opensAt ? brief.opensAt.slice(0, 10) : ''}
                  onValueChange={(opensAt) => onChange?.({ opensAt })}
                />
              </div>
              <div data-history-focus="closesAt">
                <VurifyDateInput
                  label="Closes"
                  disabled={!editable || enriching}
                  value={brief.closesAt ? brief.closesAt.slice(0, 10) : ''}
                  onValueChange={(closesAt) => onChange?.({ closesAt })}
                />
              </div>
            </Pair>

            <SubSectionHead title="What candidates see" />
            <Pair>
              <AreaField hint="Shown before they start — not your interview description.">
                <div data-history-focus="candidateDescription">
                  <VurifyInput
                    label="Candidate intro"
                    variant="area"
                    size="sm"
                    rows={5}
                    disabled={!editable || enriching}
                    value={brief.candidateDescription ?? ''}
                    onChange={(e) =>
                      onChange?.({ candidateDescription: e.target.value })
                    }
                    placeholder="Welcome them and set expectations for this interview…"
                  />
                </div>
              </AreaField>
              <AreaField hint="Your notes for building this interview. Candidates do not see this.">
                <div
                  className="theme-interview-creator__compose-area-stack"
                  data-history-focus="roleDescription"
                >
                  <VurifyInput
                    label="Interview description"
                    variant="area"
                    size="sm"
                    rows={5}
                    disabled={!editable || enriching}
                    value={description}
                    onChange={(e) =>
                      onChange?.({ roleDescription: e.target.value })
                    }
                  />
                  {editable ? (
                    <VurifyMenuButton
                      type="button"
                      variant="label"
                      size="sm"
                      lineTone="accent"
                      icon={Wand2}
                      iconPosition="right"
                      loading={enriching}
                      disabled={!canEnrich || enriching}
                      aria-label="Enrich interview description"
                      onClick={() => {
                        void runEnrich()
                      }}
                    >
                      Enrich
                    </VurifyMenuButton>
                  ) : null}
                  {enrichError ? (
                    <p className="type-caption type-error mb-0" role="alert">
                      {enrichError}
                    </p>
                  ) : null}
                </div>
              </AreaField>
            </Pair>

            <Pair>
              <DataUpload
                label="Interview thumbnail"
                hint="Optional · one image · 5 MB · list cover"
                accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
                maxFiles={1}
                maxFileSize={COVER_MAX_BYTES}
                size="sm"
                layout="rows"
                preview="rows"
                listScroll={false}
                disabled={!onCoverFileChange}
                value={coverFile ? [coverFile] : []}
                onValueChange={(files) => {
                  onCoverFileChange?.(files[0] ?? null)
                }}
                validateOn="change"
                className="theme-interview-creator__compose-data-upload"
              />
              <DataUpload
                label="Role description PDF"
                hint="Optional · one PDF · 15 MB"
                accept="application/pdf,.pdf"
                maxFiles={1}
                maxFileSize={ROLE_PDF_MAX_BYTES}
                size="sm"
                layout="rows"
                preview="pdf"
                listScroll={false}
                disabled={!onRolePdfFileChange}
                value={rolePdfFile ? [rolePdfFile] : []}
                onValueChange={(files) => {
                  onRolePdfFileChange?.(files[0] ?? null)
                }}
                validateOn="change"
                className="theme-interview-creator__compose-data-upload"
              />
            </Pair>
          </div>
        </div>
      </div>
    </div>
  )
}

export function InterviewFlowCreatorOverviewSectionHead() {
  return (
    <>
      <div className="theme-interview-flow-timeline__meta type-caption type-muted">
        <LayoutList className="size-3.5 shrink-0" aria-hidden />
        <span>Interview</span>
      </div>
      <h3 className="theme-interview-flow-timeline__title type-display-md">Overview</h3>
      <p className="theme-interview-flow-timeline__body type-body type-muted">
        Fill this in so Vurex can match the role. Candidates only see the intro.
      </p>
    </>
  )
}
