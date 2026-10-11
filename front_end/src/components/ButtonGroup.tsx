import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { useContentChoiceIndicator } from '../lib/ui/contentChoiceIndicator'
import {
  buttonGroupItemActive,
  buttonGroupItems,
  buttonGroupSelectedIndex,
} from '../lib/ui/buttonGroupSelection'
import {
  buttonGroupOutlineClass,
  buttonGroupVariantClass,
  type ButtonGroupOutline,
  type ButtonGroupVariant,
} from '../lib/ui/buttonGroupStyles'
import { Button } from './Button'
import { IconButton } from './IconButton'

type ButtonGroupProps = {
  children: ReactNode
  variant?: ButtonGroupVariant
  /** Shell border weight — `muted` for sidebar/toolbar trays without brutal shadow. */
  groupOutline?: ButtonGroupOutline
  /** Visible option count for `paged` — chevrons appear when children exceed this. */
  pageSize?: number
  className?: string
  'aria-label'?: string
  debug?: boolean
}

type ButtonGroupRowProps = {
  children: ReactNode
  className?: string
}

type PageSlideDirection = 'prev' | 'next'

function segmentedTrackStyle(count: number, index: number): CSSProperties {
  return {
    ['--choice-count' as string]: String(count),
    ['--choice-index' as string]: String(index),
  } as CSSProperties
}

/** Apply slot props to Button/IconButton descendants — preserves tooltip/wrapper shells. */
function mapDescendantButtons(
  children: ReactNode,
  mapButton: (child: ReactElement) => ReactElement,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child
    if (child.type === Button || child.type === IconButton) {
      return mapButton(child)
    }
    const props = child.props as { children?: ReactNode }
    if (props.children == null) return child
    const nextChildren = mapDescendantButtons(props.children, mapButton)
    if (nextChildren === props.children) return child
    return cloneElement(child, {}, nextChildren)
  })
}

/** Joined/card/compact — inset slots, plain labels (no TypeAnim / dividers). */
function prepareGroupChildren(children: ReactNode, variant: ButtonGroupVariant): ReactNode {
  if (variant !== 'card' && variant !== 'compact' && variant !== 'joined') {
    return children
  }

  return mapDescendantButtons(children, (child) => {
    const props = child.props as {
      className?: string
      labelAnim?: false
      active?: boolean
      'aria-pressed'?: boolean
      'aria-checked'?: boolean
    }
    const pressed = buttonGroupItemActive(props as Record<string, unknown>)
    const slotVariant = pressed ? ('ghost' as const) : ('inset' as const)
    return cloneElement(
      child as ReactElement<{ className?: string; labelAnim?: false; variant?: string }>,
      {
        labelAnim: false,
        variant: slotVariant,
        className: ['theme-btn-group__slot', props.className].filter(Boolean).join(' '),
      },
    )
  })
}

/** Toggle tray — bordered shell + standalone `tray` buttons (no group child resets). */
function prepareToggleChildren(children: ReactNode): ReactNode {
  return mapDescendantButtons(children, (child) => {
    const props = child.props as { className?: string; labelAnim?: false; variant?: string }
    const variant = props.variant === 'tray-color' ? 'tray-color' : 'tray'
    return cloneElement(
      child as ReactElement<{ className?: string; labelAnim?: false; variant?: string }>,
      {
        labelAnim: false,
        variant,
        className: props.className,
      },
    )
  })
}

/** Segmented/paged slots — plain labels, content-sized segments (no truncate / TypeAnim). */
function prepareSegmentChildren(children: ReactNode, mode: 'segmented' | 'paged'): ReactNode {
  return mapDescendantButtons(children, (child) => {
    const props = child.props as {
      className?: string
      labelAnim?: false
      variant?: string
      active?: boolean
      'aria-pressed'?: boolean
      'aria-checked'?: boolean
    }
    const pressed = buttonGroupItemActive(props as Record<string, unknown>)
    const variant =
      mode === 'segmented' || mode === 'paged'
        ? pressed
          ? ('ghost' as const)
          : ('inset' as const)
        : props.variant
    return cloneElement(
      child as ReactElement<{ className?: string; labelAnim?: false; variant?: string }>,
      {
        labelAnim: false,
        variant,
        className: ['theme-btn-group__segment', props.className].filter(Boolean).join(' '),
      },
    )
  })
}

