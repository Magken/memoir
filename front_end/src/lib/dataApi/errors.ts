/**
 * Platform / Auth / soft-envelope errors → user-facing copy.
 *
 * Contract (do not break without FE + memoir update):
 * - Hard RPC: `app_raise(code, detail)` → EXCEPTION MESSAGE = machine code, DETAIL = context
 * - Soft envelope: `{ error: { code, detail?, issues? } }` — unwrap via `unwrapPlatformEnvelope`
 * - Product UI: always `toUserMessage(err)` — never show raw codes or UUIDs
 */
import { AuthValidationError, mapAuthClientError } from '../authValidation'
import type { DataApiErrorCode, PlatformEnvelope } from './types'
import { DataApiError } from './types'

/** Recognized machine codes (PostgREST MESSAGE / soft envelope `error.code`). */
export const KNOWN_DATA_API_CODES: readonly DataApiErrorCode[] = [
  'unknown_resource',
  'field_not_allowed',
  'filter_not_allowed',
  'sort_not_allowed',
  'limit_exceeded',
  'not_found',
  'forbidden',
  'not_authenticated',
  'type_mismatch',
  'validation_failed',
  'if_match_failed',
  'account_banned',
  'username_taken',
  'username_invalid',
  'email_invalid',
  'email_taken',
  'password_too_short',
  'password_complexity',
  'org_name_required',
  'org_name_taken',
  'org_slug_taken',
  'org_slug_invalid',
  'cron_unavailable',
  'conflict',
  'files_unavailable',
  'files_gone',
  'files_link_invalid',
  'files_quota_exceeded',
  'files_cooldown',
  'org_onboarding_unknown_key',
  'org_onboarding_disabled',
  'org_onboarding_value_required',
  'org_onboarding_file_required',
  'org_onboarding_invalid_kind',
  'org_onboarding_incomplete',
  'cv_intake_not_required',
  'cv_intake_already_complete',
  'cv_not_found',
  'cv_schema_invalid',
  'cv_section_not_found',
  'cv_not_discoverable',
  'employer_not_verified',
  'cv_extract_failed',
  'missing_openai_key',
  'live_transcribe_session_failed',
  'live_transcribe_failed',
  'live_transcribe_webrtc_failed',
  'mic_unavailable',
  'mic_permission_denied',
  'talk_turn_failed',
  'compose_empty',
  'pdf_read_failed',
  'pdf_text_empty',
  'pdf_text_too_thin',
  'pdf_password_protected',
  'pass1_parse_failed',
  'cv_extract_empty',
  'files_get_failed',
  'missing_supabase_env',
  'interview_not_open',
  'interview_archived',
  'interview_not_published',
  'interview_not_draft',
  'interview_has_attempts',
  'interview_attempt_open',
  'interview_attempt_limit',
  'interview_attempt_state',
  'interview_org_only',
  'interview_personal_only',
  'interview_invite_expired',
  'interview_invite_revoked',
  'interview_invite_accepted',
  'interview_invite_email_mismatch',
  'not_implemented',
  'unknown',
] as const

