import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useGlowStepScrollFocus } from '../hooks/useGlowStepScrollFocus'
import { BORDER_GLOW_ICON_CLASS, ICON_SVG_GLOW_CLASS, TYPE_GLOW_CLASS } from '../lib/animations/borderGlow'
import {
  glowStepDotNavOrientationClass,
  glowStepDotNavSelectedIndex,
  glowStepDotNavSizeClass,
  glowStepDotNavTransitionClass,
  type GlowStepDotNavItem,
  type GlowStepDotNavOrientation,
  type GlowStepDotNavSize,
  type GlowStepDotNavTransition,
} from '../lib/menus/glowStepDotNav'
import { GLOW_STEP_SCROLL_FOCUS_DEFAULT_OFFSET } from '../lib/scroll/glowStepScrollFocus'
import { DEFAULT_SCROLL_RAIL, type ScrollRailType } from '../lib/scroll/scrollRail'
import { menuScaleClass, resolveMenuScale, type MenuScale } from '../lib/menus/menuScale'
import type { TypeAnimPreset, TypeAnimTrigger } from '../lib/animations/typeAnimPresets'
import { Card } from './Card'
import { TypeAnimText } from './TypeAnimText'

type GlowStepDotNavContextValue = {
  navId: string
  selectedId: string
  scrollFocus: boolean
  registerPanel: (id: string, node: HTMLElement | null) => void
}

const GlowStepDotNavContext = createContext<GlowStepDotNavContextValue | null>(null)

function useGlowStepDotNavContext(component: string): GlowStepDotNavContextValue {
  const context = useContext(GlowStepDotNavContext)
  if (!context) {
    throw new Error(`${component} must be used within GlowStepDotNav`)
  }
  return context
}

type GlowStepDotNavProps = {
  items: readonly GlowStepDotNavItem[]
  selectedId?: string
  defaultSelectedId?: string | null
  onSelect?: (id: string) => void
  orientation?: GlowStepDotNavOrientation
  size?: GlowStepDotNavSize
  menuScale?: MenuScale
  /** Master toggle — icon + label glow, marker halo, axis dot bloom, panel aura */
  glow?: boolean
  /** Cardless SVG drop-shadow on active / hover step icons (when `glow`) */
  iconGlow?: boolean
  /** Palette ink glow on selected step labels (when `glow`) */
  textGlow?: boolean
  /** Label motion preset — parent step hover / selection drives `inButton` anim */
  labelAnim?: TypeAnimPreset
  labelAnimTrigger?: TypeAnimTrigger
  /** Step rail / marker / panel motion — `elastic` overshoot · `smooth` · `snappy` · `gentle` */
  stepTransition?: GlowStepDotNavTransition
  /** Content card variant for panels */
  panelVariant?: 'raised' | 'inset' | 'flat' | 'outline'
  /** Scroll-spy mode — sections stack in a Card scroll body; active step follows scroll */
  scrollFocus?: boolean
  /** Scroll-spy focus line offset inside the scroll viewport (px) */
  scrollFocusOffset?: number
  /** Override scroll root (defaults to the Card scroll viewport when `scrollFocus`) */
  scrollContainerRef?: RefObject<HTMLElement | null>
  /** Scroll rail when `scrollFocus` — `curved` · `straight` · `hidden` */
  scrollRail?: ScrollRailType
  /** Edge fade on the scroll body when `scrollFocus` */
  scrollClouds?: boolean
  label?: string
  className?: string
  debug?: boolean
  children?: ReactNode
}

type GlowStepDotNavPanelProps = {
  id: string
  title?: string
  children?: ReactNode
  className?: string
}

