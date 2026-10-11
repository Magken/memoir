import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import {
  sceneStackMenuPreviewIdentity,
  type SceneStackMenuPreview,
} from '../lib/menus/sceneStackMenu'
import {
  HOME_NAV_DEFAULT_PREVIEW,
  HOME_NAV_LINKS,
  HOME_SCENE_STACK_FOOTER,
  VURIFY_CONTACT_EMAILS,
} from '../lib/menus/homeNavLinks'
import type { SceneMenuShellContactEntry } from './SceneMenuShell'
import { SceneStackMenuPreviewPanel } from './SceneStackMenuPreviewPanel'
import { ThemeScroll } from './ThemeScroll'
import { VurifyContactForm } from './VurifyContactForm'
import { VurifyMenuButton } from './VurifyMenuButton'

type FooterMode = 'nav' | 'contact'

type HomeFooterProps = {
  /** Close footer peel then scroll to section (from SceneMenuShell). */
  onNavigate: (targetId: string) => void
  /** Dismiss the footer peel entirely (page-entry contact Close). */
  onCloseFooter?: () => void
  /**
   * Shell-owned panel mode. Booking opens set this to `contact` so the peel
   * lands on the booking form (especially on mobile).
   */
  requestedMode?: FooterMode
  /**
   * `page` → Close dismisses peel; `chrome` (header/footer) → Back to nav.
   */
  contactEntry?: SceneMenuShellContactEntry
  /** False after peel fully closes — reset to default explore footer. */
  footerSurface?: boolean
  className?: string
}

type ModePhase = 'idle' | 'out' | 'in'
type PreviewPhase = 'idle' | 'out' | 'in'

const MODE_ANIM_MS = 520
/** Match SceneStackMenu preview out → in slide. */
const PREVIEW_ANIM_MS = 520

/**
 * Home footer underlay: preview · explore · Contact/Socials column.
 * Contact swaps nav chrome out, then a full-band contact form in.
 */
