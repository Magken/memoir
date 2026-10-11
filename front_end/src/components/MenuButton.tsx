import { ChevronDown, Trash2, type LucideIcon } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import type { ButtonSize, ButtonVariant } from '../lib/ui/buttonStyles'
import {
  menuItemButtonSize,
  menuItemSizeClass,
  menuPanelDisplayHeight,
  menuPanelMetrics,
  menuPanelWidthPx,
  menuScrollConfig,
  menuSizeClass,
  type MenuSize,
} from '../lib/menus/menuControls'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import { DEFAULT_SCROLL_RAIL, type ScrollRailType } from '../lib/scroll/scrollRail'
import { resolveThemePortalMount } from '../lib/theme/themePortal'
import type { TypeAnimPreset } from '../lib/animations/typeAnimPresets'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { FieldControlShell, fieldControlRowClass } from './FieldControlShell'
import { ThemeScroll } from './ThemeScroll'

export type MenuItem = {
  id: string
  label: string
  /** Optional second line under the label. */
  detail?: string
  disabled?: boolean
  icon?: LucideIcon
  /** Show a bin on this row when `onDelete` is set. */
  deletable?: boolean
}

type MenuPanelPlacement = {
  align: 'end' | 'start'
  drop: 'down' | 'up'
}

type PortalCoords = {
  top: number
  left: number
}

type MenuButtonProps = {
  items: readonly MenuItem[]
  onSelect?: (id: string) => void
  /** Highlights the active menu row */
  selectedId?: string
  label?: string
  iconOnly?: boolean
  /**
   * Icon + tiny chevron trigger (Counter-style stepper chevron).
   * Slightly wider than square `iconOnly` — for compact toolbar menus (stroke, fill, etc.).
   */
  iconDropdown?: boolean
  /** Trigger icon — default chevron; use e.g. `Settings` for gear options */
  icon?: LucideIcon
  /** Optional leading trigger icon — e.g. `PlusSquare` before label with chevron trailing */
  leadingIcon?: LucideIcon
  size?: ButtonSize
  /** Dropdown selector panel scale — `compact` · `sm` · `md` · `lg` */
  menuSize?: MenuSize
  /** Row button scale — ignored when `menuSize` is `compact`; otherwise overrides panel row height */
  itemSize?: ButtonSize
  /** Multiplier on panel tokens + row buttons — default `1` */
  menuScale?: MenuScale
  /** Animate row labels on hover — default `false` */
  itemLabelAnim?: boolean
  /** Row label hover preset when `itemLabelAnim` — default `slide-left` */
  labelAnim?: TypeAnimPreset
  /** Trigger label motion — default `flip`; set `false` for fixed-width toolbar triggers */
  triggerLabelAnim?: TypeAnimPreset | false
  variant?: ButtonVariant
  disabled?: boolean
  /** Render the panel in a fixed portal (escapes scroll / overflow hosts) */
  portal?: boolean
  /** Z-index for portaled panel — default `520` */
  portalZIndex?: number
  /** Dropdown list scroll rail — `curved` (default) · `straight` · `hidden` */
  scrollRail?: ScrollRailType
  /** Soft edge fade when list overflows — default `true` */
  scrollClouds?: boolean
  /** `id` on the trigger button — pairs with `<label htmlFor>` */
  id?: string
  /** Extra classes on the trigger — e.g. `theme-field__control` for [Select](Select.tsx) */
  triggerClassName?: string
  /** Wrap trigger in [FieldControlShell](FieldControlShell.tsx) so card hover/focus includes the trigger row */
  fieldShell?: boolean
  /** Trailing affordance inside the field shell row — e.g. clear on [Select](Select.tsx) */
  fieldShellTrailing?: ReactNode
  /** Absolute overlay inside the field shell (e.g. Vurify float label). */
  fieldShellOverlay?: ReactNode
  fieldShellFilled?: boolean
  fieldShellFocused?: boolean
  /** Notify when the panel opens / closes. */
  onOpenChange?: (open: boolean) => void
  /** Bin on `deletable` rows — does not close the panel. */
  onDelete?: (id: string) => void
  className?: string
  debug?: boolean
}

const VIEWPORT_EDGE = 12
const PANEL_GAP_PX = 5.6

