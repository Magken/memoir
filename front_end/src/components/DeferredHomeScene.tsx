import { useRef, type ReactNode, type RefObject } from 'react'
import { useDeferredSceneMount } from '../hooks/useDeferredSceneMount'

type DeferredHomeSceneProps = {
  /** Stable `#id` while the real scene is not mounted yet. */
  id: string
  label: string
  /** BEM scene modifier (`page-scene--home-what-we-do`) — keeps stub height. */
  sceneClass: string
  scrollerRef: RefObject<HTMLElement | null>
  /** Override the default one-viewport lookahead (`DEFERRED_SCENE_ROOT_MARGIN`). */
  rootMargin?: string
  /** Mount during Home `%`→V (and stay mounted). Off-screen media pauses instead. */
  eager?: boolean
  children: ReactNode
}

/**
 * Keep the scene id in the scroller; mount the real scene when eager or within
 * one viewport. Unmounted stubs keep the scene class (and a 100svh slot where
 * the live scene hugs content). Wrapper uses `display: contents` after reveal
 * so the child's section owns layout.
 */
export function DeferredHomeScene({
  id,
  label,
  sceneClass,
  scrollerRef,
  rootMargin,
  eager = false,
  children,
}: DeferredHomeSceneProps) {
  const hostRef = useRef<HTMLElement>(null)
  const mounted = useDeferredSceneMount(hostRef, scrollerRef, rootMargin, eager)

  return (
    <section
      ref={hostRef}
      id={mounted ? undefined : id}
      className={mounted ? 'page-scene-defer-slot--ready' : `page-scene ${sceneClass}`}
      aria-label={mounted ? undefined : label}
      data-deferred={mounted ? 'ready' : 'slot'}
    >
      {mounted ? children : null}
    </section>
  )
}
