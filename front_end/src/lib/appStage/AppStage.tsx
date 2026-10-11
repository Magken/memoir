/**
 * App Stage — keep-alive host for Tier-1 Page Scenes (Home, Dashboard).
 * First visit on `/theme/vurify/landing`: Home landing owns bootstrap (`%` → V) — no CurtainLoading.
 * First visit elsewhere: CurtainLoading while soft-loading stage chunks, then
 * CurtainTransition into the URL page. Page hops use CurtainTransition only.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CurtainLoading } from '../../components/CurtainLoading'
import { ThemeProvider } from '../theme'
import {
  APP_STAGE_PAGES,
  appStagePageForPath,
  normalizeAppStagePath,
} from './appStageConfig'
import { isBlankLandingPath, isVurifyLandingPath, VURIFY_REF_PATHS } from '../vurifyRef/paths'
import {
  AppStageContext,
  type AppStageBootstrapSurface,
  type AppStageGoToOptions,
  type AppStageLeavePrep,
  type AppStagePhase,
} from './appStageContext'
import type { TryInterviewKitId } from '../tryInterview/tryInterviewKits'
import { setPendingTryInterviewKit } from '../tryInterview/tryInterviewBriefs'
import {
  parkCurtainIncomingLayer,
  runCurtainTransition,
  settleCurtainIncomingLayer,
  settleCurtainParkedLayer,
} from './curtainTransition'

/** Empty route element — App Stage owns the live Page Scene UI. */
export function AppStageMirror() {
  return null
}

type AppStageProviderProps = {
  children: ReactNode
}

type Handoff = {
  from: string | null
  to: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/** Block wheel/touch so peels and page scroll cannot fight leave-prep / curtain. */
function installStageScrollBlock(): () => void {
  const block = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
  }
  window.addEventListener('wheel', block, { passive: false, capture: true })
  window.addEventListener('touchmove', block, { passive: false, capture: true })
  return () => {
    window.removeEventListener('wheel', block, { capture: true })
    window.removeEventListener('touchmove', block, { capture: true })
  }
}

function readBlankLanding(): boolean {
  if (typeof window === 'undefined') return false
  return isBlankLandingPath(window.location.pathname)
}

function readBootstrapSurface(): AppStageBootstrapSurface {
  // Prefer window so HMR / first paint cannot latch CurtainLoading on the Vurify landing.
  if (typeof window !== 'undefined') {
    return isVurifyLandingPath(window.location.pathname) ? 'home' : 'curtain'
  }
  return 'curtain'
}

