import { ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useState, type RefObject } from 'react'
import { scrollToAnchorTarget } from '../../lib/menus/anchorScroll'
import { BlockChrome } from './BlockChrome'
import { DocField } from './DocField'
import { IconButton } from '../IconButton'
import { ViewerEditable } from './ViewerEditable'
import {
  applyElementToItem,
  type EdgeElementId,
} from './elementMap'
import { useViewerFormat } from './formatContext'
import {
  footerKeyForKind,
  slotForEdgeElement,
  viewerSlotTocId,
} from './itemFieldOrder'
import { ItemLayout } from './ItemLayout'
import { ViewerRule } from './ViewerRule'
import { patchItemMaybeResortByDate } from './itemDateOrder'
import {
  addItem,
  emptyItemForKind,
  itemPresenceKey,
  patchItem,
  patchSection,
  removeItem,
  removeSection,
} from './patch'
import type { VurifyViewerDoc, VurifyViewerSection } from './types'
import {
  presenceClassName,
  usePresenceItems,
  ViewerMotion,
} from './ViewerMotion'
import { viewerItemTocId, viewerSectionTocId } from './viewerToc'

export type SectionExpandRequest = {
  sectionId: string
  /** Bumps so the same section can be re-requested. */
  token: number
}

type SectionsListProps = {
  doc: VurifyViewerDoc
  editable?: boolean
  onChange: (next: VurifyViewerDoc) => void
  /** Stage scroll root — used when date edits auto-reorder entries. */
  scrollRootRef?: RefObject<HTMLElement | null>
  /** TOC click — expand this document section if folded. */
  expandRequest?: SectionExpandRequest | null
  /** Live extract — skip enter/leave presence so stream updates don't stack ghosts. */
  streaming?: boolean
}

