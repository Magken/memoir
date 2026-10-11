/** One memory a person works through. Hardware adapters write this later. */

export type MemoirVoiceState = 'idle' | 'listening' | 'speaking'

export type MemoirObject = {
  id: string
  label: string
}

export type MemoirSplatSlot = {
  id: string | null
}

export type MemoirSession = {
  id: string
  title: string
  objects: MemoirObject[]
  splat: MemoirSplatSlot
  voice: MemoirVoiceState
}

export function emptyMemoirSession(): MemoirSession {
  return {
    id: '',
    title: '',
    objects: [],
    splat: { id: null },
    voice: 'idle',
  }
}

export function isBlankMemoirSession(session: MemoirSession): boolean {
  return session.objects.length === 0 && session.splat.id === null && session.voice === 'idle'
}
