import { Minus, Plus } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useCallback, useId, useState } from 'react'
import {
  microMenuOrientationClass,
  type MicroMenuItem,
  type MicroMenuOrientation,
  type MicroMenuSize,
} from '../lib/menus/microMenu'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import { STACKED_MENU_MORE_DEFAULT_LABEL } from '../lib/menus/stackedMenuMore'
import type { ButtonSize } from './Button'
import { Button } from './Button'

type MicroMenuProps = {
  items: readonly MicroMenuItem[]
  moreItems?: readonly MicroMenuItem[]
  moreLabel?: string
  selectedId?: string
  defaultSelectedId?: string | null
  /** Toggle rail — multiple chips can show `action` state (overrides `selectedId` styling). */
  pressedIds?: readonly string[]
  onSelect?: (id: string) => void
  orientation?: MicroMenuOrientation
  size?: MicroMenuSize
  /** Multiplier on menu tokens + in-menu buttons — default `1` */
  menuScale?: MenuScale
  label?: string
  className?: string
  debug?: boolean
}

const buttonSize: Record<MicroMenuSize, ButtonSize> = {
  xxs: 'xxs',
  xs: 'xs',
}

export function MicroMenu({
  items,
  moreItems,
  moreLabel = STACKED_MENU_MORE_DEFAULT_LABEL,
  selectedId: selectedIdProp,
  defaultSelectedId = null,
  pressedIds,
  onSelect,
  orientation = 'vertical',
  size = 'xxs',
  menuScale = 1,
  label = 'Micro menu',
  className = '',
  debug = false,
}: MicroMenuProps) {
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

  const renderItem = (item: MicroMenuItem, overflow = false) => {
    const isPressed = pressedIds ? pressedIds.includes(item.id) : item.id === selectedId
    const tabIndex = overflow && !moreOpen ? -1 : isPressed ? 0 : -1

    return (
      <li
        key={item.id}
        role="presentation"
        className={[
          'theme-mmenu__item',
          overflow ? 'theme-mmenu__item--overflow' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Button
          type="button"
          size={buttonSize[size]}
          variant={isPressed ? 'action' : 'ghost'}
          icon={item.image ? undefined : item.icon}
          image={item.image}
          imageShape="round"
          aria-label={item.label}
          aria-selected={pressedIds ? undefined : isPressed}
          aria-pressed={pressedIds ? isPressed : undefined}
          role={pressedIds ? 'button' : 'tab'}
          tabIndex={tabIndex}
          className={[
            'theme-mmenu__trigger',
            isPressed ? 'theme-mmenu__trigger--selected' : '',
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
    console.debug('[MicroMenu]', {
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
        'theme-mmenu',
        microMenuOrientationClass[orientation],
        menuScaleClass(menuScale),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-mmenu__shell">
        <ul
          className="theme-mmenu__list"
          role={pressedIds ? 'presentation' : 'tablist'}
          aria-orientation={pressedIds ? undefined : orientation === 'vertical' ? 'vertical' : 'horizontal'}
        >
          {items.map((item) => renderItem(item))}
          {hasMore ? (
            <li role="presentation" className="theme-mmenu__trail">
              {moreItems?.length ? (
                <div
                  className="theme-mmenu__overflow"
                  data-open={moreOpen ? 'true' : 'false'}
                  aria-hidden={!moreOpen}
                >
                  <div className="theme-mmenu__overflow-inner">
                    <ul className="theme-mmenu__overflow-list" role="presentation">
                      {moreItems.map((item) => renderItem(item, true))}
                    </ul>
                  </div>
                </div>
              ) : null}
              <div className="theme-mmenu__more-trigger">
                <Button
                  type="button"
                  size={buttonSize[size]}
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

export type { MicroMenuItem, MicroMenuOrientation, MicroMenuSize }
export type { MenuScale } from '../lib/menus/menuScale'
