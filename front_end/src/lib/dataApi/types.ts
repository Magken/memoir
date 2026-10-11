export type ResourceKey =
  | 'demo_items'
  | 'public_test_items'
  | 'cascade_parents'
  | 'cascade_children'
  | 'profiles'
  | 'accounts'
  | 'notifications'

export type FieldType =
  | 'uuid'
  | 'text'
  | 'int'
  | 'bigint'
  | 'numeric'
  | 'bool'
  | 'timestamptz'
  | 'jsonb'
  | 'text[]'

export type FilterOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'is'
  | 'like'
  | 'ilike'
  | 'contains'
  | 'contained_by'
  | 'overlap'
  | 'fts'

export type DataApiErrorCode =
  | 'unknown_resource'
  | 'field_not_allowed'
  | 'filter_not_allowed'
  | 'sort_not_allowed'
  | 'limit_exceeded'
  | 'not_found'
  | 'forbidden'
  | 'not_authenticated'
  | 'type_mismatch'
  | 'validation_failed'
  | 'if_match_failed'
  | 'account_banned'
  | 'username_taken'
  | 'username_invalid'
  | 'email_invalid'
  | 'email_taken'
  | 'password_too_short'
  | 'password_complexity'
  | 'org_name_required'
  | 'org_name_taken'
  | 'org_slug_taken'
  | 'org_slug_invalid'
  | 'cron_unavailable'
  | 'conflict'
  | 'files_unavailable'
  | 'files_gone'
  | 'files_link_invalid'
  | 'files_quota_exceeded'
  | 'files_cooldown'
  | 'org_onboarding_unknown_key'
  | 'org_onboarding_disabled'
  | 'org_onboarding_value_required'
  | 'org_onboarding_file_required'
  | 'org_onboarding_invalid_kind'
  | 'org_onboarding_incomplete'
  | 'cv_intake_not_required'
  | 'cv_intake_already_complete'
  | 'cv_not_found'
  | 'cv_schema_invalid'
  | 'cv_section_not_found'
  | 'cv_not_discoverable'
  | 'employer_not_verified'
  | 'cv_extract_failed'
  | 'missing_openai_key'
  | 'pdf_read_failed'
  | 'pdf_text_empty'
  | 'pdf_text_too_thin'
  | 'pdf_password_protected'
  | 'pass1_parse_failed'
  | 'cv_extract_empty'
  | 'files_get_failed'
  | 'missing_supabase_env'
  | 'interview_not_open'
  | 'interview_archived'
  | 'interview_not_published'
  | 'interview_not_draft'
  | 'interview_has_attempts'
  | 'interview_attempt_open'
  | 'interview_attempt_limit'
  | 'interview_attempt_state'
  | 'interview_org_only'
  | 'interview_personal_only'
  | 'interview_invite_expired'
  | 'interview_invite_revoked'
  | 'interview_invite_accepted'
  | 'interview_invite_email_mismatch'
  | 'live_transcribe_session_failed'
  | 'live_transcribe_failed'
  | 'live_transcribe_webrtc_failed'
  | 'mic_unavailable'
  | 'mic_permission_denied'
  | 'talk_turn_failed'
  | 'compose_empty'
  | 'not_implemented'
  | 'unknown'

export type FieldConstraints = {
  maxLength?: number
  minLength?: number
  min?: number
  max?: number
  pattern?: string
  enum?: unknown[]
}

export type FieldSpec = {
  key: string
  type: FieldType | string
  nullable: boolean
  filterOps: FilterOp[] | string[]
  sortable: boolean
  writable: boolean
  constraints: FieldConstraints
}

export type SortSpec = {
  field: string
  asc?: boolean
  nulls?: 'first' | 'last'
}

export type FilterClause = {
  field: string
  op?: FilterOp
  value?: unknown
}

export type FilterInput =
  | Record<string, string | number | boolean | null>
  | FilterClause
  | { and: FilterInput[] }
  | { or: FilterInput[] }
  | { not: FilterClause }
  | { or: FilterClause[]; [key: string]: unknown }

export type PageMeta = {
  mode?: string
  limit?: number
  offset?: number
  page?: number
  pageSize?: number
  total?: number | null
  totalPages?: number | null
  hasNext?: boolean
  hasPrev?: boolean
  nextOffset?: number | null
  prevOffset?: number | null
  count?: string
  order?: SortSpec[]
  range?: [number, number]
}

export type PlatformEnvelope<T = unknown> = {
  data: T
  meta?: PageMeta | Record<string, unknown> | null
  error?: unknown
}

export type FetchOptions = {
  select?: string[]
  filters?: FilterInput
  order?: SortSpec[]
  limit?: number
  offset?: number
  page?: number
  pageSize?: number
  count?: 'exact' | 'none'
}

export type WriteOptions = {
  return?: 'representation' | 'minimal'
  ifMatch?: string
}

/** @deprecated Prefer PlatformEnvelope — kept for gradual callers */
export type FetchResult = {
  rows: Record<string, unknown>[]
  total: number
}

export class DataApiError extends Error {
  readonly code: DataApiErrorCode
  readonly detail?: string

  constructor(code: DataApiErrorCode, message?: string, detail?: string) {
    super(message ?? code)
    this.name = 'DataApiError'
    this.code = code
    this.detail = detail
  }
}
