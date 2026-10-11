import { ChevronDown, Menu, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type RefObject, type TransitionEvent } from 'react'
import {
  flattenSectionLinks,
  HAMBURGER_MENU_PANEL_DURATION_MS,
  hamburgerMenuPanelExpansionClass,
  hamburgerMenuPanelSize,
  hamburgerMenuPanelSizeClass,
  hamburgerMenuSizeClass,
  hamburgerMenuTriggerSize,
  sectionSubLinkIds,
  type HamburgerMenuItem,
  type HamburgerMenuLink,
  type HamburgerMenuLinkColumn,
  type HamburgerMenuPanelExpansion,
  type HamburgerMenuSection,
  type HamburgerMenuSize,
} from '../lib/menus/hamburgerMenu'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import { menuScrollConfig } from '../lib/menus/menuControls'
import { DEFAULT_SCROLL_RAIL, type ScrollRailType } from '../lib/scroll/scrollRail'
import type { TypeAnimPreset } from '../lib/animations/typeAnimPresets'
import { Button } from './Button'
import { ThemeScroll } from './ThemeScroll'
import { TypeAnimText } from './TypeAnimText'

type HamburgerMenuProps = {
  items: readonly HamburgerMenuItem[]
  activeId?: string
  activeSubId?: string
  onLinkSelect?: (linkId: string) => void
  onOpenChange?: (open: boolean) => void
  /** Chrome label beside the toggle */
  brandLabel?: string
  label?: string
  size?: HamburgerMenuSize
  /** Multiplier on menu tokens + in-menu buttons — default `1` */
  menuScale?: MenuScale
  /** `push` — panel grows in document flow · `overlay` — fills shell viewport below chrome */
  panelExpansion?: HamburgerMenuPanelExpansion
  /** Overlay demos — close when pointer hits inside this shell but outside the nav (e.g. page body) */
  shellRef?: RefObject<HTMLElement | null>
  /** Plain link hover — default `flip` (`.type-link` underline) */
  labelAnim?: TypeAnimPreset
  /** Panel list scroll rail — `curved` (default) · `straight` · `hidden` */
  scrollRail?: ScrollRailType
  /** Soft edge fade when list overflows — default `true` */
  scrollClouds?: boolean
  className?: string
  debug?: boolean
}

