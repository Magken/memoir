import { Minus, Plus } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useCallback, useId, useState } from 'react'
import {
  nanoStackedMenuOrientationClass,
  type NanoStackedMenuItem,
  type NanoStackedMenuOrientation,
  type NanoStackedMenuSize,
} from '../lib/menus/nanoStackedMenu'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import { STACKED_MENU_MORE_DEFAULT_LABEL } from '../lib/menus/stackedMenuMore'
import type { ButtonSize } from './Button'
import { Button } from './Button'

type NanoStackedMenuProps = {
  items: readonly NanoStackedMenuItem[]
  moreItems?: readonly NanoStackedMenuItem[]
  moreLabel?: string
  selectedId?: string
  defaultSelectedId?: string | null
  onSelect?: (id: string) => void
  orientation?: NanoStackedMenuOrientation
  size?: NanoStackedMenuSize
  /** Multiplier on menu tokens + in-menu buttons — default `1` */
  menuScale?: MenuScale
  label?: string
  className?: string
  debug?: boolean
}

const buttonSize: Record<NanoStackedMenuSize, ButtonSize> = {
  xxs: 'xxs',
}

const moreButtonSize: Record<NanoStackedMenuSize, ButtonSize> = {
  xxs: 'xxs',
}

export function NanoStackedMenu({
  items,
  moreItems,
  moreLabel = STACKED_MENU_MORE_DEFAULT_LABEL,
  selectedId: selectedIdProp,
  defaultSelectedId = null,
  onSelect,
  orientation = 'vertical',
  size = 'xxs',
  menuScale = 1,
  label = 'Nano stacked menu',
  className = '',
  debug = false,
}: NanoStackedMenuProps) {
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

  const renderItem = (item: NanoStackedMenuItem, overflow = false) => {
    const isSelected = item.id === selectedId
    const tabIndex = overflow && !moreOpen ? -1 : 0

    return (
      <li
        key={item.id}
        role="presentation"
        className={[
          'theme-nmenu__item',
          overflow ? 'theme-nmenu__item--overflow' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Button
          type="button"
          size={buttonSize[size]}
          variant="ghost"
          active={item.image ? false : isSelected}
          icon={item.image ? undefined : item.icon}
          image={item.image}
          imageShape="square"
          aria-label={item.label}
          aria-selected={isSelected}
          role="tab"
          tabIndex={tabIndex}
          className={[
            'theme-nmenu__trigger',
            item.image ? 'theme-nmenu__trigger--swatch' : '',
            isSelected ? 'theme-nmenu__trigger--selected' : '',
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
    console.debug('[NanoStackedMenu]', {
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
        'theme-nmenu',
        nanoStackedMenuOrientationClass[orientation],
        menuScaleClass(menuScale),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-nmenu__shell">
        <ul
          className="theme-nmenu__list"
          role="tablist"
          aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
        >
          {items.map((item) => renderItem(item))}
          {hasMore ? (
            <li role="presentation" className="theme-nmenu__trail">
              {moreItems?.length ? (
                <div
                  className="theme-nmenu__overflow"
                  data-open={moreOpen ? 'true' : 'false'}
                  aria-hidden={!moreOpen}
                >
                  <div className="theme-nmenu__overflow-inner">
                    <ul className="theme-nmenu__overflow-list" role="presentation">
                      {moreItems.map((item) => renderItem(item, true))}
                    </ul>
                  </div>
                </div>
              ) : null}
              <div className="theme-nmenu__more-trigger">
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

export type { NanoStackedMenuItem, NanoStackedMenuOrientation, NanoStackedMenuSize }
