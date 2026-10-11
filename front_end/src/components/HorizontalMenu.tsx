import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type TransitionEvent } from 'react'
import {
  flattenSectionLinks,
  horizontalMenuBarScrollConfig,
  horizontalMenuButtonSize,
  horizontalMenuSizeClass,
  type HorizontalMenuBarVariant,
  type HorizontalMenuItem,
  type HorizontalMenuLink,
  type HorizontalMenuLinkColumn,
  type HorizontalMenuSection,
  type HorizontalMenuSize,
  sectionSubLinkIds,
} from '../lib/menus/horizontalMenu'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import type { ButtonSize } from '../lib/ui/buttonStyles'
import type { TypeAnimPreset, TypeAnimTrigger } from '../lib/animations/typeAnimPresets'
import type { ScrollRailType } from '../lib/scroll/scrollRail'
import { DEFAULT_SCROLL_RAIL } from '../lib/scroll/scrollRail'
import { Button } from './Button'
import { ThemeScroll } from './ThemeScroll'
import { TypeAnimText } from './TypeAnimText'

type HorizontalMenuProps = {
  items: readonly HorizontalMenuItem[]
  /** Active top-level link id or open section id */
  activeId?: string
  /** Active sub-link id when a section is open */
  activeSubId?: string
  onLinkSelect?: (linkId: string) => void
  onSectionToggle?: (sectionId: string | null) => void
  /** Nav landmark label */
  label?: string
  size?: HorizontalMenuSize
  /** `wrap` (default) — centered flex wrap · `scroll` — horizontal scroll bar rail */
  barVariant?: HorizontalMenuBarVariant
  /** Bar scroll rail when `barVariant="scroll"` — `curved` (default) · `straight` · `hidden` */
  barScrollRail?: ScrollRailType
  /** Soft edge fade on bar scroll when overflowing — default `true` */
  barScrollClouds?: boolean
  /** Multiplier on menu tokens + in-menu buttons — default `1` */
  menuScale?: MenuScale
  /** Bar label motion — [Button](Button.tsx) `labelAnim`; default `flip` */
  labelAnim?: TypeAnimPreset
  labelAnimTrigger?: TypeAnimTrigger
  className?: string
  debug?: boolean
}

function isSection(item: HorizontalMenuItem): item is { type: 'section' } & HorizontalMenuSection {
  return item.type === 'section'
}