const USER_MESSAGE_BY_CODE: Record<string, string> = {
  unknown_resource: 'That resource is not available.',
  field_not_allowed: 'One of the fields is not allowed.',
  filter_not_allowed: 'That filter is not allowed.',
  sort_not_allowed: 'That sort is not allowed.',
  limit_exceeded: 'Too many rows requested. Try a smaller page size.',
  not_found: 'We could not find that item.',
  forbidden: 'You do not have permission to do that.',
  not_authenticated: 'Sign in to continue.',
  type_mismatch: 'One of the values has the wrong type.',
  validation_failed: 'Check the highlighted fields and try again.',
  if_match_failed: 'This item changed elsewhere. Refresh and try again.',
  account_banned: 'This account is suspended.',
  username_taken: 'This username is already taken.',
  username_invalid: 'Username must be 3–30 characters: a–z, 0–9, underscore.',
  email_invalid: 'Enter a valid email address.',
  email_taken: 'An account with this email already exists.',
  password_too_short: 'Password is too short.',
  password_complexity: 'Password does not meet the required complexity.',
  org_name_required: 'Organisation name is required.',
  org_name_taken: 'An organisation with this name already exists.',
  org_slug_taken: 'That organisation slug is already taken.',
  org_slug_invalid: 'Organisation slug must be lowercase kebab-case.',
  cron_unavailable: 'Scheduling is temporarily unavailable.',
  conflict: 'That conflicts with an existing item.',
  files_unavailable: 'This file is no longer available.',
  files_gone: 'This file was permanently deleted.',
  files_link_invalid: 'That link is invalid or expired.',
  files_quota_exceeded: 'Storage quota exceeded for this account.',
  files_cooldown: 'Please wait a moment before trying again.',
  org_onboarding_unknown_key: 'Unknown onboarding requirement.',
  org_onboarding_disabled: 'That onboarding step is disabled.',
  org_onboarding_value_required: 'Add the required text for this step.',
  org_onboarding_file_required: 'Upload the required file for this step.',
  org_onboarding_invalid_kind: 'That submission type does not match this step.',
  org_onboarding_incomplete: 'Finish all required onboarding steps first.',
  cv_intake_not_required: 'CV intake is not required for this account.',
  cv_intake_already_complete: 'CV intake is already complete.',
  cv_not_found: 'CV document was not found.',
  cv_schema_invalid: 'CV data did not match the expected shape.',
  cv_section_not_found: 'That CV section was not found.',
  cv_not_discoverable: 'This profile is not visible in the talent pool.',
  employer_not_verified: 'Organisation must finish verification first.',
  cv_extract_failed: 'Could not extract data from that CV. Try another file.',
  missing_openai_key: 'AI generation is not configured on this environment.',
  live_transcribe_session_failed: 'Could not start live transcription. Try again.',
  live_transcribe_failed: 'Live transcription failed. Try again.',
  live_transcribe_webrtc_failed: 'Could not connect the microphone stream. Try again.',
  mic_unavailable: 'No microphone was found on this device.',
  mic_permission_denied: 'Allow microphone access to dictate into the composer.',
  talk_turn_failed: 'Could not get the next interviewer reply. Try again.',
  compose_empty: 'The interviewer returned an empty reply. Try again.',
  pdf_read_failed: 'We could not open that PDF. Try a different file.',
  pdf_text_empty: 'We could not read text from that PDF. Try another file or a text-based export.',
  pdf_text_too_thin:
    'This looks like a scanned or image-heavy PDF with little readable text. Try a text-based PDF.',
  pdf_password_protected: 'That PDF is password-protected. Unlock it and try again.',
  pass1_parse_failed: 'We could not structure that CV. Try another file or replace the PDF.',
  cv_extract_empty: 'CV extraction returned no usable content. Try another file.',
  files_get_failed: 'We could not access that file. Try uploading again.',
  missing_supabase_env: 'This service is misconfigured on this environment.',
  interview_brief_generate_empty: 'Interview generation returned an empty plan. Try again.',
  interview_brief_generate_incomplete: 'Interview generation did not finish. Try again.',
  interview_brief_generate_failed: 'Interview generation failed. Try again.',
  jd_text_too_short: 'Add a longer role description before generating.',
  persist_failed: 'Could not save the generated interview. Try again.',
  generation_incomplete: 'Interview generation did not finish. Try again.',
  interview_not_open: 'This interview is not open right now.',
  interview_archived: 'This interview has been archived.',
  interview_not_published: 'This interview is not published yet.',
  interview_not_draft: 'Only draft interviews can be published.',
  interview_has_attempts: 'Cannot unpublish — candidates have already started attempts.',
  interview_attempt_open: 'You already have an open attempt for this interview.',
  interview_attempt_limit: 'You have reached the maximum number of attempts.',
  interview_attempt_state: 'That attempt cannot be changed in its current state.',
  interview_org_only: 'Interview briefs can only be managed on organisation accounts.',
  interview_personal_only: 'Only personal candidate accounts can take this interview.',
  interview_invite_expired: 'This assessment invite has expired.',
  interview_invite_revoked: 'This assessment invite was revoked.',
  interview_invite_accepted: 'This assessment invite was already accepted.',
  interview_invite_email_mismatch: 'Sign in with the email address this invite was sent to.',
  interview_create_bot_payload: 'That interview create action had an invalid payload. Ask the bot to propose again.',
  interview_create_bot_missing: 'No active creator bot conversation for this interview.',
  empty_message: 'Type a message before sending.',
  edit_run_not_found: 'That edit run was not found. Start a new request.',
  edit_run_mismatch: 'This edit run has moved on. Start a new request.',
  edit_run_expired: 'That edit run expired. Start a new request.',
  edit_run_cancelled: 'That edit was cancelled.',
  edit_incomplete: 'The board edit did not finish. Try again.',
  interview_brief_edit_empty: 'The board edit returned an empty result. Try again.',
  interview_brief_edit_incomplete: 'The board edit did not finish. Try again.',
  interview_brief_edit_failed: 'The board edit failed. Try again.',
  internal_error: 'Something went wrong on our end. Try again.',
  not_implemented: 'This action is not available yet.',
  unknown: 'Something went wrong. Try again.',
}

