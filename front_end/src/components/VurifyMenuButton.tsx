import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { PageScrollType } from './PageScrollType'
import { TypeAnimText } from './TypeAnimText'

export type VurifyMenuButtonSize = 'sm' | 'md' | 'lg'
/** `label` = underline primary · `fill` = icon+text fill only · `icon-only` = glyph only */
export type VurifyMenuButtonVariant = 'label' | 'fill' | 'icon-only'
export type VurifyMenuButtonLineTone = 'accent' | 'complement' | 'text' | 'muted'
export type VurifyMenuButtonLineStyle = 'solid' | 'double' | 'dashed'
export type VurifyMenuButtonSwitchAnimation = 'none' | 'clip' | 'flip' | 'rise'

type VurifyMenuButtonProps = {
  children: string
  icon?: LucideIcon
  /** Hugeicons node — takes precedence over `icon` when set. */
  iconNode?: IconSvgElement
  /**
   * Custom media (e.g. VurifyAvatar) — replaces icon / iconNode in the icon slot.
   * Stays outside the housing text-rail on `variant="label"`.
   */
  media?: ReactNode
  iconPosition?: 'left' | 'right'
  variant?: VurifyMenuButtonVariant
  size?: VurifyMenuButtonSize
  lineTone?: VurifyMenuButtonLineTone
  lineStyle?: VurifyMenuButtonLineStyle
  /**
   * Busy state — dashed underline marches while waiting (signup / login / Next).
   * Disables the control and sets `aria-busy`.
   */
  loading?: boolean
  /**
   * Same Elara dash-march chrome as `loading`, but keeps the control clickable.
   * Use for Stop / cancel while a turn streams (`loading` alone disables).
   */
  busyChrome?: boolean
  switchAnimation?: VurifyMenuButtonSwitchAnimation
  /**
   * When set, stretch-rise waits for this key to change (e.g. menu trigger dock-in).
   * Works with any `switchAnimation` — entrance uses rise; later label swaps use the switch mode.
   */
  riseReplayKey?: number
  /**
   * 2px border + 4px pad card frame (same as marquee housing). Border transparent at rest;
   * `lineTone` / accent on hover, selected, expanded, or pressed. Label + icon: frame wraps
   * text + underline only — icon stays outside the border.
   */
  housing?: boolean
  /**
   * When false, selected/expanded chrome (square + thick underline) stays off —
   * hover/focus still work. Use for dock Close (not a nav selection).
   */
  activeChrome?: boolean
  /**
   * Animate the text rail away so only the icon remains (keeps `variant="label"`).
   * Prefer this over swapping to `icon-only` when the host needs a collapse motion.
   */
  labelCollapsed?: boolean
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>

/** Match scoped CSS vars in vurify-menu-button.css (duration + stagger). */
const FLIP_DURATION_MS = 560
const FLIP_STAGGER_MS = 60
const FLIP_HANDOFF_MS = 340
const CLIP_DURATION_MS = 420
/** Effect 2 stretch-rise once (~0.9s + short stagger). */
const RISE_DURATION_MS = 980

function flipRunMs(label: string) {
  const units = Math.min(Math.max(label.length, 1), 12)
  return FLIP_DURATION_MS + FLIP_STAGGER_MS * (units - 1)
}

export const VurifyMenuButton = forwardRef<HTMLButtonElement, VurifyMenuButtonProps>(
  function VurifyMenuButton(
    {
      children,
      icon: Icon,
      iconNode,
      media,
      iconPosition = 'left',
      variant = 'label',
      size = 'lg',
      lineTone = 'accent',
      lineStyle = 'solid',
      loading = false,
      busyChrome = false,
      switchAnimation = 'none',
      riseReplayKey,
      housing = false,
      activeChrome = true,
      labelCollapsed = false,
      className,
      type = 'button',
      disabled,
      ...rest
    },
    ref,
  ) {
    const currentChildrenRef = useRef(children)
    const latestChildrenRef = useRef(children)
    latestChildrenRef.current = children
    const switchTimerRef = useRef<number | null>(null)
    const handoffTimerRef = useRef<number | null>(null)
    const [displayedChildren, setDisplayedChildren] = useState(children)
    const [outgoingChildren, setOutgoingChildren] = useState<string | null>(null)
    const [flipPhase, setFlipPhase] = useState<'idle' | 'out' | 'in'>('idle')
    const [clipSwitching, setClipSwitching] = useState(false)
    const [riseSwitching, setRiseSwitching] = useState(false)
    const [riseKey, setRiseKey] = useState(0)
    const riseGateActive = riseReplayKey !== undefined
    const [entered, setEntered] = useState(!riseGateActive)

    const playRise = () => {
      const label = latestChildrenRef.current
      currentChildrenRef.current = label
      setOutgoingChildren(null)
      setFlipPhase('idle')
      setClipSwitching(false)
      setEntered(false)
      setDisplayedChildren(label)
      setRiseKey((key) => key + 1)
      setRiseSwitching(true)
      if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current)
      switchTimerRef.current = window.setTimeout(() => {
        setRiseSwitching(false)
        setEntered(true)
        switchTimerRef.current = null
      }, RISE_DURATION_MS)
    }

    useLayoutEffect(() => {
      if (!riseGateActive) return
      if (riseReplayKey === 0) return
      playRise()
      // Only when the shell bumps the entrance key (Scene 02 dock-in).
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [riseReplayKey, riseGateActive])

    useEffect(() => {
      if (Object.is(children, currentChildrenRef.current)) return

      if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current)
      if (handoffTimerRef.current !== null) window.clearTimeout(handoffTimerRef.current)

      const previousChildren = currentChildrenRef.current
      currentChildrenRef.current = children

      if (riseGateActive && !entered) {
        setDisplayedChildren(children)
        return
      }

      if (switchAnimation === 'none') {
        setDisplayedChildren(children)
        setOutgoingChildren(null)
        setFlipPhase('idle')
        setClipSwitching(false)
        setRiseSwitching(false)
        return
      }

      if (switchAnimation === 'clip') {
        setOutgoingChildren(previousChildren)
        setDisplayedChildren(children)
        setFlipPhase('idle')
        setRiseSwitching(false)
        setClipSwitching(true)
        switchTimerRef.current = window.setTimeout(() => {
          setOutgoingChildren(null)
          setClipSwitching(false)
          switchTimerRef.current = null
        }, CLIP_DURATION_MS)
        return
      }

      if (switchAnimation === 'rise') {
        playRise()
        return
      }

      // flip: out first, then swap + in (avoids competing letter flips)
      setOutgoingChildren(null)
      setClipSwitching(false)
      setRiseSwitching(false)
      setDisplayedChildren(previousChildren)
      setFlipPhase('out')

      handoffTimerRef.current = window.setTimeout(() => {
        setDisplayedChildren(children)
        setFlipPhase('in')
        switchTimerRef.current = window.setTimeout(() => {
          setFlipPhase('idle')
          switchTimerRef.current = null
        }, flipRunMs(children) + 40)
        handoffTimerRef.current = null
      }, Math.min(FLIP_HANDOFF_MS, Math.round(flipRunMs(previousChildren) * 0.62)))
    }, [children, switchAnimation, riseGateActive, entered])

    useEffect(
      () => () => {
        if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current)
        if (handoffTimerRef.current !== null) window.clearTimeout(handoffTimerRef.current)
      },
      [],
    )

    const usesUnderline = variant === 'label'
    const showBusyChrome = Boolean(loading || busyChrome)
    const resolvedLineStyle = showBusyChrome && usesUnderline ? 'dashed' : lineStyle
    const classes = [
      'theme-vurify-menu-button',
      `theme-vurify-menu-button--${variant}`,
      `theme-vurify-menu-button--${size}`,
      `theme-vurify-menu-button--line-${lineTone}`,
      `theme-vurify-menu-button--line-${resolvedLineStyle}`,
      showBusyChrome ? 'theme-vurify-menu-button--loading' : '',
      busyChrome && !loading ? 'theme-vurify-menu-button--busy-chrome' : '',
      housing ? 'theme-vurify-menu-button--housing' : '',
      labelCollapsed && variant === 'label' ? 'theme-vurify-menu-button--label-collapsed' : '',
      (Icon || iconNode || media) && variant === 'label' && iconPosition === 'right'
        ? 'theme-vurify-menu-button--icon-end'
        : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    const textRailClasses = [
      'theme-vurify-menu-button__text-rail',
      usesUnderline ? 'theme-link-fx theme-link-fx--elara' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const switching =
      switchAnimation === 'clip'
        ? clipSwitching
        : riseSwitching
          ? true
          : flipPhase === 'out' || flipPhase === 'in'
    const targetChildren = currentChildrenRef.current
    const sizerA = displayedChildren
    const sizerB = targetChildren !== displayedChildren ? targetChildren : outgoingChildren
    const needsSizer =
      switchAnimation === 'flip' ||
      switchAnimation === 'clip' ||
      switchAnimation === 'rise' ||
      riseGateActive
    const showEntranceRise = riseSwitching
    const showFlipLabel = switchAnimation === 'flip' && entered && !riseSwitching
    const showRiseLabel = switchAnimation === 'rise' && (!riseGateActive || entered || riseSwitching)
    const showPending = riseGateActive && !entered && !riseSwitching

    const iconEl = media ? (
      <span className="theme-vurify-menu-button__media">{media}</span>
    ) : iconNode ? (
      <HugeiconsIcon
        icon={iconNode}
        className="theme-vurify-menu-button__icon"
        aria-hidden="true"
      />
    ) : Icon ? (
      <Icon className="theme-vurify-menu-button__icon" aria-hidden="true" />
    ) : null

    const labelStack = (
      <i className="theme-vurify-menu-button__label-stack">
        {needsSizer ? (
          <b className="theme-vurify-menu-button__sizer" aria-hidden="true">
            <span>{sizerA}</span>
            {sizerB ? <span>{sizerB}</span> : null}
          </b>
        ) : null}

        {showEntranceRise || (switchAnimation === 'rise' && showRiseLabel) ? (
          <PageScrollType
            key={`${displayedChildren}-${riseKey}`}
            text={displayedChildren}
            effect={2}
            mode="once"
            as="b"
            className="theme-vurify-menu-button__label theme-vurify-menu-button__label--current theme-vurify-menu-button__label--rise"
            replayKey={`${displayedChildren}-${riseKey}`}
          />
        ) : showFlipLabel ? (
          <TypeAnimText
            key={`${displayedChildren}-${flipPhase === 'out' ? 'out' : flipPhase === 'in' ? 'in' : 'idle'}`}
            anim="flip"
            trigger={flipPhase === 'idle' ? 'hover' : 'enter'}
            as="b"
            className={[
              'theme-vurify-menu-button__label',
              flipPhase === 'out'
                ? 'theme-vurify-menu-button__label--outgoing'
                : 'theme-vurify-menu-button__label--current',
            ].join(' ')}
          >
            {displayedChildren}
          </TypeAnimText>
        ) : showPending ? (
          <b
            className="theme-vurify-menu-button__label theme-vurify-menu-button__label--current theme-vurify-menu-button__label--rise-pending"
            aria-hidden="true"
          />
        ) : (
          <>
            <b className="theme-vurify-menu-button__label theme-vurify-menu-button__label--current">
              {displayedChildren}
            </b>
            {outgoingChildren !== null ? (
              <b
                className="theme-vurify-menu-button__label theme-vurify-menu-button__label--outgoing"
                aria-hidden="true"
              >
                {outgoingChildren}
              </b>
            ) : null}
          </>
        )}
      </i>
    )

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        data-active-chrome={activeChrome ? undefined : 'off'}
        {...rest}
        disabled={Boolean(disabled) || loading}
        aria-busy={showBusyChrome || undefined}
        aria-label={
          variant === 'icon-only' || labelCollapsed
            ? rest['aria-label'] ?? children
            : rest['aria-label']
        }
      >
        <span
          className="theme-vurify-menu-button__content"
          data-switch-animation={showEntranceRise ? 'rise' : switchAnimation}
          data-switching={switching ? 'true' : 'false'}
          data-flip-phase={showFlipLabel ? flipPhase : undefined}
        >
          {iconEl && iconPosition === 'left' ? iconEl : null}
          {variant === 'icon-only' ? (
            labelStack
          ) : (
            <span className={textRailClasses}>{labelStack}</span>
          )}
          {iconEl && iconPosition === 'right' ? iconEl : null}
        </span>
      </button>
    )
  },
)