function SegmentedTrack({
  children,
  count,
  index,
  mode,
  className = '',
}: {
  children: ReactNode
  count: number
  index: number
  mode: 'segmented' | 'paged'
  className?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const contentSized = mode === 'segmented'

  useContentChoiceIndicator(trackRef, index, contentSized)

  return (
    <div
      ref={trackRef}
      className={[
        'theme-btn-group__track',
        contentSized ? 'theme-btn-group__track--content' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={segmentedTrackStyle(count, index)}
    >
      <span className="theme-btn-group__indicator" aria-hidden />
      {prepareSegmentChildren(children, mode)}
    </div>
  )
}

function CompactTrack({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={['theme-btn-group__track', 'theme-btn-group__track--compact', className].filter(Boolean).join(' ')}>
      {prepareGroupChildren(children, 'compact')}
    </div>
  )
}

type ScrollNavState = {
  overflow: boolean
  canPrev: boolean
  canNext: boolean
}

function ScrollButtonGroup({
  children,
  groupClass,
  ariaLabel,
  activeItemIndex,
}: {
  children: ReactNode
  groupClass: string
  ariaLabel?: string
  activeItemIndex: number
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollNav, setScrollNav] = useState<ScrollNavState>({
    overflow: false,
    canPrev: false,
    canNext: false,
  })

  const refreshScrollNav = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const overflow = el.scrollWidth > el.clientWidth + 1
    setScrollNav({
      overflow,
      canPrev: el.scrollLeft > 1,
      canNext: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    })
  }, [])

  useEffect(() => {
    refreshScrollNav()
    const el = scrollRef.current
    if (!el) return

    el.addEventListener('scroll', refreshScrollNav, { passive: true })
    const observer = new ResizeObserver(refreshScrollNav)
    observer.observe(el)
    const track = el.querySelector('.theme-btn-group__track')
    if (track) observer.observe(track)

    return () => {
      el.removeEventListener('scroll', refreshScrollNav)
      observer.disconnect()
    }
  }, [refreshScrollNav, children])

  useEffect(() => {
    if (activeItemIndex < 0) return
    const el = scrollRef.current
    if (!el) return
    const active = el.querySelector('.is-active, [aria-pressed="true"]')
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
    }
  }, [activeItemIndex, children])

  const scrollStep = (direction: 'prev' | 'next') => {
    const el = scrollRef.current
    if (!el) return
    const step = Math.max(72, el.clientWidth * 0.6)
    el.scrollBy({ left: direction === 'prev' ? -step : step, behavior: 'smooth' })
  }

  return (
    <div role="group" aria-label={ariaLabel} className={groupClass}>
      {scrollNav.overflow ? (
        <IconButton
          icon={ChevronLeft}
          aria-label="Scroll sheets left"
          variant="ghost"
          size="sm"
          className="theme-btn-group__nav theme-btn-group__nav--prev"
          disabled={!scrollNav.canPrev}
          onClick={() => scrollStep('prev')}
        />
      ) : null}
      <div className="theme-btn-group__join" role="presentation">
        <div ref={scrollRef} className="theme-btn-group__scroll">
          <CompactTrack>{children}</CompactTrack>
        </div>
      </div>
      {scrollNav.overflow ? (
        <IconButton
          icon={ChevronRight}
          aria-label="Scroll sheets right"
          variant="ghost"
          size="sm"
          className="theme-btn-group__nav theme-btn-group__nav--next"
          disabled={!scrollNav.canNext}
          onClick={() => scrollStep('next')}
        />
      ) : null}
    </div>
  )
}

