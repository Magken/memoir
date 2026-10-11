/**
 * GRAS nest / underline control — copies LclViewportPreview nest markup.
 * Underline is only `.theme-hairline-fx--eirene` (link-hover-styles). Do not invent a second line.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

/** `nest` = full-width LCL list row · `inline` = content-sized label */
export type GrasUnderlineButtonLayout = 'nest' | 'inline'

type GrasUnderlineButtonProps = {
  children: ReactNode
  layout?: GrasUnderlineButtonLayout
  /**
   * Nest rows that host TypeAnim use `type-anim-card` (LCL reference).
   * Timeline year rows omit it — pass `false`.
   */
  card?: boolean
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>

/** Canonical LCL nest row classes from LclViewportPreview — single source for product + toolkit. */
export const GRAS_NEST_BUTTON_CLASS =
  'theme-lcl-layout__nest-item type-anim-card theme-hairline-fx theme-hairline-fx--eirene'

export const GrasUnderlineButton = forwardRef<HTMLButtonElement, GrasUnderlineButtonProps>(
  function GrasUnderlineButton(
    { children, layout = 'nest', card = true, className = '', type = 'button', ...rest },
    ref,
  ) {
    const nestClass =
      layout === 'nest'
        ? [
            'theme-lcl-layout__nest-item',
            card ? 'type-anim-card' : '',
            'theme-hairline-fx',
            'theme-hairline-fx--eirene',
          ]
            .filter(Boolean)
            .join(' ')
        : 'theme-gras-underline-btn theme-hairline-fx theme-hairline-fx--eirene'

    return (
      <button ref={ref} type={type} className={[nestClass, className].filter(Boolean).join(' ')} {...rest}>
        {children}
        <span className="theme-hairline-fx__wipe" aria-hidden>
          <span className="theme-hairline-fx__pill" />
        </span>
      </button>
    )
  },
)
