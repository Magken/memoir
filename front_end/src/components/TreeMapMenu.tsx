import { ChevronDown, PanelLeftClose, PanelLeftOpen, Settings, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { ButtonSize } from '../lib/ui/buttonStyles'
import type { MenuSize } from '../lib/menus/menuControls'
import {
  expandedSectionIdsForSelection,
  treeMapActionsForNode,
  treeMapBodyMaxHeightClass,
  treeMapInnermostAncestorSectionId,
  treeMapMenuPanelSize,
  treeMapMenuPanelSizeClass,
  treeMapMenuSizeClass,
  treeMapSectionContainsId,
  TREE_MAP_DEFAULT_ACTION_MENU_SIZE,
  TREE_MAP_DEFAULT_ACTION_TRIGGER_SIZE,
  type TreeMapBodyMaxHeight,
  type TreeMapMenuAction,
  type TreeMapMenuLink,
  type TreeMapMenuNode,
  type TreeMapMenuSection,
  type TreeMapMenuSize,
} from '../lib/menus/treeMapMenu'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import { menuScrollConfig } from '../lib/menus/menuControls'
import { DEFAULT_SCROLL_RAIL, type ScrollRailType } from '../lib/scroll/scrollRail'
import { Button } from './Button'
import { MenuButton } from './MenuButton'
import { ThemeScroll } from './ThemeScroll'

type TreeMapMenuProps = {
  items: readonly TreeMapMenuNode[]
  selectedId?: string
  onSelect?: (id: string) => void
  /** @deprecated Use `selectedId` */
  activeId?: string
  /** @deprecated Use `selectedId` */
  activeSubId?: string
  /** @deprecated Use `onSelect` */
  onLinkSelect?: (id: string) => void
  /** Depths (0 = root) that receive tier action menus — merged with per-node `actions` */
  actionDepths?: readonly number[]
  defaultLinkActions?: readonly TreeMapMenuAction[]
  defaultSectionActions?: readonly TreeMapMenuAction[]
  onAction?: (actionId: string, nodeId: string, nodeType: 'section' | 'link') => void
  /** Tier action trigger icon — default Lucide `Settings` (gear) */
  actionIcon?: LucideIcon
  actionTriggerSize?: ButtonSize
  actionMenuSize?: MenuSize
  actionItemSize?: ButtonSize
  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Show every tier expanded — no chevrons or accordion */
  flat?: boolean
  bodyMaxHeight?: TreeMapBodyMaxHeight
  title?: string
  label?: string
  size?: TreeMapMenuSize
  menuScale?: MenuScale
  /** Nav body scroll rail — `curved` (default) · `straight` · `hidden` */
  scrollRail?: ScrollRailType
  /** Soft edge fade when body overflows — default `true` */
  scrollClouds?: boolean
  className?: string
  debug?: boolean
}

const defaultEditorSectionActions: readonly TreeMapMenuAction[] = [
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

const defaultEditorLinkActions: readonly TreeMapMenuAction[] = [
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'delete', label: 'Delete' },
]

type TreeMapActionMenuConfig = {
  actionIcon: LucideIcon
  actionTriggerSize: ButtonSize
  actionMenuSize: MenuSize
  actionItemSize?: ButtonSize
}

function TreeMapMenuActionMenu({
  node,
  nodeType,
  actions,
  actionIcon,
  actionTriggerSize,
  actionMenuSize,
  actionItemSize,
  onAction,
}: {
  node: TreeMapMenuLink | TreeMapMenuSection
  nodeType: 'section' | 'link'
  actions: readonly TreeMapMenuAction[]
  actionIcon: LucideIcon
  actionTriggerSize: ButtonSize
  actionMenuSize: MenuSize
  actionItemSize?: ButtonSize
  onAction?: (actionId: string, nodeId: string, nodeType: 'section' | 'link') => void
}) {
  return (
    <div
      className="theme-tmap__actions"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <MenuButton
        iconOnly
        portal
        icon={actionIcon}
        size={actionTriggerSize}
        menuSize={actionMenuSize}
        itemSize={actionMenuSize === 'compact' ? undefined : actionItemSize}
        variant="ghost"
        label={`${node.label} options`}
        className="theme-tmap__action-menu"
        items={actions.map((action) => ({
          id: action.id,
          label: action.label,
          disabled: action.disabled,
        }))}
        onSelect={(actionId) => onAction?.(actionId, node.id, nodeType)}
      />
    </div>
  )
}

function TreeMapMenuTextLink({
  link,
  depth,
  isActive,
  actionDepths,
  defaultLinkActions,
  defaultSectionActions,
  actionMenu,
  onSelect,
  onAction,
}: {
  link: TreeMapMenuLink
  depth: number
  isActive: boolean
  actionDepths: readonly number[]
  defaultLinkActions: readonly TreeMapMenuAction[]
  defaultSectionActions: readonly TreeMapMenuAction[]
  actionMenu: TreeMapActionMenuConfig
  onSelect: () => void
  onAction?: (actionId: string, nodeId: string, nodeType: 'section' | 'link') => void
}) {
  const Icon = link.icon
  const actions = treeMapActionsForNode(
    { type: 'link', ...link },
    depth,
    actionDepths,
    defaultLinkActions,
    defaultSectionActions,
  )
  const showActions = actions.length > 0

  return (
    <div className="theme-tmap__row">
      <button
        type="button"
        disabled={link.disabled}
        className={['theme-tmap__link', isActive ? 'is-active' : ''].filter(Boolean).join(' ')}
        aria-current={isActive ? 'page' : undefined}
        onClick={onSelect}
      >
        <span className="theme-tmap__link-row">
          {Icon ? <Icon aria-hidden className="theme-tmap__link-icon" strokeWidth={2} /> : null}
          <span
            className={['type-label theme-tmap__link-label', isActive ? 'is-active' : '']
              .filter(Boolean)
              .join(' ')}
          >
            {link.label}
          </span>
        </span>
      </button>
      {showActions ? (
        <TreeMapMenuActionMenu
          node={link}
          nodeType="link"
          actions={actions}
          {...actionMenu}
          onAction={onAction}
        />
      ) : null}
    </div>
  )
}

function TreeMapMenuSectionHead({
  section,
  depth,
  isExpanded,
  isActiveSection,
  isHighlighted,
  flat,
  sectionSubId,
  actionDepths,
  defaultLinkActions,
  defaultSectionActions,
  actionMenu,
  onToggle,
  onAction,
}: {
  section: TreeMapMenuSection
  depth: number
  isExpanded: boolean
  isActiveSection: boolean
  isHighlighted: boolean
  flat: boolean
  sectionSubId: string
  actionDepths: readonly number[]
  defaultLinkActions: readonly TreeMapMenuAction[]
  defaultSectionActions: readonly TreeMapMenuAction[]
  actionMenu: TreeMapActionMenuConfig
  onToggle: () => void
  onAction?: (actionId: string, nodeId: string, nodeType: 'section' | 'link') => void
}) {
  const SectionIcon = section.icon
  const actions = treeMapActionsForNode(
    { type: 'section', ...section },
    depth,
    actionDepths,
    defaultLinkActions,
    defaultSectionActions,
  )
  const showActions = actions.length > 0

  const label = (
    <span className="theme-tmap__link-row">
      {SectionIcon ? (
        <SectionIcon aria-hidden className="theme-tmap__link-icon" strokeWidth={2} />
      ) : null}
      <span
        className={[
          'type-label theme-tmap__section-label',
          isActiveSection ? 'is-active' : '',
          isHighlighted ? 'is-highlighted' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {section.label}
      </span>
    </span>
  )

  if (flat) {
    return (
      <div className="theme-tmap__row">
        <div
          className={[
            'theme-tmap__section-head',
            isActiveSection ? 'is-active' : '',
            isHighlighted ? 'is-highlighted' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {label}
        </div>
        {showActions ? (
          <TreeMapMenuActionMenu
            node={section}
            nodeType="section"
            actions={actions}
            {...actionMenu}
            onAction={onAction}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="theme-tmap__row">
      <button
        type="button"
        className={[
          'theme-tmap__section-link',
          isExpanded ? 'theme-tmap__section-link--open' : '',
          isActiveSection ? 'is-active' : '',
          isHighlighted ? 'is-highlighted' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={isExpanded}
        aria-controls={sectionSubId}
        onClick={onToggle}
      >
        {label}
        <ChevronDown aria-hidden className="theme-tmap__section-chevron" strokeWidth={2} />
      </button>
      {showActions ? (
        <TreeMapMenuActionMenu
          node={section}
          nodeType="section"
          actions={actions}
          {...actionMenu}
          onAction={onAction}
        />
      ) : null}
    </div>
  )
}

function TreeMapMenuBranch({
  nodes,
  depth,
  flat,
  expandedSectionIds,
  selectedId,
  highlightedSectionId,
  actionDepths,
  defaultLinkActions,
  defaultSectionActions,
  actionMenu,
  idPrefix,
  onToggleSection,
  onSelectLink,
  onAction,
}: {
  nodes: readonly TreeMapMenuNode[]
  depth: number
  flat: boolean
  expandedSectionIds: Set<string>
  selectedId?: string
  highlightedSectionId: string | null
  actionDepths: readonly number[]
  defaultLinkActions: readonly TreeMapMenuAction[]
  defaultSectionActions: readonly TreeMapMenuAction[]
  actionMenu: TreeMapActionMenuConfig
  idPrefix: string
  onToggleSection: (sectionId: string) => void
  onSelectLink: (linkId: string) => void
  onAction?: (actionId: string, nodeId: string, nodeType: 'section' | 'link') => void
}) {
  const listClass = depth === 0 ? 'theme-tmap__list' : 'theme-tmap__sublist'

  return (
    <ul className={listClass}>
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1

        if (node.type === 'link') {
          return (
            <li
              key={node.id}
              className={['theme-tmap__item', isLast ? 'theme-tmap__item--last' : '']
                .filter(Boolean)
                .join(' ')}
            >
              <TreeMapMenuTextLink
                link={node}
                depth={depth}
                isActive={selectedId === node.id}
                actionDepths={actionDepths}
                defaultLinkActions={defaultLinkActions}
                defaultSectionActions={defaultSectionActions}
                actionMenu={actionMenu}
                onSelect={() => onSelectLink(node.id)}
                onAction={onAction}
              />
            </li>
          )
        }

        const sectionSubId = `${idPrefix}-sub-${node.id}`
        const isExpanded = flat || expandedSectionIds.has(node.id)
        const isActiveSection = Boolean(selectedId && treeMapSectionContainsId(node, selectedId))
        const isHighlighted = highlightedSectionId === node.id

        return (
          <li
            key={node.id}
            data-section-id={node.id}
            className={[
              'theme-tmap__item',
              'theme-tmap__item--section',
              isHighlighted ? 'is-highlighted' : '',
              isLast ? 'theme-tmap__item--last' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <TreeMapMenuSectionHead
              section={node}
              depth={depth}
              isExpanded={isExpanded}
              isActiveSection={isActiveSection}
              isHighlighted={isHighlighted}
              flat={flat}
              sectionSubId={sectionSubId}
              actionDepths={actionDepths}
              defaultLinkActions={defaultLinkActions}
              defaultSectionActions={defaultSectionActions}
              actionMenu={actionMenu}
              onToggle={() => onToggleSection(node.id)}
              onAction={onAction}
            />

            <div
              id={sectionSubId}
              className={['theme-tmap__subpanel', isExpanded ? 'theme-tmap__subpanel--open' : '']
                .filter(Boolean)
                .join(' ')}
              aria-hidden={!isExpanded}
            >
              <div className="theme-tmap__subpanel-inner" data-depth={depth}>
                <TreeMapMenuBranch
                  nodes={node.children}
                  depth={depth + 1}
                  flat={flat}
                  expandedSectionIds={expandedSectionIds}
                  selectedId={selectedId}
                  highlightedSectionId={highlightedSectionId}
                  actionDepths={actionDepths}
                  defaultLinkActions={defaultLinkActions}
                  defaultSectionActions={defaultSectionActions}
                  actionMenu={actionMenu}
                  idPrefix={idPrefix}
                  onToggleSection={onToggleSection}
                  onSelectLink={onSelectLink}
                  onAction={onAction}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function TreeMapMenu({
  items,
  selectedId: selectedIdProp,
  onSelect,
  activeId,
  activeSubId,
  onLinkSelect,
  actionDepths = [0, 1],
  defaultLinkActions = defaultEditorLinkActions,
  defaultSectionActions = defaultEditorSectionActions,
  onAction,
  actionIcon = Settings,
  actionTriggerSize = TREE_MAP_DEFAULT_ACTION_TRIGGER_SIZE,
  actionMenuSize = TREE_MAP_DEFAULT_ACTION_MENU_SIZE,
  actionItemSize,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  flat = false,
  bodyMaxHeight = 24,
  title = 'Outline',
  label = 'Tree map navigation',
  size = 'md',
  menuScale = 1,
  scrollRail = DEFAULT_SCROLL_RAIL,
  scrollClouds = true,
  className = '',
  debug = false,
}: TreeMapMenuProps) {
  const navId = useId().replace(/:/g, '')
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
  const collapsed = collapsedProp ?? internalCollapsed
  const resolvedSelectedId = selectedIdProp ?? activeSubId ?? activeId
  const handleSelect = onSelect ?? onLinkSelect

  const actionMenu = useMemo<TreeMapActionMenuConfig>(
    () => ({
      actionIcon,
      actionTriggerSize,
      actionMenuSize,
      ...(actionItemSize ? { actionItemSize } : {}),
    }),
    [actionIcon, actionTriggerSize, actionMenuSize, actionItemSize],
  )

  const highlightedSectionId = useMemo(
    () => treeMapInnermostAncestorSectionId(items, resolvedSelectedId),
    [items, resolvedSelectedId],
  )

  const initialExpanded = useMemo(
    () => expandedSectionIdsForSelection(items, resolvedSelectedId),
    [items, resolvedSelectedId],
  )
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(() => initialExpanded)

  const panelSize = treeMapMenuPanelSize(size)

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (collapsedProp === undefined) {
        setInternalCollapsed(next)
      }
      onCollapsedChange?.(next)
    },
    [collapsedProp, onCollapsedChange],
  )

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed)
  }, [collapsed, setCollapsed])

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSectionIds((current) => {
      const next = new Set(current)
      if (next.has(sectionId)) {
        next.delete(sectionId)
        return next
      }
      next.add(sectionId)
      return next
    })
  }, [])

  const pickLink = useCallback(
    (linkId: string) => {
      handleSelect?.(linkId)
      if (flat) return
      setExpandedSectionIds((current) => {
        const next = new Set(current)
        for (const sectionId of expandedSectionIdsForSelection(items, linkId)) {
          next.add(sectionId)
        }
        return next
      })
    },
    [flat, handleSelect, items],
  )

  useEffect(() => {
    if (!resolvedSelectedId || flat) return
    setExpandedSectionIds((current) => {
      const next = new Set(current)
      for (const sectionId of expandedSectionIdsForSelection(items, resolvedSelectedId)) {
        next.add(sectionId)
      }
      return next
    })
  }, [flat, items, resolvedSelectedId])

  if (debug) {
    console.debug('[TreeMapMenu]', {
      collapsed,
      flat,
      bodyMaxHeight,
      actionDepths,
      highlightedSectionId,
      menuScale: resolveMenuScale(menuScale),
      expandedSectionIds: [...expandedSectionIds],
      selectedId: resolvedSelectedId,
      count: items.length,
    })
  }

  return (
    <nav
      id={navId}
      aria-label={label}
      className={[
        'theme-tmap',
        treeMapMenuSizeClass[size],
        treeMapMenuPanelSizeClass[panelSize],
        treeMapBodyMaxHeightClass[bodyMaxHeight],
        menuScaleClass(menuScale),
        flat ? 'theme-tmap--flat' : '',
        collapsed ? 'theme-tmap--collapsed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-tmap__head">
        {title ? <span className="theme-tmap__title type-label">{title}</span> : null}
        <Button
          type="button"
          size="md"
          variant={collapsed ? 'inset' : 'ghost'}
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          aria-expanded={!collapsed}
          aria-controls={`${navId}-body`}
          aria-label={collapsed ? 'Expand tree map navigation' : 'Collapse tree map navigation'}
          className="theme-tmap__toggle"
          onClick={toggleCollapsed}
        >
          {collapsed ? undefined : 'Collapse'}
        </Button>
      </div>

      <div id={`${navId}-body`} className="theme-tmap__body" aria-hidden={collapsed}>
        <div className="theme-tmap__body-inner">
          <ThemeScroll
            className="theme-tmap__scroll"
            config={menuScrollConfig[panelSize]}
            rail={scrollRail}
            scrollClouds={scrollClouds}
            tabIndex={-1}
          >
            <div className="theme-tmap__tree">
              <TreeMapMenuBranch
                nodes={items}
                depth={0}
                flat={flat}
                expandedSectionIds={expandedSectionIds}
                selectedId={resolvedSelectedId}
                highlightedSectionId={highlightedSectionId}
                actionDepths={actionDepths}
                defaultLinkActions={defaultLinkActions}
                defaultSectionActions={defaultSectionActions}
                actionMenu={actionMenu}
                idPrefix={navId}
                onToggleSection={toggleSection}
                onSelectLink={pickLink}
                onAction={onAction}
              />
            </div>
          </ThemeScroll>
        </div>
      </div>
    </nav>
  )
}

export type {
  TreeMapMenuAction,
  TreeMapMenuLink,
  TreeMapMenuNode,
  TreeMapMenuSection,
  TreeMapMenuSize,
  TreeMapBodyMaxHeight,
}
export type { MenuScale } from '../lib/menus/menuScale'
