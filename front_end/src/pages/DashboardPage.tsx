import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DashboardChatPeelResize } from '../components/DashboardChatPeelResize'
import { DashboardChatSpace } from '../components/DashboardChatSpace'
import { DashboardMenu } from '../components/DashboardMenu'
import { InterviewCreator } from '../components/InterviewCreator'
import { ThemeScroll } from '../components/ThemeScroll'
import { VurifyViewer } from '../components/VurifyViewer'
import type { EditorRuntimeHandle } from '../lib/editorContext/types'
import { peelCheckWarningsFromContext } from '../lib/interviewBrief/peelCheckWarnings'
import {
  getSession,
  onAuthStateChange,
  readAuthDashboardSummary,
  type AuthDashboardSummary,
} from '../lib/authApi'
import { useAppStage } from '../lib/appStage/appStageContext'
import { toUserMessage } from '../lib/dataApi'
import { cvDriveBodyToViewerDoc, cvGet, type CvExtractV2 } from '../lib/cvApi'
import { GsapPageProvider, revealSectionIn, revealSectionOut, useGSAP, useGsapPage } from '../lib/gsap'
import {
  buildDashboardPageMenuItems,
  DASHBOARD_PAGE_MENU_FOOTER_ITEMS,
} from '../lib/menus/dashboardMenu'
import { ThemeProvider } from '../lib/theme'
import { VURIFY_REF_PATHS } from '../lib/vurifyRef/paths'

const DASHBOARD_PAGE_STACK_DEPTHS = [3, 2, 1] as const

const MENU_LABEL_MS = 520
/** Match `--dash-peel-duration`. */
const MENU_PEEL_MS = 560
/**
 * Home menu closes items + peel together. Lead so labels/Menu↔⋯ start first,
 * then peel overlaps the rest of the wipe (avoids empty-gap → slam).
 */
const MENU_COLLAPSE_PEEL_LEAD_MS = 160
/** Rail → open: labels start shortly after width begins restoring. */
const MENU_EXPAND_LABEL_LEAD_MS = 120
/** Closed → open: column width only (labels snapped while clipped). */
const MENU_OPEN_FROM_CLOSED_MS = MENU_PEEL_MS

/** Match `--dash-peel-duration` — chat column width tween. */
import { writeThemeScrollTop, readThemeScrollTop } from '../lib/scroll/themeScrollLenis'

const CHAT_PEEL_MS = 560

const DASHBOARD_PATH = VURIFY_REF_PATHS.dashboard

type DashScrollEdge = 'top' | 'mid' | 'bottom' | 'both'
/** `closed` = width 0 (enter/leave only) · `rail` = half open · `open` = full labels. */
type DashboardMenuSurface = 'closed' | 'rail' | 'open'

function readScrollEdge(viewport: HTMLElement): DashScrollEdge {
  const top = readThemeScrollTop(viewport) <= 2
  const bottom =
    readThemeScrollTop(viewport) + viewport.clientHeight >= viewport.scrollHeight - 2
  if (top && bottom) return 'both'
  if (top) return 'top'
  if (bottom) return 'bottom'
  return 'mid'
}

function readMenuSurface(
  menuClosed: boolean,
  peelCollapsed: boolean,
  labelsCollapsed: boolean,
): DashboardMenuSurface {
  if (menuClosed) return 'closed'
  if (peelCollapsed || labelsCollapsed) return 'rail'
  return 'open'
}

/**
 * Post-auth App Stage Page Scene at `/dashboard`.
 * Fixed menu column + independently scrollable page (menu open squishes page width).
 * Menu surfaces: closed (page enter/leave only) · rail · open. Users toggle open ↔ rail.
 */
