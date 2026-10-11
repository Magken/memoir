import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  Clock,
  Layers,
  Play,
  RotateCcw,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { Checkbox } from './Checkbox'
import { InterviewLandingRequirements } from './InterviewLandingRequirements'
import { InterviewLandingDeclaration } from './InterviewLandingDeclaration'
import { InterviewStructureSummaryRepeater } from './InterviewStructureSummaryRepeater'
import { InterviewCodingVerifyPanel } from './InterviewCodingVerifyPanel'
import { InterviewEssayVerifyPanel } from './InterviewEssayVerifyPanel'
import { InterviewFormVerifyPanel } from './InterviewFormVerifyPanel'
import { InterviewTalkVerifyPanel } from './InterviewTalkVerifyPanel'
import { ScaleCoverModal } from './ScaleCoverModal'
import { Tag } from './Tag'
import { Tooltip } from './Tooltip'
import { VurifyMenuButton } from './VurifyMenuButton'
import { type InterviewLandingView } from '../lib/interviewBrief'
import { useGsapPageOptional } from '../lib/gsap'
import {
  getInterviewResponse,
  saveInterviewResponse,
} from '../lib/interviewRunApi/interviewResponse'
import {
  isSittingTermsAck,
  stampSittingTerms,
} from '../lib/interviewRunApi/sittingDeclaration'
import type { CodingVerifyModal } from '../lib/interviewRunApi/codingVerifyModal'
import type { EssayVerifyModal } from '../lib/interviewRunApi/essayVerifyModal'
import type { FormVerifyModal } from '../lib/interviewRunApi/formVerifyModal'
import {
  isTalkVerifySectionKey,
  resolveToolVerifyKind,
  type TalkVerifyMarkingCard,
  type TalkVerifyModal,
} from '../lib/interviewRunApi/talkVerifyModal'

function withBlockHint(node: ReactNode, hint: string | null) {
  if (!hint) return node
  return (
    <Tooltip content={hint} placement="top" trigger="both">
      {node}
    </Tooltip>
  )
}

/** Placeholder until a real interview-terms route ships. */
const INTERVIEW_TERMS_HREF = '#interview-terms'

export type InterviewLandingVerifySection = {
  sectionKey: string
  label: string
  /** Soft Decision glance line (tool sections use this in Verify instead of Talk panel). */
  summary?: string
  /** Soft Decision See more body — gaps, conflicts, dim notes. */
  summaryDetail?: string
}

export type InterviewIntakeStep = 1 | 2 | 3

export const INTERVIEW_INTAKE_STEPS: Array<{ id: InterviewIntakeStep; label: string }> = [
  { id: 1, label: 'Outline' },
  { id: 2, label: 'Checks' },
  { id: 3, label: 'Support' },
]

const INTAKE_OUT_MS = 220
const INTAKE_IN_MS = 520

type IntakePhase = 'idle' | 'out' | 'in'
type IntakeDirection = 'forward' | 'back'

type InterviewLandingProps = {
  landing: InterviewLandingView
  /** Live or fixture brief id — preflight probe + telemetry sidecar. */
  briefId: string
  /** Phase ids already passed (done on the structure list). */
  completedPhaseIds?: readonly string[]
  /** Timed stages left mid-flight (forfeited on the structure list). */
  skippedPhaseIds?: readonly string[]
  /** First-time start — gated by terms + requirements. */
  onStart?: () => void
  /** Resume an in-progress attempt. */
  onContinue?: () => void
  /** Optional terms page URL (defaults to `#interview-terms`). */
  termsHref?: string
  /** Page-owned Soft Decision Verify open section (null = closed). */
  verifySection?: InterviewLandingVerifySection | null
  onVerifySectionChange?: (next: InterviewLandingVerifySection | null) => void
  /** Page-owned modals — Landing does not load the fixture (avoids double work). */
  verifyModal?: TalkVerifyModal | null
  verifyCodingModal?: CodingVerifyModal | null
  verifyEssayModal?: EssayVerifyModal | null
  verifyFormModal?: FormVerifyModal | null
  verifyBusy?: boolean
  /** Sequential paint of transcript messages. */
  verifyRevealMessageCount?: number
  verifyShowMarkingRail?: boolean
  /** Cite / Ask Aid bridge from Assessor Aid peel. */
  verifyHighlightMessageId?: string | null
  onVerifyCiteMessage?: (messageId: string) => void
  onVerifyAskAbout?: (card: TalkVerifyMarkingCard) => void
  /** Live Check Suite shorts — Start stays off while nonempty. Fixtures omit. */
  checkWarnings?: readonly { id: string; short: string }[]
  intakeStep?: InterviewIntakeStep
  onIntakeStepChange?: (step: InterviewIntakeStep) => void
  debug?: boolean
}

