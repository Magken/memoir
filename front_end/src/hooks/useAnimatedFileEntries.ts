import { useEffect, useRef, useState } from 'react'

export type FileEntryMotion = 'enter' | 'idle' | 'leave'

export type AnimatedFileEntry = {
  id: string
  file: File
  motion: FileEntryMotion
}

const LEAVE_MS = 320

function assignFileId(file: File, idMap: WeakMap<File, string>, counter: { value: number }): string {
  let id = idMap.get(file)
  if (!id) {
    id = `upload-${counter.value++}`
    idMap.set(file, id)
  }
  return id
}

/** Stable animated file list — enter on add, leave transition before DOM removal. */
export function useAnimatedFileEntries(files: readonly File[]): AnimatedFileEntry[] {
  const idMapRef = useRef(new WeakMap<File, string>())
  const counterRef = useRef({ value: 0 })
  const [entries, setEntries] = useState<AnimatedFileEntry[]>([])

  useEffect(() => {
    const idMap = idMapRef.current
    const counter = counterRef.current

    setEntries((prev) => {
      const activeIds = new Set<string>()
      const next: AnimatedFileEntry[] = []

      for (const file of files) {
        const id = assignFileId(file, idMap, counter)
        activeIds.add(id)
        const existing = prev.find((entry) => entry.id === id)
        next.push({
          id,
          file,
          motion: existing ? (existing.motion === 'enter' ? 'enter' : 'idle') : 'enter',
        })
      }

      for (const entry of prev) {
        if (activeIds.has(entry.id)) continue
        if (entry.motion === 'leave') {
          next.push(entry)
        } else {
          next.push({ ...entry, motion: 'leave' })
        }
      }

      return next
    })
  }, [files])

  useEffect(() => {
    const entering = entries.some((entry) => entry.motion === 'enter')
    if (!entering) return
    const timer = window.setTimeout(() => {
      setEntries((prev) =>
        prev.map((entry) => (entry.motion === 'enter' ? { ...entry, motion: 'idle' } : entry)),
      )
    }, LEAVE_MS)
    return () => window.clearTimeout(timer)
  }, [entries])

  useEffect(() => {
    const leaving = entries.filter((entry) => entry.motion === 'leave')
    if (leaving.length === 0) return
    const timer = window.setTimeout(() => {
      setEntries((prev) => prev.filter((entry) => entry.motion !== 'leave'))
    }, LEAVE_MS)
    return () => window.clearTimeout(timer)
  }, [entries])

  return entries
}

export function fileEntryMotionClass(motion: FileEntryMotion): string {
  switch (motion) {
    case 'enter':
      return 'theme-field__file-motion-wrap--enter'
    case 'leave':
      return 'theme-field__file-motion-wrap--leave'
    default:
      return ''
  }
}
