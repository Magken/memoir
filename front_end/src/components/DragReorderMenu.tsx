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
  type CollisionDetection,
  type DraggableAttributes,
  type DraggableSyntheticListeners as SyntheticListenerMap,
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
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, GripVertical, Settings, type LucideIcon } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import {
  buttonSizeClass,
  buttonVariantClass,
  type ButtonSize,
  type ButtonVariant,
} from '../lib/ui/buttonStyles'
import {
  dragReorderActionsForNode,
  dragReorderBodyMaxHeightClass,
  dragReorderMenuButtonSize,
  dragReorderMenuDefaultOrder,
  dragReorderMenuPanelSize,
  dragReorderMenuPanelSizeClass,
  dragReorderMenuSizeClass,
  dragReorderOrderFromRoot,
  dragReorderParentSectionId,
  dragReorderRootIds,
  findDragReorderNode,
  dragReorderNodeDepth,
  DRAG_REORDER_DEFAULT_ACTION_MENU_SIZE,
  DRAG_REORDER_DEFAULT_ACTION_TRIGGER_SIZE,
  expandedSectionIdsForSelection,
  normalizeDragReorderNodes,
  orderedDragReorderNodes,
  setSiblingOrder,
  siblingOrderForParent,
  type DragReorderBodyMaxHeight,
  type DragReorderMenuAction,
  type DragReorderMenuItem,
  type DragReorderMenuNode,
  type DragReorderMenuOrder,
  type DragReorderMenuSize,
} from '../lib/menus/dragReorderMenu'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import { menuScrollConfig, type MenuSize } from '../lib/menus/menuControls'
import { DEFAULT_SCROLL_RAIL, type ScrollRailType } from '../lib/scroll/scrollRail'
import { MenuButton } from './MenuButton'
import { ThemeScroll } from './ThemeScroll'

type DragReorderMenuProps = {
  items: readonly (DragReorderMenuItem | DragReorderMenuNode)[]
  order?: DragReorderMenuOrder | readonly string[]
  defaultOrder?: DragReorderMenuOrder | readonly string[]
  onReorder?: (order: DragReorderMenuOrder) => void
  selectedId?: string
  onSelect?: (id: string) => void
  actionDepths?: readonly number[]
  defaultLinkActions?: readonly DragReorderMenuAction[]
  defaultSectionActions?: readonly DragReorderMenuAction[]
  onAction?: (actionId: string, nodeId: string, nodeType: 'section' | 'link') => void
  actionIcon?: LucideIcon
  actionTriggerSize?: ButtonSize
  actionMenuSize?: MenuSize
  actionItemSize?: ButtonSize
  flat?: boolean
  bodyMaxHeight?: DragReorderBodyMaxHeight
  size?: DragReorderMenuSize
  menuScale?: MenuScale
  scrollRail?: ScrollRailType
  scrollClouds?: boolean
  itemVariant?: ButtonVariant
  gripLabel?: string
  label?: string
  className?: string
  debug?: boolean
}

const defaultEditorSectionActions: readonly DragReorderMenuAction[] = [
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

const defaultEditorLinkActions: readonly DragReorderMenuAction[] = [
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'delete', label: 'Delete' },
]

type DragReorderActionMenuConfig = {
  actionIcon: LucideIcon
  actionTriggerSize: ButtonSize
  actionMenuSize: MenuSize
  actionItemSize?: ButtonSize
}

function normalizeDragReorderOrder(
  order: DragReorderMenuOrder | readonly string[] | undefined,
  _items: readonly (DragReorderMenuItem | DragReorderMenuNode)[],
): DragReorderMenuOrder | undefined {
  if (order === undefined) return undefined
  if (Array.isArray(order)) return dragReorderOrderFromRoot(order)
  return order as DragReorderMenuOrder
}

