import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Redo2, Undo2 } from 'lucide-react'
import type { CvExtractV2 } from '../lib/cvApi'
import { scrollToAnchorTarget } from '../lib/menus/anchorScroll'
import { DocArticleShell } from './docArticleParts/DocArticleShell'
import { IconButton } from './IconButton'
import { NanoAnchorMenu } from './NanoAnchorMenu'
import { Tooltip } from './Tooltip'
import { BasicsBlock } from './vurifyViewerParts/BasicsBlock'
import { SectionAddBar } from './vurifyViewerParts/SectionAddBar'
import {
  SectionsList,
  type SectionExpandRequest,
} from './vurifyViewerParts/SectionsList'
import { ViewerFormatProvider } from './vurifyViewerParts/formatContext'
import { ViewerFormatToolbar } from './vurifyViewerParts/ViewerFormatToolbar'
import {
  addSection,
  itemPresenceKey,
  reorderItemsByKeys,
  reorderSections,
} from './vurifyViewerParts/patch'
import type { SectionAddPick } from './vurifyViewerParts/sectionAddMenu'
import {
  useViewerHistory,
  ViewerHistoryProvider,
} from './vurifyViewerParts/viewerHistory'
import { ViewerMotionProvider } from './vurifyViewerParts/ViewerMotion'
import {
  buildViewerTocEntries,
  buildViewerTocSortableItemGroups,
  buildViewerTocSortableSectionIds,
  buildViewerTocSortableSlotGroups,
  itemPresenceKeyFromViewerTocId,
  reorderItemSlotsFromToc,
  sectionIdForViewerTocTarget,
  sectionIdFromViewerTocId,
} from './vurifyViewerParts/viewerToc'

type VurifyViewerProps = {
  value: CvExtractV2
  onChange?: (next: CvExtractV2) => void
  editable?: boolean
  className?: string
  /** Optional label in the document chrome (e.g. review/edit title). */
  chromeTitle?: string
  /**
   * `contained` (default) — stage scrolls inside a max-height shell.
   * `flow` — document grows with the page; pair with `pageScrollRootRef` for TOC / reach-end.
   */
  layout?: 'contained' | 'flow'
  /** Scroll host for flow layout (e.g. ThemeScroll viewport). */
  pageScrollRootRef?: RefObject<HTMLElement | null>
  /**
   * When set, reports whether the document end has been reached
   * (signup review gate). Resets when value identity changes enough to remount sentinel.
   */
  onReachEndChange?: (reached: boolean) => void
  /** Live extract stream — read-only; remount history when this flips false. */
  streaming?: boolean
  /** Remount history provider (e.g. after stream completes). */
  historyKey?: string | number
  /**
   * When true, Contents TOC shows L4 body slots under each entry and allows
   * reordering those elements within the entry (list, text, tech footer, …).
   */
  subsectionToc?: boolean
}

/**
 * Plain editable CV document — click-to-edit fields, in-doc add chrome.
 * Section reorder + date-agnostic entry reorder via micro TOC grips.
 * Date-hierarchy entries auto-sort reverse-chronologically on date edits.
 * Document chrome optional via `chromeTitle`. Undo/redo live in the sticky
 * Contents menu header; undo/redo scrolls to the edit locus.
 * Does not render coverage / missed / meta_extract.
 */
export function VurifyViewer({
  value,
  onChange,
  editable = true,
  className = '',
  chromeTitle,
  layout = 'contained',
  pageScrollRootRef,
  onReachEndChange,
  streaming = false,
  historyKey,
  subsectionToc = false,
}: VurifyViewerProps) {
  const canEdit = Boolean(editable && onChange && !streaming)
  const stageRef = useRef<HTMLDivElement>(null)
  const scrollRootRef = pageScrollRootRef ?? stageRef

  return (
    <ViewerFormatProvider>
      <ViewerHistoryProvider
        key={historyKey ?? 'viewer-history'}
        value={value}
        onChange={canEdit ? onChange : undefined}
        scrollRootRef={scrollRootRef}
      >
        <ViewerMotionProvider>
          <VurifyViewerBody
            value={value}
            canEdit={canEdit}
            className={className}
            stageRef={stageRef}
            scrollRootRef={scrollRootRef}
            chromeTitle={chromeTitle}
            layout={layout}
            onReachEndChange={streaming ? undefined : onReachEndChange}
            streaming={streaming}
            subsectionToc={subsectionToc}
          />
        </ViewerMotionProvider>
      </ViewerHistoryProvider>
    </ViewerFormatProvider>
  )
}