function ViewerSection({
  section,
  doc,
  editable,
  onChange,
  scrollRootRef,
  expandRequest,
  motionClassName = '',
  streaming = false,
}: {
  section: VurifyViewerSection
  doc: VurifyViewerDoc
  editable?: boolean
  onChange: (next: VurifyViewerDoc) => void
  scrollRootRef?: RefObject<HTMLElement | null>
  expandRequest?: SectionExpandRequest | null
  motionClassName?: string
  streaming?: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [dateMovedKey, setDateMovedKey] = useState<string | null>(null)
  const { focusedFieldId } = useViewerFormat()

  useEffect(() => {
    if (!expandRequest || expandRequest.sectionId !== section.id) return
    setCollapsed(false)
  }, [expandRequest?.sectionId, expandRequest?.token, section.id])

  const itemRows = usePresenceItems(
    section.items,
    (item, index) => itemPresenceKey(section.id, item, index),
    undefined,
    { instant: streaming },
  )

  const liveIndexByKey = new Map(
    section.items.map((item, index) => [itemPresenceKey(section.id, item, index), index]),
  )

  const scrollToAdded = (anchorId: string) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToAnchorTarget(anchorId, scrollRootRef?.current ?? null, 28)
      })
    })
  }

  const onSectionEdge = (id: EdgeElementId) => {
    if (id === 'add-entry') {
      onChange(addItem(doc, section.id, emptyItemForKind(section.kind)))
      return
    }
    if (id === 'remove') {
      onChange(removeSection(doc, section.id))
    }
  }

  const onItemEdge = (itemIndex: number, id: EdgeElementId) => {
    const item = section.items[itemIndex] ?? {}
    if (id === 'remove') {
      onChange(removeItem(doc, section.id, itemIndex))
      return
    }
    if (id === 'add-entry' && section.kind === 'skills') {
      const skills = Array.isArray(item.items)
        ? [...(item.items as Array<{ name?: string }>)]
        : []
      onChange(patchItem(doc, section.id, itemIndex, { items: [...skills, { name: '' }] }))
      return
    }
    const next = applyElementToItem(section.kind, item, id, { focusedFieldId })
    onChange(patchItem(doc, section.id, itemIndex, next))

    const presence = itemPresenceKey(section.id, item, itemIndex)
    const bodySlot = slotForEdgeElement(id, section.kind)
    if (bodySlot) {
      scrollToAdded(viewerSlotTocId(presence, bodySlot))
      return
    }
    if (id === 'list') {
      scrollToAdded(viewerSlotTocId(presence, 'list'))
      return
    }
    if (id === 'footer' && footerKeyForKind(section.kind)) {
      scrollToAdded(viewerSlotTocId(presence, 'footer'))
    }
  }

  const onItemPatch = (itemIndex: number, patch: Record<string, unknown>) => {
    const result = patchItemMaybeResortByDate(doc, section.id, itemIndex, patch)
    onChange(result.doc)
    if (!result.reordered || !result.itemKey) return

    const scrollId = `vv-item-${result.itemKey}`
    const movedKey = result.itemKey
    setDateMovedKey(movedKey)
    window.setTimeout(() => {
      setDateMovedKey((current) => (current === movedKey ? null : current))
    }, 480)

    const active = document.activeElement
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToAnchorTarget(scrollId, scrollRootRef?.current ?? null, 28)
        if (
          active instanceof HTMLElement &&
          document.contains(active) &&
          typeof active.focus === 'function'
        ) {
          active.focus({ preventScroll: true })
        }
      })
    })
  }

  return (
    <div
      id={viewerSectionTocId(section.id)}
      data-doc-toc={viewerSectionTocId(section.id)}
      className={[
        'theme-vurify-viewer__section',
        'theme-vurify-viewer__motion',
        motionClassName,
        collapsed ? 'is-collapsed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-vurify-viewer__section-head">
        <BlockChrome
          editable={editable}
          target={{ scope: 'section', sectionId: section.id, kind: section.kind }}
          onSelect={onSectionEdge}
        >
          <div className="theme-vurify-viewer__section-title-row">
            <IconButton
              icon={collapsed ? ChevronRight : ChevronDown}
              size="xs"
              variant="ghost"
              aria-label={collapsed ? 'Expand section' : 'Collapse section'}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((v) => !v)}
              className="theme-vurify-viewer__section-collapse"
            />
            <DocField id={`section.${section.id}.title`} role="section">
              <ViewerEditable
                value={section.title}
                onChange={(title) => onChange(patchSection(doc, section.id, { title }))}
                placeholder="Section title"
                allowEmpty
                disabled={!editable}
              />
            </DocField>
          </div>
        </BlockChrome>
        <ViewerRule className="theme-vurify-viewer__rule--accent" />
      </div>

      <ViewerMotion show={!collapsed} className="theme-vurify-viewer__section-body">
        <div className="theme-vurify-viewer__items">
          {itemRows.map((row, rowIndex) => {
            const liveIndex = liveIndexByKey.get(row.key) ?? -1
            const liveItem =
              liveIndex >= 0 ? (section.items[liveIndex] ?? row.item) : row.item
            const itemIndex = liveIndex >= 0 ? liveIndex : 0
            const itemTocId = viewerItemTocId(section.id, liveItem, itemIndex)
            return (
              <div
                key={row.key}
                id={itemTocId}
                data-doc-toc={itemTocId}
                className={[
                  'theme-vurify-viewer__item-slot',
                  'theme-vurify-viewer__motion',
                  presenceClassName(row.phase),
                  dateMovedKey === row.key ? 'is-date-moved' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {rowIndex > 0 ? (
                  <ViewerRule className="theme-vurify-viewer__rule--soft" />
                ) : null}
                <div className="theme-vurify-viewer__item">
                  <BlockChrome
                    editable={editable && row.phase !== 'leaving'}
                    target={{
                      scope: 'item',
                      sectionId: section.id,
                      itemIndex,
                      kind: section.kind,
                    }}
                    item={liveItem}
                    onSelect={
                      row.phase === 'leaving'
                        ? () => undefined
                        : (edgeId) => onItemEdge(itemIndex, edgeId)
                    }
                  >
                    <ItemLayout
                      kind={section.kind}
                      item={liveItem}
                      editable={editable && row.phase !== 'leaving'}
                      onPatch={
                        row.phase === 'leaving'
                          ? () => undefined
                          : (patch) => onItemPatch(itemIndex, patch)
                      }
                      fieldPrefix={`${section.id}.${row.key}`}
                      itemPresenceKey={row.key}
                    />
                  </BlockChrome>
                </div>
              </div>
            )
          })}
          {section.items.length === 0 && editable ? (
            <p className="type-caption type-muted mb-0">
              No entries yet — use the section + menu.
            </p>
          ) : null}
        </div>
      </ViewerMotion>
    </div>
  )
}

export function SectionsList({
  doc,
  editable = true,
  onChange,
  scrollRootRef,
  expandRequest = null,
  streaming = false,
}: SectionsListProps) {
  const sections = [...doc.sections].sort((a, b) => a.sort_order - b.sort_order)
  const sectionRows = usePresenceItems(sections, (section) => section.id, undefined, {
    instant: streaming,
  })

  return (
    <div className="theme-vurify-viewer__sections">
      {sectionRows.map((row) => {
        const liveSection =
          doc.sections.find((section) => section.id === row.key) ?? row.item
        return (
          <ViewerSection
            key={row.key}
            section={liveSection}
            doc={doc}
            editable={editable && row.phase !== 'leaving'}
            onChange={onChange}
            scrollRootRef={scrollRootRef}
            expandRequest={expandRequest}
            motionClassName={presenceClassName(row.phase)}
            streaming={streaming}
          />
        )
      })}
    </div>
  )
}
