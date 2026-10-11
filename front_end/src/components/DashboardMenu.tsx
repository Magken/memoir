import { ChevronLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import {
  DASHBOARD_MENU_FALLBACK_ICON,
  dashboardBodyMaxHeightClass,
  dashboardMenuPanelSize,
  dashboardMenuPanelSizeClass,
  dashboardMenuSizeClass,
  type DashboardBodyMaxHeight,
  type DashboardMenuLink,
  type DashboardMenuSize,
} from '../lib/menus/dashboardMenu'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import { menuScrollConfig } from '../lib/menus/menuControls'
import { DEFAULT_SCROLL_RAIL, type ScrollRailType } from '../lib/scroll/scrollRail'
import { Button } from './Button'
import { ThemeScroll } from './ThemeScroll'
import { Tooltip } from './Tooltip'
import { VurifyMenuButton } from './VurifyMenuButton'

type DashboardMenuProps = {
  items: readonly DashboardMenuLink[]
  /** Bottom-docked actions (page layout) — Back home and future utilities. */
  footerItems?: readonly DashboardMenuLink[]
  selectedId?: string
  onSelect?: (id: string) => void
  /** @deprecated Use `selectedId` */
  activeId?: string
  /** @deprecated Use `selectedId` */
  activeSubId?: string
  /** @deprecated Use `onSelect` */
  onLinkSelect?: (id: string) => void
  collapsed?: boolean
  /**
   * Label / Menu↔⋯ chrome only. When omitted, follows `collapsed`.
   * Page shell sequences labels before peel collapse (and reverse on expand).
   */
  labelsCollapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /**
   * Show panel Collapse control. Page shell owns peel drag instead
   * (`collapsible={false}`) but can still pass controlled `collapsed`.
   */
  collapsible?: boolean
  /**
   * `panel` — card / showcase rail with body max-height.
   * `page` — side-peel underlay (dashboard Page Scene).
   */
  layout?: 'panel' | 'page'
  bodyMaxHeight?: DashboardBodyMaxHeight
  title?: string
  label?: string
  size?: DashboardMenuSize
  menuScale?: MenuScale
  /** Nav body scroll rail — `curved` (default) · `straight` · `hidden` */
  scrollRail?: ScrollRailType
  /** Soft edge fade when body overflows — default `true` */
  scrollClouds?: boolean
  className?: string
  debug?: boolean
}

function resolveRowIcon(icon?: DashboardMenuLink['icon']) {
  return icon ?? DASHBOARD_MENU_FALLBACK_ICON
}

function DashboardMenuLinkButton({
  link,
  isActive,
  collapsed,
  size,
  onSelect,
}: {
  link: DashboardMenuLink
  isActive: boolean
  collapsed: boolean
  size: DashboardMenuSize
  onSelect: () => void
}) {
  const Icon = resolveRowIcon(link.icon)

  return (
    <Tooltip
      content={link.label}
      placement="right"
      className="theme-dash__tooltip"
      disabled={!collapsed}
    >
      <VurifyMenuButton
        type="button"
        size={size}
        variant="label"
        labelCollapsed={collapsed}
        icon={Icon}
        lineTone={isActive ? 'accent' : 'text'}
        disabled={link.disabled}
        className={['theme-dash__link-btn', isActive ? 'is-selected' : ''].filter(Boolean).join(' ')}
        aria-current={isActive ? 'page' : undefined}
        aria-label={collapsed ? link.label : undefined}
        onClick={onSelect}
      >
        {link.label}
      </VurifyMenuButton>
    </Tooltip>
  )
}

/**
 * Side dashboard nav — VurifyMenuButton rows (home submenu size/language).
 * Page layout: partial peel collapses labels to icons; Menu title uses the same
 * wipe + ←/→ chevron (rotate) as the rows.
 */
export function DashboardMenu({
  items,
  footerItems = [],
  selectedId: selectedIdProp,
  onSelect,
  activeId,
  activeSubId,
  onLinkSelect,
  collapsed: collapsedProp,
  labelsCollapsed: labelsCollapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  collapsible = true,
  layout = 'panel',
  bodyMaxHeight = 24,
  title = 'Dashboard',
  label = 'Dashboard navigation',
  size = 'md',
  menuScale = 1,
  scrollRail = DEFAULT_SCROLL_RAIL,
  scrollClouds = true,
  className = '',
  debug = false,
}: DashboardMenuProps) {
  const navId = useId().replace(/:/g, '')
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
  const collapsed =
    collapsedProp !== undefined
      ? collapsedProp
      : collapsible
        ? internalCollapsed
        : false
  const labelsCollapsed = labelsCollapsedProp ?? collapsed
  const resolvedSelectedId = selectedIdProp ?? activeSubId ?? activeId
  const handleSelect = onSelect ?? onLinkSelect
  const panelSize = dashboardMenuPanelSize(size)
  const showHead = Boolean(title) || collapsible
  const pageTitleToggle = layout === 'page' && Boolean(title)

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (collapsedProp === undefined && collapsible) {
        setInternalCollapsed(next)
      }
      onCollapsedChange?.(next)
    },
    [collapsible, collapsedProp, onCollapsedChange],
  )

  const toggleCollapsed = useCallback(() => {
    // Prefer labels state when sequenced — target is “fully collapsed” intent.
    setCollapsed(!(labelsCollapsedProp ?? collapsed))
  }, [collapsed, labelsCollapsedProp, setCollapsed])

  const pickLink = useCallback(
    (linkId: string) => {
      handleSelect?.(linkId)
    },
    [handleSelect],
  )

  if (debug) {
    console.debug('[DashboardMenu]', {
      collapsed,
      labelsCollapsed,
      layout,
      collapsible,
      bodyMaxHeight,
      menuScale: resolveMenuScale(menuScale),
      selectedId: resolvedSelectedId,
      count: items.length,
      footerCount: footerItems.length,
    })
  }

  const pageTitleButton = pageTitleToggle ? (
    <VurifyMenuButton
      type="button"
      size={size}
      variant="label"
      housing
      labelCollapsed={labelsCollapsed}
      icon={ChevronLeft}
      lineTone="text"
      className="theme-dash__title-btn"
      aria-expanded={!labelsCollapsed}
      aria-controls={`${navId}-body`}
      aria-label={labelsCollapsed ? 'Expand menu' : 'Collapse menu'}
      onClick={toggleCollapsed}
    >
      {title}
    </VurifyMenuButton>
  ) : null

  return (
    <nav
      id={navId}
      aria-label={label}
      data-collapsed={collapsed ? 'true' : 'false'}
      data-labels-collapsed={labelsCollapsed ? 'true' : 'false'}
      className={[
        'theme-dash',
        layout === 'page' ? 'theme-dash--page' : '',
        dashboardMenuSizeClass[size],
        dashboardMenuPanelSizeClass[panelSize],
        layout === 'panel' ? dashboardBodyMaxHeightClass[bodyMaxHeight] : '',
        menuScaleClass(menuScale),
        collapsed ? 'theme-dash--collapsed' : '',
        labelsCollapsed ? 'theme-dash--labels-collapsed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showHead ? (
        <div className="theme-dash__head">
          {title ? (
            pageTitleToggle && pageTitleButton ? (
              <Tooltip
                content="Expand menu"
                placement="right"
                className="theme-dash__tooltip"
                disabled={!labelsCollapsed}
              >
                {pageTitleButton}
              </Tooltip>
            ) : (
              <span className="theme-dash__title type-label">{title}</span>
            )
          ) : null}
          {collapsible ? (
            <Button
              type="button"
              size="md"
              variant={collapsed ? 'inset' : 'ghost'}
              icon={collapsed ? PanelLeftOpen : PanelLeftClose}
              labelAnim={false}
              aria-expanded={!collapsed}
              aria-controls={`${navId}-body`}
              aria-label={
                collapsed ? 'Expand dashboard navigation' : 'Collapse dashboard navigation'
              }
              className="theme-dash__toggle"
              onClick={toggleCollapsed}
            >
              {collapsed ? undefined : 'Collapse'}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div id={`${navId}-body`} className="theme-dash__body">
        <div className="theme-dash__body-inner">
          <ThemeScroll
            className="theme-dash__scroll"
            config={menuScrollConfig[panelSize]}
            rail={scrollRail}
            scrollClouds={scrollClouds}
            tabIndex={-1}
          >
            <ul className="theme-dash__list">
              {items.map((link) => (
                <li key={link.id} className="theme-dash__item">
                  <DashboardMenuLinkButton
                    link={link}
                    isActive={resolvedSelectedId === link.id}
                    collapsed={labelsCollapsed}
                    size={size}
                    onSelect={() => pickLink(link.id)}
                  />
                </li>
              ))}
            </ul>
          </ThemeScroll>
        </div>
      </div>

      {footerItems.length > 0 ? (
        <div className="theme-dash__footer" aria-label="Dashboard utilities">
          <ul className="theme-dash__footer-list">
            {footerItems.map((link) => (
              <li key={link.id} className="theme-dash__footer-item">
                <DashboardMenuLinkButton
                  link={link}
                  isActive={resolvedSelectedId === link.id}
                  collapsed={labelsCollapsed}
                  size={size}
                  onSelect={() => pickLink(link.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  )
}

export type { DashboardBodyMaxHeight, DashboardMenuLink, DashboardMenuSize }
export type { MenuScale } from '../lib/menus/menuScale'
