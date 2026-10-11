import { getSupabase, unwrapPlatformEnvelope, type PlatformEnvelope } from '../dataApi'

export type ContactSendPayload = {
  name: string
  email: string
  message: string
}

export type ContactSendResult = {
  ok: true
  id: string | null
}

/**
 * Send Home contact / booking form via Edge Function `contact-send` (Resend fixture).
 * Requires functions serve + `RESEND_API_KEY` in `back_end/.env`.
 */
export async function sendContactMessage(
  payload: ContactSendPayload,
): Promise<ContactSendResult> {
  const { data, error } = await getSupabase().functions.invoke('contact-send', {
    body: {
      name: payload.name.trim(),
      email: payload.email.trim(),
      message: payload.message.trim(),
    },
  })

  if (error) {
    throw new Error(error.message || 'Could not send your message. Try again.')
  }

  if (data && typeof data === 'object') {
    const obj = data as { error?: unknown; data?: unknown; meta?: unknown }
    if (obj.error) {
      const code = String(obj.error)
      if (code === 'missing_resend_key') {
        throw new Error('Email is not configured yet. Please try again later.')
      }
      if (code === 'invalid_name' || code === 'invalid_email' || code === 'invalid_message') {
        throw new Error('Check the highlighted fields and try again.')
      }
      if (code === 'resend_failed') {
        throw new Error('Could not deliver your message. Try again in a moment.')
      }
      throw new Error('Could not send your message. Try again.')
    }
    if ('data' in obj || 'error' in obj || 'meta' in obj) {
      return unwrapPlatformEnvelope(data as PlatformEnvelope<ContactSendResult>)
    }
  }

  return { ok: true, id: null }
}
