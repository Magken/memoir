import { useCallback, useEffect, useId, useRef, useState, type TransitionEvent } from 'react'
import {
  flattenSectionLinks,
  miniStackNavMenuButtonSize,
  miniStackNavMenuSizeClass,
  miniStackNavMenuStackedSubSize,
  sectionSubLinkIds,
  type HorizontalMenuItem,
  type HorizontalMenuLink,
  type HorizontalMenuLinkColumn,
  type HorizontalMenuSection,
  type MiniStackNavMenuSize,
} from '../lib/menus/miniStackNavMenu'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import type { ButtonSize } from '../lib/ui/buttonStyles'
import type { TypeAnimPreset, TypeAnimTrigger } from '../lib/animations/typeAnimPresets'
import { Button } from './Button'
import { TypeAnimText } from './TypeAnimText'

type MiniStackNavMenuProps = {
  items: readonly HorizontalMenuItem[]
  activeId?: string
  activeSubId?: string
  onLinkSelect?: (linkId: string) => void
  onSectionToggle?: (sectionId: string | null) => void
  label?: string
  size?: MiniStackNavMenuSize
  menuScale?: MenuScale
  labelAnim?: TypeAnimPreset
  labelAnimTrigger?: TypeAnimTrigger
  className?: string
  debug?: boolean
}

function isSection(item: HorizontalMenuItem): item is { type: 'section' } & HorizontalMenuSection {
  return item.type === 'section'
}

function MiniStackNavMenuSublink({
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

function MiniStackNavMenuStackSublink({
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

function miniStackNavMenuSubcardClass(variant?: HorizontalMenuSection['subPanelVariant']): string {
  if (variant === 'links') return 'theme-msnav__subcard--links'
  if (variant === 'stacked') return 'theme-msnav__subcard--stacked'
  return 'theme-msnav__subcard--cards'
}

function MiniStackNavMenuTextSublink({
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

function MiniStackNavMenuLinkColumnBlock({
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
            <MiniStackNavMenuTextSublink
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

export function MiniStackNavMenu({
  items,
  activeId,
  activeSubId,
  onLinkSelect,
  onSectionToggle,
  label = 'Mini stack nav',
  size = 'md',
  menuScale = 1,
  labelAnim = 'flip',
  labelAnimTrigger = 'hover',
  className = '',
  debug = false,
}: MiniStackNavMenuProps) {
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
    if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return
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
    console.debug('[MiniStackNavMenu]', {
      openSectionId,
      activeId,
      activeSubId,
      menuScale: resolveMenuScale(menuScale),
      size,
      count: items.length,
    })
  }

  const buttonSize = miniStackNavMenuButtonSize[size]
  const stackedSubSize = miniStackNavMenuStackedSubSize[size]
  const sectionPanelId = (sectionId: string) => `${navId}-sub-${sectionId}`

  return (
    <nav
      ref={rootRef}
      id={navId}
      aria-label={label}
      className={[
        'theme-msnav',
        miniStackNavMenuSizeClass[size],
        menuScaleClass(menuScale),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-msnav__shell">
        <div className="theme-msnav__bar">
          <ul className="theme-msnav__list">
            {items.map((item) => {
              const isOpenSection = isSection(item) && openSectionId === item.id
              const isActiveLink = item.type === 'link' && activeId === item.id
              const isActiveSection =
                isSection(item) &&
                (activeId === item.id ||
                  isOpenSection ||
                  Boolean(activeSubId && sectionSubLinkIds(item).includes(activeSubId)))

              return (
                <li key={item.id} className="theme-msnav__item">
                  {item.type === 'link' ? (
                    <Button
                      type="button"
                      size={buttonSize}
                      variant="stack"
                      active={isActiveLink}
                      icon={item.icon}
                      labelAnim={labelAnim}
                      labelAnimTrigger={labelAnimTrigger}
                      className="theme-msnav__trigger"
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
                      variant="stack"
                      active={isActiveSection}
                      icon={item.icon}
                      labelAnim={labelAnim}
                      labelAnimTrigger={labelAnimTrigger}
                      className="theme-msnav__trigger"
                      aria-expanded={isOpenSection}
                      aria-controls={sectionPanelId(item.id)}
                      onClick={() => toggleSection(item.id)}
                    >
                      {item.label}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {panelSection ? (
          <div
            className={['theme-msnav__subpanel', openSectionId ? 'theme-msnav__subpanel--open' : '']
              .filter(Boolean)
              .join(' ')}
            aria-hidden={!openSectionId}
            onTransitionEnd={handleSubpanelTransitionEnd}
          >
            <div className="theme-msnav__subpanel-inner">
              <div
                id={sectionPanelId(panelSection.id)}
                role="region"
                aria-label={`${panelSection.label} links`}
                className={[
                  'theme-msnav__subcard',
                  miniStackNavMenuSubcardClass(panelSection.subPanelVariant),
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {panelSection.subPanelVariant === 'links' && panelSection.linkColumns?.length ? (
                  <div className="theme-hmenu__link-columns">
                    {panelSection.linkColumns.map((column) => (
                      <MiniStackNavMenuLinkColumnBlock
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
                      'theme-msnav__sublist',
                      panelSection.subPanelVariant === 'stacked' ? 'theme-hmenu__sublist--stacked' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {flattenSectionLinks(panelSection).map((link) => (
                      <li key={link.id} className="theme-hmenu__subitem">
                        {panelSection.subPanelVariant === 'stacked' ? (
                          <MiniStackNavMenuStackSublink
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
                          <MiniStackNavMenuSublink
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
      </div>
    </nav>
  )
}

export type {
  HorizontalMenuItem as MiniStackNavMenuItem,
  HorizontalMenuLink as MiniStackNavMenuLink,
  HorizontalMenuLinkColumn as MiniStackNavMenuLinkColumn,
  HorizontalMenuSection as MiniStackNavMenuSection,
  MiniStackNavMenuSize,
}
