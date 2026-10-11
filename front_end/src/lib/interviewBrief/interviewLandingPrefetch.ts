import * as assessmentApi from '../assessmentApi'
import type { InterviewBrief } from '../assessmentApi'
import { readAuthDashboardSummary } from '../authApi'
import { getDownloadUrl } from '../fileApi'
import { getMyProfile } from '../userApi'
import type { Creator2BriefDocument } from './creator2BriefTypes'
import { coerceStoredBriefBody, creator2FromStoredBriefBody } from './compose'
import {
  buildInterviewLandingView,
  coverNodeIdFromBriefMetadata,
  ownerLabelFromBriefMetadata,
  type InterviewLandingView,
} from './interviewLandingView'
import { interviewPageLandingView } from './interviewPageFixture'

const prefetchByBriefId = new Map<string, InterviewLandingView>()
/** Creator-2 body kept beside landing so Talk / Start can resolve probes. */
const briefBodyByBriefId = new Map<string, Creator2BriefDocument>()
/** Signed cover URLs that have finished decode — first landing paint can use them. */
const warmedCoverUrls = new Set<string>()
const blobCoverByNodeId = new Map<string, string>()
/** Last Test prefetch — App Stage may reveal `/interview` before `?briefId=` lands. */
let lastPrefetchedBriefId: string | null = null

function preloadImage(url: string): Promise<boolean> {
  if (typeof Image === 'undefined') {
    warmedCoverUrls.add(url)
    return Promise.resolve(true)
  }
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const finish = () => {
        warmedCoverUrls.add(url)
        resolve(true)
      }
      if (typeof img.decode === 'function') {
        void img.decode().then(finish, finish)
      } else {
        finish()
      }
    }
    img.onerror = () => resolve(false)
    img.src = url
  })
}

/** True when this cover URL is already in the image cache (or there is no cover). */
export function isCoverUrlWarmed(url: string | null | undefined): boolean {
  const trimmed = url?.trim() ?? ''
  if (!trimmed) return true
  return warmedCoverUrls.has(trimmed)
}

function recordName(row: unknown, ...keys: string[]): string | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null
  const rec = row as Record<string, unknown>
  for (const key of keys) {
    const raw = rec[key]
    if (typeof raw === 'string' && raw.trim()) return raw.trim()
  }
  return null
}

function asUsername(value: string | null | undefined): string {
  const text = value?.trim() ?? ''
  if (!text || text.includes('@')) return ''
  return text
}

async function resolveOwnerLabel(brief: InterviewBrief): Promise<string> {
  const stamped = asUsername(ownerLabelFromBriefMetadata(brief.metadata))
  if (stamped) return stamped
  try {
    const profile = await getMyProfile()
    const mine = asUsername(recordName(profile, 'username'))
    if (mine) return mine
  } catch {
    /* fall through */
  }
  return asUsername(readAuthDashboardSummary()?.username)
}

export function peekLastPrefetchedBriefId(): string | null {
  return lastPrefetchedBriefId
}

export async function signCoverDownloadUrl(coverNodeId: string): Promise<string | null> {
  const id = coverNodeId.trim()
  if (!id) return null
  const cachedBlob = blobCoverByNodeId.get(id)
  if (cachedBlob && (warmedCoverUrls.has(cachedBlob) || (await preloadImage(cachedBlob)))) {
    return cachedBlob
  }
  try {
    const signed = await getDownloadUrl(id)
    const res = await fetch(signed)
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.type.startsWith('image/')) return null
    const objectUrl = URL.createObjectURL(blob)
    const ok = await preloadImage(objectUrl)
    if (!ok) {
      URL.revokeObjectURL(objectUrl)
      return null
    }
    const previous = blobCoverByNodeId.get(id)
    if (previous && previous !== objectUrl) URL.revokeObjectURL(previous)
    blobCoverByNodeId.set(id, objectUrl)
    return objectUrl
  } catch {
    return null
  }
}

async function withFreshCover(landing: InterviewLandingView): Promise<InterviewLandingView> {
  const nodeId = landing.coverNodeId?.trim()
  if (!nodeId) return { ...landing, coverUrl: null }
  const existing = landing.coverUrl?.trim() || ''
  if (existing && (warmedCoverUrls.has(existing) || (await preloadImage(existing)))) {
    return { ...landing, coverUrl: existing }
  }
  const coverUrl = await signCoverDownloadUrl(nodeId)
  return { ...landing, coverUrl }
}

/**
 * Load Creator-2 brief + cover + account owner for `/interview?briefId=`.
 * Stores the landing view so {@link peekInterviewLandingPrefetch} can mount
 * without a fixture flash. Decodes the Drive cover **before** returning so
 * Test can open on the real photo (no placeholder → swap). Reuses a warmed
 * signed URL; only re-signs when that URL no longer loads.
 * Never falls back to the page sample fixture when `briefId` is set.
 */
export async function prefetchInterviewLanding(
  briefId: string,
): Promise<InterviewLandingView> {
  const id = briefId.trim()
  if (!id) return interviewPageLandingView()

  const cached = prefetchByBriefId.get(id)
  if (cached) {
    const fresh = await withFreshCover(cached)
    prefetchByBriefId.set(id, fresh)
    lastPrefetchedBriefId = id
    return fresh
  }

  const brief = await assessmentApi.briefGet(id, true)
  const body = creator2FromStoredBriefBody(coerceStoredBriefBody(brief.body ?? null))
  if (!body) {
    throw new Error(
      'This interview has no usable brief yet. Open it in the builder and generate first.',
    )
  }

  const coverNodeId = coverNodeIdFromBriefMetadata(brief.metadata)
  const [coverUrl, ownerLabel] = await Promise.all([
    coverNodeId ? signCoverDownloadUrl(coverNodeId) : Promise.resolve(null),
    resolveOwnerLabel(brief),
  ])

  const landing = buildInterviewLandingView(body, {
    ownerLabel,
    coverUrl,
    coverNodeId,
    hasInProgressAttempt: false,
  })
  prefetchByBriefId.set(id, landing)
  briefBodyByBriefId.set(id, body)
  lastPrefetchedBriefId = id
  return landing
}

/** Re-sign Drive cover on an already-built landing (Test / leave-to-overview). */
export async function refreshInterviewLandingCover(
  landing: InterviewLandingView,
): Promise<InterviewLandingView> {
  return withFreshCover(landing)
}

/** Take a prefetched landing for `briefId` without dropping the cache. */
export function consumeInterviewLandingPrefetch(
  briefId: string,
): InterviewLandingView | null {
  return peekInterviewLandingPrefetch(briefId)
}

/** Peek without clearing — useful if navigation is cancelled. */
export function peekInterviewLandingPrefetch(
  briefId: string,
): InterviewLandingView | null {
  const id = briefId.trim()
  if (!id) return null
  return prefetchByBriefId.get(id) ?? null
}

/** Creator-2 body for a warm/live brief id (kept after landing consume). */
export function peekInterviewBriefDocument(
  briefId: string,
): Creator2BriefDocument | null {
  const id = briefId.trim()
  if (!id) return null
  return briefBodyByBriefId.get(id) ?? null
}

/** Store / replace a Creator-2 body for later Talk resolve (live Test path). */
export function rememberInterviewBriefDocument(
  briefId: string,
  body: Creator2BriefDocument | null | undefined,
): void {
  const id = briefId.trim()
  if (!id || !body) return
  briefBodyByBriefId.set(id, body)
}
