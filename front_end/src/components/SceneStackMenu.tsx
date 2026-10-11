import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft } from 'lucide-react'
import { useAppStage } from '../lib/appStage/appStageContext'
import {
  sceneStackMenuFindCategory,
  sceneStackMenuPreviewIdentity,
  sceneStackMenuResolvePreview,
  type SceneStackMenuCategory,
  type SceneStackMenuFooterItem,
  type SceneStackMenuPreview,
} from '../lib/menus/sceneStackMenu'
import type { SceneStackMenuInfoArticle } from '../lib/menus/sceneStackMenuInfo'
import {
  HOME_SCENE_STACK_AUTH_OPTIONS,
  HOME_SCENE_STACK_DASHBOARD,
  VURIFY_BOOK_NOW_TARGET_ID,
  VURIFY_CONTACT_TARGET_ID,
  VURIFY_LOGIN_TARGET_ID,
  VURIFY_SIGN_UP_TARGET_ID,
  homeNavLinkIdForTargetId,
} from '../lib/menus/homeNavLinks'
import { getSession, onAuthStateChange, signOut } from '../lib/authApi'
import { hasSupabasePublicConfig } from '../lib/dataApi'
import { getMyProfile } from '../lib/userApi'
import { RadioGroup } from './RadioGroup'
import { PointerFollowDeck } from './PointerFollowDeck'
import { SceneStackMenuPreviewPanel } from './SceneStackMenuPreviewPanel'
import { ThemeScroll } from './ThemeScroll'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifyAvatar } from './VurifyAvatar'
import { VurifyContactForm } from './VurifyContactForm'
import { VurifyLoginForm } from './VurifyLoginForm'

type SceneStackMenuProps = {
  categories: readonly SceneStackMenuCategory[]
  footerItems?: readonly SceneStackMenuFooterItem[]
  /** Current route/page category; defaults to the first category. */
  selectedCategoryId?: string
  /**
   * Live scene element id from the page scroller (`home-scene-2`, …).
   * Marks the matching subsection link as selected (accent underline).
   */
  selectedTargetId?: string | null
  /** When false, soft-reset to initial nav (no remount — avoids open/close jitter). */
  menuOpen?: boolean
  /** Opens the page-owned ScaleCoverModal for Sign up. */
  onRequestSignUp?: () => void
  /** Opens the footer booking/contact peel (Book now + Contact). */
  onRequestBooking?: () => void
  /** Header options: Book now is split out of the Sign in/out swap. Defaults to Log in | Sign up. */
  authOptions?: readonly { value: string; label: string }[]
  label?: string
  /** Called with a link `targetId` when a lower-layer item is activated. */
  onSelect?: (targetId: string) => void
  /**
   * Reading article for `info` mode (text + images). When set while the peel is open,
   * swaps chrome like login/contact. Cleared via Back or peel close.
   */
  infoArticle?: SceneStackMenuInfoArticle | null
  /** Peel close clears `infoArticle` (info mode has no Back — Close dismisses). */
  onCloseInfo?: () => void
  className?: string
}

type MenuProfile = {
  avatarUrl: string | null
  displayName: string | null
  username: string | null
}

function authEnvConfigured(): boolean {
  return hasSupabasePublicConfig()
}

function profileFromRow(row: Record<string, unknown> | null): MenuProfile {
  if (!row) return { avatarUrl: null, displayName: null, username: null }
  const avatarUrl = typeof row.avatar_url === 'string' ? row.avatar_url : null
  const displayName = typeof row.display_name === 'string' ? row.display_name : null
  const username = typeof row.username === 'string' ? row.username : null
  return { avatarUrl, displayName, username }
}

const ITEM_ANIM_MS = 520
const ITEM_STAGGER_MS = 45
/** Preview has no stagger — exit/enter are a single slide. */
const PREVIEW_ANIM_MS = ITEM_ANIM_MS
const MODE_ANIM_MS = ITEM_ANIM_MS

/** Wait only for the last rendered item, not the six-slot CSS stagger ceiling. */
function categoryAnimationMs(itemCount: number) {
  return ITEM_ANIM_MS + Math.max(itemCount - 1, 0) * ITEM_STAGGER_MS
}

function MenuInfoVideo({
  src,
  alt,
  active,
}: {
  src: string
  alt: string
  active: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (active) {
      void el.play().catch(() => undefined)
      return
    }
    el.pause()
  }, [active, src])

  return (
    <video
      ref={videoRef}
      className="theme-scene-stack-menu__info-video"
      src={src}
      autoPlay={active}
      muted
      loop
      playsInline
      preload={active ? 'metadata' : 'none'}
      aria-label={alt}
    />
  )
}

