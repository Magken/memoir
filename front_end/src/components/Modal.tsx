import { useEffect, useId, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { ScrollRailType } from '../lib/scroll/scrollRail'
import { resolveThemePortalMount } from '../lib/theme/themePortal'
import { Button } from './Button'
import { Card, type CardVariant } from './Card'
import { IconButton } from './IconButton'
import { ThemeScroll } from './ThemeScroll'
import { VurifyMenuButton } from './VurifyMenuButton'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

/** `viewport` — fixed overlay on `document.body` · `container` — absolute overlay on positioned parent */
export type ModalPlacement = 'viewport' | 'container'

export const MODAL_SIZE_OPTIONS: readonly { value: ModalSize; label: string }[] = [
  { value: 'sm', label: 'sm — narrow (22rem)' },
  { value: 'md', label: 'md — default (36rem)' },
  { value: 'lg', label: 'lg — wide (48rem)' },
  { value: 'xl', label: 'xl — full sheet (min 90vw)' },
] as const

const modalSizeClass: Record<ModalSize, string> = {
  sm: 'theme-modal__card--sm',
  md: 'theme-modal__card--md',
  lg: 'theme-modal__card--lg',
  xl: 'theme-modal__card--xl',
}

type ModalProps = {
  /** When false, nothing is rendered. */
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  /** Footer cancel. Defaults to `onClose`. Policy Leave can differ from Escape/X. */
  onCancel?: () => void
  onConfirm?: () => void
  confirmLabel?: string
  cancelLabel?: string
  confirmDisabled?: boolean
  /** Viewport-relative width + max-height — body scrolls when content overflows */
  size?: ModalSize
  /** Body scroll rail — default `mini` (micro hairline bar) */
  scrollRail?: ScrollRailType
  /** `viewport` portals to `document.body` · `container` renders in place over a `position: relative` host */
  placement?: ModalPlacement
  /** Panel surface — default `raised`; use `vurify` / `vurify-outlined` for Verify chrome */
  cardVariant?: CardVariant
  /**
   * Footer controls — `button` (default ghost/action Buttons) · `verify` (VurifyMenuButton housing)
   */
  footerStyle?: 'button' | 'vurify'
  /** Vertical hairline between cancel and confirm (vurify / button footers). */
  footerDivider?: boolean
  /** Click backdrop to dismiss — default true */
  closeOnBackdrop?: boolean
  /** Escape calls `onClose` — default true */
  closeOnEscape?: boolean
  /** Footer cancel control. False = omit. */
  showCancel?: boolean
  /** Header X. False = omit. Ignored when `headerEnd` is set. */
  showHeaderClose?: boolean
  /** Right-side header slot (e.g. labeled Close). Replaces the header X. */
  headerEnd?: ReactNode
  className?: string
  debug?: boolean
}

export function Modal({
  open,
  title,
  children,
  onClose,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  size = 'sm',
  scrollRail = 'mini',
  placement = 'viewport',
  cardVariant = 'raised',
  footerStyle = 'button',
  footerDivider = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCancel = true,
  showHeaderClose = true,
  headerEnd,
  className = '',
  debug = false,
}: ModalProps) {
  const titleId = useId()
  const portalMount = useMemo(
    () => (placement === 'viewport' && open ? resolveThemePortalMount(null) : null),
    [placement, open],
  )

  const handleCancel = onCancel ?? onClose

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (closeOnEscape) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, closeOnEscape])

  if (!open) return null

  const showFooterDivider = footerDivider && showCancel && Boolean(onConfirm)
  const footer =
    showCancel || onConfirm ? (
      footerStyle === 'vurify' ? (
        <footer className="theme-modal__footer theme-modal__footer--verify">
          {showCancel ? (
            <VurifyMenuButton
              type="button"
              variant="label"
              size="md"
              housing
              activeChrome={false}
              lineTone={onConfirm ? 'muted' : 'accent'}
              onClick={handleCancel}
            >
              {cancelLabel}
            </VurifyMenuButton>
          ) : null}
          {showFooterDivider ? (
            <span className="theme-modal__footer-divider" aria-hidden />
          ) : null}
          {onConfirm ? (
            <VurifyMenuButton
              type="button"
              variant="label"
              size="md"
              housing
              activeChrome={false}
              lineTone="accent"
              disabled={confirmDisabled}
              onClick={onConfirm}
            >
              {confirmLabel}
            </VurifyMenuButton>
          ) : null}
        </footer>
      ) : (
        <footer className="theme-modal__footer">
          {showCancel ? (
            <Button size="sm" variant="ghost" labelAnim={false} onClick={handleCancel}>
              {cancelLabel}
            </Button>
          ) : null}
          {showFooterDivider ? (
            <span className="theme-modal__footer-divider" aria-hidden />
          ) : null}
          {onConfirm ? (
            <Button
              size="sm"
              variant="action"
              labelAnim={false}
              disabled={confirmDisabled}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          ) : null}
        </footer>
      )
    ) : null

  const shell = (
    <div
      className={[
        placement === 'viewport' ? 'theme' : '',
        'theme-modal',
        placement === 'container' ? 'theme-modal--container' : '',
        debug ? 'theme-modal--debug' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={placement === 'viewport' ? portalMount?.wrapStyle : undefined}
      role="presentation"
    >
      <button
        type="button"
        className="theme-modal__backdrop"
        aria-label="Close dialog"
        onClick={closeOnBackdrop ? onClose : undefined}
        tabIndex={closeOnBackdrop ? 0 : -1}
      />
      <div
        className="theme-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <Card
          variant={cardVariant}
          className={['theme-modal__card', modalSizeClass[size]].filter(Boolean).join(' ')}
        >
          <header className="theme-modal__header">
            <h2 id={titleId} className="theme-modal__title type-h4">
              {title}
            </h2>
            {headerEnd ??
              (showHeaderClose ? (
                <IconButton
                  icon={X}
                  aria-label="Close"
                  size="xs"
                  variant="ghost"
                  onClick={onClose}
                />
              ) : null)}
          </header>
          <div className="theme-modal__body">
            <ThemeScroll
              rail={scrollRail}
              scrollClouds={false}
              className="theme-modal__scroll"
              tabIndex={-1}
            >
              <div className="theme-modal__scroll-inner">{children}</div>
            </ThemeScroll>
          </div>
          {footer}
        </Card>
      </div>
    </div>
  )

  if (placement === 'container') return shell

  return createPortal(shell, portalMount?.parent ?? document.body)
}