function HamburgerMenuTextLink({
  link,
  isActive,
  labelAnim,
  onSelect,
}: {
  link: HamburgerMenuLink
  isActive: boolean
  labelAnim: TypeAnimPreset
  onSelect: () => void
}) {
  const Icon = link.icon

  return (
    <button
      type="button"
      disabled={link.disabled}
      className={['theme-bmenu__link', isActive ? 'is-active' : ''].filter(Boolean).join(' ')}
      aria-current={isActive ? 'page' : undefined}
      onClick={onSelect}
    >
      <span className="theme-bmenu__link-row">
        {Icon ? <Icon aria-hidden className="theme-bmenu__link-icon" strokeWidth={2} /> : null}
        <TypeAnimText
          anim={labelAnim}
          trigger="hover"
          className={[
            'type-label type-link theme-bmenu__link-label',
            isActive ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {link.label}
        </TypeAnimText>
      </span>
    </button>
  )
}

function HamburgerMenuColumnGroup({
  column,
  activeSubId,
  labelAnim,
  onLinkSelect,
}: {
  column: HamburgerMenuLinkColumn
  activeSubId?: string
  labelAnim: TypeAnimPreset
  onLinkSelect?: (linkId: string) => void
}) {
  const Icon = column.icon

  return (
    <li className="theme-bmenu__group">
      <div className="theme-bmenu__group-head">
        {Icon ? <Icon aria-hidden className="theme-bmenu__group-icon" strokeWidth={2} /> : null}
        <span className="theme-bmenu__group-title type-overline type-accent">{column.label}</span>
      </div>
      <ul className="theme-bmenu__group-list">
        {column.links.map((link) => (
          <li key={link.id}>
            <HamburgerMenuTextLink
              link={link}
              isActive={activeSubId === link.id}
              labelAnim={labelAnim}
              onSelect={() => onLinkSelect?.(link.id)}
            />
          </li>
        ))}
      </ul>
    </li>
  )
}

function HamburgerMenuSectionBlock({
  section,
  sectionSubId,
  isExpanded,
  isActiveSection,
  activeSubId,
  labelAnim,
  onToggle,
  onLinkSelect,
}: {
  section: { type: 'section' } & HamburgerMenuSection
  sectionSubId: string
  isExpanded: boolean
  isActiveSection: boolean
  activeSubId?: string
  labelAnim: TypeAnimPreset
  onToggle: () => void
  onLinkSelect: (linkId: string) => void
}) {
  const SectionIcon = section.icon

  return (
    <li className="theme-bmenu__item theme-bmenu__item--section">
      <button
        type="button"
        className={[
          'theme-bmenu__section-link',
          isExpanded ? 'theme-bmenu__section-link--open' : '',
          isActiveSection ? 'is-active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={isExpanded}
        aria-controls={sectionSubId}
        onClick={onToggle}
      >
        <span className="theme-bmenu__link-row">
          {SectionIcon ? (
            <SectionIcon aria-hidden className="theme-bmenu__link-icon" strokeWidth={2} />
          ) : null}
          <TypeAnimText
            anim={labelAnim}
            trigger="hover"
            className={[
              'type-label type-link theme-bmenu__link-label',
              isActiveSection ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {section.label}
          </TypeAnimText>
        </span>
        <ChevronDown aria-hidden className="theme-bmenu__section-chevron" strokeWidth={2} />
      </button>

      <div
        id={sectionSubId}
        className={['theme-bmenu__subpanel', isExpanded ? 'theme-bmenu__subpanel--open' : '']
          .filter(Boolean)
          .join(' ')}
        aria-hidden={!isExpanded}
      >
        <div className="theme-bmenu__subpanel-inner">
          {section.subPanelVariant === 'links' && section.linkColumns?.length ? (
            <ul className="theme-bmenu__groups">
              {section.linkColumns.map((column, index) => (
                <li key={column.id}>
                  {index > 0 ? <hr className="theme-divider theme-divider--strong" /> : null}
                  <HamburgerMenuColumnGroup
                    column={column}
                    activeSubId={activeSubId}
                    labelAnim={labelAnim}
                    onLinkSelect={onLinkSelect}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="theme-bmenu__sublist">
              {flattenSectionLinks(section).map((link) => (
                <li key={link.id}>
                  <HamburgerMenuTextLink
                    link={link}
                    isActive={activeSubId === link.id}
                    labelAnim={labelAnim}
                    onSelect={() => onLinkSelect(link.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}

export function HamburgerMenu({
  items,
  activeId,
  activeSubId,
  onLinkSelect,
  onOpenChange,
  brandLabel,
  label = 'Site',
  size = 'md',
  menuScale = 1,
  panelExpansion = 'push',
  shellRef,
  labelAnim = 'flip',
  scrollRail = DEFAULT_SCROLL_RAIL,
  scrollClouds = true,
  className = '',
  debug = false,
}: HamburgerMenuProps) {
  const [open, setOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)
  const expandedSectionIdRef = useRef<string | null>(null)
  const closeResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelFrameRef = useRef<number | null>(null)
  const panelOpenRef = useRef(false)
  const rootRef = useRef<HTMLElement>(null)
  const navId = useId().replace(/:/g, '')
  const panelId = `${navId}-panel`

  expandedSectionIdRef.current = expandedSectionId
  panelOpenRef.current = panelOpen

  const panelSize = hamburgerMenuPanelSize(size)
  const triggerSize = hamburgerMenuTriggerSize[size]

  const sectionSubPanelId = (sectionId: string) => `${navId}-sub-${sectionId}`

  const clearCloseResetTimer = useCallback(() => {
    if (closeResetTimerRef.current) {
      clearTimeout(closeResetTimerRef.current)
      closeResetTimerRef.current = null
    }
  }, [])

  const cancelPanelFrame = useCallback(() => {
    if (panelFrameRef.current !== null) {
      cancelAnimationFrame(panelFrameRef.current)
      panelFrameRef.current = null
    }
  }, [])

  const resetExpandedSections = useCallback(() => {
    setExpandedSectionId(null)
  }, [])

  const schedulePushSectionReset = useCallback(() => {
    clearCloseResetTimer()
    closeResetTimerRef.current = setTimeout(() => {
      resetExpandedSections()
      closeResetTimerRef.current = null
    }, HAMBURGER_MENU_PANEL_DURATION_MS)
  }, [clearCloseResetTimer, resetExpandedSections])

  const closeMenu = useCallback(() => {
    cancelPanelFrame()
    setOpen(false)
    onOpenChange?.(false)

    if (panelExpansion === 'overlay') {
      panelFrameRef.current = requestAnimationFrame(() => {
        panelFrameRef.current = requestAnimationFrame(() => {
          panelFrameRef.current = null
          setPanelOpen(false)
        })
      })
      return
    }

    setPanelOpen(false)
    schedulePushSectionReset()
  }, [cancelPanelFrame, onOpenChange, panelExpansion, schedulePushSectionReset])

  const openMenu = useCallback(() => {
    cancelPanelFrame()
    clearCloseResetTimer()

    if (panelExpansion === 'overlay') {
      setPanelOpen(true)
      panelFrameRef.current = requestAnimationFrame(() => {
        panelFrameRef.current = null
        setOpen(true)
        onOpenChange?.(true)
      })
      return
    }

    setOpen(true)
    setPanelOpen(true)
    onOpenChange?.(true)
  }, [cancelPanelFrame, clearCloseResetTimer, onOpenChange, panelExpansion])

  const handleOverlayPanelTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (panelExpansion !== 'overlay') return
      if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
      if (panelOpenRef.current) return
      resetExpandedSections()
    },
    [panelExpansion, resetExpandedSections],
  )

  const toggleMenu = useCallback(() => {
    if (open) {
      closeMenu()
      return
    }
    openMenu()
  }, [closeMenu, open, openMenu])

  const toggleSection = useCallback((sectionId: string) => {
    if (expandedSectionIdRef.current === sectionId) {
      setExpandedSectionId(null)
      return
    }
    setExpandedSectionId(sectionId)
  }, [])

  const pickLink = useCallback(
    (linkId: string) => {
      onLinkSelect?.(linkId)
      closeMenu()
    },
    [closeMenu, onLinkSelect],
  )

  useEffect(
    () => () => {
      clearCloseResetTimer()
      cancelPanelFrame()
    },
    [cancelPanelFrame, clearCloseResetTimer],
  )

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return

      if (shellRef?.current) {
        if (!shellRef.current.contains(target)) {
          closeMenu()
          return
        }
        if (panelExpansion === 'overlay') {
          closeMenu()
        }
        return
      }

      closeMenu()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (expandedSectionId) {
          setExpandedSectionId(null)
          return
        }
        closeMenu()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [closeMenu, expandedSectionId, open, panelExpansion, shellRef])

  if (debug) {
    console.debug('[HamburgerMenu]', {
      open,
      panelOpen,
      panelExpansion,
      menuScale: resolveMenuScale(menuScale),
      expandedSectionId,
      activeId,
      activeSubId,
      count: items.length,
    })
  }

  return (
    <nav
      ref={rootRef}
      id={navId}
      aria-label={label}
      className={[
        'theme-bmenu',
        hamburgerMenuSizeClass[size],
        hamburgerMenuPanelSizeClass[panelSize],
        hamburgerMenuPanelExpansionClass[panelExpansion],
        menuScaleClass(menuScale),
        panelOpen ? 'theme-bmenu--open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-bmenu__chrome theme-hmenu__bar">
        {brandLabel ? <span className="theme-bmenu__brand type-label">{brandLabel}</span> : null}
        <Button
          type="button"
          size={triggerSize}
          variant={open ? 'action' : 'inset'}
          icon={open ? X : Menu}
          aria-expanded={open}
          aria-controls={panelId}
          className="theme-hmenu__trigger theme-bmenu__toggle"
          onClick={toggleMenu}
        >
          {open ? 'Close' : 'Menu'}
        </Button>
      </div>

      <div
        id={panelId}
        className={['theme-bmenu__panel', panelOpen ? 'theme-bmenu__panel--open' : ''].filter(Boolean).join(' ')}
        aria-hidden={!panelOpen}
      >
        <div
          className="theme-bmenu__panel-inner"
          onTransitionEnd={handleOverlayPanelTransitionEnd}
        >
          <ThemeScroll
            className="theme-bmenu__scroll"
            config={menuScrollConfig[panelSize]}
            rail={scrollRail}
            scrollClouds={scrollClouds}
            tabIndex={-1}
          >
            <ul className="theme-bmenu__list">
              {items.map((item) => {
                if (item.type === 'link') {
                  return (
                    <li key={item.id} className="theme-bmenu__item">
                      <HamburgerMenuTextLink
                        link={item}
                        isActive={activeId === item.id && !activeSubId}
                        labelAnim={labelAnim}
                        onSelect={() => pickLink(item.id)}
                      />
                    </li>
                  )
                }

                const isExpanded = expandedSectionId === item.id
                const isActiveSection =
                  activeId === item.id ||
                  Boolean(activeSubId && sectionSubLinkIds(item).includes(activeSubId))

                return (
                  <HamburgerMenuSectionBlock
                    key={item.id}
                    section={item}
                    sectionSubId={sectionSubPanelId(item.id)}
                    isExpanded={isExpanded}
                    isActiveSection={isActiveSection}
                    activeSubId={activeSubId}
                    labelAnim={labelAnim}
                    onToggle={() => toggleSection(item.id)}
                    onLinkSelect={pickLink}
                  />
                )
              })}
            </ul>
          </ThemeScroll>
        </div>
      </div>
    </nav>
  )
}

export type {
  HamburgerMenuItem,
  HamburgerMenuLink,
  HamburgerMenuLinkColumn,
  HamburgerMenuPanelExpansion,
  HamburgerMenuSection,
}
