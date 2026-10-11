/**
 * The only write path from a hardware SDK into a memoir session.
 * Empty slots return the session unchanged. An unknown slot is rejected.
 * The filled `voice` slot (Sensory TSSV) writes the session's voice state.
 */
import { readFileSync } from 'node:fs'
import type { MemoirSession, MemoirVoiceState } from '../../front_end/src/lib/memoir/session.ts'

export type SdkSlot = {
  id: string
  status: 'empty' | 'filled'
  package: string | null
}

export type SdkRegistry = {
  slots: SdkSlot[]
}

export type AdapterResult = {
  slotId: string
  voice?: MemoirVoiceState
}

export function readSdkRegistry(): SdkRegistry {
  const url = new URL('../sdk/registry.json', import.meta.url)
  return JSON.parse(readFileSync(url, 'utf8')) as SdkRegistry
}

export function applyAdapterResult(session: MemoirSession, result: AdapterResult): MemoirSession {
  const slot = readSdkRegistry().slots.find((entry) => entry.id === result.slotId)
  if (!slot) {
    throw new Error(`Unknown hardware slot: ${result.slotId}`)
  }
  if (slot.status !== 'filled') return session
  if (slot.id === 'voice' && result.voice && result.voice !== session.voice) {
    return { ...session, voice: result.voice }
  }
  return session
}