export function ButtonGroupRow({ children, className = '' }: ButtonGroupRowProps) {
  return (
    <div className={['theme-btn-group-row', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

export function ButtonGroup({
  children,
  variant = 'joined',
  groupOutline = 'default',
  pageSize = 4,
  className = '',
  'aria-label': ariaLabel,
  debug = false,
}: ButtonGroupProps) {
  const items = buttonGroupItems(children)
  const [page, setPage] = useState(0)
  const [slideDir, setSlideDir] = useState<PageSlideDirection>('next')
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const clampedPage = Math.min(page, pageCount - 1)
  const pageNav = variant === 'paged' && items.length > pageSize
  const visible = pageNav
    ? items.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize)
    : items
  const paged = variant === 'paged' && pageNav
  const segmented = variant === 'segmented' || paged
  const choiceCount = segmented ? (paged ? visible.length : items.length) : 0
  const choiceIndex = segmented
    ? buttonGroupSelectedIndex(paged ? visible : items)
    : 0
  const activeItemIndex = items.findIndex((item) =>
    buttonGroupItemActive(item.props as Record<string, unknown>),
  )

  useEffect(() => {
    if (!pageNav || activeItemIndex < 0) return
    const targetPage = Math.floor(activeItemIndex / pageSize)
    setPage((current) => (current === targetPage ? current : targetPage))
  }, [activeItemIndex, pageSize, pageNav])

  const toggleOutline = variant === 'toggle' && groupOutline === 'default' ? 'toolbar' : groupOutline
  const groupClass = [
    'theme-btn-group',
    buttonGroupVariantClass[variant],
    buttonGroupOutlineClass[toggleOutline],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (debug) {
    console.debug('[ButtonGroup]', {
      ariaLabel,
      variant,
      pageSize,
      pageNav,
      paged,
      page: clampedPage,
      choiceIndex,
      choiceCount,
    })
  }

  if (variant === 'scroll') {
    return (
      <ScrollButtonGroup
        groupClass={groupClass}
        ariaLabel={ariaLabel}
        activeItemIndex={activeItemIndex}
      >
        {children}
      </ScrollButtonGroup>
    )
  }

  if (paged) {
    return (
      <div role="group" aria-label={ariaLabel} className={groupClass}>
        <IconButton
          icon={ChevronLeft}
          aria-label="Show previous options"
          variant="ghost"
          size="sm"
          className="theme-btn-group__nav theme-btn-group__nav--prev"
          disabled={clampedPage <= 0}
          onClick={() => {
            setSlideDir('prev')
            setPage((current) => Math.max(0, current - 1))
          }}
        />
        <div className="theme-btn-group__join" role="presentation">
          <div
            key={clampedPage}
            className={['theme-btn-group__window', `theme-btn-group__window--from-${slideDir}`].join(
              ' ',
            )}
          >
            <SegmentedTrack count={choiceCount} index={choiceIndex} mode="paged">
              {visible}
            </SegmentedTrack>
          </div>
        </div>
        <IconButton
          icon={ChevronRight}
          aria-label="Show next options"
          variant="ghost"
          size="sm"
          className="theme-btn-group__nav theme-btn-group__nav--next"
          disabled={clampedPage >= pageCount - 1}
          onClick={() => {
            setSlideDir('next')
            setPage((current) => Math.min(pageCount - 1, current + 1))
          }}
        />
      </div>
    )
  }

  if (variant === 'segmented') {
    return (
      <div role="group" aria-label={ariaLabel} className={groupClass}>
        <SegmentedTrack count={choiceCount} index={choiceIndex} mode="segmented">
          {children}
        </SegmentedTrack>
      </div>
    )
  }

  if (variant === 'toggle') {
    return (
      <div role="group" aria-label={ariaLabel} className={groupClass}>
        <span className="theme-btn-group__toggle-inner">{prepareToggleChildren(children)}</span>
      </div>
    )
  }

  return (
    <div role="group" aria-label={ariaLabel} className={groupClass}>
      {prepareGroupChildren(children, variant)}
    </div>
  )
}