function VurifyViewerBody({
  value,
  canEdit,
  className = '',
  stageRef,
  scrollRootRef,
  chromeTitle,
  layout = 'contained',
  onReachEndChange,
  streaming = false,
  subsectionToc = false,
}: {
  value: CvExtractV2
  canEdit: boolean
  className?: string
  stageRef: RefObject<HTMLDivElement | null>
  scrollRootRef: RefObject<HTMLElement | null>
  chromeTitle?: string
  layout?: 'contained' | 'flow'
  onReachEndChange?: (reached: boolean) => void
  streaming?: boolean
  subsectionToc?: boolean
}) {
  const { commit, undo, redo, canUndo, canRedo } = useViewerHistory()
  const [expandRequest, setExpandRequest] = useState<SectionExpandRequest | null>(null)
  const endSentinelRef = useRef<HTMLDivElement>(null)
  const reachedEndRef = useRef(false)
  const tocEntries = useMemo(
    () => buildViewerTocEntries(value, { subsectionToc }),
    [value, subsectionToc],
  )
  const tocSortableSectionIds = useMemo(
    () => (canEdit ? buildViewerTocSortableSectionIds(value) : undefined),
    [canEdit, value],
  )
  const tocSortableItemGroups = useMemo(() => {
    if (!canEdit) return undefined
    const itemGroups = buildViewerTocSortableItemGroups(value)
    const slotGroups = subsectionToc ? buildViewerTocSortableSlotGroups(value) : []
    const merged = [...itemGroups, ...slotGroups]
    return merged.length > 0 ? merged : undefined
  }, [canEdit, subsectionToc, value])

  const scrollToHistoryAnchor = (anchorId: string | null) => {
    if (!anchorId) return
    const sectionId =
      sectionIdForViewerTocTarget(value, anchorId) ??
      sectionIdFromViewerTocId(anchorId)
    if (sectionId) {
      setExpandRequest({ sectionId, token: Date.now() })
    }
    // Wait for React to paint the restored doc (+ fold open when needed).
    const delay = sectionId ? 220 : 50
    window.setTimeout(() => {
      scrollToAnchorTarget(anchorId, scrollRootRef.current, 12)
    }, delay)
  }

  const onUndo = () => {
    const anchorId = undo()
    scrollToHistoryAnchor(anchorId)
  }

  const onRedo = () => {
    const anchorId = redo()
    scrollToHistoryAnchor(anchorId)
  }

  const historyNavRef = useRef({ onUndo, onRedo, canUndo, canRedo })
  historyNavRef.current = { onUndo, onRedo, canUndo, canRedo }

  const onAddSection = (pick: SectionAddPick) => {
    if (!canEdit) return
    const atIndex = pick.placement === 'before' ? 0 : value.sections.length
    commit(addSection(value, pick.kind, atIndex))
  }

  const onReorderFromToc = (orderedTocIds: string[]) => {
    if (!canEdit || orderedTocIds.length === 0) return

    const first = orderedTocIds[0]!
    if (sectionIdFromViewerTocId(first)) {
      const orderedSectionIds = orderedTocIds
        .map((tocId) => sectionIdFromViewerTocId(tocId))
        .filter((id): id is string => Boolean(id))
      if (orderedSectionIds.length === 0) return
      commit(reorderSections(value, orderedSectionIds))
      return
    }

    if (subsectionToc) {
      const slotted = reorderItemSlotsFromToc(value, orderedTocIds)
      if (slotted) {
        commit(slotted)
        return
      }
    }

    const orderedKeys = orderedTocIds
      .map((tocId) => itemPresenceKeyFromViewerTocId(tocId))
      .filter((key): key is string => Boolean(key))
    if (orderedKeys.length === 0) return

    const section = value.sections.find((row) =>
      row.items.some((item, index) =>
        orderedKeys.includes(itemPresenceKey(row.id, item, index)),
      ),
    )
    if (!section) return
    commit(reorderItemsByKeys(value, section.id, orderedKeys))
  }

  useEffect(() => {
    if (!canEdit) return
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const target = e.target
      if (
        target instanceof HTMLElement &&
        (target.closest('input, textarea, [contenteditable="true"]') ||
          target.isContentEditable)
      ) {
        return
      }
      const nav = historyNavRef.current
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        if (!nav.canUndo) return
        e.preventDefault()
        nav.onUndo()
        return
      }
      if ((key === 'z' && e.shiftKey) || key === 'y') {
        if (!nav.canRedo) return
        e.preventDefault()
        nav.onRedo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canEdit])

  const scrollToTop = () => {
    const root = scrollRootRef.current
    if (root) {
      root.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!onReachEndChange) return
    const root = scrollRootRef.current
    const sentinel = endSentinelRef.current
    if (!sentinel) return

    reachedEndRef.current = false
    onReachEndChange(false)

    const report = (reached: boolean) => {
      if (reachedEndRef.current === reached) return
      reachedEndRef.current = reached
      onReachEndChange(reached)
    }

    const checkContained = () => {
      if (!root) return
      const { scrollTop, clientHeight, scrollHeight } = root
      if (scrollHeight <= clientHeight + 8) {
        report(true)
        return
      }
      report(scrollTop + clientHeight >= scrollHeight - 24)
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) report(true)
      },
      { root: root ?? null, threshold: 0.01, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(sentinel)

    if (root) {
      root.addEventListener('scroll', checkContained, { passive: true })
      checkContained()
    } else {
      // Viewport / flow without an explicit root — rely on IO only.
      const rect = sentinel.getBoundingClientRect()
      report(rect.top < window.innerHeight - 24)
    }

    return () => {
      io.disconnect()
      if (root) root.removeEventListener('scroll', checkContained)
    }
  }, [onReachEndChange, scrollRootRef, layout, value.sections.length, value.basics.display_name])

  const onTocSelect = (id: string) => {
    const sectionId = sectionIdForViewerTocTarget(value, id)
    if (sectionId) {
      setExpandRequest({ sectionId, token: Date.now() })
    }
    const delay = sectionId ? 220 : 0
    window.setTimeout(() => {
      scrollToAnchorTarget(id, scrollRootRef.current, 12)
    }, delay)
  }

  const toc =
    tocEntries.length > 0 ? (
      <NanoAnchorMenu
        entries={tocEntries}
        variant="micro"
        scrollSpy
        scrollRootRef={scrollRootRef}
        sticky={false}
        title={canEdit || streaming ? 'Contents' : undefined}
        titleEnd={
          canEdit ? (
            <div
              className="theme-vurify-viewer__toc-history"
              role="group"
              aria-label="Document history"
            >
              <Tooltip content="Undo" placement="bottom">
                <IconButton
                  icon={Undo2}
                  size="xs"
                  variant="tray"
                  aria-label="Undo"
                  disabled={!canUndo}
                  onClick={onUndo}
                  className="theme-vurify-viewer__edge-btn"
                />
              </Tooltip>
              <Tooltip content="Redo" placement="bottom">
                <IconButton
                  icon={Redo2}
                  size="xs"
                  variant="tray"
                  aria-label="Redo"
                  disabled={!canRedo}
                  onClick={onRedo}
                  className="theme-vurify-viewer__edge-btn"
                />
              </Tooltip>
            </div>
          ) : undefined
        }
        footerLabel={value.basics.display_name?.trim() || 'CV'}
        onBackToTop={scrollToTop}
        onSelect={onTocSelect}
        label="Document contents"
        sortableIds={tocSortableSectionIds}
        sortableNestedGroups={tocSortableItemGroups}
        onReorder={canEdit ? onReorderFromToc : undefined}
      />
    ) : null

  return (
    <article
      className={['theme-vurify-viewer', className].filter(Boolean).join(' ')}
      data-editable={canEdit ? 'true' : 'false'}
      data-layout={layout}
      data-streaming={streaming ? 'true' : undefined}
    >
      {chromeTitle ? (
        <header className="theme-vurify-viewer__chrome">
          <h2 className="theme-vurify-viewer__chrome-title">{chromeTitle}</h2>
        </header>
      ) : null}
      <div
        ref={stageRef}
        className={[
          'theme-vurify-viewer__stage',
          'theme-doc-article__stage--reading',
          layout === 'contained' ? 'theme-doc-article__stage--scroll' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <DocArticleShell stickyToc microToc toc={toc}>
          <div className="theme-vurify-viewer__page">
            <BasicsBlock
              basics={value.basics}
              doc={value}
              editable={canEdit}
              onChange={commit}
            />

            <SectionsList
              doc={value}
              editable={canEdit}
              onChange={commit}
              scrollRootRef={scrollRootRef}
              expandRequest={expandRequest}
              streaming={streaming}
            />

            {canEdit ? (
              <div className="theme-vurify-viewer__footer">
                <SectionAddBar onAdd={onAddSection} />
              </div>
            ) : null}
            {onReachEndChange || streaming ? (
              <div
                ref={endSentinelRef}
                className="theme-vurify-viewer__end-sentinel"
                aria-hidden
              />
            ) : null}
          </div>
        </DocArticleShell>
      </div>
      {canEdit ? <ViewerFormatToolbar /> : null}
    </article>
  )
}
