import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'

type DashboardChatPeelResizeProps = {
  /** Peel is open. Handle is inert while the column is closed. */
  active?: boolean
}

/** Extra width beyond `--dash-chat-expanded` — matches `--dash-chat-grow-max`. */
const GROW_MAX_REM = 6.5

function growMaxPx(): number {
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return GROW_MAX_REM * root
}

function sceneHost(node: HTMLElement | null): HTMLElement | null {
  return node?.closest('.page-scene--dashboard') ?? null
}

function clampGrow(px: number, max: number): number {
  if (px <= 0) return 0
  if (px >= max) return max
  return px
}

/**
 * Left-edge grow handle for the dashboard / interview right chat peel.
 * Widens only (not past `--dash-chat-grow-max`); cannot shrink below the default peel.
 */
export function DashboardChatPeelResize({ active = true }: DashboardChatPeelResizeProps) {
  const handleRef = useRef<HTMLButtonElement>(null)
  const growRef = useRef(0)
  const [growPx, setGrowPx] = useState(0)

  const applyGrow = useCallback((px: number) => {
    const host = sceneHost(handleRef.current)
    const next = clampGrow(px, growMaxPx())
    growRef.current = next
    setGrowPx(next)
    host?.style.setProperty('--dash-chat-grow', `${next}px`)
  }, [])

  const setResizing = useCallback((on: boolean) => {
    const host = sceneHost(handleRef.current)
    if (!host) return
    if (on) host.setAttribute('data-chat-resizing', 'true')
    else host.removeAttribute('data-chat-resizing')
  }, [])

  useEffect(() => {
    return () => {
      const host = sceneHost(handleRef.current)
      host?.removeAttribute('data-chat-resizing')
    }
  }, [])

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!active || event.button !== 0) return
    event.preventDefault()
    const handle = event.currentTarget
    const startX = event.clientX
    const startGrow = growRef.current
    handle.setPointerCapture(event.pointerId)
    setResizing(true)

    const onMove = (e: PointerEvent) => {
      applyGrow(startGrow + (startX - e.clientX))
    }
    const onUp = () => {
      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId)
      }
      setResizing(false)
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onUp)
    }
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
    handle.addEventListener('pointercancel', onUp)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!active) return
    const step = event.shiftKey ? 48 : 16
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      applyGrow(growRef.current + step)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      applyGrow(growRef.current - step)
    } else if (event.key === 'Home') {
      event.preventDefault()
      applyGrow(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      applyGrow(growMaxPx())
    }
  }

  const max = Math.round(growMaxPx())

  return (
    <button
      ref={handleRef}
      type="button"
      className="page-scene--dashboard__chat-resize"
      aria-label="Chat panel width"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(growPx)}
      aria-disabled={active ? undefined : true}
      tabIndex={active ? 0 : -1}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  )
}
