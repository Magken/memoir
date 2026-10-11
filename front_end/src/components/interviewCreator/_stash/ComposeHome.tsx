import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  ArrowLeft,
  Ban,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Code2,
  FileText,
  ListTree,
  MessageCircle,
  PackageCheck,
  Sparkles,
  Wand2,
  type LucideIcon,
} from 'lucide-react'
import { DataUpload } from '../../DataUpload'
import { Field } from '../../Field'
import { Modal } from '../../Modal'
import { InterviewPersonaEditor } from '../../InterviewPersonaEditor'
import { Tag } from '../../Tag'
import { Tooltip } from '../../Tooltip'
import { VurifyMenuButton } from '../../VurifyMenuButton'
import { VurifyCountInput } from '../../VurifyCountInput'
import { VurifyDateInput } from '../../VurifyDateInput'
import { VurifyInput } from '../../VurifyInput'
import { VurifySelect } from '../../VurifySelect'
import {
  composeMetaKey,
  INTERVIEW_ROLE_CATEGORY_OPTIONS,
  matchInterviewPersonaTemplateId,
  type InterviewComposeMeta,
  type InterviewComposeSession,
} from '../../../lib/interviewBrief'
import { extractPdfText } from '../../../lib/cvApi'
import { enrichInterviewDescriptionStream } from '../../../lib/interviewEnrichApi'
import { compareIsoDateStrings, isValidIsoDate } from '../../../lib/forms/dateTimePicker'
import { validators, type ValidationRule } from '../../../lib/forms/formValidation'
import { useFormFieldValidation } from '../../../hooks/useFormFieldValidation'

function revokeBlobUrl(url: string | null | undefined) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
}

const TITLE_RULES: ValidationRule[] = [
  validators.required('Interview title is required'),
  validators.minLength(2, 'Title must be at least 2 characters'),
]
const ROLE_RULES: ValidationRule[] = [
  validators.required('Role title is required'),
  validators.minLength(2, 'Role must be at least 2 characters'),
]
const CATEGORY_RULES: ValidationRule[] = [
  validators.required('Category is required'),
]
const MAX_INTERVIEWS_RULES: ValidationRule[] = [
  validators.required('Max interviews is required'),
  validators.positiveInteger('Enter a positive whole number'),
]
const PROPOSED_MINUTES_RULES: ValidationRule[] = [
  validators.required('Proposed minutes is required'),
  validators.positiveInteger('Enter a positive whole number'),
]
const OPENS_AT_RULES: ValidationRule[] = [validators.date()]
const DESCRIPTION_MAX_WORDS = 2500
const DESCRIPTION_MIN_CHARS = 40
const DESCRIPTION_RULES: ValidationRule[] = [
  validators.required('Role description is required'),
  validators.minLength(
    DESCRIPTION_MIN_CHARS,
    `Add at least ${DESCRIPTION_MIN_CHARS} characters so generation has enough context`,
  ),
  validators.maxWords(
    DESCRIPTION_MAX_WORDS,
    `Keep the description under ${DESCRIPTION_MAX_WORDS} words`,
  ),
]
const ROLE_PDF_MAX_BYTES = 15 * 1024 * 1024
const COVER_MAX_BYTES = 5 * 1024 * 1024
function closesAtRules(opensAt: string): ValidationRule[] {
  return [
    validators.date(),
    validators.custom((value) => {
      const closes = value.trim()
      const opens = opensAt.trim()
      if (!closes || !opens) return true
      if (!isValidIsoDate(closes) || !isValidIsoDate(opens)) return true
      const cmp = compareIsoDateStrings(opens, closes)
      return cmp === null || cmp <= 0
    }, 'Close date must be on or after open date'),
  ]
}

/** Human labels for required compose gaps (open/close dates stay optional). */
function composeMetaMissingLabels(meta: InterviewComposeMeta): string[] {
  const missing: string[] = []
  if (meta.title.trim().length < 2) missing.push('Interview title')
  if (meta.roleTitle.trim().length < 2) missing.push('Role title')
  if (meta.category.trim().length < 1) missing.push('Category')
  if (meta.description.trim().length < DESCRIPTION_MIN_CHARS) {
    missing.push(`Description (${DESCRIPTION_MIN_CHARS}+ characters)`)
  }
  if (!/^[1-9]\d*$/.test(meta.maxInterviews.trim())) missing.push('Max interviews')
  if (!/^[1-9]\d*$/.test(meta.proposedMinutes.trim())) missing.push('Proposed minutes')
  if (meta.opensAt.trim() && !isValidIsoDate(meta.opensAt.trim())) {
    missing.push('Valid open date')
  }
  if (meta.closesAt.trim() && !isValidIsoDate(meta.closesAt.trim())) {
    missing.push('Valid close date')
  }
  if (meta.opensAt.trim() && meta.closesAt.trim()) {
    const cmp = compareIsoDateStrings(meta.opensAt.trim(), meta.closesAt.trim())
    if (cmp !== null && cmp > 0) missing.push('Close date on or after open')
  }
  return missing
}