function DragReorderMenuRowContent({
  nodeId,
  label,
  icon: ItemIcon,
  disabled,
  depth,
  nodeType,
  node,
  overlay,
  isDragging,
  isSelected,
  isExpanded,
  flat,
  sectionSubId,
  buttonSize,
  itemVariant,
  gripLabel,
  actionDepths,
  defaultLinkActions,
  defaultSectionActions,
  actionMenu,
  gripAttributes,
  gripListeners,
  setGripRef,
  onSelect,
  onToggleSection,
  onAction,
}: {
  nodeId: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
  depth: number
  nodeType: 'section' | 'link'
  node: DragReorderMenuNode
  overlay?: boolean
  isDragging?: boolean
  isSelected: boolean
  isExpanded: boolean
  flat: boolean
  sectionSubId?: string
  buttonSize: ButtonSize
  itemVariant: ButtonVariant
  gripLabel: string
  actionDepths: readonly number[]
  defaultLinkActions: readonly DragReorderMenuAction[]
  defaultSectionActions: readonly DragReorderMenuAction[]
  actionMenu: DragReorderActionMenuConfig
  gripAttributes?: DraggableAttributes
  gripListeners?: SyntheticListenerMap
  setGripRef?: (element: HTMLElement | null) => void
  onSelect?: (id: string) => void
  onToggleSection?: () => void
  onAction?: (actionId: string, nodeId: string, nodeType: 'section' | 'link') => void
}) {
  const actions = dragReorderActionsForNode(
    node,
    depth,
    actionDepths,
    defaultLinkActions,
    defaultSectionActions,
  )
  const showActions = actions.length > 0 && !overlay
  const isSection = nodeType === 'section'
  const { actionIcon, actionTriggerSize, actionMenuSize, actionItemSize } = actionMenu

  return (
    <div
      className={[
        'theme-btn',
        buttonSizeClass[buttonSize],
        buttonVariantClass[itemVariant],
        'theme-dreorder__row',
        overlay ? 'theme-dreorder__row--overlay' : '',
        isDragging ? 'theme-dreorder__row--dragging' : '',
        isSelected ? 'is-active' : '',
        isSection && isExpanded ? 'theme-dreorder__row--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-depth={depth}
    >
      <span
        ref={setGripRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${gripLabel}: ${label}`}
        aria-disabled={disabled || undefined}
        className="theme-dreorder__grip"
        {...(disabled || overlay ? {} : gripAttributes)}
        {...(disabled || overlay ? {} : gripListeners)}
      >
        <GripVertical aria-hidden className="theme-btn__icon" strokeWidth={2} />
      </span>
      {ItemIcon ? (
        <ItemIcon aria-hidden className="theme-btn__icon theme-dreorder__item-icon" strokeWidth={2} />
      ) : null}
      <button
        type="button"
        disabled={disabled}
        className="theme-dreorder__main"
        aria-expanded={isSection && !flat ? isExpanded : undefined}
        aria-controls={isSection && sectionSubId ? sectionSubId : undefined}
        onClick={() => {
          if (isSection && !flat) {
            onToggleSection?.()
            return
          }
          onSelect?.(nodeId)
        }}
      >
        <span className="theme-btn__label">{label}</span>
        {isSection && !flat ? (
          <ChevronDown aria-hidden className="theme-dreorder__chevron" strokeWidth={2} />
        ) : null}
      </button>
      {showActions ? (
        <MenuButton
          iconOnly
          portal
          icon={actionIcon}
          size={actionTriggerSize}
          menuSize={actionMenuSize}
          itemSize={actionMenuSize === 'compact' ? undefined : actionItemSize}
          variant="ghost"
          label={`${label} options`}
          className="theme-dreorder__gear"
          items={actions.map((action) => ({
            id: action.id,
            label: action.label,
            disabled: action.disabled,
          }))}
          onSelect={(actionId) => onAction?.(actionId, nodeId, nodeType)}
        />
      ) : null}
    </div>
  )
}

function DragReorderSortableSlot({
  id,
  disabled,
  children,
}: {
  id: string
  disabled?: boolean
  children: (args: {
    isDragging: boolean
    gripAttributes: DraggableAttributes
    gripListeners: SyntheticListenerMap | undefined
    setGripRef: (element: HTMLElement | null) => void
  }) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style: CSSProperties | undefined = isDragging
    ? undefined
    : {
        transform: CSS.Translate.toString(transform),
        transition,
      }

  return (
    <div ref={setNodeRef} style={style ?? {}} className="theme-dreorder__sortable-slot">
      {children({
        isDragging,
        gripAttributes: attributes,
        gripListeners: listeners,
        setGripRef: setActivatorNodeRef,
      })}
    </div>
  )
}

function DragReorderMenuBranch({
  nodes,
  parentSectionId,
  depth,
  flat,
  expandedSectionIds,
  selectedId,
  order,
  buttonSize,
  itemVariant,
  gripLabel,
  actionDepths,
  defaultLinkActions,
  defaultSectionActions,
  actionMenu,
  idPrefix,
  onSelect,
  onToggleSection,
  onAction,
}: {
  nodes: readonly DragReorderMenuNode[]
  parentSectionId: string | null
  depth: number
  flat: boolean
  expandedSectionIds: Set<string>
  selectedId?: string
  order: DragReorderMenuOrder
  buttonSize: ButtonSize
  itemVariant: ButtonVariant
  gripLabel: string
  actionDepths: readonly number[]
  defaultLinkActions: readonly DragReorderMenuAction[]
  defaultSectionActions: readonly DragReorderMenuAction[]
  actionMenu: DragReorderActionMenuConfig
  idPrefix: string
  onSelect?: (id: string) => void
  onToggleSection: (sectionId: string) => void
  onAction?: (actionId: string, nodeId: string, nodeType: 'section' | 'link') => void
}) {
  const siblingIds = siblingOrderForParent(order, parentSectionId)
  const orderedNodes = orderedDragReorderNodes(nodes, siblingIds)
  const listClass = depth === 0 ? 'theme-dreorder__list' : 'theme-dreorder__sublist'

  return (
    <SortableContext items={siblingIds} strategy={verticalListSortingStrategy}>
      <ul className={listClass} role="list" data-tier-depth={depth}>
        {orderedNodes.map((node) => {
          if (node.type === 'link') {
            return (
              <li key={node.id} role="listitem" className="theme-dreorder__list-item" data-item-id={node.id}>
                <DragReorderSortableSlot id={node.id} disabled={node.disabled}>
                  {({ isDragging, gripAttributes, gripListeners, setGripRef }) => (
                    <DragReorderMenuRowContent
                      nodeId={node.id}
                      label={node.label}
                      icon={node.icon}
                      disabled={node.disabled}
                      depth={depth}
                      nodeType="link"
                      node={node}
                      isDragging={isDragging}
                      isSelected={selectedId === node.id}
                      isExpanded={false}
                      flat={flat}
                      buttonSize={buttonSize}
                      itemVariant={itemVariant}
                      gripLabel={gripLabel}
                      actionDepths={actionDepths}
                      defaultLinkActions={defaultLinkActions}
                      defaultSectionActions={defaultSectionActions}
                      actionMenu={actionMenu}
                      gripAttributes={gripAttributes}
                      gripListeners={gripListeners}
                      setGripRef={setGripRef}
                      onSelect={onSelect}
                      onAction={onAction}
                    />
                  )}
                </DragReorderSortableSlot>
              </li>
            )
          }

          const sectionSubId = `${idPrefix}-sub-${node.id}`
          const isExpanded = flat || expandedSectionIds.has(node.id)
          const isSelected = selectedId === node.id

          return (
            <li
              key={node.id}
              role="listitem"
              className={[
                'theme-dreorder__list-item',
                'theme-dreorder__list-item--section',
                isExpanded ? 'theme-dreorder__list-item--open' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-section-id={node.id}
              data-item-id={node.id}
            >
              <DragReorderSortableSlot id={node.id}>
                {({ isDragging, gripAttributes, gripListeners, setGripRef }) => (
                  <DragReorderMenuRowContent
                    nodeId={node.id}
                    label={node.label}
                    icon={node.icon}
                    depth={depth}
                    nodeType="section"
                    node={node}
                    isDragging={isDragging}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    flat={flat}
                    sectionSubId={sectionSubId}
                    buttonSize={buttonSize}
                    itemVariant={itemVariant}
                    gripLabel={gripLabel}
                    actionDepths={actionDepths}
                    defaultLinkActions={defaultLinkActions}
                    defaultSectionActions={defaultSectionActions}
                    actionMenu={actionMenu}
                    gripAttributes={gripAttributes}
                    gripListeners={gripListeners}
                    setGripRef={setGripRef}
                    onSelect={onSelect}
                    onToggleSection={() => onToggleSection(node.id)}
                    onAction={onAction}
                  />
                )}
              </DragReorderSortableSlot>
              <div
                id={sectionSubId}
                className={['theme-dreorder__subpanel', isExpanded ? 'theme-dreorder__subpanel--open' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden={!isExpanded}
              >
                <div className="theme-dreorder__subpanel-inner" data-depth={depth}>
                  <DragReorderMenuBranch
                    nodes={node.children}
                    parentSectionId={node.id}
                    depth={depth + 1}
                    flat={flat}
                    expandedSectionIds={expandedSectionIds}
                    selectedId={selectedId}
                    order={order}
                    buttonSize={buttonSize}
                    itemVariant={itemVariant}
                    gripLabel={gripLabel}
                    actionDepths={actionDepths}
                    defaultLinkActions={defaultLinkActions}
                    defaultSectionActions={defaultSectionActions}
                    actionMenu={actionMenu}
                    idPrefix={idPrefix}
                    onSelect={onSelect}
                    onToggleSection={onToggleSection}
                    onAction={onAction}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </SortableContext>
  )
}

export function DragReorderMenu({
  items,
  order: orderProp,
  defaultOrder,
  onReorder,
  selectedId,
  onSelect,
  actionDepths = [0, 1],
  defaultLinkActions = defaultEditorLinkActions,
  defaultSectionActions = defaultEditorSectionActions,
  onAction,
  actionIcon = Settings,
  actionTriggerSize = DRAG_REORDER_DEFAULT_ACTION_TRIGGER_SIZE,
  actionMenuSize = DRAG_REORDER_DEFAULT_ACTION_MENU_SIZE,
  actionItemSize,
  flat = false,
  bodyMaxHeight = 24,
  size = 'md',
  menuScale = 1,
  scrollRail = DEFAULT_SCROLL_RAIL,
  scrollClouds = true,
  itemVariant = 'inset',
  gripLabel = 'Drag to reorder',
  label = 'Reorderable list',
  className = '',
  debug = false,
}: DragReorderMenuProps) {
  const navId = useId().replace(/:/g, '')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const nodes = useMemo(() => normalizeDragReorderNodes(items), [items])
  const fallbackOrder = useMemo(
    () =>
      normalizeDragReorderOrder(defaultOrder, items) ??
      dragReorderMenuDefaultOrder(items),
    [defaultOrder, items],
  )
  const [internalOrder, setInternalOrder] = useState<DragReorderMenuOrder>(fallbackOrder)
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(() => new Set())
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const order = normalizeDragReorderOrder(orderProp, items) ?? internalOrder

  const tierScopedCollisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const activeId = args.active?.id
      if (!activeId) return closestCenter(args)

      const activeParent = dragReorderParentSectionId(order, String(activeId))
      if (activeParent === undefined) return closestCenter(args)

      const tierIds = new Set(siblingOrderForParent(order, activeParent))
      const tierContainers = args.droppableContainers.filter((container) =>
        tierIds.has(String(container.id)),
      )
      if (tierContainers.length === 0) return []

      return closestCenter({ ...args, droppableContainers: tierContainers })
    },
    [order],
  )

  const clearDragSession = useCallback(() => {
    setActiveId(null)
  }, [])

  const commitOrder = useCallback(
    (next: DragReorderMenuOrder) => {
      if (orderProp === undefined) {
        setInternalOrder(next)
      }
      onReorder?.(next)
    },
    [onReorder, orderProp],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragCancel = useCallback(() => {
    clearDragSession()
  }, [clearDragSession])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      clearDragSession()
      if (!over || active.id === over.id) return

      const activeItemId = String(active.id)
      const overItemId = String(over.id)
      const activeParent = dragReorderParentSectionId(order, activeItemId)
      const overParent = dragReorderParentSectionId(order, overItemId)
      if (activeParent === undefined || overParent === undefined) return
      if (activeParent !== overParent) return

      const siblings = siblingOrderForParent(order, activeParent)
      const oldIndex = siblings.indexOf(activeItemId)
      const newIndex = siblings.indexOf(overItemId)
      if (oldIndex === -1 || newIndex === -1) return

      commitOrder(setSiblingOrder(order, activeParent, arrayMove(siblings, oldIndex, newIndex)))
    },
    [clearDragSession, commitOrder, order],
  )

  useEffect(() => {
    if (!selectedId) return
    setExpandedSectionIds((current) => {
      const next = expandedSectionIdsForSelection(nodes, selectedId)
      if (next.size === 0) return current
      return new Set([...current, ...next])
    })
  }, [nodes, selectedId])

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSectionIds((current) => {
      const next = new Set(current)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }, [])

  const activeNode = activeId ? findDragReorderNode(nodes, String(activeId)) : undefined
  const activeDepth = activeNode ? dragReorderNodeDepth(nodes, activeNode.id) : 0

  if (debug) {
    console.debug('[DragReorderMenu]', {
      order,
      root: dragReorderRootIds(order),
      activeId,
      menuScale: resolveMenuScale(menuScale),
      size,
      flat,
      bodyMaxHeight,
      scrollRail,
      count: nodes.length,
    })
  }

  const buttonSize = dragReorderMenuButtonSize[size]
  const panelSize = dragReorderMenuPanelSize(size)
  const actionMenu: DragReorderActionMenuConfig = {
    actionIcon,
    actionTriggerSize,
    actionMenuSize,
    actionItemSize,
  }

  return (
    <nav
      id={navId}
      aria-label={label}
      className={[
        'theme-dreorder',
        dragReorderMenuSizeClass[size],
        dragReorderMenuPanelSizeClass[panelSize],
        dragReorderBodyMaxHeightClass[bodyMaxHeight],
        menuScaleClass(menuScale),
        flat ? 'theme-dreorder--flat' : '',
        scrollClouds ? 'theme-dreorder--scroll-clouds' : '',
        activeId ? 'theme-dreorder--drag-active' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={tierScopedCollisionDetection}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="theme-dreorder__body">
          <div className="theme-dreorder__body-inner">
            <ThemeScroll
              className="theme-dreorder__scroll"
              config={menuScrollConfig[panelSize]}
              rail={scrollRail}
              scrollClouds={scrollClouds}
              tabIndex={-1}
            >
              <div className="theme-dreorder__tree">
                <DragReorderMenuBranch
                  nodes={nodes}
                  parentSectionId={null}
                  depth={0}
                  flat={flat}
                  expandedSectionIds={expandedSectionIds}
                  selectedId={selectedId}
                  order={order}
                  buttonSize={buttonSize}
                  itemVariant={itemVariant}
                  gripLabel={gripLabel}
                  actionDepths={actionDepths}
                  defaultLinkActions={defaultLinkActions}
                  defaultSectionActions={defaultSectionActions}
                  actionMenu={actionMenu}
                  idPrefix={navId}
                  onSelect={onSelect}
                  onToggleSection={toggleSection}
                  onAction={onAction}
                />
              </div>
            </ThemeScroll>
          </div>
        </div>
        {createPortal(
          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }} zIndex={1200}>
            {activeNode ? (
              <div className="theme theme-dreorder__overlay-portal">
                <div
                  className={[
                    'theme-dreorder',
                    'theme-dreorder__overlay-host',
                    dragReorderMenuSizeClass[size],
                    menuScaleClass(menuScale),
                  ].join(' ')}
                >
                  <DragReorderMenuRowContent
                    nodeId={activeNode.id}
                    label={activeNode.label}
                    icon={activeNode.type === 'link' ? activeNode.icon : activeNode.icon}
                    depth={activeDepth}
                    nodeType={activeNode.type}
                    node={activeNode}
                    overlay
                    isSelected={selectedId === activeNode.id}
                    isExpanded={
                      activeNode.type === 'section' &&
                      (flat || expandedSectionIds.has(activeNode.id))
                    }
                    flat={flat}
                    buttonSize={buttonSize}
                    itemVariant={itemVariant}
                    gripLabel={gripLabel}
                    actionDepths={actionDepths}
                    defaultLinkActions={defaultLinkActions}
                    defaultSectionActions={defaultSectionActions}
                    actionMenu={actionMenu}
                  />
                </div>
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </nav>
  )
}

export type {
  DragReorderMenuAction,
  DragReorderMenuItem,
  DragReorderMenuNode,
  DragReorderMenuOrder,
  DragReorderMenuSize,
}
