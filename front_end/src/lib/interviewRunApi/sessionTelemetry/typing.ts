/**
 * Typed WPM — keystroke inserts only. Excludes paste, drop, and dictation windows.
 */
import type { SessionTelemetrySurface, SessionTelemetryTypingRow } from './types'
import { ensureSessionTelemetry, saveSessionTelemetry } from './store'

const BURST_GAP_MS = 2000
const MIN_ACTIVE_MS = 5000
const MIN_WORDS = 3

type BurstState = {
  pending: string
  lastAt: number
}

const bursts = new Map<string, BurstState>()

let typingLive = {
  briefId: '',
  attemptId: '',
  paused: true,
  dictationOn: false,
}

export function syncTypingLive(next: Partial<typeof typingLive>): void {
  typingLive = { ...typingLive, ...next }
}

function typingKey(briefId: string, surface: SessionTelemetrySurface): string {
  return `${briefId}:${surface}`
}

function countCommit(prevPending: string, insert: string): { words: number; pending: string } {
  const combined = `${prevPending}${insert}`
  if (!combined) return { words: 0, pending: '' }
  const tokens = combined.split(/\s+/)
  const endsWithSpace = /\s$/.test(combined)
  if (endsWithSpace) {
    return { words: tokens.filter(Boolean).length, pending: '' }
  }
  const pending = tokens.pop() ?? ''
  return { words: tokens.filter(Boolean).length, pending }
}

function wpmFor(words: number, activeMs: number): number | null {
  if (words < MIN_WORDS || activeMs < MIN_ACTIVE_MS) return null
  const minutes = activeMs / 60_000
  if (minutes <= 0) return null
  return Math.round(words / minutes)
}

export function recordTypedInsert(
  briefId: string,
  surface: SessionTelemetrySurface,
  insert: string,
  now = Date.now(),
): SessionTelemetryTypingRow | null {
  if (typingLive.paused || typingLive.dictationOn) return null
  const text = insert ?? ''
  if (!text) return null
  const id = briefId.trim() || typingLive.briefId
  if (!id) return null
  const key = typingKey(id, surface)
  const burst = bursts.get(key) ?? { pending: '', lastAt: 0 }
  const dt = burst.lastAt > 0 ? Math.max(0, now - burst.lastAt) : 0
  const activeAdd = burst.lastAt > 0 && dt > 0 && dt <= BURST_GAP_MS ? dt : 0
  const commit = countCommit(burst.pending, text)
  bursts.set(key, { pending: commit.pending, lastAt: now })

  const doc = ensureSessionTelemetry(id, typingLive.attemptId)
  const rows = [...(doc.typing ?? [])]
  const idx = rows.findIndex((row) => row.surface === surface)
  const prev = idx >= 0 ? rows[idx]! : { surface, committedWords: 0, activeMs: 0, wpm: null }
  const committedWords = prev.committedWords + commit.words
  const activeMs = prev.activeMs + activeAdd
  const next: SessionTelemetryTypingRow = {
    surface,
    committedWords,
    activeMs,
    wpm: wpmFor(committedWords, activeMs),
  }
  if (idx >= 0) rows[idx] = next
  else rows.push(next)
  saveSessionTelemetry({ ...doc, typing: rows })
  return next
}

export function sittingTypedWpm(
  rows: SessionTelemetryTypingRow[] | undefined,
): { committedWords: number; activeMs: number; wpm: number | null } {
  const list = rows ?? []
  const committedWords = list.reduce((s, r) => s + r.committedWords, 0)
  const activeMs = list.reduce((s, r) => s + r.activeMs, 0)
  return { committedWords, activeMs, wpm: wpmFor(committedWords, activeMs) }
}

export function resetTypingBursts(): void {
  bursts.clear()
}

/** Test helper — count words from an insert against empty pending. */
export function countTypedCommitForTests(insert: string): { words: number; pending: string } {
  return countCommit('', insert)
}
