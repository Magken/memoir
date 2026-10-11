import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import {
  validateValue,
  validators,
  validationPresets,
  wordCount,
  type ValidationRule,
} from '../lib/forms/formValidation'
import { sendContactMessage } from '../lib/contactApi'
import { VURIFY_CONTACT_TARGET_ID } from '../lib/menus/homeNavLinks'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Field } from './Field'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifyInput } from './VurifyInput'

export { VURIFY_CONTACT_TARGET_ID }

const MESSAGE_MAX_WORDS = 200
const MESSAGE_MAX_CHARS = 1200

const NAME_RULES: ValidationRule[] = [
  validators.required('Name is required'),
  validators.minLength(2, 'Enter at least 2 characters'),
  validators.maxLength(80, 'Name must be at most 80 characters'),
]

const MESSAGE_RULES: ValidationRule[] = [
  validators.required('Message is required'),
  validators.minLength(12, 'Tell us a bit more (at least 12 characters)'),
  validators.maxLength(
    MESSAGE_MAX_CHARS,
    `Message must be at most ${MESSAGE_MAX_CHARS} characters`,
  ),
  validators.maxWords(MESSAGE_MAX_WORDS),
]

type VurifyContactFormProps = {
  className?: string
  onSubmitted?: () => void
  /** Compact layout for the header menu panel. */
  density?: 'default' | 'compact'
}

type ContactFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  rules?: readonly ValidationRule[]
  type?: string
  name?: string
  autoComplete?: string
  required?: boolean
  variant?: 'line' | 'area'
  counter?: { value: number; max: number }
  forceSubmit: number
  rows?: number
}

function ContactVurifyField({
  label,
  value,
  onChange,
  rules = [],
  type = 'text',
  name,
  autoComplete,
  required,
  variant = 'line',
  counter,
  forceSubmit,
  rows,
}: ContactFieldProps) {
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
    <Field error={error} counter={counter} className="theme-vurify-contact__field">
      {variant === 'area' ? (
        <VurifyInput
          variant="area"
          label={label}
          name={name}
          value={value}
          required={required}
          rows={rows ?? 4}
          onChange={(event) => {
            notifyChange()
            onChange(event.target.value)
          }}
          onBlur={onBlur}
          className="theme-vurify-contact__input"
        />
      ) : (
        <VurifyInput
          label={label}
          name={name}
          type={type}
          autoComplete={autoComplete}
          value={value}
          required={required}
          onChange={(event) => {
            notifyChange()
            onChange(event.target.value)
          }}
          onBlur={onBlur}
          className="theme-vurify-contact__input"
        />
      )}
    </Field>
  )
}

/**
 * Vurify contact form — name · email · message · send (Resend via contact-send Edge).
 */
export function VurifyContactForm({
  className,
  onSubmitted,
  density = 'default',
}: VurifyContactFormProps) {
  const formId = useId().replace(/:/g, '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [forceSubmit, setForceSubmit] = useState(0)
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const messageWords = useMemo(() => wordCount(message), [message])

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (sending) return
      setForceSubmit((n) => n + 1)

      const checks = [
        validateValue(name, NAME_RULES),
        validateValue(email, validationPresets.email),
        validateValue(message, MESSAGE_RULES),
      ]
      if (checks.some((result) => !result.valid)) {
        setFormError('Check the highlighted fields and try again.')
        return
      }

      setFormError(null)
      setSending(true)
      try {
        await sendContactMessage({ name, email, message })
        setDone(true)
        onSubmitted?.()
      } catch (err) {
        setFormError(
          err instanceof Error && err.message
            ? err.message
            : 'Could not send your message. Try again.',
        )
      } finally {
        setSending(false)
      }
    },
    [name, email, message, onSubmitted, sending],
  )

  if (done) {
    return (
      <div
        className={['theme-vurify-contact', 'theme-vurify-contact--done', className]
          .filter(Boolean)
          .join(' ')}
        data-density={density}
        role="status"
      >
        <p className="theme-vurify-contact__done-title type-h4">Message sent</p>
        <p className="theme-vurify-contact__done-body type-body-sm type-muted">
          Thanks{name.trim() ? `, ${name.trim()}` : ''}. We’ll get back to you at{' '}
          {email.trim() || 'your inbox'}.
        </p>
      </div>
    )
  }

  return (
    <form
      id={`vurify-contact-${formId}`}
      className={['theme-vurify-contact', className].filter(Boolean).join(' ')}
      data-density={density}
      noValidate
      aria-busy={sending || undefined}
      onSubmit={onSubmit}
    >
      <div className="theme-vurify-contact__grid">
        <ContactVurifyField
          label="Name"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={setName}
          rules={NAME_RULES}
          forceSubmit={forceSubmit}
        />
        <ContactVurifyField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
          rules={validationPresets.email}
          forceSubmit={forceSubmit}
        />
        <ContactVurifyField
          label="Message"
          name="message"
          variant="area"
          required
          value={message}
          onChange={setMessage}
          rules={MESSAGE_RULES}
          forceSubmit={forceSubmit}
          counter={{ value: messageWords, max: MESSAGE_MAX_WORDS }}
          rows={density === 'compact' ? 3 : 4}
        />
      </div>

      {formError ? (
        <p className="theme-vurify-contact__form-error type-caption" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="theme-vurify-contact__actions">
        <VurifyMenuButton type="submit" size="md" lineTone="accent" housing disabled={sending}>
          {sending ? 'Sending…' : 'Send'}
        </VurifyMenuButton>
      </div>
    </form>
  )
}
