/**
 * Vurify product pages live under `/theme/vurify/*` as planning references.
 * `/` is the current-project landing (blank until built).
 */
export const VURIFY_REF_ROOT = '/theme/vurify'

export const VURIFY_REF_PATHS = {
  landing: `${VURIFY_REF_ROOT}/landing`,
  dashboard: `${VURIFY_REF_ROOT}/dashboard`,
  interview: `${VURIFY_REF_ROOT}/interview`,
  tryInterview: `${VURIFY_REF_ROOT}/try-interview`,
  landing2: `${VURIFY_REF_ROOT}/landing-2`,
  deck: `${VURIFY_REF_ROOT}/deck`,
  assessmentCover: `${VURIFY_REF_ROOT}/assessment-cover`,
} as const

export type VurifyRefPage = keyof typeof VURIFY_REF_PATHS

/** Old product URLs → reference folder. `/` is not redirected. */
export const VURIFY_REF_LEGACY_REDIRECTS = {
  '/dashboard': VURIFY_REF_PATHS.dashboard,
  '/interview': VURIFY_REF_PATHS.interview,
  '/try-interview': VURIFY_REF_PATHS.tryInterview,
  '/landing-2': VURIFY_REF_PATHS.landing2,
  '/deck': VURIFY_REF_PATHS.deck,
  '/assessment-cover': VURIFY_REF_PATHS.assessmentCover,
} as const

export function isVurifyLandingPath(path: string): boolean {
  const normalized = path.replace(/\/+$/, '') || '/'
  return normalized === VURIFY_REF_PATHS.landing
}

/**
 * GRAS pages that run their own loader: `/` and the `/memoir` tree. Not App Stage URLs,
 * so the Vurify CurtainLoading never covers them.
 */
export function isBlankLandingPath(path: string): boolean {
  const normalized = path.replace(/\/+$/, '') || '/'
  return normalized === '/' || normalized === '/memoir' || normalized.startsWith('/memoir/')
}
