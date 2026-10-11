import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTexture } from '@react-three/drei'
import {
  CURVED_MONITOR_CHROME_IN_MS,
  CURVED_MONITOR_CHROME_OUT_MS,
  CURVED_MONITOR_CONCAVE,
  CURVED_MONITOR_CURVE_DEFAULT,
  hoverCurveDegree,
  CURVED_MONITOR_FEATURE_CYCLE_MS,
  CURVED_MONITOR_TILT_REST,
  activeFeatureId,
  focusedFeature,
  nextFeatureCycleIndex,
  wrapGroupIndex,
  type CurvedMonitorTilt,
} from '../lib/shape3d/curvedMonitor'
import { IconButton } from './IconButton'
import { TypeAnimText } from './TypeAnimText'
import { VurifyIcon } from './VurifyIcon'
import { VurifyMenuButton } from './VurifyMenuButton'
import { CurvedMonitorCanvas } from './curvedMonitorCard/CurvedMonitorCanvas'
import {
  DEFAULT_GROUP,
  DEFAULT_GROUPS,
  DEFAULT_STILL,
  NAV_FEATURE_GROUPS,
  type FeatureGroup,
  type FeatureItem,
} from './curvedMonitorCard/featureGroups'

type CurvedMonitorCardVariant = 'gallery' | 'nav'

type CurvedMonitorCardProps = {
  src?: string
  alt?: string
  className?: string
  /** Signed bowl: -1 concave (TV), +1 convex. Switching flexes instead of snapping. */
  curvature?: number
  /** Curve degree 0–1 (how strong the bowl is). */
  curve?: number
  /** Single group. Ignored when `groups` is set. */
  group?: FeatureGroup
  /** Stack of groups. Gallery prev/next cycle through them. */
  groups?: readonly FeatureGroup[]
  /** `gallery` keeps title + chevrons. `nav` is edge tags only. */
  variant?: CurvedMonitorCardVariant
}

type MediaFx = {
  fromSrc: string
  toSrc: string
}

type ChromePhase = 'idle' | 'out' | 'in'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function prefersFineHover() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function stillForGroup(item: FeatureGroup, src?: string, alt?: string) {
  if (src) return { src, alt: alt ?? item.slides[0]?.alt ?? DEFAULT_STILL.alt }
  return item.slides[0] ?? DEFAULT_STILL
}

/**
 * Theme demo - bent card as a feature-group still, with edge tags and a centered caption.
 */
