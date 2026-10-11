import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  docNavBodyMaxHeightClass,
  docNavInnermostAncestorSectionId,
  docNavMenuPanelSize,
  docNavMenuPanelSizeClass,
  docNavMenuSizeClass,
  docNavSectionContainsId,
  expandedSectionIdsForSelection,
  type DocNavBodyMaxHeight,
  type DocNavMenuLink,
  type DocNavMenuNode,
  type DocNavMenuSection,
  type DocNavMenuSize,
} from '../lib/menus/docNavMenu'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import { menuScrollConfig } from '../lib/menus/menuControls'
import { DEFAULT_SCROLL_RAIL, type ScrollRailType } from '../lib/scroll/scrollRail'
import { Button } from './Button'
import { ThemeScroll } from './ThemeScroll'

type DocNavMenuProps = {
  items: readonly DocNavMenuNode[]
  selectedId?: string
  onSelect?: (id: string) => void
  /** @deprecated Use `selectedId` */
  activeId?: string
  /** @deprecated Use `selectedId` */
  activeSubId?: string
  /** @deprecated Use `onSelect` */
  onLinkSelect?: (id: string) => void
  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Show every tier expanded — no chevrons or accordion */
  flat?: boolean
  bodyMaxHeight?: DocNavBodyMaxHeight
  title?: string
  label?: string
  size?: DocNavMenuSize
  menuScale?: MenuScale
  /** Nav body scroll rail — `curved` (default) · `straight` · `hidden` */
  scrollRail?: ScrollRailType
  /** Soft edge fade when body overflows — default `true` */
  scrollClouds?: boolean
  className?: string
  debug?: boolean
}

function DocNavMenuTextLink({
  link,
  isActive,
  onSelect,
}: {
  link: DocNavMenuLink
  isActive: boolean
  onSelect: () => void
}) {
  const Icon = link.icon

  return (
    <button
      type="button"
      disabled={link.disabled}
      className={['theme-dnav__link', isActive ? 'is-active' : ''].filter(Boolean).join(' ')}
      aria-current={isActive ? 'page' : undefined}
      onClick={onSelect}
    >
      <span className="theme-dnav__link-row">
        {Icon ? <Icon aria-hidden className="theme-dnav__link-icon" strokeWidth={2} /> : null}
        <span
          className={['type-label theme-dnav__link-label', isActive ? 'is-active' : '']
            .filter(Boolean)
            .join(' ')}
        >
          {link.label}
        </span>
      </span>
    </button>
  )
}