type MetaTag = {
  id: string
  label: string
  icon: LucideIcon
}

function buildMetaTags(landing: InterviewLandingView): MetaTag[] {
  const tags: MetaTag[] = []
  if (landing.roleTitle) {
    tags.push({ id: 'role', label: landing.roleTitle, icon: Briefcase })
  }
  if (landing.ownerLabel) {
    tags.push({ id: 'owner', label: landing.ownerLabel, icon: Building2 })
  }
  if (landing.interviewerName) {
    tags.push({ id: 'interviewer', label: landing.interviewerName, icon: UserRound })
  }
  if (landing.estimatedMinutes != null) {
    tags.push({
      id: 'duration',
      label: `~${landing.estimatedMinutes} min`,
      icon: Clock,
    })
  }
  if (landing.sectionCount > 0) {
    tags.push({
      id: 'sections',
      label: `${landing.sectionCount} section${landing.sectionCount === 1 ? '' : 's'}`,
      icon: Layers,
    })
  }
  return tags
}

/**
 * Candidate-facing interview intro — spoiler-safe stage summary + Start/Continue.
 * Full detail structure list lives in {@link InterviewStructureDetailRepeater}.
 */
export function InterviewLanding({
  landing,
  briefId,
  completedPhaseIds = [],
  skippedPhaseIds = [],
  onStart,
  onContinue,
  termsHref = INTERVIEW_TERMS_HREF,
  verifySection = null,
  onVerifySectionChange,
  verifyModal = null,
  verifyCodingModal = null,
  verifyEssayModal = null,
  verifyFormModal = null,
  verifyBusy = false,
  verifyRevealMessageCount,
  verifyShowMarkingRail = true,
  verifyHighlightMessageId = null,
  onVerifyCiteMessage,
  onVerifyAskAbout,
  checkWarnings = [],
  intakeStep: intakeStepProp,
  onIntakeStepChange,
  debug = false,
}: InterviewLandingProps) {
  const [agreed, setAgreed] = useState(false)
  const [requirementsReady, setRequirementsReady] = useState(false)
  const [declarationReady, setDeclarationReady] = useState(false)
  const [declarationHint, setDeclarationHint] = useState<string | null>(null)
  const [, setIntakeStepLocal] = useState<InterviewIntakeStep>(1)
  const [visibleStep, setVisibleStep] = useState<InterviewIntakeStep>(
    intakeStepProp ?? 1,
  )
  const [intakePhase, setIntakePhase] = useState<IntakePhase>('idle')
  const [intakeDirection, setIntakeDirection] = useState<IntakeDirection>('forward')
  const intakeAnimRef = useRef<number[]>([])
  const gsapPage = useGsapPageOptional()
  const [coverBroken, setCoverBroken] = useState(false)
  const coverUrl = landing.coverUrl
  const showCoverSlot = Boolean(coverUrl) && !coverBroken
  const intakeBusy = intakePhase === 'out'

  const persistAgreed = useCallback(
    (next: boolean) => {
      setAgreed(next)
      const doc = getInterviewResponse(briefId)
      const prev = isSittingTermsAck(doc.sittingTerms) ? doc.sittingTerms : null
      saveInterviewResponse({ ...doc, sittingTerms: stampSittingTerms(prev, next) })
    },
    [briefId],
  )

  useEffect(() => {
    const terms = getInterviewResponse(briefId).sittingTerms
    setAgreed(isSittingTermsAck(terms) ? terms.agreed : false)
  }, [briefId])

  const clearIntakeAnim = useCallback(() => {
    for (const id of intakeAnimRef.current) window.clearTimeout(id)
    intakeAnimRef.current = []
  }, [])

  useEffect(() => () => clearIntakeAnim(), [clearIntakeAnim])

  useEffect(() => {
    setCoverBroken(false)
  }, [coverUrl])

  useEffect(() => {
    if (intakeStepProp == null || intakePhase !== 'idle' || intakeStepProp === visibleStep) return
    setVisibleStep(intakeStepProp)
  }, [intakeStepProp, intakePhase, visibleStep])

  const commitIntakeStep = useCallback(
    (next: InterviewIntakeStep) => {
      onIntakeStepChange?.(next)
      if (intakeStepProp == null) setIntakeStepLocal(next)
    },
    [intakeStepProp, onIntakeStepChange],
  )

  const goIntakeStep = useCallback(
    (next: InterviewIntakeStep | ((prev: InterviewIntakeStep) => InterviewIntakeStep)) => {
      const resolved = typeof next === 'function' ? next(visibleStep) : next
      if (resolved === visibleStep || intakePhase === 'out') return
      if (gsapPage?.reducedMotion) {
        setVisibleStep(resolved)
        commitIntakeStep(resolved)
        return
      }
      clearIntakeAnim()
      setIntakeDirection(resolved > visibleStep ? 'forward' : 'back')
      commitIntakeStep(resolved)
      setIntakePhase('out')
      const outId = window.setTimeout(() => {
        setVisibleStep(resolved)
        setIntakePhase('in')
        const inId = window.setTimeout(() => setIntakePhase('idle'), INTAKE_IN_MS)
        intakeAnimRef.current.push(inId)
      }, INTAKE_OUT_MS)
      intakeAnimRef.current.push(outId)
    },
    [clearIntakeAnim, commitIntakeStep, gsapPage?.reducedMotion, intakePhase, visibleStep],
  )

  const takeBlocked = checkWarnings.length > 0
  const canStart = agreed && requirementsReady && declarationReady && !takeBlocked
  const canContinue = landing.hasInProgressAttempt && requirementsReady && !takeBlocked
  const ctaHint = (() => {
    if (intakeBusy) return null
    if (takeBlocked) {
      return checkWarnings.map((w) => w.short).join(' ')
    }
    if (visibleStep === 2 && !requirementsReady) {
      return 'Allow microphone, network, and location first.'
    }
    if (visibleStep !== 3 || canStart) return null
    const bits: string[] = []
    if (!declarationReady && declarationHint) bits.push(declarationHint)
    if (!requirementsReady) bits.push('Allow microphone, network, and location first.')
    return bits.length ? bits.join(' ') : null
  })()

  if (debug) {
    console.debug('[InterviewLanding]', {
      title: landing.title,
      sections: landing.sections.length,
      coverUrl,
      agreed,
      canContinue,
      verifySection,
      verifyBusy,
      verifyRevealMessageCount,
    })
  }

  const metaTags = buildMetaTags(landing)
  const verifyTitle = verifySection
    ? verifySection.label.replace(/ \/ .*$/, '')
    : 'Section'
  const [verifyHeaderTitle, setVerifyHeaderTitle] = useState<string | null>(null)
  const closeVerify = () => onVerifySectionChange?.(null)

  useEffect(() => {
    setVerifyHeaderTitle(null)
  }, [verifySection?.sectionKey])

  return (
    <ScaleCoverModal
      className="theme-interview-landing-shell theme-interview-landing__verify-cover"
      open={verifySection != null}
      onClose={closeVerify}
      title={verifyHeaderTitle || verifyTitle}
      hideChrome
      panel={
        <div className="theme-interview-landing__verify-panel">
          <header className="theme-interview-landing__verify-panel-header theme-interview-creator__manage-header">
            <h2
              className={[
                'type-h3 mb-0 theme-interview-landing__verify-panel-title theme-interview-creator__manage-title',
                verifyHeaderTitle ? 'is-promoted' : 'is-resting',
              ].join(' ')}
            >
              {verifyHeaderTitle ? (
                verifyHeaderTitle
              ) : (
                <span className="sr-only">{verifyTitle}</span>
              )}
            </h2>
            <div className="theme-interview-creator__manage-divider" aria-hidden />
            <div className="theme-interview-creator__manage-create">
              <VurifyMenuButton
                type="button"
                variant="label"
                size="md"
                housing
                activeChrome={false}
                lineTone="muted"
                icon={ArrowLeft}
                iconPosition="left"
                onClick={closeVerify}
              >
                Back
              </VurifyMenuButton>
            </div>
          </header>
          {verifyModal ? (
            <InterviewTalkVerifyPanel
              modal={verifyModal}
              highlightMessageId={verifyHighlightMessageId}
              onCiteMessage={onVerifyCiteMessage}
              onAskAboutCard={onVerifyAskAbout}
              onPromoteTitle={setVerifyHeaderTitle}
              revealMessageCount={verifyRevealMessageCount}
              showMarkingRail={verifyShowMarkingRail}
              debug={debug}
            />
          ) : verifyCodingModal ? (
            <InterviewCodingVerifyPanel
              modal={verifyCodingModal}
              onAskAboutCard={onVerifyAskAbout}
              onPromoteTitle={setVerifyHeaderTitle}
              debug={debug}
            />
          ) : verifyEssayModal ? (
            <InterviewEssayVerifyPanel
              modal={verifyEssayModal}
              onAskAboutCard={onVerifyAskAbout}
              onPromoteTitle={setVerifyHeaderTitle}
              debug={debug}
            />
          ) : verifyFormModal ? (
            <InterviewFormVerifyPanel
              modal={verifyFormModal}
              onAskAboutCard={onVerifyAskAbout}
              onPromoteTitle={setVerifyHeaderTitle}
              debug={debug}
            />
          ) : verifyBusy ? (
            <p className="type-caption type-muted mb-0" role="status">
              Loading review…
            </p>
          ) : verifySection && isTalkVerifySectionKey(verifySection.sectionKey) ? (
            <p className="type-caption type-muted mb-0" role="alert">
              Could not load Talk review fixture.
            </p>
          ) : verifySection && resolveToolVerifyKind(verifySection.sectionKey) ? (
            <p className="type-caption type-muted mb-0" role="alert">
              Could not load tool review fixture.
            </p>
          ) : verifySection?.summary?.trim() ? (
            <div
              className="theme-interview-landing__verify-soft"
              role="region"
              aria-label="Soft Decision detail"
            >
              <p className="type-body-sm mb-0">{verifySection.summary.trim()}</p>
              {verifySection.summaryDetail?.trim() ? (
                <p className="type-caption type-muted mb-0 mt-2">
                  {verifySection.summaryDetail.trim()}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="theme-interview-landing__verify-blank" />
          )}
        </div>
      }
      debug={debug}
    >
      <div
        className={['theme-interview-landing', showCoverSlot ? '' : 'is-no-cover'].filter(Boolean).join(' ')}
        data-phase={intakePhase}
        data-direction={intakeDirection}
      >
        <div className="theme-interview-landing__stage">
        <section
          className={[
            'theme-interview-landing__overview',
            showCoverSlot ? '' : 'is-no-cover',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="Interview overview"
          hidden={visibleStep !== 1}
        >
          <div className="theme-interview-landing__overview-copy">
            <h2 className="type-h2 mb-0 theme-interview-landing__title">{landing.title}</h2>
            <p className="type-body-sm mb-0 theme-interview-landing__description">
              {landing.description}
            </p>
            {metaTags.length > 0 ? (
              <div className="theme-interview-landing__meta theme-tag-group">
                {metaTags.map((tag) => {
                  const Icon = tag.icon
                  return (
                    <Tag key={tag.id} size="sm" className="theme-interview-landing__meta-tag">
                      <Icon
                        className="theme-interview-landing__meta-tag-icon size-3 shrink-0"
                        aria-hidden
                      />
                      <span>{tag.label}</span>
                    </Tag>
                  )
                })}
              </div>
            ) : null}
          </div>
          {showCoverSlot && coverUrl ? (
            <figure className="theme-interview-landing__cover">
              <img
                className="theme-interview-landing__cover-img"
                src={coverUrl}
                alt=""
                width={420}
                height={280}
                fetchPriority="high"
                onError={() => setCoverBroken(true)}
              />
            </figure>
          ) : null}
        </section>

        <div className="theme-interview-landing__step-body">
        <section
          className="theme-interview-landing__structure"
          aria-labelledby="interview-structure-heading"
          hidden={visibleStep !== 1}
        >
          <h3
            id="interview-structure-heading"
            className="type-label mb-0 theme-interview-landing__structure-label"
          >
            What you’ll do
          </h3>
          <p className="type-caption type-muted mb-0 theme-interview-landing__requirements-lead">
            You’ll move through these stages in order. Timed stages end when the clock ends. After
            you start, stay on this tab in full screen until you finish or leave to overview.
          </p>
          <InterviewStructureSummaryRepeater
            sections={landing.sections}
            completedPhaseIds={completedPhaseIds}
            skippedPhaseIds={skippedPhaseIds}
            debug={debug}
          />
        </section>

        <div hidden={visibleStep !== 2}>
          <InterviewLandingRequirements
            briefId={briefId}
            onReadyChange={setRequirementsReady}
            debug={debug}
          />
        </div>

        <div hidden={visibleStep !== 3}>
          <InterviewLandingDeclaration
            briefId={briefId}
            onReadyChange={setDeclarationReady}
            onBlockHintChange={setDeclarationHint}
            debug={debug}
          />
        </div>
        </div>
        </div>

        <footer className="theme-interview-landing__footer theme-interview-creator__compose-footer">
          <div className="theme-interview-creator__compose-footer-primary">
            {visibleStep === 3 ? (
              <div className="theme-interview-landing__terms">
                <Checkbox
                  size="sm"
                  checked={agreed}
                  onChange={persistAgreed}
                  aria-label="Agree to the interview terms"
                  className="theme-interview-landing__terms-check"
                />
                <p className="type-caption mb-0 theme-interview-landing__terms-copy">
                  I agree to the{' '}
                  <a href={termsHref} className="type-link theme-interview-landing__terms-link">
                    interview terms
                    <ArrowUpRight
                      className="theme-interview-landing__terms-link-icon"
                      aria-hidden
                      strokeWidth={2}
                    />
                  </a>
                </p>
              </div>
            ) : (
              <span className="theme-interview-landing__step-hint" />
            )}
            <div className="theme-interview-landing__cta">
            <div className="theme-interview-creator__compose-footer-actions">
              {visibleStep > 1 ? (
                <VurifyMenuButton
                  variant="label"
                  size="md"
                  housing
                  activeChrome={false}
                  lineTone="muted"
                  type="button"
                  icon={ArrowLeft}
                  iconPosition="left"
                  disabled={intakeBusy}
                  onClick={() => goIntakeStep((s) => (s === 3 ? 2 : 1))}
                >
                  Back
                </VurifyMenuButton>
              ) : null}
              {visibleStep > 1 ? (
                <div className="theme-interview-creator__compose-footer-divider" aria-hidden />
              ) : null}
              {visibleStep < 3 ? (
                withBlockHint(
                  <VurifyMenuButton
                    variant="label"
                    size="md"
                    housing
                    activeChrome={false}
                    lineTone="accent"
                    type="button"
                    icon={ArrowRight}
                    iconPosition="right"
                    aria-disabled={intakeBusy || (visibleStep === 2 && !requirementsReady)}
                    onClick={() => {
                      if (intakeBusy || (visibleStep === 2 && !requirementsReady)) return
                      goIntakeStep((s) => (s === 1 ? 2 : 3))
                    }}
                  >
                    Next
                  </VurifyMenuButton>,
                  visibleStep === 2 && !requirementsReady && !intakeBusy
                    ? ctaHint
                    : null,
                )
              ) : (
                <>
                  <VurifyMenuButton
                    variant="label"
                    size="md"
                    housing
                    activeChrome={false}
                    lineTone="complement"
                    type="button"
                    icon={RotateCcw}
                    iconPosition="left"
                    disabled={!canContinue || intakeBusy}
                    onClick={() => onContinue?.()}
                  >
                    Continue
                  </VurifyMenuButton>
                  <div className="theme-interview-creator__compose-footer-divider" aria-hidden />
                  {withBlockHint(
                    <VurifyMenuButton
                      variant="label"
                      size="md"
                      housing
                      activeChrome={false}
                      lineTone="accent"
                      type="button"
                      icon={Play}
                      iconPosition="left"
                      aria-disabled={!canStart || intakeBusy}
                      onClick={() => {
                        if (!canStart || intakeBusy || takeBlocked) return
                        persistAgreed(true)
                        onStart?.()
                      }}
                    >
                      Start
                    </VurifyMenuButton>,
                    !canStart && !intakeBusy ? ctaHint : null,
                  )}
                </>
              )}
            </div>
            {ctaHint ? (
              <p className="sr-only" role="status">
                {ctaHint}
              </p>
            ) : null}
            {takeBlocked ? (
              <ul
                className="theme-interview-landing__check-warnings"
                aria-label="Why this interview cannot be taken"
              >
                {checkWarnings.map((w, index) => (
                  <li key={`${w.id}-${index}`}>{w.short}</li>
                ))}
              </ul>
            ) : null}
            </div>
          </div>
        </footer>
      </div>
    </ScaleCoverModal>
  )
}