function useStepMarker(
  stepperRef: RefObject<HTMLDivElement | null>,
  stepRefs: RefObject<(HTMLButtonElement | null)[]>,
  activeIndex: number,
) {
  const markerRef = useRef<HTMLDivElement>(null)

  const updateMarker = useCallback(() => {
    const stepper = stepperRef.current
    const marker = markerRef.current
    const steps = stepRefs.current
    const step = steps?.[activeIndex]
    if (!stepper || !marker || !step) return

    const stepperRect = stepper.getBoundingClientRect()
    const stepRect = step.getBoundingClientRect()
    const labelEl = step.querySelector<HTMLElement>('.theme-glowstep__label')
    const labelRect = labelEl?.getBoundingClientRect()
    const axisEl = step.querySelector<HTMLElement>('.theme-glowstep__label-axis')
    const axisRect = axisEl?.getBoundingClientRect()

    // Horizontal: sliding bar — width + left offset.
    marker.style.setProperty('--theme-glowstep-marker-width', `${stepRect.width}px`)
    marker.style.setProperty('--theme-glowstep-marker-x', `${stepRect.left - stepperRect.left}px`)

    if (labelRect) {
      marker.style.setProperty('--theme-glowstep-marker-y', `${labelRect.top - stepperRect.top}px`)
    }

    // Vertical: sliding bar — matches the rail segment below the icon (not the whole step),
    // so it never overlaps the icon. Bounds come from the rail element itself.
    if (axisRect) {
      marker.style.setProperty('--theme-glowstep-marker-height', `${axisRect.height}px`)
      marker.style.setProperty('--theme-glowstep-marker-top', `${axisRect.top - stepperRect.top}px`)
      marker.style.setProperty(
        '--theme-glowstep-marker-axis-x',
        `${axisRect.left - stepperRect.left + axisRect.width / 2}px`,
      )
    }
  }, [activeIndex, stepRefs, stepperRef])

  useLayoutEffect(() => {
    updateMarker()
    const stepper = stepperRef.current
    if (!stepper) return undefined

    const observer = new ResizeObserver(updateMarker)
    observer.observe(stepper)
    stepRefs.current.forEach((step) => {
      if (step) observer.observe(step)
    })
    window.addEventListener('resize', updateMarker)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateMarker)
    }
  }, [activeIndex, stepperRef, stepRefs, updateMarker])

  return markerRef
}

