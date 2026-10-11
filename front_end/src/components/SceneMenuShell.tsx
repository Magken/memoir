import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from 'react'
import { gsap, ScrollTrigger, useGSAP, useGsapPage } from '../lib/gsap'
import { useAppStage } from '../lib/appStage/appStageContext'
import { VURIFY_DASHBOARD_TARGET_ID } from '../lib/menus/homeNavLinks'
import { animateScrollTop, scrollTopForElement } from '../lib/scroll/scrollSpeedCap'
import { getThemeScrollLenis, readThemeScrollTop } from '../lib/scroll/themeScrollLenis'
import {
  sceneMenuFooterTriggerVisible,
  sceneMenuTriggerVisible,
  type SceneStackMenuCategory,
  type SceneStackMenuFooterItem,
} from '../lib/menus/sceneStackMenu'
import type { SceneStackMenuInfoArticle } from '../lib/menus/sceneStackMenuInfo'
import { SceneStackMenu } from './SceneStackMenu'
import { ThemeScroll } from './ThemeScroll'
import { VurifyMenuButton } from './VurifyMenuButton'

export type SceneMenuShellFooterMode = 'nav' | 'contact'

/** Where booking/contact was opened from — drives Back vs Close in the footer panel. */
export type SceneMenuShellContactEntry = 'chrome' | 'page'

export type SceneMenuShellOpenFooterOptions = {
  mode?: SceneMenuShellFooterMode
  /**
   * `chrome` = header / in-footer Contact (Back → footer nav).
   * `page` = landing / Get Started / etc. (Close → dismiss footer peel).
   */
  contactEntry?: SceneMenuShellContactEntry
}

export type SceneMenuShellBookingApi = {
  /** Open the footer peel on the booking/contact panel (or nav). */
  openFooter: (opts?: SceneMenuShellOpenFooterOptions) => void
  /** Shortcut — open footer peel on contact/booking. Defaults to `page` entry. */
  openBooking: (opts?: { source?: SceneMenuShellContactEntry }) => void
}

type SceneMenuShellFooterApi = {
  /** Close the footer peel, then scroll to `#targetId` on reverse-complete. */
  onNavigate: (targetId: string) => void
  /** Dismiss the footer peel (no section scroll). */
  onCloseFooter: () => void
  /** Open footer peel; pass `{ mode: 'contact' }` for booking. */
  openFooter: (opts?: SceneMenuShellOpenFooterOptions) => void
  /** Footer panel mode the underlay should show when the peel opens. */
  footerMode: SceneMenuShellFooterMode
  /** Contact panel dismiss affordance for the current peel. */
  contactEntry: SceneMenuShellContactEntry
  /** True while the footer underlay is elevated (open or closing). */
  footerSurface: boolean
}

type SceneMenuShellProps = {
  children: ReactNode
  categories: readonly SceneStackMenuCategory[]
  footerItems?: readonly SceneStackMenuFooterItem[]
  /**
   * Page footer underlay — sibling layer like the menu (not inside the scroller).
   * Peels open ~¾ VPH upward on reach-bottom overscroll; slide-closes opposite the menu.
   * Pass a node or a render function to receive `onNavigate` / `openFooter` / `footerMode`.
   */
  pageFooter?: ReactNode | ((api: SceneMenuShellFooterApi) => ReactNode)
  label?: string
  onSelect?: (id: string) => void
  /** Optional ref to the internal `.theme-scroll__viewport` (ScrollTrigger scroller). */
  viewportRef?: RefObject<HTMLDivElement | null>
  /** Opens the app-level ScaleCoverModal (Sign up) — owned by the page host. */
  onRequestSignUp?: () => void
  /** Header auth toggle options; defaults to Log in | Sign up. */
  authOptions?: readonly { value: string; label: string }[]
  /**
   * App Stage leave-prep path. Default `/` (Home). Pass `null` on outflow pages
   * so this shell does not clobber Home’s leave prep.
   */
  stageLeavePath?: string | null
  /** Freeze scene scroll (App Stage bootstrap / loading cloud). */
  scrollLocked?: boolean
  /** Reading article for SceneStackMenu info mode — setting it opens the menu peel. */
  infoArticle?: SceneStackMenuInfoArticle | null
  /** Clear info article (Back or peel close). */
  onCloseInfo?: () => void
  /** Page/scenes call `openBooking()` to open the footer contact peel. */
  bookingApiRef?: MutableRefObject<SceneMenuShellBookingApi | null>
}

const DECK_DEPTHS = [3, 2, 1] as const
/** After a wheel open/close, ignore further wheel so the gesture does not scroll the page. */
const WHEEL_SCROLL_BLEED_MS = 480
/** Menu peel travel — page card slides down (fraction of VPH). */
const MENU_PEEL_VPH = 0.8
/** Footer peel travel — page card slides up (¾ VPH). */
const FOOTER_PEEL_VPH = 0.75

