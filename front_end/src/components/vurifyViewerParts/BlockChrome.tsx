import { GripVertical, Plus } from 'lucide-react'
import type { DraggableAttributes } from '@dnd-kit/core'
import { MenuButton } from '../MenuButton'
import type { VurifyViewerBasics } from './types'
import {
  edgeMenuItemsFor,
  type EdgeElementId,
  type EdgeMenuTarget,
} from './elementMap'

type BasicsMenuContext = Pick<VurifyViewerBasics, 'display_name' | 'headline' | 'summary'> & {
  headlineSlot?: boolean
  summarySlot?: boolean
}

type BlockChromeProps = {
  editable?: boolean
  target: EdgeMenuTarget
  item?: Record<string, unknown>
  basics?: BasicsMenuContext
  onSelect: (id: EdgeElementId) => void
  gripAttributes?: DraggableAttributes
  gripListeners?: object
  setGripRef?: (element: HTMLElement | null) => void
  children: React.ReactNode
  className?: string
}

export function BlockChrome({
  editable = true,
  target,
  item,
  basics,
  onSelect,
  gripAttributes,
  gripListeners,
  setGripRef,
  children,
  className = '',
}: BlockChromeProps) {
  const menuItems = edgeMenuItemsFor(target, item, basics).map((row) => ({
    id: row.id,
    label: row.label,
    disabled: row.disabled,
    icon: row.icon,
  }))

  return (
    <div
      className={[
        'theme-vurify-viewer__block',
        editable ? 'is-editable' : '',
        editable && !setGripRef ? 'is-no-grip' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {editable && setGripRef ? (
        <button
          type="button"
          className="theme-vurify-viewer__grip"
          aria-label="Drag to reorder"
          ref={setGripRef}
          {...gripAttributes}
          {...gripListeners}
        >
          <GripVertical aria-hidden className="size-3.5" strokeWidth={1.75} />
        </button>
      ) : null}

      <div className="theme-vurify-viewer__block-body">{children}</div>

      {editable ? (
        <div className="theme-vurify-viewer__edge">
          <div className="theme-vurify-viewer__edge-tools" role="group" aria-label="Add tools">
            <MenuButton
              icon={Plus}
              iconOnly
              size="xs"
              menuSize="compact"
              variant="tray"
              portal
              scrollRail="hidden"
              label="Add"
              className="theme-vurify-viewer__edge-btn"
              items={menuItems}
              onSelect={(id) => onSelect(id as EdgeElementId)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
