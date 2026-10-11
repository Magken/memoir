/**
 * Resolve JWT once per Talk/Assist turn so Edge clients skip repeated getSession.
 * Fixture / Try Vurify briefs may use the public anon key as a guest Bearer when
 * there is no signed-in session (progress stays in localStorage).
 */
import { DataApiError, getSupabase, getSupabasePublicKey } from '../dataApi'
import { isFixtureInterviewBriefId } from './fixtureBriefId'

export async function resolveInterviewEdgeAccessToken(
  existing?: string | null,
  briefId?: string | null,
): Promise<string | null> {
  if (existing?.trim()) return existing.trim()
  const supabase = getSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const sessionToken = session?.access_token?.trim() || null
  if (sessionToken) return sessionToken
  if (isFixtureInterviewBriefId(briefId)) {
    try {
      const anon = getSupabasePublicKey()?.trim()
      return anon || null
    } catch {
      return null
    }
  }
  return null
}

export async function requireInterviewEdgeAccessToken(
  existing?: string | null,
  briefId?: string | null,
): Promise<string> {
  const token = await resolveInterviewEdgeAccessToken(existing, briefId)
  if (!token) throw new DataApiError('not_authenticated', 'not_authenticated')
  return token
}
