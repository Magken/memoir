import { Plus } from 'lucide-react'
import { CascadeMenuButton } from '../CascadeMenuButton'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'

type QuestionBlockChromeProps = {
  menuItems: readonly CascadeMenuItem[]
  onSelect: (id: string) => void
  children: React.ReactNode
  className?: string
}

/** Edge + tray for author blocks — VurifyViewer BlockChrome pattern, no grip. */
export function QuestionBlockChrome({
  menuItems,
  onSelect,
  children,
  className = '',
}: QuestionBlockChromeProps) {
  return (
    <div
      className={['theme-test-form__block', 'is-editable', 'is-no-grip', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-test-form__block-body">{children}</div>
      <div className="theme-test-form__edge">
        <div className="theme-test-form__edge-tools" role="group" aria-label="Question tools">
          <CascadeMenuButton
            icon={Plus}
            iconOnly
            size="xs"
            menuSize="compact"
            variant="tray"
            scrollRail="hidden"
            label="Question tools"
            className="theme-test-form__edge-btn"
            items={menuItems}
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
  )
}
