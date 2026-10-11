import { Minus, Plus } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useCallback, useId, useState } from 'react'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import {
  miniStackedMenuOrientationClass,
  type MiniStackedMenuItem,
  type MiniStackedMenuOrientation,
  type MiniStackedMenuSize,
} from '../lib/menus/miniStackedMenu'
import { STACKED_MENU_MORE_DEFAULT_LABEL } from '../lib/menus/stackedMenuMore'
import type { ButtonSize } from './Button'
import { Button } from './Button'

type MiniStackedMenuProps = {
  items: readonly MiniStackedMenuItem[]
  moreItems?: readonly MiniStackedMenuItem[]
  moreLabel?: string
  selectedId?: string
  defaultSelectedId?: string | null
  onSelect?: (id: string) => void
  orientation?: MiniStackedMenuOrientation
  size?: MiniStackedMenuSize
  /** Multiplier on menu tokens + in-menu buttons — default `1` */
  menuScale?: MenuScale
  label?: string
  className?: string
  debug?: boolean
}

const buttonSize: Record<MiniStackedMenuSize, ButtonSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}

const moreButtonSize: Record<MiniStackedMenuSize, ButtonSize> = {
  sm: 'xxs',
  md: 'xs',
  lg: 'sm',
}

export function MiniStackedMenu({
  items,
  moreItems,
  moreLabel = STACKED_MENU_MORE_DEFAULT_LABEL,
  selectedId: selectedIdProp,
  defaultSelectedId = null,
  onSelect,
  orientation = 'vertical',
  size = 'md',
  menuScale = 1,
  label = 'Mini stacked menu',
  className = '',
  debug = false,
}: MiniStackedMenuProps) {
  const navId = useId().replace(/:/g, '')
  const fallbackId = defaultSelectedId ?? items[0]?.id ?? moreItems?.[0]?.id ?? ''
  const [internalSelectedId, setInternalSelectedId] = useState(fallbackId)
  const [moreOpen, setMoreOpen] = useState(false)
  const selectedId = selectedIdProp ?? internalSelectedId
  const hasMore = Boolean(moreItems?.length)

  const select = useCallback(
    (id: string) => {
      if (selectedIdProp === undefined) {
        setInternalSelectedId(id)
      }
      onSelect?.(id)
    },
    [onSelect, selectedIdProp],
  )

  const onItemKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const id = event.currentTarget.dataset.itemId
        if (id) select(id)
      }
    },
    [select],
  )

  const toggleMore = useCallback(() => {
    setMoreOpen((open) => !open)
  }, [])

  const renderItem = (item: MiniStackedMenuItem, overflow = false) => {
    const isSelected = item.id === selectedId
    const tabIndex = overflow && !moreOpen ? -1 : isSelected ? 0 : -1

    return (
      <li
        key={item.id}
        role="presentation"
        className={[
          'theme-msmenu__item',
          overflow ? 'theme-msmenu__item--overflow' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Button
          type="button"
          size={buttonSize[size]}
          variant={isSelected ? 'action' : 'ghost'}
          expandable
          expanded={isSelected}
          plainExpandLabel
          animatedLabel={item.label}
          icon={item.image ? undefined : item.icon}
          image={item.image}
          imageShape="round"
          aria-label={isSelected ? undefined : item.label}
          aria-selected={isSelected}
          role="tab"
          tabIndex={tabIndex}
          className={[
            'theme-msmenu__trigger',
            isSelected ? 'theme-msmenu__trigger--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          data-item-id={item.id}
          onClick={() => select(item.id)}
          onKeyDown={onItemKeyDown}
        />
      </li>
    )
  }

  if (debug) {
    console.debug('[MiniStackedMenu]', {
      selectedId,
      orientation,
      size,
      menuScale: resolveMenuScale(menuScale),
      count: items.length,
      moreCount: moreItems?.length ?? 0,
      moreOpen,
    })
  }

  return (
    <nav
      id={navId}
      aria-label={label}
      className={[
        'theme-msmenu',
        miniStackedMenuOrientationClass[orientation],
        menuScaleClass(menuScale),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-msmenu__shell">
        <ul
          className="theme-msmenu__list"
          role="tablist"
          aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
        >
          {items.map((item) => renderItem(item))}
          {hasMore ? (
            <li role="presentation" className="theme-msmenu__trail">
              {moreItems?.length ? (
                <div
                  className="theme-msmenu__overflow"
                  data-open={moreOpen ? 'true' : 'false'}
                  aria-hidden={!moreOpen}
                >
                  <div className="theme-msmenu__overflow-inner">
                    <ul className="theme-msmenu__overflow-list" role="presentation">
                      {moreItems.map((item) => renderItem(item, true))}
                    </ul>
                  </div>
                </div>
              ) : null}
              <div className="theme-msmenu__more-trigger">
                <Button
                  type="button"
                  size={moreButtonSize[size]}
                  variant="inset"
                  icon={moreOpen ? Minus : Plus}
                  active={moreOpen}
                  aria-label={moreLabel}
                  aria-expanded={moreOpen}
                  onClick={toggleMore}
                />
              </div>
            </li>
          ) : null}
        </ul>
      </div>
    </nav>
  )
}

export type { MiniStackedMenuItem, MiniStackedMenuOrientation, MiniStackedMenuSize }
