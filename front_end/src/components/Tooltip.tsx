import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { resolveThemePortalMount } from '../lib/theme/themePortal'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'
export type TooltipTrigger = 'hover' | 'click' | 'both'

const HOVER_CLOSE_DELAY_MS = 120

type TooltipProps = {
  content: ReactNode
  children: ReactNode
  trigger?: TooltipTrigger
  placement?: TooltipPlacement
  /** Hover panel stays open over the tooltip — use for copy buttons and other controls */
  interactive?: boolean
  /** When true, never open — keeps a stable trigger wrapper for animating children. */
  disabled?: boolean
  className?: string
  debug?: boolean
}

const VIEWPORT_EDGE = 12
const GAP_PX = 8

const FLIP_PLACEMENT: Record<TooltipPlacement, TooltipPlacement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

function computePlacementCoords(
  anchorRect: DOMRect,
  panelWidth: number,
  panelHeight: number,
  placement: TooltipPlacement,
): { top: number; left: number } {
  let top = 0
  let left = 0

  switch (placement) {
    case 'bottom':
      top = anchorRect.bottom + GAP_PX
      left = anchorRect.left + anchorRect.width / 2 - panelWidth / 2
      break
    case 'left':
      top = anchorRect.top + anchorRect.height / 2 - panelHeight / 2
      left = anchorRect.left - panelWidth - GAP_PX
      break
    case 'right':
      top = anchorRect.top + anchorRect.height / 2 - panelHeight / 2
      left = anchorRect.right + GAP_PX
      break
    case 'top':
    default:
      top = anchorRect.top - panelHeight - GAP_PX
      left = anchorRect.left + anchorRect.width / 2 - panelWidth / 2
      break
  }

  return { top, left }
}

function panelOverlapsAnchor(
  top: number,
  left: number,
  panelWidth: number,
  panelHeight: number,
  anchorRect: DOMRect,
): boolean {
  const panelRight = left + panelWidth
  const panelBottom = top + panelHeight
  return (
    left < anchorRect.right &&
    panelRight > anchorRect.left &&
    top < anchorRect.bottom &&
    panelBottom > anchorRect.top
  )
}

function fitsViewport(top: number, left: number, panelWidth: number, panelHeight: number): boolean {
  return (
    top >= VIEWPORT_EDGE &&
    left >= VIEWPORT_EDGE &&
    top + panelHeight <= window.innerHeight - VIEWPORT_EDGE &&
    left + panelWidth <= window.innerWidth - VIEWPORT_EDGE
  )
}

function isValidTooltipPosition(
  top: number,
  left: number,
  panelWidth: number,
  panelHeight: number,
  anchorRect: DOMRect,
): boolean {
  return (
    fitsViewport(top, left, panelWidth, panelHeight) &&
    !panelOverlapsAnchor(top, left, panelWidth, panelHeight, anchorRect)
  )
}

function clampTooltipCoords(
  top: number,
  left: number,
  panelWidth: number,
  panelHeight: number,
  placement: TooltipPlacement,
): { top: number; left: number } {
  if (placement === 'top' || placement === 'bottom') {
    return {
      top,
      left: Math.max(VIEWPORT_EDGE, Math.min(left, window.innerWidth - panelWidth - VIEWPORT_EDGE)),
    }
  }

  return {
    top: Math.max(VIEWPORT_EDGE, Math.min(top, window.innerHeight - panelHeight - VIEWPORT_EDGE)),
    left,
  }
}

function resolveTooltipCoords(
  anchorRect: DOMRect,
  panelWidth: number,
  panelHeight: number,
  preferredPlacement: TooltipPlacement,
): { top: number; left: number; placement: TooltipPlacement } {
  const candidates: TooltipPlacement[] = [preferredPlacement, FLIP_PLACEMENT[preferredPlacement]]

  for (const placement of candidates) {
    const raw = computePlacementCoords(anchorRect, panelWidth, panelHeight, placement)
    const clamped = clampTooltipCoords(raw.top, raw.left, panelWidth, panelHeight, placement)
    if (isValidTooltipPosition(clamped.top, clamped.left, panelWidth, panelHeight, anchorRect)) {
      return { ...clamped, placement }
    }
  }

  const spaceAbove = anchorRect.top - VIEWPORT_EDGE
  const spaceBelow = window.innerHeight - VIEWPORT_EDGE - anchorRect.bottom
  const spaceLeft = anchorRect.left - VIEWPORT_EDGE
  const spaceRight = window.innerWidth - VIEWPORT_EDGE - anchorRect.right

  const ranked: TooltipPlacement[] =
    spaceBelow >= spaceAbove
      ? spaceRight >= spaceLeft
        ? ['bottom', 'right', 'left', 'top']
        : ['bottom', 'left', 'right', 'top']
      : spaceRight >= spaceLeft
        ? ['top', 'right', 'left', 'bottom']
        : ['top', 'left', 'right', 'bottom']

  for (const placement of ranked) {
    const raw = computePlacementCoords(anchorRect, panelWidth, panelHeight, placement)
    const clamped = clampTooltipCoords(raw.top, raw.left, panelWidth, panelHeight, placement)
    if (!panelOverlapsAnchor(clamped.top, clamped.left, panelWidth, panelHeight, anchorRect)) {
      return { ...clamped, placement }
    }
  }

  const fallbackPlacement = ranked[0]
  const fallbackRaw = computePlacementCoords(
    anchorRect,
    panelWidth,
    panelHeight,
    fallbackPlacement,
  )
  const fallback = clampTooltipCoords(
    fallbackRaw.top,
    fallbackRaw.left,
    panelWidth,
    panelHeight,
    fallbackPlacement,
  )

  return { ...fallback, placement: fallbackPlacement }
}

