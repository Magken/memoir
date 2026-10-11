import { ChevronDown, type LucideIcon } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import type { ButtonSize, ButtonVariant } from '../lib/ui/buttonStyles'
import {
  menuItemButtonSize,
  menuItemSizeClass,
  menuPanelMetrics,
  menuSizeClass,
  type MenuSize,
} from '../lib/menus/menuControls'
import type { MicroMenuItem } from '../lib/menus/microMenu'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import { resolveThemePortalMount } from '../lib/theme/themePortal'
import { Button } from './Button'
import { MicroMenu } from './MicroMenu'

type MenuPanelPlacement = {
  align: 'end' | 'start'
  drop: 'down' | 'up'
}

type PortalCoords = { top: number; left: number }

type MicroMenuDropdownProps = {
  items: readonly MicroMenuItem[]
  moreItems?: readonly MicroMenuItem[]
  selectedId?: string
  defaultSelectedId?: string | null
  onSelect?: (id: string) => void
  label?: string
  icon?: LucideIcon
  size?: ButtonSize
  menuSize?: MenuSize
  menuScale?: MenuScale
  variant?: ButtonVariant
  disabled?: boolean
  className?: string
  debug?: boolean
}

const VIEWPORT_EDGE = 12
const PANEL_GAP_PX = 5.6
const MICRO_PANEL_EST_HEIGHT = 56

function resolvePanelPlacement(anchorRect: DOMRect, panelWidth: number): MenuPanelPlacement {
  const align: MenuPanelPlacement['align'] =
    anchorRect.right - panelWidth < VIEWPORT_EDGE ? 'start' : 'end'
  const drop: MenuPanelPlacement['drop'] =
    anchorRect.bottom + MICRO_PANEL_EST_HEIGHT > window.innerHeight - VIEWPORT_EDGE &&
    anchorRect.top > MICRO_PANEL_EST_HEIGHT
      ? 'up'
      : 'down'

  return { align, drop }
}

function resolvePortalCoords(
  anchorRect: DOMRect,
  panelWidth: number,
  panelHeight: number,
  placement: MenuPanelPlacement,
): PortalCoords {
  let top =
    placement.drop === 'down'
      ? anchorRect.bottom + PANEL_GAP_PX
      : anchorRect.top - panelHeight - PANEL_GAP_PX

  let left = placement.align === 'end' ? anchorRect.right - panelWidth : anchorRect.left

  left = Math.max(VIEWPORT_EDGE, Math.min(left, window.innerWidth - panelWidth - VIEWPORT_EDGE))
  top = Math.max(VIEWPORT_EDGE, Math.min(top, window.innerHeight - panelHeight - VIEWPORT_EDGE))

  return { top, left }
}

export function MicroMenuDropdown({
  items,
  moreItems,
  selectedId,
  defaultSelectedId,
  onSelect,
  label = 'Tools',
  icon: Icon = ChevronDown,
  size,
  menuSize = 'compact',
  menuScale = 1,
  variant = 'outline',
  disabled = false,
  className = '',
  debug = false,
}: MicroMenuDropdownProps) {
  const triggerSize = size ?? menuItemButtonSize[menuSize]
  const scale = resolveMenuScale(menuScale)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<MenuPanelPlacement>({ align: 'end', drop: 'down' })
  const [portalCoords, setPortalCoords] = useState<PortalCoords>({ top: 0, left: 0 })
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [portalThemeStyle, setPortalThemeStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuId = useId().replace(/:/g, '')

  const menuShellClass = [
    'theme-menu',
    'theme-micro-menu-dropdown',
    menuSizeClass[menuSize],
    menuScaleClass(menuScale),
    menuItemSizeClass(undefined),
    open ? 'theme-menu--open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  const updatePlacement = useCallback(() => {
    if (!rootRef.current) return

    const anchorRect = rootRef.current.getBoundingClientRect()
    const panelWidth = Math.max(
      menuPanelMetrics[menuSize].width * scale,
      panelRef.current?.getBoundingClientRect().width ?? 0,
    )
    const panelHeight = panelRef.current?.getBoundingClientRect().height || MICRO_PANEL_EST_HEIGHT
    const nextPlacement = resolvePanelPlacement(anchorRect, panelWidth)

    setPlacement(nextPlacement)
    setPortalCoords(resolvePortalCoords(anchorRect, panelWidth, panelHeight, nextPlacement))
    const mount = resolveThemePortalMount(rootRef.current)
    setPortalRoot(mount.parent)
    setPortalThemeStyle(mount.wrapStyle)
  }, [menuSize, scale])

  useLayoutEffect(() => {
    if (!open) return
    updatePlacement()
  }, [open, updatePlacement])

  useLayoutEffect(() => {
    if (!open || !portalRoot || !panelRef.current) return
    updatePlacement()
  }, [open, portalRoot, items.length, moreItems?.length, updatePlacement])

  useEffect(() => {
    if (!open) return

    window.addEventListener('scroll', updatePlacement, true)
    window.addEventListener('resize', updatePlacement)
    return () => {
      window.removeEventListener('scroll', updatePlacement, true)
      window.removeEventListener('resize', updatePlacement)
    }
  }, [open, updatePlacement])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
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
  }, [close, open])

  if (debug) {
    console.debug('[MicroMenuDropdown]', { open, menuSize, selectedId, placement, portalCoords })
  }

  const portalHostStyle: CSSProperties = {
    position: 'fixed',
    top: portalCoords.top,
    left: portalCoords.left,
    zIndex: 520,
    pointerEvents: 'none',
  }

  const portaledPanel =
    open && portalRoot
      ? createPortal(
          <div className="theme" style={portalThemeStyle}>
            <div className="theme-menu-portal-host" style={portalHostStyle}>
              <div className={menuShellClass}>
                <div
                  ref={panelRef}
                  id={menuId}
                  role="menu"
                  aria-hidden={!open}
                  className={[
                    'theme-menu__panel',
                    'theme-micro-menu-dropdown__panel',
                    open ? 'theme-menu__panel--open' : '',
                    placement.align === 'start' ? 'theme-menu__panel--from-start' : '',
                    placement.drop === 'up' ? 'theme-menu__panel--drop-up' : '',
                    'theme-menu__panel--portal',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <MicroMenu
                    label={label}
                    orientation="horizontal"
                    menuScale={menuScale}
                    items={items}
                    moreItems={moreItems}
                    selectedId={selectedId}
                    defaultSelectedId={defaultSelectedId}
                    onSelect={(id) => {
                      onSelect?.(id)
                      close()
                    }}
                  />
                </div>
              </div>
            </div>
          </div>,
          portalRoot,
        )
      : null

  return (
    <div ref={rootRef} className={[menuShellClass, className].filter(Boolean).join(' ')}>
      <Button
        type="button"
        size={triggerSize}
        variant={variant}
        disabled={disabled}
        icon={Icon}
        iconPosition="right"
        active={open}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        labelAnim="flip"
        className="theme-menu__trigger"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </Button>
      {portaledPanel}
    </div>
  )
}
