import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowUpRight, CheckCircle2, Circle } from 'lucide-react'
import { gsap, useGSAP } from '../lib/gsap'
import { useAppStage } from '../lib/appStage/appStageContext'
import { signUpOrganisation, signUpPersonal, signInWithOAuth } from '../lib/authApi'
import {
  AUTH_SIGNUP_POLICY,
  formatAuthIssues,
  usernameFromOrgName,
  validateDisplayName,
  validateEmail,
  validateOrgName,
  validateSignupLocal,
  validateUsername,
} from '../lib/authValidation'
import { toUserMessage } from '../lib/dataApi'
import { listMyAccounts } from '../lib/userApi'
import { uploadBrowserFile } from '../lib/fileApi'
import {
  orgOnboardingList,
  orgOnboardingSubmit,
  type OrgOnboardingRequirementRow,
} from '../lib/orgOnboardingApi'
import {
  buildCvReviewTips,
  cvIntakeBegin,
  cvIntakeComplete,
  extractCvFromPdfFile,
  normalizeCvViewerDoc,
  softNormalizeCvStreamDoc,
  type CvExtractV2,
} from '../lib/cvApi'
import { writeAuthDashboardSummary } from '../lib/authApi/dashboardSession'
import { formatPhoneDisplay, normalizePhoneE164 } from '../lib/forms/phoneFormat'
import {
  passwordPolicyRules,
  validateValue,
  validators,
  type ValidationRule,
} from '../lib/forms/formValidation'
import { passwordStrengthScore, passwordStrengthTone } from '../lib/forms/passwordStrength'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { BarLoader } from './ProgressLoader'
import { Checkbox } from './Checkbox'
import { Card } from './Card'
import { DataUpload } from './DataUpload'
import { Field } from './Field'
import { InfoTooltip } from './InfoTooltip'
import { PageScrollType } from './PageScrollType'
import { RadioGroup } from './RadioGroup'
import { StepLoader } from './StepLoader'
import { ThemeScroll } from './ThemeScroll'
import { Tooltip } from './Tooltip'
import { TypeAnimText } from './TypeAnimText'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifyInput } from './VurifyInput'
import { VurifyPasswordToggle } from './VurifyPasswordToggle'
import { VurifyViewer } from './VurifyViewer'
import { GoogleIcon } from '@hugeicons/core-free-icons'

type CvPhase = 'pick' | 'extracting' | 'review'

/** Keep section ids stable across soft-parse stream frames. */
function stabilizeStreamSectionIds(prev: CvExtractV2 | null, next: CvExtractV2): CvExtractV2 {
  if (!prev?.sections.length) return next
  const used = new Set<string>()
  const prevBySlot = new Map<string, string>()
  const kindCounts = new Map<string, number>()
  for (const section of prev.sections) {
    const n = kindCounts.get(section.kind) ?? 0
    kindCounts.set(section.kind, n + 1)
    prevBySlot.set(`${section.kind}#${n}`, section.id)
  }
  kindCounts.clear()

  return {
    ...next,
    sections: next.sections.map((section) => {
      if (section.id && prev.sections.some((p) => p.id === section.id)) {
        used.add(section.id)
        return section
      }
      const byTitle = prev.sections.find(
        (p) =>
          !used.has(p.id) &&
          p.kind === section.kind &&
          (p.title || '') === (section.title || ''),
      )
      if (byTitle) {
        used.add(byTitle.id)
        return { ...section, id: byTitle.id }
      }
      const n = kindCounts.get(section.kind) ?? 0
      kindCounts.set(section.kind, n + 1)
      const sticky = prevBySlot.get(`${section.kind}#${n}`)
      if (sticky && !used.has(sticky)) {
        used.add(sticky)
        return { ...section, id: sticky }
      }
      return section
    }),
  }
}

export type VurifySignUpAudience = 'candidates' | 'recruiters' | 'agencies'

type VurifySignUpPanelProps = {
  onClose: () => void
  className?: string
}

type AccountForm = {
  email: string
  password: string
  passwordConfirm: string
  displayName: string
  username: string
  orgName: string
  /** Display-spaced international phone (`+1 555…`); stored as E.164. */
  phone: string
}

type PanelPhase = 'idle' | 'out' | 'in'
type PanelDirection = 'forward' | 'back'

const EMPTY_ACCOUNT: AccountForm = {
  email: '',
  password: '',
  passwordConfirm: '',
  displayName: '',
  username: '',
  orgName: '',
  phone: '',
}

const PHONE_SAMPLE = '+1 555 123 4567'
/** Placeholder until a Terms route ships — text-link + icon open the same target. */
const TERMS_HREF = '#terms'

/** Field rules — lockstep with `lib/authValidation` (GoTrue / app_signup_validate). */
const SIGNUP_EMAIL_RULES: ValidationRule[] = [
  validators.required('Email is required'),
  validators.custom((value) => validateEmail(value) === null, 'Enter a valid email address', 'email-auth'),
]

const SIGNUP_PASSWORD_RULES = passwordPolicyRules({
  minLength: AUTH_SIGNUP_POLICY.password.minLength,
  maxLength: AUTH_SIGNUP_POLICY.password.maxLength,
  requireLowercase: AUTH_SIGNUP_POLICY.password.requireLowercase,
  requireUppercase: AUTH_SIGNUP_POLICY.password.requireUppercase,
  requireNumber: AUTH_SIGNUP_POLICY.password.requireDigit,
  requireSymbol: AUTH_SIGNUP_POLICY.password.requireSymbol,
})

const SIGNUP_DISPLAY_NAME_RULES: ValidationRule[] = [
  validators.custom(
    (value) => validateDisplayName(value) === null,
    'Display name is too long',
    'display-name-auth',
  ),
]

const SIGNUP_DISPLAY_NAME_REQUIRED_RULES: ValidationRule[] = [
  validators.required('Name is required'),
  ...SIGNUP_DISPLAY_NAME_RULES,
]

const SIGNUP_USERNAME_RULES: ValidationRule[] = [
  validators.required('Username is required'),
  validators.custom(
    (value) => validateUsername(value) === null,
    'Use 3–30 lowercase letters, numbers, or underscores',
    'username-auth',
  ),
]

const SIGNUP_ORG_NAME_RULES: ValidationRule[] = [
  validators.required('Organisation name is required'),
  validators.custom(
    (value) => validateOrgName(value, true) === null,
    'Organisation name length is invalid',
    'org-name-auth',
  ),
  validators.custom(
    (value) => validateUsername(usernameFromOrgName(value), true) === null,
    'Organisation name needs letters or numbers (used as your public handle)',
    'org-handle-auth',
  ),
]

const SIGNUP_PHONE_RULES: ValidationRule[] = [validators.phone()]

type SignUpAccountFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  rules?: readonly ValidationRule[]
  type?: string
  name?: string
  autoComplete?: string
  /** Caption under the control (e.g. sample + tooltip). */
  meta?: ReactNode
  /** Screen-reader name when the visible label is abbreviated. */
  ariaLabel?: string
  required?: boolean
  disabled?: boolean
  forceSubmit: number
  trailing?: ReactNode
  className?: string
  wide?: boolean
}

