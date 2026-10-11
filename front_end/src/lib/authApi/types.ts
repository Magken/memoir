export type SignUpKind = 'personal' | 'organisation'

export type SignUpPersonalInput = {
  email: string
  password: string
  /** Required public handle — validated locally then via app_signup_validate. */
  username: string
  displayName?: string
  /** Optional E.164 phone (`+15551234567`) — validated FE + `app_signup_validate`. */
  phone?: string
  metadata?: Record<string, unknown>
}

export type SignUpOrganisationInput = {
  email: string
  password: string
  orgName: string
  /** Optional — derived from orgName when omitted. */
  username?: string
  displayName?: string
  orgSlug?: string
  phone?: string
  metadata?: Record<string, unknown>
}

export type SignInInput = {
  email: string
  password: string
}
