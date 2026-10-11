import { useMemo, useState } from 'react'
import type { ItemDisplayArrangement } from '../../lib/cards/itemDisplayArrangements'
import { itemDisplayCategoryOptions } from '../../lib/cards/itemDisplayArrangements'
import { itemDisplayCardArrangements } from '../cardDisplayItemArrangements'
import { Select } from '../Select'

function ArrangementRow({ arrangement }: { arrangement: ItemDisplayArrangement }) {
  const categoryLabel =
    itemDisplayCategoryOptions.find((option) => option.value === arrangement.category)?.label ??
    arrangement.category

  return (
    <li className="theme-shell-divider grid gap-5 py-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-12">
      <aside className="min-w-0 space-y-2 lg:sticky lg:top-24">
        <p className="type-label mb-0">{arrangement.name}</p>
        <p className="type-caption type-faint mb-0">{categoryLabel}</p>
        <p className="type-body-sm type-muted mb-0">{arrangement.purpose}</p>
        <p className="type-caption type-faint mb-0">{arrangement.reference}</p>
        <p className="type-code mb-0 break-words">{arrangement.stack}</p>
      </aside>
      <div className="min-w-0">{arrangement.preview}</div>
    </li>
  )
}

export function ItemDisplayCardCompositesShowcase() {
  const [category, setCategory] = useState<string>('all')

  const visible = useMemo(
    () =>
      category === 'all'
        ? itemDisplayCardArrangements
        : itemDisplayCardArrangements.filter((arrangement) => arrangement.category === category),
    [category],
  )

  const grouped = useMemo(() => {
    if (category !== 'all') {
      return [
        {
          id: category,
          label: itemDisplayCategoryOptions.find((o) => o.value === category)?.label ?? category,
          items: visible,
        },
      ]
    }
    return itemDisplayCategoryOptions
      .filter((option) => option.value !== 'all')
      .map((option) => ({
        id: option.value,
        label: option.label,
        items: itemDisplayCardArrangements.filter((arrangement) => arrangement.category === option.value),
      }))
      .filter((group) => group.items.length > 0)
  }, [category, visible])

  return (
    <div className="space-y-10">
      <div className="space-y-3 prose-measure">
        <p className="type-body-sm type-muted mb-0">
          <strong>Item display</strong> card composites — catalog tiles, cart lines, feed rows, and
          picker shells. References: <code className="type-code">ref.data-card-1</code>–
          <code className="type-code">4</code>. Filter by <strong>Display style cards</strong> for
          overlay, magazine, ribbon, bento, chip strip, and duo stack layouts. Copy the{' '}
          <code className="type-code">stack</code> string and swap media, labels, and actions.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Select
          label="Purpose"
          options={[...itemDisplayCategoryOptions]}
          value={category}
          onChange={setCategory}
        />
        <p className="type-caption type-faint pb-2 mb-0">
          {visible.length} arrangement{visible.length === 1 ? '' : 's'}
        </p>
      </div>

      {category === 'all' ? (
        <div className="space-y-0">
          {grouped.map((group) => (
            <section key={group.id} className="space-y-0">
              <p className="type-overline border-b py-4 mb-0">{group.label}</p>
              <ul className="theme-shell-divider divide-y border-b">
                {group.items.map((arrangement) => (
                  <ArrangementRow key={arrangement.id} arrangement={arrangement} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="theme-shell-divider divide-y border-y">
          {visible.map((arrangement) => (
            <ArrangementRow key={arrangement.id} arrangement={arrangement} />
          ))}
        </ul>
      )}
    </div>
  )
}