function SignUpAccountField({
  label,
  value,
  onChange,
  rules = [],
  type = 'text',
  name,
  autoComplete,
  meta,
  ariaLabel,
  required,
  disabled,
  forceSubmit,
  trailing,
  className = '',
  wide = false,
}: SignUpAccountFieldProps) {
  const { error, onBlur, notifyChange, markSubmitted } = useFormFieldValidation({
    value,
    rules,
    validateOn: ['blur', 'change', 'submit'],
    showSuccessWhenValid: false,
  })

  useEffect(() => {
    if (forceSubmit > 0) markSubmitted()
  }, [forceSubmit, markSubmitted])

  return (
    <Field
      error={error}
      className={['theme-vurify-sign-up__field', wide ? 'theme-vurify-sign-up__field--wide' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <VurifyInput
        label={label}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(event) => {
          notifyChange()
          onChange(event.target.value)
        }}
        onBlur={onBlur}
        trailing={trailing}
      />
      {meta}
    </Field>
  )
}

const AUDIENCE_OPTIONS = [
  { value: 'candidates', label: 'Candidate' },
  { value: 'recruiters', label: 'Recruiter' },
  { value: 'agencies', label: 'Agency' },
] as const

const AUDIENCE_ORDER = ['candidates', 'recruiters', 'agencies'] as const satisfies readonly VurifySignUpAudience[]

const AUDIENCE_ARTICLE: Record<VurifySignUpAudience, 'a' | 'an'> = {
  candidates: 'a',
  recruiters: 'a',
  agencies: 'an',
}

const AUDIENCE_ARTICLES = ['a', 'an'] as const

/** Header + body under the statement — proper sentences, no em dashes. */
const AUDIENCE_COPY: Record<VurifySignUpAudience, { title: string; body: string }> = {
  candidates: {
    title: 'Candidate',
    body: 'For talent building a proof-first profile on Vurify.',
  },
  recruiters: {
    title: 'Recruiter',
    body: 'For people who hire for a company under their own name.',
  },
  agencies: {
    title: 'Agency',
    body: 'For organisations that place talent on behalf of clients.',
  },
}

const FLIP_DURATION_MS = 360
const FLIP_STAGGER_MS = 40
const FLIP_HANDOFF_MS = 220
const COPY_OUT_MS = 220
const COPY_IN_MS = 420

const OUT_MS = 220
const IN_MS = 520

/** Menu-style item motion (SceneMenuShell) — enter/exit only, not chrome restyle. */
const ANIM_FROM_RIGHT = '.theme-vurify-sign-up__anim-from-right'
const ANIM_FROM_LEFT = '.theme-vurify-sign-up__anim-from-left'
const ANIM_BODY = '.theme-vurify-sign-up__anim-body'
const ITEM_DURATION = 0.52
const ITEM_STAGGER = 0.045
const ITEM_EASE = 'power2.inOut'
/** Wait for ScaleCoverModal cover rise (~page duration) before menu-style enter. */
const ENTER_DELAY = 0.55
const DOCS_SUCCESS_MESSAGE = 'Your documents have been uploaded successfully.'
const PERSONAL_SUCCESS_MESSAGE = 'Your account is ready.'
const CV_SUCCESS_MESSAGE = 'Your CV has been uploaded successfully.'
const DOCS_SUCCESS_HOLD_MS = 1100

type UploadProgressValue = number | 'indeterminate'

function requirementAccept(row: OrgOnboardingRequirementRow): string {
  return typeof row.metadata?.accept === 'string'
    ? row.metadata.accept
    : 'application/pdf,image/*'
}

function flipRunMs(label: string) {
  const units = Math.min(Math.max(label.length, 1), 14)
  return FLIP_DURATION_MS + FLIP_STAGGER_MS * (units - 1)
}

function audienceIndex(id: VurifySignUpAudience) {
  return AUDIENCE_ORDER.indexOf(id)
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  return reduced
}

type AudienceArticleFlipProps = {
  text: 'a' | 'an'
  reducedMotion: boolean
}

/** Pricing-style flip for a ↔ an — width reserved so the sentence doesn’t jump. */
function AudienceArticleFlip({ text, reducedMotion }: AudienceArticleFlipProps) {
  const currentRef = useRef(text)
  const handoffTimerRef = useRef<number | null>(null)
  const switchTimerRef = useRef<number | null>(null)
  const [displayed, setDisplayed] = useState(text)
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle')

  useEffect(() => {
    if (Object.is(text, currentRef.current)) return

    if (handoffTimerRef.current !== null) window.clearTimeout(handoffTimerRef.current)
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current)

    const previous = currentRef.current
    currentRef.current = text

    if (reducedMotion) {
      setDisplayed(text)
      setPhase('idle')
      return
    }

    setDisplayed(previous)
    setPhase('out')
    handoffTimerRef.current = window.setTimeout(() => {
      setDisplayed(text)
      setPhase('in')
      switchTimerRef.current = window.setTimeout(() => {
        setPhase('idle')
        switchTimerRef.current = null
      }, flipRunMs(text) + 40)
      handoffTimerRef.current = null
    }, Math.min(FLIP_HANDOFF_MS, Math.round(flipRunMs(previous) * 0.62)))
  }, [reducedMotion, text])

  useEffect(
    () => () => {
      if (handoffTimerRef.current !== null) window.clearTimeout(handoffTimerRef.current)
      if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current)
    },
    [],
  )

  if (reducedMotion) {
    return <span className="theme-vurify-sign-up__article">{text}</span>
  }

  return (
    <span
      className="theme-vurify-sign-up__article"
      data-flip-phase={phase}
      aria-live="polite"
    >
      <span className="theme-vurify-sign-up__article-sizer" aria-hidden>
        {AUDIENCE_ARTICLES.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </span>
      <TypeAnimText
        key={`${displayed}-${phase === 'out' ? 'out' : phase === 'in' ? 'in' : 'idle'}`}
        anim="flip"
        trigger={phase === 'idle' ? 'hover' : 'enter'}
        split="chars"
        className={[
          'theme-vurify-sign-up__article-label',
          phase === 'out' ? 'theme-vurify-sign-up__article-label--out' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {displayed}
      </TypeAnimText>
    </span>
  )
}

type AudienceCopyPanelProps = {
  audience: VurifySignUpAudience
  reducedMotion: boolean
}

/** Fixed-height header + body with Pricing-table L/R swap — no vertical jump on toggle. */
function AudienceCopyPanel({ audience, reducedMotion }: AudienceCopyPanelProps) {
  const [displayed, setDisplayed] = useState(audience)
  const [phase, setPhase] = useState<PanelPhase>('idle')
  const [direction, setDirection] = useState<PanelDirection>('forward')
  const displayedRef = useRef(displayed)
  const exitTimerRef = useRef<number | null>(null)
  const enterTimerRef = useRef<number | null>(null)

  displayedRef.current = displayed

  useEffect(() => {
    const clearTimers = () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current)
        exitTimerRef.current = null
      }
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current)
        enterTimerRef.current = null
      }
    }

    if (audience === displayedRef.current) return

    clearTimers()
    const nextDir: PanelDirection =
      audienceIndex(audience) < audienceIndex(displayedRef.current) ? 'back' : 'forward'

    if (reducedMotion) {
      setDirection(nextDir)
      setDisplayed(audience)
      setPhase('idle')
      return
    }

    setDirection(nextDir)
    setPhase('out')
    exitTimerRef.current = window.setTimeout(() => {
      setDisplayed(audience)
      setPhase('in')
      exitTimerRef.current = null
      enterTimerRef.current = window.setTimeout(() => {
        setPhase('idle')
        enterTimerRef.current = null
      }, COPY_IN_MS)
    }, COPY_OUT_MS)

    return clearTimers
  }, [audience, reducedMotion])

  const copy = AUDIENCE_COPY[displayed]

  return (
    <Card
      variant="vurify"
      cornerGeometry="sharp"
      className="theme-vurify-sign-up__copy-card"
    >
      <div
        className="theme-vurify-sign-up__copy"
        data-phase={phase}
        data-direction={direction}
        data-audience={displayed}
        aria-live="polite"
      >
        {/* Invisible stack of every audience blurb — locks card height so toggles don’t jitter. */}
        <div className="theme-vurify-sign-up__copy-sizer" aria-hidden>
          {AUDIENCE_ORDER.map((key) => {
            const item = AUDIENCE_COPY[key]
            return (
              <div key={key} className="theme-vurify-sign-up__copy-sizer-item">
                <p className="theme-vurify-sign-up__copy-title type-title mb-0">{item.title}</p>
                <p className="theme-vurify-sign-up__copy-body type-body mb-0">{item.body}</p>
              </div>
            )
          })}
        </div>
        <div className="theme-vurify-sign-up__copy-live">
          <p className="theme-vurify-sign-up__copy-title type-title mb-0">{copy.title}</p>
          <p className="theme-vurify-sign-up__copy-body type-body mb-0">{copy.body}</p>
        </div>
      </div>
    </Card>
  )
}

function pickOrgAccountId(accounts: unknown[]): string | null {
  const row = accounts.find((a) => {
    if (!a || typeof a !== 'object') return false
    return (a as { kind?: string }).kind === 'organisation'
  }) as { id?: string } | undefined
  return row?.id ?? null
}

function pickPersonalAccountId(accounts: unknown[]): string | null {
  const row = accounts.find((a) => {
    if (!a || typeof a !== 'object') return false
    return (a as { kind?: string }).kind === 'personal'
  }) as { id?: string } | undefined
  return row?.id ?? null
}

/**
 * Scale-cover Sign up wizard — step 0 type · account · documents / CV.
 */
