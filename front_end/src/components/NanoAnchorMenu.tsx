import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS as DndCss } from '@dnd-kit/utilities'
import { ArrowUp, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useRef,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { scrollElementIntoNearestScrollParent } from '../lib/menus/anchorScroll'
import {
  buildNanoAnchorMenuTree,
  isNanoAnchorRailVariant,
  nanoAnchorAncestorIds,
  nanoAnchorVisibleHighlightId,
  type NanoAnchorMenuEntry,
  type NanoAnchorMenuNode,
  type NanoAnchorMenuVariant,
} from '../lib/menus/nanoAnchorMenu'
import { menuScaleClass, type MenuScale } from '../lib/menus/menuScale'
import { useAnchorMenuScrollSpy } from '../lib/menus/useAnchorMenuScrollSpy'

export type NanoAnchorSortableNestedGroup = {
  /** Parent TOC id whose children may reorder among themselves. */
  parentId: string
  ids: readonly string[]
}

type NanoAnchorMenuProps = {
  entries: readonly NanoAnchorMenuEntry[]
  variant?: NanoAnchorMenuVariant
  selectedId?: string | null
  onSelect?: (id: string) => void
  scrollSpy?: boolean
  scrollRootRef?: RefObject<HTMLElement | null>
  sticky?: boolean
  title?: string
  /** Optional controls beside the title (e.g. document undo/redo). */
  titleEnd?: ReactNode
  footerLabel?: string
  onBackToTop?: () => void
  /** Custom footer under the split (e.g. Add section). Shown with rail variants. */
  footer?: ReactNode
  label?: string
  menuScale?: MenuScale
  className?: string
  debug?: boolean
  /**
   * Top-level entry ids that can be reordered among each other (same list).
   * Adds a grip before the existing link — does not change link chrome.
   */
  sortableIds?: readonly string[]
  /**
   * Nested sibling groups (e.g. TOC L3 under one section).
   * Reorder stays inside each group — never across parents.
   */
  sortableNestedGroups?: readonly NanoAnchorSortableNestedGroup[]
  /**
   * When true (default), nodes with children show a chevron to expand/collapse.
   * Branches toggle independently; scroll does not auto-open nested entries.
   */
  collapsible?: boolean
  /** Fires with the new order of whichever group was moved. */
  onReorder?: (orderedSortableIds: string[]) => void
}

function AnchorLinkBody({ node }: { node: NanoAnchorMenuNode }) {
  const Icon = node.icon
  return (
    <>
      <span className="theme-namenu__link-title">
        {Icon ? <Icon className="theme-namenu__link-icon" aria-hidden /> : null}
        <span className="theme-namenu__link-label">{node.label}</span>
      </span>
      {node.tags && node.tags.length > 0 ? (
        <span className="theme-namenu__tags" aria-hidden>
          {node.tags.map((tag) => (
            <span key={tag} className="theme-namenu__tag">
              {tag}
            </span>
          ))}
        </span>
      ) : null}
    </>
  )
}

function AnchorLink({
  node,
  isActive,
  useAnchorLinks,
  linkClass,
  setRef,
  onSelect,
}: {
  node: NanoAnchorMenuNode
  isActive: boolean
  useAnchorLinks: boolean
  linkClass: string
  setRef: (element: HTMLElement | null) => void
  onSelect: (id: string) => void
}) {
  if (useAnchorLinks) {
    return (
      <a
        ref={setRef}
        href={`#${node.id}`}
        className={linkClass}
        title={node.label}
        aria-current={isActive ? 'location' : undefined}
        onClick={(event) => {
          event.preventDefault()
          onSelect(node.id)
        }}
      >
        <AnchorLinkBody node={node} />
      </a>
    )
  }

  return (
    <button
      type="button"
      ref={setRef}
      className={linkClass}
      title={node.label}
      aria-current={isActive ? 'location' : undefined}
      onClick={() => onSelect(node.id)}
    >
      <AnchorLinkBody node={node} />
    </button>
  )
}

function BranchToggle({
  label,
  expanded,
  onToggle,
}: {
  label: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className="theme-namenu__toggle"
      aria-expanded={expanded}
      aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
    >
      {expanded ? (
        <ChevronDown aria-hidden size={12} strokeWidth={2} />
      ) : (
        <ChevronRight aria-hidden size={12} strokeWidth={2} />
      )}
    </button>
  )
}

function SortableAnchorItem({
  node,
  isActive,
  useAnchorLinks,
  linkClass,
  setRef,
  onSelect,
  branchToggle,
  branchOpen = false,
  children,
}: {
  node: NanoAnchorMenuNode
  isActive: boolean
  useAnchorLinks: boolean
  linkClass: string
  setRef: (element: HTMLElement | null) => void
  onSelect: (id: string) => void
  branchToggle?: ReactNode
  branchOpen?: boolean
  children?: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const style: CSSProperties | undefined = isDragging
    ? undefined
    : {
        transform: DndCss.Translate.toString(transform),
        transition,
      }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={['theme-namenu__item', isDragging ? 'is-dragging' : ''].filter(Boolean).join(' ')}
    >
      <div className="theme-namenu__item-row">
        <span
          ref={setActivatorNodeRef}
          aria-label={`Drag to reorder: ${node.label}`}
          className="theme-namenu__grip"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden size={12} strokeWidth={2} />
        </span>
        {branchToggle}
        <AnchorLink
          node={node}
          isActive={isActive}
          useAnchorLinks={useAnchorLinks}
          linkClass={linkClass}
          setRef={setRef}
          onSelect={onSelect}
        />
      </div>
      {children != null ? (
        <div
          className={['theme-namenu__branch', branchOpen ? 'is-open' : ''].filter(Boolean).join(' ')}
        >
          <div className="theme-namenu__branch-inner">{children}</div>
        </div>
      ) : null}
    </li>
  )
}

function AnchorMenuTree({
  nodes,
  activeId,
  variant,
  sortableIdSet,
  nestedByParent,
  collapsible,
  expandedIds,
  onToggleExpanded,
  onSelect,
  itemRefs,
}: {
  nodes: readonly NanoAnchorMenuNode[]
  activeId: string | null
  variant: NanoAnchorMenuVariant
  sortableIdSet: ReadonlySet<string> | null
  nestedByParent: ReadonlyMap<string, readonly string[]> | null
  collapsible: boolean
  expandedIds: ReadonlySet<string>
  onToggleExpanded: (id: string) => void
  onSelect: (id: string) => void
  itemRefs: MutableRefObject<Map<string, HTMLElement>>
}) {
  const useAnchorLinks = isNanoAnchorRailVariant(variant)

  return (
    <ol className="theme-namenu__tree">
      {nodes.map((node) => {
        const isActive = activeId === node.id
        const hasChildren = node.children.length > 0
        const expanded = !collapsible || !hasChildren || expandedIds.has(node.id)
        const linkClass = [
          'theme-namenu__link',
          useAnchorLinks ? 'theme-namenu__link--anchor' : '',
          isActive ? 'theme-namenu__link--active' : '',
        ]
          .filter(Boolean)
          .join(' ')

        const setRef = (element: HTMLElement | null) => {
          if (element) itemRefs.current.set(node.id, element)
          else itemRefs.current.delete(node.id)
        }

        const branchToggle =
          collapsible && hasChildren ? (
            <BranchToggle
              label={node.label}
              expanded={expanded}
              onToggle={() => onToggleExpanded(node.id)}
            />
          ) : null

        const childIds = nestedByParent?.get(node.id)
        let nested: ReactNode = null
        if (hasChildren) {
          const childTree = (
            <AnchorMenuTree
              nodes={node.children}
              activeId={activeId}
              variant={variant}
              sortableIdSet={sortableIdSet}
              nestedByParent={nestedByParent}
              collapsible={collapsible}
              expandedIds={expandedIds}
              onToggleExpanded={onToggleExpanded}
              onSelect={onSelect}
              itemRefs={itemRefs}
            />
          )
          nested =
            childIds && childIds.length > 0 ? (
              <SortableContext items={[...childIds]} strategy={verticalListSortingStrategy}>
                {childTree}
              </SortableContext>
            ) : (
              childTree
            )
        }

        if (sortableIdSet?.has(node.id)) {
          return (
            <SortableAnchorItem
              key={node.id}
              node={node}
              isActive={isActive}
              useAnchorLinks={useAnchorLinks}
              linkClass={linkClass}
              setRef={setRef}
              onSelect={onSelect}
              branchToggle={branchToggle}
              branchOpen={expanded}
            >
              {nested}
            </SortableAnchorItem>
          )
        }

        return (
          <li key={node.id} className="theme-namenu__item">
            <div className="theme-namenu__item-row">
              {branchToggle}
              <AnchorLink
                node={node}
                isActive={isActive}
                useAnchorLinks={useAnchorLinks}
                linkClass={linkClass}
                setRef={setRef}
                onSelect={onSelect}
              />
            </div>
            {nested != null ? (
              <div
                className={['theme-namenu__branch', expanded ? 'is-open' : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="theme-namenu__branch-inner">{nested}</div>
              </div>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

export function NanoAnchorMenu({
  entries,
  variant = 'anchor',
  selectedId: selectedIdProp,
  onSelect,
  scrollSpy = false,
  scrollRootRef,
  sticky = false,
  title = 'Contents',
  titleEnd,
  footerLabel,
  onBackToTop,
  footer: footerSlot,
  label = 'Anchor menu',
  menuScale = 1,
  className = '',
  debug = false,
  sortableIds,
  sortableNestedGroups,
  collapsible = true,
  onReorder,
}: NanoAnchorMenuProps) {
  const tree = buildNanoAnchorMenuTree(entries)
  const railVariant = isNanoAnchorRailVariant(variant)
  const spiedId = useAnchorMenuScrollSpy(
    entries.map((entry) => entry.id),
    {
      enabled: scrollSpy && railVariant,
      scrollRootRef,
    },
  )
  const rawActiveId = selectedIdProp ?? (scrollSpy ? spiedId : null)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const hostRef = useRef<HTMLDivElement>(null)
  const previousActiveIdRef = useRef<string | null>(null)
  const titleId = 'theme-namenu-title'
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const activeId = useMemo(
    () => nanoAnchorVisibleHighlightId(tree, rawActiveId, expandedIds, collapsible),
    [tree, rawActiveId, expandedIds, collapsible],
  )
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId

  const sortableList = sortableIds?.length ? [...sortableIds] : null
  const nestedGroups = useMemo(
    () =>
      (sortableNestedGroups ?? [])
        .map((group) => ({
          parentId: group.parentId,
          ids: group.ids.filter(Boolean),
        }))
        .filter((group) => group.ids.length > 0),
    [sortableNestedGroups],
  )
  const nestedByParent = useMemo(() => {
    if (nestedGroups.length === 0) return null
    return new Map(nestedGroups.map((group) => [group.parentId, group.ids]))
  }, [nestedGroups])

  const sortableIdSet = useMemo(() => {
    const ids = new Set<string>()
    if (sortableList) for (const id of sortableList) ids.add(id)
    for (const group of nestedGroups) for (const id of group.ids) ids.add(id)
    return ids.size > 0 ? ids : null
  }, [sortableList, nestedGroups])

  /** Sortable grips sit left of the link — use JS indicator so the dot clears the handle. */
  const useJsIndicator =
    Boolean(sortableIdSet) ||
    (typeof globalThis.CSS !== 'undefined' &&
      typeof globalThis.CSS.supports === 'function' &&
      !globalThis.CSS.supports('anchor-name', '--namenu-active'))
  /** CSS :target-current scroll targets only when the document scrolls — not capped demo stages */
  const useCssScrollTargets = scrollSpy && railVariant && !scrollRootRef && !sortableIdSet

  const reorderGroups = useMemo(() => {
    const groups: string[][] = []
    if (sortableList) groups.push(sortableList)
    for (const group of nestedGroups) groups.push([...group.ids])
    return groups
  }, [sortableList, nestedGroups])

  const [draggingId, setDraggingId] = useState<UniqueIdentifier | null>(null)

  const onToggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const updateIndicator = () => {
    const host = hostRef.current
    const currentId = activeIdRef.current
    if (!host || !railVariant) return

    if (!currentId) {
      delete host.dataset.indicatorVisible
      return
    }

    if (!useJsIndicator) {
      host.dataset.indicatorVisible = 'true'
      return
    }

    const link = itemRefs.current.get(currentId)
    if (!link) {
      delete host.dataset.indicatorVisible
      return
    }

    const hostRect = host.getBoundingClientRect()
    const linkRect = link.getBoundingClientRect()
    const size = link.offsetHeight
    const top = linkRect.top - hostRect.top
    // When a drag grip precedes the link, park the marker at the row’s start
    // (left of the grip) so it doesn’t sit on the handle.
    const row = link.closest('.theme-namenu__item-row')
    const left = row
      ? row.getBoundingClientRect().left - hostRect.left
      : linkRect.left - hostRect.left

    host.style.setProperty('--namenu-indicator-size', `${size}px`)
    host.style.setProperty('--namenu-indicator-top', `${top}px`)
    host.style.setProperty('--namenu-indicator-left', `${left}px`)
    host.dataset.indicatorVisible = 'true'
  }

  useLayoutEffect(() => {
    if (!railVariant) return undefined

    updateIndicator()

    const host = hostRef.current
    if (!host || !activeId) {
      previousActiveIdRef.current = activeId
      return undefined
    }

    const previous = previousActiveIdRef.current
    const changed = previous !== activeId
    previousActiveIdRef.current = activeId

    if (!changed) return undefined

    const link = itemRefs.current.get(activeId)
    const settleTimeouts: number[] = []
    if (link) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const flatIds = entries.map((entry) => entry.id)
      const index = flatIds.indexOf(activeId)
      const edge =
        index === 0 ? 'start' : index === flatIds.length - 1 && flatIds.length > 1 ? 'end' : 'auto'
      scrollElementIntoNearestScrollParent(link, {
        padding: variant === 'micro' ? 20 : 28,
        behavior: reduceMotion ? 'auto' : 'smooth',
        edge,
      })
      // Reposition indicator while the eased TOC rail settles
      for (const n of [1, 2, 4, 8]) {
        settleTimeouts.push(window.setTimeout(() => updateIndicator(), n * 48))
      }
    }

    let landTimeout: number | undefined
    if (previous !== null) {
      host.dataset.indicatorLand = 'true'
      landTimeout = window.setTimeout(() => {
        delete host.dataset.indicatorLand
      }, 420)
    }

    return () => {
      for (const id of settleTimeouts) window.clearTimeout(id)
      if (landTimeout != null) window.clearTimeout(landTimeout)
    }
  }, [activeId, variant, railVariant, entries, useJsIndicator])

  useEffect(() => {
    if (!railVariant || !useJsIndicator) return undefined

    const onResize = () => updateIndicator()
    window.addEventListener('resize', onResize, { passive: true })

    return () => window.removeEventListener('resize', onResize)
  }, [railVariant, useJsIndicator, entries])

  if (tree.length === 0) return null

  if (debug) {
    console.debug('[NanoAnchorMenu]', {
      variant,
      activeId,
      count: entries.length,
      sticky,
      scrollSpy,
      sortable: sortableIdSet?.size ?? 0,
      nestedGroups: nestedGroups.length,
    })
  }

  const hostClass = [
    'theme-namenu-host',
    useCssScrollTargets ? 'theme-namenu--scroll-targets' : '',
    useJsIndicator && railVariant ? 'theme-namenu-host--js-indicator' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const navClass = [
    'theme-namenu',
    variant === 'list' ? 'theme-namenu--list' : 'theme-namenu--anchor',
    variant === 'micro' ? 'theme-namenu--micro' : '',
    sticky ? 'theme-namenu--sticky' : '',
    menuScaleClass(menuScale),
  ]
    .filter(Boolean)
    .join(' ')

  let footer: ReactNode = null
  if (railVariant && (onBackToTop || footerLabel || footerSlot)) {
    footer = (
      <>
        <hr className="theme-namenu__split" />
        <div className="theme-namenu__footer">
          {onBackToTop ? (
            <button type="button" className="theme-namenu__back" onClick={onBackToTop}>
              <span>Top</span>
              <ArrowUp size={16} strokeWidth={1.5} aria-hidden />
            </button>
          ) : null}
          {footerLabel ? (
            <span className="theme-namenu__footer-meta type-caption type-faint">{footerLabel}</span>
          ) : null}
          {footerSlot}
        </div>
      </>
    )
  }

  const onSortStart = (event: DragStartEvent) => {
    setDraggingId(event.active.id)
  }

  const onSortEnd = (event: DragEndEvent) => {
    setDraggingId(null)
    if (!onReorder || reorderGroups.length === 0) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeKey = String(active.id)
    const overKey = String(over.id)
    const group = reorderGroups.find(
      (ids) => ids.includes(activeKey) && ids.includes(overKey),
    )
    if (!group) return
    const oldIndex = group.indexOf(activeKey)
    const newIndex = group.indexOf(overKey)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(group, oldIndex, newIndex))
  }

  const onSortCancel = () => {
    setDraggingId(null)
  }

  const draggingLabel =
    draggingId != null
      ? entries.find((entry) => entry.id === String(draggingId))?.label
      : undefined

  const handleSelect = (id: string) => {
    if (collapsible) {
      const walk = (nodes: readonly NanoAnchorMenuNode[]): NanoAnchorMenuNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node
          const found = walk(node.children)
          if (found) return found
        }
        return null
      }
      const selected = walk(tree)
      const ancestors = nanoAnchorAncestorIds(tree, id) ?? []
      setExpandedIds((prev) => {
        let changed = false
        const next = new Set(prev)
        for (const ancestorId of ancestors) {
          if (!next.has(ancestorId)) {
            next.add(ancestorId)
            changed = true
          }
        }
        // Clicking a collapsed section opens its children
        if (selected && selected.children.length > 0 && !next.has(id)) {
          next.add(id)
          changed = true
        }
        return changed ? next : prev
      })
    }
    onSelect?.(id)
  }

  const treeContent = (
    <AnchorMenuTree
      nodes={tree}
      activeId={activeId}
      variant={variant}
      sortableIdSet={sortableIdSet}
      nestedByParent={nestedByParent}
      collapsible={collapsible}
      expandedIds={expandedIds}
      onToggleExpanded={onToggleExpanded}
      onSelect={handleSelect}
      itemRefs={itemRefs}
    />
  )

  const navBody =
    sortableIdSet && onReorder ? (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={onSortStart}
        onDragEnd={onSortEnd}
        onDragCancel={onSortCancel}
      >
        {sortableList ? (
          <SortableContext items={sortableList} strategy={verticalListSortingStrategy}>
            {treeContent}
          </SortableContext>
        ) : (
          treeContent
        )}
        {typeof document !== 'undefined'
          ? createPortal(
              <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }} zIndex={1200}>
                {draggingLabel ? (
                  <div
                    className={[
                      'theme',
                      'theme-namenu__overlay-portal',
                      variant === 'micro' ? 'theme-namenu--micro' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="theme-namenu__drag-overlay">
                      <GripVertical aria-hidden size={12} strokeWidth={2} />
                      <span className="theme-namenu__link-label">{draggingLabel}</span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </DndContext>
    ) : (
      treeContent
    )

  return (
    <div ref={hostRef} className={hostClass}>
      <nav className={navClass} aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : label}>
        {title || titleEnd ? (
          <div className="theme-namenu__title-row">
            {title ? (
              <h2 id={titleId} className="theme-namenu__title">
                {title}
              </h2>
            ) : null}
            {titleEnd ? <div className="theme-namenu__title-end">{titleEnd}</div> : null}
          </div>
        ) : null}
        {navBody}
        {footer}
      </nav>
    </div>
  )
}

export type { NanoAnchorMenuEntry, NanoAnchorMenuNode, NanoAnchorMenuVariant }