function resolvePanelPlacement(
  anchorRect: DOMRect,
  itemCount: number,
  menuSize: MenuSize,
  menuScale = 1,
  options?: { forceAlignStart?: boolean; hasDetail?: boolean },
): MenuPanelPlacement {
  const scaledWidth = menuPanelWidthPx(menuSize, options?.hasDetail) * menuScale
  const panelHeight = menuPanelDisplayHeight(itemCount, menuSize, options?.hasDetail) * menuScale
  const align: MenuPanelPlacement['align'] = options?.forceAlignStart
    ? 'start'
    : anchorRect.right - scaledWidth < VIEWPORT_EDGE
      ? 'start'
      : 'end'
  const drop: MenuPanelPlacement['drop'] =
    anchorRect.bottom + panelHeight > window.innerHeight - VIEWPORT_EDGE &&
    anchorRect.top > panelHeight
      ? 'up'
      : 'down'

  return { align, drop }
}

function menuNeedsScroll(itemCount: number, menuSize: MenuSize): boolean {
  return itemCount > menuPanelMetrics[menuSize].visibleRows
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

function collectScrollAncestors(node: HTMLElement | null): HTMLElement[] {
  const ancestors: HTMLElement[] = []
  let el = node?.parentElement ?? null
  while (el) {
    const { overflow, overflowX, overflowY } = getComputedStyle(el)
    if (/(auto|scroll|overlay)/.test(`${overflow}${overflowX}${overflowY}`)) {
      ancestors.push(el)
    }
    el = el.parentElement
  }
  return ancestors
}

export function MenuButton({
  items,
  onSelect,
  selectedId,
  label = 'Menu',
  iconOnly = false,
  iconDropdown = false,
  icon: Icon = ChevronDown,
  leadingIcon: LeadingIcon,
  size,
  menuSize = 'md',
  itemSize,
  menuScale = 1,
  itemLabelAnim = false,
  labelAnim = 'slide-left',
  triggerLabelAnim = 'flip',
  variant = 'outline',
  disabled = false,
  portal = false,
  portalZIndex = 520,
  scrollRail = DEFAULT_SCROLL_RAIL,
  scrollClouds = true,
  id,
  triggerClassName = '',
  fieldShell = false,
  fieldShellTrailing,
  fieldShellOverlay,
  fieldShellFilled,
  fieldShellFocused,
  onOpenChange,
  onDelete,
  className = '',
  debug = false,
}: MenuButtonProps) {
  const triggerSize = size ?? menuItemButtonSize[menuSize]
  const rowSize = menuItemButtonSize[menuSize]
  const resolvedItemSize = menuSize === 'compact' ? undefined : itemSize
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<MenuPanelPlacement>({ align: 'end', drop: 'down' })
  const [portalCoords, setPortalCoords] = useState<PortalCoords>({ top: 0, left: 0 })
  const [portalPanelWidth, setPortalPanelWidth] = useState<number | null>(null)
  const [portalPanelMaxHeight, setPortalPanelMaxHeight] = useState<number | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [portalThemeStyle, setPortalThemeStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuId = useId().replace(/:/g, '')

  const focusTrigger = useCallback(() => {
    const trigger = rootRef.current?.querySelector<HTMLButtonElement>('button.theme-menu__trigger')
    trigger?.focus({ preventScroll: true })
  }, [])

  const close = useCallback(() => {
    focusTrigger()
    setOpen(false)
  }, [focusTrigger])

  useEffect(() => {
    onOpenChange?.(open)
  }, [onOpenChange, open])

  const scale = resolveMenuScale(menuScale)
  const hasDetail = items.some((item) => Boolean(item.detail))

  const menuShellClass = [
    'theme-menu',
    menuSizeClass[menuSize],
    menuScaleClass(menuScale),
        menuItemSizeClass(resolvedItemSize),
    hasDetail ? 'theme-menu--with-detail' : '',
    open ? 'theme-menu--open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const updatePlacement = useCallback(() => {
    if (!rootRef.current) return

    const anchorRect = rootRef.current.getBoundingClientRect()
    const nextPlacement = resolvePanelPlacement(anchorRect, items.length, menuSize, scale, {
      forceAlignStart: fieldShell,
      hasDetail,
    })
    setPlacement(nextPlacement)

    if (!portal) {
      setPortalPanelWidth(null)
      setPortalPanelMaxHeight(null)
      return
    }

    const metricsWidth = menuPanelWidthPx(menuSize, hasDetail) * scale
    /** Field selects: match trigger width so the list sits under the control, not at the page edge. */
    const panelWidth = fieldShell ? Math.max(anchorRect.width, 1) : metricsWidth
    const panelHeight = menuPanelDisplayHeight(items.length, menuSize, hasDetail) * scale
    setPortalPanelWidth(panelWidth)
    setPortalPanelMaxHeight(panelHeight)
    setPortalCoords(resolvePortalCoords(anchorRect, panelWidth, panelHeight, nextPlacement))
    const mount = resolveThemePortalMount(rootRef.current)
    setPortalRoot(mount.parent)
    setPortalThemeStyle(mount.wrapStyle)
  }, [fieldShell, hasDetail, items.length, menuSize, portal, scale])

  const needsScroll = menuNeedsScroll(items.length, menuSize)

  useLayoutEffect(() => {
    if (!open) return
    updatePlacement()
  }, [open, updatePlacement])

  useEffect(() => {
    if (!open || !portal) return

    const onScroll = () => updatePlacement()
    const scrollAncestors = collectScrollAncestors(rootRef.current)

    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    scrollAncestors.forEach((el) => el.addEventListener('scroll', onScroll, { passive: true }))

    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      scrollAncestors.forEach((el) => el.removeEventListener('scroll', onScroll))
    }
  }, [open, portal, updatePlacement])

  useEffect(() => {
    if (!open || !portal) return

    const panel = panelRef.current
    if (!panel) return

    const onWheel = (event: WheelEvent) => {
      const viewport = panel.querySelector<HTMLElement>(
        '.theme-scroll__viewport, .theme-rounded-scroll__viewport',
      )
      if (!viewport) return

      const max = viewport.scrollHeight - viewport.clientHeight
      if (max <= 1) return

      const next = Math.max(0, Math.min(max, viewport.scrollTop + event.deltaY))
      if (next === viewport.scrollTop) return

      event.preventDefault()
      event.stopPropagation()
      viewport.scrollTop = next
    }

    panel.addEventListener('wheel', onWheel, { passive: false })
    return () => panel.removeEventListener('wheel', onWheel)
  }, [open, portal, items.length])

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

    const id = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown)
      document.addEventListener('keydown', onKeyDown)
    }, 0)

    return () => {
      window.clearTimeout(id)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close, open])

  useEffect(() => {
    if (open) return
    const panel = panelRef.current
    if (panel?.contains(document.activeElement)) {
      focusTrigger()
    }
  }, [focusTrigger, open])

  if (debug) {
    console.debug('[MenuButton]', {
      open,
      portal,
      menuSize,
      menuScale: scale,
      count: items.length,
      placement,
      portalCoords,
      selectedId,
      itemLabelAnim,
      itemSize: rowSize,
    })
  }

  const renderPanel = (panelRefProp?: Ref<HTMLDivElement>, portalMode = false) => (
    <div
      ref={panelRefProp}
      id={menuId}
      role="menu"
      aria-hidden={!open}
      className={[
        'theme-menu__panel',
        open ? 'theme-menu__panel--open' : '',
        needsScroll ? '' : 'theme-menu__panel--fit',
        placement.align === 'start' || fieldShell ? 'theme-menu__panel--from-start' : '',
        placement.drop === 'up' ? 'theme-menu__panel--drop-up' : '',
        portalMode ? 'theme-menu__panel--portal' : '',
        fieldShell && portalMode ? 'theme-menu__panel--field-portal' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        portalMode
          ? {
              ...(portalPanelWidth
                ? {
                    width: portalPanelWidth,
                    minWidth: portalPanelWidth,
                    maxWidth: portalPanelWidth,
                  }
                : {}),
              ...(needsScroll && portalPanelMaxHeight
                ? { maxHeight: portalPanelMaxHeight }
                : {}),
              ...(portalPanelMaxHeight
                ? ({
                    ['--theme-menu-fit-height' as string]: `${portalPanelMaxHeight}px`,
                  } as CSSProperties)
                : {}),
            }
          : needsScroll
            ? undefined
            : ({
                ['--theme-menu-fit-height' as string]: 'none',
              } as CSSProperties)
      }
    >
      <ThemeScroll
        className="theme-menu__scroll"
        config={menuScrollConfig[menuSize]}
        rail={needsScroll ? scrollRail : 'hidden'}
        scrollClouds={needsScroll ? scrollClouds : false}
        tabIndex={-1}
      >
        <ul className="theme-menu__list">
          {items.map((item) => {
            const showDelete = Boolean(item.deletable && onDelete && !item.disabled)
            return (
              <li key={item.id} role="none" className={showDelete ? 'theme-menu__item-row' : undefined}>
                <Button
                  type="button"
                  role="menuitem"
                  tabIndex={open ? undefined : -1}
                  size={rowSize}
                  variant={fieldShell ? 'ghost' : selectedId === item.id ? 'accent' : 'ghost'}
                  icon={item.icon}
                  iconPosition={item.icon ? 'left' : undefined}
                  labelAnim={itemLabelAnim ? labelAnim : false}
                  labelAnimTrigger={itemLabelAnim ? 'hover' : undefined}
                  disabled={item.disabled}
                  className={[
                    'theme-menu__item-btn',
                    item.icon ? 'theme-menu__item-btn--with-icon' : '',
                    fieldShell && selectedId === item.id ? 'theme-menu__item-btn--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    if (item.disabled) return
                    onSelect?.(item.id)
                    close()
                  }}
                >
                  {item.detail ? (
                    <span className="theme-menu__item-copy">
                      <span>{item.label}</span>
                      <span className="theme-menu__item-detail type-caption type-muted">{item.detail}</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </Button>
                {showDelete ? (
                  <IconButton
                    icon={Trash2}
                    aria-label={`Delete ${item.label}`}
                    size="xs"
                    variant="ghost"
                    className="theme-menu__item-delete"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete?.(item.id)
                    }}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      </ThemeScroll>
    </div>
  )

  const portalHostStyle: CSSProperties = {
    position: 'fixed',
    top: portalCoords.top,
    left: portalCoords.left,
    zIndex: portalZIndex,
    pointerEvents: 'none',
  }

  const portaledPanel =
    portal && open && portalRoot
      ? createPortal(
          <div className="theme" style={portalThemeStyle}>
            <div className="theme-menu-portal-host" style={portalHostStyle}>
              <div className={menuShellClass}>{renderPanel(panelRef, true)}</div>
            </div>
          </div>,
          portalRoot,
        )
      : null

  const trigger = (
    <Button
      type="button"
      id={id}
      size={triggerSize}
      variant={variant}
      disabled={disabled}
      icon={iconDropdown ? Icon : LeadingIcon ?? Icon}
      iconPosition={
        iconDropdown ? 'left' : LeadingIcon ? 'left' : iconOnly ? undefined : 'right'
      }
      active={open}
      aria-label={iconOnly || iconDropdown ? label : undefined}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-controls={menuId}
      labelAnim={fieldShell ? false : triggerLabelAnim}
      className={[
        'theme-menu__trigger',
        iconDropdown ? 'theme-menu__trigger--icon-dropdown' : '',
        triggerClassName,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => setOpen((value) => !value)}
    >
      {iconDropdown ? (
        <span className="theme-menu__dropdown-chevron" aria-hidden>
          <ChevronDown strokeWidth={2.5} />
        </span>
      ) : iconOnly ? undefined : LeadingIcon ? (
        <>
          {label}
          <Icon aria-hidden className="theme-btn__icon shrink-0" strokeWidth={2} />
        </>
      ) : (
        label
      )}
    </Button>
  )

  return (
    <div
      ref={rootRef}
      className={[menuShellClass, className].filter(Boolean).join(' ')}
    >
      {fieldShell ? (
        <FieldControlShell
          rowClassName={fieldControlRowClass({ trailing: Boolean(fieldShellTrailing) })}
          overlay={fieldShellOverlay}
          data-filled={fieldShellFilled ? 'true' : 'false'}
          data-focused={fieldShellFocused ? 'true' : 'false'}
        >
          {trigger}
          {fieldShellTrailing}
        </FieldControlShell>
      ) : (
        trigger
      )}
      {!portal ? renderPanel(panelRef) : null}
      {portaledPanel}
    </div>
  )
}
