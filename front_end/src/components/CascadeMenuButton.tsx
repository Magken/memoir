import { ChevronDown, ChevronRight, Check, type LucideIcon } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import type { ButtonSize, ButtonVariant } from '../lib/ui/buttonStyles'
import {
  cascadeItemHasBranch,
  type CascadeMenuItem,
} from '../lib/menus/cascadeMenu'
import {
  menuItemButtonSize,
  menuItemSizeClass,
  menuPanelDisplayHeight,
  menuPanelMetrics,
  menuScrollConfig,
  menuSizeClass,
  type MenuSize,
} from '../lib/menus/menuControls'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import { DEFAULT_SCROLL_RAIL, type ScrollRailType } from '../lib/scroll/scrollRail'
import { resolveThemePortalMount } from '../lib/theme/themePortal'
import type { TypeAnimPreset } from '../lib/animations/typeAnimPresets'
import { Button } from './Button'
import { ThemeScroll } from './ThemeScroll'

type MenuPanelPlacement = {
  align: 'end' | 'start'
  drop: 'down' | 'up'
}

type PortalCoords = { top: number; left: number }

type FlyoutLevel = {
  items: readonly CascadeMenuItem[]
  top: number
  left: number
}

type RowTier = 'root' | 'flyout'

type CascadeMenuButtonProps = {
  items: readonly CascadeMenuItem[]
  onSelect?: (id: string) => void
  label?: string
  icon?: LucideIcon
  /** Icon-only trigger — `label` becomes `aria-label`. */
  iconOnly?: boolean
  triggerClassName?: string
  size?: ButtonSize
  menuSize?: MenuSize
  menuScale?: MenuScale
  variant?: ButtonVariant
  disabled?: boolean
  scrollRail?: ScrollRailType
  scrollClouds?: boolean
  className?: string
  debug?: boolean
  /** Trigger label motion — default `flip`; set `false` for toolbar File menus */
  triggerLabelAnim?: TypeAnimPreset | false
  /** Animate dropdown row labels on hover — default off (toolbar menus) */
  itemLabelAnim?: boolean
}

const VIEWPORT_EDGE = 12
const PANEL_GAP_PX = 5.6
const FLYOUT_GAP_PX = 4
const CASCADE_LEAVE_MS = 120

function isNodeInCascade(
  node: Node | null,
  root: HTMLElement | null,
  panel: HTMLElement | null,
  flyoutStack: HTMLElement | null,
): boolean {
  if (!node) return false
  if (root?.contains(node)) return true
  if (panel?.contains(node)) return true
  if (flyoutStack?.contains(node)) return true
  return false
}

