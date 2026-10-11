/**
 * authApi — Supabase Auth wrappers (session-only). Signup metadata drives the
 * `handle_new_user` trigger which provisions profile + accounts + roles.
 *
 * Org signup derives username from org name. Flow: local authValidation → app_signup_validate → Auth.signUp.
 * Reuses the shared dataApi Supabase client so the auth session is shared with data calls.
 */
import type { AuthResponse, Session, User } from '@supabase/supabase-js'
import { callPlatform, getSupabase } from '../dataApi'
import {
  AuthValidationError,
  assertSignupLocal,
  formatAuthIssues,
  mapAuthClientError,
  mapAuthSignupError,
  mapSignupValidateIssues,
  remapOrgSignupIssues,
  validatePassword,
  type AuthValidationIssue,
} from '../authValidation'
import { clearAuthDashboardSummary } from './dashboardSession'
import type { SignInInput, SignUpOrganisationInput, SignUpPersonalInput } from './types'

export type { SignInInput, SignUpKind, SignUpOrganisationInput, SignUpPersonalInput } from './types'
export {
  clearAuthDashboardSummary,
  readAuthDashboardSummary,
  writeAuthDashboardSummary,
  type AuthDashboardSummary,
} from './dashboardSession'

type SignupValidateEnvelope = {
  data: unknown
  meta?: Record<string, unknown> | null
  error?: { code?: string; issues?: unknown; message?: string } | null
}

/**
 * Drop any prior Auth session + dashboard summary before creating / swapping accounts.
 * Avoids staying signed in as user A after signing up or signing in as user B.
 */
async function clearPriorAuthSession(): Promise<void> {
  clearAuthDashboardSummary()
  try {
    await getSupabase().auth.signOut({ scope: 'local' })
  } catch {
    /* ignore — no session / already cleared */
  }
}

/**
 * After Auth.signUp, guarantee an active session for the new user
 * (local stack usually returns one; if not, password sign-in).
 */
async function ensureSessionAfterSignUp(
  data: AuthResponse['data'],
  email: string,
  password: string,
): Promise<AuthResponse['data']> {
  const sessionEmail = data.session?.user?.email?.trim().toLowerCase()
  if (data.session && sessionEmail === email.trim().toLowerCase()) {
    return data
  }
  const { data: signedIn, error } = await getSupabase().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) {
    const mapped = mapAuthClientError(error)
    if (mapped) throw mapped
    throw error
  }
  return signedIn
}

async function runSignupValidate(args: {
  email: string
  password: string
  username: string
  signupKind: 'personal' | 'organisation'
  orgName?: string
  phone?: string | null
}): Promise<void> {
  const env = (await callPlatform('app_signup_validate', {
    p_email: args.email,
    p_password: args.password,
    p_username: args.username,
    p_signup_kind: args.signupKind,
    p_org_name: args.orgName ?? null,
    p_phone: args.phone ?? null,
  })) as SignupValidateEnvelope

  const err = env.error
  if (!err) {
    // Defensive: soft validate may put ok:false only in meta if error was stripped.
    const metaOk = env.meta && typeof env.meta === 'object' && 'ok' in env.meta
      ? (env.meta as { ok?: unknown }).ok
      : undefined
    if (metaOk !== false) return
    throw new AuthValidationError(
      'validation_failed',
      'Check the highlighted fields and try again',
    )
  }

  const issues: AuthValidationIssue[] = remapOrgSignupIssues(
    mapSignupValidateIssues(err.issues),
    args.signupKind,
  )
  const code = issues[0]?.code ?? 'validation_failed'
  throw new AuthValidationError(
    code,
    formatAuthIssues(issues) || err.message || code,
    issues.length ? issues : undefined,
  )
}

export async function signUpPersonal(input: SignUpPersonalInput): Promise<AuthResponse['data']> {
  const normalized = assertSignupLocal({
    email: input.email,
    password: input.password,
    username: input.username,
    displayName: input.displayName,
    signupKind: 'personal',
    phone: input.phone,
  })

  await runSignupValidate({
    email: normalized.email,
    password: input.password,
    username: normalized.username,
    signupKind: 'personal',
    phone: normalized.phone ?? null,
  })

  const supabase = getSupabase()
  await clearPriorAuthSession()
  const { data, error } = await supabase.auth.signUp({
    email: normalized.email,
    password: input.password,
    options: {
      data: {
        signup_kind: 'personal',
        username: normalized.username,
        display_name: normalized.displayName ?? null,
        ...(normalized.phone ? { phone: normalized.phone } : {}),
        ...(input.metadata ?? {}),
      },
    },
  })
  if (error) {
    const mapped = mapAuthSignupError(error)
    if (mapped) throw mapped
    throw error
  }
  return ensureSessionAfterSignUp(data, normalized.email, input.password)
}