function DocNavMenuSectionHead({
  section,
  isExpanded,
  isActiveSection,
  isHighlighted,
  flat,
  sectionSubId,
  onToggle,
}: {
  section: DocNavMenuSection
  isExpanded: boolean
  isActiveSection: boolean
  isHighlighted: boolean
  flat: boolean
  sectionSubId: string
  onToggle: () => void
}) {
  const SectionIcon = section.icon
  const label = (
    <span className="theme-dnav__link-row">
      {SectionIcon ? (
        <SectionIcon aria-hidden className="theme-dnav__link-icon" strokeWidth={2} />
      ) : null}
      <span
        className={[
          'type-label theme-dnav__section-label',
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
      <div
        className={[
          'theme-dnav__section-head',
          isActiveSection ? 'is-active' : '',
          isHighlighted ? 'is-highlighted' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {label}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={[
        'theme-dnav__section-link',
        isExpanded ? 'theme-dnav__section-link--open' : '',
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
      <ChevronDown aria-hidden className="theme-dnav__section-chevron" strokeWidth={2} />
    </button>
  )
}

function DocNavMenuBranch({
  nodes,
  depth,
  flat,
  expandedSectionIds,
  selectedId,
  highlightedSectionId,
  idPrefix,
  onToggleSection,
  onSelectLink,
}: {
  nodes: readonly DocNavMenuNode[]
  depth: number
  flat: boolean
  expandedSectionIds: Set<string>
  selectedId?: string
  highlightedSectionId: string | null
  idPrefix: string
  onToggleSection: (sectionId: string) => void
  onSelectLink: (linkId: string) => void
}) {
  const listClass = depth === 0 ? 'theme-dnav__list' : 'theme-dnav__sublist'

  return (
    <ul className={listClass}>
      {nodes.map((node) => {
        if (node.type === 'link') {
          return (
            <li key={node.id} className="theme-dnav__item">
              <DocNavMenuTextLink
                link={node}
                isActive={selectedId === node.id}
                onSelect={() => onSelectLink(node.id)}
              />
            </li>
          )
        }

        const sectionSubId = `${idPrefix}-sub-${node.id}`
        const isExpanded = flat || expandedSectionIds.has(node.id)
        const isActiveSection = Boolean(selectedId && docNavSectionContainsId(node, selectedId))
        const isHighlighted = highlightedSectionId === node.id

        return (
          <li
            key={node.id}
            data-section-id={node.id}
            className={[
              'theme-dnav__item',
              'theme-dnav__item--section',
              isHighlighted ? 'is-highlighted' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <DocNavMenuSectionHead
              section={node}
              isExpanded={isExpanded}
              isActiveSection={isActiveSection}
              isHighlighted={isHighlighted}
              flat={flat}
              sectionSubId={sectionSubId}
              onToggle={() => onToggleSection(node.id)}
            />

            <div
              id={sectionSubId}
              className={['theme-dnav__subpanel', isExpanded ? 'theme-dnav__subpanel--open' : '']
                .filter(Boolean)
                .join(' ')}
              aria-hidden={!isExpanded}
            >
              <div className="theme-dnav__subpanel-inner" data-depth={depth}>
                <DocNavMenuBranch
                  nodes={node.children}
                  depth={depth + 1}
                  flat={flat}
                  expandedSectionIds={expandedSectionIds}
                  selectedId={selectedId}
                  highlightedSectionId={highlightedSectionId}
                  idPrefix={idPrefix}
                  onToggleSection={onToggleSection}
                  onSelectLink={onSelectLink}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function DocNavMenu({
  items,
  selectedId: selectedIdProp,
  onSelect,
  activeId,
  activeSubId,
  onLinkSelect,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  flat = false,
  bodyMaxHeight = 24,
  title = 'Documentation',
  label = 'Documentation navigation',
  size = 'md',
  menuScale = 1,
  scrollRail = DEFAULT_SCROLL_RAIL,
  scrollClouds = true,
  className = '',
  debug = false,
}: DocNavMenuProps) {
  const navId = useId().replace(/:/g, '')
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
  const collapsed = collapsedProp ?? internalCollapsed
  const resolvedSelectedId = selectedIdProp ?? activeSubId ?? activeId
  const handleSelect = onSelect ?? onLinkSelect

  const highlightedSectionId = useMemo(
    () => docNavInnermostAncestorSectionId(items, resolvedSelectedId),
    [items, resolvedSelectedId],
  )

  const initialExpanded = useMemo(
    () => expandedSectionIdsForSelection(items, resolvedSelectedId),
    [items, resolvedSelectedId],
  )
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(() => initialExpanded)

  const panelSize = docNavMenuPanelSize(size)

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
    console.debug('[DocNavMenu]', {
      collapsed,
      flat,
      bodyMaxHeight,
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
        'theme-dnav',
        docNavMenuSizeClass[size],
        docNavMenuPanelSizeClass[panelSize],
        docNavBodyMaxHeightClass[bodyMaxHeight],
        menuScaleClass(menuScale),
        flat ? 'theme-dnav--flat' : '',
        collapsed ? 'theme-dnav--collapsed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-dnav__head">
        {title ? <span className="theme-dnav__title type-label">{title}</span> : null}
        <Button
          type="button"
          size="md"
          variant={collapsed ? 'inset' : 'ghost'}
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          aria-expanded={!collapsed}
          aria-controls={`${navId}-body`}
          aria-label={
            collapsed ? 'Expand documentation navigation' : 'Collapse documentation navigation'
          }
          className="theme-dnav__toggle"
          onClick={toggleCollapsed}
        >
          {collapsed ? undefined : 'Collapse'}
        </Button>
      </div>

      <div id={`${navId}-body`} className="theme-dnav__body" aria-hidden={collapsed}>
        <div className="theme-dnav__body-inner">
          <ThemeScroll
            className="theme-dnav__scroll"
            config={menuScrollConfig[panelSize]}
            rail={scrollRail}
            scrollClouds={scrollClouds}
            tabIndex={-1}
          >
            <div className="theme-dnav__tree">
              <DocNavMenuBranch
                nodes={items}
                depth={0}
                flat={flat}
                expandedSectionIds={expandedSectionIds}
                selectedId={resolvedSelectedId}
                highlightedSectionId={highlightedSectionId}
                idPrefix={navId}
                onToggleSection={toggleSection}
                onSelectLink={pickLink}
              />
            </div>
          </ThemeScroll>
        </div>
      </div>
    </nav>
  )
}

export type { DocNavMenuLink, DocNavMenuNode, DocNavMenuSection, DocNavMenuSize, DocNavBodyMaxHeight }
export type { MenuScale } from '../lib/menus/menuScale'