export function Tooltip({
  content,
  children,
  trigger = 'hover',
  placement = 'top',
  interactive = false,
  disabled = false,
  className = '',
  debug = false,
}: TooltipProps) {
  const hoverOn = trigger === 'hover' || trigger === 'both'
  const clickOn = trigger === 'click' || trigger === 'both'
  const [open, setOpen] = useState(false)
  const [positioned, setPositioned] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [resolvedPlacement, setResolvedPlacement] = useState<TooltipPlacement>(placement)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [portalThemeStyle, setPortalThemeStyle] = useState<CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipId = useId().replace(/:/g, '')

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const close = useCallback(() => {
    clearHideTimer()
    setOpen(false)
  }, [clearHideTimer])

  useEffect(() => {
    if (disabled) close()
  }, [close, disabled])

  const scheduleClose = useCallback(() => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS)
  }, [clearHideTimer])

  const measurePosition = useCallback(() => {
    if (!triggerRef.current || !panelRef.current) return false

    const anchorRect = triggerRef.current.getBoundingClientRect()
    const panelRect = panelRef.current.getBoundingClientRect()
    const next = resolveTooltipCoords(anchorRect, panelRect.width, panelRect.height, placement)
    setCoords({ top: next.top, left: next.left })
    setResolvedPlacement(next.placement)
    return true
  }, [placement])

  useEffect(() => {
    setResolvedPlacement(placement)
  }, [placement])

  useLayoutEffect(() => {
    if (!open) {
      setPortalRoot(null)
      setPositioned(false)
      return
    }

    if (!triggerRef.current) return
    const mount = resolveThemePortalMount(triggerRef.current)
    setPortalRoot(mount.parent)
    setPortalThemeStyle(mount.wrapStyle)
  }, [open])

  useLayoutEffect(() => {
    if (!open || !portalRoot) return

    if (measurePosition()) {
      setPositioned(true)
    }
  }, [open, portalRoot, content, placement, measurePosition])

  useEffect(() => {
    if (!open) return

    const onRelayout = () => {
      measurePosition()
    }

    window.addEventListener('resize', onRelayout)
    window.addEventListener('scroll', onRelayout, true)

    return () => {
      window.removeEventListener('resize', onRelayout)
      window.removeEventListener('scroll', onRelayout, true)
    }
  }, [open, measurePosition])

  useEffect(() => {
    if (!open || !clickOn) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (interactive && panelRef.current?.contains(target)) return
      close()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [clickOn, close, interactive, open])

  useEffect(() => {
    return () => {
      clearHideTimer()
    }
  }, [clearHideTimer])

  useEffect(() => {
    if (debug) {
      console.debug('[Tooltip]', {
        trigger,
        placement,
        interactive,
        open,
        positioned,
        coords,
        portalRoot,
      })
    }
  }, [debug, trigger, placement, interactive, open, positioned, coords, portalRoot])

  const show = () => {
    if (disabled || !hoverOn) return
    clearHideTimer()
    setOpen(true)
  }

  const hide = () => {
    if (disabled || !hoverOn) return
    if (interactive) {
      scheduleClose()
      return
    }
    close()
  }

  const toggle = () => {
    if (disabled || !clickOn) return
    if (hoverOn) {
      setOpen(true)
      return
    }
    setOpen((value) => !value)
  }

  const portalHostStyle: CSSProperties = {
    position: 'fixed',
    top: coords.top,
    left: coords.left,
    zIndex: 530,
    pointerEvents: interactive && open ? 'auto' : 'none',
  }

  const portaled =
    open && portalRoot
      ? createPortal(
          <div className="theme" style={portalThemeStyle}>
            <div
              className={[
                'theme-tooltip-portal-host',
                interactive ? 'theme-tooltip-portal-host--interactive' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={portalHostStyle}
            >
              <div
                ref={panelRef}
                id={tooltipId}
                role="tooltip"
                className={[
                  'theme-tooltip',
                  `theme-tooltip--${resolvedPlacement}`,
                  interactive ? 'theme-tooltip--interactive' : '',
                  positioned ? 'theme-tooltip--visible' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={interactive && trigger === 'hover' ? clearHideTimer : undefined}
                onMouseLeave={interactive && trigger === 'hover' ? scheduleClose : undefined}
              >
                <div
                  className={[
                    'theme-tooltip__content',
                    interactive ? 'theme-tooltip__content--interactive' : 'type-caption',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {content}
                </div>
              </div>
            </div>
          </div>,
          portalRoot,
        )
      : null

  return (
    <>
      <div
        ref={triggerRef}
        className={['theme-tooltip-trigger', className].filter(Boolean).join(' ')}
        aria-describedby={open && positioned ? tooltipId : undefined}
        aria-expanded={clickOn ? open : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={(event) => {
          if (!hoverOn) return

          const related = event.relatedTarget as Node | null
          if (event.currentTarget.contains(related)) return
          if (interactive && panelRef.current?.contains(related)) return

          if (interactive) {
            scheduleClose()
            return
          }

          if (!event.currentTarget.contains(related)) close()
        }}
        onClickCapture={clickOn ? toggle : undefined}
      >
        {children}
      </div>
      {portaled}
    </>
  )
}
