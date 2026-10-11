/** Persist a light auth summary for the empty dashboard page. */
export type AuthDashboardSummary = {
  username: string
  kind: 'personal' | 'organisation' | 'unknown'
  mode: 'sign-in' | 'sign-up'
  audience?: string
}

const KEY = 'vurify.auth.dashboard'

export function writeAuthDashboardSummary(summary: AuthDashboardSummary): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(summary))
  } catch {
    /* ignore quota / private mode */
  }
}

export function readAuthDashboardSummary(): AuthDashboardSummary | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthDashboardSummary
  } catch {
    return null
  }
}

/** Drop the light dashboard summary (logout / account switch). */
export function clearAuthDashboardSummary(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