function HorizontalMenuSublink({
  link,
  isActive,
  isOverview,
  buttonSize,
  onSelect,
}: {
  link: HorizontalMenuLink
  isActive: boolean
  isOverview: boolean
  buttonSize: ButtonSize
  onSelect: () => void
}) {
  const Icon = link.icon

  return (
    <Button
      type="button"
      size={buttonSize}
      variant={isActive ? 'accent' : 'default'}
      icon={Icon}
      disabled={link.disabled}
      className={[
        'theme-hmenu__sublink',
        isOverview ? 'theme-hmenu__sublink--overview' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onSelect}
    >
      <span className="theme-hmenu__sublink-stack">
        <span className="theme-hmenu__sublink-label">{link.label}</span>
        {link.description ? (
          <span className="theme-hmenu__sublink-desc type-caption type-muted">{link.description}</span>
        ) : null}
      </span>
    </Button>
  )
}

function HorizontalMenuStackSublink({
  link,
  isActive,
  buttonSize,
  labelAnim,
  labelAnimTrigger,
  onSelect,
}: {
  link: HorizontalMenuLink
  isActive: boolean
  buttonSize: ButtonSize
  labelAnim?: TypeAnimPreset | false
  labelAnimTrigger?: TypeAnimTrigger
  onSelect: () => void
}) {
  return (
    <Button
      type="button"
      size={buttonSize}
      variant="stack"
      active={isActive}
      icon={link.icon}
      labelAnim={labelAnim}
      labelAnimTrigger={labelAnimTrigger}
      disabled={link.disabled}
      className="theme-hmenu__stack-sublink"
      onClick={onSelect}
    >
      {link.label}
    </Button>
  )
}

function horizontalMenuSubcardClass(variant?: HorizontalMenuSection['subPanelVariant']): string {
  if (variant === 'links') return 'theme-hmenu__subcard--links'
  if (variant === 'stacked') return 'theme-hmenu__subcard--stacked'
  return 'theme-hmenu__subcard--cards'
}

function HorizontalMenuTextSublink({
  link,
  isActive,
  onSelect,
}: {
  link: HorizontalMenuLink
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      disabled={link.disabled}
      className={['theme-hmenu__textlink', isActive ? 'is-active' : ''].filter(Boolean).join(' ')}
      aria-current={isActive ? 'page' : undefined}
      onClick={onSelect}
    >
      <TypeAnimText
        anim="flip"
        trigger="hover"
        className={[
          'type-label type-link theme-hmenu__textlink-label',
          isActive ? 'is-active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {link.label}
      </TypeAnimText>
    </button>
  )
}

function HorizontalMenuLinkColumnBlock({
  column,
  columnHeadingId,
  activeSubId,
  onLinkSelect,
}: {
  column: HorizontalMenuLinkColumn
  columnHeadingId: string
  activeSubId?: string
  onLinkSelect?: (linkId: string) => void
}) {
  const Icon = column.icon

  return (
    <section
      className="theme-card theme-card--shape-rect theme-card--flat theme-hmenu__link-column"
      aria-labelledby={columnHeadingId}
    >
      <div id={columnHeadingId} className="theme-hmenu__link-column-head">
        {Icon ? <Icon aria-hidden className="theme-hmenu__link-column-icon" strokeWidth={2} /> : null}
        <span className="theme-hmenu__link-column-title type-overline type-accent">{column.label}</span>
      </div>
      <ul className="theme-hmenu__link-column-list">
        {column.links.map((link) => (
          <li key={link.id} className="theme-hmenu__link-column-item">
            <HorizontalMenuTextSublink
              link={link}
              isActive={activeSubId === link.id}
              onSelect={() => onLinkSelect?.(link.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function HorizontalMenu({
  items,
  activeId,
  activeSubId,
  onLinkSelect,
  onSectionToggle,
  label = 'Primary',
  size = 'md',
  barVariant = 'wrap',
  barScrollRail = DEFAULT_SCROLL_RAIL,
  barScrollClouds = true,
  menuScale = 1,
  labelAnim = 'flip',
  labelAnimTrigger = 'hover',
  className = '',
  debug = false,
}: HorizontalMenuProps) {
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const [panelSectionId, setPanelSectionId] = useState<string | null>(null)
  const openSectionIdRef = useRef<string | null>(null)
  const rootRef = useRef<HTMLElement>(null)
  const navId = useId().replace(/:/g, '')

  openSectionIdRef.current = openSectionId

  const panelSection = items.find(
    (item): item is { type: 'section' } & HorizontalMenuSection =>
      isSection(item) && item.id === panelSectionId,
  )

  const openSectionPanel = useCallback(
    (sectionId: string) => {
      onSectionToggle?.(sectionId)
      if (openSectionIdRef.current === sectionId && panelSectionId === sectionId) return

      if (openSectionIdRef.current === null) {
        setPanelSectionId(sectionId)
        requestAnimationFrame(() => setOpenSectionId(sectionId))
        return
      }

      setPanelSectionId(sectionId)
      setOpenSectionId(sectionId)
    },
    [onSectionToggle, panelSectionId],
  )

  const closeSection = useCallback(() => {
    if (!openSectionIdRef.current && !panelSectionId) return
    setOpenSectionId(null)
    onSectionToggle?.(null)
  }, [onSectionToggle, panelSectionId])

  const toggleSection = useCallback(
    (sectionId: string) => {
      if (openSectionIdRef.current === sectionId) {
        closeSection()
        return
      }
      openSectionPanel(sectionId)
    },
    [closeSection, openSectionPanel],
  )

  const handleSubpanelTransitionEnd = useCallback((event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'grid-template-rows') return
    if (openSectionIdRef.current !== null) return
    setPanelSectionId(null)
  }, [])

  useEffect(() => {
    if (!openSectionId) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeSection()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSection()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [closeSection, openSectionId])

  if (debug) {
    console.debug('[HorizontalMenu]', {
      openSectionId,
      activeId,
      activeSubId,
      menuScale: resolveMenuScale(menuScale),
      barVariant,
      count: items.length,
    })
  }

  const buttonSize = horizontalMenuButtonSize[size]
  const stackedSubSize: ButtonSize = size === 'lg' ? 'md' : size === 'md' ? 'sm' : 'xs'
  const sectionPanelId = (sectionId: string) => `${navId}-sub-${sectionId}`
  const barScroll = barVariant === 'scroll'

  const barList = (
    <ul className={['theme-hmenu__list', barScroll ? 'theme-hmenu__list--scroll' : ''].filter(Boolean).join(' ')}>
      {items.map((item) => {
        const isOpenSection = isSection(item) && openSectionId === item.id
        const isActiveLink = item.type === 'link' && activeId === item.id
        const isActiveSection =
          isSection(item) &&
          (activeId === item.id ||
            isOpenSection ||
            Boolean(activeSubId && sectionSubLinkIds(item).includes(activeSubId)))

        return (
          <li key={item.id} className="theme-hmenu__item">
            {item.type === 'link' ? (
              <Button
                type="button"
                size={buttonSize}
                variant={isActiveLink ? 'action' : 'inset'}
                icon={item.icon}
                labelAnim={labelAnim}
                labelAnimTrigger={labelAnimTrigger}
                className="theme-hmenu__trigger"
                onClick={() => {
                  closeSection()
                  onLinkSelect?.(item.id)
                }}
              >
                {item.label}
              </Button>
            ) : (
              <Button
                type="button"
                size={buttonSize}
                variant={isActiveSection ? 'action' : 'inset'}
                icon={item.icon}
                animatedLabel={item.label}
                labelAnim={labelAnim}
                labelAnimTrigger={labelAnimTrigger}
                className={[
                  'theme-hmenu__trigger',
                  'theme-hmenu__trigger--section',
                  isOpenSection ? 'theme-hmenu__trigger--open' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-expanded={isOpenSection}
                aria-controls={sectionPanelId(item.id)}
                onClick={() => toggleSection(item.id)}
              >
                <ChevronDown aria-hidden className="theme-hmenu__chevron" strokeWidth={2} />
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )

  return (
    <nav
      ref={rootRef}
      id={navId}
      aria-label={label}
      className={[
        'theme-hmenu',
        horizontalMenuSizeClass[size],
        menuScaleClass(menuScale),
        barScroll ? 'theme-hmenu--bar-scroll' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={['theme-hmenu__bar', barScroll ? 'theme-hmenu__bar--scroll' : ''].filter(Boolean).join(' ')}>
        {barScroll ? (
          <ThemeScroll
            axis="horizontal"
            className="theme-hmenu__bar-scroll"
            contentClassName="theme-hmenu__bar-scroll-content"
            config={horizontalMenuBarScrollConfig[size]}
            rail={barScrollRail}
            scrollClouds={barScrollClouds}
            tabIndex={0}
          >
            <span className="theme-hmenu__bar-scroll-pad" aria-hidden />
            {barList}
            <span className="theme-hmenu__bar-scroll-pad" aria-hidden />
          </ThemeScroll>
        ) : (
          barList
        )}
      </div>

      {panelSection ? (
        <div
          className={['theme-hmenu__subpanel', openSectionId ? 'theme-hmenu__subpanel--open' : '']
            .filter(Boolean)
            .join(' ')}
          aria-hidden={!openSectionId}
          onTransitionEnd={handleSubpanelTransitionEnd}
        >
          <div className="theme-hmenu__subpanel-inner">
            <div
              id={sectionPanelId(panelSection.id)}
              role="region"
              aria-label={`${panelSection.label} links`}
              className={['theme-hmenu__subcard', horizontalMenuSubcardClass(panelSection.subPanelVariant)]
                .filter(Boolean)
                .join(' ')}
            >
              {panelSection.subPanelVariant === 'links' && panelSection.linkColumns?.length ? (
                <div className="theme-hmenu__link-columns">
                  {panelSection.linkColumns.map((column) => (
                    <HorizontalMenuLinkColumnBlock
                      key={column.id}
                      column={column}
                      columnHeadingId={`${sectionPanelId(panelSection.id)}-col-${column.id}`}
                      activeSubId={activeSubId}
                      onLinkSelect={onLinkSelect}
                    />
                  ))}
                </div>
              ) : (
                <ul
                  className={[
                    'theme-hmenu__sublist',
                    panelSection.subPanelVariant === 'stacked' ? 'theme-hmenu__sublist--stacked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {flattenSectionLinks(panelSection).map((link) => (
                    <li key={link.id} className="theme-hmenu__subitem">
                      {panelSection.subPanelVariant === 'stacked' ? (
                        <HorizontalMenuStackSublink
                          link={link}
                          isActive={activeSubId === link.id}
                          buttonSize={stackedSubSize}
                          labelAnim={labelAnim}
                          labelAnimTrigger={labelAnimTrigger}
                          onSelect={() => {
                            onLinkSelect?.(link.id)
                          }}
                        />
                      ) : (
                        <HorizontalMenuSublink
                          link={link}
                          isActive={activeSubId === link.id}
                          isOverview={panelSection.overview?.id === link.id}
                          buttonSize={buttonSize}
                          onSelect={() => {
                            onLinkSelect?.(link.id)
                          }}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  )
}

export type {
  HorizontalMenuBarVariant,
  HorizontalMenuItem,
  HorizontalMenuLink,
  HorizontalMenuLinkColumn,
  HorizontalMenuSection,
}
