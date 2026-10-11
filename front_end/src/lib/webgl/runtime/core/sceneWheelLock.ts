export const SCENE_WHEEL_LISTENER_OPTIONS = { passive: false, capture: true } as const

export function shouldLockSceneWheel(
  host: { contains: (node: Node) => boolean },
  event: { target: EventTarget | null },
): boolean {
  const target = event.target
  if (target == null) return false
  return host.contains(target as Node)
}

/**
 * Stop page Lenis / native scroll while the pointer is over a scene host.
 * `data-lenis-prevent-wheel` on the host is required — preventDefault alone does not stop Lenis.
 */
export function bindSceneWheelLock(
  host: HTMLElement,
  enabled: boolean,
  root: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  if (!enabled) return () => {}
  const onWheel = (event: Event) => {
    if (!shouldLockSceneWheel(host, event)) return
    event.preventDefault()
  }
  host.addEventListener('wheel', onWheel, SCENE_WHEEL_LISTENER_OPTIONS)
  root.addEventListener('wheel', onWheel, SCENE_WHEEL_LISTENER_OPTIONS)
  return () => {
    host.removeEventListener('wheel', onWheel, SCENE_WHEEL_LISTENER_OPTIONS)
    root.removeEventListener('wheel', onWheel, SCENE_WHEEL_LISTENER_OPTIONS)
  }
}