export function AppStageProvider({ children }: AppStageProviderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const locationPath = normalizeAppStagePath(location.pathname)
  const stagePage = appStagePageForPath(locationPath)
  const stagePath = stagePage?.path ?? null

  const bootstrapSurfaceRef = useRef<AppStageBootstrapSurface>(readBootstrapSurface())
  const bootstrapSurface = bootstrapSurfaceRef.current
  const homeBootstrap = bootstrapSurface === 'home'
  /** `/` stays an empty shell — no curtain and no stage-chunk preload. */
  const blankLandingRef = useRef(readBlankLanding())
  const blankLanding = blankLandingRef.current

  const [layers, setLayers] = useState<Partial<Record<string, ComponentType>>>({})
  const [activePath, setActivePath] = useState<string | null>(
    () => (homeBootstrap ? VURIFY_REF_PATHS.landing : null),
  )
  const [stageProgress, setStageProgress] = useState(0)
  const [chunksReady, setChunksReady] = useState(blankLanding)
  const [curtainVisualComplete, setCurtainVisualComplete] = useState(blankLanding)
  const [stagePhase, setStagePhase] = useState<AppStagePhase>(
    blankLanding ? 'ready' : 'curtain-loading',
  )
  /** CurtainLoading host — never for home-first boot or the blank `/` shell. */
  const [showCurtain, setShowCurtain] = useState(() => !homeBootstrap && !blankLanding)
  /** Stays true after first reveal — page hops must not flip Home/stage consumers off. */
  const [hasRevealed, setHasRevealed] = useState(blankLanding)
  /** React-owned pin/cover classes so re-renders cannot wipe GSAP classList adds. */
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  /** True from leave-prep through curtain settle — blocks scroll inputs. */
  const [stageNavigating, setStageNavigating] = useState(false)

  const layersRef = useRef(layers)
  const layerElRefs = useRef<Partial<Record<string, HTMLDivElement | null>>>({})
  const curtainElRef = useRef<HTMLDivElement | null>(null)
  const stageElRef = useRef<HTMLDivElement | null>(null)
  const activePathRef = useRef<string | null>(activePath)
  const transitioningRef = useRef(false)
  const firstRevealDoneRef = useRef(blankLanding)
  const stageReadyRef = useRef(false)
  const leavePrepRef = useRef<Partial<Record<string, AppStageLeavePrep>>>({})
  const scrollBlockCleanupRef = useRef<(() => void) | null>(null)

  layersRef.current = layers
  activePathRef.current = activePath

  const stageReady = hasRevealed
  stageReadyRef.current = stageReady
  const stageLoading = stagePhase === 'curtain-loading'

  const ensureMounted = useCallback(async (path: string) => {
    const page = appStagePageForPath(path)
    if (!page) return false
    if (layersRef.current[page.path]) return true
    const module = await page.load()
    setLayers((prev) => {
      if (prev[page.path]) return prev
      return { ...prev, [page.path]: module.default }
    })
    return true
  }, [])

  const waitForLayerEl = useCallback(async (path: string) => {
    for (let i = 0; i < 40; i += 1) {
      const el = layerElRefs.current[path]
      if (el) return el
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })
    }
    return layerElRefs.current[path] ?? null
  }, [])

  const reportCurtainLoadingComplete = useCallback(() => {
    setCurtainVisualComplete(true)
  }, [])

  const registerLeavePrep = useCallback((path: string, prep: AppStageLeavePrep | null) => {
    if (prep) leavePrepRef.current[path] = prep
    else delete leavePrepRef.current[path]
  }, [])

  const runHandoff = useCallback(
    async (toPath: string, options?: { curtainEl?: HTMLElement | null; fromPath?: string | null }) => {
      if (transitioningRef.current) return false
      transitioningRef.current = true
      setStageNavigating(true)
      if (!scrollBlockCleanupRef.current) {
        scrollBlockCleanupRef.current = installStageScrollBlock()
      }

      const fromPath = options?.fromPath ?? activePathRef.current
      const resolvedFrom = fromPath && fromPath !== toPath ? fromPath : null

      try {
        if (resolvedFrom) {
          const prep = leavePrepRef.current[resolvedFrom]
          if (prep) await prep()
        }

        await ensureMounted(toPath)
        const toEl = await waitForLayerEl(toPath)
        if (!toEl) {
          setHandoff(null)
          setActivePath(toPath)
          setShowCurtain(false)
          setHasRevealed(true)
          setStagePhase('ready')
          return false
        }

        const fromEl = resolvedFrom ? (layerElRefs.current[resolvedFrom] ?? null) : null
        const curtainEl = options?.curtainEl ?? null

        // Park cover off-stage before React adds is-incoming (avoids start flash).
        parkCurtainIncomingLayer(toEl)

        setHandoff({ from: resolvedFrom, to: toPath })
        setStagePhase('curtain-transition')
        await nextPaint()

        await runCurtainTransition({
          fromEl,
          toEl,
          curtainEl,
          stageEl: stageElRef.current,
          reducedMotion: prefersReducedMotion(),
        })

        // React drops is-incoming first (so CSS cannot re-apply off-stage pose),
        // then we normalize the resting layer.
        setActivePath(toPath)
        setHandoff(null)
        setHasRevealed(true)
        setStagePhase('ready')
        await nextPaint()
        settleCurtainIncomingLayer(toEl)
        if (fromEl) settleCurtainParkedLayer(fromEl)
        // Unmount curtain only after the page is resting — avoids canvas teardown flash.
        setShowCurtain(false)
        return true
      } catch (error) {
        console.error('[AppStage] handoff failed', error)
        setHandoff(null)
        setStagePhase('ready')
        setHasRevealed(true)
        return false
      } finally {
        scrollBlockCleanupRef.current?.()
        scrollBlockCleanupRef.current = null
        transitioningRef.current = false
        setStageNavigating(false)
      }
    },
    [ensureMounted, waitForLayerEl],
  )

  const goTo = useCallback(
    (path: string, options?: AppStageGoToOptions) => {
      const page = appStagePageForPath(path)
      const search = options?.search ?? ''
      if (!page) {
        navigate({ pathname: path, search }, { replace: options?.replace ?? false })
        return
      }
      if (!stageReadyRef.current || transitioningRef.current) return

      const alreadyOnPage = activePathRef.current === page.path
      if (alreadyOnPage) {
        navigate({ pathname: page.path, search }, { replace: options?.replace ?? true })
        return
      }

      void (async () => {
        const ok = await runHandoff(page.path, { fromPath: activePathRef.current })
        if (ok || activePathRef.current === page.path) {
          navigate({ pathname: page.path, search }, { replace: options?.replace ?? true })
        }
      })()
    },
    [navigate, runHandoff],
  )

  const goHome = useCallback(() => {
    goTo(VURIFY_REF_PATHS.landing)
  }, [goTo])

  const goDashboard = useCallback(() => {
    goTo(VURIFY_REF_PATHS.dashboard)
  }, [goTo])

  const goInterview = useCallback(
    (opts?: { briefId?: string }) => {
      const briefId = opts?.briefId?.trim()
      goTo(VURIFY_REF_PATHS.interview, {
        search: briefId ? `?briefId=${encodeURIComponent(briefId)}` : '',
      })
    },
    [goTo],
  )

  const goTryInterview = useCallback(
    (opts?: { kit?: TryInterviewKitId }) => {
      const kit = opts?.kit ?? 'coding'
      setPendingTryInterviewKit(kit)
      goTo(VURIFY_REF_PATHS.tryInterview, {
        search: `?kit=${encodeURIComponent(kit)}`,
      })
    },
    [goTo],
  )
  useEffect(() => {
    return () => {
      scrollBlockCleanupRef.current?.()
      scrollBlockCleanupRef.current = null
    }
  }, [])

  // Home-first: never keep a CurtainLoading host (HMR can leave showCurtain=true).
  useEffect(() => {
    if (!homeBootstrap) return
    setShowCurtain(false)
  }, [homeBootstrap])

  // Bootstrap: soft-load every Tier-1 page; progress feeds CurtainLoading or Home `%`.
  // `/` does not preload those chunks — they mount on the first stage navigation.
  useEffect(() => {
    if (blankLanding) return
    let cancelled = false
    const pages = Object.values(APP_STAGE_PAGES)
    const total = pages.length
    if (total === 0) {
      setChunksReady(true)
      setCurtainVisualComplete(true)
      setStageProgress(100)
      return
    }

    // Home boot — mount landing first so `%` can track chunk progress live.
    const ordered = homeBootstrap
      ? [...pages].sort((a, b) => {
          if (a.path === VURIFY_REF_PATHS.landing) return -1
          if (b.path === VURIFY_REF_PATHS.landing) return 1
          return 0
        })
      : pages

    let loaded = 0

    void (async () => {
      for (const page of ordered) {
        const module = await page.load()
        if (cancelled) return
        setLayers((prev) => {
          if (prev[page.path]) return prev
          return { ...prev, [page.path]: module.default }
        })
        loaded += 1
        setStageProgress(Math.round((loaded / total) * 100))
      }
      if (cancelled) return
      setStageProgress(100)
      setChunksReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [homeBootstrap, blankLanding])

  // Fallback if bootstrap load visuals never complete (reduced path / WebGL fail).
  useEffect(() => {
    if (!chunksReady || curtainVisualComplete) return
    const reduced = prefersReducedMotion()
    if (reduced) {
      setCurtainVisualComplete(true)
      return
    }
    const fallback = window.setTimeout(() => setCurtainVisualComplete(true), 12_000)
    return () => window.clearTimeout(fallback)
  }, [chunksReady, curtainVisualComplete])

  // First reveal: home landing unlocks in place; other URLs CurtainTransition from curtain.
  useEffect(() => {
    if (!chunksReady || !curtainVisualComplete || firstRevealDoneRef.current) return
    if (!stagePath) {
      firstRevealDoneRef.current = true
      setShowCurtain(false)
      setHasRevealed(true)
      setStagePhase('ready')
      return
    }

    // Home-first: never CurtainTransition — landing already showed `%`→V in place.
    if (homeBootstrap) {
      firstRevealDoneRef.current = true
      setActivePath(VURIFY_REF_PATHS.landing)
      setShowCurtain(false)
      setHasRevealed(true)
      setStagePhase('ready')
      setStageNavigating(false)
      return
    }

    firstRevealDoneRef.current = true
    void (async () => {
      await runHandoff(stagePath, {
        curtainEl: curtainElRef.current,
        fromPath: null,
      })
      if (normalizeAppStagePath(location.pathname) !== stagePath) {
        navigate(stagePath, { replace: true })
      }
    })()
  }, [
    homeBootstrap,
    chunksReady,
    curtainVisualComplete,
    stagePath,
    runHandoff,
    navigate,
    location.pathname,
  ])

  // Browser back/forward onto a stage path while ready — transition if needed.
  useEffect(() => {
    if (!stageReadyRef.current || !stagePath) return
    if (transitioningRef.current) return
    if (activePathRef.current === stagePath) return
    if (!layersRef.current[stagePath]) {
      void ensureMounted(stagePath).then(() => {
        void runHandoff(stagePath, { fromPath: activePathRef.current })
      })
      return
    }
    void runHandoff(stagePath, { fromPath: activePathRef.current })
  }, [stagePath, ensureMounted, runHandoff])

  const value = useMemo(
    () => ({
      goTo,
      goHome,
      goDashboard,
      goInterview,
      goTryInterview,
      activePath,
      stagePhase,
      stageReady,
      stageLoading,
      stageNavigating,
      stageProgress,
      bootstrapSurface,
      reportCurtainLoadingComplete,
      registerLeavePrep,
    }),
    [
      goTo,
      goHome,
      goDashboard,
      goInterview,
      goTryInterview,
      activePath,
      stagePhase,
      stageReady,
      stageLoading,
      stageNavigating,
      stageProgress,
      bootstrapSurface,
      reportCurtainLoadingComplete,
      registerLeavePrep,
    ],
  )

  const layerEntries = Object.entries(layers) as [string, ComponentType][]
  const onStage = Boolean(stagePath)
  /** CurtainLoading only when this session's first URL was not the Vurify landing. */
  const renderCurtain = showCurtain && !homeBootstrap
  /**
   * Park only after curtain boot finishes — outflow first-load still needs a
   * full-viewport curtain host. Once ready, park so Theme/etc. sit at the top.
   */
  const stageParked = !onStage && !renderCurtain

  return (
    <AppStageContext.Provider value={value}>
      <div
        ref={stageElRef}
        className={stageParked ? 'app-stage app-stage--parked' : 'app-stage'}
        data-stage-phase={stagePhase}
        data-stage-loading={stageLoading ? 'true' : undefined}
        data-stage-navigating={stageNavigating ? 'true' : undefined}
        data-bootstrap-surface={bootstrapSurface}
        aria-busy={
          stageLoading || stageNavigating || stagePhase === 'curtain-transition' || undefined
        }
        aria-hidden={!onStage && !renderCurtain}
      >
        {layerEntries.map(([path, Page]) => {
          const page = APP_STAGE_PAGES[path]
          if (!page) return null
          const isOutgoing = handoff?.from === path
          const isIncoming = handoff?.to === path
          // Home owns first-boot loading — keep landing visible before hasRevealed.
          const isHomeBootstrap =
            !hasRevealed &&
            homeBootstrap &&
            path === VURIFY_REF_PATHS.landing &&
            !isIncoming &&
            !isOutgoing
          // Keep outgoing as is-active during handoff so it does not drop relative→absolute alone.
          const isActive =
            isHomeBootstrap || (hasRevealed && activePath === path && !isIncoming)
          const isParked = !isActive && !isIncoming && !isOutgoing
          const className = [
            'app-stage__layer',
            isActive ? 'is-active' : '',
            isOutgoing ? 'is-outgoing is-transitioning' : '',
            isIncoming ? 'is-incoming is-transitioning' : '',
            isParked ? 'is-parked' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={path}
              ref={(el) => {
                layerElRefs.current[path] = el
              }}
              className={className}
              data-app-stage-root={page.root}
              aria-hidden={!(isActive || isOutgoing || isIncoming)}
            >
              <Page />
            </div>
          )
        })}
        {renderCurtain ? (
          <div
            ref={curtainElRef}
            className={
              handoff
                ? 'app-stage__curtain is-transitioning'
                : 'app-stage__curtain'
            }
            aria-hidden={false}
          >
            <ThemeProvider>
              <CurtainLoading
                progress={stageProgress}
                onComplete={reportCurtainLoadingComplete}
              />
            </ThemeProvider>
          </div>
        ) : null}
      </div>
      {children}
    </AppStageContext.Provider>
  )
}