type CategoryPhase = 'idle' | 'out' | 'in'
type CategoryDirection = 'forward' | 'back'
type PreviewPhase = 'idle' | 'out' | 'in'
type MenuMode = 'nav' | 'contact' | 'login' | 'info'
type ModePhase = 'idle' | 'out' | 'in'

/**
 * Three-zone layered menu: top category tabs, lower-left icon links,
 * lower-right media/text preview that follows hover/focus.
 * Contact utility swaps chrome out for a full-panel contact form.
 * Log in opens VurifyLoginForm; Sign up opens ScaleCoverModal stub (Vurify toggle).
 * Info mode is a scrollable reading panel (text + images) for page peels.
 */
export function SceneStackMenu({
  categories,
  footerItems = [],
  selectedCategoryId,
  selectedTargetId = null,
  menuOpen = true,
  onRequestSignUp,
  onRequestBooking,
  authOptions = HOME_SCENE_STACK_AUTH_OPTIONS,
  label = 'Site',
  onSelect,
  infoArticle = null,
  onCloseInfo: _onCloseInfo,
  className,
}: SceneStackMenuProps) {
  const reactId = useId().replace(/:/g, '')
  const bookNowOption =
    authOptions.find((option) => option.value === VURIFY_BOOK_NOW_TARGET_ID) ?? null
  const accountOptions = authOptions.filter(
    (option) => option.value !== VURIFY_BOOK_NOW_TARGET_ID,
  )
  const guestAuthOption = accountOptions.length === 1 ? accountOptions[0] : null
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedId = sceneStackMenuFindCategory(categories, selectedCategoryId)?.id ?? ''
  const initialPreview =
    sceneStackMenuResolvePreview(
      sceneStackMenuFindCategory(categories, selectedId),
      null,
    ) ?? null
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null)
  const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null)
  const [displayedCategoryId, setDisplayedCategoryId] = useState(selectedId)
  const [categoryPhase, setCategoryPhase] = useState<CategoryPhase>('idle')
  const [categoryDirection, setCategoryDirection] = useState<CategoryDirection>('forward')
  const [previewLinkId, setPreviewLinkId] = useState<string | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [menuMode, setMenuMode] = useState<MenuMode>('nav')
  const [modePhase, setModePhase] = useState<ModePhase>('idle')
  const [authTab, setAuthTab] = useState<string>(VURIFY_LOGIN_TARGET_ID)
  const categoryExitTimerRef = useRef<number | null>(null)
  const categoryEnterTimerRef = useRef<number | null>(null)
  const previewExitTimerRef = useRef<number | null>(null)
  const previewEnterTimerRef = useRef<number | null>(null)
  const modeTimerRef = useRef<number | null>(null)
  const [previewPhase, setPreviewPhase] = useState<PreviewPhase>('idle')
  const displayedPreviewRef = useRef<SceneStackMenuPreview | null>(initialPreview)
  const [displayedPreview, setDisplayedPreview] = useState<SceneStackMenuPreview | null>(
    initialPreview,
  )

  const { goHome } = useAppStage()
  // goDashboard is owned by SceneMenuShell after menu close — not here.
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<MenuProfile>({
    avatarUrl: null,
    displayName: null,
    username: null,
  })
  const [signingOut, setSigningOut] = useState(false)
  const authMode = session ? 'member' : 'guest'

  useEffect(() => {
    if (!authEnvConfigured()) return

    let cancelled = false

    const applySession = async (next: Session | null) => {
      if (cancelled) return
      setSession(next)
      if (!next) {
        setProfile({ avatarUrl: null, displayName: null, username: null })
        return
      }
      try {
        const row = (await getMyProfile()) as Record<string, unknown> | null
        if (!cancelled) setProfile(profileFromRow(row))
      } catch {
        if (!cancelled) setProfile({ avatarUrl: null, displayName: null, username: null })
      }
    }

    void getSession()
      .then((s) => applySession(s))
      .catch(() => applySession(null))

    const unsubscribe = onAuthStateChange((_event, next) => {
      void applySession(next)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  /** Soft-reset when the peel closes — keeps GSAP peel items stable (no remount jitter). */
  useEffect(() => {
    if (menuOpen) return
    if (modeTimerRef.current !== null) {
      window.clearTimeout(modeTimerRef.current)
      modeTimerRef.current = null
    }
    // If an article is staged for open, park in info so the peel never flashes nav.
    setMenuMode(infoArticle ? 'info' : 'nav')
    setModePhase('idle')
    setAuthTab(VURIFY_LOGIN_TARGET_ID)
    setHoveredCategoryId(null)
    setFocusedCategoryId(null)
    setPreviewLinkId(null)
    setCategoryPhase('idle')
  }, [menuOpen, infoArticle])

  /**
   * Keep info mode in sync while the peel is open (new article / Back clears article).
   */
  useEffect(() => {
    if (!menuOpen) return
    if (infoArticle) {
      if (menuMode === 'info') return
      if (modeTimerRef.current !== null) {
        window.clearTimeout(modeTimerRef.current)
        modeTimerRef.current = null
      }
      setMenuMode('info')
      setModePhase(reducedMotion ? 'idle' : 'in')
      if (!reducedMotion) {
        modeTimerRef.current = window.setTimeout(() => {
          setModePhase('idle')
          modeTimerRef.current = null
        }, MODE_ANIM_MS)
      }
      return
    }
    if (menuMode === 'info') switchMenuMode('nav')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- article + open drive mode
  }, [infoArticle, menuOpen, reducedMotion])

  const activeCategoryId = hoveredCategoryId ?? focusedCategoryId ?? selectedId

  useEffect(() => {
    if (menuMode !== 'nav') return

    const outgoingItemCount =
      sceneStackMenuFindCategory(categories, displayedCategoryId)?.items.length ?? 0
    const incomingItemCount =
      sceneStackMenuFindCategory(categories, activeCategoryId)?.items.length ?? 0
    const categoryExitMs = categoryAnimationMs(outgoingItemCount)
    const categoryEnterMs = categoryAnimationMs(incomingItemCount)

    if (categoryExitTimerRef.current !== null) {
      window.clearTimeout(categoryExitTimerRef.current)
      categoryExitTimerRef.current = null
    }
    if (categoryEnterTimerRef.current !== null) {
      window.clearTimeout(categoryEnterTimerRef.current)
      categoryEnterTimerRef.current = null
    }

    if (reducedMotion) {
      setDisplayedCategoryId(activeCategoryId)
      setPreviewLinkId(null)
      setCategoryPhase('idle')
      return
    }

    if (activeCategoryId === displayedCategoryId) {
      setCategoryPhase('in')
      categoryEnterTimerRef.current = window.setTimeout(() => {
        setCategoryPhase('idle')
        categoryEnterTimerRef.current = null
      }, categoryEnterMs)
      return
    }

    const fromIndex = categories.findIndex((category) => category.id === displayedCategoryId)
    const toIndex = categories.findIndex((category) => category.id === activeCategoryId)
    setCategoryDirection(
      fromIndex >= 0 && toIndex >= 0 && toIndex < fromIndex ? 'back' : 'forward',
    )
    setCategoryPhase('out')
    categoryExitTimerRef.current = window.setTimeout(() => {
      setDisplayedCategoryId(activeCategoryId)
      setPreviewLinkId(null)
      setCategoryPhase('in')
      categoryExitTimerRef.current = null
      categoryEnterTimerRef.current = window.setTimeout(() => {
        setCategoryPhase('idle')
        categoryEnterTimerRef.current = null
      }, categoryEnterMs)
    }, categoryExitMs)
  }, [activeCategoryId, categories, displayedCategoryId, menuMode, reducedMotion])

  useEffect(
    () => () => {
      if (categoryExitTimerRef.current !== null) {
        window.clearTimeout(categoryExitTimerRef.current)
      }
      if (categoryEnterTimerRef.current !== null) {
        window.clearTimeout(categoryEnterTimerRef.current)
      }
      if (previewExitTimerRef.current !== null) {
        window.clearTimeout(previewExitTimerRef.current)
      }
      if (previewEnterTimerRef.current !== null) {
        window.clearTimeout(previewEnterTimerRef.current)
      }
      if (modeTimerRef.current !== null) {
        window.clearTimeout(modeTimerRef.current)
      }
    },
    [],
  )

  const activeCategory = useMemo(
    () => sceneStackMenuFindCategory(categories, displayedCategoryId),
    [categories, displayedCategoryId],
  )

  const selectedLinkId = useMemo(
    () => homeNavLinkIdForTargetId(selectedTargetId),
    [selectedTargetId],
  )

  const resolvedPreview = useMemo(
    () => sceneStackMenuResolvePreview(activeCategory, previewLinkId ?? selectedLinkId),
    [activeCategory, previewLinkId, selectedLinkId],
  )

  useEffect(() => {
    if (!resolvedPreview || menuMode !== 'nav') return

    const clearPreviewTimers = () => {
      if (previewExitTimerRef.current !== null) {
        window.clearTimeout(previewExitTimerRef.current)
        previewExitTimerRef.current = null
      }
      if (previewEnterTimerRef.current !== null) {
        window.clearTimeout(previewEnterTimerRef.current)
        previewEnterTimerRef.current = null
      }
    }

    // Category out/in already slides the preview — keep content synced, no extra phase.
    if (categoryPhase !== 'idle') {
      clearPreviewTimers()
      setPreviewPhase('idle')
      displayedPreviewRef.current = resolvedPreview
      setDisplayedPreview(resolvedPreview)
      return
    }

    if (
      sceneStackMenuPreviewIdentity(resolvedPreview) ===
      sceneStackMenuPreviewIdentity(displayedPreviewRef.current)
    ) {
      return
    }

    if (reducedMotion) {
      clearPreviewTimers()
      displayedPreviewRef.current = resolvedPreview
      setDisplayedPreview(resolvedPreview)
      setPreviewPhase('idle')
      return
    }

    clearPreviewTimers()
    setPreviewPhase('out')
    previewExitTimerRef.current = window.setTimeout(() => {
      displayedPreviewRef.current = resolvedPreview
      setDisplayedPreview(resolvedPreview)
      setPreviewPhase('in')
      previewExitTimerRef.current = null
      previewEnterTimerRef.current = window.setTimeout(() => {
        setPreviewPhase('idle')
        previewEnterTimerRef.current = null
      }, PREVIEW_ANIM_MS)
    }, PREVIEW_ANIM_MS)
  }, [categoryPhase, menuMode, reducedMotion, resolvedPreview])

  const switchMenuMode = useCallback(
    (next: MenuMode) => {
      if (next === menuMode && modePhase === 'idle') return
      if (modeTimerRef.current !== null) {
        window.clearTimeout(modeTimerRef.current)
        modeTimerRef.current = null
      }

      if (reducedMotion) {
        setMenuMode(next)
        setModePhase('idle')
        return
      }

      setModePhase('out')
      modeTimerRef.current = window.setTimeout(() => {
        setMenuMode(next)
        setModePhase('in')
        modeTimerRef.current = window.setTimeout(() => {
          setModePhase('idle')
          modeTimerRef.current = null
        }, MODE_ANIM_MS)
      }, MODE_ANIM_MS)
    },
    [menuMode, modePhase, reducedMotion],
  )

  const closeContact = useCallback(() => switchMenuMode('nav'), [switchMenuMode])
  const openLogin = useCallback(() => switchMenuMode('login'), [switchMenuMode])
  const closeLogin = useCallback(() => switchMenuMode('nav'), [switchMenuMode])
  const openSignUp = useCallback(() => {
    onRequestSignUp?.()
  }, [onRequestSignUp])

  const onForgotPassword = useCallback(() => {
    // AUTH_FORGOT_PASSWORD_HOTWIRE — open reset flow when wired
  }, [])

  const onVerifyAccount = useCallback(() => {
    // AUTH_VERIFY_ACCOUNT_HOTWIRE — open verify-account flow when wired
  }, [])

  const onSignOut = useCallback(async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
      setSession(null)
      setProfile({ avatarUrl: null, displayName: null, username: null })
      goHome()
    } catch {
      /* session listener still authoritative; keep chrome if sign-out failed */
    } finally {
      setSigningOut(false)
    }
  }, [goHome, signingOut])

  const handleAuthTab = useCallback(
    (value: string) => {
      setAuthTab(value)
      if (value === VURIFY_LOGIN_TARGET_ID) openLogin()
      else if (value === VURIFY_SIGN_UP_TARGET_ID) openSignUp()
      else if (value === VURIFY_BOOK_NOW_TARGET_ID) onRequestBooking?.()
    },
    [onRequestBooking, openLogin, openSignUp],
  )

  const handleSelect = useCallback(
    (targetId: string, href?: string) => {
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer')
        return
      }
      if (targetId === VURIFY_CONTACT_TARGET_ID) {
        onRequestBooking?.()
        return
      }
      if (targetId === VURIFY_LOGIN_TARGET_ID) {
        setAuthTab(VURIFY_LOGIN_TARGET_ID)
        openLogin()
        return
      }
      if (targetId === VURIFY_SIGN_UP_TARGET_ID) {
        setAuthTab(VURIFY_SIGN_UP_TARGET_ID)
        openSignUp()
        return
      }
      if (targetId === VURIFY_BOOK_NOW_TARGET_ID) {
        setAuthTab(VURIFY_BOOK_NOW_TARGET_ID)
        onRequestBooking?.()
        return
      }
      // Dashboard + scene anchors: parent closes peel first, then navigates / scrolls.
      onSelect?.(targetId)
    },
    [onRequestBooking, onSelect, openLogin, openSignUp],
  )

  const previewCategory = useCallback((categoryId: string) => {
    setHoveredCategoryId(categoryId)
    setPreviewLinkId(null)
  }, [])

  const clearCategoryHover = useCallback(() => {
    setHoveredCategoryId(null)
    setPreviewLinkId(null)
  }, [])

  const clearPreviewLink = useCallback(() => {
    setPreviewLinkId(null)
  }, [])

  const handleRootBlur = useCallback((event: ReactFocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) return
    setFocusedCategoryId(null)
    setPreviewLinkId(null)
  }, [])

  const onTopKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!categories.length) return
      const buttons = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>(
          '.theme-scene-stack-menu__top-btn',
        ),
      )
      const currentIndex = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement))
      let nextIndex: number | null = null
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        nextIndex = (currentIndex + 1) % buttons.length
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        nextIndex = (currentIndex - 1 + buttons.length) % buttons.length
      }
      if (nextIndex !== null) buttons[nextIndex]?.focus()
    },
    [categories],
  )

  if (!categories.length || !activeCategory || !displayedPreview) return null

  const tablistId = `${reactId}-tabs`
  const panelId = `${reactId}-panel`

  return (
    <div
      ref={rootRef}
      className={['theme-scene-stack-menu', className].filter(Boolean).join(' ')}
      data-category={activeCategory.id}
      data-has-footer={menuMode === 'nav' && footerItems.length ? 'true' : 'false'}
      data-mode={menuMode}
      data-mode-phase={modePhase}
      onPointerLeave={menuMode === 'nav' ? clearCategoryHover : undefined}
      onBlur={handleRootBlur}
    >
        {menuMode === 'nav' ? (
          <>
            <div
              className="theme-scene-stack-menu__top theme-scene-stack-menu__mode-layer"
              role="group"
              aria-label={`${label} pages`}
              id={tablistId}
              data-auth={authMode}
              onKeyDown={onTopKeyDown}
            >
              <div className="theme-scene-stack-menu__top-start">
                {categories.map((category) => {
                  const selected = category.id === selectedId
                  const previewed = category.id === activeCategoryId
                  return (
                    <span className="theme-scene-stack-menu__top-item" key={category.id}>
                      <VurifyMenuButton
                        id={`${reactId}-tab-${category.id}`}
                        aria-current={selected ? 'page' : undefined}
                        aria-controls={panelId}
                        size="lg"
                        housing
                        iconNode={category.icon}
                        lineTone={selected ? 'accent' : 'text'}
                        className={[
                          'theme-scene-stack-menu__top-btn',
                          selected ? 'is-selected' : '',
                          previewed && !selected ? 'is-previewed' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onPointerEnter={() => previewCategory(category.id)}
                        onFocus={() => {
                          setFocusedCategoryId(category.id)
                          setPreviewLinkId(null)
                        }}
                        onClick={() => previewCategory(category.id)}
                      >
                        {category.label}
                      </VurifyMenuButton>
                    </span>
                  )
                })}
                <span
                  className="theme-scene-stack-menu__top-item theme-scene-stack-menu__dashboard-slot"
                  aria-hidden={authMode !== 'member' || undefined}
                >
                  {/* Inner target for menu open/close GSAP — slot keeps auth CSS transform. */}
                  <span className="theme-scene-stack-menu__dashboard-anim">
                    <VurifyMenuButton
                      size="lg"
                      housing
                      media={
                        <VurifyAvatar
                          src={profile.avatarUrl}
                          name={profile.displayName}
                          username={profile.username}
                          size="sm"
                        />
                      }
                      lineTone="text"
                      className="theme-scene-stack-menu__top-btn theme-scene-stack-menu__dashboard-btn"
                      disabled={authMode !== 'member'}
                      onClick={() => handleSelect(HOME_SCENE_STACK_DASHBOARD.targetId)}
                    >
                      {HOME_SCENE_STACK_DASHBOARD.label}
                    </VurifyMenuButton>
                  </span>
                </span>
              </div>

              <div className="theme-scene-stack-menu__top-end">
                {bookNowOption ? (
                  <span
                    className="theme-scene-stack-menu__top-item theme-scene-stack-menu__book-now-item"
                    role="group"
                    aria-label="Booking"
                  >
                    <VurifyMenuButton
                      size="lg"
                      housing
                      lineTone="accent"
                      activeChrome={false}
                      className="theme-scene-stack-menu__book-now-btn"
                      onClick={() => handleAuthTab(bookNowOption.value)}
                    >
                      {bookNowOption.label}
                    </VurifyMenuButton>
                  </span>
                ) : null}
                <span
                  className="theme-scene-stack-menu__top-item theme-scene-stack-menu__top-auth-item"
                  role="group"
                  aria-label="Account"
                >
                  <span className="theme-scene-stack-menu__auth-swap">
                    <span
                      className="theme-scene-stack-menu__auth-pane theme-scene-stack-menu__auth-pane--guest"
                      aria-hidden={authMode !== 'guest' || undefined}
                    >
                      {accountOptions.length >= 2 ? (
                        <RadioGroup
                          aria-label={accountOptions.map((option) => option.label).join(' or ')}
                          variant="vurify"
                          size="lg"
                          options={[...accountOptions]}
                          value={authTab}
                          onChange={handleAuthTab}
                          className="theme-scene-stack-menu__auth-toggle"
                          disabled={authMode !== 'guest'}
                        />
                      ) : guestAuthOption ? (
                        <VurifyMenuButton
                          size="lg"
                          housing
                          lineTone="accent"
                          activeChrome={false}
                          disabled={authMode !== 'guest'}
                          className="theme-scene-stack-menu__auth-cta"
                          onClick={() => handleAuthTab(guestAuthOption.value)}
                        >
                          {guestAuthOption.label}
                        </VurifyMenuButton>
                      ) : null}
                    </span>
                    <span
                      className="theme-scene-stack-menu__auth-pane theme-scene-stack-menu__auth-pane--member"
                      aria-hidden={authMode !== 'member' || undefined}
                    >
                      <VurifyMenuButton
                        size="lg"
                        housing
                        lineTone="accent"
                        activeChrome={false}
                        loading={signingOut}
                        disabled={authMode !== 'member'}
                        className="theme-scene-stack-menu__sign-out-btn"
                        onClick={() => void onSignOut()}
                      >
                        Sign out
                      </VurifyMenuButton>
                    </span>
                  </span>
                </span>
              </div>
            </div>

            <div
              key={activeCategory.id}
              className="theme-scene-stack-menu__lower theme-scene-stack-menu__mode-layer"
              data-phase={categoryPhase}
              data-direction={categoryDirection}
              id={panelId}
              aria-labelledby={`${reactId}-tab-${activeCategory.id}`}
              onPointerLeave={clearPreviewLink}
            >
              <ul
                key={activeCategory.id}
                className="theme-scene-stack-menu__links"
                aria-label={`${activeCategory.label} links`}
              >
                {activeCategory.items.map((item, index) => {
                  const isSelected = selectedLinkId === item.id
                  const isPreviewed = previewLinkId === item.id
                  return (
                    <li
                      key={item.id}
                      className="theme-scene-stack-menu__link-item"
                      data-stagger={index}
                    >
                      <VurifyMenuButton
                        size="md"
                        iconNode={item.icon}
                        lineTone={isSelected || isPreviewed ? 'accent' : 'text'}
                        className={[
                          'theme-scene-stack-menu__link-btn',
                          isSelected ? 'is-selected' : '',
                          isPreviewed && !isSelected ? 'is-previewed' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onPointerEnter={() => setPreviewLinkId(item.id)}
                        onFocus={() => setPreviewLinkId(item.id)}
                        onClick={() => handleSelect(item.targetId)}
                      >
                        {item.label}
                      </VurifyMenuButton>
                    </li>
                  )
                })}
              </ul>

              <div
                className="theme-scene-stack-menu__preview"
                data-preview-phase={previewPhase}
                aria-live="polite"
              >
                <SceneStackMenuPreviewPanel
                  host="menu"
                  preview={displayedPreview}
                  reducedMotion={reducedMotion}
                  motionEnabled={menuOpen}
                />
              </div>
            </div>

            {footerItems.length ? (
              <footer
                className="theme-scene-stack-menu__footer theme-scene-stack-menu__mode-layer"
                aria-label={`${label} utility links`}
              >
                {(['social', 'utility'] as const).map((group) => {
                  const items = footerItems.filter((item) => (item.group ?? 'utility') === group)
                  if (!items.length) return null
                  return (
                    <div
                      key={group}
                      className="theme-scene-stack-menu__footer-group"
                      data-group={group}
                    >
                      {items.map((item) => {
                        const buttonVariant =
                          item.variant ?? (item.iconOnly ? 'icon-only' : 'label')
                        return (
                          <span className="theme-scene-stack-menu__footer-item" key={item.id}>
                            <VurifyMenuButton
                              variant={buttonVariant}
                              size="sm"
                              iconNode={item.icon}
                              lineTone="accent"
                              aria-label={item.label}
                              className="theme-scene-stack-menu__footer-btn"
                              onClick={() => handleSelect(item.targetId, item.href)}
                            >
                              {item.label}
                            </VurifyMenuButton>
                          </span>
                        )
                      })}
                    </div>
                  )
                })}
              </footer>
            ) : null}
          </>
        ) : menuMode === 'contact' ? (
          <div
            className="theme-scene-stack-menu__contact theme-scene-stack-menu__mode-layer"
            aria-label="Contact"
          >
            <header className="theme-scene-stack-menu__contact-head">
              <VurifyMenuButton
                size="sm"
                icon={ArrowLeft}
                lineTone="muted"
                className="theme-scene-stack-menu__contact-back"
                onClick={closeContact}
              >
                Back
              </VurifyMenuButton>
              <div className="theme-scene-stack-menu__contact-intro">
                <p className="theme-scene-stack-menu__contact-overline type-overline type-muted">
                  Contact
                </p>
                <h2 className="theme-scene-stack-menu__contact-title type-display-md">
                  Let’s talk proof
                </h2>
                <p className="theme-scene-stack-menu__contact-lead type-body-sm type-muted">
                  Tell us what you’re hiring for, or how you want to be seen.
                </p>
              </div>
            </header>
            <div className="theme-scene-stack-menu__contact-form">
              <VurifyContactForm density="compact" />
            </div>
          </div>
        ) : menuMode === 'login' ? (
          <div
            className="theme-scene-stack-menu__login theme-scene-stack-menu__mode-layer"
            aria-label="Log in"
          >
            <ThemeScroll
              rail="mini"
              scrollClouds={false}
              className="theme-scene-stack-menu__login-scroll"
              tabIndex={-1}
            >
              <div className="theme-scene-stack-menu__login-scroll-inner">
                <header className="theme-scene-stack-menu__login-head">
                  <VurifyMenuButton
                    size="sm"
                    icon={ArrowLeft}
                    lineTone="muted"
                    className="theme-scene-stack-menu__login-back"
                    onClick={closeLogin}
                  >
                    Back
                  </VurifyMenuButton>
                  <div className="theme-scene-stack-menu__login-intro">
                    <h2 className="theme-scene-stack-menu__login-title type-display-md">
                      Welcome back
                    </h2>
                    <p className="theme-scene-stack-menu__login-lead type-body-sm type-muted">
                      Don&apos;t have an account?
                    </p>
                  </div>
                  <nav
                    className="theme-scene-stack-menu__login-links"
                    aria-label="Account help"
                  >
                    <div className="theme-scene-stack-menu__login-link-item">
                      <VurifyMenuButton
                        size="md"
                        lineTone="accent"
                        className="theme-scene-stack-menu__login-link"
                        onClick={openSignUp}
                      >
                        Sign up here
                      </VurifyMenuButton>
                    </div>
                    <div className="theme-scene-stack-menu__login-link-item">
                      <VurifyMenuButton
                        size="md"
                        lineTone="accent"
                        className="theme-scene-stack-menu__login-link"
                        onClick={onForgotPassword}
                      >
                        Forgot your password
                      </VurifyMenuButton>
                    </div>
                    <div className="theme-scene-stack-menu__login-link-item">
                      <VurifyMenuButton
                        size="md"
                        lineTone="accent"
                        className="theme-scene-stack-menu__login-link"
                        onClick={onVerifyAccount}
                      >
                        Verify your account
                      </VurifyMenuButton>
                    </div>
                  </nav>
                </header>
                <div className="theme-scene-stack-menu__login-form">
                  <VurifyLoginForm density="compact" />
                </div>
              </div>
            </ThemeScroll>
          </div>
        ) : menuMode === 'info' && infoArticle ? (
          <div
            className="theme-scene-stack-menu__info theme-scene-stack-menu__mode-layer"
            aria-label={infoArticle.title}
            data-has-video={infoArticle.video ? 'true' : undefined}
          >
            <div
              className="theme-scene-stack-menu__info-chrome-spacer"
              aria-hidden="true"
            />
            <div
              className="theme-scene-stack-menu__info-columns"
              data-has-video={infoArticle.video ? 'true' : undefined}
            >
              <ThemeScroll
                rail="hidden"
                scrollClouds
                className="theme-scene-stack-menu__info-scroll"
                tabIndex={-1}
              >
                <article className="theme-scene-stack-menu__info-doc">
                  <header className="theme-scene-stack-menu__info-head">
                    <div className="theme-scene-stack-menu__info-intro">
                      {infoArticle.overline ? (
                        <p className="theme-scene-stack-menu__info-overline type-overline type-muted">
                          {infoArticle.overline}
                        </p>
                      ) : null}
                      <h2 className="theme-scene-stack-menu__info-title">
                        {infoArticle.title}
                      </h2>
                      {infoArticle.lead ? (
                        <p className="theme-scene-stack-menu__info-lead">
                          {infoArticle.lead}
                        </p>
                      ) : null}
                    </div>
                  </header>
                  <div className="theme-scene-stack-menu__info-body">
                    {infoArticle.blocks.map((block, index) => {
                      if (block.type === 'section') {
                        const Icon = block.icon
                        return (
                          <section
                            key={`${infoArticle.id}-sec-${index}`}
                            className="theme-scene-stack-menu__info-section"
                          >
                            <h3 className="theme-scene-stack-menu__info-section-head">
                              <span
                                className="theme-scene-stack-menu__info-section-icon"
                                aria-hidden
                              >
                                <Icon strokeWidth={1.75} />
                              </span>
                              <span className="theme-scene-stack-menu__info-section-title">
                                {block.title}
                              </span>
                            </h3>
                            <p className="theme-scene-stack-menu__info-copy">
                              {block.text}
                            </p>
                          </section>
                        )
                      }
                      if (block.type === 'image') {
                        return (
                          <figure
                            key={`${infoArticle.id}-img-${index}`}
                            className="theme-scene-stack-menu__info-figure"
                          >
                            <PointerFollowDeck
                              className="theme-scene-stack-menu__info-follow"
                              fit="contain"
                              idleWobble
                              motionEnabled={menuOpen}
                            >
                              <img
                                className="theme-scene-stack-menu__info-image"
                                src={block.src}
                                alt={block.alt}
                              />
                            </PointerFollowDeck>
                            {block.caption ? (
                              <figcaption className="theme-scene-stack-menu__info-caption type-caption type-muted">
                                {block.caption}
                              </figcaption>
                            ) : null}
                          </figure>
                        )
                      }
                      if (block.type === 'video') {
                        return (
                          <figure
                            key={`${infoArticle.id}-video-${index}`}
                            className="theme-scene-stack-menu__info-figure theme-scene-stack-menu__info-figure--video"
                          >
                            <MenuInfoVideo
                              src={block.src}
                              alt={block.alt}
                              active={menuOpen}
                            />
                          </figure>
                        )
                      }
                      if (block.type === 'features') {
                        return (
                          <ul
                            key={`${infoArticle.id}-features-${index}`}
                            className="theme-scene-stack-menu__info-features"
                          >
                            {block.items.map((item) => {
                              const Icon = item.icon
                              return (
                                <li
                                  key={item.label}
                                  className="theme-scene-stack-menu__info-feature"
                                >
                                  <span
                                    className="theme-scene-stack-menu__info-feature-icon"
                                    aria-hidden
                                  >
                                    <Icon strokeWidth={1.75} />
                                  </span>
                                  <span className="theme-scene-stack-menu__info-feature-label">
                                    {item.label}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        )
                      }
                      return (
                        <p
                          key={`${infoArticle.id}-p-${index}`}
                          className="theme-scene-stack-menu__info-copy"
                        >
                          {block.text}
                        </p>
                      )
                    })}
                  </div>
                </article>
              </ThemeScroll>
              {infoArticle.video ? (
                <aside className="theme-scene-stack-menu__info-media-rail">
                  <figure className="theme-scene-stack-menu__info-figure theme-scene-stack-menu__info-figure--video">
                    <video
                      className="theme-scene-stack-menu__info-video"
                      src={infoArticle.video.src}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={infoArticle.video.alt}
                    />
                  </figure>
                </aside>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
  )
}
