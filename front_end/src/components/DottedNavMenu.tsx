import type { KeyboardEvent } from 'react'
import { useCallback, useId, useState } from 'react'
import {
  dottedNavMenuOrientationClass,
  dottedNavMenuSelectedIndex,
  dottedNavMenuSizeClass,
  type DottedNavMenuItem,
  type DottedNavMenuOrientation,
  type DottedNavMenuSize,
} from '../lib/menus/dottedNavMenu'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'

type DottedNavMenuProps = {
  items: readonly DottedNavMenuItem[]
  selectedId?: string
  defaultSelectedId?: string | null
  onSelect?: (id: string) => void
  orientation?: DottedNavMenuOrientation
  size?: DottedNavMenuSize
  menuScale?: MenuScale
  label?: string
  className?: string
  debug?: boolean
}

export function DottedNavMenu({
  items,
  selectedId: selectedIdProp,
  defaultSelectedId = null,
  onSelect,
  orientation = 'horizontal',
  size = 'md',
  menuScale = 1,
  label = 'Gallery navigation',
  className = '',
  debug = false,
}: DottedNavMenuProps) {
  const navId = useId().replace(/:/g, '')
  const fallbackId =
    defaultSelectedId ?? items.find((item) => !item.disabled)?.id ?? items[0]?.id ?? ''
  const [internalSelectedId, setInternalSelectedId] = useState(fallbackId)
  const selectedId = selectedIdProp ?? internalSelectedId
  const enabledItems = items.filter((item) => !item.disabled)
  const selectedIndex = dottedNavMenuSelectedIndex(items, selectedId)

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

  const onDotKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const id = event.currentTarget.dataset.dotId
        if (id) select(id)
        return
      }

      const currentIndex = enabledItems.findIndex((item) => item.id === selectedId)
      if (currentIndex < 0) return

      const isVertical = orientation === 'vertical'
      let nextIndex = currentIndex

      switch (event.key) {
        case 'ArrowRight':
          if (isVertical) return
          nextIndex = (currentIndex + 1) % enabledItems.length
          break
        case 'ArrowLeft':
          if (isVertical) return
          nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length
          break
        case 'ArrowDown':
          if (!isVertical) return
          nextIndex = (currentIndex + 1) % enabledItems.length
          break
        case 'ArrowUp':
          if (!isVertical) return
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
    [enabledItems, orientation, select, selectedId],
  )

  if (debug) {
    console.debug('[DottedNavMenu]', {
      selectedId,
      selectedIndex,
      orientation,
      size,
      menuScale: resolveMenuScale(menuScale),
      count: items.length,
    })
  }

  return (
    <nav
      id={navId}
      aria-label={label}
      className={[
        'theme-dotnav',
        dottedNavMenuOrientationClass[orientation],
        dottedNavMenuSizeClass[size],
        menuScaleClass(menuScale),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-dotnav__track">
        <ul
          className="theme-dotnav__list"
          role="tablist"
          aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
        >
          {items.map((item) => {
            const isSelected = item.id === selectedId
            const tabId = `${navId}-dot-${item.id}`

            return (
              <li key={item.id} role="presentation" className="theme-dotnav__item">
                <button
                  type="button"
                  id={tabId}
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={item.label}
                  tabIndex={isSelected ? 0 : -1}
                  disabled={item.disabled}
                  data-dot-id={item.id}
                  className={[
                    'theme-dotnav__dot',
                    isSelected ? 'theme-dotnav__dot--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => select(item.id)}
                  onKeyDown={onDotKeyDown}
                />
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

export type { DottedNavMenuItem, DottedNavMenuOrientation, DottedNavMenuSize }
export type { MenuScale } from '../lib/menus/menuScale'