type ComposeFieldKind = 'text' | 'date' | 'count' | 'area'

type ComposeFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  rules?: readonly ValidationRule[]
  kind?: ComposeFieldKind
  name?: string
  required?: boolean
  forceSubmit: number
  autoFocus?: boolean
  min?: number
  max?: number
  rows?: number
  disabled?: boolean
  placeholder?: string
  /** Area only — footer strip under the textarea (e.g. Enrich). */
  trailing?: ReactNode
}

function ComposeVurifyField({
  label,
  value,
  onChange,
  rules = [],
  kind = 'text',
  name,
  required,
  forceSubmit,
  autoFocus,
  min,
  max,
  rows = 6,
  disabled,
  placeholder,
  trailing,
}: ComposeFieldProps) {
  const { error, onBlur, notifyChange, markSubmitted } = useFormFieldValidation({
    value,
    rules,
    validateOn: ['blur', 'change', 'submit'],
    showSuccessWhenValid: false,
  })

  useEffect(() => {
    if (forceSubmit > 0) markSubmitted()
  }, [forceSubmit, markSubmitted])

  const handleValueChange = (next: string) => {
    notifyChange()
    onChange(next)
  }

  return (
    <Field error={error} className="theme-interview-creator__compose-field">
      {kind === 'date' ? (
        <VurifyDateInput
          label={label}
          name={name}
          value={value}
          required={required}
          autoFocus={autoFocus}
          onValueChange={handleValueChange}
          onBlur={onBlur}
          className="theme-interview-creator__compose-input"
        />
      ) : kind === 'count' ? (
        <VurifyCountInput
          label={label}
          name={name}
          value={value}
          required={required}
          autoFocus={autoFocus}
          min={min}
          max={max}
          onValueChange={handleValueChange}
          onBlur={onBlur}
          className="theme-interview-creator__compose-input"
        />
      ) : kind === 'area' ? (
        <VurifyInput
          label={label}
          name={name}
          variant="area"
          rows={rows}
          value={value}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          trailing={trailing}
          onChange={(event) => {
            notifyChange()
            onChange(event.target.value)
          }}
          onBlur={onBlur}
          className="theme-interview-creator__compose-input theme-interview-creator__compose-input--area"
        />
      ) : (
        <VurifyInput
          label={label}
          name={name}
          type="text"
          value={value}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => {
            notifyChange()
            onChange(event.target.value)
          }}
          onBlur={onBlur}
          className="theme-interview-creator__compose-input"
        />
      )}
    </Field>
  )
}

type ComposeGenerationTag = {
  id: string
  label: string
  kind?: string
}

function iconForComposeGenerationTag(tag: ComposeGenerationTag): LucideIcon {
  const kind = (tag.kind ?? '').toLowerCase()
  if (kind === 'meta') return Bot
  if (kind === 'talk') return MessageCircle
  if (kind === 'form') return ClipboardList
  if (kind === 'coding') return Code2
  if (kind === 'doc') return FileText
  if (kind === 'rollup') return PackageCheck

  const label = tag.label.toLowerCase()
  if (label.includes('plan')) return ListTree
  if (label.includes('generat')) return Sparkles
  if (label.includes('check')) return ClipboardCheck
  if (label.includes('final')) return CheckCircle2
  return Sparkles
}