export function CurvedMonitorCard({
  src,
  alt,
  className = '',
  curvature = CURVED_MONITOR_CONCAVE,
  curve = CURVED_MONITOR_CURVE_DEFAULT,
  group,
  groups,
  variant = 'gallery',
}: CurvedMonitorCardProps) {
  const isNav = variant === 'nav'
  const stack = groups?.length ? groups : group ? [group] : DEFAULT_GROUPS
  const [groupIndex, setGroupIndex] = useState(0)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [chromePhase, setChromePhase] = useState<ChromePhase>('idle')
  const [mediaFx, setMediaFx] = useState<MediaFx | null>(null)
  const safeIndex = wrapGroupIndex(groupIndex, stack.length)
  const displaySafe = wrapGroupIndex(displayIndex, stack.length)
  const displayGroup = stack[displaySafe] ?? stack[0] ?? DEFAULT_GROUP
  const showGroupNav = !isNav && stack.length > 1

  const hostRef = useRef<HTMLDivElement>(null)
  const tiltRef = useRef<CurvedMonitorTilt>({ ...CURVED_MONITOR_TILT_REST })
  const navLockRef = useRef(false)
  const mediaFxRef = useRef<MediaFx | null>(null)
  const goToGroupRef = useRef<(index: number) => void>(() => {})
  const groupIndexRef = useRef(0)
  const handoffTimerRef = useRef<number | null>(null)
  const switchTimerRef = useRef<number | null>(null)
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [explicitId, setExplicitId] = useState<string | null>(null)
  const [cycleIndex, setCycleIndex] = useState(0)
  const lastCaptionId = useRef<string | null>(null)
  const wasExpanded = useRef(false)
  const expanded = hovered || pinned
  const bowlCurve = hoverCurveDegree(curve, expanded)
  const activeId = isNav
    ? expanded
      ? displayGroup.id
      : null
    : activeFeatureId(displayGroup.features, explicitId, cycleIndex, expanded)
  if (!isNav && activeId) lastCaptionId.current = activeId
  const caption = isNav
    ? undefined
    : focusedFeature(displayGroup.features, activeId ?? lastCaptionId.current)
  const edgeItems: readonly (FeatureGroup | FeatureItem)[] = isNav ? stack : displayGroup.features

  const still = useMemo(
    () => stillForGroup(displayGroup, src, alt),
    [alt, displayGroup, src],
  )
  const [canvasSrc, setCanvasSrc] = useState(still.src)
  mediaFxRef.current = mediaFx
  const faceAlt = alt ?? still.alt

  useEffect(() => {
    for (const item of stack) {
      const next = item.slides[0]?.src
      if (next) useTexture.preload(next)
    }
  }, [stack])

  useEffect(() => {
    useTexture.preload(still.src)
  }, [still.src])

  useEffect(() => {
    if (src) setCanvasSrc(src)
  }, [src])

  useEffect(() => {
    if (isNav) return
    setCycleIndex(0)
    setExplicitId(null)
    lastCaptionId.current = null
  }, [displayGroup.id, isNav])

  useEffect(() => {
    if (isNav) return
    const justOpened = expanded && !wasExpanded.current
    wasExpanded.current = expanded
    if (justOpened && !explicitId) setCycleIndex(0)
    if (!expanded) return
    if (explicitId || prefersReducedMotion()) return
    const count = displayGroup.features.length
    if (count <= 1) return
    const timer = window.setInterval(() => {
      setCycleIndex((index) => nextFeatureCycleIndex(index, count))
    }, CURVED_MONITOR_FEATURE_CYCLE_MS)
    return () => window.clearInterval(timer)
  }, [expanded, explicitId, displayGroup.features.length, isNav])

  useEffect(() => {
    if (!isNav) return
    wasExpanded.current = expanded
    if (!expanded) return
    if (explicitId || prefersReducedMotion()) return
    if (stack.length <= 1) return
    const timer = window.setInterval(() => {
      if (navLockRef.current) return
      goToGroupRef.current(groupIndexRef.current + 1)
    }, CURVED_MONITOR_FEATURE_CYCLE_MS)
    return () => window.clearInterval(timer)
  }, [expanded, explicitId, isNav, stack.length])

  useEffect(
    () => () => {
      if (handoffTimerRef.current !== null) window.clearTimeout(handoffTimerRef.current)
      if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current)
    },
    [],
  )

  const onFxComplete = useCallback(() => {
    const fx = mediaFxRef.current
    if (fx) setCanvasSrc(fx.toSrc)
    setMediaFx(null)
    navLockRef.current = false
  }, [])

  const onPointerEnter = () => {
    if (prefersFineHover()) setHovered(true)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion()) return
    const box = event.currentTarget.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) return
    tiltRef.current.x = ((event.clientX - box.left) / box.width) * 2 - 1
    tiltRef.current.y = ((event.clientY - box.top) / box.height) * 2 - 1
    tiltRef.current.hover = true
  }

  const onHostLeave = (event: ReactPointerEvent<HTMLElement>) => {
    const next = event.relatedTarget
    if (
      next instanceof Element &&
      next.closest('.theme-curved-monitor-card, .theme-curved-monitor-card__edge')
    ) {
      return
    }
    tiltRef.current.hover = false
    setHovered(false)
    setPinned(false)
    setExplicitId(null)
  }

  const goToGroup = (index: number) => {
    const next = wrapGroupIndex(index, stack.length)
    if (next === safeIndex || navLockRef.current) return
    const fromStill = still
    const toGroup = stack[next] ?? displayGroup
    const toStill = stillForGroup(toGroup, src, alt)
    const reduced = prefersReducedMotion()

    navLockRef.current = true
    setGroupIndex(next)

    if (handoffTimerRef.current !== null) window.clearTimeout(handoffTimerRef.current)
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current)

    if (reduced) {
      setDisplayIndex(next)
      setChromePhase('idle')
      setCanvasSrc(toStill.src)
      setMediaFx(null)
      navLockRef.current = false
      return
    }

    const needsFx = fromStill.src !== toStill.src
    if (needsFx) {
      setMediaFx({
        fromSrc: fromStill.src,
        toSrc: toStill.src,
      })
    } else {
      setCanvasSrc(toStill.src)
    }

    setChromePhase('out')
    handoffTimerRef.current = window.setTimeout(() => {
      setDisplayIndex(next)
      setChromePhase('in')
      switchTimerRef.current = window.setTimeout(() => {
        setChromePhase('idle')
        switchTimerRef.current = null
        if (!needsFx) navLockRef.current = false
      }, CURVED_MONITOR_CHROME_IN_MS)
      handoffTimerRef.current = null
    }, CURVED_MONITOR_CHROME_OUT_MS)
  }

  goToGroupRef.current = goToGroup
  groupIndexRef.current = groupIndex

  const selectFeature = (id: string) => {
    const index = displayGroup.features.findIndex((item) => item.id === id)
    if (index >= 0) setCycleIndex(index)
    setExplicitId(id)
  }

  const onCardClick = () => {
    if (prefersFineHover()) return
    setPinned((open) => !open)
  }

  const onTagEnter = (id: string) => {
    if (isNav) {
      const index = stack.findIndex((item) => item.id === id)
      if (index >= 0) goToGroup(index)
      setExplicitId(id)
    } else {
      selectFeature(id)
    }
    if (prefersFineHover()) setHovered(true)
  }

  const onTagLeave = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const next = event.relatedTarget
    if (next instanceof Element && next.closest('.theme-curved-monitor-card__tag')) return
    setExplicitId(null)
  }

  const onTagClick = (event: ReactMouseEvent<HTMLButtonElement>, id: string) => {
    event.preventDefault()
    event.stopPropagation()
    if (isNav) {
      const index = stack.findIndex((item) => item.id === id)
      if (index >= 0) goToGroup(index)
      setExplicitId(id)
    } else {
      selectFeature(id)
    }
    setPinned(true)
  }

  const onGroupStep = (event: ReactMouseEvent<HTMLButtonElement>, delta: number) => {
    event.preventDefault()
    event.stopPropagation()
    goToGroup(safeIndex + delta)
  }

  const titleOut = chromePhase === 'out'
  const edgeChrome = isNav ? 'idle' : chromePhase
  const edgeFocusId = isNav ? displayGroup.id : activeId

  return (
    <div
      className={['theme-curved-monitor-feature', className].filter(Boolean).join(' ')}
      data-variant={variant}
    >
      <div className="theme-curved-monitor-feature__board">
        <div
          className="theme-curved-monitor-feature__pair"
          onPointerEnter={onPointerEnter}
          onPointerLeave={onHostLeave}
        >
        <div className="theme-curved-monitor-feature__screen">
        <div
          ref={hostRef}
          className="theme-curved-monitor-card"
        data-expanded={expanded ? 'true' : 'false'}
        aria-label={faceAlt}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onHostLeave}
        onPointerMove={onPointerMove}
        onClick={onCardClick}
      >
        <div className="theme-curved-monitor-card__stage">
          <CurvedMonitorCanvas
            src={mediaFx?.fromSrc ?? canvasSrc}
            incomingSrc={mediaFx?.toSrc}
            onFxComplete={onFxComplete}
            tiltRef={tiltRef}
            curvature={curvature}
            curve={bowlCurve}
          />
        </div>
        {isNav ? (
          <div className="theme-curved-monitor-card__caption theme-curved-monitor-card__caption--nav">
            <div
              key={displayGroup.id}
              className="theme-curved-monitor-card__caption-copy"
              data-chrome={chromePhase}
            >
              {displayGroup.features.map((item, index) => (
                <div key={item.id} className="theme-curved-monitor-card__caption-section">
                  {index > 0 ? (
                    <hr className="theme-curved-monitor-card__caption-rule" aria-hidden />
                  ) : null}
                  <span className="theme-curved-monitor-card__caption-chip type-body-sm">
                    {item.label}
                  </span>
                  <p className="theme-curved-monitor-card__caption-body">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        ) : caption ? (
          <div className="theme-curved-monitor-card__caption">
            <div
              key={caption.id}
              className="theme-curved-monitor-card__caption-copy"
              data-chrome={chromePhase}
            >
              <p className="theme-curved-monitor-card__caption-title">{caption.label}</p>
              <hr className="theme-curved-monitor-card__caption-rule" aria-hidden />
              <p className="theme-curved-monitor-card__caption-body">{caption.body}</p>
            </div>
          </div>
        ) : null}
      </div>
      <hr
        className="theme-divider theme-divider--vertical theme-curved-monitor-card__gutter"
        aria-hidden
      />
      <ul
        className="theme-curved-monitor-card__edge"
        data-has-focus={edgeFocusId ? 'true' : 'false'}
        data-chrome={edgeChrome}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onHostLeave}
      >
        {edgeItems.map((item) => {
          const label = 'title' in item ? item.title : item.label
          const focused = edgeFocusId === item.id
          return (
            <li key={item.id} className="theme-curved-monitor-card__edge-item">
              <VurifyMenuButton
                size="sm"
                icon={item.icon}
                lineTone={focused ? 'accent' : 'text'}
                aria-pressed={focused}
                className={[
                  'theme-curved-monitor-card__tag',
                  focused ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-focus={focused ? 'true' : 'false'}
                onPointerEnter={() => onTagEnter(item.id)}
                onPointerLeave={onTagLeave}
                onClick={(event) => onTagClick(event, item.id)}
              >
                {label}
              </VurifyMenuButton>
            </li>
          )
        })}
      </ul>
      {isNav ? null : (
        <div className="theme-curved-monitor-feature__mast">
          <div className="theme-curved-monitor-feature__heading">
            {showGroupNav ? (
              <IconButton
                type="button"
                variant="cardless"
                size="lg"
                className="theme-curved-monitor-feature__nav"
                icon={ChevronLeft}
                aria-label="Previous feature group"
                onClick={(event) => onGroupStep(event, -1)}
              />
            ) : (
              <span className="theme-curved-monitor-feature__heading-spacer" aria-hidden />
            )}
            <div
              className="theme-curved-monitor-feature__heading-label"
              data-chrome={chromePhase}
            >
              <VurifyIcon icon={displayGroup.icon} tone="accent" size="lg" />
              <TypeAnimText
                key={`${displayGroup.id}-${titleOut ? 'out' : 'in'}`}
                as="h3"
                anim="slide-up"
                trigger="enter"
                split="line"
                className={[
                  'type-display-sm',
                  'theme-curved-monitor-feature__title',
                  titleOut ? 'theme-curved-monitor-feature__title--out' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {displayGroup.title}
              </TypeAnimText>
            </div>
            {showGroupNav ? (
              <IconButton
                type="button"
                variant="cardless"
                size="lg"
                className="theme-curved-monitor-feature__nav"
                icon={ChevronRight}
                aria-label="Next feature group"
                onClick={(event) => onGroupStep(event, 1)}
              />
            ) : (
              <span className="theme-curved-monitor-feature__heading-spacer" aria-hidden />
            )}
          </div>
        </div>
      )}
        </div>
        </div>
      </div>
    </div>
  )
}

export type { CurvedMonitorCardProps, CurvedMonitorCardVariant, FeatureGroup }
export { DEFAULT_GROUPS, NAV_FEATURE_GROUPS }
export { preloadCurvedMonitorStills } from './curvedMonitorCard/preloadStills'