export async function signUpOrganisation(
  input: SignUpOrganisationInput,
): Promise<AuthResponse['data']> {
  const normalized = assertSignupLocal({
    email: input.email,
    password: input.password,
    username: input.username,
    displayName: input.displayName,
    signupKind: 'organisation',
    orgName: input.orgName,
    orgSlug: input.orgSlug,
    phone: input.phone,
  })

  await runSignupValidate({
    email: normalized.email,
    password: input.password,
    username: normalized.username,
    signupKind: 'organisation',
    orgName: normalized.orgName,
    phone: normalized.phone ?? null,
  })

  const supabase = getSupabase()
  await clearPriorAuthSession()
  const { data, error } = await supabase.auth.signUp({
    email: normalized.email,
    password: input.password,
    options: {
      data: {
        signup_kind: 'organisation',
        username: normalized.username,
        display_name: normalized.displayName ?? null,
        org_name: normalized.orgName,
        org_slug: normalized.orgSlug ?? null,
        ...(normalized.phone ? { phone: normalized.phone } : {}),
        ...(input.metadata ?? {}),
      },
    },
  })
  if (error) {
    const mapped = mapAuthSignupError(error)
    if (mapped) {
      const issues = remapOrgSignupIssues(mapped.issues, 'organisation')
      throw new AuthValidationError(
        issues[0]?.code ?? mapped.code,
        formatAuthIssues(issues) || mapped.message,
        issues,
      )
    }
    throw error
  }
  return ensureSessionAfterSignUp(data, normalized.email, input.password)
}

/** Probe-only: local + BE validate without creating an Auth user. */
export async function validateSignup(input: {
  email: string
  password: string
  username: string
  signupKind?: 'personal' | 'organisation'
  orgName?: string
  orgSlug?: string
  displayName?: string
  phone?: string
}): Promise<{ ok: true; username: string }> {
  const normalized = assertSignupLocal({
    email: input.email,
    password: input.password,
    username: input.username,
    displayName: input.displayName,
    signupKind: input.signupKind ?? 'personal',
    orgName: input.orgName,
    orgSlug: input.orgSlug,
    phone: input.phone,
  })
  await runSignupValidate({
    email: normalized.email,
    password: input.password,
    username: normalized.username,
    signupKind: input.signupKind ?? 'personal',
    orgName: normalized.orgName,
    phone: normalized.phone ?? null,
  })
  return { ok: true, username: normalized.username }
}

export async function signIn(input: SignInInput): Promise<AuthResponse['data']> {
  const email = input.email.trim().toLowerCase()
  if (!email || !input.password) {
    throw new AuthValidationError(
      !email ? 'email_required' : 'password_required',
      !email ? 'Email is required' : 'Password is required',
    )
  }
  const supabase = getSupabase()
  await clearPriorAuthSession()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  })
  if (error) {
    const mapped = mapAuthClientError(error)
    if (mapped) throw mapped
    throw error
  }
  return data
}

/** Start Google (or other) OAuth via Supabase Auth. Redirects the browser. */
export async function signInWithOAuth(
  provider: 'google',
  redirectTo?: string,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: redirectTo ? { redirectTo } : undefined,
  })
  if (error) {
    const mapped = mapAuthClientError(error)
    if (mapped) throw mapped
    throw error
  }
}

export async function signOut(): Promise<void> {
  clearAuthDashboardSummary()
  const { error } = await getSupabase().auth.signOut({ scope: 'local' })
  if (error) throw error
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabase().auth.getSession()
  if (error) throw error
  return data.session
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await getSupabase().auth.getUser()
  if (error) return null
  return data.user
}

/** Change the signed-in user's password (Auth-native). Local policy checked first. */
export async function updatePassword(newPassword: string): Promise<User | null> {
  const issue = validatePassword(newPassword)
  if (issue) {
    throw new AuthValidationError(issue.code, issue.message, [issue])
  }
  const { data, error } = await getSupabase().auth.updateUser({ password: newPassword })
  if (error) {
    const mapped = mapAuthClientError(error)
    if (mapped) throw mapped
    throw error
  }
  return data.user
}

/** Request a password-reset email (Auth-native). Lands in local Mailpit; use redirectTo to return to the Theme lab. */
export async function requestPasswordReset(email: string, redirectTo?: string): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    redirectTo ? { redirectTo } : undefined,
  )
  if (error) {
    const mapped = mapAuthClientError(error)
    if (mapped) throw mapped
    throw error
  }
}

/** Subscribe to Auth session changes (recovery, sign-in/out). Returns unsubscribe. */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return () => data.subscription.unsubscribe()
}