export function ComposeHome({
  session,
  onSessionChange,
  onGenerateInterview,
  onStopGenerate,
  onBack,
  onOpenBuilder,
  generating,
  openingBuilder,
  leaving,
  composeError,
  generationTags,
  hasPlan,
}: {
  session: InterviewComposeSession
  onSessionChange: (next: InterviewComposeSession) => void
  onGenerateInterview: (
    next: InterviewComposeSession,
    opts?: { regenerate?: boolean },
  ) => void
  onStopGenerate: () => void
  onBack: () => void
  onOpenBuilder: () => void
  generating: boolean
  openingBuilder?: boolean
  leaving?: boolean
  composeError?: string | null
  generationTags?: ComposeGenerationTag[]
  hasPlan?: boolean
}) {
  const [forceSubmit, setForceSubmit] = useState(0)
  const [enriching, setEnriching] = useState(false)
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const enrichAbortRef = useRef<AbortController | null>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session
  const meta = session.meta
  const planReady = Boolean(hasPlan)

  const patchMeta = useCallback(
    (patch: Partial<InterviewComposeMeta>) => {
      const s = sessionRef.current
      const next = {
        ...s,
        meta: { ...s.meta, ...patch },
      }
      sessionRef.current = next
      onSessionChange(next)
    },
    [onSessionChange],
  )

  useEffect(() => {
    return () => {
      enrichAbortRef.current?.abort()
    }
  }, [])

  const runEnrich = useCallback(async () => {
    const skeletal = sessionRef.current.meta.description.trim()
    if (skeletal.length < DESCRIPTION_MIN_CHARS || generating || enriching || leaving) return
    enrichAbortRef.current?.abort()
    const abort = new AbortController()
    enrichAbortRef.current = abort
    const snapshot = sessionRef.current.meta.description
    const liveMeta = sessionRef.current.meta
    setEnrichError(null)
    setEnriching(true)
    patchMeta({ description: '' })
    let accumulated = ''
    try {
      let rolePdfText: string | null = null
      if (sessionRef.current.rolePdfFile) {
        try {
          const pdfText = await extractPdfText(sessionRef.current.rolePdfFile)
          if (pdfText.text.trim()) rolePdfText = pdfText.text.trim()
        } catch {
          /* description alone may still be enough */
        }
      }
      const result = await enrichInterviewDescriptionStream({
        skeletalText: skeletal,
        meta: liveMeta,
        rolePdfText,
        signal: abort.signal,
        handlers: {
          onTextDelta: (text) => {
            accumulated += text
            patchMeta({ description: accumulated })
          },
        },
      })
      patchMeta({ description: result.enrichedText || accumulated || snapshot })
    } catch (e) {
      if (abort.signal.aborted) return
      patchMeta({ description: snapshot })
      setEnrichError(e instanceof Error ? e.message : 'Enrich failed')
    } finally {
      if (enrichAbortRef.current === abort) enrichAbortRef.current = null
      setEnriching(false)
    }
  }, [enriching, generating, leaving, patchMeta])

  const missingLabels = useMemo(() => composeMetaMissingLabels(meta), [meta])
  const metaValid = missingLabels.length === 0
  const missingSummary =
    missingLabels.length > 0 ? `Missing: ${missingLabels.join(' · ')}` : null

  const canEnrich = meta.description.trim().length >= DESCRIPTION_MIN_CHARS

  const commitGenerate = useCallback(
    (regenerate: boolean) => {
      onGenerateInterview(
        {
          ...sessionRef.current,
          meta: sessionRef.current.meta,
          generatedAt: new Date().toISOString(),
          seededMetaKey: composeMetaKey(sessionRef.current.meta),
        },
        { regenerate },
      )
    },
    [onGenerateInterview],
  )

  const runGenerate = useCallback(() => {
    setForceSubmit((n) => n + 1)
    if (!metaValid || enriching || generating) return
    if (planReady) {
      setRegenerateOpen(true)
      return
    }
    commitGenerate(false)
  }, [commitGenerate, enriching, generating, metaValid, planReady])

  return (
    <div className="theme-interview-creator__compose">
      <Modal
        open={regenerateOpen}
        title="Regenerate this interview?"
        onClose={() => setRegenerateOpen(false)}
        onConfirm={() => {
          setRegenerateOpen(false)
          commitGenerate(true)
        }}
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        size="md"
        placement="viewport"
        cardVariant="vurify-outlined"
        footerStyle="vurify"
        footerDivider
        scrollRail="hidden"
        closeOnBackdrop={false}
        className="page-scene--interview__leave-dialog"
      >
        <div className="page-scene--interview__leave-body">
          <p className="type-caption type-muted mb-0">
            Replaces the current interview plan.
          </p>
          <p className="type-body-sm mb-0">
            A new board will be generated from your compose notes. The previous plan
            is discarded. If generation fails, tap Regenerate again to retry.
          </p>
        </div>
      </Modal>
      <header className="theme-interview-creator__compose-header" data-dash-anim>
        <h2 className="type-display-md mb-0 theme-interview-creator__compose-title">
          {session.mode === 'edit' ? 'Edit interview' : 'New interview'}
        </h2>
        <div className="theme-interview-creator__compose-divider" aria-hidden />
        <div className="theme-interview-creator__compose-header-actions">
          <VurifyMenuButton
            type="button"
            variant="label"
            size="md"
            housing
            activeChrome={false}
            icon={ArrowLeft}
            iconPosition="left"
            lineTone="muted"
            onClick={onBack}
            disabled={enriching || leaving}
            loading={leaving}
          >
            Back
          </VurifyMenuButton>
        </div>
      </header>

      <form
        className="theme-interview-creator__compose-form"
        data-dash-anim
        onSubmit={(event) => {
          event.preventDefault()
          runGenerate()
        }}
      >
        <section className="theme-interview-creator__compose-section" aria-labelledby="compose-role">
          <div className="theme-interview-creator__compose-section-head">
            <h3 id="compose-role" className="mb-0 theme-interview-creator__compose-section-heading">
              What this interview is for?
            </h3>
            <div className="theme-interview-creator__compose-section-rule" role="presentation" />
          </div>
          <div className="theme-interview-creator__compose-choices">
            <div className="theme-interview-creator__compose-brief-row">
              <div className="theme-interview-creator__compose-brief-main">
                <div className="theme-interview-creator__compose-grid theme-interview-creator__compose-grid--titles">
                  <ComposeVurifyField
                    label="Interview title"
                    name="interview-title"
                    value={meta.title}
                    onChange={(title) => patchMeta({ title })}
                    rules={TITLE_RULES}
                    required
                    forceSubmit={forceSubmit}
                    autoFocus
                  />
                  <ComposeVurifyField
                    label="Role title"
                    name="role-title"
                    value={meta.roleTitle}
                    onChange={(roleTitle) => patchMeta({ roleTitle })}
                    rules={ROLE_RULES}
                    required
                    forceSubmit={forceSubmit}
                  />
                </div>
                <div className="theme-interview-creator__compose-audience">
                  <InterviewPersonaEditor
                    namePrefix="compose-persona"
                    className="theme-interview-creator__compose-persona-editor"
                    disabled={enriching || generating || leaving}
                    value={{
                      name: meta.personaName,
                      voice: meta.personaVoice,
                      behaviourPrompt: meta.personaBehaviour,
                    }}
                    onChange={(persona) =>
                      patchMeta({
                        personaName: persona.name,
                        personaVoice: persona.voice,
                        personaBehaviour: persona.behaviourPrompt,
                        personaTemplateId:
                          matchInterviewPersonaTemplateId(persona) ?? '',
                      })
                    }
                  />
                  <div className="theme-interview-creator__compose-candidate">
                    <div className="theme-interview-creator__compose-candidate-head">
                      <h4
                        id="compose-candidate"
                        className="mb-0 theme-interview-creator__compose-candidate-title"
                      >
                        What candidates see
                      </h4>
                      <p className="type-caption type-muted mb-0 theme-interview-creator__compose-candidate-lede">
                        Front-facing intro shown before they start — not your private role notes.
                      </p>
                    </div>
                    <div className="theme-interview-creator__compose-description-host">
                      <ComposeVurifyField
                        label="Candidate intro"
                        name="candidate-description"
                        kind="area"
                        rows={5}
                        value={meta.candidateDescription}
                        onChange={(candidateDescription) =>
                          patchMeta({ candidateDescription })
                        }
                        forceSubmit={forceSubmit}
                        disabled={enriching || generating || leaving}
                        placeholder="Welcome them and set expectations for this interview…"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="theme-interview-creator__compose-brief-rule"
                aria-hidden
              />
              <div className="theme-interview-creator__compose-upload">
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
                  value={session.coverFile ? [session.coverFile] : []}
                  onValueChange={(files) => {
                    const file = files[0] ?? null
                    revokeBlobUrl(session.coverUrl)
                    if (file) {
                      onSessionChange({
                        ...session,
                        coverFile: file,
                        coverDirty: true,
                        coverUrl: URL.createObjectURL(file),
                        meta: {
                          ...session.meta,
                          coverName: file.name,
                        },
                      })
                      return
                    }
                    onSessionChange({
                      ...session,
                      coverFile: null,
                      coverDirty: true,
                      coverUrl: null,
                      meta: {
                        ...session.meta,
                        coverName: '',
                      },
                    })
                  }}
                  validateOn="change"
                  className="theme-interview-creator__compose-cover-upload"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="theme-interview-creator__compose-section" aria-labelledby="compose-window">
          <div className="theme-interview-creator__compose-section-head">
            <h3 id="compose-window" className="mb-0 theme-interview-creator__compose-section-heading">
              Capacity and open dates?
            </h3>
            <div className="theme-interview-creator__compose-section-rule" role="presentation" />
          </div>
          <div className="theme-interview-creator__compose-grid">
            <ComposeVurifyField
              label="Max interviews before close"
              name="max-interviews"
              kind="count"
              value={meta.maxInterviews}
              onChange={(maxInterviews) => patchMeta({ maxInterviews })}
              rules={MAX_INTERVIEWS_RULES}
              required
              min={1}
              max={9999}
              forceSubmit={forceSubmit}
            />
            <ComposeVurifyField
              label="Proposed minutes"
              name="proposed-minutes"
              kind="count"
              value={meta.proposedMinutes}
              onChange={(proposedMinutes) => patchMeta({ proposedMinutes })}
              rules={PROPOSED_MINUTES_RULES}
              required
              min={1}
              max={600}
              forceSubmit={forceSubmit}
            />
            <ComposeVurifyField
              label="Opens"
              name="opens-at"
              kind="date"
              value={meta.opensAt}
              onChange={(opensAt) => patchMeta({ opensAt })}
              rules={OPENS_AT_RULES}
              forceSubmit={forceSubmit}
            />
            <ComposeVurifyField
              label="Closes"
              name="closes-at"
              kind="date"
              value={meta.closesAt}
              onChange={(closesAt) => patchMeta({ closesAt })}
              rules={closesAtRules(meta.opensAt)}
              forceSubmit={forceSubmit}
            />
          </div>
        </section>

        <section className="theme-interview-creator__compose-section" aria-labelledby="compose-brief">
          <div className="theme-interview-creator__compose-section-head">
            <h3 id="compose-brief" className="mb-0 theme-interview-creator__compose-section-heading">
              Category and role brief?
            </h3>
            <div className="theme-interview-creator__compose-section-rule" role="presentation" />
          </div>
          <div className="theme-interview-creator__compose-choices">
            <div className="theme-interview-creator__compose-brief-row">
              <div className="theme-interview-creator__compose-brief-main">
                <div className="theme-interview-creator__compose-field theme-interview-creator__compose-category">
                  <VurifySelect
                    label="Category"
                    name="category"
                    options={INTERVIEW_ROLE_CATEGORY_OPTIONS}
                    value={meta.category}
                    onChange={(category) => patchMeta({ category })}
                    rules={CATEGORY_RULES}
                    required
                    forceSubmit={forceSubmit}
                    placeholder="Type to filter categories…"
                    className="theme-interview-creator__compose-input"
                  />
                </div>
                <div className="theme-interview-creator__compose-description-host">
                  <ComposeVurifyField
                    label="Interview description"
                    name="interview-description"
                    kind="area"
                    rows={10}
                    value={meta.description}
                    onChange={(description) => patchMeta({ description })}
                    rules={DESCRIPTION_RULES}
                    required
                    forceSubmit={forceSubmit}
                    disabled={enriching}
                    trailing={
                      <VurifyMenuButton
                        type="button"
                        variant="label"
                        size="sm"
                        lineTone="accent"
                        icon={Wand2}
                        iconPosition="right"
                        loading={enriching}
                        disabled={!canEnrich || generating || enriching || leaving}
                        aria-label="Enrich interview description"
                        onClick={() => {
                          void runEnrich()
                        }}
                      >
                        Enrich
                      </VurifyMenuButton>
                    }
                  />
                </div>
              </div>
              <div
                className="theme-interview-creator__compose-brief-rule"
                aria-hidden
              />
              <div className="theme-interview-creator__compose-upload">
                <DataUpload
                  label="Role description PDF"
                  hint="Optional · one PDF · 15 MB"
                  accept="application/pdf,.pdf"
                  maxFiles={1}
                  maxFileSize={ROLE_PDF_MAX_BYTES}
                  size="sm"
                  preview="pdf"
                  listScroll={false}
                  value={session.rolePdfFile ? [session.rolePdfFile] : []}
                  onValueChange={(files) => {
                    const file = files[0] ?? null
                    if (file) {
                      onSessionChange({
                        ...session,
                        rolePdfFile: file,
                        rolePdfDirty: true,
                        // Keep prior Drive id so persist can soft-delete before replace.
                        rolePdfUrl: null,
                        meta: {
                          ...session.meta,
                          rolePdfName: file.name,
                        },
                      })
                      return
                    }
                    onSessionChange({
                      ...session,
                      rolePdfFile: null,
                      rolePdfDirty: true,
                      rolePdfUrl: null,
                      meta: {
                        ...session.meta,
                        rolePdfName: '',
                      },
                    })
                  }}
                  validateOn="change"
                  className="theme-interview-creator__compose-data-upload"
                />
              </div>
            </div>
          </div>
        </section>

        <footer className="theme-interview-creator__compose-footer">
          <div className="theme-interview-creator__compose-footer-primary">
            <div className="theme-interview-creator__compose-footer-hint">
              {composeError ? (
                <p
                  className="theme-interview-creator__compose-footer-status type-caption type-error mb-0"
                  role="alert"
                >
                  {composeError}
                </p>
              ) : enrichError ? (
                <p
                  className="theme-interview-creator__compose-footer-status type-caption type-error mb-0"
                  role="alert"
                >
                  {enrichError}
                </p>
              ) : generating && generationTags && generationTags.length > 0 ? (
                <div
                  className="theme-interview-creator__compose-gen-tags theme-tag-group"
                  role="status"
                  aria-live="polite"
                >
                  {generationTags.map((tag) => {
                    const Icon = iconForComposeGenerationTag(tag)
                    return (
                      <Tag
                        key={tag.id}
                        size="sm"
                        className="theme-interview-creator__compose-gen-tag"
                      >
                        <Icon
                          className="theme-interview-creator__compose-gen-tag-icon size-3 shrink-0"
                          aria-hidden
                        />
                        <span>{tag.label}</span>
                      </Tag>
                    )
                  })}
                </div>
              ) : missingSummary ? (
                <p
                  className="theme-interview-creator__compose-footer-status type-caption type-error mb-0"
                  role="status"
                >
                  {missingSummary}
                </p>
              ) : null}
            </div>
            <div className="theme-interview-creator__compose-footer-actions">
              {planReady ? (
                metaValid ? (
                  <VurifyMenuButton
                    variant="label"
                    size="md"
                    housing
                    activeChrome={false}
                    lineTone="complement"
                    type="button"
                    onClick={onOpenBuilder}
                    disabled={generating || enriching || openingBuilder || !session.serverBriefId}
                    loading={openingBuilder}
                  >
                    Open Editor
                  </VurifyMenuButton>
                ) : (
                  <Tooltip content={missingSummary ?? 'Complete required fields'}>
                    <span className="theme-interview-creator__compose-footer-action">
                      <VurifyMenuButton
                        variant="label"
                        size="md"
                        housing
                        activeChrome={false}
                        lineTone="complement"
                        type="button"
                        onClick={onOpenBuilder}
                        disabled
                        loading={openingBuilder}
                      >
                        Open Editor
                      </VurifyMenuButton>
                    </span>
                  </Tooltip>
                )
              ) : null}
              {planReady ? (
                <div className="theme-interview-creator__compose-footer-divider" aria-hidden />
              ) : null}
              {metaValid ? (
                generating ? (
                  <VurifyMenuButton
                    variant="label"
                    size="md"
                    housing
                    activeChrome={false}
                    lineTone="muted"
                    type="button"
                    icon={Ban}
                    iconPosition="right"
                    busyChrome
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onStopGenerate()
                    }}
                    aria-label="Stop generating"
                  >
                    Stop
                  </VurifyMenuButton>
                ) : (
                  <VurifyMenuButton
                    variant="label"
                    size="md"
                    housing
                    activeChrome={false}
                    lineTone="accent"
                    type="button"
                    disabled={enriching}
                    onClick={runGenerate}
                  >
                    {planReady ? 'Regenerate' : 'Generate interview'}
                  </VurifyMenuButton>
                )
              ) : (
                <Tooltip content={missingSummary ?? 'Complete required fields'}>
                  <span className="theme-interview-creator__compose-footer-action">
                    <VurifyMenuButton
                      variant="label"
                      size="md"
                      housing
                      activeChrome={false}
                      lineTone="accent"
                      type="button"
                      disabled
                    >
                      {planReady ? 'Regenerate' : 'Generate interview'}
                    </VurifyMenuButton>
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
        </footer>
      </form>
    </div>
  )
}