const MENU_ITEM_SELECTOR = [
  /* Dashboard owns auth CSS transform on `__dashboard-slot` — animate the inner target instead. */
  '.theme-scene-stack-menu__top-item:not(.theme-scene-stack-menu__dashboard-slot)',
  '.theme-scene-stack-menu__dashboard-anim',
  '.theme-scene-stack-menu__link-item',
  '.theme-scene-stack-menu__preview-panel',
  '.theme-scene-stack-menu__footer-item',
  '.theme-scene-stack-menu__contact-head',
  '.theme-scene-stack-menu__contact-form',
  '.theme-scene-stack-menu__info-head',
  '.theme-scene-stack-menu__info-body',
].join(', ')

const FOOTER_ITEM_SELECTOR = '.home-footer__anim-item'

/**
 * Fixed app stage: menu underlay (top peel) + footer underlay (bottom peel) + scrolling scenes.
 * Menu: peel down · Footer: peel up on reach-bottom · mutual exclusion · stacked deck lips.
 */
export function SceneMenuShell({
  children,
  categories,
  footerItems,
  pageFooter,
  label = 'Scene navigation',
  onSelect,
  viewportRef: externalViewportRef,
  onRequestSignUp,
  authOptions,
  stageLeavePath = '/',
  scrollLocked = false,
  infoArticle = null,
  onCloseInfo,
  bookingApiRef,
}: SceneMenuShellProps) {
  const { goDashboard, registerLeavePrep, stageNavigating } = useAppStage()
  const [open, setOpen] = useState(false)
  const [footerOpen, setFooterOpen] = useState(false)
  /** Keep underlay elevated through close so item animate-out stays visible. */
  const [menuSurface, setMenuSurface] = useState(false)
  const [footerSurface, setFooterSurface] = useState(false)
  const [footerMode, setFooterMode] = useState<SceneMenuShellFooterMode>('nav')
  const [contactEntry, setContactEntry] = useState<SceneMenuShellContactEntry>('chrome')
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  const [activeSceneTargetId, setActiveSceneTargetId] = useState<string | null>('home-scene-1')
  const [sceneTwoReached, setSceneTwoReached] = useState(false)
  const [triggerRiseKey, setTriggerRiseKey] = useState(0)
  const [footerTriggerRiseKey, setFooterTriggerRiseKey] = useState(0)
  const shellRef = useRef<HTMLDivElement>(null)
  const peelRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLElement>(null)
  const footerRef = useRef<HTMLElement>(null)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)
  const localViewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const scenesRef = useRef<HTMLDivElement>(null)
  const pausedVideosRef = useRef<HTMLVideoElement[]>([])
  const pendingAnchorRef = useRef<string | null>(null)
  /** After one underlay fully closes, open the other (no snap-cut). */
  const pendingRevealRef = useRef<'menu' | 'footer' | null>(null)
  const pendingFooterModeRef = useRef<SceneMenuShellFooterMode>('nav')
  const pendingContactEntryRef = useRef<SceneMenuShellContactEntry>('chrome')
  const menuCloseWaitersRef = useRef<Array<() => void>>([])
  const footerCloseWaitersRef = useRef<Array<() => void>>([])
  const wasOpenRef = useRef(false)
  const wasTriggerVisibleRef = useRef(false)
  const wasFooterTriggerVisibleRef = useRef(false)
  const menuTimelineRef = useRef<ReturnType<typeof gsap.timeline> | null>(null)
  const footerTimelineRef = useRef<ReturnType<typeof gsap.timeline> | null>(null)
  const wheelBleedLockUntilRef = useRef(0)
  const openRef = useRef(false)
  const footerOpenRef = useRef(false)
  const menuSurfaceRef = useRef(false)
  const footerSurfaceRef = useRef(false)
  const footerModeRef = useRef<SceneMenuShellFooterMode>('nav')
  /** Rolling scroll sample while free-scrolling (never write while peeled). */
  const lastScrollTopRef = useRef(0)
  /** Frozen offset for the active peel / bootstrap pin — set only in capturePageScroll. */
  const peelLockTopRef = useRef(0)
  /** Play peel only after Lenis teardown (child effect) — not in the same sync turn as setState. */
  const pendingPeelPlayRef = useRef<'menu' | 'footer' | null>(null)
  const { reducedMotion, timing } = useGsapPage()
  const sceneCount = Children.count(children)
  const inputLocked = scrollLocked || stageNavigating
  /** Menu dock — hide while footer owns the stage, and during load / App Stage nav. */
  const triggerVisible = sceneMenuTriggerVisible({
    sceneTwoReached,
    open,
    footerSurface,
    inputLocked,
  })
  const footerTriggerVisible = sceneMenuFooterTriggerVisible({
    footerSurface,
    inputLocked,
  })
  const hasPageFooter = Boolean(pageFooter)
  /**
   * Lenis while the page is freely scrolling only. Peels / bootstrap tear Lenis down and
   * use a native scrollTop pin — `lenis.stop()` desyncs and teleports after close.
   */
  const pageSmooth = !menuSurface && !footerSurface && !inputLocked
  openRef.current = open
  footerOpenRef.current = footerOpen
  menuSurfaceRef.current = menuSurface
  footerSurfaceRef.current = footerSurface
  footerModeRef.current = footerMode
  /**
   * Scroll-up open on landing makes the dock appear already labeled Close.
   * Skip Menu↔Close flip for that reveal — rise-in alone is enough.
   */
  const triggerSwitchAnimation =
    reducedMotion || (open && !sceneTwoReached) ? 'none' : 'flip'

  useEffect(() => {
    if (triggerVisible && !wasTriggerVisibleRef.current) {
      setTriggerRiseKey((key) => key + 1)
    }
    wasTriggerVisibleRef.current = triggerVisible
  }, [triggerVisible])

  useEffect(() => {
    if (footerTriggerVisible && !wasFooterTriggerVisibleRef.current) {
      setFooterTriggerRiseKey((key) => key + 1)
    }
    wasFooterTriggerVisibleRef.current = footerTriggerVisible
  }, [footerTriggerVisible])

  const setViewportNode = (node: HTMLDivElement | null) => {
    localViewportRef.current = node
    if (externalViewportRef) externalViewportRef.current = node
  }

  /** Sync Lenis → native scrollTop before tearing Lenis down for a peel. */
  const capturePageScroll = useCallback(() => {
    const viewport = localViewportRef.current
    if (!viewport) return 0
    const live = readThemeScrollTop(viewport)
    const lockTop = live > 2 ? live : lastScrollTopRef.current
    lastScrollTopRef.current = lockTop
    peelLockTopRef.current = lockTop
    viewport.scrollTop = lockTop
    return lockTop
  }, [])

  const scrollToPendingAnchor = useCallback(() => {
    const anchorId = pendingAnchorRef.current
    pendingAnchorRef.current = null
    if (!anchorId) return

    // Dashboard hops go through goDashboard() + leavePrep (single close). Not pending-anchor.

    if (!localViewportRef.current || !contentRef.current) return
    const target = contentRef.current.querySelector<HTMLElement>(
      `#${CSS.escape(anchorId)}`,
    )
    if (!target) return
    const viewport = localViewportRef.current
    animateScrollTop(viewport, scrollTopForElement(viewport, target), {
      immediate: reducedMotion,
    })
    onSelect?.(anchorId)
  }, [onSelect, reducedMotion])

  // Keep peel timelines stable — callback identity must not rebuild GSAP (revertOnUpdate).
  const scrollToPendingAnchorRef = useRef(scrollToPendingAnchor)
  scrollToPendingAnchorRef.current = scrollToPendingAnchor

  const finishMenuCloseRef = useRef<() => void>(() => {})
  const finishFooterCloseRef = useRef<() => void>(() => {})

  const openMenu = useCallback(() => {
    pendingAnchorRef.current = null
    if (footerSurfaceRef.current) {
      pendingRevealRef.current = 'menu'
      pendingAnchorRef.current = null
      footerTimelineRef.current?.reverse()
      setFooterOpen(false)
      return
    }
    pendingRevealRef.current = null
    capturePageScroll()
    pendingPeelPlayRef.current = 'menu'
    setMenuSurface(true)
    setOpen(true)
  }, [capturePageScroll])

  /** Clear info only after the peel reverse finishes — never mid-close (avoids nav flash). */
  const onCloseInfoRef = useRef(onCloseInfo)
  onCloseInfoRef.current = onCloseInfo

  const infoArticleId = infoArticle?.id ?? null
  const infoReading = Boolean(infoArticleId)
  useEffect(() => {
    if (!infoArticleId) return
    openMenu()
  }, [infoArticleId, openMenu])

  const infoReadingRef = useRef(infoReading)
  infoReadingRef.current = infoReading

  const openFooter = useCallback((opts?: SceneMenuShellOpenFooterOptions) => {
    if (!hasPageFooter) return
    const mode = opts?.mode ?? 'nav'
    const entry = opts?.contactEntry ?? (mode === 'contact' ? 'page' : 'chrome')
    pendingFooterModeRef.current = mode
    pendingContactEntryRef.current = entry
    setFooterMode(mode)
    setContactEntry(entry)
    pendingAnchorRef.current = null
    if (footerSurfaceRef.current || footerOpenRef.current) {
      // Already peeled — just swap panel mode (booking from an open nav footer).
      return
    }
    if (menuSurfaceRef.current) {
      pendingRevealRef.current = 'footer'
      menuTimelineRef.current?.reverse()
      setOpen(false)
      return
    }
    pendingRevealRef.current = null
    capturePageScroll()
    pendingPeelPlayRef.current = 'footer'
    setFooterSurface(true)
    setFooterOpen(true)
  }, [capturePageScroll, hasPageFooter])

  const openBooking = useCallback(
    (opts?: { source?: SceneMenuShellContactEntry }) => {
      openFooter({
        mode: 'contact',
        contactEntry: opts?.source ?? 'page',
      })
    },
    [openFooter],
  )

  const openBookingFromChrome = useCallback(() => {
    openBooking({ source: 'chrome' })
  }, [openBooking])

  useEffect(() => {
    if (!bookingApiRef) return
    bookingApiRef.current = { openFooter, openBooking }
    return () => {
      bookingApiRef.current = null
    }
  }, [bookingApiRef, openBooking, openFooter])

  const closeFooter = useCallback((anchorId: string | null = null) => {
    if (!footerSurfaceRef.current && !footerOpenRef.current) return
    pendingRevealRef.current = null
    pendingAnchorRef.current = anchorId
    footerTimelineRef.current?.reverse()
    setFooterOpen(false)
  }, [])

  const closeMenu = useCallback((anchorId: string | null = null) => {
    if (!menuSurfaceRef.current && !openRef.current) return
    pendingRevealRef.current = null
    pendingAnchorRef.current = anchorId
    // Reverse immediately so wheel can cut an in-progress open without waiting on React.
    menuTimelineRef.current?.reverse()
    setOpen(false)
  }, [])

  const flushMenuCloseWaiters = useCallback(() => {
    const waiters = menuCloseWaitersRef.current
    menuCloseWaitersRef.current = []
    for (const resolve of waiters) resolve()
  }, [])

  const flushFooterCloseWaiters = useCallback(() => {
    const waiters = footerCloseWaitersRef.current
    footerCloseWaitersRef.current = []
    for (const resolve of waiters) resolve()
  }, [])

  /** Await peel reverse — used by App Stage leave prep before dashboard handoff. */
  const closeMenuAndWait = useCallback(() => {
    const timeline = menuTimelineRef.current
    const alreadyClosed =
      (!menuSurfaceRef.current && !openRef.current) ||
      (timeline !== null && !timeline.isActive() && timeline.progress() === 0)
    if (alreadyClosed) {
      openRef.current = false
      menuSurfaceRef.current = false
      onCloseInfoRef.current?.()
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      menuCloseWaitersRef.current.push(resolve)
      closeMenu(null)
      // reverse() on an already-reversed timeline does not re-fire onReverseComplete.
      window.requestAnimationFrame(() => {
        const tl = menuTimelineRef.current
        if (tl && !tl.isActive() && tl.progress() === 0) {
          finishMenuCloseRef.current()
        }
      })
    })
  }, [closeMenu, flushMenuCloseWaiters])

  const closeFooterAndWait = useCallback(() => {
    const timeline = footerTimelineRef.current
    const alreadyClosed =
      (!footerSurfaceRef.current && !footerOpenRef.current) ||
      (timeline !== null && !timeline.isActive() && timeline.progress() === 0)
    if (alreadyClosed) {
      footerOpenRef.current = false
      footerSurfaceRef.current = false
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      footerCloseWaitersRef.current.push(resolve)
      closeFooter(null)
      window.requestAnimationFrame(() => {
        const tl = footerTimelineRef.current
        if (tl && !tl.isActive() && tl.progress() === 0) {
          footerOpenRef.current = false
          footerSurfaceRef.current = false
          flushFooterCloseWaiters()
        }
      })
    })
  }, [closeFooter, flushFooterCloseWaiters])

  const leavePrep = useCallback(async () => {
    // Stage hop — do not scroll/select after reverse.
    pendingAnchorRef.current = null
    pendingRevealRef.current = null
    await closeFooterAndWait()
    await closeMenuAndWait()
  }, [closeFooterAndWait, closeMenuAndWait])

  useEffect(() => {
    if (!stageLeavePath) return
    registerLeavePrep(stageLeavePath, leavePrep)
    return () => registerLeavePrep(stageLeavePath, null)
  }, [leavePrep, registerLeavePrep, stageLeavePath])

  finishMenuCloseRef.current = () => {
    // Sync refs before goDashboard leave-prep reads them (React setState is async).
    openRef.current = false
    menuSurfaceRef.current = false
    setMenuSurface(false)
    // Drop info after the peel is fully closed so nav never mounts mid-close.
    onCloseInfoRef.current?.()
    flushMenuCloseWaiters()
    scrollToPendingAnchorRef.current()
    const next = pendingRevealRef.current
    pendingRevealRef.current = null
    if (next === 'footer') {
      setFooterMode(pendingFooterModeRef.current)
      setContactEntry(pendingContactEntryRef.current)
      pendingPeelPlayRef.current = 'footer'
      setFooterSurface(true)
      setFooterOpen(true)
    }
  }

  finishFooterCloseRef.current = () => {
    footerOpenRef.current = false
    footerSurfaceRef.current = false
    setFooterSurface(false)
    pendingFooterModeRef.current = 'nav'
    pendingContactEntryRef.current = 'chrome'
    setFooterMode('nav')
    setContactEntry('chrome')
    flushFooterCloseWaiters()
    scrollToPendingAnchorRef.current()
    const next = pendingRevealRef.current
    pendingRevealRef.current = null
    if (next === 'menu') {
      pendingPeelPlayRef.current = 'menu'
      setMenuSurface(true)
      setOpen(true)
    }
  }

  useEffect(() => {
    const root = document.documentElement
    const previous = root.dataset.sceneScroll
    root.dataset.sceneScroll = 'internal'
    return () => {
      if (previous) root.dataset.sceneScroll = previous
      else delete root.dataset.sceneScroll
    }
  }, [])

  useGSAP(
    () => {
      const peel = peelRef.current
      if (!peel) return

      const snapClosed = () => {
        // Layout `top` only — never leave a transform on the peel (scrollport kill).
        gsap.set(peel, { top: 0, clearProps: 'y,transform' })
      }

      const duration = reducedMotion ? timing.duration.instant : timing.duration.page
      const defaults = { duration, ease: timing.ease.default, force3D: false }

      const menuTimeline = gsap
        .timeline({
          paused: true,
          defaults,
          onReverseComplete: () => {
            snapClosed()
            finishMenuCloseRef.current()
          },
        })
        .fromTo(
          peel,
          { top: 0 },
          {
            top: () => Math.round(window.innerHeight * MENU_PEEL_VPH),
            immediateRender: false,
          },
          0,
        )

      const footerTimeline = gsap
        .timeline({
          paused: true,
          defaults,
          onReverseComplete: () => {
            snapClosed()
            finishFooterCloseRef.current()
          },
        })
        .fromTo(
          peel,
          { top: 0 },
          {
            top: () => -Math.round(window.innerHeight * FOOTER_PEEL_VPH),
            immediateRender: false,
          },
          0,
        )

      snapClosed()
      menuTimelineRef.current = menuTimeline
      footerTimelineRef.current = hasPageFooter ? footerTimeline : null

      // Rest closed: hide footer anim items so open never flashes full opacity.
      if (hasPageFooter && footerRef.current) {
        gsap.set(footerRef.current.querySelectorAll(FOOTER_ITEM_SELECTOR), {
          autoAlpha: 0,
          xPercent: reducedMotion ? 0 : 100,
        })
      }
      if (menuRef.current) {
        gsap.set(menuRef.current.querySelectorAll(MENU_ITEM_SELECTOR), {
          autoAlpha: 0,
          xPercent: reducedMotion ? 0 : 100,
        })
      }

      return () => {
        menuTimeline.kill()
        footerTimeline.kill()
        menuTimelineRef.current = null
        footerTimelineRef.current = null
        snapClosed()
      }
    },
    {
      scope: shellRef,
      dependencies: [
        reducedMotion,
        hasPageFooter,
        timing.duration.instant,
        timing.duration.page,
        timing.ease.default,
      ],
      revertOnUpdate: true,
    },
  )

  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const menuItems = Array.from(menu.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR))
    if (!menuItems.length) return

    // Codrops MultiLevelMenu item ease / timing (ref.multi-level-menu).
    const itemDuration = reducedMotion ? timing.duration.instant : 0.52
    const itemStagger = reducedMotion ? 0 : 0.045
    const itemEase = 'power2.inOut'
    const timeline = menuTimelineRef.current

    if (open) {
      if (!timeline || (timeline.progress() === 0 && !timeline.isActive())) {
        gsap.set(menuItems, {
          autoAlpha: 0,
          xPercent: reducedMotion ? 0 : 100,
          force3D: true,
        })
      }
      timeline?.play()
      const openItems = gsap.to(menuItems, {
        autoAlpha: 1,
        xPercent: 0,
        duration: itemDuration,
        ease: itemEase,
        stagger: itemStagger,
        overwrite: 'auto',
        // Drop inline transforms so category CSS in/out can own motion afterward.
        clearProps: 'transform',
      })
      return () => {
        openItems.kill()
      }
    }

    // Rest (never opened): stay hidden — no fake close tween on mount.
    if (!menuSurfaceRef.current) {
      gsap.set(menuItems, {
        autoAlpha: 0,
        xPercent: reducedMotion ? 0 : 100,
      })
      return
    }

    // Closing from info reading: keep the article visible; peel reverse owns the exit.
    // Switching to nav mid-close was causing menu chrome to animate in then out.
    if (infoReadingRef.current) {
      return
    }

    // Closing: peel reverse is owned by closeMenu; items slide out while surface stays up.
    const closeItems = gsap.to(menuItems, {
      autoAlpha: 0,
      xPercent: reducedMotion ? 0 : -100,
      duration: itemDuration,
      ease: itemEase,
      stagger: itemStagger,
      overwrite: 'auto',
      force3D: true,
    })
    return () => {
      closeItems.kill()
    }
  }, [open, reducedMotion, timing.duration.instant, infoArticleId])

  useEffect(() => {
    const footer = footerRef.current
    if (!footer || !hasPageFooter) return

    const footerItems = Array.from(footer.querySelectorAll<HTMLElement>(FOOTER_ITEM_SELECTOR))
    if (!footerItems.length) return

    const itemDuration = reducedMotion ? timing.duration.instant : 0.52
    const itemStagger = reducedMotion ? 0 : 0.045
    const itemEase = 'power2.inOut'
    const timeline = footerTimelineRef.current

    if (footerOpen) {
      if (!timeline || (timeline.progress() === 0 && !timeline.isActive())) {
        gsap.set(footerItems, {
          autoAlpha: 0,
          xPercent: reducedMotion ? 0 : 100,
          force3D: true,
        })
      }
      timeline?.play()
      const openItems = gsap.to(footerItems, {
        autoAlpha: 1,
        xPercent: 0,
        duration: itemDuration,
        ease: itemEase,
        stagger: itemStagger,
        overwrite: 'auto',
        clearProps: 'transform',
      })
      return () => {
        openItems.kill()
      }
    }

    if (!footerSurfaceRef.current) {
      gsap.set(footerItems, {
        autoAlpha: 0,
        xPercent: reducedMotion ? 0 : 100,
      })
      return
    }

    const closeItems = gsap.to(footerItems, {
      autoAlpha: 0,
      xPercent: reducedMotion ? 0 : -100,
      duration: itemDuration,
      ease: itemEase,
      stagger: itemStagger,
      overwrite: 'auto',
      force3D: true,
    })
    return () => {
      closeItems.kill()
    }
  }, [footerOpen, hasPageFooter, reducedMotion, timing.duration.instant])

  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    if (open) {
      menu.removeAttribute('inert')
      return
    }
    menu.setAttribute('inert', '')
  }, [open])

  useEffect(() => {
    const footer = footerRef.current
    if (!footer) return
    if (footerOpen) {
      footer.removeAttribute('inert')
      return
    }
    footer.setAttribute('inert', '')
  }, [footerOpen])

  useEffect(() => {
    if (wasOpenRef.current && !open && !menuSurface) {
      triggerButtonRef.current?.focus({ preventScroll: true })
    }
    wasOpenRef.current = open
  }, [open, menuSurface])

  useEffect(() => {
    const eitherOpen = open || footerOpen || menuSurface || footerSurface
    if (eitherOpen) {
      const playingVideos = Array.from(
        shellRef.current?.querySelectorAll('video') ?? [],
      ).filter((video) => !video.paused && !video.ended)
      playingVideos.forEach((video) => video.pause())
      pausedVideosRef.current = playingVideos
      return
    }

    const pausedVideos = pausedVideosRef.current
    pausedVideosRef.current = []
    pausedVideos.forEach((video) => {
      if (!video.isConnected) return
      void video.play().catch(() => {
        // Browser autoplay policy may require a fresh user gesture.
      })
    })
  }, [open, footerOpen, menuSurface, footerSurface])

  useEffect(() => {
    const viewport = localViewportRef.current
    const scenesRoot = scenesRef.current
    if (!viewport || !scenesRoot) return

    const syncActiveScene = () => {
      const top = readThemeScrollTop(viewport)
      // Never overwrite the peel lock sample while Lenis is tearing down / pin is active.
      if (!menuSurfaceRef.current && !footerSurfaceRef.current) {
        lastScrollTopRef.current = top
      }
      if (open || footerOpen || menuSurfaceRef.current || footerSurfaceRef.current) return
      const scenes = Array.from(scenesRoot.children) as HTMLElement[]
      if (scenes.length === 0) return
      const sceneTwo = scenes[1]
      setSceneTwoReached(Boolean(sceneTwo && top >= sceneTwo.offsetTop - 1))
      const mid = top + viewport.clientHeight / 2
      let best = 0
      for (let index = 0; index < scenes.length; index += 1) {
        const scene = scenes[index]
        if (!scene) continue
        const sceneTop = scene.offsetTop
        const bottom = sceneTop + scene.offsetHeight
        if (mid >= sceneTop && mid < bottom) {
          best = index
          break
        }
        if (mid >= bottom) best = index
      }
      setActiveSceneIndex(Math.max(0, Math.min(sceneCount - 1, best)))
      setActiveSceneTargetId(scenes[best]?.id ?? null)
    }

    viewport.addEventListener('scroll', syncActiveScene, { passive: true })
    syncActiveScene()
    return () => viewport.removeEventListener('scroll', syncActiveScene)
  }, [open, footerOpen, menuSurface, footerSurface, sceneCount, children])

  useEffect(() => {
    if (!open && !footerOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (open) closeMenu(null)
      else if (footerOpen) closeFooter(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeFooter, closeMenu, footerOpen, open])

  // Native scrollTop pin while peel / bootstrap owns the stage (Lenis is off via pageSmooth).
  // Child Lenis destroy runs first in this commit — then we pin and play the peel.
  useEffect(() => {
    const viewport = localViewportRef.current
    if (!viewport) return
    if (!menuSurface && !footerSurface && !inputLocked) return

    const liveTop = readThemeScrollTop(viewport)
    const lockedTop = scrollLocked
      ? 0
      : peelLockTopRef.current || lastScrollTopRef.current || liveTop
    viewport.scrollTop = lockedTop
    const freeze = () => {
      if (viewport.scrollTop === lockedTop) return
      viewport.scrollTop = lockedTop
    }
    viewport.addEventListener('scroll', freeze)
    freeze()

    const pending = pendingPeelPlayRef.current
    if (pending === 'menu' && menuSurface) {
      pendingPeelPlayRef.current = null
      menuTimelineRef.current?.play()
    } else if (pending === 'footer' && footerSurface) {
      pendingPeelPlayRef.current = null
      footerTimelineRef.current?.play()
    }

    return () => {
      viewport.removeEventListener('scroll', freeze)
      // Leave scroll at lockedTop so a fresh Lenis mounts from the correct offset.
      viewport.scrollTop = lockedTop
      peelLockTopRef.current = lockedTop
      lastScrollTopRef.current = lockedTop
    }
  }, [menuSurface, footerSurface, inputLocked, scrollLocked])

  // After peel close, Lenis remounts in the child effect first — re-sync + one ST refresh.
  useEffect(() => {
    if (!pageSmooth) return
    const viewport = localViewportRef.current
    if (!viewport) return
    const top = peelLockTopRef.current || lastScrollTopRef.current
    viewport.scrollTop = top
    const lenis = getThemeScrollLenis(viewport)
    lenis?.scrollTo(top, { immediate: true, force: true })
    ScrollTrigger.refresh()
  }, [pageSmooth])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return
      // Only own wheels that belong to this stage (not other page chrome).
      if (!shell.contains(event.target as Node)) return
      if (inputLocked) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      const now = performance.now()
      if (now < wheelBleedLockUntilRef.current) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (event.deltaY === 0) return

      const isMenuOpen = openRef.current
      const isFooterOpen = footerOpenRef.current
      const menuSurfaceActive = menuSurfaceRef.current
      const footerSurfaceActive = footerSurfaceRef.current
      const menuTimeline = menuTimelineRef.current
      const footerTimeline = footerTimelineRef.current
      const menuProgress = menuTimeline?.progress() ?? 0
      const footerProgress = footerTimeline?.progress() ?? 0
      const menuActive = menuTimeline?.isActive() ?? false
      const footerActive = footerTimeline?.isActive() ?? false
      const viewport = localViewportRef.current
      const scrollTop = viewport ? readThemeScrollTop(viewport) : 0
      const atLandingTop = Boolean(viewport && scrollTop <= 2)
      const atScenesEnd = Boolean(
        viewport && scrollTop + viewport.clientHeight >= viewport.scrollHeight - 2,
      )
      const scrollingUp = event.deltaY < 0
      const scrollingDown = event.deltaY > 0

      // —— Footer peel (bottom): lock while surface / mid-flight ——
      if (hasPageFooter && (footerSurfaceActive || footerProgress > 0 || footerActive)) {
        // Contact panel: nested ThemeScroll owns the gesture (same as menu info reading).
        // Do not peel-close on wheel — Close / Back dismisses.
        if (footerModeRef.current === 'contact') {
          const contactViewport = shell.querySelector(
            '.home-footer__contact-scroll .theme-scroll__viewport',
          )
          if (
            contactViewport instanceof Element &&
            contactViewport.contains(event.target as Node)
          ) {
            return
          }
          event.preventDefault()
          event.stopPropagation()
          return
        }

        event.preventDefault()
        event.stopPropagation()

        if (footerSurfaceActive || footerProgress > 0) {
          if (scrollingUp) {
            wheelBleedLockUntilRef.current = now + WHEEL_SCROLL_BLEED_MS
            closeFooter(null)
          } else if (!isFooterOpen && scrollingDown) {
            openFooter()
          }
        }
        return
      }

      if (
        hasPageFooter &&
        !menuSurfaceActive &&
        menuProgress === 0 &&
        !menuActive &&
        !footerSurfaceActive &&
        footerProgress === 0 &&
        !footerActive &&
        atScenesEnd &&
        scrollingDown
      ) {
        wheelBleedLockUntilRef.current = now + WHEEL_SCROLL_BLEED_MS
        openFooter()
        event.preventDefault()
        event.stopPropagation()
        return
      }

      // —— Menu peel (top): scroll up opens · scroll down closes ——
      // Info reading mode: do not close on wheel — let the article ThemeScroll move.
      if (infoReadingRef.current && (menuSurfaceActive || isMenuOpen || menuProgress > 0 || menuActive)) {
        const infoViewport = shell.querySelector(
          '.theme-scene-stack-menu__info-scroll .theme-scroll__viewport',
        )
        if (infoViewport instanceof Element && infoViewport.contains(event.target as Node)) {
          // Nested article scroll owns the gesture.
          return
        }
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (
        !menuSurfaceActive &&
        menuProgress === 0 &&
        !menuActive &&
        atLandingTop &&
        scrollingUp
      ) {
        wheelBleedLockUntilRef.current = now + WHEEL_SCROLL_BLEED_MS
        openMenu()
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (!menuSurfaceActive && menuProgress === 0 && !menuActive) return

      event.preventDefault()
      event.stopPropagation()

      if (scrollingDown && (menuSurfaceActive || menuProgress > 0)) {
        wheelBleedLockUntilRef.current = now + WHEEL_SCROLL_BLEED_MS
        closeMenu(null)
        return
      }

      if (scrollingUp && !isMenuOpen && menuProgress > 0) {
        openMenu()
      }
    }

    // Window capture runs before ThemeScroll nested wheel.
    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    return () => window.removeEventListener('wheel', onWheel, { capture: true })
  }, [closeFooter, closeMenu, hasPageFooter, inputLocked, openFooter, openMenu])

  const footerContent =
    typeof pageFooter === 'function'
      ? pageFooter({
          onNavigate: (targetId) => closeFooter(targetId),
          onCloseFooter: () => closeFooter(null),
          openFooter,
          footerMode,
          contactEntry,
          footerSurface,
        })
      : pageFooter

  return (
    <div
      ref={shellRef}
      className="theme-scene-menu-shell"
      data-menu-open={open ? 'true' : 'false'}
      data-menu-surface={menuSurface ? 'true' : 'false'}
      data-footer-open={footerOpen ? 'true' : 'false'}
      data-footer-surface={footerSurface ? 'true' : 'false'}
      data-trigger-visible={triggerVisible ? 'true' : 'false'}
      data-footer-trigger-visible={footerTriggerVisible ? 'true' : 'false'}
      data-active-scene-index={activeSceneIndex}
      data-scroll-locked={inputLocked ? 'true' : undefined}
    >
      <nav
        ref={menuRef}
        className="theme-scene-menu-shell__menu"
        aria-label={label}
        aria-hidden={!open}
      >
        <SceneStackMenu
          categories={categories}
          footerItems={footerItems}
          label={label}
          selectedTargetId={activeSceneTargetId}
          menuOpen={open}
          onRequestSignUp={onRequestSignUp}
          onRequestBooking={openBookingFromChrome}
          authOptions={authOptions}
          infoArticle={infoArticle}
          onCloseInfo={onCloseInfo}
          onSelect={(targetId) => {
            // One close path for dashboard: leavePrep inside goDashboard (same as sign-in / sign-up).
            if (targetId === VURIFY_DASHBOARD_TARGET_ID) {
              goDashboard()
              return
            }
            closeMenu(targetId)
          }}
        />
      </nav>

      {footerContent ? (
        <aside
          ref={footerRef}
          className="theme-scene-menu-shell__footer"
          aria-label="Site footer"
          aria-hidden={!footerOpen}
        >
          {footerContent}
        </aside>
      ) : null}

      <div className="theme-scene-menu-shell__trigger">
        <div className="theme-scene-menu-shell__trigger-slot">
          <div className="theme-scene-menu-shell__trigger-clip">
            <VurifyMenuButton
              ref={triggerButtonRef}
              aria-expanded={open}
              housing
              activeChrome={false}
              switchAnimation={triggerSwitchAnimation}
              riseReplayKey={reducedMotion ? undefined : triggerRiseKey}
              onClick={() => {
                if (open) closeMenu(null)
                else openMenu()
              }}
            >
              {open ? 'Close' : 'Menu'}
            </VurifyMenuButton>
          </div>
          {hasPageFooter ? (
            <div className="theme-scene-menu-shell__footer-trigger-clip">
              <VurifyMenuButton
                aria-expanded={footerOpen}
                housing
                activeChrome={false}
                switchAnimation="none"
                riseReplayKey={reducedMotion ? undefined : footerTriggerRiseKey}
                onClick={() => closeFooter(null)}
              >
                Close
              </VurifyMenuButton>
            </div>
          ) : null}
        </div>
      </div>

      <div ref={peelRef} className="theme-scene-menu-shell__peel">
        <div
          className="theme-scene-menu-shell__deck theme-scene-menu-shell__deck--menu"
          aria-hidden="true"
        >
          {DECK_DEPTHS.map((depth) => (
            <div
              key={`menu-${depth}`}
              className="theme-scene-menu-shell__deck-card"
              data-depth={depth}
              data-edge="top"
            />
          ))}
        </div>
        {hasPageFooter ? (
          <div
            className="theme-scene-menu-shell__deck theme-scene-menu-shell__deck--footer"
            aria-hidden="true"
          >
            {DECK_DEPTHS.map((depth) => (
              <div
                key={`footer-${depth}`}
                className="theme-scene-menu-shell__deck-card"
                data-depth={depth}
                data-edge="bottom"
              />
            ))}
          </div>
        ) : null}

        <ThemeScroll
          rail="mini"
          smooth={pageSmooth}
          scrollClouds={false}
          className="theme-scene-menu-shell__scroller"
          viewportRef={{
            get current() {
              return localViewportRef.current
            },
            set current(node: HTMLDivElement | null) {
              setViewportNode(node)
            },
          }}
          tabIndex={-1}
        >
          <div ref={contentRef} className="theme-scene-menu-shell__surface">
            <div ref={scenesRef} className="theme-scene-menu-shell__scenes">
              {children}
            </div>
          </div>
        </ThemeScroll>
      </div>
    </div>
  )
}