export function HomeFooter({
  onNavigate,
  onCloseFooter,
  requestedMode = 'nav',
  contactEntry = 'chrome',
  footerSurface = false,
  className,
}: HomeFooterProps) {
  const [previewLinkId, setPreviewLinkId] = useState<string | null>(null)
  const [mode, setMode] = useState<FooterMode>(requestedMode)
  /** Local Contact from footer nav always uses Back, even if a prior page entry. */
  const [localChromeContact, setLocalChromeContact] = useState(false)
  const [phase, setPhase] = useState<ModePhase>('idle')
  const [previewPhase, setPreviewPhase] = useState<PreviewPhase>('idle')
  const [reducedMotion, setReducedMotion] = useState(false)
  const modeTimerRef = useRef<number | null>(null)
  const previewExitTimerRef = useRef<number | null>(null)
  const previewEnterTimerRef = useRef<number | null>(null)
  const displayedPreviewRef = useRef<SceneStackMenuPreview>(HOME_NAV_DEFAULT_PREVIEW)
  const [displayedPreview, setDisplayedPreview] =
    useState<SceneStackMenuPreview>(HOME_NAV_DEFAULT_PREVIEW)

  const resolvedPreview: SceneStackMenuPreview =
    HOME_NAV_LINKS.find((link) => link.id === previewLinkId)?.preview ??
    HOME_NAV_DEFAULT_PREVIEW

  const contactItem = HOME_SCENE_STACK_FOOTER.find((item) => item.id === 'contact')
  const socialItems = HOME_SCENE_STACK_FOOTER.filter((item) => item.group === 'social')
  const showClose = contactEntry === 'page' && !localChromeContact && mode === 'contact'

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(
    () => () => {
      if (modeTimerRef.current !== null) window.clearTimeout(modeTimerRef.current)
      if (previewExitTimerRef.current !== null) window.clearTimeout(previewExitTimerRef.current)
      if (previewEnterTimerRef.current !== null) window.clearTimeout(previewEnterTimerRef.current)
    },
    [],
  )

  const switchMode = useCallback(
    (next: FooterMode, instant = false) => {
      if (next === mode && phase === 'idle') return
      if (modeTimerRef.current !== null) {
        window.clearTimeout(modeTimerRef.current)
        modeTimerRef.current = null
      }

      if (instant || reducedMotion) {
        setMode(next)
        setPhase('idle')
        return
      }

      setPhase('out')
      modeTimerRef.current = window.setTimeout(() => {
        setMode(next)
        setPhase('in')
        modeTimerRef.current = window.setTimeout(() => {
          setPhase('idle')
          modeTimerRef.current = null
        }, MODE_ANIM_MS)
      }, MODE_ANIM_MS)
    },
    [mode, phase, reducedMotion],
  )

  // Apply shell booking intent only when it changes (do not fight local Contact / Back).
  useEffect(() => {
    if (modeTimerRef.current !== null) {
      window.clearTimeout(modeTimerRef.current)
      modeTimerRef.current = null
    }
    setMode(requestedMode)
    setPhase('idle')
    if (requestedMode === 'contact') setLocalChromeContact(false)
    if (requestedMode === 'nav') setLocalChromeContact(false)
  }, [requestedMode])

  // After the peel fully closes, always restore default explore/nav (not contact).
  useEffect(() => {
    if (footerSurface) return
    if (modeTimerRef.current !== null) {
      window.clearTimeout(modeTimerRef.current)
      modeTimerRef.current = null
    }
    setMode('nav')
    setLocalChromeContact(false)
    setPhase('idle')
    setPreviewLinkId(null)
  }, [footerSurface])

  useEffect(() => {
    if (contactEntry === 'chrome') setLocalChromeContact(false)
  }, [contactEntry])

  useEffect(() => {
    if (mode !== 'nav') return

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
  }, [mode, reducedMotion, resolvedPreview])

  const openContact = useCallback(() => {
    setLocalChromeContact(true)
    switchMode('contact')
  }, [switchMode])
  const closeContact = useCallback(() => {
    setLocalChromeContact(false)
    switchMode('nav')
  }, [switchMode])
  const dismissFooter = useCallback(() => {
    onCloseFooter?.()
  }, [onCloseFooter])

  const openSocial = useCallback((href: string | undefined, targetId: string) => {
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer')
      return
    }
    onNavigate(targetId)
  }, [onNavigate])

  return (
    <footer
      id="home-footer"
      className={['home-footer', className].filter(Boolean).join(' ')}
      data-mode={mode}
      data-phase={phase}
      aria-label="Site footer"
    >
      {mode === 'nav' ? (
        <div className="home-footer__layout home-footer__layer" data-layer="nav">
          <div
            className="home-footer__preview home-footer__anim-item"
            data-preview-phase={previewPhase}
            aria-live="polite"
          >
            <SceneStackMenuPreviewPanel
              host="footer"
              preview={displayedPreview}
              reducedMotion={reducedMotion}
              motionEnabled={footerSurface}
            />
          </div>

          <nav
            className="home-footer__explore"
            aria-label="Footer destinations"
            onPointerLeave={() => setPreviewLinkId(null)}
          >
            <p className="home-footer__col-label home-footer__anim-item type-overline type-muted">
              Explore
            </p>
            <ul className="home-footer__link-list">
              {HOME_NAV_LINKS.map((link) => {
                const isPreviewed = previewLinkId === link.id
                return (
                  <li key={link.id} className="home-footer__link-item home-footer__anim-item">
                    <VurifyMenuButton
                      size="md"
                      iconNode={link.icon}
                      lineTone={isPreviewed ? 'accent' : 'text'}
                      className={[
                        'home-footer__link-btn',
                        isPreviewed ? 'is-previewed' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onPointerEnter={() => setPreviewLinkId(link.id)}
                      onFocus={() => setPreviewLinkId(link.id)}
                      onClick={() => onNavigate(link.targetId)}
                    >
                      {link.label}
                    </VurifyMenuButton>
                  </li>
                )
              })}
            </ul>
          </nav>

          <section className="home-footer__utility" aria-label="Contact and socials">
            <p className="home-footer__col-label home-footer__anim-item type-overline type-muted">
              Contact
            </p>
            <div className="home-footer__utility-actions home-footer__anim-item">
              {contactItem ? (
                <VurifyMenuButton
                  size="md"
                  housing
                  iconNode={contactItem.icon}
                  lineTone="accent"
                  className="home-footer__contact-open"
                  onClick={openContact}
                >
                  {contactItem.label}
                </VurifyMenuButton>
              ) : null}
              <div className="home-footer__socials" role="group" aria-label="Socials">
                {socialItems.map((item) => (
                  <VurifyMenuButton
                    key={item.id}
                    variant="icon-only"
                    size="sm"
                    iconNode={item.icon}
                    lineTone="muted"
                    aria-label={item.label}
                    className="home-footer__social-btn"
                    onClick={() => openSocial(item.href, item.targetId)}
                  >
                    {item.label}
                  </VurifyMenuButton>
                ))}
              </div>
            </div>
            <ul className="home-footer__emails home-footer__anim-item" aria-label="Email">
              {VURIFY_CONTACT_EMAILS.map((email) => (
                <li key={email}>
                  <a
                    className="home-footer__email-link type-body-sm type-muted"
                    href={`mailto:${email}`}
                  >
                    {email}
                  </a>
                </li>
              ))}
            </ul>
            <p className="home-footer__legal home-footer__anim-item type-caption type-faint">
              © {new Date().getFullYear()} Vurify
            </p>
          </section>
        </div>
      ) : (
        <div className="home-footer__contact-panel home-footer__layer" data-layer="contact">
          <ThemeScroll
            rail="mini"
            scrollClouds={false}
            className="home-footer__contact-scroll"
            tabIndex={-1}
          >
            <div className="home-footer__contact-scroll-inner">
              <header className="home-footer__contact-head home-footer__anim-item">
                {showClose ? (
                  <VurifyMenuButton
                    size="sm"
                    icon={X}
                    lineTone="muted"
                    className="home-footer__contact-back"
                    aria-label="Close contact"
                    onClick={dismissFooter}
                  >
                    Close
                  </VurifyMenuButton>
                ) : (
                  <VurifyMenuButton
                    size="sm"
                    icon={ArrowLeft}
                    lineTone="muted"
                    className="home-footer__contact-back"
                    onClick={closeContact}
                  >
                    Back
                  </VurifyMenuButton>
                )}
                <div className="home-footer__contact-intro">
                  <p className="home-footer__col-label type-overline type-muted">Book now</p>
                  <h2 className="home-footer__contact-title type-display-md">Let’s talk proof</h2>
                  <p className="home-footer__contact-lead type-body-sm type-muted">
                    Tell us what you’re hiring for, or how you want to be seen.
                  </p>
                  <ul className="home-footer__emails" aria-label="Email">
                    {VURIFY_CONTACT_EMAILS.map((email) => (
                      <li key={email}>
                        <a
                          className="home-footer__email-link type-body-sm type-muted"
                          href={`mailto:${email}`}
                        >
                          {email}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </header>
              <div className="home-footer__contact-form-wrap home-footer__anim-item">
                <VurifyContactForm density="compact" />
              </div>
            </div>
          </ThemeScroll>
        </div>
      )}
    </footer>
  )
}
