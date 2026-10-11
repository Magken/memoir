import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { createContext, useCallback, useContext, useId, useState } from 'react'
import { choiceIndex, clampChoiceIndex } from '../lib/forms/choiceControls'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import {
  tabbedMenuChoiceSizeClass,
  tabbedMenuSizeClass,
  tabbedMenuVariantClass,
  tabbedMenuButtonSize,
  type TabbedMenuItem,
  type TabbedMenuSize,
  type TabbedMenuVariant,
} from '../lib/menus/tabbedMenu'
import { Button } from './Button'

type TabbedMenuContextValue = {
  navId: string
  selectedId: string
}

const TabbedMenuContext = createContext<TabbedMenuContextValue | null>(null)

function useTabbedMenuContext(component: string): TabbedMenuContextValue {
  const context = useContext(TabbedMenuContext)
  if (!context) {
    throw new Error(`${component} must be used within TabbedMenu`)
  }
  return context
}

type TabbedMenuProps = {
  items: readonly TabbedMenuItem[]
  selectedId?: string
  defaultSelectedId?: string | null
  onSelect?: (id: string) => void
  /** `segmented` — sliding pill (RadioGroup-style) · `expandable` — morphing icon chips */
  variant?: TabbedMenuVariant
  size?: TabbedMenuSize
  menuScale?: MenuScale
  label?: string
  className?: string
  debug?: boolean
  children?: ReactNode
}

type TabbedMenuPanelProps = {
  id: string
  children?: ReactNode
  className?: string
}

export function TabbedMenu({
  items,
  selectedId: selectedIdProp,
  defaultSelectedId = null,
  onSelect,
  variant = 'segmented',
  size = 'md',
  menuScale = 1,
  label = 'Tabbed menu',
  className = '',
  debug = false,
  children,
}: TabbedMenuProps) {
  const navId = useId().replace(/:/g, '')
  const fallbackId =
    defaultSelectedId ?? items.find((item) => !item.disabled)?.id ?? items[0]?.id ?? ''
  const [internalSelectedId, setInternalSelectedId] = useState(fallbackId)
  const selectedId = selectedIdProp ?? internalSelectedId
  const buttonSize = tabbedMenuButtonSize[size]
  const enabledItems = items.filter((item) => !item.disabled)
  const choiceOptions = items.map((item) => ({ value: item.id, label: item.label }))
  const selectedIndex = clampChoiceIndex(choiceIndex(selectedId, choiceOptions), items.length)

  const select = useCallback(
    (id: string) => {
      const item = items.find((entry) => entry.id === id)
      if (!item || item.disabled) return
      if (selectedIdProp === undefined) {
        setInternalSelectedId(id)
      }
      onSelect?.(id)
    },
    [items, onSelect, selectedIdProp],
  )

  const onTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const id = event.currentTarget.dataset.tabId
        if (id) select(id)
        return
      }

      const currentIndex = enabledItems.findIndex((item) => item.id === selectedId)
      if (currentIndex < 0) return

      let nextIndex = currentIndex

      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % enabledItems.length
          break
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = enabledItems.length - 1
          break
        default:
          return
      }

      event.preventDefault()
      select(enabledItems[nextIndex].id)
    },
    [enabledItems, select, selectedId],
  )

  if (debug) {
    console.debug('[TabbedMenu]', {
      selectedId,
      variant,
      size,
      menuScale: resolveMenuScale(menuScale),
      count: items.length,
    })
  }

  const tablistStyle =
    variant === 'segmented'
      ? ({
          ['--choice-count' as string]: String(items.length),
          ['--choice-index' as string]: String(selectedIndex),
        } as CSSProperties)
      : undefined

  return (
    <TabbedMenuContext.Provider value={{ navId, selectedId }}>
      <div
        className={[
          'theme-tmenu',
          tabbedMenuSizeClass[size],
          tabbedMenuVariantClass[variant],
          menuScaleClass(menuScale),
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <nav className="theme-tmenu__bar" aria-label={label}>
          {variant === 'segmented' ? (
            <div
              role="tablist"
              aria-orientation="horizontal"
              className={[
                'theme-tmenu__tablist',
                'theme-choice',
                'theme-radio-group--segmented',
                tabbedMenuChoiceSizeClass[size],
                'theme-choice-track',
              ].join(' ')}
              style={tablistStyle}
            >
              <span className="theme-choice-indicator" aria-hidden />
              {items.map((item) => {
                const isSelected = item.id === selectedId
                const tabId = `${navId}-tab-${item.id}`
                const panelId = `${navId}-panel-${item.id}`
                const Icon = item.icon

                return (
                  <button
                    key={item.id}
                    type="button"
                    id={tabId}
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={panelId}
                    tabIndex={isSelected ? 0 : -1}
                    disabled={item.disabled}
                    data-tab-id={item.id}
                    className="theme-choice-option theme-tmenu__tab"
                    onClick={() => select(item.id)}
                    onKeyDown={onTabKeyDown}
                  >
                    <span className="theme-choice-option__inner type-label">
                      {Icon ? <Icon aria-hidden strokeWidth={2} /> : null}
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div
              role="tablist"
              aria-orientation="horizontal"
              className="theme-tmenu__tablist"
            >
              <div className="theme-tmenu__expand-track" role="presentation">
                {items.map((item) => {
                  const isSelected = item.id === selectedId
                  const tabId = `${navId}-tab-${item.id}`
                  const panelId = `${navId}-panel-${item.id}`

                  return (
                    <Button
                      key={item.id}
                      type="button"
                      id={tabId}
                      size={buttonSize}
                      variant={isSelected ? 'action' : 'ghost'}
                      expandable
                      expanded={isSelected}
                      plainExpandLabel
                      icon={item.icon}
                      animatedLabel={item.label}
                      disabled={item.disabled}
                      role="tab"
                      aria-selected={isSelected}
                      aria-controls={panelId}
                      tabIndex={isSelected ? 0 : -1}
                      className="theme-tmenu__tab"
                      data-tab-id={item.id}
                      onClick={() => select(item.id)}
                      onKeyDown={onTabKeyDown}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </nav>
        {children ? <div className="theme-tmenu__panels">{children}</div> : null}
      </div>
    </TabbedMenuContext.Provider>
  )
}

export function TabbedMenuPanel({ id, children, className = '' }: TabbedMenuPanelProps) {
  const { navId, selectedId } = useTabbedMenuContext('TabbedMenuPanel')
  const isSelected = selectedId === id
  const tabId = `${navId}-tab-${id}`
  const panelId = `${navId}-panel-${id}`

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      hidden={!isSelected}
      tabIndex={0}
      className={['theme-tmenu__panel', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}

export type { TabbedMenuItem, TabbedMenuSize, TabbedMenuVariant }
export type { MenuScale } from '../lib/menus/menuScale'