/** DETAIL strings that are safe / useful to show (not UUIDs or permission keys alone). */
const SAFE_DETAIL_MESSAGE: Record<string, string> = {
  name_exists: 'A file or folder with this name already exists here.',
  cycle: 'Cannot move a folder into itself or one of its subfolders.',
  folder_copy_unsupported: 'Folder copy is not supported yet.',
  text_does_not_take_file: 'This step expects text, not a file.',
  file_does_not_take_text: 'This step expects a file, not text.',
  accountid: 'Account is missing. Sign in again and retry.',
  text_or_filenodeid: 'Choose a CV file to continue.',
  cross_account_file: 'That file does not belong to this account.',
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function looksLikeMachineToken(value: string): boolean {
  const v = value.trim()
  if (!v) return true
  if (UUID_RE.test(v)) return true
  if (KNOWN_DATA_API_CODES.includes(v as DataApiErrorCode)) return true
  if (/^[a-z][a-z0-9_.]*$/i.test(v) && v.includes('_') && !/\s/.test(v)) return true
  return false
}

export function resolveDataApiErrorCode(raw: string | undefined): DataApiErrorCode {
  const text = (raw ?? '').trim()
  if (!text) return 'unknown'
  const exact = KNOWN_DATA_API_CODES.find((c) => c !== 'unknown' && text === c)
  if (exact) return exact
  const prefix = KNOWN_DATA_API_CODES.find((c) => c !== 'unknown' && text.startsWith(c))
  return prefix ?? 'unknown'
}

export function mapRpcError(message: string | undefined, details?: string): DataApiError {
  const raw = (message ?? '').trim()
  const code = resolveDataApiErrorCode(raw)
  return new DataApiError(code, raw || code, details)
}

/**
 * Soft-envelope unwrap — throws `DataApiError` when `env.error` is set.
 * Prefer this over copying unwrap helpers in domain libs.
 */
export function unwrapPlatformEnvelope<T>(env: PlatformEnvelope<T>): T {
  if (env.error) {
    const errObj =
      typeof env.error === 'object' && env.error !== null
        ? (env.error as { code?: unknown; detail?: unknown; message?: unknown; issues?: unknown })
        : null

    if (errObj?.issues && Array.isArray(errObj.issues)) {
      throw new DataApiError(
        'validation_failed',
        'validation_failed',
        typeof errObj.detail === 'string' ? errObj.detail : undefined,
      )
    }

    const codeRaw =
      errObj && errObj.code != null ? String(errObj.code) : String(env.error)
    const detail =
      errObj && errObj.detail != null
        ? String(errObj.detail)
        : typeof env.error === 'string'
          ? env.error
          : ''
    const code = resolveDataApiErrorCode(codeRaw)
    const resolvedCode =
      code === 'unknown' && codeRaw && codeRaw !== 'unknown'
        ? (codeRaw as DataApiErrorCode)
        : code

    throw new DataApiError(resolvedCode, codeRaw || resolvedCode, detail || undefined)
  }

  const metaOk =
    env.meta && typeof env.meta === 'object' && 'ok' in env.meta
      ? (env.meta as { ok?: unknown }).ok
      : undefined
  if (metaOk === false) {
    throw new DataApiError('validation_failed', 'validation_failed')
  }

  return env.data as T
}

function messageForDataApiError(err: DataApiError): string {
  const detail = (err.detail ?? '').trim()
  const detailKey = detail.toLowerCase()
  if (detailKey && SAFE_DETAIL_MESSAGE[detailKey]) {
    return SAFE_DETAIL_MESSAGE[detailKey]
  }

  const mapped = USER_MESSAGE_BY_CODE[err.code] ?? USER_MESSAGE_BY_CODE[err.message]
  if (mapped) return mapped

  if (detail && !looksLikeMachineToken(detail)) return detail

  if (err.message && !looksLikeMachineToken(err.message) && err.message !== err.code) {
    return err.message
  }

  return USER_MESSAGE_BY_CODE.unknown
}

function mapAuthClientErrorLocal(error: {
  message?: string
  code?: string
  status?: number
  name?: string
}): AuthValidationError | null {
  return mapAuthClientError(error)
}

/**
 * Turn any thrown value into short product copy for forms / toasts.
 * Prefer this over `e instanceof Error ? e.message`.
 */
export function toUserMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (err instanceof AuthValidationError) {
    if (err.issues.length > 1 || (err.message && err.message.includes('\n'))) {
      const fromIssues = err.issues
        .map((i) => i.message)
        .filter((m): m is string => Boolean(m && !looksLikeMachineToken(m)))
      if (fromIssues.length) return fromIssues.join('\n')
    }
    if (err.message && !looksLikeMachineToken(err.message)) return err.message
    const fromIssues = err.issues
      .map((i) => i.message)
      .filter((m): m is string => Boolean(m && !looksLikeMachineToken(m)))
    if (fromIssues.length) return fromIssues.join('\n')
    return USER_MESSAGE_BY_CODE[err.code] ?? fallback
  }

  if (err instanceof DataApiError) {
    return messageForDataApiError(err)
  }

  if (err && typeof err === 'object') {
    const authLike = err as { message?: string; code?: string; status?: number; name?: string }
    if (authLike.name === 'AuthApiError' || authLike.status != null || authLike.code) {
      const mapped = mapAuthClientErrorLocal(authLike)
      if (mapped) return toUserMessage(mapped, fallback)
    }
  }

  if (err instanceof Error) {
    const mapped = mapAuthClientErrorLocal(err)
    if (mapped) return toUserMessage(mapped, fallback)
    if (err.message && !looksLikeMachineToken(err.message)) return err.message
  }

  if (typeof err === 'string' && err.trim() && !looksLikeMachineToken(err)) {
    return err.trim()
  }

  return fallback
}
