import { useContext } from 'react'
import { GsapPageContext } from './gsapPageContext'

export function useGsapPage() {
  const value = useContext(GsapPageContext)
  if (!value) {
    throw new Error('useGsapPage must be used within GsapPageProvider')
  }
  return value
}

/** Optional access — returns null outside provider (e.g. theme lab edge cases). */
export function useGsapPageOptional() {
  return useContext(GsapPageContext)
}
