import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { GoogleIcon } from '@hugeicons/core-free-icons'
import { useAppStage } from '../lib/appStage/appStageContext'
import { signIn, signInWithOAuth } from '../lib/authApi'
import { writeAuthDashboardSummary } from '../lib/authApi/dashboardSession'
import { toUserMessage } from '../lib/dataApi'
import { getMyProfile } from '../lib/userApi'
import {
  validateValue,
  validators,
  type ValidationRule,
} from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Checkbox } from './Checkbox'
import { Field } from './Field'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifyInput } from './VurifyInput'
import { VurifyPasswordToggle } from './VurifyPasswordToggle'

const EMAIL_RULES: ValidationRule[] = [
  validators.required('Email is required'),
  validators.email('Enter a valid email'),
]

const PASSWORD_RULES: ValidationRule[] = [
  validators.required('Password is required'),
  validators.minLength(6, 'Password must be at least 6 characters'),
]

type VurifyLoginFormProps = {
  className?: string
  onSubmitted?: () => void
  /** Compact layout for the header menu panel. */
  density?: 'default' | 'compact'
}

type LoginFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  rules?: readonly ValidationRule[]
  type?: string
  name?: string
  autoComplete?: string
  required?: boolean
  forceSubmit: number
}

function LoginVurifyField({
  label,
  value,
  onChange,
  rules = [],
  type = 'text',
  name,
  autoComplete,
  required,
  forceSubmit,
}: LoginFieldProps) {
  const { error, onBlur, notifyChange, markSubmitted } = useFormFieldValidation({
    value,
    rules,
    validateOn: ['blur', 'change', 'submit'],
    showSuccessWhenValid: false,
  })
  const [passwordVisible, setPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (passwordVisible ? 'text' : 'password') : type

  useEffect(() => {
    if (forceSubmit > 0) markSubmitted()
  }, [forceSubmit, markSubmitted])

  const field = (
    <VurifyInput
      label={label}
      name={name}
      type={inputType}
      autoComplete={autoComplete}
      value={value}
      required={required}
      onChange={(event) => {
        notifyChange()
        onChange(event.target.value)
      }}
      onBlur={onBlur}
      className="theme-vurify-login__input"
      trailing={
        isPassword ? (
          <VurifyPasswordToggle
            revealed={passwordVisible}
            onToggle={() => setPasswordVisible((current) => !current)}
          />
        ) : undefined
      }
    />
  )

  return (
    <Field error={error} className="theme-vurify-login__field">
      {field}
    </Field>
  )
}

/**
 * Vurify login form — email · password · stay logged in · Google.
 * Side-column helpers (sign up / forgot / verify) live on SceneStackMenu login head.
 * Wired to authApi.signIn → dashboard on success.
 */
export function VurifyLoginForm({
  className,
  onSubmitted,
  density = 'default',
}: VurifyLoginFormProps) {
  const { goDashboard } = useAppStage()
  const formId = useId().replace(/:/g, '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [stayLoggedIn, setStayLoggedIn] = useState(false)
  const [forceSubmit, setForceSubmit] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const formErrorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (!formError) return
    formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [formError])

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setForceSubmit((n) => n + 1)

      const checks = [
        validateValue(email, EMAIL_RULES),
        validateValue(password, PASSWORD_RULES),
      ]
      if (checks.some((result) => !result.valid)) {
        setFormError('Check the highlighted fields and try again.')
        return
      }

      setFormError(null)
      setBusy(true)
      try {
        void stayLoggedIn
        await signIn({ email: email.trim(), password })
        const profile = await getMyProfile()
        const username =
          (typeof profile?.username === 'string' && profile.username) ||
          email.trim().split('@')[0] ||
          email.trim()
        const kind =
          profile?.signup_kind === 'organisation' || profile?.signupKind === 'organisation'
            ? 'organisation'
            : profile?.signup_kind === 'personal' || profile?.signupKind === 'personal'
              ? 'personal'
              : 'unknown'
        writeAuthDashboardSummary({
          username,
          kind,
          mode: 'sign-in',
        })
        onSubmitted?.()
        goDashboard()
      } catch (e) {
        setFormError(toUserMessage(e, 'Sign in failed'))
      } finally {
        setBusy(false)
      }
    },
    [email, goDashboard, onSubmitted, password, stayLoggedIn],
  )

  const onGoogleSignIn = useCallback(() => {
    void signInWithOAuth(
      'google',
      typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
    ).catch((err) => {
      setFormError(toUserMessage(err, 'Google sign-in failed'))
    })
  }, [])

  return (
    <form
      id={`vurify-login-${formId}`}
      className={['theme-vurify-login', className].filter(Boolean).join(' ')}
      data-density={density}
      noValidate
      onSubmit={(e) => void onSubmit(e)}
    >
      <div className="theme-vurify-login__grid">
        <LoginVurifyField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
          rules={EMAIL_RULES}
          forceSubmit={forceSubmit}
        />
        <LoginVurifyField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
          rules={PASSWORD_RULES}
          forceSubmit={forceSubmit}
        />
      </div>

      <div className="theme-vurify-login__meta">
        <Checkbox
          size="sm"
          checked={stayLoggedIn}
          onChange={setStayLoggedIn}
          label="Stay logged in"
          className="theme-vurify-login__stay"
        />
        <VurifyMenuButton
          type="submit"
          size="md"
          lineTone="accent"
          housing
          loading={busy}
          className="theme-vurify-login__submit"
        >
          Log in
        </VurifyMenuButton>
      </div>

      {formError ? (
        <p
          ref={formErrorRef}
          className="theme-vurify-login__form-error type-caption"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <div className="theme-vurify-login__divider" role="separator" aria-label="Or">
        <span className="theme-vurify-login__divider-line" aria-hidden />
        <span className="theme-vurify-login__divider-label type-caption type-muted">OR</span>
        <span className="theme-vurify-login__divider-line" aria-hidden />
      </div>

      <div className="theme-vurify-login__oauth">
        <VurifyMenuButton
          type="button"
          size="md"
          iconNode={GoogleIcon}
          lineTone="text"
          housing
          className="theme-vurify-login__google"
          onClick={onGoogleSignIn}
        >
          Sign in with Google
        </VurifyMenuButton>
      </div>
    </form>
  )
}