export function VurifySignUpPanel({ onClose, className = '' }: VurifySignUpPanelProps) {
  const { goDashboard } = useAppStage()
  const formId = useId().replace(/:/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const animTimers = useRef<number[]>([])
  const closingRef = useRef(false)
  const reducedMotion = usePrefersReducedMotion()

  const [audience, setAudience] = useState<VurifySignUpAudience>('agencies')
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [panelPhase, setPanelPhase] = useState<PanelPhase>('idle')
  const [panelDirection, setPanelDirection] = useState<PanelDirection>('forward')
  const [account, setAccount] = useState<AccountForm>(EMPTY_ACCOUNT)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false)
  const [accountForceSubmit, setAccountForceSubmit] = useState(0)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [orgAccountId, setOrgAccountId] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<OrgOnboardingRequirementRow[]>([])
  const [textValues, setTextValues] = useState<Record<string, string>>({})
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const [stagedFiles, setStagedFiles] = useState<Record<string, File[]>>({})
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgressValue | null>>({})
  const [cvFiles, setCvFiles] = useState<File[]>([])
  const [cvUploadProgress, setCvUploadProgress] = useState<UploadProgressValue | null>(null)
  const [cvPhase, setCvPhase] = useState<CvPhase>('pick')
  const [cvDoc, setCvDoc] = useState<CvExtractV2 | null>(null)
  const [, setCvSourceText] = useState('')
  const [, setCvPersonalAccountId] = useState<string | null>(null)
  const [cvExtractTips, setCvExtractTips] = useState<string[]>([])
  const [cvStreaming, setCvStreaming] = useState(false)
  const [cvPolishing, setCvPolishing] = useState(false)
  const [viewerHistoryKey, setViewerHistoryKey] = useState(0)
  const [cvReviewReachedEnd, setCvReviewReachedEnd] = useState(false)
  const [cvIntakeBegun, setCvIntakeBegun] = useState(false)
  const [extractStatus, setExtractStatus] = useState('')
  const [cvExtractFailed, setCvExtractFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [closeRiseKey, setCloseRiseKey] = useState(0)
  const formErrorRef = useRef<HTMLParagraphElement>(null)
  const cvReviewRef = useRef<HTMLElement>(null)
  const cvExtractRef = useRef<HTMLElement>(null)
  const signUpScrollRef = useRef<HTMLDivElement>(null)
  const extractGenRef = useRef(0)
  const extractFileKeyRef = useRef<string | null>(null)
  const extractAbortRef = useRef<AbortController | null>(null)
  const streamRafRef = useRef<number | null>(null)
  const pendingStreamDocRef = useRef<{ doc: CvExtractV2; focusId: string | null } | null>(null)
  const prevStreamDocRef = useRef<CvExtractV2 | null>(null)

  const agencyFlow = audience === 'agencies'
  const personalFlow = audience === 'candidates' || audience === 'recruiters'
  const candidateFlow = audience === 'candidates'
  const stepCount = agencyFlow || candidateFlow ? 3 : 2
  const stepProgress = ((step + 1) / stepCount) * 100
  const stepLabel =
    step === 0
      ? 'Type'
      : step === 1
        ? 'Account'
        : agencyFlow
          ? 'Documents'
          : 'CV'
  const article = AUDIENCE_ARTICLE[audience]
  const passwordStrength = passwordStrengthScore(account.password)

  useEffect(() => {
    if (reducedMotion) {
      setCloseRiseKey(1)
      return
    }
    const id = window.setTimeout(() => setCloseRiseKey(1), ENTER_DELAY * 1000)
    return () => window.clearTimeout(id)
  }, [reducedMotion])

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const fromRight = Array.from(root.querySelectorAll<HTMLElement>(ANIM_FROM_RIGHT))
      const fromLeft = Array.from(root.querySelectorAll<HTMLElement>(ANIM_FROM_LEFT))
      const bodyItems = Array.from(root.querySelectorAll<HTMLElement>(ANIM_BODY))
      const duration = reducedMotion ? 0.01 : ITEM_DURATION
      const stagger = reducedMotion ? 0 : ITEM_STAGGER
      const delay = reducedMotion ? 0 : ENTER_DELAY

      // Leave opacity/visibility to CSS after enter so :disabled opacity still shows.
      const clearAnimProps = 'transform,opacity,visibility'

      gsap.set(fromRight, {
        autoAlpha: 0,
        xPercent: reducedMotion ? 0 : 100,
        force3D: true,
      })
      gsap.set(fromLeft, {
        autoAlpha: 0,
        xPercent: reducedMotion ? 0 : -100,
        force3D: true,
      })
      gsap.set(bodyItems, {
        autoAlpha: 0,
        y: reducedMotion ? 0 : 14,
        force3D: true,
      })

      const tl = gsap.timeline({
        delay,
        defaults: { ease: ITEM_EASE, overwrite: 'auto' },
      })
      if (fromRight.length) {
        tl.to(
          fromRight,
          {
            autoAlpha: 1,
            xPercent: 0,
            duration,
            stagger,
            clearProps: clearAnimProps,
          },
          0,
        )
      }
      if (fromLeft.length) {
        tl.to(
          fromLeft,
          {
            autoAlpha: 1,
            xPercent: 0,
            duration,
            stagger,
            clearProps: clearAnimProps,
          },
          0.04,
        )
      }
      if (bodyItems.length) {
        tl.to(
          bodyItems,
          {
            autoAlpha: 1,
            y: 0,
            duration,
            stagger,
            clearProps: clearAnimProps,
          },
          0.1,
        )
      }
    },
    { scope: rootRef, dependencies: [reducedMotion] },
  )

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    const root = rootRef.current
    if (!root || reducedMotion) {
      onClose()
      return
    }

    const fromRight = Array.from(root.querySelectorAll<HTMLElement>(ANIM_FROM_RIGHT))
    const fromLeft = Array.from(root.querySelectorAll<HTMLElement>(ANIM_FROM_LEFT))
    const bodyItems = Array.from(root.querySelectorAll<HTMLElement>(ANIM_BODY))
    const tl = gsap.timeline({
      defaults: { ease: ITEM_EASE, overwrite: 'auto', force3D: true },
      onComplete: () => onClose(),
    })
    if (bodyItems.length) {
      tl.to(bodyItems, { autoAlpha: 0, y: 10, duration: ITEM_DURATION, stagger: ITEM_STAGGER }, 0)
    }
    if (fromLeft.length) {
      tl.to(
        fromLeft,
        { autoAlpha: 0, xPercent: -100, duration: ITEM_DURATION, stagger: ITEM_STAGGER },
        0.02,
      )
    }
    if (fromRight.length) {
      tl.to(
        fromRight,
        { autoAlpha: 0, xPercent: 100, duration: ITEM_DURATION, stagger: ITEM_STAGGER },
        0.02,
      )
    }
    if (!fromRight.length && !fromLeft.length && !bodyItems.length) onClose()
  }, [onClose, reducedMotion])

  const clearAnimTimers = useCallback(() => {
    for (const id of animTimers.current) window.clearTimeout(id)
    animTimers.current = []
  }, [])

  useEffect(() => () => clearAnimTimers(), [clearAnimTimers])

  const runPanelTransition = useCallback(
    (direction: PanelDirection, apply: () => void) => {
      clearAnimTimers()
      setPanelDirection(direction)
      setPanelPhase('out')
      const outId = window.setTimeout(() => {
        apply()
        setPanelPhase('in')
        const inId = window.setTimeout(() => setPanelPhase('idle'), IN_MS)
        animTimers.current.push(inId)
      }, OUT_MS)
      animTimers.current.push(outId)
    },
    [clearAnimTimers],
  )

  const goStep = useCallback(
    (next: 0 | 1 | 2) => {
      if (next === step) return
      runPanelTransition(next > step ? 'forward' : 'back', () => setStep(next))
    },
    [runPanelTransition, step],
  )

  const patchAccount = useCallback(<K extends keyof AccountForm>(key: K, value: AccountForm[K]) => {
    setAccount((prev) => ({ ...prev, [key]: value }))
  }, [])

  const loadChecklist = useCallback(async (accountId: string) => {
    const { rows } = await orgOnboardingList(accountId)
    setRequirements(rows.filter((r) => r.enabled))
    const texts: Record<string, string> = {}
    const files: Record<string, string> = {}
    for (const row of rows) {
      if (row.inputKind === 'text' && row.submission?.value) {
        texts[row.key] = row.submission.value
      }
      if (row.inputKind === 'file' && row.submission?.fileNodeId) {
        files[row.key] = 'Uploaded'
      }
    }
    setTextValues(texts)
    setFileNames(files)
  }, [])

  const onAudienceChange = useCallback((value: string) => {
    const next = value as VurifySignUpAudience
    if (next === audience) return
    setAudience(next)
    setFormError(null)
    setSuccessMessage(null)
    setAccount(EMPTY_ACCOUNT)
    setAgreedTerms(false)
    setOrgAccountId(null)
    setRequirements([])
    setTextValues({})
    setFileNames({})
    setStagedFiles({})
    setUploadProgress({})
    setCvFiles([])
    setCvUploadProgress(null)
    setCvPhase('pick')
    setCvDoc(null)
    setCvSourceText('')
    setCvPersonalAccountId(null)
    setCvExtractTips([])
    setCvStreaming(false)
    setCvPolishing(false)
    setCvExtractFailed(false)
    setCvReviewReachedEnd(false)
    setCvIntakeBegun(false)
    setExtractStatus('')
    extractGenRef.current += 1
    extractFileKeyRef.current = null
    setPasswordVisible(false)
    setPasswordConfirmVisible(false)
    if (step !== 0) {
      runPanelTransition('back', () => setStep(0))
    }
  }, [audience, runPanelTransition, step])

  const passwordConfirmRules = useMemo<ValidationRule[]>(
    () => [
      validators.required('Confirm your password'),
      validators.custom(
        (value) => value === account.password,
        'Passwords must match',
        'password-confirm',
      ),
    ],
    [account.password],
  )

  const agencyAccountReady = useMemo(() => {
    const local = validateSignupLocal({
      email: account.email,
      password: account.password,
      displayName: account.displayName || undefined,
      signupKind: 'organisation',
      orgName: account.orgName,
      phone: account.phone || undefined,
    })
    const confirmOk = validateValue(account.passwordConfirm, passwordConfirmRules).valid
    return local.ok && confirmOk
  }, [account, passwordConfirmRules])

  const personalAccountReady = useMemo(() => {
    const local = validateSignupLocal({
      email: account.email,
      password: account.password,
      username: account.username,
      displayName: account.displayName || undefined,
      signupKind: 'personal',
    })
    const confirmOk = validateValue(account.passwordConfirm, passwordConfirmRules).valid
    const nameOk = validateValue(account.displayName, SIGNUP_DISPLAY_NAME_REQUIRED_RULES).valid
    return local.ok && confirmOk && nameOk
  }, [account, passwordConfirmRules])

  const accountReady = agencyFlow ? agencyAccountReady : personalAccountReady
  const cvReady = cvFiles.length > 0
  const cvLocked = cvStreaming || cvPolishing
  const cvSubmitReady =
    cvPhase === 'review' && !cvLocked && cvReviewReachedEnd && Boolean(cvDoc)
  const cvCanProceed =
    (cvPhase === 'pick' && cvReady) || cvSubmitReady

  const isRequirementDone = useCallback(
    (row: OrgOnboardingRequirementRow) => {
      if (row.inputKind === 'text') {
        return Boolean((textValues[row.key] ?? row.submission?.value ?? '').trim())
      }
      return Boolean(
        fileNames[row.key] ||
          row.submission?.fileNodeId ||
          (stagedFiles[row.key]?.length ?? 0) > 0,
      )
    },
    [fileNames, stagedFiles, textValues],
  )

  const requiredRows = useMemo(
    () => requirements.filter((row) => row.required),
    [requirements],
  )

  const requiredCompleteCount = useMemo(
    () => requiredRows.filter(isRequirementDone).length,
    [isRequirementDone, requiredRows],
  )

  const requiredLeftCount = Math.max(0, requiredRows.length - requiredCompleteCount)

  const docsReady = requiredRows.every(isRequirementDone)

  const canProceed =
    !busy &&
    !successMessage &&
    (step === 0
      ? Boolean(audience)
      : step === 1
        ? accountReady && agreedTerms
        : agencyFlow
          ? docsReady && Boolean(orgAccountId)
          : candidateFlow && cvCanProceed)

  const finishSuccess = useCallback(
    (message: string, summary: { username: string; kind: 'organisation' | 'personal' }) => {
      writeAuthDashboardSummary({
        username: summary.username,
        kind: summary.kind,
        mode: 'sign-up',
        audience,
      })
      setSuccessMessage(message)
      window.setTimeout(() => {
        // Cover first; menu close is owned once by App Stage leavePrep inside goDashboard.
        onClose()
        goDashboard()
      }, DOCS_SUCCESS_HOLD_MS)
    },
    [audience, goDashboard, onClose],
  )

  const finishAgencySuccess = useCallback(() => {
    finishSuccess(DOCS_SUCCESS_MESSAGE, {
      username: usernameFromOrgName(account.orgName) || account.email.trim(),
      kind: 'organisation',
    })
  }, [account.email, account.orgName, finishSuccess])

  const finishPersonalSuccess = useCallback(
    (message: string) => {
      finishSuccess(message, {
        username: account.username.trim().toLowerCase() || account.email.trim(),
        kind: 'personal',
      })
    },
    [account.email, account.username, finishSuccess],
  )

  const submitAccount = useCallback(async () => {
    setAccountForceSubmit((n) => n + 1)
    setFormError(null)

    const local = validateSignupLocal({
      email: account.email,
      password: account.password,
      displayName: account.displayName || undefined,
      signupKind: 'organisation',
      orgName: account.orgName,
      phone: account.phone || undefined,
    })
    const confirmOk = validateValue(account.passwordConfirm, passwordConfirmRules).valid
    if (!local.ok || !confirmOk) {
      setFormError(
        formatAuthIssues(local.issues) ||
          (!confirmOk ? 'Passwords must match' : 'Check the highlighted fields'),
      )
      return
    }

    setBusy(true)
    try {
      const phoneE164 = local.normalized.phone ?? normalizePhoneE164(account.phone)
      await signUpOrganisation({
        email: local.normalized.email,
        password: account.password,
        displayName: local.normalized.displayName,
        orgName: local.normalized.orgName ?? account.orgName.trim(),
        phone: phoneE164 || undefined,
      })
      writeAuthDashboardSummary({
        username: usernameFromOrgName(account.orgName) || account.email.trim(),
        kind: 'organisation',
        mode: 'sign-up',
        audience,
      })
      const accounts = await listMyAccounts()
      const id = pickOrgAccountId(accounts)
      if (!id) throw new Error('Organisation account was not provisioned')
      setOrgAccountId(id)
      await loadChecklist(id)
      goStep(2)
    } catch (e) {
      setFormError(toUserMessage(e, 'Sign up failed'))
    } finally {
      setBusy(false)
    }
  }, [account, audience, goStep, loadChecklist, passwordConfirmRules])

  const runDocumentUpload = useCallback(async () => {
    if (!orgAccountId) {
      setFormError('Missing organisation account')
      return
    }
    setFormError(null)
    setBusy(true)
    try {
      for (const row of requirements) {
        if (row.inputKind === 'text') {
          const value = (textValues[row.key] ?? '').trim()
          if (row.required && !value) throw new Error(`Add ${row.label}`)
          if (!value) continue
          if (!row.submission?.value || row.submission.value !== value) {
            await orgOnboardingSubmit({
              accountId: orgAccountId,
              requirementKey: row.key,
              value,
            })
          }
          continue
        }

        const alreadyOnServer = Boolean(row.submission?.fileNodeId || fileNames[row.key])
        const file = stagedFiles[row.key]?.[0]
        if (!file) {
          if (row.required && !alreadyOnServer) throw new Error(`Upload ${row.label}`)
          continue
        }

        setUploadProgress((prev) => ({ ...prev, [row.key]: 'indeterminate' }))
        const node = await uploadBrowserFile(orgAccountId, file, null, {
          onProgress: (ratio) => {
            const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100)
            setUploadProgress((prev) => ({ ...prev, [row.key]: pct }))
          },
        })
        await orgOnboardingSubmit({
          accountId: orgAccountId,
          requirementKey: row.key,
          fileNodeId: node.id,
        })
        setFileNames((prev) => ({ ...prev, [row.key]: file.name }))
        setStagedFiles((prev) => {
          const next = { ...prev }
          delete next[row.key]
          return next
        })
        setUploadProgress((prev) => ({ ...prev, [row.key]: null }))
      }

      await loadChecklist(orgAccountId)
      finishAgencySuccess()
    } catch (e) {
      setFormError(toUserMessage(e, 'Could not upload documents'))
    } finally {
      setBusy(false)
      setUploadProgress({})
    }
  }, [
    fileNames,
    finishAgencySuccess,
    loadChecklist,
    orgAccountId,
    requirements,
    stagedFiles,
    textValues,
  ])

  const submitPersonalAccount = useCallback(async () => {
    setAccountForceSubmit((n) => n + 1)
    setFormError(null)

    const local = validateSignupLocal({
      email: account.email,
      password: account.password,
      username: account.username,
      displayName: account.displayName || undefined,
      signupKind: 'personal',
    })
    const confirmOk = validateValue(account.passwordConfirm, passwordConfirmRules).valid
    const nameOk = validateValue(account.displayName, SIGNUP_DISPLAY_NAME_REQUIRED_RULES).valid
    if (!local.ok || !confirmOk || !nameOk) {
      setFormError(
        formatAuthIssues(local.issues) ||
          (!nameOk
            ? 'Enter your name'
            : !confirmOk
              ? 'Passwords must match'
              : 'Check the highlighted fields'),
      )
      return
    }

    setBusy(true)
    try {
      await signUpPersonal({
        email: local.normalized.email,
        password: account.password,
        username: local.normalized.username ?? account.username.trim().toLowerCase(),
        displayName: local.normalized.displayName ?? account.displayName.trim(),
        metadata: { audience },
      })
      writeAuthDashboardSummary({
        username: account.username.trim().toLowerCase() || account.email.trim(),
        kind: 'personal',
        mode: 'sign-up',
        audience,
      })
      if (candidateFlow) {
        goStep(2)
      } else {
        finishPersonalSuccess(PERSONAL_SUCCESS_MESSAGE)
      }
    } catch (e) {
      setFormError(toUserMessage(e, 'Sign up failed'))
    } finally {
      setBusy(false)
    }
  }, [
    account,
    audience,
    candidateFlow,
    finishPersonalSuccess,
    goStep,
    passwordConfirmRules,
  ])

  const resetCvReviewState = useCallback(() => {
    extractGenRef.current += 1
    extractFileKeyRef.current = null
    extractAbortRef.current?.abort()
    extractAbortRef.current = null
    if (streamRafRef.current != null) {
      window.cancelAnimationFrame(streamRafRef.current)
      streamRafRef.current = null
    }
    pendingStreamDocRef.current = null
    prevStreamDocRef.current = null
    setCvDoc(null)
    setCvSourceText('')
    setCvPersonalAccountId(null)
    setCvExtractTips([])
    setCvStreaming(false)
    setCvPolishing(false)
    setCvExtractFailed(false)
    setCvReviewReachedEnd(false)
    setCvPhase('pick')
    setExtractStatus('')
    setCvUploadProgress(null)
  }, [])

  const flushStreamDoc = useCallback(() => {
    streamRafRef.current = null
    const pending = pendingStreamDocRef.current
    if (!pending) return
    pendingStreamDocRef.current = null
    const next = stabilizeStreamSectionIds(
      prevStreamDocRef.current,
      softNormalizeCvStreamDoc(pending.doc),
    )
    prevStreamDocRef.current = next
    setCvDoc(next)
  }, [])

  const queueStreamDoc = useCallback(
    (doc: CvExtractV2, focusId: string | null) => {
      pendingStreamDocRef.current = { doc, focusId }
      if (streamRafRef.current != null) return
      streamRafRef.current = window.requestAnimationFrame(() => flushStreamDoc())
    },
    [flushStreamDoc],
  )

  const runCvExtract = useCallback(
    async (fileOverride?: File) => {
      const file = fileOverride ?? cvFiles[0]
      if (!file) {
        setFormError('Upload your CV to continue')
        return
      }

      const gen = ++extractGenRef.current
      extractAbortRef.current?.abort()
      const abort = new AbortController()
      extractAbortRef.current = abort
      if (streamRafRef.current != null) {
        window.cancelAnimationFrame(streamRafRef.current)
        streamRafRef.current = null
      }
      pendingStreamDocRef.current = null
      prevStreamDocRef.current = null

      setFormError(null)
      setBusy(true)
      setCvStreaming(true)
      setCvPolishing(false)
      setCvExtractFailed(false)
      setCvExtractTips([])
      setCvReviewReachedEnd(false)
      setCvPhase('extracting')
      setExtractStatus('Reading your PDF…')

      try {
        if (!cvIntakeBegun) {
          await cvIntakeBegin()
          if (gen !== extractGenRef.current) return
          setCvIntakeBegun(true)
        }

        setExtractStatus('Preparing your profile…')
        const accounts = await listMyAccounts()
        if (gen !== extractGenRef.current) return
        const personalId = pickPersonalAccountId(accounts)
        if (!personalId) throw new Error('Personal account was not provisioned')
        setCvPersonalAccountId(personalId)

        const result = await extractCvFromPdfFile({
          accountId: personalId,
          file,
          signal: abort.signal,
          stream: true,
          handlers: {
            onPhase: (phase) => {
              if (gen !== extractGenRef.current) return
              if (phase === 'resolve') {
                setCvPolishing(false)
                setExtractStatus('Preparing your profile…')
              } else if (phase === 'pass1') {
                setCvPolishing(false)
                setExtractStatus('Structuring sections…')
              } else if (phase === 'polish') {
                setCvPolishing(true)
                setExtractStatus('Polishing the draft… editing unlocks when this finishes.')
              } else if (phase === 'polish_skipped') {
                setCvPolishing(false)
                setExtractStatus('Almost ready…')
              } else if (phase === 'done') {
                setCvPolishing(false)
                setExtractStatus('Almost ready…')
              } else if (phase === 'retry') {
                setCvPolishing(false)
                setExtractStatus('Connection hiccup — finishing without live preview…')
              }
            },
            onDoc: (doc, focusId) => {
              if (gen !== extractGenRef.current) return
              queueStreamDoc(doc, focusId)
            },
          },
        })
        if (gen !== extractGenRef.current) return

        if (streamRafRef.current != null) {
          window.cancelAnimationFrame(streamRafRef.current)
          streamRafRef.current = null
        }
        flushStreamDoc()

        setCvSourceText(result.pdfText.text)
        const fields = stabilizeStreamSectionIds(
          prevStreamDocRef.current,
          normalizeCvViewerDoc(result.fields),
        )
        prevStreamDocRef.current = fields
        setCvDoc(fields)
        setCvExtractTips(buildCvReviewTips(fields))
        setCvStreaming(false)
        setCvPolishing(false)
        setCvExtractFailed(false)
        setViewerHistoryKey((n) => n + 1)
        setCvReviewReachedEnd(false)
        setCvPhase('review')
        setExtractStatus('')
      } catch (e) {
        if (gen !== extractGenRef.current) return
        if (abort.signal.aborted) return
        setFormError(toUserMessage(e, 'Could not extract CV'))
        setCvPhase('pick')
        setCvDoc(null)
        setCvSourceText('')
        setCvPersonalAccountId(null)
        setCvExtractTips([])
        setCvStreaming(false)
        setCvPolishing(false)
        setCvExtractFailed(true)
        setCvReviewReachedEnd(false)
      } finally {
        if (gen === extractGenRef.current) {
          setBusy(false)
          setCvStreaming(false)
          setCvPolishing(false)
          setExtractStatus('')
        }
      }
    },
    [cvFiles, cvIntakeBegun, flushStreamDoc, queueStreamDoc],
  )
  const runCvSubmit = useCallback(async () => {
    if (!cvDoc || !cvReviewReachedEnd) {
      setFormError('Please review your CV completely before submitting')
      return
    }
    const file = cvFiles[0]
    if (!file) {
      setFormError('Upload your CV to continue')
      return
    }
    setFormError(null)
    setBusy(true)
    try {
      const accounts = await listMyAccounts()
      const personalId = pickPersonalAccountId(accounts)
      if (!personalId) throw new Error('Personal account was not provisioned')
      setCvUploadProgress('indeterminate')
      const node = await uploadBrowserFile(personalId, file, null, {
        onProgress: (ratio) => {
          const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100)
          setCvUploadProgress(pct)
        },
      })
      await cvIntakeComplete(
        {
          schema_version: 2,
          basics: cvDoc.basics,
          sections: cvDoc.sections,
          coverage: cvDoc.coverage,
          missed: cvDoc.missed,
          meta_extract: cvDoc.meta_extract,
        },
        node.id,
      )
      setCvUploadProgress(null)
      finishPersonalSuccess(CV_SUCCESS_MESSAGE)
    } catch (e) {
      setFormError(toUserMessage(e, 'Could not submit CV'))
    } finally {
      setBusy(false)
      setCvUploadProgress(null)
    }
  }, [cvDoc, cvFiles, cvReviewReachedEnd, finishPersonalSuccess])

  const onGoogleSignUp = useCallback(() => {
    void signInWithOAuth(
      'google',
      typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
    ).catch((err) => {
      setFormError(toUserMessage(err, 'Google sign-up failed'))
    })
  }, [])

  const onNext = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault()
      if (step === 0) {
        setFormError(null)
        goStep(1)
        return
      }
      if (step === 1) {
        if (!agreedTerms) {
          setFormError('Agree to the Terms and Conditions to continue.')
          return
        }
        if (!accountReady) {
          setFormError('Fill every required account field to continue.')
          return
        }
        if (agencyFlow) void submitAccount()
        else void submitPersonalAccount()
        return
      }
      if (agencyFlow) {
        if (!docsReady) {
          setFormError('Complete every required document check to upload.')
          return
        }
        void runDocumentUpload()
        return
      }
      if (candidateFlow) {
        if (cvPhase === 'review' && cvReviewReachedEnd && cvDoc) {
          void runCvSubmit()
          return
        }
        if (cvFiles[0] && cvPhase === 'pick') {
          void runCvExtract()
          return
        }
        if (cvPhase === 'extracting') return
        if (cvPhase === 'review' && !cvReviewReachedEnd) {
          setFormError('Please review your CV completely before submitting')
          return
        }
        setFormError('Upload your CV to continue.')
      }
    },
    [
      accountReady,
      agencyFlow,
      agreedTerms,
      candidateFlow,
      cvDoc,
      cvFiles,
      cvPhase,
      cvReviewReachedEnd,
      docsReady,
      goStep,
      runCvExtract,
      runCvSubmit,
      runDocumentUpload,
      step,
      submitAccount,
      submitPersonalAccount,
    ],
  )

  const onBackStep = useCallback(() => {
    setFormError(null)
    if (step === 2) goStep(1)
    else if (step === 1) goStep(0)
  }, [goStep, step])

  useEffect(() => {
    if (step === 2 && orgAccountId) {
      void loadChecklist(orgAccountId).catch(() => undefined)
    }
  }, [loadChecklist, orgAccountId, step])

  useEffect(() => {
    if (!formError) return
    formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [formError])

  useEffect(() => {
    if (cvPhase === 'extracting') {
      cvExtractRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [cvPhase])

  useEffect(() => {
    if (!candidateFlow || step !== 2) return
    const file = cvFiles[0]
    if (!file || cvPhase !== 'pick') return
    const key = `${file.name}:${file.size}:${file.lastModified}`
    if (extractFileKeyRef.current === key) return
    extractFileKeyRef.current = key
    void runCvExtract(file)
  }, [candidateFlow, cvFiles, cvPhase, runCvExtract, step])

  const primaryLabel =
    step === 0
      ? 'Next'
      : step === 1
        ? 'Sign up'
        : agencyFlow
          ? 'Upload'
          : cvPhase === 'review'
            ? 'Submit CV'
            : 'Continue'

  const showCvExtractingTooltip =
    candidateFlow && step === 2 && (cvPhase === 'extracting' || cvLocked)
  const showCvReviewGateTooltip =
    candidateFlow && step === 2 && cvPhase === 'review' && !cvReviewReachedEnd

  const footerStatusCopy =
    step === 2 && agencyFlow && requiredRows.length > 0
      ? `${requiredCompleteCount} of ${requiredRows.length}`
      : step === 2 && candidateFlow
        ? cvPhase === 'extracting' || cvLocked
          ? cvPolishing
            ? 'Polishing your CV…'
            : 'Extracting your CV…'
          : cvPhase === 'review'
            ? cvReviewReachedEnd
              ? 'Ready to submit'
              : 'Scroll through your CV to continue'
            : cvReady
              ? 'CV ready'
              : 'Upload a PDF to begin'
        : null

  const primaryAction = (
    <VurifyMenuButton
      type="button"
      size="md"
      lineTone="accent"
      housing
      activeChrome={false}
      loading={busy}
      disabled={!canProceed || cvLocked}
      className="theme-vurify-sign-up__anim-from-left"
      onClick={() => onNext()}
    >
      {primaryLabel}
    </VurifyMenuButton>
  )

  const gatedPrimary =
    showCvExtractingTooltip || cvLocked ? (
      <Tooltip
        content={
          cvPolishing
            ? 'Still polishing — editing unlocks when this finishes'
            : 'CV extraction is being done'
        }
      >
        {primaryAction}
      </Tooltip>
    ) : showCvReviewGateTooltip ? (
      <Tooltip content="Please review your CV completely before submitting">
        {primaryAction}
      </Tooltip>
    ) : (
      primaryAction
    )

  return (
    <div
      ref={rootRef}
      className={['theme-vurify-sign-up', className].filter(Boolean).join(' ')}
    >
      <header className="theme-vurify-sign-up__header">
        <VurifyMenuButton
          type="button"
          housing
          activeChrome={false}
          riseReplayKey={closeRiseKey}
          className="theme-vurify-sign-up__close theme-vurify-sign-up__anim-from-right"
          onClick={requestClose}
        >
          Close
        </VurifyMenuButton>

        <div
          className="theme-vurify-sign-up__steps theme-vurify-sign-up__anim-from-right"
          aria-label="Progress"
        >
          <StepLoader
            steps={stepCount}
            value={stepProgress}
            variant="vurify"
            tone="accent"
            size="sm"
            label={`Step ${step} · ${stepLabel}`}
            showValue={false}
          />
        </div>
      </header>

      <ThemeScroll
        rail="mini"
        scrollClouds={false}
        className="theme-vurify-sign-up__scroll"
        tabIndex={-1}
        viewportRef={signUpScrollRef}
      >
        <div className="theme-vurify-sign-up__scroll-inner">
          <div
            className="theme-vurify-sign-up__body"
            data-phase={panelPhase}
            data-direction={panelDirection}
            data-step={step}
          >
            {step === 0 ? (
              <div className="theme-vurify-sign-up__type" data-audience={audience}>
                <div className="theme-vurify-sign-up__statement theme-vurify-sign-up__anim-body">
                  <span className="theme-vurify-sign-up__lead">
                    {reducedMotion ? (
                      <>
                        <span className="theme-vurify-sign-up__lead-join">join</span>
                        <span className="theme-vurify-sign-up__lead-as">as</span>
                      </>
                    ) : (
                      <>
                        <PageScrollType
                          as="span"
                          text="join"
                          effect={2}
                          mode="once"
                          delay={ENTER_DELAY + 0.06}
                          className="theme-vurify-sign-up__lead-join"
                        />
                        <PageScrollType
                          as="span"
                          text="as"
                          effect={2}
                          mode="once"
                          delay={ENTER_DELAY + 0.18}
                          className="theme-vurify-sign-up__lead-as"
                        />
                      </>
                    )}
                  </span>
                  <AudienceArticleFlip text={article} reducedMotion={reducedMotion} />
                  <span className="theme-vurify-sign-up__tier">
                    <RadioGroup
                      aria-label="Sign up as"
                      variant="vurify-tiered"
                      tierLabel="Employers"
                      size="lg"
                      options={[...AUDIENCE_OPTIONS]}
                      value={audience}
                      onChange={onAudienceChange}
                      className="theme-vurify-sign-up__tier-control"
                    />
                  </span>
                </div>
                <div className="theme-vurify-sign-up__rule theme-vurify-sign-up__anim-body" aria-hidden />
                <div className="theme-vurify-sign-up__anim-body">
                  <AudienceCopyPanel audience={audience} reducedMotion={reducedMotion} />
                </div>
              </div>
            ) : null}

            {step === 1 && personalFlow ? (
              <form
                id={`vurify-sign-up-account-${formId}`}
                className="theme-vurify-sign-up__form theme-vurify-sign-up__anim-body"
                noValidate
                onSubmit={onNext}
              >
                <div className="theme-vurify-sign-up__grid">
                  <SignUpAccountField
                    label="Email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={account.email}
                    onChange={(value) => patchAccount('email', value)}
                    rules={SIGNUP_EMAIL_RULES}
                    forceSubmit={accountForceSubmit}
                  />
                  <SignUpAccountField
                    label="Name"
                    name="displayName"
                    autoComplete="name"
                    required
                    value={account.displayName}
                    onChange={(value) => patchAccount('displayName', value)}
                    rules={SIGNUP_DISPLAY_NAME_REQUIRED_RULES}
                    forceSubmit={accountForceSubmit}
                  />
                  <SignUpAccountField
                    label="Username"
                    name="username"
                    autoComplete="username"
                    required
                    value={account.username}
                    onChange={(value) => patchAccount('username', value)}
                    rules={SIGNUP_USERNAME_RULES}
                    forceSubmit={accountForceSubmit}
                  />
                  <SignUpAccountField
                    label="Password"
                    name="password"
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={account.password}
                    onChange={(value) => {
                      patchAccount('password', value)
                      if (!value) patchAccount('passwordConfirm', '')
                    }}
                    rules={SIGNUP_PASSWORD_RULES}
                    forceSubmit={accountForceSubmit}
                    trailing={
                      <VurifyPasswordToggle
                        revealed={passwordVisible}
                        onToggle={() => setPasswordVisible((v) => !v)}
                      />
                    }
                    meta={
                      <div
                        className="theme-vurify-sign-up__password-strength"
                        data-visible={account.password ? 'true' : 'false'}
                        data-strength={passwordStrengthTone(passwordStrength)}
                      >
                        <BarLoader
                          value={passwordStrength}
                          size="sm"
                          tone={passwordStrengthTone(passwordStrength)}
                          label="Password"
                          className="theme-vurify-sign-up__password-strength-bar"
                        />
                      </div>
                    }
                  />
                  <SignUpAccountField
                    label="Confirm password"
                    name="passwordConfirm"
                    type={passwordConfirmVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    disabled={!account.password}
                    value={account.passwordConfirm}
                    onChange={(value) => patchAccount('passwordConfirm', value)}
                    rules={passwordConfirmRules}
                    forceSubmit={accountForceSubmit}
                    trailing={
                      <VurifyPasswordToggle
                        revealed={passwordConfirmVisible}
                        disabled={!account.password}
                        onToggle={() => setPasswordConfirmVisible((v) => !v)}
                      />
                    }
                  />
                </div>
                <div className="theme-vurify-sign-up__terms">
                  <Checkbox
                    size="sm"
                    checked={agreedTerms}
                    onChange={setAgreedTerms}
                    aria-label="Agree to the Terms and Conditions"
                    className="theme-vurify-sign-up__terms-check"
                  />
                  <p className="theme-vurify-sign-up__terms-copy type-label mb-0">
                    I agree to the Terms and Conditions{' '}
                    <a href={TERMS_HREF} className="type-link theme-vurify-sign-up__terms-link">
                      see here
                      <ArrowUpRight
                        className="theme-vurify-sign-up__terms-link-icon"
                        aria-hidden
                        strokeWidth={2}
                      />
                    </a>
                  </p>
                </div>
                <div className="theme-vurify-sign-up__oauth theme-vurify-sign-up__anim-body">
                  <div className="theme-vurify-sign-up__oauth-divider" role="separator" aria-label="Or">
                    <span className="theme-vurify-sign-up__oauth-line" aria-hidden />
                    <span className="theme-vurify-sign-up__oauth-label type-caption type-muted">
                      OR
                    </span>
                    <span className="theme-vurify-sign-up__oauth-line" aria-hidden />
                  </div>
                  <VurifyMenuButton
                    type="button"
                    size="md"
                    iconNode={GoogleIcon}
                    lineTone="text"
                    housing
                    className="theme-vurify-sign-up__google"
                    onClick={onGoogleSignUp}
                  >
                    Sign up with Google
                  </VurifyMenuButton>
                </div>
              </form>
            ) : null}

            {step === 1 && agencyFlow ? (
              <form
                id={`vurify-sign-up-account-${formId}`}
                className="theme-vurify-sign-up__form theme-vurify-sign-up__anim-body"
                noValidate
                onSubmit={onNext}
              >
                <div className="theme-vurify-sign-up__grid">
                  <SignUpAccountField
                    label="Email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={account.email}
                    onChange={(value) => patchAccount('email', value)}
                    rules={SIGNUP_EMAIL_RULES}
                    forceSubmit={accountForceSubmit}
                  />
                  <SignUpAccountField
                    label="Organisation name"
                    name="orgName"
                    required
                    value={account.orgName}
                    onChange={(value) => patchAccount('orgName', value)}
                    rules={SIGNUP_ORG_NAME_RULES}
                    forceSubmit={accountForceSubmit}
                    meta={
                      <span className="theme-vurify-sign-up__phone-meta type-caption type-muted">
                        Also used as your public handle
                      </span>
                    }
                  />
                  <SignUpAccountField
                    label="Password"
                    name="password"
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={account.password}
                    onChange={(value) => {
                      patchAccount('password', value)
                      if (!value) patchAccount('passwordConfirm', '')
                    }}
                    rules={SIGNUP_PASSWORD_RULES}
                    forceSubmit={accountForceSubmit}
                    trailing={
                      <VurifyPasswordToggle
                        revealed={passwordVisible}
                        onToggle={() => setPasswordVisible((v) => !v)}
                      />
                    }
                    meta={
                      <div
                        className="theme-vurify-sign-up__password-strength"
                        data-visible={account.password ? 'true' : 'false'}
                        data-strength={passwordStrengthTone(passwordStrength)}
                      >
                        <BarLoader
                          value={passwordStrength}
                          size="sm"
                          tone={passwordStrengthTone(passwordStrength)}
                          label="Password"
                          className="theme-vurify-sign-up__password-strength-bar"
                        />
                      </div>
                    }
                  />
                  <SignUpAccountField
                    label="Confirm password"
                    name="passwordConfirm"
                    type={passwordConfirmVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    disabled={!account.password}
                    value={account.passwordConfirm}
                    onChange={(value) => patchAccount('passwordConfirm', value)}
                    rules={passwordConfirmRules}
                    forceSubmit={accountForceSubmit}
                    trailing={
                      <VurifyPasswordToggle
                        revealed={passwordConfirmVisible}
                        disabled={!account.password}
                        onToggle={() => setPasswordConfirmVisible((v) => !v)}
                      />
                    }
                  />
                  <SignUpAccountField
                    label="Display name"
                    name="displayName"
                    autoComplete="name"
                    value={account.displayName}
                    onChange={(value) => patchAccount('displayName', value)}
                    rules={SIGNUP_DISPLAY_NAME_RULES}
                    forceSubmit={accountForceSubmit}
                  />
                  <SignUpAccountField
                    label="Phone (optional)"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    ariaLabel="Phone number (optional)"
                    value={account.phone}
                    onChange={(value) => patchAccount('phone', formatPhoneDisplay(value))}
                    rules={SIGNUP_PHONE_RULES}
                    forceSubmit={accountForceSubmit}
                    meta={
                      <span className="theme-vurify-sign-up__phone-meta type-caption type-muted">
                        Example: {PHONE_SAMPLE}
                      </span>
                    }
                  />
                </div>
                <div className="theme-vurify-sign-up__terms">
                  <Checkbox
                    size="sm"
                    checked={agreedTerms}
                    onChange={setAgreedTerms}
                    aria-label="Agree to the Terms and Conditions"
                    className="theme-vurify-sign-up__terms-check"
                  />
                  <p className="theme-vurify-sign-up__terms-copy type-label mb-0">
                    I agree to the Terms and Conditions{' '}
                    <a href={TERMS_HREF} className="type-link theme-vurify-sign-up__terms-link">
                      see here
                      <ArrowUpRight
                        className="theme-vurify-sign-up__terms-link-icon"
                        aria-hidden
                        strokeWidth={2}
                      />
                    </a>
                  </p>
                </div>
              </form>
            ) : null}

            {step === 2 && agencyFlow ? (
              <div className="theme-vurify-sign-up__docs">
                <ul className="theme-vurify-sign-up__checklist theme-vurify-sign-up__anim-body">
                  {requirements.map((row) => {
                    const done = isRequirementDone(row)
                    const progress = uploadProgress[row.key]
                    const serverName =
                      fileNames[row.key] ||
                      (row.submission?.fileNodeId ? 'Uploaded' : null)
                    return (
                      <li
                        key={row.key}
                        className="theme-vurify-sign-up__check-wrap"
                        data-done={done || undefined}
                      >
                        <Card
                          variant="vurify"
                          cornerGeometry="sharp"
                          className="theme-vurify-sign-up__check-card"
                        >
                          <div className="theme-vurify-sign-up__check-head">
                            {done ? (
                              <CheckCircle2
                                className="theme-vurify-sign-up__check-icon theme-vurify-sign-up__check-icon--done"
                                aria-hidden
                                strokeWidth={2}
                              />
                            ) : (
                              <Circle
                                className="theme-vurify-sign-up__check-icon"
                                aria-hidden
                                strokeWidth={2}
                              />
                            )}
                            <div className="theme-vurify-sign-up__check-copy">
                              <p className="theme-vurify-sign-up__check-title type-label mb-0">
                                {row.label}
                                {row.required ? (
                                  <span className="type-caption type-muted"> · required</span>
                                ) : (
                                  <span className="type-caption type-muted"> · optional</span>
                                )}
                              </p>
                              {row.description ? (
                                <p className="type-caption type-muted mb-0">{row.description}</p>
                              ) : null}
                            </div>
                          </div>

                          <div
                            className="theme-vurify-sign-up__check-rule"
                            aria-hidden
                          />

                          {row.inputKind === 'text' ? (
                            <Field className="theme-vurify-sign-up__field">
                              <VurifyInput
                                label={row.label}
                                value={textValues[row.key] ?? ''}
                                onChange={(e) =>
                                  setTextValues((prev) => ({
                                    ...prev,
                                    [row.key]: e.target.value,
                                  }))
                                }
                                disabled={busy}
                              />
                            </Field>
                          ) : (
                            <div className="theme-vurify-sign-up__upload">
                              {serverName && !(stagedFiles[row.key]?.length) ? (
                                <p
                                  className="theme-vurify-sign-up__upload-status type-caption type-muted mb-0"
                                  title={serverName}
                                >
                                  On file: {serverName}
                                </p>
                              ) : null}
                              <DataUpload
                                layout="rows"
                                preview="rows"
                                listScroll={false}
                                multiple={false}
                                maxFiles={1}
                                accept={requirementAccept(row)}
                                value={stagedFiles[row.key] ?? []}
                                onValueChange={(files) =>
                                  setStagedFiles((prev) => ({ ...prev, [row.key]: files }))
                                }
                                disabled={busy}
                                className="theme-vurify-sign-up__data-upload"
                              />
                              {progress != null ? (
                                <div className="theme-vurify-sign-up__upload-progress">
                                  <BarLoader
                                    size="sm"
                                    tone="accent"
                                    indeterminate={progress === 'indeterminate'}
                                    value={typeof progress === 'number' ? progress : 0}
                                    label={`Uploading ${row.label}`}
                                    showValue={typeof progress === 'number'}
                                  />
                                </div>
                              ) : null}
                            </div>
                          )}
                        </Card>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}

            {step === 2 && candidateFlow ? (
              <div
                className="theme-vurify-sign-up__docs theme-vurify-sign-up__cv theme-vurify-sign-up__anim-body"
              >
                <Card
                  variant="vurify"
                  cornerGeometry="sharp"
                  className="theme-vurify-sign-up__check-card"
                >
                  <div className="theme-vurify-sign-up__check-head">
                    {cvReady ? (
                      <CheckCircle2
                        className="theme-vurify-sign-up__check-icon theme-vurify-sign-up__check-icon--done"
                        aria-hidden
                        strokeWidth={2}
                      />
                    ) : (
                      <Circle
                        className="theme-vurify-sign-up__check-icon"
                        aria-hidden
                        strokeWidth={2}
                      />
                    )}
                    <div className="theme-vurify-sign-up__check-copy">
                      <p className="theme-vurify-sign-up__check-title type-label mb-0">
                        Curriculum vitae
                        <span className="type-caption type-muted"> · required</span>
                      </p>
                      <p className="type-caption type-muted mb-0">
                        Upload a PDF of your CV. Review the extracted profile before submitting.
                      </p>
                    </div>
                  </div>
                  <div className="theme-vurify-sign-up__check-rule" aria-hidden />
                  <div className="theme-vurify-sign-up__upload">
                    <DataUpload
                      layout="rows"
                      preview="rows"
                      listScroll={false}
                      multiple={false}
                      maxFiles={1}
                      accept="application/pdf"
                      value={cvFiles}
                      onValueChange={(files) => {
                        if (cvPhase !== 'pick' || cvDoc) {
                          resetCvReviewState()
                          setBusy(false)
                        }
                        const next = files[0]
                        if (!next) {
                          extractFileKeyRef.current = null
                        } else {
                          const key = `${next.name}:${next.size}:${next.lastModified}`
                          if (key !== extractFileKeyRef.current) {
                            extractFileKeyRef.current = null
                          }
                        }
                        setCvFiles(files)
                      }}
                      disabled={busy}
                      className="theme-vurify-sign-up__data-upload"
                    />
                    {cvUploadProgress != null && cvPhase === 'review' ? (
                      <div className="theme-vurify-sign-up__upload-progress">
                        <BarLoader
                          size="sm"
                          tone="accent"
                          indeterminate={cvUploadProgress === 'indeterminate'}
                          value={typeof cvUploadProgress === 'number' ? cvUploadProgress : 0}
                          label="Uploading CV"
                          showValue={typeof cvUploadProgress === 'number'}
                        />
                      </div>
                    ) : null}
                  </div>
                </Card>

                {cvPhase === 'extracting' || cvPhase === 'review' ? (
                  <div className="theme-vurify-sign-up__cv-divider" aria-hidden />
                ) : null}

                {cvPhase === 'extracting' || (cvPhase === 'review' && cvDoc) ? (
                  <section
                    ref={(el) => {
                      cvExtractRef.current = el
                      cvReviewRef.current = el
                    }}
                    className="theme-vurify-sign-up__cv-review"
                    aria-label={
                      cvPolishing
                        ? 'Polishing CV'
                        : cvLocked
                          ? 'Extracting CV'
                          : 'Review extracted CV'
                    }
                    aria-busy={cvLocked ? 'true' : undefined}
                  >
                    <div className="theme-vurify-sign-up__cv-review-head">
                      <h2 className="type-title mb-0">
                        {cvPolishing
                          ? 'Polishing your CV'
                          : cvLocked
                            ? 'Extracting your CV'
                            : 'Review and edit'}
                      </h2>
                      {!cvLocked ? (
                        <InfoTooltip content="Click any field to edit. Use the edge + menus to add items. Scroll to the end of the document before submitting." />
                      ) : null}
                    </div>
                    {cvLocked ? (
                      <>
                        <p
                          className="theme-vurify-sign-up__cv-extract-status type-body type-muted mb-0"
                          aria-live="polite"
                        >
                          {extractStatus || 'Working…'}
                        </p>
                        <BarLoader
                          size="sm"
                          tone="accent"
                          indeterminate
                          value={0}
                          showValue={false}
                          className="theme-vurify-sign-up__cv-extract-bar"
                        />
                      </>
                    ) : (
                      <ul className="theme-vurify-sign-up__cv-tips">
                        <li>Click any field to edit names, dates, and bullets.</li>
                        <li>Use the edge + menus to add sections or items.</li>
                        <li>Scroll through the full document before submitting.</li>
                        {cvExtractTips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    )}
                    <div className="theme-vurify-sign-up__cv-divider" aria-hidden />
                    {cvDoc ? (
                      <VurifyViewer
                        value={cvDoc}
                        onChange={setCvDoc}
                        editable={!cvLocked}
                        streaming={cvLocked}
                        historyKey={viewerHistoryKey}
                        layout="flow"
                        pageScrollRootRef={signUpScrollRef}
                        onReachEndChange={setCvReviewReachedEnd}
                        subsectionToc
                        className={[
                          'theme-vurify-sign-up__viewer',
                          cvPolishing ? 'theme-vurify-sign-up__viewer--polishing' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      />
                    ) : cvLocked ? (
                      <p className="type-caption type-muted mb-0">Building your document…</p>
                    ) : null}
                  </section>
                ) : null}
              </div>
            ) : null}
        </div>

          {(formError || successMessage || (candidateFlow && cvExtractFailed && cvFiles[0])) && (
            <div className="theme-vurify-sign-up__status theme-vurify-sign-up__anim-body">
              {formError || (candidateFlow && cvExtractFailed && cvFiles[0]) ? (
                <div className="theme-vurify-sign-up__status-error-row">
                  {formError ? (
                    <p
                      ref={formErrorRef}
                      className="theme-vurify-sign-up__error type-caption"
                      role="alert"
                    >
                      {formError}
                    </p>
                  ) : null}
                  {candidateFlow && cvExtractFailed && cvFiles[0] ? (
                    <Tooltip content="Run CV extraction again on the uploaded PDF">
                      <VurifyMenuButton
                        type="button"
                        size="sm"
                        lineTone="accent"
                        housing
                        activeChrome={false}
                        disabled={busy || cvLocked}
                        className="theme-vurify-sign-up__try-again"
                        onClick={() => {
                          extractFileKeyRef.current = null
                          void runCvExtract()
                        }}
                      >
                        Try again
                      </VurifyMenuButton>
                    </Tooltip>
                  ) : null}
                </div>
              ) : null}
              {successMessage ? (
                <p className="theme-vurify-sign-up__success type-caption" role="status">
                  {successMessage}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </ThemeScroll>

      <footer className="theme-vurify-sign-up__footer">
        <div className="theme-vurify-sign-up__actions">
          <VurifyMenuButton
            type="button"
            size="md"
            icon={ArrowLeft}
            lineTone="muted"
            disabled={busy || cvLocked || step === 0}
            className="theme-vurify-sign-up__anim-from-left"
            onClick={onBackStep}
          >
            Previous
          </VurifyMenuButton>
          <p
            className="theme-vurify-sign-up__footer-count theme-vurify-sign-up__anim-body"
            aria-live="polite"
            data-phase={panelPhase}
            data-direction={panelDirection}
            data-complete={
              step === 2 &&
              ((agencyFlow && requiredRows.length > 0 && requiredLeftCount === 0) ||
                (candidateFlow && cvSubmitReady))
                ? 'true'
                : undefined
            }
          >
            {step === 2 && agencyFlow && requiredRows.length > 0
              ? `${requiredCompleteCount} of ${requiredRows.length}`
              : step === 2 && candidateFlow
                ? footerStatusCopy
                : null}
          </p>
          {gatedPrimary}
        </div>
      </footer>
    </div>
  )
}