export function GlowStepDotNav({
  items,
  selectedId: selectedIdProp,
  defaultSelectedId = null,
  onSelect,
  orientation = 'horizontal',
  size = 'md',
  menuScale = 1,
  glow = true,
  iconGlow = true,
  textGlow = true,
  labelAnim = 'reveal-up',
  labelAnimTrigger = 'hover',
  stepTransition = 'smooth',
  panelVariant = 'raised',
  scrollFocus = false,
  scrollFocusOffset = GLOW_STEP_SCROLL_FOCUS_DEFAULT_OFFSET,
  scrollContainerRef,
  scrollRail = DEFAULT_SCROLL_RAIL,
  scrollClouds = true,
  label = 'Step navigation',
  className = '',
  debug = false,
  children,
}: GlowStepDotNavProps) {
  const navId = useId().replace(/:/g, '')
  const stepperRef = useRef<HTMLDivElement>(null)
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([])
  const panelRefs = useRef<Map<string, HTMLElement>>(new Map())
  const scrollHostRef = useRef<HTMLDivElement>(null)
  const resolvedScrollRootRef = useRef<HTMLElement | null>(null)
  const [panelRegistryVersion, setPanelRegistryVersion] = useState(0)
  const fallbackId =
    defaultSelectedId ?? items.find((item) => !item.disabled)?.id ?? items[0]?.id ?? ''
  const [internalSelectedId, setInternalSelectedId] = useState(fallbackId)
  const selectedId = selectedIdProp ?? internalSelectedId
  const enabledItems = items.filter((item) => !item.disabled)
  const selectedIndex = glowStepDotNavSelectedIndex(items, selectedId)
  const markerRef = useStepMarker(stepperRef, stepRefs, selectedIndex)

  const select = useCallback(
    (id: string) => {
      const item = items.find((entry) => entry.id === id)
      if (!item || item.disabled) return
      if (selectedIdProp === undefined) {
        setInternalSelectedId(id)
      }
      onSelect?.(id)
    },
    [items, onSelect, selectedIdProp],
  )

  const registerPanel = useCallback((id: string, node: HTMLElement | null) => {
    const prev = panelRefs.current.get(id)
    if (node) {
      if (prev === node) return
      panelRefs.current.set(id, node)
    } else {
      if (!prev) return
      panelRefs.current.delete(id)
    }
    setPanelRegistryVersion((version) => version + 1)
  }, [])

  useLayoutEffect(() => {
    if (!scrollFocus) {
      resolvedScrollRootRef.current = scrollContainerRef?.current ?? null
      return
    }

    resolvedScrollRootRef.current =
      scrollHostRef.current?.querySelector<HTMLElement>(
        '.theme-rounded-scroll__viewport, .theme-scroll__viewport',
      ) ??
      scrollContainerRef?.current ??
      null
  }, [scrollContainerRef, scrollFocus, scrollRail, panelRegistryVersion])

  const { scrollToSection } = useGlowStepScrollFocus({
    enabled: scrollFocus,
    items,
    selectedId,
    onActiveId: select,
    panelRefs,
    scrollContainerRef: resolvedScrollRootRef,
    offset: scrollFocusOffset,
    panelRegistryVersion,
  })

  const activateStep = useCallback(
    (id: string) => {
      if (scrollFocus) {
        scrollToSection(id)
        return
      }
      select(id)
    },
    [scrollFocus, scrollToSection, select],
  )

  const onStepKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const id = event.currentTarget.dataset.stepId
        if (id) activateStep(id)
        return
      }

      const currentIndex = enabledItems.findIndex((item) => item.id === selectedId)
      if (currentIndex < 0) return

      const isVertical = orientation === 'vertical'
      let nextIndex: number

      switch (event.key) {
        case 'ArrowRight':
          if (isVertical) return
          nextIndex = (currentIndex + 1) % enabledItems.length
          break
        case 'ArrowLeft':
          if (isVertical) return
          nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length
          break
        case 'ArrowDown':
          if (!isVertical) return
          nextIndex = (currentIndex + 1) % enabledItems.length
          break
        case 'ArrowUp':
          if (!isVertical) return
          nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = enabledItems.length - 1
          break
        default:
          return
      }

      event.preventDefault()
      activateStep(enabledItems[nextIndex].id)
    },
    [activateStep, enabledItems, orientation, selectedId],
  )

  const resolvedIconGlow = glow && iconGlow
  const resolvedTextGlow = glow && textGlow

  if (debug) {
    console.debug('[GlowStepDotNav]', {
      selectedId,
      selectedIndex,
      orientation,
      size,
      menuScale: resolveMenuScale(menuScale),
      glow,
      iconGlow: resolvedIconGlow,
      textGlow: resolvedTextGlow,
      labelAnim,
      stepTransition,
      scrollFocus,
      scrollFocusOffset,
      scrollRail,
      scrollClouds,
      count: items.length,
    })
  }

  const stepListRole = scrollFocus ? undefined : 'tablist'
  const stepRole = scrollFocus ? undefined : 'tab'

  return (
    <GlowStepDotNavContext.Provider
      value={{ navId, selectedId, scrollFocus, registerPanel }}
    >
      <div
        className={[
          'theme-glowstep',
          glowStepDotNavOrientationClass[orientation],
          glowStepDotNavSizeClass[size],
          glowStepDotNavTransitionClass[stepTransition],
          scrollFocus ? 'theme-glowstep--scroll-focus' : '',
          glow ? '' : 'theme-glowstep--no-glow',
          menuScaleClass(menuScale),
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          scrollFocus
            ? ({
                '--theme-glowstep-scroll-margin': `${scrollFocusOffset}px`,
              } as CSSProperties)
            : undefined
        }
      >
        <nav
          className="theme-glowstep__nav"
          aria-label={label}
          aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
        >
          <div
            ref={stepperRef}
            className="theme-glowstep__stepper"
            role={stepListRole}
            aria-orientation={scrollFocus ? undefined : orientation}
          >
            <div ref={markerRef} className="theme-glowstep__marker" aria-hidden />
            {items.map((item, index) => {
              const isSelected = item.id === selectedId
              const tabId = `${navId}-step-${item.id}`
              const panelId = `${navId}-panel-${item.id}`
              const Icon = item.icon

              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    stepRefs.current[index] = node
                  }}
                  type="button"
                  id={tabId}
                  role={stepRole}
                  aria-selected={scrollFocus ? undefined : isSelected}
                  aria-current={scrollFocus && isSelected ? 'step' : undefined}
                  aria-controls={scrollFocus ? undefined : panelId}
                  aria-label={item.label}
                  tabIndex={isSelected ? 0 : -1}
                  disabled={item.disabled}
                  data-step-id={item.id}
                  className={[
                    'theme-btn',
                    'theme-btn--cardless',
                    'theme-glowstep__step',
                    isSelected ? 'theme-glowstep__step--selected' : '',
                    resolvedIconGlow ? BORDER_GLOW_ICON_CLASS : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => activateStep(item.id)}
                  onKeyDown={onStepKeyDown}
                >
                  <span className="theme-btn__icon-svg-glow-host theme-glowstep__icon-host">
                    <Icon
                      aria-hidden
                      strokeWidth={2}
                      className={[
                        'theme-btn__icon',
                        'theme-glowstep__icon',
                        resolvedIconGlow ? ICON_SVG_GLOW_CLASS : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    />
                  </span>
                  <span className="theme-glowstep__label-axis" aria-hidden>
                    <span className="theme-glowstep__label-axis-accent" aria-hidden />
                  </span>
                  <TypeAnimText
                    anim={labelAnim}
                    trigger={labelAnimTrigger}
                    split="line"
                    inButton
                    className={[
                      'type-caption theme-glowstep__label theme-btn__label',
                      resolvedTextGlow ? TYPE_GLOW_CLASS : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {item.label}
                  </TypeAnimText>
                </button>
              )
            })}
          </div>
        </nav>
        {children ? (
          <div ref={scrollHostRef} className="theme-glowstep__panel-host">
            <Card
              variant={panelVariant}
              scroll={scrollFocus ? scrollRail : undefined}
              scrollRail={scrollRail}
              scrollClouds={scrollClouds}
              className={[
                'theme-glowstep__card',
                scrollFocus ? 'theme-glowstep__card--scroll-focus' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="theme-glowstep__panels">{children}</div>
            </Card>
          </div>
        ) : null}
      </div>
    </GlowStepDotNavContext.Provider>
  )
}

export function GlowStepDotNavPanel({
  id,
  title,
  children,
  className = '',
}: GlowStepDotNavPanelProps) {
  const { navId, selectedId, scrollFocus, registerPanel } =
    useGlowStepDotNavContext('GlowStepDotNavPanel')
  const isSelected = selectedId === id
  const tabId = `${navId}-step-${id}`
  const panelId = `${navId}-panel-${id}`

  const panelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (scrollFocus) {
        registerPanel(id, node)
      }
    },
    [id, registerPanel, scrollFocus],
  )

  return (
    <div
      ref={panelRef}
      id={panelId}
      role={scrollFocus ? 'region' : 'tabpanel'}
      aria-labelledby={tabId}
      aria-hidden={scrollFocus ? undefined : !isSelected}
      tabIndex={scrollFocus ? undefined : isSelected ? 0 : -1}
      data-glowstep-section={scrollFocus ? id : undefined}
      className={[
        'theme-glowstep__panel',
        scrollFocus || isSelected ? 'theme-glowstep__panel--visible' : '',
        scrollFocus ? 'theme-glowstep__panel--scroll-section' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title ? <h3 className="type-title theme-glowstep__panel-title">{title}</h3> : null}
      {children}
    </div>
  )
}

export type { GlowStepDotNavItem, GlowStepDotNavSize, GlowStepDotNavTransition }
export type { ScrollRailType } from '../lib/scroll/scrollRail'
export type { MenuScale } from '../lib/menus/menuScale'
export type { TypeAnimPreset, TypeAnimTrigger } from '../lib/animations/typeAnimPresets'
