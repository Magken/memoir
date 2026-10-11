/**
 * Helpers for reusable prose inline links.
 * CSS: [prose-inline-links.css](../../css/effects/prose-inline-links.css)
 */

export const PROSE_INLINE_CLASS = 'theme-prose-inline'
export const PROSE_INLINE_P_CLASS = 'theme-prose-inline__p'
export const PROSE_INLINE_LINK_CLASS = 'theme-prose-inline__link'

export type ProseInlineLinkSize = 'sm' | 'md' | 'lg'

export function proseInlineLinkClass(size: ProseInlineLinkSize = 'md'): string {
  return `${PROSE_INLINE_LINK_CLASS} ${PROSE_INLINE_LINK_CLASS}--${size}`
}
