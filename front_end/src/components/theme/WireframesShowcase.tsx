import { useMemo, useState } from 'react'
import {
  filterWireframes,
  WIREFRAME_CATEGORIES,
  WIREFRAME_SCOPES,
  WIREFRAME_SECTION_CATEGORIES,
  WIREFRAME_PAGE_CATEGORIES,
} from '../../lib/wireframes/wireframeCatalog'
import type { WireframeLayout } from '../../lib/wireframes/wireframeTypes'
import { Select } from '../Select'
import { WireframePreview } from '../WireframePreview'

type WireframesShowcaseProps = {
  /** Theme Mockups — same frames with copy + icons. */
  filled?: boolean
}

function LayoutRow({ layout, filled }: { layout: WireframeLayout; filled: boolean }) {
  const categoryLabel =
    WIREFRAME_CATEGORIES.find((option) => option.value === layout.category)?.label ??
    layout.category

  return (
    <li className="theme-shell-divider grid gap-5 py-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-12">
      <aside className="min-w-0 space-y-2 lg:sticky lg:top-24">
        <p className="type-label mb-0">{layout.name}</p>
        <p className="type-caption type-faint mb-0">
          {layout.tier === 'section' ? 'Section frame' : 'Page layout'} · {categoryLabel}
        </p>
        {layout.sectionTag ? (
          <p className="type-caption mb-0">
            <span className="theme-wireframe__tag theme-wireframe__tag--inline type-overline">
              {layout.sectionTag}
            </span>
          </p>
        ) : null}
        <p className="type-body-sm type-muted mb-0">{layout.purpose}</p>
        <p className="type-caption type-faint mb-0">{layout.reference}</p>
        {layout.frame ? (
          <p className="type-code mb-0 break-words">frame: {layout.frame}</p>
        ) : null}
      </aside>
      <div className="min-w-0 max-w-3xl">
        <WireframePreview layout={layout} compact={layout.tier === 'section'} filled={filled} />
      </div>
    </li>
  )
}

export function WireframesShowcase({ filled = false }: WireframesShowcaseProps) {
  const [scope, setScope] = useState<string>('all')
  const [category, setCategory] = useState<string>('all')

  const categoryOptions = useMemo(() => {
    if (scope === 'page') {
      return [{ value: 'all', label: 'All page categories' }, ...WIREFRAME_PAGE_CATEGORIES]
    }
    if (scope === 'section') {
      return [{ value: 'all', label: 'All section types' }, ...WIREFRAME_SECTION_CATEGORIES]
    }
    return [...WIREFRAME_CATEGORIES]
  }, [scope])

  const visible = useMemo(
    () => filterWireframes(scope as 'all' | 'page' | 'section', category),
    [scope, category],
  )

  const grouped = useMemo(() => {
    const groups =
      scope === 'section'
        ? WIREFRAME_SECTION_CATEGORIES
        : scope === 'page'
          ? WIREFRAME_PAGE_CATEGORIES
          : [...WIREFRAME_PAGE_CATEGORIES, ...WIREFRAME_SECTION_CATEGORIES]

    if (category !== 'all') {
      return [
        {
          id: category,
          label: WIREFRAME_CATEGORIES.find((option) => option.value === category)?.label ?? category,
          items: visible,
        },
      ]
    }

    return groups
      .map((option) => ({
        id: option.value,
        label: option.label,
        items: visible.filter((layout) => layout.category === option.value),
      }))
      .filter((group) => group.items.length > 0)
  }, [category, scope, visible])

  return (
    <div className="space-y-10">
      <div className="space-y-3 prose-measure">
        <p className="type-body-sm type-muted mb-0">
          {filled ? (
            <>
              Same frames as Wireframes, populated — real lines and Lucide icons in every box.
              Structure stays the grid; this is the mockup pass.
            </>
          ) : (
            <>
              <strong>Page layouts</strong> show full-page structure; <strong>section frames</strong>{' '}
              zoom into one block — hero, CTA, features, testimonials, nav, footer, forms, and stats.
              Inner <strong>micro boxes</strong> spell out eyebrow, headline, buttons, and nested parts.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Select
          label="Scope"
          options={[...WIREFRAME_SCOPES]}
          value={scope}
          onChange={(value) => {
            setScope(value)
            setCategory('all')
          }}
        />
        <Select
          label="Category"
          options={categoryOptions}
          value={category}
          onChange={setCategory}
        />
        <p className="type-caption type-faint pb-2 mb-0">
          {visible.length} frame{visible.length === 1 ? '' : 's'}
        </p>
      </div>

      {category === 'all' ? (
        <div className="space-y-0">
          {grouped.map((group) => (
            <section key={group.id} className="space-y-0">
              <p className="type-overline border-b py-4 mb-0">{group.label}</p>
              <ul className="theme-shell-divider divide-y border-b">
                {group.items.map((layout) => (
                  <LayoutRow key={layout.id} layout={layout} filled={filled} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="theme-shell-divider divide-y border-y">
          {visible.map((layout) => (
            <LayoutRow key={layout.id} layout={layout} filled={filled} />
          ))}
        </ul>
      )}
    </div>
  )
}