export function DashboardPage() {
  const { goHome, goInterview, activePath, stagePhase, registerLeavePrep } = useAppStage()
  const surfaceRef = useRef<HTMLDivElement>(null)
  const viewportNodeRef = useRef<HTMLDivElement | null>(null)
  const sequenceTimerRef = useRef<number | null>(null)
  const sequenceBusyRef = useRef(false)
  const sequenceResolveRef = useRef<(() => void) | null>(null)
  const entranceStartedRef = useRef(false)
  const activePathRef = useRef(activePath)
  activePathRef.current = activePath
  const menuClosedRef = useRef(true)
  const peelCollapsedRef = useRef(true)
  const labelsCollapsedRef = useRef(true)
  const revealRafRef = useRef<number | null>(null)
  const [viewportNode, setViewportNode] = useState<HTMLDivElement | null>(null)
  const [scrollEdge, setScrollEdge] = useState<DashScrollEdge>('top')
  const [summary, setSummary] = useState<AuthDashboardSummary | null>(() =>
    readAuthDashboardSummary(),
  )
  const isAgency = summary?.kind === 'organisation'
  const menuItems = useMemo(
    () => buildDashboardPageMenuItems(summary?.kind),
    [summary?.kind],
  )
  const sectionStageRef = useRef<HTMLDivElement>(null)
  const sectionSwapBusyRef = useRef(false)
  const pendingSectionRef = useRef('overview')
  const enteredSectionRef = useRef<string | null>(null)
  const [visibleSectionId, setVisibleSectionId] = useState('overview')
  const { reducedMotion } = useGsapPage()
  const dashGsapTiming = useMemo(() => ({ layout: { pageLengthVph: 1 as const } }), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [doc, setDoc] = useState<CvExtractV2 | null>(null)
  const [cvStatus, setCvStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [cvError, setCvError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState('overview')
  /** Start fully closed — page enter animates to fully open. */
  const [menuClosed, setMenuClosed] = useState(true)
  const [labelsCollapsed, setLabelsCollapsed] = useState(true)
  const [peelCollapsed, setPeelCollapsed] = useState(true)
  /** Snap label layout while width-clipped before the column expands. */
  const [menuReveal, setMenuReveal] = useState<'idle' | 'prep'>('idle')
  /** Right chat peel — open only on Interview Creator builder. */
  const [chatClosed, setChatClosed] = useState(true)
  const chatPeelTimerRef = useRef<number | null>(null)
  const creator2RuntimeRef = useRef<EditorRuntimeHandle | null>(null)
  /** Reactive mirror of the runtime context — board bot open needs briefId + accountId to react to. */
  const [creator2Ctx, setCreator2Ctx] = useState<{
    briefId: string
    accountId: string
    peelTags: { kind: 'notes' | 'pdf'; label: string }[]
    checkWarnings: {
      id: string
      short: string
      sectionId: string
      historyFocus?: string
    }[]
  } | null>(
    null,
  )

  const handleCreator2Runtime = useCallback((runtime: EditorRuntimeHandle | null) => {
    creator2RuntimeRef.current = runtime
    if (!runtime) {
      setCreator2Ctx(null)
      return
    }
    const ctx = runtime.getContext() as {
      briefId?: string | null
      accountId?: string | null
      peelTags?: { kind?: string; label: string }[]
    }
    const briefId = typeof ctx.briefId === 'string' && ctx.briefId ? ctx.briefId : null
    const accountId = typeof ctx.accountId === 'string' && ctx.accountId ? ctx.accountId : null
    const peelTags = Array.isArray(ctx.peelTags)
      ? ctx.peelTags
          .filter((t) => t && typeof t.label === 'string' && t.label.trim())
          .map((t) => ({
            kind: t.kind === 'pdf' ? ('pdf' as const) : ('notes' as const),
            label: t.label.trim(),
          }))
      : []
    const checkWarnings = peelCheckWarningsFromContext(ctx)
    setCreator2Ctx(briefId && accountId ? { briefId, accountId, peelTags, checkWarnings } : null)
  }, [])

  const clearChatPeelTimer = useCallback(() => {
    if (chatPeelTimerRef.current == null) return
    window.clearTimeout(chatPeelTimerRef.current)
    chatPeelTimerRef.current = null
  }, [])

  /** Guard: personal accounts cannot keep Interviews selected. */
  useEffect(() => {
    if (!isAgency && selectedId === 'interviews') setSelectedId('overview')
  }, [isAgency, selectedId])

  /** Section swap — exit → swap visible id → enter once (do not re-enter on menu re-renders). */
  useGSAP(
    () => {
      const stage = sectionStageRef.current
      if (!stage) return
      pendingSectionRef.current = selectedId

      if (selectedId === visibleSectionId) {
        sectionSwapBusyRef.current = false
        if (enteredSectionRef.current === visibleSectionId) return
        enteredSectionRef.current = visibleSectionId
        revealSectionIn(stage, {
          reducedMotion,
          duration: reducedMotion ? 0.01 : 0.42,
          stagger: reducedMotion ? 0 : 0.045,
        })
        return
      }

      enteredSectionRef.current = null
      if (sectionSwapBusyRef.current) return
      sectionSwapBusyRef.current = true
      revealSectionOut(stage, {
        reducedMotion,
        duration: reducedMotion ? 0.01 : 0.22,
        stagger: reducedMotion ? 0 : 0.028,
        onComplete: () => {
          setVisibleSectionId(pendingSectionRef.current)
          const viewport = viewportNodeRef.current
          if (viewport) writeThemeScrollTop(viewport, 0)
          sectionSwapBusyRef.current = false
        },
      })
    },
    { dependencies: [selectedId, visibleSectionId, reducedMotion], scope: sectionStageRef },
  )
  menuClosedRef.current = menuClosed
  peelCollapsedRef.current = peelCollapsed
  labelsCollapsedRef.current = labelsCollapsed

  const viewportRef = {
    get current() {
      return viewportNodeRef.current
    },
    set current(node: HTMLDivElement | null) {
      viewportNodeRef.current = node
      setViewportNode(node)
    },
  }

  const clearSequenceTimer = useCallback(() => {
    if (sequenceTimerRef.current !== null) {
      window.clearTimeout(sequenceTimerRef.current)
      sequenceTimerRef.current = null
    }
    if (revealRafRef.current !== null) {
      window.cancelAnimationFrame(revealRafRef.current)
      revealRafRef.current = null
    }
  }, [])

  const finishSequence = useCallback(() => {
    sequenceBusyRef.current = false
    sequenceTimerRef.current = null
    setMenuReveal('idle')
    const resolve = sequenceResolveRef.current
    sequenceResolveRef.current = null
    resolve?.()
  }, [])

  const setMenuSurface = useCallback(
    (next: DashboardMenuSurface, options?: { force?: boolean }) => {
      const force = options?.force === true
      if (sequenceBusyRef.current && !force) {
        return Promise.resolve()
      }

      const current = readMenuSurface(
        menuClosedRef.current,
        peelCollapsedRef.current,
        labelsCollapsedRef.current,
      )
      if (next === current) return Promise.resolve()

      clearSequenceTimer()
      if (sequenceResolveRef.current) {
        const prev = sequenceResolveRef.current
        sequenceResolveRef.current = null
        prev()
      }

      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      return new Promise<void>((resolve) => {
        sequenceResolveRef.current = resolve

        if (reducedMotion) {
          const closed = next === 'closed'
          const rail = next === 'rail' || closed
          setMenuReveal('idle')
          setMenuClosed(closed)
          setPeelCollapsed(rail)
          setLabelsCollapsed(rail)
          finishSequence()
          return
        }

        sequenceBusyRef.current = true

        if (next === 'open') {
          if (current === 'closed') {
            // Snap full label layout while still width-clipped, then expand column only.
            setMenuReveal('prep')
            setPeelCollapsed(false)
            setLabelsCollapsed(false)
            let outerRaf = 0
            outerRaf = window.requestAnimationFrame(() => {
              revealRafRef.current = window.requestAnimationFrame(() => {
                revealRafRef.current = null
                setMenuReveal('idle')
                setMenuClosed(false)
                sequenceTimerRef.current = window.setTimeout(() => {
                  finishSequence()
                }, MENU_OPEN_FROM_CLOSED_MS)
              })
            })
            revealRafRef.current = outerRaf
            return
          }
          // Rail → open: peel already at rail width; restore full width then labels.
          setMenuClosed(false)
          setPeelCollapsed(false)
          sequenceTimerRef.current = window.setTimeout(() => {
            setLabelsCollapsed(false)
            sequenceTimerRef.current = window.setTimeout(() => {
              finishSequence()
            }, MENU_LABEL_MS)
          }, MENU_EXPAND_LABEL_LEAD_MS)
          return
        }

        if (next === 'rail') {
          setMenuClosed(false)
          if (current === 'closed') {
            setPeelCollapsed(true)
            setLabelsCollapsed(true)
            sequenceTimerRef.current = window.setTimeout(() => {
              finishSequence()
            }, MENU_PEEL_MS)
            return
          }
          setLabelsCollapsed(true)
          sequenceTimerRef.current = window.setTimeout(() => {
            setPeelCollapsed(true)
            sequenceTimerRef.current = window.setTimeout(() => {
              finishSequence()
            }, MENU_PEEL_MS)
          }, MENU_COLLAPSE_PEEL_LEAD_MS)
          return
        }

        // Fully closed — shrink column first (layout stays open, clipped), then snap chrome.
        setMenuClosed(true)
        sequenceTimerRef.current = window.setTimeout(() => {
          setMenuReveal('prep')
          setPeelCollapsed(true)
          setLabelsCollapsed(true)
          sequenceTimerRef.current = window.setTimeout(() => {
            finishSequence()
          }, 32)
        }, MENU_PEEL_MS)
      })
    },
    [clearSequenceTimer, finishSequence],
  )

  /** Title ←/→ — user may only toggle fully open ↔ half open (rail). */
  const interviewMenuRestoreRef = useRef<DashboardMenuSurface | null>(null)

  const handleInterviewEditingChange = useCallback(
    (editing: boolean) => {
      if (editing) {
        if (interviewMenuRestoreRef.current == null) {
          interviewMenuRestoreRef.current = readMenuSurface(
            menuClosedRef.current,
            peelCollapsedRef.current,
            labelsCollapsedRef.current,
          )
        }
        void setMenuSurface('closed', { force: true })
        return
      }
      setChatClosed(true)
      const restore = interviewMenuRestoreRef.current
      interviewMenuRestoreRef.current = null
      if (restore == null || restore === 'closed') return
      void setMenuSurface(restore, { force: true })
    },
    [setMenuSurface],
  )

  const handleInterviewBuilderChange = useCallback(
    (active: boolean) => {
      clearChatPeelTimer()
      setChatClosed(!active)
    },
    [clearChatPeelTimer],
  )

  /** Close chat peel, then resolve after the width tween (leave builder sequence). */
  const handleInterviewBuilderLeave = useCallback(() => {
    clearChatPeelTimer()
    setChatClosed(true)
    return new Promise<void>((resolve) => {
      chatPeelTimerRef.current = window.setTimeout(() => {
        chatPeelTimerRef.current = null
        resolve()
      }, CHAT_PEEL_MS)
    })
  }, [clearChatPeelTimer])

  const setMenuCollapsed = useCallback(
    (collapsed: boolean) => {
      void setMenuSurface(collapsed ? 'rail' : 'open')
    },
    [setMenuSurface],
  )

  const leavePrep = useCallback(() => setMenuSurface('closed', { force: true }), [setMenuSurface])

  useEffect(() => {
    registerLeavePrep(DASHBOARD_PATH, leavePrep)
    return () => registerLeavePrep(DASHBOARD_PATH, null)
  }, [leavePrep, registerLeavePrep])

  useEffect(() => {
    return () => {
      clearSequenceTimer()
      clearChatPeelTimer()
      sequenceBusyRef.current = false
      sequenceResolveRef.current?.()
      sequenceResolveRef.current = null
    }
  }, [clearChatPeelTimer, clearSequenceTimer])

  /* Enter: when this layer becomes the ready stage page, closed → fully open. */
  useEffect(() => {
    if (activePath !== DASHBOARD_PATH || stagePhase !== 'ready') {
      entranceStartedRef.current = false
      return
    }
    if (entranceStartedRef.current) return
    entranceStartedRef.current = true
    let cancelled = false
    let outerRaf = 0
    let innerRaf = 0
    outerRaf = window.requestAnimationFrame(() => {
      innerRaf = window.requestAnimationFrame(() => {
        if (!cancelled) void setMenuSurface('open', { force: true })
      })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(outerRaf)
      window.cancelAnimationFrame(innerRaf)
    }
  }, [activePath, setMenuSurface, stagePhase])

  useEffect(() => {
    let cancelled = false

    // Keep-alive: only bounce guests when Dashboard is the live stage page.
    // Signup clears any prior session before creating the new one — that must
    // not yank outflow routes (e.g. `/landing-2` mid CV step) back to `/`.
    const goHomeIfDashboardActive = () => {
      if (activePathRef.current === DASHBOARD_PATH) goHome()
    }

    const syncAuth = async () => {
      try {
        const session = await getSession()
        if (cancelled) return
        if (!session) {
          setUserId(null)
          setSummary(null)
          goHomeIfDashboardActive()
          return
        }
        setUserId(session.user.id)
        setSummary(readAuthDashboardSummary())
      } catch {
        if (!cancelled) {
          setUserId(null)
          setSummary(null)
          goHomeIfDashboardActive()
        }
      }
    }

    void syncAuth()
    const unsubscribe = onAuthStateChange((_event, session) => {
      if (!session) {
        setUserId(null)
        setSummary(null)
        goHomeIfDashboardActive()
        return
      }
      setUserId(session.user.id)
      setSummary(readAuthDashboardSummary())
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [goHome])

  useEffect(() => {
    if (!userId) {
      setDoc(null)
      setCvStatus('loading')
      setCvError(null)
      return
    }
    // App Stage keep-alive: refetch whenever this page becomes active so a CV
    // completed on Home (same userId) is not stuck on a stale empty fetch.
    if (activePath !== DASHBOARD_PATH) return

    let cancelled = false
    setCvStatus('loading')
    setCvError(null)
    ;(async () => {
      try {
        const { body } = await cvGet()
        if (cancelled) return
        const next = cvDriveBodyToViewerDoc(body)
        const hasContent =
          Boolean(next.basics.display_name?.trim()) || next.sections.length > 0
        setDoc(next)
        setCvStatus(hasContent ? 'ready' : 'empty')
        setCvError(null)
      } catch (e) {
        if (cancelled) return
        setDoc(null)
        setCvStatus('error')
        setCvError(toUserMessage(e, 'CV is unavailable right now.'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, activePath])

  const handleSelect = useCallback(
    (id: string) => {
      if (id === 'home') {
        goHome()
        return
      }
      setSelectedId(id)
    },
    [goHome],
  )

  useEffect(() => {
    const viewport = viewportNode
    if (!viewport) return

    const syncEdge = () => {
      setScrollEdge(readScrollEdge(viewport))
    }
    syncEdge()
    viewport.addEventListener('scroll', syncEdge, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncEdge) : null
    ro?.observe(viewport)
    if (surfaceRef.current) ro?.observe(surfaceRef.current)
    return () => {
      viewport.removeEventListener('scroll', syncEdge)
      ro?.disconnect()
    }
  }, [viewportNode, selectedId, doc, cvStatus])

  return (
    <GsapPageProvider timing={dashGsapTiming}>
      <ThemeProvider>
        <main
          className="page-scene page-scene--dashboard"
          aria-label="Dashboard"
          data-menu-surface="true"
          data-menu-closed={menuClosed ? 'true' : 'false'}
          data-menu-collapsed={peelCollapsed ? 'true' : 'false'}
          data-menu-stack={
            !menuClosed && !peelCollapsed && !labelsCollapsed ? 'true' : 'false'
          }
          data-menu-reveal={menuReveal === 'prep' ? 'prep' : undefined}
          data-chat-closed={chatClosed ? 'true' : 'false'}
        >
          <nav
            className="page-scene--dashboard__menu"
            aria-label="Dashboard navigation"
            aria-hidden={menuClosed ? true : undefined}
          >
            <DashboardMenu
              layout="page"
              collapsible={false}
              collapsed={peelCollapsed}
              labelsCollapsed={labelsCollapsed}
              onCollapsedChange={setMenuCollapsed}
              title="Menu"
              label="Dashboard navigation"
              items={menuItems}
              footerItems={DASHBOARD_PAGE_MENU_FOOTER_ITEMS}
              selectedId={selectedId}
              onSelect={handleSelect}
              size="md"
              scrollRail="hidden"
              scrollClouds={false}
            />
          </nav>

          <div
            className="page-scene--dashboard__peel"
            data-scroll-edge={scrollEdge}
          >
            <div className="page-scene--dashboard__deck" aria-hidden="true">
              {DASHBOARD_PAGE_STACK_DEPTHS.map((depth) => (
                <div
                  key={depth}
                  className="page-scene--dashboard__deck-card"
                  data-depth={depth}
                  data-edge="left"
                />
              ))}
            </div>
            <ThemeScroll
              rail="mini"
              smooth
              scrollClouds={false}
              className="page-scene--dashboard__scroller"
              viewportRef={viewportRef}
              tabIndex={-1}
            >
              <div
                ref={surfaceRef}
                className="page-scene--dashboard__main"
                data-section={visibleSectionId}
              >
              <div ref={sectionStageRef} className="page-scene--dashboard__section-stage">
              {visibleSectionId === 'overview' ? (
              <section
                id="dash-section-overview"
                className="page-scene--dashboard__section"
                aria-label="Overview"
              >
                <div className="page-scene--dashboard__panel" data-dash-anim>
                  <p className="type-overline mb-0">Overview</p>
                  <h1 className="type-display-md mb-0">Welcome</h1>
                  {summary ? (
                    <dl className="page-scene--dashboard__meta">
                      <div>
                        <dt className="type-caption type-muted">Username</dt>
                        <dd className="type-title mb-0">{summary.username}</dd>
                      </div>
                      <div>
                        <dt className="type-caption type-muted">Type</dt>
                        <dd className="type-title mb-0">
                          {summary.mode === 'sign-up'
                            ? 'Successful sign up'
                            : 'Successful sign in'}
                          {' · '}
                          {summary.kind}
                          {summary.audience ? ` · ${summary.audience}` : ''}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="type-body type-muted mb-0">
                      No session summary yet. Sign in from Home.
                    </p>
                  )}
                </div>
              </section>
              ) : null}

              {visibleSectionId === 'profile' ? (
              <section
                id="dash-section-profile"
                className="page-scene--dashboard__section"
                aria-label="Profile"
              >
                <div data-dash-anim>
                  <p className="type-overline mb-0">Profile</p>
                  <h2 className="type-title mb-0">Profile (test)</h2>
                  <p className="type-body type-muted mb-0 page-scene--dashboard__placeholder">
                    Placeholder section — profile tools land here later.
                  </p>
                </div>
              </section>
              ) : null}

              {visibleSectionId === 'cv' ? (
              <section
                id="dash-section-cv"
                className="page-scene--dashboard__section"
                aria-label="Your CV"
              >
                <div className="page-scene--dashboard__cv" data-dash-anim>
                  <p className="type-overline mb-0">Your CV</p>
                  {cvStatus === 'loading' ? (
                    <p className="type-body type-muted mb-0">Loading your CV…</p>
                  ) : null}
                  {cvStatus === 'error' && cvError ? (
                    <p className="type-body type-muted mb-0" role="alert">
                      {cvError}
                    </p>
                  ) : null}
                  {cvStatus === 'empty' ? (
                    <p className="type-body type-muted mb-0">
                      No CV on file yet. Complete candidate CV intake to see it here.
                    </p>
                  ) : null}
                  {cvStatus === 'ready' && doc ? (
                    <VurifyViewer
                      value={doc}
                      editable={false}
                      className="page-scene--dashboard__viewer"
                    />
                  ) : null}
                </div>
              </section>
              ) : null}

              {isAgency && visibleSectionId === 'interviews' ? (
                <section
                  id="dash-section-interviews"
                  className="page-scene--dashboard__section page-scene--dashboard__section--interviews"
                  aria-label="Interviews"
                >
                  <div className="page-scene--dashboard__interviews-chrome" data-dash-anim>
                    <InterviewCreator
                      className="page-scene--dashboard__interview-creator"
                      scrollRootRef={viewportRef}
                      onEditingChange={handleInterviewEditingChange}
                      onBuilderChange={handleInterviewBuilderChange}
                      onBuilderLeave={handleInterviewBuilderLeave}
                      onCreator2Runtime={handleCreator2Runtime}
                      onTestInterview={(item) => {
                        goInterview({ briefId: item.id })
                      }}
                    />
                  </div>
                </section>
              ) : null}

              {visibleSectionId === 'messages' ? (
              <section
                id="dash-section-messages"
                className="page-scene--dashboard__section"
                aria-label="Messages"
              >
                <div data-dash-anim>
                  <p className="type-overline mb-0">Messages</p>
                  <h2 className="type-title mb-0">Messages (test)</h2>
                  <p className="type-body type-muted mb-0 page-scene--dashboard__placeholder">
                    Placeholder section — inbox / threads land here later.
                  </p>
                </div>
              </section>
              ) : null}

              {visibleSectionId === 'settings' ? (
              <section
                id="dash-section-settings"
                className="page-scene--dashboard__section"
                aria-label="Settings"
              >
                <div data-dash-anim>
                  <p className="type-overline mb-0">Settings</p>
                  <h2 className="type-title mb-0">Settings (test)</h2>
                  <p className="type-body type-muted mb-0 page-scene--dashboard__placeholder">
                    Placeholder section — account preferences land here later.
                  </p>
                </div>
              </section>
              ) : null}
              </div>
              </div>
            </ThemeScroll>
          </div>

          <aside
            className="page-scene--dashboard__chat"
            aria-label="Interview chat space"
            aria-hidden={chatClosed ? true : undefined}
          >
            <DashboardChatPeelResize active={!chatClosed} />
            <DashboardChatSpace
              creator2RuntimeRef={creator2RuntimeRef}
              briefId={creator2Ctx?.briefId ?? null}
              accountId={creator2Ctx?.accountId ?? null}
              overviewPeelTags={creator2Ctx?.peelTags ?? []}
              checkWarnings={creator2Ctx?.checkWarnings ?? []}
              active={!chatClosed}
            />
          </aside>
        </main>
      </ThemeProvider>
    </GsapPageProvider>
  )
}