function resolvePanelPlacement(
  anchorRect: DOMRect,
  itemCount: number,
  menuSize: MenuSize,
  menuScale = 1,
): MenuPanelPlacement {
  const { width } = menuPanelMetrics[menuSize]
  const scaledWidth = width * menuScale
  const panelHeight = menuPanelDisplayHeight(itemCount, menuSize) * menuScale
  const align: MenuPanelPlacement['align'] =
    anchorRect.right - scaledWidth < VIEWPORT_EDGE ? 'start' : 'end'
  const drop: MenuPanelPlacement['drop'] =
    anchorRect.bottom + panelHeight > window.innerHeight - VIEWPORT_EDGE &&
    anchorRect.top > panelHeight
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

function resolveFlyoutCoords(rowRect: DOMRect, panelWidth: number, panelHeight: number): PortalCoords {
  let left = rowRect.right + FLYOUT_GAP_PX
  let top = rowRect.top

  if (left + panelWidth > window.innerWidth - VIEWPORT_EDGE) {
    left = rowRect.left - panelWidth - FLYOUT_GAP_PX
  }

  left = Math.max(VIEWPORT_EDGE, Math.min(left, window.innerWidth - panelWidth - VIEWPORT_EDGE))
  top = Math.max(VIEWPORT_EDGE, Math.min(top, window.innerHeight - panelHeight - VIEWPORT_EDGE))

  return { top, left }
}

export function CascadeMenuButton({
  items,
  onSelect,
  label = 'Menu',
  icon: Icon = ChevronDown,
  iconOnly = false,
  triggerClassName = '',
  size,
  menuSize = 'compact',
  menuScale = 1,
  variant = 'outline',
  disabled = false,
  scrollRail = DEFAULT_SCROLL_RAIL,
  scrollClouds = true,
  className = '',
  debug = false,
  triggerLabelAnim = 'flip',
  itemLabelAnim = false,
}: CascadeMenuButtonProps) {
  const triggerSize = size ?? menuItemButtonSize[menuSize]
  const rowSize = menuItemButtonSize[menuSize]
  const scale = resolveMenuScale(menuScale)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<MenuPanelPlacement>({ align: 'end', drop: 'down' })
  const [portalCoords, setPortalCoords] = useState<PortalCoords>({ top: 0, left: 0 })
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [portalThemeStyle, setPortalThemeStyle] = useState<CSSProperties>({})
  const [flyoutStack, setFlyoutStack] = useState<readonly FlyoutLevel[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const flyoutStackRef = useRef<HTMLDivElement>(null)
  const leaveTimerRef = useRef<number | null>(null)
  const menuId = useId().replace(/:/g, '')

  const menuShellClass = [
    'theme-menu',
    'theme-cascade-menu',
    menuSizeClass[menuSize],
    menuScaleClass(menuScale),
    menuItemSizeClass(undefined),
    open ? 'theme-menu--open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const menuTierClass = [
    'theme-menu',
    'theme-cascade-menu',
    menuSizeClass[menuSize],
    menuScaleClass(menuScale),
    menuItemSizeClass(undefined),
    'theme-menu--open',
  ]
    .filter(Boolean)
    .join(' ')

  const clearFlyouts = useCallback(() => {
    setFlyoutStack([])
  }, [])

  const close = useCallback(() => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
    clearFlyouts()
    setOpen(false)
  }, [clearFlyouts])

  const cancelCascadeClose = useCallback(() => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }, [])

  const scheduleCascadeClose = useCallback(() => {
    cancelCascadeClose()
    leaveTimerRef.current = window.setTimeout(() => {
      leaveTimerRef.current = null
      clearFlyouts()
      setOpen(false)
    }, CASCADE_LEAVE_MS)
  }, [cancelCascadeClose, clearFlyouts])

  const handleCascadeLeave = useCallback(
    (event: ReactMouseEvent<Element>) => {
      const related = event.relatedTarget as Node | null
      if (isNodeInCascade(related, rootRef.current, panelRef.current, flyoutStackRef.current)) {
        return
      }
      scheduleCascadeClose()
    },
    [scheduleCascadeClose],
  )

  const handleCascadeEnter = useCallback(() => {
    cancelCascadeClose()
  }, [cancelCascadeClose])

  const openFlyoutAt = useCallback(
    (depth: number, branchItems: readonly CascadeMenuItem[], row: HTMLElement) => {
      const rowRect = row.getBoundingClientRect()
      const panelWidth = menuPanelMetrics[menuSize].width * scale
      const panelHeight = menuPanelDisplayHeight(branchItems.length, menuSize) * scale
      const coords = resolveFlyoutCoords(rowRect, panelWidth, panelHeight)
      setFlyoutStack((stack) => [
        ...stack.slice(0, depth),
        { items: branchItems, top: coords.top, left: coords.left },
      ])
    },
    [menuSize, scale],
  )

  const handleRowEnter = useCallback(
    (item: CascadeMenuItem, tier: RowTier, flyoutDepth: number, row: HTMLElement) => {
      if (cascadeItemHasBranch(item)) {
        const depth = tier === 'root' ? 0 : flyoutDepth + 1
        openFlyoutAt(depth, item.children!, row)
        return
      }

      if (tier === 'root') {
        clearFlyouts()
        return
      }

      setFlyoutStack((stack) => stack.slice(0, flyoutDepth + 1))
    },
    [clearFlyouts, openFlyoutAt],
  )

  const updatePlacement = useCallback(() => {
    if (!rootRef.current) return

    const anchorRect = rootRef.current.getBoundingClientRect()
    const nextPlacement = resolvePanelPlacement(anchorRect, items.length, menuSize, scale)
    setPlacement(nextPlacement)

    const panelWidth = menuPanelMetrics[menuSize].width * scale
    const panelHeight = menuPanelDisplayHeight(items.length, menuSize) * scale
    setPortalCoords(resolvePortalCoords(anchorRect, panelWidth, panelHeight, nextPlacement))
    const mount = resolveThemePortalMount(rootRef.current)
    setPortalRoot(mount.parent)
    setPortalThemeStyle(mount.wrapStyle)
  }, [items.length, menuSize, scale])

  useLayoutEffect(() => {
    if (!open) return
    updatePlacement()
  }, [open, updatePlacement])

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
      if (flyoutStackRef.current?.contains(target)) return
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

  useEffect(() => {
    if (open) return
    clearFlyouts()
  }, [clearFlyouts, open])

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        window.clearTimeout(leaveTimerRef.current)
      }
    }
  }, [])

  if (debug) {
    console.debug('[CascadeMenuButton]', { open, menuSize, flyoutStack, placement, portalCoords })
  }

  const handleLeafSelect = (id: string, itemDisabled?: boolean) => {
    if (itemDisabled) return
    onSelect?.(id)
    close()
  }

  const renderRows = (
    rowItems: readonly CascadeMenuItem[],
    tier: RowTier,
    flyoutDepth = 0,
  ) => (
    <ul className="theme-menu__list">
      {rowItems.map((item) => {
        const branch = cascadeItemHasBranch(item)
        const ItemIcon = item.icon
        const showCheck = typeof item.checked === 'boolean'

        return (
          <li
            key={item.id}
            role="none"
            className="theme-cascade-menu__row"
            onMouseEnter={(event) => {
              const row = event.currentTarget.querySelector('button')
              if (row) handleRowEnter(item, tier, flyoutDepth, row)
            }}
          >
            <Button
              type="button"
              role={showCheck ? 'menuitemcheckbox' : 'menuitem'}
              tabIndex={open ? undefined : -1}
              size={rowSize}
              variant="ghost"
              disabled={item.disabled}
              icon={ItemIcon}
              iconPosition={ItemIcon ? 'left' : undefined}
              labelAnim={itemLabelAnim ? 'slide-left' : false}
              labelAnimTrigger={itemLabelAnim ? 'hover' : undefined}
              aria-checked={showCheck ? item.checked : undefined}
              className={[
                'theme-menu__item-btn',
                'theme-cascade-menu__item-btn',
                showCheck ? 'theme-cascade-menu__item-btn--checkable' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={(event) => handleRowEnter(item, tier, flyoutDepth, event.currentTarget)}
              onFocus={(event) => handleRowEnter(item, tier, flyoutDepth, event.currentTarget)}
              onClick={() => {
                if (branch) return
                handleLeafSelect(item.id, item.disabled)
              }}
            >
              {showCheck ? (
                <span
                  className={[
                    'theme-checkbox',
                    'theme-checkbox--sm',
                    'theme-cascade-menu__check',
                    item.checked ? 'theme-checkbox--checked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden
                >
                  <span className="theme-checkbox__box">
                    <span className="theme-checkbox__fill" />
                    <span className="theme-checkbox__mark">
                      <Check strokeWidth={3} />
                    </span>
                  </span>
                </span>
              ) : null}
              {item.label}
              {branch ? <ChevronRight aria-hidden className="theme-cascade-menu__chevron" /> : null}
            </Button>
          </li>
        )
      })}
    </ul>
  )

  const renderPanel = (panelRefProp?: Ref<HTMLDivElement>) => (
    <div
      ref={panelRefProp}
      id={menuId}
      role="menu"
      aria-hidden={!open}
      className={[
        'theme-menu__panel',
        'theme-cascade-menu__panel',
        open ? 'theme-menu__panel--open' : '',
        placement.align === 'start' ? 'theme-menu__panel--from-start' : '',
        placement.drop === 'up' ? 'theme-menu__panel--drop-up' : '',
        'theme-menu__panel--portal',
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseEnter={handleCascadeEnter}
      onMouseLeave={handleCascadeLeave}
    >
      <ThemeScroll
        className="theme-menu__scroll"
        config={menuScrollConfig[menuSize]}
        rail={scrollRail}
        scrollClouds={scrollClouds}
        tabIndex={-1}
      >
        {renderRows(items, 'root')}
      </ThemeScroll>
    </div>
  )

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
            <div
              className="theme-menu-portal-host"
              style={portalHostStyle}
              onMouseEnter={handleCascadeEnter}
              onMouseLeave={handleCascadeLeave}
            >
              <div className={menuShellClass}>{renderPanel(panelRef)}</div>
            </div>
            {flyoutStack.length ? (
              <div
                ref={flyoutStackRef}
                className="theme-cascade-menu__flyout-stack"
                onMouseEnter={handleCascadeEnter}
                onMouseLeave={handleCascadeLeave}
              >
                {flyoutStack.map((level, index) => (
                  <div
                    key={`${level.left}-${level.top}-${index}`}
                    className="theme-cascade-menu__flyout-host"
                    style={{
                      position: 'fixed',
                      top: level.top,
                      left: level.left,
                      zIndex: 531 + index,
                      pointerEvents: 'auto',
                    }}
                    onMouseEnter={handleCascadeEnter}
                    onMouseLeave={handleCascadeLeave}
                  >
                    <div className={menuTierClass}>
                      <div
                        role="menu"
                        className={[
                          'theme-menu__panel',
                          'theme-cascade-menu__flyout',
                          'theme-menu__panel--open',
                          'theme-menu__panel--portal',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <ThemeScroll
                          className="theme-menu__scroll"
                          config={menuScrollConfig[menuSize]}
                          rail={scrollRail}
                          scrollClouds={scrollClouds}
                          tabIndex={-1}
                        >
                          {renderRows(level.items, 'flyout', index)}
                        </ThemeScroll>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>,
          portalRoot,
        )
      : null

  return (
    <div
      ref={rootRef}
      className={[menuShellClass, className].filter(Boolean).join(' ')}
      onMouseEnter={handleCascadeEnter}
      onMouseLeave={handleCascadeLeave}
    >
      <Button
        type="button"
        size={triggerSize}
        variant={variant}
        disabled={disabled}
        icon={Icon}
        iconPosition={iconOnly ? undefined : 'right'}
        active={open}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={iconOnly ? label : undefined}
        labelAnim={iconOnly ? undefined : triggerLabelAnim}
        className={['theme-menu__trigger', triggerClassName].filter(Boolean).join(' ')}
        onClick={() => setOpen((value) => !value)}
      >
        {iconOnly ? undefined : label}
      </Button>
      {portaledPanel}
    </div>
  )
}

export type { CascadeMenuItem }
