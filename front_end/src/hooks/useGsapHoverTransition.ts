import { type RefObject, useRef } from 'react'
import { useGSAP } from '../lib/gsap'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type HoverTransitionHandlers = {
  onEnter: () => GSAPAnimation | void
  onLeave: () => void
}

/** Hover/focus play + reset for GSAP transition preview stages. */
export function useGsapHoverTransition(
  scopeRef: RefObject<HTMLElement | null>,
  handlers: HoverTransitionHandlers,
  dependencies: unknown[] = [],
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useGSAP(
    () => {
      const root = scopeRef.current
      if (!root || prefersReducedMotion()) return undefined

      let active: GSAPAnimation | null = null

      const play = () => {
        active?.kill()
        handlersRef.current.onLeave()
        active = handlersRef.current.onEnter() ?? null
      }

      const reset = () => {
        active?.kill()
        active = null
        handlersRef.current.onLeave()
      }

      root.addEventListener('mouseenter', play)
      root.addEventListener('mouseleave', reset)
      root.addEventListener('focusin', play)
      root.addEventListener('focusout', reset)

      return () => {
        root.removeEventListener('mouseenter', play)
        root.removeEventListener('mouseleave', reset)
        root.removeEventListener('focusin', play)
        root.removeEventListener('focusout', reset)
        active?.kill()
      }
    },
    { scope: scopeRef, dependencies },
  )
}
